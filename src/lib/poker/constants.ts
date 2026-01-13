/**
 * 德州扑克基础常量定义
 * 包含花色、点数、AI 话术、预翻牌胜率表等
 */
import { Suit, Rank, SuperAIConfig, GameConfig } from './base-types';

// 花色与点数定义
export const SUITS: Suit[] = ['♠', '♥', '♣', '♦'];
export const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];

// 点数对应数值 (2=2, ..., T=10, ..., A=14)
export const RANK_VALUE: Record<Rank, number> = {
    '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, 'T': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
};

export const BOT_NAMES = [
    'bot_names.0', 'bot_names.1', 'bot_names.2', 'bot_names.3', 'bot_names.4', 'bot_names.5', 'bot_names.6', 'bot_names.7',
    'bot_names.8', 'bot_names.9', 'bot_names.10', 'bot_names.11', 'bot_names.12', 'bot_names.13', 'bot_names.14', 'bot_names.15',
    'bot_names.16', 'bot_names.17', 'bot_names.18', 'bot_names.19', 'bot_names.20', 'bot_names.21', 'bot_names.22', 'bot_names.23'
];

export const SPEECH_LINES: Record<'bot' | 'super', {
    raise: string[];
    call: string[];
    fold: string[];
    check: string[];
    allin: string[];
    bluff_act: string[];
}> = {
    bot: {
        raise: Array.from({ length: 22 }, (_, i) => `speech.bot.raise.${i}`),
        call: Array.from({ length: 26 }, (_, i) => `speech.bot.call.${i}`),
        fold: Array.from({ length: 25 }, (_, i) => `speech.bot.fold.${i}`),
        check: Array.from({ length: 19 }, (_, i) => `speech.bot.check.${i}`),
        allin: Array.from({ length: 19 }, (_, i) => `speech.bot.allin.${i}`),
        bluff_act: Array.from({ length: 7 }, (_, i) => `speech.bot.bluff_act.${i}`),
    },
    super: {
        raise: Array.from({ length: 11 }, (_, i) => `speech.super.raise.${i}`),
        call: Array.from({ length: 9 }, (_, i) => `speech.super.call.${i}`),
        fold: Array.from({ length: 10 }, (_, i) => `speech.super.fold.${i}`),
        check: Array.from({ length: 8 }, (_, i) => `speech.super.check.${i}`),
        allin: Array.from({ length: 9 }, (_, i) => `speech.super.allin.${i}`),
        bluff_act: Array.from({ length: 6 }, (_, i) => `speech.super.bluff_act.${i}`)
    }
};

export const DEFAULT_SUPER_AI_CONFIG: SuperAIConfig = {
    monteCarloSims: 5000,
    opponentModeling: true,
    thinkingDelay: 1500
};

/**
 * 预翻牌手牌强度表 (GTO / Equity Based)
 * 数值范围 0.0 ~ 1.0，代表该起手牌在大部分情况下的胜率期望
 * 's' = Suited (同花), 'o' = Offsuit (杂色)
 */
export const PREFLOP_HAND_STRENGTH: Record<string, number> = {
    // === 对子 (Pocket Pairs) ===
    'AA': 0.85, 'KK': 0.82, 'QQ': 0.80, 'JJ': 0.77, 'TT': 0.75,
    '99': 0.72, '88': 0.69, '77': 0.66, '66': 0.63, '55': 0.60,
    '44': 0.57, '33': 0.54, '22': 0.51,

    // === 同花连牌 (Suited Connectors) ===
    'AKs': 0.67, 'AQs': 0.66, 'AJs': 0.65, 'ATs': 0.64, 'A9s': 0.60,
    'A8s': 0.59, 'A7s': 0.58, 'A6s': 0.57, 'A5s': 0.58, 'A4s': 0.57,
    'A3s': 0.56, 'A2s': 0.55,
    'KQs': 0.63, 'KJs': 0.62, 'KTs': 0.61, 'K9s': 0.58, 'K8s': 0.55,
    'K7s': 0.54, 'K6s': 0.53, 'K5s': 0.52, 'K4s': 0.51, 'K3s': 0.50,
    'K2s': 0.49,
    'QJs': 0.60, 'QTs': 0.59, 'Q9s': 0.56, 'Q8s': 0.53, 'Q7s': 0.50,
    'Q6s': 0.49, 'Q5s': 0.48, 'Q4s': 0.47, 'Q3s': 0.46, 'Q2s': 0.45,
    'JTs': 0.57, 'J9s': 0.54, 'J8s': 0.51, 'J7s': 0.48, 'J6s': 0.45,
    'J5s': 0.44, 'J4s': 0.43, 'J3s': 0.42, 'J2s': 0.41,
    'T9s': 0.54, 'T8s': 0.51, 'T7s': 0.48, 'T6s': 0.45, 'T5s': 0.42,
    'T4s': 0.41, 'T3s': 0.40, 'T2s': 0.39,
    '98s': 0.50, '97s': 0.47, '96s': 0.44, '95s': 0.41, '94s': 0.38,
    '93s': 0.37, '92s': 0.36,
    '87s': 0.47, '86s': 0.44, '85s': 0.41, '84s': 0.38, '83s': 0.35,
    '82s': 0.34,
    '76s': 0.44, '75s': 0.41, '74s': 0.38, '73s': 0.35, '72s': 0.32,
    '65s': 0.41, '64s': 0.38, '63s': 0.35, '62s': 0.32,
    '54s': 0.40, '53s': 0.37, '52s': 0.34,
    '43s': 0.36, '42s': 0.33,
    '32s': 0.33,

    // === 杂色高牌 (Offsuit High Cards) ===
    'AKo': 0.65, 'AQo': 0.64, 'AJo': 0.63, 'ATo': 0.62, 'A9o': 0.57,
    'A8o': 0.56, 'A7o': 0.55, 'A6o': 0.54, 'A5o': 0.55, 'A4o': 0.54,
    'A3o': 0.53, 'A2o': 0.52,
    'KQo': 0.61, 'KJo': 0.60, 'KTo': 0.59, 'K9o': 0.55, 'K8o': 0.52,
    'K7o': 0.51, 'K6o': 0.49, 'K5o': 0.48, 'K4o': 0.47, 'K3o': 0.46,
    'K2o': 0.45,
    'QJo': 0.57, 'QTo': 0.56, 'Q9o': 0.53, 'Q8o': 0.49, 'Q7o': 0.46,
    'Q6o': 0.45, 'Q5o': 0.44, 'Q4o': 0.43, 'Q3o': 0.42, 'Q2o': 0.41,
    'JTo': 0.54, 'J9o': 0.51, 'J8o': 0.47, 'J7o': 0.44, 'J6o': 0.41,
    'J5o': 0.40, 'J4o': 0.39, 'J3o': 0.38, 'J2o': 0.37,
    'T9o': 0.51, 'T8o': 0.47, 'T7o': 0.44, 'T6o': 0.41, 'T5o': 0.38,
    'T4o': 0.37, 'T3o': 0.36, 'T2o': 0.35,
    '98o': 0.46, '97o': 0.43, '96o': 0.40, '95o': 0.37, '94o': 0.34,
    '93o': 0.33, '92o': 0.32,
    '87o': 0.43, '86o': 0.40, '85o': 0.37, '84o': 0.34, '83o': 0.31,
    '82o': 0.30,
    '76o': 0.40, '75o': 0.37, '74o': 0.34, '73o': 0.31, '72o': 0.28,
    '65o': 0.37, '64o': 0.34, '63o': 0.31, '62o': 0.28,
    '54o': 0.36, '53o': 0.33, '52o': 0.30,
    '43o': 0.32, '42o': 0.29,
    '32o': 0.29
};

export const DEFAULT_GAME_CONFIG: GameConfig = {
    aiMode: 'normal',
    roundLimit: 8
};

export const GAME_RULES = {
    INITIAL_CHIPS: 1111,
    SMALL_BLIND: 5,
    BIG_BLIND: 10,
    MAX_PLAYERS: 8,
    LOG_HISTORY_LIMIT: 50,
};

export const UI_CONSTANTS = {
    AI_THINKING_DELAY_BASE: 500,
    AI_THINKING_DELAY_VARIANCE: 500,
    SPEECH_DISPLAY_TIME: 1000,
    FAST: {
        AI_THINKING_DELAY_BASE: 500,
        AI_THINKING_DELAY_VARIANCE: 500,
        SPEECH_DISPLAY_TIME: 500,
    }
};
