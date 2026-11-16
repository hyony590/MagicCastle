import Phaser from 'phaser';

// 프롤로그 배경을 그리는 픽셀 붓. 무대 크기의 절반 해상도 캔버스에 1px 단위로 그리고, 화면에서는 2배로 키운다.
// 그래서 배경 전체가 같은 픽셀 크기로 또렷하게 보인다. 그라데이션은 Bayer 디더링(옛날 게임식 점무늬)으로 잇는다.

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
/** 4×4 Bayer 행렬 값(0~1) */
export const bayer = (x: number, y: number) => (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16;

/** 시드가 같으면 늘 같은 순서로 나오는 난수 */
export function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Px {
  private ctx: CanvasRenderingContext2D;

  constructor(
    readonly w: number,
    readonly h: number,
    ctx: CanvasRenderingContext2D,
  ) {
    this.ctx = ctx;
    this.ctx.imageSmoothingEnabled = false;
  }

  rect(x: number, y: number, w: number, h: number, c: string) {
    const x0 = Math.round(x);
    const y0 = Math.round(y);
    const w0 = Math.round(w);
    const h0 = Math.round(h);
    if (w0 <= 0 || h0 <= 0) return;
    this.ctx.fillStyle = c;
    this.ctx.fillRect(x0, y0, w0, h0);
  }

  dot(x: number, y: number, c: string) {
    this.rect(x, y, 1, 1, c);
  }

  /** 세로 그라데이션: 색 목록을 위에서 아래로 디더링으로 잇는다. */
  vgrad(x0: number, y0: number, w: number, h: number, colors: string[]) {
    const n = colors.length - 1;
    for (let y = 0; y < h; y++) {
      const t = (y / Math.max(1, h - 1)) * n;
      const i = Math.min(Math.floor(t), n - 1);
      const f = t - i;
      // 같은 색이 이어지는 구간은 한 번에 칠한다
      let runStart = 0;
      let runColor = '';
      for (let x = 0; x <= w; x++) {
        const c = x === w ? '' : bayer(x0 + x, y0 + y) < f ? colors[i + 1] : colors[i];
        if (c !== runColor) {
          if (runColor) this.rect(x0 + runStart, y0 + y, x - runStart, 1, runColor);
          runStart = x;
          runColor = c;
        }
      }
    }
  }

  /** 점무늬로 엷게 칠한다(density 0~1) */
  dither(x0: number, y0: number, w: number, h: number, c: string, density: number) {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) if (bayer(x, y) < density) this.dot(x, y, c);
  }

  /** 꽉 찬 원 */
  disc(cx: number, cy: number, r: number, c: string) {
    for (let dy = -r; dy <= r; dy++) {
      const half = Math.floor(Math.sqrt(r * r - dy * dy) + 0.3);
      this.rect(cx - half, cy + dy, half * 2 + 1, 1, c);
    }
  }

  /** 가운데에서 바깥으로 엷어지는 점무늬 빛무리 */
  halo(cx: number, cy: number, r0: number, r1: number, c: string, density: number) {
    for (let y = Math.floor(cy - r1); y <= cy + r1; y++) {
      for (let x = Math.floor(cx - r1); x <= cx + r1; x++) {
        const d = Math.hypot(x - cx, y - cy);
        if (d < r0 || d > r1) continue;
        if (bayer(x, y) < density * (1 - (d - r0) / (r1 - r0))) this.dot(x, y, c);
      }
    }
  }

  /** 꼭짓점이 위에 있는 좌우 대칭 삼각형(지붕·첨탑) */
  tri(cx: number, topY: number, h: number, halfBase: number, c: string) {
    for (let r = 0; r < h; r++) {
      const half = Math.round((halfBase * (r + 1)) / h);
      this.rect(cx - half, topY + r, half * 2 + 1, 1, c);
    }
  }

  line(x0: number, y0: number, x1: number, y1: number, c: string) {
    let x = Math.round(x0);
    let y = Math.round(y0);
    const xe = Math.round(x1);
    const ye = Math.round(y1);
    const dx = Math.abs(xe - x);
    const dy = -Math.abs(ye - y);
    const sx = x < xe ? 1 : -1;
    const sy = y < ye ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.dot(x, y, c);
      if (x === xe && y === ye) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y += sy;
      }
    }
  }
}

/** key 텍스처가 없으면 w×h 캔버스를 만들어 paint로 그린다. */
export function paintTexture(scene: Phaser.Scene, key: string, w: number, h: number, paint: (p: Px) => void) {
  if (scene.textures.exists(key)) return;
  const tex = scene.textures.createCanvas(key, w, h);
  if (!tex) return;
  paint(new Px(w, h, tex.getContext()));
  tex.refresh();
}
