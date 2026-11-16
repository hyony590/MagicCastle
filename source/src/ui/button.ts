import Phaser from 'phaser';
import { audio } from '../audio';
import { FONT } from './text';

// 메뉴 버튼과 버튼 묶음. 키보드(↑↓ 또는 ←→, Enter/Space)와 마우스(올리기·클릭) 모두 된다.

const C = {
  shadow: 0x1b1220,
  fill: 0x2b1d2f,
  fillOn: 0x5e3a70,
  line: 0x7a6a85,
  lineOn: 0xffb3c6,
};

export class MenuButton {
  readonly container: Phaser.GameObjects.Container;
  private bg: Phaser.GameObjects.Graphics;
  private label: Phaser.GameObjects.Text;
  private cursor: Phaser.GameObjects.Image;
  private bob?: Phaser.Tweens.Tween;

  constructor(
    private scene: Phaser.Scene,
    x: number,
    y: number,
    private w: number,
    private h: number,
    text: string,
    readonly onPress: () => void,
    fontSize = 24,
  ) {
    this.bg = scene.add.graphics();
    this.label = scene.add
      .text(0, 1, text, {
        fontFamily: FONT,
        fontSize: `${fontSize}px`,
        fontStyle: 'bold',
        color: '#e8dff0',
        stroke: '#1b1220',
        strokeThickness: 4,
      })
      .setOrigin(0.5);
    this.cursor = scene.add.image(-w / 2 + 22, 0, 'heart').setScale(1.4).setVisible(false);
    this.container = scene.add.container(x, y, [this.bg, this.label, this.cursor]);
    this.container.setSize(w, h).setInteractive({ useHandCursor: true });
    this.draw(false);
  }

  private draw(on: boolean) {
    const { w, h } = this;
    this.bg.clear();
    this.bg.fillStyle(C.shadow).fillRoundedRect(-w / 2, -h / 2 + 4, w, h, 10); // 아래 그림자
    this.bg.fillStyle(on ? C.fillOn : C.fill).fillRoundedRect(-w / 2, -h / 2, w, h, 10);
    this.bg.lineStyle(3, on ? C.lineOn : C.line).strokeRoundedRect(-w / 2, -h / 2, w, h, 10);
    this.bg.fillStyle(0xffffff, on ? 0.12 : 0.05).fillRoundedRect(-w / 2 + 6, -h / 2 + 4, w - 12, h / 3, 6); // 윗면 광택
  }

  setSelected(on: boolean) {
    this.draw(on);
    this.label.setColor(on ? '#ffffff' : '#c9b8d6');
    this.cursor.setVisible(on);
    this.bob?.stop();
    this.container.setScale(1);
    if (on) {
      this.bob = this.scene.tweens.add({ targets: this.container, scale: 1.05, duration: 380, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    }
  }

  setText(text: string) {
    this.label.setText(text);
  }
}

/**
 * 버튼 묶음: 하나가 늘 선택되어 있다.
 * axis가 'vertical'이면 ↑↓, 'horizontal'이면 ←→로 고른다. Enter/Space로 누른다.
 */
export class Menu {
  private index = 0;
  private keyHandlers: [string, () => void][];
  private pressed = false;

  constructor(
    private scene: Phaser.Scene,
    private buttons: MenuButton[],
    axis: 'vertical' | 'horizontal' = 'vertical',
  ) {
    const kb = scene.input.keyboard!;
    const [prev, next] = axis === 'vertical' ? ['keydown-UP', 'keydown-DOWN'] : ['keydown-LEFT', 'keydown-RIGHT'];
    this.keyHandlers = [
      [prev, () => this.select(this.index - 1, true)],
      [next, () => this.select(this.index + 1, true)],
      ['keydown-ENTER', () => this.press()],
      ['keydown-SPACE', () => this.press()],
    ];
    for (const [ev, fn] of this.keyHandlers) kb.on(ev, fn);
    buttons.forEach((b, i) => {
      b.container.on('pointerover', () => this.select(i, true));
      b.container.on('pointerdown', () => {
        this.select(i, false);
        this.press();
      });
    });
    this.select(0, false);
  }

  select(i: number, withSound: boolean) {
    const n = this.buttons.length;
    const next = ((i % n) + n) % n;
    if (withSound && next !== this.index) audio.play('pause');
    this.index = next;
    this.buttons.forEach((b, k) => b.setSelected(k === this.index));
  }

  press() {
    if (this.pressed) return; // 한 번 누른 메뉴는 두 번 실행하지 않는다
    this.pressed = true;
    audio.unlock();
    audio.play('letter');
    const b = this.buttons[this.index];
    this.scene.tweens.add({ targets: b.container, scale: 0.92, duration: 70, yoyo: true });
    this.scene.time.delayedCall(140, () => {
      this.pressed = false;
      b.onPress();
    });
  }

  /** 잠깐 띄우는 메뉴(일시정지 등)를 닫을 때: 키 입력 연결을 끊는다. 버튼 그림은 따로 지운다. */
  destroy() {
    const kb = this.scene.input.keyboard!;
    for (const [ev, fn] of this.keyHandlers) kb.off(ev, fn);
    this.buttons.forEach((b) => b.setSelected(false));
  }
}
