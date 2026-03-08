#!/bin/sh
set -e

echo "Running database migrations..."

# Use local prisma binary to avoid npx downloading latest (potentially breaking) version
PRISMA_BIN="./node_modules/.bin/prisma"

# Check if local prisma exists
if [ ! -f "$PRISMA_BIN" ]; then
  echo "Warning: Local prisma binary not found, skipping migrations"
else
  # Try to resolve any failed migrations first
  $PRISMA_BIN migrate resolve --rolled-back 20260125000000_initial 2>/dev/null || true

  # Run migrations (continue on failure - migrations may already be applied)
  $PRISMA_BIN migrate deploy 2>&1 || {
    echo "Warning: Migration failed (may already be applied), continuing startup..."
  }
fi

echo "Starting application..."
exec node --max-old-space-size=512 dist/apps/api/main.js
