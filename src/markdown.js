// 마크다운 파싱/이월 로직. 파일 I/O 없는 순수 함수만.

const HEADING_RE = /^##\s+(.*)$/
const DAY_TITLE_RE = /^(월|화|수|목|금|토|일)(?:\(|$)/
const TOP_BULLET_RE = /^-\s+\S/ // "- Personal" 같은 최상위 불릿
const UNCHECKED_RE = /^(\s*)-\s+\[ \]\s+(.*)$/
const CARRY_PREFIX_RE = /^↪\s*(?:\((\d+)d\)\s*)?(.*)$/

// content → { preamble: string[], sections: [{title, raw, bodyLines}] }
export function parseSections(content) {
  const lines = content.split('\n')
  const sections = []
  const preamble = []
  let cur = null
  for (const line of lines) {
    const m = HEADING_RE.exec(line)
    if (m) {
      if (cur) sections.push(cur)
      cur = { title: m[1].trim(), raw: line, bodyLines: [] }
    } else if (cur) {
      cur.bodyLines.push(line)
    } else {
      preamble.push(line)
    }
  }
  if (cur) sections.push(cur)
  return { preamble, sections }
}

// 섹션 배열을 다시 문자열로
export function serializeSections(preamble, sections) {
  const out = [...preamble]
  for (const s of sections) {
    out.push(s.raw)
    out.push(...s.bodyLines)
  }
  return out.join('\n')
}

// 제목 prefix로 섹션 찾기 (예: '이번주 목표', '노트')
export function findSection(sections, titlePrefix) {
  return sections.find((s) => s.title.startsWith(titlePrefix))
}

export function isDayTitle(title) {
  return DAY_TITLE_RE.test(title)
}

// 요일 섹션만 순서대로
export function daySections(sections) {
  return sections.filter((s) => isDayTitle(s.title))
}

// 요일 섹션의 "- Work" 하위 라인들 (다음 최상위 불릿 전까지)
export function workSubsectionLines(bodyLines) {
  const idx = bodyLines.findIndex((l) => /^-\s+Work\s*$/.test(l))
  if (idx === -1) return { startIndex: -1, lines: [] }
  const lines = []
  let i = idx + 1
  for (; i < bodyLines.length; i++) {
    const l = bodyLines[i]
    if (HEADING_RE.test(l)) break
    if (TOP_BULLET_RE.test(l)) break // 다음 최상위 불릿(Personal/Read/Work 형제) 만나면 끝
    lines.push(l)
  }
  return { startIndex: idx, endIndex: i, lines }
}

// "- [ ] ..." 미완료 항목을 들여쓰기와 함께 추출 (체크된 [x]는 제외)
// → [{ indent: '\t\t', text: '...' }] (원본 탭 보존)
export function unfinishedWorkEntries(bodyLines) {
  const { lines } = workSubsectionLines(bodyLines)
  const entries = []
  for (const l of lines) {
    const m = UNCHECKED_RE.exec(l)
    if (m) entries.push({ indent: m[1], text: m[2].trim() })
  }
  return entries
}

// "- [ ] ..." 미완료 항목의 텍스트만 추출 (체크된 [x]는 제외)
export function unfinishedWorkItems(bodyLines) {
  return unfinishedWorkEntries(bodyLines).map((e) => e.text)
}

// 이월 텍스트의 base(원문)와 누적 일수 분리
export function parseCarry(text) {
  const m = CARRY_PREFIX_RE.exec(text)
  if (m) {
    return { days: Number.parseInt(m[1] ?? '1', 10), base: m[2].trim() }
  }
  return { days: 1, base: text.trim() }
}

// 이월 마킹(↪ (Nd))을 떼어낸 순수 원문 텍스트.
// 신규 이월은 마커 없이 이 텍스트 그대로 복사하고, 기존 노트에 남아있던
// 레거시 ↪ (Nd) 접두사는 제거한다.
export function carryBase(text) {
  return parseCarry(text).base
}

// 두 항목이 같은 일인지 (이월 마킹 무시한 base 비교)
export function sameBase(a, b) {
  return carryBase(a) === carryBase(b)
}
