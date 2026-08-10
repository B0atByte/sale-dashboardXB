#!/usr/bin/env bash
# รันบน VPS (ผ่าน SSH จาก .github/workflows/deploy.yml)
# ดึงโค้ดล่าสุด → build+up → health check → rollback อัตโนมัติถ้าไม่ผ่าน
#
# ปลอดภัยกับข้อมูล: .env และ data (SQLite/Redis) อยู่นอก git tree (gitignored + docker volume)
# git reset --hard จึงไม่แตะไฟล์เหล่านั้น (และสคริปต์นี้ไม่รัน git clean)
set -euo pipefail

APP_DIR="${APP_DIR:-/data/apps/sale-dashboard}"
HEALTH_URL="${HEALTH_URL:-http://localhost:8081/api/health}"
HEALTH_RETRIES="${HEALTH_RETRIES:-20}"
HEALTH_DELAY="${HEALTH_DELAY:-3}"

cd "$APP_DIR"

PREV="$(git rev-parse HEAD)"
echo "==> current commit: $PREV"

git fetch --all --prune
git reset --hard origin/main
NEW="$(git rev-parse HEAD)"
echo "==> deploying commit: $NEW"

deploy() {
  docker compose up -d --build
}

healthy() {
  for _ in $(seq 1 "$HEALTH_RETRIES"); do
    if curl -fsS "$HEALTH_URL" >/dev/null 2>&1; then return 0; fi
    sleep "$HEALTH_DELAY"
  done
  return 1
}

deploy

if healthy; then
  echo "==> health check OK — live on $NEW"
  docker image prune -f >/dev/null 2>&1 || true
  exit 0
fi

echo "!!! health check FAILED — rolling back to $PREV"
git reset --hard "$PREV"
deploy
if healthy; then
  echo "==> rolled back to $PREV (healthy)"
else
  echo "!!! rollback ALSO unhealthy — needs manual attention"
fi
exit 1
