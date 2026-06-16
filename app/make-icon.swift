// 정사각 원본 PNG → macOS 앱 아이콘 규격(둥근 사각형 + 투명 여백 + 부드러운 그림자)으로 변환.
// 사용: swift app/make-icon.swift <input.png> <output.png>
// Apple macOS 아이콘 그리드: 1024 캔버스 안에 824 본체(여백 ~100), 모서리 반경 ~185.4

import Foundation
import CoreGraphics
import ImageIO
import UniformTypeIdentifiers

func fail(_ m: String) -> Never {
  FileHandle.standardError.write(("make-icon: " + m + "\n").data(using: .utf8)!)
  exit(1)
}

let args = CommandLine.arguments
guard args.count >= 3 else { fail("usage: make-icon <in.png> <out.png>") }
let inPath = args[1], outPath = args[2]
let S = 1024
let size = CGFloat(S)

// Apple macOS 그리드 비율
let margin = size * (100.0 / 1024.0)            // 본체 바깥 여백
let body = CGRect(x: margin, y: margin, width: size - 2 * margin, height: size - 2 * margin)
let radius = body.width * (185.4 / 824.0)       // 모서리 반경 ≈ 22.5%

guard let srcImg = CGImageSourceCreateWithURL(URL(fileURLWithPath: inPath) as CFURL, nil),
      let img = CGImageSourceCreateImageAtIndex(srcImg, 0, nil) else { fail("입력 PNG 로드 실패: \(inPath)") }

let cs = CGColorSpace(name: CGColorSpace.sRGB)!
guard let ctx = CGContext(data: nil, width: S, height: S, bitsPerComponent: 8, bytesPerRow: 0,
                          space: cs, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)
else { fail("컨텍스트 생성 실패") }

ctx.clear(CGRect(x: 0, y: 0, width: size, height: size))
ctx.interpolationQuality = .high

let path = CGPath(roundedRect: body, cornerWidth: radius, cornerHeight: radius, transform: nil)

// 1) 부드러운 그림자 (본체 모양으로 흰 채움 → 그림자 캐스팅, 이후 이미지가 덮음)
ctx.saveGState()
ctx.setShadow(offset: CGSize(width: 0, height: -size * 0.012), blur: size * 0.022,
              color: CGColor(red: 0, green: 0, blue: 0, alpha: 0.20))
ctx.addPath(path)
ctx.setFillColor(CGColor(red: 1, green: 1, blue: 1, alpha: 1))
ctx.fillPath()
ctx.restoreGState()

// 2) 둥근 본체로 클립 후 원본을 aspect-fill 로 그림
ctx.saveGState()
ctx.addPath(path)
ctx.clip()
let iw = CGFloat(img.width), ih = CGFloat(img.height)
let scale = max(body.width / iw, body.height / ih)
let dw = iw * scale, dh = ih * scale
let drawRect = CGRect(x: body.midX - dw / 2, y: body.midY - dh / 2, width: dw, height: dh)
ctx.draw(img, in: drawRect)
ctx.restoreGState()

guard let out = ctx.makeImage() else { fail("이미지 생성 실패") }
guard let dest = CGImageDestinationCreateWithURL(URL(fileURLWithPath: outPath) as CFURL,
                                                 UTType.png.identifier as CFString, 1, nil)
else { fail("출력 대상 생성 실패") }
CGImageDestinationAddImage(dest, out, nil)
guard CGImageDestinationFinalize(dest) else { fail("PNG 저장 실패") }
print("make-icon: \(outPath) 생성 (본체 \(Int(body.width))px, 반경 \(Int(radius))px)")
