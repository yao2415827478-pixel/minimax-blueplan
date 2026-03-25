// API 配置文件
// 支持环境变量配置，默认使用相对路径（配合 nginx 反向代理）

const isDev = import.meta.env.DEV
const isCapacitor = typeof window !== 'undefined' && window.Capacitor

// 基础 API 地址
const API_BASE = import.meta.env.VITE_API_BASE || '/api'
const ALIPAY_BASE = import.meta.env.VITE_ALIPAY_BASE || '/alipay'

// 短信验证码 API 路径（与 nginx 配置保持一致）
const SMS_SEND = '/send-sms-code'
const SMS_VERIFY = '/verify-sms-code'

const API_CONFIG = {
  // 基础配置
  baseUrl: isDev ? 'http://120.27.139.123:3000' : '',
  
  // 数据库 API
  database: {
    baseUrl: isDev ? 'http://120.27.139.123:3000' : API_BASE
  },

  // 短信验证码 API
  smsApi: {
    baseUrl: isDev ? 'http://120.27.139.123:3000' : '',
    sendCode: SMS_SEND,
    verifyCode: SMS_VERIFY
  },

  // 支付宝支付 API
  alipay: {
    baseUrl: isDev ? 'http://120.27.139.123:3000' : ALIPAY_BASE,
    createOrder: '/create-order',
    queryOrder: '/query-order',
    notifyUrl: '/alipay-notify'
  },
  
  // 邀请返现 API
  invite: {
    validate: '/api/invite/validate',
    bind: '/api/invite/bind',
    activate: '/api/invite/activate',
    summary: '/api/invite/summary',
    rewardLedger: '/api/invite/reward-ledger'
  },
  
  // 提现 API
  withdraw: {
    apply: '/api/withdraw/apply',
    records: '/api/withdraw/records'
  }
}

// 获取完整API地址
export const getApiUrl = (endpoint) => {
  const base = isDev ? API_CONFIG.baseUrl : ''
  return `${base}${endpoint}`
}

export const getSmsApiUrl = (endpoint) => {
  const base = isDev ? API_CONFIG.smsApi.baseUrl : ''
  return `${base}${API_CONFIG.smsApi[endpoint]}`
}

export const getAlipayApiUrl = (endpoint) => {
  const base = isDev ? API_CONFIG.alipay.baseUrl : ALIPAY_BASE
  return `${base}${API_CONFIG.alipay[endpoint]}`
}

export default API_CONFIG
