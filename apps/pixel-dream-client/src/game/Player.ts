import * as PIXI from 'pixi.js';
import { GRAVITY, JUMP_FORCE } from './constants';

export class Player {
  public sprite: PIXI.Sprite | null = null;
  private container: PIXI.Container;
  private velocity = 0;
  private isDead = false;

  constructor(container: PIXI.Container) {
    this.container = container;
  }

  async init(x: number, y: number) {
    const texture = await PIXI.Assets.load('/player_sprite.png');
    this.sprite = new PIXI.Sprite(texture);
    this.sprite.anchor.set(0.5);
    
    // Scale down character, adjust appropriately
    this.sprite.scale.set(0.25);
    
    this.sprite.x = x;
    this.sprite.y = y;
    this.container.addChild(this.sprite);
  }

  jump() {
    if (this.isDead) return;
    this.velocity = JUMP_FORCE;
  }

  update(delta: PIXI.Ticker) {
    if (!this.sprite || this.isDead) return;

    this.velocity += GRAVITY * delta.deltaTime;
    this.sprite.y += this.velocity * delta.deltaTime;

    // Rotate slightly towards velocity
    this.sprite.rotation = Math.min(Math.PI / 4, Math.max(-Math.PI / 4, (this.velocity * 0.1)));
  }

  getBounds() {
    return this.sprite ? this.sprite.getBounds() : null;
  }

  die(type: 'ground' | 'noose' | 'razor') {
    this.isDead = true;
    if (!this.sprite) return;

    // Simple death animation
    if (type === 'noose') {
      this.velocity = 0; // Hang
      this.sprite.tint = 0xff0000;
    } else if (type === 'razor') {
      this.sprite.tint = 0x880000;
      this.velocity = -5; // Bounce off
    } else {
      this.sprite.tint = 0x555555;
    }
  }

  getIsDead() {
    return this.isDead;
  }

  getY() {
    return this.sprite?.y || 0;
  }

  setY(y: number) {
    if (this.sprite) this.sprite.y = y;
  }
}
