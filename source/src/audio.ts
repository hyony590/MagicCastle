// 음원 파일 없이 Web Audio로 만드는 8비트 효과음과 배경음악.
// 나중에 실제 음원으로 바꿀 때는 이 파일의 play()/startMusic() 내부만 교체하면 된다.

export type Sfx =
  | 'jump'
  | 'pickup'
  | 'letter'
  | 'oneUp'
  | 'chest'
  | 'boots'
  | 'bonus'
  | 'spawn'
  | 'death'
  | 'clear'
  | 'gameOver'
  | 'victory'
  | 'pause'
  | 'push'
  | 'warn'
  | 'bossHit'
  | 'bossDown'
  // 프롤로그 연출
  /** 장 제목 카드: 맑은 종소리 두 번 */
  | 'chapter'
  /** 하얗게 번쩍: 바람이 휙 */
  | 'whoosh'
  /** 발표 직전 북 연타 */
  | 'drumroll'
  /** 조명이 켜지며 짠! */
  | 'fanfare'
  /** 객석 박수와 환호 */
  | 'cheer'
  /** 섬뜩한 순간: 낮게 울리는 불협화음 */
  | 'sting'
  /** 육중한 성문이 끼이익 열리며 땅이 울린다 */
  | 'doorOpen'
  /** 제목이 쾅 */
  | 'titleHit';

const MUTE_KEY = 'castle-climber:muted';

/** 'A4', 'C#5', 'Bb3' 같은 음 이름을 주파수로 바꾼다. */
function freq(note: string): number {
  const m = /^([A-G])([#b]?)(\d)$/.exec(note);
  if (!m) throw new Error(`음 이름 오류: ${note}`);
  const base: Record<string, number> = { C: -9, D: -7, E: -5, F: -4, G: -2, A: 0, B: 2 };
  const semis = base[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (Number(m[3]) - 4) * 12;
  return 440 * Math.pow(2, semis / 12);
}

// ── 배경음악(오리지널). 8분음표 한 칸씩. '-'는 앞 음 늘이기, '.'는 쉼 ──
// 레벨: '토끼 폴카' — G장조 2/4, 깡충깡충 빠른 폴카, 오르골 멜로디.
// 보스: '마녀의 소동' — 빠른 4/4 단조, 쉬지 않는 베이스와 북.
// 프롤로그(따뜻함): '토끼 마을 자장가' — F장조 3/4 느린 왈츠, 오르골.
// 프롤로그(불안함): '숲 너머' — D단조, 느리고 듬성듬성한 오르골.
export type MusicTrack = 'level' | 'boss' | 'warm' | 'uneasy';
type SongId = 'polka' | 'boss' | 'lullaby' | 'dread';

interface Track {
  tempo: number;
  /** 한 마디 칸 수(8분음표) */
  bar: number;
  /** 멜로디 소리: box = 오르골, square = 8비트 */
  lead: 'box' | 'square';
  /** 베이스를 치는 칸(마디 안). 근음과 5음을 번갈아 친다. 'every'면 칸마다 근음·옥타브를 번갈아 */
  bass: number[] | 'every';
  /** 짧은 화음(짝)을 치는 칸 */
  chord: number[];
  /** 숟가락 톡톡 칸 */
  tick: number[];
  /** 북(쿵·탁) 칸 */
  kick?: number[];
  snare?: number[];
  /** 네 마디마다 가마솥 보글 */
  bubble?: boolean;
  melody: string[];
  /** 마디마다 [베이스, 화음 음들...] */
  chords: string[][];
}

const F = ['F2', 'A4', 'C5'];
const C = ['C3', 'E4', 'G4'];
const Bb = ['Bb2', 'D4', 'F4'];
const Dm = ['D3', 'F4', 'A4'];
const dDm = ['D2', 'F4', 'A4'];
const dBb = ['Bb1', 'D4', 'F4'];
const dA = ['A1', 'C#4', 'E4'];
const dGm = ['G1', 'Bb3', 'D4'];

const TRACKS: Record<SongId, Track> = {
  lullaby: {
    tempo: 104,
    bar: 6,
    lead: 'box',
    bass: [0],
    chord: [2, 4],
    tick: [],
    // prettier-ignore
    melody: [
      'A5', '-', 'C6', '-', 'A5', '-',
      'G5', '-', 'F5', '-', 'G5', 'A5',
      'F5', '-', '-', '-', 'C5', '-',
      'D5', '-', 'E5', '-', 'F5', '-',
      'G5', '-', 'A5', '-', 'Bb5', '-',
      'A5', '-', 'G5', '-', 'F5', '-',
      'E5', '-', 'G5', '-', 'C6', '-',
      'A5', '-', '-', '-', '.', '.',
      'C6', '-', 'D6', '-', 'C6', 'A5',
      'Bb5', '-', 'A5', '-', 'G5', '-',
      'A5', '-', 'F5', '-', 'D5', '-',
      'E5', '-', 'F5', '-', 'G5', '-',
      'A5', '-', 'Bb5', 'A5', 'G5', 'F5',
      'E5', '-', 'D5', '-', 'C5', '-',
      'D5', '-', 'E5', '-', 'G5', '-',
      'F5', '-', '-', '-', '.', '.',
    ],
    chords: [F, C, F, Bb, C, F, C, F, F, Bb, Dm, C, Bb, C, C, F],
  },
  dread: {
    tempo: 72,
    bar: 8,
    lead: 'box',
    bass: [0, 4],
    chord: [6],
    tick: [],
    // prettier-ignore
    melody: [
      'D5', '-', '-', '-', 'F5', '-', 'E5', '-',
      'D5', '-', '-', '-', '.', '.', 'A4', '-',
      'Bb4', '-', '-', '-', 'D5', '-', 'C#5', '-',
      'A4', '-', '-', '-', '.', '.', '.', '.',
      'F5', '-', '-', '-', 'A5', '-', 'G#5', '-',
      'A5', '-', '-', '-', 'E5', '-', 'F5', '-',
      'D5', '-', 'C#5', '-', 'Bb4', '-', 'A4', '-',
      'D5', '-', '-', '-', '.', '.', '.', '.',
    ],
    chords: [dDm, dDm, dBb, dA, dDm, dA, dGm, dDm],
  },
  polka: {
    tempo: 168,
    bar: 4,
    lead: 'box',
    bass: [0],
    chord: [2],
    tick: [1, 3],
    // prettier-ignore
    melody: [
      'B4', 'D5', 'G5', '-',   'B5', '-', 'G5', '-',
      'A5', 'F#5', 'D5', 'F#5', 'A5', '-', '-', '.',
      'A4', 'C5', 'F#5', 'A5', 'C6', '-', 'A5', '-',
      'B5', 'A5', 'G5', 'D5',  'G5', '-', '-', '.',
      'D5', 'G5', 'B5', 'G5',  'D6', '-', 'B5', '-',
      'C6', 'B5', 'A5', 'G5',  'E5', '-', 'G5', '-',
      'F#5', 'G5', 'A5', 'D6', 'C6', '-', 'A5', 'F#5',
      'G5', '-', 'D5', '-',    'G5', '-', '.', '.',
      'E5', 'G5', 'C6', '-',   'C6', 'B5', 'A5', 'G5',
      'G5', 'D5', 'B4', 'D5',  'G5', '-', '-', '.',
      'F#5', 'A5', 'D6', '-',  'C6', 'A5', 'F#5', 'D5',
      'B4', 'D5', 'G5', 'B5',  'D6', '-', '-', '.',
      'E6', '-', 'C6', '-',    'G5', '-', 'E5', '-',
      'D6', '-', 'B5', '-',    'G5', '-', 'D5', '-',
      'A5', 'B5', 'C6', 'A5',  'F#5', '-', 'D5', '-',
      'G5', 'B5', 'D6', 'B5',  'G5', '-', '.', '.',
    ],
    // prettier-ignore
    chords: [
      ['G2', 'B4', 'D5'], ['G2', 'B4', 'D5'], ['D3', 'F#4', 'A4'], ['D3', 'F#4', 'A4'],
      ['D3', 'F#4', 'C5'], ['D3', 'F#4', 'C5'], ['G2', 'B4', 'D5'], ['G2', 'B4', 'D5'],
      ['G2', 'B4', 'D5'], ['G2', 'B4', 'D5'], ['C3', 'E4', 'G4'], ['C3', 'E4', 'G4'],
      ['D3', 'F#4', 'A4'], ['D3', 'F#4', 'A4'], ['G2', 'B4', 'D5'], ['G2', 'B4', 'D5'],
      ['C3', 'E4', 'G4'], ['C3', 'E4', 'G4'], ['G2', 'B4', 'D5'], ['G2', 'B4', 'D5'],
      ['D3', 'F#4', 'A4'], ['D3', 'F#4', 'A4'], ['G2', 'B4', 'D5'], ['G2', 'B4', 'D5'],
      ['C3', 'E4', 'G4'], ['C3', 'E4', 'G4'], ['G2', 'B4', 'D5'], ['G2', 'B4', 'D5'],
      ['D3', 'F#4', 'A4'], ['D3', 'F#4', 'A4'], ['G2', 'B4', 'D5'], ['G2', 'B4', 'D5'],
    ],
  },
  boss: {
    tempo: 168,
    bar: 8,
    lead: 'square',
    bass: 'every',
    chord: [2, 6],
    tick: [1, 3, 5, 7],
    kick: [0, 4],
    snare: [2, 6],
    // prettier-ignore
    melody: [
      'E5', '-', 'B4', '-', 'G5', 'F#5', 'E5', '-',
      'D#5', 'E5', 'F#5', '-', 'B4', '-', '-', '.',
      'C5', 'E5', 'G5', '-', 'F#5', 'E5', 'D#5', 'E5',
      'F#5', '-', '-', '-', 'D#5', '-', 'B4', '-',
      'E5', 'G5', 'B5', '-', 'A5', 'G5', 'F#5', 'G5',
      'E5', '-', 'B4', '-', 'E5', '-', 'G5', '-',
      'A5', 'G5', 'F#5', 'E5', 'C5', '-', 'E5', '-',
      'D#5', '-', 'F#5', '-', 'B5', '-', '.', '.',
    ],
    // prettier-ignore
    chords: [
      ['E2', 'G4', 'B4'], ['E2', 'G4', 'B4'], ['C2', 'E4', 'G4'], ['B1', 'D#4', 'F#4'],
      ['E2', 'G4', 'B4'], ['E2', 'G4', 'B4'], ['A1', 'C4', 'E4'], ['B1', 'D#4', 'A4'],
    ],
  },
};

class AudioManager {
  private ctx?: AudioContext;
  private master?: GainNode;
  private sfxBus?: GainNode;
  private musicBus?: GainNode;
  private noise?: AudioBuffer;
  private _muted = false;

  private musicTimer?: number;
  private nextNoteTime = 0;
  private step = 0;
  /** 지금 나오는 곡 */
  private song: SongId = 'polka';

  constructor() {
    try {
      this._muted = localStorage.getItem(MUTE_KEY) === '1';
    } catch {
      /* 저장소를 못 쓰면 기본값 */
    }
  }

  get muted() {
    return this._muted;
  }

  /** 브라우저 자동재생 정책 때문에 키 입력 같은 사용자 동작 안에서 한 번 불러야 한다. */
  unlock() {
    const ctx = this.ensure();
    if (ctx && ctx.state === 'suspended') void ctx.resume();
  }

  toggleMute(): boolean {
    this._muted = !this._muted;
    try {
      localStorage.setItem(MUTE_KEY, this._muted ? '1' : '0');
    } catch {
      /* 무시 */
    }
    if (this.ctx && this.master) this.master.gain.setTargetAtTime(this._muted ? 0 : 1, this.ctx.currentTime, 0.02);
    return this._muted;
  }

  play(name: Sfx) {
    const ctx = this.ensure();
    if (!ctx) return;
    const t = ctx.currentTime + 0.005;
    const out = this.sfxBus!;
    switch (name) {
      case 'jump':
        this.tone(out, 'square', 320, t, 0.14, 0.18, 680);
        break;
      case 'pickup':
        this.tone(out, 'square', freq('A5'), t, 0.05, 0.16);
        this.tone(out, 'square', freq('E6'), t + 0.05, 0.09, 0.16);
        break;
      case 'letter':
        ['C6', 'E6', 'G6'].forEach((n, i) => this.tone(out, 'square', freq(n), t + i * 0.06, 0.07, 0.15));
        break;
      case 'oneUp':
        ['C5', 'E5', 'G5', 'C6', 'G5', 'C6'].forEach((n, i) => this.tone(out, 'square', freq(n), t + i * 0.08, 0.09, 0.16));
        break;
      case 'chest':
        this.tone(out, 'triangle', 180, t, 0.16, 0.35, 420);
        break;
      case 'boots':
        ['C5', 'D5', 'E5', 'G5', 'C6'].forEach((n, i) => this.tone(out, 'square', freq(n), t + 0.12 + i * 0.045, 0.05, 0.14));
        break;
      case 'bonus':
        ['G5', 'C6'].forEach((n, i) => this.tone(out, 'square', freq(n), t + 0.12 + i * 0.08, 0.1, 0.16));
        break;
      case 'spawn':
        this.tone(out, 'sawtooth', 340, t + 0.12, 0.35, 0.14, 90);
        break;
      case 'death':
        this.tone(out, 'square', 760, t, 0.7, 0.18, 70);
        this.burst(out, t, 0.12, 0.2);
        break;
      case 'clear':
        ['C5', 'E5', 'G5', 'C6'].forEach((n, i) => this.tone(out, 'square', freq(n), t + i * 0.1, 0.1, 0.16));
        this.tone(out, 'square', freq('E6'), t + 0.4, 0.35, 0.16);
        this.tone(out, 'triangle', freq('C4'), t + 0.4, 0.35, 0.3);
        break;
      case 'gameOver':
        ['G4', 'E4', 'C4'].forEach((n, i) => this.tone(out, 'triangle', freq(n), t + i * 0.28, 0.26, 0.35));
        this.tone(out, 'triangle', freq('A3'), t + 0.84, 0.7, 0.35);
        break;
      case 'victory':
        [['C5', 0], ['C5', 0.12], ['C5', 0.24], ['G5', 0.36], ['E5', 0.66], ['G5', 0.78], ['C6', 0.9]].forEach(([n, d]) =>
          this.tone(out, 'square', freq(n as string), t + (d as number), 0.22, 0.16),
        );
        this.tone(out, 'triangle', freq('C4'), t + 0.9, 0.6, 0.3);
        break;
      case 'pause':
        this.tone(out, 'square', freq('E5'), t, 0.06, 0.12);
        this.tone(out, 'square', freq('B4'), t + 0.07, 0.08, 0.12);
        break;
      case 'push':
        this.burst(out, t, 0.12, 0.25, 300);
        this.tone(out, 'triangle', 140, t, 0.12, 0.3, 90);
        break;
      case 'warn':
        this.tone(out, 'square', freq('A5'), t, 0.08, 0.12);
        this.tone(out, 'square', freq('A5'), t + 0.14, 0.08, 0.12);
        break;
      case 'bossHit':
        this.burst(out, t, 0.25, 0.35, 200);
        this.tone(out, 'sawtooth', 220, t, 0.3, 0.2, 60);
        break;
      case 'bossDown':
        this.burst(out, t, 0.6, 0.35, 150);
        this.tone(out, 'sawtooth', 300, t, 1.0, 0.2, 40);
        break;
      // ── 프롤로그 ──
      case 'chapter':
        this.pluck(out, 'sine', freq('E6'), t, 1.2, 0.12);
        this.pluck(out, 'sine', freq('B6'), t + 0.22, 1.4, 0.08);
        this.pluck(out, 'triangle', freq('E4'), t, 1.4, 0.1);
        break;
      case 'whoosh':
        this.burst(out, t, 0.7, 0.18, 2500);
        this.tone(out, 'sine', 300, t, 0.6, 0.06, 1400);
        break;
      case 'drumroll':
        // 점점 커지는 작은북 연타
        for (let i = 0; i < 26; i++) this.burst(out, t + i * 0.055, 0.05, 0.05 + i * 0.006, 1800);
        break;
      case 'fanfare':
        this.burst(out, t, 0.9, 0.22, 4000);
        ['C5', 'E5', 'G5'].forEach((n) => this.tone(out, 'square', freq(n), t, 0.5, 0.06));
        ['C6', 'E6', 'G6', 'C7'].forEach((n, i) => this.tone(out, 'square', freq(n), t + 0.1 + i * 0.07, 0.25, 0.07));
        break;
      case 'cheer':
        // 박수: 흩어진 짧은 잡음 여러 개
        for (let i = 0; i < 40; i++) this.burst(out, t + Math.random() * 1.6, 0.03, 0.05 + Math.random() * 0.05, 2000 + Math.random() * 3000);
        break;
      case 'sting':
        this.tone(out, 'sawtooth', freq('D2'), t, 1.4, 0.08);
        this.tone(out, 'sawtooth', freq('D#2'), t, 1.4, 0.06);
        this.pluck(out, 'sine', freq('G#5'), t + 0.05, 1.2, 0.05);
        break;
      case 'doorOpen':
        // 끼이익(떨리며 내려가는 삐걱임) + 쿠르릉(낮은 울림)
        for (let i = 0; i < 8; i++) this.tone(out, 'sawtooth', 210 - i * 14, t + i * 0.32, 0.36, 0.035, 190 - i * 14);
        this.burst(out, t, 2.8, 0.12, 80);
        this.tone(out, 'sine', 55, t, 2.8, 0.25, 40);
        break;
      case 'titleHit':
        this.tone(out, 'sine', 90, t, 0.9, 0.35, 40);
        this.burst(out, t, 0.4, 0.2, 600);
        ['F4', 'A4', 'C5', 'F5'].forEach((n) => this.pluck(out, 'triangle', freq(n), t + 0.05, 2.2, 0.08));
        break;
    }
  }

  /** 대사 한 글자를 말할 때 나는 짧은 목소리. 사람마다 높이와 소리 결이 다르다 */
  voice(pitch: number, wave: OscillatorType = 'square') {
    const ctx = this.ensure();
    if (!ctx || ctx.state !== 'running') return;
    const t = ctx.currentTime + 0.002;
    // 매번 높이를 살짝 흔들어 말하는 느낌을 낸다
    const f = pitch * Math.pow(2, (Math.random() * 4 - 2) / 12);
    this.pluck(this.sfxBus!, wave, f, t, 0.05, wave === 'square' ? 0.035 : 0.07);
  }

  /** 곡을 처음부터 튼다. 같은 곡이 이미 나오고 있으면 그대로 둔다. */
  startMusic(track: MusicTrack = 'level') {
    const ctx = this.ensure();
    if (!ctx) return;
    const song: SongId = ({ level: 'polka', boss: 'boss', warm: 'lullaby', uneasy: 'dread' } as const)[track];
    if (this.musicTimer !== undefined) {
      if (this.song === song) return;
      this.pauseMusic();
    }
    this.song = song;
    this.step = 0;
    this.resumeMusic();
  }

  /** 일시정지용: 현재 위치를 기억한 채 멈춘다. */
  pauseMusic() {
    if (this.musicTimer === undefined) return;
    window.clearInterval(this.musicTimer);
    this.musicTimer = undefined;
  }

  resumeMusic() {
    const ctx = this.ensure();
    if (!ctx || this.musicTimer !== undefined) return;
    this.nextNoteTime = ctx.currentTime + 0.06;
    this.musicTimer = window.setInterval(() => this.scheduleMusic(), 25);
    this.scheduleMusic();
  }

  stopMusic() {
    this.pauseMusic();
    this.step = 0;
  }


  // ───────── 내부 ─────────

  private ensure(): AudioContext | undefined {
    if (this.ctx) return this.ctx;
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return undefined;
    const ctx = new Ctor();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = this._muted ? 0 : 1;
    this.master.connect(ctx.destination);
    this.sfxBus = ctx.createGain();
    this.sfxBus.gain.value = 0.5;
    this.sfxBus.connect(this.master);
    this.musicBus = ctx.createGain();
    this.musicBus.gain.value = 0.32;
    this.musicBus.connect(this.master);

    const len = Math.floor(ctx.sampleRate * 0.25);
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return ctx;
  }

  private tone(out: AudioNode, type: OscillatorType, f: number, t: number, dur: number, vol: number, slideTo?: number) {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.005);
    g.gain.setValueAtTime(vol, t + dur * 0.6);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(out);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  private burst(out: AudioNode, t: number, dur: number, vol: number, highpass = 1000) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise!;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = highpass;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter).connect(g).connect(out);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  private scheduleMusic() {
    const ctx = this.ctx!;
    // 탭이 백그라운드였다가 돌아오면 밀린 음을 한꺼번에 내지 않고 건너뛴다.
    if (this.nextNoteTime < ctx.currentTime - 0.2) this.nextNoteTime = ctx.currentTime + 0.05;
    while (this.nextNoteTime < ctx.currentTime + 0.12) {
      this.playStep(this.step, this.nextNoteTime);
      const tr = TRACKS[this.song];
      this.nextNoteTime += 60 / tr.tempo / 2;
      this.step = (this.step + 1) % tr.melody.length;
    }
  }

  private playStep(step: number, t: number) {
    const out = this.musicBus!;
    const tr = TRACKS[this.song];
    const stepLen = 60 / tr.tempo / 2;
    const note = tr.melody[step];
    const inBar = step % tr.bar;
    const barIndex = Math.floor(step / tr.bar);
    const chord = tr.chords[barIndex % tr.chords.length];
    if (note !== '-' && note !== '.') {
      let len = 1;
      while (tr.melody[(step + len) % tr.melody.length] === '-' && len < 4) len++;
      if (tr.lead === 'box') {
        // 오르골: 맑은 삼각파 + 한 옥타브 위 작은 종소리
        this.pluck(out, 'triangle', freq(note), t, stepLen * len * 1.1 + 0.15, 0.2);
        this.pluck(out, 'sine', freq(note) * 2, t, 0.25, 0.06);
      } else {
        this.tone(out, 'square', freq(note), t, stepLen * len * 0.85, 0.09);
      }
    }
    const root = freq(chord[0]);
    if (tr.bass === 'every') {
      // 쉬지 않는 베이스: 근음과 한 옥타브 위를 번갈아
      this.pluck(out, 'triangle', inBar % 2 === 0 ? root : root * 2, t, stepLen * 0.9, 0.3);
    } else {
      const i = tr.bass.indexOf(inBar);
      // 통통 뜯는 베이스: 근음·5음을 번갈아(마디마다 순서도 바꿔서 단조롭지 않게)
      if (i >= 0) this.pluck(out, 'triangle', (i + barIndex) % 2 === 0 ? root : root * 1.5, t, 0.32, 0.3);
    }
    // 짝: 부드러운 짧은 화음
    if (tr.chord.includes(inBar)) {
      const wave: OscillatorType = tr.lead === 'box' ? 'triangle' : 'sawtooth';
      const vol = tr.lead === 'box' ? 0.05 : 0.02;
      chord.slice(1).forEach((n) => this.pluck(out, wave, freq(n), t, 0.12, vol));
    }
    if (tr.tick.includes(inBar)) this.burst(out, t, 0.025, tr.lead === 'box' ? 0.04 : 0.04, tr.lead === 'box' ? 6000 : 8000);
    if (tr.kick?.includes(inBar)) this.tone(out, 'sine', 150, t, 0.12, 0.35, 45);
    if (tr.snare?.includes(inBar)) this.burst(out, t, 0.08, 0.12, 1500);
    // 네 마디마다 가마솥 보글
    if (tr.bubble && step % (tr.bar * 4) === tr.bar * 4 - 1) {
      this.tone(out, 'sine', 300, t, 0.12, 0.05, 620);
      this.tone(out, 'sine', 360, t + 0.09, 0.1, 0.04, 720);
    }
  }

  /** 짧게 튕기는 소리(오르골·뜯는 베이스): 바로 커졌다가 서서히 줄어든다 */
  private pluck(out: AudioNode, type: OscillatorType, f: number, t: number, dur: number, vol: number) {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(out);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }
}

export const audio = new AudioManager();
