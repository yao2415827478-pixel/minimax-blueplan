<template>
  <div class="order-detail-page">
    <div class="liquid-bg"></div>
    
    <div class="content">
      <h1 class="title">订单详情</h1>
      
      <div class="order-card">
        <div class="order-header">
          <span class="order-no">订单号：{{ orderId }}</span>
          <span class="order-status" :class="status">{{ statusText }}</span>
        </div>
        
        <div class="order-item">
          <span class="label">商品</span>
          <span class="value">布鲁计划会员</span>
        </div>
        
        <div class="order-item">
          <span class="label">金额</span>
          <span class="value price">¥{{ amount }}</span>
        </div>
        
        <div class="order-item">
          <span class="label">支付方式</span>
          <span class="value">支付宝</span>
        </div>
        
        <div class="order-item">
          <span class="label">创建时间</span>
          <span class="value">{{ createTime }}</span>
        </div>
      </div>
      
      <button class="home-btn" @click="goHome">返回首页</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const orderId = ref('')
const amount = ref('12.90')
const status = ref('pending')
const createTime = ref('')

const statusText = {
  pending: '待支付',
  paid: '已支付',
  failed: '支付失败'
}

onMounted(() => {
  orderId.value = localStorage.getItem('currentOrderId') || '未知'
  createTime.value = new Date().toLocaleString()
})

const goHome = () => {
  router.push('/home')
}
</script>

<style scoped>
.order-detail-page {
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
  margin-bottom: 32px;
}

.order-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.order-no {
  font-size: 14px;
  color: #94A3B8;
}

.order-status {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
}

.order-status.pending {
  background: rgba(245, 158, 11, 0.2);
  color: #F59E0B;
}

.order-status.paid {
  background: rgba(16, 185, 129, 0.2);
  color: #10B981;
}

.order-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 16px;
}

.order-item .label {
  color: #94A3B8;
}

.order-item .value {
  color: #F8FAFC;
}

.order-item .price {
  font-size: 20px;
  font-weight: 700;
  color: #10B981;
}

.home-btn {
  width: 100%;
  padding: 16px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  color: #F8FAFC;
  font-size: 16px;
  cursor: pointer;
}
</style>
