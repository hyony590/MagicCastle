// 레벨이 실제로 깰 수 있는지 검사한다(브라우저 콘솔 경고와 npm run check:levels).
//
// 보는 것: 발판 모양만으로 시작 위치에서 모든 아이템·글자·상자에 갈 수 있는가.
// - 이동 경로: 같은 발판 구간 안 걷기, 사다리, 2칸(64px) 이하 틈 점프.
// - 3칸 이상의 넓은 틈은 점프로는 못 건너므로 사다리로 돌아가야 한다(그 자체는 문제가 아니다).
// - 낙하는 사망이므로 경로로 치지 않는다.
//
// 보지 않는 것: 몬스터. 몬스터는 길을 막는 벽이 아니라 타이밍을 맞춰 피하는 대상이다.
// 사다리 끝이나 틈 앞을 몬스터가 지나가도 문제로 보지 않는다.

import { FLAME, PLAYER, TILE } from '../config';
import type { LevelDef } from './types';

const MAX_GAP = 2 * TILE;
/** 불꽃이 사다리나 틈 가장자리와 이보다 가까우면, 사다리에서 내리거나 착지하는 자리에 서기만 해도 불꽃에 닿는다.
 *  (플레이어 반폭 + 불꽃 반폭 + 여유 2px) 이보다 멀면 살짝 물러섰다가 점프해서 넘을 수 있다. */
const FIRE_CLEARANCE = PLAYER.width / 2 + FLAME.width / 2 + 2;

interface Node {
  floor: number;
  a: number;
  b: number;
}

function segmentsPx(level: LevelDef, floor: number): [number, number][] {
  return (level.floors[floor] ?? []).map(([a, b]) => [a * TILE, b * TILE] as [number, number]).sort((p, q) => p[0] - q[0]);
}

/** 같은 층에서 2칸 이하 틈과 맞닿은 발판 끝 x 목록 */
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

  // 1) 발판 구간 하나가 노드 하나
  const nodes: Node[] = [];
  level.floors.forEach((_, floor) => {
    for (const [a, b] of segmentsPx(level, floor)) nodes.push({ floor, a, b });
  });
  const find = (floor: number, x: number) => nodes.findIndex((n) => n.floor === floor && x >= n.a && x < n.b);

  // 2) 사다리·좁은 틈으로 연결
  const edges: number[][] = nodes.map(() => []);
  const link = (i: number, j: number) => {
    if (i < 0 || j < 0) return;
    edges[i].push(j);
    edges[j].push(i);
  };
  for (const l of level.ladders) link(find(l.floor, l.x), find(l.floor + 1, l.x));
  level.floors.forEach((_, floor) => {
    const segs = segmentsPx(level, floor);
    for (let i = 0; i + 1 < segs.length; i++) {
      if (segs[i + 1][0] - segs[i][1] <= MAX_GAP) link(find(floor, segs[i][0]), find(floor, segs[i + 1][0]));
    }
  });

  // 3) 시작 위치에서 닿는 구간
  const start = find(level.start.floor ?? 0, level.start.x);
  if (start < 0) return ['시작 위치가 발판 밖이다.'];
  const reached = new Set<number>([start]);
  const queue = [start];
  while (queue.length) {
    const i = queue.shift()!;
    for (const j of edges[i]) if (!reached.has(j)) (reached.add(j), queue.push(j));
  }
  const canReach = (floor: number, x: number) => {
    const n = find(floor, x);
    return n >= 0 && reached.has(n);
  };

  const hint = '사다리나 2칸 이하 틈으로 이어지지 않은 발판이다';
  level.items.forEach((it) => {
    if (!canReach(it.floor, it.x)) problems.push(`${it.floor}층 아이템 x=${it.x}에 갈 수 없다(${hint}). 클리어 불가.`);
  });
  level.letters.forEach((l) => {
    if (!canReach(l.floor, l.x)) problems.push(`${l.floor}층 글자 ${l.char} x=${l.x}에 갈 수 없다(${hint}).`);
  });
  level.chests.forEach((c) => {
    if (!canReach(c.floor, c.x)) problems.push(`${c.floor}층 상자 x=${c.x}에 갈 수 없다(${hint}).`);
  });

  // 4) 불꽃 위치: 사다리에서 내리자마자, 틈을 뛰어 착지하자마자 불꽃이면 피할 수 없다.
  for (const t of level.traps) {
    for (const x of laddersOn(level, t.floor))
      if (Math.abs(x - t.x) < FIRE_CLEARANCE) problems.push(`${t.floor}층 불꽃 x=${t.x}가 사다리 x=${x}에 너무 가깝다.`);
    for (const x of gapEdges(level, t.floor))
      if (Math.abs(x - t.x) < FIRE_CLEARANCE) problems.push(`${t.floor}층 불꽃 x=${t.x}가 틈 가장자리 x=${x}에 너무 가깝다.`);
    for (const it of level.items)
      if (it.floor === t.floor && Math.abs(it.x - t.x) < 24) problems.push(`${t.floor}층 불꽃 x=${t.x}가 아이템 x=${it.x}와 겹친다.`);
  }

  // 5) 맨 아래 바닥에 틈이 있으면 화면 밖으로 떨어진다.
  if (level.floors[0]?.length !== 1) problems.push('0층(맨 아래 바닥)에는 틈이 없어야 한다.');

  return problems;
}
