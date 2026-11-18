// 프롤로그 스토리 데이터. 대사·장면을 고치거나 늘릴 때는 이 파일만 고치면 된다.
// 화면(PrologueScreen) 하나는 여러 비트(PrologueBeat)로 나뉜다. 플레이어가 [다음]을 누를 때마다 비트가 하나씩 넘어가고,
// 화면의 마지막 비트에서 [다음]을 누르면 다음 화면으로 간다. 진행 표시는 화면 단위(1 / 화면 수)다.
//
// 구성: 성문 앞(한밤) → "일주일 전" → 1장 평화로운 마을 → 2장 행복의 축제 → 3장 마녀의 성으로 → 다시 성문 앞 → 타이틀.
// 처음 본 성문 장면으로 돌아와 문이 열리며 게임이 시작된다.
//
// 이야기 방향(이번 프롤로그에서는 드러내지 않는다):
// '행복의 축제'는 사실 마녀에게 바칠 희생자를 고르는 의식이고, 주민들은 그 사실을 알고 매년 투표해 왔다.
// 플레이어는 처음에는 모찌처럼 축제를 기대하다가, 마녀의 성을 탐험하며 조금씩 진실을 알게 된다.
// 프롤로그에는 눈치챌 사람만 눈치채는 작은 틈(속삭임, 일제히 쳐다보는 눈, 내려가는 손)만 남긴다.
// 성 안에서 발견할 복선(오래된 장부 등)은 document/01_game-planning/STORY.md에 정리해 두었다.

/** 장면 그림 종류. 그리는 방법은 scenes/prologueStage.ts의 무대 그리기 함수에 있다. */
export type PrologueStage =
  | 'gate'
  | 'village'
  | 'beloved'
  | 'festival'
  | 'spotlight'
  | 'celebration'
  | 'chief'
  | 'farewell'
  | 'departure';

/** 분위기. 글자·대사 상자 색과 타이핑 속도가 달라진다. */
export type PrologueMood = 'warm' | 'uneasy';

/** 비트가 화면에 나타날 때 무대에서 일어나는 일 */
export type PrologueCue =
  /** 성문 틈으로 초록 불빛이 새어 나오며 일렁인다 */
  | 'gateGlow'
  /** 모찌가 길 아래에서 걸어 올라와 성문 앞에 선다 */
  | 'gateArrive'
  /** 성문이 천천히 열리고 초록 빛이 쏟아진다 */
  | 'gateOpens'
  /** 주민들이 집에서 나오거나 길 끝에서 걸어와 한두 명씩 모인다 */
  | 'villagersArrive'
  /** 모찌가 집에서 나와 주민들에게 인사한다 */
  | 'mochiGreets'
  /** 하트 주고받기가 멈추고, 고양이와 생쥐가 소곤거린다 */
  | 'whisper'
  /** 하트 하나가 하늘로 떠오른다(다음 화면 축제 하늘로 이어진다) */
  | 'heartRise'
  /** 모찌가 투표함에 하트를 넣는다 */
  | 'mochiVotes'
  /** 주민들이 일제히 모찌를 쳐다본다 */
  | 'allStare'
  /** 무대가 캄캄해지고 조명이 이리저리 훑는다 */
  | 'drumroll'
  /** 조명이 모찌를 비추고 꽃가루가 쏟아진다 */
  | 'spotOn'
  /** 주민들이 차례로 들썩이며 축하한다 */
  | 'cheer'
  /** 촌장이 모찌에게 다가온다 */
  | 'chiefEnters'
  /** 주변이 어두워지고 촌장과 모찌만 남는다 */
  | 'chiefBeckons'
  /** 촌장 혼자 나와(모찌 없음) 음흉한 얼굴에 그늘이 진다. 다음 비트(다른 cue)에서 원래 얼굴로 돌아온다 */
  | 'chiefSinister'
  /** 모찌가 나타나 되묻는다 */
  | 'mochiAsks'
  /** 모찌가 잠시 고민한다(말줄임 풍선) */
  | 'mochiPonders'
  /** 모찌가 고개를 끄덕인다 */
  | 'mochiNods'
  /** 주민들이 손을 흔들며 배웅한다 */
  | 'waving'
  /** 모찌가 길 끝으로 떠나고, 주민들은 손을 내리고 가만히 선다 */
  | 'mochiLeaves'
  /** 하늘이 어두워진다 */
  | 'dusk'
  /** 어둠 속에서 마을 쪽 눈빛들이 모찌를 지켜본다 */
  | 'watchers';

/** 카메라(무대를 보여 주는 구도). 이름별 구도는 prologueStage.ts의 shot()에 있다. */
export type PrologueShot =
  /** 무대 전체 */
  | 'wide'
  /** 하늘에서 천천히 내려와 무대 전체로 */
  | 'crane'
  /** 하늘로 천천히 올라간다 */
  | 'sky'
  /** 아주 천천히 앞으로 다가간다 */
  | 'pushIn'
  /** 인물 뒷모습에서 시작해 뒤로 물러나며 전체를 드러낸다 */
  | 'reveal'
  /** 성문으로 다가간다 */
  | 'gateDoor'
  /** 모찌를 크게 */
  | 'closeMochi'
  /** 촌장 얼굴을 아주 크게 */
  | 'closeChief'
  /** 촌장과 모찌 두 사람 */
  | 'twoShot'
  /** 소곤거리는 두 주민 */
  | 'whisper'
  /** 투표함 */
  | 'ballot'
  /** 들어오는 촌장을 따라간다 */
  | 'followChief'
  /** 남은 주민들 */
  | 'crowd';

/** 대사창 왼쪽 얼굴 그림. 없으면 말하는 사람의 기본 얼굴(모찌는 웃는 얼굴) */
export type PrologueFace = 'mochi' | 'mochiPuzzled' | 'mochiSad' | 'chief' | 'chiefSly' | 'bear' | 'cat' | 'mouse';

export interface PrologueLine {
  /** 말하는 사람. 없으면 내레이션 */
  speaker?: string;
  text: string;
  /** 이 대사의 표정(이름표에 나온 사람의 첫 대사 표정이 얼굴 그림으로 나온다) */
  face?: PrologueFace;
}

export interface PrologueBeat {
  lines: PrologueLine[];
  cue?: PrologueCue;
  /** 카메라 구도. 없으면 앞 비트의 구도를 그대로 둔다(새 화면은 전체). */
  shot?: PrologueShot;
  /** 영화처럼 화면 위아래에 검은 띠를 내린다 */
  letterbox?: boolean;
  /** 무대 위에 게임 제목을 크게 띄운다 */
  titleDrop?: boolean;
}

/** 화면이 나타나는 방식. 기본은 'fade' */
export type PrologueEnter = 'fade' | 'white' | 'cut' | 'slow';

export interface PrologueScreen {
  title: string;
  stage: PrologueStage;
  mood: PrologueMood;
  /** 장이 시작되는 화면이면 화면 전에 장 제목 카드를 보여 준다 */
  chapter?: { no: string; name: string };
  enter?: PrologueEnter;
  beats: PrologueBeat[];
}

// 등장인물 이름(이름표에 나온다)
export const MOCHI = '모찌';
export const CHIEF = '촌장';
/** 곰 */
export const DUBU = '두부';
/** 고양이 */
export const NABI = '나비';
/** 생쥐 */
export const KONGI = '콩이';

/** 내레이션 한 덩어리(줄마다 줄바꿈) */
const narration = (...lines: string[]): PrologueLine => ({ text: lines.join('\n') });
const say = (speaker: string, text: string, face?: PrologueFace): PrologueLine => ({ speaker, text, face });

const SCRIPT: PrologueScreen[] = [
  // ───────── 1. 마녀의 성: 성문 앞 (이야기의 시작) ─────────
  {
    title: '마녀의 성',
    stage: 'gate',
    mood: 'uneasy',
    enter: 'slow',
    beats: [
      { cue: 'gateArrive', shot: 'reveal', letterbox: true, lines: [narration('깊은 숲속, 모찌는 거대한 성문 앞에 도착했습니다.')] },
      { shot: 'wide', lines: [narration('모든 것은 일주일 전, 행복의 축제에서 시작되었습니다.')] },
    ],
  },

  // ───────── 2. 평화로운 마을 (제1장) ─────────
  {
    title: '평화로운 마을',
    stage: 'village',
    mood: 'warm',
    chapter: { no: '제1장', name: '평화로운 마을' },
    enter: 'white',
    beats: [
      { cue: 'villagersArrive', shot: 'crane', lines: [narration('아주 먼 숲속에는 다양한 동물들이 모여 사는 작은 마을이 있었습니다.')] },
      { cue: 'mochiGreets', shot: 'closeMochi', lines: [say(MOCHI, '좋은 아침이에요, 여러분!')] },
      { shot: 'wide', lines: [say(DUBU, '어서 와, 모찌! 오늘은 무슨 요리를 할 거야?')] },
      { shot: 'closeMochi', lines: [say(MOCHI, '오늘은 맛있는 파이를 만들 거예요!')] },
    ],
  },

  // ───────── 3. 행복의 축제: 투표와 발표 ─────────
  {
    title: '행복의 축제',
    stage: 'festival',
    mood: 'warm',
    beats: [
      { shot: 'crane', lines: [narration('마을에서는 매년 행복의 축제가 열렸습니다.')] },
      { shot: 'ballot', lines: [narration('주민들의 투표로 가장 많은 표를 받은 주민은', '그해의 주인공이 되었습니다.')] },
      { cue: 'drumroll', shot: 'wide', lines: [narration('그리고 올해의 주인공은…')] },
      { cue: 'spotOn', shot: 'closeMochi', lines: [say(CHIEF, '바로 모찌입니다!')] },
      { shot: 'closeMochi', lines: [say(MOCHI, '제가요? 정말 기뻐요!')] },
    ],
  },

  // ───────── 4. 특별한 만찬: 축하와 촌장의 부탁 ─────────
  {
    title: '특별한 만찬',
    stage: 'celebration',
    mood: 'warm',
    beats: [
      { cue: 'cheer', shot: 'crowd', lines: [say(DUBU, '모찌! 축하해!')] },
      { shot: 'wide', lines: [say(NABI, '올해 만찬도 기대되는걸!')] },
      { shot: 'closeMochi', lines: [say(MOCHI, '고마워요! 모두를 위해 맛있는 요리를 만들게요!')] },
      { cue: 'chiefEnters', shot: 'closeChief', lines: [say(CHIEF, '올해도 특별한 만찬을 준비해야겠구나.')] },
      { shot: 'closeChief', lines: [say(CHIEF, '만찬에 필요한 특별한 재료는 예년처럼 마녀의 성에서 구해야 한단다.')] },
      { cue: 'chiefBeckons', shot: 'twoShot', lines: [say(MOCHI, '마녀의 성이요?')] },
      { shot: 'closeChief', lines: [say(CHIEF, '그래. 네가 직접 다녀와 줄 수 있겠니?')] },
      { shot: 'closeMochi', lines: [say(MOCHI, '알겠어요! 제가 꼭 구해 올게요!')] },
    ],
  },

  // ───────── 5. 떠나는 날: 마을 사람들의 배웅 ─────────
  {
    title: '떠나는 날',
    stage: 'farewell',
    mood: 'warm',
    beats: [
      { cue: 'waving', shot: 'wide', lines: [narration('다음 날, 모찌는 마녀의 성으로 떠날 준비를 마쳤습니다.')] },
      { shot: 'crowd', lines: [say(DUBU, '조심해서 다녀와, 모찌!')] },
      { shot: 'closeMochi', lines: [say(MOCHI, '걱정 마세요! 금방 다녀올게요!')] },
      { cue: 'mochiLeaves', shot: 'crowd', lines: [narration('모찌는 마을 사람들에게 손을 흔들고 숲속으로 향했습니다.')] },
    ],
  },

  // ───────── 6. 마녀의 성: 다시 성문 앞 (문이 열린다) ─────────
  {
    title: '마녀의 성',
    stage: 'gate',
    mood: 'uneasy',
    enter: 'slow',
    beats: [
      { cue: 'gateArrive', shot: 'reveal', letterbox: true, lines: [narration('그리고 다시, 마녀의 성.')] },
      { cue: 'gateGlow', shot: 'gateDoor', letterbox: true, lines: [say(MOCHI, '실례합니다! 만찬에 필요한 재료를 구하러 왔어요!', 'mochiPuzzled')] },
      { cue: 'gateOpens', shot: 'gateDoor', letterbox: true, lines: [narration('잠시 후, 끼이익——')] },
      { shot: 'wide', titleDrop: true, lines: [narration('굳게 닫혀 있던 성문이 천천히 열리기 시작했습니다.')] },
    ],
  },
];

/**
 * 한 비트 안에서 말하는 사람이 바뀌면 비트를 나눈다.
 * 그래서 한 화면에는 한 사람의 대사(또는 내레이션)만 나온다. 나눠진 조각들은 Enter를 누를 때마다 차례로 나온다.
 * 카메라 구도(shot)와 연출(cue)은 첫 조각에만 두고, 띠(letterbox)와 제목(titleDrop)은 조각마다 이어 준다.
 */
function splitBySpeaker(beats: PrologueBeat[]): PrologueBeat[] {
  const out: PrologueBeat[] = [];
  for (const beat of beats) {
    const groups: PrologueLine[][] = [];
    for (const line of beat.lines) {
      const last = groups[groups.length - 1];
      if (last && last[0].speaker === line.speaker) last.push(line);
      else groups.push([line]);
    }
    if (groups.length === 0) {
      out.push(beat);
      continue;
    }
    groups.forEach((lines, i) => {
      out.push({ ...beat, lines, cue: i === 0 ? beat.cue : undefined, shot: i === 0 ? beat.shot : undefined });
    });
  }
  return out;
}

/** 실제로 게임이 쓰는 프롤로그. 대사 데이터는 SCRIPT에 적고, 여기서 화자별로 나눈다. */
export const PROLOGUE: PrologueScreen[] = SCRIPT.map((s) => ({ ...s, beats: splitBySpeaker(s.beats) }));
