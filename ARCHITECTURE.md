# RON — 아키텍처 & 설계 (Architecture)

> 이 문서는 RON의 설계 의도·동작 원리·구현 세부를 담습니다. 설치/사용은 [README.md](README.md)를 참고하세요.

Obsidian 주간 데일리 노트를 **매일 07:00**에 자동으로 생성하고, 어제 끝내지 못한 할일을 오늘 칸으로 이월(carry-over)하는 도구입니다. 매일 아침 직접 복사·붙여넣기 하던 작업을 대체합니다.

> **비개발자라면?** 코드/터미널 없이 **`RON.app`(.dmg)** 으로 설치하세요 → [아래 "비개발자용 앱" 참고](#9-비개발자용-앱-appdmg). (RON = **R**outine **On**)

---

## 1. 요구사항 (확정)

대화를 통해 확정한 요구사항입니다.

### 자동화 대상
- **주간 파일 생성**: 새 주가 시작되면 스켈레톤 파일을 자동 생성하고, 지난주에서 일부 내용을 이월.
- **매일 이월**: 어제 못 끝낸 `- [ ]` 할일을 오늘 요일 칸으로 옮겨 적기 (= 매일 아침 반복하던 복붙).
- **실행 방식**: 매일 **07:00 batch** 자동 실행.

### 이월(carry-over) 정책
| 항목 | 정책 |
| :--- | :--- |
| `이번주 목표` | 새 주차 생성 시 지난주에서 **그대로 복사** |
| `노트`(읽을거리) | 새 주차 생성 시 지난주에서 **그대로 복사** |
| Work 미완료 `- [ ]` | 어제 → 오늘로 **이월**. 완료된 `- [x]`는 이월하지 않음 |
| Personal | **이월하지 않음**. 매일 `운동`·`독서` 체크박스만 새로 시드 |
| 약속 등 비정기 항목 | 자동 관리 대상 아님 (직접 입력) |

### 이월 표시
- 이월된 항목은 앞에 `↪`와 누적 일수를 붙임: `- [ ] ↪ (2d) 배포 요청서 작성`
- 다음 날 또 밀리면 일수가 증가: `(2d) → (3d) → …` (며칠째 밀리는지 자각용)

### 시각/날짜 정책
- 모든 요일 제목에 날짜 자동 부여: `## 화(6/16)`
- 기존에 작성된 과거 파일의 부정확한 날짜/주차는 **수정하지 않음**. 신규 생성분만 정확한 규칙을 따름.

---

## 2. 주차 계산 규칙 (ISO week-of-month)

> 한 주는 **월~일**. 그 주의 **목요일이 속한 달**이 그 주의 소속 월.
> `N주차 = ceil(그 주 목요일의 "일(日)" / 7)`
> (= 1일이 포함된 주가 아니라, 4일 이상 포함된 주가 1주차)

이 규칙은 단순 "월요일 순번"으로 설명되지 않던 과거 실제 파일과 정확히 맞아떨어집니다.

| 달 | 1주차 월요일 | 마지막 주차 | 비고 |
| :--- | :--- | :--- | :--- |
| 2026.01 | 12/29 (목=1/1→1월) | **5주차** (월 1/26) | 실제 파일 5개 일치 |
| 2026.04 | 3/30 (목=4/2→4월) | **5주차** (월 4/27, 목 4/30) | 실제 파일 5개 일치 |
| 2026.05 | **5/4** (4/27주는 목=4/30→4월이라 제외) | 4주차 (월 5/25) | 실제 파일 4개 일치 |

### 월말 / 연말 경계
- 한 주는 정확히 한 파일에만 속함 (목요일 기준이라 중복·누락 없음).
- 예) `6/29~7/5` 주는 목요일 `7/2` → `2026/2026.07/2026년 7월 1주차.md` (**2026.07 폴더 자동 생성**).
- 예) `2025/12/29~2026/1/4` 주는 목요일 `1/1` → `2026/2026.01/2026년 1월 1주차.md` (연·폴더 자동 생성).

### 파일 경로
```
{볼트}/{YYYY}/{YYYY.MM}/{YYYY}년 {M}월 {N}주차.md
예) …/🏃🏻 데일리 노트/2026/2026.06/2026년 6월 3주차.md
```
- 폴더의 월은 두 자리(`2026.06`), 파일명의 월은 한 자리(`6월`) — 기존 작성 방식과 동일.

---

## 3. 동작 흐름

매일 07:00 스크립트가 수행하는 일:

1. **오늘 날짜 → 소속 (년/월/주차) 계산.** 폴더가 없으면 생성.
2. **이번 주 파일이 없으면 생성**: 스켈레톤 + 지난주 `이번주 목표`·`노트` 복사 + 지난주 미완료 Work `[ ]`를 월요일 칸으로 이월.
3. **오늘 칸 처리**: Personal에 `운동`·`독서` 시드, Work에 직전 작성일의 미완료 `[ ]` 이월(`↪ (Nd)`).
4. **멱등성 보장**: 오늘 칸에 `<!-- carried:YYYY-MM-DD -->` 마커를 남겨, 같은 날 여러 번 실행해도 중복 이월 없음.

> 이월 출처는 "오늘 직전의 비어있지 않은 작성일"입니다. 화요일이 비었으면 월요일까지, 월요일이면 지난주 파일까지 거슬러 찾습니다.

### 생성 결과 예시
```markdown
## 월(6/15)
- Personal
	- [ ] 운동
	- [ ] 독서
- Read
- Work
	- [x] 운동했음
	- [ ] 배포 요청서 작성
	- [ ] 코드리뷰 3건
<!-- carried:2026-06-15 -->

## 화(6/16)
- Personal
	- [ ] 운동
	- [ ] 독서
- Read
- Work
	- [ ] ↪ (2d) 배포 요청서 작성
	- [ ] ↪ (2d) 코드리뷰 3건
<!-- carried:2026-06-16 -->
```

---

## 4. 기술 스택

| 구분 | 선택 | 이유 |
| :--- | :--- | :--- |
| 런타임 | **Node.js (ESM)** | 추가 런타임 불필요 |
| 의존성 | **없음 (zero-dependency)** | launchd 환경에서의 안정성·이식성 |
| 테스트 | **`node --test`** (내장) | 별도 프레임워크 불필요, 41개 케이스 |
| 스케줄러 | **launchd** (macOS 네이티브) | 07:00 정시 실행, 잠자기 보정, cron 대비 안정적 |
| 저장소 | **로컬 파일** (iCloud Obsidian 볼트) | iCloud가 자동 동기화 |

> 이월 로직은 마크다운 파싱 기반의 **완전 결정론적** 작업이라 AI/LLM을 쓰지 않습니다. 그래서 오프라인·무료·즉시 동작합니다.

---

## 5. 디렉터리 구조

```
daily-note-automation/
├── bin/
│   ├── daily-note.js     # CLI 진입점 (run / log / open / --dry / --no-mail)
│   └── setup.js          # GUI 설정 마법사 (osascript 대화상자)
├── src/
│   ├── config.js         # 설정 병합 (env > config.json > 기본값)
│   ├── config-store.js   # config.json 읽기/쓰기 + buildConfig/parseTime
│   ├── paths.js          # 앱 데이터 경로, Obsidian 볼트 탐지 (순수)
│   ├── week.js           # ISO 주차 계산 + 파일 경로 (순수)
│   ├── markdown.js       # 섹션 파싱 / 미완료 [ ] 추출 / 이월 일수 누적 (순수)
│   ├── template.js       # 주간 스켈레톤 생성 (순수)
│   ├── worklog.js        # 🤖 Claude Code 작업 로그 삽입 (순수)
│   ├── runner.js         # 오케스트레이션 (파일 보장·시드·이월·로그)
│   ├── email.js          # HTML 메일 생성 + Mail.app 발송
│   ├── obsidian.js       # obsidian:// 딥링크 생성 (순수)
│   ├── dialog.js         # macOS 네이티브 대화상자 래퍼 (osascript)
│   └── send-mail.applescript  # Mail.app HTML 발송
├── test/                 # node:test (week·markdown·runner·email·obsidian·setup·worklog) 41케이스
├── launchd/
│   ├── install.sh        # 일일 실행 등록 (시각 설정 가능, NODE_BIN/ENTRY 오버라이드)
│   └── install-login.sh  # 메뉴바 앱 로그인 자동 실행 등록
├── app/                  # macOS 앱 빌드
│   ├── RONMenuBar.swift  # 메뉴바 앱 (NSStatusItem, LSUIElement)
│   ├── make-icon.swift   # 아이콘 macOS 규격 shaping
│   ├── prep-icon.swift / trim-alpha.swift  # 이미지 전처리 유틸
│   ├── build-app.sh      # .app/.dmg 빌드 (swiftc + node 번들 + 아이콘)
│   └── icon.png          # 원본 아이콘 (1024 full-bleed)
├── claude/               # Claude Code 연동
│   ├── skills/daily-log/SKILL.md  # 세션 요약 기록 스킬
│   ├── hooks/session-end-log.js   # SessionEnd 자동 트레이스 훅
│   └── install.sh        # 스킬/훅 설치
├── assets/logo.png
├── ARCHITECTURE.md · README.md · LICENSE · package.json · .nvmrc
```

---

## 6. 실행 방법

### 설치 (07:00 자동화 등록)
```bash
bash launchd/install.sh
```
- 매일 07:00 실행 등록. 07:00에 맥이 잠들어 있었으면 깨어난 직후 1회 보정 실행.
- 로그: `~/Library/Logs/daily-note.log`
- 해제: `bash launchd/install.sh uninstall`

### 등록 직후 한 번 테스트 실행
```bash
launchctl kickstart -k gui/$(id -u)/com.hyun.daily-note
sleep 2 && cat ~/Library/Logs/daily-note.log
```

### 수동 실행
```bash
node bin/daily-note.js                 # 오늘 날짜로 실행 (+메일 발송)
node bin/daily-note.js --date 2026-06-16   # 특정 날짜로 실행
node bin/daily-note.js --no-mail       # 메일 발송 생략 (파일만)
node bin/daily-note.js --dry           # 실제 쓰기 없이 대상 파일 경로만 출력
```

### 설정 마법사 (비개발자용)
코드/명령어 없이 GUI로 설정합니다. 폴더 선택창·입력창으로 볼트 폴더와 메일(선택)을 받아 `~/Library/Application Support/RON/config.json`에 저장하고, 자동 실행 등록까지 진행합니다.
```bash
npm run setup      # 또는 node bin/setup.js
```
- 설정 우선순위: **환경변수 > config.json(마법사) > 기본값**
- 볼트명은 `.obsidian` 폴더를 자동 탐지해 채웁니다. 메일은 **기본 꺼짐**(마법사에서 켠 사람만).

### 테스트
```bash
node --test        # 또는 npm test
```

---

## 7. 메일 발송 (오늘 칸 + 이월 요약)

launchd 실행 시 **오늘 칸 전체 + 이월 요약**을 HTML 메일로 발송합니다.

- **전송 수단**: macOS **Mail.app** (`osascript`). 자격증명/SMTP 설정 불필요, 기본 계정으로 발송.
- **내용**: 주차·요일 헤더, 이월 항목 목록(없으면 "오늘 이월 없음"), 오늘 칸(체크박스 렌더), **`데일리 노트 확인하기` 버튼**(Obsidian 딥링크).
- **빈 날에도 항상 발송** (변경 없으면 "오늘 이월 없음"으로).
- 메일 발송이 실패해도 **노트 파일 생성은 정상 완료**됩니다 (메일은 best-effort).

### 최초 1회: 자동화 권한 허용 (필수)
Mail.app 제어 권한을 처음 한 번 허용해야 합니다. 터미널에서 직접 실행해 팝업의 **허용**을 누르세요.
```bash
cd ~/Work/daily-note-automation && node bin/daily-note.js
# → "osascript이(가) Mail을 제어하려고 합니다" 팝업 → [허용]
```
한 번 허용하면 이후 launchd 헤드리스 실행도 발송됩니다. (`-1712 AppleEvent timed out` 오류는 이 권한 미허용이 원인)

### Obsidian 딥링크 버튼
`obsidian://open?vault=<볼트>&file=<상대경로>` 형식. 클릭 시 모바일/PC Obsidian 앱에서 해당 노트가 열립니다.

> ⚠️ **Gmail 웹**은 `obsidian://` 같은 커스텀 스킴 링크를 제거할 수 있습니다. 이 경우 버튼이 안 눌리므로, 버튼 아래 **복사용 링크**를 함께 제공합니다. (Apple Mail·일부 모바일 클라이언트는 버튼 정상 동작)

---

## 8. 설정

비개발자는 **메뉴바 ⚡ → 설정**에서 **글래스모피즘 네이티브 폼**으로 모든 설정을 한 번에 변경합니다(노트 폴더+찾아보기·볼트명·Personal 루틴·실행 시각·메일 on/off+주소·로그인 자동 실행). 폼은 SwiftUI로 구현하고 `NSVisualEffectView`(`.popover` material, behind-window 블러) 배경 + `.ultraThinMaterial` 카드로 유리 느낌을 냅니다. 메뉴바 앱은 `.accessory`(Dock 미표시)이며 설정 창을 띄울 때만 `.regular`로 전환해 포그라운드로 가져옵니다. **완료** 시 `~/Library/Application Support/RON/config.json`에 저장하고 launchd 일일 작업을 재등록(+로그인 토글 반영)합니다. 첫 실행(설정 없음) 시 자동으로 이 창이 뜹니다.

> CLI(`npm run setup`)에는 osascript 기반 마법사/`choose from list` 편집 메뉴도 있습니다(개발용 폴백).

개발자는 환경변수 또는 `config.json`으로 조정합니다.

| 항목 | 기본값 | 환경변수 |
| :--- | :--- | :--- |
| 볼트 루트 | `…/🏃🏻 데일리 노트` | `DAILY_NOTE_VAULT` |
| Personal 루틴 | `운동`, `독서` | (코드 수정) |
| 들여쓰기 | 탭(`\t`) | (코드 수정) |
| 메일 수신자 | `hh940630@gmail.com` | `DAILY_NOTE_EMAIL_TO` |
| 메일 발송 on/off | `on` | `DAILY_NOTE_EMAIL=off` |
| Obsidian 볼트명 | `xtring` | `DAILY_NOTE_OBSIDIAN_VAULT` |

```bash
# 임시 경로 + 메일 끄고 테스트
DAILY_NOTE_VAULT=/tmp/vault-test node bin/daily-note.js --date 2026-06-16 --no-mail

# 다른 주소로 발송 테스트
DAILY_NOTE_EMAIL_TO=other@example.com node bin/daily-note.js
```

---

## 9. 비개발자용 앱 RON (.app/.dmg)

**RON = Routine On.** 코드·명령어를 전혀 모르는 사람도 **더블클릭**으로 쓸 수 있게 패키징합니다. Node 런타임이 앱에 포함되어 별도 설치가 필요 없습니다. RON.app은 **macOS 상단 상태표시줄(메뉴바)에 상주하는 Swift 앱**입니다.

### 사용자 입장 (받은 사람)
1. `RON.dmg` 를 열고 **`RON.app` 을 `응용 프로그램`으로 드래그**
2. 첫 실행만 **우클릭 → 열기 → 열기** (미서명 앱 Gatekeeper 경고 1회 허용)
3. 뜨는 설정 마법사에서 **노트 폴더 선택** → (선택) 메일 → **실행 시각(HH:MM)** → 자동 실행 등록 → (선택) **로그인 자동 실행**
4. 끝. 메뉴바에 🗓️ 아이콘이 상주하고, 설정한 시각에 노트가 자동 생성됩니다.

### 메뉴바 (상태표시줄)
- 🗓️ 아이콘 클릭 → **오늘 노트 열기**(Obsidian) / **설정 열기** / **RON 종료**
- **Dock에는 표시 안 됨**(LSUIElement) — 메뉴바 전용
- **로그인 시 자동 실행**: 설정 마법사에서 등록하거나 `launchd/install-login.sh`. 해제는 `... uninstall`
- 실행 시각은 마법사에서 변경(기본 07:00). `~/Library/Application Support/RON/config.json`의 `schedule`에 저장

### 빌드하는 입장 (배포자)
```bash
bash app/build-app.sh              # 로컬 node 복사(현재 arch용, 빠름)
bash app/build-app.sh --download   # nodejs.org에서 arch에 맞는 node 내려받아 번들
# 산출물: dist/RON.app, dist/RON.dmg
```

### 구성/제약
- **미서명 배포**: 무료. 첫 실행 `우클릭 → 열기` 필요. (Apple Developer 인증서가 있으면 `codesign`+공증으로 경고 제거 가능)
- **arch**: 로컬 복사 빌드는 빌드한 맥의 arch 전용(arm64/x64). 폭넓게 배포하려면 `--download` 로 arch별 빌드.
- **메일은 선택**: 마법사에서 켠 사람만 활성. Mail.app이 설정·온라인이어야 발송됩니다.
- launchd 작업은 **앱 번들 내부의 node/스크립트**를 가리키므로, 설치 후 앱을 옮기거나 삭제하면 마법사를 다시 실행하세요.

---

## 10. Claude Code 작업 로그 (`log` + 스킬)

Claude Code에서 한 작업을 **오늘 데일리 노트 Work 칸**(`🤖 Claude Code` 그룹)에 지능형 요약으로 기록합니다.

### 역할 분리
- **CLI `log`** (결정론적): 주어진 마크다운 불릿을 오늘 Work 칸 하위 `🤖 Claude Code`에 타임스탬프와 함께 append. 파일 없으면 생성, 메일은 안 보냄.
  ```bash
  node bin/daily-note.js log "불릿1" "불릿2"     # 인자당 한 줄
  printf '%s\n' "줄1" "줄2" | node bin/daily-note.js log   # stdin
  ```
- **전역 스킬 `daily-log`** (지능형): 현재 세션 맥락을 Claude가 요약해 위 `log`를 호출. `"오늘 정리"`, `"작업 기록해줘"` 등으로 트리거.

### 스킬 설치 (전역) — 스크립트 한 줄
```bash
npm run install-skill                # = bash claude/install.sh (스킬만 등록)
bash claude/install.sh --with-hook   # 스킬 + SessionEnd 자동 트레이스 훅까지 등록
bash claude/install.sh uninstall     # 스킬/훅 제거
```
멱등(중복 등록 안 됨). 이후 Claude Code에서 `/daily-log` 또는 "오늘 작업 정리해줘"로 호출하면 됩니다.
> `--with-hook`은 `~/.claude/settings.json`(에이전트 시작 설정)을 수정하므로 **본인이 직접 실행**하세요.

### 결과 예시
```markdown
- Work
	- 🤖 Claude Code
		- 14:30
			- daily-note에 log 명령 추가
			- worklog.js 순수함수 + 테스트
		- 17:05
			- 버그 수정 1건, PR #12 생성
```

### 세션 종료 자동 트레이스 (SessionEnd 훅)
세션이 끝날 때 **가벼운 결정론적 트레이스**(프로젝트·브랜치·변경수·최근 커밋)를 자동 기록합니다. Claude를 재호출하지 않아 **무료·무재귀**, git 레포에서 끝난 세션만 기록합니다. (지능형 요약은 `/daily-log` 스킬 담당)

`claude/hooks/session-end-log.js` 를 `~/.claude/settings.json`의 `hooks.SessionEnd` 배열에 추가:
```json
{
  "hooks": [
    { "type": "command", "command": "node ~/Work/daily-note-automation/claude/hooks/session-end-log.js" }
  ]
}
```
> 전역 설정 변경이라 `/update-config` 스킬로 추가하거나 직접 편집하세요. 기록 예: `- (auto) daily-note-automation · main · 변경 3개 · 최근: feat: ...`

---

## 11. 사용 기술 (Tech Stack)

코드베이스에서 실제로 사용한 언어·런타임·도구·기법 전체 목록.

### 언어 / 런타임
- **Node.js (ESM)** — CLI·이월 로직·메일·작업 로그. `"type": "module"`, `.nvmrc=22`, `engines >=18`
- **Swift 6 / AppKit + SwiftUI** — 메뉴바 앱(`NSApplication`, `NSStatusItem`, `NSMenu`, `NSImage` SF Symbols, `LSUIElement`) + 설정 폼(SwiftUI `NSHostingView`, `NSVisualEffectView` 글래스, `NSOpenPanel`)
- **AppleScript** — Mail.app HTML 메일 발송(`html content`, `sender`)
- **Bash** — 설치/빌드 스크립트 (`set -euo pipefail`)

### Node 표준 라이브러리만 사용 (외부 의존성 0)
- `node:fs` / `fs/promises` — 파일 I/O
- `node:path`, `node:os` — 경로/홈디렉터리
- `node:child_process` — `execFile`(osascript·open·git), 마법사에서 하위 프로세스
- `node:url` — `fileURLToPath`로 번들 내 리소스 경로 해석
- `node:test` + `node:assert` — 테스트 41케이스 (별도 프레임워크 없음)

### macOS 네이티브 프레임워크 (Swift)
- **CoreGraphics** — 아이콘 shaping(`CGContext`, `CGPath` 둥근 사각형, 클립, 그림자, 픽셀 버퍼 flood-fill)
- **ImageIO** — PNG 디코드/인코드(`CGImageSource`, `CGImageDestination`)
- **UniformTypeIdentifiers** — PNG UTI

### macOS 시스템 도구 / 서비스
- **launchd** — 일일 스케줄(`StartCalendarInterval`) + 로그인 자동 실행(`RunAtLoad`), `launchctl bootstrap/enable`
- **osascript** — 네이티브 대화상자(`choose folder`, `display dialog`) 및 Mail 제어
- **swiftc** — 메뉴바 앱 컴파일
- **sips** / **iconutil** — 아이콘 리사이즈 / `.icns` 생성
- **hdiutil** — `.dmg` 생성, **codesign** — ad-hoc 서명
- **Mail.app** — 메일 발송(선택), **Obsidian URI**(`obsidian://open`) — 노트 열기

### 데이터 / 포맷
- **Markdown** — 노트 본문(정규식 기반 섹션 파서, 체크박스/이월 마커)
- **JSON** — 설정 저장(`~/Library/Application Support/RON/config.json`)
- **HTML/CSS(인라인)** — 요약 메일 템플릿
- **plist** — launchd / 앱 Info.plist

### 개발 / 배포
- **Git + GitHub** + **gh CLI** — 버전 관리, `.dmg` 릴리스 배포
- **nvm** — Node 버전 고정

### 설계 원칙
- **순수 함수 + 의존성 주입(io)** — 코어 로직을 부수효과와 분리해 테스트 가능하게
- **Zero-dependency** — 공급망 리스크·설치 마찰 최소화, 오프라인 동작
- **결정론적 코어** — 이월/주차 계산에 LLM 미사용(스킬만 AI). 재현 가능·무료
- **멱등성** — HTML 주석 마커(`<!-- carried:DATE -->`)로 중복 실행 방지
- **설정 레이어링** — 환경변수 > config.json > 기본값
- **번들 자립성** — Node 런타임을 `.app`에 포함해 사용자 설치 불필요
