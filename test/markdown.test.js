import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  parseSections,
  serializeSections,
  unfinishedWorkItems,
  unfinishedWorkEntries,
  workSubsectionLines,
  parseCarry,
  carryBase,
  sameBase,
  daySections,
} from '../src/markdown.js'

const SAMPLE = `
## 이번주 목표
- 주요업무
\t- KC 인증

## 노트
- [링크](http://x)

## 월(5/25)
- Personal
\t- [ ] 운동
- Read
- Work
\t- [ ] 정기 배포
\t- [x] 끝난일
\t- [ ] ↪ (2d) 밀린일

## 화(5/26)
- Personal
- Read
- Work
`

test('parseSections: 제목/본문 분리 + 왕복 보존', () => {
  const { preamble, sections } = parseSections(SAMPLE)
  assert.equal(sections.length, 4) // 이번주 목표, 노트, 월, 화
  assert.equal(sections[0].title, '이번주 목표')
  assert.equal(serializeSections(preamble, sections), SAMPLE)
})

test('daySections: 요일만 추출', () => {
  const { sections } = parseSections(SAMPLE)
  const days = daySections(sections)
  assert.deepEqual(days.map((s) => s.title), ['월(5/25)', '화(5/26)'])
})

test('unfinishedWorkItems: [ ]만, [x] 제외, Personal 제외', () => {
  const { sections } = parseSections(SAMPLE)
  const mon = sections.find((s) => s.title.startsWith('월'))
  assert.deepEqual(unfinishedWorkItems(mon.bodyLines), ['정기 배포', '↪ (2d) 밀린일'])
})

test('workSubsectionLines: Work 하위만, 다음 최상위 불릿에서 끊김', () => {
  const { sections } = parseSections(SAMPLE)
  const mon = sections.find((s) => s.title.startsWith('월'))
  const { lines } = workSubsectionLines(mon.bodyLines)
  assert.ok(lines.every((l) => l.startsWith('\t') || l.trim() === ''))
  assert.ok(!lines.some((l) => l.includes('운동'))) // Personal 항목 안 들어옴
})

test('parseCarry: 일수/base 분리', () => {
  assert.deepEqual(parseCarry('정기 배포'), { days: 1, base: '정기 배포' })
  assert.deepEqual(parseCarry('↪ (2d) 밀린일'), { days: 2, base: '밀린일' })
  assert.deepEqual(parseCarry('↪ 표시만'), { days: 1, base: '표시만' })
})

test('carryBase: ↪ (Nd) 마커만 떼고 원문(이모지 포함) 보존', () => {
  assert.equal(carryBase('정기 배포'), '정기 배포')
  assert.equal(carryBase('🚀 배포 요청서'), '🚀 배포 요청서') // 본문 이모지는 유지
  assert.equal(carryBase('↪ (3d) 배포 요청서'), '배포 요청서') // 레거시 마커는 제거
})

test('sameBase: ↪ 마커 무시하고 같은 일로 인식', () => {
  assert.ok(sameBase('배포 요청서', '↪ (3d) 배포 요청서'))
})

test('unfinishedWorkEntries: 원본 들여쓰기(탭) 보존, [x] 제외', () => {
  const sample = `
## 월(6/15)
- Personal
\t- [ ] 운동
- Read
- Work
\t- [ ] 부모 작업
\t\t- [ ] 자식 작업
\t- [x] 끝난일
`
  const { sections } = parseSections(sample)
  const mon = sections.find((s) => s.title.startsWith('월'))
  assert.deepEqual(unfinishedWorkEntries(mon.bodyLines), [
    { indent: '\t', text: '부모 작업' },
    { indent: '\t\t', text: '자식 작업' },
  ])
})
