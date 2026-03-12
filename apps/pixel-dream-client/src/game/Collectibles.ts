import * as PIXI from 'pixi.js';
import { SCROLL_SPEED } from './constants';

export interface CollectibleSprite extends PIXI.Sprite {
  collectibleType: 'pill' | 'coffee' | 'cigarette' | 'frog_heart' | 'frog_redeyes' | 'frog_hypno' | 'beer';
}

export class Collectibles {
  private app: PIXI.Application;
  private container: PIXI.Container;
  private pillTexture: PIXI.Texture | null = null;
  private coffeeTexture: PIXI.Texture | null = null;
  private cigaretteTexture: PIXI.Texture | null = null;
  private frogHeartTexture: PIXI.Texture | null = null;
  private frogRedEyesTexture: PIXI.Texture | null = null;
  private frogHypnoTexture: PIXI.Texture | null = null;
  private beerTexture: PIXI.Texture | null = null;
  public collectibles: CollectibleSprite[] = [];

  constructor(app: PIXI.Application, container: PIXI.Container) {
    this.app = app;
    this.container = container;
  }

  async init() {
    this.pillTexture = await PIXI.Assets.load('/pill_sprite.png');
    this.coffeeTexture = await PIXI.Assets.load('/coffee_sprite.png');
    // Fallback to error texture if cigarette isn't present, but assume it will be
    this.cigaretteTexture = await PIXI.Assets.load('/cigarette_sprite.png').catch(() => this.pillTexture); 
    this.frogHeartTexture = await PIXI.Assets.load('/frog_heart_sprite.png');
    this.frogRedEyesTexture = await PIXI.Assets.load('/frog_redeyes_sprite.png');
    this.frogHypnoTexture = await PIXI.Assets.load('/frog_hypno_sprite.png');
    this.beerTexture = await PIXI.Assets.load('/beer_sprite.png').catch(() => this.pillTexture);
  }

  public getTexture(type: 'pill' | 'coffee' | 'cigarette' | 'frog_heart' | 'frog_redeyes' | 'frog_hypno'): PIXI.Texture | null {
    if (type === 'pill') return this.pillTexture;
    if (type === 'coffee') return this.coffeeTexture;
    if (type === 'cigarette') return this.cigaretteTexture;
    if (type === 'frog_heart') return this.frogHeartTexture;
    if (type === 'frog_redeyes') return this.frogRedEyesTexture;
    if (type === 'frog_hypno') return this.frogHypnoTexture;
    if (type === 'beer') return this.beerTexture;
    return null;
  }

  spawn(type: 'pill' | 'coffee' | 'cigarette' | 'frog_heart' | 'frog_redeyes' | 'frog_hypno' | 'beer', x?: number) {
    let texture = null;
    if (type === 'pill') texture = this.pillTexture;
    else if (type === 'coffee') texture = this.coffeeTexture;
    else if (type === 'cigarette') texture = this.cigaretteTexture;
    else if (type === 'frog_heart') texture = this.frogHeartTexture;
    else if (type === 'frog_redeyes') texture = this.frogRedEyesTexture;
    else if (type === 'frog_hypno') texture = this.frogHypnoTexture;
    else if (type === 'beer') texture = this.beerTexture;
    if (!texture) return;

    const collectible = new PIXI.Sprite(texture) as CollectibleSprite;
    collectible.collectibleType = type;
    collectible.anchor.set(0.5);
    
    // Position
    const spawnX = x ?? this.app.screen.width + 100;
    const spawnY = Math.random() * (this.app.screen.height * 0.6) + (this.app.screen.height * 0.2);
    collectible.position.set(spawnX, spawnY);

    // Scaling
    const targetHeight = Math.min(this.app.screen.height * 0.08, 60);
    const scale = targetHeight / collectible.texture.height;
    collectible.scale.set(scale);

    this.container.addChild(collectible);
    this.collectibles.push(collectible);
  }

  update(delta: number) {
    for (let i = this.collectibles.length - 1; i >= 0; i--) {
      const collectible = this.collectibles[i];
      collectible.x -= SCROLL_SPEED * delta;
      
      // Rotation animation
      collectible.rotation += 0.05 * delta;

      // Remove off-screen
      if (collectible.x < -100) {
        this.container.removeChild(collectible);
        this.collectibles.splice(i, 1);
      }
    }
  }

  reset() {
    this.collectibles.forEach(c => this.container.removeChild(c));
    this.collectibles = [];
  }
}
