/**
 * 统一存储层
 * 所有数据存储必须使用此工具，按日期键索引
 * 禁止在各页面单独操作 localStorage
 */

import { STORAGE_KEYS } from './dateUtils'

// ==================== 基础存储操作 ====================

/**
 * 获取本地存储值
 * @param {string} key - 存储键名
 * @param {any} defaultValue - 默认值
 * @returns {any}
 */
function getItem(key, defaultValue = null) {
  try {
    const item = localStorage.getItem(key)
    if (item === null) return defaultValue
    return JSON.parse(item)
  } catch (error) {
    console.error(`[Storage] Get item error: ${key}`, error)
    return defaultValue
  }
}

/**
 * 设置本地存储值
 * @param {string} key - 存储键名
 * @param {any} value - 要存储的值
 */
function setItem(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch (error) {
    console.error(`[Storage] Set item error: ${key}`, error)
    return false
  }
}

/**
 * 移除本地存储项
 * @param {string} key - 存储键名
 */
function removeItem(key) {
  try {
    localStorage.removeItem(key)
    return true
  } catch (error) {
    console.error(`[Storage] Remove item error: ${key}`, error)
    return false
  }
}

// ==================== 用户时间状态 ====================

/**
 * 获取用户时间状态
 * @returns {Object} { currentDateKey, appStartDate, lastActiveDateKey, currentDayIndex }
 */
export function getUserTimeState() {
  return {
    currentDateKey: getItem(STORAGE_KEYS.CURRENT_DATE_KEY, null),
    appStartDate: getItem(STORAGE_KEYS.APP_START_DATE, null),
    lastActiveDateKey: getItem(STORAGE_KEYS.LAST_ACTIVE_DATE_KEY, null),
    currentDayIndex: getItem(STORAGE_KEYS.CURRENT_DAY_INDEX, 1)
  }
}

/**
 * 保存用户时间状态
 * @param {Object} state - { currentDateKey, appStartDate, lastActiveDateKey, currentDayIndex }
 */
export function saveUserTimeState(state) {
  if (state.currentDateKey !== undefined) {
    setItem(STORAGE_KEYS.CURRENT_DATE_KEY, state.currentDateKey)
  }
  if (state.appStartDate !== undefined) {
    setItem(STORAGE_KEYS.APP_START_DATE, state.appStartDate)
  }
  if (state.lastActiveDateKey !== undefined) {
    setItem(STORAGE_KEYS.LAST_ACTIVE_DATE_KEY, state.lastActiveDateKey)
  }
  if (state.currentDayIndex !== undefined) {
    setItem(STORAGE_KEYS.CURRENT_DAY_INDEX, state.currentDayIndex)
  }
}

/**
 * 初始化用户时间状态（首次启动）
 * @param {string} startDateKey - 计划开始日期
 */
export function initUserTimeState(startDateKey) {
  const todayKey = getTodayKey()
  const dayIndex = getDayIndexFromStart(startDateKey, todayKey)

  const state = {
    currentDateKey: todayKey,
    appStartDate: startDateKey,
    lastActiveDateKey: todayKey,
    currentDayIndex: dayIndex
  }

  saveUserTimeState(state)
  return state
}

/**
 * 更新每日同步后的时间状态
 * @param {string} newDateKey - 新日期键
 * @param {number} newDayIndex - 新的天数索引
 */
export function updateTimeStateOnSync(newDateKey, newDayIndex) {
  const current = getUserTimeState()

  const newState = {
    currentDateKey: newDateKey,
    lastActiveDateKey: newDateKey,
    currentDayIndex: newDayIndex
  }

  saveUserTimeState(newState)
  return newState
}

// ==================== 日记数据 ====================

/**
 * 获取所有日记数据
 * @returns {Object} 日期键 -> 日记内容 的映射
 */
export function getAllJournalEntries() {
  return getItem(STORAGE_KEYS.JOURNAL_ENTRIES, {})
}

/**
 * 获取指定日期的日记
 * @param {string} dateKey - YYYY-MM-DD
 * @returns {Object|null} 日记对象或null
 */
export function getJournalByDate(dateKey) {
  const allEntries = getAllJournalEntries()
  return allEntries[dateKey] || null
}

/**
 * 保存指定日期的日记
 * @param {string} dateKey - YYYY-MM-DD
 * @param {Object} journalData - { content, mood, tags, createdAt, updatedAt }
 * @returns {boolean} 是否保存成功
 */
export function saveJournalByDate(dateKey, journalData) {
  const allEntries = getAllJournalEntries()

  const entry = {
    ...journalData,
    dateKey,
    updatedAt: new Date().toISOString(),
    // 如果是新创建，设置创建时间
    createdAt: journalData.createdAt || new Date().toISOString()
  }

  allEntries[dateKey] = entry
  return setItem(STORAGE_KEYS.JOURNAL_ENTRIES, allEntries)
}

/**
 * 删除指定日期的日记
 * @param {string} dateKey - YYYY-MM-DD
 * @returns {boolean} 是否删除成功
 */
export function deleteJournalByDate(dateKey) {
  const allEntries = getAllJournalEntries()
  delete allEntries[dateKey]
  return setItem(STORAGE_KEYS.JOURNAL_ENTRIES, allEntries)
}

/**
 * 获取日记日期列表（按日期降序）
 * @returns {string[]} 日期键数组
 */
export function getJournalDateList() {
  const allEntries = getAllJournalEntries()
  return Object.keys(allEntries).sort().reverse()
}

// ==================== 每日任务进度 ====================

/**
 * 获取所有每日任务进度数据
 * @returns {Object} 日期键 -> 任务进度 的映射
 */
export function getAllPlanProgress() {
  return getItem(STORAGE_KEYS.PLAN_PROGRESS, {})
}

/**
 * 获取指定日期的任务进度
 * @param {string} dateKey - YYYY-MM-DD
 * @returns {Object|null} 任务进度对象或null
 */
export function getPlanProgressByDate(dateKey) {
  const allProgress = getAllPlanProgress()
  return allProgress[dateKey] || null
}

/**
 * 保存指定日期的任务进度
 * @param {string} dateKey - YYYY-MM-DD
 * @param {Object} progressData - { tasks: [{id, completed, ...}], dayIndex, ... }
 * @returns {boolean} 是否保存成功
 */
export function savePlanProgressByDate(dateKey, progressData) {
  const allProgress = getAllPlanProgress()

  const entry = {
    ...progressData,
    dateKey,
    updatedAt: new Date().toISOString()
  }

  allProgress[dateKey] = entry
  return setItem(STORAGE_KEYS.PLAN_PROGRESS, allProgress)
}

/**
 * 更新指定日期的单个任务状态
 * @param {string} dateKey - YYYY-MM-DD
 * @param {string} taskId - 任务ID
 * @param {boolean} completed - 是否完成
 * @returns {boolean} 是否保存成功
 */
export function updateTaskCompletion(dateKey, taskId, completed) {
  let progress = getPlanProgressByDate(dateKey)

  if (!progress) {
    progress = { tasks: [], dayIndex: getDayIndexFromStart(getItem(STORAGE_KEYS.APP_START_DATE), dateKey) }
  }

  // 查找或创建任务
  const taskIndex = progress.tasks.findIndex(t => t.id === taskId)
  if (taskIndex >= 0) {
    progress.tasks[taskIndex].completed = completed
    progress.tasks[taskIndex].completedAt = completed ? new Date().toISOString() : null
  } else {
    progress.tasks.push({
      id: taskId,
      completed,
      completedAt: completed ? new Date().toISOString() : null
    })
  }

  return savePlanProgressByDate(dateKey, progress)
}

/**
 * 获取任务进度日期列表（按日期降序）
 * @returns {string[]} 日期键数组
 */
export function getPlanProgressDateList() {
  const allProgress = getAllPlanProgress()
  return Object.keys(allProgress).sort().reverse()
}

// ==================== 日历打卡状态 ====================

/**
 * 获取所有日历打卡状态
 * @returns {Object} 日期键 -> 打卡状态 的映射
 */
export function getAllCalendarStatus() {
  return getItem(STORAGE_KEYS.CALENDAR_STATUS, {})
}

/**
 * 获取指定日期的打卡状态
 * @param {string} dateKey - YYYY-MM-DD
 * @returns {Object|null} 打卡状态对象或null
 */
export function getCalendarStatusByDate(dateKey) {
  const allStatus = getAllCalendarStatus()
  return allStatus[dateKey] || null
}

/**
 * 保存指定日期的打卡状态
 * @param {string} dateKey - YYYY-MM-DD
 * @param {Object} statusData - { checked, checkInTime, checkOutTime, notes }
 * @returns {boolean} 是否保存成功
 */
export function saveCalendarStatusByDate(dateKey, statusData) {
  const allStatus = getAllCalendarStatus()

  const entry = {
    ...statusData,
    dateKey,
    updatedAt: new Date().toISOString()
  }

  allStatus[dateKey] = entry
  return setItem(STORAGE_KEYS.CALENDAR_STATUS, allStatus)
}

/**
 * 标记指定日期为已打卡
 * @param {string} dateKey - YYYY-MM-DD
 * @param {string} checkInTime - 打卡时间（可选，默认当前时间）
 * @returns {boolean}
 */
export function checkInDate(dateKey, checkInTime = null) {
  return saveCalendarStatusByDate(dateKey, {
    checked: true,
    checkInTime: checkInTime || new Date().toISOString()
  })
}

/**
 * 取消指定日期的打卡
 * @param {string} dateKey - YYYY-MM-DD
 * @returns {boolean}
 */
export function uncheckDate(dateKey) {
  return saveCalendarStatusByDate(dateKey, {
    checked: false,
    checkInTime: null
  })
}

/**
 * 获取打卡日期列表
 * @returns {string[]} 已打卡的日期键数组
 */
export function getCheckedDateList() {
  const allStatus = getAllCalendarStatus()
  return Object.keys(allStatus)
    .filter(dateKey => allStatus[dateKey]?.checked)
    .sort()
    .reverse()
}

/**
 * 获取本月打卡统计
 * @param {string} yearMonth - YYYY-MM 格式
 * @returns {Object} { totalDays, checkedDays, checkedDates }
 */
export function getMonthCheckStats(yearMonth) {
  const allStatus = getAllCalendarStatus()

  // 获取该月所有日期
  const [year, month] = yearMonth.split('-').map(Number)
  const daysInMonth = new Date(year, month, 0).getDate()

  const checkedDates = []
  for (let day = 1; day <= daysInMonth; day++) {
    const dateKey = `${yearMonth}-${String(day).padStart(2, '0')}`
    if (allStatus[dateKey]?.checked) {
      checkedDates.push(dateKey)
    }
  }

  return {
    totalDays: daysInMonth,
    checkedDays: checkedDates.length,
    checkedDates
  }
}

// ==================== 计划配置 ====================

/**
 * 获取计划配置
 * @returns {Object|null}
 */
export function getPlanConfig() {
  return getItem(STORAGE_KEYS.PLAN_CONFIG, null)
}

/**
 * 保存计划配置
 * @param {Object} config
 * @returns {boolean}
 */
export function savePlanConfig(config) {
  return setItem(STORAGE_KEYS.PLAN_CONFIG, config)
}

// ==================== 数据迁移与清理 ====================

/**
 * 迁移旧格式数据到新格式
 * 旧格式: { "journal_2026-03-12": "content" }
 * 新格式: { "2026-03-12": { content: "content", ... } }
 */
export function migrateLegacyData() {
  // 检查是否有旧格式的日记数据
  const legacyJournalKeys = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && key.startsWith('journal_')) {
      legacyJournalKeys.push(key)
    }
  }

  if (legacyJournalKeys.length > 0) {
    const newJournalData = getAllJournalEntries()

    legacyJournalKeys.forEach(legacyKey => {
      const dateKey = legacyKey.replace('journal_', '')
      const oldContent = localStorage.getItem(legacyKey)

      if (oldContent) {
        newJournalData[dateKey] = {
          content: oldContent,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
        localStorage.removeItem(legacyKey)
      }
    })

    setItem(STORAGE_KEYS.JOURNAL_ENTRIES, newJournalData)
    console.log('[Storage] Migrated legacy journal data:', legacyJournalKeys.length)
  }
}

/**
 * 清理无效的日期数据
 * 移除超过90天的旧数据（可选）
 * @param {number} maxDays - 最大保留天数，默认180天
 */
export function cleanupOldData(maxDays = 180) {
  const today = getTodayKey()
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - maxDays)
  const cutoffKey = formatDateKey(cutoffDate)

  // 清理日记
  const journalEntries = getAllJournalEntries()
  let cleanedCount = 0

  Object.keys(journalEntries).forEach(dateKey => {
    if (dateKey < cutoffKey) {
      delete journalEntries[dateKey]
      cleanedCount++
    }
  })

  if (cleanedCount > 0) {
    setItem(STORAGE_KEYS.JOURNAL_ENTRIES, journalEntries)
    console.log(`[Storage] Cleaned ${cleanedCount} old journal entries`)
  }

  return cleanedCount
}

// ==================== 导出函数 ====================

import { getTodayKey, getDayIndexFromStart, formatDateKey } from './dateUtils'

export default {
  // 基础操作
  getItem,
  setItem,
  removeItem,

  // 用户时间状态
  getUserTimeState,
  saveUserTimeState,
  initUserTimeState,
  updateTimeStateOnSync,

  // 日记
  getAllJournalEntries,
  getJournalByDate,
  saveJournalByDate,
  deleteJournalByDate,
  getJournalDateList,

  // 任务进度
  getAllPlanProgress,
  getPlanProgressByDate,
  savePlanProgressByDate,
  updateTaskCompletion,
  getPlanProgressDateList,

  // 日历打卡
  getAllCalendarStatus,
  getCalendarStatusByDate,
  saveCalendarStatusByDate,
  checkInDate,
  uncheckDate,
  getCheckedDateList,
  getMonthCheckStats,

  // 计划配置
  getPlanConfig,
  savePlanConfig,

  // 数据迁移
  migrateLegacyData,
  cleanupOldData
}
