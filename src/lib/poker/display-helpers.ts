/**
 * 显示/格式化 辅助函数
 * Display / Formatting Helpers
 */

import type { Card } from './card';
import { HandRankType, type HandResult } from './types';

/**
 * 格式化卡牌数组为字符串
 * @example formatCards([♠A, ♥K]) => "♠A ♥K"
 */
export function formatCards(cards: Card[]): string {
    return cards.map(c => c.toString()).join(' ');
}

/**
 * 获取牌型的中英文名称
 */
export function getRankName(rank: HandRankType): string {
    const names = [
        'High Card 高牌',
        'Pair 对子',
        'Two Pair 两对',
        'Trips 三条',
        'Straight 顺子',
        'Flush 同花',
        'Full House 葫芦',
        'Quads 四条',
        'Straight Flush 同花顺'
    ];
    return names[rank];
}

/**
 * 获取牌型的详细描述
 * @example "同花顺 (A High)" / "葫芦 (K & 7)"
 */
export function getHandDetailedDescription(result: HandResult): string {
    const rank = result.rank;
    const cards = result.winningCards;

    // 获取格式化等级的助手
    const r = (i: number) => cards[i].rank;

    switch (rank) {
        case HandRankType.STRAIGHT_FLUSH:
            return `同花顺 (${r(0)} High)`;
        case HandRankType.QUADS:
            return `四条 (${r(0)}) + ${r(4)}`;
        case HandRankType.FULL_HOUSE:
            return `葫芦 (${r(0)} & ${r(3)})`;
        case HandRankType.FLUSH:
            return `同花 (${r(0)} High)`;
        case HandRankType.STRAIGHT:
            return `顺子 (${r(0)} High)`;
        case HandRankType.TRIPS:
            return `三条 (${r(0)}) + ${r(3)}, ${r(4)}`;
        case HandRankType.TWO_PAIR:
            return `两对 (${r(0)} & ${r(2)}) + ${r(4)}`;
        case HandRankType.PAIR:
            return `对子 (${r(0)}) + ${r(2)}, ${r(3)}, ${r(4)}`;
        case HandRankType.HIGH_CARD:
            return `高牌 (${r(0)}) + ${r(1)}, ${r(2)}, ${r(3)}, ${r(4)}`;
        default:
            return getRankName(rank);
    }
}
