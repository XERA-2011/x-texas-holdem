/**
 * 普通电脑 vs 超级电脑 模拟测试
 * 4 个普通电脑 vs 4 个超级电脑
 * 统计各自胜率
 */

import { PokerGameEngine, GAME_RULES, BOT_NAMES, Deck } from '../src/lib/poker-engine';
import type { Player, AIMode } from '../src/lib/poker/types';

interface SimulationResult {
    normalWins: number;
    superWins: number;
    gamesPlayed: number;
    normalChipsWon: number;
    superChipsWon: number;
    normalSurvivals: number;  // 普通电脑存活到最后的次数
    superSurvivals: number;   // 超级电脑存活到最后的次数
}

const NORMAL_PLAYER_IDS = [0, 1, 2, 3];  // 前 4 个是普通电脑
const SUPER_PLAYER_IDS = [4, 5, 6, 7];   // 后 4 个是超级电脑
const TOTAL_PLAYERS = 8;
const INITIAL_CHIPS = GAME_RULES.INITIAL_CHIPS;

/**
 * 创建混合 AI 模式的游戏引擎
 */
class MixedAIGameEngine extends PokerGameEngine {
    playerModes: Map<number, AIMode> = new Map();

    constructor(onChange: (snapshot: ReturnType<PokerGameEngine['getSnapshot']>) => void) {
        super(onChange);
    }

    /**
     * 重置游戏，初始化混合 AI 玩家
     */
    resetGameMixed() {
        if (this._isDestroyed) return;
        this.players = [];
        this.logs = [];
        this.playerModes.clear();

        const shuffledNames = [...BOT_NAMES].sort(() => 0.5 - Math.random());

        for (let i = 0; i < TOTAL_PLAYERS; i++) {
            const isNormalAI = NORMAL_PLAYER_IDS.includes(i);
            const aiMode: AIMode = isNormalAI ? 'normal' : 'super';
            const prefix = isNormalAI ? '[普通]' : '[超级]';

            this.players.push({
                id: i,
                persona: 'bot',
                name: `${prefix}${shuffledNames[i]}`,
                isHuman: false,
                chips: INITIAL_CHIPS,
                hand: [],
                status: 'active',
                currentBet: 0,
                isEliminated: false,
                totalHandBet: 0,
                hasActed: false
            });

            this.playerModes.set(i, aiMode);
        }

        this.deck = new Deck();
        this.communityCards = [];
        this.pot = 0;
        this.dealerIdx = -1;
        this.highestBet = 0;
        this.stage = 'preflop';
        this.actorsLeft = 0;
        this.raisesInRound = 0;
        this.currentTurnIdx = 0;
        this.winners = [];
        this.winningCards = [];
    }

    /**
     * 覆写 processTurn 以支持同步执行 (移除 setTimeout)
     */
    processTurn() {
        if (this._isDestroyed) return;

        // 循环直到找到需要行动的活跃玩家，或者切换阶段
        while (true) {
            const currentTurnIdx = this.currentTurnIdx;
            const p = this.players[currentTurnIdx];

            if (!p) return;

            // 1. 如果当前玩家已 fold/allin/eliminated
            if (p.status === 'folded' || p.isEliminated || p.status === 'allin') {
                if (this.isBetsSettled()) {
                    this.nextStage();
                    return; // 切换阶段后会重新调用 processTurn，这里直接返回
                } else {
                    // 移动到下一个玩家
                    this.currentTurnIdx = this.getNextActive(currentTurnIdx);
                    // 继续循环
                    continue;
                }
            }

            // 2. 找到了活跃玩家
            this.notify();

            // 在测试模式下，等待外部循环调用 aiAction
            // 所以这里什么都不做，直接返回
            return;
        }
    }

    /**
     * 覆写 AI 行动逻辑，根据玩家 ID 使用不同的 AI
     */
    aiAction(player: Player) {
        try {
            const playerMode = this.playerModes.get(player.id) || 'normal';

            if (playerMode === 'super') {
                this._superAIActionLogic(player);
            } else {
                this._aiActionLogic(player);
            }
        } catch (e: unknown) {
            const errorMessage = e instanceof Error ? e.message : String(e);
            console.error(`AI Error (${player.name}): ${errorMessage}`);
            this.handleAction(player, 'fold');
        }
    }
}

/**
* 运行单局游戏直到结束
*/
async function runSingleGame(engine: MixedAIGameEngine, maxRounds: number = 200, sims: number = 1000): Promise<{
    winner: Player | null;
    rounds: number;
}> {
    engine.resetGameMixed();

    // 设置为 super 模式以开启对手建模数据收集
    engine.setAIMode('super');

    engine.superAIConfig = {
        monteCarloSims: sims,
        opponentModeling: true,
        thinkingDelay: 0
    };
    engine.testMode = true;

    let rounds = 0;

    while (rounds < maxRounds) {
        // 检查是否只剩一个玩家
        const activePlayers = engine.players.filter(p => !p.isEliminated);
        if (activePlayers.length <= 1) {
            return {
                winner: activePlayers[0] || null,
                rounds
            };
        }

        // 开始新一轮
        engine.startNextRound();
        rounds++;

        // 等待这一轮结束
        let stepCount = 0;
        const maxSteps = 200; // 增加最大步数防止提前跳出

        while (engine.stage !== 'showdown' && stepCount < maxSteps) {
            const currentPlayer = engine.players[engine.currentTurnIdx];

            if (!currentPlayer) break;

            if (currentPlayer.status === 'active' && !currentPlayer.isHuman) {
                engine.aiAction(currentPlayer);
            } else if (currentPlayer.status !== 'active') {
                // pass
            }

            stepCount++;
            if (stepCount % 50 === 0) await new Promise(r => setTimeout(r, 0));
        }
    }

    // 超过最大轮数，选择筹码最多的玩家作为赢家
    const richestPlayer = engine.players
        .filter(p => !p.isEliminated)
        .sort((a, b) => b.chips - a.chips)[0];

    return {
        winner: richestPlayer || null,
        rounds
    };
}

/**
 * 运行完整模拟
 */
async function runSimulation(numGames: number, sims: number): Promise<SimulationResult> {
    const result: SimulationResult = {
        normalWins: 0,
        superWins: 0,
        gamesPlayed: 0,
        normalChipsWon: 0,
        superChipsWon: 0,
        normalSurvivals: 0,
        superSurvivals: 0
    };

    console.log(`\n${'='.repeat(50)}`);
    console.log(` 普通电脑 vs 超级电脑 模拟测试`);
    console.log(` 普通电脑: ${NORMAL_PLAYER_IDS.length} 个`);
    console.log(` 超级电脑: ${SUPER_PLAYER_IDS.length} 个`);
    console.log(` 模拟场次: ${numGames} 场`);
    console.log(` AI配置:   ${sims} 次模拟/手 (加速模式)`);
    console.log(`${'='.repeat(50)}\n`);

    const startTime = Date.now();

    for (let i = 0; i < numGames; i++) {
        const engine = new MixedAIGameEngine(() => { });
        process.stdout.write(`[Game ${i + 1}] Running... `);

        const gameStart = Date.now();
        const { winner, rounds } = await runSingleGame(engine, 200, sims);
        const gameTime = ((Date.now() - gameStart) / 1000).toFixed(1);

        if (winner) {
            const winnerMode = engine.playerModes.get(winner.id);
            const winnerName = engine.players.find(p => p.id === winner.id)?.name;

            console.log(`Winner: ${winnerName} (${winnerMode}) - ${rounds} rounds - ${gameTime}s`);

            if (winnerMode === 'normal') {
                result.normalWins++;
            } else {
                result.superWins++;
            }

            // 统计存活情况
            engine.players.forEach(p => {
                if (!p.isEliminated) {
                    const mode = engine.playerModes.get(p.id);
                    if (mode === 'normal') {
                        result.normalSurvivals++;
                    } else {
                        result.superSurvivals++;
                    }
                }
            });

            // 统计筹码
            const normalChips = engine.players
                .filter(p => NORMAL_PLAYER_IDS.includes(p.id))
                .reduce((sum, p) => sum + p.chips, 0);
            const superChips = engine.players
                .filter(p => SUPER_PLAYER_IDS.includes(p.id))
                .reduce((sum, p) => sum + p.chips, 0);

            result.normalChipsWon += normalChips;
            result.superChipsWon += superChips;
        } else {
            console.log(`Draw/Timeout - ${rounds} rounds - ${gameTime}s`);
        }

        result.gamesPlayed++;
        // 清理
        engine.destroy();
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(`\n\n${'='.repeat(50)}`);
    console.log(` 统计结果`);
    console.log(`${'='.repeat(50)}`);
    console.log(` 总耗时:       ${elapsed} 秒`);
    console.log(` 总场次:       ${result.gamesPlayed}`);
    console.log(`${'─'.repeat(50)}`);
    console.log(` 普通电脑胜场: ${result.normalWins} (${(result.normalWins / result.gamesPlayed * 100).toFixed(1)}%)`);
    console.log(` 超级电脑胜场: ${result.superWins} (${(result.superWins / result.gamesPlayed * 100).toFixed(1)}%)`);
    console.log(`${'─'.repeat(50)}`);
    console.log(` 普通电脑平均剩余筹码: ${Math.round(result.normalChipsWon / result.gamesPlayed)}`);
    console.log(` 超级电脑平均剩余筹码: ${Math.round(result.superChipsWon / result.gamesPlayed)}`);
    console.log(`${'─'.repeat(50)}`);
    console.log(` 普通电脑平均存活人数: ${(result.normalSurvivals / result.gamesPlayed).toFixed(2)}`);
    console.log(` 超级电脑平均存活人数: ${(result.superSurvivals / result.gamesPlayed).toFixed(2)}`);
    console.log(`${'='.repeat(50)}`);

    // 胜率差异判断
    const normalWinRate = result.normalWins / result.gamesPlayed;
    const superWinRate = result.superWins / result.gamesPlayed;

    if (superWinRate > normalWinRate * 1.2) {
        const diffStr = normalWinRate > 0 
            ? `${((superWinRate / normalWinRate - 1) * 100).toFixed(0)}%`
            : '极高 (普通电脑胜场为 0)';
        console.log(`\n🏆 超级电脑明显更强! (比普通电脑高 ${diffStr})`);
    } else if (normalWinRate > superWinRate * 1.2) {
        const diffStr = superWinRate > 0 
            ? `${((normalWinRate / superWinRate - 1) * 100).toFixed(0)}%`
            : '极高 (超级电脑胜场为 0)';
        console.log(`\n⚠️ 普通电脑反而更强? (比超级电脑高 ${diffStr}) 可能需要检查超级AI逻辑`);
    } else {
        console.log(`\n📊 两者胜率接近，差异不明显`);
    }

    return result;
}

// 主函数
const args = process.argv.slice(2);
const numGamesArg = args.find(a => a.startsWith('--games='));
const numGames = numGamesArg ? parseInt(numGamesArg.split('=')[1]) : 50;

const simsArg = args.find(a => a.startsWith('--sims='));
const sims = simsArg ? parseInt(simsArg.split('=')[1]) : 1000;

runSimulation(numGames, sims).then(() => {
    console.log('\n✅ 模拟测试完成');
}).catch(e => {
    console.error('模拟测试出错:', e);
    process.exit(1);
});
