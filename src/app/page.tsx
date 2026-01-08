'use client';

import { usePokerGame } from '@/hooks/use-poker-game';
import { GameTable } from '@/components/game/game-table';
import { GameControls } from '@/components/game/game-controls';
import { ThemeToggle } from '@/components/theme-toggle';
import { GithubIcon } from '@/components/icons/github-icon';
import { Bot, Brain } from 'lucide-react';


export default function TexasHoldemPage() {
  const { gameState, startGame, exitGame, humanAction, startNextRound, resetGame } = usePokerGame();

  // Mode Selection Modal (Shown when no game is running)
  if (!gameState) {
    return (
      <div className="relative flex h-dvh items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4">
        {/* Top Right Controls */}
        <div className="absolute top-4 right-4 z-50 flex items-center gap-4">
          <a
            href="https://github.com/XERA-2011/x-texas-holdem"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-full w-8 h-8 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            aria-label="GitHub Source Code"
          >
            <GithubIcon className="w-5 h-5" />
          </a>
          <ThemeToggle />
        </div>
        <div className="max-w-md w-full bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 p-8 text-center space-y-8">
          <div className="space-y-2">
            <h1 className="text-3xl font-black text-zinc-900 dark:text-zinc-100">
              Texas Hold'em
            </h1>
          </div>

          <div className="grid gap-4">
            <button
              onClick={() => startGame('normal')}
              className="group relative flex items-center p-4 rounded-xl border-2 border-zinc-200 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-500 bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all text-left"
            >
              <div className="mr-4 p-3 bg-white dark:bg-zinc-800 rounded-full shadow-sm group-hover:scale-110 transition-transform">
                <Bot className="w-8 h-8 text-zinc-900 dark:text-zinc-100" />
              </div>
              <div>
                <div className="font-bold text-lg text-zinc-900 dark:text-zinc-100">Normal Mode</div>
              </div>
            </button>

            <button
              onClick={() => startGame('super')}
              className="group relative flex items-center p-4 rounded-xl border-2 border-zinc-200 dark:border-zinc-700 hover:border-black dark:hover:border-white bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all text-left"
            >
              <div className="mr-4 p-3 bg-white dark:bg-zinc-800 rounded-full shadow-sm group-hover:scale-110 transition-transform">
                <Brain className="w-8 h-8 text-zinc-900 dark:text-zinc-100" />
              </div>
              <div>
                <div className="font-bold text-lg text-zinc-900 dark:text-zinc-100">Super AI Mode</div>
              </div>

              {/* Badge */}
              <span className="absolute top-[-10px] right-4 bg-black text-white dark:bg-white dark:text-black text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg">
                HARDCORE
              </span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { players, communityCards, pot, dealerIdx, currentTurnIdx, stage, logs, highestBet, winners, winningCards } = gameState;
  const human = players[0];
  const isHumanTurn = stage !== 'showdown' && currentTurnIdx === 0 && human.status === 'active';
  const callAmount = highestBet - human.currentBet;

  // Calculate if raise is allowed (example logic)
  const canRaise = human.chips > callAmount;

  const survivorCount = players.filter(p => !p.isEliminated).length;
  const isGameOver = survivorCount <= 1;

  return (
    <div className="w-full h-dvh text-zinc-900 dark:text-zinc-100 selection:bg-zinc-300 dark:selection:bg-zinc-700 selection:text-black overflow-hidden flex flex-col overscroll-none">
      <h1 className="sr-only">德州扑克</h1>

      {/* Top Right Controls */}
      <div className="absolute top-4 right-4 z-50 flex items-center gap-4">
        {/* Current Mode Display & Reset Trigger */}
        <button
          onClick={exitGame}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full border shadow-sm transition-all hover:opacity-80 active:scale-95
            ${gameState.aiMode === 'super'
              ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white'
              : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700'
            }`}
          title="Click to Switch Mode (Restarts Game)"
        >
          {gameState.aiMode === 'super' ? (
            <Brain className="w-4 h-4" />
          ) : (
            <Bot className="w-4 h-4" />
          )}
          <span className="text-xs font-bold">
            {gameState.aiMode === 'super' ? 'SUPER AI' : 'NORMAL'}
          </span>
        </button>

        <a
          href="https://github.com/XERA-2011/x-texas-holdem"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center rounded-full w-8 h-8 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          aria-label="GitHub Source Code"
        >
          <GithubIcon className="w-5 h-5" />
        </a>
        <ThemeToggle />
      </div>

      {/* Main Game Area - Flex Grow to take available space */}
      <div className="flex-1 relative flex items-center justify-center w-full max-w-7xl mx-auto px-2 pt-2 sm:pt-20">

        {/* Table Container - Centered and SCALED to fit */}
        <div className="w-full h-full flex items-center justify-center">
          <GameTable
            players={players}
            communityCards={communityCards}
            pot={pot}
            dealerIdx={dealerIdx}
            currentTurnIdx={currentTurnIdx}
            stage={stage}
            logs={logs}
            winners={winners}
            winningCards={winningCards}
          />
        </div>
      </div>

      {/* Bottom Controls Area */}
      <div className="flex-none pb-safe mb-2 w-full px-2 sm:mb-4">
        <div className="flex justify-center">
          <GameControls
            onAction={humanAction}
            canRaise={canRaise}
            callAmount={callAmount}
            isHumanTurn={isHumanTurn}
            showNextRound={stage === 'showdown'}
            onNextRound={startNextRound}
            isGameOver={isGameOver}
            onReset={resetGame}
            playerChips={human.chips}
            potSize={pot}
          />
        </div>
      </div>
    </div>
  );
}
