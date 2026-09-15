#!/bin/sh
set -e

echo "🔄 Applying Prisma database schema safely (non-destructive)..."
npx prisma db push --skip-generate

echo "🌱 Seeding base system catalogs (idempotent)..."
npx prisma db seed || true

echo "🚀 Starting InfraInventory Backend API Server..."
exec node dist/server.js
