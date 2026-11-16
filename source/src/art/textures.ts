import Phaser from 'phaser';
import { PALETTE, SCALE, SPRITES } from './sprites';

/** sprites.ts의 픽셀 지도를 Phaser 텍스처로 만든다. 게임 시작 때 한 번 부른다.
 *  PNG로 바꾸고 싶으면 BootScene.preload에서 같은 키로 this.load.image(키, 경로)를 하고
 *  아래 생성에서 그 키를 건너뛰면 된다. */
export function createTextures(scene: Phaser.Scene) {
  for (const [key, rows] of Object.entries(SPRITES)) {
    if (scene.textures.exists(key)) continue;
    const width = Math.max(...rows.map((r) => r.length));
    const data = rows.map((r) => r.padEnd(width, '.'));
    // Phaser의 Palette 타입은 0~F 글자만 정의돼 있지만, 실제로는 아무 글자나 색으로 쓸 수 있다.
    const palette = PALETTE as unknown as Phaser.Types.Create.Palette;
    scene.textures.generate(key, { data, pixelWidth: SCALE, palette });
  }
}
