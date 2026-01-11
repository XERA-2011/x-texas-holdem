/**
 * 纯粹预设场景测试 (Pure Scenario Testing)
 * 
 * 运行预定义的德州扑克场景，用于验证特定边界情况和游戏规则。
 * 所有测试都使用固定的脚本和预设牌面，结果可重现。
 */

import { runScenarioTests } from './utils';

console.log("===========================================");
console.log("   纯粹场景测试 (Pure Scenario Testing)    ");
console.log("===========================================\n");

runScenarioTests().then((logs) => {
    console.log("\n-------------------------------------------");
    console.log("场景测试完成。");
    console.log("-------------------------------------------");
}).catch((e) => {
    console.error("场景测试执行出错:", e);
    process.exit(1);
});
