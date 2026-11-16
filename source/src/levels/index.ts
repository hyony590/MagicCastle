import { COLUMNS, TILE } from '../config';
import { checkPlayability } from './check';
import { level1 } from './level1';
import { level2 } from './level2';
import { level3 } from './level3';
import { level4 } from './level4';
import { level5 } from './level5';
import { level6 } from './level6';
import { level7 } from './level7';
import { level8 } from './level8';
import { level9 } from './level9';
import { level10 } from './level10';
import type { LevelDef } from './types';

export const LEVELS: LevelDef[] = [level1, level2, level3, level4, level5, level6, level7, level8, level9, level10];

/** x가 floor 층의 발판 위인지. 맞으면 해당 구간의 [왼쪽 px, 오른쪽 px]를 돌려준다. */
export function segmentAt(level: LevelDef, floor: number, x: number): [number, number] | null {
  for (const [a, b] of level.floors[floor] ?? []) {
    const left = a * TILE;
    const right = b * TILE;
    if (x >= left && x < right) return [left, right];
  }
  return null;
}

/** 레벨 데이터의 흔한 실수를 콘솔에 경고한다. 데이터를 직접 고칠 때 도움이 된다. */
export function validateLevel(level: LevelDef, index: number): string[] {
  const problems: string[] = [];
  const at = (what: string) => `LEVEL ${index + 1} (${level.name}) ${what}`;

  level.floors.forEach((segs, f) =>
    segs.forEach(([a, b]) => {
      if (a < 0 || b > COLUMNS || a >= b) problems.push(at(`${f}층 구간 [${a}, ${b}]이 잘못됐다.`));
    }),
  );
  const startFloor = level.start.floor ?? 0;
  if (!segmentAt(level, startFloor, level.start.x)) problems.push(at(`시작 위치가 ${startFloor}층 발판 밖이다.`));
  for (const l of level.ladders) {
    if (l.floor < 0 || l.floor >= level.floors.length - 1) problems.push(at(`사다리 ${l.floor}층은 위층이 없다.`));
    else if (!segmentAt(level, l.floor, l.x) || !segmentAt(level, l.floor + 1, l.x))
      problems.push(at(`${l.floor}층 사다리 x=${l.x}가 발판 밖에 걸친다.`));
  }
  const placed: { floor: number; x: number; what: string }[] = [
    ...level.items.map((o) => ({ ...o, what: '아이템' })),
    ...level.chests.map((o) => ({ ...o, what: '상자' })),
    ...level.letters.map((o) => ({ ...o, what: `글자 ${o.char}` })),
    // 틈 위를 지나가는 몬스터(crossGaps)는 틈 위에서 시작해도 된다.
    ...level.enemies.filter((o) => !o.crossGaps).map((o) => ({ ...o, what: '적' })),
    ...level.traps.map((o) => ({ ...o, what: '함정' })),
  ];
  for (const o of placed) {
    if (!segmentAt(level, o.floor, o.x)) problems.push(at(`${o.floor}층 ${o.what} x=${o.x}가 발판 밖이다.`));
  }
  if (level.items.length === 0 && !level.boss) problems.push(at('아이템이 없으면 클리어할 수 없다.'));
  if (problems.length === 0) problems.push(...checkPlayability(level).map(at));
  return problems;
}
