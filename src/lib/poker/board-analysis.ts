/**
 * Board Analysis - Position and Board Texture
 * 牌面分析 - 位置优势和牌面材质
 */

import type { Card } from './card';
import type { Player } from './types';

/**
 * 获取位置优势
 * @returns 0.0 (最差, OOP) ~ 1.0 (最好, IP/Button)
 */
export function getPositionAdvantage(
    playerId: number,
    players: Player[],
    dealerIdx: number
): number {
    const N = players.length;
    const playerIdx = players.findIndex(p => p.id === playerId);

    // 计算相对于"最早行动者"的偏移量
    // 0 = First to act (SB/Small Blind position postflop), 1 = Next...
    const postFlopOrder = (playerIdx - (dealerIdx + 1) + N) % N;

    // 归一化得分 (0.0 - 1.0)
    const score = postFlopOrder / (Math.max(1, N - 1));
    return Math.min(1.0, Math.max(0.0, score));
}

/**
 * 分析牌面材质 (Board Texture)
 * @returns score 0.0 (Dry/干燥) ~ 1.0 (Wet/湿润/危险)
 */
export function getBoardTexture(communityCards: Card[]): number {
    const board = communityCards;
    if (board.length === 0) return 0.5; // Preflop 视为中性

    let score = 0.0;

    // 1. 检查同花可能 (Flush Draw potential)
    const suitCounts: Record<string, number> = { '♠': 0, '♥': 0, '♣': 0, '♦': 0 };
    board.forEach(c => { if (c.suit) suitCounts[c.suit as string]++ });
    const maxSuit = Math.max(...Object.values(suitCounts));

    if (maxSuit >= 3) score += 0.5;     // 已经成同花或强听花
    else if (maxSuit === 2) score += 0.2; // 有听花可能

    // 2. 检查顺子连牌 (Connectedness)
    const ranks = board.map(c => c.value).sort((a, b) => a - b);
    let maxConnected = 1;
    let currentConn = 1;
    // 去重后检查连号
    const uniqueRanks = Array.from(new Set(ranks)).sort((a, b) => a - b);
    for (let i = 0; i < uniqueRanks.length - 1; i++) {
        if (uniqueRanks[i + 1] - uniqueRanks[i] === 1) currentConn++;
        else currentConn = 1;
        maxConnected = Math.max(maxConnected, currentConn);
    }

    if (maxConnected >= 3) score += 0.4;    // 3连张 (e.g. 5-6-7)
    else if (maxConnected === 2) score += 0.15; // 2连张

    // 3. 检查公对 (Paired Board)
    const rankCounts: Record<number, number> = {};
    board.forEach(c => rankCounts[c.value] = (rankCounts[c.value] || 0) + 1);
    const maxRankCount = Math.max(...Object.values(rankCounts));

    if (maxRankCount >= 2) score += 0.25; // 牌面有对子，可能有葫芦/炸弹

    // High Card Texture (高牌面通常更适合激进)
    const highCardCount = board.filter(c => c.value >= 10).length;
    if (highCardCount >= 2) score += 0.1;

    return Math.min(1.0, score);
}
