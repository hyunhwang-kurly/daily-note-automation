#!/usr/bin/env bash
# 매일 07:00 데일리 노트 자동 생성/이월을 launchd에 등록.
#
# 사용법:
#   bash launchd/install.sh          # 등록(또는 갱신)
#   bash launchd/install.sh uninstall  # 해제
#
# 동작:
#   - 현재 node 절대경로와 프로젝트 경로를 plist에 박아 넣음 (nvm 등 PATH 의존 제거)
#   - StartCalendarInterval 로 매일 07:00 실행
#   - 07:00에 맥이 잠들어 있었으면 깨어난 직후 1회 실행 (launchd 기본 보정)
#   - 로그: ~/Library/Logs/daily-note.log

set -euo pipefail

LABEL="com.hyun.daily-note"
PLIST="$HOME/Library/LaunchAgents/${LABEL}.plist"
LOG="$HOME/Library/Logs/daily-note.log"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENTRY="${SCRIPT_DIR}/bin/daily-note.js"
NODE_BIN="$(command -v node || true)"
DOMAIN="gui/$(id -u)"

if [[ "${1:-}" == "uninstall" ]]; then
  launchctl bootout "${DOMAIN}/${LABEL}" 2>/dev/null || launchctl unload "${PLIST}" 2>/dev/null || true
  rm -f "${PLIST}"
  echo "✅ 해제 완료: ${LABEL}"
  exit 0
fi

if [[ -z "${NODE_BIN}" ]]; then
  echo "❌ node 를 찾을 수 없습니다. node 설치 후 다시 실행하세요." >&2
  exit 1
fi

mkdir -p "$HOME/Library/LaunchAgents"

cat > "${PLIST}" <<PLIST_EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${NODE_BIN}</string>
    <string>${ENTRY}</string>
  </array>
  <key>StartCalendarInterval</key>
  <dict>
    <key>Hour</key><integer>7</integer>
    <key>Minute</key><integer>0</integer>
  </dict>
  <key>StandardOutPath</key>
  <string>${LOG}</string>
  <key>StandardErrorPath</key>
  <string>${LOG}</string>
  <key>ProcessType</key>
  <string>Background</string>
</dict>
</plist>
PLIST_EOF

# 기존 등록 제거 후 재등록
launchctl bootout "${DOMAIN}/${LABEL}" 2>/dev/null || true
launchctl bootstrap "${DOMAIN}" "${PLIST}"
launchctl enable "${DOMAIN}/${LABEL}"

echo "✅ 등록 완료: 매일 07:00 실행"
echo "   node:   ${NODE_BIN}"
echo "   script: ${ENTRY}"
echo "   log:    ${LOG}"
echo
echo "지금 한 번 테스트 실행하려면:"
echo "   launchctl kickstart -k ${DOMAIN}/${LABEL} && sleep 2 && cat \"${LOG}\""
