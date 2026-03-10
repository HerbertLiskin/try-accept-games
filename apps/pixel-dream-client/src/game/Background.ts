import * as PIXI from 'pixi.js';
import { SCROLL_SPEED } from './constants';

export class Background {
  private container: PIXI.Container;
  private bgSprite1: PIXI.Sprite | null = null;
  private bgSprite2: PIXI.Sprite | null = null;
  private app: PIXI.Application;

  constructor(app: PIXI.Application, container: PIXI.Container) {
    this.app = app;
    this.container = container;
  }

  async init() {
    const texture = await PIXI.Assets.load('/twilight_bg.png');
    this.bgSprite1 = new PIXI.Sprite(texture);
    this.bgSprite2 = new PIXI.Sprite(texture);

    // Scale to fill height
    const scale = this.app.screen.height / this.bgSprite1.height;
    this.bgSprite1.scale.set(scale);
    this.bgSprite2.scale.set(scale);

    this.bgSprite1.x = 0;
    this.bgSprite1.y = 0;
    
    this.bgSprite2.x = this.bgSprite1.width;
    this.bgSprite2.y = 0;

    this.container.addChild(this.bgSprite1);
    this.container.addChild(this.bgSprite2);
  }

  update(delta: PIXI.Ticker) {
    if (!this.bgSprite1 || !this.bgSprite2) return;

    this.bgSprite1.x -= SCROLL_SPEED * delta.deltaTime * 0.5; // Parallax effect
    this.bgSprite2.x -= SCROLL_SPEED * delta.deltaTime * 0.5;

    // Reset when off screen
    if (this.bgSprite1.x <= -this.bgSprite1.width) {
      this.bgSprite1.x = this.bgSprite2.x + this.bgSprite2.width;
    }
    if (this.bgSprite2.x <= -this.bgSprite2.width) {
      this.bgSprite2.x = this.bgSprite1.x + this.bgSprite1.width;
    }
  }
}
