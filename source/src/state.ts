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
}

export const newRun = (): RunState => ({
  level: 0,
  score: 0,
  lives: START_LIVES,
  letters: [],
});
