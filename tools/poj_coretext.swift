// CoreText shaping probe for POJ clusters (macOS only).
//
//   swift tools/poj_coretext.swift shape  <font> [face-index]  < strings.json  > out.json
//   swift tools/poj_coretext.swift render <font> [face-index] <out.png> <line> [<line> ...]
//
// shape: reads a JSON array of strings on stdin. For each string it lays out a CTLine with the font at
// size = unitsPerEm (so numbers are in font units) and prints every glyph: run font (to spot system font
// fallback), glyph id, UTF-16 string index, position, advance as CoreText reports it (distance to the
// next glyph, so it includes mark offsets), nominal hmtx advance and ink box, plus the line width.
// render: draws each line with CoreText into a PNG, for comparison with the HarfBuzz specimens.
import Foundation
import CoreText
import CoreGraphics
import ImageIO
import UniformTypeIdentifiers

func loadFont(_ path: String, _ index: Int, size: CGFloat? = nil) -> CTFont {
    let url = URL(fileURLWithPath: path) as CFURL
    guard let descs = CTFontManagerCreateFontDescriptorsFromURL(url) as? [CTFontDescriptor], index < descs.count else {
        FileHandle.standardError.write("cannot load \(path)\n".data(using: .utf8)!); exit(1)
    }
    let probe = CTFontCreateWithFontDescriptor(descs[index], 12, nil)
    let upem = CGFloat(CTFontGetUnitsPerEm(probe))
    return CTFontCreateWithFontDescriptor(descs[index], size ?? upem, nil)
}

func line(_ s: String, _ font: CTFont) -> CTLine {
    let attrs: [NSAttributedString.Key: Any] = [NSAttributedString.Key(kCTFontAttributeName as String): font]
    return CTLineCreateWithAttributedString(NSAttributedString(string: s, attributes: attrs))
}

func shape(_ s: String, _ font: CTFont) -> [String: Any] {
    var out: [[String: Any]] = []
    var pen: CGFloat = 0
    let l = line(s, font)
    for run in CTLineGetGlyphRuns(l) as! [CTRun] {
        let n = CTRunGetGlyphCount(run)
        let attrs = CTRunGetAttributes(run) as NSDictionary
        let rf = attrs[kCTFontAttributeName as String] as! CTFont
        let psName = CTFontCopyPostScriptName(rf) as String
        var glyphs = [CGGlyph](repeating: 0, count: n)
        var pos = [CGPoint](repeating: .zero, count: n)
        var adv = [CGSize](repeating: .zero, count: n)
        var idx = [CFIndex](repeating: 0, count: n)
        let all = CFRange(location: 0, length: 0)
        CTRunGetGlyphs(run, all, &glyphs)
        CTRunGetPositions(run, all, &pos)
        CTRunGetAdvances(run, all, &adv)
        CTRunGetStringIndices(run, all, &idx)
        var rects = [CGRect](repeating: .zero, count: n)
        CTFontGetBoundingRectsForGlyphs(rf, .horizontal, glyphs, &rects, n)
        var nominal = [CGSize](repeating: .zero, count: n)  // hmtx advance, before positioning
        CTFontGetAdvancesForGlyphs(rf, .horizontal, glyphs, &nominal, n)
        for i in 0..<n {
            let r = rects[i]
            var box: Any = NSNull()
            if r.width > 0 {
                box = [pos[i].x + r.minX, pos[i].y + r.minY, pos[i].x + r.maxX, pos[i].y + r.maxY].map { Double($0) }
            }
            out.append(["font": psName, "gid": Int(glyphs[i]), "cl": idx[i],
                        "pen": Double(pen), "x": Double(pos[i].x), "y": Double(pos[i].y),
                        "adv": Double(adv[i].width), "nadv": Double(nominal[i].width), "box": box])
            pen += adv[i].width
        }
    }
    return ["width": Double(CTLineGetTypographicBounds(l, nil, nil, nil)), "glyphs": out]
}

func render(_ lines: [String], _ font: CTFont, _ outPath: String) {
    let size = CTFontGetSize(font)
    let lh = size * 1.9
    var w: CGFloat = 0
    let ctLines = lines.map { line($0, font) }
    for l in ctLines { w = max(w, CGFloat(CTLineGetTypographicBounds(l, nil, nil, nil))) }
    let W = Int(w + size), H = Int(lh * CGFloat(lines.count) + size * 0.6)
    let ctx = CGContext(data: nil, width: W, height: H, bitsPerComponent: 8, bytesPerRow: 0,
                        space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
    ctx.setFillColor(CGColor(red: 1, green: 1, blue: 1, alpha: 1)); ctx.fill(CGRect(x: 0, y: 0, width: W, height: H))
    ctx.setFillColor(CGColor(red: 0, green: 0, blue: 0, alpha: 1))
    for (i, l) in ctLines.enumerated() {
        ctx.textPosition = CGPoint(x: size * 0.5, y: CGFloat(H) - lh * CGFloat(i + 1) + size * 0.3)
        CTLineDraw(l, ctx)
    }
    let dest = CGImageDestinationCreateWithURL(URL(fileURLWithPath: outPath) as CFURL, UTType.png.identifier as CFString, 1, nil)!
    CGImageDestinationAddImage(dest, ctx.makeImage()!, nil); CGImageDestinationFinalize(dest)
}

let a = CommandLine.arguments
guard a.count >= 3 else { print("usage: shape|render <font> ..."); exit(2) }
switch a[1] {
case "shape":
    let index = a.count > 3 ? Int(a[3])! : 0
    let font = loadFont(a[2], index)
    let strings = try! JSONSerialization.jsonObject(with: FileHandle.standardInput.readDataToEndOfFile()) as! [String]
    let res: [String: Any] = ["ps": CTFontCopyPostScriptName(font) as String,
                              "upem": Int(CTFontGetUnitsPerEm(font)),
                              "results": strings.map { shape($0, font) }]
    FileHandle.standardOutput.write(try! JSONSerialization.data(withJSONObject: res))
case "render":
    // render <font> <index> <out.png> lines...
    let font = loadFont(a[2], Int(a[3])!, size: 48)
    render(Array(a[5...]), font, a[4])
default:
    exit(2)
}
