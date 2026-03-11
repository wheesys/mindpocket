/**
 * 存储类型定义
 */

export type StorageType = "local" | "s3" | "minio"

export interface StorageConfig {
  type: StorageType
}

export interface LocalStorageConfig extends StorageConfig {
  type: "local"
  basePath: string
  publicUrl: string // 公共访问 URL 前缀
}

export interface S3StorageConfig extends StorageConfig {
  type: "s3" | "minio"
  endpoint?: string // MinIO 需要此项
  region: string
  bucket: string
  accessKeyId: string
  secretAccessKey: string
  publicUrl?: string // 自定义公共 URL，用于 MinIO
}

export interface UploadResult {
  url: string
  key: string
}

export interface StorageProvider {
  /**
   * 上传文件
   * @param key 存储键名
   * @param buffer 文件内容
   * @param options 上传选项
   */
  put(key: string, buffer: Buffer | ArrayBuffer, options?: UploadOptions): Promise<UploadResult>

  /**
   * 删除文件
   * @param key 存储键名
   */
  delete(key: string): Promise<void>

  /**
   * 获取文件公共访问 URL
   * @param key 存储键名
   */
  getPublicUrl(key: string): string
}

export interface UploadOptions {
  contentType?: string
  access?: "public" | "private"
}
