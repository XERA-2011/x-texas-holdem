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

          <div className="grid grid-cols-2 gap-4">
            {/* Normal Mode Button */}
            <button
              onClick={() => startGame('normal', roundLimitEnabled ? ROUND_LIMIT : null)}
              className="group flex flex-col items-center justify-center p-5 rounded-2xl border-2 border-zinc-200 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-500 bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
            >
              <div className="p-3 bg-white dark:bg-zinc-800 rounded-full shadow-sm group-hover:scale-110 transition-transform mb-3">
                <Bot className="w-8 h-8 text-zinc-900 dark:text-zinc-100" />
              </div>
              <div className="font-bold text-base text-zinc-900 dark:text-zinc-100">普通电脑</div>
            </button>

            {/* Super Mode Button */}
            <button
              onClick={() => startGame('super', roundLimitEnabled ? ROUND_LIMIT : null)}
              className="group relative flex flex-col items-center justify-center p-5 rounded-2xl border-2 border-zinc-200 dark:border-zinc-700 hover:border-black dark:hover:border-white bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
            >
              {/* Badge */}
              <span className="absolute top-[-8px] right-[-8px] bg-black text-white dark:bg-white dark:text-black text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg">
                硬核
              </span>

              <div className="p-3 bg-white dark:bg-zinc-800 rounded-full shadow-sm group-hover:scale-110 transition-transform mb-3">
                <Brain className="w-8 h-8 text-zinc-900 dark:text-zinc-100" />
              </div>
              <div className="font-bold text-base text-zinc-900 dark:text-zinc-100">超级电脑</div>
            </button>
          </div>

          {/* Round Limit Toggle - 3D Circular Button Design */}
          <button
            onClick={() => setRoundLimitEnabled(!roundLimitEnabled)}
            className="group flex flex-col items-center justify-center w-20 h-20 rounded-full font-bold active:scale-95 transition-all select-none mx-auto
              bg-gradient-to-b from-zinc-600 via-zinc-800 to-zinc-950
              dark:bg-gradient-to-b dark:from-white dark:via-zinc-100 dark:to-zinc-300
              text-white dark:text-zinc-800
              shadow-[0_6px_20px_rgba(0,0,0,0.4),inset_0_2px_4px_rgba(255,255,255,0.15),inset_0_-2px_4px_rgba(0,0,0,0.3)]
              dark:shadow-[0_6px_20px_rgba(0,0,0,0.3),inset_0_2px_4px_rgba(255,255,255,0.9),inset_0_-2px_4px_rgba(0,0,0,0.1)]
              hover:shadow-[0_8px_25px_rgba(0,0,0,0.5),inset_0_2px_4px_rgba(255,255,255,0.2),inset_0_-2px_4px_rgba(0,0,0,0.4)]
              dark:hover:shadow-[0_8px_25px_rgba(0,0,0,0.4),inset_0_2px_4px_rgba(255,255,255,1),inset_0_-2px_4px_rgba(0,0,0,0.15)]
              border border-zinc-500 dark:border-zinc-400"
          >
            {/* Rotating Icon */}
            <div
              className="transition-transform duration-500 ease-in-out"
              style={{
                transform: roundLimitEnabled ? 'rotate(90deg)' : 'rotate(0deg)'
              }}
            >
              <InfinityIcon className="w-7 h-7" />
            </div>
            <span className="text-[10px] mt-1 font-semibold">
              {roundLimitEnabled ? '8 局制' : '无限制'}
            </span>
          </button>
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
              <h1 className="text-3xl font-black text-zinc-900 dark:text-zinc-100">
                对局结束
              </h1>
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
                    <Trophy className="w-5 h-5 text-yellow-500 dark:text-yellow-400" />
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
                  {delta > 0 ? '+' : ''}{delta === 0 ? '±0' : (delta < 0 ? `-$${Math.abs(delta)}` : `$${delta}`)}
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
        <div className="px-3 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
          <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400">
            {gameState.roundLimit
              ? `第 ${gameState.currentRoundNumber}/${gameState.roundLimit} 局`
              : `第 ${gameState.currentRoundNumber} 局`}
          </span>
        </div>

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
