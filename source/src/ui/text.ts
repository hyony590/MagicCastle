import Phaser from 'phaser';

// 게임 글자 스타일과 효과. 글꼴은 한글 픽셀 글꼴 Galmuri(SIL OFL 1.1, npm 'galmuri')를 쓴다.
// 픽셀 글꼴은 정해진 크기의 정수배일 때 또렷하다: Galmuri11은 12·24·36·48px, Galmuri14는 14·28px, Galmuri9는 10px.

export const FONT = 'Galmuri11';
export const FONT_BIG = 'Galmuri14';
export const FONT_SMALL = 'Galmuri9';

/** 글꼴을 다 불러온 뒤에 글자를 그려야 기본 글꼴로 그려지지 않는다. BootScene에서 기다린다. */
export async function loadFonts() {
  try {
    await Promise.all([
      document.fonts.load(`12px ${FONT}`),
      document.fonts.load(`bold 12px ${FONT}`),
      document.fonts.load(`14px ${FONT_BIG}`),
      document.fonts.load(`10px ${FONT_SMALL}`),
    ]);
  } catch {
    /* 글꼴을 못 불러와도 게임은 기본 글꼴로 진행한다 */
  }
}

type Style = Phaser.Types.GameObjects.Text.TextStyle;

export const STYLE = {
  /** 하단 HUD */
  hud: { fontFamily: FONT_BIG, fontSize: '14px', color: '#f3e9ff' } as Style,
  /** 작은 안내 문구 */
  small: { fontFamily: FONT, fontSize: '12px', color: '#e8dff0' } as Style,
  /** 블록 칸 번호 같은 아주 작은 글자 */
  tiny: { fontFamily: FONT_SMALL, fontSize: '10px', color: '#6b4a2e' } as Style,
};

/** 위에서 아래로 두 색이 이어지는 그라데이션을 글자에 칠한다. */
export function gradient(text: Phaser.GameObjects.Text, top: string, bottom: string) {
  const g = text.context.createLinearGradient(0, 0, 0, text.height);
  g.addColorStop(0.15, top);
  g.addColorStop(0.85, bottom);
  text.setFill(g);
  return text;
}

/** 굵은 테두리 + 그림자가 있는 게임 제목 글자 */
export function titleText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  size: 24 | 36 | 48,
  colors: [string, string] = ['#fff4a8', '#ff9f43'],
) {
  const t = scene.add
    .text(x, y, text, {
      fontFamily: FONT,
      fontSize: `${size}px`,
      fontStyle: 'bold',
      stroke: '#2b1d2f',
      strokeThickness: size / 6,
      padding: { x: 4, y: 4 },
    })
    .setOrigin(0.5)
    .setShadow(0, size / 12, '#1b1220', 0, true, true);
  return gradient(t, colors[0], colors[1]);
}

/** 점수·아이템 등 짧은 알림: 톡 튀어나왔다가 위로 떠오르며 사라진다. */
export function popText(scene: Phaser.Scene, x: number, y: number, text: string, color: string) {
  const t = scene.add
    .text(x, y, text, {
      fontFamily: FONT,
      fontSize: '12px',
      fontStyle: 'bold',
      color,
      stroke: '#2b1d2f',
      strokeThickness: 4,
    })
    .setOrigin(0.5, 1)
    .setDepth(20)
    .setScale(0.4);
  scene.tweens.chain({
    targets: t,
    tweens: [
      { scale: 1.35, duration: 120, ease: 'Back.out' },
      { scale: 1, duration: 90 },
      { y: y - 26, alpha: 0, duration: 700, delay: 250, ease: 'Quad.in' },
    ],
    onComplete: () => t.destroy(),
  });
  return t;
}

/** 화면 가운데 큰 알림(LEVEL 1, LEVEL CLEAR!, VICTORY!): 튀어 들어와서 잠시 머물다 사라진다. */
export function banner(
  scene: Phaser.Scene,
  cx: number,
  cy: number,
  title: string,
  sub: string,
  ms: number,
  colors: [string, string] = ['#fff4a8', '#ff9f43'],
) {
  const t1 = titleText(scene, cx, cy - 14, title, 36, colors).setDepth(40).setScale(0);
  const t2 = scene.add
    .text(cx, cy + 28, sub, {
      fontFamily: FONT,
      fontSize: '12px',
      color: '#f3e9ff',
      stroke: '#2b1d2f',
      strokeThickness: 4,
    })
    .setOrigin(0.5)
    .setDepth(40)
    .setAlpha(0);
  scene.tweens.add({ targets: t1, scale: 1, duration: 320, ease: 'Back.out' });
  scene.tweens.add({ targets: t1, angle: { from: -3, to: 3 }, duration: 260, yoyo: true, repeat: 2, delay: 320 });
  scene.tweens.add({ targets: t2, alpha: 1, y: cy + 24, duration: 260, delay: 200 });
  scene.time.delayedCall(ms, () => {
    scene.tweens.add({
      targets: [t1, t2],
      alpha: 0,
      scale: 0.6,
      duration: 220,
      ease: 'Back.in',
      onComplete: () => (t1.destroy(), t2.destroy()),
    });
  });
}
