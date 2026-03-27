#!/bin/bash
# Migration helper script for Docker development

set -e

echo "🔄 Running Prisma migrations inside Docker..."

# Check if database is healthy
echo "✓ Waiting for database to be ready..."
docker compose exec -T servctl-db pg_isready -U developer -d Servctl

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "📦 Installing npm dependencies..."
  npm install
fi

# Run migrations
echo "🚀 Running migrations..."
docker compose exec -T -w /app servctl-db bash -c "cd /backend && npx prisma migrate deploy" || \
  npx prisma migrate deploy || \
  echo "⚠️  First run - using 'migrate dev' for development..."

# If migrations haven't run yet
if ! npx prisma db execute --stdin < /dev/null 2>/dev/null; then
  echo "📝 Creating initial migrations..."
  npx prisma migrate dev --name init
fi

echo "✅ Migrations complete!"
echo ""
echo "Next steps:"
echo "1. Run: npm run start:dev"
echo "2. Test: curl -X GET http://localhost:3000/auth/me"
