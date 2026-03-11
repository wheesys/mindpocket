import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3"
import type { S3StorageConfig, StorageProvider, UploadResult, UploadOptions } from "./types"

export class S3StorageProvider implements StorageProvider {
  private client: S3Client

  constructor(private config: S3StorageConfig) {
    this.client = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      // MinIO 需要强制使用路径样式
      forcePathStyle: config.type === "minio",
    })
  }

  async put(key: string, buffer: Buffer | ArrayBuffer, options?: UploadOptions): Promise<UploadResult> {
    const command = new PutObjectCommand({
      Bucket: this.config.bucket,
      Key: key,
      Body: buffer instanceof Buffer ? buffer : Buffer.from(buffer),
      ContentType: options?.contentType,
      ACL: options?.access === "public" ? "public-read" : undefined,
    })

    await this.client.send(command)

    return {
      url: this.getPublicUrl(key),
      key,
    }
  }

  async delete(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.config.bucket,
      Key: key,
    })

    await this.client.send(command)
  }

  getPublicUrl(key: string): string {
    // MinIO 或自定义公共 URL
    if (this.config.publicUrl) {
      const baseUrl = this.config.publicUrl.replace(/\/+$/, "")
      return `${baseUrl}/${this.config.bucket}/${key}`
    }

    // 标准 S3 公共 URL
    return `https://${this.config.bucket}.s3.${this.config.region}.amazonaws.com/${key}`
  }
}
