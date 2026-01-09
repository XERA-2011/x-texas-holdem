
import { ScenarioTester } from './test-utils';
import { GAME_RULES } from '../src/lib/poker/constants';

// 模拟一局游戏内的所有行动 (从 Preflop 到 Showdown)
async function runHand(tester: ScenarioTester) {
    const engine = tester.engine;

    // 强制开始下一局: 发牌、下盲注
    engine.startNextRound();

    let steps = 0;
    const maxSteps = 1000; // 防止单局死循环保险

    // 循环直到本局结束 (Showdown 或 只剩一人)
    while (engine.stage !== 'showdown' && engine.winners.length === 0 && steps < maxSteps) {
        // 检查活跃玩家数
        const active = engine.players.filter(p => !p.isEliminated && p.status !== 'folded');
        // 如果只剩一人，引擎通常会自动处理 handleFoldWin，但我们需要确保循环即使终止
        if (active.length <= 1) break;

        // 获取当前行动玩家
        const currentPlayer = engine.players[engine.currentTurnIdx];

        // 如果当前没有合法的行动玩家（可能引擎正在处理转阶段），跳出等待下一轮循环
        if (!currentPlayer || currentPlayer.status !== 'active') {
            break;
        }

        // 如果是 Bot，使用 AI 决策
        // 注意：Super AI 计算较慢，因此这模拟会比较耗时
        if (!currentPlayer.isHuman) {
            // 减少模拟次数以加快大局数测试速度 (默认 3000 -> 500)
            engine.superAIConfig.monteCarloSims = 500;
            engine.superAIConfig.opponentModeling = false; // 关闭以提升速度

            // 同步执行 AI 决策 (原方法可能是异步或包含 setTimeout，这里我们直接调用逻辑核心如果有的话，但目前 engine.aiAction 是 void 且内部有 try-catch)
            // 由于 engine.aiAction 内部没有 await，我们可以直接调用。
            // 但是要注意 engine.aiAction 可能会触发异步的 speak/setTimeout。
            // 在测试模式下 (testMode=true)，我们需要确保逻辑同步或正确等待。

            // 为了简化，我们直接调用 aiAction，由于是同步计算 (除了 random delay)，
            // 我们之前设置了 engine.testMode = true，理论上应该尽量少 delay。
            // 但 engine.aiAction 仍然是设计为给 UI 用的。

            // 更稳健的方式：直接调用内部决策函数，然后手动应用 action
            // 但为了完全模拟 AI 行为，我们还是复用 engine.aiAction
            engine.aiAction(currentPlayer);

            // AI Action 完成后会调用 handleAction -> finishTurn -> (setTimeout processTurn)
            // 在 runHand 循环里，检测 currentPlayer.hasActed 或 turnIdx 变化
            // 但由于 aiAction 里的 setTimeout，我们需要等待一下
            await new Promise(r => setTimeout(r, 0));
        } else {
            // Human (You) - 这里为了全自动测试，也让 Human 使用 Super AI 托管，或者保持随机
            // 既然是测试 "超级电脑模式"，不如让所有人都变成 Super AI
            engine.superAIConfig.monteCarloSims = 500;
            engine.aiAction(currentPlayer);
            await new Promise(r => setTimeout(r, 0));
        }

        steps++;
    }
}


async function runSingleGame(simIndex: number): Promise<number> {
    const tester = new ScenarioTester();
    const engine = tester.engine;

    // 初始化
    engine.resetGame();
    engine.testMode = true;
    engine.setAIMode('super'); // 开启超级电脑

    let totalRounds = 0;
    const maxRounds = 10000;

    while (totalRounds < maxRounds) {
        const survivors = engine.players.filter(p => !p.isEliminated);

        if (survivors.length <= 1) {
            return totalRounds;
        }

        // 涨盲
        if (totalRounds > 0 && totalRounds % 50 === 0) {
            engine.bigBlind *= 2;
        }

        await runHand(tester);
        totalRounds++;
    }
    return maxRounds;
}

async function main() {
    const TOTAL_SIMULATIONS = 100;
    console.log("==========================================");
    console.log(` 德州扑克局数统计 (模拟 ${TOTAL_SIMULATIONS} 场)`);
    console.log(` 模式: Winner Takes All | AI: Super Computer`);
    console.log("==========================================");

    const results: number[] = [];
    const startTime = Date.now();

    for (let i = 0; i < TOTAL_SIMULATIONS; i++) {
        process.stdout.write(`\r正在进行第 ${i + 1}/${TOTAL_SIMULATIONS} 场模拟...`);
        const rounds = await runSingleGame(i);
        results.push(rounds);
    }
    process.stdout.write('\n');

    const endTime = Date.now();
    const totalTime = (endTime - startTime) / 1000;

    // 统计分析
    const avg = results.reduce((a, b) => a + b, 0) / results.length;
    const min = Math.min(...results);
    const max = Math.max(...results);
    const sorted = [...results].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];

    console.log("\n==========================================");
    console.log(" 统计结果");
    console.log("==========================================");
    console.log(` 总耗时: ${totalTime.toFixed(2)} 秒`);
    console.log(` 平均局数: ${avg.toFixed(1)}`);
    console.log(` 中位数局数: ${median}`);
    console.log(` 最少局数: ${min}`);
    console.log(` 最多局数: ${max}`);
    console.log("==========================================");
}


main().catch(err => console.error("模拟运行出错:", err));
