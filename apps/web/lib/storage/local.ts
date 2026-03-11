import fs from "node:fs/promises"
import path from "node:path"
import type { LocalStorageConfig, StorageProvider, UploadResult, UploadOptions } from "./types"

export class LocalStorageProvider implements StorageProvider {
  constructor(private config: LocalStorageConfig) {
    // 确保基础目录存在
    this.ensureDir()
  }

  private async ensureDir(): Promise<void> {
    try {
      await fs.mkdir(this.config.basePath, { recursive: true })
    } catch (error) {
      console.error("[LocalStorage] Failed to create base directory:", error)
    }
  }

  private getFullPath(key: string): string {
    // 安全处理路径，防止目录遍历攻击
    const safeKey = path.normalize(key).replace(/^(\.\.(\/|\\|$))+/, "")
    return path.join(this.config.basePath, safeKey)
  }

  async put(key: string, buffer: Buffer | ArrayBuffer, options?: UploadOptions): Promise<UploadResult> {
    const fullPath = this.getFullPath(key)
    const dir = path.dirname(fullPath)

    // 确保目标目录存在
    await fs.mkdir(dir, { recursive: true })

    // 写入文件
    const data = buffer instanceof Buffer ? buffer : Buffer.from(buffer)
    await fs.writeFile(fullPath, data)

    return {
      url: this.getPublicUrl(key),
      key,
    }
  }

  async delete(key: string): Promise<void> {
    const fullPath = this.getFullPath(key)
    try {
      await fs.unlink(fullPath)
    } catch (error) {
      // 文件不存在时忽略错误
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error
      }
    }
  }

  getPublicUrl(key: string): string {
    // 移除开头的斜杠以避免双斜杠
    const cleanKey = key.startsWith("/") ? key.slice(1) : key
    const baseUrl = this.config.publicUrl.replace(/\/+$/, "")
    return `${baseUrl}/${cleanKey}`
  }
}
