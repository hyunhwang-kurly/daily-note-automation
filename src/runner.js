// 오케스트레이션: 주간 파일 보장 + 오늘 칸 시드/이월. I/O는 주입 가능(테스트용).

import fsp from 'node:fs/promises'
import path from 'node:path'
import { config } from './config.js'
import {
  notePath,
  prevWeekDate,
  weekDates,
  dayName,
  monthDay,
  dateKey,
} from './week.js'
import {
  parseSections,
  serializeSections,
  daySections,
  unfinishedWorkItems,
  workSubsectionLines,
  bumpCarry,
  parseCarry,
} from './markdown.js'
import { buildWeeklyNote } from './template.js'
import { insertWorkLog } from './worklog.js'

export const realIo = {
  async exists(p) {
    try {
      await fsp.access(p)
      return true
    } catch {
      return false
    }
  },
  async read(p) {
    return fsp.readFile(p, 'utf8')
  },
  async write(p, content) {
    await fsp.mkdir(path.dirname(p), { recursive: true })
    await fsp.writeFile(p, content, 'utf8')
  },
}

function markerFor(date) {
  return `<!-- carried:${dateKey(date)} -->`
}

// 한 요일 섹션 본문에서 Work 하위 미완료 항목 추출
function unfinishedOf(section) {
  return section ? unfinishedWorkItems(section.bodyLines) : []
}

// 이름(월/화/...)으로 요일 섹션 찾기
function findDaySectionByName(sections, name) {
  return daySections(sections).find((s) => s.title.startsWith(name))
}

// 오늘 이전 날짜들을 최신순으로 훑어 가장 최근의 미완료 Work 항목을 찾는다.
// (이번 주 today 이전 요일 → 없으면 지난주 일~월)
function findCarrySource(today, currentSections, prevSections) {
  const order = ['월', '화', '수', '목', '금', '토', '일']
  const todayIdx = order.indexOf(dayName(today))

  // 이번 주: today 바로 전날부터 거슬러
  for (let i = todayIdx - 1; i >= 0; i--) {
    const items = unfinishedOf(findDaySectionByName(currentSections, order[i]))
    if (items.length) return items
  }
  // 지난주: 일 → 월 역순
  for (let i = order.length - 1; i >= 0; i--) {
    const items = unfinishedOf(findDaySectionByName(prevSections, order[i]))
    if (items.length) return items
  }
  return []
}

// 새 주간 파일 생성에 필요한 지난주 정보 수집
function collectFromPrev(prevSections) {
  const goals = prevSections.find((s) => s.title.startsWith('이번주 목표'))
  const notes = prevSections.find((s) => s.title.startsWith('노트'))
  return {
    goalsBodyLines: goals ? [...goals.bodyLines] : undefined,
    notesBodyLines: notes ? [...notes.bodyLines] : undefined,
  }
}

// 오늘 섹션 bodyLines에 이월 항목 + 마커 삽입 (Work 내용 바로 아래, 후행 빈 줄 앞)
function injectCarry(bodyLines, carriedLines, marker) {
  const { startIndex, lines } = workSubsectionLines(bodyLines)
  if (startIndex < 0) {
    return [...bodyLines, ...carriedLines, marker] // Work 없으면 방어적으로 끝에
  }
  // Work 하위 라인 중 마지막 비어있지 않은 줄 다음에 삽입
  let lastContent = -1
  lines.forEach((l, i) => {
    if (l.trim() !== '') lastContent = i
  })
  const insertAt = lastContent === -1 ? startIndex + 1 : startIndex + 1 + lastContent + 1
  return [
    ...bodyLines.slice(0, insertAt),
    ...carriedLines,
    marker,
    ...bodyLines.slice(insertAt),
  ]
}

// 요일 섹션을 텍스트로 (후행 빈 줄/마커 제거)
function sectionToText(section) {
  const body = section.bodyLines
    .filter((l) => !l.includes('<!-- carried:'))
    .join('\n')
    .replace(/\n+$/, '')
  return `${section.raw}\n${body}`
}

// 오늘 칸 Work에 현재 들어있는 이월(↪) 항목 텍스트들
function carriedItemsIn(section) {
  return unfinishedWorkItems(section.bodyLines).filter((t) => t.startsWith('↪'))
}

/**
 * 메인 진입. 결과 요약 객체 반환.
 * @param {{today?: Date, vaultRoot?: string, io?: object}} options
 */
export async function run({ today = new Date(), vaultRoot = config.vaultRoot, io = realIo } = {}) {
  const cur = notePath(today, vaultRoot)
  const prev = notePath(prevWeekDate(today), vaultRoot)
  const summary = {
    created: false,
    carried: 0,
    skipped: false,
    path: cur.fullPath,
    weekLabel: `${cur.year}년 ${cur.month}월 ${cur.week}주차`,
    dayLabel: `${dayName(today)}(${monthDay(today)})`,
    todaySectionText: '',
    carriedItems: [],
  }

  // 지난주 파일 파싱 (있으면)
  let prevSections = []
  if (await io.exists(prev.fullPath)) {
    prevSections = parseSections(await io.read(prev.fullPath)).sections
  }

  const dayKey = dayName(today)

  // 1) 이번 주 파일이 없으면 생성
  if (!(await io.exists(cur.fullPath))) {
    const fromPrev = collectFromPrev(prevSections)
    // 월요일 칸으로 이월할 항목(지난주 미완료 Work)
    const mondaySource = findCarrySource(weekDates(today)[0], [], prevSections)
    const mondayCarry = mondaySource.map(bumpCarry)
    const content = buildWeeklyNote(today, {
      goalsBodyLines: fromPrev.goalsBodyLines,
      notesBodyLines: fromPrev.notesBodyLines,
      mondayCarry,
      // 월요일 칸은 생성 시점에 이월 완료로 마킹 → 아래 2)단계 중복 방지
      mondayMarker: markerFor(weekDates(today)[0]),
    })
    await io.write(cur.fullPath, content)
    summary.created = true
  }

  // 2) 오늘 칸 이월 (멱등)
  const parsed = parseSections(await io.read(cur.fullPath))
  const todaySection = findDaySectionByName(parsed.sections, dayKey)
  if (!todaySection) {
    summary.skipped = true
    return summary
  }

  const marker = markerFor(today)
  const alreadyDone = todaySection.bodyLines.some((l) => l.includes(marker))

  if (!alreadyDone) {
    const source = findCarrySource(today, parsed.sections, prevSections)
    // 오늘 Work에 이미 있는 base와 중복 제거
    const existingBases = new Set(
      unfinishedWorkItems(todaySection.bodyLines).map((t) => parseCarry(t).base),
    )
    const carriedLines = source
      .filter((t) => !existingBases.has(parseCarry(t).base))
      .map((t) => `${config.indent}- [ ] ${bumpCarry(t)}`)

    todaySection.bodyLines = injectCarry(todaySection.bodyLines, carriedLines, marker)
    await io.write(cur.fullPath, serializeSections(parsed.preamble, parsed.sections))
    summary.carried = carriedLines.length
  } else {
    summary.skipped = true
  }

  // 3) 메일 요약용: 오늘 칸 텍스트 + 현재 이월 항목 (skip 여부와 무관하게 항상 채움)
  summary.todaySectionText = sectionToText(todaySection)
  summary.carriedItems = carriedItemsIn(todaySection)
  return summary
}

// 이번 주 파일이 없으면 스켈레톤 생성. 경로 정보 반환.
export async function ensureWeekFile({ today = new Date(), vaultRoot = config.vaultRoot, io = realIo } = {}) {
  const cur = notePath(today, vaultRoot)
  if (!(await io.exists(cur.fullPath))) {
    await io.write(cur.fullPath, buildWeeklyNote(today))
  }
  return cur
}

/**
 * 오늘 Work 칸 하위 `🤖 Claude Code` 그룹에 작업 로그를 추가.
 * 파일/오늘 섹션이 없으면 생성. 메일/이월은 건드리지 않음.
 * @param {{today?: Date, timeLabel: string, detailLines: string[], vaultRoot?: string, io?: object}} o
 */
export async function appendDailyLog({
  today = new Date(),
  timeLabel,
  detailLines,
  vaultRoot = config.vaultRoot,
  io = realIo,
}) {
  const cur = notePath(today, vaultRoot)
  if (!(await io.exists(cur.fullPath))) {
    await io.write(cur.fullPath, buildWeeklyNote(today))
  }
  const parsed = parseSections(await io.read(cur.fullPath))
  const todaySection = findDaySectionByName(parsed.sections, dayName(today))
  if (!todaySection) throw new Error('오늘 요일 섹션을 찾을 수 없습니다')

  todaySection.bodyLines = insertWorkLog(todaySection.bodyLines, timeLabel, detailLines)
  await io.write(cur.fullPath, serializeSections(parsed.preamble, parsed.sections))
  return { path: cur.fullPath, count: detailLines.filter((l) => l.trim()).length }
}
