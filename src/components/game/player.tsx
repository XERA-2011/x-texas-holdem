import { Player as PlayerType, Card as CardType } from '@/lib/poker-engine';
import { Card } from './card';
import { Loader2 } from 'lucide-react';

interface PlayerProps {
  player: PlayerType;
  isActiveTurn: boolean;
  isDealer: boolean;
  gameStage: string;
  className?: string;
  winningCards?: CardType[];
  isWinner?: boolean;
}

export function Player({ player, isActiveTurn, isDealer, gameStage, className = "", winningCards, isWinner }: PlayerProps) {
  const showFace = player.isHuman || gameStage === 'showdown';

  return (
    <div className={`absolute flex flex-col items-center transition-all duration-300 ${className} ${(player.status === 'folded' || player.isEliminated) ? 'opacity-40' : ''}`}>

      {/* Speech Bubble */}
      {player.currentSpeech && (
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap z-50 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="relative bg-white text-black text-xs font-bold px-3 py-1.5 rounded-xl shadow-lg border border-gray-200">
            {player.currentSpeech}
            {/* Triangle */}
            <div className="absolute bottom-[-4px] left-1/2 -translate-x-1/2 w-2 h-2 bg-white rotate-45 border-b border-r border-gray-200"></div>
          </div>
        </div>
      )}

      {/* Player Info Box */}

      {/* Bet Badge - In flow (pushes info box down) */}
      {player.status !== 'folded' && player.status !== 'eliminated' && player.currentBet > 0 && (
        <div className="mb-1 z-30 animate-in fade-in zoom-in-50 duration-200">
          <div className="bg-yellow-400 dark:bg-yellow-600 text-black dark:text-white px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold shadow-md border border-yellow-500 dark:border-yellow-400 flex flex-col items-center leading-tight">
            <span className="text-[8px] opacity-80 uppercase leading-none mb-0.5">Bet</span>
            ${player.currentBet}
          </div>
        </div>
      )}
      <div
        className={`
          relative mb-1 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded border 
          text-[10px] sm:text-xs md:text-sm lg:text-base 
          text-center 
          min-w-[60px] sm:min-w-[80px] md:min-w-[100px] lg:min-w-[120px]
          transition-colors duration-300
          ${isWinner ? 'bg-gradient-to-r from-yellow-300 to-amber-500 border-yellow-600 text-black scale-110 z-30 shadow-[0_0_15px_rgba(234,179,8,0.5)]' : ''}
          ${isActiveTurn && !isWinner ? 'bg-black border-black text-white dark:bg-white dark:border-white dark:text-black scale-105 z-20 shadow-lg' : ''}
          ${!isActiveTurn && !isWinner ? 'bg-white/90 border-zinc-200 text-zinc-900 dark:bg-neutral-900/80 dark:border-neutral-700 dark:text-neutral-300' : ''}
          ${player.isEliminated ? 'opacity-50 grayscale' : ''}
        `}
      >
        <div className="font-bold truncate max-w-[60px] sm:max-w-none mx-auto text-[9px] sm:text-xs md:text-sm lg:text-base">
          {player.name}
        </div>
        <div className={`font-mono leading-none md:text-lg ${isWinner ? 'text-black font-black' : (isActiveTurn ? 'text-zinc-200 dark:text-zinc-800' : 'text-zinc-600 dark:text-zinc-400')}`}>${player.chips}</div>

        {/* Status Badge */}
        {player.status !== 'active' && (
          <div className={`text-[9px] sm:text-[10px] md:text-xs lg:text-sm uppercase font-bold mt-0.5 leading-none ${isWinner ? 'text-amber-900' : 'text-slate-400'}`}>
            {player.status === 'folded' && 'Fold'}
            {player.status === 'allin' && <span className="font-black text-red-600 dark:text-red-500">All-in</span>}
            {player.status === 'eliminated' && 'Out'}
          </div>
        )}


        {/* Hand Description Badge (Showdown) */}
        {player.handDescription && (
          <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 z-40 whitespace-nowrap">
            <div className={`
              px-2 py-1 rounded text-[10px] sm:text-xs font-bold shadow-lg border backdrop-blur-sm animate-in zoom-in-50 duration-300
              ${isWinner
                ? 'bg-gradient-to-r from-yellow-300 to-amber-400 text-black border-yellow-500 shadow-yellow-500/50'
                : 'bg-zinc-900 text-white dark:bg-white dark:text-black border-zinc-700 dark:border-zinc-300'
              }
            `}>
              {player.handDescription}
            </div>
          </div>
        )}

        {/* Dealer Button */}
        {isDealer && (
          <div className="absolute -top-1.5 -right-1.5 sm:-top-2 sm:-right-2 md:-top-3 md:-right-3 w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 rounded-full bg-white text-black font-bold text-[8px] sm:text-[10px] md:text-xs flex items-center justify-center border border-gray-400 shadow-sm z-30">
            D
          </div>
        )}
      </div>


      {/* Cards */}
      <div className={`relative flex gap-0.5 sm:gap-1 ${player.status === 'folded' ? 'opacity-40 grayscale' : ''}`}>
        {player.hand.length > 0 ? (
          player.hand.map((card, idx) => {
            const isWinningCard = winningCards?.some(wc => wc.rank === card.rank && wc.suit === card.suit);
            return <Card key={idx} card={card} hidden={!showFace} isWinning={isWinningCard} />;
          })
        ) : (
          // Placeholder empty layout if no cards dealt yet
          <div className="h-11 sm:h-14 w-0"></div>
        )}

        {/* Thinking Indicator Overlay */}
        {isActiveTurn && !isWinner && !player.isHuman && player.status === 'active' && (
          <div className="absolute inset-0 z-50 flex items-center justify-center">
            <div className="bg-black/80 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1 shadow-lg border border-white/20 backdrop-blur-sm animate-in fade-in duration-200 whitespace-nowrap">
              <Loader2 className="w-2.5 h-2.5 animate-spin text-white" />
              <span>思考中</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
