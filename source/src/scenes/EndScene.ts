import Phaser from 'phaser';
import { audio } from '../audio';
import { HEIGHT, WIDTH } from '../config';
import { STYLE, titleText } from '../ui/text';

interface EndData {
  type: 'gameover' | 'victory';
  score: number;
  level?: number;
  /** 마지막 보스를 쓰러뜨렸을 때 그 이름 */
  boss?: string;
}

// 엔딩 화면
// - 성공: 식탁 위 케이크 옆에서 요리에 성공한 모찌가 폴짝폴짝 뛴다. 별가루가 쏟아진다.
// - 실패: 마녀가 식탁의 케이크를 오물오물 먹고 있고, 옆에서 모찌가 시무룩하게 운다.

const TABLE_Y = 330; // 식탁 윗면
const TABLE_W = 8; // 식탁 너비(블록 칸 수)

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
    this.cameras.main.fadeIn(400, 20, 10, 30);

    // 배경: 같은 부엌. 성공은 따뜻하게, 실패는 어둡고 보랏빛으로
    this.add.rectangle(cx, HEIGHT / 2, WIDTH, HEIGHT, 0x2b1d2f);
    this.add.image(0, 0, 'bg_kitchen').setOrigin(0, 0).setScale(2).setTint(win ? 0xffe6c8 : 0x8a6aa8);
    this.add.image(0, 0, 'vignette').setOrigin(0, 0);
    this.add.rectangle(0, 640, WIDTH, HEIGHT - 640, 0x2b1d2f).setOrigin(0, 0);

    // 제목
    const title = titleText(
      this,
      cx,
      84,
      win ? '요리 대성공!' : 'GAME OVER',
      48,
      win ? ['#fffbd0', '#ffb43d'] : ['#ffd0d6', '#ff4f6a'],
    ).setScale(0);
    this.tweens.add({ targets: title, scale: 1, duration: 450, ease: 'Back.out' });

    this.drawTable(cx);
    if (win) this.victoryScene(cx);
    else {
      this.gameOverScene(cx);
      this.tweens.add({ targets: title, angle: { from: -4, to: 4 }, duration: 90, yoyo: true, repeat: 5, delay: 450 });
    }

    // 결과 글
    const detail = win
      ? `${this.info.boss ?? '마녀'}를 물리치고 특제 케이크 완성! 부엌을 되찾았다`
      : `LEVEL ${this.info.level ?? 1}에서 쓰러졌다… 마녀 쿠르르가 케이크를 다 먹어 버렸다`;
    this.add
      .text(cx, 440, detail, { ...STYLE.small, fontSize: '12px', color: '#f3e9ff', stroke: '#1b1220', strokeThickness: 4 })
      .setOrigin(0.5);
    const score = titleText(this, cx, 492, `SCORE ${String(this.info.score).padStart(6, '0')}`, 24, ['#ffffff', '#9fe3ff']);
    score.setAlpha(0);
    this.tweens.add({ targets: score, alpha: 1, duration: 400, delay: 500 });

    const enter = this.add.text(cx, 580, 'ENTER로 타이틀', { ...STYLE.small, color: '#c9b8d6' }).setOrigin(0.5);
    this.tweens.add({ targets: enter, alpha: 0.3, duration: 600, yoyo: true, repeat: -1 });

    // 사망 직후 누르고 있던 키로 바로 넘어가지 않도록 잠깐 기다린다.
    this.time.delayedCall(500, () =>
      this.input.keyboard!.once('keydown-ENTER', () => {
        this.cameras.main.fadeOut(250, 20, 10, 30);
        this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start('Title'));
      }),
    );
  }

  /** 나무 식탁: 조리대 블록을 이어 붙이고 다리 두 개 */
  private drawTable(cx: number) {
    const left = cx - (TABLE_W * 32) / 2;
    for (let i = 0; i < TABLE_W; i++) {
      this.add.image(left + i * 32, TABLE_Y, i % 3 === 1 ? 'blk_wood1' : 'blk_wood0').setOrigin(0, 0).setDisplaySize(32, 32).setDepth(2);
    }
    this.add.image(left, TABLE_Y, 'blk_cap').setOrigin(0, 0).setDisplaySize(32, 32).setDepth(2);
    this.add.image(left + (TABLE_W - 1) * 32, TABLE_Y, 'blk_cap').setOrigin(0, 0).setDisplaySize(32, 32).setFlipX(true).setDepth(2);
    for (const x of [left + 16, left + TABLE_W * 32 - 28]) {
      this.add.rectangle(x, TABLE_Y + 32, 12, 52, 0x8a5a32).setOrigin(0, 0).setStrokeStyle(2, 0x2b1d2f).setDepth(2);
    }
    // 바닥 그림자
    this.add.ellipse(cx, TABLE_Y + 88, TABLE_W * 32 + 40, 14, 0x1b1220, 0.5);
  }

  /** 성공: 케이크 옆에서 모찌가 폴짝, 별가루와 반짝이 */
  private victoryScene(cx: number) {
    const cake = this.add.image(cx + 40, TABLE_Y, 'cake').setOrigin(0.5, 1).setScale(2).setDepth(3);
    this.tweens.add({ targets: cake, scaleY: 2.08, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    // 촛불 불빛
    this.add.image(cx + 40, TABLE_Y - 64, 'glow').setTint(0xffc46a).setBlendMode(Phaser.BlendModes.ADD).setScale(1.2).setAlpha(0.6);

    const mochi = this.add.image(cx - 70, TABLE_Y, 'mochi_happy').setOrigin(0.5, 1).setScale(2);
    this.tweens.add({ targets: mochi, y: TABLE_Y - 26, duration: 260, yoyo: true, repeat: -1, ease: 'Quad.out' });

    // 쏟아지는 별가루
    this.time.addEvent({
      delay: 120,
      repeat: 60,
      callback: () => {
        const s = this.add.image(Phaser.Math.Between(40, WIDTH - 40), -10, 'dizzy_star').setScale(2);
        this.tweens.add({ targets: s, y: HEIGHT + 20, angle: 360, duration: 2400, onComplete: () => s.destroy() });
      },
    });
    // 케이크 주변 반짝이
    this.time.addEvent({
      delay: 400,
      loop: true,
      callback: () => {
        const p = this.add.particles(cx + 40 + Phaser.Math.Between(-30, 30), TABLE_Y - 40, 'spark', {
          emitting: false,
          speed: { min: 30, max: 80 },
          lifespan: 600,
          scale: { start: 1.6, end: 0 },
          tint: [0xffe08a, 0xff8fae, 0xffffff],
        });
        p.explode(5);
        this.time.delayedCall(800, () => p.destroy());
      },
    });
  }

  /** 실패: 마녀가 케이크를 오물오물, 부스러기가 튀고, 모찌는 옆에서 시무룩 */
  private gameOverScene(cx: number) {
    // 마녀는 식탁 뒤에 앉아 있다(배경 위, 식탁 아래 깊이)
    const witch = this.add.image(cx + 30, TABLE_Y + 8, 'witch_eat1').setOrigin(0.5, 1).setScale(3).setDepth(1);
    this.time.addEvent({
      delay: 260,
      loop: true,
      callback: () => {
        const chew = witch.texture.key === 'witch_eat1';
        witch.setTexture(chew ? 'witch_eat2' : 'witch_eat1');
        if (!chew) return;
        // 오물오물할 때마다 부스러기가 튄다
        const p = this.add.particles(cx + 30, TABLE_Y - 64, 'dust', {
          emitting: false,
          speed: { min: 40, max: 110 },
          angle: { min: 200, max: 340 },
          gravityY: 300,
          lifespan: 600,
          scale: { start: 1.4, end: 0.4 },
          tint: [0xdca86c, 0xf4b8c8, 0xffffff],
        });
        p.setDepth(4).explode(4);
        this.time.delayedCall(800, () => p.destroy());
      },
    });
    this.add.image(cx + 30, TABLE_Y, 'cake_eaten').setOrigin(0.5, 1).setScale(2).setDepth(3);

    const mochi = this.add.image(cx - 200, TABLE_Y + 84, 'mochi_sad').setOrigin(0.5, 1).setScale(2);
    this.tweens.add({ targets: mochi, angle: { from: -3, to: 3 }, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    // 뚝뚝 떨어지는 눈물
    this.time.addEvent({
      delay: 700,
      loop: true,
      callback: () => {
        const tear = this.add.rectangle(cx - 200 + Phaser.Math.Between(-10, 10), TABLE_Y + 34, 3, 5, 0x9fe3ff);
        this.tweens.add({ targets: tear, y: tear.y + 40, alpha: 0, duration: 600, onComplete: () => tear.destroy() });
      },
    });
  }
}
