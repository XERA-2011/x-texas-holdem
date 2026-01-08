'use client';

import { useState } from 'react';
import { usePokerGame } from '@/hooks/use-poker-game';
import { GameTable } from '@/components/game/game-table';
import { GameControls } from '@/components/game/game-controls';
import { ThemeToggle } from '@/components/theme-toggle';
import { GithubIcon } from '@/components/icons/github-icon';
import { InfinityIcon } from '@/components/icons/infinity-icon';
import { Bot, Brain, Trophy } from 'lucide-react';


export default function TexasHoldemPage() {
  const { gameState, startGame, exitGame, humanAction, startNextRound, resetGame, startNewSession, getLeaderboard } = usePokerGame();
  const [roundLimitEnabled, setRoundLimitEnabled] = useState(true);
  const ROUND_LIMIT = 8;

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
            <h1 className="text-2xl font-black text-zinc-900 dark:text-zinc-100">
              单机德州扑克
            </h1>
          </div>

          <div className="grid gap-4">
            <button
              onClick={() => startGame('normal', roundLimitEnabled ? ROUND_LIMIT : null)}
              className="group relative flex items-center p-4 rounded-xl border-2 border-zinc-200 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-500 bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all text-left"
            >
              <div className="mr-4 p-3 bg-white dark:bg-zinc-800 rounded-full shadow-sm group-hover:scale-110 transition-transform">
                <Bot className="w-8 h-8 text-zinc-900 dark:text-zinc-100" />
              </div>
              <div>
                <div className="font-bold text-lg text-zinc-900 dark:text-zinc-100">普通电脑</div>
              </div>
            </button>

            <button
              onClick={() => startGame('super', roundLimitEnabled ? ROUND_LIMIT : null)}
              className="group relative flex items-center p-4 rounded-xl border-2 border-zinc-200 dark:border-zinc-700 hover:border-black dark:hover:border-white bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all text-left"
            >
              <div className="mr-4 p-3 bg-white dark:bg-zinc-800 rounded-full shadow-sm group-hover:scale-110 transition-transform">
                <Brain className="w-8 h-8 text-zinc-900 dark:text-zinc-100" />
              </div>
              <div>
                <div className="font-bold text-lg text-zinc-900 dark:text-zinc-100">超级电脑</div>
              </div>

              {/* Badge */}
              <span className="absolute top-[-10px] right-4 bg-black text-white dark:bg-white dark:text-black text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg">
                硬核
              </span>
            </button>
          </div>

          {/* Round Limit Toggle - Vertical Minimalist Design */}
          <div
            onClick={() => setRoundLimitEnabled(!roundLimitEnabled)}
            className="flex flex-col items-center justify-center gap-2 cursor-pointer py-4 opacity-60 hover:opacity-100 transition-opacity select-none w-fit mx-auto"
            role="button"
            tabIndex={0}
          >
            {/* Rotating Icon: ♾️ rotates 90deg to become 8-like */}
            <div
              className="transition-transform duration-500 ease-in-out flex items-center justify-center h-12 w-12 text-zinc-900 dark:text-zinc-100"
              style={{
                transform: roundLimitEnabled ? 'rotate(90deg)' : 'rotate(0deg)'
              }}
            >
              <InfinityIcon className="w-10 h-10" />
            </div>
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              {roundLimitEnabled ? '8 局制' : '无限制'}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Session Complete - Show Leaderboard
  if (gameState.isSessionComplete) {
    const leaderboard = getLeaderboard();

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

        <div className="max-w-2xl w-full bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 p-8 space-y-6">
          {/* Title */}
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-3">
              <span className="text-3xl">🏆</span>
              <h1 className="text-3xl font-black text-zinc-900 dark:text-zinc-100">
                对局结束
              </h1>
              <span className="text-3xl">🏆</span>
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {gameState.roundLimit} 局已完成
            </p>
          </div>

          {/* Leaderboard */}
          <div className="space-y-2">
            <div className="grid grid-cols-12 gap-2 px-4 py-2 text-xs font-bold text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-700">
              <div className="col-span-1 text-center">排名</div>
              <div className="col-span-5">玩家</div>
              <div className="col-span-3 text-right">筹码</div>
              <div className="col-span-3 text-right">变化</div>
            </div>
            {leaderboard.map(({ rank, player, delta }) => (
              <div
                key={player.id}
                className={`grid grid-cols-12 gap-2 px-4 py-3 rounded-lg transition-colors ${player.isHuman
                  ? 'bg-zinc-100 dark:bg-zinc-800 font-bold'
                  : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                  }`}
              >
                <div className="col-span-1 flex items-center justify-center">
                  {rank === 1 ? (
                    <Trophy className="w-5 h-5 text-zinc-900 dark:text-zinc-100" />
                  ) : (
                    <span className="text-zinc-500 dark:text-zinc-400">#{rank}</span>
                  )}
                </div>
                <div className="col-span-5 flex items-center text-zinc-900 dark:text-zinc-100">
                  {player.name}
                </div>
                <div className="col-span-3 flex items-center justify-end text-zinc-900 dark:text-zinc-100">
                  ${player.chips}
                </div>
                <div className={`col-span-3 flex items-center justify-end font-medium ${delta > 0 ? 'text-green-600 dark:text-green-400' : delta < 0 ? 'text-red-600 dark:text-red-400' : 'text-zinc-500'
                  }`}>
                  {delta > 0 ? '+' : ''}{delta === 0 ? '±0' : `$${delta}`}
                </div>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-4 pt-4">
            <button
              onClick={startNewSession}
              className="px-6 py-3 bg-black dark:bg-white text-white dark:text-black font-bold rounded-lg hover:opacity-80 active:scale-95 transition-all"
            >
              继续下一轮
            </button>
            <button
              onClick={exitGame}
              className="px-6 py-3 bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 font-bold rounded-lg hover:bg-zinc-300 dark:hover:bg-zinc-600 active:scale-95 transition-all"
            >
              返回主菜单
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
        {/* Round Counter */}
        {gameState.roundLimit && (
          <div className="px-3 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
            <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400">
              第 {gameState.currentRoundNumber}/{gameState.roundLimit} 局
            </span>
          </div>
        )}

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
            {gameState.aiMode === 'super' ? '超级电脑' : '普通电脑'}
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
