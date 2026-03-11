import { saveBookmark } from "../lib/auth-client"
import {
  getBookmarkConfig,
  isUrlSaved,
  markUrlAsSaved,
  removeSavedUrl,
  addScanHistory,
  type BookmarkConfig,
} from "../lib/bookmark-config"

// 定义消息类型
interface Message {
  type: "SAVE_PAGE" | "SCAN_BOOKMARKS" | "GET_BOOKMARK_CONFIG" | "SET_BOOKMARK_CONFIG" | "GET_SCAN_HISTORY"
  payload?: unknown
}

interface BookmarkTreeNode {
  id: string
  title: string
  url?: string
  children?: BookmarkTreeNode[]
  dateAdded?: number
  dateGroupModified?: number
  index?: number
  parentId?: string
}

export default defineBackground(() => {
  // 初始化时设置定时器
  initAlarm()

  browser.runtime.onMessage.addListener((message: Message, _sender, sendResponse) => {
    switch (message.type) {
      case "SAVE_PAGE":
        handleSavePage().then(sendResponse)
        return true

      case "SCAN_BOOKMARKS":
        handleScanBookmarks().then(sendResponse)
        return true

      case "GET_BOOKMARK_CONFIG":
        getBookmarkConfig().then(sendResponse)
        return true

      case "SET_BOOKMARK_CONFIG":
        setBookmarkConfig(message.payload as Partial<BookmarkConfig>).then(() => {
          // 配置更新后重新初始化定时器
          initAlarm()
          sendResponse({ success: true })
        })
        return true

      case "GET_SCAN_HISTORY":
        getScanHistory().then(sendResponse)
        return true

      default:
        return false
    }
  })

  // 监听定时器
  browser.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === "scanBookmarks") {
      console.log("[MindPocket] Auto scan bookmarks triggered")
      await handleScanBookmarks(true)
    }
  })
})

// 初始化定时器
async function initAlarm() {
  // 清除旧的定时器
  await browser.alarms.clear("scanBookmarks")

  const config = await getBookmarkConfig()
  if (config.autoScan) {
    // 转换为毫秒
    const intervalMinutes = Math.max(config.scanInterval, 10) // 最小 10 分钟
    await browser.alarms.create("scanBookmarks", {
      delayInMinutes: intervalMinutes,
      periodInMinutes: intervalMinutes,
    })
    console.log(`[MindPocket] Auto scan enabled: every ${intervalMinutes} minutes`)
  }
}

async function notify(title: string, message: string) {
  await browser.notifications.create({
    type: "basic",
    iconUrl: browser.runtime.getURL("/icon/128.png"),
    title,
    message,
  })
}

// 获取所有书签（递归）
function getAllBookmarks(nodes: BookmarkTreeNode[]): BookmarkTreeNode[] {
  const bookmarks: BookmarkTreeNode[] = []
  for (const node of nodes) {
    if (node.url) {
      bookmarks.push(node)
    }
    if (node.children) {
      bookmarks.push(...getAllBookmarks(node.children))
    }
  }
  return bookmarks
}

// 检查书签是否在忽略的目录中
function isInIgnoredFolder(bookmark: BookmarkTreeNode, ignoredIds: string[]): boolean {
  if (!bookmark.parentId) return false

  // 检查父目录是否在忽略列表中
  if (ignoredIds.includes(bookmark.parentId)) {
    return true
  }

  // 递归检查父目录的父目录（需要获取完整书签树）
  // 这里简化处理，假设用户直接选择要忽略的文件夹
  return false
}

// 扫描并收录书签
async function handleScanBookmarks(isAuto = false): Promise<{
  success: boolean
  scanned: number
  saved: number
  failed: number
  deleted: number
  error?: string
}> {
  try {
    const config = await getBookmarkConfig()
    const tree = await browser.bookmarks.getTree()
    const allBookmarks = getAllBookmarks(tree)

    // 过滤掉忽略目录中的书签
    const bookmarksToScan = allBookmarks.filter((b) =>
      b.url && !isInIgnoredFolder(b, config.ignoreFolderIds)
    )

    // 过滤掉非 http/https 的书签
    const validBookmarks = bookmarksToScan.filter((b) =>
      b.url && (b.url.startsWith("http://") || b.url.startsWith("https://"))
    )

    let saved = 0
    let failed = 0
    let deleted = 0

    for (const bookmark of validBookmarks) {
      const url = bookmark.url!

      // 检查是否已收录
      if (await isUrlSaved(url)) {
        continue
      }

      try {
        // 收藏书签（不需要 HTML，让服务器自己抓取）
        const result = await saveBookmark({
          url,
          html: "",
          title: bookmark.title,
        })

        if (result.ok) {
          await markUrlAsSaved(url)
          saved++

          // 如果配置为收录后删除
          if (config.deleteAfterSave && bookmark.id) {
            await browser.bookmarks.remove(bookmark.id)
            deleted++
          }
        } else {
          failed++
        }
      } catch (err) {
        console.error(`[MindPocket] Failed to save ${url}:`, err)
        failed++
      }

      // 避免请求过快
      await new Promise((resolve) => setTimeout(resolve, 500))
    }

    const scanResult = {
      scanned: validBookmarks.length,
      saved,
      failed,
      deleted,
    }

    // 记录扫描历史
    await addScanHistory({
      timestamp: Date.now(),
      ...scanResult,
    })

    // 显示通知
    if (!isAuto) {
      await notify(
        "书签扫描完成",
        `扫描 ${scanResult.scanned} 个，收录 ${saved} 个${deleted > 0 ? `，删除 ${deleted} 个` : ""}${failed > 0 ? `，失败 ${failed} 个` : ""}`
      )
    }

    return { success: true, ...scanResult }
  } catch (err) {
    const error = String(err)
    console.error("[MindPocket] Scan bookmarks error:", err)
    if (!isAuto) {
      await notify("扫描失败", error)
    }
    return { success: false, scanned: 0, saved: 0, failed: 0, deleted: 0, error }
  }
}

async function handleSavePage() {
  try {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true })
    if (!tab?.id) {
      return { success: false, error: "No active tab" }
    }

    const response = await browser.tabs.sendMessage(tab.id, { type: "GET_PAGE_CONTENT" })
    if (!response?.html) {
      return { success: false, error: "Failed to get page content" }
    }

    const result = await saveBookmark({
      url: response.url,
      html: response.html,
      title: response.title,
    })

    if (!result.ok) {
      const error = result.data?.error || "Save failed"
      await notify("保存失败", error)
      return { success: false, error }
    }

    // 标记为已收录
    await markUrlAsSaved(response.url)

    await notify("已收藏", result.data?.title || response.title || "页面已保存")
    return { success: true, data: result.data }
  } catch (err) {
    await notify("保存失败", String(err))
    return { success: false, error: String(err) }
  }
}
