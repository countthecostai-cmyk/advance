// Writes the image files the iOS app's Xcode project expects but that are
// not committed (binary files don't survive this project's tooling, see
// scripts/write-icons.js):
//
//   ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png  1024x1024
//   ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732*.png  2732x2732
//
// Without them Xcode archives an app with no icon, and App Store Connect
// refuses the upload ("Missing required icon file").
//
// If you have your own designed icon, save it as
// store-assets/appstore-icon-1024.png (1024x1024, square, no transparency)
// and it is used as-is. Otherwise a clean teal "A" on Advance's dark
// background is drawn from code.
//
// Existing files are left alone unless you pass --force, so a designed icon
// you put in Xcode yourself is never overwritten.
//
// Run with: npm run ios:assets
const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

const ROOT = path.join(__dirname, '..')
const FORCE = process.argv.includes('--force')

const BG = [0x14, 0x17, 0x1f] // ink-900
const FG = [0x5e, 0xea, 0xd4] // teal accent

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
})()

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii')
  const lenBuf = Buffer.alloc(4)
  lenBuf.writeUInt32BE(data.length, 0)
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf])
}

function encodePng(size, raw) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 2 // RGB, no alpha (App Store icons must not have transparency)
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// Distance from point (px, py) to segment (ax, ay)-(bx, by).
function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax
  const dy = by - ay
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
  const x = ax + t * dx - px
  const y = ay + t * dy - py
  return Math.sqrt(x * x + y * y)
}

// Draws an anti-aliased "A" (two legs and a crossbar) centred on a square
// canvas. glyphFrac is the letter's height as a share of the canvas.
function renderLetterA(size, glyphFrac) {
  const h = size * glyphFrac
  const w = h * 0.86
  const stroke = h * 0.15
  const half = stroke / 2
  const cx = size / 2
  const top = (size - h) / 2 + half
  const bottom = (size + h) / 2
  const left = cx - w / 2 + half
  const right = cx + w / 2 - half
  const barY = top + (bottom - top) * 0.62
  const barT = (barY - top) / (bottom - top)
  const barL = cx + (left - cx) * barT
  const barR = cx + (right - cx) * barT

  const minX = Math.floor(left - stroke)
  const maxX = Math.ceil(right + stroke)
  const minY = Math.floor(top - stroke)
  const maxY = Math.ceil(bottom + 1)

  const rowLen = 1 + size * 3
  const raw = Buffer.alloc(size * rowLen)
  for (let y = 0; y < size; y++) {
    const rowStart = y * rowLen
    for (let x = 0; x < size; x++) {
      const p = rowStart + 1 + x * 3
      raw[p] = BG[0]
      raw[p + 1] = BG[1]
      raw[p + 2] = BG[2]
    }
    if (y < minY || y > maxY) continue
    for (let x = Math.max(0, minX); x <= Math.min(size - 1, maxX); x++) {
      const px = x + 0.5
      const py = y + 0.5
      const d = Math.min(
        segDist(px, py, cx, top, left, bottom),
        segDist(px, py, cx, top, right, bottom),
        segDist(px, py, barL, barY, barR, barY),
      )
      // Coverage from the stroke edge, then cut the legs off flat at the baseline.
      let a = Math.max(0, Math.min(1, half - d + 0.5))
      a *= Math.max(0, Math.min(1, bottom - py + 0.5))
      if (a <= 0) continue
      const p = rowStart + 1 + x * 3
      for (let c = 0; c < 3; c++) raw[p + c] = Math.round(BG[c] + (FG[c] - BG[c]) * a)
    }
  }
  return encodePng(size, raw)
}

function write(relPath, makeBuffer) {
  const full = path.join(ROOT, relPath)
  if (!FORCE && fs.existsSync(full)) {
    console.log('kept', relPath, '(already there; pass --force to replace)')
    return
  }
  fs.mkdirSync(path.dirname(full), { recursive: true })
  fs.writeFileSync(full, makeBuffer())
  console.log('wrote', relPath)
}

const ASSETS = 'ios/App/App/Assets.xcassets'
const customIcon = path.join(ROOT, 'store-assets/appstore-icon-1024.png')

write(`${ASSETS}/AppIcon.appiconset/AppIcon-512@2x.png`, () =>
  fs.existsSync(customIcon) ? fs.readFileSync(customIcon) : renderLetterA(1024, 0.5),
)

let splash
for (const name of ['splash-2732x2732.png', 'splash-2732x2732-1.png', 'splash-2732x2732-2.png']) {
  write(`${ASSETS}/Splash.imageset/${name}`, () => (splash = splash || renderLetterA(2732, 0.09)))
}
