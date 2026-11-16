import type { ChestContent, EnemyLook } from './levels/types';
import { START_LIVES } from './config';

/** 한 판 동안 레벨을 넘어 유지되는 값. */
export interface RunState {
  /** LEVELS 배열의 인덱스. 화면에는 +1 해서 표시한다. */
  level: number;
  score: number;
  /** 남은 시도 횟수(현재 시도 포함). 0이 되면 게임 오버. */
  lives: number;
  /** 지금까지 모은 보너스 글자. 사망과 레벨 전환에도 유지된다. */
  letters: string[];
  /**
   * 지금 레벨에서 이미 먹은 재료(level.items 번호). 기절해도 목숨이 남아 있으면 그대로 두고 이어서 한다.
   * level이 지금 레벨과 다르면(다음 레벨로 넘어감) 무시한다.
   */
  taken?: {
    level: number;
    items: number[];
    /** 보스전에서 깎아 둔 마녀 HP */
    bossHp?: number;
    /** 연 상자(level.chests 번호)와 나온 것: 운동화, 또는 몬스터 종류와 출발 방향 */
    chests?: Record<number, { contents: ChestContent; look?: EnemyLook; dir?: 1 | -1 }>;
  };
}

export const newRun = (): RunState => ({
  level: 0,
  score: 0,
  lives: START_LIVES,
  letters: [],
});
