import { Px, bayer, seeded } from './prologuePaint';

// 프롤로그 배경 그림(절반 해상도 360×145, 화면에서는 2배).
// 그림 속 불빛(창문·가로등·성의 창)의 위치는 무대에서 빛무리를 겹쳐 그릴 수 있게 함께 내보낸다(절반 해상도 좌표).

export const LW = 360;
export const LH = 145;
/** 땅 윗면 */
export const LG = 119;

const INK = '#2b1d2f';
const PARTY = ['#ff7aa8', '#ffe08a', '#8fc7e8', '#9ad58b', '#c99be0'];

// ───────────────────────── 마을 ─────────────────────────

interface Roof {
  light: string;
  mid: string;
  dark: string;
}
const ROOFS: Record<string, Roof> = {
  red: { light: '#f08a8a', mid: '#cc5a66', dark: '#8a3048' },
  blue: { light: '#a8c4ee', mid: '#6a8ac8', dark: '#465a98' },
  green: { light: '#b8dc8c', mid: '#7fae5f', dark: '#4f7a44' },
  orange: { light: '#f4b870', mid: '#c97f3e', dark: '#8a5230' },
};

interface House {
  x: number;
  w: number;
  h: number;
  roof: keyof typeof ROOFS;
}

export const HOUSES: House[] = [
  { x: 14, w: 42, h: 32, roof: 'red' },
  { x: 92, w: 32, h: 26, roof: 'blue' },
  { x: 234, w: 34, h: 28, roof: 'green' },
  { x: 300, w: 46, h: 36, roof: 'orange' },
];
export const LAMPS = [76, 284];

const roofHeight = (h: House) => Math.round((h.w / 2 + 3) * 0.8);
const houseTop = (h: House) => LG - h.h;

/** 창문 왼쪽 위 좌표 */
export function houseWindows(h: House) {
  const wy = houseTop(h) + 5;
  return [
    { x: h.x + 4, y: wy },
    { x: h.x + h.w - 9, y: wy },
  ];
}

export function houseChimney(h: House) {
  return { x: h.x + Math.round(h.w * 0.68) + 2, y: houseTop(h) - Math.round(roofHeight(h) * 0.75) - 1 };
}

function house(p: Px, hs: House) {
  const { x, w, h } = hs;
  const roof = ROOFS[hs.roof];
  const top = houseTop(hs);
  const wall = '#f3e2c4';
  const wallShade = '#d6b996';
  const timber = '#7a4a3a';
  // 땅 그림자(달빛은 오른쪽 위에서)
  p.dither(x - 6, LG - 1, 8, 3, '#22301f', 0.6);
  // 벽
  p.rect(x, top, w, h - 4, wall);
  p.rect(x + w - Math.ceil(w * 0.24), top, Math.ceil(w * 0.24), h - 4, wallShade);
  p.dither(x, top + 2, Math.floor(w * 0.3), h - 6, wallShade, 0.18);
  // 나무 뼈대
  const mid = top + Math.floor((h - 4) / 2);
  p.rect(x, top, 1, h - 4, timber);
  p.rect(x + w - 1, top, 1, h - 4, timber);
  p.rect(x, mid, w, 1, timber);
  for (let i = 0; i < Math.floor((h - 4) / 2) - 1; i++) {
    p.dot(x + 1 + i, mid + 1 + i, timber);
    p.dot(x + w - 2 - i, mid + 1 + i, timber);
  }
  // 주춧돌
  p.rect(x - 1, LG - 4, w + 2, 4, '#6a5c74');
  p.rect(x - 1, LG - 4, w + 2, 1, '#8a7a96');
  for (let i = 0; i < w + 2; i += 5) p.rect(x - 1 + i, LG - 3, 1, 3, '#4a3e56');
  // 지붕: 처마 밑 그림자 → 기와 줄무늬, 왼쪽이 밝고 오른쪽이 어둡다
  p.rect(x, top, w, 2, '#b89a7a');
  const over = 3;
  const rh = roofHeight(hs);
  const cx = x + w / 2;
  for (let r = 0; r < rh; r++) {
    const half = Math.round((w / 2 + over) * (1 - r / rh));
    if (half <= 0) break;
    const y = top - 1 - r;
    const left = Math.round(cx - half);
    const stripe = r % 3 === 0;
    p.rect(left, y, half, 1, stripe ? roof.mid : roof.light);
    p.rect(left + half, y, half, 1, stripe ? roof.dark : roof.mid);
    p.dot(left - 1, y, INK);
    p.dot(left + half * 2, y, INK);
  }
  p.rect(x - over - 1, top, w + over * 2 + 2, 1, INK);
  // 굴뚝
  const ch = houseChimney(hs);
  const chH = Math.round(rh * 0.5);
  p.rect(ch.x - 2, ch.y + 1, 5, chH, '#9a6a5a');
  p.rect(ch.x + 1, ch.y + 1, 2, chH, '#7a4a3a');
  for (let i = 2; i < chH; i += 3) p.rect(ch.x - 2, ch.y + 1 + i, 5, 1, '#6a3a32');
  p.rect(ch.x - 3, ch.y, 7, 1, INK);
  // 문
  const dx = Math.round(cx) - 3;
  p.rect(dx - 1, LG - 13, 7, 9, timber);
  p.rect(dx, LG - 12, 5, 8, '#8a5038');
  p.rect(dx + 2, LG - 12, 1, 8, '#6a3a28');
  p.dot(dx + 3, LG - 8, '#ffd65a');
  p.dither(dx - 3, LG, 11, 5, '#ffd08a', 0.3);
  // 불 켜진 창, 창턱 꽃상자
  for (const win of houseWindows(hs)) {
    p.rect(win.x - 1, win.y - 1, 7, 7, timber);
    p.rect(win.x, win.y, 5, 5, '#ffc84a');
    p.rect(win.x, win.y, 2, 2, '#fff2b8');
    p.rect(win.x + 2, win.y, 1, 5, '#a8703c');
    p.rect(win.x, win.y + 2, 5, 1, '#a8703c');
    p.rect(win.x - 1, win.y + 6, 7, 2, '#8a5a3a');
    p.dot(win.x, win.y + 5, '#ff7aa8');
    p.dot(win.x + 2, win.y + 5, '#ffe08a');
    p.dot(win.x + 4, win.y + 5, '#ff7aa8');
    p.dot(win.x + 1, win.y + 5, '#7fae5f');
    p.dot(win.x + 3, win.y + 5, '#7fae5f');
  }
}

/** 3단 전나무. 오른쪽(달빛 쪽) 가장자리가 밝다 */
function pine(p: Px, cx: number, base: number, h: number, dark: string, mid: string, light: string) {
  p.rect(cx, base - 2, 1, 3, '#3a2a2a');
  const tierH = h / 3;
  for (let y = 0; y < h; y++) {
    const tier = Math.floor(y / tierH);
    const t = (y - tier * tierH) / tierH;
    const half = Math.max(0, Math.round((tier + 1) * h * 0.08 + t * h * 0.12 - 1));
    const row = base - 2 - h + y;
    p.rect(cx - half, row, half * 2 + 1, 1, mid);
    if (half >= 1) p.rect(cx - half, row, Math.ceil(half * 0.7), 1, dark);
    p.dot(cx + half, row, light);
  }
}

/** 울퉁불퉁한 산등성이 */
function ridge(p: Px, base: number, amp: number, seed: number, color: string, light?: string) {
  const rnd = seeded(seed);
  let wobble = 0;
  for (let x = 0; x < LW; x++) {
    wobble += (rnd() - 0.5) * 1.6;
    wobble *= 0.94;
    const top = Math.round(base - amp * Math.sin(x * 0.018 + seed) - amp * 0.4 * Math.sin(x * 0.051 + seed * 2) + wobble);
    p.rect(x, top, 1, LH - top, color);
    if (light) p.dot(x, top, light);
  }
}

/** 아래가 노을빛을 받은 구름 */
function cloud(p: Px, x: number, y: number, w: number, top: string, mid: string, under: string) {
  const n = Math.max(2, Math.round(w / 8));
  for (let i = 0; i < n; i++) {
    const cx = x + (i * w) / (n - 1 || 1);
    const r = 3 + ((i * 7) % 3) + (i > 0 && i < n - 1 ? 2 : 0);
    p.disc(cx, y + 1, r, under);
  }
  for (let i = 0; i < n; i++) {
    const cx = x + (i * w) / (n - 1 || 1);
    const r = 3 + ((i * 7) % 3) + (i > 0 && i < n - 1 ? 2 : 0);
    p.disc(cx, y - 1, r - 1, mid);
    p.disc(cx - 1, y - 2, Math.max(1, r - 3), top);
  }
}

function stars(p: Px, n: number, maxY: number, seed: number) {
  const rnd = seeded(seed);
  for (let i = 0; i < n; i++) {
    const x = Math.floor(rnd() * LW);
    const y = Math.floor(rnd() * maxY);
    p.dot(x, y, rnd() < 0.3 ? '#c9b8ff' : '#fff4d0');
    if (rnd() < 0.08) {
      p.dot(x - 1, y, '#8a7ab0');
      p.dot(x + 1, y, '#8a7ab0');
      p.dot(x, y - 1, '#8a7ab0');
      p.dot(x, y + 1, '#8a7ab0');
    }
  }
}

function moon(p: Px, cx: number, cy: number, r: number, body: string, crater: string, halo: string) {
  p.halo(cx, cy, r, r + 14, halo, 0.45);
  p.disc(cx, cy, r, body);
  p.disc(cx + 2, cy + 2, Math.max(1, Math.round(r * 0.25)), crater);
  p.disc(cx - Math.round(r * 0.45), cy - Math.round(r * 0.2), 1, crater);
  p.dot(cx + Math.round(r * 0.3), cy - Math.round(r * 0.55), crater);
  // 오른쪽 아래 그늘
  for (let dy = -r; dy <= r; dy++) {
    const half = Math.floor(Math.sqrt(r * r - dy * dy) + 0.3);
    p.dot(cx + half, cy + dy, crater);
  }
}

function lamp(p: Px, x: number) {
  p.rect(x, LG - 17, 1, 17, INK);
  p.rect(x - 1, LG - 2, 3, 2, INK);
  p.rect(x - 2, LG - 22, 5, 5, INK);
  p.rect(x - 1, LG - 21, 3, 3, '#ffe08a');
  p.dot(x - 1, LG - 21, '#fff8d0');
  p.rect(x - 3, LG - 23, 7, 1, INK);
}

function grassAndPath(p: Px, seed: number, night: boolean) {
  p.vgrad(0, LG, LW, LH - LG, night ? ['#4a6e46', '#3a5a3c', '#2c4430'] : ['#5f8a4f', '#4a7044', '#3a5a3c']);
  p.rect(0, LG, LW, 1, night ? '#7fae5f' : '#9fca72');
  // 흙길과 돌
  p.rect(0, LG + 9, LW, 8, '#c9a27a');
  p.rect(0, LG + 9, LW, 1, '#e0c098');
  p.rect(0, LG + 16, LW, 1, '#8a6a4a');
  for (let x = 0; x < LW; x += 6) {
    const y = LG + 11 + ((x / 6) % 2) * 2;
    p.rect(x + 1, y, 3, 2, '#b88f66');
    p.dot(x + 1, y, '#e8cca4');
  }
  // 풀포기와 들꽃
  const rnd = seeded(seed);
  for (let i = 0; i < 90; i++) {
    const x = Math.floor(rnd() * LW);
    const y = rnd() < 0.5 ? LG + 2 + Math.floor(rnd() * 6) : LG + 19 + Math.floor(rnd() * (LH - LG - 20));
    const r = rnd();
    if (r < 0.65) {
      p.dot(x, y, '#8fbf6a');
      p.dot(x, y - 1, '#7fae5f');
    } else {
      p.dot(x, y, PARTY[Math.floor(rnd() * PARTY.length)]);
      p.dot(x, y + 1, '#4f7a44');
    }
  }
}

/** 마을의 시간대: 아침(맑은 하늘), 해 질 녘, 축제 밤(깃발 포함) */
export type VillageTime = 'morning' | 'dusk' | 'night';

/** 숲속 마을 */
export function paintVillage(p: Px, time: VillageTime) {
  const festive = time === 'night';
  if (time === 'morning') {
    p.vgrad(0, 0, LW, 104, ['#5aa8e0', '#78bce8', '#98ceee', '#bce0f0', '#dcefee', '#fbf6dc']);
    // 해: 둥근 빛무리 속 하얀 해
    p.halo(300, 24, 9, 26, '#fff6c8', 0.5);
    p.disc(300, 24, 9, '#fffbe8');
    p.disc(298, 22, 5, '#ffffff');
    cloud(p, 30, 30, 60, '#ffffff', '#eef4fa', '#c8d8ea');
    cloud(p, 150, 18, 40, '#ffffff', '#eef4fa', '#c8d8ea');
    cloud(p, 230, 46, 70, '#ffffff', '#e8f0f8', '#bccee4');
  } else {
    if (festive) p.vgrad(0, 0, LW, 104, ['#0e0a22', '#1a1336', '#2c1d4c', '#4a2a60', '#74386a', '#9a4a6e']);
    else p.vgrad(0, 0, LW, 104, ['#22183f', '#3d2a5e', '#6e3f72', '#b05e7c', '#e88a7a', '#ffc488']);
    stars(p, festive ? 90 : 34, festive ? 80 : 46, festive ? 11 : 5);
    moon(p, 300, 24, 9, '#fff4d0', '#e6d4a8', festive ? '#6a5a90' : '#f8c8a0');
    if (!festive) {
      cloud(p, 30, 30, 60, '#ffd0b0', '#e89a9a', '#a85a7a');
      cloud(p, 150, 18, 40, '#ffd0b0', '#e89a9a', '#a85a7a');
      cloud(p, 230, 46, 70, '#ffc8a0', '#e08a8a', '#9a4e72');
    } else {
      cloud(p, 70, 26, 50, '#5a4880', '#3e2f62', '#2a1f48');
      cloud(p, 210, 40, 60, '#5a4880', '#3e2f62', '#2a1f48');
    }
  }
  // 먼 산 → 먼 숲 → 가까운 숲(뒤로 갈수록 하늘색에 묻힌다). [산, 산 밝은 곳, 먼 숲 3색, 가까운 숲 3색]
  const tones: Record<VillageTime, string[]> = {
    morning: ['#7aa4c4', '#96bcd6', '#4e7e74', '#5e8e7a', '#80aa88', '#2e5a3a', '#3a6a44', '#62945a'],
    dusk: ['#7a5684', '#9a6e94', '#4a3a68', '#5a4678', '#7a6090', '#2e4a3a', '#3a5a44', '#6a8a5a'],
    night: ['#3a2a5a', '#4e3a70', '#2a1f44', '#33265a', '#4a3a70', '#1e2a26', '#26362c', '#3e5a40'],
  };
  const c = tones[time];
  ridge(p, 86, 10, 3, c[0], c[1]);
  for (let x = 4; x < LW; x += 9) pine(p, x, 100 + ((x * 7) % 5), 14 + ((x * 13) % 9), c[2], c[3], c[4]);
  for (let x = 0; x < LW; x += 13) pine(p, x + 5, 114 + ((x * 3) % 4), 20 + ((x * 11) % 10), c[5], c[6], c[7]);
  grassAndPath(p, festive ? 21 : 13, festive);
  for (const h of HOUSES) house(p, h);
  for (const x of LAMPS) lamp(p, x);
  // 울타리
  for (const [x0, x1] of [
    [60, 88],
    [272, 296],
  ]) {
    p.rect(x0, LG - 4, x1 - x0, 1, '#a8805e');
    p.rect(x0, LG - 2, x1 - x0, 1, '#8a6a4a');
    for (let x = x0; x <= x1; x += 4) {
      p.rect(x, LG - 6, 1, 6, '#a8805e');
      p.dot(x, LG - 6, '#e0c098');
    }
  }
  if (festive) bunting(p);
}

/** 깃발 줄 두 개. 등불 위치는 lanternSpots()로 얻는다. */
function bunting(p: Px) {
  const sag = (x: number, y0: number, s: number) => y0 + s * Math.sin((Math.PI * x) / LW);
  for (const [y0, s, off] of [
    [6, 12, 0],
    [2, 20, 4],
  ] as const) {
    for (let x = 0; x < LW; x++) p.dot(x, Math.round(sag(x, y0, s)), '#1b1220');
    for (let x = off; x < LW - 4; x += 9) {
      const y = Math.round(sag(x + 3, y0, s)) + 1;
      const c = PARTY[Math.floor(x / 9) % PARTY.length];
      for (let r = 0; r < 5; r++) p.rect(x + r * 0.5, y + r, 6 - r, 1, c);
      p.dot(x, y, '#ffffff');
    }
  }
}

/** 등불을 다는 자리(절반 해상도) */
export function lanternSpots() {
  return [40, 110, 250, 320].map((x) => ({ x, y: Math.round(2 + 20 * Math.sin((Math.PI * x) / LW)) + 1 }));
}

/** 투표함(무대 가운데에 따로 세운다). 30×24 */
export function paintBallotBox(p: Px) {
  p.dither(1, 21, 28, 3, '#1b1220', 0.5);
  p.rect(2, 4, 26, 18, INK);
  p.rect(3, 5, 24, 16, '#c98b4b');
  for (let y = 9; y < 21; y += 4) p.rect(3, y, 24, 1, '#a8703c');
  p.rect(3, 5, 6, 16, '#d9a066');
  p.rect(21, 5, 6, 16, '#a8703c');
  // 뚜껑과 투입구
  p.rect(1, 2, 28, 4, INK);
  p.rect(2, 3, 26, 2, '#e8b070');
  p.rect(10, 3, 10, 1, '#1b1220');
  // 하트 문장
  const heart = ['.kk.kk.', 'kffkffk', 'kfffffk', '.kfffk.', '..kfk..', '...k...'];
  heart.forEach((row, y) =>
    [...row].forEach((c, x) => {
      if (c === 'k') p.dot(11 + x, 10 + y, INK);
      if (c === 'f') p.dot(11 + x, 10 + y, '#ff6f91');
    }),
  );
  p.dot(13, 11, '#ffffff');
  // 리본
  p.rect(26, 4, 2, 18, '#8fc7e8');
  p.rect(25, 1, 4, 2, '#8fc7e8');
}

// ───────────────────────── 무대(스포트라이트) ─────────────────────────

export function paintTheatre(p: Px) {
  const floorY = 118;
  p.vgrad(0, 0, LW, floorY, ['#140c1e', '#22142e', '#33203f', '#3e2448']);
  // 벽지 줄무늬
  for (let x = 6; x < LW; x += 12) p.dither(x, 0, 2, floorY, '#4a2c58', 0.35);
  // 나무 바닥: 가운데로 모이는 판자 이음새
  p.vgrad(0, floorY, LW, LH - floorY, ['#7a4a30', '#a8703c', '#c98b4b']);
  for (let i = -16; i <= 16; i++) p.line(180 + i * 9, floorY, 180 + i * 22, LH, '#6a3a24');
  p.rect(0, floorY, LW, 1, '#e8b070');
  // 스포트라이트 기둥과 바닥의 빛 웅덩이
  for (let y = 0; y < floorY; y++) {
    const half = Math.round(8 + (y / floorY) * 54);
    for (let x = 180 - half; x <= 180 + half; x++) if (bayer(x, y) < 0.2 + (y / floorY) * 0.08) p.dot(x, y, '#fff4d0');
  }
  for (let y = floorY - 4; y < floorY + 9; y++) {
    const dy = (y - (floorY + 2)) / 7;
    const half = Math.round(64 * Math.sqrt(Math.max(0, 1 - dy * dy)));
    for (let x = 180 - half; x <= 180 + half; x++) if (bayer(x, y) < 0.5) p.dot(x, y, '#fff0c8');
  }
  // 양쪽 붉은 막(주름마다 명암), 묶은 금빛 끈
  const reds = ['#4a0f22', '#7a1a32', '#a8283f', '#d0485a'];
  for (const side of [0, 1]) {
    for (let y = 0; y < LH; y++) {
      const t = y / LH;
      const edge = Math.round(52 - 16 * Math.sin(Math.PI * Math.min(1, t * 1.3)));
      for (let x = 0; x < edge; x++) {
        const shade = Math.floor((Math.sin(x * 0.62 + (side ? 1.4 : 0)) + 1) * 1.99);
        const px = side ? LW - 1 - x : x;
        p.dot(px, y, reds[Math.min(3, shade)]);
      }
      const ex = side ? LW - edge : edge - 1;
      p.dot(ex, y, '#2a0812');
    }
    const ropeY = 82;
    const ex = side ? LW - 40 : 36;
    p.rect(ex - 2, ropeY, 8, 3, '#ffd65a');
    p.rect(ex - 2, ropeY + 2, 8, 1, '#c99a3a');
    p.rect(ex + 1, ropeY + 3, 2, 6, '#ffd65a');
  }
  // 위쪽 주름 장막과 금술
  for (let x = 0; x < LW; x++) {
    const bottom = 12 + Math.round(4 * Math.abs(Math.sin((x * Math.PI) / 30)));
    p.rect(x, 0, 1, bottom, x % 30 < 15 ? '#a8283f' : '#8a1f36');
    p.dot(x, bottom, '#ffd65a');
    if (x % 3 === 0) p.dot(x, bottom + 1, '#c99a3a');
  }
  p.rect(0, 0, LW, 3, '#ffd65a');
  p.rect(0, 3, LW, 1, '#c99a3a');
  // 객석: 앞쪽 관객들의 뒤통수와 귀
  const rnd = seeded(41);
  for (let x = 8; x < LW; x += 22) {
    const cx = x + Math.floor(rnd() * 6);
    const cy = LH + 2;
    const kind = Math.floor(rnd() * 3);
    if (kind === 0) {
      p.rect(cx - 5, cy - 22, 3, 12, '#0e0814');
      p.rect(cx + 2, cy - 22, 3, 12, '#0e0814');
    } else if (kind === 1) {
      p.disc(cx - 6, cy - 12, 3, '#0e0814');
      p.disc(cx + 6, cy - 12, 3, '#0e0814');
    } else {
      p.tri(cx - 6, cy - 16, 6, 3, '#0e0814');
      p.tri(cx + 6, cy - 16, 6, 3, '#0e0814');
    }
    p.disc(cx, cy, 10, '#0e0814');
    for (let dx = -8; dx <= 8; dx++) p.dot(cx + dx, cy - Math.floor(Math.sqrt(100 - dx * dx)), '#3a2448');
  }
}

// ───────────────────────── 마녀의 성으로 ─────────────────────────

/** 성의 창(절반 해상도). 빛무리를 겹쳐 그린다 */
export const CASTLE_WINDOWS = [
  { x: 279, y: 22 },
  { x: 249, y: 33 },
  { x: 309, y: 38 },
  { x: 266, y: 46 },
  { x: 292, y: 46 },
];
/** 마을 쪽 불 켜진 창 */
export const VILLAGE_LIGHTS = [
  { x: 14, y: 124 },
  { x: 38, y: 127 },
  { x: 62, y: 125 },
];

function deadTree(p: Px, x: number, y: number, len: number, angle: number, depth: number, c: string) {
  const x1 = x + Math.cos(angle) * len;
  const y1 = y + Math.sin(angle) * len;
  p.line(x, y, x1, y1, c);
  if (depth > 3) p.line(x + 1, y, x1 + 1, y1, c);
  if (depth <= 0) return;
  deadTree(p, x1, y1, len * 0.72, angle - 0.45 - depth * 0.03, depth - 1, c);
  deadTree(p, x1, y1, len * 0.66, angle + 0.5, depth - 1, c);
}

export function paintDeparture(p: Px) {
  p.vgrad(0, 0, LW, 120, ['#07040f', '#120a22', '#221232', '#3a1a40', '#5a2448', '#7a304c']);
  stars(p, 110, 90, 29);
  moon(p, 66, 30, 13, '#efe6d8', '#cfc2b0', '#8a7aa8');
  // 달을 가로지르는 구름 자락
  for (const [x, y, w] of [
    [30, 36, 70],
    [90, 24, 40],
    [180, 50, 80],
  ]) {
    p.rect(x, y, w, 2, '#2a1a3a');
    p.rect(x + 6, y - 1, w - 16, 1, '#3e2a52');
  }
  ridge(p, 94, 8, 7, '#24163a', '#33204e');
  // 절벽(달빛을 받는 왼쪽 가장자리가 밝다)
  for (let x = 196; x < LW; x++) {
    const t = (x - 196) / 40;
    const top = Math.round(x < 236 ? 112 - 50 * Math.min(1, t) + 4 * Math.sin(x * 0.7) : 62 + 3 * Math.sin(x * 0.3) + (x > 336 ? (x - 336) * 1.5 : 0));
    p.rect(x, top, 1, LH - top, '#1a1226');
    p.dot(x, top, '#3a2c4e');
    if (x < 240) p.dot(x, top + 1, '#2e2242');
    for (let y = top + 6; y < LH; y += 9) if (bayer(x, y) < 0.5) p.dot(x, y + ((x * 3) % 4), '#241a32');
  }
  // 성
  const C = '#140c1e';
  const lit = '#3a2c4e';
  const tower = (x: number, top: number, w: number, roofH: number) => {
    p.rect(x, top, w, 62 - top, C);
    p.rect(x, top, 1, 62 - top, lit);
    p.tri(x + Math.floor(w / 2), top - roofH, roofH, Math.ceil(w / 2) + 1, C);
    for (let r = 0; r < roofH; r++) p.dot(x + Math.floor(w / 2) - Math.round(((Math.ceil(w / 2) + 1) * (r + 1)) / roofH), top - roofH + r, lit);
  };
  p.rect(254, 38, 52, 24, C);
  p.rect(254, 38, 1, 24, lit);
  for (let x = 254; x < 306; x += 4) p.rect(x, 35, 2, 3, C);
  tower(242, 26, 12, 12);
  tower(304, 32, 11, 10);
  tower(273, 16, 14, 16);
  tower(260, 30, 8, 8);
  tower(288, 30, 8, 8);
  // 깃발
  p.rect(280, -1, 1, 4, C);
  p.rect(281, 0, 5, 2, '#5a2a4a');
  p.dot(286, 1, '#5a2a4a');
  // 성문
  p.rect(275, 52, 10, 10, '#07040c');
  p.rect(276, 51, 8, 1, '#07040c');
  p.dither(276, 54, 8, 8, '#2e4a2a', 0.3);
  for (const w of CASTLE_WINDOWS) {
    p.rect(w.x, w.y, 2, 3, '#9ad58b');
    p.dot(w.x, w.y, '#d8ffc8');
  }
  // 땅과 길
  ridge(p, 116, 4, 13, '#1c1a26', '#2a2636');
  p.vgrad(0, 122, LW, LH - 122, ['#1c1a26', '#16141e', '#0e0c14']);
  for (let i = 0; i <= 200; i++) {
    const t = i / 200;
    const y = Math.round(LH - t * (LH - 62));
    const cx = 170 + (280 - 170) * t + Math.sin(t * Math.PI * 1.6) * 34 * (1 - t);
    const half = Math.max(1, Math.round(26 - 24 * t));
    p.rect(cx - half, y, half * 2, 1, '#4a3e4e');
    for (let x = Math.round(cx - half); x < cx + half; x++) if (bayer(x, y) < 0.2) p.dot(x, y, '#6a5a6e');
    p.dot(cx - half, y, '#2a2232');
  }
  // 마을(왼쪽 아래 멀리): 작은 집 그림자와 불빛
  for (const [x, w, h] of [
    [6, 18, 10],
    [30, 16, 8],
    [52, 20, 11],
  ]) {
    p.rect(x, 130 - h, w, h + 2, '#1e1626');
    p.tri(x + w / 2, 130 - h - 6, 6, w / 2 + 2, '#1e1626');
  }
  for (const l of VILLAGE_LIGHTS) p.rect(l.x, l.y, 2, 2, '#ffd65a');
  // 앞쪽의 마른 나무
  deadTree(p, 106, LH, 22, -Math.PI / 2 - 0.15, 5, '#0a0710');
  deadTree(p, 346, LH, 26, -Math.PI / 2 + 0.2, 5, '#0a0710');
  // 풀
  const rnd = seeded(77);
  for (let i = 0; i < 70; i++) {
    const x = Math.floor(rnd() * LW);
    const y = 124 + Math.floor(rnd() * 20);
    p.dot(x, y, '#2a3a2c');
    p.dot(x, y - 1, '#22302a');
  }
}

// ───────────────────────── 성문 앞(가까이) ─────────────────────────

/** 성문 아치(절반 해상도). 문짝 두 개가 이 아치를 반씩 채운다 */
export const GATE = { cx: 180, halfW: 46, top: 26, springY: 72, bottom: LG };
/** 성문 양옆 횃불(초록 불꽃) */
export const GATE_TORCHES = [
  { x: 118, y: 66 },
  { x: 242, y: 66 },
];

const insideArch = (x: number, y: number) =>
  y <= GATE.bottom && Math.abs(x - GATE.cx) <= GATE.halfW && (y >= GATE.springY || Math.hypot(x - GATE.cx, y - GATE.springY) <= GATE.halfW);

/** 마녀의 성문을 바로 앞에서 올려다본 장면. 문짝은 따로(paintGateDoor) 그려 열리게 한다 */
export function paintGate(p: Px) {
  p.vgrad(0, 0, LW, 70, ['#04020a', '#0a0614', '#140a20', '#1e0f2a']);
  stars(p, 40, 40, 51);
  // 가는 초승달
  p.disc(44, 18, 8, '#efe6d8');
  p.disc(48, 16, 8, '#0a0614');
  // 성벽: 돌 줄눈과 이끼
  const WALL = '#1a1424';
  p.rect(0, 14, LW, LG - 14, WALL);
  for (let y = 16; y < LG; y += 6) {
    p.rect(0, y, LW, 1, '#120d1a');
    for (let x = ((y / 6) % 2) * 7; x < LW; x += 14) p.rect(x, y + 1, 1, 5, '#120d1a');
  }
  p.dither(0, 14, LW, LG - 14, '#241c30', 0.18);
  for (let x = 0; x < LW; x += 5) p.rect(x, 10, 3, 4, WALL); // 성가퀴
  p.rect(0, 14, LW, 1, '#2e2440');
  // 양옆 탑
  for (const [x0, w] of [
    [0, 62],
    [298, 62],
  ]) {
    p.rect(x0, 0, w, LG, '#16101f');
    p.rect(x0 === 0 ? w - 1 : x0, 0, 1, LG, '#2e2440');
    for (let y = 4; y < LG; y += 6) p.rect(x0, y, w, 1, '#0f0b16');
    p.rect(x0 + w / 2 - 3, 30, 6, 10, '#07040c');
    p.rect(x0 + w / 2 - 2, 31, 4, 8, '#3e6a3a');
    p.dot(x0 + w / 2 - 1, 32, '#9ad58b');
  }
  // 담쟁이
  const rnd = seeded(91);
  for (let i = 0; i < 14; i++) {
    const x = Math.floor(rnd() * LW);
    const len = 8 + Math.floor(rnd() * 26);
    for (let y = 14; y < 14 + len; y++) {
      const xx = x + Math.round(Math.sin(y * 0.5 + i) * 1.5);
      if (insideArch(xx, y)) continue;
      p.dot(xx, y, '#1e3022');
      if (rnd() < 0.3) p.dot(xx + 1, y, '#2c4630');
    }
  }
  // 문 안쪽(문이 열리면 보인다): 초록 빛이 번지는 어둠
  for (let y = GATE.top; y <= GATE.bottom; y++) {
    for (let x = GATE.cx - GATE.halfW; x <= GATE.cx + GATE.halfW; x++) {
      if (!insideArch(x, y)) continue;
      const d = Math.hypot((x - GATE.cx) / GATE.halfW, (y - GATE.bottom) / (GATE.bottom - GATE.top));
      p.dot(x, y, '#060c08');
      if (bayer(x, y) < 0.9 - d) p.dot(x, y, '#1e4a26');
      if (bayer(x, y) < 0.55 - d) p.dot(x, y, '#5aa85a');
    }
  }
  // 아치 테두리 돌
  for (let a = Math.PI; a <= Math.PI * 2 + 0.001; a += 0.02) {
    for (let r = GATE.halfW + 1; r <= GATE.halfW + 6; r++) {
      const x = Math.round(GATE.cx + Math.cos(a) * r);
      const y = Math.round(GATE.springY + Math.sin(a) * r);
      p.dot(x, y, r === GATE.halfW + 6 ? '#0c0812' : Math.floor(a * 9) % 2 ? '#3a2e48' : '#302640');
    }
  }
  for (const side of [-1, 1]) {
    const x = GATE.cx + side * (GATE.halfW + 3.5);
    for (let y = GATE.springY; y <= GATE.bottom; y++) {
      p.rect(x - 2.5, y, 6, 1, Math.floor(y / 5) % 2 ? '#3a2e48' : '#302640');
      if (y % 5 === 0) p.rect(x - 2.5, y, 6, 1, '#0c0812');
    }
  }
  // 횃불 받침
  for (const t of GATE_TORCHES) {
    p.rect(t.x - 1, t.y, 3, 10, '#0c0812');
    p.rect(t.x - 3, t.y, 7, 2, '#2a2236');
    p.rect(t.x - 2, t.y - 4, 5, 4, '#2a2236');
  }
  // 돌계단(아래로 갈수록 넓다)
  for (let i = 0; i < 4; i++) {
    const y = LG + i * 6;
    const half = 60 + i * 26;
    p.rect(GATE.cx - half, y, half * 2, 6, i % 2 ? '#2a2236' : '#241e30');
    p.rect(GATE.cx - half, y, half * 2, 1, '#4a3e5c');
    p.rect(GATE.cx - half, y + 5, half * 2, 1, '#120d1a');
  }
  p.vgrad(0, LG + 24, LW, LH - LG - 24, ['#120d1a', '#0a0710']);
  for (let x = 0; x < LW; x++) if (Math.abs(x - GATE.cx) > 60 + 26 * 3) p.rect(x, LG, 1, 24, '#0e0a14');
}

/** 성문 문짝 한쪽(왼쪽 'l' / 오른쪽 'r'). 아치 반쪽 모양, 세로 널판과 쇠띠 */
export function paintGateDoor(p: Px, side: 'l' | 'r') {
  const x0 = side === 'l' ? GATE.cx - GATE.halfW : GATE.cx;
  for (let y = 0; y < p.h; y++) {
    for (let x = 0; x < p.w; x++) {
      const gx = x0 + x;
      const gy = GATE.top + y;
      if (!insideArch(gx, gy)) continue;
      const plank = Math.floor(x / 6);
      let c = plank % 2 ? '#3e2618' : '#4a2e1e';
      if (x % 6 === 0) c = '#22140e';
      if (bayer(gx, gy) < 0.12) c = '#5a3a26';
      p.dot(x, y, c);
    }
  }
  // 쇠띠와 못
  for (const by of [24, 52, 80]) {
    for (let x = 0; x < p.w; x++) {
      if (!insideArch(x0 + x, GATE.top + by)) continue;
      p.dot(x, by, '#2a2a34');
      p.dot(x, by + 1, '#3a3a46');
      p.dot(x, by + 2, '#1a1a22');
      if (x % 6 === 3) p.dot(x, by + 1, '#8a8a9a');
    }
  }
  // 가운데 이음매 쪽 테두리와 고리 손잡이
  const seam = side === 'l' ? p.w - 1 : 0;
  for (let y = 0; y < p.h; y++) if (insideArch(x0 + seam, GATE.top + y)) p.dot(seam, y, '#120a08');
  const hx = side === 'l' ? p.w - 6 : 5;
  p.disc(hx, 62, 3, '#6a6a7a');
  p.disc(hx, 62, 2, '#2a1810');
  p.dot(hx, 59, '#aaaabc');
}

/** 옅은 안개 띠(가로로 이어 붙여 흐르게 한다) */
export function paintFog(p: Px) {
  for (let y = 0; y < p.h; y++) {
    const v = Math.sin((Math.PI * y) / p.h);
    for (let x = 0; x < p.w; x++) {
      // 가로로 이어 붙여도 이음매가 보이지 않게 폭 안에서 딱 맞게 반복되는 물결만 쓴다
      const a = (x / p.w) * Math.PI * 2;
      const n = 0.5 + 0.3 * Math.sin(a * 2) + 0.2 * Math.sin(a * 5 + 1);
      if (bayer(x, y) < v * n * 0.6) p.dot(x, y, '#c9b8dc');
    }
  }
}
