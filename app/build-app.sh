#!/usr/bin/env bash
# RON.app (Swift 메뉴바 앱) + RON.dmg 빌드 (미서명).
#
# 사용법:
#   bash app/build-app.sh                 # 로컬 node 복사(빠름, 같은 arch 배포)
#   bash app/build-app.sh --download      # nodejs.org에서 arch에 맞는 node 내려받아 번들
#
# 산출물: dist/RON.app, dist/RON.dmg  (git 추적 안 함)

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST="${ROOT}/dist"
APP="${DIST}/RON.app"
CONTENTS="${APP}/Contents"
MACOS="${CONTENTS}/MacOS"
RES="${CONTENTS}/Resources"
NODE_VER="v22.11.0"
BUNDLE_ID="com.hyun.ron"

MODE="${1:-local}"

echo "▶ 정리 및 .app 골격 생성"
rm -rf "${DIST}"
mkdir -p "${MACOS}" "${RES}"

echo "▶ Swift 메뉴바 앱 컴파일"
swiftc -O "${ROOT}/app/RONMenuBar.swift" -o "${MACOS}/RON" -framework Cocoa -framework SwiftUI

echo "▶ Info.plist 작성 (LSUIElement: 메뉴바 전용, Dock 미표시)"
cat > "${CONTENTS}/Info.plist" <<PLIST_EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleName</key><string>RON</string>
  <key>CFBundleDisplayName</key><string>RON</string>
  <key>CFBundleExecutable</key><string>RON</string>
  <key>CFBundleIdentifier</key><string>${BUNDLE_ID}</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleShortVersionString</key><string>1.1.0</string>
  <key>CFBundleVersion</key><string>1</string>
  <key>CFBundleIconFile</key><string>RON</string>
  <key>LSMinimumSystemVersion</key><string>12.0</string>
  <key>LSUIElement</key><true/>
  <key>NSHighResolutionCapable</key><true/>
</dict>
</plist>
PLIST_EOF
printf 'APPL????' > "${CONTENTS}/PkgInfo"

echo "▶ 프로젝트 파일 번들 (Resources/app)"
mkdir -p "${RES}/app"
cp -R "${ROOT}/src" "${ROOT}/bin" "${ROOT}/launchd" "${ROOT}/package.json" "${RES}/app/"

echo "▶ node 런타임 번들"
mkdir -p "${RES}/node/bin"
ARCH="$(uname -m)"
case "${ARCH}" in
  arm64) NARCH="arm64" ;;
  x86_64) NARCH="x64" ;;
  *) echo "지원하지 않는 arch: ${ARCH}" >&2; exit 1 ;;
esac

if [[ "${MODE}" == "--download" ]]; then
  TARBALL="node-${NODE_VER}-darwin-${NARCH}"
  echo "  다운로드: ${TARBALL}"
  curl -fsSL "https://nodejs.org/dist/${NODE_VER}/${TARBALL}.tar.gz" -o "${DIST}/node.tgz"
  tar xzf "${DIST}/node.tgz" -C "${DIST}"
  cp "${DIST}/${TARBALL}/bin/node" "${RES}/node/bin/node"
  rm -rf "${DIST}/node.tgz" "${DIST}/${TARBALL}"
else
  LOCAL_NODE="$(command -v node || true)"
  if [[ -z "${LOCAL_NODE}" ]]; then
    echo "로컬 node 를 찾을 수 없습니다. --download 로 다시 실행하세요." >&2
    exit 1
  fi
  echo "  로컬 node 복사: ${LOCAL_NODE} (arch=${NARCH})"
  cp "${LOCAL_NODE}" "${RES}/node/bin/node"
fi
chmod +x "${RES}/node/bin/node"
# 디버그 심볼 제거로 용량 절감 (예: v25 127MB → 94MB). strip은 서명을 깨므로 즉시 ad-hoc 재서명.
if strip "${RES}/node/bin/node" 2>/dev/null; then
  codesign --remove-signature "${RES}/node/bin/node" 2>/dev/null || true
  codesign --force --sign - "${RES}/node/bin/node" 2>/dev/null || true
  echo "  strip + 재서명 완료 (용량 절감)"
fi

echo "▶ 앱 아이콘 적용"
ICON_SRC="${ROOT}/app/icon.png"
if [[ -f "${ICON_SRC}" ]]; then
  # swift 로 macOS 규격(둥근 사각형+투명 여백+그림자) shaping
  SHAPED="${ICON_SRC}"
  if swift "${ROOT}/app/make-icon.swift" "${ICON_SRC}" "${DIST}/icon-shaped.png" >/dev/null 2>&1; then
    SHAPED="${DIST}/icon-shaped.png"
    echo "  macOS 규격 shaping 적용 (둥근 사각형+투명 여백)"
  fi
  ICONSET="${DIST}/AppIcon.iconset"
  mkdir -p "${ICONSET}"
  for size in 16 32 128 256 512; do
    sips -z "${size}" "${size}" "${SHAPED}" --out "${ICONSET}/icon_${size}x${size}.png" >/dev/null
    d2=$((size * 2))
    sips -z "${d2}" "${d2}" "${SHAPED}" --out "${ICONSET}/icon_${size}x${size}@2x.png" >/dev/null
  done
  iconutil -c icns "${ICONSET}" -o "${RES}/RON.icns"
  rm -rf "${ICONSET}" "${DIST}/icon-shaped.png"
  echo "  적용됨: app/icon.png → RON.icns"
else
  echo "  app/icon.png 없음 → 아이콘 생략"
fi

echo "▶ ad-hoc 코드서명"
codesign --force --deep --sign - "${APP}" 2>/dev/null || echo "  (codesign 생략)"

echo "▶ DMG 생성"
hdiutil create -volname "RON" -srcfolder "${APP}" -ov -format UDZO "${DIST}/RON.dmg" >/dev/null

echo ""
echo "✅ 빌드 완료"
echo "   app: ${APP}"
echo "   dmg: ${DIST}/RON.dmg"
echo ""
echo "배포 안내: .dmg 열고 RON.app 을 응용 프로그램으로 드래그 → 첫 실행만 '우클릭 → 열기'."
echo "메뉴바에 아이콘이 뜨고, 로그인 자동 실행은 claude/install.sh 또는 설정에서 등록합니다."
