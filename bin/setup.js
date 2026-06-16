#!/usr/bin/env node
// 설정 진입점 (메뉴바 "설정 열기"가 호출).
//  - 설정이 없으면: 첫 실행 마법사 (폴더·볼트명·메일·시각·자동실행·로그인)
//  - 설정이 있으면: 항목 선택 편집 메뉴 (원하는 설정만 골라 수정)

import fs from 'node:fs'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { chooseFolder, promptText, confirm, notify, chooseFromList } from '../src/dialog.js'
import { findObsidianRoot, vaultNameFromRoot, defaultVaultCandidates } from '../src/paths.js'
import {
  buildConfig,
  saveConfig,
  loadConfig,
  parseTime,
  parseRoutines,
} from '../src/config-store.js'

const PROJECT_DIR = fileURLToPath(new URL('..', import.meta.url))

function run(cmd, args, env = {}) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { cwd: PROJECT_DIR, env: { ...process.env, ...env } }, (e, out, err) => {
      if (e) reject(new Error(err || e.message))
      else resolve(out)
    })
  })
}

const hhmm = (s) =>
  `${String(s.hour).padStart(2, '0')}:${String(s.minute).padStart(2, '0')}`

// launchd 일일 작업을 (재)등록 — 번들/개발 모두에서 올바른 node·스크립트·시각 주입
async function reinstallSchedule(schedule) {
  await run('/bin/bash', [path.join(PROJECT_DIR, 'launchd', 'install.sh')], {
    NODE_BIN: process.execPath,
    ENTRY: path.join(PROJECT_DIR, 'bin', 'daily-note.js'),
    SCHED_HOUR: String(schedule.hour),
    SCHED_MINUTE: String(schedule.minute),
  })
}

// 볼트 폴더 선택 → {vaultRoot, vaultName}
async function pickVault(defaultLoc) {
  const vaultRoot = await chooseFolder({
    prompt: '데일리 노트를 저장할 폴더를 선택하세요 (Obsidian 볼트 안의 노트 폴더)',
    defaultLocation: defaultLoc,
  })
  const obsidianRoot = findObsidianRoot(vaultRoot, (p) => fs.existsSync(p))
  const vaultName = obsidianRoot
    ? vaultNameFromRoot(obsidianRoot)
    : await promptText({
        message: 'Obsidian 볼트 이름을 입력하세요',
        defaultAnswer: path.basename(vaultRoot),
      })
  return { vaultRoot, vaultName }
}

// ── 첫 실행 마법사 ──
async function firstRunWizard() {
  const candidate = defaultVaultCandidates().find((p) => fs.existsSync(p))
  const { vaultRoot, vaultName } = await pickVault(candidate)

  let email = { enabled: false, to: '', from: '' }
  if (await confirm({ message: '매일 아침 요약 메일을 받으시겠어요?\n(Mail.app으로 발송 — 나중에 끌 수 있어요)' })) {
    const to = await promptText({ message: '메일을 받을 주소를 입력하세요', defaultAnswer: '' })
    email = { enabled: true, to, from: to }
  }

  let schedule = { hour: 7, minute: 0 }
  const parsed = parseTime(
    await promptText({ message: '매일 자동 실행 시각 (HH:MM, 24시간)', defaultAnswer: '07:00' }),
  )
  if (parsed) schedule = parsed

  const cfg = buildConfig({ vaultRoot, vaultName, email, schedule })
  const savedPath = saveConfig(cfg)

  let installMsg = '자동 실행은 등록하지 않았습니다.'
  if (await confirm({ message: `매일 ${hhmm(schedule)}에 자동으로 노트를 만들까요?`, yes: '등록', no: '나중에' })) {
    await reinstallSchedule(schedule)
    installMsg = `매일 ${hhmm(schedule)} 자동 실행 등록됨`
  }

  let loginMsg = ''
  const idx = process.execPath.indexOf('/Contents/Resources/')
  if (idx >= 0) {
    const ronBin = `${process.execPath.slice(0, idx)}/Contents/MacOS/RON`
    if (
      fs.existsSync(ronBin) &&
      (await confirm({ message: '로그인할 때 RON을 자동으로 켜고 메뉴바에 둘까요?', yes: '등록', no: '나중에' }))
    ) {
      await run('/bin/bash', [path.join(PROJECT_DIR, 'launchd', 'install-login.sh')], { RON_BIN: ronBin })
      loginMsg = '\n• 로그인 시 메뉴바 자동 실행 등록됨'
    }
  }

  await notify({
    message: [
      '설정이 완료되었습니다 🎉',
      '',
      `• 노트 폴더: ${vaultRoot}`,
      `• 볼트: ${vaultName}`,
      `• 실행 시각: ${hhmm(schedule)}`,
      `• 메일: ${email.enabled ? email.to : '사용 안 함'}`,
      `• ${installMsg}${loginMsg}`,
      '',
      `설정 파일: ${savedPath}`,
    ].join('\n'),
  })
}

// ── 설정 편집 메뉴 (설정이 이미 있을 때) ──
async function settingsMenu(initial) {
  let cfg = initial
  const labels = {
    folder: '📁 노트 폴더 변경',
    vault: '🏷️  Obsidian 볼트명',
    routines: '🏃 Personal 루틴 (운동/독서 등)',
    time: '⏰ 실행 시각',
    email: '✉️  메일 설정',
    done: '✅ 완료',
  }

  // 무한 루프 방지: 완료/취소까지 반복
  for (;;) {
    const summary =
      `현재: 볼트 ${cfg.obsidian?.vaultName ?? '-'} · ` +
      `${hhmm(cfg.schedule ?? { hour: 7, minute: 0 })} · ` +
      `메일 ${cfg.email?.enabled ? cfg.email.to : '꺼짐'}`
    let choice
    try {
      choice = await chooseFromList({
        prompt: `무엇을 바꿀까요?\n${summary}`,
        items: Object.values(labels),
      })
    } catch (e) {
      if (e.message === 'CANCELLED') return // 닫기
      throw e
    }

    if (choice === labels.done) return

    if (choice === labels.folder) {
      const picked = await pickVault(cfg.vaultRoot)
      cfg.vaultRoot = picked.vaultRoot
      cfg.obsidian = { vaultName: picked.vaultName }
    } else if (choice === labels.vault) {
      cfg.obsidian = {
        vaultName: await promptText({
          message: 'Obsidian 볼트 이름',
          defaultAnswer: cfg.obsidian?.vaultName ?? '',
        }),
      }
    } else if (choice === labels.routines) {
      const input = await promptText({
        message: 'Personal 루틴을 쉼표로 구분해 입력 (예: 운동, 독서)',
        defaultAnswer: (cfg.personalRoutines ?? ['운동', '독서']).join(', '),
      })
      const list = parseRoutines(input)
      if (list.length) cfg.personalRoutines = list
    } else if (choice === labels.time) {
      const parsed = parseTime(
        await promptText({ message: '실행 시각 (HH:MM)', defaultAnswer: hhmm(cfg.schedule ?? { hour: 7, minute: 0 }) }),
      )
      if (parsed) {
        cfg.schedule = parsed
        saveConfig(cfg)
        await reinstallSchedule(parsed) // 시각은 launchd 재등록 필요
        await notify({ message: `실행 시각을 ${hhmm(parsed)}로 변경하고 자동 실행을 갱신했어요.` })
        continue
      }
    } else if (choice === labels.email) {
      const on = await confirm({ message: '요약 메일을 켤까요?', yes: '켜기', no: '끄기' })
      if (on) {
        const to = await promptText({
          message: '메일 받을 주소',
          defaultAnswer: cfg.email?.to ?? '',
        })
        cfg.email = { enabled: true, to, from: to }
      } else {
        cfg.email = { ...(cfg.email ?? {}), enabled: false }
      }
    }

    saveConfig(cfg)
    cfg = loadConfig() ?? cfg
  }
}

async function main() {
  const existing = loadConfig()
  if (existing) await settingsMenu(existing)
  else await firstRunWizard()
}

main().catch(async (e) => {
  if (e.message === 'CANCELLED') process.exit(0)
  try {
    await notify({ message: `설정 중 오류가 발생했습니다:\n${e.message}` })
  } catch {
    // 알림조차 실패하면 stderr로
  }
  process.stderr.write(`[setup] ${e.stack ?? e}\n`)
  process.exit(1)
})
