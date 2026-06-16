import { test } from 'node:test'
import assert from 'node:assert/strict'
import { obsidianUri } from '../src/obsidian.js'

test('obsidianUri: 볼트 기준 상대경로 + 인코딩', () => {
  const full =
    '/Users/me/Library/Mobile Documents/iCloud~md~obsidian/Documents/xtring/00.Personal/🏃🏻 데일리 노트/2026/2026.06/2026년 6월 3주차.md'
  const uri = obsidianUri(full, 'xtring')
  assert.ok(uri.startsWith('obsidian://open?vault=xtring&file='))
  // 한글/공백/슬래시 인코딩 확인
  assert.ok(uri.includes(encodeURIComponent('00.Personal/🏃🏻 데일리 노트/2026/2026.06/2026년 6월 3주차.md')))
})

test('obsidianUri: 볼트명이 경로에 없으면 파일명만', () => {
  const uri = obsidianUri('/tmp/foo/bar.md', 'xtring')
  assert.equal(uri, `obsidian://open?vault=xtring&file=${encodeURIComponent('bar.md')}`)
})
