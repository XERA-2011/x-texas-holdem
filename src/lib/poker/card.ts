import type { Rank, Suit } from './base-types';
import { RANK_VALUE, SUITS, RANKS } from './constants';

/**
 * 扑克牌实体类
 * 代表一张牌，包含点数 (Rank) 和花色 (Suit)
 */
export class Card {
    rank: Rank;
    suit: Suit;
    value: number;

    constructor(rank: Rank, suit: Suit) {
        this.rank = rank;
        this.suit = suit;
        this.value = RANK_VALUE[rank];
    }

    get color(): 'red' | 'black' {
        return (this.suit === '♥' || this.suit === '♦') ? 'red' : 'black';
    }

    toString(): string {
        // 显示时将 'T' 转换为 '10'，内部逻辑保持 'T' 不变
        const displayRank = this.rank === 'T' ? '10' : this.rank;
        return `${this.suit}${displayRank}`;
    }

    /**
     * 从字符串解析卡牌
     * @param str 例如 "Ah" (红桃A), "Td" (方块10)
     */
    static fromString(str: string): Card {
        // str like "Ah", "Td", "2s", "Tc"
        const suitChar = str.slice(-1).toLowerCase();
        const rankChar = str.slice(0, -1).toUpperCase();

        let suit: Suit;
        switch (suitChar) {
            case 's': suit = '♠'; break;
            case 'h': suit = '♥'; break;
            case 'd': suit = '♦'; break;
            case 'c': suit = '♣'; break;
            default: suit = '♠'; // fallback
        }

        // Handle '10' if strictly passed, but mostly 'T' is expected
        let rank: Rank = rankChar as Rank;
        if (rankChar === '10') rank = 'T';

        return new Card(rank, suit);
    }
}

/**
 * 扑克牌堆类
 * 管理一副牌 (52张)，提供洗牌和发牌功能
 */
export class Deck {
    cards: Card[];

    constructor() {
        this.cards = [];
        this.reset();
    }

    reset() {
        this.cards = [];
        for (const s of SUITS) {
            for (const r of RANKS) {
                this.cards.push(new Card(r, s));
            }
        }
        this.shuffle();
    }

    shuffle() {
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
    }

    deal(): Card | undefined {
        return this.cards.pop();
    }
}
