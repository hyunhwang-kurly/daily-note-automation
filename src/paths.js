// 앱 데이터 경로 + Obsidian 볼트 탐지. 순수 계산은 분리해 테스트 가능하게.

import os from 'node:os'
import path from 'node:path'

// 설정 파일 위치 (~/Library/Application Support/RON/config.json)
export function configDir(home = os.homedir()) {
  return path.join(home, 'Library', 'Application Support', 'RON')
}

export function configPath(home = os.homedir()) {
  return path.join(configDir(home), 'config.json')
}

// Obsidian 볼트 루트(.obsidian 폴더가 있는 곳)의 이름 = 볼트명
export function vaultNameFromRoot(obsidianRoot) {
  return path.basename(obsidianRoot)
}

// 노트 폴더에서 위로 올라가며 .obsidian 폴더를 찾는다 (볼트 루트 탐지).
// existsFn(p) 주입으로 테스트 가능. 못 찾으면 null.
export function findObsidianRoot(startDir, existsFn) {
  let dir = startDir
  // 루트까지 올라가며 탐색
  for (let i = 0; i < 64; i++) {
    if (existsFn(path.join(dir, '.obsidian'))) return dir
    const parent = path.dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return null
}

// iCloud Obsidian 기본 후보 경로들 (있으면 첫 실행 폴더 선택 기본값으로)
export function defaultVaultCandidates(home = os.homedir()) {
  const icloud = path.join(home, 'Library', 'Mobile Documents', 'iCloud~md~obsidian', 'Documents')
  return [icloud, path.join(home, 'Documents'), home]
}
