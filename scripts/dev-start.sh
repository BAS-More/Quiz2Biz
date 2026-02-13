#!/bin/bash
# Quick start for local development - minimal output version
set -e
cd "$(dirname "${BASH_SOURCE[0]}")/.."
echo "Starting Adaptive Questionnaire System..."
docker compose up -d
echo "Waiting for services..."
sleep 15
docker compose exec -T api npx prisma migrate deploy 2>/dev/null || true
echo ""
echo "Ready! API: http://localhost:3000/api/v1/health"
echo "Docs: http://localhost:3000/docs"
docker compose ps
#!/bin/bash
# Quick start for local development - minimal output version
set -e
cd "$(dirname "${BASH_SOURCE[0]}")/.."
echo "Starting Adaptive Questionnaire System..."
docker compose up -d
echo "Waiting for services..."
sleep 15
docker compose exec -T api npx prisma migrate deploy 2>/dev/null || true
echo ""
echo "Ready! API: http://localhost:3000/api/v1/health"
echo "Docs: http://localhost:3000/docs"
docker compose ps
