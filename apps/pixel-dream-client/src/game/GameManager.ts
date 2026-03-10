import * as PIXI from 'pixi.js';
import { Player } from './Player';
import { Background } from './Background';
import { Obstacles } from './Obstacles';
import { SCROLL_SPEED, OBSTACLE_SPAWN_RATE, PILL_SPAWN_RATE, COFFEE_SPAWN_RATE, CIGARETTE_SPAWN_RATE, FROG_HEART_SPAWN_RATE, FROG_REDEYES_SPAWN_RATE, FROG_HYPNO_SPAWN_RATE, INVULNERABILITY_DURATION, MAX_LIVES, PILL_DURATION, COFFEE_DURATION, CIGARETTE_DURATION, FROG_REDEYES_DURATION, FROG_HYPNO_DURATION } from './constants';
import { soundManager } from './SoundManager';
import { Collectibles } from './Collectibles';

export class GameManager {
  public app: PIXI.Application;
  public onGameOver: (score: number) => void;
  
  private player!: Player;
  private background!: Background;
  private obstacles!: Obstacles;
  private collectibles!: Collectibles;
  private score = 0;
  private isPlaying = false;
  
  private gameContainer!: PIXI.Container;
  private bgContainer!: PIXI.Container;
  private objContainer!: PIXI.Container;
  private scoreText!: PIXI.Text;
  private livesContainer!: PIXI.Container;
  private frogHeartTexture: PIXI.Texture | null = null;
  private undergroundBg!: PIXI.TilingSprite;
  private coffinSprite!: PIXI.Sprite;
  private rainbowOverlay!: PIXI.Graphics;
  private speedLinesOverlay!: PIXI.Graphics;
  private vignetteOverlay!: PIXI.Graphics;
  private redGradientOverlay!: PIXI.Sprite;
  private hypnoSpiralOverlay!: PIXI.Graphics;
  private hypnoSpiralAngle = 0;
  private blurFilter!: PIXI.BlurFilter;
  
  private pillEffectActive = false;
  private coffeeEffectActive = false;
  private cigaretteEffectActive = false;
  private redEyesEffectActive = false;
  private hypnoEffectActive = false;
  private permanentSpeedMultiplier = 1.0;
  private pillTimer = 0;
  private coffeeTimer = 0;
  private cigaretteTimer = 0;
  private redEyesTimer = 0;
  private hypnoTimer = 0;
  private lastPillSpawn = 0;
  private lastCoffeeSpawn = 0;
  private lastCigaretteSpawn = 0;
  private lastFrogHeartSpawn = 0;
  private lastFrogRedEyesSpawn = 0;
  private lastFrogHypnoSpawn = 0;
  private lastAnyCollectibleSpawn = 0;
  private rainbowHue = 0;
  private lives = 0;

  constructor(app: PIXI.Application, onGameOver: (score: number) => void) {
    this.app = app;
    this.onGameOver = onGameOver;
  }

  async init() {
    this.gameContainer = new PIXI.Container();
    this.app.stage.addChild(this.gameContainer);

    this.bgContainer = new PIXI.Container();
    this.gameContainer.addChild(this.bgContainer);

    this.objContainer = new PIXI.Container();
    this.gameContainer.addChild(this.objContainer);

    this.background = new Background(this.app, this.bgContainer);
    await this.background.init();
    
    this.frogHeartTexture = await PIXI.Assets.load('/frog_heart_sprite.png');

    // Underground background (always drawn behind player, placed below twilight bg initially)
    const undergroundTex = await PIXI.Assets.load('/underground_bg.png');
    const ugScale = this.app.screen.height / undergroundTex.height;
    
    this.undergroundBg = new PIXI.TilingSprite({
      texture: undergroundTex,
      width: this.app.screen.width / ugScale,
      height: undergroundTex.height
    });
    this.undergroundBg.scale.set(ugScale);
    this.undergroundBg.y = this.app.screen.height; // starts exactly below the screen
    this.bgContainer.addChild(this.undergroundBg);

    // Coffin sprite (hidden initially)
    const coffinTex = await PIXI.Assets.load('/coffin_sprite.png');
    this.coffinSprite = new PIXI.Sprite(coffinTex);
    this.coffinSprite.anchor.set(0.5);
    // Center it horizontally, place it higher vertically in the underground scene
    this.coffinSprite.x = this.app.screen.width / 2;
    this.coffinSprite.y = this.app.screen.height + (this.app.screen.height * 0.35); // Higher up 
    this.coffinSprite.scale.set(0.5);
    this.coffinSprite.visible = false;
    this.objContainer.addChild(this.coffinSprite);

    this.obstacles = new Obstacles(this.app, this.bgContainer);
    await this.obstacles.init();

    // Effects are built on gameContainer or bgContainer inside setupEffects
    this.setupEffects();

    this.player = new Player(this.objContainer);
    await this.player.init(this.app.screen.width / 4, this.app.screen.height / 2, this.app.screen.height);

    this.collectibles = new Collectibles(this.app, this.objContainer);
    await this.collectibles.init();

    this.setupUI();
    this.setupControls();

    soundManager.init();
    soundManager.playBgm();

    const now = Date.now();
    // Stagger initial spawns to introduce items earlier in the run
    this.lastPillSpawn = now - PILL_SPAWN_RATE + 3000; // Spawns at ~3s
    this.lastCoffeeSpawn = now - COFFEE_SPAWN_RATE + 6000; // Spawns at ~6s
    this.lastCigaretteSpawn = now - CIGARETTE_SPAWN_RATE + 9000; // Spawns at ~9s
    this.lastFrogHeartSpawn = now - FROG_HEART_SPAWN_RATE + 13000; // Spawns at ~13s
    this.lastFrogRedEyesSpawn = now - FROG_REDEYES_SPAWN_RATE + 18000; // Spawns at ~18s
    this.lastFrogHypnoSpawn = now - FROG_HYPNO_SPAWN_RATE + 24000; // Spawns at ~24s
    this.lastAnyCollectibleSpawn = now;

    this.isPlaying = true;
    this.app.ticker.add((ticker) => this.gameLoop(ticker));
  }

  private setupUI() {
    const style = new PIXI.TextStyle({
      fontFamily: '"Press Start 2P"',
      fontSize: 24,
      fill: '#ffffff',
      dropShadow: {
        alpha: 1,
        angle: Math.PI / 6,
        blur: 0,
        color: 0x000000,
        distance: 4,
      }
    });

    this.scoreText = new PIXI.Text({ text: 'Score: 0', style });
    this.scoreText.x = 20;
    this.scoreText.y = 20;
    this.app.stage.addChild(this.scoreText);

    this.livesContainer = new PIXI.Container();
    this.livesContainer.x = this.app.screen.width - 20;
    this.livesContainer.y = 20;
    this.app.stage.addChild(this.livesContainer);
  }

  private getRandomOffset(baseRate: number): number {
    // Adds +/- 30% timing offset to make spawns unpredictable
    return (Math.random() * 0.6 - 0.3) * baseRate;
  }

  private updateLivesUI() {
    this.livesContainer.removeChildren();
    if (!this.frogHeartTexture) return;

    for (let i = 0; i < this.lives; i++) {
        const sprite = new PIXI.Sprite(this.frogHeartTexture);
        sprite.anchor.set(1, 0); // top right
        // Add padding between hearts, draw from right to left
        sprite.scale.set(0.15); // Reduced scale to make them smaller (was 0.25)
        sprite.x = -(i * (sprite.width + 10)); 
        this.livesContainer.addChild(sprite);
    }
  }

  private setupEffects() {
    // Blur filter for the trippy state (applied ONLY to background/obstacles via bgContainer)
    this.blurFilter = new PIXI.BlurFilter();
    this.blurFilter.strength = 0;
    this.bgContainer.filters = [this.blurFilter];

    // Rainbow overlay (added to bgContainer so player/collectibles render above it)
    this.rainbowOverlay = new PIXI.Graphics();
    this.rainbowOverlay.rect(0, 0, this.app.screen.width, this.app.screen.height);
    this.rainbowOverlay.fill({ color: 0xffffff, alpha: 0.1 });
    this.rainbowOverlay.visible = false;
    this.bgContainer.addChild(this.rainbowOverlay);

    // Speed lines overlay (added to bgContainer)
    this.speedLinesOverlay = new PIXI.Graphics();
    this.speedLinesOverlay.visible = false;
    this.bgContainer.addChild(this.speedLinesOverlay);

    // Vignette overlay (added to bgContainer)
    this.vignetteOverlay = new PIXI.Graphics();
    this.vignetteOverlay.visible = false;
    this.bgContainer.addChild(this.vignetteOverlay);

    // Red gradient overlay for Red Eyes effect
    const quality = 256;
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = quality;
    const ctx = canvas.getContext('2d');
    if (ctx) {
        // Red glow from top to transparent bottom
        const grd = ctx.createLinearGradient(0, 0, 0, quality);
        grd.addColorStop(0, 'rgba(255, 0, 0, 0.5)'); 
        grd.addColorStop(1, 'rgba(0, 0, 0, 0)');     
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, 1, quality);
    }
    const texture = PIXI.Texture.from(canvas);
    this.redGradientOverlay = new PIXI.Sprite(texture);
    this.redGradientOverlay.width = this.app.screen.width;
    this.redGradientOverlay.height = this.app.screen.height;
    this.redGradientOverlay.visible = false;
    this.bgContainer.addChild(this.redGradientOverlay);

    // Hypno Spiral overlay
    this.hypnoSpiralOverlay = new PIXI.Graphics();
    this.hypnoSpiralOverlay.position.set(this.app.screen.width / 2, this.app.screen.height / 2);
    this.hypnoSpiralOverlay.visible = false;
    this.bgContainer.addChild(this.hypnoSpiralOverlay);
    this.drawHypnoSpiral();
  }

  private drawHypnoSpiral() {
    this.hypnoSpiralOverlay.clear();
    const maxRadius = Math.max(this.app.screen.width, this.app.screen.height);
    let angle = 0;
    let radius = 10;
    
    this.hypnoSpiralOverlay.moveTo(0, 0);
    
    while (radius < maxRadius) {
        angle += 0.2;
        radius += 2;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        this.hypnoSpiralOverlay.lineTo(x, y);
    }
    
    this.hypnoSpiralOverlay.stroke({ color: 0xFFFFFF, width: 20, alpha: 0.15 });
  }

  private setupControls() {
    const jump = () => {
      if (this.isPlaying) {
        this.player.jump();
      }
    };

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space') jump();
      // Track switching/muting hotkeys
      if (e.code === 'KeyM') soundManager.toggleMute();
      if (e.code === 'KeyN') soundManager.nextTrack();
    });

    // Touch and mouse click
    this.app.canvas.addEventListener('pointerdown', jump);
  }

  private gameLoop(ticker: PIXI.Ticker) {
    if (!this.isPlaying) return;

    // Base speed modified by permanent boost, coffee (2.5x), and cigarette slow-mo (0.5x)
    let activeEffectMultiplier = 1;
    if (this.coffeeEffectActive) activeEffectMultiplier = 2.5;
    else if (this.cigaretteEffectActive) activeEffectMultiplier = 0.5;

    const totalSpeedMultiplier = this.permanentSpeedMultiplier * activeEffectMultiplier;

    this.background.update(ticker, totalSpeedMultiplier);
    this.undergroundBg.tilePosition.x -= SCROLL_SPEED * ticker.deltaTime * totalSpeedMultiplier;
    this.player.update(ticker);
    
    // Increase obstacle spawn rate dynamically
    const difficultyMultiplier = Math.max(0.5, 1 - (this.score / 50));
    
    this.obstacles.update(ticker, (OBSTACLE_SPAWN_RATE * difficultyMultiplier) / totalSpeedMultiplier, totalSpeedMultiplier);
    this.collectibles.update(ticker.deltaTime * totalSpeedMultiplier);

    // Collectible spawning
    const MIN_SPAWN_INTERVAL = 3000; // At least 3 seconds between any two collectibles
    if (Date.now() - this.lastAnyCollectibleSpawn > MIN_SPAWN_INTERVAL / totalSpeedMultiplier) {
      if (Date.now() - this.lastPillSpawn > PILL_SPAWN_RATE / totalSpeedMultiplier) {
        this.collectibles.spawn('pill');
        this.lastPillSpawn = Date.now() + this.getRandomOffset(PILL_SPAWN_RATE);
        this.lastAnyCollectibleSpawn = Date.now();
      } else if (Date.now() - this.lastCoffeeSpawn > COFFEE_SPAWN_RATE / totalSpeedMultiplier) {
        this.collectibles.spawn('coffee');
        this.lastCoffeeSpawn = Date.now() + this.getRandomOffset(COFFEE_SPAWN_RATE);
        this.lastAnyCollectibleSpawn = Date.now();
      } else if (Date.now() - this.lastCigaretteSpawn > CIGARETTE_SPAWN_RATE / totalSpeedMultiplier) {
        this.collectibles.spawn('cigarette');
        this.lastCigaretteSpawn = Date.now() + this.getRandomOffset(CIGARETTE_SPAWN_RATE);
        this.lastAnyCollectibleSpawn = Date.now();
      } else if (Date.now() - this.lastFrogHeartSpawn > FROG_HEART_SPAWN_RATE / totalSpeedMultiplier) {
        this.collectibles.spawn('frog_heart');
        this.lastFrogHeartSpawn = Date.now() + this.getRandomOffset(FROG_HEART_SPAWN_RATE);
        this.lastAnyCollectibleSpawn = Date.now();
      } else if (Date.now() - this.lastFrogRedEyesSpawn > FROG_REDEYES_SPAWN_RATE / totalSpeedMultiplier) {
        this.collectibles.spawn('frog_redeyes');
        this.lastFrogRedEyesSpawn = Date.now() + this.getRandomOffset(FROG_REDEYES_SPAWN_RATE);
        this.lastAnyCollectibleSpawn = Date.now();
      } else if (Date.now() - this.lastFrogHypnoSpawn > FROG_HYPNO_SPAWN_RATE / totalSpeedMultiplier) {
        this.collectibles.spawn('frog_hypno');
        this.lastFrogHypnoSpawn = Date.now() + this.getRandomOffset(FROG_HYPNO_SPAWN_RATE);
        this.lastAnyCollectibleSpawn = Date.now();
      }
    }

    // Collectible collection
    const playerBounds = this.player.getBounds();
    if (playerBounds) {
      this.collectibles.collectibles.forEach((c, index) => {
          if (this.rectIntersect(playerBounds, c.getBounds())) {
              if (c.collectibleType === 'pill') {
                this.activatePillEffect();
              } else if (c.collectibleType === 'coffee') {
                this.activateCoffeeEffect();
              } else if (c.collectibleType === 'cigarette') {
                this.activateCigaretteEffect();
              } else if (c.collectibleType === 'frog_heart') {
                this.activateFrogHeartEffect();
              } else if (c.collectibleType === 'frog_redeyes') {
                this.activateFrogRedEyesEffect();
              } else {
                this.activateFrogHypnoEffect();
              }
              c.parent?.removeChild(c);
              this.collectibles.collectibles.splice(index, 1);
          }
      });
    }

    // Handle Speed Lines
    if (this.coffeeEffectActive) {
      this.updateSpeedLines();
    }

    // Handle Active Effects
    if (this.pillEffectActive || this.coffeeEffectActive || this.cigaretteEffectActive || this.redEyesEffectActive || this.hypnoEffectActive) {
      if (this.pillEffectActive) {
        this.pillTimer -= ticker.deltaMS;
        this.rainbowHue = (this.rainbowHue + 5) % 360;
        this.rainbowOverlay.clear();
        this.rainbowOverlay.rect(0, 0, this.app.screen.width, this.app.screen.height);
        this.rainbowOverlay.fill({ color: this.hslToHex(this.rainbowHue, 100, 50), alpha: 0.2 });
        
        if (this.pillTimer <= 0) this.deactivatePillEffect();
      }

      if (this.coffeeEffectActive) {
        this.coffeeTimer -= ticker.deltaMS;
        if (this.coffeeTimer <= 0) this.deactivateCoffeeEffect();
      }

      if (this.cigaretteEffectActive) {
        this.cigaretteTimer -= ticker.deltaMS;
        this.drawVignette();
        if (this.cigaretteTimer <= 0) this.deactivateCigaretteEffect();
      }

      if (this.redEyesEffectActive) {
        this.redEyesTimer -= ticker.deltaMS;
        if (this.redEyesTimer <= 0) this.deactivateFrogRedEyesEffect();
      }

      if (this.hypnoEffectActive) {
        this.hypnoTimer -= ticker.deltaMS;
        this.hypnoSpiralAngle += 0.08 * totalSpeedMultiplier;
        this.hypnoSpiralOverlay.rotation = this.hypnoSpiralAngle;
        if (this.hypnoTimer <= 0) this.deactivateFrogHypnoEffect();
      }

      // Multiplier scoring
      this.score += SCROLL_SPEED * ticker.deltaTime * 0.05 * totalSpeedMultiplier;
      this.scoreText.style.fill = '#FFD700'; // Solid Gold
    } else {
      // Normal scoring
      this.score += SCROLL_SPEED * ticker.deltaTime * 0.01 * this.permanentSpeedMultiplier;
      this.scoreText.style.fill = '#ffffff';
    }

    this.scoreText.text = `Score: ${Math.floor(this.score)}`;

    // Floor / Ceiling collision
    if (this.player.getY() < 0 || this.player.getY() > this.app.screen.height) {
      if (this.lives > 0) {
        // Use an extra life to teleport back to the center
        this.lives--;
        this.updateLivesUI();
        this.player.setY(this.app.screen.height / 2);
        this.player.resetVelocity();
        this.player.setInvulnerable(INVULNERABILITY_DURATION);
      } else {
        this.triggerDeath('ground');
      }
      return;
    }

    // Obstacle collisions
    if (this.redEyesEffectActive) {
      // Complete invincibility, pass right through
      return;
    }

    const collision = this.obstacles.checkCollisions(this.player.getBounds());
    if (collision !== 'none') {
      if (this.player.isInvulnerable) {
        // Do nothing, player passes through
      } else if (this.lives > 0) {
        this.lives--;
        this.updateLivesUI();
        this.player.setInvulnerable(INVULNERABILITY_DURATION);
      } else {
        if (collision === 'top') this.triggerDeath('noose');
        if (collision === 'bottom') this.triggerDeath('razor');
      }
    }
  }

  private activateFrogHeartEffect() {
    if (this.lives < MAX_LIVES) {
      this.lives++;
      this.updateLivesUI();
    }
  }

  private activateFrogRedEyesEffect() {
    this.redEyesEffectActive = true;
    this.redEyesTimer = FROG_REDEYES_DURATION;
    this.player.setBerserkVisuals(true);
    this.redGradientOverlay.visible = true;
  }

  private deactivateFrogRedEyesEffect() {
    this.redEyesEffectActive = false;
    this.player.setBerserkVisuals(false);
    this.redGradientOverlay.visible = false;
  }

  private activateFrogHypnoEffect() {
    this.hypnoEffectActive = true;
    this.hypnoTimer = FROG_HYPNO_DURATION;
    this.hypnoSpiralOverlay.visible = true;
    
    // Invert the world!
    this.gameContainer.scale.y = -1;
    this.gameContainer.y = this.app.screen.height;
  }

  private deactivateFrogHypnoEffect() {
    this.hypnoEffectActive = false;
    this.hypnoSpiralOverlay.visible = false;
    
    // Restore the world gravity mapping
    this.gameContainer.scale.y = 1;
    this.gameContainer.y = 0;
  }

  private activatePillEffect() {
    this.pillEffectActive = true;
    this.pillTimer = PILL_DURATION;
    this.rainbowOverlay.visible = true;
    this.blurFilter.strength = 4;
  }

  private activateCoffeeEffect() {
    this.coffeeEffectActive = true;
    this.coffeeTimer = COFFEE_DURATION;
    this.speedLinesOverlay.visible = true;
  }

  private deactivateCoffeeEffect() {
    this.coffeeEffectActive = false;
    this.speedLinesOverlay.visible = false;
    this.scoreText.style.fill = '#ffffff';
    // Permanently increase game speed by 20%
    this.permanentSpeedMultiplier *= 1.2;
  }

  private updateSpeedLines() {
    this.speedLinesOverlay.clear();
    const lineCount = 15;
    for (let i = 0; i < lineCount; i++) {
        const x = Math.random() * this.app.screen.width;
        const y = Math.random() * this.app.screen.height;
        const width = 100 + Math.random() * 200;
        this.speedLinesOverlay.rect(x, y, width, 2);
        this.speedLinesOverlay.fill({ color: 0xffffff, alpha: 0.3 });
    }
  }

  private activateCigaretteEffect() {
    this.cigaretteEffectActive = true;
    this.cigaretteTimer = CIGARETTE_DURATION;
    this.vignetteOverlay.visible = true;
  }

  private deactivateCigaretteEffect() {
    this.cigaretteEffectActive = false;
    this.vignetteOverlay.visible = false;
    this.scoreText.style.fill = '#ffffff';
  }

  private drawVignette() {
    this.vignetteOverlay.clear();
    const w = this.app.screen.width;
    const h = this.app.screen.height;
    
    // Draw a dark semi-transparent overlay
    this.vignetteOverlay.rect(0, 0, w, h);
    this.vignetteOverlay.fill({ color: 0x000000, alpha: 0.4 });
    
    // We could do a complex radial gradient, but for performance in PIXI v8 without custom shaders, 
    // a simple darkened overlay with "zoned out" colors works well.
  }

  private deactivatePillEffect() {
    this.pillEffectActive = false;
    this.rainbowOverlay.visible = false;
    this.blurFilter.strength = 0;
    this.scoreText.style.fill = '#ffffff';
  }

  private rectIntersect(a: PIXI.Bounds, b: PIXI.Bounds): boolean {
    return a.minX < b.maxX &&
           a.maxX > b.minX &&
           a.minY < b.maxY &&
           a.maxY > b.minY;
  }

  private hslToHex(h: number, s: number, l: number): number {
    s /= 100;
    l /= 100;
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color);
    };
    return (f(0) << 16) | (f(8) << 8) | f(4);
  }

  private triggerDeath(type: 'ground' | 'noose' | 'razor') {
    this.isPlaying = false;
    this.deactivatePillEffect(); 
    this.deactivateCoffeeEffect();
    this.deactivateCigaretteEffect();
    this.deactivateFrogRedEyesEffect();
    this.deactivateFrogHypnoEffect();
    this.player.die(type);
    
    // Slight delay before transitioning down
    setTimeout(() => {
        this.coffinSprite.visible = true;
        // Scene transition effect: camera move down smoothly
        const transitionTicker = new PIXI.Ticker();
        transitionTicker.add(() => {
            if (this.app.stage.y > -this.app.screen.height) {
                // Ease out movement
                this.app.stage.y += (-this.app.screen.height - this.app.stage.y) * 0.05;
                if (Math.abs(-this.app.screen.height - this.app.stage.y) < 1) {
                    this.app.stage.y = -this.app.screen.height;
                    transitionTicker.stop();
                    
                    // Trigger REACT GAMEOVER State after camera finishes panning
                    this.app.ticker.stop();
                    soundManager.stopBgm();
                    this.onGameOver(Math.floor(this.score));
                }
            }
        });
        transitionTicker.start();
    }, 1000);
  }
}
