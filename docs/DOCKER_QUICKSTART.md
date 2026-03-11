# MindPocket Docker 快速启动

## 🚀 一键启动

### 前置要求

- 已有 PostgreSQL 数据库（本地或远程）
- Docker 20.10+
- Docker Compose 2.0+

### 1. 配置环境变量

```bash
# 复制环境变量模板
cp .env.docker .env

# 编辑 .env 文件，至少配置以下几项：
```

**必填配置：**

```bash
# 数据库连接（必填）
DATABASE_URL=postgresql://用户名:密码@数据库地址:端口/数据库名

# 认证密钥（必填，生成命令: openssl rand -base64 32）
BETTER_AUTH_SECRET=your-random-secret-key-min-32-chars

# OpenAI API Key（必填）
OPENAI_API_KEY=your-openai-api-key
```

### 2. 启动服务

```bash
# 构建并启动（首次运行需要 3-5 分钟）
docker compose up -d

# 查看启动日志
docker compose logs -f mindpocket-app
```

### 3. 访问应用

启动完成后，访问: **http://localhost:3000**

---

## 📋 启动流程说明

Docker Compose 会自动完成以下步骤：

1. ✅ 连接外部数据库
2. ✅ 等待数据库就绪
3. ✅ 自动执行数据库迁移
4. ✅ 创建 pgvector 扩展
5. ✅ 启动 Web 应用

---

## 🔧 常用命令

```bash
# 停止服务
docker compose down

# 查看服务状态
docker compose ps

# 查看日志
docker compose logs -f mindpocket-app

# 重启服务
docker compose restart

# 进入应用容器
docker compose exec mindpocket-app sh
```

---

## 📁 目录挂载

| 容器内路径 | 宿主机路径 | 说明 |
|-----------|----------|------|
| `/data/uploads` | `./data/uploads` | 上传文件 |
| `/logs` | `./logs` | 应用日志 |

```bash
# 查看上传文件
ls -la ./data/uploads/

# 查看日志文件
tail -f ./logs/app-$(date +%Y%m%d).log
```

---

## 🐛 故障排查

### 数据库连接失败

检查 `DATABASE_URL` 是否正确配置：

```bash
# 测试数据库连接
docker compose exec mindpocket-app sh -c "pg_isready -h your_db_host -p 5432"
```

### 查看详细日志

```bash
# 查看应用日志
docker compose logs mindpocket-app

# 实时跟踪日志
docker compose logs -f --tail=100 mindpocket-app
```

### 重新初始化

```bash
# 停止服务
docker compose down

# 重新启动
docker compose up -d
```

---

## 📝 环境变量说明

| 变量 | 必填 | 说明 |
|------|:----:|------|
| `DATABASE_URL` | ✅ | PostgreSQL 连接 URL |
| `DB_HOST` | ✅ | 数据库主机地址 |
| `DB_PORT` | ❌ | 数据库端口，默认 5432 |
| `DB_USER` | ✅ | 数据库用户名 |
| `BETTER_AUTH_SECRET` | ✅ | 认证密钥 |
| `OPENAI_API_KEY` | ✅ | OpenAI API 密钥 |
| `NEXT_PUBLIC_APP_URL` | ❌ | 应用访问地址，默认 http://localhost:3000 |
| `APP_PORT` | ❌ | 应用端口，默认 3000 |
| `STORAGE_TYPE` | ❌ | 存储类型，默认 local |
