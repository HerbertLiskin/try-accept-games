import * as PIXI from 'pixi.js';
import { SCROLL_SPEED } from './constants';

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

    // Calculate dynamic gap size (e.g., 45% of screen height)
    const dynamicGapSize = Math.min(this.app.screen.height * 0.45, 450);
    
    // Calculate random gap position
    const minH = this.app.screen.height * 0.15;
    const maxH = this.app.screen.height - minH - dynamicGapSize;
    const gapTop = Math.floor(Math.random() * (maxH - minH + 1) + minH);

    // Calibrated non-linear scaling
    // Mobile: Larger noose (150px base)
    // Desktop: Final pass - even larger nooses
    const targetNooseHeight = 150 + Math.max(0, this.app.screen.height - 450) * 0.25;
    const nooseScale = targetNooseHeight / this.nooseTex.height;

    if (spawnType === 0 || spawnType === 1) {
      top = new PIXI.Sprite(this.nooseTex);
      top.anchor.set(0.5, 1);
      top.position.set(x, gapTop);
      
      top.scale.set(nooseScale);
      
      this.container.addChild(top);
    }

    if (spawnType === 0 || spawnType === 2) {
      bottom = new PIXI.Sprite(this.razorTex);
      const gapBottom = gapTop + dynamicGapSize;
      bottom.anchor.set(0.5, 0); // top-center
      bottom.position.set(x, gapBottom);
      
      // Decouple razor scale: smaller on mobile AND sleeker on desktop per request
      let razorScale = nooseScale;
      if (this.app.screen.height < 600) {
        razorScale *= 0.8; // Mobile
      } else {
        razorScale *= 0.7; // Desktop (even sleeker)
      }
      bottom.scale.set(razorScale);

      // If it's too short to reach the ground, scale it up proportionally
      const groundY = this.app.screen.height;
      if (bottom.y + (bottom.texture.height * bottom.scale.y) < groundY) {
        const requiredScale = (groundY - bottom.y) / bottom.texture.height;
        bottom.scale.set(requiredScale);
      }

      // Tighter width cap for razors
      const maxWidth = this.app.screen.width * 0.12;
      if (bottom.width > maxWidth) {
        bottom.width = maxWidth;
        bottom.scale.y = Math.abs(bottom.scale.x); 
        if (bottom.y + (bottom.texture.height * bottom.scale.y) < groundY) {
            bottom.height = groundY - bottom.y; 
        }
      }
      
      this.container.addChild(bottom);
    }

    this.pairs.push({ top, bottom, passed: false });
  }

  update(delta: PIXI.Ticker, spawnRate: number, multiplier: number = 1) {
    this.timeSinceLastSpawn += delta.deltaMS;
    if (this.timeSinceLastSpawn >= spawnRate) {
      this.spawn();
      this.timeSinceLastSpawn = 0;
    }

    for (let i = this.pairs.length - 1; i >= 0; i--) {
      const pair = this.pairs[i];
      let isOffScreen = false;

      if (pair.top) pair.top.x -= SCROLL_SPEED * delta.deltaTime * multiplier;
      if (pair.bottom) pair.bottom.x -= SCROLL_SPEED * delta.deltaTime * multiplier;

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
        // Inset horizontal by 35% and vertical by 5% because the noose has significant transparent space
        // and its visual area is even narrower relative to its total width now.
        const wInset = (topBounds.maxX - topBounds.minX) * 0.35;
        const hInset = (topBounds.maxY - topBounds.minY) * 0.05;
        const reducedTopBounds = {
          minX: topBounds.minX + wInset,
          minY: topBounds.minY + hInset,
          maxX: topBounds.maxX - wInset,
          maxY: topBounds.maxY - hInset,
        };
        if (this.rectIntersect(hitbox, reducedTopBounds)) return 'top';
      }
      
      if (pair.bottom) {
        const bottomBounds = pair.bottom.getBounds();
        // Inset horizontal by 25% and vertical by 10% because of sprite transparent space
        const wInset = (bottomBounds.maxX - bottomBounds.minX) * 0.25;
        const hInset = (bottomBounds.maxY - bottomBounds.minY) * 0.1;
        const reducedBottomBounds = {
          minX: bottomBounds.minX + wInset,
          minY: bottomBounds.minY + hInset,
          maxX: bottomBounds.maxX - wInset,
          maxY: bottomBounds.maxY - hInset,
        };
        if (this.rectIntersect(hitbox, reducedBottomBounds)) return 'bottom';
      }
    }
    return 'none';
  }

  private rectIntersect(
    r1: {minX: number, maxX: number, minY: number, maxY: number}, 
    r2: {minX: number, maxX: number, minY: number, maxY: number}
  ) {
    return !(r2.minX > r1.maxX || 
             r2.maxX < r1.minX || 
             r2.minY > r1.maxY ||
             r2.maxY < r1.minY);
  }
}
