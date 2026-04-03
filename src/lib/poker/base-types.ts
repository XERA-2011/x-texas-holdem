export type Suit = '♠' | '♥' | '♣' | '♦';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'T' | 'J' | 'Q' | 'K' | 'A';

export type PersonaType = 'human' | 'bot';

export type AIMode = 'normal' | 'super';

export interface SuperAITargetSourceWeights {
    streetAggressor: number;
    previousStreetAggressor: number;
    lastAggressor: number;
    fallbackTopBetter: number;
}

export interface SuperAIEVTuning {
    foldBase: number;
    checkValue: number;
    checkPosition: number;
    callBase: number;
    dangerCallPenalty: number;
    raisePressure: number;
    raisePosition: number;
    raiseValueEdge: number;
    bluffRaiseBase: number;
    allInBase: number;
    shallowAllInBonus: number;
    deepOpenAllInPenalty: number;
    priorBoost: number;
    actionNoise: number;
    callingStationBluffPenalty: number;
}

export interface SuperAITuning {
    targetSourceWeights?: Partial<SuperAITargetSourceWeights>;
    ev?: Partial<SuperAIEVTuning>;
}

export interface SuperAIConfig {
    monteCarloSims: number;
    opponentModeling: boolean;
    thinkingDelay: number;
    tuning?: SuperAITuning;
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
