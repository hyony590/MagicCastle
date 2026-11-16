import Phaser from 'phaser';
import 'galmuri/dist/galmuri.css'; // 한글 픽셀 글꼴(SIL OFL 1.1)
import { audio } from './audio';
import { startAutoplay } from './autoplay';
import { FPS, HEIGHT, WIDTH } from './config';
import { BootScene } from './scenes/BootScene';
import { EndScene } from './scenes/EndScene';
import { HelpScene } from './scenes/HelpScene';
import { GameScene } from './scenes/GameScene';
import { PrologueScene } from './scenes/PrologueScene';
import { TitleScene } from './scenes/TitleScene';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: WIDTH,
  height: HEIGHT,
  backgroundColor: '#1b1d26',
  fps: { limit: FPS },
  physics: {
    default: 'arcade',
    // 물리를 화면이 그려지는 프레임마다 한 번씩 계산한다(고정 60번이면 화면 주사율과 어긋나 움직임이 툭툭 끊겨 보인다).
    arcade: { gravity: { x: 0, y: 0 }, debug: false, fixedStep: false },
  },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  pixelArt: true,
  scene: [BootScene, TitleScene, HelpScene, PrologueScene, GameScene, EndScene],
});

// 화면을 창 크기에 맞출 때 1.3배처럼 딱 떨어지지 않는 배율이면, 픽셀을 그대로 늘리는 방식은
// 어떤 줄은 두껍고 어떤 줄은 얇아져 그림이 찌그러져 보인다. 그때는 부드럽게 늘린다.
function updateCanvasSmoothing() {
  const scale = game.scale.displaySize.width / WIDTH;
  const whole = Math.abs(scale - Math.round(scale)) < 0.01;
  game.canvas.style.imageRendering = whole ? 'pixelated' : 'auto';
}
game.events.once(Phaser.Core.Events.READY, () => {
  updateCanvasSmoothing();
  game.scale.on(Phaser.Scale.Events.RESIZE, updateCanvasSmoothing);
});

// 브라우저는 사용자가 키를 누르거나 클릭하기 전에는 소리를 막는다.
// 타이틀을 건너뛰고 바로 시작해도 첫 입력에서 소리가 켜지도록 한다.
const unlockAudio = () => audio.unlock();
window.addEventListener('keydown', unlockAudio);
window.addEventListener('pointerdown', unlockAudio);

// 개발 중: 콘솔에서 window.__autoplay(레벨, 속도)로 자동 플레이 봇을 돌린다. 속도 0은 최대한 빠르게.
// 결과는 window.__bot.report()
if (import.meta.env.DEV) {
  const w = window as unknown as Record<string, unknown>;
  w.__autoplay = (startLevel = 0, speed = 0) =>
    (w.__bot = startAutoplay(game, { startLevel, speed, panel: speed > 0 }).bot);
}

// 개발 중 브라우저 콘솔에서 상태를 들여다보기 위한 핸들.
if (import.meta.env.DEV) (window as unknown as { __game: Phaser.Game }).__game = game;
