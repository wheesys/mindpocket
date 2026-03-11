/**
 * 书签配置管理
 */

const CONFIG_KEY = "mindpocket_bookmark_config"
const SAVED_URLS_KEY = "mindpocket_saved_urls"
const SCAN_HISTORY_KEY = "mindpocket_scan_history"

export interface BookmarkConfig {
  // 是否自动扫描书签
  autoScan: boolean
  // 扫描间隔（分钟）
  scanInterval: number
  // 收录后是否删除书签
  deleteAfterSave: boolean
  // 无需收录的书签目录 ID 列表
  ignoreFolderIds: string[]
}

export interface ScanHistoryItem {
  timestamp: number
  scanned: number
  saved: number
  failed: number
  deleted: number
}

export const DEFAULT_CONFIG: BookmarkConfig = {
  autoScan: false,
  scanInterval: 60, // 60分钟
  deleteAfterSave: false,
  ignoreFolderIds: [],
}

export async function getBookmarkConfig(): Promise<BookmarkConfig> {
  const result = await chrome.storage.local.get(CONFIG_KEY)
  return { ...DEFAULT_CONFIG, ...result[CONFIG_KEY] }
}

export async function setBookmarkConfig(config: Partial<BookmarkConfig>): Promise<void> {
  const current = await getBookmarkConfig()
  await chrome.storage.local.set({
    [CONFIG_KEY]: { ...current, ...config },
  })
}

// 记录已收录的 URL
export async function isUrlSaved(url: string): Promise<boolean> {
  const result = await chrome.storage.local.get(SAVED_URLS_KEY)
  const savedUrls = result[SAVED_URLS_KEY] || []
  return savedUrls.includes(url)
}

export async function markUrlAsSaved(url: string): Promise<void> {
  const result = await chrome.storage.local.get(SAVED_URLS_KEY)
  const savedUrls = result[SAVED_URLS_KEY] || []
  if (!savedUrls.includes(url)) {
    savedUrls.push(url)
    await chrome.storage.local.set({ [SAVED_URLS_KEY]: savedUrls })
  }
}

export async function removeSavedUrl(url: string): Promise<void> {
  const result = await chrome.storage.local.get(SAVED_URLS_KEY)
  const savedUrls = (result[SAVED_URLS_KEY] || []).filter((u: string) => u !== url)
  await chrome.storage.local.set({ [SAVED_URLS_KEY]: savedUrls })
}

// 获取扫描历史
export async function getScanHistory(): Promise<ScanHistoryItem[]> {
  const result = await chrome.storage.local.get(SCAN_HISTORY_KEY)
  return result[SCAN_HISTORY_KEY] || []
}

// 添加扫描历史记录
export async function addScanHistory(item: ScanHistoryItem): Promise<void> {
  const history = await getScanHistory()
  history.unshift(item)
  // 只保留最近 30 条记录
  if (history.length > 30) {
    history.pop()
  }
  await chrome.storage.local.set({ [SCAN_HISTORY_KEY]: history })
}

// 清空已收录 URL 记录
export async function clearSavedUrls(): Promise<void> {
  await chrome.storage.local.remove(SAVED_URLS_KEY)
}
