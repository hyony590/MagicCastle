import Phaser from 'phaser';
import { SCALE, SPRITES } from './sprites';

/** src/assets/sprites/*.png 그림 파일. 파일 이름(확장자 뺀 것)이 텍스처 키다(예: mochi_idle.png → mochi_idle).
 *  파일이 있으면 그 그림을 쓰고, 없으면 sprites.ts의 코드 그림을 쓴다.
 *  그림 크기는 둘 중 하나로 그린다:
 *   - 원본 크기(예: 모찌 14×20) → SCALE배로 키워서 쓴다.
 *   - 화면 크기(예: 모찌 28×40) → 그대로 쓴다. 더 세밀하게 그리고 싶을 때. */
const FILES = import.meta.glob<string>('../assets/sprites/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
});

const PNG_SPRITES = Object.entries(FILES).map(([path, url]) => ({
  key: path.slice(path.lastIndexOf('/') + 1, -'.png'.length),
  url,
}));

/** 불러온 원본 PNG를 잠깐 담아 두는 키. 키운 그림을 진짜 키로 만든 뒤 지운다. */
const rawKey = (key: string) => `png:${key}`;

/** BootScene.preload에서 부른다. */
export function preloadSpritePngs(scene: Phaser.Scene) {
  for (const { key, url } of PNG_SPRITES) scene.load.image(rawKey(key), url);
}

/** BootScene.create에서 createTextures보다 먼저 부른다. PNG를 화면 크기로 키워 원래 키로 등록한다. */
export function applySpritePngs(scene: Phaser.Scene) {
  for (const { key } of PNG_SPRITES) {
    const raw = rawKey(key);
    if (!scene.textures.exists(raw)) continue; // 불러오기 실패 → 코드 그림으로
    const img = scene.textures.get(raw).getSourceImage() as HTMLImageElement;

    // 화면에 그려야 할 폭: 코드 그림이 있으면 그 폭 × SCALE, 새 그림이면 PNG 폭 × SCALE
    const rows = SPRITES[key];
    const targetWidth = (rows ? Math.max(...rows.map((r) => r.length)) : img.width) * SCALE;
    let factor = targetWidth / img.width;
    if (!Number.isInteger(factor) || factor < 1) {
      console.warn(
        `[그림] ${key}.png 폭 ${img.width}px: 원본 ${targetWidth / SCALE}px 또는 화면 ${targetWidth}px로 그려야 크기가 맞습니다. 지금은 그대로 씁니다.`,
      );
      factor = 1;
    }

    const w = img.width * factor;
    const h = img.height * factor;
    const canvas = scene.textures.createCanvas(key, w, h);
    if (!canvas) continue;
    canvas.context.imageSmoothingEnabled = false; // 픽셀을 뭉개지 않고 그대로 키운다
    canvas.context.drawImage(img, 0, 0, w, h);
    canvas.refresh();
    scene.textures.remove(raw);
  }
}
