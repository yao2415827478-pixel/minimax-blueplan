<template>
  <div class="payment-page">
    <div class="liquid-bg"></div>
    
    <div class="content">
      <h1 class="title">确认订单</h1>
      
      <div class="order-card">
        <h3>布鲁计划会员</h3>
        <p>90天戒色计划 + 每日心理引导 + 永久使用</p>
        <div class="price">¥{{ finalPrice }}</div>
      </div>
      
      <div class="invite-code-section">
        <label>邀请码（选填）</label>
        <input 
          v-model="inviteCode" 
          placeholder="输入邀请码立减2元"
          class="code-input"
        />
        <button @click="validateCode" class="validate-btn">验证</button>
      </div>
      
      <div class="pay-methods">
        <label class="pay-method" :class="{ active: payMethod === 'alipay' }">
          <input type="radio" v-model="payMethod" value="alipay" />
          <span>支付宝</span>
        </label>
      </div>
      
      <button class="pay-btn" @click="createOrder" :disabled="loading">
        {{ loading ? '处理中...' : '立即支付' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const inviteCode = ref('')
const payMethod = ref('alipay')
const loading = ref(false)
const discount = ref(0)

const basePrice = 12.9
const finalPrice = computed(() => (basePrice - discount.value).toFixed(2))

const validateCode = async () => {
  if (!inviteCode.value) return
  
  try {
    const res = await fetch('http://120.27.139.123:3000/api/invite/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inviteCode: inviteCode.value })
    })
    const data = await res.json()
    
    if (data.success && data.data.valid) {
      discount.value = data.data.discountAmount / 100
      alert('邀请码有效！')
    } else {
      alert(data.error?.message || '邀请码无效')
    }
  } catch (e) {
    alert('验证失败')
  }
}

const createOrder = async () => {
  loading.value = true
  
  try {
    const phone = localStorage.getItem('phone') || '13800138000'
    const res = await fetch('http://120.27.139.123:3000/alipay/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone,
        inviteCode: inviteCode.value,
        productType: 'standard',
        channel: 'alipay',
        amount: finalPrice.value
      })
    })
    const data = await res.json()
    
    if (data.success) {
      // 保存订单号
      localStorage.setItem('currentOrderId', data.orderId)
      
      // 调用支付宝支付
      if (window.Capacitor) {
        const { AlipayPlugin } = await import('../../services/payment.js')
        await AlipayPlugin.pay(data.payParams.orderStr)
      } else {
        // H5调试模式
        alert('H5模式：订单创建成功 ' + data.orderId)
        router.push('/home')
      }
    }
  } catch (e) {
    alert('支付失败：' + e.message)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.payment-page {
  min-height: 100vh;
  position: relative;
  padding: 40px 24px;
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

.order-card {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 24px;
}

.order-card h3 {
  color: #F8FAFC;
  margin-bottom: 8px;
}

.order-card p {
  color: #94A3B8;
  font-size: 14px;
  margin-bottom: 16px;
}

.price {
  font-size: 32px;
  font-weight: 700;
  color: #10B981;
}

.invite-code-section {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
}

.invite-code-section label {
  display: block;
  color: #94A3B8;
  margin-bottom: 8px;
  width: 100%;
}

.code-input {
  flex: 1;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: #F8FAFC;
}

.validate-btn {
  padding: 12px 20px;
  background: rgba(59, 130, 246, 0.2);
  border: 1px solid rgba(59, 130, 246, 0.5);
  border-radius: 8px;
  color: #3B82F6;
  cursor: pointer;
}

.pay-methods {
  margin-bottom: 32px;
}

.pay-method {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  cursor: pointer;
}

.pay-method.active {
  border: 1px solid #3B82F6;
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
}
</style>
