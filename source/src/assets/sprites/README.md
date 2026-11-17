# 게임 그림(PNG)

이 폴더의 `<키>.png` 파일이 게임 그림으로 쓰입니다. 파일을 고쳐 같은 이름으로 저장하면 게임에 바로 반영됩니다(`npm run dev` 중이면 새로고침).

- 파일을 지우면 `src/art/sprites.ts`의 코드 그림으로 돌아갑니다.
- 크기는 둘 중 하나로 그립니다.
  - **원본 크기**(지금 파일 크기, 예: 모찌 14×20): 게임이 2배로 키워 씁니다.
  - **화면 크기**(원본의 2배, 예: 모찌 28×40): 그대로 씁니다. 더 세밀하게 그리고 싶을 때 씁니다.
- 배경은 투명으로 둡니다. 발끝은 그림 맨 아래 줄에 맞춥니다.
- 걷기 1·2처럼 짝을 이루는 그림은 크기를 똑같이 맞춥니다.

| 그림 | 원본 크기 | 파일 |
|---|---|---|
| 모찌 | 14×20 | `mochi_idle`, `mochi_walk1`, `mochi_walk2`, `mochi_jump`, `mochi_climb`, `mochi_front`, `mochi_happy`, `mochi_sad` |
| 마녀(정면·먹기) | 20×24 | `witch_front`, `witch_eat1`, `witch_eat2` |
| 마녀(보스) | 32×32 | `witch` |
| 몬스터 | 13×24 | `pot`, `carrot`, `onion`, `milk`, `salt`, `broccoli`, `toaster` 각각 `_walk1`, `_walk2` |
| 케이크 | 20×18 | `cake`, `cake_eaten` |
| 아이템 | 10×10 | `item_apple`, `item_gem`, `item_coin` |
| 부츠 | 12×9 | `item_boots` |
| 글자 쿠키 | 14×14, 10×9 | `letter_cookie`, `letter_cookie_s` |
| 상자 | 14×10 | `chest_closed`, `chest_open` |
| 불꽃 | 9×11 | `flame1`, `flame2` |
| 발판 블록 | 16×16 | `block` |
| 기타 | 5×5, 8×8 | `dizzy_star`, `dough` |

코드 그림(`sprites.ts`)을 고친 뒤 PNG로 다시 뽑으려면 `npm run export:sprites -- --force`를 실행합니다. 직접 고친 PNG도 덮어쓰니 주의하세요. `--force` 없이 실행하면 없는 파일만 새로 만듭니다.
