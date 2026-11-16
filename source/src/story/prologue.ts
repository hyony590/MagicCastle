// 프롤로그 스토리 데이터. 대사·장면을 고치거나 늘릴 때는 이 파일만 고치면 된다.
// 화면(PrologueScreen) 하나는 여러 비트(PrologueBeat)로 나뉜다. 플레이어가 [다음]을 누를 때마다 비트가 하나씩 넘어가고,
// 화면의 마지막 비트에서 [다음]을 누르면 다음 화면으로 간다. 진행 표시는 화면 단위(1/6 ~ 6/6)다.
//
// 이야기 방향(이번 프롤로그에서는 드러내지 않는다):
// '행복의 축제'는 사실 마녀에게 바칠 희생자를 고르는 의식이고, 주민들은 그 사실을 알고 매년 투표해 왔다.
// 플레이어는 처음에는 모찌처럼 축제를 기대하다가, 마녀의 성을 탐험하며 조금씩 진실을 알게 된다.
// 성 안에서 발견할 복선(오래된 장부 등)은 document/01_game-planning/STORY.md에 정리해 두었다.

/** 장면 그림 종류. 그리는 방법은 scenes/PrologueScene.ts의 무대 그리기 함수에 있다. */
export type PrologueStage = 'village' | 'festival' | 'spotlight' | 'celebration' | 'chief' | 'departure';

/** 분위기. 글자·대사 상자 색과 타이핑 속도가 달라진다. */
export type PrologueMood = 'warm' | 'uneasy';

/** 비트가 화면에 나타날 때 무대에서 일어나는 일 */
export type PrologueCue =
  /** 주민들이 차례로 들썩이며 축하한다 */
  | 'cheer'
  /** 촌장이 모찌에게 다가온다 */
  | 'chiefEnters'
  /** 모찌가 잠시 고민한다(말줄임 풍선) */
  | 'mochiPonders'
  /** 모찌가 고개를 끄덕인다 */
  | 'mochiNods'
  /** 하늘이 어두워진다 */
  | 'dusk'
  /** 어둠 속에서 마을 쪽 눈빛들이 모찌를 지켜본다 */
  | 'watchers';

export interface PrologueLine {
  /** 말하는 사람. 없으면 내레이션 */
  speaker?: string;
  text: string;
}

export interface PrologueBeat {
  lines: PrologueLine[];
  cue?: PrologueCue;
}

export interface PrologueScreen {
  title: string;
  stage: PrologueStage;
  mood: PrologueMood;
  beats: PrologueBeat[];
}

const VILLAGER = '마을 주민';
const CHIEF = '촌장';

/** 내레이션 한 덩어리(줄마다 줄바꿈) */
const narration = (...lines: string[]): PrologueLine => ({ text: lines.join('\n') });

export const PROLOGUE: PrologueScreen[] = [
  {
    title: '평화로운 마을',
    stage: 'village',
    mood: 'warm',
    beats: [
      {
        lines: [
          narration('아주 먼 숲속에 작은 마을이 하나 있었습니다.', '그곳에는 다양한 동물들이 함께 살아가고 있었습니다.'),
        ],
      },
      { lines: [narration('마을에는 맛있는 음식이 가득했고, 주민들은 매일 행복한 하루를 보냈습니다.')] },
      { lines: [narration('적어도, 겉으로 보기에는 그랬습니다.')] },
    ],
  },
  {
    title: '행복의 축제',
    stage: 'festival',
    mood: 'warm',
    beats: [
      {
        lines: [
          narration('이 마을에는 매년 특별한 축제가 열렸습니다.', '주민들은 자신이 생각하는 가장 행복한 주민에게 투표했습니다.'),
        ],
      },
      {
        lines: [
          narration(
            '가장 많은 표를 받은 주민은 그해의 주인공이 되었고, 마을 모두를 위한 특별한 만찬을 준비할 영광을 얻었습니다.',
          ),
        ],
      },
      { lines: [narration('마을 사람들은 이 축제를 무척 기다렸습니다.')] },
    ],
  },
  {
    title: '올해의 주인공',
    stage: 'spotlight',
    mood: 'warm',
    beats: [
      {
        lines: [
          narration(
            '그리고 올해, 가장 많은 표를 받은 주민은 모찌였습니다.',
            '모찌는 마을에서 가장 뛰어난 요리사이자, 언제나 밝은 미소를 잃지 않는 토끼였습니다.',
          ),
        ],
      },
      { lines: [narration('마을 사람들은 모두 모찌를 좋아했습니다.', '모찌 역시 이 마을을 무척 사랑했습니다.')] },
    ],
  },
  {
    title: '축하의 순간',
    stage: 'celebration',
    mood: 'warm',
    beats: [
      {
        cue: 'cheer',
        lines: [
          { speaker: VILLAGER, text: '모찌! 축하해!' },
          { speaker: VILLAGER, text: '올해 만찬은 정말 기대되는걸!' },
          { speaker: VILLAGER, text: '역시 모찌가 뽑힐 줄 알았어!' },
        ],
      },
      {
        lines: [
          narration('모두가 모찌의 우승을 기뻐했습니다.', '모찌도 자신을 축하해 주는 사람들을 보며 행복해했습니다.'),
        ],
      },
      // 대사 없이 촌장이 다가오는 모습만 보여 준다.
      { cue: 'chiefEnters', lines: [] },
    ],
  },
  {
    title: '촌장의 부탁',
    stage: 'chief',
    mood: 'warm',
    beats: [
      {
        lines: [
          { speaker: CHIEF, text: '모찌, 올해 만찬에는 한 가지 특별한 재료가 필요하단다.' },
          { speaker: CHIEF, text: '그 재료는 숲 너머 마녀의 성에서만 구할 수 있지.' },
        ],
      },
      { lines: [{ speaker: CHIEF, text: '네가 직접 가져와 줄 수 있겠니?' }] },
      {
        cue: 'mochiPonders',
        lines: [
          {
            speaker: CHIEF,
            text: '마을 모두가 기다리는 만찬이잖니. 네 요리 실력이라면 분명 최고의 요리를 만들 수 있을 거야.',
          },
        ],
      },
      {
        cue: 'mochiNods',
        lines: [
          narration('모찌는 잠시 생각에 잠겼지만, 이내 고개를 끄덕였습니다.', '마을 사람들을 위한 특별한 만찬을 준비하고 싶었으니까요.'),
        ],
      },
    ],
  },
  {
    title: '마녀의 성으로',
    stage: 'departure',
    mood: 'uneasy',
    beats: [
      { lines: [narration('그렇게 모찌는 마녀의 성을 향해 길을 떠났습니다.', '마을 사람들의 기대를 한 몸에 안고서.')] },
      { cue: 'dusk', lines: [narration('하지만 모찌는 아직 알지 못했습니다.', '자신이 왜 올해의 주인공으로 선정되었는지.')] },
      { cue: 'watchers', lines: [narration('그리고 마을 사람들이 자신에게 보낸 그 수많은 축하가 어떤 의미였는지.')] },
    ],
  },
];
