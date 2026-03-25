import { createRouter, createWebHashHistory } from 'vue-router'

// 统一使用目录结构导入页面组件
const Welcome = () => import('./pages/welcome/welcome.vue')
const Survey = () => import('./pages/survey/survey.vue')
const ProductIntro = () => import('./pages/product-intro/product-intro.vue')
const Payment = () => import('./pages/payment/payment.vue')
const OrderDetail = () => import('./pages/order-detail/order-detail.vue')
const Login = () => import('./pages/login/login.vue')
const Home = () => import('./pages/home/home.vue')
const Plan = () => import('./pages/plan/plan.vue')
const Panic = () => import('./pages/panic/panic.vue')

const routes = [
  {
    path: '/',
    redirect: '/welcome'
  },
  {
    path: '/welcome',
    name: 'Welcome',
    component: Welcome
  },
  {
    path: '/survey',
    name: 'Survey',
    component: Survey
  },
  {
    path: '/product-intro',
    name: 'ProductIntro',
    component: ProductIntro
  },
  {
    path: '/payment',
    name: 'Payment',
    component: Payment
  },
  {
    path: '/order-detail',
    name: 'OrderDetail',
    component: OrderDetail
  },
  {
    path: '/login',
    name: 'Login',
    component: Login
  },
  {
    path: '/home',
    name: 'Home',
    component: Home
  },
  {
    path: '/plan',
    name: 'Plan',
    component: Plan
  },
  {
    path: '/panic',
    name: 'Panic',
    component: Panic
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
