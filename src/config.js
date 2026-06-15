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
})
