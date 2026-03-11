#!/bin/sh
set -e

# 日志配置
LOG_DIR="${LOG_DIR:-/logs}"
mkdir -p "$LOG_DIR"

# 日志文件按日期命名
LOG_FILE="$LOG_DIR/app-$(date +%Y%m%d).log"

# 日志函数
log() {
    local level="$1"
    shift
    local msg="[$(date '+%Y-%m-%d %H:%M:%S')] [$level] $*"
    echo "$msg"
    echo "$msg" >> "$LOG_FILE"
}

log "INFO" "=========================================="
log "INFO" "[MindPocket] Starting application..."
log "INFO" "=========================================="

# 数据库连接参数
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-postgres}"

# 等待数据库就绪
log "INFO" "Waiting for database at $DB_HOST:$DB_PORT..."
MAX_TRIES=60
COUNTER=0

while [ $COUNTER -lt $MAX_TRIES ]; do
  if pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -t 2 > /dev/null 2>&1; then
    log "INFO" "Database is ready!"
    break
  fi

  COUNTER=$((COUNTER + 1))
  log "INFO" "Waiting for database... ($COUNTER/$MAX_TRIES)"
  sleep 2
done

if [ $COUNTER -eq $MAX_TRIES ]; then
  log "WARN" "Database connection timeout, continuing anyway..."
fi

# 额外等待，确保数据库完全启动
sleep 2

# 执行数据库迁移
log "INFO" "Running database migrations..."

# 尝试执行迁移
if pnpm db:migrate >> "$LOG_FILE" 2>&1; then
  log "INFO" "Database migrations completed successfully"
else
  log "WARN" "Migration failed, trying drizzle-kit push..."
  # 如果迁移失败，尝试使用 push
  if npx drizzle-kit push --force >> "$LOG_FILE" 2>&1; then
    log "INFO" "Database schema pushed successfully"
  else
    log "WARN" "Database push had issues, but continuing..."
  fi
fi

# 检查是否需要创建 vector 扩展
log "INFO" "Ensuring pgvector extension is installed..."
if node -e "
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query('CREATE EXTENSION IF NOT EXISTS vector')
  .then(() => { console.log('pgvector extension ensured'); pool.end(); })
  .catch(err => { console.error('pgvector error:', err.message); pool.end(); process.exit(1); });
" >> "$LOG_FILE" 2>&1; then
  log "INFO" "pgvector extension ensured"
else
  log "WARN" "Could not verify pgvector (may already exist)"
fi

log "INFO" "=========================================="
log "INFO" "[MindPocket] Starting Next.js server..."
log "INFO" "Log file: $LOG_FILE"
log "INFO" "=========================================="

# 启动应用，同时输出到控制台和日志文件
exec node server.js 2>&1 | tee -a "$LOG_FILE"
