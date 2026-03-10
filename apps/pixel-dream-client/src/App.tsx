import { useState, useCallback } from 'react';
import GameCanvas from './components/GameCanvas';
import Leaderboard from './components/Leaderboard';
import './App.css';

type GameState = 'MENU' | 'PLAYING' | 'GAMEOVER';

function App() {
  const [gameState, setGameState] = useState<GameState>('MENU');
  const [score, setScore] = useState(0);
  const [gameId, setGameId] = useState(0);

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
      <div className="max-w-[100vw] mx-auto text-center flex flex-col justify-center items-center h-screen w-screen overflow-hidden relative z-10">
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
        <div className="p-4 max-w-[90%] w-[400px] absolute top-[65%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-[999] flex flex-col items-center bg-transparent border-none shadow-none pointer-events-auto">
          <Leaderboard score={score} />
          <button className="mt-8" onClick={startGame}>Try Again</button>
        </div>
      )}
      </div>
    </>
  );
}

export default App;
