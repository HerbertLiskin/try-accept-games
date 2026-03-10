import * as PIXI from 'pixi.js';
import { SCROLL_SPEED, GAP_SIZE } from './constants';

export interface ObstaclePair {
  top: PIXI.Sprite | null;
  bottom: PIXI.Sprite | null;
  passed: boolean;
}

export class Obstacles {
  public pairs: ObstaclePair[] = [];
  private container: PIXI.Container;
  private app: PIXI.Application;
  private nooseTex: PIXI.Texture | null = null;
  private razorTex: PIXI.Texture | null = null;
  private timeSinceLastSpawn = 0;

  constructor(app: PIXI.Application, container: PIXI.Container) {
    this.app = app;
    this.container = container;
  }

  async init() {
    this.nooseTex = await PIXI.Assets.load('/noose_sprite.png');
    this.razorTex = await PIXI.Assets.load('/razor_sprite.png');
  }

  spawn() {
    if (!this.nooseTex || !this.razorTex) return;

    // 0 = both, 1 = top only, 2 = bottom only
    const spawnType = Math.floor(Math.random() * 3);
    
    let top: PIXI.Sprite | null = null;
    let bottom: PIXI.Sprite | null = null;
    
    const x = this.app.screen.width + 100;

    // Calculate random gap position
    const minH = 150;
    const maxH = this.app.screen.height - minH - GAP_SIZE;
    const gapTop = Math.floor(Math.random() * (maxH - minH + 1) + minH);

    if (spawnType === 0 || spawnType === 1) {
      top = new PIXI.Sprite(this.nooseTex);
      top.anchor.set(0.5, 0); // top-center
      top.position.set(x, 0);
      top.width = 160; // Standardize width like classic pipes
      top.height = gapTop;
      this.container.addChild(top);
    }

    if (spawnType === 0 || spawnType === 2) {
      bottom = new PIXI.Sprite(this.razorTex);
      const gapBottom = gapTop + GAP_SIZE;
      bottom.anchor.set(0.5, 0); // top-center
      bottom.position.set(x, gapBottom);
      bottom.width = 160; // Standardize width
      bottom.height = this.app.screen.height - gapBottom;
      this.container.addChild(bottom);
    }

    this.pairs.push({ top, bottom, passed: false });
  }

  update(delta: PIXI.Ticker, spawnRate: number) {
    this.timeSinceLastSpawn += delta.deltaMS;
    if (this.timeSinceLastSpawn >= spawnRate) {
      this.spawn();
      this.timeSinceLastSpawn = 0;
    }

    for (let i = this.pairs.length - 1; i >= 0; i--) {
      const pair = this.pairs[i];
      let isOffScreen = false;

      if (pair.top) pair.top.x -= SCROLL_SPEED * delta.deltaTime;
      if (pair.bottom) pair.bottom.x -= SCROLL_SPEED * delta.deltaTime;

      if (pair.top && pair.top.x < -100) isOffScreen = true;
      if (pair.bottom && pair.bottom.x < -100) isOffScreen = true;

      // If both elements were null, handle logic gracefully.
      // If we have an element and it crossed threshold, remove both.
      if (isOffScreen) {
        if (pair.top) {
          this.container.removeChild(pair.top);
          pair.top.destroy();
        }
        if (pair.bottom) {
           this.container.removeChild(pair.bottom);
           pair.bottom.destroy();
        }
        this.pairs.splice(i, 1);
      }
    }
  }

  checkCollisions(playerBounds: PIXI.Bounds | null): 'none' | 'top' | 'bottom' {
    if (!playerBounds) return 'none';
    
    // Reduce player hitbox slightly for fairer gameplay
    const hitbox = {
      minX: playerBounds.minX + 10,
      minY: playerBounds.minY + 10,
      maxX: playerBounds.maxX - 10,
      maxY: playerBounds.maxY - 10,
    };

    for (const pair of this.pairs) {
      if (pair.top) {
        const topBounds = pair.top.getBounds();
        if (this.rectIntersect(hitbox, topBounds)) return 'top';
      }
      
      if (pair.bottom) {
        const bottomBounds = pair.bottom.getBounds();
        if (this.rectIntersect(hitbox, bottomBounds)) return 'bottom';
      }
    }
    return 'none';
  }

  private rectIntersect(r1: {minX: number, maxX: number, minY: number, maxY: number}, r2: PIXI.Bounds) {
    return !(r2.minX > r1.maxX || 
             r2.maxX < r1.minX || 
             r2.minY > r1.maxY ||
             r2.maxY < r1.minY);
  }
}
