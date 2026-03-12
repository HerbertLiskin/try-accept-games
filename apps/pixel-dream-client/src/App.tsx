import { useState, useCallback, useRef, useEffect } from 'react';
import GameCanvas from './components/GameCanvas';
import Leaderboard from './components/Leaderboard';
import { soundManager } from './game/SoundManager';
import './App.css';

interface IOSNavigator extends Navigator {
  standalone?: boolean;
}

type GameState = 'LOADING' | 'SPLASH' | 'MENU' | 'PLAYING' | 'GAMEOVER';

function App() {
  const [gameState, setGameState] = useState<GameState>('LOADING');
  const [splashStep, setSplashStep] = useState(0); // 0: ОКАК! GAMES, 1: PRESENTS, 2: DONE
  const [loadingText, setLoadingText] = useState('LOADING');
  const [isExiting, setIsExiting] = useState(false);
  const [isMobile] = useState(() => {
    if (typeof navigator === 'undefined') return false;
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  });
  const [isStandalone] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(display-mode: standalone)').matches || (navigator as IOSNavigator).standalone;
  });
  const [score, setScore] = useState(0);
  const [gameId, setGameId] = useState(0);
  const [isRussian] = useState(() => {
    if (typeof navigator === 'undefined') return false;
    return navigator.language.toLowerCase().startsWith('ru');
  });
  const [isPortrait, setIsPortrait] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkOrientation = () => {
      setIsPortrait(window.innerHeight > window.innerWidth);
    };
    window.addEventListener('resize', checkOrientation);
    checkOrientation();
    return () => window.removeEventListener('resize', checkOrientation);
  }, []);

  const t = {
    installTitle: isRussian ? 'ДЛЯ ЗАПУСКА НА МОБИЛКЕ' : 'TO PLAY ON MOBILE',
    installSub: isRussian ? 'УСТАНОВИ ПРИЛОЖЕНИЕ' : 'INSTALL THE APP',
    step1: isRussian ? '1. Открой в Chrome (Android) или Safari (iOS)' : '1. Open in Chrome (Android) or Safari (iOS)',
    step2: isRussian ? '2. Нажми "Поделиться" или три точки' : '2. Tap "Share" or the three dots',
    step3: isRussian ? '3. Выбери "На экран Домой" или "Установить"' : '3. Select "Add to Home Screen" or "Install"',
    pwaOnly: isRussian ? 'Игра доступна только как PWA' : 'Game only available as PWA',
    rotate: isRussian ? 'ПЕРЕВЕРНИ ЭКРАН' : 'ROTATE SCREEN',
    start: isRussian ? 'СТАРТ' : 'START GAME',
    tryAccept: 'TRY.ACCEPT',
    streaming: isRussian ? 'СЛУШАТЬ В СТРИМИНГЕ' : 'LISTEN ON STREAMING',
    description: isRussian ? 'Лети сквозь сумерки. Избегай петлей и бритв.' : 'Fly through the twilight. Avoid nooses and razors.',
  };

  useEffect(() => {
    if (gameState === 'LOADING') {
      let dots = 0;
      const interval = setInterval(() => {
        dots = (dots + 1) % 4;
        setLoadingText('LOADING' + '.'.repeat(dots));
      }, 500);

      const timer = setTimeout(() => {
        clearInterval(interval);
        setGameState('SPLASH');
      }, 3000);

      return () => {
        clearInterval(interval);
        clearTimeout(timer);
      };
    }
    
    if (gameState === 'SPLASH') {
      const timers: NodeJS.Timeout[] = [];
      
      // Step 0: ОКАК! GAMES
      timers.push(setTimeout(() => setIsExiting(true), 1500));
      timers.push(setTimeout(() => {
        setSplashStep(1);
        setIsExiting(false);
      }, 2000));

      // Step 1: PRESENTS
      timers.push(setTimeout(() => setIsExiting(true), 3500));
      timers.push(setTimeout(() => {
        setSplashStep(2);
        setGameState('MENU');
      }, 4000));

      return () => timers.forEach(clearTimeout);
    }

    if (gameState === 'MENU') {
      // Audio is handled by the interaction listener
    }
  }, [gameState]);

  // const toggleFullscreen = () => {
  //   if (!containerRef.current) return;
  //   if (!document.fullscreenElement) {
  //     containerRef.current.requestFullscreen().catch(err => {
  //       console.error(`Error attempting to enable full-screen mode: ${err.message}`);
  //     });
  //   } else {
  //     document.exitFullscreen();
  //   }
  // };

  const startGame = () => {
    setScore(0);
    setGameId(prev => prev + 1);
    setGameState('PLAYING');
  };

  useEffect(() => {
    soundManager.init(); // Initialize once on mount
    
    const handleInteraction = () => {
      soundManager.playBgm();
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
    };
    window.addEventListener('click', handleInteraction);
    window.addEventListener('keydown', handleInteraction);
    return () => {
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
    };
  }, []);

  const handleGameOver = useCallback((finalScore: number) => {
    setScore(finalScore);
    setGameState('GAMEOVER');
  }, []);

  return (
    <>
      <div ref={containerRef} className="max-w-[100vw] mx-auto text-center flex flex-col justify-center items-center h-screen w-screen overflow-hidden relative z-10 bg-[#3b285c]">
        {isMobile && !isStandalone && (
          <div className="fixed inset-0 bg-black z-[10000] flex flex-col items-center justify-center p-8 text-center text-white font-['Press_Start_2P']">
            <h2 className="text-brandRed text-[1.2rem] mb-2 leading-relaxed text-center">{t.installTitle}</h2>
            <h2 className="text-brandRed text-[1.2rem] mb-8 leading-relaxed text-center">{t.installSub}</h2>
            <div className="space-y-6 text-[0.6rem] leading-loose max-w-[400px] text-center">
              <p>{t.step1}</p>
              <p>{t.step2}</p>
              <p>{t.step3}</p>
            </div>
            <p className="mt-12 text-[0.5rem] opacity-50 uppercase italic">{t.pwaOnly}</p>
          </div>
        )}

        {isMobile && isStandalone && isPortrait && (
          <div className="fixed inset-0 bg-[#1a0f2e] z-[10001] flex flex-col items-center justify-center p-8 text-center text-white font-['Press_Start_2P']">
            <div className="w-24 h-24 mb-8 animate-bounce">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-brandRed">
                <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                <path d="M12 18h.01" />
              </svg>
            </div>
            <h2 className="text-brandRed text-[1.5rem] animate-pulse uppercase leading-tight">{t.rotate}</h2>
          </div>
        )}

        {gameState === 'LOADING' && (
          <div className="absolute inset-0 bg-black z-[60] flex flex-col items-center justify-center">
            <div className="flex items-center text-white text-[2rem] font-['Press_Start_2P'] mb-8">
              <span>LOADING</span>
              <span className="w-[3em] text-left ml-2">{loadingText.replace('LOADING', '')}</span>
            </div>
            <div className="text-brandRed text-[1.2rem] font-['Press_Start_2P'] animate-pulse text-center px-4 max-w-[80%] leading-relaxed">
              НАБЕРИСЬ ТЕРПЕНИЯ,<br/>СУКИН СЫН!
            </div>
          </div>
        )}

        {gameState === 'SPLASH' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black z-50">
            {splashStep === 0 && (
              <div className={`splash-text ${isExiting ? 'fade-out' : ''}`}>
                <div className="text-[1.5rem] mb-2">ОКАК!</div>
                <div className="text-[3rem] splash-games">GAMES</div>
              </div>
            )}
            {splashStep === 1 && (
              <div className={`splash-text splash-presents ${isExiting ? 'fade-out' : ''}`}>
                PRESENTS
              </div>
            )}
          </div>
        )}

        {gameState === 'MENU' && (
          <div className="bg-black/70 p-8 border-4 border-white shadow-[8px_8px_0px_rgba(0,0,0,0.5)] max-w-[90%] w-[500px] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center">
            <h1 className="text-[2.5rem] mb-4 text-brandRed tracking-[4px]">
              RIDGES OF
              <br />
              DEPRESSION
            </h1>
            <p className="text-[0.8rem] leading-relaxed mb-8 text-brandPurpleDark px-4">{t.description}</p>
            <button onClick={startGame}>{t.start}</button>
          </div>
        )}

        {(gameState === 'PLAYING' || gameState === 'GAMEOVER') && (
          <GameCanvas key={gameId} onGameOver={handleGameOver} />
        )}

        {gameState === 'GAMEOVER' && (
          <div className="min-w-[504px] bg-black/70 border-4 border-white shadow-[8px_8px_0px_rgba(0,0,0,0.5)] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[999] pointer-events-auto max-h-full flex flex-col">
            <div className="flex-1 overflow-y-auto p-4 pb-4 custom-scrollbar">
              <Leaderboard score={score} />
            </div>
            <div className="p-8 pt-0 pb-6 flex flex-col gap-4 justify-center">
              <button className="w-full" onClick={startGame}>{t.tryAccept}</button>
              <a 
                href="https://band.link/ritualpriniatia" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-full text-center rounded-none border-4 border-white px-[1.2em] py-[0.8em] text-[0.8rem] font-medium bg-brandGreen text-black cursor-pointer uppercase transition-colors duration-200 active:translate-y-[2px] active:translate-x-[2px] shadow-[4px_4px_0px_#000] hover:bg-[#3be03b] active:shadow-[2px_2px_0px_#000] no-underline"
              >
                {t.streaming}
              </a>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default App;
