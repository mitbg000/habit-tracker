#!/usr/bin/env bash
# Cập nhật bản đang chạy trên máy chủ từ GitHub. public/ đã có sẵn bản build nên không cần build lại.
set -euo pipefail
cd "$(dirname "$0")/.."

git pull --ff-only
npm ci --omit=dev
npm run init-db

echo "Đã cập nhật lên $(git rev-parse --short HEAD). Hãy Restart project trong aaPanel."
