/**
 * 边池分配模块 (Pot Distribution)
 * 
 * 处理德州扑克中复杂的边池 (Side Pot) 分配逻辑。
 * 当存在 All-in 玩家时，需要按下注层级分配奖池。
 */

import type { Player, HandResult } from './types';
import type { Card } from './card';


/** 玩家下注记录 */
export interface PlayerBet {
    id: number;
    amount: number;
}

/** 玩家评估结果 */
export interface PlayerResult {
    player: Player;
    result: HandResult;
}

/** 单个玩家的分配结果 */
export interface PlayerWinData {
    winnings: number;
    refund: number;
    types: string[];
}

/** 边池分配的完整结果 */
export interface PotDistributionResult {
    /** 每个玩家的赢取金额 (playerId -> WinData) */
    playerWins: Record<number, PlayerWinData>;
    /** 赢家 ID 列表 */
    winners: number[];
    /** 主池赢家的最佳牌组 */
    winningCards: Card[];
}


/**
 * 计算边池分配
 * 
 * 核心思想：
 * 1. 将所有玩家（无论是否弃牌）的有效下注 (totalHandBet) 收集起来
 * 2. 按下注额从小到大分层 (Levels)，每一层构成一个"边池"
 * 3. 只有在该层有下注且没有弃牌的玩家，才有资格争夺该层的奖金
 * 
 * @param activePlayers 未弃牌的活跃玩家
 * @param foldedPlayers 已弃牌的玩家
 * @param results 玩家手牌评估结果
 * @returns 分配结果
 */
export function calculatePotDistribution(
    activePlayers: Player[],
    foldedPlayers: Player[],
    results: PlayerResult[]
): PotDistributionResult {
    const allContributors = [...activePlayers, ...foldedPlayers];

    // 提取所有人的下注额
    const bets: PlayerBet[] = allContributors.map(p => ({ id: p.id, amount: p.totalHandBet }));

    // 找出所有唯一的非零下注额，从小到大排序
    const betLevels = Array.from(new Set(bets.map(b => b.amount).filter(a => a > 0))).sort((a, b) => a - b);

    let processedBet = 0;

    // 临时记录每个玩家赢得的总金额
    const playerWins: Record<number, PlayerWinData> = {};
    const winners: number[] = [];
    let winningCards: Card[] = [];

    // 遍历每一级下注 (Side Pot Slices)
    for (const level of betLevels) {
        const sliceAmount = level - processedBet;
        if (sliceAmount <= 0) continue;

        // 1) 计算当前层底池大小
        // 所有下注额 >= level 的人，都贡献了 sliceAmount
        const contributors = bets.filter(b => b.amount >= level);
        const potSlice = contributors.length * sliceAmount;

        // 2) 找出有资格赢这个池子的人
        // 资格：Active (未弃牌) 且 下注额 >= level
        const eligiblePlayers = activePlayers.filter(p => p.totalHandBet >= level);

        if (eligiblePlayers.length === 0) {
            // 异常情况：此层无人有资格赢 (不应该发生在 showdown)
        } else if (eligiblePlayers.length === 1) {
            // 3) 退款情况 (Run-off / Refund)
            // 只有1个人达到了这个注额深度（通常是最大的那个 All-in 者）
            const winner = eligiblePlayers[0];

            if (!playerWins[winner.id]) {
                playerWins[winner.id] = { winnings: 0, refund: 0, types: [] };
            }

            // 区分是 "退款" 还是 "赢取弃牌死钱"
            if (contributors.length === 1) {
                // 只有他自己下注到这 -> 纯退款
                playerWins[winner.id].refund += potSlice;
                playerWins[winner.id].types.push('退回');
            } else {
                // 有人跟了但弃牌了 -> 赢死钱
                playerWins[winner.id].winnings += potSlice;
                playerWins[winner.id].types.push('边池');
                if (!winners.includes(winner.id)) winners.push(winner.id);
            }

        } else {
            // 4) 竞争情况 (Showdown for this slice)
            // 在 eligiblePlayers 中比牌
            const eligibleResults = results.filter(r => r.player.totalHandBet >= level);

            // 排序：先按牌型等级，再按分数
            eligibleResults.sort((a, b) => {
                if (a.result.rank !== b.result.rank) return b.result.rank - a.result.rank;
                return b.result.score - a.result.score;
            });

            const bestRes = eligibleResults[0];
            const winnersForSlice = eligibleResults.filter(r =>
                r.result.rank === bestRes.result.rank &&
                Math.abs(r.result.score - bestRes.result.score) < 0.001
            );

            // 如果是第一层（主池），记录 Winning Cards
            if (processedBet === 0) {
                winningCards = bestRes.result.winningCards;
            }

            // 分钱
            const share = Math.floor(potSlice / winnersForSlice.length);
            const remainder = potSlice % winnersForSlice.length;

            winnersForSlice.forEach((r, idx) => {
                const w = r.player;
                const winAmt = share + (idx < remainder ? 1 : 0); // 分配零头

                if (!playerWins[w.id]) {
                    playerWins[w.id] = { winnings: 0, refund: 0, types: [] };
                }
                playerWins[w.id].winnings += winAmt;

                // 标记类型
                const isMainPot = eligiblePlayers.length === activePlayers.length;
                const type = isMainPot ? '主池' : '边池';
                if (!playerWins[w.id].types.includes(type)) {
                    playerWins[w.id].types.push(type);
                }

                if (!winners.includes(w.id)) winners.push(w.id);
            });
        }

        processedBet = level;
    }

    return { playerWins, winners, winningCards };
}
