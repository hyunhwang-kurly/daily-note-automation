#!/usr/bin/env bash
# RON.app + RON.dmg 빌드 (미서명).
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
RES="${APP}/Contents/Resources"
NODE_VER="v22.11.0"
BUNDLE_ID="com.hyun.ron"

MODE="${1:-local}"

echo "▶ 정리 및 .app 골격 생성"
rm -rf "${DIST}"
mkdir -p "${DIST}"
osacompile -o "${APP}" "${ROOT}/app/launcher.applescript"

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

echo "▶ Info.plist 메타데이터 설정"
PLIST="${APP}/Contents/Info.plist"
/usr/libexec/PlistBuddy -c "Set :CFBundleName RON" "${PLIST}" 2>/dev/null || true
/usr/libexec/PlistBuddy -c "Add :CFBundleDisplayName string RON" "${PLIST}" 2>/dev/null \
  || /usr/libexec/PlistBuddy -c "Set :CFBundleDisplayName RON" "${PLIST}"
/usr/libexec/PlistBuddy -c "Set :CFBundleIdentifier ${BUNDLE_ID}" "${PLIST}" 2>/dev/null \
  || /usr/libexec/PlistBuddy -c "Add :CFBundleIdentifier string ${BUNDLE_ID}" "${PLIST}"

echo "▶ 앱 아이콘 적용"
ICON_SRC="${ROOT}/app/icon.png"
if [[ -f "${ICON_SRC}" ]]; then
  # swift 가 있으면 macOS 규격(둥근 사각형+투명 여백+그림자)으로 shaping 후 사용
  SHAPED="${ICON_SRC}"
  if command -v swift >/dev/null 2>&1; then
    SHAPED="${DIST}/icon-shaped.png"
    if swift "${ROOT}/app/make-icon.swift" "${ICON_SRC}" "${SHAPED}" >/dev/null 2>&1; then
      echo "  macOS 규격 shaping 적용 (둥근 사각형+투명 여백)"
    else
      SHAPED="${ICON_SRC}"
      echo "  shaping 실패 → 원본 사용"
    fi
  fi
  ICONSET="${DIST}/AppIcon.iconset"
  mkdir -p "${ICONSET}"
  # 표준 아이콘 세트 생성 (16~512 + @2x)
  for size in 16 32 128 256 512; do
    sips -z "${size}" "${size}" "${SHAPED}" --out "${ICONSET}/icon_${size}x${size}.png" >/dev/null
    d2=$((size * 2))
    sips -z "${d2}" "${d2}" "${SHAPED}" --out "${ICONSET}/icon_${size}x${size}@2x.png" >/dev/null
  done
  # osacompile이 만든 applet.icns 를 교체 (Info.plist의 CFBundleIconFile=applet 그대로 사용)
  iconutil -c icns "${ICONSET}" -o "${RES}/applet.icns"
  rm -rf "${ICONSET}" "${DIST}/icon-shaped.png"
  echo "  적용됨: app/icon.png → applet.icns"
else
  echo "  app/icon.png 없음 → 기본 아이콘 사용 (1024x1024 PNG를 app/icon.png 로 두면 자동 적용)"
fi

echo "▶ ad-hoc 코드서명 (Gatekeeper 경고 완화, 무인증서)"
codesign --force --deep --sign - "${APP}" 2>/dev/null || echo "  (codesign 생략)"

echo "▶ DMG 생성"
hdiutil create -volname "RON" -srcfolder "${APP}" -ov -format UDZO "${DIST}/RON.dmg" >/dev/null

echo ""
echo "✅ 빌드 완료"
echo "   app: ${APP}"
echo "   dmg: ${DIST}/RON.dmg"
echo ""
echo "배포 안내: 받은 사람은 .dmg 열고 RON.app 을 Applications로 끌어다 놓은 뒤,"
echo "첫 실행만 '우클릭 → 열기 → 열기'로 Gatekeeper 경고를 1회 허용하면 됩니다."
