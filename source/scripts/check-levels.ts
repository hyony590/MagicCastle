// 모든 레벨 데이터를 검사한다: npm run check:levels
import { LEVELS, validateLevel } from '../src/levels';

let failed = 0;
LEVELS.forEach((level, i) => {
  const problems = validateLevel(level, i);
  if (problems.length === 0) {
    console.log(`OK    LEVEL ${i + 1} ${level.name} (아이템 ${level.items.length}개, 몬스터 ${level.enemies.length}마리)`);
  } else {
    failed++;
    console.log(`문제  LEVEL ${i + 1} ${level.name}`);
    problems.forEach((p) => console.log(`      - ${p}`));
  }
});
if (failed > 0) process.exit(1);
