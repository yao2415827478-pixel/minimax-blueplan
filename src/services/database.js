// 统一数据服务
import { http } from './http.js'

// 存储键名常量
export const StorageKeys = {
  USER_PROFILE: 'userProfile',
  USER_SESSION: 'userSession',
  ORDERS: 'orders',
  CURRENT_ORDER: 'currentOrderId',
  SURVEY_RESULT: 'surveyResult',
  JOURNAL_ENTRIES: 'journalEntries',
  PLAN_PROGRESS: 'planProgress',
  MILESTONES: 'milestones',
  HAS_COMPLETED_SURVEY: 'hasCompletedSurvey',
  IS_LOGGED_IN: 'isLoggedIn',
  TOKEN: 'token',
  PHONE: 'phone'
}

class DatabaseService {
  /**
   * 用户相关
   */
  
  // 创建用户
  async createUser(userData) {
    try {
      const response = await http.post('/api/auth/register', userData)
      if (response.success) {
        this.setUserSession(response.data)
        return response.data
      }
      throw new Error(response.error?.message || '创建用户失败')
    } catch (error) {
      console.error('[Database] 创建用户失败:', error)
      // 降级到本地存储
      const localUser = {
        id: 'local_' + Date.now(),
        ...userData,
        createdAt: new Date().toISOString()
      }
      this.setLocalUser(localUser)
      return localUser
    }
  }

  // 登录
  async login(credentials) {
    try {
      const response = await http.post('/api/auth/login', credentials)
      if (response.success) {
        this.setUserSession(response.data)
        return response.data
      }
      throw new Error(response.error?.message || '登录失败')
    } catch (error) {
      console.error('[Database] 登录失败:', error)
      // 开发模式：模拟登录
      if (credentials.code === '123456' || credentials.code === '000000') {
        const mockUser = {
          token: 'mock_token_' + Date.now(),
          user: {
            id: 'U' + Date.now(),
            phone: credentials.phone,
            nickname: '战士',
            inviteCode: this.generateInviteCode()
          }
        }
        this.setUserSession(mockUser)
        return mockUser
      }
      throw error
    }
  }

  // 获取用户信息
  async getUser(userId) {
    try {
      const response = await http.get(`/api/user/${userId}`)
      if (response.success) {
        return response.data
      }
      throw new Error(response.error?.message)
    } catch (error) {
      console.error('[Database] 获取用户失败:', error)
      return this.getLocalUser()
    }
  }

  // 更新用户信息
  async updateUser(userId, updates) {
    try {
      const response = await http.put(`/api/user/${userId}`, updates)
      if (response.success) {
        this.updateLocalUser(updates)
        return response.data
      }
      throw new Error(response.error?.message)
    } catch (error) {
      console.error('[Database] 更新用户失败:', error)
      this.updateLocalUser(updates)
      return this.getLocalUser()
    }
  }

  // 同步用户数据到服务端
  async syncUserToDatabase() {
    const localUser = this.getLocalUser()
    if (!localUser) return null
    
    try {
      const response = await http.post('/api/user/sync', localUser)
      return response.data
    } catch (error) {
      console.error('[Database] 同步用户失败:', error)
      return localUser
    }
  }

  /**
   * 本地存储操作
   */
  
  setUserSession(sessionData) {
    localStorage.setItem(StorageKeys.TOKEN, sessionData.token)
    localStorage.setItem(StorageKeys.USER_PROFILE, JSON.stringify(sessionData.user))
    localStorage.setItem(StorageKeys.PHONE, sessionData.user.phone)
    localStorage.setItem(StorageKeys.IS_LOGGED_IN, 'true')
  }

  getUserSession() {
    const token = localStorage.getItem(StorageKeys.TOKEN)
    const userJson = localStorage.getItem(StorageKeys.USER_PROFILE)
    
    if (!token || !userJson) return null
    
    try {
      return {
        token,
        user: JSON.parse(userJson)
      }
    } catch {
      return null
    }
  }

  setLocalUser(user) {
    localStorage.setItem(StorageKeys.USER_PROFILE, JSON.stringify(user))
    localStorage.setItem(StorageKeys.PHONE, user.phone)
  }

  getLocalUser() {
    const userJson = localStorage.getItem(StorageKeys.USER_PROFILE)
    if (!userJson) return null
    
    try {
      return JSON.parse(userJson)
    } catch {
      return null
    }
  }

  updateLocalUser(updates) {
    const user = this.getLocalUser() || {}
    const updated = { ...user, ...updates, updatedAt: new Date().toISOString() }
    this.setLocalUser(updated)
    return updated
  }

  clearUserSession() {
    Object.values(StorageKeys).forEach(key => {
      localStorage.removeItem(key)
    })
  }

  /**
   * 问卷相关
   */
  
  saveSurveyResult(result) {
    localStorage.setItem(StorageKeys.SURVEY_RESULT, JSON.stringify(result))
    localStorage.setItem(StorageKeys.HAS_COMPLETED_SURVEY, 'true')
  }

  getSurveyResult() {
    const json = localStorage.getItem(StorageKeys.SURVEY_RESULT)
    if (!json) return null
    
    try {
      return JSON.parse(json)
    } catch {
      return null
    }
  }

  hasCompletedSurvey() {
    return localStorage.getItem(StorageKeys.HAS_COMPLETED_SURVEY) === 'true'
  }

  /**
   * 日记相关
   */
  
  saveJournalEntry(entry) {
    const entries = this.getJournalEntries()
    const existingIndex = entries.findIndex(e => e.id === entry.id)
    
    if (existingIndex >= 0) {
      entries[existingIndex] = { ...entry, updatedAt: new Date().toISOString() }
    } else {
      entries.push({
        ...entry,
        id: entry.id || 'JE_' + Date.now(),
        createdAt: new Date().toISOString()
      })
    }
    
    localStorage.setItem(StorageKeys.JOURNAL_ENTRIES, JSON.stringify(entries))
    return entry
  }

  getJournalEntries() {
    const json = localStorage.getItem(StorageKeys.JOURNAL_ENTRIES)
    if (!json) return []
    
    try {
      return JSON.parse(json)
    } catch {
      return []
    }
  }

  deleteJournalEntry(entryId) {
    const entries = this.getJournalEntries().filter(e => e.id !== entryId)
    localStorage.setItem(StorageKeys.JOURNAL_ENTRIES, JSON.stringify(entries))
  }

  /**
   * 计划进度相关
   */
  
  savePlanProgress(progress) {
    localStorage.setItem(StorageKeys.PLAN_PROGRESS, JSON.stringify({
      ...progress,
      updatedAt: new Date().toISOString()
    }))
  }

  getPlanProgress() {
    const json = localStorage.getItem(StorageKeys.PLAN_PROGRESS)
    if (!json) return null
    
    try {
      return JSON.parse(json)
    } catch {
      return null
    }
  }

  /**
   * 里程碑相关
   */
  
  saveMilestones(milestones) {
    localStorage.setItem(StorageKeys.MILESTONES, JSON.stringify(milestones))
  }

  getMilestones() {
    const json = localStorage.getItem(StorageKeys.MILESTONES)
    if (!json) return []
    
    try {
      return JSON.parse(json)
    } catch {
      return []
    }
  }

  /**
   * 通用存储方法
   */
  
  set(key, value) {
    if (typeof value === 'object') {
      localStorage.setItem(key, JSON.stringify(value))
    } else {
      localStorage.setItem(key, value)
    }
  }

  get(key, defaultValue = null) {
    const value = localStorage.getItem(key)
    if (value === null) return defaultValue
    
    try {
      return JSON.parse(value)
    } catch {
      return value
    }
  }

  remove(key) {
    localStorage.removeItem(key)
  }

  clear() {
    localStorage.clear()
  }

  /**
   * 工具方法
   */
  
  generateInviteCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let code = ''
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return code
  }

  /**
   * 应用启动时恢复数据
   */
  async bootstrap() {
    const session = this.getUserSession()
    const currentOrderId = localStorage.getItem(StorageKeys.CURRENT_ORDER)
    
    return {
      isLoggedIn: !!session,
      user: session?.user || null,
      hasCompletedSurvey: this.hasCompletedSurvey(),
      currentOrderId,
      surveyResult: this.getSurveyResult()
    }
  }
}

// 导出单例
export const db = new DatabaseService()

// 导出类
export { DatabaseService }
