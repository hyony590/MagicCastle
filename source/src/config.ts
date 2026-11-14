// 화면과 게임 규칙의 공통 상수. 손맛 조정은 대부분 이 파일에서 한다.

/** 개발 서버(npm run dev)에서 타이틀을 건너뛰고 바로 시작할 레벨(1부터). 0이면 타이틀부터.
 *  주소 끝에 ?level=3 처럼 붙이면 그 레벨로 시작한다. 배포 빌드에는 영향이 없다. */
export const DEV_START_LEVEL = 1;

/** 화면 갱신 횟수(초당). 낮을수록 옛날 플래시 게임처럼 뚝뚝 끊겨 보인다. 부드럽게 하려면 60. */
export const FPS =  100;

/** 맵(플레이 영역) 폭. 768 / 32 = 24칸. */
export const WIDTH = 768;
export const PLAY_HEIGHT = 640;
/** 하단 HUD 높이(두 줄) */
export const HUD_HEIGHT = 52;
export const HEIGHT = PLAY_HEIGHT + HUD_HEIGHT;

/** 레벨 데이터의 발판 구간은 이 폭의 열 단위로 적는다. 768 / 32 = 24열. */
export const TILE = 32;
export const COLUMNS = WIDTH / TILE;

export const FLOOR_THICKNESS = 16;
/** 각 층 발판 윗면의 y. 0층이 맨 아래 바닥, 4층이 맨 위. */
export const FLOOR_Y = [608, 488, 368, 248, 128];

export const PLAYER = {
  width: 24,
  height: 36,
  walkSpeed: 190,
  climbSpeed: 150,
  /** 점프 높이 = jumpVelocity² / (2 × gravity) ≈ 33px, 체공 약 0.33초, 수평 약 63px.
   *  불꽃(FLAME.height)보다 높고 몬스터(ENEMY.height)보다 낮아야 한다.
   *  2칸(64px) 틈은 가장자리 가까이에서 뛰어야 건넌다. */
  jumpVelocity: 400,
  gravity: 2400,
  /** false면 공중에서 좌우 방향을 바꿀 수 없다. 뛰는 순간의 방향으로 날아간다. */
  airControl: false,
  /** 이 높이(px)보다 더 떨어진 뒤 착지하면 사망한다. 층 간격은 120px. */
  safeFallHeight: 100,
  /** 사다리 중심에서 이 거리 안에 있으면 사다리를 탈 수 있다. */
  ladderGrab: 14,
  boostMultiplier: 1.5,
  boostDurationMs: 8000,
};

export const ENEMY = {
  width: 26,
  /** 점프 높이(약 33px)보다 커서 뛰어넘을 수 없다. */
  height: 48,
};

/** 난이도. 숫자를 올리면 어려워지고 내리면 쉬워진다. */
export const DIFFICULTY = {
  /** 레벨 데이터에 적힌 몬스터 속도에 곱하는 배율 */
  enemySpeedScale: 1.35,
  /** 몬스터 최고 속도. 플레이어 걷기(190)보다 느려야 몬스터 뒤를 따라가 아이템을 먹고 도망칠 수 있다. */
  enemySpeedCap: 175,
  /** 상자에서 나온 몬스터 속도 */
  chestEnemySpeed: 110,
  /** 상자 내용물이 나올 비율(가중치). 부츠(아이템) 아니면 몬스터. 지금은 부츠 40% : 몬스터 60%. */
  chestWeights: { boots: 2, enemy: 3 },
  /** 몬스터·불꽃 판정을 봐주는 여유(px). 0이면 스치기만 해도 죽는다. */
  hitForgiveness: 1,
};

/** 상자에서 나온 몬스터는 상자 x ± 이 거리(px) 안에서만 순찰한다. 길을 막지 않도록 상자는 막다른 곳에 둔다. */
export const CHEST_ENEMY_RANGE = 100;

/** 기본 아이템을 먹는 순간 게임 전체(플레이어 포함)가 멈추는 시간(ms). 0이면 멈추지 않는다. */
export const PICKUP_PAUSE_MS = 500;

/** 불꽃 함정 크기. 점프 높이(약 33px)보다 충분히 낮아야 뛰어넘을 수 있다. */
export const FLAME = { width: 12, height: 16 };

export const SCORE = {
  item: 50,
  letter: 100,
};

export const START_LIVES = 3;

/** 이 글자를 모두 모으면 생명 +1. */
export const BONUS_WORD = 'STAR';

export const COLORS = {
  wall: 0x2a2d3a,
  brick: 0x333747,
  floor: 0x8a8f9e,
  floorTop: 0xb7bccb,
  floorBottom: 0x5d6170,
  ladder: 0xc08a3e,
  player: 0x6fd36a,
  enemy: 0xe2558f,
  chest: 0xc8962e,
  chestLid: 0x8a5a1e,
  chestOpen: 0x4d4234,
  trapBase: 0x5b5f6b,
  flame: 0xff8a2a,
  hud: 0x15161d,
  boss: 0x5b3a8c,
  bossHurt: 0xffffff,
  stone: 0x9aa0ad,
  fireball: 0xff5a1f,
};
