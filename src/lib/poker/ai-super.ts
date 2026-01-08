/**
 * Super AI Strategy - Enhanced AI with Monte Carlo and GTO
 * 超级电脑决策逻辑 - 蒙特卡洛模拟 + GTO 混合策略
 */

import { SPEECH_LINES } from './constants';
import type { Player } from './types';
import type { Card } from './card';
import { calculateWinRateMonteCarlo, getPreflopStrength } from './monte-carlo';
import { getPositionAdvantage, getBoardTexture } from './board-analysis';
import type { OpponentProfileManager } from './opponent-profiling';

/** 超级 AI 游戏上下文 */
export interface SuperAIContext {
    communityCards: Card[];
    stage: 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
    pot: number;
    highestBet: number;
    bigBlind: number;
    raisesInRound: number;
    lastRaiseAmount: number;
    players: Player[];
    dealerIdx: number;
    monteCarloSims: number;
    opponentProfiles: OpponentProfileManager;
}

/** 超级 AI 决策结果 */
export interface SuperAIDecision {
    action: 'fold' | 'call' | 'raise' | 'allin';
    raiseAmount?: number;
    isBluffing?: boolean;
    speechType?: keyof typeof SPEECH_LINES['bot'];
    shouldSpeak?: boolean;
}

/**
 * 超级电脑决策逻辑 (Enhanced)
 */
export function makeSuperAIDecision(player: Player, ctx: SuperAIContext): SuperAIDecision {
    const isPreflop = ctx.stage === 'preflop';

    // 1. 获取胜率：翻前查表 (快速)，翻后蒙特卡洛 (精确)
    const activeOpponents = ctx.players.filter(
        p => !p.isEliminated && p.status !== 'folded' && p.id !== player.id
    );
    const activeOpponentsCount = activeOpponents.length;

    const winRate = isPreflop
        ? getPreflopStrength(player.hand, activeOpponentsCount)
        : calculateWinRateMonteCarlo(
            player.hand,
            ctx.communityCards,
            activeOpponentsCount,
            ctx.monteCarloSims
        );

    const callAmt = ctx.highestBet - player.currentBet;
    const potOdds = callAmt > 0 ? callAmt / (ctx.pot + callAmt) : 0;

    // 上下文感知
    const posAdvantage = getPositionAdvantage(player.id, ctx.players, ctx.dealerIdx);
    const boardTexture = getBoardTexture(ctx.communityCards);

    // 动态调整胜率阈值
    const posModifier = (posAdvantage - 0.5) * 0.1;
    const adjustedWinRate = winRate + posModifier;

    // ============ 对手建模 ============
    const oppStats = ctx.opponentProfiles.getAverageStats(ctx.players);
    const isLooseTable = oppStats.avgVpip > 0.55;
    const isTightTable = oppStats.avgVpip < 0.35;
    const isAggressiveTable = oppStats.avgAggression > 1.3;

    let action: 'fold' | 'call' | 'raise' | 'allin' = 'fold';
    let isBluffing = false;
    const rnd = Math.random();

    // A. 极强牌 / 坚果 (Monster)
    if (winRate > 0.85 || (winRate > 0.7 && potOdds > 0.4)) {
        // GTO 混合策略：防止被读牌
        const trapChance = boardTexture < 0.3 ? 0.30 : 0.05;
        const allinChance = boardTexture < 0.3 ? 0.10 : 0.15;

        if (rnd < trapChance && ctx.raisesInRound < 1) {
            action = 'call'; // 慢打/诱捕
        } else if (rnd < trapChance + allinChance) {
            action = 'allin';
        } else {
            action = 'raise';
        }
    }
    // B. 强牌 (Strong)
    else if (winRate > 0.65) {
        if (rnd < 0.70) action = 'raise';
        else if (rnd < 0.90) action = 'call';
        else action = 'allin';
    }
    // C. 边缘牌 / 中等牌 (Marginal)
    else if (adjustedWinRate > potOdds + 0.05) {
        if (posAdvantage > 0.6 && rnd < 0.6) action = 'raise';
        else action = 'call';
    }
    // D. 听牌 / 弱牌 (Draw / Weak)
    else {
        if (callAmt === 0) {
            action = 'call'; // Check

            // 偷鸡逻辑
            let bluffChance = 0.35;
            if (isTightTable) bluffChance += 0.15;
            if (isAggressiveTable) bluffChance -= 0.15;
            if (isLooseTable) bluffChance -= 0.10;

            if (posAdvantage > 0.7 && boardTexture < 0.4 && rnd < bluffChance) {
                isBluffing = true;
                action = 'raise';
            }
        } else {
            // E. 面对下注决策
            // 计算跟注成本比例
            const callCostRatio = callAmt / (ctx.pot + callAmt);
            const isCheap = callCostRatio < 0.20 || callAmt <= ctx.bigBlind * 2;

            // 1. 隐含赔率与合适性 (Implied Odds)
            // 如果很便宜，且手牌有潜力 (同花连张等，winRate > 0.3)，或者仅仅是好奇 (RNG)
            // 翻牌前特别宽容
            if (isPreflop) {
                if (isCheap && rnd < 0.90) {
                    action = 'call'; // 便宜看翻牌
                } else if (winRate > 0.45 || (winRate > 0.35 && posAdvantage > 0.6)) {
                    action = 'call';
                } else {
                    action = 'fold';
                }
            } else {
                // 翻牌后
                if (winRate > 0.25 && potOdds < 0.45) {
                    action = 'call'; // 听牌
                }
                // "好奇心"机制：如果真的很便宜，偶尔看看
                else if (isCheap && winRate > 0.3 && rnd < 0.4) {
                    action = 'call';
                }
                else {
                    action = 'fold';
                }
            }
        }
    }

    // === 修正与安全检查 ===
    if (callAmt >= player.chips) {
        if (action === 'raise' || action === 'call') action = 'allin';
    }

    if (action === 'raise') {
        const minRaise = Math.max(ctx.bigBlind, ctx.lastRaiseAmount);
        if (player.chips <= callAmt + minRaise) {
            action = 'allin';
        }
    }

    // === 下注尺寸 (Bet Sizing) ===
    let raiseAmount: number | undefined;
    if (action === 'raise') {
        let betFactor = 0.6; // 默认 60% 底池

        if (winRate > 0.8) {
            betFactor = 0.8 + Math.random() * 0.4;
        } else if (isBluffing) {
            betFactor = rnd < 0.5 ? 0.5 : 1.0;
        }

        if (boardTexture > 0.6 && winRate > 0.6) {
            betFactor += 0.3;
        }

        let betSize = ctx.pot * betFactor;
        const minRaise = Math.max(ctx.bigBlind, ctx.lastRaiseAmount);
        if (betSize < minRaise) betSize = minRaise;
        if (betSize > player.chips) betSize = player.chips;

        raiseAmount = Math.floor(betSize);
    }

    // === 发言系统 ===
    const speakChance = 0.35;
    const isCheck = action === 'call' && callAmt === 0;
    let speechType: keyof typeof SPEECH_LINES['bot'] = 'call';

    if (action === 'allin') speechType = 'allin';
    else if (action === 'fold') speechType = 'fold';
    else if (action === 'raise') speechType = 'raise';
    else if (isCheck) speechType = 'check';

    if (isBluffing) speechType = 'bluff_act';

    return {
        action,
        raiseAmount,
        isBluffing,
        speechType,
        shouldSpeak: Math.random() < speakChance
    };
}
