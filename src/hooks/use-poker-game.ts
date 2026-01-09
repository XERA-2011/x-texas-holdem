'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { PokerGameEngine } from '@/lib/poker-engine';

export function usePokerGame() {
  const engineRef = useRef<PokerGameEngine | null>(null);
  const [gameState, setGameState] = useState<ReturnType<PokerGameEngine['getSnapshot']> | null>(null);

  // 移除自动初始化 useEffect
  useEffect(() => {
    return () => {
      if (engineRef.current) {
        engineRef.current.destroy();
      }
    };
  }, []);

  const startGame = useCallback((mode: 'normal' | 'super', roundLimit: number | null = 8) => {
    // 重置自动托管状态
    setIsAutoPlay(false);

    // Clean up existing game if any
    if (engineRef.current) {
      engineRef.current.destroy();
    }

    const engine = new PokerGameEngine((snapshot) => {
      setGameState(snapshot);
    });

    engine.setAIMode(mode);
    engine.roundLimit = roundLimit;
    engineRef.current = engine;

    // Start first round
    setTimeout(() => {
      engine.startNextRound();
    }, 100);
  }, []);

  const exitGame = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.destroy();
      engineRef.current = null;
    }
    setGameState(null);
    setIsAutoPlay(false);
  }, []);

  const humanAction = useCallback((type: 'fold' | 'call' | 'raise' | 'allin', raiseAmount?: number) => {
    if (engineRef.current) {
      engineRef.current.humanAction(type, raiseAmount);
    }
  }, []);

  const startNextRound = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.startNextRound();
    }
  }, []);

  const resetGame = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.resetGame();
    }
  }, []);

  const startNewSession = useCallback(() => {
    // 重置自动托管状态
    setIsAutoPlay(false);

    if (engineRef.current) {
      engineRef.current.startNewSession();
    }
  }, []);

  const getLeaderboard = useCallback(() => {
    if (engineRef.current) {
      return engineRef.current.getLeaderboard();
    }
    return [];
  }, []);

  const [isAutoPlay, setIsAutoPlay] = useState(false);

  const toggleAutoPlay = useCallback(() => {
    setIsAutoPlay(prev => !prev);
  }, []);

  // 同步 AutoPlay 状态到引擎 (用于加速 AI 决策)
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setAutoPlayMode(isAutoPlay);
    }
  }, [isAutoPlay]);

  // 自动游戏逻辑
  useEffect(() => {
    if (!isAutoPlay || !gameState || !engineRef.current) return;

    const engine = engineRef.current;
    let timer: NodeJS.Timeout;

    // 1. 如果对局结束 (Session Complete) -> 停止自动托管
    if (gameState.isSessionComplete) {
      setIsAutoPlay(false);
      return;
    }

    // 2. 如果这局结束 (Showdown) -> 自动开始下一局
    if (gameState.stage === 'showdown') {
      timer = setTimeout(() => {
        startNextRound(); // 使用 hook 封装的方法
      }, 500);
      return () => clearTimeout(timer);
    }

    // 3. 如果轮到人类玩家 (且通过 Auto 托管) -> 使用 AI 替身
    const humanPlayer = gameState.players[0];
    const isHumanTurn = gameState.currentTurnIdx === 0 && humanPlayer.status === 'active' && !gameState.isSessionComplete;

    if (isHumanTurn) {
      timer = setTimeout(() => {
        // 让 AI 接管人类操作
        engine.aiAction(humanPlayer);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isAutoPlay, gameState, startNewSession, startNextRound]);

  return {
    gameState,
    startGame,
    exitGame,
    humanAction,
    startNextRound,
    resetGame,
    startNewSession,
    getLeaderboard,
    isAutoPlay,
    toggleAutoPlay
  };
}
