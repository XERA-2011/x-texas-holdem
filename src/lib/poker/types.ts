import type { Card } from './card';

import { PersonaType } from './base-types';
export type { Suit, Rank, PersonaType, AIMode, SuperAIConfig, OpponentProfile, GameConfig } from './base-types';

export enum HandRankType {
    HIGH_CARD = 0,
    PAIR = 1,
    TWO_PAIR = 2,
    TRIPS = 3,
    STRAIGHT = 4,
    FLUSH = 5,
    FULL_HOUSE = 6,
    QUADS = 7,
    STRAIGHT_FLUSH = 8
}

export interface HandResult {
    rank: HandRankType;
    score: number;
    winningCards: Card[];
    bestHand: Card[];
}



export type PlayerStatus = 'active' | 'folded' | 'allin' | 'eliminated';

export interface Player {
    id: number;
    persona: PersonaType;
    name: string;
    isHuman: boolean;
    chips: number;
    hand: Card[];
    status: PlayerStatus;
    currentBet: number;
    isEliminated: boolean;
    currentSpeech?: string;
    speechTs?: number;
    totalHandBet: number;
    hasActed: boolean;
    isBluffing?: boolean;
    handDescription?: string;
}

export interface GameLog {
    id: string;
    message: string;
    type: 'normal' | 'phase' | 'win' | 'action' | 'showdown';
}
