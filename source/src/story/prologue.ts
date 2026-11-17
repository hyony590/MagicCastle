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

export const PROLOGUE: PrologueScreen[] = [
  // ───────── 첫 장면: 그날 밤 성문 앞 ─────────
  {
    title: '그날 밤',
    stage: 'gate',
    mood: 'uneasy',
    enter: 'slow',
    beats: [
      { shot: 'reveal', letterbox: true, lines: [narration('그날 밤, 모찌는 마녀의 성 앞에 서 있었습니다.')] },
      {
        cue: 'gateGlow',
        shot: 'gateDoor',
        letterbox: true,
        lines: [narration('굳게 닫힌 문 너머에서', '무언가가 모찌를 기다리고 있었습니다.')],
      },
      { shot: 'wide', lines: [narration('모든 것은 일주일 전,', '행복의 축제에서 시작되었습니다.')] },
    ],
  },

  // ───────── 제1장 평화로운 마을 ─────────
  {
    title: '평화로운 마을',
    stage: 'village',
    mood: 'warm',
    chapter: { no: '제1장', name: '평화로운 마을' },
    enter: 'white',
    beats: [
      {
        cue: 'villagersArrive',
        shot: 'crane',
        lines: [
          narration(
            '아주 먼 숲속에 작은 마을이 하나 있었습니다.',
            '그곳에는 다양한 동물들이 함께 살아가고 있었습니다.',
            '마을에는 맛있는 음식이 가득했고, 주민들은 매일 행복한 하루를 보냈습니다.',
          ),
        ],
      },
      {
        cue: 'mochiGreets',
        shot: 'closeMochi',
        lines: [say(MOCHI, '좋은 아침이에요, 여러분!'), say(DUBU, '모찌다! 오늘은 무슨 요리를 하니?')],
      },
    ],
  },
  {
    title: '모두가 사랑한 모찌',
    stage: 'beloved',
    mood: 'warm',
    beats: [
      { shot: 'wide', lines: [narration('마을 사람들은 모두 모찌를 좋아했습니다.', '모찌 역시 이 마을을 무척 사랑했습니다.')] },
      { cue: 'whisper', shot: 'whisper', lines: [say(NABI, '올해 축제는… 역시 모찌겠지?'), say(KONGI, '쉿! 모찌가 듣겠어.')] },
      { cue: 'heartRise', shot: 'sky', lines: [narration('그리고 며칠 뒤,', '마을에 축제의 밤이 찾아왔습니다.')] },
    ],
  },

  // ───────── 제2장 행복의 축제 ─────────
  {
    title: '행복의 축제',
    stage: 'festival',
    mood: 'warm',
    chapter: { no: '제2장', name: '행복의 축제' },
    beats: [
      {
        shot: 'crane',
        lines: [
          narration(
            '이 마을에는 매년 특별한 축제가 열렸습니다.',
            '주민들은 자신이 생각하는 가장 행복한 주민에게 투표했습니다.',
            '가장 많은 표를 받은 주민은 그해의 주인공이 되었고',
            '마을 모두를 위한 특별한 만찬을 준비할 영광을 얻었습니다.',
          ),
        ],
      },
      { cue: 'mochiVotes', shot: 'ballot', lines: [narration('모찌도 두근거리는 마음으로 한 표를 넣었습니다.')] },
      { cue: 'allStare', shot: 'closeMochi', lines: [say(MOCHI, '…응? 다들 왜 그래?', 'mochiPuzzled'), say(DUBU, '아, 아무것도 아니야! 하하…')] },
    ],
  },
  {
    title: '올해의 주인공',
    stage: 'spotlight',
    mood: 'warm',
    enter: 'cut',
    beats: [
      { cue: 'drumroll', shot: 'wide', lines: [say(CHIEF, '올해 행복의 축제, 그 주인공은…')] },
      { cue: 'spotOn', shot: 'closeMochi', lines: [say(CHIEF, '모찌!'), say(MOCHI, '저, 저요?')] },
      {
        shot: 'wide',
        lines: [narration('모찌는 마을에서 가장 뛰어난 요리사이자', '언제나 밝은 미소를 잃지 않는 토끼였습니다.', '객석에서 커다란 박수가 쏟아졌습니다.')],
      },
    ],
  },
  {
    title: '축하의 순간',
    stage: 'celebration',
    mood: 'warm',
    beats: [
      {
        cue: 'cheer',
        shot: 'wide',
        lines: [say(DUBU, '모찌! 축하해!'), say(NABI, '올해 만찬은 정말 기대되는걸!'), say(KONGI, '역시 모찌가 뽑힐 줄 알았어!')],
      },
      {
        cue: 'chiefEnters',
        shot: 'followChief',
        lines: [say(CHIEF, '모찌, 만찬에는 언제나 특별한 재료가 필요하단다.'), say(CHIEF, '그 재료는 숲 너머 마녀의 성에서만 구할 수 있지.')],
      },
      { cue: 'chiefBeckons', shot: 'twoShot', lines: [say(CHIEF, '잠깐, 나랑 둘이서 이야기 좀 할까?')] },
    ],
  },
  {
    title: '촌장의 부탁',
    stage: 'chief',
    mood: 'warm',
    enter: 'slow',
    beats: [
      { cue: 'chiefSinister', shot: 'closeChief', letterbox: true, lines: [say(CHIEF, '네가 직접 가져와 줄 수 있겠니?', 'chiefSly')] },
      { cue: 'mochiAsks', shot: 'closeMochi', lines: [say(MOCHI, '마녀의 성이요…?', 'mochiSad')] },
      {
        cue: 'mochiPonders',
        shot: 'twoShot',
        lines: [say(CHIEF, '마을 모두가 기다리는 만찬이잖니.'), say(CHIEF, '네 요리 실력이라면 분명 최고의 요리를 만들 수 있을 거야.')],
      },
      {
        cue: 'mochiNods',
        shot: 'wide',
        lines: [narration('모찌는 잠시 생각에 잠겼지만, 이내 고개를 끄덕였습니다.', '마을 사람들을 위한 특별한 만찬을 준비하고 싶었으니까요.')],
      },
    ],
  },

  // ───────── 제3장 마녀의 성으로 ─────────
  {
    title: '떠나는 날',
    stage: 'farewell',
    mood: 'warm',
    chapter: { no: '제3장', name: '마녀의 성으로' },
    beats: [
      { cue: 'waving', shot: 'wide', lines: [narration('다음 날 해 질 녘,', '마을 사람들이 모두 나와 모찌를 배웅했습니다.')] },
      { shot: 'closeMochi', lines: [say(MOCHI, '다녀올게요! 최고의 재료를 꼭 구해 올게요!'), say(DUBU, '조심해서 다녀와, 모찌!')] },
      { cue: 'mochiLeaves', shot: 'crowd', lines: [narration('모찌의 모습이 길 끝으로 사라지자,', '주민들은 하나둘 손을 내렸습니다.')] },
    ],
  },
  {
    title: '숲 너머로',
    stage: 'departure',
    mood: 'uneasy',
    beats: [
      {
        cue: 'dusk',
        shot: 'pushIn',
        lines: [narration('그렇게 모찌는 마녀의 성을 향해 길을 떠났습니다.', '마을 사람들의 기대를 한 몸에 안고서.')],
      },
    ],
  },

  // ───────── 다시 성문 앞: 문이 열리고 게임이 시작된다 ─────────
  {
    title: '마녀의 성',
    stage: 'gate',
    mood: 'uneasy',
    enter: 'slow',
    beats: [
      { cue: 'gateArrive', shot: 'reveal', letterbox: true, lines: [narration('그리고 지금, 모찌는 그 문 앞에 서 있습니다.')] },
      { cue: 'gateGlow', shot: 'gateDoor', letterbox: true, lines: [say(MOCHI, '실례합니다…! 만찬 재료를 받으러 왔어요!', 'mochiPuzzled')] },
      { cue: 'gateOpens', shot: 'gateDoor', letterbox: true, lines: [narration('끼이익—', '육중한 문이 천천히 열렸습니다.')] },
      { shot: 'wide', titleDrop: true, lines: [narration('모찌의 모험이 시작됩니다.')] },
    ],
  },
];
