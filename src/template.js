// 주간 노트 스켈레톤 생성. 순수 함수.

import { config } from "./config.js";
import { dayName, monthDay, weekDates } from "./week.js";

const TAB = config.indent;

// 기본 "이번주 목표" 본문 (지난주 복사가 없을 때만 사용)
function defaultGoalsBody() {
  return ["- 주요업무", `${TAB}- `, "- 일상", `${TAB}- `, ""];
}

// 요일 한 칸 생성.
// carryItems: { indent, text } 형태(원본 탭 보존, 마커 없는 원문) 또는 문자열
export function buildDayBlock(date, { carryItems = [], marker = null } = {}) {
  const lines = [`## ${dayName(date)}(${monthDay(date)})`, "- Personal"];
  for (const routine of config.personalRoutines) {
    lines.push(`${TAB}- [ ] ${routine}`);
  }
  lines.push("- Read", "- Work");
  for (const item of carryItems) {
    const { indent, text } =
      typeof item === "string" ? { indent: TAB, text: item } : item;
    lines.push(`${indent || TAB}- [ ] ${text}`);
  }
  if (marker) lines.push(marker);
  lines.push("");
  return lines;
}

// 주간 파일 전체 생성.
// opts: { goalsBodyLines?, notesBodyLines?, mondayCarry?: string[], mondayMarker?: string }
export function buildWeeklyNote(anyDateInWeek, opts = {}) {
  const {
    goalsBodyLines = defaultGoalsBody(),
    notesBodyLines = ["- ", ""],
    mondayCarry = [],
    mondayMarker = null,
  } = opts;

  const lines = [
    "",
    "## 이번주 목표",
    ...goalsBodyLines,
    "## 노트",
    ...notesBodyLines,
  ];

  const dates = weekDates(anyDateInWeek);
  dates.forEach((d, i) => {
    const isMonday = i === 0;
    lines.push(
      ...buildDayBlock(d, {
        carryItems: isMonday ? mondayCarry : [],
        marker: isMonday ? mondayMarker : null,
      }),
    );
  });

  lines.push("## Ref.", "- ", "", "## 메모", "- ", "");
  return lines.join("\n");
}
