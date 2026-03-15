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

  # Run migrations
  # ALLOW_MIGRATION_FAILURE=true allows startup when migrations fail
  # (useful for multi-replica deployments where another replica ran them)
  # Default: migration failure is FATAL to prevent running against stale schema
  if $PRISMA_BIN migrate deploy 2>&1; then
    echo "Migrations applied successfully."
  else
    if [ "${ALLOW_MIGRATION_FAILURE}" = "true" ]; then
      echo "Warning: Migration failed (may already be applied), continuing startup..."
    else
      echo "FATAL: Migration failed. Set ALLOW_MIGRATION_FAILURE=true to override."
      exit 1
    fi
  fi
fi

echo "Starting application..."
exec node --max-old-space-size=512 dist/apps/api/main.js
