#!/usr/bin/env node
// Claude Code SessionEnd 훅: 가벼운(결정론적) 작업 트레이스를 오늘 데일리 노트에 기록.
// stdin 으로 훅 JSON({cwd, session_id, reason, ...})을 받음. Claude 재호출 없음 → 무료·무재귀.
// git 레포에서 끝난 세션만 기록(노이즈 최소화). 실패해도 조용히 종료(세션 차단 안 함).

import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { appendDailyLog } from '../../src/runner.js'

function readStdin() {
  return new Promise((resolve) => {
    let data = ''
    process.stdin.setEncoding('utf8')
    process.stdin.on('data', (c) => (data += c))
    process.stdin.on('end', () => resolve(data))
    // 입력이 없을 수도 있으니 안전장치
    setTimeout(() => resolve(data), 2000).unref?.()
  })
}

function git(cwd, args) {
  try {
    return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
  } catch {
    return ''
  }
}

function hhmm(d) {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

async function main() {
  let input = {}
  try {
    input = JSON.parse((await readStdin()) || '{}')
  } catch {
    input = {}
  }
  const cwd = input.cwd || process.cwd()

  // git 레포가 아니면 기록하지 않음 (잡 디렉터리 노이즈 방지)
  const inside = git(cwd, ['rev-parse', '--is-inside-work-tree'])
  if (inside !== 'true') return

  const project = path.basename(git(cwd, ['rev-parse', '--show-toplevel']) || cwd)
  const branch = git(cwd, ['rev-parse', '--abbrev-ref', 'HEAD']) || '-'
  const changed = git(cwd, ['status', '--porcelain'])
    .split('\n')
    .filter((l) => l.trim()).length
  const lastCommit = git(cwd, ['log', '-1', '--pretty=%s'])

  const parts = [`(auto) ${project} · ${branch} · 변경 ${changed}개`]
  if (lastCommit) parts.push(`최근: ${lastCommit}`)
  const line = parts.join(' · ')

  const now = new Date()
  await appendDailyLog({ today: now, timeLabel: hhmm(now), detailLines: [line] })
}

main().catch(() => {
  // 훅 실패가 세션 종료를 막지 않도록 무시
  process.exit(0)
})
