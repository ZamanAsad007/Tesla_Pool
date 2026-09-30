#!/bin/sh
set -e

echo "Applying pending database migrations..."
npx prisma migrate deploy

echo "Starting Dhaka Tesla Pool API server..."
exec node dist/index.js
