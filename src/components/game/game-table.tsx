import { Player as PlayerType, Card as CardType, GameLog as GameLogType } from '@/lib/poker-engine';
import { Player } from './player';
import { Card } from './card';
import { GameLog } from './game-log';

interface TableProps {
  players: PlayerType[];
  communityCards: CardType[];
  pot: number;
  dealerIdx: number;
  currentTurnIdx: number;
  stage: string;
  logs: GameLogType[];
  winners?: number[];
  winningCards?: CardType[];
}

export function GameTable({ players, communityCards, pot, dealerIdx, currentTurnIdx, stage, logs, winners, winningCards }: TableProps) {
  // Mobile/Desktop positions
  // Updated aspect ratios for better mobile spacing (taller table)

  // Position config
  const positions = [
    "bottom-[0%] left-1/2 -translate-x-1/2 translate-y-[25%] z-20", // P0 (You) - Center bottom
    "bottom-[0%] left-[5%] sm:bottom-[10%] sm:left-[-5%] z-10",       // P1 - Bottom Left
    "top-[-8%] left-[5%] sm:top-[12%] sm:left-[-5%] z-10",           // P2 - Top Left
    "top-[-20%] left-[26%] sm:top-[-15%] sm:left-[25%] z-10",         // P3 - Top Left-Center
    "top-[-20%] right-[26%] sm:top-[-15%] sm:right-[25%] z-10",       // P4 - Top Right-Center
    "top-[-8%] right-[5%] sm:top-[12%] sm:right-[-5%] z-10",         // P5 - Top Right
    "bottom-[0%] right-[5%] sm:bottom-[10%] sm:right-[-5%] z-10",     // P6 - Bottom Right
  ];

  return (
    // Mobile: much taller (1/1.5) to fit logs. Desktop: wider (1/0.6).
    <div className="relative w-full max-w-[900px] h-auto max-h-[65vh] aspect-[1/1] sm:aspect-[1/0.7] mx-auto flex-shrink-0 transition-all duration-300">
      {/* The Felt Table */}
      <div className="absolute inset-0 bg-gray-200 dark:bg-zinc-900 border-[8px] sm:border-[12px] border-gray-300 dark:border-zinc-800 rounded-[100px] sm:rounded-[200px] shadow-[inset_0_0_60px_rgba(0,0,0,0.1)] dark:shadow-[inset_0_0_60px_rgba(0,0,0,0.5)]">

        {/* Pot Display */}
        <div className="absolute top-[18%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
          <div className="px-3 py-1 sm:px-4 sm:py-1.5 bg-white/80 dark:bg-black/60 rounded-full border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-zinc-100 font-bold font-mono text-sm sm:text-lg shadow-sm backdrop-blur-sm whitespace-nowrap">
            Pot: ${pot}
          </div>
        </div>

        {/* Community Cards */}
        <div className="absolute top-[35%] left-1/2 -translate-x-1/2 -translate-y-1/2 flex gap-1 sm:gap-2 items-center justify-center z-10 w-full px-2">
          {communityCards.map((card, i) => {
            const isWinningCard = winningCards?.some(wc => wc.rank === card.rank && wc.suit === card.suit);
            return <Card key={i} card={card} isWinning={isWinningCard} />;
          })}
          {Array.from({ length: 5 - communityCards.length }).map((_, i) => (
            <div key={`empty-${i}`} className="w-8 h-11 sm:w-12 sm:h-16 border-[1px] sm:border-2 border-dashed border-zinc-400 dark:border-white/20 rounded-sm sm:rounded-md bg-transparent" />
          ))}
        </div>

        {/* Game Log */}
        <div className="absolute bottom-[8%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 sm:w-1/2 z-0 pointer-events-auto">
          {/* Scale down slightly on mobile to fit */}
          <div className="origin-top scale-75 sm:scale-100">
            <GameLog logs={logs} players={players} communityCards={communityCards} />
          </div>
        </div>

      </div>

      {/* Players */}
      {players.map((p) => (
        <Player
          key={p.id}
          player={p}
          isActiveTurn={p.id === currentTurnIdx && stage !== 'showdown'}
          isDealer={p.id === dealerIdx}
          gameStage={stage}
          className={positions[p.id]}
          isWinner={winners?.includes(p.id)}
          winningCards={winningCards}
        />
      ))}
    </div>
  );
}
