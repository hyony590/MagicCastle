import Phaser from 'phaser';
import type { PrologueCue, PrologueStage } from '../story/prologue';
import {
  CASTLE_WINDOWS,
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
    palette: {
      k: '#2b1d2f',
      b: '#6b4a3a',
      B: '#4e3428',
      L: '#8a6450',
      h: '#c9a27a',
      w: '#fff4d0',
      e: '#2b1d2f',
      y: '#ffd65a',
    },
    rows: [
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
  paintTexture(scene, 'pro_bg_village', LW, LH, (p) => paintVillage(p, false));
  paintTexture(scene, 'pro_bg_festival', LW, LH, (p) => paintVillage(p, true));
  paintTexture(scene, 'pro_bg_theatre', LW, LH, paintTheatre);
  paintTexture(scene, 'pro_bg_departure', LW, LH, paintDeparture);
  paintTexture(scene, 'pro_ballot', 30, 24, paintBallotBox);
  paintTexture(scene, 'pro_fog', LW, 24, paintFog);
}

// ───────────────────────── 무대 ─────────────────────────

export class StageView {
  readonly root: Phaser.GameObjects.Container;
  private maskShape: Phaser.GameObjects.Graphics;
  private tweens: Phaser.Tweens.Tween[] = [];
  private timers: Phaser.Time.TimerEvent[] = [];
  /** 무대 위 인물·소품. cue가 움직인다. */
  private mochi?: Img;
  private chief?: Img;
  private crowd: Img[] = [];
  private bubble?: Phaser.GameObjects.Container;
  private dark?: Phaser.GameObjects.Rectangle;
  private watchers: Phaser.GameObjects.Container[] = [];
  private castleGlow: Img[] = [];

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
      village: () => this.village(),
      festival: () => this.festival(),
      spotlight: () => this.spotlight(),
      celebration: () => this.celebration(),
      chief: () => this.chiefScene(),
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
    const gl = this.img(lx * 2, ly * 2, 'glow', scale).setTint(tint).setAlpha(alpha).setBlendMode(Phaser.BlendModes.ADD);
    if (flicker) this.tw({ targets: gl, alpha: alpha * 0.6, duration: Phaser.Math.Between(500, 1100), yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    return gl;
  }

  /** 마을 그림에 맞춘 창·가로등 불빛과 굴뚝 연기 */
  private villageLife(night: boolean) {
    for (const h of HOUSES) {
      for (const w of houseWindows(h)) this.glow(w.x + 2.5, w.y + 2.5, 0xffb060, 0.8, night ? 0.6 : 0.4);
      const ch = houseChimney(h);
      for (let i = 0; i < 4; i++) {
        const p = this.img(ch.x * 2, ch.y * 2, 'dust', 2).setAlpha(0).setTint(night ? 0x8a7aa8 : 0xf0dcea);
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
    for (const x of LAMPS) this.glow(x, 119 - 20, 0xffd080, 1.4, night ? 0.7 : 0.45);
    this.fireflies(night ? 10 : 5);
  }

  private fireflies(n: number) {
    for (let i = 0; i < n; i++) {
      const x = Phaser.Math.Between(20, W - 20);
      const y = Phaser.Math.Between(170, 270);
      const f = this.add(this.scene.add.rectangle(x, y, 2, 2, 0xfff4a0).setAlpha(0));
      const g = this.img(x, y, 'glow', 0.3).setTint(0xfff080).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
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

  /** 주민 한 명. 가만히 있을 때도 숨 쉬듯 들썩인다 */
  private villager(x: number, key: string, flip = false, feet = FEET, scale = 2): Img {
    const v = this.img(x, feet, key, scale).setOrigin(0.5, 1).setFlipX(flip);
    this.shadow(x, feet, v.displayWidth * 0.8);
    this.tw({ targets: v, scaleY: scale * 1.05, duration: Phaser.Math.Between(500, 800), yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    return v;
  }

  private shadow(x: number, feet: number, w: number) {
    this.add(this.scene.add.ellipse(x, feet - 1, w, 8, 0x1b1220, 0.45));
  }

  // ───────── 화면별 무대 ─────────

  private village() {
    this.backdrop('pro_bg_village');
    this.twinkles(6, 80);
    this.villageLife(false);
  }

  private festival() {
    this.backdrop('pro_bg_festival');
    this.twinkles(14, 150);
    this.villageLife(true);
    this.lanterns();
    // 투표함과 그 앞에 모인 주민들. 하트(표)가 투표함에 쏙쏙 들어간다.
    const bx = W / 2;
    this.img(bx, FEET + 2, 'pro_ballot', 2).setOrigin(0.5, 1);
    for (let i = 0; i < 4; i++) {
      const h = this.img(bx + Phaser.Math.Between(-70, 70), 70, 'heart', 2).setAlpha(0);
      this.tw({ targets: h, x: bx - 4, y: FEET - 40, alpha: { from: 1, to: 0.7 }, scale: { from: 2, to: 1 }, duration: 1300, ease: 'Quad.in', repeat: -1, repeatDelay: 900, delay: i * 560 });
    }
    this.villager(bx - 150, 'villager_bear');
    this.villager(bx - 90, 'villager_mouse');
    this.villager(bx + 92, 'villager_cat', true);
    this.villager(bx + 152, 'villager_bear', true);
    this.confetti(14);
  }

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
    // 모찌
    this.shadow(W / 2, 250, 70);
    this.mochi = this.img(W / 2, 250, 'mochi_happy', 4).setOrigin(0.5, 1);
    this.tw({ targets: this.mochi, y: 246, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    // 반짝이와 하트가 떠오른다
    for (let i = 0; i < 6; i++) {
      const x = W / 2 + Phaser.Math.Between(-150, 150);
      const s = this.img(x, 220, i % 2 ? 'heart' : 'dizzy_star', 2).setAlpha(0);
      this.tw({ targets: s, y: 40, alpha: { from: 1, to: 0 }, duration: 2600, repeat: -1, delay: i * 430 });
    }
    // 객석에서 날아오는 꽃잎
    this.confetti(10);
  }

  private celebration() {
    this.backdrop('pro_bg_festival');
    this.twinkles(14, 150);
    this.villageLife(true);
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
    this.shadow(W / 2, FEET, 50);
    this.mochi = this.img(W / 2, FEET, 'mochi_happy', 2).setOrigin(0.5, 1);
    this.tw({ targets: this.mochi, y: FEET - 4, duration: 260, yoyo: true, repeat: -1, repeatDelay: 900, ease: 'Quad.out' });
    this.chief = this.img(W + 60, FEET, 'villager_chief', 2).setOrigin(0.5, 1).setFlipX(true);
    this.confetti(26);
  }

  private chiefScene() {
    this.backdrop('pro_bg_festival');
    this.villageLife(true);
    this.lanterns();
    // 배경을 어둡게 눌러 두 인물에 눈이 가게 한다
    this.add(this.scene.add.rectangle(0, 0, W, H, 0x120a1c, 0.45).setOrigin(0, 0));
    this.glow(180, 110, 0xffc890, 4.2, 0.25, false);
    this.shadow(W / 2 - 120, FEET + 6, 110);
    this.chief = this.img(W / 2 - 120, FEET + 6, 'villager_chief', 3).setOrigin(0.5, 1);
    this.tw({ targets: this.chief, scaleY: 3 * 1.02, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.shadow(W / 2 + 120, FEET + 6, 80);
    this.mochi = this.img(W / 2 + 120, FEET + 6, 'mochi_front', 3).setOrigin(0.5, 1);
    this.fireflies(6);
  }

  private departure() {
    this.backdrop('pro_bg_departure');
    this.twinkles(16, 170, 0xd8c8ff);
    // 안개 두 겹이 천천히 흐른다
    for (const [y, alpha, ms] of [
      [150, 0.22, 26000],
      [196, 0.3, 17000],
    ]) {
      const fog = this.add(this.scene.add.tileSprite(0, y, W, 48, 'pro_fog').setOrigin(0, 0).setTileScale(2).setAlpha(alpha));
      this.tw({ targets: fog, tilePositionX: LW, duration: ms, repeat: -1 });
    }
    // 박쥐가 성 위를 맴돈다
    for (let i = 0; i < 3; i++) {
      const b = this.img(500 + i * 40, 50 + i * 16, 'pro_bat1', 2).setAlpha(0.9);
      this.every(140 + i * 20, () => b.setTexture(b.texture.key === 'pro_bat1' ? 'pro_bat2' : 'pro_bat1'));
      this.tw({ targets: b, x: b.x + Phaser.Math.Between(80, 130), duration: 3000 + i * 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      this.tw({ targets: b, y: b.y + Phaser.Math.Between(20, 40), duration: 1700 + i * 300, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    }
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
        this.scene.add.container(x, y, [
          this.scene.add.rectangle(-5, 0, 4, 2, 0xffe08a),
          this.scene.add.rectangle(5, 0, 4, 2, 0xffe08a),
        ]),
      );
      pair.setAlpha(0);
      this.watchers.push(pair);
    }
    this.add(this.scene.add.image(0, 0, 'vignette').setOrigin(0, 0).setDisplaySize(W, H));
  }

  // ───────────────────────── cue ─────────────────────────

  /** 비트에 맞춰 무대를 움직인다. animate가 false면(이전 화면으로 돌아올 때) 결과만 바로 보여 준다. */
  cue(cue: PrologueCue, animate: boolean) {
    switch (cue) {
      case 'cheer':
        if (!animate) return;
        this.crowd.forEach((v, i) => {
          this.tw({ targets: v, y: v.y - 18, duration: 160, yoyo: true, repeat: 2, repeatDelay: 220, delay: i * 120, ease: 'Quad.out' });
          const h = this.img(v.x, v.y - v.displayHeight, 'heart', 2).setAlpha(0);
          this.tw({ targets: h, y: h.y - 40, alpha: { from: 1, to: 0 }, duration: 1000, delay: 200 + i * 160 });
        });
        return;
      case 'chiefEnters': {
        const chief = this.chief;
        if (!chief) return;
        const tx = W / 2 + 84;
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
      case 'mochiPonders': {
        if (!this.mochi) return;
        const m = this.mochi;
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
        if (!this.mochi) return;
        const m = this.mochi;
        this.bubble?.destroy();
        this.bubble = undefined;
        this.scene.tweens.killTweensOf(m);
        m.setAngle(0).setTexture('mochi_happy');
        if (animate) this.tw({ targets: m, y: m.y + 8, duration: 140, yoyo: true, repeat: 1, repeatDelay: 120, delay: 200 });
        return;
      }
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
