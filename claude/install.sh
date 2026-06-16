#!/usr/bin/env bash
# Claude Code 통합 설치.
#
# 사용법:
#   bash claude/install.sh              # daily-log 스킬을 로컬(~/.claude/skills)에 등록
#   bash claude/install.sh --with-hook  # + SessionEnd 자동 트레이스 훅도 등록
#   bash claude/install.sh uninstall    # 스킬/훅 제거
#
# 멱등: 여러 번 실행해도 중복 등록되지 않음.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SKILL_DIR="$HOME/.claude/skills/daily-log"
SETTINGS="$HOME/.claude/settings.json"
HOOK_CMD="node ${ROOT}/claude/hooks/session-end-log.js"

remove_hook() {
  [[ -f "${SETTINGS}" ]] || return 0
  node - "${SETTINGS}" <<'NODE'
const fs = require('fs')
const p = process.argv[2]
const j = JSON.parse(fs.readFileSync(p, 'utf8'))
if (j.hooks && Array.isArray(j.hooks.SessionEnd)) {
  const before = j.hooks.SessionEnd.length
  j.hooks.SessionEnd = j.hooks.SessionEnd.filter(
    (e) => !JSON.stringify(e).includes('session-end-log.js'),
  )
  if (j.hooks.SessionEnd.length !== before) {
    fs.writeFileSync(p, JSON.stringify(j, null, 2) + '\n')
    console.log('  훅 제거됨')
  }
}
NODE
}

if [[ "${1:-}" == "uninstall" ]]; then
  rm -rf "${SKILL_DIR}"
  echo "✅ 스킬 제거: ${SKILL_DIR}"
  remove_hook
  exit 0
fi

echo "▶ daily-log 스킬 설치"
mkdir -p "${SKILL_DIR}"
cp "${ROOT}/claude/skills/daily-log/SKILL.md" "${SKILL_DIR}/SKILL.md"
echo "  설치됨: ${SKILL_DIR}/SKILL.md"

if [[ "${1:-}" == "--with-hook" ]]; then
  echo "▶ SessionEnd 자동 트레이스 훅 등록"
  [[ -f "${SETTINGS}" ]] || echo '{}' > "${SETTINGS}"
  node - "${SETTINGS}" "${HOOK_CMD}" <<'NODE'
const fs = require('fs')
const [, , p, cmd] = process.argv
const j = JSON.parse(fs.readFileSync(p, 'utf8'))
j.hooks = j.hooks || {}
j.hooks.SessionEnd = j.hooks.SessionEnd || []
if (JSON.stringify(j.hooks.SessionEnd).includes('session-end-log.js')) {
  console.log('  이미 등록됨 — 변경 없음')
} else {
  j.hooks.SessionEnd.push({ hooks: [{ type: 'command', command: cmd }] })
  fs.writeFileSync(p, JSON.stringify(j, null, 2) + '\n')
  console.log('  등록됨:', cmd)
}
NODE
fi

echo "✅ 완료. Claude Code에서 /daily-log 또는 \"오늘 작업 정리\"로 사용하세요."
