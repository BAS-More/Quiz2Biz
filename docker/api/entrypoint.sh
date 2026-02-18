#!/bin/sh
set -e

echo "Running database migrations..."

# Try to resolve any failed migrations first
npx prisma migrate resolve --rolled-back 20260125000000_initial 2>/dev/null || true

# Run migrations
npx prisma migrate deploy || {
  echo "Migration failed, trying db push..."
  npx prisma db push --accept-data-loss
}

echo "Starting application..."
exec node --max-old-space-size=512 dist/apps/api/main.js
