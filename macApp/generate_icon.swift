import AppKit
import CoreGraphics

let size = 1024
let scale: CGFloat = CGFloat(size)
let colorSpace = CGColorSpaceCreateDeviceRGB()

guard let ctx = CGContext(
    data: nil,
    width: size,
    height: size,
    bitsPerComponent: 8,
    bytesPerRow: 0,
    space: colorSpace,
    bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
) else {
    print("Failed to create context")
    exit(1)
}

let rect = CGRect(x: 0, y: 0, width: size, height: size)

// Background - dark rounded square
let cornerRadius: CGFloat = scale * 0.22
let bgPath = CGPath(roundedRect: rect.insetBy(dx: 2, dy: 2), cornerWidth: cornerRadius, cornerHeight: cornerRadius, transform: nil)
ctx.addPath(bgPath)
ctx.clip()

// Gradient background
let gradientColors = [
    CGColor(red: 0.06, green: 0.09, blue: 0.16, alpha: 1.0),
    CGColor(red: 0.08, green: 0.12, blue: 0.21, alpha: 1.0),
] as CFArray
let gradient = CGGradient(colorsSpace: colorSpace, colors: gradientColors, locations: [0, 1])!
ctx.drawLinearGradient(gradient, start: CGPoint(x: 0, y: scale), end: CGPoint(x: scale, y: 0), options: [])

// Lightning bolt
ctx.saveGState()
let boltPath = CGMutablePath()
// Main bolt shape
let cx = scale * 0.5
let cy = scale * 0.5

boltPath.move(to: CGPoint(x: cx + scale * 0.02, y: cy + scale * 0.38))
boltPath.addLine(to: CGPoint(x: cx - scale * 0.10, y: cy + scale * 0.04))
boltPath.addLine(to: CGPoint(x: cx + scale * 0.02, y: cy + scale * 0.04))
boltPath.addLine(to: CGPoint(x: cx - scale * 0.02, y: cy - scale * 0.38))
boltPath.addLine(to: CGPoint(x: cx + scale * 0.10, y: cy - scale * 0.04))
boltPath.addLine(to: CGPoint(x: cx - scale * 0.02, y: cy - scale * 0.04))
boltPath.closeSubpath()

// Glow effect
ctx.setShadow(offset: CGSize(width: 0, height: 0), blur: scale * 0.08, color: CGColor(red: 0.3, green: 0.6, blue: 1.0, alpha: 0.7))
ctx.setFillColor(CGColor(red: 0.35, green: 0.65, blue: 1.0, alpha: 1.0))
ctx.addPath(boltPath)
ctx.fillPath()

// Brighter inner bolt
ctx.setShadow(offset: CGSize(width: 0, height: 0), blur: scale * 0.03, color: CGColor(red: 0.5, green: 0.8, blue: 1.0, alpha: 0.9))

let innerBoltColors = [
    CGColor(red: 0.45, green: 0.78, blue: 1.0, alpha: 1.0),
    CGColor(red: 0.35, green: 0.60, blue: 1.0, alpha: 1.0),
] as CFArray
let boltGradient = CGGradient(colorsSpace: colorSpace, colors: innerBoltColors, locations: [0, 1])!

ctx.addPath(boltPath)
ctx.clip()
ctx.drawLinearGradient(boltGradient, start: CGPoint(x: cx, y: cy + scale * 0.38), end: CGPoint(x: cx, y: cy - scale * 0.38), options: [])
ctx.restoreGState()

// "HTTP" text at bottom
ctx.saveGState()
let attrs: [NSAttributedString.Key: Any] = [
    .font: NSFont.systemFont(ofSize: scale * 0.09, weight: .heavy),
    .foregroundColor: NSColor(red: 0.55, green: 0.65, blue: 0.80, alpha: 0.8),
]
let text = NSAttributedString(string: "HTTP", attributes: attrs)
let textSize = text.size()
let textX = (scale - textSize.width) / 2.0
let textY = scale * 0.10
let textRect = CGRect(x: textX, y: textY, width: textSize.width, height: textSize.height)

NSGraphicsContext.saveGraphicsState()
let nsCtx = NSGraphicsContext(cgContext: ctx, flipped: false)
NSGraphicsContext.current = nsCtx
text.draw(in: textRect)
NSGraphicsContext.restoreGraphicsState()
ctx.restoreGState()

// Save
guard let cgImage = ctx.makeImage() else {
    print("Failed to create image")
    exit(1)
}

let rep = NSBitmapImageRep(cgImage: cgImage)
rep.size = NSSize(width: size, height: size)
guard let pngData = rep.representation(using: .png, properties: [:]) else {
    print("Failed to create PNG")
    exit(1)
}

let outputPath = CommandLine.arguments.count > 1 ? CommandLine.arguments[1] : "icon_1024.png"
try pngData.write(to: URL(fileURLWithPath: outputPath))
print("Icon saved to \(outputPath)")
