import Phaser from 'phaser';
import { audio } from '../audio';
import { COLORS, FLOOR_Y, PLAY_HEIGHT, WIDTH } from '../config';
import type { BossDef } from '../levels/types';

// 보스전 규칙
// - 보스는 발판과 상관없이 화면 어디든 날아다닌다. 아무 지점이나 골라 날아가고, 가끔 제자리에서 멈춘다.
// - 보스 몸에 닿으면 플레이어는 죽는다.
// - 레벨의 보석을 모두 모아야 공격이 열린다.
// - Z키를 누르면 플레이어 발밑에서 돌이 곧장 아래로 날아간다. 발판을 뚫고 화면 아래까지 떨어진다.
//   보스보다 위에 있을 때 던져야 맞는다.
// - 맞을수록 보스는 빨라진다. HP가 0이 되면 승리.

type Rect = Phaser.Geom.Rectangle;

const BOSS_SIZE = 64;
const MARGIN = 40;
const STONE_SIZE = 14;
const STONE_START_SPEED = 260;
const STONE_GRAVITY = 1500;
const HURT_MS = 1000;
const HIT_SCORE = 500;
/** 보스가 머리 위 돌을 알아채는 거리(px), 피하는 거리(px), 피할 때 속도 배율 */
const DODGE_SIGHT = 220;
const DODGE_DISTANCE = 130;
const DODGE_SPEED_MULTIPLIER = 2.2;

interface Stone {
  obj: Phaser.GameObjects.Rectangle;
  vy: number;
  /** 보스가 이 돌을 보고 회피 여부를 이미 정했는지 */
  seen?: boolean;
}

export interface BossHooks {
  addScore: (points: number, x: number, y: number) => void;
  onDefeated: () => void;
}

export class BossFight {
  hp: number;
  private x: number;
  private y: number;
  private target: { x: number; y: number };
  private body: Phaser.GameObjects.Rectangle;
  private wings: Phaser.GameObjects.Rectangle[];
  private eyes: Phaser.GameObjects.Rectangle[];
  private hoverUntil = 0;
  private nextHoverAt: number;
  private hurtUntil = 0;
  private stones: Stone[] = [];
  private nextThrowAt = 0;
  private defeated = false;
  private player?: { x: number; y: number };
  private charging = false;
  private dodgeUntil = 0;
  /** 보석을 모두 모아야 true가 되고, 그때부터 돌을 던질 수 있다. */
  armed = false;

  constructor(
    private scene: Phaser.Scene,
    private def: BossDef,
    private hooks: BossHooks,
    now: number,
  ) {
    this.hp = def.hp;
    this.x = def.start.x;
    this.y = def.start.y;
    this.target = this.pickTarget();
    this.wings = [-1, 1].map((s) =>
      scene.add.rectangle(this.x + s * (BOSS_SIZE / 2 + 10), this.y - 8, 22, 34, 0x3b2560).setDepth(7),
    );
    this.body = scene.add.rectangle(this.x, this.y, BOSS_SIZE, BOSS_SIZE, COLORS.boss).setDepth(7);
    this.eyes = [-14, 14].map((dx) => scene.add.rectangle(this.x + dx, this.y - 10, 10, 8, 0xffd23f).setDepth(7));
    this.nextHoverAt = now + Phaser.Math.Between(2500, 4000);
    this.sync(now);
  }

  get maxHp() {
    return this.def.hp;
  }

  update(now: number, dt: number, player: { x: number; y: number }) {
    if (this.defeated) return;
    this.player = player;
    this.fly(now, dt);
    this.updateStones(now, dt);
    this.sync(now);
  }

  /** 레벨의 보석을 모두 모으면 GameScene이 불러서 공격을 연다. */
  arm() {
    this.armed = true;
  }

  /** Z키: 공격이 열려 있고 쿨다운이 끝났으면 발밑에서 돌을 아래로 던진다. */
  tryThrow(px: number, feetY: number, now: number): boolean {
    if (this.defeated || !this.armed || now < this.nextThrowAt) return false;
    this.nextThrowAt = now + this.def.throwCooldownMs;
    const obj = this.scene.add
      .rectangle(px, feetY + STONE_SIZE / 2, STONE_SIZE, STONE_SIZE, COLORS.stone)
      .setStrokeStyle(2, 0x5d6170)
      .setDepth(6);
    this.stones.push({ obj, vy: STONE_START_SPEED });
    audio.play('push');
    return true;
  }

  /** 보스 몸에 닿았는지(가장자리 2px만 봐준다) */
  hurts(pb: Rect): boolean {
    if (this.defeated) return false;
    const b = this.body.getBounds();
    return Phaser.Geom.Rectangle.Overlaps(pb, new Phaser.Geom.Rectangle(b.x + 2, b.y + 2, b.width - 4, b.height - 4));
  }

  // ───────── 내부 ─────────

  /** 다음 목적지. 일정 확률로 플레이어가 있는 곳을 노리고,
   *  나머지는 절반씩 층 하나의 발판 바로 위(맨 아래 바닥 포함) 또는 화면 아무 곳. */
  private pickTarget() {
    const halfW = BOSS_SIZE / 2 + 22; // 날개 포함
    const minX = MARGIN + halfW;
    const maxX = WIDTH - MARGIN - halfW;
    const x = Phaser.Math.Between(minX, maxX);
    const lowest = FLOOR_Y[0] - BOSS_SIZE / 2; // 몸 아래가 바닥에 닿는 높이
    const highest = MARGIN + BOSS_SIZE / 2;
    const homing = this.def.homingChance + this.def.homingPerHit * (this.def.hp - this.hp);
    this.charging = false;
    if (this.player && Math.random() < homing) {
      this.charging = true; // 플레이어를 노릴 때는 돌진 속도로 날아간다
      return {
        x: Phaser.Math.Clamp(this.player.x, minX, maxX),
        y: Phaser.Math.Clamp(this.player.y, highest, lowest),
      };
    }
    if (Math.random() < 0.5) {
      const floor = Phaser.Math.Between(0, FLOOR_Y.length - 1);
      return { x, y: Phaser.Math.Clamp(FLOOR_Y[floor] - BOSS_SIZE / 2 - 2, highest, lowest) };
    }
    return { x, y: Phaser.Math.Between(highest, lowest) };
  }

  private fly(now: number, dt: number) {
    const dodging = now < this.dodgeUntil;
    if (!dodging && now < this.hoverUntil) return;
    if (!dodging && now >= this.nextHoverAt) {
      this.hoverUntil = now + this.def.hoverMs;
      this.nextHoverAt = this.hoverUntil + Phaser.Math.Between(2500, 4500);
      return;
    }
    let speed = this.def.speed + this.def.speedPerHit * (this.def.hp - this.hp);
    if (dodging) speed *= DODGE_SPEED_MULTIPLIER;
    else if (this.charging) speed *= this.def.chargeMultiplier;
    const dx = this.target.x - this.x;
    const dy = this.target.y - this.y;
    const dist = Math.hypot(dx, dy);
    const step = speed * dt;
    if (dist <= step) {
      this.x = this.target.x;
      this.y = this.target.y;
      this.target = this.pickTarget();
    } else {
      this.x += (dx / dist) * step;
      this.y += (dy / dist) * step;
    }
  }

  private updateStones(now: number, dt: number) {
    const b = this.body.getBounds();
    const keep: Stone[] = [];
    for (const s of this.stones) {
      s.vy += STONE_GRAVITY * dt;
      s.obj.y += s.vy * dt;
      this.maybeDodge(s, now);
      if (now >= this.hurtUntil && Phaser.Geom.Rectangle.Overlaps(s.obj.getBounds(), b)) {
        this.shatter(s);
        this.hit(now);
        if (this.defeated) return;
      } else if (s.obj.y > PLAY_HEIGHT + STONE_SIZE) {
        s.obj.destroy();
      } else {
        keep.push(s);
      }
    }
    this.stones = keep;
  }

  /** 머리 위로 떨어지는 돌을 처음 알아챘을 때 한 번만 회피 여부를 정한다. */
  private maybeDodge(s: Stone, now: number) {
    if (s.seen || now < this.hurtUntil) return;
    const above = this.y - s.obj.y;
    if (above <= 0 || above > DODGE_SIGHT || Math.abs(s.obj.x - this.x) > BOSS_SIZE / 2 + STONE_SIZE) return;
    s.seen = true;
    const chance = this.def.dodgeChance + this.def.dodgePerHit * (this.def.hp - this.hp);
    if (Math.random() >= chance) return;
    const side = s.obj.x < this.x ? 1 : -1; // 돌 반대쪽으로
    const halfW = BOSS_SIZE / 2 + 22;
    this.target = { x: Phaser.Math.Clamp(this.x + side * DODGE_DISTANCE, MARGIN + halfW, WIDTH - MARGIN - halfW), y: this.y };
    this.charging = false;
    this.dodgeUntil = now + 450;
    this.hoverUntil = 0;
  }

  private shatter(s: Stone) {
    const { x, y } = s.obj;
    s.obj.destroy();
    for (let i = 0; i < 5; i++) {
      const bit = this.scene.add.rectangle(x, y, 6, 6, COLORS.stone).setDepth(8);
      this.scene.tweens.add({
        targets: bit,
        x: x + Phaser.Math.Between(-40, 40),
        y: y - Phaser.Math.Between(10, 40),
        alpha: 0,
        duration: 400,
        onComplete: () => bit.destroy(),
      });
    }
  }

  private hit(now: number) {
    this.hp -= 1;
    this.hurtUntil = now + HURT_MS;
    this.hooks.addScore(HIT_SCORE, this.x, this.y - BOSS_SIZE / 2);
    if (this.hp > 0) {
      audio.play('bossHit');
      this.scene.cameras.main.shake(200, 0.006);
      this.target = this.pickTarget(); // 맞으면 다른 곳으로 날아간다
      return;
    }
    this.defeated = true;
    this.stones.forEach((s) => s.obj.destroy());
    this.stones = [];
    audio.play('bossDown');
    this.scene.cameras.main.shake(500, 0.01);
    this.scene.tweens.add({
      targets: [this.body, ...this.wings, ...this.eyes],
      alpha: 0,
      y: `+=${PLAY_HEIGHT}`,
      angle: 90,
      duration: 1400,
      ease: 'Quad.in',
    });
    this.hooks.onDefeated();
  }

  private sync(now: number) {
    if (this.defeated) return;
    const hurt = now < this.hurtUntil;
    const flash = hurt && Math.floor(now / 80) % 2 === 0;
    const hovering = now < this.hoverUntil;
    const flap = Math.sin(now / 90) * 6;
    this.body.setPosition(this.x, this.y).setFillStyle(flash ? COLORS.bossHurt : COLORS.boss);
    this.wings.forEach((w, i) => w.setPosition(this.x + (i === 0 ? -1 : 1) * (BOSS_SIZE / 2 + 10), this.y - 8 + (i === 0 ? flap : -flap)));
    const look = Math.sign(this.target.x - this.x) * 4;
    const eyeColor = hovering ? 0xff3b3b : 0xffd23f; // 멈춰 있을 때 눈이 빨개진다
    this.eyes.forEach((e, i) => e.setPosition(this.x + (i === 0 ? -14 : 14) + look, this.y - 10).setFillStyle(eyeColor));
  }
}
