FROM redis:7-alpine

# BullMQ requires maxmemory-policy=noeviction: evicting queue keys would corrupt job state.
# maxmemory stays below the 256MB VM so Redis errors loudly instead of being OOM-killed.
CMD ["sh", "-c", "redis-server --requirepass \"$REDIS_PASSWORD\" --appendonly yes --dir /data --maxmemory 200mb --maxmemory-policy noeviction"]
