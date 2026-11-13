import Phaser from 'phaser';
import { audio } from '../audio';
import { HEIGHT, WIDTH } from '../config';

interface EndData {
  type: 'gameover' | 'victory';
  score: number;
  level?: number;
  /** 마지막 보스를 쓰러뜨렸을 때 그 이름 */
  boss?: string;
}

export class EndScene extends Phaser.Scene {
  private info!: EndData;

  constructor() {
    super('End');
  }

  init(data: EndData) {
    this.info = data;
  }

  create() {
    const cx = WIDTH / 2;
    const win = this.info.type === 'victory';
    audio.stopMusic();
    audio.play(win ? 'victory' : 'gameOver');
    this.add.rectangle(cx, HEIGHT / 2, WIDTH, HEIGHT, win ? 0x1d2a1f : 0x2a1b1f);
    this.add
      .text(cx, 230, win ? 'ALL CLEAR!' : 'GAME OVER', {
        fontFamily: 'monospace',
        fontSize: '52px',
        fontStyle: 'bold',
        color: win ? '#7dff7a' : '#ff6b6b',
        stroke: '#000',
        strokeThickness: 8,
      })
      .setOrigin(0.5);
    const detail = win
      ? this.info.boss
        ? `${this.info.boss} 격파! 탑을 되찾았다`
        : '모든 레벨을 통과했다'
      : `LEVEL ${this.info.level ?? 1}에서 끝났다`;
    this.add
      .text(cx, 320, `${detail}\nSCORE ${String(this.info.score).padStart(6, '0')}`, {
        fontFamily: 'monospace',
        fontSize: '22px',
        color: '#e8e8f0',
        align: 'center',
        lineSpacing: 10,
      })
      .setOrigin(0.5);
    this.add
      .text(cx, 470, 'Enter로 타이틀', { fontFamily: 'monospace', fontSize: '18px', color: '#9a9db0' })
      .setOrigin(0.5);

    // 사망 직후 누르고 있던 키로 바로 넘어가지 않도록 잠깐 기다린다.
    this.time.delayedCall(500, () => this.input.keyboard!.once('keydown-ENTER', () => this.scene.start('Title')));
  }
}
