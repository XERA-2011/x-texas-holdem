/**
 * 专用训练数据生成 (Training Data Generation)
 * 
 * 运行完全模拟的 AI 对战 (Super AI vs Super AI)，生成高质量的对局日志。
 * 目的：供大模型分析决策质量、胜率验证及发现潜在逻辑漏洞。
 * 
 * 配置：
 * - 8名玩家全部使用 Super AI
 * - 每次运行 10 局
 * - 详细的全量日志
 */

import { ScenarioTester } from './utils';
import { Player, GAME_RULES } from '../src/lib/poker-engine';

/**
 * 运行训练用对局
 * @param rounds 游戏轮数
 */
export async function runTrainingGames(rounds: number = 10): Promise<void> {
    const tester = new ScenarioTester();

    tester.log(`\n=== Starting Training Session (${rounds} Rounds) ===`);
    tester.log(`Mode: 8 x Super AI (Self-Play)`);
    tester.log(`Timestamp: ${new Date().toISOString()}`);

    try {
        for (let i = 0; i < rounds; i++) {
            tester.log(`\n-----------------------------------`);
            tester.log(` GAME ${i + 1} / ${rounds}`);
            tester.log(`-----------------------------------`);

            tester.reset();
            await runFullAiGame(tester);
        }

        tester.log(`\n=== Training Session Completed ===`);

    } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        tester.log(`CRITICAL ERROR: ${errorMessage}`);
        throw e;
    }
}

/**
 * 运行一局完整的 AI 对战
 */
async function runFullAiGame(tester: ScenarioTester) {
    const engine = tester.engine;

    // Ensure Super AI Mode
    tester.setAIMode('super');

    const startChips = new Map<string, number>();
    engine.players.forEach(p => startChips.set(p.name, p.chips));

    // Log Initial Setups (Dealer, Blinds, Hands)
    const dealer = engine.players[engine.dealerIdx];
    const sb = engine.players[(engine.dealerIdx + 1) % engine.players.length];
    const bb = engine.players[(engine.dealerIdx + 2) % engine.players.length];

    // Use GAME_RULES for constants if available, or fallback to engine property
    const smallBlind = GAME_RULES ? GAME_RULES.SMALL_BLIND : (engine.bigBlind / 2);

    tester.log(`Dealer: ${dealer.name} | SB: ${sb.name} (${smallBlind}) | BB: ${bb.name} (${engine.bigBlind})`);

    // Log Hole Cards (God View for Training)
    const handsLog = engine.players
        .filter(p => !p.isEliminated)
        .map(p => `${p.name}:[${p.hand.join(' ')}]`)
        .join('  ');
    tester.log(`Hole Cards: ${handsLog}`);

    let steps = 0;
    const MAX_STEPS = 100; // 防止死循环

    // Game Loop
    while (engine.stage !== 'showdown' && engine.winners.length === 0 && steps < MAX_STEPS) {
        const currentPlayer = engine.players[engine.currentTurnIdx];
        const activeCount = engine.players.filter(p => !p.isEliminated && p.status !== 'folded').length;

        if (activeCount <= 1) break; // Winner determined

        if (currentPlayer.status !== 'active') {
            break;
        }

        const originalAI = (engine as any)._originalAiAction;
        if (originalAI) {
            await executeTurnWithSuperAI(tester, currentPlayer);
        } else {
            tester.log("Error: AI Action not available");
            break;
        }

        steps++;
        await new Promise(r => setTimeout(r, 0)); // Yield
    }

    // Game Over Log
    if (engine.stage === 'showdown' || engine.winners.length > 0) {
        const board = engine.communityCards.map(c => c.toString()).join(" ");
        tester.log(`\n[Result] Board: [ ${board} ]`);

        // Log Winners Explicitly
        if (engine.winners.length > 0) {
            const winnerNames = engine.winners.map(id => engine.players.find(p => p.id === id)?.name).join(", ");
            tester.log(`Winners: ${winnerNames}`);
        }

        // Detailed Chip Changes and Winners
        tester.log(`Chip Changes:`);
        engine.players.forEach(p => {
            const start = startChips.get(p.name) || 0;
            const end = p.chips;
            const diff = end - start;
            const sign = diff >= 0 ? '+' : '';
            if (diff !== 0) {
                const handDesc = p.handDescription ? ` - ${p.handDescription}` : '';
                tester.log(`  ${p.name}: ${sign}${diff}${handDesc}`);
            }
        });
    }
}

/**
 * 模拟单步 AI 决策并执行
 */
async function executeTurnWithSuperAI(tester: ScenarioTester, player: Player) {
    const engine = tester.engine;
    const oldStage = engine.stage;
    const prevBet = player.currentBet;
    const previousHighestBet = engine.highestBet; // Capture state BEFORE action

    // Use Engine's internal AI logic retrieval
    const runAI = (engine as any)._originalAiAction;
    if (runAI) {
        // Mock setTimeout to force synchronous execution for AI logic
        const originalTimeout = global.setTimeout;
        // @ts-ignore
        global.setTimeout = (fn: any, ms: any) => fn();

        try {
            runAI.call(engine, player);
        } finally {
            global.setTimeout = originalTimeout;
        }
    }

    // Capture Action Log
    const amount = player.currentBet;
    let actionType = 'call';
    let actionDesc = '';

    if (player.status === 'folded') {
        actionType = 'fold';
    } else if (player.status === 'allin') {
        actionType = 'allin';
        actionDesc = `(Total ${amount})`;
    } else {
        // Logic to determine Raise vs Call
        // If my new bet is STRICTLY GREATER than the previous highest bet on the table, I raised.
        // Note: previousHighestBet includes the big blind, etc.

        if (amount > previousHighestBet) {
            actionType = 'raise';
            actionDesc = `(to ${amount})`;
        } else {
            // Amount <= previousHighestBet
            // Usually Amount == previousHighestBet for a call.
            if (amount === 0 && previousHighestBet === 0) {
                actionType = 'check';
            } else {
                actionType = 'call';
                actionDesc = `(${amount})`;
            }
        }
    }

    const actionLog = `> ${player.name}: ${actionType} ${actionDesc}`;
    tester.log(actionLog);

    // Check if stage changed
    if (engine.stage !== oldStage) {
        const board = engine.communityCards.map(c => c.toString()).join(" ");
        tester.log(`--- Stage: ${engine.stage.toUpperCase()} [ ${board} ] Pot: ${engine.pot} ---`);
    }
}


// --- CLI Execution ---
const args = process.argv.slice(2);
const rounds = args.length > 0 ? parseInt(args[0], 10) : 10;

runTrainingGames(rounds).then(() => {
    // console.log("Done.");
}).catch(e => {
    console.error(e);
    process.exit(1);
});
