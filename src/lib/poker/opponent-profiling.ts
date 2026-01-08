/**
 * 对手建模/档案管理模块
 * Opponent Profiling Module
 */

import { HandRankType, type OpponentProfile, type Player } from './types';

/**
 * 创建默认的对手档案
 */
export function createDefaultProfile(playerId: number): OpponentProfile {
    return {
        playerId,
        vpip: 0.5,       // 入池率 (Voluntarily Put In Pot)
        pfr: 0.2,        // 翻前加注率 (Pre-Flop Raise)
        aggression: 1.0, // 激进度
        handsPlayed: 0,
        showdownStrengths: []
    };
}

/**
 * 对手档案管理器
 * 封装对手档案的增删改查逻辑
 */
export class OpponentProfileManager {
    private profiles: Map<number, OpponentProfile> = new Map();

    /**
     * 获取或创建玩家的对手档案
     */
    getOrCreateProfile(playerId: number): OpponentProfile {
        if (!this.profiles.has(playerId)) {
            this.profiles.set(playerId, createDefaultProfile(playerId));
        }
        return this.profiles.get(playerId)!;
    }

    /**
     * 获取档案 (不自动创建)
     */
    getProfile(playerId: number): OpponentProfile | undefined {
        return this.profiles.get(playerId);
    }

    /**
     * 更新对手档案统计数据
     * 在每次玩家行动后调用
     * @param isPreflop 是否是翻前阶段
     */
    updateProfile(
        player: Player,
        action: 'fold' | 'call' | 'raise' | 'allin',
        isPreflop: boolean
    ): void {
        const profile = this.getOrCreateProfile(player.id);
        const n = profile.handsPlayed;

        // 1. 更新 VPIP (Voluntarily Put In Pot) - 入池率
        // 在翻前，如果玩家主动投入筹码 (call/raise/allin 而非 fold)
        if (isPreflop) {
            const didVPIP = action !== 'fold';
            // 增量平均: newAvg = (oldAvg * n + newValue) / (n + 1)
            profile.vpip = (profile.vpip * n + (didVPIP ? 1 : 0)) / (n + 1);

            // 2. 更新 PFR (Pre-Flop Raise) - 翻前加注率
            const didPFR = action === 'raise' || action === 'allin';
            profile.pfr = (profile.pfr * n + (didPFR ? 1 : 0)) / (n + 1);
        }

        // 3. 更新激进度 (Aggression Factor)
        // AF = (Raise + Bet) / Call，这里简化为 raise 比例
        if (action === 'raise' || action === 'allin') {
            profile.aggression = Math.min(2.0, profile.aggression + 0.1);
        } else if (action === 'call') {
            profile.aggression = Math.max(0.3, profile.aggression - 0.05);
        }

        profile.handsPlayed = n + 1;
    }

    /**
     * 更新对手摊牌牌力统计
     * 在摊牌后调用，用于建模对手的手牌范围
     */
    updateShowdownStrength(player: Player, handRank: HandRankType): void {
        const profile = this.getOrCreateProfile(player.id);
        profile.showdownStrengths.push(handRank);
        // 只保留最近 20 次摊牌记录
        if (profile.showdownStrengths.length > 20) {
            profile.showdownStrengths.shift();
        }
    }

    /**
     * 获取活跃对手的平均统计数据
     */
    getAverageStats(
        players: Player[]
    ): { avgVpip: number; avgPfr: number; avgAggression: number } {
        const activeOpponents = players.filter(
            p => !p.isEliminated && p.status !== 'folded' && !p.isHuman
        );

        if (activeOpponents.length === 0) {
            return { avgVpip: 0.5, avgPfr: 0.2, avgAggression: 1.0 };
        }

        let totalVpip = 0, totalPfr = 0, totalAgg = 0;
        let count = 0;

        for (const opp of activeOpponents) {
            const profile = this.profiles.get(opp.id);
            if (profile && profile.handsPlayed > 0) {
                totalVpip += profile.vpip;
                totalPfr += profile.pfr;
                totalAgg += profile.aggression;
                count++;
            }
        }

        if (count === 0) {
            return { avgVpip: 0.5, avgPfr: 0.2, avgAggression: 1.0 };
        }

        return {
            avgVpip: totalVpip / count,
            avgPfr: totalPfr / count,
            avgAggression: totalAgg / count
        };
    }

    /**
     * 重置所有档案
     */
    reset(): void {
        this.profiles.clear();
    }
}
