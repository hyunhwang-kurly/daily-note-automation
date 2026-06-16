// 오늘 Work 칸 하위 `🤖 Claude Code` 그룹에 작업 로그를 삽입. 순수 함수.

import { workSubsectionLines } from './markdown.js'

const BOT_BULLET = '\t- 🤖 Claude Code'

function leadingTabs(line) {
  return (line.match(/^\t*/)?.[0].length) ?? 0
}

// 입력 줄에서 선행 불릿/체크박스 마커 제거 (중복 "- - " 방지)
function clean(line) {
  return line.replace(/^\s*(?:[-*]\s+)?(?:\[[ xX]\]\s+)?/, '').trim()
}

/**
 * todaySection.bodyLines 에 작업 로그를 끼워넣은 새 배열 반환.
 * 구조:
 *   - Work
 *     - 🤖 Claude Code
 *       - {timeLabel}
 *         - {detail}
 */
export function insertWorkLog(bodyLines, timeLabel, detailLines) {
  const details = detailLines.map((d) => clean(d)).filter(Boolean)
  if (details.length === 0) return bodyLines

  const group = [`\t\t- ${timeLabel}`, ...details.map((d) => `\t\t\t- ${d}`)]

  const { startIndex, endIndex } = workSubsectionLines(bodyLines)
  if (startIndex < 0) {
    // Work 칸이 없으면 방어적으로 끝에 추가
    return [...bodyLines, BOT_BULLET, ...group]
  }

  // Work 블록 내에서 🤖 불릿 탐색
  let botIdx = -1
  for (let i = startIndex + 1; i < endIndex; i++) {
    if (bodyLines[i] === BOT_BULLET) {
      botIdx = i
      break
    }
  }

  if (botIdx === -1) {
    // 🤖 그룹이 없으면 Work 블록 끝에 새로 생성
    return [...bodyLines.slice(0, endIndex), BOT_BULLET, ...group, ...bodyLines.slice(endIndex)]
  }

  // 🤖 블록의 끝(들여쓰기 2탭 이상이 이어지는 구간) 다음에 그룹 추가
  let insertAt = botIdx + 1
  while (insertAt < endIndex && bodyLines[insertAt].trim() !== '' && leadingTabs(bodyLines[insertAt]) >= 2) {
    insertAt++
  }
  return [...bodyLines.slice(0, insertAt), ...group, ...bodyLines.slice(insertAt)]
}
