// Generates the PWA/Home-Screen icon PNGs at build time using a tiny
// from-scratch PNG encoder (zlib + a hand-rolled CRC32), instead of
// committing PNG binary data to the repo. Binary bytes relayed as base64
// text through this project's setup tooling were found to get silently
// corrupted in transit — regenerating deterministically from code sidesteps
// that entirely. Output is git-ignored (see .gitignore) and rebuilt fresh
// on every `npm run build` / `npm run dev`.
const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

const BG = [0x14, 0x17, 0x1f] // ink-900
const FG = [0x5e, 0xea, 0xd4] // teal accent

// 5x7 bitmap glyph for "A", read top-to-bottom, MSB-first per row.
const GLYPH_A = [
  '01110',
  '10001',
  '10001',
  '11111',
  '10001',
  '10001',
  '10001',
]

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

// Renders a centered glyph on a solid background as a raw RGB PNG.
function renderPng(size, { padFrac = 0.24 } = {}) {
  const rows = GLYPH_A.length
  const cols = GLYPH_A[0].length
  const usable = size * (1 - padFrac * 2)
  const cell = Math.floor(usable / Math.max(rows, cols))
  const glyphW = cell * cols
  const glyphH = cell * rows
  const offX = Math.floor((size - glyphW) / 2)
  const offY = Math.floor((size - glyphH) / 2)

  const raw = Buffer.alloc(size * (1 + size * 3)) // filter byte + RGB per row
  for (let y = 0; y < size; y++) {
    const rowStart = y * (1 + size * 3)
    raw[rowStart] = 0 // no filter
    for (let x = 0; x < size; x++) {
      let color = BG
      const gx = x - offX
      const gy = y - offY
      if (gx >= 0 && gy >= 0 && gx < glyphW && gy < glyphH) {
        const col = Math.floor(gx / cell)
        const row = Math.floor(gy / cell)
        if (GLYPH_A[row][col] === '1') color = FG
      }
      const px = rowStart + 1 + x * 3
      raw[px] = color[0]
      raw[px + 1] = color[1]
      raw[px + 2] = color[2]
    }
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 2 // color type: RGB
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0

  const idat = zlib.deflateSync(raw)
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const TARGETS = [
  { path: 'public/icons/icon-192.png', size: 192, padFrac: 0.24 },
  { path: 'public/icons/icon-512.png', size: 512, padFrac: 0.24 },
  { path: 'public/icons/icon-maskable-512.png', size: 512, padFrac: 0.34 },
  { path: 'public/apple-touch-icon.png', size: 180, padFrac: 0.2 },
]

for (const { path: relPath, size, padFrac } of TARGETS) {
  const fullPath = path.join(__dirname, '..', relPath)
  fs.mkdirSync(path.dirname(fullPath), { recursive: true })
  fs.writeFileSync(fullPath, renderPng(size, { padFrac }))
  console.log('wrote', relPath, `${size}x${size}`)
}
