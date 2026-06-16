// RON 메뉴바 앱 (Routine On). 상단 상태표시줄에 상주하며 메뉴 제공.
// 번들 구조: RON.app/Contents/Resources/{node/bin/node, app/bin/*.js}
// 컴파일: swiftc -O app/RONMenuBar.swift -o RON.app/Contents/MacOS/RON -framework Cocoa

import Cocoa

final class AppDelegate: NSObject, NSApplicationDelegate {
  var statusItem: NSStatusItem!

  func applicationDidFinishLaunching(_ notification: Notification) {
    statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
    if let button = statusItem.button {
      if let img = NSImage(systemSymbolName: "calendar.badge.clock", accessibilityDescription: "RON") {
        img.isTemplate = true
        button.image = img
      } else {
        button.title = "RON"
      }
    }

    let menu = NSMenu()
    menu.addItem(withTitle: "오늘 노트 열기", action: #selector(openToday), keyEquivalent: "o")
    menu.addItem(withTitle: "설정 열기", action: #selector(openSettings), keyEquivalent: ",")
    menu.addItem(.separator())
    menu.addItem(withTitle: "RON 종료", action: #selector(quit), keyEquivalent: "q")
    for item in menu.items { item.target = self }
    statusItem.menu = menu

    // 첫 실행: 설정이 없으면 설정 마법사 자동 실행
    if !configExists() {
      openSettings()
    }
  }

  private func resources() -> String { Bundle.main.resourcePath ?? "" }
  private func nodeBin() -> String { resources() + "/node/bin/node" }
  private func script(_ name: String) -> String { resources() + "/app/bin/" + name }

  private func configExists() -> Bool {
    let p = (NSHomeDirectory() as NSString)
      .appendingPathComponent("Library/Application Support/RON/config.json")
    return FileManager.default.fileExists(atPath: p)
  }

  private func runNode(_ scriptName: String, _ args: [String] = []) {
    let task = Process()
    task.executableURL = URL(fileURLWithPath: nodeBin())
    task.arguments = [script(scriptName)] + args
    do { try task.run() } catch {
      let alert = NSAlert()
      alert.messageText = "실행 실패"
      alert.informativeText = "\(scriptName): \(error.localizedDescription)"
      alert.runModal()
    }
  }

  @objc private func openToday() { runNode("daily-note.js", ["open"]) }
  @objc private func openSettings() { runNode("setup.js") }
  @objc private func quit() { NSApp.terminate(nil) }
}

let app = NSApplication.shared
app.setActivationPolicy(.accessory) // Dock 아이콘 없이 메뉴바 전용
let delegate = AppDelegate()
app.delegate = delegate
app.run()
