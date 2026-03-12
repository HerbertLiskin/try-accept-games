import * as PIXI from 'pixi.js';
import { Player } from './Player';
import { Background } from './Background';
import { Obstacles } from './Obstacles';
import { SCROLL_SPEED, OBSTACLE_SPAWN_RATE, PILL_SPAWN_RATE, COFFEE_SPAWN_RATE, CIGARETTE_SPAWN_RATE, FROG_HEART_SPAWN_RATE, FROG_REDEYES_SPAWN_RATE, FROG_HYPNO_SPAWN_RATE, BEER_SPAWN_RATE, INVULNERABILITY_DURATION, MAX_LIVES, PILL_DURATION, COFFEE_DURATION, CIGARETTE_DURATION, FROG_REDEYES_DURATION, FROG_HYPNO_DURATION, BEER_DURATION } from './constants';
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
  private undergroundBg!: PIXI.Sprite;
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
  private lastBeerSpawn = 0;
  private lastAnyCollectibleSpawn = 0;
  private rainbowHue = 0;
  private lives = 0;
  private comboCount = 0;
  private lastCollectionTime = 0;
  private readonly COMBO_TIMEOUT = 2000; 
  private effectsContainer!: PIXI.Container;
  private redEyesFrogSprite!: PIXI.Sprite;
  private hypnoFrogSprite!: PIXI.Sprite;
  private beerEffectActive = false;
  private beerTimer = 0;
  private beerPhantoms: PIXI.Sprite[] = [];
  private playerPosHistory: { x: number, y: number, rotation: number }[] = [];

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

    // Underground background (Hell Tavern)
    const undergroundTex = await PIXI.Assets.load('/underground_bg.png');
    const ugScale = this.app.screen.height / undergroundTex.height;
    
    this.undergroundBg = new PIXI.Sprite(undergroundTex);
    this.undergroundBg.anchor.set(0.5, 0);
    this.undergroundBg.scale.set(ugScale);
    this.undergroundBg.x = this.app.screen.width / 2;
    this.undergroundBg.y = this.app.screen.height; 
    this.bgContainer.addChild(this.undergroundBg);

    // Coffin sprite (hidden initially)
    const coffinTex = await PIXI.Assets.load('/coffin_sprite.png');
    this.coffinSprite = new PIXI.Sprite(coffinTex);
    this.coffinSprite.anchor.set(0.5);
    // Center it horizontally, place it significantly below for animation
    this.coffinSprite.x = this.app.screen.width / 2;
    this.coffinSprite.y = this.app.screen.height * 2.5; 
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

    this.effectsContainer = new PIXI.Container();

    const redEyesTex = await PIXI.Assets.load('/frog_redeyes_sprite.png');
    this.redEyesFrogSprite = new PIXI.Sprite(redEyesTex);
    this.redEyesFrogSprite.anchor.set(0.5);
    this.redEyesFrogSprite.position.set(this.app.screen.width / 2, this.app.screen.height / 2);
    this.redEyesFrogSprite.visible = false;
    this.redEyesFrogSprite.alpha = 0.4;
    this.app.stage.addChild(this.redEyesFrogSprite);

    const hypnoTex = await PIXI.Assets.load('/frog_hypno_sprite.png');
    this.hypnoFrogSprite = new PIXI.Sprite(hypnoTex);
    this.hypnoFrogSprite.anchor.set(0.5);
    this.hypnoFrogSprite.position.set(this.app.screen.width / 2, this.app.screen.height / 2);
    this.hypnoFrogSprite.visible = false;
    this.hypnoFrogSprite.alpha = 0.4;
    this.app.stage.addChild(this.hypnoFrogSprite);

    this.setupUI();
    this.app.stage.addChild(this.effectsContainer); // Topmost
    this.setupControls();

    const now = Date.now();
    // Randomized initial offsets to ensure a different sequence every game
    this.lastPillSpawn = now - Math.random() * PILL_SPAWN_RATE;
    this.lastCoffeeSpawn = now - Math.random() * COFFEE_SPAWN_RATE;
    this.lastCigaretteSpawn = now - Math.random() * CIGARETTE_SPAWN_RATE;
    this.lastFrogHeartSpawn = now - Math.random() * FROG_HEART_SPAWN_RATE;
    this.lastFrogRedEyesSpawn = now - Math.random() * FROG_REDEYES_SPAWN_RATE;
    this.lastFrogHypnoSpawn = now - Math.random() * FROG_HYPNO_SPAWN_RATE;
    this.lastBeerSpawn = now - Math.random() * BEER_SPAWN_RATE;
    this.lastAnyCollectibleSpawn = now - 2000; // Allow first spawn soon

    this.lives = MAX_LIVES;
    this.updateLivesUI();

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
    this.livesContainer.x = this.app.screen.width / 2;
    this.livesContainer.y = 20;
    this.app.stage.addChild(this.livesContainer);
  }

  private updateLivesUI() {
    this.livesContainer.removeChildren();
    if (!this.frogHeartTexture) return;

    const spacing = 10;
    const heartScale = 0.2;
    
    // We need one sprite to calculate width
    const tempSprite = new PIXI.Sprite(this.frogHeartTexture);
    tempSprite.scale.set(heartScale);
    const heartWidth = tempSprite.width;
    
    const totalWidth = this.lives * heartWidth + (this.lives - 1) * spacing;
    const startX = -totalWidth / 2;

    for (let i = 0; i < this.lives; i++) {
        const sprite = new PIXI.Sprite(this.frogHeartTexture);
        sprite.anchor.set(0, 0); // top left
        sprite.scale.set(heartScale);
        sprite.x = startX + i * (heartWidth + spacing);
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
    
    if (this.beerEffectActive) {
        this.player.update(ticker);
        // Add a gentle "drunk" wave to the movement speed
        const sway = Math.sin(Date.now() * 0.004) * 1.5;
        this.player.setY(this.player.getY() + sway * ticker.deltaTime);
    } else {
        this.player.update(ticker);
    }
    
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
      } else if (Date.now() - this.lastBeerSpawn > BEER_SPAWN_RATE / totalSpeedMultiplier) {
        this.collectibles.spawn('beer');
        this.lastBeerSpawn = Date.now() + this.getRandomOffset(BEER_SPAWN_RATE);
        this.lastAnyCollectibleSpawn = Date.now();
      }
    }

    // Collectible collection
    const playerBounds = this.player.getBounds();
    if (playerBounds) {
      this.collectibles.collectibles.forEach((c, index) => {
          if (this.rectIntersect(playerBounds, c.getBounds())) {
              const now = Date.now();
              if (now - this.lastCollectionTime < this.COMBO_TIMEOUT) {
                this.comboCount++;
              } else {
                this.comboCount = 1;
              }
              this.lastCollectionTime = now;

              this.showCollectionEffect(c.collectibleType, c.x, c.y, this.comboCount);

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
              } else if (c.collectibleType === 'beer') {
                this.activateBeerEffect();
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
    if (this.pillEffectActive || this.coffeeEffectActive || this.cigaretteEffectActive || this.redEyesEffectActive || this.hypnoEffectActive || this.beerEffectActive) {
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
        
        // Pulse the center frog (no rotation)
        const pulse = 1.0 + Math.sin(Date.now() * 0.01) * 0.2;
        this.redEyesFrogSprite.scale.set(0.6 * pulse);

        if (this.redEyesTimer <= 0) this.deactivateFrogRedEyesEffect();
      }

      if (this.beerEffectActive) {
        this.beerTimer -= ticker.deltaMS;
        
        // Record history for phantoms
        if (this.player.sprite) {
            this.playerPosHistory.unshift({ x: this.player.sprite.x, y: this.player.sprite.y, rotation: this.player.sprite.rotation });
        }
        if (this.playerPosHistory.length > 50) this.playerPosHistory.pop();

        // Update phantoms
        this.beerPhantoms.forEach((p, i) => {
            const delay = (i + 1) * 10;
            const historyPos = this.playerPosHistory[Math.min(delay, this.playerPosHistory.length - 1)];
            if (historyPos) {
                p.position.set(historyPos.x, historyPos.y);
                p.rotation = historyPos.rotation;
            }
        });

        // Environmental effect: pulsing blur and slight horizontal shift
        const pulseTime = Date.now() * 0.002;
        const blurPulse = Math.abs(Math.sin(pulseTime)) * 3;
        this.blurFilter.strength = blurPulse;
        
        // Slight horizontal shift/shake
        this.bgContainer.x = Math.sin(pulseTime * 2) * 2;

        if (this.beerTimer <= 0) this.deactivateBeerEffect();
      }

      if (this.hypnoEffectActive) {
        this.hypnoTimer -= ticker.deltaMS;
        this.hypnoSpiralAngle += 0.08 * totalSpeedMultiplier;
        this.hypnoSpiralOverlay.rotation = this.hypnoSpiralAngle;
        
        // Pulse the hypno frog
        const pulse = 1.0 + Math.sin(Date.now() * 0.005) * 0.15;
        this.hypnoFrogSprite.scale.set(0.5 * pulse);

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
    this.redEyesFrogSprite.visible = true;

    // Show announcement
    const announceStyle = new PIXI.TextStyle({
        fontFamily: '"Press Start 2P"',
        fontSize: 32,
        fill: '#ff0000',
        stroke: { color: '#ffffff', width: 4 },
        align: 'center',
        wordWrap: true,
        wordWrapWidth: this.app.screen.width * 0.8
    });
    const announceText = new PIXI.Text({ text: 'YOU ARE AN\nIMMORTAL SON\nOF A BITCH!', style: announceStyle });
    announceText.anchor.set(0.5);
    announceText.position.set(this.app.screen.width / 2, this.app.screen.height / 2);
    this.effectsContainer.addChild(announceText);

    // Dramatic entrance animation
    let elapsed = 0;
    const duration = 2000;
    const ticker = (t: PIXI.Ticker) => {
        elapsed += t.deltaMS;
        const progress = elapsed / duration;
        
        const scale = 0.5 + Math.sin(progress * Math.PI) * 1.5;
        announceText.scale.set(scale);
        announceText.alpha = 1 - Math.pow(progress, 3);
        
        // Shake
        announceText.x = this.app.screen.width / 2 + (Math.random() - 0.5) * 20 * (1 - progress);

        if (progress >= 1) {
            this.app.ticker.remove(ticker);
            announceText.destroy();
        }
    };
    this.app.ticker.add(ticker);
  }

  private deactivateFrogRedEyesEffect() {
    this.redEyesEffectActive = false;
    this.player.setBerserkVisuals(false);
    this.redGradientOverlay.visible = false;
    this.redEyesFrogSprite.visible = false;
  }

  private activateFrogHypnoEffect() {
    this.hypnoEffectActive = true;
    this.hypnoTimer = FROG_HYPNO_DURATION;
    this.hypnoSpiralOverlay.visible = true;
    this.hypnoFrogSprite.visible = true;
    
    // Invert the world!
    this.gameContainer.scale.y = -1;
    this.gameContainer.y = this.app.screen.height;

    // Show announcement
    const announceStyle = new PIXI.TextStyle({
        fontFamily: '"Press Start 2P"',
        fontSize: 18,
        fill: '#68f276',
        stroke: { color: '#000000', width: 4 },
        align: 'center'
    });
    const announceText = new PIXI.Text({ text: "I THINK I'M GONNA\nPUKE...", style: announceStyle });
    announceText.anchor.set(0.5);
    announceText.position.set(this.app.screen.width / 2, this.app.screen.height / 2 - 100);
    this.effectsContainer.addChild(announceText);

    // Subtle fade in/out animation
    let elapsed = 0;
    const duration = 2000;
    const ticker = (t: PIXI.Ticker) => {
        elapsed += t.deltaMS;
        const progress = elapsed / duration;
        announceText.alpha = Math.sin(progress * Math.PI);
        announceText.y -= 0.5 * t.deltaTime;

        if (progress >= 1) {
            this.app.ticker.remove(ticker);
            announceText.destroy();
        }
    };
    this.app.ticker.add(ticker);
  }

  private deactivateFrogHypnoEffect() {
    this.hypnoEffectActive = false;
    this.hypnoSpiralOverlay.visible = false;
    this.hypnoFrogSprite.visible = false;
    
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

  private activateBeerEffect() {
    this.deactivateBeerEffect(); // Reset if already active
    this.beerEffectActive = true;
    this.beerTimer = BEER_DURATION;
    
    // Create phantoms
    if (this.player.sprite) {
        for (let i = 0; i < 2; i++) {
            const phantom = new PIXI.Sprite(this.player.sprite.texture);
            phantom.anchor.set(0.5);
            phantom.alpha = 0.3 - (i * 0.1);
            phantom.scale.set(this.player.sprite.scale.x);
            phantom.tint = 0x8888ff; // Slight blue tint for "ghost" look
            this.objContainer.addChild(phantom);
            this.beerPhantoms.push(phantom);
        }

        // Pre-populate history to avoid ghosts being stuck at origin or missing
        this.playerPosHistory = [];
        for (let i = 0; i < 50; i++) {
            this.playerPosHistory.push({ 
                x: this.player.sprite.x, 
                y: this.player.sprite.y, 
                rotation: this.player.sprite.rotation 
            });
        }
    }
  }

  private deactivateBeerEffect() {
    this.beerEffectActive = false;
    this.beerPhantoms.forEach(p => p.destroy());
    this.beerPhantoms = [];
    this.playerPosHistory = [];
    if (this.blurFilter) this.blurFilter.strength = 0;
    this.bgContainer.x = 0;
  }

  private showCollectionEffect(type: 'pill' | 'coffee' | 'cigarette' | 'frog_heart' | 'frog_redeyes' | 'frog_hypno' | 'beer', x: number, y: number, combo: number) {
    const container = new PIXI.Container();
    container.x = x;
    container.y = y;
    this.effectsContainer.addChild(container);

    const style = new PIXI.TextStyle({
        fontFamily: '"Press Start 2P"',
        fontSize: 18,
        fill: 0xffffff,
        stroke: { color: 0x000000, width: 4 },
        dropShadow: {
            alpha: 0.8,
            angle: Math.PI / 6,
            blur: 0,
            color: 0x000000,
            distance: 4,
        }
    });

    const plusText = new PIXI.Text({ text: '+ ', style });
    plusText.anchor.set(0, 0.5);
    container.addChild(plusText);

    const texture = this.collectibles.getTexture(type);
    if (texture) {
        const icon = new PIXI.Sprite(texture);
        icon.anchor.set(0, 0.5);
        icon.x = plusText.width;
        icon.scale.set(0.1); // Small icon
        container.addChild(icon);
    }

    const isHeart = type === 'frog_heart';
    const isBeer = type === 'beer';
    const isPoopEffect = this.coffeeEffectActive && this.cigaretteEffectActive;
    const isBadCombo = this.pillEffectActive && this.beerEffectActive;
    const isRushEffect = isBeer;
    const isHealthyEffect = isHeart;

    if (combo > 1 || isPoopEffect || isBadCombo || isRushEffect || isHealthyEffect) {
        const comboStyle = new PIXI.TextStyle({
            fontFamily: '"Press Start 2P"',
            fontSize: combo > 5 ? 32 : 24,
            fill: isHealthyEffect ? 0x4dff4d : (isBadCombo ? 0xFFFF00 : (isRushEffect ? 0xFFFF00 : (isPoopEffect ? 0xFF0000 : (combo > 5 ? 0xFFFF00 : 0xFF9900)))), 
            stroke: { color: 0x000000, width: 6 },
            dropShadow: { color: (isHealthyEffect || isPoopEffect || isBadCombo || isRushEffect) ? 0x000000 : 0xff0000, alpha: 0.5, distance: 4, angle: Math.PI/4 }
        });

        let textContent = `COMBO x${combo}`;
        if (isHealthyEffect) textContent = 'ЖИВУЧАЯ ТВАРЬ!';
        else if (isBadCombo) textContent = 'ПЛОХОЕ СОЧЕТАНИЕ!';
        else if (isRushEffect) textContent = 'РВАНУЛИ!';
        else if (isPoopEffect) textContent = 'ХОЧУ КАKАТЬ!';

        const comboText = new PIXI.Text({ text: textContent, style: comboStyle });
        comboText.anchor.set(0.5);
        comboText.position.set(0, -40);
        comboText.label = 'comboText'; // Tag for easier finding
        container.addChild(comboText);
        
        // Mortal Kombat style scale animation
        comboText.scale.set(0.5);
    }

    // Animation ticker
    let elapsed = 0;
    const duration = 1500;
    const ticker = (t: PIXI.Ticker) => {
        elapsed += t.deltaMS;
        const progress = elapsed / duration;
        
        container.y -= 1 * t.deltaTime;
        container.alpha = 1 - progress;

        // Animate combo text scale if it exists
        const comboTextObj = container.getChildByName('comboText');
        if (comboTextObj) {
            comboTextObj.scale.set(0.5 + Math.sin(progress * Math.PI) * 0.8);
        }

        if (progress >= 1) {
            this.app.ticker.remove(ticker);
            container.destroy({ children: true });
        }
    };
    this.app.ticker.add(ticker);
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
    this.deactivateBeerEffect();

    // Death announcement Style
    const style = new PIXI.TextStyle({
        fontFamily: '"Press Start 2P"',
        fontSize: 64,
        fill: '#FF0000',
        fontWeight: 'bold',
        stroke: { color: '#000000', width: 8 },
        dropShadow: { color: '#000000', alpha: 0.5, distance: 6, angle: Math.PI / 4 }
    });
    const text = new PIXI.Text({ text: 'ОКАК!', style });
    text.anchor.set(0.5);
    text.position.set(this.app.screen.width / 2, this.app.screen.height / 2);
    this.effectsContainer.addChild(text);

    // Animation for ОКАК!
    let elapsed = 0;
    const ticker = (t: PIXI.Ticker) => {
        elapsed += t.deltaMS;
        const pulse = 1 + Math.sin(elapsed * 0.01) * 0.1;
        text.scale.set(pulse);
        if (elapsed > 2000) {
            this.app.ticker.remove(ticker);
            text.destroy();
        }
    };
    this.app.ticker.add(ticker);

    this.player.die(type);
    
    // Slight delay before transitioning down
    setTimeout(() => {
        this.coffinSprite.visible = true;
        // Scene transition effect: camera move down smoothly
        const transitionTicker = new PIXI.Ticker();
        const targetStageY = -this.app.screen.height;
        const targetCoffinY = this.app.screen.height + (this.app.screen.height * 0.5);

        transitionTicker.add(() => {
            // Animate camera
            if (this.app.stage.y > targetStageY) {
                this.app.stage.y += (targetStageY - this.app.stage.y) * 0.05;
                
                // Animate coffin sliding up faster than camera
                this.coffinSprite.y += (targetCoffinY - this.coffinSprite.y) * 0.08;

                if (Math.abs(targetStageY - this.app.stage.y) < 1) {
                    this.app.stage.y = targetStageY;
                    this.coffinSprite.y = targetCoffinY;
                    transitionTicker.stop();
                    
                    
                    // Trigger REACT GAMEOVER State after camera finishes panning
                    this.app.ticker.stop();
                    this.onGameOver(Math.floor(this.score));
                }
            }
        });
        transitionTicker.start();
    }, 1000);
  }

  public destroy() {
    this.isPlaying = false;
    if (this.app && this.app.ticker) {
      this.app.ticker.remove(this.gameLoop, this);
    }
    // Clear filters to avoid rendering issues during destruction
    if (this.bgContainer) {
      this.bgContainer.filters = [];
    }
  }

  private getRandomOffset(rate: number): number {
    return (Math.random() - 0.5) * rate * 0.4; // +/- 20% randomness
  }
}
