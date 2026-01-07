'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { PokerGameEngine } from '@/lib/poker-engine';

export function usePokerGame() {
  const engineRef = useRef<PokerGameEngine | null>(null);
  const [gameState, setGameState] = useState<ReturnType<PokerGameEngine['getSnapshot']> | null>(null);

  useEffect(() => {
    // Initialize engine only once
    const engine = new PokerGameEngine((snapshot) => {
      setGameState(snapshot);
    });
    engineRef.current = engine;

    // Start first round
    const timer = setTimeout(() => {
      engine.startNextRound();
    }, 100);

    return () => {
      clearTimeout(timer);
      engine.destroy();
    };
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
    humanAction,
    startNextRound,
    resetGame
  };
}
