// RON 메뉴바 앱 (Routine On). 상태표시줄(⚡) 상주 + 글래스모피즘 설정 창.
// 번들: RON.app/Contents/Resources/{node/bin/node, app/bin/*.js, app/launchd/*.sh}
// 컴파일: swiftc -O RONMenuBar.swift -o RON -framework Cocoa -framework SwiftUI

import Cocoa
import SwiftUI

let accent = Color(red: 91.0 / 255, green: 75.0 / 255, blue: 255.0 / 255)

// MARK: - 설정 모델 + 저장소

struct RONConfig {
  var vaultRoot = ""
  var vaultName = ""
  var routines = "운동, 독서"
  var time = "07:00"
  var emailEnabled = false
  var emailTo = ""
  var loginAtStart = false
}

enum ConfigStore {
  static var dir: URL {
    FileManager.default.homeDirectoryForCurrentUser
      .appendingPathComponent("Library/Application Support/RON")
  }
  static var url: URL { dir.appendingPathComponent("config.json") }
  static var loginPlist: URL {
    FileManager.default.homeDirectoryForCurrentUser
      .appendingPathComponent("Library/LaunchAgents/com.hyun.ron.plist")
  }

  static func parseTime(_ t: String) -> (Int, Int) {
    let parts = t.split(separator: ":")
    let h = parts.count > 0 ? min(23, max(0, Int(parts[0]) ?? 7)) : 7
    let m = parts.count > 1 ? min(59, max(0, Int(parts[1]) ?? 0)) : 0
    return (h, m)
  }

  static func load() -> RONConfig? {
    guard let data = try? Data(contentsOf: url),
          let obj = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
    else { return nil }
    var c = RONConfig()
    c.vaultRoot = obj["vaultRoot"] as? String ?? ""
    if let o = obj["obsidian"] as? [String: Any] { c.vaultName = o["vaultName"] as? String ?? "" }
    if let r = obj["personalRoutines"] as? [String] { c.routines = r.joined(separator: ", ") }
    if let s = obj["schedule"] as? [String: Any] {
      let h = (s["hour"] as? Int) ?? 7, m = (s["minute"] as? Int) ?? 0
      c.time = String(format: "%02d:%02d", h, m)
    }
    if let e = obj["email"] as? [String: Any] {
      c.emailEnabled = (e["enabled"] as? Bool) ?? false
      c.emailTo = e["to"] as? String ?? ""
    }
    c.loginAtStart = FileManager.default.fileExists(atPath: loginPlist.path)
    return c
  }

  static func save(_ c: RONConfig) {
    let (h, m) = parseTime(c.time)
    let routines = c.routines.split(separator: ",")
      .map { $0.trimmingCharacters(in: .whitespaces) }.filter { !$0.isEmpty }
    let dict: [String: Any] = [
      "vaultRoot": c.vaultRoot,
      "obsidian": ["vaultName": c.vaultName],
      "personalRoutines": routines.isEmpty ? ["운동", "독서"] : routines,
      "email": ["enabled": c.emailEnabled, "to": c.emailTo, "from": c.emailTo],
      "schedule": ["hour": h, "minute": m],
    ]
    try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
    if let data = try? JSONSerialization.data(withJSONObject: dict, options: [.prettyPrinted, .sortedKeys]) {
      try? data.write(to: url)
    }
  }

  // 노트 폴더에서 위로 올라가며 .obsidian 탐지 → 볼트명
  static func deriveVaultName(_ folder: String) -> String {
    var dir = URL(fileURLWithPath: folder)
    for _ in 0..<64 {
      if FileManager.default.fileExists(atPath: dir.appendingPathComponent(".obsidian").path) {
        return dir.lastPathComponent
      }
      let parent = dir.deletingLastPathComponent()
      if parent.path == dir.path { break }
      dir = parent
    }
    return URL(fileURLWithPath: folder).lastPathComponent
  }
}

// MARK: - 글래스 배경 (NSVisualEffectView 래핑)

struct VisualEffect: NSViewRepresentable {
  func makeNSView(context: Context) -> NSVisualEffectView {
    let v = NSVisualEffectView()
    v.material = .popover
    v.blendingMode = .behindWindow
    v.state = .active
    return v
  }
  func updateNSView(_ v: NSVisualEffectView, context: Context) {}
}

// MARK: - 설정 폼 (글래스모피즘)

struct SettingsView: View {
  @State private var cfg: RONConfig
  private let onSave: (RONConfig) -> Void
  private let onCancel: () -> Void

  init(config: RONConfig, onSave: @escaping (RONConfig) -> Void, onCancel: @escaping () -> Void) {
    _cfg = State(initialValue: config)
    self.onSave = onSave
    self.onCancel = onCancel
  }

  private func row<V: View>(_ title: String, _ field: V) -> some View {
    HStack(alignment: .firstTextBaseline, spacing: 12) {
      Text(title)
        .font(.system(size: 12, weight: .medium))
        .foregroundStyle(.secondary)
        .frame(width: 88, alignment: .trailing)
      field
    }
  }

  var body: some View {
    ZStack(alignment: .top) {
      VisualEffect().ignoresSafeArea()
      content
    }
    .frame(width: 470)
    .frame(maxHeight: .infinity)
  }

  private var content: some View {
    VStack(alignment: .leading, spacing: 18) {
      // 헤더
      HStack(spacing: 12) {
        Image(systemName: "bolt.fill")
          .font(.system(size: 22, weight: .bold))
          .foregroundStyle(accent)
          .shadow(color: accent.opacity(0.4), radius: 6)
        VStack(alignment: .leading, spacing: 1) {
          Text("RON 설정").font(.headline)
          Text("Routine On").font(.caption).foregroundStyle(.secondary)
        }
      }

      // 카드 (frosted glass)
      VStack(spacing: 14) {
        row("노트 폴더", HStack(spacing: 8) {
          TextField("Obsidian 볼트 안의 노트 폴더", text: $cfg.vaultRoot)
            .textFieldStyle(.roundedBorder)
          Button("찾아보기", action: browse)
        })
        row("볼트명", TextField("Obsidian 볼트 이름", text: $cfg.vaultName).textFieldStyle(.roundedBorder))
        row("Personal 루틴", TextField("운동, 독서", text: $cfg.routines).textFieldStyle(.roundedBorder))
        row("실행 시각", HStack {
          TextField("07:00", text: $cfg.time).textFieldStyle(.roundedBorder).frame(width: 90)
          Text("HH:MM").font(.caption2).foregroundStyle(.tertiary)
          Spacer()
        })
        Divider().opacity(0.35)
        row("요약 메일", HStack { Toggle("", isOn: $cfg.emailEnabled).labelsHidden().toggleStyle(.switch); Spacer() })
        if cfg.emailEnabled {
          row("메일 주소", TextField("you@example.com", text: $cfg.emailTo).textFieldStyle(.roundedBorder))
        }
        row("로그인 실행", HStack {
          Toggle("", isOn: $cfg.loginAtStart).labelsHidden().toggleStyle(.switch)
          Text("로그인 시 메뉴바에 자동 상주").font(.caption2).foregroundStyle(.tertiary)
          Spacer()
        })
      }
      .padding(18)
      .background(
        RoundedRectangle(cornerRadius: 18, style: .continuous).fill(.ultraThinMaterial)
      )
      .overlay(
        RoundedRectangle(cornerRadius: 18, style: .continuous)
          .strokeBorder(Color.white.opacity(0.15), lineWidth: 1)
      )

      Spacer(minLength: 12) // 버튼을 창 최하단으로

      // 버튼 (크게, 최하단)
      HStack(spacing: 12) {
        Spacer()
        Button(action: onCancel) {
          Text("취소").frame(minWidth: 76).padding(.vertical, 3)
        }
        .keyboardShortcut(.cancelAction)
        .controlSize(.large)
        Button(action: { onSave(cfg) }) {
          Text("완료").frame(minWidth: 96).padding(.vertical, 3)
        }
        .keyboardShortcut(.defaultAction)
        .buttonStyle(.borderedProminent)
        .tint(accent)
        .controlSize(.large)
      }
    }
    .padding(22)
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
  }

  private func browse() {
    let panel = NSOpenPanel()
    panel.canChooseDirectories = true
    panel.canChooseFiles = false
    panel.allowsMultipleSelection = false
    panel.prompt = "선택"
    panel.message = "데일리 노트를 저장할 폴더를 선택하세요"
    if panel.runModal() == .OK, let url = panel.url {
      cfg.vaultRoot = url.path
      if cfg.vaultName.isEmpty { cfg.vaultName = ConfigStore.deriveVaultName(url.path) }
    }
  }
}

// MARK: - 앱 델리게이트

final class AppDelegate: NSObject, NSApplicationDelegate {
  var statusItem: NSStatusItem!
  var settingsWindow: NSWindow?

  func applicationDidFinishLaunching(_ notification: Notification) {
    statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
    if let button = statusItem.button {
      if let img = NSImage(systemSymbolName: "bolt.fill", accessibilityDescription: "RON") {
        img.isTemplate = true
        button.image = img
      } else {
        button.title = "RON"
      }
    }
    let menu = NSMenu()
    menu.addItem(withTitle: "오늘 노트 열기", action: #selector(openToday), keyEquivalent: "o")
    menu.addItem(withTitle: "설정", action: #selector(openSettings), keyEquivalent: ",")
    menu.addItem(.separator())
    menu.addItem(withTitle: "RON 종료", action: #selector(quit), keyEquivalent: "q")
    for item in menu.items { item.target = self }
    statusItem.menu = menu

    if ConfigStore.load() == nil {
      DispatchQueue.main.async { [weak self] in self?.openSettings() } // 첫 실행
    }
  }

  private func resources() -> String { Bundle.main.resourcePath ?? "" }

  private func runNode(_ scriptName: String, _ args: [String] = []) {
    let task = Process()
    task.executableURL = URL(fileURLWithPath: resources() + "/node/bin/node")
    task.arguments = [resources() + "/app/bin/" + scriptName] + args
    try? task.run()
  }

  private func runBash(_ script: String, args: [String] = [], env: [String: String] = [:]) {
    let task = Process()
    task.executableURL = URL(fileURLWithPath: "/bin/bash")
    task.arguments = [script] + args
    var merged = ProcessInfo.processInfo.environment
    for (k, v) in env { merged[k] = v }
    task.environment = merged
    try? task.run()
  }

  @objc private func openToday() { runNode("daily-note.js", ["open"]) }

  @objc private func openSettings() {
    NSApp.setActivationPolicy(.regular) // 창을 앞으로 가져오려면 일시적으로 일반 앱처럼
    if let w = settingsWindow {
      NSApp.activate(ignoringOtherApps: true)
      w.makeKeyAndOrderFront(nil)
      return
    }
    let cfg = ConfigStore.load() ?? RONConfig()
    let view = SettingsView(
      config: cfg,
      onSave: { [weak self] c in self?.applySettings(c); self?.closeSettings() },
      onCancel: { [weak self] in self?.closeSettings() }
    )

    let host = NSHostingView(rootView: view)
    let window = NSWindow(
      contentRect: NSRect(x: 0, y: 0, width: 470, height: 540),
      styleMask: [.titled, .closable, .fullSizeContentView],
      backing: .buffered, defer: false
    )
    window.titlebarAppearsTransparent = true
    window.titleVisibility = .hidden
    window.isMovableByWindowBackground = true
    window.isOpaque = false
    window.backgroundColor = .clear
    window.isReleasedWhenClosed = false
    window.contentView = host
    window.center()
    settingsWindow = window

    NSApp.activate(ignoringOtherApps: true)
    window.makeKeyAndOrderFront(nil)
  }

  private func closeSettings() {
    settingsWindow?.close()
    settingsWindow = nil
    NSApp.setActivationPolicy(.accessory) // 다시 메뉴바 전용으로
  }

  private func applySettings(_ c: RONConfig) {
    ConfigStore.save(c)
    let (h, m) = ConfigStore.parseTime(c.time)
    // 일일 launchd 재등록 (시각 반영 + 이번 주 노트 생성)
    runBash(resources() + "/app/launchd/install.sh", env: [
      "NODE_BIN": resources() + "/node/bin/node",
      "ENTRY": resources() + "/app/bin/daily-note.js",
      "SCHED_HOUR": String(h),
      "SCHED_MINUTE": String(m),
    ])
    // 로그인 자동 실행 토글
    let ronBin = Bundle.main.executablePath ?? ""
    let loginInstalled = FileManager.default.fileExists(atPath: ConfigStore.loginPlist.path)
    if c.loginAtStart && !ronBin.isEmpty {
      runBash(resources() + "/app/launchd/install-login.sh", env: ["RON_BIN": ronBin])
    } else if !c.loginAtStart && loginInstalled {
      runBash(resources() + "/app/launchd/install-login.sh", args: ["uninstall"])
    }
  }

  @objc private func quit() { NSApp.terminate(nil) }
}

let app = NSApplication.shared
app.setActivationPolicy(.accessory)
let delegate = AppDelegate()
app.delegate = delegate
app.run()
