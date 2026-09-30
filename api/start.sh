#!/bin/sh
set -e

export NODE_ENV="${NODE_ENV:-production}"

echo "Applying pending database migrations..."
npx prisma migrate deploy

echo "Starting Dhaka Tesla Pool API server..."
exec node dist/index.js
