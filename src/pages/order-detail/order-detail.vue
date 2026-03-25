<template>
  <div class="order-detail-page">
    <div class="liquid-bg"></div>
    
    <div class="content">
      <!-- 页面标题 -->
      <h1 class="title">订单详情</h1>
      
      <!-- 加载状态 -->
      <div class="loading-state" v-if="loading">
        <div class="spinner"></div>
        <p>加载中...</p>
      </div>
      
      <!-- 订单信息 -->
      <div class="order-card" v-else-if="order">
        <!-- 订单头部 -->
        <div class="order-header">
          <div class="order-no">
            <span class="label">订单号</span>
            <span class="value">{{ order.orderId }}</span>
          </div>
          <div class="order-status" :class="order.status">
            {{ statusText }}
          </div>
        </div>
        
        <!-- 商品信息 -->
        <div class="product-section">
          <div class="product-icon">📱</div>
          <div class="product-info">
            <h3>布鲁计划会员</h3>
            <p>90天戒色计划 + 每日心理引导</p>
          </div>
        </div>
        
        <!-- 金额信息 -->
        <div class="amount-section">
          <div class="amount-row">
            <span>商品金额</span>
            <span>¥{{ order.amount || '12.90' }}</span>
          </div>
          <div class="amount-row discount" v-if="order.inviteCode">
            <span>邀请码优惠</span>
            <span>-¥2.00</span>
          </div>
          <div class="amount-row total">
            <span>实付金额</span>
            <span class="price">¥{{ order.amount || '12.90' }}</span>
          </div>
        </div>
        
        <!-- 订单详情 -->
        <div class="detail-section">
          <div class="detail-row">
            <span class="label">支付方式</span>
            <span class="value">{{ payMethodText }}</span>
          </div>
          <div class="detail-row">
            <span class="label">创建时间</span>
            <span class="value">{{ formatTime(order.createdAt) }}</span>
          </div>
          <div class="detail-row" v-if="order.paidAt">
            <span class="label">支付时间</span>
            <span class="value">{{ formatTime(order.paidAt) }}</span>
          </div>
        </div>
      </div>
      
      <!-- 空状态 -->
      <div class="empty-state" v-else>
        <div class="empty-icon">📭</div>
        <p>未找到订单信息</p>
        <button class="primary-btn" @click="goHome">返回首页</button>
      </div>
      
      <!-- 操作按钮区 -->
      <div class="action-section" v-if="order">
        <!-- 未支付状态 -->
        <template v-if="canContinuePay">
          <button class="primary-btn" @click="continuePay" :disabled="paying">
            {{ paying ? '支付中...' : '继续支付' }}
          </button>
          <button class="secondary-btn" @click="refreshStatus" :disabled="refreshing">
            {{ refreshing ? '刷新中...' : '刷新状态' }}
          </button>
        </template>
        
        <!-- 支付中状态 -->
        <template v-if="order.status === 'paying'">
          <div class="checking-hint">
            <span class="spinner-small"></span>
            正在确认支付结果...
          </div>
          <button class="secondary-btn" @click="refreshStatus" :disabled="refreshing">
            {{ refreshing ? '刷新中...' : '手动刷新' }}
          </button>
        </template>
        
        <!-- 已支付状态 -->
        <template v-if="order.status === 'paid'">
          <button class="primary-btn" @click="goHome">
            进入首页
          </button>
          <p class="success-hint">✓ 支付成功，已开通会员权益</p>
        </template>
        
        <!-- 失败/取消状态 -->
        <template v-if="order.status === 'failed' || order.status === 'cancelled'">
          <button class="primary-btn" @click="retryPay">
            重新支付
          </button>
          <button class="text-btn" @click="goBack">
            返回
          </button>
        </template>
        
        <!-- 通用按钮 -->
        <button class="text-btn" @click="goHome" v-if="order.status !== 'paid'">
          返回首页
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { paymentService, OrderStatus } from '../services/payment.js'

const router = useRouter()
const route = useRoute()

// 状态变量
const loading = ref(true)
const order = ref(null)
const paying = ref(false)
const refreshing = ref(false)

// 计算属性
const statusText = computed(() => {
  return paymentService.getStatusText(order.value?.status)
})

const payMethodText = computed(() => {
  const methods = {
    alipay: '支付宝',
    wechat: '微信支付'
  }
  return methods[order.value?.channel] || '支付宝'
})

const canContinuePay = computed(() => {
  return ['created', 'pending', 'failed', 'cancelled'].includes(order.value?.status)
})

// 方法
const loadOrder = async () => {
  loading.value = true
  
  // 从路由参数或本地存储获取订单ID
  const orderId = route.query.orderId || localStorage.getItem('currentOrderId')
  
  if (!orderId) {
    order.value = null
    loading.value = false
    return
  }
  
  // 先尝试从本地获取
  let localOrder = paymentService.getOrder(orderId)
  
  if (localOrder) {
    order.value = localOrder
  }
  
  // 从服务端查询最新状态
  try {
    const result = await paymentService.queryOrderStatus(orderId)
    if (result.success && result.order) {
      order.value = { ...order.value, ...result.order }
    }
  } catch (e) {
    console.error('查询订单失败:', e)
  }
  
  loading.value = false
  
  // 如果是支付中状态，自动轮询
  if (order.value?.status === OrderStatus.PAYING) {
    startPolling()
  }
}

const startPolling = async () => {
  try {
    const result = await paymentService.pollOrderStatus(
      order.value.orderId,
      (status) => {
        order.value.status = status
      }
    )
    
    // 轮询成功，更新状态
    order.value.status = result.status
    
    if (result.status === OrderStatus.PAID) {
      localStorage.setItem('hasPaid', 'true')
    }
  } catch (error) {
    // 轮询结束（成功或失败）
    console.log('轮询结束:', error)
  }
}

const continuePay = async () => {
  if (!order.value?.payParams) {
    // 需要重新创建订单
    router.push('/payment')
    return
  }
  
  paying.value = true
  
  try {
    const result = await paymentService.startPayment(order.value)
    
    if (result.needVerify) {
      order.value.status = OrderStatus.PAYING
      startPolling()
    }
  } catch (error) {
    alert(error.message || '支付失败')
  } finally {
    paying.value = false
  }
}

const refreshStatus = async () => {
  refreshing.value = true
  
  try {
    const result = await paymentService.queryOrderStatus(order.value.orderId)
    if (result.success) {
      order.value.status = result.status
      
      if (result.status === OrderStatus.PAID) {
        localStorage.setItem('hasPaid', 'true')
      }
    }
  } catch (e) {
    alert('刷新失败，请重试')
  } finally {
    refreshing.value = false
  }
}

const retryPay = () => {
  router.push('/payment')
}

const goHome = () => {
  router.push('/home')
}

const goBack = () => {
  router.back()
}

const formatTime = (isoString) => {
  if (!isoString) return '-'
  const date = new Date(isoString)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 生命周期
onMounted(() => {
  loadOrder()
})

onUnmounted(() => {
  paymentService.stopPolling()
})
</script>

<style scoped>
.order-detail-page {
  min-height: 100vh;
  position: relative;
  padding: 40px 20px;
}

.liquid-bg {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: radial-gradient(ellipse at 20% 20%, #1e1b4b 0%, #000000 50%);
  z-index: -1;
}

.content {
  position: relative;
  z-index: 1;
  max-width: 400px;
  margin: 0 auto;
}

.title {
  font-size: 24px;
  font-weight: 700;
  text-align: center;
  margin-bottom: 32px;
  color: #F8FAFC;
}

/* 加载状态 */
.loading-state {
  text-align: center;
  padding: 60px 20px;
  color: #94A3B8;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(255, 255, 255, 0.1);
  border-top-color: #3B82F6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 16px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.spinner-small {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-top-color: #3B82F6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-right: 8px;
}

/* 订单卡片 */
.order-card {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 24px;
}

.order-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.order-no {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.order-no .label {
  font-size: 12px;
  color: #64748B;
}

.order-no .value {
  font-size: 14px;
  color: #94A3B8;
  font-family: monospace;
}

.order-status {
  padding: 6px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.order-status.created,
.order-status.pending {
  background: rgba(245, 158, 11, 0.15);
  color: #F59E0B;
}

.order-status.paying {
  background: rgba(59, 130, 246, 0.15);
  color: #3B82F6;
}

.order-status.paid {
  background: rgba(16, 185, 129, 0.15);
  color: #10B981;
}

.order-status.failed,
.order-status.cancelled {
  background: rgba(239, 68, 68, 0.15);
  color: #EF4444;
}

/* 商品信息 */
.product-section {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 0;
  margin-bottom: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.product-icon {
  font-size: 40px;
}

.product-info h3 {
  color: #F8FAFC;
  font-size: 16px;
  margin-bottom: 4px;
}

.product-info p {
  color: #94A3B8;
  font-size: 13px;
}

/* 金额信息 */
.amount-section {
  padding-bottom: 16px;
  margin-bottom: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.amount-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  color: #94A3B8;
  font-size: 14px;
}

.amount-row.discount {
  color: #10B981;
}

.amount-row.total {
  padding-top: 12px;
  margin-top: 8px;
  border-top: 1px dashed rgba(255, 255, 255, 0.1);
}

.amount-row.total .price {
  font-size: 24px;
  font-weight: 700;
  color: #F8FAFC;
}

/* 详情信息 */
.detail-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
}

.detail-row .label {
  color: #64748B;
}

.detail-row .value {
  color: #F8FAFC;
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 60px 20px;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.empty-state p {
  color: #94A3B8;
  margin-bottom: 24px;
}

/* 操作区 */
.action-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.checking-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  color: #3B82F6;
  font-size: 14px;
}

.success-hint {
  text-align: center;
  color: #10B981;
  font-size: 14px;
}

/* 按钮 */
.primary-btn {
  width: 100%;
  padding: 16px;
  background: linear-gradient(135deg, #3B82F6, #6366F1);
  border: none;
  border-radius: 12px;
  color: #F8FAFC;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
}

.primary-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.secondary-btn {
  width: 100%;
  padding: 14px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  color: #F8FAFC;
  font-size: 14px;
  cursor: pointer;
}

.secondary-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.text-btn {
  width: 100%;
  padding: 12px;
  background: transparent;
  border: none;
  color: #94A3B8;
  font-size: 14px;
  cursor: pointer;
}
</style>
