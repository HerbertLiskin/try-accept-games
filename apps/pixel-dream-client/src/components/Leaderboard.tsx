import { trpc } from '../trpc';
import { useState } from 'react';

interface LeaderboardProps {
  score: number;
}

export default function Leaderboard({ score }: LeaderboardProps) {
  const [name, setName] = useState('');
  const [submitted, setSubmitted] = useState(false);
  
  const utils = trpc.useUtils();
  const leaderboardQuery = trpc.getLeaderboard.useQuery();
  const submitScoreMutation = trpc.submitScore.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      utils.getLeaderboard.invalidate();
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      submitScoreMutation.mutate({ name: name.trim().slice(0, 20), score });
    }
  };

  return (
    <div className="mt-8 w-full text-left">
      {!submitted ? (
        <form className="flex flex-col items-center gap-4 mt-4 w-full" onSubmit={handleSubmit}>
          <p>You died! Submit your score:</p>
          <div className="flex w-full justify-center">
            <input 
              type="text" 
              placeholder="Your name (max 20)" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={20}
              autoFocus
              required
            />
            <button type="submit" disabled={submitScoreMutation.isPending}>
              {submitScoreMutation.isPending ? '...' : 'SAVE'}
            </button>
          </div>
        </form>
      ) : (
        <p className="text-center text-[#68f276]">Score submitted!</p>
      )}

      {leaderboardQuery.isLoading && <p className="text-white">Reading gravestones...</p>}
      
      {leaderboardQuery.data && leaderboardQuery.data.length > 0 ? (
        leaderboardQuery.data.slice(0, 5).map((entry, index) => (
          <div key={entry.id} className="flex justify-between mb-2 text-[0.7rem] border-b-2 border-dashed border-[#444] pb-2 text-white">
            <span className="overflow-hidden text-ellipsis whitespace-nowrap max-w-[150px] inline-block">
              {index + 1}. {entry.name}
            </span>
            <span className="text-brandRed">{entry.score}</span>
          </div>
        ))
      ) : (
        !leaderboardQuery.isLoading && <p className="text-[0.7rem] text-center">No bodies found yet.</p>
      )}
    </div>
  );
}
