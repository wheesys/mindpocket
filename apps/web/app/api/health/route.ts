import { NextResponse } from "next/server"
import { db } from "@/db/client"

/**
 * 健康检查端点
 * 用于 Docker healthcheck 和负载均衡器
 */
export async function GET() {
  try {
    // 检查数据库连接
    await db.execute("SELECT 1")

    return NextResponse.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      database: "connected",
    })
  } catch (error) {
    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        database: "disconnected",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 503 }
    )
  }
}
