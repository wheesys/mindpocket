import { NextRequest, NextResponse } from "next/server"
import { readFile } from "node:fs/promises"
import { existsSync } from "node:fs"
import path from "node:path"

/**
 * 静态文件服务路由
 * 用于本地存储模式下提供文件访问
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  // 仅在本地存储模式下启用
  if (process.env.STORAGE_TYPE !== "local") {
    return NextResponse.json({ error: "Not available" }, { status: 404 })
  }

  const filePath = params.path.join("/")
  const basePath = process.env.STORAGE_LOCAL_PATH || "/data/uploads"
  const fullPath = path.join(basePath, filePath)

  // 安全检查：防止路径遍历
  const resolvedPath = path.resolve(fullPath)
  if (!resolvedPath.startsWith(path.resolve(basePath))) {
    return NextResponse.json({ error: "Invalid path" }, { status: 403 })
  }

  // 检查文件是否存在
  if (!existsSync(resolvedPath)) {
    return NextResponse.json({ error: "File not found" }, { status: 404 })
  }

  try {
    const file = await readFile(resolvedPath)
    // 根据扩展名设置 Content-Type
    const ext = path.extname(filePath).toLowerCase()
    const contentType = getContentType(ext)

    return new NextResponse(file, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    })
  } catch (error) {
    console.error("[StaticFiles] Error serving file:", error)
    return NextResponse.json({ error: "Failed to serve file" }, { status: 500 })
  }
}

function getContentType(ext: string): string {
  const contentTypes: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
    ".pdf": "application/pdf",
    ".txt": "text/plain",
    ".html": "text/html",
    ".css": "text/css",
    ".js": "application/javascript",
    ".json": "application/json",
  }
  return contentTypes[ext] || "application/octet-stream"
}
