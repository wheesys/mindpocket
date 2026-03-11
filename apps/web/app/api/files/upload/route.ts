import { headers } from "next/headers"
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getStorageProvider } from "@/lib/storage"

export async function POST(request: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!request.body) {
    return NextResponse.json({ error: "Request body is empty" }, { status: 400 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get("file") as Blob | null

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 })
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File size should be less than 5MB" }, { status: 400 })
    }

    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"]
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "File type should be JPEG, PNG, WebP or GIF" },
        { status: 400 }
      )
    }

    const uploadedFile = formData.get("file") as File
    const filename = uploadedFile.name
    const fileBuffer = await file.arrayBuffer()

    // 使用存储抽象层
    const storage = getStorageProvider()

    // 生成唯一文件名：使用时间戳 + 随机数避免冲突
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 8)
    const ext = filename.includes(".") ? filename.substring(filename.lastIndexOf(".")) : ""
    const key = `uploads/${timestamp}-${random}${ext}`

    const result = await storage.put(key, fileBuffer, {
      contentType: file.type,
      access: "public",
    })

    return NextResponse.json({
      url: result.url,
      key: result.key,
      size: file.size,
      uploadedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[Upload] Error:", error)
    return NextResponse.json(
      { error: "Failed to process request", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
