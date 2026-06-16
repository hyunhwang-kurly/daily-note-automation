// 설정값. 우선순위: 환경변수 > config.json(설정 마법사가 생성) > 기본값.
// config.json이 없으면 기존 기본값으로 동작(현재 사용자 호환).

import { loadConfig } from './config-store.js'

const DEFAULT_VAULT = [
  '/Users/g02t3nc7cd/Library/Mobile Documents',
  'iCloud~md~obsidian/Documents/xtring/00.Personal',
  '🏃🏻 데일리 노트',
].join('/')

const file = loadConfig() ?? {}

function envEmailEnabled() {
  if (process.env.DAILY_NOTE_EMAIL === undefined) return undefined
  return process.env.DAILY_NOTE_EMAIL.toLowerCase() !== 'off'
}

const emailTo = process.env.DAILY_NOTE_EMAIL_TO ?? file.email?.to ?? 'hh940630@gmail.com'

export const config = Object.freeze({
  // 데일리 노트 루트 (연/월 폴더의 상위)
  vaultRoot: process.env.DAILY_NOTE_VAULT ?? file.vaultRoot ?? DEFAULT_VAULT,
  // Personal 칸에 매일 시드로 깔아줄 루틴
  personalRoutines: Object.freeze(file.personalRoutines ?? ['운동', '독서']),
  // 들여쓰기 문자 (실제 파일은 탭 사용)
  indent: '\t',
  // 메일 발송 설정 (launchd 실행 시 오늘 칸 + 이월 요약을 메일로)
  email: Object.freeze({
    // env > file > 기본(true: 현재 사용자 호환)
    enabled: envEmailEnabled() ?? file.email?.enabled ?? true,
    to: emailTo,
    // 발신 계정 (Mail.app에 등록된 계정 이메일). 미지정 시 Outbox에 멈출 수 있음.
    from: process.env.DAILY_NOTE_EMAIL_FROM ?? file.email?.from ?? emailTo,
  }),
  // Obsidian 딥링크용 볼트명 (obsidian://open?vault=...)
  obsidian: Object.freeze({
    vaultName: process.env.DAILY_NOTE_OBSIDIAN_VAULT ?? file.obsidian?.vaultName ?? 'xtring',
  }),
  // launchd 자동 실행 시각 (기본 07:00)
  schedule: Object.freeze({
    hour: Number(process.env.DAILY_NOTE_HOUR ?? file.schedule?.hour ?? 7),
    minute: Number(process.env.DAILY_NOTE_MINUTE ?? file.schedule?.minute ?? 0),
  }),
})
