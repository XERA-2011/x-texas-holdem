import { Card } from '../src/lib/poker/card';
import { calculateWinRateMonteCarlo, getPreflopStrength } from '../src/lib/poker/monte-carlo';

/**
 * 胜率计算测试器
 * 用于验证蒙特卡洛模拟 (Monte Carlo) 的准确性
 */

interface TestResult {
    name: string;
    passed: boolean;
    winRate: number;
    expected: { min: number; max: number };
    time: number;
}

const results: TestResult[] = [];

// 辅助：解析手牌字符串 ("Ah Kd") => Card[]
function parseHand(str: string): Card[] {
    const parts = str.trim().split(/\s+/);
    return parts.map(s => Card.fromString(s));
}

// 辅助：运行单个测试用例
function runTestCase(
    title: string,
    playerHandStr: string,
    communityCardsStr: string,
    opponentsCount: number,
    expectedRange: { min: number; max: number },
    sims: number = 3000
): TestResult {
    console.log(`\n=== Testing: ${title} ===`);
    console.log(`Player Hand: ${playerHandStr}`);
    console.log(`Board:       ${communityCardsStr || '(Preflop)'}`);
    console.log(`Opponents:   ${opponentsCount}`);

    const hand = parseHand(playerHandStr);
    const board = communityCardsStr ? parseHand(communityCardsStr) : [];

    const startTime = Date.now();

    // 如果是翻前，额外显示查表胜率作为参考
    if (board.length === 0) {
        const lookup = getPreflopStrength(hand, opponentsCount);
        console.log(`Lookup Est.: ${(lookup * 100).toFixed(2)}%`);
    }

    // 运行蒙特卡洛
    const winRate = calculateWinRateMonteCarlo(hand, board, opponentsCount, sims);
    const elapsed = Date.now() - startTime;

    console.log(`Monte Carlo: ${(winRate * 100).toFixed(2)}%`);
    console.log(`Expected:    ${(expectedRange.min * 100).toFixed(0)}% - ${(expectedRange.max * 100).toFixed(0)}%`);
    console.log(`Time:        ${elapsed}ms (${sims} sims)`);

    const passed = winRate >= expectedRange.min && winRate <= expectedRange.max;
    if (passed) {
        console.log(`Result:      ✅ PASSED`);
    } else {
        console.log(`Result:      ❌ FAILED`);
    }

    const result: TestResult = {
        name: title,
        passed,
        winRate,
        expected: expectedRange,
        time: elapsed
    };
    results.push(result);
    return result;
}

// 主函数
function main() {
    const args = process.argv.slice(2);

    let handArg: string | null = null;
    let boardArg: string = "";
    let opponentsArg: number = 1;

    args.forEach(arg => {
        if (arg.startsWith('--hand=')) handArg = arg.split('=')[1];
        if (arg.startsWith('--board=')) boardArg = arg.split('=')[1];
        if (arg.startsWith('--opponents=')) opponentsArg = parseInt(arg.split('=')[1]) || 1;
    });

    if (handArg) {
        // 自定义单次测试
        runTestCase("Custom Test", handArg, boardArg, opponentsArg, { min: 0, max: 1 }, 5000);
    } else {
        // 运行默认测试集
        console.log("Running Default Win Rate Scenarios...\n");

        // ============ 翻前测试 (Preflop) ============

        // 1. AA - 最强起手牌 (单挑)
        runTestCase("AA vs 1 Opponent", "Ah As", "", 1, { min: 0.80, max: 0.90 });

        // 2. AA - 多人底池
        runTestCase("AA vs 3 Opponents", "Ah As", "", 3, { min: 0.60, max: 0.75 });

        // 3. 72o - 最弱起手牌
        runTestCase("72o (Worst Hand)", "7h 2d", "", 1, { min: 0.28, max: 0.42 });

        // 4. AKs - 大牌同花
        runTestCase("AKs (Big Slick)", "Ah Kh", "", 1, { min: 0.63, max: 0.72 });

        // 5. 小对子多人底池
        runTestCase("22 vs 5 Opponents", "2h 2d", "", 5, { min: 0.15, max: 0.35 });

        // ============ 翻牌测试 (Flop) ============

        // 6. 暗三条 - 应该很强
        runTestCase("Flopped Set", "8h 8c", "Ks 8s 2c", 1, { min: 0.90, max: 1.00 });

        // 7. 坚果同花听牌 + 两端顺子听牌 (Monster Draw)
        runTestCase("Monster Draw", "Js Ts", "9s 8s 2d", 1, { min: 0.55, max: 0.75 });

        // 8. 顶对顶踢脚
        runTestCase("Top Pair Top Kicker", "Ah Kd", "As 7c 2h", 1, { min: 0.85, max: 0.98 });

        // 9. 超对
        runTestCase("Overpair (QQ on low board)", "Qh Qd", "9s 5c 2h", 1, { min: 0.78, max: 0.92 });

        // ============ 转牌测试 (Turn) ============

        // 10. 同花听牌 (9 outs) - 但还有 A 高牌价值
        runTestCase("Flush Draw on Turn", "Ah 5h", "Kh 9h 3c 7d", 1, { min: 0.45, max: 0.60 });

        // 11. 两端顺子听牌 (8 outs) - 但还有后门听牌和高牌价值
        runTestCase("OESD on Turn", "Jc Td", "9s 8h 2c 3d", 1, { min: 0.32, max: 0.48 });

        // ============ 河牌测试 (River) ============

        // 12. 坚果同花 - 必赢 (无对子牌面)
        runTestCase("River Nut Flush", "Ah Kh", "Qh Jh 3h 8c 2d", 1, { min: 0.99, max: 1.00 });

        // 13. 坚果顺子 - 无同花可能
        runTestCase("River Nut Straight", "Ac Kd", "Qh Js Th 2c 5d", 1, { min: 0.99, max: 1.00 });

        // 14. 第二坚果同花 - 只有 A 同花能击败
        runTestCase("Second Nut Flush", "Kh Qh", "Jh 9h 3h 8c 2d", 1, { min: 0.95, max: 1.00 });

        // ============ 总结 ============
        console.log("\n==========================================");
        console.log("           TEST SUMMARY");
        console.log("==========================================");

        const passed = results.filter(r => r.passed).length;
        const failed = results.filter(r => !r.passed).length;
        const totalTime = results.reduce((sum, r) => sum + r.time, 0);

        console.log(`Total Tests: ${results.length}`);
        console.log(`Passed:      ${passed} ✅`);
        console.log(`Failed:      ${failed} ❌`);
        console.log(`Total Time:  ${totalTime}ms`);
        console.log("==========================================");

        if (failed > 0) {
            console.log("\nFailed Tests:");
            results.filter(r => !r.passed).forEach(r => {
                console.log(`  ❌ ${r.name}: ${(r.winRate * 100).toFixed(2)}% (expected ${(r.expected.min * 100).toFixed(0)}-${(r.expected.max * 100).toFixed(0)}%)`);
            });
            process.exit(1);
        } else {
            console.log("\n✅ All Win Rate Tests Passed!");
        }
    }
}

main();
