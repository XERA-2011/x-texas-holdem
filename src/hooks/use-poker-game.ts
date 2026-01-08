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

  const startGame = useCallback((mode: 'normal' | 'super') => {
    // Clean up existing game if any
    if (engineRef.current) {
      engineRef.current.destroy();
    }

    const engine = new PokerGameEngine((snapshot) => {
      setGameState(snapshot);
    });

    engine.setAIMode(mode);
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

  return {
    gameState,
    startGame,
    exitGame,
    humanAction,
    startNextRound,
    resetGame,
  };
}
