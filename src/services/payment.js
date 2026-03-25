// 统一支付服务
import { http } from './http.js'

// 订单状态枚举
export const OrderStatus = {
  CREATED: 'created',      // 订单已创建
  PENDING: 'pending',      // 等待支付
  PAYING: 'paying',        // 支付中
  PAID: 'paid',            // 已支付
  FAILED: 'failed',        // 支付失败
  CANCELLED: 'cancelled',  // 已取消
  CLOSED: 'closed'         // 已关闭
}

// 支付方式枚举
export const PaymentMethod = {
  ALIPAY: 'alipay',
  WECHAT: 'wechat'
}

// 支付错误类型
export const PaymentError = {
  SDK_FAILED: 'sdk_failed',      // SDK调起失败
  NETWORK_ERROR: 'network_error', // 网络错误
  TIMEOUT: 'timeout',            // 超时
  CANCELLED: 'cancelled',        // 用户取消
  ORDER_FAILED: 'order_failed',  // 创建订单失败
  VERIFY_FAILED: 'verify_failed' // 验证失败
}

class PaymentService {
  constructor() {
    this.pollingTimer = null
    this.maxPollingTime = 60000 // 最大轮询60秒
    this.pollingInterval = 2000 // 每2秒查一次
  }

  /**
   * 创建订单
   * @param {Object} orderInfo - 订单信息
   * @returns {Promise<Object>} - 订单数据
   */
  async createOrder(orderInfo) {
    const { phone, inviteCode, productType = 'standard', amount = 12.9 } = orderInfo
    
    try {
      const data = await http.post('/alipay/create-order', {
        phone,
        inviteCode,
        productType,
        channel: 'alipay',
        amount
      })
      
      if (!data.success) {
        throw new Error(data.error?.message || '创建订单失败')
      }
      
      // 保存订单到本地
      const order = {
        orderId: data.orderId,
        status: OrderStatus.CREATED,
        amount,
        phone,
        inviteCode,
        createdAt: new Date().toISOString(),
        payParams: data.payParams
      }
      this.saveOrder(order)
      
      return order
    } catch (error) {
      console.error('[Payment] 创建订单失败:', error)
      throw {
        type: PaymentError.ORDER_FAILED,
        message: error.message || '创建订单失败，请重试'
      }
    }
  }

  /**
   * 发起支付
   * @param {Object} order - 订单对象
   * @returns {Promise<Object>} - 支付结果
   */
  async startPayment(order) {
    if (!order.payParams?.orderStr) {
      throw {
        type: PaymentError.SDK_FAILED,
        message: '支付参数缺失'
      }
    }
    
    // 更新状态为支付中
    this.updateOrderStatus(order.orderId, OrderStatus.PAYING)
    
    try {
      // 检测是否在 Capacitor 环境
      if (window.Capacitor?.Plugins?.Alipay) {
        // 原生支付宝支付
        const result = await window.Capacitor.Plugins.Alipay.pay({
          orderStr: order.payParams.orderStr
        })
        
        return this.handleAlipayResult(result, order)
      } else if (window.Capacitor?.Plugins?.Payment) {
        // 通用支付插件
        const result = await window.Capacitor.Plugins.Payment.alipay({
          orderStr: order.payParams.orderStr
        })
        
        return this.handleAlipayResult(result, order)
      } else {
        // H5 调试模式
        console.log('[Payment] H5调试模式，模拟支付成功')
        return {
          success: true,
          status: OrderStatus.PAID,
          message: 'H5调试：模拟支付成功',
          needVerify: true // 需要后端验证
        }
      }
    } catch (error) {
      console.error('[Payment] 支付调起失败:', error)
      
      // 区分错误类型
      if (error.message?.includes('cancel')) {
        this.updateOrderStatus(order.orderId, OrderStatus.CANCELLED)
        throw {
          type: PaymentError.CANCELLED,
          message: '用户取消支付'
        }
      }
      
      this.updateOrderStatus(order.orderId, OrderStatus.FAILED)
      throw {
        type: PaymentError.SDK_FAILED,
        message: error.message || '支付调起失败'
      }
    }
  }

  /**
   * 处理支付宝返回结果
   */
  handleAlipayResult(result, order) {
    console.log('[Payment] 支付宝返回:', result)
    
    // 支付宝返回格式处理
    const resultStatus = result.resultStatus || result.code
    
    switch (resultStatus) {
      case '9000':
      case 'success':
        return {
          success: true,
          status: OrderStatus.PAYING, // 等待后端确认
          message: '支付成功，正在确认...',
          needVerify: true
        }
      case '6001':
      case 'cancel':
        this.updateOrderStatus(order.orderId, OrderStatus.CANCELLED)
        throw {
          type: PaymentError.CANCELLED,
          message: '用户取消支付'
        }
      case '4000':
      case '6002':
        this.updateOrderStatus(order.orderId, OrderStatus.FAILED)
        throw {
          type: PaymentError.SDK_FAILED,
          message: '支付失败，请重试'
        }
      default:
        this.updateOrderStatus(order.orderId, OrderStatus.FAILED)
        throw {
          type: PaymentError.SDK_FAILED,
          message: `支付异常 (${resultStatus})`
        }
    }
  }

  /**
   * 查询订单状态
   * @param {string} orderId - 订单ID
   * @returns {Promise<Object>} - 订单状态
   */
  async queryOrderStatus(orderId) {
    try {
      const data = await http.get(`/alipay/query-order`, { orderId })
      
      if (data.success && data.data) {
        const status = this.mapBackendStatus(data.data.status)
        this.updateOrderStatus(orderId, status)
        
        return {
          success: true,
          status,
          order: data.data
        }
      }
      
      return {
        success: false,
        status: OrderStatus.PENDING,
        message: '查询失败'
      }
    } catch (error) {
      console.error('[Payment] 查询订单失败:', error)
      return {
        success: false,
        status: OrderStatus.PENDING,
        message: error.message
      }
    }
  }

  /**
   * 轮询订单状态
   * @param {string} orderId - 订单ID
   * @param {Function} onStatusChange - 状态变化回调
   * @returns {Promise<Object>} - 最终结果
   */
  async pollOrderStatus(orderId, onStatusChange) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now()
      
      const check = async () => {
        // 检查是否超时
        if (Date.now() - startTime > this.maxPollingTime) {
          this.stopPolling()
          reject({
            type: PaymentError.TIMEOUT,
            message: '支付确认超时，请稍后查看订单状态'
          })
          return
        }
        
        try {
          const result = await this.queryOrderStatus(orderId)
          
          if (onStatusChange) {
            onStatusChange(result.status, result)
          }
          
          // 支付成功
          if (result.status === OrderStatus.PAID) {
            this.stopPolling()
            resolve(result)
            return
          }
          
          // 支付失败或取消
          if (result.status === OrderStatus.FAILED || 
              result.status === OrderStatus.CANCELLED ||
              result.status === OrderStatus.CLOSED) {
            this.stopPolling()
            reject({
              type: result.status === OrderStatus.CANCELLED 
                ? PaymentError.CANCELLED 
                : PaymentError.VERIFY_FAILED,
              message: result.status === OrderStatus.CANCELLED 
                ? '支付已取消' 
                : '支付失败'
            })
            return
          }
          
          // 继续轮询
          this.pollingTimer = setTimeout(check, this.pollingInterval)
        } catch (error) {
          // 查询失败，继续轮询
          this.pollingTimer = setTimeout(check, this.pollingInterval)
        }
      }
      
      check()
    })
  }

  /**
   * 停止轮询
   */
  stopPolling() {
    if (this.pollingTimer) {
      clearTimeout(this.pollingTimer)
      this.pollingTimer = null
    }
  }

  /**
   * 取消订单
   * @param {string} orderId - 订单ID
   */
  async cancelOrder(orderId) {
    this.stopPolling()
    this.updateOrderStatus(orderId, OrderStatus.CANCELLED)
  }

  /**
   * 获取本地订单
   */
  getOrder(orderId) {
    const orders = JSON.parse(localStorage.getItem('orders') || '{}')
    return orders[orderId]
  }

  /**
   * 保存订单
   */
  saveOrder(order) {
    const orders = JSON.parse(localStorage.getItem('orders') || '{}')
    orders[order.orderId] = order
    localStorage.setItem('orders', JSON.stringify(orders))
    localStorage.setItem('currentOrderId', order.orderId)
  }

  /**
   * 更新订单状态
   */
  updateOrderStatus(orderId, status) {
    const orders = JSON.parse(localStorage.getItem('orders') || '{}')
    if (orders[orderId]) {
      orders[orderId].status = status
      orders[orderId].updatedAt = new Date().toISOString()
      localStorage.setItem('orders', JSON.stringify(orders))
    }
  }

  /**
   * 获取当前订单
   */
  getCurrentOrder() {
    const orderId = localStorage.getItem('currentOrderId')
    if (orderId) {
      return this.getOrder(orderId)
    }
    return null
  }

  /**
   * 获取所有订单
   */
  getAllOrders() {
    return JSON.parse(localStorage.getItem('orders') || '{}')
  }

  /**
   * 映射后端状态到前端状态
   */
  mapBackendStatus(backendStatus) {
    const statusMap = {
      'pending': OrderStatus.PENDING,
      'paid': OrderStatus.PAID,
      'failed': OrderStatus.FAILED,
      'cancelled': OrderStatus.CANCELLED,
      'closed': OrderStatus.CLOSED
    }
    return statusMap[backendStatus] || OrderStatus.PENDING
  }

  /**
   * 获取状态显示文本
   */
  getStatusText(status) {
    const textMap = {
      [OrderStatus.CREATED]: '订单已创建',
      [OrderStatus.PENDING]: '等待支付',
      [OrderStatus.PAYING]: '支付中',
      [OrderStatus.PAID]: '已支付',
      [OrderStatus.FAILED]: '支付失败',
      [OrderStatus.CANCELLED]: '已取消',
      [OrderStatus.CLOSED]: '订单已关闭'
    }
    return textMap[status] || '未知状态'
  }
}

// 导出单例
export const paymentService = new PaymentService()

// 兼容旧版导出
export const PaymentServiceClass = PaymentService
