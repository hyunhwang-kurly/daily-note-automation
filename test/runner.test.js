import { test } from 'node:test'
import assert from 'node:assert/strict'
import { run } from '../src/runner.js'

// 인메모리 IO
function memIo(initial = {}) {
  const store = new Map(Object.entries(initial))
  return {
    store,
    async exists(p) {
      return store.has(p)
    },
    async read(p) {
      return store.get(p)
    },
    async write(p, c) {
      store.set(p, c)
    },
  }
}

const d = (y, m, day) => new Date(y, m - 1, day)
const VAULT = '/vault'

test('월요일: 파일 없으면 신규 생성 + 지난주 미완료 이월', async () => {
  const prevPath = '/vault/2026/2026.05/2026년 5월 3주차.md'
  const prev = `
## 이번주 목표
- 주요업무
\t- KC 인증
## 노트
- [a](http://a)
## 월(5/18)
- Personal
- Read
- Work
## 화(5/19)
- Personal
- Read
- Work
\t- [ ] 안끝난 배포
\t- [x] 끝남
## 수
- Personal
- Read
- Work
## 목
- Personal
- Read
- Work
## 금
- Personal
- Read
- Work
## 토
- Personal
- Read
- Work
## 일
- Personal
- Read
- Work
`
  const io = memIo({ [prevPath]: prev })
  const result = await run({ today: d(2026, 5, 25), vaultRoot: VAULT, io })

  assert.equal(result.created, true)
  const curPath = '/vault/2026/2026.05/2026년 5월 4주차.md'
  const content = io.store.get(curPath)
  // 지난주 목표/노트 복사됨
  assert.ok(content.includes('KC 인증'))
  assert.ok(content.includes('[a](http://a)'))
  // 미완료가 월요일로 이월 (2d)
  assert.ok(content.includes('↪ (2d) 안끝난 배포'))
  // 완료된 항목은 이월 안 됨
  assert.ok(!content.includes('끝남'))
  // Personal 루틴 시드
  assert.ok(content.includes('- [ ] 운동'))
  assert.ok(content.includes('- [ ] 독서'))
})

test('화요일: 월요일 미완료를 화요일로 이월, 멱등', async () => {
  const curPath = '/vault/2026/2026.06/2026년 6월 3주차.md'
  const cur = `
## 이번주 목표
- 주요업무
## 노트
-
## 월(6/15)
- Personal
\t- [ ] 운동
- Read
- Work
\t- [ ] 코드리뷰
## 화(6/16)
- Personal
- Read
- Work
## 수
- Personal
- Read
- Work
## 목
- Personal
- Read
- Work
## 금
- Personal
- Read
- Work
## 토
- Personal
- Read
- Work
## 일
- Personal
- Read
- Work
## Ref.
-
## 메모
-
`
  const io = memIo({ [curPath]: cur })
  const r1 = await run({ today: d(2026, 6, 16), vaultRoot: VAULT, io })
  assert.equal(r1.created, false)
  assert.equal(r1.carried, 1)
  assert.ok(io.store.get(curPath).includes('↪ (2d) 코드리뷰'))

  // 같은 날 재실행 → 멱등(중복 없음, skip)
  const r2 = await run({ today: d(2026, 6, 16), vaultRoot: VAULT, io })
  assert.equal(r2.skipped, true)
  const occurrences = io.store.get(curPath).split('↪ (2d) 코드리뷰').length - 1
  assert.equal(occurrences, 1)
})

test('이월할 게 없으면 마커만 남기고 0건', async () => {
  const curPath = '/vault/2026/2026.06/2026년 6월 3주차.md'
  const cur = `
## 월(6/15)
- Personal
- Read
- Work
## 화(6/16)
- Personal
- Read
- Work
`
  const io = memIo({ [curPath]: cur })
  const r = await run({ today: d(2026, 6, 16), vaultRoot: VAULT, io })
  assert.equal(r.carried, 0)
  assert.ok(io.store.get(curPath).includes('<!-- carried:2026-06-16 -->'))
})
