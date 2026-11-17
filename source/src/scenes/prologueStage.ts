import Phaser from 'phaser';
import { audio } from '../audio';
import type { PrologueCue, PrologueShot, PrologueStage } from '../story/prologue';
import {
  CASTLE_WINDOWS,
  GATE,
  GATE_TORCHES,
  HOUSES,
  LAMPS,
  LH,
  LW,
  VILLAGE_LIGHTS,
  houseChimney,
  houseWindows,
  lanternSpots,
  paintBallotBox,
  paintDeparture,
  paintFog,
  paintGate,
  paintGateDoor,
  paintTheatre,
  paintVillage,
} from './prologueBackdrops';
import { paintTexture } from './prologuePaint';

// 프롤로그 장면(무대). 화면마다 무대 하나를 새로 꾸미고, 비트의 cue에 맞춰 인물을 움직인다.
// 배경은 prologueBackdrops.ts가 절반 해상도로 그린 픽셀 그림을 2배로 깔고,
// 그 위에 불빛·연기·반딧불·박쥐·안개 같은 움직이는 것과 인물을 올린다.

/** 무대 위치·크기(화면 좌표). 무대 안의 좌표는 왼쪽 위가 (0, 0)이다. */
export const STAGE = { x: 24, y: 64, w: 720, h: 290 };
const W = STAGE.w;
const H = STAGE.h;
/** 인물이 서는 높이(흙길 위) */
const FEET = 268;
const OUTLINE = 0x2b1d2f;
const PARTY = [0xff7aa8, 0xffe08a, 0x8fc7e8, 0x9ad58b, 0xc99be0];

type Img = Phaser.GameObjects.Image;

// ───────────────────────── 픽셀 그림(인물·소품) ─────────────────────────
// 문자 하나가 픽셀 하나. '.' 투명, k 외곽선, b 몸(자동으로 왼쪽 L 밝게·오른쪽 B 어둡게), h 밝은 털, e 눈, p 볼, w 흰자, y 부리·발.

interface Art {
  rows: string[];
  palette: Record<string, string>;
  /** 몸에 명암과 볼터치를 자동으로 넣는다 */
  shade?: { blush: boolean };
}

// 촌장(부엉이). 평소 얼굴과 음흉한 얼굴은 눈·부리 주변 줄만 다르다.
const CHIEF_PALETTE = {
  k: '#2b1d2f',
  b: '#6b4a3a',
  B: '#4e3428',
  L: '#8a6450',
  h: '#c9a27a',
  w: '#fff4d0',
  e: '#2b1d2f',
  y: '#ffd65a',
};
const CHIEF_ROWS = [
  '..kk..........kk..',
  '..kbk........kbk..',
  '..kbbkkkkkkkkbbk..',
  '.kbbbbbbbbbbbbbbk.',
  'kbbbbbbbbbbbbbbbbk',
  'kbbkkkkbbbbkkkkbbk',
  'kbkwwwkbbbbkwwwkbk',
  'kbkwekkbbbbkwekkbk',
  'kbkwwwkbyybkwwwkbk',
  'kbbkkkbbyybbkkkbbk',
  'kbbbbbbbkkbbbbbbbk',
  'kbbbbbbbbbbbbbbbbk',
  'kbbbhhhhhhhhhhbbbk',
  'kbbhhbhhbhhbhhbbbk',
  'kbbbhhhhhhhhhhbbbk',
  'kbbhhbhhbhhbhhbbbk',
  'kbbbhhhhhhhhhhbbbk',
  '.kbbbbbbbbbbbbbbk.',
  '.kbbbbbbbbbbbbbbk.',
  '..kbbbbbbbbbbbbk..',
  '...kkbbbbbbbbkk...',
  '.....kyyk.kyyk....',
  '.....kkkk.kkkk....',
];
const CHIEF_SLY: Record<number, string> = {
  4: 'kbkkbbbbbbbbbbkkbk', // 눈썹 바깥쪽
  5: 'kbbbkkkkbbkkkkbbbk', // 눈썹이 가운데로 내려온다
  6: 'kbkkkkkbbbbkkkkkbk', // 무겁게 내려온 윗눈꺼풀
  7: 'kbkwwekbbbbkwwekbk', // 가는 눈, 눈동자는 오른쪽(모찌 쪽)
  8: 'kbbkkkkbyybkkkkbbk', // 아랫눈꺼풀
  9: 'kbbbbbbbyybbkbbbbk', // 비죽 올라간 입꼬리
  10: 'kbbbbbbbkkkkbbbbbk',
};
const CHIEF_SLY_ROWS = CHIEF_ROWS.map((r, y) => CHIEF_SLY[y] ?? r);
/** 그늘이 덮는 얼굴의 마지막 줄(부리 아래까지) */
const CHIEF_FACE_LAST_ROW = 10;

const ART: Record<string, Art> = {
  villager_bear: {
    shade: { blush: true },
    palette: { k: '#2b1d2f', b: '#a8724e', B: '#7e5236', L: '#c48a60', h: '#e8bc94', e: '#2b1d2f', p: '#f08a9a' },
    rows: [
      '..kkk......kkk..',
      '.kbbbk....kbbbk.',
      '.kbhhbkkkkbhhbk.',
      '..kbbbbbbbbbbk..',
      '.kbbbbbbbbbbbbk.',
      '.kbbebbbbbbebbk.',
      '.kbbbbbhhbbbbbk.',
      '.kbbbbhkkhbbbbk.',
      '..kbbbbhhbbbbk..',
      '...kbbbbbbbbk...',
      '..kbbbbbbbbbbk..',
      '.kbbbhhhhhhbbbk.',
      '.kbbhhhhhhhhbbk.',
      '.kbbhhhhhhhhbbk.',
      '.kbbbhhhhhhbbbk.',
      '..kbbbk..kbbbk..',
      '..kkkkk..kkkkk..',
    ],
  },
  villager_cat: {
    shade: { blush: true },
    palette: { k: '#2b1d2f', b: '#e8a05a', B: '#c07a3a', L: '#f6c080', h: '#fff0dc', e: '#2b1d2f', p: '#f08a9a' },
    rows: [
      '.k..........k.',
      '.kk........kk.',
      '.khk......khk.',
      '.khbkkkkkkbhk.',
      '.kbbbbbbbbbbk.',
      'kbbbbbbbbbbbbk',
      'kbbebbbbbbebbk',
      'kbbbbbbbbbbbbk',
      'kbbbbbkkbbbbbk',
      '.kbbbbbbbbbbk.',
      '..kbbbbbbbbk..',
      '.kbbbhhhhbbbk.',
      '.kbbhhhhhhbbk.',
      '.kbbhhhhhhbbk.',
      '.kbbbhhhhbbbk.',
      '.kbbbbbbbbbbk.',
      '..kbbk..kbbk..',
      '..kkkk..kkkk..',
    ],
  },
  villager_mouse: {
    shade: { blush: true },
    palette: { k: '#2b1d2f', b: '#a9a3b8', B: '#7f7890', L: '#c8c2d6', h: '#f4c6d0', e: '#2b1d2f', p: '#ff9fb0' },
    rows: [
      'kkk......kkk',
      'khhk....khhk',
      'khhbkkkkbhhk',
      '.kbbbbbbbbk.',
      'kbbbbbbbbbbk',
      'kbebbbbbbebk',
      'kbbbbbbbbbbk',
      'kbbbbkkbbbbk',
      '.kbbbbbbbbk.',
      '..kbbbbbbk..',
      '.kbbhhhhbbk.',
      '.kbhhhhhhbk.',
      '.kbbhhhhbbk.',
      '..kbk..kbk..',
      '..kkk..kkk..',
    ],
  },
  // 촌장: 나이 든 부엉이
  villager_chief: {
    shade: { blush: false },
    palette: CHIEF_PALETTE,
    rows: CHIEF_ROWS,
  },
  // 음흉한 촌장(cue 'chiefSinister'): 눈을 가늘게 뜨고 모찌 쪽(오른쪽)을 흘겨보며 부리 옆으로 비죽 웃는다.
  villager_chief_sly: {
    shade: { blush: false },
    palette: CHIEF_PALETTE,
    rows: CHIEF_SLY_ROWS,
  },
  // 음흉한 촌장 얼굴 그늘: 얼굴(머리~부리) 모양 그대로, 흰자만 빼고 덮는다. 흰자가 그늘 속에서 번뜩인다.
  villager_chief_sly_shade: {
    palette: { s: '#120818' },
    rows: CHIEF_SLY_ROWS.map((r, y) => (y <= CHIEF_FACE_LAST_ROW ? r.replace(/[^.w]/g, 's').replace(/w/g, '.') : '.'.repeat(r.length))),
  },
  // 모찌의 음식 상(분홍 식탁보를 덮은 작은 나무 탁자)
  pro_table: {
    palette: { k: '#2b1d2f', t: '#f4a6b8', T: '#d87d96', w: '#d9a066', W: '#a8703c', y: '#fff8f0' },
    rows: [
      '.kkkkkkkkkkkkkkkkkkkkkk.',
      'kttttttttttttttttttttttk',
      'ktytttytttytttytttytttyk',
      'kTTTTTTTTTTTTTTTTTTTTTTk',
      '.kTkkTkkTkkTkkTkkTkkTkk.',
      '..kwk..............kwk..',
      '..kwk..............kwk..',
      '..kWk..............kWk..',
      '..kkk..............kkk..',
    ],
  },
  pro_lantern: {
    palette: { k: '#2b1d2f', x: '#ff8a3d', X: '#d8602a', y: '#ffe08a', r: '#ee5d6c' },
    rows: ['..kk..', '.kkkk.', 'kyxxyk', 'kxyyxk', 'kXxxXk', 'kxyyxk', 'kyxxyk', '.kkkk.', '..rr..', '..r...'],
  },
  pro_bat1: {
    palette: { k: '#0c0812', r: '#ff5a6a' },
    rows: ['k.........k', 'kk.......kk', 'kkk.k.k.kkk', '.kkkkkkkkk.', '...krkrk...', '....k.k....'],
  },
  pro_bat2: {
    palette: { k: '#0c0812', r: '#ff5a6a' },
    rows: ['....k.k....', '...krkrk...', '.kkkkkkkkk.', 'kkk.....kkk', 'kk.......kk', 'k.........k'],
  },
};

/** b(몸)에 명암을 넣는다: 줄마다 오른쪽 두 칸은 그늘, 왼쪽 한 칸은 빛. 눈 아래 바깥쪽에 볼터치. */
function shadeRows(rows: string[], blush: boolean) {
  const grid = rows.map((r) => [...r]);
  for (const row of grid) {
    const idx = row.flatMap((c, i) => (c === 'b' ? [i] : []));
    if (!idx.length) continue;
    const first = idx[0];
    const last = idx[idx.length - 1];
    row[last] = 'B';
    if (last - 1 > first && row[last - 1] === 'b') row[last - 1] = 'B';
    if (row[first] === 'b') row[first] = 'L';
  }
  if (blush) {
    const width = grid[0].length;
    grid.forEach((row, y) =>
      row.forEach((c, x) => {
        if (c !== 'e' || !grid[y + 1]) return;
        const bx = x + (x < width / 2 ? -1 : 1);
        if ('bBL'.includes(grid[y + 1][bx])) grid[y + 1][bx] = 'p';
      }),
    );
  }
  return grid.map((r) => r.join(''));
}

/** 프롤로그 그림을 텍스처로 만든다(이미 있으면 건너뛴다). */
export function createPrologueTextures(scene: Phaser.Scene) {
  for (const [key, art] of Object.entries(ART)) {
    if (scene.textures.exists(key)) continue;
    const rows = art.shade ? shadeRows(art.rows, art.shade.blush) : art.rows;
    const width = Math.max(...rows.map((r) => r.length));
    scene.textures.generate(key, {
      data: rows.map((r) => r.padEnd(width, '.')),
      pixelWidth: 2,
      palette: art.palette as unknown as Phaser.Types.Create.Palette,
    });
  }
  paintTexture(scene, 'pro_bg_morning', LW, LH, (p) => paintVillage(p, 'morning'));
  paintTexture(scene, 'pro_bg_village', LW, LH, (p) => paintVillage(p, 'dusk'));
  paintTexture(scene, 'pro_bg_festival', LW, LH, (p) => paintVillage(p, 'night'));
  paintTexture(scene, 'pro_bg_gate', LW, LH, paintGate);
  const doorW = GATE.halfW + 1;
  const doorH = GATE.bottom - GATE.top + 1;
  paintTexture(scene, 'pro_gate_door_l', doorW, doorH, (p) => paintGateDoor(p, 'l'));
  paintTexture(scene, 'pro_gate_door_r', doorW, doorH, (p) => paintGateDoor(p, 'r'));
  paintTexture(scene, 'pro_bg_theatre', LW, LH, paintTheatre);
  paintTexture(scene, 'pro_bg_departure', LW, LH, paintDeparture);
  paintTexture(scene, 'pro_ballot', 30, 24, paintBallotBox);
  paintTexture(scene, 'pro_fog', LW, 24, paintFog);
}


// ───────────────────────── 무대 ─────────────────────────

const ADD = Phaser.BlendModes.ADD;
/** 성문 장면에서 모찌가 서는 높이(돌계단 위) */
const GATE_FEET = 256;

/** 인물이 (걸어가서) 설 자리. 카메라가 인물을 잡을 때 쓴다 */
interface Spot {
  x: number;
  feet: number;
  /** 그 자리에 섰을 때의 크기(등장 중에 작아져 있어도 이 크기로 잡는다) */
  scale?: number;
}

export class StageView {
  readonly root: Phaser.GameObjects.Container;
  private maskShape: Phaser.GameObjects.Graphics;
  private tweens: Phaser.Tweens.Tween[] = [];
  private timers: Phaser.Time.TimerEvent[] = [];
  private camTween?: Phaser.Tweens.Tween;
  /** 무대 위 인물·소품. cue가 움직인다. */
  private mochi?: Img;
  private mochiAt?: Spot;
  private mochiShadow?: Phaser.GameObjects.Ellipse;
  private chief?: Img;
  private chiefAt?: Spot;
  /** 음흉한 촌장 얼굴 그늘(cue 'chiefSinister' 동안만 있다) */
  private chiefShade?: Img;
  private crowd: Img[] = [];
  /** 첫 화면 주민 등장. animate가 false면 제자리에 바로 세운다 */
  private arrivals: ((animate: boolean) => void)[] = [];
  private bubble?: Phaser.GameObjects.Container;
  private dark?: Phaser.GameObjects.Rectangle;
  private watchers: Phaser.GameObjects.Container[] = [];
  private castleGlow: Img[] = [];
  /** 멈출 수 있는 반복 움직임(투표 하트, 손 흔들기 등) */
  private loops: Phaser.Tweens.Tween[] = [];
  /** 하트 주고받기 타이머(모두가 사랑한 모찌) */
  private exchange?: Phaser.Time.TimerEvent;
  private gate?: { left: Img; right: Img; seam: Phaser.GameObjects.Rectangle; floor: Img; inner: Img[]; torches: Img[] };
  private spot?: { dark: Phaser.GameObjects.Rectangle; beams: Img[] };
  /** 발표 직전 북 연타 타이머 */
  private roll?: Phaser.Time.TimerEvent;

  constructor(
    private scene: Phaser.Scene,
    kind: PrologueStage,
  ) {
    createPrologueTextures(scene);
    this.root = scene.add.container(STAGE.x, STAGE.y);
    this.maskShape = scene.make.graphics({}, false);
    this.maskShape.fillStyle(0xffffff).fillRoundedRect(STAGE.x, STAGE.y, STAGE.w, STAGE.h, 12);
    this.root.setMask(this.maskShape.createGeometryMask());
    const build: Record<PrologueStage, () => void> = {
      gate: () => this.gateScene(),
      village: () => this.village(),
      beloved: () => this.beloved(),
      festival: () => this.festival(),
      spotlight: () => this.spotlight(),
      celebration: () => this.celebration(),
      chief: () => this.chiefScene(),
      farewell: () => this.farewell(),
      departure: () => this.departure(),
    };
    build[kind]();
  }

  destroy() {
    this.tweens.forEach((t) => t.remove());
    this.timers.forEach((t) => t.remove());
    this.root.destroy();
    this.maskShape.destroy();
  }

  // ───────── 카메라 ─────────

  /** (fx, fy)를 무대 가운데에 두고 zoom배로 본다. 무대 밖이 보이지 않게 가장자리에서 멈춘다. */
  private camera(fx: number, fy: number, zoom: number, ms = 0, ease = 'Sine.inOut', delay = 0) {
    const z = Math.max(1, zoom);
    const x = Phaser.Math.Clamp(STAGE.x + W / 2 - fx * z, STAGE.x + W - W * z, STAGE.x);
    const y = Phaser.Math.Clamp(STAGE.y + H / 2 - fy * z, STAGE.y + H - H * z, STAGE.y);
    this.camTween?.remove();
    this.camTween = undefined;
    if (ms <= 0 && delay <= 0) {
      this.root.setPosition(x, y).setScale(z);
      return;
    }
    this.camTween = this.tw({ targets: this.root, x, y, scale: z, duration: Math.max(1, ms), ease, delay });
  }

  /** 인물을 크게 잡을 때의 초점과 배율: 키가 무대 높이의 60%쯤 되게 */
  private focusOf(o: Img, at?: Spot) {
    const h = o.height * (at?.scale ?? Math.abs(o.scaleX));
    return { x: at?.x ?? o.x, y: (at?.feet ?? o.y) - h * 0.55, zoom: Phaser.Math.Clamp((H * 0.6) / h, 1.6, 2.4) };
  }

  /** 비트의 카메라 구도. animate가 false면 바로 그 구도로 */
  shot(name: PrologueShot, animate: boolean) {
    const ms = (n: number) => (animate ? n : 0);
    const m = this.mochi ? this.focusOf(this.mochi, this.mochiAt) : undefined;
    switch (name) {
      case 'wide':
        return this.camera(W / 2, H / 2, 1, ms(900));
      case 'crane':
        // 하늘에서 내려온다
        if (animate) this.camera(W / 2, 0, 1.35);
        return this.camera(W / 2, H / 2, 1, ms(4200), 'Sine.inOut', animate ? 200 : 0);
      case 'sky':
        return this.camera(W / 2, 0, 1.4, ms(2800));
      case 'pushIn':
        return this.camera(W * 0.56, H * 0.5, 1.15, ms(9000), 'Sine.out');
      case 'reveal': {
        // 모찌 뒷모습에서 시작해 물러나며 성문 전체를 드러낸다
        if (animate && m) this.camera(m.x, m.y + 6, 2.6);
        return this.camera(W / 2, H / 2, 1, ms(4600), 'Sine.inOut', animate ? 500 : 0);
      }
      case 'gateDoor':
        return this.camera(W / 2, 150, 1.6, ms(2600));
      case 'closeMochi':
        if (m) this.camera(m.x, m.y, m.zoom, ms(800), 'Cubic.out');
        return;
      case 'closeChief': {
        if (!this.chief) return;
        const c = this.chief;
        const h = c.height * Math.abs(c.scaleX);
        return this.camera(this.chiefAt?.x ?? c.x, (this.chiefAt?.feet ?? c.y) - h * 0.74, 2.7, ms(1400), 'Cubic.inOut');
      }
      case 'twoShot': {
        if (!this.mochi || !this.chief) return;
        const mx = this.mochiAt?.x ?? this.mochi.x;
        const cx = this.chiefAt?.x ?? this.chief.x;
        const feet = this.mochiAt?.feet ?? this.mochi.y;
        const zoom = Phaser.Math.Clamp((W * 0.8) / (Math.abs(mx - cx) + 180), 1.2, 2.2);
        return this.camera((mx + cx) / 2, feet - 60, zoom, ms(1000));
      }
      case 'whisper': {
        const [a, b] = [this.crowd[1], this.crowd[2]];
        if (!a || !b) return;
        return this.camera((a.x + b.x) / 2, FEET - 40, 2.4, ms(900), 'Cubic.out');
      }
      case 'ballot':
        return this.camera(326, 214, 1.7, ms(1200));
      case 'followChief': {
        const c = this.chiefAt;
        if (!c) return;
        return this.camera(c.x - 30, c.feet - 64, 1.45, ms(2000), 'Sine.out');
      }
      case 'crowd':
        return this.camera(200, 214, 1.7, ms(1800));
    }
  }

  // ───────── 공통 ─────────

  private add<T extends Phaser.GameObjects.GameObject>(obj: T): T {
    this.root.add(obj);
    return obj;
  }

  private img(x: number, y: number, key: string, scale = 1): Img {
    return this.add(this.scene.add.image(x, y, key).setScale(scale));
  }

  private backdrop(key: string) {
    this.img(0, 0, key, 2).setOrigin(0, 0);
  }

  private tw(config: Phaser.Types.Tweens.TweenBuilderConfig) {
    const t = this.scene.tweens.add(config);
    this.tweens.push(t);
    return t;
  }

  private every(delay: number, callback: () => void) {
    const t = this.scene.time.addEvent({ delay, loop: true, callback });
    this.timers.push(t);
    return t;
  }

  /** ms 뒤에 한 번. 무대가 사라지면 함께 취소된다 */
  private later(delay: number, callback: () => void) {
    this.timers.push(this.scene.time.delayedCall(delay, callback));
  }

  /** 무대 전체를 덮는 어둠(처음엔 투명). 위에 보일 것들은 나중에 bringToTop 한다 */
  private overlay(color = 0x07040c) {
    return this.add(this.scene.add.rectangle(0, 0, W, H, color, 1).setOrigin(0, 0).setAlpha(0));
  }

  /** 모찌가 콩콩 걸어간다(걷는 그림을 번갈아). 다 걸으면 onDone */
  private walk(m: Img, to: number, opts: { shadow?: Phaser.GameObjects.Ellipse; delay?: number; speed?: number; onDone?: () => void } = {}) {
    const dur = Math.max(1, Math.abs(to - m.x) * (opts.speed ?? 7));
    const delay = opts.delay ?? 0;
    let steps: Phaser.Time.TimerEvent | undefined;
    this.tw({
      targets: opts.shadow ? [m, opts.shadow] : m,
      x: to,
      duration: dur,
      delay,
      onStart: () => {
        m.setFlipX(to < m.x).setTexture('mochi_walk1');
        steps = this.every(170, () => m.setTexture(m.texture.key === 'mochi_walk1' ? 'mochi_walk2' : 'mochi_walk1'));
      },
      onComplete: () => {
        steps?.remove();
        opts.onDone?.();
      },
    });
    this.tw({ targets: m, y: m.y - 4, duration: 170, yoyo: true, repeat: Math.max(0, Math.round(dur / 340) - 1), delay });
  }

  /** 반짝이는 별(그림 속 별 위에 몇 개만 더 반짝인다) */
  private twinkles(n: number, maxY: number, tint = 0xffffff) {
    for (let i = 0; i < n; i++) {
      const x = Phaser.Math.Between(4, LW - 4) * 2;
      const y = Phaser.Math.Between(2, maxY / 2) * 2;
      const s = this.img(x, y, 'spark').setAlpha(0).setTint(tint);
      this.tw({ targets: s, alpha: 0.9, duration: Phaser.Math.Between(600, 1200), yoyo: true, repeat: -1, delay: Phaser.Math.Between(0, 3000) });
    }
  }

  /** 불빛 무리(그림 속 불빛 위에 겹쳐 은은하게 일렁인다). x·y는 절반 해상도 좌표 */
  private glow(lx: number, ly: number, tint: number, scale: number, alpha: number, flicker = true) {
    const gl = this.img(lx * 2, ly * 2, 'glow', scale).setTint(tint).setAlpha(alpha).setBlendMode(ADD);
    if (flicker) this.tw({ targets: gl, alpha: alpha * 0.6, duration: Phaser.Math.Between(500, 1100), yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    return gl;
  }

  /** 마을 그림에 맞춘 창·가로등 불빛과 굴뚝 연기. 낮에는 불을 끈다 */
  private villageLife(time: 'day' | 'dusk' | 'night') {
    for (const h of HOUSES) {
      if (time !== 'day') for (const w of houseWindows(h)) this.glow(w.x + 2.5, w.y + 2.5, 0xffb060, 0.8, time === 'night' ? 0.6 : 0.4);
      const ch = houseChimney(h);
      for (let i = 0; i < 4; i++) {
        const p = this.img(ch.x * 2, ch.y * 2, 'dust', 2).setAlpha(0).setTint(time === 'night' ? 0x8a7aa8 : time === 'day' ? 0xffffff : 0xf0dcea);
        this.tw({
          targets: p,
          y: ch.y * 2 - 46,
          x: ch.x * 2 + Phaser.Math.Between(6, 18),
          scale: 3.2,
          alpha: { from: 0.55, to: 0 },
          duration: 2600,
          repeat: -1,
          delay: i * 650,
        });
      }
    }
    if (time === 'day') return;
    for (const x of LAMPS) this.glow(x, 119 - 20, 0xffd080, 1.4, time === 'night' ? 0.7 : 0.45);
    this.fireflies(time === 'night' ? 10 : 5);
  }

  private fireflies(n: number) {
    for (let i = 0; i < n; i++) {
      const x = Phaser.Math.Between(20, W - 20);
      const y = Phaser.Math.Between(170, 270);
      const f = this.add(this.scene.add.rectangle(x, y, 2, 2, 0xfff4a0).setAlpha(0));
      const g = this.img(x, y, 'glow', 0.3).setTint(0xfff080).setBlendMode(ADD).setAlpha(0);
      const dur = Phaser.Math.Between(2400, 4200);
      const dx = Phaser.Math.Between(-40, 40);
      const dy = Phaser.Math.Between(-30, 10);
      for (const o of [f, g]) {
        this.tw({ targets: o, x: x + dx, y: y + dy, duration: dur, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
        this.tw({ targets: o, alpha: o === f ? 1 : 0.6, duration: 700, yoyo: true, repeat: -1, delay: Phaser.Math.Between(0, 2000), hold: 400 });
      }
    }
  }

  private lanterns() {
    for (const s of lanternSpots()) {
      const l = this.img(s.x * 2, s.y * 2, 'pro_lantern', 2).setOrigin(0.5, 0);
      this.glow(s.x, s.y + 8, 0xffa050, 1.5, 0.65);
      this.tw({ targets: l, angle: { from: -7, to: 7 }, duration: 1300 + s.x * 2, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    }
  }

  private confetti(n: number) {
    for (let i = 0; i < n; i++) {
      const x = Phaser.Math.Between(0, W / 2) * 2;
      const c = this.add(this.scene.add.rectangle(x, -10, 4, 4, PARTY[i % PARTY.length]));
      this.tw({
        targets: c,
        y: H + 10,
        x: x + Phaser.Math.Between(-40, 40),
        scaleX: { from: 1, to: 0.3 },
        duration: Phaser.Math.Between(3200, 5200),
        repeat: -1,
        delay: Phaser.Math.Between(0, 4000),
      });
    }
  }

  private fog(rows: [number, number, number][]) {
    for (const [y, alpha, ms] of rows) {
      const fog = this.add(this.scene.add.tileSprite(0, y, W, 48, 'pro_fog').setOrigin(0, 0).setTileScale(2).setAlpha(alpha));
      this.tw({ targets: fog, tilePositionX: LW, duration: ms, repeat: -1 });
    }
  }

  private bats(n: number, x0: number, y0: number) {
    for (let i = 0; i < n; i++) {
      const b = this.img(x0 + i * 40, y0 + i * 16, 'pro_bat1', 2).setAlpha(0.9);
      this.every(140 + i * 20, () => b.setTexture(b.texture.key === 'pro_bat1' ? 'pro_bat2' : 'pro_bat1'));
      this.tw({ targets: b, x: b.x + Phaser.Math.Between(80, 130), duration: 3000 + i * 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      this.tw({ targets: b, y: b.y + Phaser.Math.Between(20, 40), duration: 1700 + i * 300, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    }
  }

  private breathe(v: Img, scale: number, amount = 1.05) {
    this.tw({ targets: v, scaleY: scale * amount, duration: Phaser.Math.Between(500, 800), yoyo: true, repeat: -1, ease: 'Sine.inOut' });
  }

  /** 주민 한 명. 가만히 있을 때도 숨 쉬듯 들썩인다 */
  private villager(x: number, key: string, flip = false, feet = FEET, scale = 2): Img {
    const v = this.img(x, feet, key, scale).setOrigin(0.5, 1).setFlipX(flip);
    this.shadow(x, feet, v.displayWidth * 0.8);
    this.breathe(v, scale);
    return v;
  }

  private shadow(x: number, feet: number, w: number) {
    return this.add(this.scene.add.ellipse(x, feet - 1, w, 8, 0x1b1220, 0.45));
  }

  /** 모찌를 무대에 세운다 */
  private placeMochi(x: number, feet: number, key: string, scale = 2, visible = true) {
    this.mochiShadow = this.shadow(x, feet, 25 * scale).setAlpha(visible ? 1 : 0);
    this.mochi = this.img(x, feet, key, scale).setOrigin(0.5, 1).setAlpha(visible ? 1 : 0);
    this.mochiAt = { x, feet, scale };
    return this.mochi;
  }

  /** 하트가 포물선을 그리며 날아가 톡 터진다 */
  private flyHeart(x1: number, y1: number, x2: number, y2: number, onArrive?: () => void, delay = 0) {
    const h = this.img(x1, y1, 'heart', 2).setAlpha(0);
    const path = { t: 0 };
    this.tw({
      targets: path,
      t: 1,
      duration: 750,
      delay,
      ease: 'Sine.inOut',
      onStart: () => h.setAlpha(1),
      onUpdate: () => h.setPosition(x1 + (x2 - x1) * path.t, y1 + (y2 - y1) * path.t - Math.sin(Math.PI * path.t) * 46),
      onComplete: () => {
        this.tw({ targets: h, scale: 3.2, alpha: 0, duration: 220, onComplete: () => h.destroy() });
        onArrive?.();
      },
    });
  }

  /** 인물 머리 위로 하트가 톡 떠오른다 */
  private popHeart(v: Img, delay = 0) {
    const h = this.img(v.x, v.y - v.displayHeight, 'heart', 2).setAlpha(0);
    this.tw({ targets: h, y: h.y - 34, alpha: { from: 1, to: 0 }, duration: 900, delay });
  }

  // ───────── 화면별 무대 ─────────

  /** 마녀의 성문 앞(첫 장면과 마지막 장면). 문짝은 cue 'gateOpens'에서 열린다 */
  private gateScene() {
    this.backdrop('pro_bg_gate');
    this.twinkles(8, 40, 0xd8c8ff);
    const g = GATE;
    // 문 안쪽 빛(문이 열리면 밝아진다)
    const inner = [
      this.img(g.cx * 2, g.bottom * 2 - 30, 'glow', 3.4).setTint(0x6aff7a).setBlendMode(ADD).setAlpha(0),
      this.img(g.cx * 2, g.bottom * 2 - 110, 'glow', 2.4).setTint(0xc8ffc0).setBlendMode(ADD).setAlpha(0),
    ];
    const left = this.img((g.cx - g.halfW) * 2, g.top * 2, 'pro_gate_door_l', 2).setOrigin(0, 0);
    const right = this.img((g.cx + g.halfW + 1) * 2, g.top * 2, 'pro_gate_door_r', 2).setOrigin(1, 0);
    // 문틈과 문 아래로 새는 초록 빛(cue 'gateGlow')
    const seamTop = (g.springY - g.halfW) * 2 + 6;
    const seam = this.add(this.scene.add.rectangle(g.cx * 2 + 1, seamTop, 3, g.bottom * 2 - seamTop, 0x9aff9a).setOrigin(0.5, 0).setBlendMode(ADD).setAlpha(0));
    const floor = this.img(g.cx * 2, g.bottom * 2 + 2, 'glow', 1.6).setTint(0x7aff8a).setBlendMode(ADD).setScale(2.6, 0.5).setAlpha(0);
    // 초록 횃불
    const torches: Img[] = [];
    for (const t of GATE_TORCHES) {
      torches.push(this.glow(t.x + 0.5, t.y - 6, 0x7aff8a, 1.2, 0.55));
      const f = this.img(t.x * 2 + 1, t.y * 2 - 6, 'flame1', 1.2).setOrigin(0.5, 1).setTint(0xa8ffb0);
      this.every(150, () => f.setTexture(f.texture.key === 'flame1' ? 'flame2' : 'flame1'));
    }
    this.bats(2, 520, 30);
    this.fog([
      [196, 0.22, 24000],
      [236, 0.3, 15000],
    ]);
    // 모찌 뒷모습
    const m = this.placeMochi(W / 2, GATE_FEET, 'mochi_climb');
    this.breathe(m, 2, 1.03);
    this.gate = { left, right, seam, floor, inner, torches };
    this.add(this.scene.add.image(0, 0, 'vignette').setOrigin(0, 0).setDisplaySize(W, H));
  }

  /** 아침의 마을. 주민들이 한두 명씩 나오고(cue 'villagersArrive'), 모찌가 집에서 나와 인사한다(cue 'mochiGreets') */
  private village() {
    this.backdrop('pro_bg_morning');
    this.villageLife('day');
    this.prepareArrivals();
    const door = (HOUSES[2].x + HOUSES[2].w / 2) * 2;
    this.placeMochi(door, FEET, 'mochi_walk1', 2, false);
    this.mochiAt = { x: 390, feet: FEET, scale: 2 };
  }

  /** 주민들이 집 문에서 나오거나 길 끝에서 걸어 들어와 한두 명씩 자리를 잡는다(cue 'villagersArrive'). */
  private prepareArrivals() {
    const door = (i: number) => (HOUSES[i].x + HOUSES[i].w / 2) * 2;
    // [나오는 곳 x, 설 곳 x, 그림, 나오기 시작하는 시각(ms), 집 문에서 나오는지]
    const plan: [number, number, string, number, boolean][] = [
      [door(0), 128, 'villager_bear', 300, true],
      [door(3), 600, 'villager_mouse', 1500, true],
      [W + 30, 528, 'villager_cat', 1700, false],
      [door(1), 252, 'villager_cat', 2900, true],
      [-30, 320, 'villager_mouse', 4100, false],
      [door(2), 456, 'villager_bear', 4300, true],
    ];
    const SCALE = 2;
    const STEP = FEET - 22; // 문턱 높이: 문에서 나와 길로 내려선다

    this.arrivals = plan.map(([from, to, key, at, fromDoor]) => {
      const v = this.img(from, FEET, key, SCALE).setOrigin(0.5, 1).setAlpha(0);
      this.crowd.push(v);
      const sh = this.add(this.scene.add.ellipse(from, FEET - 1, v.displayWidth * 0.8, 8, 0x1b1220, 0.45).setAlpha(0));
      // 다 모이면 마을 가운데를 바라본다. 그림은 기본이 오른쪽을 본다.
      const settle = (animate: boolean) => {
        v.setFlipX(to > W / 2);
        this.breathe(v, SCALE);
        if (animate) this.popHeart(v);
      };

      return (animate: boolean) => {
        if (!animate) {
          v.setX(to).setAlpha(1);
          sh.setX(to).setAlpha(1);
          settle(false);
          return;
        }
        // 1) 등장: 문에서는 작게 나타나 길로 내려서고, 길 끝에서는 화면 밖에서 바로 걷기 시작한다.
        let walkAt = at;
        if (fromDoor) {
          v.setY(STEP).setScale(SCALE * 0.8);
          this.tw({ targets: v, alpha: 1, y: FEET, scale: SCALE, duration: 450, delay: at, ease: 'Sine.out' });
          this.tw({ targets: sh, alpha: 1, duration: 450, delay: at });
          walkAt += 450;
        } else {
          v.setAlpha(1);
          sh.setAlpha(1);
        }
        // 2) 걷기: 콩콩 뛰듯 걸어 제자리로
        v.setFlipX(to < from);
        const dur = Math.abs(to - from) * 8; // 초당 약 125px
        this.tw({ targets: [v, sh], x: to, duration: dur, delay: walkAt, onComplete: () => settle(true) });
        this.tw({ targets: v, y: FEET - 5, duration: 130, yoyo: true, repeat: Math.max(0, Math.round(dur / 260) - 1), delay: walkAt, ease: 'Quad.out' });
      };
    });
  }

  /** 모두가 사랑한 모찌: 맑은 낮의 마을. 주민들이 차례로 모찌에게 하트를 보내고, 모찌도 하트를 돌려준다. */
  private beloved() {
    this.backdrop('pro_bg_morning');
    this.villageLife('day');
    this.glow(165, 108, 0xfff0c0, 2.6, 0.25);
    // 모찌의 음식 상과 케이크
    const tableX = 430;
    this.shadow(tableX, FEET, 100);
    this.img(tableX, FEET, 'pro_table', 2).setOrigin(0.5, 1);
    this.img(tableX, FEET - 30, 'cake', 1).setOrigin(0.5, 1);
    const mochi = this.placeMochi(330, FEET, 'mochi_happy');
    this.breathe(mochi, 2, 1.04);
    // 모찌를 둘러싼 주민들(모두 모찌 쪽을 본다). [1] 생쥐 콩이와 [2] 고양이 나비가 소곤거린다(cue 'whisper')
    const fans: [number, string, boolean][] = [
      [96, 'villager_bear', false],
      [176, 'villager_mouse', false],
      [250, 'villager_cat', false],
      [546, 'villager_bear', true],
      [630, 'villager_mouse', true],
    ];
    this.crowd = fans.map(([x, key, flip]) => this.villager(x, key, flip));
    // 하트 주고받기: 주민 한 명이 콩 뛰며 하트를 보내면, 모찌가 받고 하트를 돌려준다
    const order = [2, 3, 0, 4, 1];
    let turn = 0;
    this.exchange = this.every(1700, () => {
      const v = this.crowd[order[turn++ % order.length]];
      const vTop = () => v.y - v.displayHeight + 4;
      const mTop = () => mochi.y - mochi.displayHeight + 4;
      this.tw({ targets: v, y: FEET - 14, duration: 150, yoyo: true, ease: 'Quad.out' });
      this.flyHeart(v.x, vTop(), mochi.x, mTop(), () => {
        this.tw({ targets: mochi, y: FEET - 10, duration: 140, yoyo: true, ease: 'Quad.out' });
        this.flyHeart(mochi.x, mTop(), v.x, vTop(), undefined, 160);
      });
    });
  }

  /** 축제의 밤. 투표함에 하트(표)가 쏙쏙 들어간다. 모찌는 cue 'mochiVotes'에서 걸어 들어온다 */
  private festival() {
    this.backdrop('pro_bg_festival');
    this.twinkles(14, 150);
    this.villageLife('night');
    this.lanterns();
    const bx = W / 2;
    this.img(bx, FEET + 2, 'pro_ballot', 2).setOrigin(0.5, 1);
    for (let i = 0; i < 4; i++) {
      const h = this.img(bx + Phaser.Math.Between(-70, 70), 70, 'heart', 2).setAlpha(0);
      this.loops.push(
        this.tw({ targets: h, x: bx - 4, y: FEET - 40, alpha: { from: 1, to: 0.7 }, scale: { from: 2, to: 1 }, duration: 1300, ease: 'Quad.in', repeat: -1, repeatDelay: 900, delay: i * 560 }),
      );
    }
    // 주민들은 축제를 구경하며 이리저리 본다(cue 'allStare'에서 일제히 모찌를 본다)
    const spots: [number, string, boolean][] = [
      [150, 'villager_bear', true],
      [220, 'villager_mouse', false],
      [470, 'villager_cat', false],
      [540, 'villager_bear', true],
    ];
    this.crowd = spots.map(([x, key, flip]) => this.villager(x, key, flip));
    this.placeMochi(-40, FEET, 'mochi_walk1');
    this.mochiAt = { x: 296, feet: FEET, scale: 2 };
    this.confetti(14);
  }

  /** 무대 위 발표. cue 'drumroll'에서 캄캄해지고 'spotOn'에서 조명이 모찌를 비춘다 */
  private spotlight() {
    this.backdrop('pro_bg_theatre');
    // 빛줄기 속 먼지
    for (let i = 0; i < 14; i++) {
      const x = W / 2 + Phaser.Math.Between(-60, 60);
      const y = Phaser.Math.Between(30, 220);
      const d = this.add(this.scene.add.rectangle(x, y, 2, 2, 0xfff4d0).setAlpha(0));
      this.tw({ targets: d, y: y + 30, x: x + Phaser.Math.Between(-10, 10), alpha: { from: 0.8, to: 0 }, duration: 3000, repeat: -1, delay: i * 210 });
    }
    this.glow(180, 70, 0xfff0c0, 4, 0.22);
    const m = this.placeMochi(W / 2, 250, 'mochi_happy', 4);
    this.tw({ targets: m, y: 246, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    // 어둠과 무대를 훑는 조명 두 개
    const dark = this.overlay(0x05030a);
    const beams = [0, 1].map(() => this.img(W / 2, 200, 'glow', 3.2).setTint(0xfff0c0).setBlendMode(ADD).setAlpha(0));
    this.spot = { dark, beams };
  }

  private celebration() {
    this.backdrop('pro_bg_festival');
    this.twinkles(14, 150);
    this.villageLife('night');
    this.lanterns();
    // 뒷줄 주민(조금 어둡게)과 앞줄 주민
    const back: [number, string, boolean][] = [
      [150, 'villager_cat', false],
      [236, 'villager_bear', false],
      [492, 'villager_mouse', true],
      [600, 'villager_cat', true],
    ];
    for (const [x, key, flip] of back) this.villager(x, key, flip, FEET - 18).setTint(0xb8a8c8);
    const front: [number, string, boolean][] = [
      [80, 'villager_bear', false],
      [180, 'villager_mouse', false],
      [262, 'villager_cat', false],
      [560, 'villager_bear', true],
      [650, 'villager_mouse', true],
    ];
    this.crowd = front.map(([x, key, flip]) => this.villager(x, key, flip));
    this.glow(180, 112, 0xfff0c0, 2.6, 0.3);
    const m = this.placeMochi(W / 2, FEET, 'mochi_happy');
    this.tw({ targets: m, y: FEET - 4, duration: 260, yoyo: true, repeat: -1, repeatDelay: 900, ease: 'Quad.out' });
    this.chief = this.img(W + 60, FEET, 'villager_chief', 2).setOrigin(0.5, 1).setFlipX(true);
    this.chiefAt = { x: W / 2 + 84, feet: FEET };
    this.dark = this.overlay(0x120a1c);
    this.confetti(26);
  }

  private chiefScene() {
    this.backdrop('pro_bg_festival');
    this.villageLife('night');
    this.lanterns();
    // 배경을 어둡게 눌러 두 인물에 눈이 가게 한다
    this.add(this.scene.add.rectangle(0, 0, W, H, 0x120a1c, 0.45).setOrigin(0, 0));
    this.glow(180, 110, 0xffc890, 4.2, 0.25, false);
    this.shadow(W / 2 - 120, FEET + 6, 110);
    this.chief = this.img(W / 2 - 120, FEET + 6, 'villager_chief', 3).setOrigin(0.5, 1);
    this.chiefAt = { x: W / 2 - 120, feet: FEET + 6 };
    this.breathe(this.chief, 3, 1.02);
    this.placeMochi(W / 2 + 120, FEET + 6, 'mochi_front', 3);
    this.fireflies(6);
  }

  /** 떠나는 날 해 질 녘. 주민들이 손을 흔들고(cue 'waving'), 모찌가 떠나면 손을 내린다(cue 'mochiLeaves') */
  private farewell() {
    this.backdrop('pro_bg_village');
    this.twinkles(6, 80);
    this.villageLife('dusk');
    // 촌장은 뒤에서 조용히 본다
    this.villager(236, 'villager_chief', false, FEET - 16).setTint(0xd8c8d8);
    const spots: [number, string][] = [
      [70, 'villager_bear'],
      [140, 'villager_cat'],
      [205, 'villager_mouse'],
      [275, 'villager_cat'],
      [345, 'villager_bear'],
    ];
    this.crowd = spots.map(([x, key]) => this.villager(x, key));
    this.placeMochi(520, FEET, 'mochi_happy');
    this.dark = this.overlay(0x120818);
  }

  private departure() {
    this.backdrop('pro_bg_departure');
    this.twinkles(16, 170, 0xd8c8ff);
    this.fog([
      [150, 0.22, 26000],
      [196, 0.3, 17000],
    ]);
    // 박쥐가 성 위를 맴돈다
    this.bats(3, 500, 50);
    for (const w of CASTLE_WINDOWS) this.castleGlow.push(this.glow(w.x + 1, w.y + 1.5, 0x9ad58b, 0.6, 0.35));
    for (const l of VILLAGE_LIGHTS) this.glow(l.x + 1, l.y + 1, 0xffb060, 0.5, 0.5);
    // 해가 지는 어둠(cue 'dusk'에서 짙어진다)
    this.dark = this.add(this.scene.add.rectangle(0, 0, W, H, 0x07040c, 0).setOrigin(0, 0));
    // 길을 떠나는 모찌: 길을 따라 성 쪽으로 멀어진다
    const mochi = this.img(330, H - 2, 'mochi_walk1', 2.6).setOrigin(0.5, 1);
    this.mochi = mochi;
    const walk = this.every(200, () => mochi.setTexture(mochi.texture.key === 'mochi_walk1' ? 'mochi_walk2' : 'mochi_walk1'));
    this.tw({
      targets: mochi,
      x: 420,
      y: 236,
      scale: 1.4,
      duration: 7000,
      ease: 'Sine.out',
      onComplete: () => {
        walk.remove();
        mochi.setTexture('mochi_idle');
      },
    });
    // 마을의 눈빛(cue 'watchers'에서 나타난다)
    const eyes = [
      [30, 232],
      [92, 246],
      [140, 236],
      [180, 262],
      [60, 270],
      [116, 278],
    ];
    for (const [x, y] of eyes) {
      const pair = this.add(
        this.scene.add.container(x, y, [this.scene.add.rectangle(-5, 0, 4, 2, 0xffe08a), this.scene.add.rectangle(5, 0, 4, 2, 0xffe08a)]),
      );
      pair.setAlpha(0);
      this.watchers.push(pair);
    }
    this.add(this.scene.add.image(0, 0, 'vignette').setOrigin(0, 0).setDisplaySize(W, H));
  }

  // ───────────────────────── cue ─────────────────────────

  /** 음흉한 촌장 장면을 끝낸다: 그늘은 걷히고 표정은 바로 돌아오며, 비켜 있던 모찌가 다시 나타난다 */
  private chiefNormalFace(animate: boolean) {
    const shade = this.chiefShade;
    const chief = this.chief;
    if (!shade || !chief) return;
    this.chiefShade = undefined;
    // 멈췄던 음악이 다시 흐른다
    audio.resumeMusic();
    const mochiParts = [this.mochi, this.mochiShadow].filter((o) => o !== undefined);
    if (animate) this.tw({ targets: mochiParts, alpha: 1, duration: 400, ease: 'Sine.out' });
    else mochiParts.forEach((o) => o.setAlpha(1));
    // 촌장과 그늘이 함께 들썩이던 움직임을 멈추고, 촌장만 다시 숨 쉬게 한다
    this.scene.tweens.killTweensOf([chief, shade]);
    const scale = chief.scaleX;
    chief.setTexture('villager_chief').setScale(scale);
    this.breathe(chief, scale, 1.02);
    if (!animate) return shade.destroy();
    shade.setScale(scale);
    this.tw({ targets: shade, alpha: 0, duration: 300, onComplete: () => shade.destroy() });
  }

  /** 비트에 맞춰 무대를 움직인다. animate가 false면(이전으로 돌아오거나 중간부터 열 때) 결과만 바로 보여 준다. */
  cue(cue: PrologueCue, animate: boolean) {
    // 음흉한 얼굴은 그 비트에서만: 다음 cue가 오면 원래 얼굴로 돌아온다.
    if (cue !== 'chiefSinister') this.chiefNormalFace(animate);
    const m = this.mochi;
    switch (cue) {
      // ── 성문 ──
      case 'gateGlow': {
        const g = this.gate;
        if (!g) return;
        g.seam.setAlpha(animate ? 0 : 0.5);
        g.floor.setAlpha(animate ? 0 : 0.5);
        // 문틈 빛이 번진 뒤 숨 쉬듯 밝아졌다 어두워진다
        this.tw({ targets: g.seam, alpha: 0.5, duration: 900, ease: 'Sine.out' });
        this.tw({ targets: g.seam, alpha: { from: 0.5, to: 0.95 }, duration: 1100, ease: 'Sine.inOut', yoyo: true, repeat: -1, delay: 900 });
        this.tw({ targets: g.floor, alpha: 0.55, duration: 1600, ease: 'Sine.inOut' });
        g.torches.forEach((t) => {
          this.scene.tweens.killTweensOf(t);
          t.setAlpha(0.8).setScale(1.5);
          this.tw({ targets: t, alpha: 0.45, duration: 380, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
        });
        return;
      }
      case 'gateArrive': {
        if (!m || !this.mochiShadow || !animate) return;
        const sh = this.mochiShadow;
        m.setY(H + 90);
        sh.setAlpha(0);
        this.tw({ targets: m, y: GATE_FEET, duration: 2800, ease: 'Sine.out' });
        this.tw({ targets: m, scaleX: 2.1, duration: 180, yoyo: true, repeat: 6 });
        this.tw({ targets: sh, alpha: 1, duration: 600, delay: 2200 });
        return;
      }
      case 'gateOpens': {
        const g = this.gate;
        if (!g) return;
        const ms = animate ? 3000 : 0;
        this.scene.tweens.killTweensOf([g.seam]);
        if (!animate) {
          g.left.setScale(0.28, 2);
          g.right.setScale(0.28, 2);
          g.seam.setAlpha(0);
          g.inner.forEach((i) => i.setAlpha(0.9));
          m?.setTint(0x2a3a2e);
          return;
        }
        this.tw({ targets: [g.left, g.right], scaleX: 0.28, duration: ms, delay: 300, ease: 'Sine.inOut' });
        this.tw({ targets: g.seam, alpha: 0, duration: 400 });
        this.tw({ targets: g.inner, alpha: 0.9, duration: ms, delay: 300 });
        this.tw({ targets: g.inner[0], scale: 4.2, duration: 1600, delay: ms, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
        this.scene.cameras.main.shake(ms, 0.0025);
        audio.play('doorOpen');
        // 쏟아지는 빛을 등진 모찌는 검은 그림자가 된다
        if (m) this.later(ms * 0.6, () => m.active && m.setTint(0x2a3a2e));
        return;
      }
      // ── 아침의 마을 ──
      case 'villagersArrive':
        this.arrivals.forEach((go) => go(animate));
        return;
      case 'mochiGreets': {
        if (!m || !this.mochiShadow || !this.mochiAt) return;
        const sh = this.mochiShadow;
        const to = this.mochiAt.x;
        const greet = () => {
          m.setTexture('mochi_happy').setFlipX(false);
          this.crowd.forEach((v) => v.setFlipX(v.x > to));
          if (!animate) return;
          this.tw({ targets: m, y: FEET - 12, duration: 150, yoyo: true, repeat: 1, ease: 'Quad.out' });
          this.crowd.forEach((v, i) => this.popHeart(v, 300 + i * 120));
        };
        if (!animate) {
          m.setPosition(to, FEET).setAlpha(1).setScale(2);
          sh.setX(to).setAlpha(1);
          greet();
          return;
        }
        // 집 문에서 나와 길로 내려선 뒤, 주민들 사이로 걸어간다
        m.setY(FEET - 22).setScale(1.6);
        this.tw({ targets: m, alpha: 1, y: FEET, scale: 2, duration: 450, ease: 'Sine.out' });
        this.tw({ targets: sh, alpha: 1, duration: 450 });
        this.walk(m, to, { shadow: sh, delay: 470, onDone: greet });
        return;
      }
      // ── 모두가 사랑한 모찌 ──
      case 'whisper': {
        this.exchange?.remove();
        const [mouse, cat] = [this.crowd[1], this.crowd[2]];
        if (!mouse || !cat) return;
        cat.setFlipX(true);
        if (animate) {
          this.tw({ targets: mouse, angle: 7, x: mouse.x + 8, duration: 400, ease: 'Sine.out' });
          this.tw({ targets: cat, angle: -7, x: cat.x - 8, duration: 400, ease: 'Sine.out' });
        } else {
          mouse.setAngle(7).setX(mouse.x + 8);
          cat.setAngle(-7).setX(cat.x - 8);
        }
        return;
      }
      case 'heartRise': {
        this.exchange?.remove();
        if (!m || !animate) return;
        const h = this.img(m.x, m.y - m.displayHeight, 'heart', 2);
        const gl = this.img(m.x, h.y, 'glow', 0.8).setTint(0xff9ac0).setBlendMode(ADD).setAlpha(0.7);
        this.tw({ targets: [h, gl], y: -40, duration: 2800, ease: 'Sine.in' });
        this.tw({ targets: h, scale: 4, duration: 2800 });
        this.tw({ targets: gl, scale: 2, duration: 2800 });
        return;
      }
      // ── 축제 ──
      case 'mochiVotes': {
        if (!m || !this.mochiShadow || !this.mochiAt) return;
        const to = this.mochiAt.x;
        const vote = () => {
          m.setTexture('mochi_happy').setFlipX(false);
          if (animate) this.flyHeart(m.x, m.y - m.displayHeight, W / 2, FEET - 60);
        };
        if (!animate) {
          m.setX(to);
          this.mochiShadow.setX(to);
          vote();
          return;
        }
        this.walk(m, to, { shadow: this.mochiShadow, onDone: vote });
        return;
      }
      case 'allStare': {
        // 투표 하트도 꽃가루도 아닌, 주민들만 멈춘다: 일제히 모찌를 본다
        this.loops.forEach((t) => {
          t.stop();
          (t.targets as Img[]).forEach((o) => o.setAlpha(0));
        });
        const to = this.mochiAt?.x ?? W / 2;
        const turn = () =>
          this.crowd.forEach((v) => {
            this.scene.tweens.killTweensOf(v);
            v.setScale(2).setY(FEET).setFlipX(v.x > to);
          });
        turn();
        if (!animate) {
          this.crowd.forEach((v) => this.breathe(v, 2));
          return;
        }
        this.crowd.forEach((v) => this.tw({ targets: v, y: FEET - 5, duration: 70, yoyo: true }));
        const dim = this.overlay(0x07040c);
        this.crowd.forEach((v) => this.root.bringToTop(v));
        if (m) this.root.bringToTop(m);
        this.tw({ targets: dim, alpha: 0.4, duration: 250 });
        // 음악도 잠깐 멈춘다
        audio.play('sting');
        audio.pauseMusic();
        this.later(2200, () => audio.resumeMusic());
        // 잠시 뒤 "아무것도 아니야!" 하고 다시 웃는다
        this.tw({ targets: dim, alpha: 0, duration: 500, delay: 2200 });
        this.crowd.forEach((v, i) => {
          this.tw({ targets: v, y: FEET - 10, duration: 140, yoyo: true, delay: 2300 + i * 90 });
          this.later(2700, () => v.active && this.breathe(v, 2));
        });
        return;
      }
      // ── 발표 ──
      case 'drumroll': {
        const s = this.spot;
        if (!s) return;
        s.dark.setAlpha(animate ? 0 : 0.9);
        if (animate) {
          this.tw({ targets: s.dark, alpha: 0.9, duration: 250 });
          // 음악을 멈추고 북을 계속 굴린다(조명이 켜지면 멈춘다)
          audio.pauseMusic();
          audio.play('drumroll');
          this.roll = this.every(1430, () => audio.play('drumroll'));
        }
        s.beams.forEach((b, i) => {
          b.setAlpha(0.55).setX(i ? W - 140 : 140);
          this.loops.push(this.tw({ targets: b, x: i ? 160 : W - 160, duration: 1100 + i * 250, yoyo: true, repeat: -1, ease: 'Sine.inOut' }));
        });
        return;
      }
      case 'spotOn': {
        const s = this.spot;
        if (!s || !m) return;
        this.roll?.remove();
        this.roll = undefined;
        this.loops.forEach((t) => t.stop());
        s.beams.forEach((b) => b.setAlpha(0));
        s.dark.setAlpha(0);
        if (animate) {
          audio.play('fanfare');
          audio.play('cheer');
          audio.resumeMusic();
          const flash = this.add(this.scene.add.rectangle(0, 0, W, H, 0xfff8e8, 1).setOrigin(0, 0));
          this.tw({ targets: flash, alpha: 0, duration: 500, onComplete: () => flash.destroy() });
        }
        // 반짝이와 하트가 떠오르고 꽃가루가 날린다
        for (let i = 0; i < 6; i++) {
          const x = W / 2 + Phaser.Math.Between(-150, 150);
          const sp = this.img(x, 220, i % 2 ? 'heart' : 'dizzy_star', 2).setAlpha(0);
          this.tw({ targets: sp, y: 40, alpha: { from: 1, to: 0 }, duration: 2600, repeat: -1, delay: i * 430 });
        }
        this.confetti(14);
        return;
      }
      // ── 축하 ──
      case 'cheer':
        if (!animate) return;
        audio.play('cheer');
        this.crowd.forEach((v, i) => {
          this.tw({ targets: v, y: v.y - 18, duration: 160, yoyo: true, repeat: 2, repeatDelay: 220, delay: i * 120, ease: 'Quad.out' });
          this.popHeart(v, 200 + i * 160);
        });
        return;
      case 'chiefEnters': {
        const chief = this.chief;
        if (!chief || !this.chiefAt) return;
        const tx = this.chiefAt.x;
        // 길을 비켜 주듯 오른쪽 앞줄 주민이 물러난다
        const move = this.crowd.filter((v) => v.x > W / 2);
        if (!animate) {
          chief.setX(tx);
          move.forEach((v) => v.setX(v.x + 40));
          return;
        }
        move.forEach((v) => this.tw({ targets: v, x: v.x + 40, duration: 500, ease: 'Sine.out' }));
        this.tw({ targets: chief, x: tx, duration: 2000, ease: 'Sine.out' });
        this.tw({ targets: chief, angle: { from: -4, to: 4 }, duration: 250, yoyo: true, repeat: 3 });
        return;
      }
      case 'chiefBeckons': {
        // 주변이 가라앉고 촌장과 모찌 둘만 남는다
        if (!this.dark || !this.chief || !m) return;
        this.root.bringToTop(this.chief);
        this.root.bringToTop(m);
        m.setTexture('mochi_front');
        if (animate) this.tw({ targets: this.dark, alpha: 0.6, duration: 900 });
        else this.dark.setAlpha(0.6);
        return;
      }
      // ── 촌장의 부탁 ──
      case 'chiefSinister': {
        const chief = this.chief;
        if (!chief || this.chiefShade) return;
        // 이 대사는 촌장 혼자: 모찌는 다음 비트에서 나타난다
        m?.setAlpha(0);
        this.mochiShadow?.setAlpha(0);
        const scale = chief.scaleX;
        chief.setTexture('villager_chief_sly');
        const shade = this.img(chief.x, chief.y, 'villager_chief_sly_shade', scale).setOrigin(0.5, 1);
        this.chiefShade = shade;
        // 숨 쉬는 들썩임을 그늘과 함께 맞춘다
        this.scene.tweens.killTweensOf(chief);
        chief.setScale(scale);
        this.tw({ targets: [chief, shade], scaleY: scale * 1.02, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
        if (animate) {
          // 음악이 뚝 끊기고 낮은 울림만 남는다
          audio.pauseMusic();
          audio.play('sting');
          shade.setAlpha(0);
          this.tw({ targets: shade, alpha: 0.5, duration: 900, ease: 'Sine.out' });
        } else shade.setAlpha(0.5);
        return;
      }
      case 'mochiAsks':
        // 걱정스러운 얼굴로 되묻는다(고개를 끄덕일 때 다시 웃는다)
        m?.setTexture('mochi_sad');
        if (m && animate) this.tw({ targets: m, y: m.y - 10, duration: 140, yoyo: true, delay: 300, ease: 'Quad.out' });
        return;
      case 'mochiPonders': {
        if (!m) return;
        const bx = m.x + 56;
        const by = m.y - m.displayHeight - 4;
        const g = this.scene.add.graphics();
        g.fillStyle(OUTLINE).fillRoundedRect(-40, -22, 80, 40, 12);
        g.fillStyle(0xfff8f0).fillRoundedRect(-38, -20, 76, 36, 10);
        g.fillStyle(OUTLINE).fillTriangle(-30, 14, -12, 14, -36, 32);
        g.fillStyle(0xfff8f0).fillTriangle(-27, 14, -15, 14, -33, 28);
        const dots = [-16, 0, 16].map((dx) => this.scene.add.rectangle(dx, -2, 6, 6, OUTLINE));
        this.bubble = this.add(this.scene.add.container(bx, by, [g, ...dots]));
        if (animate) {
          this.bubble.setScale(0);
          this.tw({ targets: this.bubble, scale: 1, duration: 260, ease: 'Back.out' });
          dots.forEach((d, i) => {
            d.setAlpha(0);
            this.tw({ targets: d, alpha: 1, duration: 120, delay: 300 + i * 260, yoyo: true, hold: 900, repeat: -1, repeatDelay: 300 });
          });
          this.tw({ targets: m, angle: 4, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
        }
        return;
      }
      case 'mochiNods': {
        if (!m) return;
        this.bubble?.destroy();
        this.bubble = undefined;
        this.scene.tweens.killTweensOf(m);
        m.setAngle(0).setTexture('mochi_happy');
        if (animate) this.tw({ targets: m, y: m.y + 8, duration: 140, yoyo: true, repeat: 1, repeatDelay: 120, delay: 200 });
        return;
      }
      // ── 떠나는 날 ──
      case 'waving':
        this.crowd.forEach((v, i) => {
          this.loops.push(this.tw({ targets: v, y: FEET - 10, duration: 180, yoyo: true, repeat: -1, repeatDelay: 420 + i * 70, delay: i * 120, ease: 'Quad.out' }));
        });
        return;
      case 'mochiLeaves': {
        // 모찌는 길 끝으로 떠나고, 주민들은 손을 내리고 가만히 선다
        const stop = () => {
          this.loops.forEach((t) => t.stop());
          this.crowd.forEach((v) => {
            this.scene.tweens.killTweensOf(v);
            v.setScale(2).setY(FEET);
          });
        };
        if (!animate) {
          stop();
          m?.setAlpha(0);
          this.mochiShadow?.setAlpha(0);
          this.dark?.setAlpha(0.55);
          return;
        }
        if (m) this.walk(m, W + 60, { shadow: this.mochiShadow, speed: 9 });
        this.later(1600, stop);
        if (this.dark) this.tw({ targets: this.dark, alpha: 0.55, duration: 2400, delay: 900 });
        return;
      }
      // ── 숲 너머로 ──
      case 'dusk':
        if (this.dark) {
          if (animate) this.tw({ targets: this.dark, fillAlpha: 0.45, duration: 2400 });
          else this.dark.setFillStyle(0x07040c, 0.45);
        }
        this.castleGlow.forEach((gl) => {
          this.scene.tweens.killTweensOf(gl);
          gl.setAlpha(0.75).setScale(0.9);
          this.tw({ targets: gl, alpha: 0.5, duration: 900, yoyo: true, repeat: -1 });
        });
        return;
      case 'watchers':
        this.watchers.forEach((pair, i) => {
          if (animate) this.tw({ targets: pair, alpha: 0.9, duration: 900, delay: 600 + i * 450 });
          else pair.setAlpha(0.9);
          // 가끔 깜빡인다
          this.every(Phaser.Math.Between(2600, 4200), () => {
            if (pair.active) this.tw({ targets: pair, scaleY: 0.1, duration: 90, yoyo: true });
          });
        });
        return;
    }
  }
}
