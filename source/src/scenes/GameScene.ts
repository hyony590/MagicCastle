import Phaser from 'phaser';
import {
  BLOCK_SIZE,
  BONUS_WORD,
  CHEST_ENEMY_RANGE,
  COLUMNS,
  COLORS,
  DIFFICULTY,
  ENEMY,
  ENEMY_LOOKS,
  FLAME,
  FLOOR_THICKNESS,
  FLOOR_Y,

  HUD_HEIGHT,
  PLAYER,
  PICKUP_PAUSE_MS,
  PLAY_HEIGHT,
  SCORE,
  START_LIVES,
  TILE,
  WIDTH,
} from '../config';
import { LEVELS, segmentAt, validateLevel } from '../levels';
import type { ChestContent, ChestDef, EnemyDef, EnemyLook, ItemKind, LevelDef } from '../levels/types';
import { newRun, type RunState } from '../state';
import { Menu, MenuButton } from '../ui/button';
import { ADMIN, levelFromKey, levelKeysLabel } from '../admin';
import { audio } from '../audio';
import { BossFight } from './BossFight';
import { ALL_MONSTERS, MONSTER_NAMES } from '../cast';
import { banner, popText, STYLE, titleText } from '../ui/text';
import { letterCookie, setCookieLit } from '../ui/letterCookie';

/** hitstop: 아이템을 먹은 순간의 짧은 전체 정지 */
type Phase = 'playing' | 'paused' | 'dying' | 'clear' | 'hitstop';
type Rect = Phaser.Geom.Rectangle;

interface Ladder {
  x: number;
  top: number;
  bottom: number;
}

interface Pickup {
  obj: Phaser.GameObjects.Image;
  hit: Rect;
  taken: boolean;
}

interface Chest {
  /** level.chests 번호(기절해도 열린 상자를 기억하려고) */
  index: number;
  img: Phaser.GameObjects.Image;
  hit: Rect;
  floor: number;
  x: number;
  contents?: ChestContent;
  enemy?: ChestDef['enemy'];
  opened: boolean;
}

interface Letter {
  obj: Phaser.GameObjects.Container;
  hit: Rect;
  char: string;
  taken: boolean;
}


interface Enemy {
  /** 판정용(보이지 않음) */
  body: Phaser.GameObjects.Rectangle;
  sprite: Phaser.GameObjects.Image;
  look: EnemyLook;
  min: number;
  max: number;
  dir: 1 | -1;
  speed: number;
  /** 이 시각(elapsed ms) 전에는 깜빡이기만 하고 움직이거나 해치지 않는다. */
  activeAt: number;
}

interface Trap {
  flame: Phaser.GameObjects.Image;
  glow: Phaser.GameObjects.Image;
  hit: Rect;
  /** 없으면 항상 켜져 있다. */
  cycle?: { onMs: number; offMs: number; offsetMs: number };
  active: boolean;
}

/** 아이템을 먹을 때 반짝이 가루 색 */
/** 같은 입력이면 늘 같은 값을 주는 간단한 정수 해시(블록 모양 고르기용) */
function hash(a: number, b: number, c: number) {
  let h = (a * 73856093) ^ (b * 19349663) ^ (c * 83492791);
  h = (h ^ (h >>> 13)) * 1274126177;
  return Math.abs(h ^ (h >>> 16));
}

/** HUD에 그릴 수 있는 하트 수 */
const HEART_SLOTS = 6;

const ITEM_SPARK: Record<ItemKind, number[]> = {
  gem: [0xbdeefa, 0xffffff],
  apple: [0xff8fae, 0xffe08a],
  coin: [0xffd27a, 0xffffff],
};

/** 아이템 종류별 그림(art/sprites.ts): 별사탕, 딸기, 쿠키 */
const ITEM_TEXTURE: Record<ItemKind, string> = {
  gem: 'item_gem',
  apple: 'item_apple',
  coin: 'item_coin',
};

export class GameScene extends Phaser.Scene {
  private run!: RunState;
  private level!: LevelDef;
  private phase: Phase = 'playing';
  /** 일시정지 중에는 멈추는 플레이 시간(ms). 함정 주기와 부츠 지속 시간에 쓴다. */
  private elapsed = 0;

  /** 판정·물리용(보이지 않음). 화면에는 playerSprite가 보인다. */
  private player!: Phaser.GameObjects.Rectangle;
  private playerSprite!: Phaser.GameObjects.Image;
  private facing: 1 | -1 = 1;
  private climbing: Ladder | null = null;
  private airborne = false;
  private airPeak = 0;
  /** 스페이스를 누른 시각(elapsed). 누른 순간 이벤트로 기록해서, 바닥에 없을 때 눌러도 잃어버리지 않는다. */
  private jumpPressedAt = -Infinity;
  /** 마지막으로 바닥에 서 있던 시각(elapsed) */
  private groundAt = -Infinity;
  /** 스피드 부츠를 신었는지. 시간 제한 없이, 죽거나 다음 레벨로 넘어갈 때(init)만 풀린다. */
  private boosted = false;

  private ladders: Ladder[] = [];
  private items: Pickup[] = [];
  private chests: Chest[] = [];
  /**
   * 도시락 상자에서 나온 운동화. 바로 신지 않고 상자 위에 놓인다.
   * 상자를 열 때는 이미 그 앞에 와 있으므로, 열린 뒤 0.6초가 지나 비켜나 있어야(ready) 다시 밟아서 신는다.
   */
  private boots: { obj: Phaser.GameObjects.Image; hit: Rect; openedAt: number; ready: boolean; taken: boolean }[] = [];
  private letters: Letter[] = [];
  private enemies: Enemy[] = [];
  private traps: Trap[] = [];
  private boss?: BossFight;
  /** 공격이 잠긴 상태에서 Z를 눌렀을 때 안내를 다시 띄울 수 있는 시각 */
  private lockedHintAt = 0;

  private keys!: {
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
    up: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    jump: Phaser.Input.Keyboard.Key;
    pause: Phaser.Input.Keyboard.Key;
    esc: Phaser.Input.Keyboard.Key;
    mute: Phaser.Input.Keyboard.Key;
    action: Phaser.Input.Keyboard.Key;
  };

  private hud!: {
    lives: Phaser.GameObjects.Text;
    /** 생명 하트 아이콘(최대 HEART_SLOTS개, 넘치면 ×N 글자) */
    hearts: Phaser.GameObjects.Image[];
    level: Phaser.GameObjects.Text;
    score: Phaser.GameObjects.Text;
    items: Phaser.GameObjects.Text;
    boost: Phaser.GameObjects.Text;
    sound: Phaser.GameObjects.Text;
    letters: Phaser.GameObjects.Container[];
  };
  private overlay?: Phaser.GameObjects.Container;
  /** 일시정지 화면의 버튼 묶음(키 입력 연결을 끊으려고 들고 있다) */
  private pauseMenu?: Menu;

  constructor() {
    super('Game');
  }

  init(data: { run: RunState }) {
    // scene.restart()는 같은 인스턴스를 다시 쓰므로 필드를 모두 초기화한다.
    this.run = data.run;
    this.level = LEVELS[this.run.level];
    this.phase = 'playing';
    this.elapsed = 0;
    this.facing = this.level.start.facing;
    this.climbing = null;
    this.airborne = false;
    this.airPeak = 0;
    this.boosted = false;
    this.ladders = [];
    this.items = [];
    this.chests = [];
    this.boots = [];
    this.letters = [];
    this.enemies = [];
    this.traps = [];
    this.boss = undefined;
    this.lockedHintAt = 0;
    this.overlay = undefined;
  }

  create() {
    const problems = validateLevel(this.level, this.run.level);
    problems.forEach((p) => console.warn(p));

    this.physics.world.resume();
    this.physics.world.setBounds(0, 0, WIDTH, PLAY_HEIGHT);

    this.drawBackground();
    const platforms = this.buildFloors();
    this.buildLadders();
    this.buildTraps();
    this.buildItems();
    this.buildChests();
    this.buildLetters();
    this.buildPlayer();
    // 몬스터 종류: 레벨 데이터의 look, 없으면 (레벨 번호 + 순서)로 ENEMY_LOOKS를 돌아가며 고른다.
    this.level.enemies.forEach((e, i) => this.spawnEnemy(e, 0, e.look ?? ENEMY_LOOKS[(this.run.level + i) % ENEMY_LOOKS.length]));
    if (this.level.boss) {
      this.boss = new BossFight(
        this,
        this.level.boss,
        {
          addScore: (p, x, y) => this.addScore(p, x, y),
          onDefeated: () => this.bossDefeated(),
        },
        this.elapsed,
      );
      // 기절 전에 보석을 다 모았으면 처음부터 공격할 수 있고, 깎아 둔 HP도 그대로다(맞은 만큼 빨라진 속도도)
      if (this.items.every((it) => it.taken)) this.boss.arm();
      const savedHp = this.run.taken?.level === this.run.level ? this.run.taken.bossHp : undefined;
      if (savedHp !== undefined) this.boss.hp = savedHp;
    }

    this.physics.add.collider(this.player, platforms, undefined, () => this.climbing === null);

    const kb = this.input.keyboard!;
    const K = Phaser.Input.Keyboard.KeyCodes;
    this.keys = {
      left: kb.addKey(K.LEFT),
      right: kb.addKey(K.RIGHT),
      up: kb.addKey(K.UP),
      down: kb.addKey(K.DOWN),
      jump: kb.addKey(K.SPACE),
      pause: kb.addKey(K.P),
      esc: kb.addKey(K.ESC),
      mute: kb.addKey(K.M),
      action: kb.addKey(K.Z),
    };
    // 점프는 프레임마다 확인하지 않고 누른 순간을 기록한다(짧게 톡 눌러도, 공중·멈춤 중에 눌러도 놓치지 않게).
    this.jumpPressedAt = -Infinity;
    this.groundAt = -Infinity;
    // 점프 키: 스페이스, V(방향키는 오른손, 점프·공격(Z)은 왼손으로 누르기 좋게)
    for (const key of [this.keys.jump, kb.addKey(K.V)]) {
      key.on('down', () => {
        if (this.phase === 'playing' || this.phase === 'hitstop') this.jumpPressedAt = this.elapsed;
      });
    }

    this.buildHud();
    if (ADMIN) this.setupAdmin();
    if (this.level.boss) {
      this.showBanner(`LEVEL ${this.run.level + 1} · BOSS`, `${this.level.boss.name} — 보석을 모두 모으면 공격할 수 있다`, 2200);
    } else {
      this.showBanner(`LEVEL ${this.run.level + 1}`, this.level.name, 1200);
    }
    audio.unlock();
    audio.startMusic(this.level.boss ? 'boss' : 'level');
    this.cameras.main.fadeIn(320, 20, 10, 30);
  }

  update(_time: number, delta: number) {
    const JustDown = Phaser.Input.Keyboard.JustDown;
    if (JustDown(this.keys.mute)) {
      audio.toggleMute();
      this.updateHud();
    }
    if (JustDown(this.keys.pause) || JustDown(this.keys.esc)) this.togglePause();
    if (this.phase !== 'playing') return;

    const dt = Math.min(delta, 50) / 1000;
    this.elapsed += delta;

    if (this.boss && Phaser.Input.Keyboard.JustDown(this.keys.action)) {
      if (this.boss.armed) {
        this.boss.tryThrow(this.player.x, this.body.bottom, this.elapsed);
      } else if (this.elapsed >= this.lockedHintAt) {
        const left = this.items.filter((i) => !i.taken).length;
        this.floatText(`보석 ${left}개를 더 모아야 공격할 수 있다`, this.player.x, this.player.y - 30, '#ff9f43');
        this.lockedHintAt = this.elapsed + 1000;
      }
    }
    this.updatePlayer();
    this.updateEnemies(dt);
    this.boss?.update(this.elapsed, dt, { x: this.player.x, y: this.player.y });
    if (this.boss && this.boss.hp < this.boss.maxHp) this.rememberBossHp(this.boss.hp);
    this.updateTraps();
    if (this.phase === 'playing') this.checkHazards();
    if (this.phase === 'playing') this.checkPickups();
    this.updateHud();
  }

  // ───────────────────────── 맵 구성 ─────────────────────────

  /** 밤의 마녀 부엌 배경(art/background.ts). 보스 층은 보랏빛으로 더 어둡게, 높은 층일수록 조금씩 어두워진다. */
  private drawBackground() {
    const bg = this.add.image(0, 0, 'bg_kitchen').setOrigin(0, 0).setScale(2).setDepth(-10);
    if (this.level.boss) bg.setTint(0xb48ad8);
    else if (this.run.level >= 6) bg.setTint(0xd8c8e8);
    // 화면 가장자리를 은은하게 어둡게(HUD 아래, 글자·알림보다 아래)
    this.add.image(0, 0, 'vignette').setOrigin(0, 0).setDepth(15);
  }

  /**
   * 발판 블록 한 칸. 밟는 면(물리)은 윗면이고, 블록은 그 아래로 BLOCK_SIZE만큼 그린다.
   * 같은 모양만 반복되지 않게 층·구간·칸마다 모양을 고른다(art/background.ts의 블록 그림).
   * - 0층: 부엌 바닥 타일
   * - 나머지: 나무 조리대(가끔 옹이·밀가루 자국), 구간에 따라 분홍 타일 조리대
   */
  private drawBlock(col: number, top: number, floor: number, segIndex: number, edge: 'left' | 'right' | null) {
    const x = col * TILE;
    const s = BLOCK_SIZE;
    const h = hash(this.run.level, floor, col);
    let key: string;
    if (floor === 0) key = h % 7 === 0 ? 'blk_floor1' : 'blk_floor0';
    else if (hash(this.run.level, floor, segIndex + 50) % 3 === 0) key = 'blk_tile';
    else key = h % 6 === 0 ? 'blk_wood1' : h % 6 === 1 ? 'blk_wood2' : 'blk_wood0';
    this.add.image(x, top, key).setOrigin(0, 0).setDisplaySize(TILE, s);
    // 발판 양끝 마감(틈 쪽 가장자리)
    if (edge) this.add.image(x, top, 'blk_cap').setOrigin(0, 0).setDisplaySize(TILE, s).setFlipX(edge === 'right');
  }

  private buildFloors(): Phaser.GameObjects.Rectangle[] {
    const platforms: Phaser.GameObjects.Rectangle[] = [];
    this.level.floors.forEach((segments, floor) => {
      const top = FLOOR_Y[floor];
      segments.forEach(([a, b], segIndex) => {
        const x = a * TILE;
        const w = (b - a) * TILE;
        // 한 칸(32px)마다 블록 하나. 화면 끝이 아닌 구간 양끝에는 마감을 붙인다.
        for (let col = a; col < b; col++) {
          const edge = col === a && a > 0 ? 'left' : col === b - 1 && b < COLUMNS ? 'right' : null;
          this.drawBlock(col, top, floor, segIndex, edge);
        }

        // 위에서만 밟히는 한 방향 발판. 아래·옆에서는 통과한다.
        const r = this.add.rectangle(x + w / 2, top + FLOOR_THICKNESS / 2, w, FLOOR_THICKNESS);
        r.setVisible(false);
        this.physics.add.existing(r, true);
        const body = r.body as Phaser.Physics.Arcade.StaticBody;
        body.checkCollision.down = false;
        body.checkCollision.left = false;
        body.checkCollision.right = false;
        platforms.push(r);
      });
    });
    return platforms;
  }

  /** 나무 사다리: 기둥 두 개(세로로 반복) + 12px마다 가로대 */
  private buildLadders() {
    for (const l of this.level.ladders) {
      const ladder: Ladder = { x: l.x, top: FLOOR_Y[l.floor + 1], bottom: FLOOR_Y[l.floor] };
      this.ladders.push(ladder);
      const h = ladder.bottom - ladder.top + 6;
      for (const dx of [-12, 8]) {
        this.add.tileSprite(l.x + dx, ladder.top - 6, 4, h, 'ladder_rail').setOrigin(0, 0).setDepth(1);
      }
      for (let y = ladder.top + 4; y < ladder.bottom; y += 12) {
        this.add.image(l.x - 12, y, 'ladder_rung').setOrigin(0, 0).setDepth(1);
      }
    }
  }

  private buildTraps() {
    for (const t of this.level.traps) {
      const top = FLOOR_Y[t.floor];
      // 가스레인지 화구와 불꽃
      this.add.rectangle(t.x, top - 3, 24, 6, COLORS.trapBase).setDepth(2);
      this.add.rectangle(t.x, top - 6, 18, 2, 0x2b1d2f).setDepth(2);
      const flame = this.add.image(t.x, top - 5, 'flame1').setOrigin(0.5, 1).setDepth(2);
      // 불꽃 주변 일렁이는 불빛(더하기 합성이라 주변이 환해진다)
      const glow = this.add
        .image(t.x, top - 14, 'glow')
        .setTint(0xff9a4a)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setScale(1.3)
        .setDepth(1.5);
      this.traps.push({
        flame,
        glow,
        hit: new Phaser.Geom.Rectangle(t.x - FLAME.width / 2, top - FLAME.height, FLAME.width, FLAME.height),
        cycle:
          t.onMs !== undefined && t.offMs !== undefined
            ? { onMs: t.onMs, offMs: t.offMs, offsetMs: t.offsetMs ?? 0 }
            : undefined,
        active: true,
      });
    }
    this.updateTraps();
  }

  private buildItems() {
    // 이 레벨에서 기절하기 전에 먹은 재료는 먹은 채로 둔다(번호를 맞추려고 보이지 않게 만들어 둔다).
    const before = this.run.taken?.level === this.run.level ? this.run.taken.items : [];
    this.level.items.forEach((it, i) => {
      const cy = FLOOR_Y[it.floor] - 14;
      const obj = this.add.image(it.x, cy, ITEM_TEXTURE[it.kind]).setDepth(3);
      const taken = before.includes(i);
      if (taken) obj.setVisible(false);
      else this.tweens.add({ targets: obj, y: cy - 3, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      this.items.push({ obj, hit: new Phaser.Geom.Rectangle(it.x - 10, cy - 10, 20, 20), taken });
    });
  }

  /** 마녀 HP를 한 판 상태에 적어 둔다(기절해도 유지) */
  private rememberBossHp(hp: number) {
    if (this.run.taken?.level !== this.run.level) this.run.taken = { level: this.run.level, items: [] };
    this.run.taken.bossHp = hp;
  }

  /** 먹은 재료 번호를 한 판 상태에 적어 둔다(기절해도 유지) */
  private rememberTaken(index: number) {
    if (this.run.taken?.level !== this.run.level) this.run.taken = { level: this.run.level, items: [] };
    if (!this.run.taken.items.includes(index)) this.run.taken.items.push(index);
  }

  private buildChests() {
    // 이 레벨에서 기절하기 전에 연 상자는 열린 채로, 나온 것(운동화·몬스터)도 그대로 다시 놓는다.
    const saved = this.run.taken?.level === this.run.level ? this.run.taken.chests ?? {} : {};
    this.level.chests.forEach((c, index) => {
      const top = FLOOR_Y[c.floor];
      // 도시락 상자(28×20)
      const img = this.add.image(c.x, top, 'chest_closed').setOrigin(0.5, 1).setDepth(3);
      const chest: Chest = {
        index,
        img,
        hit: new Phaser.Geom.Rectangle(c.x - 14, top - 20, 28, 20),
        floor: c.floor,
        x: c.x,
        contents: c.contents,
        enemy: c.enemy,
        opened: false,
      };
      this.chests.push(chest);
      const was = saved[index];
      if (was) {
        chest.opened = true;
        img.setTexture('chest_open');
        this.revealChest(chest, was.contents, was.look, was.dir, false);
      }
    });
  }

  private buildLetters() {
    for (const l of this.level.letters) {
      if (this.run.letters.includes(l.char)) continue; // 이미 모은 글자는 다시 놓지 않는다.
      const cy = FLOOR_Y[l.floor] - 16;
      // 분홍 아이싱 글자 쿠키: 좌우로 살랑, 위아래로 통통
      const obj = letterCookie(this, l.x, cy, l.char).setDepth(3);
      this.tweens.add({ targets: obj, angle: { from: -8, to: 8 }, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      this.tweens.add({ targets: obj, y: cy - 3, duration: 450, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      this.letters.push({ obj, hit: new Phaser.Geom.Rectangle(l.x - 11, cy - 11, 22, 22), char: l.char, taken: false });
    }
  }

  private buildPlayer() {
    const feet = FLOOR_Y[this.level.start.floor ?? 0];
    this.player = this.add.rectangle(this.level.start.x, feet - PLAYER.height / 2, PLAYER.width, PLAYER.height);
    this.player.setVisible(false); // 판정용. 그림은 playerSprite
    this.physics.add.existing(this.player);
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setGravityY(PLAYER.gravity);
    body.setCollideWorldBounds(true);
    body.setMaxVelocityY(900);
    // 그림(28×40)은 판정(24×36)보다 조금 커서, 발끝을 판정 바닥에 맞춰 세운다.
    this.playerSprite = this.add.image(this.player.x, this.body.bottom, 'mochi_idle').setOrigin(0.5, 1).setDepth(5);
  }

  private spawnEnemy(def: EnemyDef, delayMs: number, look: EnemyLook = 'pot') {
    // crossGaps면 틈을 무시하고 층 전체(0~WIDTH)를 발판으로 본다.
    const seg: [number, number] | null = def.crossGaps ? [0, WIDTH] : segmentAt(this.level, def.floor, def.x);
    if (!seg) return;
    const y = FLOOR_Y[def.floor] - ENEMY.height / 2;
    const body = this.add.rectangle(def.x, y, ENEMY.width, ENEMY.height).setVisible(false);
    const sprite = this.add.image(def.x, y, `${look}_walk1`).setDepth(4);
    const [left, right] = def.range ? [Math.max(seg[0], def.range[0]), Math.min(seg[1], def.range[1])] : seg;
    const enemy: Enemy = {
      body,
      sprite,
      look,
      min: left + ENEMY.width / 2,
      max: right - ENEMY.width / 2,
      dir: def.dir,
      speed: Math.min(def.speed * DIFFICULTY.enemySpeedScale, DIFFICULTY.enemySpeedCap),
      activeAt: this.elapsed + delayMs,
    };
    if (delayMs > 0) {
      this.tweens.add({ targets: sprite, alpha: 0.2, duration: 100, yoyo: true, repeat: Math.floor(delayMs / 200) });
    }
    this.enemies.push(enemy);
  }

  // ───────────────────────── 플레이어 ─────────────────────────

  private get body(): Phaser.Physics.Arcade.Body {
    return this.player.body as Phaser.Physics.Arcade.Body;
  }

  private placeFeet(x: number, feetY: number) {
    this.body.reset(x, feetY - PLAYER.height / 2);
  }

  private startClimb(ladder: Ladder) {
    this.climbing = ladder;
    this.airborne = false;
    this.body.setAllowGravity(false);
    this.placeFeet(ladder.x, this.body.bottom);
    this.body.setVelocity(0, 0);
  }

  private stopClimb(feetY: number) {
    const l = this.climbing!;
    this.climbing = null;
    this.body.setAllowGravity(true);
    this.placeFeet(l.x, feetY);
    this.body.setVelocity(0, 0);
  }

  private ladderUp(feet: number): Ladder | undefined {
    const x = this.player.x;
    return this.ladders.find(
      (l) => Math.abs(x - l.x) <= PLAYER.ladderGrab && feet > l.top + 1 && feet <= l.bottom + 3,
    );
  }

  private ladderDown(feet: number): Ladder | undefined {
    const x = this.player.x;
    return this.ladders.find((l) => Math.abs(x - l.x) <= PLAYER.ladderGrab && Math.abs(feet - l.top) <= 4);
  }

  private updatePlayer() {
    const body = this.body;
    const k = this.keys;
    const feet = body.bottom;

    if (this.climbing) {
      const l = this.climbing;
      const vy = k.up.isDown ? -PLAYER.climbSpeed : k.down.isDown ? PLAYER.climbSpeed : 0;
      body.setVelocity(0, vy);
      if (vy < 0 && feet <= l.top) this.stopClimb(l.top);
      else if (vy > 0 && feet >= l.bottom) this.stopClimb(l.bottom);
      this.syncSprite();
      return;
    }

    const onGround = body.blocked.down || body.touching.down;
    const boosted = this.boosted;
    const speed = PLAYER.walkSpeed * (boosted ? PLAYER.boostMultiplier : 1);

    // 공중에서는 방향을 바꿀 수 없다(airControl이 false일 때). 뛰기 전에 방향을 정해야 한다.
    if (onGround || PLAYER.airControl) {
      let vx = 0;
      if (k.left.isDown) {
        vx = -speed;
        this.facing = -1;
      } else if (k.right.isDown) {
        vx = speed;
        this.facing = 1;
      }
      body.setVelocityX(vx);
    }

    if (onGround) {
      const ladder = k.up.isDown ? this.ladderUp(feet) : k.down.isDown ? this.ladderDown(feet) : undefined;
      if (ladder) {
        this.startClimb(ladder);
        this.syncSprite();
        return;
      }
      this.groundAt = this.elapsed;
    }
    // 최근에 눌렀고(버퍼), 바닥에 있거나 막 떨어지기 시작했으면(코요테 시간) 뛴다.
    const wantJump = this.elapsed - this.jumpPressedAt <= PLAYER.jumpBufferMs;
    const canJump = onGround || (this.elapsed - this.groundAt <= PLAYER.coyoteMs && body.velocity.y >= 0);
    if (wantJump && canJump) {
      body.setVelocityY(-PLAYER.jumpVelocity);
      audio.play('jump');
      this.dustPuff(this.player.x, feet, 4);
      this.jumpPressedAt = -Infinity;
      this.groundAt = -Infinity; // 공중에서 한 번 더 뛰지 못하게
    }

    // 낙하 높이 추적: 공중에서 가장 높았던 발 위치와 착지 위치의 차이로 판정한다.
    if (!onGround) {
      if (!this.airborne) {
        this.airborne = true;
        this.airPeak = feet;
      } else {
        this.airPeak = Math.min(this.airPeak, feet);
      }
    } else if (this.airborne) {
      this.airborne = false;
      if (feet - this.airPeak > PLAYER.safeFallHeight) this.die();
      else this.dustPuff(this.player.x, feet, 6); // 착지 먼지
    }
    this.syncSprite();
  }

  // ───────────────────────── 입자 효과 ─────────────────────────

  /** 한 번 터지고 사라지는 입자 */
  private burst(
    x: number,
    y: number,
    texture: string,
    count: number,
    config: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig,
  ) {
    const lifespan = typeof config.lifespan === 'number' ? config.lifespan : 600;
    const p = this.add.particles(x, y, texture, { emitting: false, ...config }).setDepth(19);
    p.explode(count);
    this.time.delayedCall(lifespan + 200, () => p.destroy());
  }

  /** 발밑 먼지 */
  private dustPuff(x: number, y: number, count: number) {
    this.burst(x, y - 2, 'dust', count, {
      speed: { min: 20, max: 60 },
      angle: { min: 200, max: 340 },
      lifespan: 350,
      scale: { start: 1.2, end: 0.2 },
      alpha: { start: 0.7, end: 0 },
      tint: 0xe8dcc8,
    });
  }

  /** 반짝이 가루(아이템·글자·상자) */
  private sparkle(x: number, y: number, tint: number | number[], count = 10) {
    this.burst(x, y, 'spark', count, {
      speed: { min: 50, max: 140 },
      lifespan: 520,
      scale: { start: 1.6, end: 0 },
      alpha: { start: 1, end: 0.2 },
      gravityY: 160,
      tint,
      rotate: { min: 0, max: 360 },
    });
    // 순간 번쩍이는 빛
    const flash = this.add.image(x, y, 'glow').setTint(Array.isArray(tint) ? tint[0] : tint).setBlendMode(Phaser.BlendModes.ADD).setDepth(18).setScale(0.4);
    this.tweens.add({ targets: flash, scale: 1.2, alpha: 0, duration: 260, onComplete: () => flash.destroy() });
  }

  /** 모찌 그림을 판정 위치에 맞추고, 상태에 따라 동작 그림을 고른다. */
  private syncSprite() {
    const body = this.body;
    const step = Math.floor(this.elapsed / 150) % 2; // 0.15초마다 발을 바꾼다
    let key = 'mochi_idle';
    let flip = this.facing === -1;
    if (this.climbing) {
      key = 'mochi_climb'; // 사다리에서는 등을 보인다
      flip = body.velocity.y !== 0 ? step === 1 : false; // 오르내릴 때 좌우로 흔들림
    } else if (!(body.blocked.down || body.touching.down)) {
      key = 'mochi_jump'; // 공중
    } else if (body.velocity.x !== 0) {
      key = step === 0 ? 'mochi_walk1' : 'mochi_walk2';
    }
    this.playerSprite.setTexture(key).setFlipX(flip).setPosition(this.player.x, body.bottom);
  }

  // ───────────────────────── 적·함정·수집 ─────────────────────────

  private updateEnemies(dt: number) {
    for (const e of this.enemies) {
      if (this.elapsed < e.activeAt) continue;
      let x = e.body.x + e.dir * e.speed * dt;
      if (x <= e.min) {
        x = e.min;
        e.dir = 1;
      } else if (x >= e.max) {
        x = e.max;
        e.dir = -1;
      }
      e.body.x = x;
      const step = Math.floor(this.elapsed / 220) % 2;
      e.sprite.setTexture(`${e.look}_walk${step + 1}`).setFlipX(e.dir === -1).setPosition(x, e.body.y);
    }
  }

  private updateTraps() {
    for (const t of this.traps) {
      let warning = false;
      if (t.cycle) {
        const { onMs, offMs, offsetMs } = t.cycle;
        const phase = (this.elapsed + offsetMs) % (onMs + offMs);
        t.active = phase < onMs;
        warning = !t.active && onMs + offMs - phase < 400; // 켜지기 직전 예고
      } else {
        t.active = true;
      }
      t.flame.setVisible(t.active || warning);
      t.flame.setTexture(Math.floor(this.elapsed / 120) % 2 === 0 ? 'flame1' : 'flame2');
      t.flame.setScale(1, t.active ? 1 : 0.3);
      t.flame.setAlpha(t.active ? 1 : 0.6);
      // 불빛이 일렁인다
      const flicker = 0.45 + 0.15 * Math.sin(this.elapsed / 90) + 0.08 * Math.sin(this.elapsed / 37);
      t.glow.setVisible(t.active).setAlpha(flicker);
    }
  }

  private checkHazards() {
    // 발바닥과 몬스터 머리는 줄이지 않는다. 점프 높이가 몬스터 키보다 낮으면 반드시 부딪힌다.
    const g = DIFFICULTY.hitForgiveness;
    const p = this.player.getBounds();
    const pb = new Phaser.Geom.Rectangle(p.x + g, p.y + g, p.width - g * 2, p.height - g);
    for (const e of this.enemies) {
      if (this.elapsed < e.activeAt) continue;
      const b = e.body.getBounds();
      if (Phaser.Geom.Rectangle.Overlaps(pb, new Phaser.Geom.Rectangle(b.x + g, b.y, b.width - g * 2, b.height))) return this.die();
    }
    for (const t of this.traps) {
      if (t.active && Phaser.Geom.Rectangle.Overlaps(pb, t.hit)) return this.die();
    }
    if (this.boss?.hurts(pb)) return this.die();
  }

  private checkPickups() {
    const pb = this.player.getBounds();
    const overlaps = (r: Rect) => Phaser.Geom.Rectangle.Overlaps(pb, r);

    for (const l of this.letters) {
      if (l.taken || !overlaps(l.hit)) continue;
      l.taken = true;
      this.sparkle(l.obj.x, l.obj.y, [0xffe08a, 0xffffff], 12);
      this.collectEffect(l.obj);
      this.addScore(SCORE.letter, l.obj.x, l.obj.y);
      if (!this.run.letters.includes(l.char)) this.run.letters.push(l.char);
      const slot = this.hud.letters[[...BONUS_WORD].indexOf(l.char)];
      if (slot) this.tweens.add({ targets: slot, scale: { from: 1.8, to: 1 }, duration: 300, ease: 'Back.out' });
      if ([...BONUS_WORD].every((c) => this.run.letters.includes(c))) {
        this.run.lives += 1;
        this.run.letters = [];
        this.floatText('1UP!', this.player.x, this.player.y - 40, '#7dff7a');
        audio.play('oneUp');
      } else {
        audio.play('letter');
      }
    }

    for (const c of this.chests) {
      if (c.opened || !overlaps(c.hit)) continue;
      this.openChest(c);
    }

    for (const b of this.boots) {
      if (b.taken) continue;
      const over = overlaps(b.hit);
      if (!b.ready) {
        // 상자는 가장자리에 닿는 순간 열리므로, 걸어 들어오던 그대로 밟아 신지 않게
        // 열린 뒤 0.6초가 지나고, 그때 운동화에서 비켜나 있어야 신을 수 있게 된다.
        // (걸어서 지나가면 그대로 두고, 되돌아와 밟으면 신는다)
        if (this.elapsed - b.openedAt >= 600 && !over) b.ready = true;
        continue;
      }
      if (!over) continue;
      b.taken = true;
      this.boosted = true;
      this.sparkle(b.obj.x, b.obj.y, [0x9fe3ff, 0xffffff, 0xff8fae], 14);
      this.floatText('토끼 운동화를 신었다!', b.obj.x, b.obj.y - 24, '#7ad0ff');
      this.collectEffect(b.obj);
      audio.play('boots');
    }

    let picked = false;
    this.items.forEach((it, i) => {
      if (it.taken || !overlaps(it.hit)) return;
      it.taken = true;
      this.rememberTaken(i);
      picked = true;
      this.addScore(SCORE.item, it.obj.x, it.obj.y);
      this.sparkle(it.obj.x, it.obj.y, ITEM_SPARK[this.level.items[i].kind]);
      it.obj.destroy();
      audio.play('pickup');
    });
    // 보스전은 아이템이 아니라 보스를 쓰러뜨려야 끝난다. 보석을 모두 모으면 공격이 열린다.
    const allTaken = this.items.every((it) => it.taken);
    if (!this.boss && allTaken) this.clearLevel();
    else if (this.boss && allTaken && !this.boss.armed) {
      this.boss.arm();
      audio.play('oneUp');
      this.showBanner('공격 가능!', '마녀 위에서 Z키로 반죽을 던져라', 1500, ['#ffe0ec', '#ff7aa8']);
      if (picked) this.pickupPause();
    } else if (picked) this.pickupPause();
  }

  /** 아이템을 먹는 순간 플레이어·몬스터·함정·타이머를 포함한 게임 전체가 잠깐 멈춘다. */
  private pickupPause() {
    if (PICKUP_PAUSE_MS <= 0 || this.phase !== 'playing') return;
    this.phase = 'hitstop';
    this.updateHud();
    this.physics.world.pause();
    this.tweens.pauseAll();
    this.time.delayedCall(PICKUP_PAUSE_MS, () => {
      if (this.phase !== 'hitstop') return;
      this.phase = 'playing';
      this.physics.world.resume();
      this.tweens.resumeAll();
    });
  }

  private openChest(c: Chest) {
    c.opened = true;
    c.img.setTexture('chest_open');

    const options = (Object.entries(DIFFICULTY.chestWeights) as [ChestContent, number][]).flatMap(([k, w]) =>
      Array<ChestContent>(w).fill(k),
    );
    const contents = c.contents ?? Phaser.Utils.Array.GetRandom(options);
    // 어떤 몬스터가 나올지는 무작위(몬스터 7종 중 하나), 플레이어 반대쪽으로 출발
    const look = contents === 'enemy' ? Phaser.Utils.Array.GetRandom(ALL_MONSTERS) : undefined;
    const dir: 1 | -1 = this.player.x < c.x ? 1 : -1;
    // 기절해도 열린 상자와 나온 것을 기억한다
    if (this.run.taken?.level !== this.run.level) this.run.taken = { level: this.run.level, items: [] };
    this.run.taken.chests = { ...this.run.taken.chests, [c.index]: { contents, look, dir } };

    audio.play('chest');
    // 뚜껑이 열리며 알록달록 가루가 튄다
    this.sparkle(c.x, c.img.y - 12, [0xff8fae, 0x9fe3ff, 0xffe08a, 0xc9a0ff], 16);
    this.tweens.add({ targets: c.img, scaleY: 1.25, scaleX: 0.85, duration: 80, yoyo: true });
    this.revealChest(c, contents, look, dir, true);
  }

  /**
   * 상자에서 나온 것을 놓는다. fresh = 지금 막 연 것(알림·소리·튀어나오는 연출),
   * false = 기절 후 다시 시작할 때 전에 열어 둔 상자를 되살리는 것.
   */
  private revealChest(c: Chest, contents: ChestContent, look: EnemyLook | undefined, dir: 1 | -1 | undefined, fresh: boolean) {
    const y = c.img.y - 44;
    if (contents === 'boots') {
      // 운동화가 상자 위에 놓인다. 신을지 말지는 플레이어가 정한다.
      // (기절 전에 이미 신었던 운동화도 기절하면 벗겨지므로 다시 상자 위에 놓인다)
      const top = FLOOR_Y[c.floor] - 20; // 상자 윗면
      const restY = top - 10;
      const bob = (obj: Phaser.GameObjects.Image) =>
        this.tweens.add({ targets: obj, y: restY - 3, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      const obj = this.add.image(c.x, fresh ? top + 4 : restY, 'item_boots').setDepth(4);
      if (fresh) this.tweens.add({ targets: obj, y: restY, duration: 260, ease: 'Back.out', onComplete: () => bob(obj) });
      else bob(obj);
      this.boots.push({
        obj,
        hit: new Phaser.Geom.Rectangle(c.x - 12, top - 22, 24, 24),
        openedAt: fresh ? this.elapsed : -Infinity,
        ready: false,
        taken: false,
      });
      if (fresh) {
        this.floatText('토끼 운동화! 다시 밟으면 신어요', c.x, y, '#7ad0ff');
        audio.play('bonus');
      }
    } else {
      const kind = look ?? Phaser.Utils.Array.GetRandom(ALL_MONSTERS);
      if (fresh) {
        audio.play('spawn');
        this.floatText(`앗, ${MONSTER_NAMES[kind]}!`, c.x, y, '#ffb06b');
      }
      const crossGaps = c.enemy?.crossGaps ?? false;
      const range: [number, number] =
        c.enemy?.range ?? (crossGaps ? [0, WIDTH] : [c.x - CHEST_ENEMY_RANGE, c.x + CHEST_ENEMY_RANGE]);
      // spawnEnemy가 배율을 곱하므로 미리 나눠 둔다.
      const speed = DIFFICULTY.chestEnemySpeed / DIFFICULTY.enemySpeedScale;
      this.spawnEnemy({ floor: c.floor, x: c.x, dir: dir ?? 1, speed, range, crossGaps }, 800, kind);
    }
  }

  private collectEffect(obj: Phaser.GameObjects.GameObject & { setScale: (s: number) => unknown }) {
    this.tweens.killTweensOf(obj);
    this.tweens.add({ targets: obj, scale: 1.8, alpha: 0, duration: 250, onComplete: () => obj.destroy() });
  }

  private addScore(points: number, x: number, y: number) {
    this.run.score += points;
    this.floatText(`+${points}`, x, y - 10, '#ffffff');
  }

  /** 톡 튀어나왔다가 떠오르며 사라지는 짧은 알림(ui/text.ts) */
  private floatText(text: string, x: number, y: number, color: string) {
    popText(this, x, y, text, color);
  }

  // ───────────────────────── 상태 전환 ─────────────────────────

  private togglePause() {
    if (this.phase === 'playing') {
      this.phase = 'paused';
      this.physics.world.pause();
      this.tweens.pauseAll();
      this.overlay = this.makePauseMenu();
      audio.pauseMusic();
      audio.play('pause');
    } else if (this.phase === 'paused') {
      this.resumeFromPause();
    }
  }

  /** 일시정지 화면: [계속하기] [처음부터 다시 시작] [시작 화면으로] */
  private makePauseMenu(): Phaser.GameObjects.Container {
    const cx = WIDTH / 2;
    const cy = PLAY_HEIGHT / 2;
    const bg = this.add.rectangle(cx, cy, WIDTH, PLAY_HEIGHT, 0x000000, 0.6);
    const title = titleText(this, cx, cy - 140, '일시정지', 36, ['#ffffff', '#c9b8ff']);
    const items: [string, () => void][] = [
      ['계속하기', () => this.resumeFromPause()],
      ['처음부터 다시 시작', () => this.leaveGame('restart')],
      ['시작 화면으로', () => this.leaveGame('title')],
    ];
    const buttons = items.map(([label, fn], i) => new MenuButton(this, cx, cy - 50 + i * 72, 320, 54, label, fn, 22));
    const hint = this.add
      .text(cx, cy + 176, '↑ ↓  고르기     ENTER / SPACE  결정     ESC  계속', { ...STYLE.small, color: '#c9b8d6' })
      .setOrigin(0.5);
    this.pauseMenu = new Menu(this, buttons, 'vertical');
    return this.add.container(0, 0, [bg, title, ...buttons.map((b) => b.container), hint]).setDepth(50);
  }

  private resumeFromPause() {
    if (this.phase !== 'paused') return;
    this.phase = 'playing';
    this.physics.world.resume();
    this.tweens.resumeAll();
    audio.play('pause');
    audio.resumeMusic();
    this.pauseMenu?.destroy();
    this.pauseMenu = undefined;
    this.overlay?.destroy();
    this.overlay = undefined;
  }

  /** 일시정지 화면에서 새 게임(LEVEL 1부터, 생명·점수·글자 처음 상태) 또는 시작 화면으로 */
  private leaveGame(to: 'restart' | 'title') {
    if (this.phase !== 'paused') return;
    this.pauseMenu?.destroy();
    this.pauseMenu = undefined;
    this.physics.world.resume();
    this.tweens.resumeAll();
    audio.stopMusic();
    this.phase = 'clear'; // 장면이 바뀌는 동안 입력·판정을 막는다
    this.cameras.main.fadeOut(250, 20, 10, 30);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      if (to === 'restart') this.scene.restart({ run: newRun() });
      else this.scene.start('Title');
    });
  }

  private die() {
    if (this.phase !== 'playing') return;
    this.phase = 'dying';
    this.physics.world.pause();
    audio.stopMusic();
    audio.play('death');
    this.climbing = null;
    // 발끝 기준으로 세워 둔 그림을 몸 가운데 기준으로 바꿔야 옆으로 쓰러질 때 바닥을 파고들지 않는다.
    this.playerSprite.setTexture('mochi_idle').setTint(0xb8b0c8).setOrigin(0.5, 0.5).setPosition(this.player.x, this.player.y);
    this.tweens.add({ targets: this.playerSprite, angle: 90 * this.facing, duration: 250 });
    this.tweens.add({ targets: this.playerSprite, alpha: 0.3, duration: 120, yoyo: true, repeat: 4 });
    this.showDizzyStars();
    this.cameras.main.shake(180, 0.008);
    this.fadeOutAfter(900);

    this.time.delayedCall(1200, () => {
      this.run.lives -= 1;
      if (this.run.lives > 0) this.scene.restart({ run: this.run });
      else this.scene.start('End', { type: 'gameover', score: this.run.score, level: this.run.level + 1 });
    });
  }

  /** ms 뒤에 화면을 어둡게 닫는다(다음 장면으로 넘어가기 직전) */
  private fadeOutAfter(ms: number) {
    this.time.delayedCall(ms, () => this.cameras.main.fadeOut(280, 20, 10, 30));
  }

  /** 기절 연출: 쓰러진 모찌의 머리 위를 별 세 개가 빙글빙글 돈다. */
  private showDizzyStars() {
    // 모찌는 바라보던 쪽으로 쓰러지므로 머리도 그쪽에 있다.
    const cx = this.player.x + this.facing * 13;
    const cy = this.player.y - 14;
    const stars = [0, 1, 2].map(() => this.add.image(cx, cy, 'dizzy_star').setDepth(21));
    this.tweens.addCounter({
      from: 0,
      to: 1,
      duration: 1200,
      onUpdate: (tw) => {
        const t = tw.getValue() ?? 0;
        stars.forEach((s, i) => {
          const a = t * Math.PI * 4 + (i * Math.PI * 2) / 3; // 1.2초에 두 바퀴
          s.setPosition(cx + Math.cos(a) * 14, cy + Math.sin(a) * 5); // 납작한 타원
          s.setScale(Math.sin(a) > 0 ? 1 : 0.7); // 뒤쪽을 돌 때는 작게
        });
      },
    });
  }

  private clearLevel() {
    if (this.phase !== 'playing') return;
    this.phase = 'clear';
    this.physics.world.pause();
    audio.stopMusic();
    audio.play('clear');
    this.updateHud();
    this.showBanner('LEVEL CLEAR!', '', 1500, ['#e6ffb0', '#5fd36a']);
    this.sparkle(this.player.x, this.player.y - 10, [0xe6ffb0, 0xffe08a, 0xffffff], 20);
    this.fadeOutAfter(1300);
    this.time.delayedCall(1600, () => {
      this.run.level += 1;
      if (this.run.level >= LEVELS.length) this.scene.start('End', { type: 'victory', score: this.run.score });
      else this.scene.restart({ run: this.run });
    });
  }

  private bossDefeated() {
    if (this.phase !== 'playing') return;
    this.phase = 'clear';
    this.physics.world.pause();
    audio.stopMusic();
    this.updateHud();
    const name = this.level.boss?.name ?? '보스';
    this.time.delayedCall(900, () => this.showBanner('VICTORY!', `${name} 격파!`, 2000, ['#fffbd0', '#ffb43d']));
    this.cameras.main.flash(250, 255, 240, 200);
    this.fadeOutAfter(2900);
    this.time.delayedCall(3200, () => {
      this.run.level += 1;
      if (this.run.level >= LEVELS.length) {
        this.scene.start('End', { type: 'victory', score: this.run.score, boss: name });
      } else {
        this.scene.restart({ run: this.run });
      }
    });
  }

  // ───────────────────────── HUD·오버레이 ─────────────────────────

  /** 관리자 전용: 게임 중 숫자키로 해당 레벨로 바로 이동한다. 점수·생명·글자는 그대로 둔다. */
  private setupAdmin() {
    this.add
      .text(WIDTH - 8, 6, `[관리자] ${levelKeysLabel(LEVELS.length)} 레벨 이동`, { ...STYLE.small, color: '#ff9f43' })
      .setOrigin(1, 0)
      .setAlpha(0.8)
      .setDepth(60);
    this.input.keyboard!.on('keydown', (e: KeyboardEvent) => {
      const level = levelFromKey(e, LEVELS.length);
      if (level === null) return;
      this.run.level = level;
      this.run.taken = undefined; // 관리자 이동은 그 레벨을 처음부터
      this.scene.restart({ run: this.run });
    });
  }

  private buildHud() {
    // 두 줄: 위 = 생명·레벨·점수·소리, 아래 = 아이템(보스)·부츠·보너스 글자
    const row1 = PLAY_HEIGHT + 15;
    const row2 = PLAY_HEIGHT + 37;
    this.add.rectangle(WIDTH / 2, PLAY_HEIGHT + HUD_HEIGHT / 2, WIDTH, HUD_HEIGHT, COLORS.hud).setDepth(30);
    // 위아래 테두리 줄로 게임기 화면 느낌을 낸다.
    this.add.rectangle(WIDTH / 2, PLAY_HEIGHT + 1, WIDTH, 2, 0xf4a6b8).setDepth(30);
    this.add.rectangle(WIDTH / 2, PLAY_HEIGHT + 3, WIDTH, 1, 0x5e3a70).setDepth(30);
    const at = (x: number, y: number, color = '#f3e9ff') =>
      this.add.text(x, y, '', { ...STYLE.hud, color }).setOrigin(0, 0.5).setDepth(31);
    this.hud = {
      lives: at(12, row1, '#ff8fae'),
      hearts: Array.from({ length: HEART_SLOTS }, (_, i) =>
        this.add.image(62 + i * 16, row1, 'heart').setDepth(31),
      ),
      level: at(200, row1, '#fff4a8'),
      score: at(330, row1),
      sound: at(WIDTH - 86, row1, '#9a8fb0'),
      items: at(12, row2, '#9fe3ff'),
      boost: at(330, row2, '#7ad0ff'),
      letters: [...BONUS_WORD].map((c, i) =>
        letterCookie(this, WIDTH - 20 - (BONUS_WORD.length - 1 - i) * 22, row2, c, 'small').setDepth(31),
      ),
    };
    this.updateHud();
  }

  private updateHud() {
    const remaining = this.items.filter((i) => !i.taken).length;
    const lives = Math.max(this.run.lives, 0);
    // 하트 아이콘: 남은 생명만큼 빨간 하트, 잃은 생명은 빈 하트(처음 생명 수까지). 최대 HEART_SLOTS개
    this.hud.lives.setText('LIFE');
    this.hud.hearts.forEach((h, i) => h.setVisible(i < Math.max(lives, START_LIVES)).setTexture(i < lives ? 'heart' : 'heart_empty'));
    this.hud.level.setText(`LEVEL ${this.run.level + 1}`);
    this.hud.score.setText(`SCORE ${String(this.run.score).padStart(6, '0')}`);
    if (this.boss && !this.boss.armed) {
      this.hud.items.setText(`GEM ${this.items.length - remaining}/${this.items.length}`);
    } else if (this.boss) {
      const hp = Math.max(this.boss.hp, 0);
      this.hud.items.setText(`BOSS ${'■'.repeat(hp)}${'□'.repeat(this.boss.maxHp - hp)}`);
    } else {
      this.hud.items.setText(`ITEM ${this.items.length - remaining}/${this.items.length}`);
    }

    this.hud.boost.setText(this.boosted ? 'BOOTS ON' : '');
    this.hud.sound.setText(audio.muted ? 'M ♪OFF' : 'M ♪ON');
    [...BONUS_WORD].forEach((c, i) => setCookieLit(this.hud.letters[i], this.run.letters.includes(c)));
  }

  /** 화면 가운데 큰 알림. colors는 글자 위·아래 그라데이션 색 */
  private showBanner(title: string, sub: string, ms: number, colors?: [string, string]) {
    banner(this, WIDTH / 2, PLAY_HEIGHT / 2, title, sub, ms, colors);
  }
}

