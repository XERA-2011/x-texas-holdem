/**
 * 纯粹随机测试 (Pure Random Testing)
 * 
 * 运行完全随机的德州扑克对局，用于压力测试和发现潜在边缘情况。
 * 所有决策都基于随机数生成，不使用任何预设脚本或 AI。
 */

import { ScenarioTester } from './utils';

/**
 * 运行指定轮数的随机游戏模拟
 * @param rounds 模拟轮数
 */
export async function runRandomSimulations(rounds: number = 10): Promise<string[]> {
    const tester = new ScenarioTester();
    tester.log(`Starting Random Simulations (${rounds} rounds)...`);

    try {
        for (let i = 0; i < rounds; i++) {
            tester.log(`Random Round ${i + 1} / ${rounds}`);
            await tester.runRandomGame();
        }
        tester.log("Random Simulations Completed.");
    } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        tester.log(`ERROR: ${errorMessage}`);
        throw e;
    }

    return tester.logs;
}


const args = process.argv.slice(2);
const roundsArg = args.find(a => a.startsWith('--rounds='));
const rounds = roundsArg ? parseInt(roundsArg.split('=')[1], 10) : 10;

console.log("===========================================");
console.log("   纯粹随机测试 (Pure Random Simulation)   ");
console.log("===========================================");
console.log(`配置: ${rounds} 轮\n`);

runRandomSimulations(rounds).then(() => {
    console.log("\n-------------------------------------------");
    console.log(`随机测试完成，共 ${rounds} 轮。`);
    console.log("-------------------------------------------");
}).catch((e) => {
    console.error("随机测试执行出错:", e);
    process.exit(1);
});
