'use client';

import { useState } from 'react';
import { usePokerGame } from '@/hooks/use-poker-game';
import { GameTable } from '@/components/game/game-table';
import { GameControls } from '@/components/game/game-controls';
import { ModeSelection } from '@/components/game/mode-selection';
import { SessionComplete } from '@/components/game/session-complete';
import { GameHeader } from '@/components/game/game-header';
import { LeaderboardModal } from '@/components/game/leaderboard-modal';
import type { AIMode } from '@/lib/poker/types';


export default function TexasHoldemPage() {
  const { gameState, startGame, exitGame, humanAction, startNextRound, resetGame, startNewSession, getLeaderboard, isAutoPlay, toggleAutoPlay } = usePokerGame();
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  // Mode Selection Modal (Shown when no game is running)
  if (!gameState) {
    return (
      <ModeSelection
        onStartGame={(mode, roundLimit) => {
          startGame(mode as AIMode, roundLimit);
        }}
      />
    );
  }

  // Session Complete - Show Leaderboard
  if (gameState.isSessionComplete) {
    const leaderboard = getLeaderboard();
    return (
      <SessionComplete
        roundLimit={gameState.roundLimit}
        roundsPlayed={gameState.currentRoundNumber}
        aiMode={gameState.aiMode}
        leaderboard={leaderboard}
        onStartNewSession={startNewSession}
        onExitGame={exitGame}
      />
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

      <GameHeader
        roundLimit={gameState.roundLimit}
        currentRoundNumber={gameState.currentRoundNumber}
        aiMode={gameState.aiMode}
        isAutoPlay={isAutoPlay}
        onToggleAutoPlay={toggleAutoPlay}
        onExitGame={exitGame}
        onShowLeaderboard={() => setShowLeaderboard(true)}
      />

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
            isAutoPlay={isAutoPlay}
          />
        </div>
      </div>

      <LeaderboardModal
        isOpen={showLeaderboard}
        onClose={() => setShowLeaderboard(false)}
        roundLimit={gameState.roundLimit}
        currentRoundNumber={gameState.currentRoundNumber}
        leaderboard={getLeaderboard()}
      />

    </div>
  );
}
