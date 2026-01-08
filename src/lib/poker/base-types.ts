export type Suit = '♠' | '♥' | '♣' | '♦';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'T' | 'J' | 'Q' | 'K' | 'A';

export type PersonaType = 'human' | 'bot';

export type AIMode = 'normal' | 'super';

export interface SuperAIConfig {
    monteCarloSims: number;
    opponentModeling: boolean;
    thinkingDelay: number;
}

export interface OpponentProfile {
    playerId: number;
    vpip: number;
    pfr: number;
    aggression: number;
    handsPlayed: number;
    showdownStrengths: number[];
}

export interface GameConfig {
    aiMode: AIMode;
    roundLimit: number | null;
}
