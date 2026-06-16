// 설정값. 환경변수로 덮어쓸 수 있게 두되, 기본값은 사용자 볼트 경로.

const DEFAULT_VAULT = [
  '/Users/g02t3nc7cd/Library/Mobile Documents',
  'iCloud~md~obsidian/Documents/xtring/00.Personal',
  '🏃🏻 데일리 노트',
].join('/')

export const config = Object.freeze({
  // 데일리 노트 루트 (연/월 폴더의 상위)
  vaultRoot: process.env.DAILY_NOTE_VAULT ?? DEFAULT_VAULT,
  // Personal 칸에 매일 시드로 깔아줄 루틴
  personalRoutines: Object.freeze(['운동', '독서']),
  // 들여쓰기 문자 (실제 파일은 탭 사용)
  indent: '\t',
  // 메일 발송 설정 (launchd 실행 시 오늘 칸 + 이월 요약을 메일로)
  email: Object.freeze({
    // DAILY_NOTE_EMAIL=off 면 발송 비활성화
    enabled: (process.env.DAILY_NOTE_EMAIL ?? 'on').toLowerCase() !== 'off',
    to: process.env.DAILY_NOTE_EMAIL_TO ?? 'hh940630@gmail.com',
    // 발신 계정 (Mail.app에 등록된 계정 이메일). 미지정 시 Outbox에 멈출 수 있음.
    from: process.env.DAILY_NOTE_EMAIL_FROM ?? 'hh940630@gmail.com',
  }),
  // Obsidian 딥링크용 볼트명 (obsidian://open?vault=...)
  obsidian: Object.freeze({
    vaultName: process.env.DAILY_NOTE_OBSIDIAN_VAULT ?? 'xtring',
  }),
})
