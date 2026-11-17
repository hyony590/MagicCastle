import Phaser from 'phaser';
import { setPrologueUrl } from '../admin';
import { audio } from '../audio';
import { HEIGHT, WIDTH } from '../config';
import { newRun, type RunState } from '../state';
import { CHIEF, DUBU, KONGI, MOCHI, NABI, PROLOGUE, type PrologueFace, type PrologueMood, type PrologueScreen } from '../story/prologue';
import { MenuButton } from '../ui/button';
import { FONT, FONT_STORY, STYLE, titleText } from '../ui/text';
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
const SPEAKER_COLORS: Record<string, number> = {
  [CHIEF]: 0xc98b4b,
  [MOCHI]: 0xe87a9a,
  [DUBU]: 0xa8724e,
  [NABI]: 0xd8883e,
  [KONGI]: 0x8a84a0,
};
/** 영화식 검은 띠 두께 */
const LETTERBOX = 30;

/** 대사창 왼쪽 얼굴 그림 자리 */
const PORTRAIT = { x: PANEL.x + 22, y: PANEL.y + 34, size: 144, scale: 4 };
/** 얼굴 그림: 겹쳐 그릴 그림들과, 얼굴이 액자 가운데 오도록 그림 윗부분을 액자 위에서 얼마나 내릴지(px) */
const FACE_ART: Record<PrologueFace, { keys: string[]; top: number; scale?: number }> = {
  mochi: { keys: ['mochi_happy'], top: 2, scale: 5 },
  mochiPuzzled: { keys: ['mochi_front'], top: 2, scale: 5 },
  mochiSad: { keys: ['mochi_sad'], top: 2, scale: 5 },
  chief: { keys: ['villager_chief'], top: 14 },
  chiefSly: { keys: ['villager_chief_sly', 'villager_chief_sly_shade'], top: 14 },
  bear: { keys: ['villager_bear'], top: 18 },
  cat: { keys: ['villager_cat'], top: 16 },
  mouse: { keys: ['villager_mouse'], top: 22 },
};
/** 말하는 사람의 기본 얼굴 */
const SPEAKER_FACE: Record<string, PrologueFace> = { [MOCHI]: 'mochi', [CHIEF]: 'chief', [DUBU]: 'bear', [NABI]: 'cat', [KONGI]: 'mouse' };
/** 말하는 사람의 목소리(글자가 나올 때 나는 소리): [높이 Hz, 소리 결] */
const VOICES: Record<string, [number, OscillatorType]> = {
  [MOCHI]: [880, 'square'],
  [CHIEF]: [175, 'triangle'],
  [DUBU]: [247, 'square'],
  [NABI]: [698, 'sine'],
  [KONGI]: [1175, 'square'],
};
const DEFAULT_SPEAKER_COLOR = 0xd87d96;

export class PrologueScene extends Phaser.Scene {
  private run?: RunState;
  private startAt = { screen: 0, beat: 0 };
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
  /** 영화식 검은 띠(위·아래) */
  private bars: Phaser.GameObjects.Rectangle[] = [];
  private barsOn = false;
  /** 마지막에 뜨는 게임 제목 */
  private titleDrop?: Phaser.GameObjects.Container;
  /** 장 제목 카드가 떠 있으면 건너뛰는 함수 */
  private skipCard?: () => void;
  /** 대사창 얼굴 그림 */
  private portraitFrame!: Phaser.GameObjects.Graphics;
  private portraitMask!: Phaser.Display.Masks.GeometryMask;
  private portrait: Phaser.GameObjects.Image[] = [];
  private portraitFace?: PrologueFace;
  /** 글자가 나오는 동안 얼굴이 말하듯 들썩인다 */
  private talk?: Phaser.Tweens.Tween;
  /** 지금 대사를 말하는 사람의 목소리 */
  private voice?: [number, OscillatorType];

  constructor() {
    super('Prologue');
  }

  /** screen·beat(0부터)를 주면 그 화면·대사부터 시작한다(개발용 ?prologue=4.2) */
  init(data: { run?: RunState; screen?: number; beat?: number }) {
    this.run = data.run;
    this.startAt = { screen: data.screen ?? 0, beat: data.beat ?? 0 };
  }

  create() {
    this.leaving = false;
    this.screen = this.startAt.screen;
    this.beat = this.startAt.beat;
    this.stage = undefined;
    this.stageScreen = -1;
    this.typer = undefined;
    this.barsOn = false;
    this.titleDrop = undefined;
    this.skipCard = undefined;
    this.portrait = [];
    this.portraitFace = undefined;
    this.talk = undefined;
    createPrologueTextures(this);
    this.cameras.main.fadeIn(500, 20, 10, 30);

    // 바탕(다른 화면과 같은 보라빛)과 무대 액자
    this.add.rectangle(0, 0, WIDTH, HEIGHT, 0x1b1220).setOrigin(0, 0);
    const frame = this.add.graphics().setDepth(5);
    frame.lineStyle(3, 0x7a6a85).strokeRoundedRect(STAGE.x, STAGE.y, STAGE.w, STAGE.h, 12);

    // 영화식 검은 띠: 무대 모서리 둥근 모양에 맞춰 잘라 낸다
    const barMask = this.make.graphics({}, false);
    barMask.fillStyle(0xffffff).fillRoundedRect(STAGE.x, STAGE.y, STAGE.w, STAGE.h, 12);
    const mask = barMask.createGeometryMask();
    this.bars = [
      this.add.rectangle(STAGE.x, STAGE.y, STAGE.w, LETTERBOX, 0x000000).setOrigin(0, 0),
      this.add.rectangle(STAGE.x, STAGE.y + STAGE.h, STAGE.w, LETTERBOX, 0x000000).setOrigin(0, 1),
    ];
    this.bars.forEach((b) => b.setDepth(4).setScale(1, 0).setMask(mask));

    // 진행 표시(오른쪽 위)
    this.dots = this.add.graphics();
    this.pageLabel = this.add.text(WIDTH - 28, 32, '', { ...STYLE.small, color: '#9a8fb0' }).setOrigin(1, 0.5);

    // 대사 상자
    this.panel = this.add.graphics();
    this.portraitFrame = this.add.graphics();
    const pm = this.make.graphics({}, false);
    pm.fillStyle(0xffffff).fillRoundedRect(PORTRAIT.x, PORTRAIT.y, PORTRAIT.size, PORTRAIT.size, 10);
    this.portraitMask = pm.createGeometryMask();
    this.nameTag = this.add.container(PANEL.x + 24, PANEL.y);
    this.body = this.add
      .text(PANEL.x + TEXT_PAD, PANEL.y + 26, '', {
        fontFamily: FONT_STORY,
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
    if (this.skipCard) return this.skipCard();
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
    if (this.skipCard) return this.skipCard();
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
    if (this.skipCard) this.skipCard();
    else if (this.typer) this.completeTyping();
    else this.next();
  }

  /** 프롤로그를 끝내고 게임 플레이로 */
  private finish() {
    if (this.leaving) return;
    this.leaving = true;
    setPrologueUrl(null);
    audio.unlock();
    audio.stopMusic();
    audio.play('letter');
    this.typer?.remove();
    this.cameras.main.fadeOut(700, 10, 5, 16);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () =>
      this.scene.start('Game', { run: this.run ?? newRun() }),
    );
  }

  // ───────────────────────── 화면 그리기 ─────────────────────────

  /** 장이 시작되는 화면이면 장 제목 카드를 먼저 보여 주고, 아니면 바로 화면을 그린다 */
  private show(dir: 'start' | 'forward' | 'back') {
    const scr = PROLOGUE[this.screen];
    if (dir !== 'back' && scr.chapter && this.stageScreen !== this.screen) {
      this.playCard(scr.chapter, () => this.present(dir));
      return;
    }
    this.present(dir);
  }

  private present(dir: 'start' | 'forward' | 'back') {
    const scr = PROLOGUE[this.screen];
    const beat = scr.beats[this.beat];
    const mood = MOODS[scr.mood];
    const animate = dir !== 'back';
    setPrologueUrl({ screen: this.screen, beat: this.beat });

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
      if (beat.cue) this.stage.cue(beat.cue, animate);
      // 카메라: 이 비트의 구도. 없으면 앞 비트에서 마지막으로 정한 구도를 바로 맞춘다
      const lastShot = scr.beats.slice(0, this.beat).reverse().find((b) => b.shot)?.shot;
      if (beat.shot) this.stage.shot(beat.shot, animate);
      else if (lastShot) this.stage.shot(lastShot, false);
      if (newScreen) {
        this.enter(scr, dir);
        this.drawHeader(scr.title, mood.title);
        // 분위기에 맞는 배경 음악(같은 곡이면 이어서 나온다)
        audio.startMusic(scr.mood);
      }
    } else {
      if (beat.cue) this.stage?.cue(beat.cue, true);
      if (beat.shot) this.stage?.shot(beat.shot, true);
    }
    this.setLetterbox(!!beat.letterbox, animate);
    this.setTitleDrop(!!beat.titleDrop, animate);

    this.drawProgress();
    this.drawPanel(mood.fill, mood.line);
    const tag = beat.lines.find((l) => l.speaker);
    this.drawNameTag(tag?.speaker);
    // 얼굴 그림과 목소리: 이름표에 나온 사람 기준. 얼굴이 있으면 글자는 그 오른쪽부터
    const face = tag?.speaker ? (tag.face ?? SPEAKER_FACE[tag.speaker]) : undefined;
    this.setPortrait(face, mood.line, animate);
    this.voice = tag?.speaker ? VOICES[tag.speaker] : undefined;
    const textX = face ? PORTRAIT.x + PORTRAIT.size + 24 : PANEL.x + TEXT_PAD;
    this.body.setX(textX).setWordWrapWidth(PANEL.x + PANEL.w - TEXT_PAD - textX, true);

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

  // ───────────────────────── 연출 ─────────────────────────

  /** 새 화면이 나타나는 방식 */
  private enter(scr: PrologueScreen, dir: 'start' | 'forward' | 'back') {
    const root = this.stage!.root;
    if (dir === 'back') {
      root.setAlpha(0);
      this.tweens.add({ targets: root, alpha: 1, duration: 200 });
      return;
    }
    switch (scr.enter ?? 'fade') {
      case 'cut':
        root.setAlpha(1);
        return;
      case 'white': {
        // 하얗게 번쩍인 뒤 장면이 드러난다
        root.setAlpha(1);
        audio.play('whoosh');
        const flash = this.add.rectangle(STAGE.x, STAGE.y, STAGE.w, STAGE.h, 0xfffaf0).setOrigin(0, 0).setDepth(4);
        this.tweens.add({ targets: flash, alpha: 0, duration: 1300, ease: 'Sine.in', onComplete: () => flash.destroy() });
        return;
      }
      case 'slow':
        root.setAlpha(0);
        this.tweens.add({ targets: root, alpha: 1, duration: 1600, ease: 'Sine.inOut' });
        return;
      default:
        root.setAlpha(0);
        this.tweens.add({ targets: root, alpha: 1, duration: 450 });
    }
  }

  /** 장 제목 카드: 화면 전체를 덮었다가 걷히며 다음 화면이 드러난다. 누르면 바로 넘어간다 */
  private playCard(chapter: { no: string; name: string }, done: () => void) {
    this.typer?.remove();
    this.typer = undefined;
    const bg = this.add.rectangle(0, 0, WIDTH, HEIGHT, 0x07040c).setOrigin(0, 0);
    const no = this.add.text(WIDTH / 2, HEIGHT / 2 - 50, chapter.no, { fontFamily: FONT_STORY, fontSize: '26px', color: '#9a8fb0' }).setOrigin(0.5);
    const name = titleText(this, WIDTH / 2, HEIGHT / 2, chapter.name, 36, ['#fff4e0', '#f4a6b8']);
    const line = this.add.rectangle(WIDTH / 2, HEIGHT / 2 + 44, 240, 2, 0xf4a6b8).setScale(0, 1);
    const card = this.add.container(0, 0, [bg, no, name, line]).setDepth(50).setAlpha(0);
    this.tweens.add({ targets: card, alpha: 1, duration: 450 });
    audio.play('chapter');
    this.tweens.add({ targets: line, scaleX: 1, duration: 700, delay: 350, ease: 'Sine.out' });
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      this.skipCard = undefined;
      timer.remove();
      done();
      this.tweens.add({ targets: card, alpha: 0, duration: 600, onComplete: () => card.destroy() });
    };
    const timer = this.time.delayedCall(2100, finish);
    this.skipCard = finish;
  }

  /** 영화식 검은 띠를 내리거나 올린다 */
  private setLetterbox(on: boolean, animate: boolean) {
    if (on === this.barsOn) return;
    this.barsOn = on;
    this.tweens.killTweensOf(this.bars);
    if (animate) this.tweens.add({ targets: this.bars, scaleY: on ? 1 : 0, duration: 500, ease: 'Sine.inOut' });
    else this.bars.forEach((b) => b.setScale(1, on ? 1 : 0));
  }

  /** 무대 위에 게임 제목을 띄운다(마지막 비트) */
  private setTitleDrop(on: boolean, animate: boolean) {
    if (!on) {
      this.titleDrop?.destroy();
      this.titleDrop = undefined;
      return;
    }
    if (this.titleDrop) return;
    const cx = STAGE.x + STAGE.w / 2;
    const cy = STAGE.y + STAGE.h / 2;
    const dim = this.add.rectangle(STAGE.x, STAGE.y, STAGE.w, STAGE.h, 0x05030a, 0.6).setOrigin(0, 0);
    const kicker = this.add.text(cx, cy - 58, '― 제1부 ―', { fontFamily: FONT_STORY, fontSize: '24px', color: '#c9b8dc' }).setOrigin(0.5);
    const title = titleText(this, cx, cy, '모찌의 마녀 부엌', 48);
    const c = this.add.container(0, 0, [dim, kicker, title]).setDepth(4);
    this.titleDrop = c;
    if (!animate) return;
    dim.setAlpha(0);
    kicker.setAlpha(0);
    title.setAlpha(0).setScale(1.6);
    this.tweens.add({ targets: dim, alpha: 1, duration: 900 });
    this.tweens.add({ targets: title, alpha: 1, scale: 1, duration: 700, delay: 500, ease: 'Back.out' });
    this.tweens.add({ targets: kicker, alpha: 1, duration: 600, delay: 1100 });
    this.time.delayedCall(500, () => {
      audio.play('titleHit');
      this.cameras.main.shake(250, 0.004, false);
    });
  }

  /** 대사창 왼쪽 얼굴 그림. 같은 얼굴이면 그대로 두고, 바뀌면 톡 튀어나온다 */
  private setPortrait(face: PrologueFace | undefined, line: number, animate: boolean) {
    this.portraitFrame.clear();
    if (!face) {
      this.portrait.forEach((p) => p.destroy());
      this.portrait = [];
      this.portraitFace = undefined;
      return;
    }
    const { x, y, size, scale } = PORTRAIT;
    this.portraitFrame.fillStyle(0x0f0a14, 0.7).fillRoundedRect(x, y + 4, size, size, 10);
    this.portraitFrame.fillStyle(0x3a2c48).fillRoundedRect(x, y, size, size, 10);
    this.portraitFrame.lineStyle(3, line).strokeRoundedRect(x, y, size, size, 10);
    if (face === this.portraitFace) return;
    this.portrait.forEach((p) => p.destroy());
    this.portraitFace = face;
    const art = FACE_ART[face];
    this.portrait = art.keys.map((key, i) =>
      this.add
        .image(x + size / 2, y + art.top, key)
        .setOrigin(0.5, 0)
        .setScale(art.scale ?? scale)
        .setAlpha(i > 0 ? 0.5 : 1) // 두 번째 그림은 얼굴 그늘
        .setMask(this.portraitMask)
        .setData('y0', y + art.top),
    );
    if (!animate) return;
    this.portrait.forEach((p) => {
      const a = p.alpha;
      p.setAlpha(0).setY(p.y + 14);
      this.tweens.add({ targets: p, alpha: a, y: p.getData('y0'), duration: 200, ease: 'Back.out' });
    });
  }

  private startTyping(ms: number) {
    const chars = [...this.full];
    this.shown = 0;
    this.body.setText('');
    this.hint.setVisible(false);
    if (!chars.length) return this.completeTyping();
    // 말하는 동안 얼굴이 들썩인다
    this.talk?.stop();
    if (this.portrait.length) {
      this.talk = this.tweens.add({ targets: this.portrait, y: '-=3', duration: 110, yoyo: true, repeat: -1, delay: 220 });
    }
    this.typer = this.time.addEvent({
      delay: ms,
      repeat: chars.length - 1,
      callback: () => {
        this.shown++;
        this.body.setText(chars.slice(0, this.shown).join(''));
        // 목소리: 두 글자에 한 번, 글자일 때만
        const ch = chars[this.shown - 1];
        if (this.voice && this.shown % 2 === 1 && !/[\s.,!?…"'~—\-:]/.test(ch)) audio.voice(this.voice[0], this.voice[1]);
        if (this.shown >= chars.length) this.completeTyping();
      },
    });
  }

  private completeTyping() {
    this.typer?.remove();
    this.typer = undefined;
    this.talk?.stop();
    this.talk = undefined;
    this.portrait.forEach((p) => p.setY(p.getData('y0')));
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
