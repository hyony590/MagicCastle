import Phaser from 'phaser';
import { BONUS_WORD, HEIGHT, WIDTH } from '../config';
import { ADMIN, devStartLevel, levelFromKey, levelKeysLabel } from '../admin';
import { audio } from '../audio';
import { LEVELS } from '../levels';
import { newRun } from '../state';

/** 페이지당 한 번만 자동 시작한다. */
let autostartDone = false;

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create() {
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
    this.add.rectangle(cx, HEIGHT / 2, WIDTH, HEIGHT, 0x1b1d26);
    this.add
      .text(cx, 150, 'CASTLE CLIMBER', { fontFamily: 'monospace', fontSize: '56px', fontStyle: 'bold', color: '#f5e663', stroke: '#000', strokeThickness: 8 })
      .setOrigin(0.5);
    this.add
      .text(cx, 210, '가제 · 그레이박스 프로토타입', { fontFamily: 'monospace', fontSize: '16px', color: '#9a9db0' })
      .setOrigin(0.5);

    const help = [
      '← →   걷기        Space   점프',
      '↑ ↓   사다리      P / Esc 일시정지',
      'Z     돌 던지기(보스전)  M  소리 켜기/끄기',
      '',
      '층마다 놓인 아이템을 모두 모으면 다음 레벨',
      '너무 높은 곳에서 떨어지면 기절한다',
      `상자에는 스피드 부츠 아니면 몬스터 · 글자 ${BONUS_WORD}를 모으면 생명 +1`,
    ];
    this.add
      .text(cx, 360, help.join('\n'), { fontFamily: 'monospace', fontSize: '17px', color: '#e8e8f0', align: 'center', lineSpacing: 8 })
      .setOrigin(0.5);

    const start = this.add
      .text(cx, 540, 'Space 또는 Enter로 시작', { fontFamily: 'monospace', fontSize: '22px', fontStyle: 'bold', color: '#ffffff' })
      .setOrigin(0.5);
    this.tweens.add({ targets: start, alpha: 0.25, duration: 600, yoyo: true, repeat: -1 });

    const sound = this.add
      .text(cx, 600, '', { fontFamily: 'monospace', fontSize: '14px', color: '#9a9db0' })
      .setOrigin(0.5);
    const showSound = () => sound.setText(`M  소리 ${audio.muted ? '꺼짐' : '켜짐'}`);
    showSound();
    this.input.keyboard!.on('keydown-M', () => {
      audio.unlock();
      audio.toggleMute();
      showSound();
    });

    let started = false;
    const go = (level = 0) => {
      if (started) return;
      started = true;
      audio.unlock();
      this.scene.start('Game', { run: { ...newRun(), level } });
    };
    this.input.keyboard!.on('keydown-SPACE', () => go());
    this.input.keyboard!.on('keydown-ENTER', () => go());

    if (ADMIN) {
      this.add
        .text(cx, 640, `[관리자] 숫자키 ${levelKeysLabel(LEVELS.length)}: 해당 레벨에서 바로 시작`, {
          fontFamily: 'monospace',
          fontSize: '15px',
          color: '#ff9f43',
        })
        .setOrigin(0.5);
      this.input.keyboard!.on('keydown', (e: KeyboardEvent) => {
        const level = levelFromKey(e, LEVELS.length);
        if (level !== null) go(level);
      });
    }
  }
}
