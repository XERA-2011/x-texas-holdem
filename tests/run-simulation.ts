
import { runDebugScenarios } from './test-utils';

console.log("正在执行德州扑克引擎随机测试...");
try {
    // 解析命令行参数
    const args = process.argv.slice(2);
    const modeArg = args.find(a => a.startsWith('--mode='));
    const mode = (modeArg ? modeArg.split('=')[1] : 'normal') as 'normal' | 'super';

    console.log(`Running simulation in ${mode} mode...`);

    console.log("正在执行场景覆盖测试 (Scenario Tests)...");
    runDebugScenarios().then(() => {
        console.log("\n所有测试执行完毕。");
    });

} catch (e) {
    console.error("测试执行出错:", e);
}
