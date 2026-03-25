<template>
  <div class="product-intro-page">
    <div class="liquid-bg"></div>
    
    <div class="content">
      <h1 class="title">布鲁计划</h1>
      <p class="subtitle">90天科学戒色计划</p>
      
      <div class="features">
        <div class="feature-item">
          <span class="icon">📊</span>
          <span>科学评估体系</span>
        </div>
        <div class="feature-item">
          <span class="icon">📅</span>
          <span>90天进度追踪</span>
        </div>
        <div class="feature-item">
          <span class="icon">📝</span>
          <span>每日心理引导</span>
        </div>
        <div class="feature-item">
          <span class="icon">🆘</span>
          <span>紧急求助系统</span>
        </div>
      </div>
      
      <div class="price-section">
        <span class="original-price">原价 ¥29.9</span>
        <span class="current-price">¥12.9</span>
      </div>
      
      <button class="start-btn" @click="goToPayment">
        开启你的戒色之旅
      </button>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

const goToPayment = () => {
  router.push('/payment')
}
</script>

<style scoped>
.product-intro-page {
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
  background: radial-gradient(ellipse at 20% 20%, #1e1b4b 0%, #000000 50%),
              radial-gradient(ellipse at 80% 80%, #172554 0%, #000000 50%);
  z-index: -1;
}

.content {
  position: relative;
  z-index: 1;
  max-width: 400px;
  margin: 0 auto;
}

.title {
  font-size: 32px;
  font-weight: 700;
  text-align: center;
  margin-bottom: 8px;
  background: linear-gradient(135deg, #3B82F6, #8B5CF6);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.subtitle {
  font-size: 16px;
  color: #94A3B8;
  text-align: center;
  margin-bottom: 40px;
}

.features {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 40px;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  color: #F8FAFC;
}

.icon {
  font-size: 24px;
}

.price-section {
  text-align: center;
  margin-bottom: 32px;
}

.original-price {
  font-size: 14px;
  color: #64748B;
  text-decoration: line-through;
  margin-right: 12px;
}

.current-price {
  font-size: 36px;
  font-weight: 700;
  color: #10B981;
}

.start-btn {
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
</style>
