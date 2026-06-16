#!/usr/bin/env node
// 설정 마법사: 폴더/이메일을 GUI로 받아 config.json 저장 + (선택) 자동 실행 등록.
// 비개발자가 더블클릭으로 실행하는 진입점 (2단계에서 .app이 이걸 호출).

import fs from 'node:fs'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { chooseFolder, promptText, confirm, notify } from '../src/dialog.js'
import { findObsidianRoot, vaultNameFromRoot, defaultVaultCandidates } from '../src/paths.js'
import { buildConfig, saveConfig } from '../src/config-store.js'

const PROJECT_DIR = fileURLToPath(new URL('..', import.meta.url))

function run(cmd, args, env = {}) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { cwd: PROJECT_DIR, env: { ...process.env, ...env } }, (e, out, err) => {
      if (e) reject(new Error(err || e.message))
      else resolve(out)
    })
  })
}

async function main() {
  // 1) 노트 폴더 선택
  const candidate = defaultVaultCandidates().find((p) => fs.existsSync(p))
  const vaultRoot = await chooseFolder({
    prompt: '데일리 노트를 저장할 폴더를 선택하세요 (예: Obsidian 볼트 안의 노트 폴더)',
    defaultLocation: candidate,
  })

  // 2) Obsidian 볼트명 자동 탐지 (.obsidian 폴더 기준), 실패 시 직접 입력
  const obsidianRoot = findObsidianRoot(vaultRoot, (p) => fs.existsSync(p))
  let vaultName
  if (obsidianRoot) {
    vaultName = vaultNameFromRoot(obsidianRoot)
  } else {
    vaultName = await promptText({
      message: 'Obsidian 볼트 이름을 입력하세요 (앱에서 노트를 열 때 사용)',
      defaultAnswer: path.basename(vaultRoot),
    })
  }

  // 3) 메일 옵션 (기본 꺼짐)
  let email = { enabled: false, to: '', from: '' }
  const wantEmail = await confirm({
    message: '매일 아침 요약 메일을 받으시겠어요?\n(Mail.app으로 발송 — 나중에 끌 수 있어요)',
  })
  if (wantEmail) {
    const to = await promptText({ message: '메일을 받을 주소를 입력하세요', defaultAnswer: '' })
    email = { enabled: true, to, from: to }
  }

  // 4) 저장
  const cfg = buildConfig({ vaultRoot, vaultName, email })
  const savedPath = saveConfig(cfg)

  // 5) 자동 실행 등록 (선택)
  const wantInstall = await confirm({
    message: '매일 오전 7시에 자동으로 노트를 만들까요?\n(나중에 다시 이 설정을 열어 바꿀 수 있어요)',
    yes: '등록',
    no: '나중에',
  })
  let installMsg = '자동 실행은 등록하지 않았습니다.'
  if (wantInstall) {
    await run('/bin/bash', [path.join(PROJECT_DIR, 'launchd', 'install.sh')])
    installMsg = '매일 오전 7시 자동 실행을 등록했고, 이번 주 노트를 만들었습니다.'
  }

  // 6) 완료 안내
  await notify({
    message: [
      '설정이 완료되었습니다 🎉',
      '',
      `• 노트 폴더: ${vaultRoot}`,
      `• 볼트: ${vaultName}`,
      `• 메일: ${email.enabled ? email.to : '사용 안 함'}`,
      `• ${installMsg}`,
      '',
      `설정 파일: ${savedPath}`,
    ].join('\n'),
  })
}

main().catch(async (e) => {
  if (e.message === 'CANCELLED') {
    process.exit(0) // 사용자가 취소
  }
  try {
    await notify({ message: `설정 중 오류가 발생했습니다:\n${e.message}` })
  } catch {
    // 알림조차 실패하면 stderr로
  }
  process.stderr.write(`[setup] ${e.stack ?? e}\n`)
  process.exit(1)
})
