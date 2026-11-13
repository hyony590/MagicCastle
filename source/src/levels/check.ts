// 레벨이 실제로 깰 수 있는지 검사한다(브라우저 콘솔 경고용).
//
// 전제: 몬스터는 뛰어넘을 수 없고, 2칸(64px) 이하의 틈은 점프로 건널 수 있으며,
// 불꽃은 뛰어넘을 수 있다. 낙하는 사망이므로 이동 경로로 치지 않는다.
//
// 방법: 각 발판 구간에서 몬스터 순찰 범위를 뺀 "안전 구간"을 노드로 두고,
// 사다리와 틈으로 연결해 시작 위치에서 닿는 곳을 찾는다.
// 순찰 범위 안의 아이템은, 닿을 수 있는 쪽에서 몬스터 뒤를 따라 들어가 먹고 되돌아 나올 수 있으면 통과로 본다.

import { CHEST_ENEMY_RANGE, DIFFICULTY, ENEMY, PLAYER, TILE, WIDTH } from '../config';
import type { LevelDef } from './types';

/** 플레이어 중심과 몬스터 중심이 이보다 가까우면 부딪힌다(판정 상자 기준). */
const HIT = PLAYER.width / 2 - DIFFICULTY.hitForgiveness + (ENEMY.width / 2 - DIFFICULTY.hitForgiveness);
/** 순찰 범위 안의 아이템을 먹으려면 몬스터가 아이템 너머로 이만큼은 지나가야 한다. */
const PASS_MARGIN = 30;
/** 불꽃이 사다리나 틈 가장자리와 이보다 가까우면 넘기 어렵다. */
const FIRE_CLEARANCE = 40;
const MAX_GAP = 2 * TILE;
const EPS = 0.5;

interface Patrol {
  floor: number;
  min: number;
  max: number;
}

interface Node {
  floor: number;
  a: number;
  b: number;
}

function segmentsPx(level: LevelDef, floor: number): [number, number][] {
  return (level.floors[floor] ?? []).map(([a, b]) => [a * TILE, b * TILE] as [number, number]).sort((p, q) => p[0] - q[0]);
}

function segOf(level: LevelDef, floor: number, x: number): [number, number] | null {
  return segmentsPx(level, floor).find(([l, r]) => x >= l && x < r) ?? null;
}

function patrolFor(
  level: LevelDef,
  floor: number,
  x: number,
  range?: [number, number],
  crossGaps = false,
): Patrol | null {
  const seg: [number, number] | null = crossGaps ? [0, WIDTH] : segOf(level, floor, x);
  if (!seg) return null;
  const [l, r] = range ? [Math.max(seg[0], range[0]), Math.min(seg[1], range[1])] : seg;
  return { floor, min: l + ENEMY.width / 2, max: r - ENEMY.width / 2 };
}

/** 같은 층에서 틈(2칸 이하)과 맞닿은 발판 끝 x 목록 */
function gapEdges(level: LevelDef, floor: number): number[] {
  const segs = segmentsPx(level, floor);
  const edges: number[] = [];
  for (let i = 0; i + 1 < segs.length; i++) {
    if (segs[i + 1][0] - segs[i][1] <= MAX_GAP) edges.push(segs[i][1], segs[i + 1][0]);
  }
  return edges;
}

function laddersOn(level: LevelDef, floor: number): number[] {
  return level.ladders.filter((l) => l.floor === floor || l.floor + 1 === floor).map((l) => l.x);
}

export function checkPlayability(level: LevelDef): string[] {
  const problems: string[] = [];
  const patrols = level.enemies
    .map((e) => patrolFor(level, e.floor, e.x, e.range ?? (e.crossGaps ? [0, WIDTH] : undefined), e.crossGaps))
    .filter((p): p is Patrol => p !== null);

  // 1) 안전 구간 노드 만들기
  const nodes: Node[] = [];
  level.floors.forEach((_, floor) => {
    const zones = patrols
      .filter((p) => p.floor === floor)
      .map((p) => [p.min - HIT, p.max + HIT] as [number, number])
      .sort((p, q) => p[0] - q[0]);
    for (const [l, r] of segmentsPx(level, floor)) {
      let cursor = l;
      for (const [zl, zr] of zones) {
        if (zr <= l || zl >= r) continue;
        if (zl > cursor) nodes.push({ floor, a: cursor, b: zl });
        cursor = Math.max(cursor, zr);
      }
      if (cursor < r) nodes.push({ floor, a: cursor, b: r });
    }
  });
  const find = (floor: number, x: number) =>
    nodes.findIndex((n) => n.floor === floor && x >= n.a - EPS && x <= n.b + EPS);

  // 2) 사다리·틈으로 연결
  const edges: number[][] = nodes.map(() => []);
  const link = (i: number, j: number) => {
    if (i < 0 || j < 0) return;
    edges[i].push(j);
    edges[j].push(i);
  };
  for (const l of level.ladders) {
    const lower = find(l.floor, l.x);
    const upper = find(l.floor + 1, l.x);
    if (lower < 0 || upper < 0) problems.push(`${l.floor}층 사다리 x=${l.x}의 끝이 몬스터 순찰 범위 안에 있다.`);
    link(lower, upper);
  }
  level.floors.forEach((_, floor) => {
    const segs = segmentsPx(level, floor);
    for (let i = 0; i + 1 < segs.length; i++) {
      const gap = segs[i + 1][0] - segs[i][1];
      if (gap > MAX_GAP) continue;
      link(find(floor, segs[i][1]), find(floor, segs[i + 1][0]));
    }
  });

  // 3) 시작 위치에서 닿는 노드
  const start = find(level.start.floor ?? 0, level.start.x);
  if (start < 0) return [...problems, '시작 위치가 몬스터 순찰 범위 안에 있다.'];
  const reached = new Set<number>([start]);
  const queue = [start];
  while (queue.length) {
    const i = queue.shift()!;
    for (const j of edges[i]) if (!reached.has(j)) (reached.add(j), queue.push(j));
  }

  const canReach = (floor: number, x: number): boolean => {
    const n = find(floor, x);
    if (n >= 0) return reached.has(n);
    // 순찰 범위 안: 닿을 수 있는 쪽에서 몬스터 뒤를 따라 들어갈 수 있는가
    return patrols.some((p) => {
      if (p.floor !== floor || x <= p.min - HIT || x >= p.max + HIT) return false;
      const left = nodes.findIndex((m) => m.floor === floor && Math.abs(m.b - (p.min - HIT)) < EPS);
      const right = nodes.findIndex((m) => m.floor === floor && Math.abs(m.a - (p.max + HIT)) < EPS);
      return (left >= 0 && reached.has(left) && p.max - x >= PASS_MARGIN) || (right >= 0 && reached.has(right) && x - p.min >= PASS_MARGIN);
    });
  };

  level.items.forEach((it) => {
    if (!canReach(it.floor, it.x)) problems.push(`${it.floor}층 아이템 x=${it.x}에 닿을 수 없다. 클리어 불가.`);
  });
  level.letters.forEach((l) => {
    if (!canReach(l.floor, l.x)) problems.push(`${l.floor}층 글자 ${l.char} x=${l.x}에 닿을 수 없다.`);
  });
  level.chests.forEach((c) => {
    if (!canReach(c.floor, c.x)) problems.push(`${c.floor}층 상자 x=${c.x}에 닿을 수 없다.`);
  });

  // 4) 불꽃 위치
  for (const t of level.traps) {
    for (const x of laddersOn(level, t.floor))
      if (Math.abs(x - t.x) < FIRE_CLEARANCE) problems.push(`${t.floor}층 불꽃 x=${t.x}가 사다리 x=${x}에 너무 가깝다.`);
    for (const x of gapEdges(level, t.floor))
      if (Math.abs(x - t.x) < FIRE_CLEARANCE) problems.push(`${t.floor}층 불꽃 x=${t.x}가 틈 가장자리 x=${x}에 너무 가깝다.`);
    for (const it of level.items)
      if (it.floor === t.floor && Math.abs(it.x - t.x) < 24) problems.push(`${t.floor}층 불꽃 x=${t.x}가 아이템 x=${it.x}와 겹친다.`);
  }

  // 5) 상자에서 나올 몬스터가 사다리·틈·시작 위치를 막는지
  for (const c of level.chests) {
    const crossGaps = c.enemy?.crossGaps ?? false;
    const range = c.enemy?.range ?? (crossGaps ? ([0, WIDTH] as [number, number]) : ([c.x - CHEST_ENEMY_RANGE, c.x + CHEST_ENEMY_RANGE] as [number, number]));
    const p = patrolFor(level, c.floor, c.x, range, crossGaps);
    if (!p) continue;
    const blocks = (x: number) => x > p.min - HIT && x < p.max + HIT;
    for (const x of laddersOn(level, c.floor))
      if (blocks(x)) problems.push(`${c.floor}층 상자 x=${c.x}에서 몬스터가 나오면 사다리 x=${x}를 막는다.`);
    for (const x of gapEdges(level, c.floor))
      if (blocks(x)) problems.push(`${c.floor}층 상자 x=${c.x}에서 몬스터가 나오면 틈 가장자리 x=${x}를 막는다.`);
    if (c.floor === 0 && blocks(level.start.x)) problems.push(`상자 x=${c.x}의 몬스터가 시작 위치를 막는다.`);
  }

  // 6) 틈 너비
  level.floors.forEach((_, floor) => {
    const segs = segmentsPx(level, floor);
    for (let i = 0; i + 1 < segs.length; i++) {
      const gap = segs[i + 1][0] - segs[i][1];
      if (gap > MAX_GAP) problems.push(`${floor}층 x=${segs[i][1]}~${segs[i + 1][0]} 틈이 ${gap / TILE}칸이라 점프로 건널 수 없다.`);
    }
  });
  if (level.floors[0]?.length !== 1) problems.push('0층(맨 아래 바닥)에는 틈이 없어야 한다.');

  return problems;
}
