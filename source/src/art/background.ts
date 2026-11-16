import Phaser from 'phaser';
import { PLAY_HEIGHT, WIDTH } from '../config';

// 배경과 효과용 그림을 코드로 만든다.
// - bg_kitchen: 밤의 마녀 부엌(절반 해상도 384×320으로 그려서 2배로 키운다 → 픽셀 느낌)
// - vignette: 화면 가장자리를 은은하게 어둡게
// - glow: 불꽃 주변 불빛(가운데가 밝고 바깥으로 사라지는 원)
// - spark, dust: 반짝이 가루와 먼지 입자
// - heart, heart_empty: HUD 생명 아이콘
// - ladder_rail, ladder_rung: 나무 사다리 조각

const HW = WIDTH / 2; // 384
const HH = PLAY_HEIGHT / 2; // 320

/** 같은 결과가 나오는 간단한 난수(배경 별·병 배치용) */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

type G = Phaser.GameObjects.Graphics;

function px(g: G, color: number, x: number, y: number, w = 1, h = 1, alpha = 1) {
  g.fillStyle(color, alpha).fillRect(x, y, w, h);
}

function drawKitchen(g: G) {
  const rand = seeded(7);

  // 벽지: 세로 줄무늬
  px(g, 0x3a2c40, 0, 0, HW, HH);
  for (let x = 0; x < HW; x += 16) px(g, 0x3f3046, x, 0, 8, HH);
  // 줄무늬 사이 작은 꽃무늬 점
  for (let y = 6; y < HH - 60; y += 20) for (let x = 12; x < HW; x += 16) px(g, 0x4a3952, x + ((y / 20) % 2) * 0, y, 1, 1);

  // 위쪽 몰딩
  px(g, 0x2b1d2f, 0, 0, HW, 3);
  px(g, 0x5e4a66, 0, 3, HW, 1);

  // 창문 두 개(달과 별이 보이는 밤하늘)
  for (const [wx, moon] of [
    [40, true],
    [300, false],
  ] as const) {
    const wy = 10;
    const w = 44;
    const h = 46;
    px(g, 0x6b4a2e, wx - 3, wy - 3, w + 6, h + 6); // 나무 틀
    px(g, 0x8a5f3a, wx - 3, wy - 3, w + 6, 2);
    px(g, 0x1d2340, wx, wy, w, h); // 밤하늘
    px(g, 0x262c52, wx, wy + h - 14, w, 14); // 아래로 갈수록 밝게
    for (let i = 0; i < 9; i++) px(g, 0xfff4c2, wx + 2 + Math.floor(rand() * (w - 4)), wy + 2 + Math.floor(rand() * (h - 18)), 1, 1);
    if (moon) {
      g.fillStyle(0xfff4c2).fillCircle(wx + 30, wy + 14, 7);
      g.fillStyle(0x1d2340).fillCircle(wx + 33, wy + 12, 6); // 초승달
    }
    px(g, 0x6b4a2e, wx + w / 2 - 1, wy, 2, h); // 창살
    px(g, 0x6b4a2e, wx, wy + h / 2 - 1, w, 2);
    px(g, 0x8a5f3a, wx - 5, wy + h + 3, w + 10, 3); // 창턱
    // 창턱 위 화분
    px(g, 0xb86b4b, wx + 4, wy + h - 3, 6, 6);
    px(g, 0x6fae5f, wx + 3, wy + h - 8, 8, 5);
  }

  // 선반과 병·항아리
  const shelf = (sx: number, sy: number, w: number) => {
    px(g, 0x6b4a2e, sx, sy, w, 3);
    px(g, 0x8a5f3a, sx, sy, w, 1);
    px(g, 0x4a3326, sx + 3, sy + 3, 2, 5); // 받침
    px(g, 0x4a3326, sx + w - 5, sy + 3, 2, 5);
    const jarColors = [0xd98aa6, 0x8fbfd8, 0xd9c27a, 0x9fd38a, 0xc99be0];
    let x = sx + 4;
    while (x < sx + w - 10) {
      const jw = 6 + Math.floor(rand() * 5);
      const jh = 8 + Math.floor(rand() * 8);
      const c = jarColors[Math.floor(rand() * jarColors.length)];
      px(g, 0x2b1d2f, x - 1, sy - jh - 1, jw + 2, jh + 1); // 외곽
      px(g, c, x, sy - jh, jw, jh, 0.55); // 유리병(반투명)
      px(g, 0x6b4a2e, x, sy - jh - 3, jw, 3); // 뚜껑
      px(g, 0xffffff, x + 1, sy - jh + 1, 1, 3, 0.4); // 반짝
      x += jw + 3 + Math.floor(rand() * 3);
    }
  };
  shelf(130, 96, 96);
  shelf(18, 216, 80);
  shelf(250, 156, 86);

  // 걸려 있는 조리도구(프라이팬, 국자, 뒤집개)
  const hookY = 128;
  px(g, 0x5e4a66, 296, hookY, 70, 2); // 걸이 막대
  // 프라이팬
  px(g, 0x7a7f8c, 302, hookY + 2, 1, 6);
  g.fillStyle(0x2b1d2f).fillCircle(303, hookY + 16, 9);
  g.fillStyle(0x4a4f5c).fillCircle(303, hookY + 16, 7);
  px(g, 0x8a8f9c, 299, hookY + 11, 3, 1);
  // 국자
  px(g, 0xaeb9c8, 322, hookY + 2, 1, 16);
  g.fillStyle(0xaeb9c8).fillCircle(322, hookY + 21, 4);
  // 뒤집개
  px(g, 0x8a5f3a, 340, hookY + 2, 1, 14);
  px(g, 0xaeb9c8, 337, hookY + 16, 7, 8);
  // 거품기
  px(g, 0x8a5f3a, 356, hookY + 2, 1, 10);
  g.lineStyle(1, 0xaeb9c8).strokeEllipse(356, hookY + 19, 6, 12);

  // 걸려 있는 마늘·고추 줄
  for (let i = 0; i < 5; i++) {
    px(g, 0xf3e0b5, 104, 160 + i * 5, 4, 4);
    px(g, 0xd65a5a, 112, 162 + i * 5, 3, 4);
  }
  px(g, 0x8a5f3a, 107, 156, 8, 2);

  // 아래쪽 벽 타일(체크무늬)
  const tileTop = HH - 60;
  px(g, 0x5e4a66, 0, tileTop - 2, HW, 2);
  for (let y = tileTop; y < HH; y += 8) {
    for (let x = 0; x < HW; x += 8) {
      const odd = ((x + y) / 8) % 2 === 1;
      px(g, odd ? 0x4a3a52 : 0x433449, x, y, 8, 8);
      px(g, 0x3a2c40, x, y, 8, 1);
    }
  }

  // 가마솥(마녀 부엌답게) - 아래 왼쪽. 시작 위치(오른쪽)와 겹치지 않게, 배경이라 흐리게
  const cx = 150;
  g.fillStyle(0x2b1d2f, 0.7).fillEllipse(cx, HH - 22, 40, 26);
  g.fillStyle(0x3b3340, 0.7).fillEllipse(cx, HH - 23, 36, 22);
  g.fillStyle(0x7cd67a, 0.45).fillEllipse(cx, HH - 32, 30, 6); // 초록 수프
  g.fillStyle(0xbff2a0, 0.45).fillCircle(cx - 6, HH - 36, 2).fillCircle(cx + 6, HH - 38, 1.5);
}

function radialCanvas(scene: Phaser.Scene, key: string, w: number, h: number, stops: [number, string][]) {
  if (scene.textures.exists(key)) return;
  const tex = scene.textures.createCanvas(key, w, h);
  if (!tex) return;
  const ctx = tex.getContext();
  const r = Math.max(w, h) / 2;
  const grad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, r);
  for (const [at, color] of stops) grad.addColorStop(at, color);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  tex.refresh();
}

function pixelTexture(scene: Phaser.Scene, key: string, w: number, h: number, paint: (g: G) => void) {
  if (scene.textures.exists(key)) return;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  paint(g);
  g.generateTexture(key, w, h);
  g.destroy();
}

// ───────────────────────── 발판 블록(16×16을 2배로) ─────────────────────────

/** 나무 조리대. variant 0: 기본, 1: 옹이, 2: 밀가루 자국 */
function woodBlock(g: G, variant: number) {
  px(g, 0xd9a066, 0, 0, 16, 16);
  px(g, 0xf0cc98, 0, 0, 16, 2); // 윗면
  px(g, 0xfff0d0, 0, 0, 16, 1);
  px(g, 0xc48a52, 0, 2, 16, 1);
  // 판자 줄과 이음새(판자마다 위치를 엇갈리게)
  px(g, 0xa8703c, 0, 7, 16, 1);
  px(g, 0xa8703c, 0, 12, 16, 1);
  px(g, 0xa8703c, 5, 3, 1, 4);
  px(g, 0xa8703c, 11, 8, 1, 4);
  px(g, 0xa8703c, 3, 13, 1, 3);
  // 나뭇결
  px(g, 0xc99058, 8, 5, 3, 1);
  px(g, 0xc99058, 2, 10, 4, 1);
  px(g, 0xc99058, 9, 14, 3, 1);
  px(g, 0x8a5a32, 0, 15, 16, 1); // 아랫면
  if (variant === 1) {
    // 옹이
    px(g, 0x8a5a32, 12, 4, 3, 2);
    px(g, 0xb07a48, 13, 4, 1, 1);
    px(g, 0x8a5a32, 4, 9, 2, 2);
  }
  if (variant === 2) {
    // 윗면에 흩뿌린 밀가루
    for (const [x, y] of [
      [2, 0],
      [3, 1],
      [6, 0],
      [9, 1],
      [10, 0],
      [13, 1],
    ])
      px(g, 0xffffff, x, y, 1, 1);
    px(g, 0xfff8f0, 7, 3, 2, 1, 0.6);
  }
}

/** 분홍·흰 타일을 깐 조리대 */
function tileBlock(g: G) {
  px(g, 0xd9a066, 0, 0, 16, 16);
  for (let y = 0; y < 6; y += 3) {
    for (let x = 0; x < 16; x += 4) {
      const pink = ((x / 4 + y / 3) % 2) === 1;
      px(g, pink ? 0xf4b8c8 : 0xfff4f0, x, y, 4, 3);
      px(g, 0xd9a6b4, x, y, 1, 3);
    }
    px(g, 0xd9a6b4, 0, y + 2, 16, 1);
  }
  px(g, 0xffffff, 0, 0, 16, 1);
  px(g, 0x8a5a32, 0, 6, 16, 1);
  px(g, 0xa8703c, 0, 11, 16, 1);
  px(g, 0xa8703c, 7, 7, 1, 4);
  px(g, 0xa8703c, 12, 12, 1, 3);
  px(g, 0x8a5a32, 0, 15, 16, 1);
}

/** 맨 아래 부엌 바닥 타일. variant 1은 작은 얼룩 */
function floorBlock(g: G, variant: number) {
  for (let y = 0; y < 16; y += 8) {
    for (let x = 0; x < 16; x += 8) {
      const rose = ((x + y) / 8) % 2 === 1;
      px(g, rose ? 0xc98a9a : 0xead8c4, x, y, 8, 8);
      px(g, rose ? 0xb47584 : 0xd8c2ac, x, y + 7, 8, 1); // 타일 아래 그림자
      px(g, rose ? 0xdba0ae : 0xf8ecdc, x, y, 8, 1); // 타일 위 반짝
    }
  }
  px(g, 0x8a5a6a, 0, 0, 16, 1); // 바닥선
  if (variant === 1) px(g, 0xb47584, 3, 10, 2, 1, 0.7);
}

/** 발판 끝 마감(왼쪽 끝 기준. 오른쪽은 좌우 뒤집기) */
function capBlock(g: G) {
  px(g, 0x5e3a24, 0, 1, 1, 15);
  px(g, 0xfff0d0, 1, 0, 1, 2);
  px(g, 0x8a5a32, 1, 2, 1, 14, 0.6);
}

export function createBackgroundTextures(scene: Phaser.Scene) {
  pixelTexture(scene, 'blk_wood0', 16, 16, (g) => woodBlock(g, 0));
  pixelTexture(scene, 'blk_wood1', 16, 16, (g) => woodBlock(g, 1));
  pixelTexture(scene, 'blk_wood2', 16, 16, (g) => woodBlock(g, 2));
  pixelTexture(scene, 'blk_tile', 16, 16, tileBlock);
  pixelTexture(scene, 'blk_floor0', 16, 16, (g) => floorBlock(g, 0));
  pixelTexture(scene, 'blk_floor1', 16, 16, (g) => floorBlock(g, 1));
  pixelTexture(scene, 'blk_cap', 16, 16, capBlock);

  pixelTexture(scene, 'bg_kitchen', HW, HH, drawKitchen);

  // 가장자리 어둡게(가운데 투명 → 가장자리 어두운 보라)
  radialCanvas(scene, 'vignette', WIDTH, PLAY_HEIGHT, [
    [0.55, 'rgba(20,10,30,0)'],
    [1, 'rgba(20,10,30,0.55)'],
  ]);
  // 불빛
  radialCanvas(scene, 'glow', 64, 64, [
    [0, 'rgba(255,255,255,0.9)'],
    [0.35, 'rgba(255,255,255,0.35)'],
    [1, 'rgba(255,255,255,0)'],
  ]);

  // 입자: 반짝이(십자 별), 먼지(동그라미)
  pixelTexture(scene, 'spark', 5, 5, (g) => {
    px(g, 0xffffff, 2, 0, 1, 5);
    px(g, 0xffffff, 0, 2, 5, 1);
  });
  pixelTexture(scene, 'dust', 4, 4, (g) => {
    px(g, 0xffffff, 1, 0, 2, 4);
    px(g, 0xffffff, 0, 1, 4, 2);
  });

  // 하트(7×6 픽셀을 2배)
  const heart = (fill: number, shine: boolean) => (g: G) => {
    const rows = ['.kk.kk.', 'kffkffk', 'kfffffk', '.kfffk.', '..kfk..', '...k...'];
    rows.forEach((r, y) =>
      [...r].forEach((c, x) => {
        if (c === 'k') px(g, 0x2b1d2f, x * 2, y * 2, 2, 2);
        if (c === 'f') px(g, fill, x * 2, y * 2, 2, 2);
      }),
    );
    if (shine) px(g, 0xffffff, 2, 2, 2, 2);
  };
  pixelTexture(scene, 'heart', 14, 12, heart(0xff6f91, true));
  pixelTexture(scene, 'heart_empty', 14, 12, heart(0x4a3a52, false));

  // 사다리 조각: 기둥(4×8), 가로대(24×4)
  pixelTexture(scene, 'ladder_rail', 4, 8, (g) => {
    px(g, 0x2b1d2f, 0, 0, 4, 8);
    px(g, 0xc98b4b, 1, 0, 2, 8);
    px(g, 0xe8b070, 1, 0, 1, 8);
  });
  pixelTexture(scene, 'ladder_rung', 24, 4, (g) => {
    px(g, 0x2b1d2f, 0, 0, 24, 4);
    px(g, 0xc98b4b, 0, 1, 24, 2);
    px(g, 0xe8b070, 0, 1, 24, 1);
  });
}
