import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildEmail } from '../src/email.js'

const baseSummary = {
  created: false,
  carried: 2,
  skipped: false,
  path: '/Users/me/Library/Mobile Documents/iCloud~md~obsidian/Documents/xtring/00.Personal/🏃🏻 데일리 노트/2026/2026.06/2026년 6월 3주차.md',
  weekLabel: '2026년 6월 3주차',
  dayLabel: '화(6/16)',
  todaySectionText: '## 화(6/16)\n- Personal\n\t- [ ] 운동\n\t- [x] 독서\n- Read\n- Work\n\t- [ ] ↪ (2d) 코드리뷰',
  carriedItems: ['↪ (2d) 배포 요청서 작성', '↪ (2d) 코드리뷰'],
}

const opts = { vaultName: 'xtring' }

test('buildEmail: 제목에 주차/요일/이월 건수', () => {
  assert.equal(buildEmail(baseSummary, opts).subject, '[데일리노트] 2026년 6월 3주차 화(6/16) · 이월 2건')
})

test('buildEmail: 텍스트 폴백에 이월/오늘칸/링크 포함', () => {
  const { text } = buildEmail(baseSummary, opts)
  assert.ok(text.includes('📨 이월 2건'))
  assert.ok(text.includes('  - ↪ (2d) 배포 요청서 작성'))
  assert.ok(text.includes('## 화(6/16)'))
  assert.ok(text.includes('obsidian://open?vault=xtring&file='))
})

test('buildEmail: HTML에 헤더/이월/버튼(obsidian 링크) 포함', () => {
  const { html } = buildEmail(baseSummary, opts)
  assert.ok(html.includes('📅 화(6/16)'))
  assert.ok(html.includes('📨 이월 2건'))
  assert.ok(html.includes('데일리 노트 확인하기'))
  assert.ok(html.includes('href="obsidian://open?vault=xtring&amp;file='))
  // 체크박스 렌더: 미완료 ☐, 완료 ✅ + 취소선
  assert.ok(html.includes('☐'))
  assert.ok(html.includes('✅'))
  assert.ok(html.includes('<s>독서</s>'))
})

test('buildEmail: webBase 주면 버튼이 https 리다이렉트 링크 (Gmail 클릭 가능)', () => {
  const webBase = 'https://hyunhwang-kurly.github.io/daily-note-automation/open.html'
  const { html, text } = buildEmail(baseSummary, { ...opts, webBase })
  // 버튼 href가 https 리다이렉트로 바뀌고, vault/file 쿼리 포함
  assert.ok(html.includes(`href="${webBase}?vault=xtring&amp;file=`))
  assert.ok(!html.includes('href="obsidian://')) // 더 이상 직접 딥링크 버튼 아님
  assert.ok(text.includes(`${webBase}?vault=xtring&file=`))
})

test('buildEmail: 이월 0건이면 "오늘 이월 없음"', () => {
  const { subject, text, html } = buildEmail({ ...baseSummary, carried: 0, carriedItems: [] }, opts)
  assert.ok(subject.endsWith('이월 0건'))
  assert.ok(text.includes('오늘 이월 없음'))
  assert.ok(html.includes('오늘 이월 없음'))
})

test('buildEmail: HTML escape (특수문자 안전)', () => {
  const s = { ...baseSummary, carriedItems: ['<script> & "위험"'] }
  const { html } = buildEmail(s, opts)
  assert.ok(html.includes('&lt;script&gt; &amp; &quot;위험&quot;'))
  assert.ok(!html.includes('<script>'))
})

test('buildEmail: 상태 라벨', () => {
  assert.ok(buildEmail({ ...baseSummary, created: true }, opts).html.includes('신규 생성'))
  assert.ok(buildEmail({ ...baseSummary, created: false, skipped: true }, opts).html.includes('이미 처리됨'))
  assert.ok(buildEmail({ ...baseSummary, created: false, skipped: false }, opts).html.includes('이월 갱신'))
})
