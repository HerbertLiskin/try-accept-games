import { useState, useCallback, useRef } from 'react';
import GameCanvas from './components/GameCanvas';
import Leaderboard from './components/Leaderboard';
import './App.css';

type GameState = 'MENU' | 'PLAYING' | 'GAMEOVER';

function App() {
  const [gameState, setGameState] = useState<GameState>('MENU');
  const [score, setScore] = useState(0);
  const [gameId, setGameId] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

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

  const handleGameOver = useCallback((finalScore: number) => {
    setScore(finalScore);
    setGameState('GAMEOVER');
  }, []);

  return (
    <>
      <div className="hidden max-md:portrait:flex fixed top-0 left-0 w-screen h-screen bg-black text-white z-[9999] justify-center items-center text-center p-8">
        <div>
          <h2>PLEASE ROTATE</h2>
          <p className="mt-4">This game is designed for landscape mode.</p>
        </div>
      </div>
      <div ref={containerRef} className="max-w-[100vw] mx-auto text-center flex flex-col justify-center items-center h-screen w-screen overflow-hidden relative z-10 bg-[#3b285c]">
        {/* <button 
          onClick={toggleFullscreen}
          className="fixed top-4 right-4 z-[100] p-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded text-[0.7rem] opacity-50 hover:opacity-100 transition-opacity"
        >
          {document.fullscreenElement ? 'Exit Fullscreen' : 'Fullscreen'}
        </button> */}
        {gameState === 'MENU' && (
        <div className="bg-black/70 p-8 border-4 border-white shadow-[8px_8px_0px_rgba(0,0,0,0.5)] max-w-[90%] w-[500px] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center">
          <h1 className="text-[2.5rem] mb-4 text-brandRed tracking-[4px]">
            RIDGES OF
            <br />
            DEPRESSION
          </h1>
          <p className="text-[0.8rem] leading-relaxed mb-8 text-brandPurpleDark">Fly through the twilight. Avoid nooses and razors.</p>
          <button onClick={startGame}>Start Game</button>
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
          <div className="p-8 pt-0 pb-6 flex justify-center">
            <button className="w-full" onClick={startGame}>Try Again</button>
          </div>
        </div>
      )}
      </div>
    </>
  );
}

export default App;
