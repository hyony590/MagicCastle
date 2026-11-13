import type { LevelDef } from './types';

// 마지막 레벨: 보스전.
// 보스 '그림자 성주'는 발판과 상관없이 화면 어디든 날아다닌다. 몸에 닿으면 죽는다.
// Z키를 누르면 발밑에서 돌이 곧장 아래로 날아간다(발판을 뚫고 내려간다). 보스보다 위에서 던져야 맞는다.
// 층마다 흩어진 다이아를 모두 모아야 공격(Z키)이 열린다. 클리어 조건은 보스 격파다.
export const level10: LevelDef = {
  name: '꼭대기 성',
  start: { x: 384, facing: 1 },
  floors: [
    [[0, 24]],
    [[0, 7], [9, 15], [17, 24]],
    [[0, 10], [12, 24]],
    [[0, 5], [7, 18], [20, 24]],
    [[2, 22]],
  ],
  ladders: [
    { floor: 0, x: 96 },
    { floor: 0, x: 672 },
    { floor: 1, x: 416 },
    { floor: 1, x: 704 },
    { floor: 2, x: 96 },
    { floor: 2, x: 480 },
    { floor: 3, x: 240 },
    { floor: 3, x: 640 },
  ],
  items: [
    { kind: 'gem', floor: 0, x: 240 },
    { kind: 'gem', floor: 0, x: 528 },
    { kind: 'gem', floor: 1, x: 48 },
    { kind: 'gem', floor: 1, x: 336 },
    { kind: 'gem', floor: 1, x: 608 },
    { kind: 'gem', floor: 2, x: 208 },
    { kind: 'gem', floor: 2, x: 432 },
    { kind: 'gem', floor: 2, x: 736 },
    { kind: 'gem', floor: 3, x: 48 },
    { kind: 'gem', floor: 3, x: 384 },
    { kind: 'gem', floor: 3, x: 720 },
    { kind: 'gem', floor: 4, x: 128 },
    { kind: 'gem', floor: 4, x: 384 },
    { kind: 'gem', floor: 4, x: 656 },
  ],
  chests: [],
  letters: [],
  enemies: [],
  traps: [],
  boss: {
    name: '그림자 성주',
    hp: 7,
    // 맞을 때마다 30씩 빨라진다
    speed: 110,
    speedPerHit: 30,
    start: { x: 384, y: 80 },
    throwCooldownMs: 650,
    // 목적지를 플레이어 위치로 고를 확률과 맞을 때마다 늘어나는 양
    homingChance: 0.3,
    homingPerHit: 0.06,
    hoverMs: 450,
    // 머리 위 돌을 피할 확률과 맞을 때마다 늘어나는 양
    dodgeChance: 0.25,
    dodgePerHit: 0.06,
    // 플레이어를 노리고 날아올 때 속도 배율
    chargeMultiplier: 1.3,
  },
};
