# MindPocket Dockerfile
# 多阶段构建，优化镜像大小

# ============================================
# 阶段 1: 依赖安装
# ============================================
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat

WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm@10.9.0

# 复制依赖清单文件
COPY apps/web/package.json apps/web/pnpm-lock.yaml* ./
COPY packages/typescript-config/package.json packages/typescript-config/package.json ./
COPY packages/validators/package.json packages/validators/package.json ./
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./

# 安装依赖
RUN pnpm install --frozen-lockfile

# ============================================
# 阶段 2: 构建
# ============================================
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat python3 make g++

WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm@10.9.0

# 从 deps 阶段复制 node_modules
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules

# 复制源代码
COPY apps/web ./apps/web
COPY packages ./packages
COPY package.json pnpm-workspace.yaml ./

# 设置构建时环境变量（避免数据库连接）
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# 构建应用（不含数据库操作，在容器启动时执行）
WORKDIR /app/apps/web
RUN pnpm build-without-db

# ============================================
# 阶段 3: 运行
# ============================================
FROM node:20-alpine AS runner
WORKDIR /app

# 安装必要的运行时依赖
RUN apk add --no-cache \
    # Puppeteer/Chromium 需要的依赖
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    # 数据库客户端（用于健康检查）
    postgresql-client \
    && rm -rf /var/cache/apk/*

# 设置 Chromium 环境变量
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# 创建非 root 用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# 复制必要文件
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./.next/static
COPY --from=builder /app/apps/web/public ./public
COPY --from=builder /app/apps/web/drizzle.config.ts ./
COPY --from=builder /app/apps/web/db ./db
COPY --from=builder /app/apps/web/node_modules ./node_modules
COPY --from=builder /app/apps/web/package.json ./
COPY --from=builder /app/apps/web/scripts ./scripts
COPY --from=builder /app/node_modules/drizzle-kit ./node_modules/drizzle-kit
COPY --from=builder /app/node_modules/.bin ./node_modules/.bin

# 确保启动脚本可执行
RUN chmod +x scripts/docker-entrypoint.sh

# 创建必要的目录
RUN mkdir -p /data/uploads /logs && \
    chown -R nextjs:nodejs /data /logs

# 切换到非 root 用户
USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# 设置数据库连接参数（从 DATABASE_URL 解析）
# docker-compose 会设置 DATABASE_URL，这里解析出各个组件
ENV DB_HOST=${DB_HOST:-postgres}
ENV DB_PORT=${DB_PORT:-5432}
ENV DB_USER=${DB_USER:-mindpocket}

# 启动应用（使用启动脚本自动初始化数据库）
CMD ["sh", "scripts/docker-entrypoint.sh"]
