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
  | 'bossDown';

const MUTE_KEY = 'castle-climber:muted';

/** 'A4', 'C#5', 'Bb3' 같은 음 이름을 주파수로 바꾼다. */
function freq(note: string): number {
  const m = /^([A-G])([#b]?)(\d)$/.exec(note);
  if (!m) throw new Error(`음 이름 오류: ${note}`);
  const base: Record<string, number> = { C: -9, D: -7, E: -5, F: -4, G: -2, A: 0, B: 2 };
  const semis = base[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (Number(m[3]) - 4) * 12;
  return 440 * Math.pow(2, semis / 12);
}

// ── 배경음악: 오리지널 8마디 반복곡 (8분음표 64칸, '-'는 앞 음 유지 또는 쉼) ──
const TEMPO = 144;
const STEP = 60 / TEMPO / 2;
const MELODY = [
  'E5', '-', 'C5', 'D5', 'E5', '-', 'A4', '-',
  'G5', '-', 'F5', 'E5', 'D5', '-', '-', '-',
  'F5', '-', 'D5', 'E5', 'F5', '-', 'B4', '-',
  'E5', 'D5', 'C5', 'B4', 'A4', '-', '-', '-',
  'A4', 'C5', 'E5', 'A5', 'G5', 'E5', 'C5', 'E5',
  'F5', '-', 'E5', 'D5', 'E5', '-', '-', '-',
  'D5', 'F5', 'A5', 'F5', 'E5', 'D5', 'C5', 'B4',
  'A4', '-', 'E4', '-', 'A4', '-', '-', '-',
];
/** 마디마다 [근음, 5음]. 4분음표로 번갈아 친다. */
const BASS: [string, string][] = [
  ['A2', 'E3'], ['G2', 'D3'], ['F2', 'C3'], ['E2', 'B2'],
  ['A2', 'E3'], ['D3', 'A3'], ['G2', 'D3'], ['A2', 'E3'],
];

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
    }
  }

  startMusic() {
    const ctx = this.ensure();
    if (!ctx || this.musicTimer !== undefined) return;
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
      this.nextNoteTime += STEP;
      this.step = (this.step + 1) % MELODY.length;
    }
  }

  private playStep(step: number, t: number) {
    const out = this.musicBus!;
    const note = MELODY[step];
    if (note !== '-') {
      let len = 1;
      while (MELODY[(step + len) % MELODY.length] === '-' && len < 4) len++;
      this.tone(out, 'square', freq(note), t, STEP * len * 0.9, 0.11);
    }
    if (step % 2 === 0) {
      const [root, fifth] = BASS[Math.floor(step / 8)];
      this.tone(out, 'triangle', freq(step % 4 === 0 ? root : fifth), t, STEP * 1.8, 0.28);
    }
    if (step % 2 === 1) this.burst(out, t, 0.03, 0.05, 7000);
  }
}

export const audio = new AudioManager();
