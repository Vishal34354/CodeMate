const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// CRC32 implementation
function crc32(buf) {
  let table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const toCrc = Buffer.concat([typeBuf, data]);
  const crcVal = crc32(toCrc);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crcVal, 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function createPng(size) {
  const width = size;
  const height = size;
  const rowLen = 1 + width * 4; // 1 filter byte + RGBA pixels
  const rawData = Buffer.alloc(rowLen * height);

  // Background: Indigo #6678f5 (102, 120, 245), Rounded corner effect with "C" in center
  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowLen;
    rawData[rowOffset] = 0; // Filter: none
    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;

      // Distance from center for circle / rounded icon
      const dx = x - width / 2;
      const dy = y - height / 2;
      const r = Math.sqrt(dx * dx + dy * dy);
      const maxR = width * 0.46;

      if (r <= maxR) {
        // Gradient from #6678f5 to #8b9dff
        const t = y / height;
        const red = Math.round(102 * (1 - t) + 139 * t);
        const green = Math.round(120 * (1 - t) + 157 * t);
        const blue = 245;

        // Draw a simple white "C" character in the middle
        const nx = (x - width / 2) / (width / 2);
        const ny = (y - height / 2) / (height / 2);
        const distToRing = Math.abs(Math.sqrt(nx * nx + ny * ny) - 0.55);
        const isNotRightCut = !(nx > 0.1 && Math.abs(ny) < 0.35);

        if (distToRing < 0.22 && isNotRightCut && size >= 32) {
          // White symbol
          rawData[pxOffset] = 255;
          rawData[pxOffset + 1] = 255;
          rawData[pxOffset + 2] = 255;
          rawData[pxOffset + 3] = 255;
        } else {
          rawData[pxOffset] = red;
          rawData[pxOffset + 1] = green;
          rawData[pxOffset + 2] = blue;
          rawData[pxOffset + 3] = 255;
        }
      } else {
        // Transparent outside
        rawData[pxOffset] = 0;
        rawData[pxOffset + 1] = 0;
        rawData[pxOffset + 2] = 0;
        rawData[pxOffset + 3] = 0;
      }
    }
  }

  const header = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8 bits per channel
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', zlib.deflateSync(rawData));
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([header, ihdrChunk, idatChunk, iendChunk]);
}

const outDir = path.resolve(__dirname, '../public/icons');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

[16, 48, 128].forEach(size => {
  const png = createPng(size);
  const filePath = path.join(outDir, `icon${size}.png`);
  fs.writeFileSync(filePath, png);
  console.log(`Generated ${filePath} (${png.length} bytes)`);
});
