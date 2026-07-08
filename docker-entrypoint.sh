#!/bin/sh
set -e

echo "[entrypoint] applying database migrations..."
node migrate.mjs

echo "[entrypoint] starting server..."
exec node server.js
