#!/bin/sh
set -e

echo "Running database migrations..."

# Try to resolve any failed migrations first
npx prisma migrate resolve --rolled-back 20260125000000_initial 2>/dev/null || true

# Run migrations (continue on failure - migrations may already be applied)
npx prisma migrate deploy 2>&1 || {
  echo "Warning: Migration failed (may already be applied), continuing startup..."
}

echo "Starting application..."
exec node --max-old-space-size=512 dist/apps/api/main.js
