import * as PIXI from 'pixi.js';
import { SCROLL_SPEED } from './constants';

export class Background {
  private container: PIXI.Container;
  private bgTilingSprite: PIXI.TilingSprite | null = null;
  private app: PIXI.Application;

  constructor(app: PIXI.Application, container: PIXI.Container) {
    this.app = app;
    this.container = container;
  }

  async init() {
    const texture = await PIXI.Assets.load('/twilight_bg.png');
    this.bgTilingSprite = new PIXI.TilingSprite({
      texture,
      width: this.app.screen.width,
      height: this.app.screen.height
    });
    this.resize();
    this.container.addChild(this.bgTilingSprite);
  }

  resize() {
    if (!this.bgTilingSprite) return;
    
    const texture = this.bgTilingSprite.texture;
    // Fit to height to avoid "overstretched" vertically
    const scale = this.app.screen.height / texture.height;

    this.bgTilingSprite.scale.set(scale);
    
    // Cover the full width by tiling (since it's a TilingSprite)
    this.bgTilingSprite.width = this.app.screen.width / scale;
    // Height stays matched to texture height (via scale)
    this.bgTilingSprite.height = texture.height;
  }

  update(delta: PIXI.Ticker, multiplier: number = 1) {
    if (!this.bgTilingSprite) return;

    // Move the tile position to create the parallax effect
    this.bgTilingSprite.tilePosition.x -= SCROLL_SPEED * delta.deltaTime * 0.5 * multiplier;
  }
}
