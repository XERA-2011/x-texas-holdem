
import { generateMatchReports, runDebugScenarios } from './test-utils';

console.log("正在执行德州扑克引擎随机测试...");
try {
    // 解析命令行参数
    const args = process.argv.slice(2);
    const modeArg = args.find(a => a.startsWith('--mode='));
    const mode = (modeArg ? modeArg.split('=')[1] : 'normal') as 'normal' | 'super';

    console.log(`Running simulation in ${mode} mode...`);

    const reports = generateMatchReports(10, mode);
    console.log("测试完成。生成报告如下：");
    console.log(JSON.stringify(reports, null, 2));

    // 简单的统计
    const invalidCount = reports.filter((r) => !r.valid).length;
    if (invalidCount > 0) {
        console.error(`\n警告: 发现了 ${invalidCount} 个无效的资金对局 (Pot != Payout)`);
    } else {
        console.log("\n所有 10 局测试资金结算平衡 (Valid).");
    }

    console.log("\n--------------------------------------------------");
    console.log("正在执行场景覆盖测试 (Scenario Tests)...");
    runDebugScenarios().then(() => {
        console.log("\n所有测试执行完毕。");
    });

} catch (e) {
    console.error("测试执行出错:", e);
}
