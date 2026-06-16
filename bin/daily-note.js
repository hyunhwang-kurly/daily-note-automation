#!/usr/bin/env node
// CLI 진입점. launchd가 매일 07:00 실행.
// 사용: node bin/daily-note.js [--date YYYY-MM-DD] [--dry] [--no-mail]

import { run } from '../src/runner.js'
import { config } from '../src/config.js'
import { sendDailyEmail } from '../src/email.js'

function parseArgs(argv) {
  const args = { date: undefined, dry: false, noMail: false }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--date') args.date = argv[++i]
    else if (a === '--dry') args.dry = true
    else if (a === '--no-mail') args.noMail = true
  }
  return args
}

function parseDateArg(s) {
  // 로컬 자정 기준으로 파싱 (UTC 밀림 방지)
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
  if (!m) throw new Error(`잘못된 날짜 형식: ${s} (YYYY-MM-DD 필요)`)
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
}

function log(msg) {
  process.stdout.write(`[daily-note] ${new Date().toISOString()} ${msg}\n`)
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const today = args.date ? parseDateArg(args.date) : new Date()

  if (args.dry) {
    const { notePath } = await import('../src/week.js')
    const p = notePath(today, config.vaultRoot)
    log(`[dry] 대상 파일: ${p.fullPath} (${p.year}년 ${p.month}월 ${p.week}주차)`)
    return
  }

  try {
    const result = await run({ today })
    const what = result.created ? '신규 생성' : result.skipped ? '이미 처리됨(skip)' : '이월 갱신'
    log(`${what} | 이월 ${result.carriedItems.length}건 | ${result.path}`)

    // 메일 발송 (실패해도 파일 생성은 이미 끝났으므로 전체 실패로 보지 않음)
    if (config.email.enabled && !args.noMail) {
      try {
        const subject = await sendDailyEmail(result, {
          to: config.email.to,
          from: config.email.from,
          vaultName: config.obsidian.vaultName,
        })
        log(`메일 발송 완료 → ${config.email.to} | ${subject}`)
      } catch (mailError) {
        process.stderr.write(`[daily-note] 메일 발송 실패(파일은 정상 생성됨): ${mailError?.message ?? mailError}\n`)
      }
    }
  } catch (error) {
    process.stderr.write(`[daily-note] 실패: ${error?.stack ?? error}\n`)
    process.exitCode = 1
  }
}

main()
