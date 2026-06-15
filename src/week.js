// 날짜 → ISO 방식 주차 계산 + Obsidian 파일 경로. 모두 순수 함수.
//
// 규칙(확정): 한 주는 월~일. 그 주의 "목요일"이 속한 달이 그 주의 소속 월.
// (= 1일이 포함된 주가 아니라, 4일 이상 포함된 주가 1주차 = ISO week-of-month)
// 검증: 2026.01 → 5주차(월 1/26), 2026.05 → 1주차(월 5/4) 모두 일치.

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'] // getDay(): 일=0 ... 토=6

// 시/분 정보를 버린 자정 기준 Date
export function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function addDays(date, n) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + n)
}

// 해당 날짜가 속한 주의 월요일
export function mondayOf(date) {
  const d = startOfDay(date)
  const mondayOffset = (d.getDay() + 6) % 7 // 월=0, 화=1 ... 일=6
  return addDays(d, -mondayOffset)
}

// 해당 주의 목요일 (소속 월 판정 기준)
export function thursdayOf(date) {
  return addDays(mondayOf(date), 3)
}

// 날짜 → { year, month(1-12), week }
export function isoWeekOfMonth(date) {
  const thu = thursdayOf(date)
  return {
    year: thu.getFullYear(),
    month: thu.getMonth() + 1,
    // 그 달의 첫 목요일은 항상 1~7일 사이 → ceil(목요일 일자 / 7) = 주차 순번
    week: Math.ceil(thu.getDate() / 7),
  }
}

// "M/D" (앞자리 0 없음) — 요일 제목용
export function monthDay(date) {
  return `${date.getMonth() + 1}/${date.getDate()}`
}

export function dayName(date) {
  return DAY_NAMES[date.getDay()]
}

// 날짜 → 파일 경로 정보
export function notePath(date, vaultRoot) {
  const { year, month, week } = isoWeekOfMonth(date)
  const mm = String(month).padStart(2, '0')
  const dir = `${vaultRoot}/${year}/${year}.${mm}`
  const file = `${year}년 ${month}월 ${week}주차.md`
  return { dir, file, fullPath: `${dir}/${file}`, year, month, week }
}

// 지난 주의 (아무) 날짜 — 이전 파일 탐색용
export function prevWeekDate(date) {
  return addDays(mondayOf(date), -7)
}

// 이번 주 월~일 7개 날짜
export function weekDates(date) {
  const mon = mondayOf(date)
  return Array.from({ length: 7 }, (_, i) => addDays(mon, i))
}

// 멱등성 마커에 쓰는 로컬 날짜 키 (YYYY-MM-DD)
export function dateKey(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
