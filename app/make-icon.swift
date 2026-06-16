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

// 1) 본체 이미지 생성: 둥근 사각형으로 클립 + 원본 aspect-fill (투명 바깥, 흰색 없음)
let bw = Int(body.width.rounded()), bh = Int(body.height.rounded())
guard let bctx = CGContext(data: nil, width: bw, height: bh, bitsPerComponent: 8, bytesPerRow: 0,
                           space: cs, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)
else { fail("본체 컨텍스트 실패") }
bctx.clear(CGRect(x: 0, y: 0, width: bw, height: bh))
bctx.interpolationQuality = .high
let bpath = CGPath(roundedRect: CGRect(x: 0, y: 0, width: CGFloat(bw), height: CGFloat(bh)),
                   cornerWidth: radius, cornerHeight: radius, transform: nil)
bctx.addPath(bpath)
bctx.clip()
let iw = CGFloat(img.width), ih = CGFloat(img.height)
let scale = max(CGFloat(bw) / iw, CGFloat(bh) / ih)
let dw = iw * scale, dh = ih * scale
bctx.draw(img, in: CGRect(x: (CGFloat(bw) - dw) / 2, y: (CGFloat(bh) - dh) / 2, width: dw, height: dh))
guard let bodyImage = bctx.makeImage() else { fail("본체 이미지 실패") }

// 2) 최종 캔버스: 본체 이미지의 알파에서 직접 부드러운 그림자 캐스팅 (흰색 안 깔음)
ctx.saveGState()
ctx.setShadow(offset: CGSize(width: 0, height: -size * 0.012), blur: size * 0.024,
              color: CGColor(red: 0, green: 0, blue: 0, alpha: 0.22))
ctx.draw(bodyImage, in: body)
ctx.restoreGState()

guard let out = ctx.makeImage() else { fail("이미지 생성 실패") }
guard let dest = CGImageDestinationCreateWithURL(URL(fileURLWithPath: outPath) as CFURL,
                                                 UTType.png.identifier as CFString, 1, nil)
else { fail("출력 대상 생성 실패") }
CGImageDestinationAddImage(dest, out, nil)
guard CGImageDestinationFinalize(dest) else { fail("PNG 저장 실패") }
print("make-icon: \(outPath) 생성 (본체 \(Int(body.width))px, 반경 \(Int(radius))px)")
