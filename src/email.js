// 오늘 요약 메일 생성(텍스트+HTML) + Mail.app(osascript) 발송.

import { execFile } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { obsidianUri, obsidianWebUri } from './obsidian.js'

const SCRIPT_PATH = fileURLToPath(new URL('./send-mail.applescript', import.meta.url))
const DIVIDER = '──────────────────────────────'
const ACCENT = '#5b4bff'

function escapeHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function statusLabel(summary) {
  if (summary.created) return '신규 생성'
  if (summary.skipped) return '이미 처리됨'
  return '이월 갱신'
}

// 오늘 칸 텍스트(마크다운) → HTML 본문 (체크박스/들여쓰기 렌더)
function renderTodayHtml(text) {
  const rows = []
  for (const raw of text.split('\n')) {
    if (/^##\s/.test(raw)) continue // 상단 요일 헤딩은 메일 헤더가 대신함
    const level = (raw.match(/^\t*/)?.[0].length) ?? 0
    const line = raw.replace(/^\t+/, '').trim()
    if (line === '') continue
    const pad = `padding-left:${level * 18}px;`

    const unchecked = /^-\s+\[ \]\s+(.*)$/.exec(line)
    const checked = /^-\s+\[[xX]\]\s+(.*)$/.exec(line)
    const bullet = /^-\s+(.*)$/.exec(line)

    if (checked) {
      rows.push(
        `<div style="${pad}margin:2px 0;color:#9aa0a6"><span>✅</span> <s>${escapeHtml(checked[1])}</s></div>`,
      )
    } else if (unchecked) {
      const carried = unchecked[1].startsWith('↪')
      const color = carried ? ACCENT : '#1a1a1a'
      rows.push(
        `<div style="${pad}margin:2px 0;color:${color}"><span style="color:#c0c0c0">☐</span> ${escapeHtml(unchecked[1])}</div>`,
      )
    } else if (level === 0 && ['Personal', 'Read', 'Work'].includes(bullet?.[1])) {
      rows.push(
        `<div style="margin:10px 0 2px;font-weight:700;color:#444;font-size:13px">${escapeHtml(bullet[1])}</div>`,
      )
    } else if (bullet) {
      rows.push(`<div style="${pad}margin:2px 0">• ${escapeHtml(bullet[1])}</div>`)
    }
  }
  return rows.join('\n')
}

// summary → { subject, text, html } (순수 함수)
export function buildEmail(summary, { vaultName, webBase } = {}) {
  const vault = vaultName ?? 'xtring'
  const n = summary.carriedItems.length
  const status = statusLabel(summary)
  const subject = `[데일리노트] ${summary.weekLabel} ${summary.dayLabel} · 이월 ${n}건`
  // obsidian:// 딥링크는 Gmail 등 웹메일에서 클릭이 막히므로,
  // 버튼은 https 리다이렉트(webBase)를 거치게 한다. webBase 없으면 직접 딥링크로 폴백.
  const deepLink = obsidianUri(summary.path, vault)
  const uri = webBase ? obsidianWebUri(summary.path, vault, webBase) : deepLink

  // ── 텍스트 본문 (폴백) ──
  const carryText = n === 0 ? '  오늘 이월 없음' : summary.carriedItems.map((t) => `  - ${t}`).join('\n')
  const text = [
    `📅 ${summary.weekLabel} · ${summary.dayLabel}  (${status})`,
    '',
    `📨 이월 ${n}건`,
    carryText,
    '',
    DIVIDER,
    summary.todaySectionText,
    DIVIDER,
    '',
    `데일리 노트 확인하기: ${uri}`,
    `📄 ${summary.path}`,
  ].join('\n')

  // ── HTML 본문 ──
  const carryHtml =
    n === 0
      ? `<div style="color:#9aa0a6">오늘 이월 없음 🎉</div>`
      : `<ul style="margin:6px 0;padding-left:20px">${summary.carriedItems
          .map((t) => `<li style="margin:3px 0;color:${ACCENT}">${escapeHtml(t)}</li>`)
          .join('')}</ul>`

  const html = `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#f4f5f7">
  <div style="max-width:600px;margin:0 auto;padding:16px;font-family:-apple-system,BlinkMacSystemFont,'Apple SD Gothic Neo','Segoe UI',Roboto,sans-serif;color:#1a1a1a">
    <div style="background:${ACCENT};border-radius:12px 12px 0 0;padding:20px 24px;color:#fff">
      <div style="font-size:13px;opacity:.85">${escapeHtml(summary.weekLabel)}</div>
      <div style="font-size:22px;font-weight:700;margin-top:2px">📅 ${escapeHtml(summary.dayLabel)}</div>
      <span style="display:inline-block;margin-top:8px;font-size:12px;background:rgba(255,255,255,.2);padding:3px 10px;border-radius:999px">${escapeHtml(status)}</span>
    </div>
    <div style="background:#fff;border-radius:0 0 12px 12px;padding:20px 24px;box-shadow:0 1px 4px rgba(0,0,0,.06)">
      <div style="font-size:14px;font-weight:700;color:#444">📨 이월 ${n}건</div>
      ${carryHtml}
      <hr style="border:none;border-top:1px solid #eee;margin:18px 0">
      <div style="font-size:14px;font-weight:700;color:#444;margin-bottom:8px">📝 오늘 칸</div>
      <div style="font-size:14px;line-height:1.55">${renderTodayHtml(summary.todaySectionText)}</div>
      <hr style="border:none;border-top:1px solid #eee;margin:18px 0">
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:4px auto"><tr>
        <td style="background:${ACCENT};border-radius:10px">
          <a href="${escapeHtml(uri)}" style="display:inline-block;padding:13px 28px;color:#fff;font-weight:700;font-size:15px;text-decoration:none">📓 데일리 노트 확인하기 →</a>
        </td>
      </tr></table>
      <div style="font-size:11px;color:#999;margin-top:10px;text-align:center">버튼이 안 열리면 아래 링크를 복사해 앱/브라우저에 붙여넣으세요</div>
      <div style="font-size:11px;color:#b0b0b0;margin-top:4px;text-align:center;word-break:break-all">${escapeHtml(uri)}</div>
      <div style="font-size:11px;color:#cfcfcf;margin-top:14px;word-break:break-all">${escapeHtml(summary.path)}</div>
    </div>
  </div>
</body></html>`

  return { subject, text, html }
}

// Mail.app으로 발송. 성공 시 true. 실패는 throw.
export function sendViaMailApp({ to, from, subject, text, html, scriptPath = SCRIPT_PATH }) {
  return new Promise((resolve, reject) => {
    execFile(
      '/usr/bin/osascript',
      [scriptPath, subject, to, text, html, from ?? to],
      (error, _stdout, stderr) => {
        if (error) {
          reject(new Error(`Mail.app 발송 실패: ${stderr || error.message}`))
          return
        }
        resolve(true)
      },
    )
  })
}

// summary 기반으로 메일 발송 (고수준 진입점)
export async function sendDailyEmail(summary, { to, from, vaultName, webBase }) {
  const { subject, text, html } = buildEmail(summary, { vaultName, webBase })
  await sendViaMailApp({ to, from, subject, text, html })
  return subject
}
