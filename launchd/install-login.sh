#!/usr/bin/env bash
# RON 메뉴바 앱을 로그인 시 자동 실행하도록 LaunchAgent 등록.
#
# 사용법:
#   RON_BIN=/Applications/RON.app/Contents/MacOS/RON bash launchd/install-login.sh
#   bash launchd/install-login.sh /Applications/RON.app/Contents/MacOS/RON
#   bash launchd/install-login.sh uninstall
#
# 기본 경로: /Applications/RON.app/Contents/MacOS/RON
# RunAtLoad=true (로그인 시 실행). KeepAlive 없음 → 메뉴에서 종료하면 다음 로그인까지 유지.

set -euo pipefail

LABEL="com.hyun.ron"
PLIST="$HOME/Library/LaunchAgents/${LABEL}.plist"
DOMAIN="gui/$(id -u)"

if [[ "${1:-}" == "uninstall" ]]; then
  launchctl bootout "${DOMAIN}/${LABEL}" 2>/dev/null || true
  rm -f "${PLIST}"
  echo "✅ 로그인 자동 실행 해제: ${LABEL}"
  exit 0
fi

RON_BIN="${RON_BIN:-${1:-/Applications/RON.app/Contents/MacOS/RON}}"
if [[ ! -x "${RON_BIN}" ]]; then
  echo "❌ RON 실행 파일을 찾을 수 없습니다: ${RON_BIN}" >&2
  echo "   RON.app 을 응용 프로그램에 설치한 뒤 다시 실행하거나 경로를 인자로 주세요." >&2
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
    <string>${RON_BIN}</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>ProcessType</key>
  <string>Interactive</string>
</dict>
</plist>
PLIST_EOF

launchctl bootout "${DOMAIN}/${LABEL}" 2>/dev/null || true
launchctl bootstrap "${DOMAIN}" "${PLIST}"
launchctl enable "${DOMAIN}/${LABEL}"

echo "✅ 로그인 시 RON 자동 실행 등록 완료"
echo "   bin: ${RON_BIN}"
echo "   해제: bash launchd/install-login.sh uninstall"
