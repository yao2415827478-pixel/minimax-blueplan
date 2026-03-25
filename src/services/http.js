// 统一 HTTP 请求封装
const BASE_URL = import.meta.env.VITE_API_BASE || ''
const TIMEOUT = 30000

class HttpError extends Error {
  constructor(message, status, data) {
    super(message)
    this.name = 'HttpError'
    this.status = status
    this.data = data
  }
}

async function request(url, options = {}) {
  const fullUrl = url.startsWith('http') ? url : `${BASE_URL}${url}`
  
  const config = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    },
    ...options
  }
  
  // 添加 token
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  
  // 超时控制
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT)
  config.signal = controller.signal
  
  try {
    const response = await fetch(fullUrl, config)
    clearTimeout(timeoutId)
    
    let data
    const contentType = response.headers.get('content-type')
    if (contentType && contentType.includes('application/json')) {
      data = await response.json()
    } else {
      data = await response.text()
    }
    
    if (!response.ok) {
      throw new HttpError(
        data.message || `HTTP ${response.status}`,
        response.status,
        data
      )
    }
    
    return data
  } catch (error) {
    clearTimeout(timeoutId)
    
    if (error.name === 'AbortError') {
      throw new HttpError('请求超时', 408)
    }
    
    throw error
  }
}

export const http = {
  get: (url, params) => {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : ''
    return request(url + queryString)
  },
  
  post: (url, data) => request(url, {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  
  put: (url, data) => request(url, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  
  delete: (url) => request(url, { method: 'DELETE' })
}

export { HttpError }
