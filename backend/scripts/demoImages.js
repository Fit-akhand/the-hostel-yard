// Tiny PNG pictures drawn in code, for demo signatures and placeholder ID files. No real documents.
import zlib from 'zlib'

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
const crc = (buf) => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0 }
const chunk = (type, data) => {
  const body = Buffer.concat([Buffer.from(type), data])
  const out = Buffer.alloc(body.length + 8)
  out.writeUInt32BE(data.length, 0); body.copy(out, 4); out.writeUInt32BE(crc(body), body.length + 4)
  return out
}

// pixel(x, y) returns [r, g, b, a]
export const png = (width, height, pixel) => {
  const raw = Buffer.alloc((width * 4 + 1) * height)
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) raw.set(pixel(x, y), y * (width * 4 + 1) + 1 + x * 4)
  const header = Buffer.alloc(13)
  header.writeUInt32BE(width, 0); header.writeUInt32BE(height, 4); header[8] = 8; header[9] = 6
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header), chunk('IDAT', zlib.deflateSync(raw, { level: 1 })), chunk('IEND', Buffer.alloc(0))])
}

// A hand-written looking squiggle, different for each seed.
export const signatureImage = (seed) => {
  const width = 360, height = 100
  const wave = (x) => 52 + Math.sin(x / (9 + (seed % 5))) * 18 * Math.sin(x / 57 + seed) + Math.sin(x / 4.3 + seed) * 5
  const data = png(width, height, (x, y) => (x > 30 && x < 300 && Math.abs(y - wave(x)) < 2.2 ? [11, 16, 32, 255] : [0, 0, 0, 0]))
  return `data:image/png;base64,${data.toString('base64')}`
}

// A grey card with a simple head-and-shoulders or stripes, clearly a placeholder.
export const sampleFile = (kind) => {
  const [width, height] = kind === 'PHOTO' ? [240, 300] : [420, 260]
  return png(width, height, (x, y) => {
    if (kind === 'PHOTO') {
      const head = (x - 120) ** 2 + (y - 115) ** 2 < 52 ** 2
      const body = (x - 120) ** 2 / 95 ** 2 + (y - 300) ** 2 / 115 ** 2 < 1
      return head || body ? [120, 132, 160, 255] : [226, 230, 240, 255]
    }
    const line = [60, 100, 140, 180].some((top) => y > top && y < top + 14 && x > 150 && x < 380 - ((top * 3) % 90))
    const box = x > 28 && x < 120 && y > 60 && y < 190
    return y < 36 ? [196, 48, 43, 255] : line || box ? [150, 160, 180, 255] : [238, 240, 246, 255]
  })
}
