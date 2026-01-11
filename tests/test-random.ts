/**
 * 纯粹随机测试 (Pure Random Testing)
 * 
 * 运行完全随机的德州扑克对局，用于压力测试和发现潜在边缘情况。
 * 所有决策都基于随机数生成，不使用任何预设脚本。
 */

import { runRandomSimulations } from './utils';

const args = process.argv.slice(2);
const roundsArg = args.find(a => a.startsWith('--rounds='));
const rounds = roundsArg ? parseInt(roundsArg.split('=')[1], 10) : 10;

const modeArg = args.find(a => a.startsWith('--mode='));
const mode = (modeArg ? modeArg.split('=')[1] : 'normal') as 'normal' | 'super';

console.log("===========================================");
console.log("   纯粹随机测试 (Pure Random Simulation)   ");
console.log("===========================================");
console.log(`配置: ${rounds} 轮, 模式: ${mode}\n`);

runRandomSimulations(rounds, mode).then((logs) => {
    console.log("\n-------------------------------------------");
    console.log(`随机测试完成，共 ${rounds} 轮。`);
    console.log("-------------------------------------------");
}).catch((e) => {
    console.error("随机测试执行出错:", e);
    process.exit(1);
});
