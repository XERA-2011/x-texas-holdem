/**
 * Monte Carlo Simulation and Preflop Strength Lookup
 * 蒙特卡洛模拟和翻前手牌强度查表
 */

import { SUITS, RANKS, PREFLOP_HAND_STRENGTH } from './constants';
import { Card } from './card';
import { evaluateHand } from './evaluator';
// import type { SuperAIConfig } from './types';
import { sampleHandFromRange } from './hand-ranges';

/**
 * 获取手牌的标准 Key (用于查表)
 * @returns 'AA', 'AKs' (同花), 'AKo' (杂色) 格式
 */
export function getHandKey(hand: Card[]): string {
    if (hand.length < 2) return '';

    const c1 = hand[0];
    const c2 = hand[1];

    // 按大小排序 (大的在前)
    let r1 = c1.rank;
    let r2 = c2.rank;
    if (c2.value > c1.value) {
        [r1, r2] = [r2, r1];
    }

    // 对子
    if (r1 === r2) {
        return `${r1}${r2}`;
    }

    // 同花 vs 杂色
    const suited = c1.suit === c2.suit;
    return `${r1}${r2}${suited ? 's' : 'o'}`;
}

/**
 * 翻前使用查表获取手牌强度 (比蒙特卡洛快 100x+)
 * @returns 0.0 - 1.0 的强度值
 */
export function getPreflopStrength(
    playerHand: Card[],
    activeOpponentsCount: number
): number {
    const key = getHandKey(playerHand);
    const baseStrength = PREFLOP_HAND_STRENGTH[key] ?? 0.35; // 未知牌默认中低

    // 每增加一个对手，强度约下降 3-5%
    const multiWayPenalty = activeOpponentsCount * 0.035;

    return Math.max(0.1, baseStrength - multiWayPenalty);
}

/**
 * 蒙特卡洛模拟核心方法
 * 计算当前玩家在剩下发牌随机情况下的胜率
 */
export function calculateWinRateMonteCarlo(
    playerHand: Card[],
    communityCards: Card[],
    activeOpponentsCount: number,
    simulations: number
): number {
    if (activeOpponentsCount === 0) return 1.0;

    let wins = 0;
    let ties = 0;

    // 1. 确定已知牌
    const knownCards = [...playerHand, ...communityCards];
    const knownCardSet = new Set(knownCards.map(c => c.toString()));

    // 预先生成一个完整的牌堆用于复制，避免反复创建对象
    const baseDeckCards: Card[] = [];
    for (const s of SUITS) {
        for (const r of RANKS) {
            const c = new Card(r, s);
            if (!knownCardSet.has(c.toString())) {
                baseDeckCards.push(c);
            }
        }
    }

    // 3. 开始模拟
    // 3. 开始模拟
    const needed = (5 - communityCards.length) + activeOpponentsCount * 2;

    // Reuse arrays to reduce GC
    const simCommunity = new Array(5);
    // simOpponentHands will be created fresh or reused? 
    // Reusing a flat array for opponent cards might be faster but evaluateHand takes array.
    // Let's stick to array creation for hands as clarity > extreme opt for now, but optimize shuffle.

    for (let i = 0; i < simulations; i++) {
        // Partial Shuffle: Only shuffle the first 'needed' cards
        const deck = [...baseDeckCards];
        for (let j = 0; j < needed; j++) {
            const r = j + Math.floor(Math.random() * (deck.length - j));
            const temp = deck[j];
            deck[j] = deck[r];
            deck[r] = temp;
        }

        let cardIdx = 0;

        // 模拟公共牌补全
        // Copy existing community cards first
        let commIdx = 0;
        for (; commIdx < communityCards.length; commIdx++) {
            simCommunity[commIdx] = communityCards[commIdx];
        }
        // Fill rest from deck
        while (commIdx < 5) {
            simCommunity[commIdx++] = deck[cardIdx++];
        }

        // 模拟对手手牌
        // Evaluate loop inline to avoid creating simOpponentHands array if possible?
        // But we need to check ALL opponents against ME.

        // 评估我的牌
        // Construct myFullHand
        const myFullHand = [...playerHand, ...simCommunity];
        const myResult = evaluateHand(myFullHand);
        const myRank = myResult.rank;
        const myScore = myResult.score;

        let won = true;
        let tie = false;

        // 评估对手
        for (let k = 0; k < activeOpponentsCount; k++) {
            const c1 = deck[cardIdx++];
            const c2 = deck[cardIdx++];
            // Optimization: Reuse a static array for opponent eval?
            // evaluateHand takes Card[], so we can pass [c1, c2, ...simCommunity] directly?
            // constructing [...simCommunity, c1, c2] is cleaner.

            const oppFullHand = [...simCommunity, c1, c2];
            const oppResult = evaluateHand(oppFullHand);

            if (oppResult.rank > myRank) {
                won = false; break;
            } else if (oppResult.rank === myRank) {
                if (oppResult.score > myScore) {
                    won = false; break;
                } else if (Math.abs(oppResult.score - myScore) < 0.001) {
                    tie = true;
                }
            }
        }

        if (won) {
            if (tie) ties++;
            else wins++;
        }
    }

    // 简单计算胜率 = (赢次数 + 平局次数/2) / 总次数
    return (wins + ties / 2) / simulations;
}

/**
 * 基于对手范围的蒙特卡洛模拟
 * 比完全随机更准确，因为会根据对手类型限制其手牌范围
 */
export function calculateWinRateWithRange(
    playerHand: Card[],
    communityCards: Card[],
    opponentRanges: string[][],  // 每个对手的手牌范围
    simulations: number
): number {
    if (opponentRanges.length === 0) return 1.0;

    // 引入范围采样模块
    // const { sampleHandFromRange, STANDARD_RANGE } = require('./hand-ranges');

    let wins = 0;
    let ties = 0;

    const knownCards = [...playerHand, ...communityCards];
    const knownCardSet = new Set(knownCards.map((c: Card) => c.toString()));

    // 预生成剩余牌堆
    const baseDeckCards: Card[] = [];
    for (const s of SUITS) {
        for (const r of RANKS) {
            const c = new Card(r, s);
            if (!knownCardSet.has(c.toString())) {
                baseDeckCards.push(c);
            }
        }
    }

    for (let i = 0; i < simulations; i++) {
        const usedCards = new Set(knownCardSet);
        const simOpponentHands: Card[][] = [];
        let validSim = true;

        // 为每个对手从其范围中采样手牌
        for (const range of opponentRanges) {
            const rangeObj = { name: 'dynamic', hands: range, minStrength: 0 };
            const hand = sampleHandFromRange(rangeObj, usedCards);
            if (hand) {
                simOpponentHands.push(hand);
                usedCards.add(hand[0].toString());
                usedCards.add(hand[1].toString());
            } else {
                validSim = false;
                break;
            }
        }

        if (!validSim) {
            // 无法采样，回退到随机
            continue;
        }

        // 洗牌
        const deck = baseDeckCards.filter(c => !usedCards.has(c.toString()));
        let m = deck.length, t: Card, j: number;
        while (m) {
            j = Math.floor(Math.random() * m--);
            t = deck[m];
            deck[m] = deck[j];
            deck[j] = t;
        }

        // 补全公共牌
        const simCommunity = [...communityCards];
        while (simCommunity.length < 5) {
            const c = deck.pop();
            if (c) simCommunity.push(c);
        }

        // 评估
        const myFullHand = [...playerHand, ...simCommunity];
        const myResult = evaluateHand(myFullHand);
        const myRank = myResult.rank;
        const myScore = myResult.score;

        let won = true;
        let tie = false;

        for (const oppHand of simOpponentHands) {
            const oppFullHand = [...oppHand, ...simCommunity];
            const oppResult = evaluateHand(oppFullHand);

            if (oppResult.rank > myRank) {
                won = false;
                break;
            } else if (oppResult.rank === myRank) {
                if (oppResult.score > myScore) {
                    won = false;
                    break;
                } else if (Math.abs(oppResult.score - myScore) < 0.001) {
                    tie = true;
                }
            }
        }

        if (won) {
            if (tie) ties++;
            else wins++;
        }
    }

    const totalValid = wins + ties + (simulations - wins - ties);
    if (totalValid === 0) return 0.5;

    return (wins + ties / 2) / simulations;
}

