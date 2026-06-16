<div align="center">

<img src="assets/logo.png" width="140" alt="RON logo" />

# RON — Routine On

**Obsidian 주간 데일리 노트 자동화.** 매일 아침 같은 템플릿을 손으로 복사·붙여넣기 하던 일을 없앱니다.

[![license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
![node](https://img.shields.io/badge/node-%E2%89%A518-43853d.svg)
![platform](https://img.shields.io/badge/platform-macOS-lightgrey.svg)
![tests](https://img.shields.io/badge/tests-41%20passing-brightgreen.svg)
![deps](https://img.shields.io/badge/dependencies-zero-success.svg)

</div>

---

## RON이 하는 일

매일 정해진 시각에 이번 주 노트를 만들고, 어제 끝내지 못한 할일을 오늘 칸으로 옮겨 적고, 원하면 요약 메일까지 보냅니다. macOS 메뉴바에 상주하는 작은 앱(🗓️/⚡)으로, 비개발자도 `.dmg` 하나로 설치할 수 있습니다.

## ✨ 기능

| | 기능 | 설명 |
| :-- | :-- | :-- |
| 📅 | **주간 노트 자동 생성** | ISO 주차 규칙으로 `YYYY/YYYY.MM/YYYY년 M월 N주차.md`를 폴더까지 자동 생성 |
| ↪ | **미완료 할일 이월** | 어제의 미완료 `- [ ]`를 오늘 Work 칸으로. 며칠째 밀렸는지 `↪ (Nd)` 표시 |
| ⏰ | **매일 자동 실행** | launchd로 지정 시각(기본 07:00) 실행. 잠자기였으면 깨어난 직후 보정 |
| 📧 | **요약 메일 (선택)** | 오늘 칸 + 이월 요약을 HTML 메일로. `데일리 노트 확인하기` 버튼(Obsidian 딥링크) |
| 🤖 | **Claude Code 작업 로그** | 세션 작업을 요약해 노트에 기록하는 스킬 + 세션 종료 자동 트레이스 훅 |
| ⚡ | **메뉴바 앱** | 상단 상태표시줄 상주(Dock 미표시). 오늘 노트 열기 · 설정 · 종료. 로그인 자동 실행 |
| 🧙 | **GUI 설정 마법사** | 코드/터미널 없이 폴더 선택·시각·메일을 클릭으로 설정 |
| 🧱 | **Zero-dependency** | 외부 npm 의존성 0. 이월 로직은 결정론적(LLM 미사용)이라 오프라인·무료 |

## 🚀 빠른 시작

### 비개발자 — 앱으로 (`.dmg`)
1. `RON.dmg` 를 열어 **`RON.app` 을 응용 프로그램으로 드래그**
2. 첫 실행만 **우클릭 → 열기 → 열기** (미서명 앱 1회 허용)
3. 설정 마법사: **노트 폴더 선택 → 실행 시각 → (선택) 메일 → 자동 실행 → (선택) 로그인 자동 실행**
4. 끝. 메뉴바에 ⚡ 아이콘이 상주하고, 설정한 시각에 노트가 자동 생성됩니다.

### 개발자 — 소스로
```bash
git clone https://github.com/hyunhwang-kurly/daily-note-automation.git
cd daily-note-automation
nvm use                       # Node 22 (.nvmrc)
node --test                   # 테스트 41개

node bin/daily-note.js --dry  # 오늘 대상 파일 경로 확인
node bin/daily-note.js        # 오늘 노트 생성/이월 (+메일)
bash launchd/install.sh       # 매일 자동 실행 등록
```

## 📖 사용법

```bash
node bin/daily-note.js                  # 오늘 생성/이월 (+메일)
node bin/daily-note.js --date 2026-06-16  # 특정 날짜
node bin/daily-note.js --no-mail        # 메일 생략
node bin/daily-note.js --dry            # 대상 경로만 출력
node bin/daily-note.js open             # 오늘 노트를 Obsidian으로 열기
node bin/daily-note.js log "한 일1" "한 일2"   # 오늘 Work 칸에 작업 로그 추가
```

launchd 등록/해제:
```bash
bash launchd/install.sh            # 매일 지정 시각 실행
bash launchd/install.sh uninstall
bash launchd/install-login.sh      # 메뉴바 앱 로그인 자동 실행
```

## ⚙️ 설정

설정 우선순위: **환경변수 > `~/Library/Application Support/RON/config.json`(마법사 생성) > 기본값**

| 항목 | 기본값 | 환경변수 |
| :-- | :-- | :-- |
| 노트 볼트 루트 | iCloud Obsidian 경로 | `DAILY_NOTE_VAULT` |
| 실행 시각 | `07:00` | `DAILY_NOTE_HOUR` / `DAILY_NOTE_MINUTE` |
| 메일 수신자 | (마법사 입력) | `DAILY_NOTE_EMAIL_TO` |
| 메일 on/off | `on` | `DAILY_NOTE_EMAIL=off` |
| Obsidian 볼트명 | `.obsidian` 자동 탐지 | `DAILY_NOTE_OBSIDIAN_VAULT` |
| Personal 루틴 | `운동`, `독서` | (config) |

## 🧩 주차 계산 규칙 (ISO week-of-month)

> 한 주는 **월~일**, 그 주의 **목요일이 속한 달**이 소속 월.
> `N주차 = ceil(목요일의 일(日) / 7)` — 1일이 포함된 주가 아니라 4일 이상 포함된 주가 1주차.

한 주는 정확히 한 파일에만 속해 월말·연말 경계에서 중복/누락이 없습니다. 예) `6/29~7/5`(목 7/2) → `2026.07/2026년 7월 1주차.md`(폴더 자동 생성).

### 생성 예시
```markdown
## 화(6/16)
- Personal
	- [ ] 운동
	- [ ] 독서
- Read
- Work
	- [ ] ↪ (2d) 배포 요청서 작성
	- 🤖 Claude Code
		- 14:30
			- daily-note에 log 명령 추가
```

## 🤖 Claude Code 연동

세션에서 한 작업을 오늘 노트에 기록합니다.

```bash
bash claude/install.sh               # /daily-log 스킬 등록
bash claude/install.sh --with-hook   # + 세션 종료 자동 트레이스 훅
```
- **스킬 `/daily-log`** — Claude가 세션 작업을 요약해 노트에 기록 (지능형)
- **SessionEnd 훅** — 세션 종료 시 `프로젝트·브랜치·변경수·최근 커밋` 한 줄 자동 기록 (무료·무재귀)

## 🏗️ 빌드 (`.app` / `.dmg`)

```bash
bash app/build-app.sh              # 현재 arch용 (로컬 node 복사)
bash app/build-app.sh --download   # arch별 node 내려받아 번들
# 산출물: dist/RON.app, dist/RON.dmg
```
- RON.app = **Swift 메뉴바 앱**(LSUIElement). Node 런타임 번들로 별도 설치 불필요.
- 아이콘: `app/icon.png`(1024 정사각, full-bleed) → `make-icon.swift`가 macOS 규격(둥근 사각형+투명 여백+그림자)으로 자동 변환.
- 미서명 배포(무료) — 첫 실행 우클릭→열기. Apple Developer 인증서가 있으면 `codesign`+공증으로 경고 제거.

## 🗂️ 구조

```
daily-note-automation/
├── bin/            # CLI 진입점 (daily-note.js, setup.js)
├── src/            # 코어 로직 (week·markdown·template·runner·email·worklog·config…)
├── test/           # node:test (41 케이스)
├── launchd/        # 자동 실행 등록 스크립트 (install.sh, install-login.sh)
├── app/            # macOS 앱 빌드 (RONMenuBar.swift, make-icon.swift, build-app.sh, icon.png)
├── claude/         # Claude Code 스킬/훅 + install.sh
└── assets/         # 로고 등
```

## 🛠️ 기술 스택

Node.js (ESM) · 내장 `node:test` · macOS launchd · Swift/AppKit(메뉴바 앱·아이콘) · 외부 의존성 0

## 🤝 Contributing

이슈/PR 환영합니다. 변경 전 `node --test`로 테스트가 통과하는지 확인해주세요. 코어 로직은 순수 함수로 분리해 테스트 가능하게 유지합니다. 설계 의도·동작 원리·구현 세부는 **[ARCHITECTURE.md](ARCHITECTURE.md)** 를 참고하세요.

## 📄 License

[MIT](LICENSE) © hyun hwang
