/**
 * AI Strategy - Normal AI Decision Logic
 * 普通 AI 决策逻辑
 */

import { SPEECH_LINES } from './constants';
import { evaluateHand } from './evaluator';
import { HandRankType, type Player, type GameLog } from './types';
import type { Card } from './card';

/** 游戏状态上下文，用于 AI 决策 */
export interface AIContext {
    communityCards: Card[];
    stage: 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
    pot: number;
    highestBet: number;
    bigBlind: number;
    raisesInRound: number;
    currentTurnIdx: number;
    playersCount: number;
}

/** AI 决策结果 */
export interface AIDecision {
    action: 'fold' | 'call' | 'raise' | 'allin';
    raiseAmount?: number;
    isBluffing?: boolean;
    speechType?: keyof typeof SPEECH_LINES['bot'];
    shouldSpeak?: boolean;
}

/**
 * 计算手牌强度 (0.0 到 1.0)
 */
export function getHandStrength(playerHand: Card[], communityCards: Card[]): number {
    const hole = playerHand;
    if (hole.length < 2) return 0;

    const fullHand = [...hole, ...communityCards];

    // 翻牌前启发式
    if (communityCards.length === 0) {
        const v1 = hole[0].value;
        const v2 = hole[1].value;
        const suited = hole[0].suit === hole[1].suit;
        const pair = v1 === v2;
        const highVal = Math.max(v1, v2);
        const gap = highVal - Math.min(v1, v2);

        let score = 0;
        if (pair) {
            score = Math.max(20, highVal * 3); // 对子价值: 22=20分, AA=42分
        } else {
            score = highVal + (Math.min(v1, v2) / 2); // 高牌
        }

        if (suited) score += 3;
        if (gap === 1) score += 2; // 连张
        else if (gap === 2) score += 1;

        return Math.min(Math.max(score / 45, 0.1), 1.0);
    }

    // 翻牌后
    const res = evaluateHand(fullHand);
    let strength = 0;

    switch (res.rank) {
        case HandRankType.HIGH_CARD: strength = 0.1 + (res.score % 15 / 150); break;
        case HandRankType.PAIR:
            strength = 0.25 + (res.score % 15 / 50);
            break;
        case HandRankType.TWO_PAIR: strength = 0.6; break;
        case HandRankType.TRIPS: strength = 0.75; break;
        case HandRankType.STRAIGHT: strength = 0.85; break;
        case HandRankType.FLUSH: strength = 0.9; break;
        case HandRankType.FULL_HOUSE: strength = 0.95; break;
        case HandRankType.QUADS: strength = 0.99; break;
        case HandRankType.STRAIGHT_FLUSH: strength = 1.0; break;
    }

    // 检查同花听牌
    if (res.rank < HandRankType.FLUSH) {
        const suitCounts: Record<string, number> = {};
        fullHand.forEach(c => suitCounts[c.suit] = (suitCounts[c.suit] || 0) + 1);
        const isFlushDraw = Object.values(suitCounts).some(count => count === 4);
        if (isFlushDraw) strength += 0.15;
    }

    return Math.min(strength, 1.0);
}

/**
 * 获取随机发言内容
 */
export function getRandomSpeech(type: keyof typeof SPEECH_LINES['bot']): string | null {
    const lines = SPEECH_LINES['bot'][type];
    if (lines && lines.length > 0) {
        return lines[Math.floor(Math.random() * lines.length)];
    }
    return null;
}

/**
 * 普通 AI 决策逻辑
 */
export function makeNormalAIDecision(player: Player, ctx: AIContext): AIDecision {
    const callAmt = ctx.highestBet - player.currentBet;
    const strength = getHandStrength(player.hand, ctx.communityCards);
    const potOdds = callAmt > 0 ? callAmt / (ctx.pot + callAmt) : 0;

    // 个性化因子
    const boldness = 0.8 + Math.random() * 0.4;
    let perceivedStrength = strength * boldness;

    // 行动阈值
    let foldThresh = 0.25;
    const callThresh = 0.4;
    const raiseThresh = 0.65;
    let allInThresh = 0.90;

    // 动态调整阈值
    if (ctx.stage === 'preflop') {
        const bb = ctx.bigBlind;
        const isSmallBet = callAmt <= bb * 3;
        foldThresh = isSmallBet ? 0.15 : 0.22;
        allInThresh = 0.96;
    }

    // 面对大注的"恐惧"逻辑
    const isBigBet = (callAmt > ctx.pot * 0.5) || (callAmt > player.chips * 0.4);
    if (isBigBet) {
        perceivedStrength -= 0.1;
        if (player.isBluffing) perceivedStrength -= 0.2;
    }

    // Progressive All-in Logic
    const cardCount = ctx.communityCards.length;
    let randomAllInProb = 0;
    switch (cardCount) {
        case 0: randomAllInProb = 0.001; break;
        case 3: randomAllInProb = 0.02; break;
        case 4: randomAllInProb = 0.05; break;
        case 5: randomAllInProb = 0.10; break;
    }
    randomAllInProb *= boldness;

    let forceAllIn = false;
    if ((strength > 0.25 || player.isBluffing) && Math.random() < randomAllInProb) {
        forceAllIn = true;
    }

    // 决策核心
    let action: 'fold' | 'call' | 'raise' | 'allin' = 'fold';
    let isBluffing = false;
    const rnd = Math.random();

    // 偷鸡逻辑
    const isLatePosition = ctx.currentTurnIdx > (ctx.playersCount * 0.6);
    const canSteal = (ctx.raisesInRound === 0 && callAmt === 0 && isLatePosition);

    if (forceAllIn) {
        action = 'allin';
    } else if (canSteal && boldness > 1.0 && rnd < 0.4) {
        isBluffing = true;
        action = 'raise';
    } else if (strength < 0.4 && strength > 0.15 && rnd < 0.15 * boldness) {
        isBluffing = true;
        action = 'raise';
    } else {
        if (perceivedStrength > allInThresh) {
            if (rnd < 0.7) action = 'allin';
            else if (rnd < 0.9) action = 'raise';
            else action = 'call';
        } else if (perceivedStrength > raiseThresh) {
            if (rnd < 0.6 * boldness) action = 'raise';
            else action = 'call';
        } else if (perceivedStrength > callThresh) {
            if (rnd < 0.2 * boldness && ctx.raisesInRound < 2) action = 'raise';
            else action = 'call';
        } else if (perceivedStrength > foldThresh) {
            if (callAmt === 0) action = 'call';
            else if (strength > potOdds) action = 'call';
            else action = 'fold';
        } else {
            if (callAmt === 0) action = 'call';
            else action = 'fold';
        }
    }

    // 好奇心机制
    if (action === 'fold' && ctx.stage === 'preflop') {
        const costRatio = callAmt / player.chips;
        if (costRatio < 0.10 && callAmt <= ctx.bigBlind * 5) {
            if (rnd < 0.4 * boldness) {
                action = 'call';
            }
        }
    }

    // 合理性检查
    if (callAmt >= player.chips) {
        if (action === 'raise' || action === 'call') action = 'allin';
    }

    if (action === 'raise' && player.chips <= callAmt + ctx.bigBlind) {
        action = 'allin';
    }

    if (action === 'allin' && strength < 0.6 && !isBluffing) {
        if (player.chips > ctx.pot * 0.2) action = 'fold';
    }

    // 计算加注金额
    let raiseAmount = ctx.bigBlind * (Math.floor(Math.random() * 3) + 1);

    // 确定发言类型
    const speakChance = 0.4;
    const isCheck = (action === 'call' && callAmt === 0);
    let speechType: keyof typeof SPEECH_LINES['bot'] = 'call';

    if (action === 'allin') speechType = 'allin';
    else if (action === 'fold') speechType = 'fold';
    else if (action === 'raise') speechType = 'raise';
    else if (isCheck) speechType = 'check';

    if (isBluffing && (action === 'raise' || action === 'allin')) {
        speechType = 'bluff_act';
    }

    return {
        action,
        raiseAmount: action === 'raise' ? raiseAmount : undefined,
        isBluffing,
        speechType,
        shouldSpeak: Math.random() < speakChance
    };
}
