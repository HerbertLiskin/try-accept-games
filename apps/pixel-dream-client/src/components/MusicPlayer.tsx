import React, { useState, useEffect } from 'react';
import { soundManager } from '../game/SoundManager';

const MusicPlayer: React.FC = () => {
    const [trackName, setTrackName] = useState(soundManager.getCurrentTrackName());

    useEffect(() => {
        const interval = setInterval(() => {
            setTrackName(soundManager.getCurrentTrackName());
        }, 500);
        return () => clearInterval(interval);
    }, []);

    const handlePrev = (e: React.MouseEvent) => {
        e.stopPropagation();
        soundManager.prevTrack();
        setTrackName(soundManager.getCurrentTrackName());
    };

    const handleNext = (e: React.MouseEvent) => {
        e.stopPropagation();
        soundManager.nextTrack();
        setTrackName(soundManager.getCurrentTrackName());
    };

    return (
        <div className="fixed top-6 right-6 z-[200] flex flex-col items-end gap-2 p-3 bg-black/60 border-2 border-white/20 hover:bg-black/80 transition-colors">
            <div className="text-[0.4rem] uppercase tracking-[1px] opacity-60 text-white font-pixel">Track</div>
            <div className="text-[0.5rem] text-brandPurpleLight truncate max-w-[120px] text-right font-pixel">
                {trackName.toUpperCase()}
            </div>
            <div className="flex items-center gap-2 mt-1">
                <button 
                  onClick={handlePrev}
                  className="!px-2 !py-1 !text-[0.6rem] !border-2 !bg-[#2a1d42] hover:!bg-[#4a3472] active:scale-90 transition-transform"
                >
                    &lt;
                </button>
                <button 
                  onClick={handleNext}
                  className="!px-2 !py-1 !text-[0.6rem] !border-2 !bg-[#2a1d42] hover:!bg-[#4a3472] active:scale-90 transition-transform"
                >
                    &gt;
                </button>
            </div>
        </div>
    );
};

export default MusicPlayer;
