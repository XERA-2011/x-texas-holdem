/**
 * Monte Carlo Simulation and Preflop Strength Lookup
 * 蒙特卡洛模拟和翻前手牌强度查表
 */

import { SUITS, RANKS, PREFLOP_HAND_STRENGTH } from './constants';
import { Card } from './card';
import { evaluateHand } from './evaluator';
import type { Player, SuperAIConfig } from './types';

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
    for (let i = 0; i < simulations; i++) {
        // 洗牌 (Fisher-Yates on a copy of baseDeckCards)
        const deck = [...baseDeckCards];
        let m = deck.length, t: Card, j: number;
        while (m) {
            j = Math.floor(Math.random() * m--);
            t = deck[m];
            deck[m] = deck[j];
            deck[j] = t;
        }

        // 模拟公共牌补全
        const simCommunity = [...communityCards];
        while (simCommunity.length < 5) {
            const c = deck.pop();
            if (c) simCommunity.push(c);
        }

        // 模拟对手手牌
        const simOpponentHands: Card[][] = [];
        for (let k = 0; k < activeOpponentsCount; k++) {
            const c1 = deck.pop();
            const c2 = deck.pop();
            if (c1 && c2) simOpponentHands.push([c1, c2]);
        }

        // 评估我的牌
        const myFullHand = [...playerHand, ...simCommunity];
        const myResult = evaluateHand(myFullHand);

        // 评估对手的牌
        const myRank = myResult.rank;
        const myScore = myResult.score;
        let won = true;
        let tie = false;

        for (const oppHand of simOpponentHands) {
            const oppFullHand = [...oppHand, ...simCommunity];
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
