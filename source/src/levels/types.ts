// 레벨 데이터 형식. 좌표 규칙:
// - floor: 0(맨 아래 바닥) ~ 4(맨 위 발판)
// - 발판 구간 [a, b]: a열부터 b열 직전까지(열 폭 32px, 0~24열)
// - x: 픽셀 단위 수평 중심(0~768)
// - 사다리는 floor 층과 floor+1 층을 잇는다. x는 두 층 모두 발판 위여야 한다.

export type ItemKind = 'gem' | 'apple' | 'coin';
/** 상자 내용물: 스피드 부츠(아이템) 또는 몬스터 */
export type ChestContent = 'boots' | 'enemy';

export interface ItemDef {
  kind: ItemKind;
  floor: number;
  x: number;
}

export interface LadderDef {
  floor: number;
  x: number;
}

export interface ChestDef {
  floor: number;
  x: number;
  /** 생략하면 열 때 무작위로 정한다. */
  contents?: ChestContent;
  /** 상자에서 나온 몬스터의 순찰 방식. 생략하면 상자 x ± 100px, 발판 구간 안에서만. */
  enemy?: {
    /** 순찰 범위 [왼쪽 x, 오른쪽 x]. 예: [0, 768]이면 층 끝에서 끝까지 */
    range?: [number, number];
    /** true면 발판의 틈 위도 그대로 지나간다(떨어지지 않음) */
    crossGaps?: boolean;
  };
}

export interface LetterDef {
  char: string;
  floor: number;
  x: number;
}

/** 몬스터 그림 종류. carrot(성난 당근)은 도시락 상자에서 나오는 몬스터다. */
export type EnemyLook = 'pot' | 'onion' | 'milk' | 'salt' | 'broccoli' | 'toaster' | 'carrot';

export interface EnemyDef {
  floor: number;
  x: number;
  /** 몬스터 종류. 생략하면 레벨과 순서에 따라 돌아가며 정해진다(config.ts ENEMY_LOOKS). */
  look?: EnemyLook;
  dir: 1 | -1;
  /** px/초 */
  speed: number;
  /** 순찰 범위 [왼쪽 x, 오른쪽 x]. 생략하면 서 있는 발판 구간 전체.
   *  몬스터는 뛰어넘을 수 없으므로, 반드시 지나가야 하는 길을 막지 않게 정한다. */
  range?: [number, number];
  /** true면 발판의 틈 위도 그대로 지나간다. range를 생략하면 층 끝에서 끝까지(0~768). */
  crossGaps?: boolean;
}

/** 불꽃 함정. 기본은 항상 켜져 있고, 점프로 뛰어넘는다. */
export interface TrapDef {
  floor: number;
  x: number;
  /** onMs와 offMs를 둘 다 적으면 켜졌다 꺼졌다 한다. */
  onMs?: number;
  offMs?: number;
  offsetMs?: number;
}

/** 보스전 설정. 있으면 아이템 대신 보스를 쓰러뜨리는 것이 클리어 조건이다.
 *  보스는 화면 어디든 날아다니고, 플레이어는 Z키로 발밑 아래로 돌을 던진다. 아이템은 점수용이다. */
export interface BossDef {
  name: string;
  /** 돌에 맞아야 하는 횟수 */
  hp: number;
  /** 처음 비행 속도(px/초)와 한 번 맞을 때마다 늘어나는 속도 */
  speed: number;
  speedPerHit: number;
  /** 처음 나타나는 위치(몸 중심) */
  start: { x: number; y: number };
  /** Z키로 돌을 던진 뒤 다음 돌까지 기다리는 시간(ms) */
  throwCooldownMs: number;
  /** 다음 목적지를 플레이어 위치로 고를 확률(0~1)과, 맞을 때마다 늘어나는 양 */
  homingChance: number;
  homingPerHit: number;
  /** 가끔 제자리에서 멈추는 시간(ms). 짧을수록 맞히기 어렵다. */
  hoverMs: number;
  /** 머리 위로 돌이 떨어질 때 옆으로 피할 확률(0~1)과, 맞을 때마다 늘어나는 양 */
  dodgeChance: number;
  dodgePerHit: number;
  /** 플레이어를 노리고 날아올 때 속도 배율 */
  chargeMultiplier: number;
}

export interface LevelDef {
  name: string;
  /** floor를 생략하면 0층(맨 아래)에서 시작한다. */
  start: { x: number; facing: 1 | -1; floor?: number };
  /** floors[n] = n층의 연속 발판 구간 목록 */
  floors: [number, number][][];
  ladders: LadderDef[];
  items: ItemDef[];
  chests: ChestDef[];
  letters: LetterDef[];
  enemies: EnemyDef[];
  traps: TrapDef[];
  boss?: BossDef;
}
