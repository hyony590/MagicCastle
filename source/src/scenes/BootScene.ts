import Phaser from 'phaser';
import { createBackgroundTextures } from '../art/background';
import { applySpritePngs, preloadSpritePngs } from '../art/pngSprites';
import { createTextures } from '../art/textures';
import { loadFonts } from '../ui/text';

/** 그림(텍스처)을 준비하고 타이틀로 넘어간다. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    preloadSpritePngs(this);
  }

  create() {
    // PNG 그림을 먼저 등록하고, PNG가 없는 그림만 코드로 그린다.
    applySpritePngs(this);
    createTextures(this);
    createBackgroundTextures(this);
    // 픽셀 글꼴을 다 불러온 뒤 타이틀로 넘어간다(먼저 그리면 기본 글꼴로 그려진다).
    void loadFonts().then(() => this.scene.start('Title'));
  }
}
