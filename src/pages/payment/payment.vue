<template>
  <div class="payment-page">
    <div class="liquid-bg"></div>
    
    <div class="content">
      <!-- 页面标题 -->
      <h1 class="title">确认订单</h1>
      
      <!-- 订单摘要 -->
      <div class="order-card">
        <div class="product-info">
          <h3>布鲁计划会员</h3>
          <p class="product-desc">90天戒色计划 + 每日心理引导 + 永久使用</p>
        </div>
        
        <div class="price-row">
          <span class="label">商品金额</span>
          <span class="value">¥{{ basePrice }}</span>
        </div>
        
        <div class="price-row discount" v-if="discount > 0">
          <span class="label">邀请码优惠</span>
          <span class="value">-¥{{ discount }}</span>
        </div>
        
        <div class="price-row total">
          <span class="label">实付金额</span>
          <span class="value price">¥{{ finalPrice }}</span>
        </div>
      </div>
      
      <!-- 邀请码输入 -->
      <div class="invite-section">
        <label>邀请码（选填）</label>
        <div class="input-row">
          <input 
            v-model="inviteCode" 
            placeholder="输入邀请码立减2元"
            class="code-input"
            :disabled="validating || orderStatus === 'paying'"
          />
          <button 
            @click="validateCode" 
            class="validate-btn"
            :disabled="!inviteCode || validating"
          >
            {{ validating ? '验证中...' : '验证' }}
          </button>
        </div>
        <p class="hint" v-if="inviteCodeValid">✓ 邀请码有效，已减免{{ discount }}元</p>
        <p class="hint error" v-if="inviteCodeError">{{ inviteCodeError }}</p>
      </div>
      
      <!-- 支付方式 -->
      <div class="payment-methods">
        <label class="section-label">支付方式</label>
        <div 
          class="method-item" 
          :class="{ active: payMethod === 'alipay' }"
          @click="payMethod = 'alipay'"
        >
          <span class="method-icon">💳</span>
          <span class="method-name">支付宝</span>
          <span class="check-mark" v-if="payMethod === 'alipay'">✓</span>
        </div>
      </div>
      
      <!-- 状态提示 -->
      <div class="status-section" v-if="statusMessage">
        <div class="status-box" :class="orderStatus">
          <span class="status-icon">{{ statusIcon }}</span>
          <span class="status-text">{{ statusMessage }}</span>
        </div>
        <div class="progress-bar" v-if="orderStatus === 'paying'">
          <div class="progress-fill"></div>
        </div>
      </div>
      
      <!-- 错误提示 -->
      <div class="error-section" v-if="errorMessage">
        <p class="error-text">{{ errorMessage }}</p>
        <p class="error-hint">{{ errorHint }}</p>
      </div>
      
      <!-- 操作按钮 -->
      <div class="action-buttons">
        <button 
          class="pay-btn" 
          @click="handlePay"
          :disabled="!canPay || loading"
          v-if="showPayButton"
        >
          {{ loading ? '处理中...' : `确认支付 ¥${finalPrice}` }}
        </button>
        
        <button 
          class="secondary-btn" 
          @click="checkOrderStatus"
          v-if="showCheckButton"
        >
          刷新支付状态
        </button>
        
        <button 
          class="secondary-btn" 
          @click="goToOrderDetail"
          v-if="currentOrder"
        >
          查看订单详情
        </button>
        
        <button 
          class="text-btn" 
          @click="goBack"
        >
          返回
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { paymentService, OrderStatus, PaymentError } from '../services/payment.js'
import { db } from '../services/database.js'
import { http } from '../services/http.js'

const router = useRouter()

// 状态变量
const inviteCode = ref('')
const inviteCodeValid = ref(false)
const inviteCodeError = ref('')
const validating = ref(false)
const payMethod = ref('alipay')
const loading = ref(false)
const orderStatus = ref('')
const statusMessage = ref('')
const errorMessage = ref('')
const errorHint = ref('')
const currentOrder = ref(null)

// 价格计算（单位：元，后端返回分，前端展示元）
const basePrice = 12.9  // 原价 12.9元（展示用）
const discount = ref(0)  // 优惠金额（元）
const finalPrice = ref(12.9)  // 实付金额（元），默认原价，验证邀请码后更新

// 按钮显示逻辑
const canPay = computed(() => {
  return !loading.value && 
         !['paying', 'paid'].includes(orderStatus.value)
})

const showPayButton = computed(() => {
  return !orderStatus.value || 
         ['created', 'pending', 'failed', 'cancelled'].includes(orderStatus.value)
})

const showCheckButton = computed(() => {
  return orderStatus.value === 'paying' || orderStatus.value === 'pending'
})

const statusIcon = computed(() => {
  const icons = {
    created: '📝',
    pending: '⏳',
    paying: '💳',
    paid: '✅',
    failed: '❌',
    cancelled: '🚫'
  }
  return icons[orderStatus.value] || ''
})

// 验证邀请码
const validateCode = async () => {
  if (!inviteCode.value) return
  
  validating.value = true
  inviteCodeError.value = ''
  
  try {
    const data = await http.post('/api/invite/validate', {
      inviteCode: inviteCode.value
    })
    
    if (data.success && data.data.valid) {
      // 后端返回分，前端转为元展示
      discount.value = (data.data.discountAmount / 100).toFixed(2)
      finalPrice.value = (data.data.finalAmount / 100).toFixed(2)  // 使用后端计算的实付金额
      inviteCodeValid.value = true
    } else {
      discount.value = 0
      finalPrice.value = basePrice
      inviteCodeError.value = data.error?.message || '邀请码无效'
      inviteCodeValid.value = false
    }
  } catch (e) {
    inviteCodeError.value = '验证失败，请重试'
    inviteCodeValid.value = false
  } finally {
    validating.value = false
  }
}

// 处理支付
const handlePay = async () => {
  loading.value = true
  errorMessage.value = ''
  errorHint.value = ''
  
  try {
    // 1. 创建订单
    updateStatus('created', '正在创建订单...')
    
    const user = db.getLocalUser()
    const phone = user?.phone || localStorage.getItem('phone') || '13800138000'
    
    const order = await paymentService.createOrder({
      phone,
      inviteCode: inviteCodeValid.value ? inviteCode.value : null,
      productType: 'standard',
      // 前端传元，后端会转为分存储
      amount: parseFloat(finalPrice.value)
    })
    
    currentOrder.value = order
    
    // 2. 发起支付
    updateStatus('paying', '正在调起支付...')
    
    const payResult = await paymentService.startPayment(order)
    
    // 3. 轮询确认支付结果
    if (payResult.needVerify) {
      updateStatus('paying', '支付处理中，正在确认...')
      
      const finalResult = await paymentService.pollOrderStatus(
        order.orderId,
        (status, result) => {
          updateStatus(status, paymentService.getStatusText(status))
        }
      )
      
      // 支付成功
      onPaymentSuccess()
    }
  } catch (error) {
    handlePaymentError(error)
  } finally {
    loading.value = false
  }
}

// 查询订单状态
const checkOrderStatus = async () => {
  if (!currentOrder.value) return
  
  loading.value = true
  
  try {
    const result = await paymentService.queryOrderStatus(currentOrder.value.orderId)
    updateStatus(result.status, paymentService.getStatusText(result.status))
    
    if (result.status === OrderStatus.PAID) {
      onPaymentSuccess()
    }
  } catch (e) {
    errorMessage.value = '查询失败，请重试'
  } finally {
    loading.value = false
  }
}

// 支付成功处理
const onPaymentSuccess = () => {
  updateStatus('paid', '支付成功！')
  
  // 标记用户已支付
  localStorage.setItem('hasPaid', 'true')
  
  // 延迟跳转
  setTimeout(() => {
    router.push('/home')
  }, 1500)
}

// 处理支付错误
const handlePaymentError = (error) => {
  console.error('[Payment] 支付错误:', error)
  
  switch (error.type) {
    case PaymentError.CANCELLED:
      updateStatus('cancelled', '支付已取消')
      errorMessage.value = '您取消了支付'
      errorHint.value = '您可以重新发起支付'
      break
    case PaymentError.TIMEOUT:
      updateStatus('pending', '支付确认超时')
      errorMessage.value = '支付确认超时'
      errorHint.value = '请稍后查看订单状态，或联系客服'
      break
    case PaymentError.SDK_FAILED:
      updateStatus('failed', '支付失败')
      errorMessage.value = error.message || '支付调起失败'
      errorHint.value = '请检查网络后重试'
      break
    case PaymentError.ORDER_FAILED:
      updateStatus('failed', '创建订单失败')
      errorMessage.value = error.message || '创建订单失败'
      errorHint.value = '请稍后重试'
      break
    default:
      updateStatus('failed', '支付异常')
      errorMessage.value = error.message || '支付过程中发生错误'
      errorHint.value = '请稍后重试或联系客服'
  }
}

// 更新状态
const updateStatus = (status, message) => {
  orderStatus.value = status
  statusMessage.value = message
}

// 导航方法
const goToOrderDetail = () => {
  router.push('/order-detail')
}

const goBack = () => {
  router.back()
}

// 生命周期
onMounted(() => {
  // 检查是否有未完成的订单
  const pendingOrder = paymentService.getCurrentOrder()
  if (pendingOrder && ['created', 'pending', 'paying'].includes(pendingOrder.status)) {
    currentOrder.value = pendingOrder
    updateStatus(pendingOrder.status, paymentService.getStatusText(pendingOrder.status))
  }
})

onUnmounted(() => {
  paymentService.stopPolling()
})
</script>

<style scoped>
.payment-page {
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

/* 订单卡片 */
.order-card {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 24px;
}

.product-info h3 {
  color: #F8FAFC;
  font-size: 18px;
  margin-bottom: 4px;
}

.product-desc {
  color: #94A3B8;
  font-size: 14px;
  margin-bottom: 16px;
}

.price-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  color: #94A3B8;
}

.price-row.discount .value {
  color: #10B981;
}

.price-row.total {
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  margin-top: 8px;
  padding-top: 16px;
}

.price-row.total .value {
  font-size: 24px;
  font-weight: 700;
  color: #10B981;
}

/* 邀请码 */
.invite-section {
  margin-bottom: 24px;
}

.invite-section label {
  display: block;
  color: #94A3B8;
  margin-bottom: 8px;
  font-size: 14px;
}

.input-row {
  display: flex;
  gap: 8px;
}

.code-input {
  flex: 1;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: #F8FAFC;
  font-size: 14px;
}

.code-input:focus {
  outline: none;
  border-color: #3B82F6;
}

.validate-btn {
  padding: 12px 20px;
  background: rgba(59, 130, 246, 0.2);
  border: 1px solid rgba(59, 130, 246, 0.5);
  border-radius: 8px;
  color: #3B82F6;
  cursor: pointer;
  white-space: nowrap;
}

.validate-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.hint {
  margin-top: 8px;
  font-size: 12px;
  color: #10B981;
}

.hint.error {
  color: #EF4444;
}

/* 支付方式 */
.payment-methods {
  margin-bottom: 24px;
}

.section-label {
  display: block;
  color: #94A3B8;
  margin-bottom: 12px;
  font-size: 14px;
}

.method-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid transparent;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.method-item.active {
  border-color: #3B82F6;
  background: rgba(59, 130, 246, 0.1);
}

.method-icon {
  font-size: 24px;
}

.method-name {
  flex: 1;
  color: #F8FAFC;
}

.check-mark {
  color: #3B82F6;
  font-weight: 700;
}

/* 状态提示 */
.status-section {
  margin-bottom: 24px;
}

.status-box {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border-radius: 12px;
  margin-bottom: 12px;
}

.status-box.created,
.status-box.pending {
  background: rgba(245, 158, 11, 0.1);
  color: #F59E0B;
}

.status-box.paying {
  background: rgba(59, 130, 246, 0.1);
  color: #3B82F6;
}

.status-box.paid {
  background: rgba(16, 185, 129, 0.1);
  color: #10B981;
}

.status-box.failed,
.status-box.cancelled {
  background: rgba(239, 68, 68, 0.1);
  color: #EF4444;
}

.status-icon {
  font-size: 20px;
}

.progress-bar {
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #3B82F6, #6366F1);
  border-radius: 2px;
  animation: progress 2s ease-in-out infinite;
}

@keyframes progress {
  0% { width: 0%; }
  50% { width: 70%; }
  100% { width: 100%; }
}

/* 错误提示 */
.error-section {
  background: rgba(239, 68, 68, 0.1);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 24px;
}

.error-text {
  color: #EF4444;
  margin-bottom: 4px;
}

.error-hint {
  color: #94A3B8;
  font-size: 12px;
}

/* 按钮 */
.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.pay-btn {
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

.pay-btn:disabled {
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
