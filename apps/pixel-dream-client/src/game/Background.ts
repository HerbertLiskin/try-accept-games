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
    
    // Scale to fill height
    const scale = this.app.screen.height / texture.height;

    // Create a TilingSprite that covers the entire width of the screen, 
    // and is tall enough to match the scaled texture height
    this.bgTilingSprite = new PIXI.TilingSprite({
      texture,
      width: this.app.screen.width,
      height: texture.height
    });

    this.bgTilingSprite.scale.set(scale);
    
    // Since we scaled it, we want the tiling width to effectively cover the screen width independently of the scale
    // So we adjust the requested width dividing by the scale
    this.bgTilingSprite.width = this.app.screen.width / scale;

    this.container.addChild(this.bgTilingSprite);
  }

  update(delta: PIXI.Ticker, multiplier: number = 1) {
    if (!this.bgTilingSprite) return;

    // Move the tile position to create the parallax effect
    this.bgTilingSprite.tilePosition.x -= SCROLL_SPEED * delta.deltaTime * 0.5 * multiplier;
  }
}
