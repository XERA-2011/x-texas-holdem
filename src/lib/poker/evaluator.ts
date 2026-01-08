import { Card } from './card';
import { HandResult, HandRankType } from './types';

/**
 * 评估手牌强度
 * 
 * 从 7 张牌 (2张手牌 + 5张公共牌) 中找出最佳的 5 张牌组合。
 * 返回该组合的牌型等级 (Rank) 和用于比较大小的分数 (Score)。
 * 
 * @param cards 待评估的卡牌数组 (通常为 2~7 张)
 */
export function evaluateHand(cards: Card[]): HandResult {
    const sorted = [...cards].sort((a, b) => b.value - a.value);

    const suitCounts: Record<string, number> = {};
    const rankCounts: Record<number, number> = {};

    sorted.forEach(c => {
        suitCounts[c.suit] = (suitCounts[c.suit] || 0) + 1;
        rankCounts[c.value] = (rankCounts[c.value] || 0) + 1;
    });

    const flushSuit = Object.keys(suitCounts).find(s => suitCounts[s] >= 5);
    const flushCards = flushSuit ? sorted.filter(c => c.suit === flushSuit) : [];

    const getStraight = (cardList: Card[]): Card[] | null => {
        const unique: Card[] = [];
        cardList.forEach(c => { if (!unique.find(u => u.value === c.value)) unique.push(c); });

        // 检查 A 小顺子 (A, 2, 3, 4, 5)
        if (unique.some(c => c.value === 14)) {
            const aceLow = new Card('A', unique.find(c => c.value === 14)!.suit);
            aceLow.value = 1;
            unique.push(aceLow);
        }
        // 重新排序，因为可能在最后添加了作为 1 的 A
        unique.sort((a, b) => b.value - a.value);

        for (let i = 0; i <= unique.length - 5; i++) {
            if (unique[i].value - unique[i + 4].value === 4) return unique.slice(i, i + 5);
        }
        return null;
    };

    const straightCards = getStraight(sorted);
    const straightFlushCards = flushSuit ? getStraight(flushCards) : null;

    const calcScore = (rankIdx: number, best5: Card[]) => {
        let s = rankIdx * 10000000000;
        if (best5[0]) s += (best5[0].value * 100000000);
        if (best5[1]) s += (best5[1].value * 1000000);
        if (best5[2]) s += (best5[2].value * 10000);
        if (best5[3]) s += (best5[3].value * 100);
        if (best5[4]) s += (best5[4].value * 1);
        return s;
    };

    if (straightFlushCards) return { rank: HandRankType.STRAIGHT_FLUSH, score: calcScore(8, straightFlushCards), winningCards: straightFlushCards, bestHand: straightFlushCards };

    const quadsValStr = Object.keys(rankCounts).find(r => rankCounts[parseInt(r)] === 4);
    if (quadsValStr) {
        const quadsVal = parseInt(quadsValStr);
        const quads = sorted.filter(c => c.value === quadsVal);
        const kicker = sorted.find(c => c.value !== quadsVal);
        const best5 = [...quads, ...(kicker ? [kicker] : [])];
        return { rank: HandRankType.QUADS, score: calcScore(7, best5), winningCards: quads, bestHand: best5 };
    }

    const tripsVals = Object.keys(rankCounts).filter(r => rankCounts[parseInt(r)] === 3).map(Number).sort((a, b) => b - a);
    const pairVals = Object.keys(rankCounts).filter(r => rankCounts[parseInt(r)] === 2).map(Number).sort((a, b) => b - a);

    if (tripsVals.length > 0) {
        const tVal = tripsVals[0];
        let pVal = -1;
        if (tripsVals.length > 1) pVal = tripsVals[1];
        else if (pairVals.length > 0) pVal = pairVals[0];

        if (pVal !== -1) {
            const tCards = sorted.filter(c => c.value === tVal);
            const pCards = sorted.filter(c => c.value === pVal).slice(0, 2);
            const best5 = [...tCards, ...pCards];
            return { rank: HandRankType.FULL_HOUSE, score: calcScore(6, best5), winningCards: best5, bestHand: best5 };
        }
    }

    if (flushCards.length >= 5) {
        const best5 = flushCards.slice(0, 5);
        return { rank: HandRankType.FLUSH, score: calcScore(5, best5), winningCards: best5, bestHand: best5 };
    }

    if (straightCards) return { rank: HandRankType.STRAIGHT, score: calcScore(4, straightCards), winningCards: straightCards, bestHand: straightCards };

    if (tripsVals.length > 0) {
        const tVal = tripsVals[0];
        const trips = sorted.filter(c => c.value === tVal);
        const kickers = sorted.filter(c => c.value !== tVal).slice(0, 2);
        const best5 = [...trips, ...kickers];
        return { rank: HandRankType.TRIPS, score: calcScore(3, best5), winningCards: trips, bestHand: best5 };
    }

    if (pairVals.length >= 2) {
        const p1 = pairVals[0], p2 = pairVals[1];
        const pair1 = sorted.filter(c => c.value === p1);
        const pair2 = sorted.filter(c => c.value === p2);
        const kicker = sorted.find(c => c.value !== p1 && c.value !== p2);
        const best5 = [...pair1, ...pair2, ...(kicker ? [kicker] : [])];
        return { rank: HandRankType.TWO_PAIR, score: calcScore(2, best5), winningCards: [...pair1, ...pair2], bestHand: best5 };
    }

    if (pairVals.length === 1) {
        const p1 = pairVals[0];
        const pair = sorted.filter(c => c.value === p1);
        const kickers = sorted.filter(c => c.value !== p1).slice(0, 3);
        const best5 = [...pair, ...kickers];
        return { rank: HandRankType.PAIR, score: calcScore(1, best5), winningCards: pair, bestHand: best5 };
    }

    const best5 = sorted.slice(0, 5);
    return { rank: HandRankType.HIGH_CARD, score: calcScore(0, best5), winningCards: [best5[0]], bestHand: best5 };
}
