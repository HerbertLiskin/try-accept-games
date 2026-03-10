import * as PIXI from 'pixi.js';
import { GRAVITY, JUMP_FORCE } from './constants';

export class Player {
  public sprite: PIXI.Sprite | null = null;
  public zzzText: PIXI.Text | null = null;
  private animTimer = 0;
  private container: PIXI.Container;
  private velocity = 0;
  private isDead = false;
  private _isInvulnerable = false;
  private invulnerabilityTimer = 0;
  private blinkTimer = 0;

  constructor(container: PIXI.Container) {
    this.container = container;
  }

  async init(x: number, y: number, screenHeight: number) {
    const texture = await PIXI.Assets.load('/player_sprite.png');
    this.sprite = new PIXI.Sprite(texture);
    this.sprite.anchor.set(0.5);
    
    // Calibrated scale: smaller on mobile, with a larger cap for desktop
    // Increased target multiplier from 0.085 to 0.15 since screenHeight is unscaled compared to the old gameContainer height
    const targetHeight = Math.min(screenHeight * 0.15, 130); 
    const scale = targetHeight / texture.height;
    this.sprite.scale.set(scale);
    
    this.sprite.x = x;
    this.sprite.y = y;
    this.container.addChild(this.sprite);

    // Initialize ZZZ text for guaranteed transparency and sharp look
    const style = new PIXI.TextStyle({
      fontFamily: 'Arial',
      fontSize: 24 * (scale / 0.45), // Scale font size relative to character scale
      fontWeight: 'bold',
      fill: '#ffffff',
      stroke: { color: '#4a90e2', width: 3 },
      dropShadow: {
        color: '#000000',
        blur: 2,
        distance: 2,
      },
    });

    this.zzzText = new PIXI.Text({ text: 'z', style });
    this.zzzText.anchor.set(0.5, 1); // Centered relative to offset
    this.container.addChild(this.zzzText);
  }

  jump() {
    if (this.isDead) return;
    this.velocity = JUMP_FORCE;
  }

  update(delta: PIXI.Ticker) {
    if (!this.sprite || this.isDead) {
      if (this.zzzText) this.zzzText.visible = false;
      return;
    }

    // Handle Invulnerability and Blinking
    if (this._isInvulnerable) {
      this.invulnerabilityTimer -= delta.deltaMS;
      this.blinkTimer += delta.deltaMS;

      // Blink every 100ms
      if (this.blinkTimer >= 100) {
        this.sprite.alpha = this.sprite.alpha === 1 ? 0.3 : 1;
        this.blinkTimer = 0;
      }

      if (this.invulnerabilityTimer <= 0) {
        this._isInvulnerable = false;
        this.sprite.alpha = 1; // Reset alpha
      }
    }

    this.velocity += GRAVITY * delta.deltaTime;
    this.sprite.y += this.velocity * delta.deltaTime;

    // Rotate slightly towards velocity
    this.sprite.rotation = Math.min(Math.PI / 4, Math.max(-Math.PI / 4, (this.velocity * 0.1)));

    // Update ZZZ position and state
    if (this.zzzText) {
      this.animTimer += delta.deltaTime * 0.05;
      
      const frame = Math.floor(this.animTimer % 8);
      const frames = ['z', 'zz', 'zzz', 'zZzz', 'zZzZ', 'zZzZzz', 'Zzz', 'Zz'];
      if (this.zzzText.text !== frames[frame]) {
        this.zzzText.text = frames[frame];
      }

      // Offset ZZZ relative to player scale
      this.zzzText.x = this.sprite.x + (75 * this.sprite.scale.x);
      this.zzzText.y = this.sprite.y - (100 * this.sprite.scale.y);
    }

    // Reset character transforms to static (canceling programmatic animation)
    // Scale is already set in init and should remain stable unless explicitly changed
    this.sprite.skew.x = 0;
    this.sprite.pivot.y = 0;
  }

  getBounds() {
    // Only return the main character bounds, ignoring the ZZZ symbols
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

  get isInvulnerable() {
    return this._isInvulnerable;
  }

  setInvulnerable(duration: number) {
    this._isInvulnerable = true;
    this.invulnerabilityTimer = duration;
    this.blinkTimer = 0;
  }

  setBerserkVisuals(active: boolean) {
    if (!this.sprite || !this.zzzText) return;
    
    if (active) {
      this.sprite.tint = 0xff0000;
      this.zzzText.style.fill = '#ff0000';
      this.zzzText.style.stroke = { color: '#000000', width: 3 };
    } else {
      this.sprite.tint = 0xffffff;
      this.zzzText.style.fill = '#ffffff';
      this.zzzText.style.stroke = { color: '#4a90e2', width: 3 };
    }
  }

  getY() {
    return this.sprite?.y || 0;
  }

  setY(y: number) {
    if (this.sprite) this.sprite.y = y;
  }

  resetVelocity() {
    this.velocity = 0;
  }
}
