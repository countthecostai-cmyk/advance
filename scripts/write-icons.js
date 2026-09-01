// Writes the PWA/Home-Screen icon PNGs from committed base64 data before the
// Next.js build runs. PNG bytes can't be committed to this repo directly
// through the push path used to set it up, so they're stored as base64 text
// here instead and materialized on every build (output is git-ignored).
const fs = require('fs')
const path = require('path')

const data = require('./icon-data.json')

for (const [relPath, base64] of Object.entries(data)) {
  const fullPath = path.join(__dirname, '..', relPath)
  fs.mkdirSync(path.dirname(fullPath), { recursive: true })
  fs.writeFileSync(fullPath, Buffer.from(base64, 'base64'))
  console.log('wrote', relPath)
}
