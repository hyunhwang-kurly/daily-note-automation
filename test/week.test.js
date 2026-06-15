import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isoWeekOfMonth, notePath, monthDay, dayName, mondayOf, prevWeekDate, dateKey } from '../src/week.js'

const d = (y, m, day) => new Date(y, m - 1, day)

test('ISO 주차: 2026.05 (첫 월요일 = 1주차)', () => {
  assert.deepEqual(isoWeekOfMonth(d(2026, 5, 4)), { year: 2026, month: 5, week: 1 })
  assert.deepEqual(isoWeekOfMonth(d(2026, 5, 11)), { year: 2026, month: 5, week: 2 })
  assert.deepEqual(isoWeekOfMonth(d(2026, 5, 25)), { year: 2026, month: 5, week: 4 })
})

test('ISO 주차: 2026.01 (1/26 = 5주차, 실제 파일과 일치)', () => {
  assert.deepEqual(isoWeekOfMonth(d(2026, 1, 26)), { year: 2026, month: 1, week: 5 })
  // 1/1(목)~1/4 주: 목요일 1/1이 1월 → 1월 1주차
  assert.deepEqual(isoWeekOfMonth(d(2026, 1, 1)), { year: 2026, month: 1, week: 1 })
  assert.deepEqual(isoWeekOfMonth(d(2026, 1, 5)), { year: 2026, month: 1, week: 2 })
})

test('ISO 주차: 2026.04 (4/27 주는 목 4/30 → 4월 5주차)', () => {
  assert.deepEqual(isoWeekOfMonth(d(2026, 4, 30)), { year: 2026, month: 4, week: 5 })
})

test('월말 경계: 6/29~7/5 주는 목 7/2 → 7월 1주차', () => {
  assert.deepEqual(isoWeekOfMonth(d(2026, 6, 29)), { year: 2026, month: 7, week: 1 })
  assert.deepEqual(isoWeekOfMonth(d(2026, 7, 5)), { year: 2026, month: 7, week: 1 })
})

test('연말 경계: 2025/12/29~2026/1/4 주는 목 1/1 → 2026년 1월 1주차 (실제 파일과 일치)', () => {
  assert.deepEqual(isoWeekOfMonth(d(2025, 12, 29)), { year: 2026, month: 1, week: 1 })
  // 반례: 2026/12/28(월)~1/3 주는 목요일이 12/31 → 12월 5주차로 남음
  assert.deepEqual(isoWeekOfMonth(d(2026, 12, 28)), { year: 2026, month: 12, week: 5 })
})

test('주중 어느 요일이든 같은 주차로 귀속 (월~일)', () => {
  const expect = { year: 2026, month: 5, week: 1 }
  for (let day = 4; day <= 10; day++) {
    assert.deepEqual(isoWeekOfMonth(d(2026, 5, day)), expect, `5/${day}`)
  }
})

test('notePath: 폴더/파일명 형식', () => {
  const p = notePath(d(2026, 5, 25), '/vault')
  assert.equal(p.dir, '/vault/2026/2026.05')
  assert.equal(p.file, '2026년 5월 4주차.md')
  assert.equal(p.fullPath, '/vault/2026/2026.05/2026년 5월 4주차.md')
})

test('notePath: 7월은 2026.07 폴더', () => {
  const p = notePath(d(2026, 6, 30), '/vault') // 목 7/2 → 7월
  assert.equal(p.dir, '/vault/2026/2026.07')
  assert.equal(p.file, '2026년 7월 1주차.md')
})

test('mondayOf / prevWeekDate', () => {
  assert.deepEqual(mondayOf(d(2026, 5, 25)), d(2026, 5, 25)) // 월요일
  assert.deepEqual(mondayOf(d(2026, 5, 28)), d(2026, 5, 25)) // 목요일 → 그 주 월
  assert.deepEqual(prevWeekDate(d(2026, 5, 25)), d(2026, 5, 18))
})

test('monthDay / dayName / dateKey', () => {
  assert.equal(monthDay(d(2026, 5, 4)), '5/4')
  assert.equal(dayName(d(2026, 6, 16)), '화')
  assert.equal(dateKey(d(2026, 6, 16)), '2026-06-16')
})
