import { test } from 'node:test'
import assert from 'node:assert/strict'
import { insertWorkLog } from '../src/worklog.js'
import { parseSections } from '../src/markdown.js'

function todayBody(extra = '') {
  const src = `
## 화(6/16)
- Personal
\t- [ ] 운동
- Read
- Work
${extra}## 수(6/17)
- Personal
`
  const { sections } = parseSections(src)
  return sections.find((s) => s.title.startsWith('화')).bodyLines
}

test('insertWorkLog: 🤖 그룹 신규 생성 + 타임스탬프/디테일', () => {
  const out = insertWorkLog(todayBody(), '14:30', ['daily-note에 log 추가', '스킬 연동'])
  const text = out.join('\n')
  assert.ok(text.includes('\t- 🤖 Claude Code'))
  assert.ok(text.includes('\t\t- 14:30'))
  assert.ok(text.includes('\t\t\t- daily-note에 log 추가'))
  assert.ok(text.includes('\t\t\t- 스킬 연동'))
})

test('insertWorkLog: 기존 🤖 그룹에 이어붙임(중복 생성 안 함)', () => {
  const body = todayBody('\t- 🤖 Claude Code\n\t\t- 09:00\n\t\t\t- 아침 작업\n')
  const out = insertWorkLog(body, '14:30', ['오후 작업'])
  const text = out.join('\n')
  assert.equal((text.match(/🤖 Claude Code/g) || []).length, 1) // 그룹은 하나만
  assert.ok(text.includes('\t\t- 09:00'))
  assert.ok(text.includes('\t\t- 14:30'))
  assert.ok(text.indexOf('09:00') < text.indexOf('14:30')) // 시간순 유지
})

test('insertWorkLog: 선행 불릿/체크박스 마커 제거', () => {
  const out = insertWorkLog(todayBody(), '10:00', ['- [ ] 정리', '* 기타'])
  const text = out.join('\n')
  assert.ok(text.includes('\t\t\t- 정리'))
  assert.ok(text.includes('\t\t\t- 기타'))
  assert.ok(!text.includes('- [ ] 정리'))
})

test('insertWorkLog: 빈 입력은 변경 없음', () => {
  const body = todayBody()
  assert.deepEqual(insertWorkLog(body, '10:00', ['', '  ']), body)
})

test('insertWorkLog: 다음 요일 섹션을 침범하지 않음', () => {
  const out = insertWorkLog(todayBody(), '14:30', ['작업'])
  // 🤖 그룹은 화요일 Work 안에만, 수요일 헤딩 앞에 위치
  const text = out.join('\n')
  assert.ok(!text.includes('## 수')) // bodyLines엔 다음 헤딩 미포함(화 섹션 본문만)
  assert.ok(text.includes('🤖 Claude Code'))
})
