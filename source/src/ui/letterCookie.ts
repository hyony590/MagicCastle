import Phaser from 'phaser';
import { FONT, FONT_SMALL } from './text';

/** 글자 색: 진한 초코 */
const LETTER_COLOR = '#7a3b2e';

/**
 * 보너스 글자 쿠키: 분홍 아이싱 쿠키 그림(art/sprites.ts) 위에 글자를 얹은 묶음.
 * big = 레벨에 놓이는 쿠키(28×28), small = HUD·설명 화면용(20×18).
 */
export function letterCookie(scene: Phaser.Scene, x: number, y: number, char: string, size: 'big' | 'small' = 'big') {
  const big = size === 'big';
  const img = scene.add.image(0, 0, big ? 'letter_cookie' : 'letter_cookie_s');
  const text = scene.add
    .text(0, big ? 0 : -1, char, {
      fontFamily: big ? FONT : FONT_SMALL,
      fontSize: big ? '12px' : '10px',
      color: LETTER_COLOR,
      // 같은 색 테두리로 획을 굵게(픽셀 글꼴 획이 1px이라 쿠키 위에서 가늘어 보인다)
      stroke: LETTER_COLOR,
      strokeThickness: 1,
    })
    .setOrigin(0.5);
  return scene.add.container(x, y, [img, text]);
}

/** HUD 쿠키를 모은 글자(색 있음)와 아직 못 모은 글자(어둡게)로 표시 */
export function setCookieLit(cookie: Phaser.GameObjects.Container, lit: boolean) {
  const [img, text] = cookie.list as [Phaser.GameObjects.Image, Phaser.GameObjects.Text];
  if (lit) img.clearTint();
  else img.setTint(0x8a7aa0);
  const color = lit ? LETTER_COLOR : '#3a2a4a';
  text.setColor(color).setStroke(color, 1);
  cookie.setAlpha(lit ? 1 : 0.6);
}
