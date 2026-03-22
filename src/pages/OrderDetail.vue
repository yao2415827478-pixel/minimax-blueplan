<template>
  <div class="order-detail-page">
    <!-- 导航栏 -->
    <div class="nav-bar">
      <button class="back-btn" @click="$router.back()">←</button>
      <span class="nav-title">确认订单</span>
    </div>

    <!-- 订单信息卡片 -->
    <div class="order-card">
      <!-- 订单状态 -->
      <div class="order-status">
        <span class="status-badge">待付款</span>
        <span class="order-time">{{ orderTime }}</span>
      </div>

      <!-- 商品信息 -->
      <div class="product-section">
        <div class="product-icon">🛡️</div>
        <div class="product-info">
          <h3 class="product-name">布鲁计划 - 永久会员</h3>
          <p class="product-desc">90天科学戒色计划 + 每日心理引导 + 永久使用</p>
        </div>
        <div class="product-price">¥9.90</div>
      </div>

      <!-- 订单详情 -->
      <div class="detail-section">
        <div class="detail-row">
          <span class="detail-label">订单编号</span>
          <span class="detail-value order-no">{{ orderNo }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">创建时间</span>
          <span class="detail-value">{{ orderTime }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">商品金额</span>
          <span class="detail-value">¥9.90</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">优惠金额</span>
          <span class="detail-value discount">-¥0.00</span>
        </div>
      </div>

      <!-- 分割线 -->
      <div class="divider"></div>

      <!-- 实付金额 -->
      <div class="total-section">
        <span class="total-label">实付金额</span>
        <span class="total-price">¥9.90</span>
      </div>
    </div>

    <!-- 收货信息（虚拟商品，显示用户信息） -->
    <div class="receiver-card">
      <div class="card-title">
        <span class="title-icon">👤</span>
        <span>用户信息</span>
      </div>
      <div class="receiver-info">
        <div class="info-row">
          <span class="info-label">用户账号</span>
          <span class="info-value">{{ userPhone || '138****8888' }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">购买服务</span>
          <span class="info-value">布鲁计划永久会员</span>
        </div>
        <div class="info-row">
          <span class="info-label">服务类型</span>
          <span class="info-value">虚拟商品（无需配送）</span>
        </div>
      </div>
    </div>

    <!-- 支付方式 -->
    <div class="payment-card">
      <div class="card-title">
        <span class="title-icon">💳</span>
        <span>支付方式</span>
      </div>
      <div class="payment-options">
        <div
          class="payment-option"
          :class="{ active: selectedMethod === 'alipay' }"
          @click="selectedMethod = 'alipay'"
        >
          <div class="option-left">
            <span class="payment-icon alipay-icon">支</span>
            <div class="option-info">
              <span class="option-name">支付宝</span>
              <span class="option-desc">推荐使用</span>
            </div>
          </div>
          <span class="check-icon" v-if="selectedMethod === 'alipay'">✓</span>
        </div>

        <div
          class="payment-option"
          :class="{ active: selectedMethod === 'wechat' }"
          @click="selectedMethod = 'wechat'"
        >
          <div class="option-left">
            <span class="payment-icon wechat-icon">微</span>
            <div class="option-info">
              <span class="option-name">微信支付</span>
              <span class="option-desc">暂未开通</span>
            </div>
          </div>
          <span class="check-icon" v-if="selectedMethod === 'wechat'">✓</span>
        </div>
      </div>
    </div>

    <!-- 底部支付栏 -->
    <div class="bottom-bar">
      <div class="price-info">
        <span class="price-label">实付:</span>
        <span class="price-amount">¥9.90</span>
      </div>
      <button
        class="pay-btn"
        :disabled="!selectedMethod || isProcessing"
        @click="handlePayment"
      >
        {{ isProcessing ? '支付中...' : '立即支付' }}
      </button>
    </div>

    <!-- 支付结果弹窗 -->
    <div v-if="showResultModal" class="modal-overlay" @click.self="showResultModal = false">
      <div class="result-modal">
        <div v-if="paymentSuccess" class="result-content success">
          <div class="result-icon">✓</div>
          <h3 class="result-title">支付成功</h3>
          <p class="result-desc">订单号：{{ orderNo }}</p>
          <p class="result-desc">支付时间：{{ payTime }}</p>
          <p class="result-desc">支付金额：¥9.90</p>
          <button class="result-btn" @click="goToHome">完成</button>
        </div>
        <div v-else class="result-content failed">
          <div class="result-icon">✗</div>
          <h3 class="result-title">支付失败</h3>
          <p class="result-desc">{{ errorMessage }}</p>
          <button class="result-btn" @click="showResultModal = false">重新支付</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { createPaymentOrder } from '../services/payment'
import { syncUserToDatabase } from '../services/database'

const router = useRouter()

// 状态变量
const selectedMethod = ref('alipay')
const isProcessing = ref(false)
const showResultModal = ref(false)
const paymentSuccess = ref(false)
const errorMessage = ref('')
const userPhone = ref('')

// 订单信息
const orderNo = ref('')
const orderTime = ref('')
const payTime = ref('')

// 生成订单号
const generateOrderNo = () => {
  const date = new Date()
  const dateStr = date.getFullYear().toString() +
    String(date.getMonth() + 1).padStart(2, '0') +
    String(date.getDate()).padStart(2, '0')
  const randomStr = Math.random().toString(36).substr(2, 6).toUpperCase()
  return `BL${dateStr}${randomStr}`
}

// 格式化时间
const formatTime = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

onMounted(() => {
  // 初始化订单信息
  orderNo.value = generateOrderNo()
  orderTime.value = formatTime(new Date())
  
  // 获取用户信息
  const phone = localStorage.getItem('userPhone')
  if (phone) {
    userPhone.value = phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
  }
})

// 处理支付
const handlePayment = async () => {
  if (!selectedMethod.value || isProcessing.value) return

  isProcessing.value = true

  try {
    const result = await createPaymentOrder(selectedMethod.value, {
      amount: 990,
      subject: '布鲁计划永久会员',
      description: '90天科学戒色计划 + 每日心理引导 + 永久使用',
      orderNo: orderNo.value
    })

    if (result.success) {
      if (result.paymentSuccess || result.demo) {
        payTime.value = formatTime(new Date())
        handlePaymentSuccess()
      } else if (result.cancelled) {
        handlePaymentFailure('用户取消支付')
      } else {
        handlePaymentFailure(result.error || '支付失败')
      }
    } else {
      handlePaymentFailure(result.error || '创建订单失败')
    }
  } catch (error) {
    console.error('支付错误:', error)
    handlePaymentFailure('支付出错，请重试')
  } finally {
    isProcessing.value = false
  }
}

// 支付成功处理
const handlePaymentSuccess = () => {
  localStorage.setItem('hasPaid', 'true')
  localStorage.setItem('paymentMethod', selectedMethod.value)
  localStorage.setItem('paymentTime', Date.now().toString())
  localStorage.setItem('orderId', orderNo.value)
  localStorage.setItem('orderAmount', '9.90')

  syncUserToDatabase()

  paymentSuccess.value = true
  showResultModal.value = true
}

// 支付失败处理
const handlePaymentFailure = (error) => {
  errorMessage.value = error
  paymentSuccess.value = false
  showResultModal.value = true
}

// 返回首页
const goToHome = () => {
  router.replace('/home')
}
</script>

<style scoped>
.order-detail-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding-bottom: 80px;
}

/* 导航栏 */
.nav-bar {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background: #fff;
  border-bottom: 1px solid #eee;
  position: sticky;
  top: 0;
  z-index: 10;
}

.back-btn {
  background: none;
  border: none;
  font-size: 20px;
  color: #333;
  padding: 4px 8px;
  cursor: pointer;
}

.nav-title {
  flex: 1;
  text-align: center;
  font-size: 17px;
  font-weight: 600;
  color: #333;
  margin-right: 32px;
}

/* 订单卡片 */
.order-card {
  background: #fff;
  margin: 12px;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
}

.order-status {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px dashed #eee;
}

.status-badge {
  background: #ff9500;
  color: #fff;
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 500;
}

.order-time {
  font-size: 13px;
  color: #999;
}

/* 商品信息 */
.product-section {
  display: flex;
  align-items: center;
  padding: 12px 0;
  margin-bottom: 16px;
}

.product-icon {
  width: 60px;
  height: 60px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  margin-right: 12px;
  flex-shrink: 0;
}

.product-info {
  flex: 1;
}

.product-name {
  font-size: 15px;
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
}

.product-desc {
  font-size: 12px;
  color: #999;
  line-height: 1.4;
}

.product-price {
  font-size: 16px;
  font-weight: 600;
  color: #ff5000;
}

/* 订单详情 */
.detail-section {
  background: #fafafa;
  border-radius: 8px;
  padding: 12px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  font-size: 14px;
}

.detail-label {
  color: #666;
}

.detail-value {
  color: #333;
}

.order-no {
  font-family: monospace;
  font-size: 13px;
}

.discount {
  color: #ff5000;
}

/* 分割线 */
.divider {
  height: 1px;
  background: #eee;
  margin: 16px 0;
}

/* 实付金额 */
.total-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.total-label {
  font-size: 15px;
  font-weight: 600;
  color: #333;
}

.total-price {
  font-size: 20px;
  font-weight: 700;
  color: #ff5000;
}

/* 收货信息卡片 */
.receiver-card,
.payment-card {
  background: #fff;
  margin: 12px;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
}

.card-title {
  display: flex;
  align-items: center;
  font-size: 15px;
  font-weight: 600;
  color: #333;
  margin-bottom: 16px;
}

.title-icon {
  margin-right: 8px;
  font-size: 18px;
}

.receiver-info {
  background: #fafafa;
  border-radius: 8px;
  padding: 12px;
}

.info-row {
  display: flex;
  padding: 8px 0;
  font-size: 14px;
}

.info-label {
  color: #666;
  width: 80px;
  flex-shrink: 0;
}

.info-value {
  color: #333;
  flex: 1;
}

/* 支付方式 */
.payment-options {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.payment-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 12px;
  border: 1px solid #eee;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.payment-option.active {
  border-color: #1677ff;
  background: rgba(22, 119, 255, 0.04);
}

.option-left {
  display: flex;
  align-items: center;
}

.payment-icon {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
  margin-right: 12px;
  flex-shrink: 0;
}

.alipay-icon {
  background: #1677ff;
  color: #fff;
}

.wechat-icon {
  background: #07c160;
  color: #fff;
}

.option-info {
  display: flex;
  flex-direction: column;
}

.option-name {
  font-size: 15px;
  color: #333;
  font-weight: 500;
}

.option-desc {
  font-size: 12px;
  color: #999;
  margin-top: 2px;
}

.check-icon {
  width: 20px;
  height: 20px;
  background: #1677ff;
  color: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
}

/* 底部支付栏 */
.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  border-top: 1px solid #eee;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  z-index: 100;
}

.price-info {
  display: flex;
  align-items: baseline;
}

.price-label {
  font-size: 14px;
  color: #666;
  margin-right: 8px;
}

.price-amount {
  font-size: 24px;
  font-weight: 700;
  color: #ff5000;
}

.pay-btn {
  background: linear-gradient(135deg, #ff5000 0%, #ff8000 100%);
  color: #fff;
  border: none;
  padding: 12px 32px;
  border-radius: 24px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
}

.pay-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 弹窗 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  padding: 24px;
}

.result-modal {
  background: #fff;
  border-radius: 16px;
  padding: 32px 24px;
  width: 100%;
  max-width: 320px;
  text-align: center;
}

.result-content {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.result-icon {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  margin-bottom: 16px;
}

.success .result-icon {
  background: #e6f7e6;
  color: #52c41a;
}

.failed .result-icon {
  background: #fff1f0;
  color: #ff4d4f;
}

.result-title {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin-bottom: 12px;
}

.result-desc {
  font-size: 14px;
  color: #666;
  margin-bottom: 8px;
}

.result-btn {
  background: #1677ff;
  color: #fff;
  border: none;
  padding: 12px 48px;
  border-radius: 24px;
  font-size: 15px;
  font-weight: 500;
  margin-top: 20px;
  cursor: pointer;
}
</style>
