
import { Card } from '../src/lib/poker/card';
import { calculateWinRateMonteCarlo, getPreflopStrength, getHandKey } from '../src/lib/poker/monte-carlo';

/**
 * 胜率计算测试器
 * 用于验证蒙特卡洛模拟 (Monte Carlo) 的准确性
 */

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
    sims: number = 3000
) {
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
    console.log(`Time:        ${elapsed}ms (${sims} sims)`);

    return winRate;
}

// 主函数
async function main() {
    const args = process.argv.slice(2);
    // 简单的参数解析 --hand="Ah Kh" --board="Ts 9s 2c"

    let handArg: string | null = null;
    let boardArg: string = "";

    args.forEach(arg => {
        if (arg.startsWith('--hand=')) handArg = arg.split('=')[1];
        if (arg.startsWith('--board=')) boardArg = arg.split('=')[1];
    });

    if (handArg) {
        // 自定义单次测试
        runTestCase("Custom Test", handArg, boardArg, 1, 5000);
    } else {
        // 运行默认测试集
        console.log("Running Default Win Rate Scenarios...\n");

        // 1. AA Preflop (The best hand)
        const r1 = runTestCase("Pocket Aces (AA)", "Ah As", "", 1);
        if (r1 < 0.75 || r1 > 0.90) console.warn("WARNING: AA winrate seems off!");

        // 2. 72o Preflop (The worst hand)
        const r2 = runTestCase("The Hammer (72o)", "7h 2d", "", 1);
        if (r2 > 0.40) console.warn("WARNING: 72o winrate seems too high!");

        // 3. AKs Preflop
        runTestCase("Big Slick Suited (AKs)", "Ah Kh", "", 1);

        // 4. Set Mining (Flop hit set)
        // Hand: 88, Board: 8s Ks 2c (Top set vs randomness)
        const r4 = runTestCase("Flop Set (88 on K-8-2)", "8h 8c", "Ks 8s 2c", 1);
        if (r4 < 0.85) console.warn("WARNING: Flop Set winrate seems too low!");

        // 5. Open Ended Straight Draw + Flush Draw
        // Hand: JTs, Board: 9s 8s 2d (Open ended straight draw + backdoor flush?) 
        // Let's do a massive draw: Js Ts on 9s 8s 2d
        runTestCase("Monster Draw (JsTs on 9s8s2d)", "Js Ts", "9s 8s 2d", 1);

        // 6. River Nut Flush (Should be 100% - No board pair to avoid Full House/Quads randomness)
        // Hand: Ah Kh, Board: Qh Jh 3h 8c 2d (No pairs on board)
        const r6 = runTestCase("River Nut Flush", "Ah Kh", "Qh Jh 3h 8c 2d", 1);
        if (Math.abs(r6 - 1.0) > 0.00) console.error("ERROR: Nut flush should win 100%!");

        console.log("\n✅ Win Rate Tests Completed.");
    }
}

main();
