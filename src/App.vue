<template>
  <div class="app-container">
    <!-- 背景层 -->
    <div class="app-bg"></div>
    <!-- 内容层 -->
    <div class="app-content">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'

// 导入统一数据系统
import { useDailySync, initializeApp } from './composables/useDailySync'
import { getTodayKey } from './utils/dateUtils'
import { getUserTimeState } from './utils/storage'

const router = useRouter()

// 初始化每日同步系统
const {
  isReady,
  todayKey,
  currentDayIndex,
  isNewDayTriggered,
  handleAppResume,
  resetNewDayTrigger
} = useDailySync({
  onNewDay: async (dateKey, dayIndex) => {
    console.log('[App] New day started:', { dateKey, dayIndex })
    // 新的一天开始，可以在这里显示提示或更新UI
    resetNewDayTrigger()
  },
  onDayUnlock: async (dayIndex) => {
    console.log('[App] New day unlocked:', dayIndex)
    // 新内容解锁，可以在这里显示提示
  }
})

// 处理应用恢复
const handleVisibilityChange = async () => {
  if (document.visibilityState === 'visible') {
    await handleAppResume()
  }
}

// 处理窗口焦点变化
const handleFocusChange = async () => {
  await handleAppResume()
}

onMounted(() => {
  // 监听应用生命周期事件
  document.addEventListener('visibilitychange', handleVisibilityChange)
  window.addEventListener('focus', handleFocusChange)

  // 检查用户状态
  const hasCompletedSurvey = localStorage.getItem('hasCompletedSurvey')
  const isLoggedIn = localStorage.getItem('isLoggedIn')

  // 如果没有完成问卷，重定向到欢迎页
  if (!hasCompletedSurvey) {
    router.replace('/welcome')
  } else if (!isLoggedIn) {
    router.replace('/login')
  }

  // 检查是否需要初始化应用（首次启动）
  const userState = getUserTimeState()
  if (!userState.appStartDate && hasCompletedSurvey && isLoggedIn) {
    // 首次启动，初始化用户时间状态
    const todayKey = getTodayKey()
    initializeApp(todayKey)
    console.log('[App] App initialized with start date:', todayKey)
  }
})

onUnmounted(() => {
  // 清理事件监听
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  window.removeEventListener('focus', handleFocusChange)
})
</script>

<style>
/* 全局样式 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  background: #000000;
  color: #F8FAFC;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
  overflow-x: hidden;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  touch-action: manipulation;
}

/* App 容器 */
.app-container {
  min-height: 100vh;
  min-height: 100dvh;
  position: relative;
  overflow: hidden;
}

/* 背景层 */
.app-bg {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background:
    radial-gradient(ellipse at 20% 20%, #1e1b4b 0%, transparent 50%),
    radial-gradient(ellipse at 80% 80%, #172554 0%, transparent 50%),
    radial-gradient(ellipse at 50% 50%, #0f172a 0%, #000000 100%);
  z-index: 0;
}

/* 内容层 */
.app-content {
  position: relative;
  z-index: 1;
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

/* 测试内容 */
.test-content {
  text-align: center;
  color: #F8FAFC;
}

.test-content h1 {
  font-size: 32px;
  margin-bottom: 16px;
  background: linear-gradient(135deg, #3B82F6, #8B5CF6, #EC4899);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.test-content p {
  font-size: 16px;
  color: #94A3B8;
}

#app {
  min-height: 100vh;
  min-height: 100dvh;
  background: #000000;
}

/* 应用容器 - 适配各种屏幕尺寸 */
.app-container {
  width: 100%;
  max-width: 430px;  /* iPhone Pro Max 宽度 */
  min-height: 100vh;
  min-height: 100dvh;
  margin: 0 auto;
  position: relative;
  overflow-x: hidden;
  background: #000000;
  display: flex;
  flex-direction: column;
}

/* 背景层 */
.app-bg {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: #000000;
  z-index: 0;
}

/* 内容层 */
.app-content {
  position: relative;
  z-index: 1;
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  min-height: 100dvh;
}

/* 在更大屏幕上模拟手机显示 */
@media (min-width: 430px) {
  .app-container {
    border-left: 1px solid rgba(255, 255, 255, 0.1);
    border-right: 1px solid rgba(255, 255, 255, 0.1);
  }
}

/* 液态玻璃卡片 */
.glass-card {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
  border-radius: 24px;
}

/* 液态玻璃按钮 */
.glass-button {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.9), rgba(99, 102, 241, 0.9));
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  color: #F8FAFC;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.glass-button:active {
  transform: scale(0.95);
  opacity: 0.9;
}

.glass-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 输入框玻璃风格 */
.glass-input {
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  color: #F8FAFC;
  padding: 24px 32px;
  font-size: 16px;
  width: 100%;
  outline: none;
  transition: border-color 0.3s ease;
}

.glass-input::placeholder {
  color: rgba(248, 250, 252, 0.5);
}

.glass-input:focus {
  border-color: rgba(59, 130, 246, 0.5);
}

/* 动态流体背景 */
.liquid-bg {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: radial-gradient(ellipse at 20% 20%, #1e1b4b 0%, #000000 50%),
              radial-gradient(ellipse at 80% 80%, #172554 0%, #000000 50%),
              radial-gradient(ellipse at 50% 50%, #0f172a 0%, #000000 100%);
  z-index: -1;
}

/* 流动光斑动画 */
.liquid-orb {
  position: fixed;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.4;
  animation: float 20s ease-in-out infinite;
  z-index: -1;
}

.liquid-orb-1 {
  width: 200px;
  height: 200px;
  background: linear-gradient(135deg, #3B82F6, #6366F1);
  top: 10%;
  left: 10%;
  animation-delay: 0s;
}

.liquid-orb-2 {
  width: 250px;
  height: 250px;
  background: linear-gradient(135deg, #8B5CF6, #EC4899);
  top: 60%;
  right: 10%;
  animation-delay: -7s;
}

.liquid-orb-3 {
  width: 150px;
  height: 150px;
  background: linear-gradient(135deg, #06B6D4, #3B82F6);
  bottom: 20%;
  left: 30%;
  animation-delay: -14s;
}

@keyframes float {
  0%, 100% {
    transform: translate(0, 0) scale(1);
  }
  25% {
    transform: translate(30px, -30px) scale(1.05);
  }
  50% {
    transform: translate(-20px, 20px) scale(0.95);
  }
  75% {
    transform: translate(-30px, -20px) scale(1.02);
  }
}

/* 标题样式 */
.title {
  font-size: 28px;
  font-weight: 700;
  color: #F8FAFC;
  letter-spacing: -0.5px;
}

.subtitle {
  font-size: 16px;
  color: #94A3B8;
  line-height: 1.6;
}

/* 紧急按钮 */
.panic-button {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: linear-gradient(135deg, #EF4444, #DC2626);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 20px rgba(239, 68, 68, 0.5);
  animation: pulse 2s ease-in-out infinite;
  cursor: pointer;
}

@keyframes pulse {
  0%, 100% {
    box-shadow: 0 0 20px rgba(239, 68, 68, 0.5);
    transform: scale(1);
  }
  50% {
    box-shadow: 0 0 30px rgba(239, 68, 68, 0.8);
    transform: scale(1.05);
  }
}

/* 进度条 */
.progress-bar {
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #3B82F6, #6366F1);
  border-radius: 3px;
  transition: width 0.5s ease;
}

/* 渐变文字 */
.gradient-text {
  background: linear-gradient(135deg, #3B82F6, #8B5CF6, #EC4899);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* 页面切换动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.fade-enter-from {
  opacity: 0;
  transform: translateY(20px);
}

.fade-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}

/* 通用按钮样式 */
button {
  border: none;
  outline: none;
  cursor: pointer;
  font-family: inherit;
}

button:active {
  transform: scale(0.98);
}

/* uni-app 标签兼容 - 让 <view> <text> 表现正常 */
view {
  display: block;
}

text {
  display: inline;
}

/* rpx 单位兼容 - 1rpx = 0.5px (以 750rpx = 375px 为基准) */
html {
  /* 设置根字体大小用于 rpx 计算 */
  font-size: 2px;
}

/* 或者使用 CSS 变量方式 */
:root {
  --rpx: 0.5px;
}
</style>
