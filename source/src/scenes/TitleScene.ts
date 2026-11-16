import Phaser from 'phaser';
import { HEIGHT, WIDTH } from '../config';
import { ADMIN, devStartLevel, levelFromKey, levelKeysLabel } from '../admin';
import { audio } from '../audio';
import { startAutoplay } from '../autoplay';
import { LEVELS } from '../levels';
import { newRun } from '../state';
import { Menu, MenuButton } from '../ui/button';
import { STYLE, titleText } from '../ui/text';

/** 페이지당 한 번만 자동 시작한다. */
let autostartDone = false;

/** 시작 화면: 제목, 등장인물, [게임 시작]·[게임 설명] 버튼 */
export class TitleScene extends Phaser.Scene {
  private leaving = false;

  constructor() {
    super('Title');
  }

  create() {
    this.leaving = false;
    // 개발 중: 페이지를 처음 열 때(저장 후 자동 새로고침 포함) 타이틀을 건너뛰고 바로 레벨로 간다.
    // 게임 오버 뒤 타이틀로 돌아왔을 때는 건너뛰지 않는다.
    if (!autostartDone) {
      autostartDone = true;
      const level = devStartLevel(LEVELS.length);
      if (level !== null) {
        this.scene.start('Game', { run: { ...newRun(), level } });
        return;
      }
    }

    const cx = WIDTH / 2;
    this.cameras.main.fadeIn(400, 20, 10, 30);
    this.add.rectangle(cx, HEIGHT / 2, WIDTH, HEIGHT, 0x2b1d2f);
    // 게임과 같은 부엌 배경을 어둡게 깔고, 가장자리를 어둡게
    this.add.image(0, 0, 'bg_kitchen').setOrigin(0, 0).setScale(2).setTint(0x8a7a9a);
    this.add.image(0, 0, 'vignette').setOrigin(0, 0);
    this.add.rectangle(0, 640, WIDTH, HEIGHT - 640, 0x2b1d2f).setOrigin(0, 0);
    // 반짝이는 별가루
    for (let i = 0; i < 24; i++) {
      const star = this.add.image(Phaser.Math.Between(20, WIDTH - 20), Phaser.Math.Between(20, 360), 'dizzy_star').setAlpha(0);
      this.tweens.add({ targets: star, alpha: 0.8, duration: 700, yoyo: true, repeat: -1, delay: Phaser.Math.Between(0, 2000) });
    }

    // 제목: 분홍 그라데이션 + 굵은 테두리 + 그림자, 천천히 둥실둥실
    const title = titleText(this, cx, 120, '모찌의 마녀 부엌', 48, ['#ffe0ec', '#ff7aa8']).setScale(0);
    this.tweens.add({ targets: title, scale: 1, duration: 500, ease: 'Back.out' });
    this.tweens.add({ targets: title, y: 114, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.inOut', delay: 500 });
    this.add
      .text(cx, 174, "MOCHI'S WITCH KITCHEN", { ...STYLE.small, color: '#c9b8d6', letterSpacing: 2 })
      .setOrigin(0.5);

    // 메뉴 버튼
    const start = new MenuButton(this, cx, 320, 300, 56, '게임 시작', () => this.startGame(0));
    const help = new MenuButton(this, cx, 396, 300, 56, '게임 설명', () => this.goto('Help'));
    const auto = new MenuButton(this, cx, 472, 300, 56, '자동 플레이 보기', () => this.watchAutoplay());
    new Menu(this, [start, help, auto], 'vertical');
    this.add.text(cx, 540, '↑ ↓  고르기     ENTER / SPACE  결정     마우스 클릭도 돼요', { ...STYLE.small, color: '#9a8fb0' }).setOrigin(0.5);

    const sound = this.add.text(cx, 580, '', { ...STYLE.small, color: '#9a8fb0' }).setOrigin(0.5);
    const showSound = () => sound.setText(`M  소리 ${audio.muted ? '꺼짐' : '켜짐'}`);
    showSound();
    this.input.keyboard!.on('keydown-M', () => {
      audio.unlock();
      audio.toggleMute();
      showSound();
    });

    if (ADMIN) {
      this.add
        .text(cx, 640, `[관리자] 숫자키 ${levelKeysLabel(LEVELS.length)}: 해당 레벨에서 바로 시작`, {
          ...STYLE.small,
          color: '#ff9f43',
        })
        .setOrigin(0.5);
      this.input.keyboard!.on('keydown', (e: KeyboardEvent) => {
        const level = levelFromKey(e, LEVELS.length);
        if (level !== null) this.startGame(level);
      });
    }
  }

  private startGame(level: number) {
    this.goto('Game', { run: { ...newRun(), level } });
  }

  /** 봇이 1단계부터 플레이하는 모습을 보여 준다. 화면 위 패널로 속도를 바꾸거나 멈추고 직접 할 수 있다. */
  private watchAutoplay() {
    if (this.leaving) return;
    this.startGame(0);
    startAutoplay(this.game, { speed: 1, panel: true });
  }

  /** 화면을 어둡게 닫고 다음 장면으로 */
  private goto(key: string, data?: object) {
    if (this.leaving) return;
    this.leaving = true;
    audio.unlock();
    this.cameras.main.fadeOut(250, 20, 10, 30);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start(key, data));
  }
}
