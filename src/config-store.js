// config.json 읽기/쓰기 + 설정 객체 정규화. I/O 분리.

import fs from 'node:fs'
import { configDir, configPath } from './paths.js'

// 사용자 입력(answers) → 저장할 설정 객체 (순수)
export function buildConfig({ vaultRoot, vaultName, email } = {}) {
  return {
    vaultRoot,
    obsidian: { vaultName },
    email: {
      enabled: Boolean(email?.enabled),
      to: email?.to ?? '',
      from: email?.from ?? email?.to ?? '',
    },
  }
}

// 설정 파일 로드. 없거나 깨졌으면 null.
export function loadConfig(home) {
  try {
    const raw = fs.readFileSync(configPath(home), 'utf8')
    return JSON.parse(raw)
  } catch {
    return null
  }
}

// 설정 저장 (디렉터리 자동 생성)
export function saveConfig(cfg, home) {
  fs.mkdirSync(configDir(home), { recursive: true })
  fs.writeFileSync(configPath(home), `${JSON.stringify(cfg, null, 2)}\n`, 'utf8')
  return configPath(home)
}
