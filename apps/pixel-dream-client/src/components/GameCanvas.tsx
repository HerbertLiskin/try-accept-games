import { useEffect, useRef } from 'react';
import * as PIXI from 'pixi.js';
import { GameManager } from '../game/GameManager';

interface GameCanvasProps {
  onGameOver: (score: number) => void;
}

export default function GameCanvas({ onGameOver }: GameCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const initPixi = async () => {
      const app = new PIXI.Application();
      await app.init({
        width: window.innerWidth,
        height: window.innerHeight,
        backgroundColor: 0x1a0f2e,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      });

      containerRef.current?.appendChild(app.canvas);
      appRef.current = app;

      const gameManager = new GameManager(app, onGameOver);
      await gameManager.init();

      // Handle window resize
      const handleResize = () => {
        app.renderer.resize(window.innerWidth, window.innerHeight);
      };
      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
        gameManager.destroy(); // CLEANUP GAME SYSTEMS (SOUND, ETC)
        app.destroy({ removeView: true }, { children: true });
      };
    };

    const cleanup = initPixi();

    return () => {
      cleanup.then(cleanupFn => cleanupFn && cleanupFn());
      if (appRef.current) {
        appRef.current = null;
      }
    };
  }, [onGameOver]);

  return <div ref={containerRef} className="w-[100vw] h-[100vh] flex justify-center items-center bg-black absolute top-0 left-0 z-5 [&>canvas]:block" />;
}
