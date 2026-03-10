import * as PIXI from 'pixi.js';
import { Player } from './Player';
import { Background } from './Background';
import { Obstacles } from './Obstacles';
import { SCROLL_SPEED, OBSTACLE_SPAWN_RATE } from './constants';
import { soundManager } from './SoundManager';

export class GameManager {
  public app: PIXI.Application;
  public onGameOver: (score: number) => void;
  
  private player!: Player;
  private background!: Background;
  private obstacles!: Obstacles;
  private score = 0;
  private isPlaying = false;
  
  private scoreText!: PIXI.Text;
  private undergroundBg!: PIXI.Sprite;
  private coffinSprite!: PIXI.Sprite;

  constructor(app: PIXI.Application, onGameOver: (score: number) => void) {
    this.app = app;
    this.onGameOver = onGameOver;
  }

  async init() {
    this.background = new Background(this.app, this.app.stage);
    await this.background.init();

    // Underground background (always drawn behind player, placed below twilight bg initially)
    const undergroundTex = await PIXI.Assets.load('/underground_bg.png');
    this.undergroundBg = new PIXI.Sprite(undergroundTex);
    this.undergroundBg.width = this.app.screen.width;
    this.undergroundBg.height = this.app.screen.height;
    this.undergroundBg.y = this.app.screen.height; // starts exactly below the screen
    this.app.stage.addChild(this.undergroundBg);

    // Coffin sprite (hidden initially)
    const coffinTex = await PIXI.Assets.load('/coffin_sprite.png');
    this.coffinSprite = new PIXI.Sprite(coffinTex);
    this.coffinSprite.anchor.set(0.5);
    // Center it horizontally, place it higher vertically in the underground scene
    this.coffinSprite.x = this.app.screen.width / 2;
    this.coffinSprite.y = this.app.screen.height + (this.app.screen.height * 0.35); // Higher up 
    this.coffinSprite.scale.set(0.5);
    this.coffinSprite.visible = false;
    this.app.stage.addChild(this.coffinSprite);

    this.obstacles = new Obstacles(this.app, this.app.stage);
    await this.obstacles.init();

    this.player = new Player(this.app.stage);
    await this.player.init(this.app.screen.width / 4, this.app.screen.height / 2);

    this.setupUI();
    this.setupControls();

    soundManager.init();
    soundManager.playBgm();

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

    this.background.update(ticker);
    this.player.update(ticker);
    
    // Increase obstacle spawn rate dynamically
    const difficultyMultiplier = Math.max(0.5, 1 - (this.score / 50));
    this.obstacles.update(ticker, OBSTACLE_SPAWN_RATE * difficultyMultiplier);

    // Score increments every frame based on scroll speed
    this.score += SCROLL_SPEED * ticker.deltaTime * 0.01;
    this.scoreText.text = `Score: ${Math.floor(this.score)}`;

    // Floor / Ceiling collision
    if (this.player.getY() < 0 || this.player.getY() > this.app.screen.height) {
      this.triggerDeath('ground');
      return;
    }

    // Obstacle collisions
    const collision = this.obstacles.checkCollisions(this.player.getBounds());
    if (collision === 'top') {
      this.triggerDeath('noose');
    } else if (collision === 'bottom') {
      this.triggerDeath('razor');
    }
  }

  private triggerDeath(type: 'ground' | 'noose' | 'razor') {
    this.isPlaying = false;
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
