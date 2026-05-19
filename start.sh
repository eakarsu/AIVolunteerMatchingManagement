#!/usr/bin/env bash
# AI Volunteer Matching Management — starter
set -euo pipefail

cd "$(dirname "$0")/backend"

if [ ! -f .env ] && [ -f .env.example ]; then
  echo "No .env found; copying .env.example -> .env"
  cp .env.example .env
fi

if [ ! -d node_modules ]; then
  echo "Installing dependencies..."
  npm install
fi

exec node server.js
