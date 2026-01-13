/**
 * 手牌范围建模模块 (Hand Range Estimation)
 * 根据对手类型推断其可能持有的手牌范围
 */

import { Card } from './card';
import { SUITS, RANKS, PREFLOP_HAND_STRENGTH } from './constants';
import type { OpponentProfile } from './types';

/**
 * 手牌范围类型
 * 定义不同紧度的玩家范围
 */
export interface HandRange {
    name: string;
    hands: string[];  // 手牌 key 列表，如 ['AA', 'KK', 'AKs', ...]
    minStrength: number;  // 最低强度阈值
}

/**
 * 紧手玩家范围 (前 ~12% 手牌)
 * EP (Early Position) 开池范围
 */
export const TIGHT_RANGE: HandRange = {
    name: 'Tight',
    minStrength: 0.60,
    hands: [
        // 大对子
        'AA', 'KK', 'QQ', 'JJ', 'TT', '99', '88',
        // 高牌同花
        'AKs', 'AQs', 'AJs', 'ATs', 'KQs', 'KJs', 'QJs',
        // 高牌杂色
        'AKo', 'AQo', 'AJo', 'KQo'
    ]
};

/**
 * 标准玩家范围 (前 ~25% 手牌)
 * MP/CO 开池范围
 */
export const STANDARD_RANGE: HandRange = {
    name: 'Standard',
    minStrength: 0.50,
    hands: [
        // 所有对子
        'AA', 'KK', 'QQ', 'JJ', 'TT', '99', '88', '77', '66', '55', '44', '33', '22',
        // A 高牌
        'AKs', 'AQs', 'AJs', 'ATs', 'A9s', 'A8s', 'A7s', 'A6s', 'A5s', 'A4s', 'A3s', 'A2s',
        'AKo', 'AQo', 'AJo', 'ATo', 'A9o',
        // K 高牌
        'KQs', 'KJs', 'KTs', 'K9s',
        'KQo', 'KJo', 'KTo',
        // Q 高牌
        'QJs', 'QTs', 'Q9s',
        'QJo', 'QTo',
        // 同花连牌
        'JTs', 'T9s', '98s', '87s', '76s', '65s', '54s'
    ]
};

/**
 * 松散玩家范围 (前 ~45% 手牌)
 * BTN/SB 开池范围，或松散玩家
 */
export const LOOSE_RANGE: HandRange = {
    name: 'Loose',
    minStrength: 0.38,
    hands: [
        // 所有对子
        'AA', 'KK', 'QQ', 'JJ', 'TT', '99', '88', '77', '66', '55', '44', '33', '22',
        // 所有 A
        'AKs', 'AQs', 'AJs', 'ATs', 'A9s', 'A8s', 'A7s', 'A6s', 'A5s', 'A4s', 'A3s', 'A2s',
        'AKo', 'AQo', 'AJo', 'ATo', 'A9o', 'A8o', 'A7o', 'A6o', 'A5o', 'A4o', 'A3o', 'A2o',
        // K 高牌
        'KQs', 'KJs', 'KTs', 'K9s', 'K8s', 'K7s', 'K6s', 'K5s',
        'KQo', 'KJo', 'KTo', 'K9o',
        // Q 高牌
        'QJs', 'QTs', 'Q9s', 'Q8s',
        'QJo', 'QTo', 'Q9o',
        // J 高牌
        'JTs', 'J9s', 'J8s',
        'JTo', 'J9o',
        // 同花连牌
        'T9s', 'T8s', '98s', '97s', '87s', '86s', '76s', '75s', '65s', '64s', '54s', '53s', '43s'
    ]
};

/**
 * 3-Bet 范围 (用于对抗开池加注)
 */
export const THREE_BET_VALUE_RANGE: HandRange = {
    name: '3-Bet Value',
    minStrength: 0.70,
    hands: ['AA', 'KK', 'QQ', 'JJ', 'AKs', 'AKo', 'AQs']
};

/**
 * 3-Bet Light 范围 (用于对抗松散开池)
 */
export const THREE_BET_BLUFF_RANGE: HandRange = {
    name: '3-Bet Bluff',
    minStrength: 0.45,
    hands: ['A5s', 'A4s', 'A3s', 'A2s', 'KJs', 'QJs', 'JTs', 'T9s', '98s', '87s', '76s']
};

/**
 * 根据对手档案估算其手牌范围
 * @param profile 对手档案
 * @returns 估算的手牌范围
 */
export function estimateOpponentRange(profile: OpponentProfile | undefined): HandRange {
    if (!profile || profile.handsPlayed < 3) {
        // 数据不足，使用标准范围
        return STANDARD_RANGE;
    }

    // 根据 VPIP 判断松紧度
    if (profile.vpip < 0.20) {
        return TIGHT_RANGE;
    } else if (profile.vpip > 0.45) {
        return LOOSE_RANGE;
    }
    return STANDARD_RANGE;
}

/**
 * 根据 VPIP 动态生成手牌范围
 * @param vpip 入池率 (0-1)
 * @returns 手牌 key 列表
 */
export function generateRangeByVpip(vpip: number): string[] {
    // 将 VPIP 映射到强度阈值
    // VPIP 0.15 => 强度阈值 0.65 (紧)
    // VPIP 0.50 => 强度阈值 0.35 (松)
    const strengthThreshold = 0.65 - (vpip - 0.15) * 0.85;
    const clampedThreshold = Math.max(0.28, Math.min(0.70, strengthThreshold));

    // 从 PREFLOP_HAND_STRENGTH 中筛选符合阈值的手牌
    const hands: string[] = [];
    for (const [hand, strength] of Object.entries(PREFLOP_HAND_STRENGTH)) {
        if (strength >= clampedThreshold) {
            hands.push(hand);
        }
    }
    return hands;
}

/**
 * 检查手牌是否在给定范围内
 * @param handKey 手牌 key (如 'AKs')
 * @param range 手牌范围
 */
export function isHandInRange(handKey: string, range: HandRange): boolean {
    return range.hands.includes(handKey);
}

/**
 * 从范围中随机采样一手牌
 * @param range 手牌范围
 * @param excludedCards 已知被排除的牌
 * @returns 采样的两张牌，或 null 如果无法采样
 */
export function sampleHandFromRange(
    range: HandRange,
    excludedCards: Set<string>
): [Card, Card] | null {
    // 随机选择范围内的一个手牌类型
    const shuffledHands = [...range.hands].sort(() => Math.random() - 0.5);

    for (const handKey of shuffledHands) {
        const cards = generateCardsFromKey(handKey, excludedCards);
        if (cards) return cards;
    }

    return null; // 无法生成
}

/**
 * 从手牌 key 生成具体的两张牌
 * @param handKey 如 'AA', 'AKs', 'AKo'
 * @param excludedCards 已被排除的牌
 */
function generateCardsFromKey(
    handKey: string,
    excludedCards: Set<string>
): [Card, Card] | null {
    if (handKey.length < 2) return null;

    const rank1 = handKey[0] as typeof RANKS[number];
    const rank2 = handKey[1] as typeof RANKS[number];
    const isSuited = handKey.length === 3 && handKey[2] === 's';
    const isPair = rank1 === rank2;

    const availableSuits = SUITS.slice(); // 复制数组

    if (isPair) {
        // 对子：选择两个不同花色
        const shuffledSuits = [...availableSuits].sort(() => Math.random() - 0.5);
        for (let i = 0; i < shuffledSuits.length; i++) {
            for (let j = i + 1; j < shuffledSuits.length; j++) {
                const c1 = new Card(rank1, shuffledSuits[i]);
                const c2 = new Card(rank2, shuffledSuits[j]);
                if (!excludedCards.has(c1.toString()) && !excludedCards.has(c2.toString())) {
                    return [c1, c2];
                }
            }
        }
    } else if (isSuited) {
        // 同花：两张牌相同花色
        const shuffledSuits = [...availableSuits].sort(() => Math.random() - 0.5);
        for (const suit of shuffledSuits) {
            const c1 = new Card(rank1, suit);
            const c2 = new Card(rank2, suit);
            if (!excludedCards.has(c1.toString()) && !excludedCards.has(c2.toString())) {
                return [c1, c2];
            }
        }
    } else {
        // 杂色：两张牌不同花色
        const shuffledSuits1 = [...availableSuits].sort(() => Math.random() - 0.5);
        const shuffledSuits2 = [...availableSuits].sort(() => Math.random() - 0.5);
        for (const s1 of shuffledSuits1) {
            for (const s2 of shuffledSuits2) {
                if (s1 === s2) continue;
                const c1 = new Card(rank1, s1);
                const c2 = new Card(rank2, s2);
                if (!excludedCards.has(c1.toString()) && !excludedCards.has(c2.toString())) {
                    return [c1, c2];
                }
            }
        }
    }

    return null;
}

/**
 * 计算范围内手牌的平均强度
 */
export function getRangeAverageStrength(range: HandRange): number {
    let total = 0;
    let count = 0;
    for (const hand of range.hands) {
        const strength = PREFLOP_HAND_STRENGTH[hand];
        if (strength !== undefined) {
            total += strength;
            count++;
        }
    }
    return count > 0 ? total / count : 0.5;
}
