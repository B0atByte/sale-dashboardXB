#!/usr/bin/env bash
# ============================================================================
# backup-data.sh — สำรองข้อมูล xBloom (named volume) เป็นไฟล์ tar.gz
#
#   ข้อมูลที่สำรอง: users / settings / targets / source / sources / activity
#   (และไฟล์ DB SQLite ถ้ามี) — ทั้งหมดอยู่ใน volume "xbloom-dashboard_xbloom-data"
#
# ใช้งาน:
#   MSYS_NO_PATHCONV=1 bash scripts/backup-data.sh [BACKUP_DIR]
#   ค่าเริ่มต้น BACKUP_DIR = C:/xbloom-backups
#
# หมายเหตุ (off-host จริง): โฟลเดอร์นี้อยู่บนดิสก์เครื่องเดียวกัน — เพื่อความปลอดภัย
# ควร sync โฟลเดอร์นี้ต่อไปยัง cloud/ไดรฟ์ภายนอก (OneDrive/rclone/หน่วยความจำภายนอก)
# ============================================================================
set -euo pipefail

VOLUME="xbloom-dashboard_xbloom-data"
BACKUP_DIR="${1:-C:/xbloom-backups}"
KEEP="${KEEP:-14}"   # เก็บกี่ไฟล์ล่าสุด

mkdir -p "$BACKUP_DIR"
TS=$(date +%Y%m%d-%H%M%S)
OUT="xbloom-data-${TS}.tar.gz"

# tar volume ผ่าน helper container (อ่านอย่างเดียว) เขียนลงโฟลเดอร์ host
docker run --rm \
  -v "${VOLUME}:/data:ro" \
  -v "${BACKUP_DIR}:/backup" \
  alpine sh -c "tar czf /backup/${OUT} -C /data ."

# prune: เก็บ KEEP ไฟล์ล่าสุด ลบเก่ากว่านั้น
ls -1t "${BACKUP_DIR}"/xbloom-data-*.tar.gz 2>/dev/null | tail -n +"$((KEEP+1))" | xargs -r rm -f

echo "OK: ${BACKUP_DIR}/${OUT}"
ls -lh "${BACKUP_DIR}/${OUT}"
