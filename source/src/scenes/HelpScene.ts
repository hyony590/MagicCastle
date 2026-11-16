import Phaser from 'phaser';
import { audio } from '../audio';
import { ALL_MONSTERS, MONSTER_NAMES } from '../cast';
import { BONUS_WORD, HEIGHT, WIDTH } from '../config';
import { Menu, MenuButton } from '../ui/button';
import { FONT, FONT_BIG, STYLE, titleText } from '../ui/text';
import { letterCookie } from '../ui/letterCookie';

// 게임 설명 화면. 탭 네 개(조작법·게임 규칙·등장인물·아이템과 보스)를 ←→ 또는 클릭으로 넘긴다.
// ESC나 [돌아가기]로 시작 화면으로 돌아간다.

const PANEL = { x: 36, y: 140, w: WIDTH - 72, h: 456 };
const ICON_X = PANEL.x + 78; // 아이콘 가운데
const TEXT_X = PANEL.x + 150; // 설명 글자 시작
const WRAP = PANEL.x + PANEL.w - TEXT_X - 24;

type Obj = Phaser.GameObjects.GameObject;

interface Page {
  tab: string;
  build: () => Obj[];
}

export class HelpScene extends Phaser.Scene {
  private page = 0;
  private content?: Phaser.GameObjects.Container;
  private tabs: { bg: Phaser.GameObjects.Graphics; label: Phaser.GameObjects.Text; x: number }[] = [];
  private pages: Page[] = [];
  private leaving = false;

  constructor() {
    super('Help');
  }

  create() {
    this.leaving = false;
    this.page = 0;
    this.tabs = [];
    const cx = WIDTH / 2;
    this.cameras.main.fadeIn(300, 20, 10, 30);

    // 배경(시작 화면과 같은 분위기)
    this.add.rectangle(cx, HEIGHT / 2, WIDTH, HEIGHT, 0x2b1d2f);
    this.add.image(0, 0, 'bg_kitchen').setOrigin(0, 0).setScale(2).setTint(0x6a5a7a);
    this.add.image(0, 0, 'vignette').setOrigin(0, 0);
    this.add.rectangle(0, 640, WIDTH, HEIGHT - 640, 0x2b1d2f).setOrigin(0, 0);

    titleText(this, cx, 48, '게임 설명', 36, ['#ffe0ec', '#ff7aa8']);

    // 설명 판
    const panel = this.add.graphics();
    panel.fillStyle(0x1b1220, 0.9).fillRoundedRect(PANEL.x, PANEL.y + 6, PANEL.w, PANEL.h, 14);
    panel.fillStyle(0x2b1d2f, 0.96).fillRoundedRect(PANEL.x, PANEL.y, PANEL.w, PANEL.h, 14);
    panel.lineStyle(3, 0xf4a6b8).strokeRoundedRect(PANEL.x, PANEL.y, PANEL.w, PANEL.h, 14);

    this.pages = [
      { tab: '조작법', build: () => this.controlsPage() },
      { tab: '게임 규칙', build: () => this.rulesPage() },
      { tab: '등장인물', build: () => this.castPage() },
      { tab: '아이템·보스', build: () => this.itemsPage() },
    ];
    this.buildTabs();

    // 아래: 안내와 돌아가기 버튼
    this.add.text(cx, 614, '← →  페이지 넘기기      ESC  돌아가기', { ...STYLE.small, color: '#9a8fb0' }).setOrigin(0.5);
    const back = new MenuButton(this, cx, 660, 220, 44, '돌아가기', () => this.back(), 12);
    new Menu(this, [back]);

    const kb = this.input.keyboard!;
    kb.on('keydown-LEFT', () => this.showPage(this.page - 1, true));
    kb.on('keydown-RIGHT', () => this.showPage(this.page + 1, true));
    kb.on('keydown-ESC', () => this.back());
    kb.on('keydown-BACKSPACE', () => this.back());

    this.showPage(0, false);
  }

  // ───────────────────────── 탭과 페이지 ─────────────────────────

  private buildTabs() {
    const w = 150;
    const gap = 8;
    const total = this.pages.length * w + (this.pages.length - 1) * gap;
    const left = WIDTH / 2 - total / 2 + w / 2;
    this.pages.forEach((p, i) => {
      const x = left + i * (w + gap);
      const bg = this.add.graphics();
      const label = this.add
        .text(x, 112, p.tab, { fontFamily: FONT_BIG, fontSize: '14px', color: '#c9b8d6' })
        .setOrigin(0.5);
      const hit = this.add.zone(x, 112, w, 34).setInteractive({ useHandCursor: true });
      hit.on('pointerdown', () => this.showPage(i, true));
      this.tabs.push({ bg, label, x });
    });
  }

  private showPage(i: number, withSound: boolean) {
    const n = this.pages.length;
    const next = ((i % n) + n) % n;
    if (withSound && next !== this.page) audio.play('pause');
    this.page = next;

    this.tabs.forEach((t, k) => {
      const on = k === this.page;
      t.bg.clear();
      t.bg.fillStyle(on ? 0x5e3a70 : 0x2b1d2f, 0.95).fillRoundedRect(t.x - 75, 95, 150, 34, { tl: 10, tr: 10, bl: 0, br: 0 });
      t.bg.lineStyle(2, on ? 0xffb3c6 : 0x7a6a85).strokeRoundedRect(t.x - 75, 95, 150, 34, { tl: 10, tr: 10, bl: 0, br: 0 });
      t.label.setColor(on ? '#ffffff' : '#9a8fb0');
    });

    this.content?.destroy();
    this.content = this.add.container(0, 0, this.pages[this.page].build());
    this.content.setAlpha(0);
    this.tweens.add({ targets: this.content, alpha: 1, duration: 180 });

    // 페이지 번호
    this.content.add(
      this.add
        .text(PANEL.x + PANEL.w - 16, PANEL.y + PANEL.h - 14, `${this.page + 1} / ${n}`, { ...STYLE.small, color: '#7a6a85' })
        .setOrigin(1, 1),
    );
  }

  private back() {
    if (this.leaving) return;
    this.leaving = true;
    audio.play('pause');
    this.cameras.main.fadeOut(220, 20, 10, 30);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start('Title'));
  }

  // ───────────────────────── 꾸밈 도우미 ─────────────────────────

  /** 키보드 키 모양 */
  private key(x: number, y: number, label: string): Obj[] {
    const w = Math.max(30, label.length * 9 + 18);
    const g = this.add.graphics();
    g.fillStyle(0x9a8fb0).fillRoundedRect(x - w / 2, y - 13, w, 30, 6);
    g.fillStyle(0xf3e9ff).fillRoundedRect(x - w / 2, y - 15, w, 26, 6);
    g.lineStyle(2, 0x1b1220).strokeRoundedRect(x - w / 2, y - 15, w, 30, 6);
    const t = this.add
      .text(x, y - 2, label, { fontFamily: FONT, fontSize: '12px', fontStyle: 'bold', color: '#2b1d2f' })
      .setOrigin(0.5);
    return [g, t];
  }

  /** 키 여러 개를 아이콘 자리에 가로로 늘어놓는다 */
  private keys(y: number, labels: string[]): Obj[] {
    const widths = labels.map((l) => Math.max(30, l.length * 9 + 18));
    const total = widths.reduce((a, b) => a + b, 0) + (labels.length - 1) * 6;
    let x = ICON_X - total / 2;
    const out: Obj[] = [];
    labels.forEach((l, i) => {
      out.push(...this.key(x + widths[i] / 2, y, l));
      x += widths[i] + 6;
    });
    return out;
  }

  /** 그림 아이콘(여러 개면 가로로) */
  private icons(y: number, textures: string[], scale = 1): Obj[] {
    const step = textures.length > 1 ? 26 : 0;
    const start = ICON_X - (step * (textures.length - 1)) / 2;
    return textures.map((t, i) => this.add.image(start + i * step, y, t).setScale(scale));
  }

  /** 제목 한 줄 + 설명(여러 줄 자동 줄바꿈) */
  private item(y: number, title: string, desc: string, titleColor = '#fff4a8'): Obj[] {
    const t = this.add.text(TEXT_X, y - 12, title, { fontFamily: FONT_BIG, fontSize: '14px', color: titleColor }).setOrigin(0, 0.5);
    const d = this.add
      .text(TEXT_X, y + 6, desc, {
        fontFamily: FONT_BIG,
        fontSize: '14px',
        color: '#d9cfe6',
        wordWrap: { width: WRAP, useAdvancedWrap: true },
        lineSpacing: 4,
      })
      .setOrigin(0, 0);
    return [t, d];
  }

  private divider(y: number): Obj {
    return this.add.rectangle(PANEL.x + 24, y, PANEL.w - 48, 1, 0x4a3a52).setOrigin(0, 0.5);
  }

  // ───────────────────────── 페이지 ─────────────────────────

  private controlsPage(): Obj[] {
    const rows: [string[], string, string][] = [
      [['←', '→'], '걷기', '좌우로 걸어요. 토끼 운동화를 신으면 1.5배 빨라져요.'],
      [['↑', '↓'], '사다리 오르내리기', '사다리 앞에서 누르면 위층이나 아래층으로 가요.'],
      [['SPACE', 'V'], '점프', '틈과 가스 불꽃을 뛰어넘어요. 공중에서는 방향을 바꿀 수 없어요!'],
      [['Z'], '반죽 던지기 (보스전)', '발밑으로 반죽을 떨어뜨려요. 10층에서 보석을 모두 모은 뒤 쓸 수 있어요.'],
      [['P', 'ESC'], '일시정지', '게임을 잠깐 멈춰요. 처음부터 다시 시작할 수도 있어요.'],
      [['M'], '소리 켜기/끄기', '효과음과 배경음악을 켜거나 꺼요.'],
    ];
    const out: Obj[] = [];
    rows.forEach(([k, title, desc], i) => {
      const y = PANEL.y + 46 + i * 68;
      out.push(...this.keys(y, k), ...this.item(y, title, desc));
      if (i < rows.length - 1) out.push(this.divider(y + 36));
    });
    return out;
  }

  private rulesPage(): Obj[] {
    const rows: [string[], string, string, number?][] = [
      [['item_apple', 'item_gem', 'item_coin'], '재료를 모두 모으면 다음 층으로!', '층의 재료를 모두 먹으면 클리어! 다음 층으로 올라가요.'],
      [['pot_walk1'], '몬스터는 뛰어넘을 수 없어요', '닿으면 기절! 몬스터가 멀어진 틈을 노려 타이밍을 맞춰 지나가세요.', 0.8],
      [['flame1'], '가스 불꽃', '닿으면 기절해요. 점프로 넘을 수 있어요.'],
      [['dizzy_star'], '높은 곳에서 떨어지면 기절', '틈으로 떨어져 아래층으로 내려가면 기절해요. 넓은 틈은 사다리로 돌아가세요.', 2],
      [['heart', 'heart', 'heart'], '생명은 3개', '기절하면 생명이 하나 줄어요. 먹은 재료·연 상자·점수는 그대로예요.'],
      [[], `${[...BONUS_WORD].join(' · ')} 글자 쿠키`, `여섯 글자(${BONUS_WORD})를 모두 모으면 생명이 하나 늘어요. 모은 글자는 기절해도 남아요.`],
    ];
    const out: Obj[] = [];
    rows.forEach(([tex, title, desc, scale], i) => {
      const y = PANEL.y + 46 + i * 68;
      if (tex.length) out.push(...this.icons(y, tex, scale ?? 1));
      else out.push(this.letterIcon(y));
      out.push(...this.item(y, title, desc));
      if (i < rows.length - 1) out.push(this.divider(y + 36));
    });
    return out;
  }

  /** BAKING 여섯 글자 쿠키를 한 줄로 */
  private letterIcon(y: number): Obj {
    const n = BONUS_WORD.length;
    const cookies = [...BONUS_WORD].map((c, i) => letterCookie(this, (i - (n - 1) / 2) * 21, 0, c, 'small'));
    return this.add.container(ICON_X, y, cookies);
  }

  private castPage(): Obj[] {
    const out: Obj[] = [];
    const top = PANEL.y + 36;
    // 주인공과 보스
    const hero = (x: number, tex: string, scale: number, name: string, color: string, desc: string) => {
      out.push(this.add.image(x, top + 96, tex).setOrigin(0.5, 1).setScale(scale));
      out.push(this.add.text(x, top + 116, name, { fontFamily: FONT_BIG, fontSize: '14px', color }).setOrigin(0.5));
      out.push(
        this.add
          .text(x, top + 140, desc, {
            fontFamily: FONT_BIG,
            fontSize: '14px',
            color: '#d9cfe6',
            align: 'center',
            wordWrap: { width: 300, useAdvancedWrap: true },
            lineSpacing: 4,
          })
          .setOrigin(0.5, 0),
      );
    };
    // 둘 다 앞모습, 같은 2배 크기
    hero(PANEL.x + PANEL.w * 0.27, 'mochi_front', 2, '모찌 (주인공)', '#ffb3c6', '앞치마를 두른 토끼 요리사. 마녀에게 빼앗긴 부엌을 되찾으러 탑을 올라요.');
    hero(PANEL.x + PANEL.w * 0.73, 'witch_front', 2, '마녀 쿠르르 (보스)', '#c9a0ff', '부엌을 차지한 마녀. 10층에서 빗자루를 타고 날아다녀요.');

    out.push(this.divider(top + 228));
    out.push(
      this.add
        .text(WIDTH / 2, top + 250, '부엌 몬스터들 — 층을 좌우로 오가요. 닿으면 기절!', { fontFamily: FONT_BIG, fontSize: '14px', color: '#fff4a8' })
        .setOrigin(0.5),
    );
    const monsters = ALL_MONSTERS.map((key) => [key, MONSTER_NAMES[key]] as const);
    const step = (PANEL.w - 40) / monsters.length;
    monsters.forEach(([key, name], i) => {
      const x = PANEL.x + 20 + step * (i + 0.5);
      const img = this.add.image(x, top + 336, `${key}_walk1`).setOrigin(0.5, 1);
      this.time.addEvent({
        delay: 240 + i * 13,
        loop: true,
        callback: () => img.active && img.setTexture(img.texture.key.endsWith('1') ? `${key}_walk2` : `${key}_walk1`),
      });
      out.push(img);
      out.push(this.add.text(x, top + 350, name, { ...STYLE.small, color: '#e8dff0' }).setOrigin(0.5, 0));
    });
    out.push(
      this.add
        .text(WIDTH / 2, top + 384, '도시락 상자를 열면 이 중 하나가 튀어나올 수도 있어요!', { ...STYLE.small, color: '#9a8fb0' })
        .setOrigin(0.5, 0),
    );
    return out;
  }

  private itemsPage(): Obj[] {
    const rows: [string[], string, string, string?, number?][] = [
      [['item_apple', 'item_gem', 'item_coin'], '딸기 · 별사탕 · 쿠키', '하나에 50점. 층의 재료를 모두 모아야 다음 층으로 갈 수 있어요.'],
      [['chest_closed'], '도시락 상자', '열면 토끼 운동화 아니면 몬스터! 운동화는 상자 위에 놓이고 다시 밟으면 신어요.'],
      [['item_boots'], '토끼 운동화', '걷기가 1.5배 빨라져요. 기절하거나 다음 층으로 갈 때까지 계속돼요.', '#9fe3ff'],
      [['witch'], '보스전 (10층) — 마녀 쿠르르', '먼저 층마다 놓인 보석을 모두 모으세요. 그러면 Z키 공격이 열려요.', '#c9a0ff', 0.6],
      [['dough'], '반죽 덩어리', '마녀보다 위에서 Z키로 떨어뜨려야 맞아요. 7번 맞히면 승리! 맞을수록 마녀가 빨라지고 잘 피해요.'],
    ];
    const out: Obj[] = [];
    rows.forEach(([tex, title, desc, color, scale], i) => {
      const y = PANEL.y + 52 + i * 82;
      out.push(...this.icons(y, tex, scale ?? 1), ...this.item(y, title, desc, color));
      if (i < rows.length - 1) out.push(this.divider(y + 42));
    });
    return out;
  }
}
