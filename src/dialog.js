// macOS 네이티브 대화상자 래퍼 (osascript). 비개발자용 설정 마법사 입력 수단.

import { execFile } from 'node:child_process'

function runOsa(script) {
  return new Promise((resolve, reject) => {
    execFile('/usr/bin/osascript', ['-e', script], (error, stdout, stderr) => {
      if (error) {
        // 사용자가 취소(-128)한 경우 구분
        if (/-128/.test(stderr) || /User canceled/i.test(stderr)) {
          reject(new Error('CANCELLED'))
          return
        }
        reject(new Error(stderr || error.message))
        return
      }
      resolve(stdout.trimEnd())
    })
  })
}

function osaQuote(s) {
  // AppleScript 문자열 리터럴 escape
  return `"${String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

// 폴더 선택 → POSIX 경로. 취소 시 throw('CANCELLED')
export async function chooseFolder({ prompt, defaultLocation } = {}) {
  const loc = defaultLocation ? ` default location (POSIX file ${osaQuote(defaultLocation)})` : ''
  const out = await runOsa(`POSIX path of (choose folder with prompt ${osaQuote(prompt)}${loc})`)
  return out
}

// 텍스트 입력 → 문자열
export async function promptText({ message, defaultAnswer = '' } = {}) {
  const script = `set r to display dialog ${osaQuote(message)} default answer ${osaQuote(
    defaultAnswer,
  )} buttons {"취소", "확인"} default button "확인"
text returned of r`
  return runOsa(script)
}

// 예/아니오 선택 → boolean (yes 버튼이 눌리면 true)
export async function confirm({ message, yes = '예', no = '아니오' } = {}) {
  const script = `set r to display dialog ${osaQuote(message)} buttons {${osaQuote(no)}, ${osaQuote(
    yes,
  )}} default button ${osaQuote(yes)}
button returned of r`
  const out = await runOsa(script)
  return out === yes
}

// 목록에서 하나 선택 → 선택 항목 문자열. 취소 시 throw('CANCELLED')
export async function chooseFromList({ prompt, items = [] } = {}) {
  const list = items.map(osaQuote).join(', ')
  const script = `set r to choose from list {${list}} with prompt ${osaQuote(
    prompt,
  )} OK button name "선택" cancel button name "닫기"
if r is false then
\terror "CANCELLED" number -128
else
\treturn item 1 of r
end if`
  return runOsa(script)
}

// 안내 알림
export async function notify({ message, title = 'RON' } = {}) {
  return runOsa(
    `display dialog ${osaQuote(message)} with title ${osaQuote(title)} buttons {"확인"} default button "확인"`,
  )
}
