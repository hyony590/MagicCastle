import Phaser from 'phaser';
import { createBackgroundTextures } from '../art/background';
import { createTextures } from '../art/textures';
import { loadFonts } from '../ui/text';

/** 그림(텍스처)을 준비하고 타이틀로 넘어간다. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    createTextures(this);
    createBackgroundTextures(this);
    // 픽셀 글꼴을 다 불러온 뒤 타이틀로 넘어간다(먼저 그리면 기본 글꼴로 그려진다).
    void loadFonts().then(() => this.scene.start('Title'));
  }
}
