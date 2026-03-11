import { useEffect, useState } from "react"
import {
  getCachedUser,
  getServerUrl,
  getSession,
  removeCachedUser,
  setCachedUser,
  setServerUrl,
  signIn,
  signOut,
} from "../../lib/auth-client"
import {
  getBookmarkConfig,
  setBookmarkConfig,
  getScanHistory,
  type BookmarkConfig,
  type ScanHistoryItem,
} from "../../lib/bookmark-config"
import { detectPlatform, PLATFORM_CONFIG } from "../../lib/platform-icons"
import "./App.css"

interface User {
  id: string
  name: string
  email: string
}

type Status = "idle" | "loading" | "success" | "error"

const WWW_PREFIX_REGEX = /^www\./
const TRAILING_SLASH_REGEX = /\/+$/

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [checking, setChecking] = useState(true)
  const [page, setPage] = useState<"main" | "settings">("main")

  useEffect(() => {
    getCachedUser().then((cached) => {
      if (cached) {
        setUser(cached)
        setChecking(false)
      }

      getSession()
        .then((res) => {
          if (res.ok && res.data?.user) {
            setUser(res.data.user)
            setCachedUser(res.data.user)
          } else {
            setUser(null)
            removeCachedUser()
          }
        })
        .catch((err) => {
          console.error("[MindPocket] getSession error:", err)
          if (!cached) {
            setUser(null)
          }
        })
        .finally(() => setChecking(false))
    })
  }, [])

  if (checking) {
    return (
      <div className="app">
        <p className="status">检查登录状态...</p>
      </div>
    )
  }

  if (page === "settings") {
    return <SettingsPage onBack={() => setPage("main")} />
  }

  if (!user) {
    return <LoginForm onLogin={setUser} />
  }

  return (
    <SavePage onLogout={() => setUser(null)} onSettings={() => setPage("settings")} user={user} />
  )
}

function LoginForm({ onLogin }: { onLogin: (user: User) => void }) {
  const [server, setServer] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [status, setStatus] = useState<Status>("idle")
  const [error, setError] = useState("")

  useEffect(() => {
    getServerUrl().then(setServer)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus("loading")
    setError("")

    const trimmed = server.replace(TRAILING_SLASH_REGEX, "")
    await setServerUrl(trimmed)

    try {
      const res = await signIn(email, password)
      if (res.ok && res.data?.user) {
        setStatus("success")
        onLogin(res.data.user)
      } else {
        setStatus("error")
        setError(`登录失败: ${JSON.stringify(res.data)}`)
      }
    } catch (err) {
      setStatus("error")
      setError(`请求异常: ${err}`)
    }
  }

  return (
    <div className="app">
      <h1 style={{ fontSize: 16, fontWeight: 600 }}>MindPocket</h1>
      <form className="form" onSubmit={handleSubmit}>
        <input
          className="input"
          onChange={(e) => setServer(e.target.value)}
          placeholder="服务器地址"
          required
          type="url"
          value={server}
        />
        <input
          className="input"
          onChange={(e) => setEmail(e.target.value)}
          placeholder="邮箱"
          required
          type="email"
          value={email}
        />
        <input
          className="input"
          onChange={(e) => setPassword(e.target.value)}
          placeholder="密码"
          required
          type="password"
          value={password}
        />
        <button className="btn btn-primary" disabled={status === "loading"} type="submit">
          {status === "loading" ? "登录中..." : "登录"}
        </button>
        {error && <p className="error">{error}</p>}
      </form>
    </div>
  )
}

function SavePage({
  user,
  onLogout,
  onSettings,
}: {
  user: User
  onLogout: () => void
  onSettings: () => void
}) {
  const [status, setStatus] = useState<Status>("idle")
  const [message, setMessage] = useState("")
  const [pageInfo, setPageInfo] = useState<{
    url: string
    title: string
    platform: string | null
  } | null>(null)

  useEffect(() => {
    browser.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
      if (tab?.url && tab.title) {
        setPageInfo({
          url: tab.url,
          title: tab.title,
          platform: detectPlatform(tab.url),
        })
      }
    })
  }, [])

  const handleSave = async () => {
    setStatus("loading")
    setMessage("")

    const res = await browser.runtime.sendMessage({ type: "SAVE_PAGE" })
    if (res?.success) {
      setStatus("success")
      setMessage(`已保存: ${res.data?.title || "页面"}`)
    } else {
      setStatus("error")
      setMessage(res?.error || "保存失败")
    }
  }

  return (
    <div className="app">
      <div className="header">
        <h1>MindPocket</h1>
        <div className="header-actions">
          <button className="settings-btn" onClick={onSettings} title="设置" type="button">
            <svg
              className="lucide lucide-settings-icon lucide-settings"
              fill="none"
              height="20"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              width="20"
              xmlns="http://www.w3.org/2000/svg"
            >
              <title>设置</title>
              <path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
          <button
            className="logout-btn"
            onClick={async () => {
              await signOut()
              onLogout()
            }}
            type="button"
          >
            退出
          </button>
        </div>
      </div>
      <p className="user-info">{user.email}</p>
      {pageInfo && (
        <div className="page-info">
          {pageInfo.platform && PLATFORM_CONFIG[pageInfo.platform] ? (
            (() => {
              const config = PLATFORM_CONFIG[pageInfo.platform]
              const Icon = config.icon
              return (
                <span className="platform-badge">
                  <Icon style={{ width: 14, height: 14, color: config.color }} />
                  <span>{config.label}</span>
                </span>
              )
            })()
          ) : (
            <span className="platform-badge">
              <span>{new URL(pageInfo.url).hostname.replace(WWW_PREFIX_REGEX, "")}</span>
            </span>
          )}
          <p className="page-title">{pageInfo.title}</p>
        </div>
      )}
      <button
        className="btn btn-save"
        disabled={status === "loading"}
        onClick={handleSave}
        type="button"
      >
        {status === "loading" ? "保存中..." : "收藏此页面"}
      </button>
      {status === "success" && <p className="success">{message}</p>}
      {status === "error" && <p className="error">{message}</p>}
    </div>
  )
}

interface BookmarkTreeNode {
  id: string
  title: string
  children?: BookmarkTreeNode[]
  dateAdded?: number
  dateGroupModified?: number
  index?: number
  parentId?: string
}

function SettingsPage({ onBack }: { onBack: () => void }) {
  const [serverUrl, setServerUrlState] = useState("")
  const [config, setConfig] = useState<BookmarkConfig | null>(null)
  const [bookmarkFolders, setBookmarkFolders] = useState<BookmarkTreeNode[]>([])
  const [scanStatus, setScanStatus] = useState<Status>("idle")
  const [scanResult, setScanResult] = useState<string>("")
  const [saveStatus, setSaveStatus] = useState<Status>("idle")
  const [scanHistory, setScanHistory] = useState<ScanHistoryItem[]>([])

  useEffect(() => {
    getServerUrl().then(setServerUrlState)
    getBookmarkConfig().then(setConfig)
    getScanHistory().then(setScanHistory)

    // 获取书签文件夹列表
    chrome.bookmarks.getTree().then((tree) => {
      const folders = getBookmarkFolders(tree)
      setBookmarkFolders(folders)
    })
  }, [])

  const getBookmarkFolders = (nodes: BookmarkTreeNode[]): BookmarkTreeNode[] => {
    const folders: BookmarkTreeNode[] = []
    for (const node of nodes) {
      if (!node.url && node.id !== "0") {
        // 排除根节点
        folders.push(node)
      }
      if (node.children) {
        folders.push(...getBookmarkFolders(node.children))
      }
    }
    return folders
  }

  const handleSaveSettings = async () => {
    setSaveStatus("loading")
    await setServerUrl(serverUrl.replace(TRAILING_SLASH_REGEX, ""))
    setSaveStatus("success")
    setTimeout(() => setSaveStatus("idle"), 1500)
  }

  const handleConfigChange = async (key: keyof BookmarkConfig, value: unknown) => {
    const newConfig = { ...config, [key]: value } as BookmarkConfig
    setConfig(newConfig)
    await chrome.runtime.sendMessage({
      type: "SET_BOOKMARK_CONFIG",
      payload: { [key]: value },
    })
  }

  const handleFolderToggle = async (folderId: string) => {
    const current = config?.ignoreFolderIds || []
    const newIds = current.includes(folderId)
      ? current.filter((id) => id !== folderId)
      : [...current, folderId]
    await handleConfigChange("ignoreFolderIds", newIds)
  }

  const handleScanBookmarks = async () => {
    setScanStatus("loading")
    setScanResult("")

    const result = await chrome.runtime.sendMessage({ type: "SCAN_BOOKMARKS" })
    setScanStatus(result.success ? "success" : "error")

    if (result.success) {
      setScanResult(
        `扫描 ${result.scanned} 个，收录 ${result.saved} 个${result.deleted > 0 ? `，删除 ${result.deleted} 个` : ""}${result.failed > 0 ? `，失败 ${result.failed} 个` : ""}`
      )
      // 刷新扫描历史
      getScanHistory().then(setScanHistory)
    } else {
      setScanResult(result.error || "扫描失败")
    }
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (!config) {
    return (
      <div className="app">
        <p className="status">加载中...</p>
      </div>
    )
  }

  return (
    <div className="app settings-page">
      <div className="header">
        <h1 style={{ fontSize: 16, fontWeight: 600 }}>设置</h1>
        <button className="settings-btn" onClick={onBack} type="button">
          ← 返回
        </button>
      </div>

      {/* 服务器配置 */}
      <section className="settings-section">
        <h2 className="settings-section-title">服务器</h2>
        <label className="settings-label" htmlFor="server-url">
          服务器地址
        </label>
        <input
          className="input"
          id="server-url"
          onChange={(e) => setServerUrlState(e.target.value)}
          placeholder="http://127.0.0.1:3000"
          value={serverUrl}
        />
        <button
          className="btn btn-primary"
          disabled={saveStatus === "loading"}
          onClick={handleSaveSettings}
          style={{ marginTop: 8 }}
          type="button"
        >
          {saveStatus === "success" ? "已保存" : "保存"}
        </button>
      </section>

      {/* 书签自动收录配置 */}
      <section className="settings-section">
        <h2 className="settings-section-title">书签自动收录</h2>

        <label className="settings-checkbox">
          <input
            checked={config.autoScan}
            onChange={(e) => handleConfigChange("autoScan", e.target.checked)}
            type="checkbox"
          />
          <span>启用自动扫描书签</span>
        </label>

        {config.autoScan && (
          <div className="settings-indent">
            <label className="settings-label" htmlFor="scan-interval">
              扫描间隔（分钟，最少 10 分钟）
            </label>
            <input
              className="input"
              id="scan-interval"
              min="10"
              onChange={(e) => handleConfigChange("scanInterval", Number(e.target.value))}
              type="number"
              value={config.scanInterval}
            />
          </div>
        )}

        <label className="settings-checkbox">
          <input
            checked={config.deleteAfterSave}
            onChange={(e) => handleConfigChange("deleteAfterSave", e.target.checked)}
            type="checkbox"
          />
          <span>收录后删除原书签</span>
        </label>

        <button
          className="btn btn-secondary"
          disabled={scanStatus === "loading"}
          onClick={handleScanBookmarks}
          style={{ width: "100%", marginTop: 12 }}
          type="button"
        >
          {scanStatus === "loading" ? "扫描中..." : "立即扫描书签"}
        </button>

        {scanResult && (
          <p className={`result ${scanStatus === "success" ? "success" : "error"}`}>
            {scanResult}
          </p>
        )}
      </section>

      {/* 无需收录的书签目录 */}
      <section className="settings-section">
        <h2 className="settings-section-title">无需收录的书签目录</h2>
        <p className="settings-hint">选择以下书签目录将跳过自动收录：</p>

        <div className="folder-list">
          {bookmarkFolders.map((folder) => (
            <label key={folder.id} className="settings-checkbox folder-item">
              <input
                checked={config.ignoreFolderIds.includes(folder.id)}
                onChange={() => handleFolderToggle(folder.id)}
                type="checkbox"
              />
              <span className="folder-name">{folder.title}</span>
            </label>
          ))}
        </div>
      </section>

      {/* 扫描历史 */}
      {scanHistory.length > 0 && (
        <section className="settings-section">
          <h2 className="settings-section-title">扫描历史</h2>
          <div className="scan-history">
            {scanHistory.slice(0, 5).map((item, index) => (
              <div key={index} className="history-item">
                <span className="history-time">{formatDate(item.timestamp)}</span>
                <span className="history-stats">
                  扫描 {item.scanned} | 收录 {item.saved}
                  {item.failed > 0 && ` | 失败 ${item.failed}`}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

export default App
