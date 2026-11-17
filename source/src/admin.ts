// 관리자(개발자) 전용 기능 스위치.
// - 개발 서버(npm run dev)에서는 항상 켜진다.
// - 배포된 빌드에서는 주소 끝에 ?admin 을 붙였을 때만 켜진다. 예: https://.../index.html?admin
//   (비밀 장치가 아니라 편의 기능이다. 주소를 아는 사람은 누구나 켤 수 있다.)

import { DEV_START_LEVEL } from './config';

export const ADMIN: boolean = (() => {
  if (import.meta.env.DEV) return true;
  try {
    return new URLSearchParams(window.location.search).has('admin');
  } catch {
    return false;
  }
})();

/** 개발 서버에서 페이지를 열 때 바로 시작할 레벨 인덱스. 해당 없으면 null(타이틀부터). */
export function devStartLevel(levelCount: number): number | null {
  if (!import.meta.env.DEV) return null;
  let n = DEV_START_LEVEL;
  try {
    const q = new URLSearchParams(window.location.search).get('level');
    if (q !== null) n = Number(q);
  } catch {
    /* 무시 */
  }
  if (!Number.isInteger(n) || n < 1) return null;
  return Math.min(n, levelCount) - 1;
}

/** 개발 서버에서 프롤로그의 특정 화면·대사로 바로 연다. 번호는 1부터.
 *  ?prologue=4 → 4번째 화면 첫 대사, ?prologue=6.2 → 6번째 화면 2번째 대사, ?prologue → 첫 화면.
 *  beatCounts는 화면마다 대사(비트) 수. 해당 없으면 null(타이틀부터). */
export function devPrologueStart(beatCounts: number[]): { screen: number; beat: number } | null {
  if (!import.meta.env.DEV) return null;
  let q: string | null = null;
  try {
    q = new URLSearchParams(window.location.search).get('prologue');
  } catch {
    /* 무시 */
  }
  if (q === null) return null;
  const [s, b] = q.split('.').map((n) => Number.parseInt(n, 10));
  const screen = Math.min(Math.max((Number.isInteger(s) ? s : 1) - 1, 0), beatCounts.length - 1);
  const beat = Math.min(Math.max((Number.isInteger(b) ? b : 1) - 1, 0), beatCounts[screen] - 1);
  return { screen, beat };
}

/** 개발 서버에서 지금 보고 있는 프롤로그 위치를 주소창에 적는다(새로고침해도 그 자리로 돌아온다).
 *  null이면 주소에서 지운다(프롤로그를 마치고 게임으로 넘어갈 때). */
export function setPrologueUrl(pos: { screen: number; beat: number } | null) {
  if (!import.meta.env.DEV) return;
  try {
    const url = new URL(window.location.href);
    if (pos) url.searchParams.set('prologue', pos.beat > 0 ? `${pos.screen + 1}.${pos.beat + 1}` : `${pos.screen + 1}`);
    else url.searchParams.delete('prologue');
    window.history.replaceState(window.history.state, '', url);
  } catch {
    /* 주소를 못 바꿔도 게임에는 지장 없다 */
  }
}

/** 숫자키 입력을 레벨 인덱스로 바꾼다. 1~9는 LEVEL 1~9, 0은 LEVEL 10. 해당 레벨이 없으면 null. */
export function levelFromKey(event: KeyboardEvent, levelCount: number): number | null {
  if (!/^[0-9]$/.test(event.key)) return null;
  const index = event.key === '0' ? 9 : Number(event.key) - 1;
  return index < levelCount ? index : null;
}

/** 관리자 안내 문구용: "1~9, 0=10" 같은 키 설명 */
export function levelKeysLabel(levelCount: number): string {
  const top = Math.min(levelCount, 9);
  return levelCount >= 10 ? `1~${top}, 0(=10)` : `1~${top}`;
}
