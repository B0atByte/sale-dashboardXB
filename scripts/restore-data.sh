#!/usr/bin/env bash
# ============================================================================
# restore-data.sh — กู้คืนข้อมูล xBloom จากไฟล์สำรอง tar.gz กลับเข้า volume
#
# ใช้งาน:
#   MSYS_NO_PATHCONV=1 bash scripts/restore-data.sh <path/to/xbloom-data-YYYYMMDD-HHMMSS.tar.gz>
#
# คำเตือน: เขียนทับข้อมูลปัจจุบันใน volume ทั้งหมด — ควร stop backend ก่อน
#   docker compose stop backend  &&  restore  &&  docker compose start backend
# ============================================================================
set -euo pipefail

VOLUME="xbloom-dashboard_xbloom-data"
ARCHIVE="${1:?ต้องระบุไฟล์ backup: bash scripts/restore-data.sh <file.tar.gz>}"

if [ ! -f "$ARCHIVE" ]; then
  echo "ไม่พบไฟล์: $ARCHIVE" >&2
  exit 1
fi

ARCH_DIR=$(cd "$(dirname "$ARCHIVE")" && pwd)
ARCH_NAME=$(basename "$ARCHIVE")

# ล้างของเดิมใน volume แล้วแตก tar ทับ (ผ่าน helper container)
docker run --rm \
  -v "${VOLUME}:/data" \
  -v "${ARCH_DIR}:/backup:ro" \
  alpine sh -c "rm -rf /data/* /data/..?* /data/.[!.]* 2>/dev/null; tar xzf /backup/${ARCH_NAME} -C /data && echo restored:"; \
  docker run --rm -v "${VOLUME}:/data:ro" alpine ls -la /data

echo "กู้คืนเสร็จ — restart backend: docker compose restart backend"
