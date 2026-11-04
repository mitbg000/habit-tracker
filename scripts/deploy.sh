#!/usr/bin/env bash
# Cập nhật bản đang chạy trên máy chủ từ GitHub. public/ đã có sẵn bản build nên không cần build lại.
set -euo pipefail
cd "$(dirname "$0")/.."

# Terminal có thể dùng Node của hệ thống, khác bản aaPanel chạy project. Cài bằng bản quá cũ sẽ làm hỏng node_modules.
NODE_MAJOR="$(node -p "process.versions.node.split('.')[0]")"
if [ "$NODE_MAJOR" -lt 18 ]; then
  echo "Đang dùng Node $(node -v), cần từ 18 trở lên. Chưa thay đổi gì trên máy chủ." >&2
  echo "Chọn bản Node của aaPanel rồi chạy lại, xem docs/DEPLOY.md, mục Cập nhật về sau." >&2
  exit 1
fi

git pull --ff-only
npm ci --omit=dev
npm run init-db

echo "Đã cập nhật lên $(git rev-parse --short HEAD). Hãy Restart project trong aaPanel."
