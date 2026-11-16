import type { LevelDef } from './types';

// 마지막 레벨: 보스전.
// 보스 '마녀 쿠르르'는 발판과 상관없이 화면 어디든 날아다닌다. 몸에 닿으면 죽는다.
// Z키를 누르면 발밑에서 돌이 곧장 아래로 날아간다(발판을 뚫고 내려간다). 보스보다 위에서 던져야 맞는다.
// 층마다 흩어진 다이아를 모두 모아야 공격(Z키)이 열린다. 클리어 조건은 보스 격파다.
export const level10: LevelDef = {
  name: '꼭대기 성',
  start: { x: 750, facing: -1 },
  floors: [
    [[0, 24]],
    [[0, 7], [9, 12], [14, 17], [19, 24]],
    [[0, 10], [14, 18], [20, 24]],
    [[0, 6], [8, 11], [13, 18], [20,24]],
    [[0,7], [9,12], [14,17], [19,24]],
  ],
  ladders: [
    { floor: 0, x: 340 },
    { floor: 0, x: 700 },
    { floor: 1, x: 210 },
    { floor: 1, x: 520 },
    { floor: 2, x: 40 },
    { floor: 2, x: 560 },
    { floor: 3, x: 100 },
    { floor: 3, x: 680 },
  ],
  items: [
    { kind: 'gem', floor: 0, x: 80 },
    { kind: 'gem', floor: 1, x: 460 },
    { kind: 'gem', floor: 1, x: 650 },
    { kind: 'gem', floor: 2, x: 736 },
    { kind: 'gem', floor: 3, x: 300 },
    { kind: 'gem', floor: 4, x: 180 },
    { kind: 'gem', floor: 4, x: 730 },
  ],
  chests: [],
  letters: [],
  enemies: [],
  traps: [],
  boss: {
    name: '마녀 쿠르르',
    hp: 5,
    // 맞을 때마다 30씩 빨라진다
    speed: 110,
    speedPerHit: 30,
    start: { x: 384, y: 80 },
    throwCooldownMs: 650,
    // 목적지를 플레이어 위치로 고를 확률과 맞을 때마다 늘어나는 양
    homingChance: 0.05,
    homingPerHit: 0,
    hoverMs: 450,
    // 머리 위 돌을 피할 확률과 맞을 때마다 늘어나는 양 (0이면 돌을 그대로 맞는다)
    dodgeChance: 0,
    dodgePerHit: 0,
    // 플레이어를 노리고 날아올 때 속도 배율
    chargeMultiplier: 1.3,
  },
};
