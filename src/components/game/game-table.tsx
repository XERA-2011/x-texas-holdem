import { Player as PlayerType, Card as CardType, GameLog as GameLogType } from '@/lib/poker-engine';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  // Mobile/Desktop positions
  // Updated aspect ratios for better mobile spacing (taller table)

  // Position config for 8 players
  // Layout: P0(bottom) -> P1(bottom-left) -> P2(left) -> P3(top-left) -> P4(top-center) -> P5(top-right) -> P6(right) -> P7(bottom-right)
  const positions = [
    "bottom-[0%] left-1/2 -translate-x-1/2 translate-y-[25%] z-20",                          // P0 (You) - 底部中央
    "bottom-[8%] left-[6%] lg:bottom-[12%] lg:left-[-5%] z-10",                              // P1 - 左下角
    "top-[28%] left-[2%] lg:top-[25%] lg:left-[-8%] z-10",                                  // P2 - 左侧中间
    "top-[-10%] left-[15%] lg:top-[-8%] lg:left-[12%] z-10",                                 // P3 - 顶部左侧
    "top-[-20%] left-1/2 -translate-x-1/2 z-10",                                             // P4 - 顶部中央
    "top-[-10%] right-[15%] lg:top-[-8%] lg:right-[12%] z-10",                               // P5 - 顶部右侧
    "top-[28%] right-[2%] lg:top-[25%] lg:right-[-8%] z-10",                                 // P6 - 右侧中间
    "bottom-[8%] right-[6%] lg:bottom-[12%] lg:right-[-5%] z-10",                            // P7 - 右下角
  ];

  return (
    // Mobile: much taller (1/1.5) to fit logs. Desktop: wider (1/0.6).
    <div className="relative w-full max-w-[900px] h-auto max-h-[65vh] aspect-[1/1] lg:aspect-[1/0.7] mx-auto flex-shrink-0 transition-all duration-300">
      {/* The Felt Table */}
      <div className="absolute inset-0 bg-gray-200 dark:bg-zinc-900 border-[8px] sm:border-[12px] border-gray-300 dark:border-zinc-800 rounded-[100px] sm:rounded-[200px] shadow-[inset_0_0_60px_rgba(0,0,0,0.1)] dark:shadow-[inset_0_0_60px_rgba(0,0,0,0.5)]">

        {/* Center Info Area */}
        <div className="absolute inset-0 flex flex-col items-center pointer-events-none z-0">

          <div className="flex flex-col items-center w-full origin-center scale-[0.85] sm:scale-100 transition-transform">
            {/* Pot Display */}
            <div className="mt-[10%] pointer-events-auto z-10">
              <div className="px-3 py-1 sm:px-4 sm:py-1.5 bg-white/80 dark:bg-black/60 rounded-full border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-zinc-100 font-bold font-mono text-sm sm:text-lg shadow-sm backdrop-blur-sm whitespace-nowrap">
                {t('common.pot', { amount: pot })}
              </div>
            </div>

            {/* Community Cards */}
            <div className="mt-[5%] mb-[5%] flex gap-1 sm:gap-2 items-center justify-center w-full px-2 pointer-events-auto z-10">
              {communityCards.map((card, i) => {
                const isWinningCard = winningCards?.some(wc => wc.rank === card.rank && wc.suit === card.suit);
                return <Card key={i} card={card} isWinning={isWinningCard} />;
              })}
              {Array.from({ length: 5 - communityCards.length }).map((_, i) => (
                <div key={`empty-${i}`} className="w-8 h-11 sm:w-12 sm:h-16 border-[1px] sm:border-2 border-dashed border-zinc-400 dark:border-white/20 rounded-sm sm:rounded-md bg-transparent" />
              ))}
            </div>

            {/* Game Log */}
            <div className="w-3/4 sm:w-1/2 pointer-events-auto">
              <GameLog logs={logs} players={players} communityCards={communityCards} />
            </div>
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
