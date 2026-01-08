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
    preflopRaiserId?: number;  // 翻前加注者 ID，用于 C-Bet 逻辑
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

    // 安全检查：确保手牌有效
    if (!player.hand || player.hand.length < 2) {
        // 手牌无效，默认弃牌
        return {
            action: 'fold',
            isBluffing: false,
            speechType: 'fold',
            shouldSpeak: false
        };
    }

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

    // 对手建模
    const oppStats = ctx.opponentProfiles.getAverageStats(ctx.players);
    const isLooseTable = oppStats.avgVpip > 0.55;
    const isTightTable = oppStats.avgVpip < 0.35;
    const isAggressiveTable = oppStats.avgAggression > 1.3;

    // 多人锅策略 (Multiway Pot)
    // 多人锅时 bluff 成功率大幅降低，需要收紧范围
    const isMultiwayPot = activeOpponentsCount >= 2;
    const multiwayBluffPenalty = isMultiwayPot ? 0.5 : 1.0;  // bluff 频率减半

    // Heads Up（单挑）策略
    // 单挑时大幅放宽范围，更激进地偷盲和跟注
    const isHeadsUp = activeOpponentsCount === 1;
    const headsUpAdjustment = isHeadsUp ? 0.15 : 0;  // 单挑时胜率阈值降低 15%

    // 短筹码对手检测
    // 当对手筹码很少时（< 10BB），他们的 All In 范围通常更宽
    // 应该用更宽的范围跟注
    const shortStackOpponents = activeOpponents.filter(p => {
        const oppEffectiveStack = p.chips + p.currentBet;
        return oppEffectiveStack < ctx.bigBlind * 10;
    });
    const hasShortStackOpponent = shortStackOpponents.length > 0;
    const shortStackAdjustment = hasShortStackOpponent ? 0.10 : 0;  // 面对短筹码放宽 10%

    // 气泡期策略 (Bubble Pressure)
    // 检测快被淘汰的对手（筹码 < 3BB），增加对其攻击性
    const bubbleOpponents = activeOpponents.filter(p => {
        const oppEffectiveStack = p.chips + p.currentBet;
        return oppEffectiveStack < ctx.bigBlind * 3;
    });
    const hasBubbleOpponent = bubbleOpponents.length > 0;

    // 被动跟注站检测
    // 如果对手是典型的跟注站（高 VPIP，低激进度），减少 bluff，增加 value bet
    const isCallingStation = oppStats.avgVpip > 0.6 && oppStats.avgAggression < 0.8;

    // 个体对手档案利用
    // 寻找最后一个主动下注/加注的对手，针对其特点调整策略
    let targetOpponentProfile = null;
    let isTargetLoose = false;
    let isTargetPassive = false;
    let isTargetTight = false;

    // 如果面对加注，尝试找到最有可能的加注者
    if (ctx.raisesInRound > 0) {
        // 简单策略：取第一个非弃牌的对手作为目标
        const potentialRaiser = activeOpponents.find(p => p.currentBet >= ctx.highestBet);
        if (potentialRaiser) {
            targetOpponentProfile = ctx.opponentProfiles.getProfile(potentialRaiser.id);
            if (targetOpponentProfile && targetOpponentProfile.handsPlayed > 3) {
                isTargetLoose = targetOpponentProfile.vpip > 0.55;
                isTargetPassive = targetOpponentProfile.aggression < 0.7;
                isTargetTight = targetOpponentProfile.vpip < 0.30;
            }
        }
    }

    // C-Bet (连续下注)
    // 如果我们是翻前加注者，在翻牌有 C-Bet 优势
    const isPreflopRaiser = ctx.preflopRaiserId === player.id;
    const isFlop = ctx.stage === 'flop';
    const shouldConsiderCBet = isPreflopRaiser && isFlop && callAmt === 0;

    // C-Bet 频率根据牌面材质调整：干燥牌面更高频
    let cBetChance = 0.65;  // 基础 C-Bet 频率
    if (boardTexture > 0.6) cBetChance -= 0.20;  // 湿润牌面降低
    if (boardTexture < 0.3) cBetChance += 0.15;  // 干燥牌面提高
    if (isMultiwayPot) cBetChance -= 0.25;  // 多人锅大幅降低

    // SPR (Stack-to-Pot Ratio) 感知
    // SPR < 4: 浅筹码，倾向 All-in or Fold
    // SPR 4-13: 中等筹码，标准策略
    // SPR > 13: 深筹码，可以多看牌
    const effectiveStack = player.chips + player.currentBet;
    const spr = ctx.pot > 0 ? effectiveStack / ctx.pot : 20;
    const isShallowStack = spr < 4;
    const isDeepStack = spr > 13;

    // 偷盲注检测
    // 检测是否处于偷盲场景：翻前 + 位置靠后 + 前面无人加注
    const isStealPosition = posAdvantage > 0.7; // 按钮位或CO位
    const noRaisersYet = ctx.raisesInRound === 0 && ctx.highestBet <= ctx.bigBlind;
    const isStealScenario = isPreflop && isStealPosition && noRaisersYet;

    // ============ 3-Bet / 再加注检测 ============
    const isFacing3Bet = ctx.raisesInRound >= 2;
    const isFacingRaise = ctx.raisesInRound >= 1 && callAmt > ctx.bigBlind * 2;

    // 极好底池赔率检测 (Excellent Pot Odds)
    // 当跟注金额相对底池极小时（如对手小额 All In），几乎应该总是跟注
    // 例如：底池 $141，跟注只需 $8 (5.4%)，这种赔率几乎不能弃牌
    const callCostRatio = callAmt / (ctx.pot + callAmt);
    const hasExcellentPotOdds = callAmt > 0 && callCostRatio < 0.15; // 跟注成本 < 15% 底池

    if (hasExcellentPotOdds) {
        // 极好的赔率，除非牌极差（胜率极低），否则应该跟注
        // 即使只有 15% 胜率也值得跟这种赔率
        if (winRate > 0.10) {
            return {
                action: 'call',
                isBluffing: false,
                speechType: 'call',
                shouldSpeak: Math.random() < 0.3
            };
        }
    }

    let action: 'fold' | 'call' | 'raise' | 'allin' = 'fold';
    let isBluffing = false;
    const rnd = Math.random();

    // 浅筹码策略：Push or Fold
    if (isShallowStack && isPreflop) {
        // 简化决策：强牌直接全压，弱牌直接弃
        if (winRate > 0.55 || (winRate > 0.45 && isStealScenario)) {
            return {
                action: 'allin',
                isBluffing: false,
                speechType: 'allin',
                shouldSpeak: Math.random() < 0.4
            };
        } else if (callAmt === 0) {
            // 免费看可以check
            action = 'call';
        } else if (winRate < 0.35) {
            return {
                action: 'fold',
                isBluffing: false,
                speechType: 'fold',
                shouldSpeak: Math.random() < 0.2
            };
        } else {
            // 胜率在 0.35-0.55 之间，根据赔率决定
            if (potOdds < 0.35) {
                action = 'call';  // 赔率还可以，跟注
            } else {
                action = 'fold';  // 赔率不好，弃牌
            }
        }
    }

    // ============ 偷盲注逻辑 ============
    if (isStealScenario && !isShallowStack) {
        // Heads Up 或有气泡期对手时更激进地偷盲
        const stealThreshold = hasBubbleOpponent || isHeadsUp ? 0.25 : 0.35;
        if (winRate > stealThreshold || (winRate > 0.20 && rnd < 0.5)) {
            action = 'raise';
            isBluffing = winRate < 0.40;
        }
    }

    // 面对3-Bet的策略
    if (isFacing3Bet && isPreflop) {
        // 利用个体对手档案：面对松散玩家的 3-Bet 可以更宽松地跟注
        const adjustedThreshold = isTargetLoose ? 0.50 : 0.55;

        // 面对3-Bet时收紧范围
        if (winRate > 0.70) {
            action = rnd < 0.6 ? 'allin' : 'call'; // 4-Bet or Call
        } else if (winRate > adjustedThreshold) {
            action = 'call';
        } else {
            return {
                action: 'fold',
                isBluffing: false,
                speechType: 'fold',
                shouldSpeak: Math.random() < 0.25
            };
        }
    }

    // 计算综合调整：Heads Up + 短筹码对手
    const totalAdjustment = headsUpAdjustment + shortStackAdjustment;

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
    // B. 强牌 (Strong) - 应用调整
    else if (winRate > (0.65 - totalAdjustment)) {
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

            // ========== C-Bet 逻辑 ==========
            // 如果是翻前加注者，在翻牌优先考虑 C-Bet
            if (shouldConsiderCBet && rnd < cBetChance) {
                action = 'raise';
                isBluffing = winRate < 0.40;
            }
            // ========== 普通 Bluff 逻辑 ==========
            else {
                let bluffChance = 0.35;
                if (isTightTable) bluffChance += 0.15;
                if (isAggressiveTable) bluffChance -= 0.15;
                if (isLooseTable) bluffChance -= 0.10;

                // 应用多人锅惩罚：多人锅时大幅降低 bluff 频率
                bluffChance *= multiwayBluffPenalty;

                // 跟注站特殊处理：减少 bluff，他们会跟到底
                if (isCallingStation) bluffChance *= 0.3;

                // 利用个体对手档案：面对被动玩家更多 bluff
                if (isTargetPassive) bluffChance += 0.15;
                if (isTargetTight) bluffChance += 0.10;

                if (posAdvantage > 0.7 && boardTexture < 0.4 && rnd < bluffChance) {
                    isBluffing = true;
                    action = 'raise';
                }
            }
        } else {
            // E. 面对下注决策
            // 复用外层 callCostRatio
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
                const isRiver = ctx.stage === 'river';

                // 河牌特殊逻辑
                if (isRiver) {
                    // ========== 阻断牌分析 (Blockers) ==========
                    // 检查我们的手牌是否阻断了对手的坚果牌
                    let hasNutBlocker = false;
                    let hasFlushBlocker = false;

                    // 检查同花阻断牌：持有该花色的 A 会阻断坚果同花
                    const boardSuits: Record<string, number> = {};
                    ctx.communityCards.forEach(c => {
                        boardSuits[c.suit] = (boardSuits[c.suit] || 0) + 1;
                    });
                    const dominantSuit = Object.entries(boardSuits).find(([_, count]) => count >= 3)?.[0];

                    if (dominantSuit) {
                        // 检查我们是否持有该花色的 A
                        hasFlushBlocker = player.hand.some(c =>
                            c.suit === dominantSuit && c.rank === 'A'
                        );
                        if (hasFlushBlocker) hasNutBlocker = true;
                    }

                    // 检查高牌阻断：持有 A 或 K 可能阻断对手的顶对
                    // 可用于未来扩展阻断牌逻辑
                    // const hasHighBlocker = player.hand.some(c => c.rank === 'A' || c.rank === 'K');

                    // 河牌没有听牌，胜率就是最终胜率
                    if (winRate > 0.50) {
                        // 有成牌，价值下注
                        if (callAmt === 0 && rnd < 0.7) {
                            action = 'raise'; // 价值下注
                        } else {
                            action = 'call';
                        }
                    } else if (winRate > 0.35 && isCheap) {
                        // 抓诈唬 (Bluff Catching) 增强逻辑
                        let bluffCatchChance = 0.5;

                        // 利用个体对手档案：面对激进对手更愿意抓诈唬
                        if (targetOpponentProfile && targetOpponentProfile.aggression > 1.3) {
                            bluffCatchChance += 0.20;
                        }
                        // 面对被动对手，减少抓诈唬
                        if (isTargetPassive) {
                            bluffCatchChance -= 0.20;
                        }
                        // 持有阻断牌时更愿意抓诈唬
                        if (hasNutBlocker) {
                            bluffCatchChance += 0.15;
                        }

                        action = rnd < bluffCatchChance ? 'call' : 'fold';
                    } else if (callAmt === 0 && hasNutBlocker && rnd < 0.3 * multiwayBluffPenalty) {
                        // 有阻断牌时可以考虑 bluff
                        action = 'raise';
                        isBluffing = true;
                    } else {
                        action = 'fold';
                    }
                } else {
                    // Flop/Turn: 还有牌可发，考虑隐含赔率
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
    }

    // 修正与安全检查
    if (callAmt >= player.chips) {
        if (action === 'raise' || action === 'call') action = 'allin';
    }

    if (action === 'raise') {
        const minRaise = Math.max(ctx.bigBlind, ctx.lastRaiseAmount);
        if (player.chips <= callAmt + minRaise) {
            action = 'allin';
        }
    }

    // 下注尺寸 (Bet Sizing) 优化
    let raiseAmount: number | undefined;
    if (action === 'raise') {
        let betFactor = 0.6; // 默认 60% 底池

        // 1. 基于胜率的调整
        if (winRate > 0.8) {
            betFactor = 0.8 + Math.random() * 0.4;
        } else if (isBluffing) {
            // Bluff 尺寸极化：要么小要么大
            betFactor = rnd < 0.5 ? 0.5 : 1.0;
        }

        // 2. 牌面材质调整：湿润牌面需要更大尺寸保护
        if (boardTexture > 0.6 && winRate > 0.6) {
            betFactor += 0.3;
        } else if (boardTexture < 0.3 && winRate > 0.5) {
            // 干燥牌面可以用较小尺寸
            betFactor -= 0.1;
        }

        // 3. SPR 调整：浅筹码使用较大比例，深筹码可以较小试探
        if (isShallowStack) {
            betFactor += 0.2;  // 浅筹码时下注更大比例
        } else if (isDeepStack && winRate < 0.5) {
            betFactor -= 0.15;  // 深筹码时可以小额试探
        }

        // 4. 超池下注 (Overbet)：极化范围时使用
        // 只在河牌或强牌时考虑超池
        const isRiver = ctx.stage === 'river';
        if (isRiver && winRate > 0.85 && rnd < 0.25) {
            betFactor = 1.2 + Math.random() * 0.5;  // 120-170% 底池
        }

        // 5. C-Bet 尺寸：通常较小
        if (shouldConsiderCBet && !isBluffing) {
            betFactor = 0.4 + Math.random() * 0.2;  // 40-60% 底池
        }

        let betSize = ctx.pot * betFactor;
        const minRaise = Math.max(ctx.bigBlind, ctx.lastRaiseAmount);
        if (betSize < minRaise) betSize = minRaise;
        if (betSize > player.chips) betSize = player.chips;

        raiseAmount = Math.floor(betSize);
    }

    // 发言系统
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
