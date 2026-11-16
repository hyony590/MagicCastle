/* eslint-disable @typescript-eslint/no-explicit-any */
import Phaser from 'phaser';
import { ENEMY, FLOOR_Y, PLAYER, TILE, WIDTH } from './config';
import { newRun } from './state';
import { FONT } from './ui/text';

// 자동 플레이 봇. 사람처럼 키 입력만으로 게임을 처음부터 끝까지 플레이한다(무적·순간이동 없음).
// - 길 찾기: 발판 구간을 점으로, 사다리와 2칸 이하 틈을 선으로 잇고 가장 가까운 재료부터 간다.
// - 위험 피하기: 몬스터의 앞으로의 위치를 계산해서, 부딪힐 것 같으면 기다리거나 피한다.
// - 불꽃은 알맞은 거리에서 점프로 넘는다. 틈은 가장자리에서 뛴다.
// - 보스전: 보석을 모두 모은 뒤 맨 위층에서 마녀가 바로 아래 오면 Z.
// 시작 화면 [자동 플레이 보기] 버튼으로 실제 속도로 볼 수 있다. 개발 중에는 콘솔에서
// window.__autoplay()로 화면 갱신 없이 빠르게 돌리고 window.__bot.report()로 결과를 본다.

type Key = 'left' | 'right' | 'up' | 'down' | 'jump' | 'z';
const KEYMAP: Record<Key, [string, string, number]> = {
  left: ['ArrowLeft', 'ArrowLeft', 37],
  right: ['ArrowRight', 'ArrowRight', 39],
  up: ['ArrowUp', 'ArrowUp', 38],
  down: ['ArrowDown', 'ArrowDown', 40],
  jump: [' ', 'Space', 32],
  z: ['z', 'KeyZ', 90],
};

const STEP_MS = 1000 / 60;
const DT = 1 / 60;
const SAFE = 34; // 몬스터 중심과 이보다 가까우면 위험(실제 판정 25 + 여유)
const JUMP_DIST = 66; // 걷기 점프로 날아가는 거리(점프 속도 420)
const CLIMB_SPEED = PLAYER.climbSpeed;

interface Seg {
  floor: number;
  l: number;
  r: number;
}
type Edge =
  | { kind: 'ladder'; x: number; from: number; to: number; up: boolean }
  | { kind: 'gap'; from: number; to: number; dir: 1 | -1; takeoff: number };

interface LevelLog {
  level: number;
  deaths: number;
  seconds: number;
  cleared: boolean;
}

type BossPlan = { wx?: number; act: 'stay' | 'left' | 'right' | 'up' | 'down' | 'jump-left' | 'jump-right' };
type Me = { x: number; feet: number; floor: number; onGround: boolean; speed: number };

export class AutoPlayer {
  result: 'running' | 'victory' | 'gameover' | 'stuck' | 'stopped' = 'running';
  deaths = 0;
  levels: LevelLog[] = [];
  notes: string[] = [];
  current: LevelLog | null = null;
  frames = 0;
  deathTraces: string[][] = [];
  private why = '';
  private evadeUntil = 0;
  private progressAt = 0;
  private nextThrowAt = 0;
  private altSlot = -1;
  private altGoal: { floor: number; x: number } | null = null;
  private afterThrowUntil = 0;
  private lastLeft = -1;
  private trace: string[] = [];
  private held = new Set<Key>();
  private releaseNext: Key[] = [];
  private prevPhase = '';
  private sceneLevel = -1;
  private levelFrames = 0;
  private climbDir: 'up' | 'down' | null = null;
  private hide: { dir: 'up' | 'down'; frames: number; floor: number } | null = null;

  constructor(private game: Phaser.Game) {}

  // ───────── 키 ─────────
  private send(type: 'keydown' | 'keyup', k: Key) {
    const [key, code, keyCode] = KEYMAP[k];
    window.dispatchEvent(new KeyboardEvent(type, { key, code, keyCode, which: keyCode } as any));
  }
  private hold(k: Key, on: boolean) {
    if (on && !this.held.has(k)) {
      this.held.add(k);
      this.send('keydown', k);
    } else if (!on && this.held.has(k)) {
      this.held.delete(k);
      this.send('keyup', k);
    }
  }
  private only(...keys: Key[]) {
    (['left', 'right', 'up', 'down', 'z'] as Key[]).forEach((k) => this.hold(k, keys.includes(k)));
  }
  private tap(k: Key) {
    this.send('keydown', k);
    this.releaseNext.push(k);
  }
  /** 누르고 있던 키를 모두 뗀다(멈출 때) */
  releaseAll() {
    for (const k of [...this.held]) this.hold(k, false);
    for (const k of this.releaseNext.splice(0)) this.send('keyup', k);
  }

  // ───────── 한 프레임 ─────────
  frame() {
    this.frames++;
    for (const k of this.releaseNext.splice(0)) this.send('keyup', k);
    const top = this.game.scene.getScenes(true)[0] as any;
    if (!top) return;
    const key = top.scene.key;
    if (key === 'End') {
      this.only();
      const win = top.info?.type === 'victory';
      if (this.current) this.current.cleared = win;
      this.result = win ? 'victory' : 'gameover';
      return;
    }
    if (key !== 'Game') return this.only();
    this.playGame(top);
  }

  private playGame(s: any) {
    // 클리어 연출 중에는 다음 레벨 번호로 이미 바뀌어 있으므로 새 레벨로 치지 않는다
    if (s.run.level !== this.sceneLevel && s.phase !== 'clear') {
      if (this.current) this.current.cleared = true;
      this.sceneLevel = s.run.level;
      this.levelFrames = 0;
      this.current = { level: s.run.level + 1, deaths: 0, seconds: 0, cleared: false };
      this.levels.push(this.current);
      this.hide = null;
      this.climbDir = null;
    }
    this.levelFrames++;
    const left = s.items.filter((i: any) => !i.taken).length + s.letters.filter((l: any) => !l.taken).length;
    if (left !== this.lastLeft || s.phase === 'dying') {
      this.lastLeft = left;
      this.progressAt = this.frames;
      this.altSlot = -1;
    }
    this.current!.seconds = Math.round(this.levelFrames / 60);
    // 죽기 직전 모습을 알아보기 위한 짧은 기록
    const feetNow = s.player.body.bottom;
    const near = s.enemies
      .filter((e: any) => Math.abs(e.body.y + ENEMY.height / 2 - feetNow) < 60)
      .map((e: any) => `${Math.round(e.body.x - s.player.x)}${s.elapsed >= e.activeAt ? '' : '?'}`)
      .join(',');
    const boss = s.boss ? ` B${Math.round(s.boss.x - s.player.x)},${Math.round(s.boss.y - (feetNow - 18))}${s.boss.charging ? '!' : ''}` : '';
    this.trace.push(
      `${s.phase.slice(0, 3)} x${Math.round(s.player.x)} f${Math.round(feetNow)} ${[...this.held].join('+')}${s.climbing ? ' L' : ''} [${near}]${boss} ${this.why}`,
    );
    this.why = '';
    if (this.trace.length > 50) this.trace.shift();
    const limit = s.boss ? 900 : 400; // 보스전은 오래 걸릴 수 있다
    if (this.levelFrames > 60 * limit) {
      this.notes.push(`LEVEL ${s.run.level + 1}에서 ${limit}초 넘게 진행하지 못함`);
      this.result = 'stuck';
      return;
    }
    if (s.phase === 'dying' && this.prevPhase !== 'dying') {
      this.deaths++;
      this.current!.deaths++;
      const p = s.player;
      this.deathTraces.push(this.trace.slice());
      this.notes.push(
        `LEVEL ${s.run.level + 1} 사망(${this.deathCause(s)}) ${this.current!.seconds}초 x${Math.round(p.x)} 발${Math.round(p.body.bottom)}${s.boosted ? ' 부츠' : ''}`,
      );
      this.hide = null;
      this.climbDir = null;
    }
    this.prevPhase = s.phase;
    if (s.phase === 'dying' || s.phase === 'clear' || s.phase === 'paused') return this.only();
    if (s.phase === 'hitstop') return; // 잠깐 멈춤: 누르던 키 그대로
    if (s.boss) this.bossBrain(s);
    else this.levelBrain(s);
  }

  private deathCause(s: any) {
    const p = s.player;
    const feet = p.body.bottom;
    for (const e of s.enemies)
      if (Math.abs(e.body.x - p.x) < 32 && Math.abs(e.body.y + ENEMY.height / 2 - feet) < 50) return `몬스터 ${e.look}`;
    for (const t of s.traps) if (t.active && Math.abs(t.hit.centerX - p.x) < 24 && Math.abs(t.hit.bottom - feet) < 40) return '불꽃';
    if (s.boss) return '마녀';
    return '낙하';
  }

  // ───────── 지도 ─────────
  private segs(s: any): Seg[] {
    const out: Seg[] = [];
    s.level.floors.forEach((list: [number, number][], floor: number) =>
      list.forEach(([a, b]) => out.push({ floor, l: a * TILE, r: b * TILE })),
    );
    return out;
  }
  private find(segs: Seg[], floor: number, x: number) {
    return segs.findIndex((g) => g.floor === floor && x >= g.l - 11 && x < g.r + 11);
  }
  private edges(s: any, segs: Seg[]) {
    const list: Edge[][] = segs.map(() => []);
    for (const l of s.ladders) {
      const bf = FLOOR_Y.indexOf(l.bottom);
      const tf = FLOOR_Y.indexOf(l.top);
      const a = segs.findIndex((g) => g.floor === bf && l.x >= g.l && l.x < g.r);
      const b = segs.findIndex((g) => g.floor === tf && l.x >= g.l && l.x < g.r);
      if (a < 0 || b < 0) continue;
      list[a].push({ kind: 'ladder', x: l.x, from: a, to: b, up: true });
      list[b].push({ kind: 'ladder', x: l.x, from: b, to: a, up: false });
    }
    segs.forEach((g, i) => {
      segs.forEach((h, j) => {
        if (g.floor !== h.floor || i === j) return;
        if (h.l > g.r && h.l - g.r <= 2 * TILE)
          list[i].push({ kind: 'gap', from: i, to: j, dir: 1, takeoff: this.takeoff(s, g.floor, g.r - 3, 1, h) });
        if (g.l > h.r && g.l - h.r <= 2 * TILE)
          list[i].push({ kind: 'gap', from: i, to: j, dir: -1, takeoff: this.takeoff(s, g.floor, g.l + 3, -1, h) });
      });
    });
    return list;
  }

  /**
   * 틈을 뛰는 자리. 끝에서 뛰면 건너편 불꽃 위에 떨어질 때(부츠를 신으면 멀리 난다)는
   * 조금 안쪽에서 뛰어 불꽃 앞에 내린다. 내린 자리는 건너편 발판 위여야 한다.
   */
  private takeoff(s: any, floor: number, edge: number, dir: 1 | -1, dest: Seg) {
    const L = this.jumpLen(s);
    const fires = s.traps.filter((t: any) => Math.abs(t.hit.bottom - FLOOR_Y[floor]) <= 2).map((t: any) => t.hit.centerX);
    for (let k = 0; k <= 60; k += 2) {
      const tk = edge - dir * k;
      const land = tk + dir * L;
      if (land < dest.l - 8 || land > dest.r + 8) break; // 더 안쪽에서 뛰면 건너편에 못 미친다
      if (fires.every((fx: number) => Math.abs(fx - land) >= 28)) return tk;
    }
    return edge;
  }
  /** (floor, x)에서 목표(tf, tx)까지 가는 첫 번째 이동과 대략 거리 */
  private route(s: any, floor: number, x: number, tf: number, tx: number) {
    const segs = this.segs(s);
    const edges = this.edges(s, segs);
    const start = this.find(segs, floor, x);
    const goal = this.find(segs, tf, tx);
    if (start < 0 || goal < 0) return null;
    const dist = segs.map(() => Infinity);
    const posAt = segs.map(() => 0);
    const via: (Edge | null)[] = segs.map(() => null);
    dist[start] = 0;
    posAt[start] = x;
    const done = new Set<number>();
    while (done.size < segs.length) {
      let u = -1;
      dist.forEach((d, i) => {
        if (!done.has(i) && d < Infinity && (u < 0 || d < dist[u])) u = i;
      });
      if (u < 0) break;
      done.add(u);
      for (const e of edges[u]) {
        const fromX = e.kind === 'ladder' ? e.x : e.takeoff;
        const landX = e.kind === 'ladder' ? e.x : e.takeoff + e.dir * JUMP_DIST;
        const cost = Math.abs(posAt[u] - fromX) + (e.kind === 'ladder' ? 130 : 70);
        if (dist[u] + cost < dist[e.to]) {
          dist[e.to] = dist[u] + cost;
          posAt[e.to] = landX;
          via[e.to] = e;
        }
      }
    }
    if (dist[goal] === Infinity) return null;
    let n = goal;
    let first: Edge | null = null;
    while (n !== start) {
      first = via[n];
      if (!first) return null;
      n = first.from;
    }
    return { first, cost: dist[goal] + Math.abs(posAt[goal] - tx) };
  }

  // ───────── 예측 ─────────
  private enemyFloor(e: any) {
    const feet = e.body.y + ENEMY.height / 2;
    return FLOOR_Y.findIndex((y) => Math.abs(y - feet) < 3);
  }
  /** 몬스터의 앞으로 seconds초 동안의 위치(게임과 같은 규칙으로 계산) */
  private enemyTrack(s: any, e: any, seconds: number) {
    const out: { x: number; active: boolean }[] = [];
    let x = e.body.x;
    let dir = e.dir;
    for (let i = 0; i <= seconds * 60; i++) {
      const active = s.elapsed + i * STEP_MS >= e.activeAt;
      out.push({ x, active });
      if (active) {
        x += dir * e.speed * DT;
        if (x <= e.min) {
          x = e.min;
          dir = 1;
        } else if (x >= e.max) {
          x = e.max;
          dir = -1;
        }
      }
    }
    return out;
  }
  /** floor층에서 x0 → x1로 걷고 그 자리에서 wait초 서 있을 때 부딪히는지. 부딪히는 시각(초) 또는 null */
  private walkDanger(s: any, floor: number, x0: number, x1: number, speed: number, wait: number) {
    const dist = Math.abs(x1 - x0);
    const dir = Math.sign(x1 - x0);
    const total = dist / speed + wait;
    for (const e of s.enemies) {
      if (this.enemyFloor(e) !== floor) continue;
      const track = this.enemyTrack(s, e, total);
      for (let i = 0; i < track.length; i++) {
        const px = x0 + dir * Math.min(speed * i * DT, dist);
        if (track[i].active && Math.abs(track[i].x - px) < SAFE) return i * DT;
      }
    }
    return null;
  }
  /** floor층 x 자리에 from~to초 사이에 몬스터가 오는지 */
  private spotDanger(s: any, floor: number, x: number, from: number, to: number) {
    for (const e of s.enemies) {
      if (this.enemyFloor(e) !== floor) continue;
      const track = this.enemyTrack(s, e, to);
      for (let i = Math.max(0, Math.floor(from * 60)); i < track.length; i++) {
        if (track[i].active && Math.abs(track[i].x - x) < SAFE) return true;
      }
    }
    return false;
  }

  // ───────── 상태 ─────────
  private me(s: any): Me {
    const b = s.player.body;
    const feet = b.bottom;
    const floor = s.climbing ? -1 : FLOOR_Y.findIndex((y) => Math.abs(y - feet) < 3);
    const onGround = !s.climbing && (b.blocked.down || b.touching.down);
    const speed = PLAYER.walkSpeed * (s.boosted ? PLAYER.boostMultiplier : 1);
    return { x: s.player.x, feet, floor, onGround, speed };
  }

  /** 남은 목표: 재료와 글자 */
  private targets(s: any) {
    const out: { floor: number; x: number }[] = [];
    s.items.forEach((it: any, i: number) => {
      if (!it.taken) out.push({ floor: s.level.items[i].floor, x: s.level.items[i].x });
    });
    for (const l of s.letters) {
      if (l.taken) continue;
      const floor = FLOOR_Y.findIndex((y) => l.hit.bottom <= y && y - l.hit.bottom < 60);
      if (floor >= 0) out.push({ floor, x: l.hit.centerX });
    }
    return out;
  }

  /** 목표에 도착했다고 볼 거리 */
  private tol(me: Me) {
    return me.speed * DT * 0.6 + 1;
  }

  /** 지금 서 있는 발판 구간 */
  private seg(s: any, me: Me): Seg | undefined {
    const segs = this.segs(s);
    return segs[this.find(segs, me.floor, me.x)];
  }

  private bestRoute(s: any, me: Me, goals: { floor: number; x: number }[]) {
    let best: { first: Edge | null; cost: number; g: { floor: number; x: number } } | null = null;
    for (const g of goals) {
      const r = this.route(s, me.floor, me.x, g.floor, g.x);
      if (r && (!best || r.cost < best.cost)) best = { ...r, g };
    }
    return best;
  }

  // ───────── 일반 레벨 ─────────
  private levelBrain(s: any) {
    const me = this.me(s);
    if (s.climbing) return this.onLadder(s, me);
    if (!me.onGround || me.floor < 0) return; // 공중: 손댈 수 없음
    const best = this.pickRoute(s, me);
    if (!best) return this.only();
    this.go(s, me, best.first, best.g.x);
    this.guardEdge(s, me);
  }

  /**
   * 가장 가까운 목표로 가는 길. 20초 넘게 아무것도 못 먹으면(몬스터가 그쪽을 계속 지키고 있음)
   * 15초마다 다음으로 가까운 목표로 바꿔 본다.
   */
  private pickRoute(s: any, me: Me) {
    const stuck = (this.frames - this.progressAt) / 60;
    if (stuck < 20) return this.bestRoute(s, me, this.targets(s));
    const routes = this.targets(s)
      .map((g) => {
        const r = this.route(s, me.floor, me.x, g.floor, g.x);
        return r && { ...r, g };
      })
      .filter((r) => r !== null)
      .sort((a, b) => a!.cost - b!.cost);
    if (!routes.length) return null;
    // 목표 순서는 그 순간 거리로 정하므로, 바꾼 뒤에는 그 목표(층·x)를 기억해 둔다
    const slot = Math.floor((stuck - 20) / 15);
    if (slot !== this.altSlot || !this.altGoal) {
      this.altSlot = slot;
      this.altGoal = routes[slot % routes.length]!.g;
    }
    const keep = routes.find((r) => r!.g.floor === this.altGoal!.floor && r!.g.x === this.altGoal!.x);
    return keep ?? routes[0];
  }

  /** 점프하는 프레임이 아니면 발판 끝 밖으로 걸어 나가지 않는다(떨어지면 죽는다) */
  private guardEdge(s: any, me: Me) {
    if (this.releaseNext.includes('jump')) return;
    const g = this.seg(s, me);
    if (!g) return;
    const step = me.speed * DT;
    // 몸통 반(12px)이 걸쳐 있으면 서 있을 수 있으므로 끝에서 2px 바깥까지는 허용
    if (this.held.has('left') && me.x - step < g.l - 2) this.hold('left', false);
    if (this.held.has('right') && me.x + step > g.r + 2) this.hold('right', false);
  }

  /** 다음 이동 실행: 걷기 / 사다리 / 틈 점프 */
  private go(s: any, me: Me, first: Edge | null, finalX: number) {
    const targetX = first ? (first.kind === 'ladder' ? first.x : first.takeoff) : finalX;
    // 한 프레임에 걷는 거리보다 넉넉해야 목표 근처에서 왔다 갔다 하지 않는다(부츠를 신으면 4.75px).
    const near = Math.abs(targetX - me.x) <= (first?.kind === 'ladder' ? 8 : this.tol(me));

    if (near && first?.kind === 'ladder') {
      const arriveFloor = this.segs(s)[first.to].floor;
      const climbT = 120 / CLIMB_SPEED;
      if (this.spotDanger(s, arriveFloor, first.x, climbT - 0.3, climbT + 0.9)) return this.evade(s, me);
      this.climbDir = first.up ? 'up' : 'down';
      return this.only(this.climbDir);
    }
    if (near && first?.kind === 'gap') {
      const land = me.x + first.dir * this.jumpLen(s);
      if (!this.safeWithEscape(s, me, [land])) return this.evade(s, me);
      this.only(first.dir > 0 ? 'right' : 'left');
      this.tap('jump');
      return;
    }
    if (near) return this.only();

    // 걸어가는 동안 안전하고, 도착한 뒤에도 몬스터가 오면 사다리로 피할 수 있어야 간다.
    if (this.frames < this.evadeUntil) return this.evade(s, me);
    const ok =
      first?.kind === 'ladder'
        ? this.exposure(s, me.floor, me.x, [targetX], 0.4, me.speed)
        : this.safeWithEscape(s, me, [targetX]);
    if (!ok) return this.evade(s, me);
    this.walk(s, me, targetX);
  }

  /** targetX 쪽으로 걷는다. 가는 길의 불꽃은 알맞은 거리에서 뛰어넘는다. */
  private walk(s: any, me: Me, targetX: number) {
    const dir = Math.sign(targetX - me.x) as 1 | -1;
    if (!dir) return this.only();
    for (const t of s.traps) {
      if (!t.active || Math.abs(t.hit.bottom - FLOOR_Y[me.floor]) > 2) continue;
      const d = (t.hit.centerX - me.x) * dir;
      if (d < 18 || d >= Math.abs(targetX - me.x) + 20) continue; // 뒤에 있거나 가는 길에 없는 불꽃
      // 뛰어서 넘을 수 있는 거리(점프 높이와 속도로 계산: 보통 21~46px, 부츠 24~76px, 양끝 여유를 둠)
      const win = s.boosted ? [30, 70] : [24, 42];
      if (d < win[0]) {
        // 너무 가까이 와 버렸으면 한 발 물러난다
        this.only(dir > 0 ? 'left' : 'right');
        this.guardEdge(s, me);
        return;
      }
      if (d <= win[1]) {
        const land = me.x + dir * this.jumpLen(s);
        const g = this.seg(s, me);
        // 착지할 곳이 발판 밖이면(불꽃이 끝에 붙어 있음) 뛰지 않는다
        if (g && (land < g.l - 2 || land > g.r + 2)) return this.only();
        this.only(dir > 0 ? 'right' : 'left');
        this.tap('jump');
        return;
      }
    }
    this.only(dir > 0 ? 'right' : 'left');
  }

  /**
   * floor층에서 x0부터 wait초 서 있다가 waypoints를 차례로 걷고, 마지막 자리에 tail초 더 머무는 동안
   * 몬스터와 부딪히지 않으면 true
   */
  private exposure(s: any, floor: number, x0: number, waypoints: number[], tail: number, speed: number, wait = 0) {
    const enemies = s.enemies.filter((e: any) => this.enemyFloor(e) === floor);
    if (!enemies.length) return true;
    const path: number[] = [x0];
    let x = x0;
    for (let i = 0; i < wait * 60; i++) path.push(x);
    for (const w of waypoints) {
      while (Math.abs(w - x) > 0.01) {
        x += Math.sign(w - x) * Math.min(speed * DT, Math.abs(w - x));
        path.push(x);
      }
    }
    for (let i = 0; i < tail * 60; i++) path.push(x);
    for (const e of enemies) {
      const track = this.enemyTrack(s, e, path.length / 60);
      for (let i = 0; i < path.length; i++) {
        if (track[i]?.active && Math.abs(track[i].x - path[i]) < SAFE) return false;
      }
    }
    return true;
  }

  /** 30초 넘게 재료를 하나도 못 먹었는지 */
  private stalled() {
    return this.frames - this.progressAt > 60 * 30;
  }

  /** 점프로 날아가는 거리 */
  private jumpLen(s: any) {
    return s.boosted ? JUMP_DIST * PLAYER.boostMultiplier : JUMP_DIST;
  }

  /**
   * floor층 segIdx 구간에서 이 층을 벗어나는 방법들: 구간 안의 사다리, 또는 틈을 뛰어 건너편 구간의 사다리.
   * (틈을 건너는 몬스터도 있으므로, 사다리가 없는 막다른 구간은 피할 곳으로 치지 않는다)
   */
  private escapes(s: any, floor: number, segIdx: number, depth = 3, seen: number[] = []) {
    const segs = this.segs(s);
    const out: { wps: number[]; ladder?: any; gap?: Extract<Edge, { kind: 'gap' }> }[] = [];
    if (segIdx < 0) return out;
    const g = segs[segIdx];
    for (const l of s.ladders) {
      if (FLOOR_Y.indexOf(l.bottom) !== floor && FLOOR_Y.indexOf(l.top) !== floor) continue;
      if (l.x >= g.l && l.x <= g.r) out.push({ wps: [l.x], ladder: l });
    }
    if (depth <= 0) return out;
    // 틈을 여러 번 건너 사다리가 있는 구간까지 가는 길
    for (const e of this.edges(s, segs)[segIdx]) {
      if (e.kind !== 'gap' || seen.includes(e.to)) continue;
      const land = e.takeoff + e.dir * this.jumpLen(s);
      for (const sub of this.escapes(s, floor, e.to, depth - 1, [...seen, segIdx])) {
        out.push({ wps: [e.takeoff, land, ...sub.wps], gap: e });
      }
    }
    return out;
  }

  /** waypoints를 걸은 뒤에도, 몬스터가 오면 (사다리나 틈 건너 사다리로) 피할 수 있는지 */
  private safeWithEscape(s: any, me: Me, waypoints: number[], wait = 0) {
    const endX = waypoints[waypoints.length - 1];
    const segs = this.segs(s);
    const opts = this.escapes(s, me.floor, this.find(segs, me.floor, endX));
    if (!opts.length) return this.exposure(s, me.floor, me.x, waypoints, 1.5, me.speed, wait);
    if (opts.some((o) => this.exposure(s, me.floor, me.x, [...waypoints, ...o.wps], 0.4, me.speed, wait))) return true;
    // 오래 진전이 없으면 조금 대담해진다: 가는 동안과 도착 후 잠깐만 안전해도 간다
    return this.stalled() && this.exposure(s, me.floor, me.x, waypoints, 0.8, me.speed, wait);
  }

  /** 가려는 길이 위험할 때: 여기서 기다려도 되면 기다리고, 아니면 사다리(또는 틈 건너 사다리)로 피한다 */
  private evade(s: any, me: Me) {
    if (this.safeWithEscape(s, me, [me.x], 0.3)) {
      this.why = 'wait';
      return this.only();
    }
    const segs = this.segs(s);
    const opts = this.escapes(s, me.floor, this.find(segs, me.floor, me.x));
    const len = (w: number[]) => w.reduce((sum, x, i) => sum + Math.abs(x - (i ? w[i - 1] : me.x)), 0);
    opts.sort((a, b) => len(a.wps) - len(b.wps));
    for (const o of opts) {
      if (!this.exposure(s, me.floor, me.x, o.wps, 0.4, me.speed)) continue;
      if (o.ladder && Math.abs(o.ladder.x - me.x) <= 8) {
        const dir = FLOOR_Y.indexOf(o.ladder.bottom) === me.floor ? 'up' : 'down';
        this.hide = { dir, frames: 0, floor: me.floor };
        this.why = 'hide';
        this.climbDir = dir;
        return this.only(dir);
      }
      if (o.gap && Math.abs(o.gap.takeoff - me.x) <= this.tol(me)) {
        this.why = 'escape-jump';
        this.only(o.gap.dir > 0 ? 'right' : 'left');
        this.tap('jump');
        return;
      }
      this.why = o.gap ? 'to-gap' : 'to-ladder';
      this.evadeUntil = this.frames + 24; // 잠깐은 피하는 쪽으로 계속 간다(왔다 갔다 하지 않게)
      return this.walk(s, me, o.wps[0]);
    }
    this.why = 'flee';
    this.waitOrFlee(s, me);
  }

  /** 가는 길이 위험할 때: 서 있어도 안전하면 기다리고, 아니면 피한다 */
  private waitOrFlee(s: any, me: Me) {
    if (this.walkDanger(s, me.floor, me.x, me.x, me.speed, 1.0) === null) return this.only();
    const here = this.seg(s, me);
    // 가까운 사다리로 숨기(지금 서 있는 발판 위의 사다리만. 틈 건너편으로 걸어가면 떨어진다)
    for (const l of [...s.ladders].sort((a: any, b: any) => Math.abs(a.x - me.x) - Math.abs(b.x - me.x))) {
      const atBottom = FLOOR_Y.indexOf(l.bottom) === me.floor;
      const atTop = FLOOR_Y.indexOf(l.top) === me.floor;
      if (!atBottom && !atTop) continue;
      if (!here || l.x < here.l || l.x > here.r) continue;
      if (Math.abs(l.x - me.x) <= 8) {
        this.hide = { dir: atBottom ? 'up' : 'down', frames: 0, floor: me.floor };
        this.climbDir = this.hide.dir;
        return this.only(this.hide.dir);
      }
      if (this.walkDanger(s, me.floor, me.x, l.x, me.speed, 0.2) === null) return this.only(l.x > me.x ? 'right' : 'left');
    }
    // 몬스터 반대쪽으로 도망(발판 끝은 넘지 않는다)
    const segs = this.segs(s);
    const g = segs[this.find(segs, me.floor, me.x)];
    const threat = s.enemies
      .filter((e: any) => this.enemyFloor(e) === me.floor)
      .sort((a: any, b: any) => Math.abs(a.body.x - me.x) - Math.abs(b.body.x - me.x))[0];
    if (!threat || !g) return this.only();
    const away = threat.body.x > me.x ? -1 : 1;
    const limit = away > 0 ? g.r - 14 : g.l + 14;
    if ((limit - me.x) * away > 4) return this.only(away > 0 ? 'right' : 'left');
    this.only();
  }

  /** 사다리 위 */
  private onLadder(s: any, me: Me) {
    const l = s.climbing;
    if (this.hide) {
      this.hide.frames++;
      if (this.hide.frames < 26) return this.only(this.hide.dir);
      // 사다리 중간에서 기다리다가, 원래 층이 한동안 안전하면 돌아간다
      const back = this.hide.dir === 'up' ? 'down' : 'up';
      if (!this.spotDanger(s, this.hide.floor, l.x, 0, 1.6)) {
        this.climbDir = back;
        this.hide = null;
        return this.only(back);
      }
      return this.only();
    }
    const dir = this.climbDir ?? 'up';
    const arriveFloor = FLOOR_Y.indexOf(dir === 'up' ? l.top : l.bottom);
    const left = Math.abs((dir === 'up' ? l.top : l.bottom) - me.feet) / CLIMB_SPEED;
    // 도착 지점이 곧 위험해지면 사다리 중간에서 멈춰 기다린다
    if (left < 0.5 && this.spotDanger(s, arriveFloor, l.x, left - 0.1, left + 0.8)) return this.only();
    this.only(dir);
  }

  // ───────── 보스전 ─────────
  // 마녀는 목적지를 무작위로 고르므로 미래를 알 수 없다. 화면에서 보이는 만큼(지금 날아가는 방향과 속도)만
  // 예측하고, 도착한 다음에는 어디로든 갈 수 있다고 보고 위험 범위를 넓힌다.
  // 매 프레임 할 수 있는 행동(가만히, 왼쪽, 오른쪽, 사다리 위·아래)을 0.75초 앞까지 시험해 보고
  // 가려던 행동이 위험하면 가장 안전한 행동을 고른다.

  /** 마녀의 앞으로 seconds초 동안 위치와 불확실한 정도(px) */
  private bossPath(s: any, seconds: number) {
    const B = s.boss;
    const now = s.elapsed;
    let speed = B.def.speed + B.def.speedPerHit * (B.def.hp - B.hp);
    const dodging = now < B.dodgeUntil;
    if (dodging) speed *= 2.2;
    else if (B.charging) speed *= B.def.chargeMultiplier;
    let hover = dodging ? 0 : Math.max(0, B.hoverUntil - now) / 1000;
    let x = B.x;
    let y = B.y;
    let after = -1;
    const out: { x: number; y: number; m: number }[] = [];
    for (let i = 0; i <= seconds * 60; i++) {
      out.push({ x, y, m: after < 0 ? 0 : Math.min(70, after * speed * 0.6) });
      if (hover > 0) {
        hover -= DT;
        continue;
      }
      if (after >= 0) {
        after += DT;
        continue;
      }
      const dx = B.target.x - x;
      const dy = B.target.y - y;
      const dist = Math.hypot(dx, dy);
      const step = speed * DT;
      if (dist <= step) {
        x = B.target.x;
        y = B.target.y;
        after = 0;
      } else {
        x += (dx / dist) * step;
        y += (dy / dist) * step;
      }
    }
    return out;
  }

  /**
   * 플레이어가 sim대로 움직일 때 마녀의 최악의 경로: 지금 목적지에 도착하면 바로 플레이어 쪽으로 돌진한다고 본다.
   * (실제로는 무작위로 고르지만, 가장 위험한 경우를 대비하면 구석에 몰리지 않는다)
   */
  private bossWorstPath(s: any, sim: { x: number; feet: number }[]) {
    const B = s.boss;
    const now = s.elapsed;
    const base = B.def.speed + B.def.speedPerHit * (B.def.hp - B.hp);
    const dodging = now < B.dodgeUntil;
    let speed = dodging ? base * 2.2 : B.charging ? base * B.def.chargeMultiplier : base;
    let hover = dodging ? 0 : Math.max(0, B.hoverUntil - now) / 1000;
    let x = B.x;
    let y = B.y;
    let tx = B.target.x;
    let ty = B.target.y;
    let after = -1;
    const out: { x: number; y: number; m: number }[] = [];
    for (let i = 0; i < sim.length; i++) {
      out.push({ x, y, m: after < 0 ? 0 : Math.min(40, after * base * 0.3) });
      if (after >= 0) after += DT;
      if (hover > 0) {
        hover -= DT;
        continue;
      }
      const dx = tx - x;
      const dy = ty - y;
      const dist = Math.hypot(dx, dy);
      const step = speed * DT;
      if (dist <= step) {
        x = tx;
        y = ty;
        if (after < 0) after = 0;
        // 다음 목적지: 지금 플레이어가 있는 곳으로 돌진
        speed = base * B.def.chargeMultiplier;
        tx = Phaser.Math.Clamp(sim[i].x, 8 + 64, WIDTH - 8 - 64);
        ty = Phaser.Math.Clamp(sim[i].feet - 18, 8 + 60, FLOOR_Y[0] - 52);
      } else {
        x += (dx / dist) * step;
        y += (dy / dist) * step;
      }
    }
    return out;
  }

  /** 플레이어 몸과 마녀 몸 사이 여유(px). 0 이하면 닿는다. */
  private bossClear(px: number, feet: number, b: { x: number; y: number; m: number }) {
    const dx = Math.abs(b.x - px) - (12 + 46) - b.m;
    const dy = Math.abs(b.y - (feet - 18)) - (18 + 46) - b.m;
    return Math.max(dx, dy);
  }

  /**
   * 행동 하나를 seconds초 해 봤을 때 플레이어 위치들.
   * plan.wx가 있으면 먼저 그 자리까지 걸어간 다음 plan.act(사다리 오르내리기, 틈 뛰어넘기 등)를 한다.
   */
  private simPlan(s: any, me: Me, plan: BossPlan, seconds: number) {
    const out: { x: number; feet: number }[] = [];
    let x = me.x;
    let feet = me.feet;
    let ladder: any = s.climbing;
    const g = this.seg(s, me);
    let phase: 'walk' | 'act' = plan.wx === undefined || ladder ? 'act' : 'walk';
    let actT = 0;
    let started = false;
    const tol = plan.act === 'up' || plan.act === 'down' ? 8 : this.tol(me);
    for (let i = 0; i <= seconds * 60; i++) {
      out.push({ x, feet });
      if (phase === 'walk') {
        const d = plan.wx! - x;
        if (Math.abs(d) <= tol) phase = 'act';
        else {
          x += Math.sign(d) * Math.min(Math.abs(d), me.speed * DT);
          continue;
        }
      }
      const act = plan.act;
      if (!started) {
        started = true;
        if (!ladder && (act === 'up' || act === 'down')) {
          ladder = s.ladders.find(
            (l: any) => Math.abs(l.x - x) <= PLAYER.ladderGrab && (act === 'up' ? l.bottom : l.top) === FLOOR_Y[me.floor],
          );
          if (ladder) x = ladder.x;
        }
      }
      if (ladder) {
        const vy = act === 'up' ? -CLIMB_SPEED : act === 'down' ? CLIMB_SPEED : 0;
        feet = Phaser.Math.Clamp(feet + vy * DT, ladder.top, ladder.bottom);
        continue;
      }
      if (act === 'jump-left' || act === 'jump-right') {
        actT += DT;
        if (actT <= (2 * PLAYER.jumpVelocity) / PLAYER.gravity) {
          x += (act === 'jump-left' ? -1 : 1) * me.speed * DT;
          feet = me.feet - Math.max(0, PLAYER.jumpVelocity * actT - (PLAYER.gravity / 2) * actT * actT);
        } else feet = me.feet;
        continue;
      }
      const dir = act === 'left' ? -1 : act === 'right' ? 1 : 0;
      x += dir * me.speed * DT;
      if (g) x = Phaser.Math.Clamp(x, Math.min(me.x, g.l - 2), Math.max(me.x, g.r + 2));
    }
    return out;
  }

  /** 계획의 첫 단계를 키로 */
  private planKeys(s: any, me: Me, plan: BossPlan) {
    if (plan.wx !== undefined && !s.climbing) {
      const tol = plan.act === 'up' || plan.act === 'down' ? 8 : this.tol(me);
      if (Math.abs(plan.wx - me.x) > tol) return this.only(plan.wx > me.x ? 'right' : 'left');
    }
    const act = plan.act;
    if (act === 'stay') return this.only();
    if (act === 'jump-left' || act === 'jump-right') {
      this.only(act === 'jump-left' ? 'left' : 'right');
      this.tap('jump');
      return;
    }
    if (act === 'up' || act === 'down') this.climbDir = act;
    this.only(act);
  }

  /** 지금 할 수 있는 피하기 행동들 */
  private bossPlans(s: any, me: Me): BossPlan[] {
    if (s.climbing) return [{ act: 'up' }, { act: 'down' }, { act: 'stay' }];
    const plans: BossPlan[] = [{ act: 'stay' }, { act: 'left' }, { act: 'right' }];
    const g = this.seg(s, me);
    if (!g) return plans;
    // 같은 발판 위 사다리로 가서 오르내리기
    for (const l of s.ladders) {
      if (l.x < g.l || l.x > g.r || Math.abs(l.x - me.x) > 200) continue;
      if (l.bottom === FLOOR_Y[me.floor]) plans.push({ wx: l.x, act: 'up' });
      if (l.top === FLOOR_Y[me.floor]) plans.push({ wx: l.x, act: 'down' });
    }
    // 발판 끝까지 가서 틈 건너뛰기
    const segs = this.segs(s);
    for (const e of this.edges(s, segs)[this.find(segs, me.floor, me.x)] ?? []) {
      if (e.kind === 'gap' && Math.abs(e.takeoff - me.x) <= 200) plans.push({ wx: e.takeoff, act: e.dir > 0 ? 'jump-right' : 'jump-left' });
    }
    return plans;
  }

  private bossBrain(s: any) {
    const me = this.me(s);
    const B = s.boss;
    if (!s.climbing && (!me.onGround || me.floor < 0)) return; // 공중

    const H = 1.4;
    const path = this.bossPath(s, 1.5);

    // 공격: 마녀가 아래에 있고, 반죽이 떨어지는 동안 마녀가 그 자리에 올 것 같으면 Z
    if (B.armed && B.y - 48 > me.feet) {
      let y = me.feet + 7;
      let vy = 260;
      for (let i = 0; i < path.length; i++) {
        const b = path[i];
        if (y >= b.y - 48 - 7) {
          if (b.m < 35 && Math.abs(b.x - me.x) < 46 && this.frames >= this.nextThrowAt) {
            this.tap('z');
            this.nextThrowAt = this.frames + Math.ceil((B.def.throwCooldownMs / 1000) * 60);
            this.afterThrowUntil = this.frames + 36;
          }
          break;
        }
        vy += 1500 * DT;
        y += vy * DT;
      }
    }

    const intent = this.bossIntent(s, me, path);
    const score = (plan: BossPlan) => {
      const sim = this.simPlan(s, me, plan, H);
      const worstPath = this.bossWorstPath(s, sim);
      let worst = Infinity;
      for (let i = 0; i < sim.length; i++) worst = Math.min(worst, this.bossClear(sim[i].x, sim[i].feet, worstPath[i]));
      return worst;
    };
    const mine = score(intent);
    if (mine >= 14) {
      this.why = intent.act;
      this.planKeys(s, me, intent);
      if (!s.climbing) this.guardEdge(s, me);
      return;
    }
    let best = intent;
    let bestScore = mine;
    for (const p of this.bossPlans(s, me)) {
      const v = score(p);
      if (v > bestScore + 0.5) {
        best = p;
        bestScore = v;
      }
    }
    this.why = `dodge:${best.wx !== undefined ? Math.round(best.wx) + '>' : ''}${best.act}`;
    this.planKeys(s, me, best);
    if (!s.climbing) this.guardEdge(s, me);
  }

  /** 마녀가 없다면 하고 싶은 행동: 보석 모으기, 다 모았으면 위층으로 가서 마녀 위를 지키기 */
  private bossIntent(s: any, me: Me, path: { x: number; y: number; m: number }[]): BossPlan {
    if (s.climbing) return { act: this.climbDir ?? 'up' };
    const segs = this.segs(s);
    let first: Edge | null;
    let finalX: number;
    if (!s.boss.armed) {
      const best = this.bestRoute(s, me, this.targets(s));
      if (!best) return { act: 'stay' };
      first = best.first;
      finalX = best.g.x;
    } else {
      // 맨 위층에서, 아래로 내려가는 사다리가 있는 발판(피할 곳이 있는 곳)에서 공격한다
      const topFloor = FLOOR_Y.length - 1; // 높은 층일수록 마녀가 아래로 자주 지나간다
      const hasLadder = (q: Seg) => s.ladders.some((l: any) => l.top === FLOOR_Y[q.floor] && l.x >= q.l && l.x <= q.r);
      const here = this.seg(s, me);
      if (me.floor < topFloor || (here && !hasLadder(here))) {
        const best = this.bestRoute(
          s,
          me,
          segs.filter((q) => q.floor === topFloor && hasLadder(q)).map((q) => ({ floor: topFloor, x: (q.l + q.r) / 2 })),
        );
        if (!best) return { act: 'stay' };
        first = best.first;
        finalX = best.g.x;
      } else {
        // 마녀가 충분히 아래(두 층 가까이)에 있을 때만 그 위로 따라간다. 가까이서 바로 위에 서 있으면
        // 마녀가 위로 돌진할 때(맞은 직후에도 방향을 바꾼다) 옆으로 비킬 시간이 없다.
        const b = path[Math.min(path.length - 1, 30)];
        const g = this.seg(s, me);
        if (!g) return { act: 'stay' };
        const vgap = b.y - (me.feet - 18);
        const away = (): BossPlan => {
          const dir = b.x > me.x ? -1 : 1;
          const room = dir > 0 ? g.r - me.x : me.x - g.l;
          return { act: room > 8 ? (dir > 0 ? 'right' : 'left') : 'stay' };
        };
        // 던진 직후나 마녀가 가까이 있을 때는 벽 구석이 아니라 내려가는 사다리 옆에서 기다린다(바로 피할 수 있게)
        const ladder = s.ladders.find((l: any) => l.top === FLOOR_Y[me.floor] && l.x >= g.l && l.x <= g.r);
        const byLadder = (): BossPlan =>
          ladder && Math.abs(ladder.x - me.x) > 8 ? { act: ladder.x > me.x ? 'right' : 'left' } : { act: 'stay' };
        if (this.frames < this.afterThrowUntil) return ladder ? byLadder() : away();
        if (vgap < 170) return ladder ? byLadder() : Math.abs(b.x - me.x) < 120 ? away() : { act: 'stay' };
        const want = Phaser.Math.Clamp(b.x, g.l + 4, g.r - 4);
        return { act: Math.abs(want - me.x) <= this.tol(me) ? 'stay' : want > me.x ? 'right' : 'left' };
      }
    }
    const targetX = first ? (first.kind === 'ladder' ? first.x : first.takeoff) : finalX;
    const near = Math.abs(targetX - me.x) <= (first?.kind === 'ladder' ? 8 : this.tol(me));
    if (near && first?.kind === 'ladder') {
      this.climbDir = first.up ? 'up' : 'down';
      return { act: this.climbDir };
    }
    if (near && first?.kind === 'gap') return { act: first.dir > 0 ? 'jump-right' : 'jump-left' };
    if (near) return { act: 'stay' };
    return { act: targetX > me.x ? 'right' : 'left' };
  }

  report() {
    return {
      result: this.result,
      deaths: this.deaths,
      seconds: Math.round(this.frames / 60),
      levels: this.levels.map((l) => `LEVEL ${l.level}: ${l.cleared ? '클리어' : '진행 중/실패'} · 사망 ${l.deaths} · ${l.seconds}초`),
      notes: this.notes.slice(-40),
    };
  }
}

// ───────────────────────── 실행기 ─────────────────────────

export interface AutoplayOptions {
  /** 1 = 실제 속도. 0 = 화면을 기다리지 않고 최대한 빠르게(시험용). */
  speed?: number;
  /** 지정하면 지금 장면을 닫고 이 레벨(0부터)에서 새 게임을 시작한다. */
  startLevel?: number;
  /** 화면 위 조작 패널(속도·멈추기)을 보여 준다. */
  panel?: boolean;
}

let running: AutoRun | null = null;

export class AutoRun {
  readonly bot: AutoPlayer;
  speed: number;
  private stopped = false;
  private t = performance.now();
  private last = performance.now();
  private acc = 0;
  private panel?: AutoPanel;

  constructor(
    private game: Phaser.Game,
    opts: AutoplayOptions,
  ) {
    running?.stop();
    running = this;
    this.bot = new AutoPlayer(game);
    this.speed = opts.speed ?? 1;
    if (opts.startLevel !== undefined) {
      for (const sc of game.scene.getScenes(true)) game.scene.stop(sc.scene.key);
      game.scene.start('Game', { run: { ...newRun(), level: opts.startLevel } });
    }
    if (opts.panel) this.panel = new AutoPanel(this);
    // 게임 자체의 시간 흐름을 멈추고, 봇이 키를 누른 다음 한 프레임씩 직접 진행한다.
    game.loop.sleep();
    this.tick();
  }

  private stepOnce() {
    this.bot.frame();
    this.t += STEP_MS;
    this.game.step(this.t, STEP_MS);
  }

  private tick = () => {
    if (this.stopped) return;
    if (this.speed === 0) {
      // 숨겨진 창에서는 타이머가 1초에 한 번만 돌 수 있으므로 한 번에 넉넉히 진행한다.
      const start = performance.now();
      while (performance.now() - start < 400 && this.bot.result === 'running') this.stepOnce();
    } else {
      const now = performance.now();
      this.acc += Math.min(now - this.last, 100) * this.speed;
      this.last = now;
      let n = 0;
      while (this.acc >= STEP_MS && n < 16 && this.bot.result === 'running') {
        this.stepOnce();
        this.acc -= STEP_MS;
        n++;
      }
      this.panel?.update();
    }
    if (this.bot.result !== 'running') return this.finish();
    if (this.speed === 0) setTimeout(this.tick, 0);
    else requestAnimationFrame(this.tick);
  };

  setSpeed(speed: number) {
    const wasFast = this.speed === 0;
    this.speed = speed;
    this.last = performance.now();
    this.acc = 0;
    if (wasFast && speed > 0) requestAnimationFrame(this.tick);
  }

  private finish() {
    this.bot.releaseAll();
    this.wake();
    this.panel?.showResult();
  }

  private wake() {
    if (this.stopped) return;
    this.stopped = true;
    if (running === this) running = null;
    this.game.loop.wake();
  }

  /** 봇을 멈추고 조작을 사람에게 돌려준다. */
  stop() {
    if (this.bot.result === 'running') this.bot.result = 'stopped';
    this.bot.releaseAll();
    this.wake();
    this.panel?.remove();
  }
}

/** 화면 위쪽에 뜨는 자동 플레이 조작 패널 */
class AutoPanel {
  private root: HTMLDivElement;
  private status: HTMLSpanElement;
  private speedButtons: HTMLButtonElement[] = [];
  private lastText = '';

  constructor(private run: AutoRun) {
    const root = document.createElement('div');
    root.style.cssText = [
      'position:fixed',
      'top:10px',
      'left:50%',
      'transform:translateX(-50%)',
      'z-index:10',
      'display:flex',
      'align-items:center',
      'gap:8px',
      'padding:8px 12px',
      'background:rgba(30,20,40,0.88)',
      'border:2px solid #ff7aa8',
      'border-radius:8px',
      'color:#fff',
      `font-family:${FONT}, monospace`,
      'font-size:14px',
      'box-shadow:0 4px 12px rgba(0,0,0,0.5)',
      'user-select:none',
      'max-width:calc(100vw - 32px)',
      'flex-wrap:wrap',
      'justify-content:center',
    ].join(';');
    const label = document.createElement('span');
    label.textContent = '자동 플레이';
    label.style.color = '#ffb3cc';
    this.status = document.createElement('span');
    this.status.style.minWidth = '150px';
    root.append(label, this.status);
    for (const sp of [1, 2, 4, 8]) {
      const b = this.button(`${sp}배`, () => {
        this.run.setSpeed(sp);
        this.markSpeed();
      });
      b.dataset.speed = String(sp);
      this.speedButtons.push(b);
      root.append(b);
    }
    root.append(this.button('멈추고 직접 하기', () => this.run.stop(), '#ff9f43'));
    document.body.append(root);
    this.root = root;
    this.markSpeed();
    this.update();
  }

  private button(text: string, onClick: () => void, color = '#9fe3ff') {
    const b = document.createElement('button');
    b.textContent = text;
    b.tabIndex = -1;
    b.style.cssText = `font:inherit;color:${color};background:#3a2a4a;border:1px solid ${color};border-radius:4px;padding:3px 8px;cursor:pointer`;
    b.addEventListener('click', (e) => {
      e.preventDefault();
      b.blur();
      onClick();
    });
    return b;
  }

  private markSpeed() {
    for (const b of this.speedButtons) {
      const on = Number(b.dataset.speed) === this.run.speed;
      b.style.background = on ? '#ff7aa8' : '#3a2a4a';
      b.style.color = on ? '#2b1d2f' : '#9fe3ff';
    }
  }

  update() {
    const bot = this.run.bot;
    const lvl = bot.current ? `LEVEL ${bot.current.level}` : '준비 중';
    const text = `${lvl} · 사망 ${bot.deaths}`;
    if (text !== this.lastText) {
      this.status.textContent = text;
      this.lastText = text;
    }
  }

  showResult() {
    const r = this.run.bot.report();
    const head =
      r.result === 'victory'
        ? '엔딩까지 성공!'
        : r.result === 'gameover'
          ? '게임 오버'
          : r.result === 'stuck'
            ? '길이 막혀 멈춤'
            : '멈춤';
    const minutes = Math.floor(r.seconds / 60);
    this.root.replaceChildren();
    const msg = document.createElement('span');
    msg.textContent = `자동 플레이 결과: ${head} · 사망 ${r.deaths}번 · ${minutes}분 ${r.seconds % 60}초`;
    this.root.append(msg, this.button('닫기', () => this.remove()));
  }

  remove() {
    this.root.remove();
  }
}

export function startAutoplay(game: Phaser.Game, opts: AutoplayOptions = {}) {
  return new AutoRun(game, opts);
}
