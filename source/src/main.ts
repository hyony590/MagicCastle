import Phaser from 'phaser';
import { audio } from './audio';
import { FPS, HEIGHT, WIDTH } from './config';
import { EndScene } from './scenes/EndScene';
import { GameScene } from './scenes/GameScene';
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
    arcade: { gravity: { x: 0, y: 0 }, debug: false },
  },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [TitleScene, GameScene, EndScene],
});

// 브라우저는 사용자가 키를 누르거나 클릭하기 전에는 소리를 막는다.
// 타이틀을 건너뛰고 바로 시작해도 첫 입력에서 소리가 켜지도록 한다.
const unlockAudio = () => audio.unlock();
window.addEventListener('keydown', unlockAudio);
window.addEventListener('pointerdown', unlockAudio);

// 개발 중 브라우저 콘솔에서 상태를 들여다보기 위한 핸들.
if (import.meta.env.DEV) (window as unknown as { __game: Phaser.Game }).__game = game;
