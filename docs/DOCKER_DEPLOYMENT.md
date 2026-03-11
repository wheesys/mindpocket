# MindPocket Docker 部署指南

本文档介绍如何使用 Docker 部署 MindPocket，完全脱离 Vercel 依赖。

## 目录

- [快速开始](#快速开始)
- [存储配置](#存储配置)
- [环境变量](#环境变量)
- [生产部署](#生产部署)
- [故障排查](#故障排查)

---

## 快速开始

### 前置要求

- Docker 20.10+
- Docker Compose 2.0+

### 1. 克隆项目

```bash
git clone https://github.com/yourusername/mindpocket.git
cd mindpocket
```

### 2. 配置环境变量

```bash
cp apps/web/.env.example apps/web/.env
```

编辑 `.env` 文件，配置必要的变量：

```bash
# 数据库（Docker Compose 会自动创建）
DATABASE_URL=postgresql://mindpocket:mindpocket_password@postgres:5432/mindpocket

# 应用地址
NEXT_PUBLIC_APP_URL=http://localhost:3000

# 认证密钥
BETTER_AUTH_SECRET=your-random-secret-key

# AI 配置
OPENAI_API_KEY=your-openai-api-key
```

### 3. 启动服务

```bash
docker-compose up -d
```

### 4. 初始化数据库

```bash
# 进入容器
docker-compose exec app sh

# 运行数据库迁移
pnpm db:migrate

# 退出容器
exit
```

### 5. 访问应用

打开浏览器访问: http://localhost:3000

---

## 存储配置

MindPocket 支持三种存储模式，通过 `STORAGE_TYPE` 环境变量切换：

### 1. 本地存储（默认）

```bash
STORAGE_TYPE=local
STORAGE_LOCAL_PATH=/data/uploads
```

- ✅ 无需额外服务
- ✅ 配置简单
- ❌ 不适合多实例部署

### 2. MinIO（推荐）

取消 `docker-compose.yml` 中的 MinIO 配置：

```yaml
minio:
  image: minio/minio:latest
  # ...
```

环境变量配置：

```bash
STORAGE_TYPE=minio
S3_ENDPOINT=http://minio:9000
S3_BUCKET=mindpocket
S3_ACCESS_KEY_ID=minioadmin
S3_SECRET_ACCESS_KEY=minioadmin
```

### 3. AWS S3 / 云存储

```bash
STORAGE_TYPE=s3
S3_ENDPOINT=https://s3.amazonaws.com
S3_REGION=us-east-1
S3_BUCKET=your-bucket-name
S3_ACCESS_KEY_ID=your-access-key
S3_SECRET_ACCESS_KEY=your-secret-key
```

---

## 环境变量

| 变量 | 必填 | 默认值 | 说明 |
|------|:----:|--------|------|
| `DATABASE_URL` | ✅ | - | PostgreSQL 连接 URL |
| `NEXT_PUBLIC_APP_URL` | ✅ | - | 应用公共访问地址 |
| `BETTER_AUTH_SECRET` | ✅ | - | 认证密钥 |
| `STORAGE_TYPE` | ❌ | `local` | 存储类型：local/s3/minio |
| `OPENAI_API_KEY` | ✅ | - | OpenAI API 密钥 |
| `TZ` | ❌ | `Asia/Shanghai` | 时区 |

---

## 生产部署

### 使用外部数据库

修改 `docker-compose.yml` 中的数据库配置，或直接设置环境变量：

```bash
DATABASE_URL=postgresql://user:password@your-db-host:5432/dbname
```

### 使用反向代理

示例 Nginx 配置：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 数据备份

```bash
# 备份数据库
docker-compose exec postgres pg_dump -U mindpocket mindpocket > backup.sql

# 恢复数据库
cat backup.sql | docker-compose exec -T postgres psql -U mindpocket mindpocket
```

---

## 故障排查

### 应用无法启动

```bash
# 查看日志
docker-compose logs app

# 进入容器调试
docker-compose exec app sh
```

### 数据库连接失败

确保数据库容器正在运行：

```bash
docker-compose ps
```

检查数据库健康状态：

```bash
docker-compose exec postgres pg_isready -U mindpocket
```

### 文件上传失败

检查存储目录权限：

```bash
docker-compose exec app ls -la /data/uploads
```

---

## 从 Vercel 迁移

如果你之前使用 Vercel 部署，迁移步骤：

1. **导出数据**：从 Vercel Blob 导出文件
2. **导入存储**：将文件放到 `/data/uploads` 对应路径
3. **更新环境变量**：参考上文配置
4. **DNS 切换**：更新域名指向新服务器
