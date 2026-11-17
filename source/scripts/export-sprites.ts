// sprites.ts의 픽셀 지도를 PNG 파일로 뽑는다: npm run export:sprites
// 1픽셀 = 1픽셀(원본 크기, 예: 모찌 14×20)로 저장한다. 게임이 읽을 때 SCALE배로 키운다.
// 이미 있는 PNG는 덮어쓰지 않는다(직접 고친 그림 보호). 전부 다시 뽑으려면: npm run export:sprites -- --force
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';
import { PALETTE, SPRITES } from '../src/art/sprites';

const force = process.argv.includes('--force');
// 번들된 스크립트는 node_modules/.cache 안에서 돌기 때문에 작업 폴더(source) 기준으로 찾는다.
const outDir = join(process.cwd(), 'src', 'assets', 'sprites');
mkdirSync(outDir, { recursive: true });

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf: Buffer) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(width: number, height: number, rgba: Buffer) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // 채널당 8비트
  header[9] = 6; // RGBA
  // 줄마다 앞에 필터 바이트(0 = 없음)를 붙인다.
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

let written = 0;
let skipped = 0;
const problems: string[] = [];

for (const [key, rows] of Object.entries(SPRITES)) {
  const file = join(outDir, `${key}.png`);
  if (existsSync(file) && !force) {
    skipped++;
    continue;
  }
  const width = Math.max(...rows.map((r) => r.length));
  const height = rows.length;
  const rgba = Buffer.alloc(width * height * 4); // 기본은 투명
  rows.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      // Phaser의 textures.generate와 같은 규칙: '.'과 ' '는 투명
      if (ch === '.' || ch === ' ') return;
      const hex = PALETTE[ch];
      if (!hex) {
        problems.push(`${key} (${x},${y}): 팔레트에 없는 글자 '${ch}'`);
        return;
      }
      const i = (y * width + x) * 4;
      rgba[i] = parseInt(hex.slice(1, 3), 16);
      rgba[i + 1] = parseInt(hex.slice(3, 5), 16);
      rgba[i + 2] = parseInt(hex.slice(5, 7), 16);
      rgba[i + 3] = 255;
    });
  });
  writeFileSync(file, encodePng(width, height, rgba));
  written++;
}

console.log(`PNG ${written}개 저장, ${skipped}개는 이미 있어서 건너뜀 → ${outDir}`);
if (problems.length > 0) {
  console.log('문제:');
  problems.forEach((p) => console.log(`  - ${p}`));
  process.exit(1);
}
