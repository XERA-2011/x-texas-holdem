import type { Card } from './card';

import { PersonaType } from './base-types';
export type { Suit, Rank, PersonaType, AIMode, SuperAIConfig, OpponentProfile, GameConfig } from './base-types';

/**
 * 德州扑克牌型等级 (从小到大)
 */
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

/** 手牌评估结果 */
export interface HandResult {
    rank: HandRankType;  // 牌型等级
    score: number;       // 用于比较同等级牌型的分数
    winningCards: Card[]; // 组成牌型的5张牌
    bestHand: Card[];    // 同 winningCards (兼容性保留)
}



export type PlayerStatus = 'active' | 'folded' | 'allin' | 'eliminated';

/** 玩家状态定义 */
export interface Player {
    id: number;
    persona: PersonaType;  // 'human' | 'bot'
    name: string;
    isHuman: boolean;
    chips: number;         // 当前持有筹码
    hand: Card[];          // 手牌 (2张)
    status: PlayerStatus;  // 当前状态
    currentBet: number;    // 本轮已下注金额
    isEliminated: boolean; // 是否已淘汰 (筹码为0)
    currentSpeech?: string;// 当前发言内容
    speechTs?: number;     // 发言时间戳
    totalHandBet: number;  // 本局总投入 (用于分池计算)
    hasActed: boolean;     // 本轮是否已行动
    isBluffing?: boolean;  // AI 是否在诈唬 (Bluffing)
    handDescription?: string; // 摊牌时的牌型描述
}

export interface GameLog {
    id: string;
    message: string;
    type: 'normal' | 'phase' | 'win' | 'action' | 'showdown';
}
