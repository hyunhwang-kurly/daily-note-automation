// 구워진 체커보드(투명 표시용 회색/흰 격자) 배경을 제거.
// 테두리에서 flood-fill 로 "밝은 무채색" 픽셀만 투명화 → 콘텐츠 안쪽 흰색은 보존.
// 이후 남은 콘텐츠 bounding box 로 크롭. 사용: swift app/prep-icon.swift <in.png> <out.png>

import Foundation
import CoreGraphics
import ImageIO
import UniformTypeIdentifiers

func fail(_ m: String) -> Never {
  FileHandle.standardError.write(("prep-icon: " + m + "\n").data(using: .utf8)!)
  exit(1)
}

let args = CommandLine.arguments
guard args.count >= 3 else { fail("usage: prep-icon <in.png> <out.png>") }

guard let srcRef = CGImageSourceCreateWithURL(URL(fileURLWithPath: args[1]) as CFURL, nil),
      let img = CGImageSourceCreateImageAtIndex(srcRef, 0, nil) else { fail("로드 실패") }

let w = img.width, h = img.height, bpr = w * 4
var buf = [UInt8](repeating: 0, count: bpr * h)
let cs = CGColorSpace(name: CGColorSpace.sRGB)!
guard let ctx = CGContext(data: &buf, width: w, height: h, bitsPerComponent: 8, bytesPerRow: bpr,
                          space: cs, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)
else { fail("컨텍스트 실패") }
ctx.draw(img, in: CGRect(x: 0, y: 0, width: w, height: h))

// "체커보드 배경" 판정: 밝고 무채색
@inline(__always) func isBg(_ i: Int) -> Bool {
  let r = Int(buf[i]), g = Int(buf[i + 1]), b = Int(buf[i + 2])
  let mn = min(r, min(g, b)), mx = max(r, max(g, b))
  return mn > 150 && (mx - mn) <= 30
}

// 테두리에서 flood-fill
var stack = [Int]()
@inline(__always) func push(_ x: Int, _ y: Int) {
  let i = (y * w + x) * 4
  if buf[i + 3] != 0 && isBg(i) { buf[i + 3] = 0; stack.append(y * w + x) }
}
for x in 0..<w { push(x, 0); push(x, h - 1) }
for y in 0..<h { push(0, y); push(w - 1, y) }
while let p = stack.popLast() {
  let x = p % w, y = p / w
  if x > 0 { push(x - 1, y) }
  if x < w - 1 { push(x + 1, y) }
  if y > 0 { push(x, y - 1) }
  if y < h - 1 { push(x, y + 1) }
}

// 투명화 후 남은 불투명 영역 bbox
var minX = w, minY = h, maxX = -1, maxY = -1
for y in 0..<h {
  for x in 0..<w where buf[(y * w + x) * 4 + 3] > 8 {
    if x < minX { minX = x }; if x > maxX { maxX = x }
    if y < minY { minY = y }; if y > maxY { maxY = y }
  }
}
guard maxX >= minX else { fail("콘텐츠 없음") }

guard let masked = ctx.makeImage(),
      let cropped = masked.cropping(to: CGRect(x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1))
else { fail("크롭 실패") }

guard let dest = CGImageDestinationCreateWithURL(URL(fileURLWithPath: args[2]) as CFURL,
                                                 UTType.png.identifier as CFString, 1, nil)
else { fail("출력 실패") }
CGImageDestinationAddImage(dest, cropped, nil)
guard CGImageDestinationFinalize(dest) else { fail("저장 실패") }
print("prep-icon: \(w)x\(h) → \(cropped.width)x\(cropped.height) 배경 제거+크롭 완료")
