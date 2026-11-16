import Phaser from 'phaser';
import {
  BLOCK_SIZE,
  BONUS_WORD,
  CHEST_ENEMY_RANGE,
  COLORS,
  DIFFICULTY,
  ENEMY,
  FLAME,
  FLOOR_THICKNESS,
  FLOOR_Y,

  HUD_HEIGHT,
  PLAYER,
  PICKUP_PAUSE_MS,
  PLAY_HEIGHT,
  SCORE,
  TILE,
  WIDTH,
} from '../config';
import { LEVELS, segmentAt, validateLevel } from '../levels';
import type { ChestContent, ChestDef, EnemyDef, ItemKind, LevelDef } from '../levels/types';
import type { RunState } from '../state';
import { ADMIN, levelFromKey, levelKeysLabel } from '../admin';
import { audio } from '../audio';
import { BossFight } from './BossFight';

/** hitstop: 아이템을 먹은 순간의 짧은 전체 정지 */
type Phase = 'playing' | 'paused' | 'dying' | 'clear' | 'hitstop';
type Rect = Phaser.Geom.Rectangle;

interface Ladder {
  x: number;
  top: number;
  bottom: number;
}

interface Pickup {
  obj: Phaser.GameObjects.Shape;
  hit: Rect;
  taken: boolean;
}

interface Chest {
  box: Phaser.GameObjects.Rectangle;
  lid: Phaser.GameObjects.Rectangle;
  hit: Rect;
  floor: number;
  x: number;
  contents?: ChestContent;
  enemy?: ChestDef['enemy'];
  opened: boolean;
}

interface Letter {
  obj: Phaser.GameObjects.Text;
  hit: Rect;
  char: string;
  taken: boolean;
}

interface Enemy {
  body: Phaser.GameObjects.Rectangle;
  eye: Phaser.GameObjects.Rectangle;
  min: number;
  max: number;
  dir: 1 | -1;
  speed: number;
  /** 이 시각(elapsed ms) 전에는 깜빡이기만 하고 움직이거나 해치지 않는다. */
  activeAt: number;
}

interface Trap {
  flame: Phaser.GameObjects.Rectangle;
  hit: Rect;
  /** 없으면 항상 켜져 있다. */
  cycle?: { onMs: number; offMs: number; offsetMs: number };
  active: boolean;
}

const ITEM_STYLE: Record<ItemKind, number> = {
  gem: 0x5ad1ff,
  apple: 0xff5a5a,
  coin: 0xffd23f,
};

/** 몬스터 눈의 세로 위치(몸 중심 기준). */
const EYE_DY = -ENEMY.height / 2 + 10;

export class GameScene extends Phaser.Scene {
  private run!: RunState;
  private level!: LevelDef;
  private phase: Phase = 'playing';
  /** 일시정지 중에는 멈추는 플레이 시간(ms). 함정 주기와 부츠 지속 시간에 쓴다. */
  private elapsed = 0;

  private player!: Phaser.GameObjects.Rectangle;
  private playerEye!: Phaser.GameObjects.Rectangle;
  private facing: 1 | -1 = 1;
  private climbing: Ladder | null = null;
  private airborne = false;
  private airPeak = 0;
  private boostUntil = 0;

  private ladders: Ladder[] = [];
  private items: Pickup[] = [];
  private chests: Chest[] = [];
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
    level: Phaser.GameObjects.Text;
    score: Phaser.GameObjects.Text;
    items: Phaser.GameObjects.Text;
    boost: Phaser.GameObjects.Text;
    sound: Phaser.GameObjects.Text;
    letters: Phaser.GameObjects.Text[];
  };
  private overlay?: Phaser.GameObjects.Container;

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
    this.boostUntil = 0;
    this.ladders = [];
    this.items = [];
    this.chests = [];
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
    this.level.enemies.forEach((e) => this.spawnEnemy(e, 0));
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

    this.buildHud();
    if (ADMIN) this.setupAdmin();
    if (this.level.boss) {
      this.showBanner(`LEVEL ${this.run.level + 1} · BOSS`, `${this.level.boss.name} — 보석을 모두 모으면 공격할 수 있다`, 2200);
    } else {
      this.showBanner(`LEVEL ${this.run.level + 1}`, this.level.name, 1200);
    }
    audio.unlock();
    audio.startMusic();
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
    this.updateTraps();
    if (this.phase === 'playing') this.checkHazards();
    if (this.phase === 'playing') this.checkPickups();
    this.updateHud();
  }

  // ───────────────────────── 맵 구성 ─────────────────────────

  private drawBackground() {
    const g = this.add.graphics();
    g.fillStyle(COLORS.wall).fillRect(0, 0, WIDTH, PLAY_HEIGHT);
    g.lineStyle(1, COLORS.brick);
    for (let y = 0, row = 0; y < PLAY_HEIGHT; y += 24, row++) {
      g.lineBetween(0, y, WIDTH, y);
      for (let x = row % 2 ? 24 : 0; x < WIDTH; x += 48) g.lineBetween(x, y, x, y + 24);
    }
  }

  /** 발판 블록 한 칸. 밟는 면(물리)은 윗면이고, 블록은 그 아래로 BLOCK_SIZE만큼 그린다. */
  private drawBlock(g: Phaser.GameObjects.Graphics, col: number, top: number) {
    const x = col * TILE;
    const s = BLOCK_SIZE;
    g.fillStyle(COLORS.floor).fillRect(x, top, TILE, s);
    g.fillStyle(COLORS.floorTop).fillRect(x, top, TILE, 3); // 윗면 밝게
    g.fillStyle(COLORS.floorTop).fillRect(x, top, 2, s); // 왼쪽 밝게
    g.fillStyle(COLORS.floorBottom).fillRect(x + TILE - 2, top, 2, s); // 오른쪽 어둡게(칸 경계)
    g.fillStyle(COLORS.floorBottom).fillRect(x, top + s - 3, TILE, 3); // 아랫면 어둡게
    if (ADMIN) {
      // 개발 중에는 칸 번호를 적는다. floors의 [a, b]와 바로 맞춰 볼 수 있다.
      this.add
        .text(x + TILE / 2, top + s / 2 + 1, String(col), {
          fontFamily: 'monospace',
          fontSize: '11px',
          color: '#3b3e4a',
        })
        .setOrigin(0.5)
        .setDepth(0.5);
    }
  }

  private buildFloors(): Phaser.GameObjects.Rectangle[] {
    const platforms: Phaser.GameObjects.Rectangle[] = [];
    const g = this.add.graphics();
    this.level.floors.forEach((segments, floor) => {
      const top = FLOOR_Y[floor];
      for (const [a, b] of segments) {
        const x = a * TILE;
        const w = (b - a) * TILE;
        // 한 칸(32px)마다 네모 블록 하나. 레벨 데이터의 칸 번호와 화면이 그대로 대응한다.
        for (let col = a; col < b; col++) this.drawBlock(g, col, top);

        // 위에서만 밟히는 한 방향 발판. 아래·옆에서는 통과한다.
        const r = this.add.rectangle(x + w / 2, top + FLOOR_THICKNESS / 2, w, FLOOR_THICKNESS);
        r.setVisible(false);
        this.physics.add.existing(r, true);
        const body = r.body as Phaser.Physics.Arcade.StaticBody;
        body.checkCollision.down = false;
        body.checkCollision.left = false;
        body.checkCollision.right = false;
        platforms.push(r);
      }
    });
    return platforms;
  }

  private buildLadders() {
    const g = this.add.graphics().setDepth(1);
    for (const l of this.level.ladders) {
      const ladder: Ladder = { x: l.x, top: FLOOR_Y[l.floor + 1], bottom: FLOOR_Y[l.floor] };
      this.ladders.push(ladder);
      g.fillStyle(COLORS.ladder);
      g.fillRect(l.x - 12, ladder.top - 6, 3, ladder.bottom - ladder.top + 6);
      g.fillRect(l.x + 9, ladder.top - 6, 3, ladder.bottom - ladder.top + 6);
      for (let y = ladder.top + 4; y < ladder.bottom; y += 12) g.fillRect(l.x - 12, y, 24, 3);
    }
  }

  private buildTraps() {
    for (const t of this.level.traps) {
      const top = FLOOR_Y[t.floor];
      this.add.rectangle(t.x, top - 3, 24, 6, COLORS.trapBase).setDepth(2);
      const flame = this.add
        .rectangle(t.x, top - 6, FLAME.width, FLAME.height - 6, COLORS.flame)
        .setOrigin(0.5, 1)
        .setDepth(2);
      this.traps.push({
        flame,
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
    for (const it of this.level.items) {
      const cy = FLOOR_Y[it.floor] - 14;
      const color = ITEM_STYLE[it.kind];
      const obj: Phaser.GameObjects.Shape =
        it.kind === 'gem'
          ? this.add.rectangle(it.x, cy, 14, 14, color).setAngle(45)
          : this.add.circle(it.x, cy, 8, color);
      obj.setDepth(3);
      this.tweens.add({ targets: obj, y: cy - 3, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      this.items.push({ obj, hit: new Phaser.Geom.Rectangle(it.x - 10, cy - 10, 20, 20), taken: false });
    }
  }

  private buildChests() {
    for (const c of this.level.chests) {
      const top = FLOOR_Y[c.floor];
      const box = this.add.rectangle(c.x, top - 10, 28, 20, COLORS.chest).setDepth(3);
      const lid = this.add.rectangle(c.x, top - 17, 30, 6, COLORS.chestLid).setDepth(3);
      this.chests.push({
        box,
        lid,
        hit: new Phaser.Geom.Rectangle(c.x - 14, top - 20, 28, 20),
        floor: c.floor,
        x: c.x,
        contents: c.contents,
        enemy: c.enemy,
        opened: false,
      });
    }
  }

  private buildLetters() {
    for (const l of this.level.letters) {
      if (this.run.letters.includes(l.char)) continue; // 이미 모은 글자는 다시 놓지 않는다.
      const cy = FLOOR_Y[l.floor] - 16;
      const obj = this.add
        .text(l.x, cy, l.char, {
          fontFamily: 'monospace',
          fontSize: '18px',
          fontStyle: 'bold',
          color: '#1b1d26',
          backgroundColor: '#f5e663',
          padding: { x: 6, y: 2 },
        })
        .setOrigin(0.5)
        .setDepth(3);
      this.tweens.add({ targets: obj, angle: { from: -8, to: 8 }, duration: 600, yoyo: true, repeat: -1 });
      this.letters.push({ obj, hit: new Phaser.Geom.Rectangle(l.x - 11, cy - 11, 22, 22), char: l.char, taken: false });
    }
  }

  private buildPlayer() {
    const feet = FLOOR_Y[this.level.start.floor ?? 0];
    this.player = this.add.rectangle(this.level.start.x, feet - PLAYER.height / 2, PLAYER.width, PLAYER.height, COLORS.player);
    this.player.setDepth(5);
    this.physics.add.existing(this.player);
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setGravityY(PLAYER.gravity);
    body.setCollideWorldBounds(true);
    body.setMaxVelocityY(900);
    this.playerEye = this.add.rectangle(0, 0, 6, 6, 0x1b1d26).setDepth(6);
  }

  private spawnEnemy(def: EnemyDef, delayMs: number) {
    // crossGaps면 틈을 무시하고 층 전체(0~WIDTH)를 발판으로 본다.
    const seg: [number, number] | null = def.crossGaps ? [0, WIDTH] : segmentAt(this.level, def.floor, def.x);
    if (!seg) return;
    const y = FLOOR_Y[def.floor] - ENEMY.height / 2;
    const body = this.add.rectangle(def.x, y, ENEMY.width, ENEMY.height, COLORS.enemy).setDepth(4);
    const eye = this.add.rectangle(def.x, y + EYE_DY, 6, 6, 0xffffff).setDepth(4);
    const [left, right] = def.range ? [Math.max(seg[0], def.range[0]), Math.min(seg[1], def.range[1])] : seg;
    const enemy: Enemy = {
      body,
      eye,
      min: left + ENEMY.width / 2,
      max: right - ENEMY.width / 2,
      dir: def.dir,
      speed: Math.min(def.speed * DIFFICULTY.enemySpeedScale, DIFFICULTY.enemySpeedCap),
      activeAt: this.elapsed + delayMs,
    };
    if (delayMs > 0) {
      this.tweens.add({ targets: [body, eye], alpha: 0.2, duration: 100, yoyo: true, repeat: Math.floor(delayMs / 200) });
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
      this.syncEye();
      return;
    }

    const onGround = body.blocked.down || body.touching.down;
    const boosted = this.elapsed < this.boostUntil;
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
        this.syncEye();
        return;
      }
      if (Phaser.Input.Keyboard.JustDown(k.jump)) {
        body.setVelocityY(-PLAYER.jumpVelocity);
        audio.play('jump');
      }
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
    }
    this.syncEye();
  }

  private syncEye() {
    const climbingNow = this.climbing !== null;
    this.playerEye.setVisible(!climbingNow); // 사다리에서는 등을 보인다.
    this.playerEye.setPosition(this.player.x + this.facing * 6, this.player.y - 9);
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
      e.eye.setPosition(x + e.dir * 6, e.body.y + EYE_DY);
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
      t.flame.setScale(1, t.active ? 1 : 0.25);
      t.flame.setAlpha(t.active ? 0.6 + 0.4 * Math.abs(Math.sin(this.elapsed / 60)) : 0.6);
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
      this.collectEffect(l.obj);
      this.addScore(SCORE.letter, l.obj.x, l.obj.y);
      if (!this.run.letters.includes(l.char)) this.run.letters.push(l.char);
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

    let picked = false;
    for (const it of this.items) {
      if (it.taken || !overlaps(it.hit)) continue;
      it.taken = true;
      picked = true;
      this.addScore(SCORE.item, it.obj.x, it.obj.y);
      it.obj.destroy();
      audio.play('pickup');
    }
    // 보스전은 아이템이 아니라 보스를 쓰러뜨려야 끝난다. 보석을 모두 모으면 공격이 열린다.
    const allTaken = this.items.every((it) => it.taken);
    if (!this.boss && allTaken) this.clearLevel();
    else if (this.boss && allTaken && !this.boss.armed) {
      this.boss.arm();
      audio.play('oneUp');
      this.showBanner('공격 가능!', '보스 위에서 Z키로 돌을 던져라', 1500);
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
    c.box.setFillStyle(COLORS.chestOpen);
    c.lid.setFillStyle(COLORS.chestOpen).setAngle(-25).setY(c.lid.y - 6);

    const options = (Object.entries(DIFFICULTY.chestWeights) as [ChestContent, number][]).flatMap(([k, w]) =>
      Array<ChestContent>(w).fill(k),
    );
    const contents = c.contents ?? Phaser.Utils.Array.GetRandom(options);
    const y = c.box.y - 24;
    audio.play('chest');
    if (contents === 'boots') {
      this.boostUntil = this.elapsed + PLAYER.boostDurationMs;
      this.floatText('스피드 부츠!', c.x, y, '#7ad0ff');
      audio.play('boots');
    } else {
      audio.play('spawn');
      this.floatText('앗, 몬스터!', c.x, y, '#ff7aa8');
      const dir: 1 | -1 = this.player.x < c.x ? 1 : -1; // 플레이어 반대쪽으로 출발
      const crossGaps = c.enemy?.crossGaps ?? false;
      const range: [number, number] =
        c.enemy?.range ?? (crossGaps ? [0, WIDTH] : [c.x - CHEST_ENEMY_RANGE, c.x + CHEST_ENEMY_RANGE]);
      // spawnEnemy가 배율을 곱하므로 미리 나눠 둔다.
      const speed = DIFFICULTY.chestEnemySpeed / DIFFICULTY.enemySpeedScale;
      this.spawnEnemy({ floor: c.floor, x: c.x, dir, speed, range, crossGaps }, 800);
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

  private floatText(text: string, x: number, y: number, color: string) {
    const t = this.add
      .text(x, y, text, { fontFamily: 'monospace', fontSize: '14px', fontStyle: 'bold', color, stroke: '#000', strokeThickness: 3 })
      .setOrigin(0.5)
      .setDepth(20);
    this.tweens.add({ targets: t, y: y - 30, alpha: 0, duration: 900, onComplete: () => t.destroy() });
  }

  // ───────────────────────── 상태 전환 ─────────────────────────

  private togglePause() {
    if (this.phase === 'playing') {
      this.phase = 'paused';
      this.physics.world.pause();
      this.tweens.pauseAll();
      this.overlay = this.makeOverlay('일시정지', 'P 또는 Esc로 계속');
      audio.pauseMusic();
      audio.play('pause');
    } else if (this.phase === 'paused') {
      this.phase = 'playing';
      this.physics.world.resume();
      this.tweens.resumeAll();
      audio.play('pause');
      audio.resumeMusic();
      this.overlay?.destroy();
      this.overlay = undefined;
    }
  }

  private die() {
    if (this.phase !== 'playing') return;
    this.phase = 'dying';
    this.physics.world.pause();
    audio.stopMusic();
    audio.play('death');
    this.climbing = null;
    this.playerEye.setVisible(false);
    this.player.setFillStyle(0xd9d9d9);
    this.tweens.add({ targets: this.player, angle: 90 * this.facing, duration: 250 });
    this.tweens.add({ targets: this.player, alpha: 0.3, duration: 120, yoyo: true, repeat: 4 });
    this.floatText('★ ★', this.player.x, this.player.y - 28, '#ffe066');

    this.time.delayedCall(1200, () => {
      this.run.lives -= 1;
      if (this.run.lives > 0) this.scene.restart({ run: this.run });
      else this.scene.start('End', { type: 'gameover', score: this.run.score, level: this.run.level + 1 });
    });
  }

  private clearLevel() {
    if (this.phase !== 'playing') return;
    this.phase = 'clear';
    this.physics.world.pause();
    audio.stopMusic();
    audio.play('clear');
    this.updateHud();
    this.showBanner('LEVEL CLEAR!', '', 1500);
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
    this.time.delayedCall(900, () => this.showBanner('VICTORY!', `${name} 격파!`, 2000));
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
      .text(WIDTH - 8, 6, `[관리자] ${levelKeysLabel(LEVELS.length)} 레벨 이동`, {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#ff9f43',
      })
      .setOrigin(1, 0)
      .setAlpha(0.8)
      .setDepth(60);
    this.input.keyboard!.on('keydown', (e: KeyboardEvent) => {
      const level = levelFromKey(e, LEVELS.length);
      if (level === null) return;
      this.run.level = level;
      this.scene.restart({ run: this.run });
    });
  }

  private buildHud() {
    // 두 줄: 위 = 생명·레벨·점수·소리, 아래 = 아이템(보스)·부츠·보너스 글자
    const row1 = PLAY_HEIGHT + 15;
    const row2 = PLAY_HEIGHT + 37;
    this.add.rectangle(WIDTH / 2, PLAY_HEIGHT + HUD_HEIGHT / 2, WIDTH, HUD_HEIGHT, COLORS.hud).setDepth(30);
    const style = { fontFamily: 'monospace', fontSize: '15px', color: '#e8e8f0' };
    const at = (x: number, y: number) => this.add.text(x, y, '', style).setOrigin(0, 0.5).setDepth(31);
    this.hud = {
      lives: at(12, row1),
      level: at(200, row1),
      score: at(330, row1),
      sound: at(WIDTH - 80, row1).setColor('#9a9db0'),
      items: at(12, row2),
      boost: at(330, row2).setColor('#7ad0ff'),
      letters: [...BONUS_WORD].map((c, i) =>
        this.add
          .text(WIDTH - 110 + i * 26, row2, c, { ...style, fontStyle: 'bold' })
          .setOrigin(0.5)
          .setDepth(31),
      ),
    };
    this.updateHud();
  }

  private updateHud() {
    const remaining = this.items.filter((i) => !i.taken).length;
    const lives = Math.max(this.run.lives, 0);
    this.hud.lives.setText(`LIVES ${lives > 5 ? `♥×${lives}` : '♥'.repeat(lives)}`);
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
    const boostLeft = this.boostUntil - this.elapsed;
    this.hud.boost.setText(boostLeft > 0 ? `BOOTS ${(boostLeft / 1000).toFixed(1)}s` : '');
    this.hud.sound.setText(audio.muted ? 'M ♪OFF' : 'M ♪ON');
    [...BONUS_WORD].forEach((c, i) =>
      this.hud.letters[i].setColor(this.run.letters.includes(c) ? '#f5e663' : '#4a4d5c'),
    );
  }

  private makeOverlay(title: string, sub: string): Phaser.GameObjects.Container {
    const bg = this.add.rectangle(WIDTH / 2, PLAY_HEIGHT / 2, WIDTH, PLAY_HEIGHT, 0x000000, 0.55);
    const t1 = this.add
      .text(WIDTH / 2, PLAY_HEIGHT / 2 - 14, title, { fontFamily: 'monospace', fontSize: '36px', fontStyle: 'bold', color: '#ffffff' })
      .setOrigin(0.5);
    const t2 = this.add
      .text(WIDTH / 2, PLAY_HEIGHT / 2 + 26, sub, { fontFamily: 'monospace', fontSize: '16px', color: '#c8c8d8' })
      .setOrigin(0.5);
    return this.add.container(0, 0, [bg, t1, t2]).setDepth(50);
  }

  private showBanner(title: string, sub: string, ms: number) {
    const t1 = this.add
      .text(WIDTH / 2, PLAY_HEIGHT / 2 - 12, title, {
        fontFamily: 'monospace',
        fontSize: '40px',
        fontStyle: 'bold',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setDepth(40);
    const t2 = this.add
      .text(WIDTH / 2, PLAY_HEIGHT / 2 + 30, sub, {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: '#e0e0f0',
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(40);
    this.time.delayedCall(ms, () => {
      this.tweens.add({ targets: [t1, t2], alpha: 0, duration: 300, onComplete: () => (t1.destroy(), t2.destroy()) });
    });
  }
}

