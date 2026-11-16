import Phaser from 'phaser';
import { audio } from '../audio';
import { HEIGHT, WIDTH } from '../config';
import { newRun, type RunState } from '../state';
import { PROLOGUE, type PrologueMood } from '../story/prologue';
import { MenuButton } from '../ui/button';
import { FONT, STYLE, titleText } from '../ui/text';
import { STAGE, StageView, createPrologueTextures } from './prologueStage';

// 프롤로그: 게임 시작 전에 읽고 넘기는 이야기 화면. 대사·장면 데이터는 story/prologue.ts에 있다.
// 조작: → / [다음] 다음으로(글자가 다 나오기 전에도 넘어간다), ← / [이전] 이전으로,
//       ENTER·SPACE·화면 터치는 글자가 나오는 중이면 끝까지 보여 주고 아니면 다음으로, ESC / [건너뛰기]는 바로 게임 시작.
// 마지막 화면에서 [다음]을 누르면 1층(게임 플레이)으로 넘어간다.

const PANEL = { x: 24, y: 392, w: 720, h: 208 };
const TEXT_PAD = 28;
const BUTTON_Y = 648;

/** 분위기별 색과 타이핑 속도(글자당 ms) */
const MOODS: Record<PrologueMood, { text: string; line: number; fill: number; typeMs: number; title: [string, string] }> = {
  warm: { text: '#f3e9ff', line: 0xf4a6b8, fill: 0x2b1d2f, typeMs: 34, title: ['#ffe0ec', '#ff7aa8'] },
  uneasy: { text: '#cfc6dc', line: 0x7a6a85, fill: 0x1b1220, typeMs: 52, title: ['#e8dff0', '#9a8fb0'] },
};

/** 말하는 사람 이름표 색 */
const SPEAKER_COLORS: Record<string, number> = { 촌장: 0xc98b4b };
const DEFAULT_SPEAKER_COLOR = 0xd87d96;

export class PrologueScene extends Phaser.Scene {
  private run?: RunState;
  private screen = 0;
  private beat = 0;
  private stage?: StageView;
  private stageScreen = -1;
  private leaving = false;

  private panel!: Phaser.GameObjects.Graphics;
  private body!: Phaser.GameObjects.Text;
  private nameTag!: Phaser.GameObjects.Container;
  private hint!: Phaser.GameObjects.Image;
  private title?: Phaser.GameObjects.Text;
  private dots!: Phaser.GameObjects.Graphics;
  private pageLabel!: Phaser.GameObjects.Text;
  private prevBtn!: MenuButton;
  private nextBtn!: MenuButton;

  private full = '';
  private shown = 0;
  private typer?: Phaser.Time.TimerEvent;

  constructor() {
    super('Prologue');
  }

  init(data: { run?: RunState }) {
    this.run = data.run;
  }

  create() {
    this.leaving = false;
    this.screen = 0;
    this.beat = 0;
    this.stage = undefined;
    this.stageScreen = -1;
    this.typer = undefined;
    createPrologueTextures(this);
    this.cameras.main.fadeIn(500, 20, 10, 30);

    // 바탕(다른 화면과 같은 보라빛)과 무대 액자
    this.add.rectangle(0, 0, WIDTH, HEIGHT, 0x1b1220).setOrigin(0, 0);
    const frame = this.add.graphics().setDepth(5);
    frame.lineStyle(3, 0x7a6a85).strokeRoundedRect(STAGE.x, STAGE.y, STAGE.w, STAGE.h, 12);

    // 진행 표시(오른쪽 위)
    this.dots = this.add.graphics();
    this.pageLabel = this.add.text(WIDTH - 28, 32, '', { ...STYLE.small, color: '#9a8fb0' }).setOrigin(1, 0.5);

    // 대사 상자
    this.panel = this.add.graphics();
    this.nameTag = this.add.container(PANEL.x + 24, PANEL.y);
    this.body = this.add
      .text(PANEL.x + TEXT_PAD, PANEL.y + 26, '', {
        fontFamily: FONT,
        fontSize: '24px',
        color: MOODS.warm.text,
        lineSpacing: 10,
        wordWrap: { width: PANEL.w - TEXT_PAD * 2, useAdvancedWrap: true },
      })
      .setOrigin(0, 0);
    this.hint = this.add.image(PANEL.x + PANEL.w - 28, PANEL.y + PANEL.h - 24, 'heart').setScale(1.4).setVisible(false);
    this.tweens.add({ targets: this.hint, y: this.hint.y + 4, duration: 420, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    // 무대·대사 상자를 누르면: 글자가 나오는 중이면 끝까지, 아니면 다음
    this.add
      .zone(STAGE.x, STAGE.y, STAGE.w, PANEL.y + PANEL.h - STAGE.y)
      .setOrigin(0, 0)
      .setInteractive()
      .on('pointerdown', () => this.advanceOrComplete());

    // 버튼
    this.prevBtn = this.button(176, 200, '이전', () => this.prev());
    this.nextBtn = this.button(WIDTH / 2 + 24, 240, '다음', () => this.next(), true);
    this.button(WIDTH - 118, 168, '건너뛰기', () => this.finish(), false, 20);

    const kb = this.input.keyboard!;
    kb.on('keydown-RIGHT', () => this.next());
    kb.on('keydown-LEFT', () => this.prev());
    kb.on('keydown-BACKSPACE', () => this.prev());
    kb.on('keydown-ENTER', () => this.advanceOrComplete());
    kb.on('keydown-SPACE', () => this.advanceOrComplete());
    kb.on('keydown-ESC', () => this.finish());

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.stage?.destroy();
      this.stage = undefined;
    });

    this.show('start');
  }

  // ───────────────────────── 이동 ─────────────────────────

  private next() {
    if (this.leaving) return;
    const beats = PROLOGUE[this.screen].beats;
    if (this.beat < beats.length - 1) this.beat++;
    else if (this.screen < PROLOGUE.length - 1) {
      this.screen++;
      this.beat = 0;
    } else return this.finish();
    audio.play('pause');
    this.show('forward');
  }

  private prev() {
    if (this.leaving) return;
    if (this.beat > 0) this.beat--;
    else if (this.screen > 0) {
      this.screen--;
      this.beat = PROLOGUE[this.screen].beats.length - 1;
    } else return;
    audio.play('pause');
    this.show('back');
  }

  private advanceOrComplete() {
    if (this.leaving) return;
    if (this.typer) this.completeTyping();
    else this.next();
  }

  /** 프롤로그를 끝내고 게임 플레이로 */
  private finish() {
    if (this.leaving) return;
    this.leaving = true;
    audio.unlock();
    audio.play('letter');
    this.typer?.remove();
    this.cameras.main.fadeOut(700, 10, 5, 16);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () =>
      this.scene.start('Game', { run: this.run ?? newRun() }),
    );
  }

  // ───────────────────────── 화면 그리기 ─────────────────────────

  private show(dir: 'start' | 'forward' | 'back') {
    const scr = PROLOGUE[this.screen];
    const beat = scr.beats[this.beat];
    const mood = MOODS[scr.mood];

    // 무대: 화면이 바뀌었거나 뒤로 왔으면 새로 그리고, 지금까지의 cue를 바로 적용한다.
    const newScreen = this.stageScreen !== this.screen;
    if (newScreen || dir === 'back') {
      this.stage?.destroy();
      this.stage = new StageView(this, scr.stage);
      this.stageScreen = this.screen;
      for (let i = 0; i < this.beat; i++) {
        const c = scr.beats[i].cue;
        if (c) this.stage.cue(c, false);
      }
      if (beat.cue) this.stage.cue(beat.cue, dir !== 'back');
      if (newScreen) {
        this.stage.root.setAlpha(0);
        this.tweens.add({ targets: this.stage.root, alpha: 1, duration: dir === 'back' ? 200 : 450 });
        this.drawHeader(scr.title, mood.title);
      }
    } else if (beat.cue) {
      this.stage?.cue(beat.cue, true);
    }

    this.drawProgress();
    this.drawPanel(mood.fill, mood.line);
    this.drawNameTag(beat.lines.find((l) => l.speaker)?.speaker);

    // 글자: 이름표 화자의 대사는 따옴표로 감싸고, 다른 화자가 끼어들면 이름을 앞에 붙인다.
    const tagSpeaker = beat.lines[0]?.speaker;
    const text = beat.lines
      .map((l) => {
        if (!l.speaker) return l.text;
        const quoted = `"${l.text}"`;
        return l.speaker === tagSpeaker ? quoted : `${l.speaker}: ${quoted}`;
      })
      .join('\n');
    this.body.setColor(mood.text);
    // 줄바꿈을 미리 정해 두어야 타이핑 도중 단어가 다음 줄로 튀지 않는다.
    this.full = this.body.getWrappedText(text).join('\n');
    this.typer?.remove();
    this.typer = undefined;
    if (dir === 'back') this.completeTyping();
    else this.startTyping(mood.typeMs);

    // 버튼
    const first = this.screen === 0 && this.beat === 0;
    const last = this.screen === PROLOGUE.length - 1 && this.beat === scr.beats.length - 1;
    this.prevBtn.container.setAlpha(first ? 0.35 : 1);
    this.nextBtn.setText(last ? '모험 시작' : '다음');
  }

  private startTyping(ms: number) {
    const chars = [...this.full];
    this.shown = 0;
    this.body.setText('');
    this.hint.setVisible(false);
    if (!chars.length) return this.completeTyping();
    this.typer = this.time.addEvent({
      delay: ms,
      repeat: chars.length - 1,
      callback: () => {
        this.shown++;
        this.body.setText(chars.slice(0, this.shown).join(''));
        if (this.shown >= chars.length) this.completeTyping();
      },
    });
  }

  private completeTyping() {
    this.typer?.remove();
    this.typer = undefined;
    this.body.setText(this.full);
    this.hint.setVisible(true);
  }

  private drawHeader(text: string, colors: [string, string]) {
    this.title?.destroy();
    this.title = titleText(this, 32, 32, text, 24, colors).setOrigin(0, 0.5).setAlpha(0);
    this.tweens.add({ targets: this.title, alpha: 1, x: 28, duration: 400 });
  }

  private drawProgress() {
    const n = PROLOGUE.length;
    const size = 12;
    const gap = 10;
    const right = WIDTH - 86;
    const left = right - n * size - (n - 1) * gap;
    this.dots.clear();
    for (let i = 0; i < n; i++) {
      const x = left + i * (size + gap);
      const y = 32 - size / 2;
      if (i === this.screen) {
        this.dots.fillStyle(0xffb3c6).fillRoundedRect(x - 2, y - 2, size + 4, size + 4, 4);
      } else if (i < this.screen) {
        this.dots.fillStyle(0x9a6a85).fillRoundedRect(x, y, size, size, 3);
      } else {
        this.dots.lineStyle(2, 0x5e4a6a).strokeRoundedRect(x, y, size, size, 3);
      }
    }
    this.pageLabel.setText(`${this.screen + 1} / ${n}`);
  }

  private drawPanel(fill: number, line: number) {
    const { x, y, w, h } = PANEL;
    this.panel.clear();
    this.panel.fillStyle(0x0f0a14, 0.9).fillRoundedRect(x, y + 6, w, h, 14);
    this.panel.fillStyle(fill, 0.97).fillRoundedRect(x, y, w, h, 14);
    this.panel.lineStyle(3, line).strokeRoundedRect(x, y, w, h, 14);
  }

  private drawNameTag(speaker?: string) {
    this.nameTag.removeAll(true);
    if (!speaker) return;
    const label = this.add
      .text(0, 0, speaker, { fontFamily: FONT, fontSize: '24px', fontStyle: 'bold', color: '#ffffff', stroke: '#2b1d2f', strokeThickness: 4 })
      .setOrigin(0, 0.5);
    const w = label.width + 32;
    const bg = this.add.graphics();
    bg.fillStyle(SPEAKER_COLORS[speaker] ?? DEFAULT_SPEAKER_COLOR).fillRoundedRect(0, -20, w, 40, 10);
    bg.lineStyle(3, 0x2b1d2f).strokeRoundedRect(0, -20, w, 40, 10);
    label.setX(16);
    this.nameTag.add([bg, label]);
    this.nameTag.setScale(0.6);
    this.tweens.add({ targets: this.nameTag, scale: 1, duration: 180, ease: 'Back.out' });
  }

  /** 기존 메뉴 버튼 모양을 그대로 쓰고, 누르면 바로 실행한다. */
  private button(x: number, w: number, text: string, onPress: () => void, primary = false, fontSize = 24) {
    const b = new MenuButton(this, x, BUTTON_Y, w, 52, text, onPress, fontSize);
    b.setSelected(primary);
    b.container.on('pointerover', () => !primary && b.setSelected(true));
    b.container.on('pointerout', () => !primary && b.setSelected(false));
    b.container.on('pointerdown', () => {
      audio.unlock();
      this.tweens.add({ targets: b.container, scale: 0.92, duration: 70, yoyo: true });
      onPress();
    });
    return b;
  }
}
