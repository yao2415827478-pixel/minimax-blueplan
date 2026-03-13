// 支付宝 App 支付插件封装
// 用于在 App 中调用支付宝原生 SDK 进行支付
// 注意：此插件仅在原生 App 环境中有效，浏览器环境中返回演示结果

/**
 * 支付宝支付
 * @param {string} orderStr - 后端返回的支付参数字符串
 * @returns {Promise<object>} 支付结果
 */
export const alipayPay = async (orderStr) => {
  // 检查是否在原生环境中
  const isNative = typeof window.android !== 'undefined' ||
                   typeof window.Capacitor !== 'undefined'

  if (!isNative) {
    // 在浏览器环境中，返回模拟结果
    console.warn('支付宝插件在浏览器环境中不可用，使用演示模式')
    return {
      success: true,
      demo: true,
      message: '浏览器环境演示模式',
      resultCode: '9000'
    }
  }

  // 在原生环境中，尝试调用支付宝插件
  try {
    if (window.AlipayPlugin && window.AlipayPlugin.pay) {
      const result = await window.AlipayPlugin.pay({ orderStr })
      console.log('支付宝支付结果:', result)
      return result
    } else {
      console.warn('支付宝插件未安装')
      return {
        success: false,
        error: '支付宝插件未安装'
      }
    }
  } catch (error) {
    console.error('支付宝支付失败:', error)
    return {
      success: false,
      error: error.message || '支付失败'
    }
  }
}

/**
 * 检查支付宝是否安装
 * @returns {Promise<boolean>} 是否安装了支付宝
 */
export const isAlipayInstalled = async () => {
  // 检查是否在原生环境中
  const isNative = typeof window.android !== 'undefined' ||
                   typeof window.Capacitor !== 'undefined'

  if (!isNative) {
    return false
  }

  try {
    if (window.AlipayPlugin && window.AlipayPlugin.isAlipayInstalled) {
      const result = await window.AlipayPlugin.isAlipayInstalled()
      return result?.installed || false
    }
    return false
  } catch (error) {
    console.error('检查支付宝安装状态失败:', error)
    return false
  }
}

/**
 * 支付宝授权（获取用户信息）
 * @param {string} authInfo - 授权信息字符串
 * @returns {Promise<object>} 授权结果
 */
export const alipayAuth = async (authInfo) => {
  // 检查是否在原生环境中
  const isNative = typeof window.android !== 'undefined' ||
                   typeof window.Capacitor !== 'undefined'

  if (!isNative) {
    console.warn('支付宝插件在浏览器环境中不可用')
    return {
      success: false,
      demo: true,
      message: '浏览器环境演示模式'
    }
  }

  try {
    if (window.AlipayPlugin && window.AlipayPlugin.auth) {
      const result = await window.AlipayPlugin.auth({ authInfo })
      console.log('支付宝授权结果:', result)
      return result
    }
    return { success: false, error: '支付宝插件未安装' }
  } catch (error) {
    console.error('支付宝授权失败:', error)
    return {
      success: false,
      error: error.message || '授权失败'
    }
  }
}

export default {
  pay: alipayPay,
  isInstalled: isAlipayInstalled,
  auth: alipayAuth
}
