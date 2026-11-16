import type { EnemyLook } from './levels/types';

/** 몬스터 이름(설명 화면·알림 문구용) */
export const MONSTER_NAMES: Record<EnemyLook, string> = {
  pot: '쿵쿵 냄비',
  onion: '눈물 양파',
  milk: '꿀꺽 우유',
  salt: '짭짤 소금통',
  broccoli: '뽀글 브로콜리',
  toaster: '팝팝 토스터',
  carrot: '성난 당근',
};

/** 몬스터 전체(소개 순서). 도시락 상자에서는 이 중 하나가 무작위로 나온다. */
export const ALL_MONSTERS: EnemyLook[] = ['pot', 'onion', 'milk', 'salt', 'broccoli', 'toaster', 'carrot'];
