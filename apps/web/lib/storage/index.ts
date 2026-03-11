import type { LocalStorageConfig, S3StorageConfig, StorageProvider } from "./types"
import { LocalStorageProvider } from "./local"
import { S3StorageProvider } from "./s3"

/**
 * 存储提供者工厂函数
 * 根据环境变量自动创建对应的存储提供者
 */
export function createStorageProvider(): StorageProvider {
  const storageType = (process.env.STORAGE_TYPE || "local") as "local" | "s3" | "minio"

  switch (storageType) {
    case "local":
      return new LocalStorageProvider({
        type: "local",
        basePath: process.env.STORAGE_LOCAL_PATH || "/data/uploads",
        publicUrl: process.env.STORAGE_PUBLIC_URL || process.env.NEXT_PUBLIC_APP_URL || "",
      })

    case "s3":
    case "minio": {
      const config: S3StorageConfig = {
        type: storageType,
        endpoint: process.env.S3_ENDPOINT,
        region: process.env.S3_REGION || "us-east-1",
        bucket: process.env.S3_BUCKET || "mindpocket",
        accessKeyId: process.env.S3_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
        publicUrl: process.env.S3_PUBLIC_URL,
      }

      if (!config.accessKeyId || !config.secretAccessKey) {
        throw new Error("S3 credentials are required when using S3/MinIO storage")
      }

      if (storageType === "minio" && !config.endpoint) {
        throw new Error("MinIO requires S3_ENDPOINT to be set")
      }

      return new S3StorageProvider(config)
    }

    default:
      throw new Error(`Unknown storage type: ${storageType}`)
  }
}

/**
 * 单例存储提供者实例
 */
let providerInstance: StorageProvider | null = null

export function getStorageProvider(): StorageProvider {
  if (!providerInstance) {
    providerInstance = createStorageProvider()
  }
  return providerInstance
}

// 导出类型
export type { StorageProvider, UploadResult, UploadOptions } from "./types"
export type { LocalStorageConfig, S3StorageConfig, StorageConfig } from "./types"
