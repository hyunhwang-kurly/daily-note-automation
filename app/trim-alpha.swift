// PNG의 투명 여백을 잘라내(autocrop) 콘텐츠 bounding box로 크롭.
// 사용: swift app/trim-alpha.swift <in.png> <out.png> [alphaThreshold=10]

import Foundation
import CoreGraphics
import ImageIO
import UniformTypeIdentifiers

func fail(_ m: String) -> Never {
  FileHandle.standardError.write(("trim-alpha: " + m + "\n").data(using: .utf8)!)
  exit(1)
}

let args = CommandLine.arguments
guard args.count >= 3 else { fail("usage: trim-alpha <in.png> <out.png> [threshold]") }
let inPath = args[1], outPath = args[2]
let threshold = UInt8(args.count > 3 ? (Int(args[3]) ?? 10) : 10)

guard let srcRef = CGImageSourceCreateWithURL(URL(fileURLWithPath: inPath) as CFURL, nil),
      let img = CGImageSourceCreateImageAtIndex(srcRef, 0, nil) else { fail("로드 실패: \(inPath)") }

let w = img.width, h = img.height
let cs = CGColorSpace(name: CGColorSpace.sRGB)!
let bytesPerRow = w * 4
var buf = [UInt8](repeating: 0, count: bytesPerRow * h)
guard let ctx = CGContext(data: &buf, width: w, height: h, bitsPerComponent: 8, bytesPerRow: bytesPerRow,
                          space: cs, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)
else { fail("컨텍스트 생성 실패") }
ctx.draw(img, in: CGRect(x: 0, y: 0, width: w, height: h))

var minX = w, minY = h, maxX = -1, maxY = -1
for y in 0..<h {
  for x in 0..<w {
    if buf[y * bytesPerRow + x * 4 + 3] > threshold {
      if x < minX { minX = x }
      if x > maxX { maxX = x }
      if y < minY { minY = y }
      if y > maxY { maxY = y }
    }
  }
}
guard maxX >= minX, maxY >= minY else { fail("불투명 픽셀 없음") }

// CGContext 좌표(하단원점) → CGImage cropping 좌표(상단원점) 변환
let cropRect = CGRect(x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1)
guard let cropped = img.cropping(to: cropRect) else { fail("크롭 실패") }

guard let dest = CGImageDestinationCreateWithURL(URL(fileURLWithPath: outPath) as CFURL,
                                                 UTType.png.identifier as CFString, 1, nil)
else { fail("출력 생성 실패") }
CGImageDestinationAddImage(dest, cropped, nil)
guard CGImageDestinationFinalize(dest) else { fail("저장 실패") }
print("trim-alpha: \(w)x\(h) → \(cropped.width)x\(cropped.height) (\(outPath))")
