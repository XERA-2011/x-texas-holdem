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
import { Player, GAME_RULES, PokerGameEngine } from '../src/lib/poker-engine';

interface TestEngine extends PokerGameEngine {
    _originalAiAction?: (player: Player) => void;
}

interface PlayerStats {
    name: string;
    handsPlayed: number;
    vpipCount: number;
    pfrCount: number;
    wins: number;
    chipsDelta: number;
}

/**
 * 运行训练用对局
 * @param rounds 游戏轮数
 */
export async function runTrainingGames(rounds: number = 10): Promise<void> {
    const tester = new ScenarioTester();

    tester.log(`\n=== Starting Training Session (${rounds} Rounds) ===`);
    tester.log(`Mode: 8 x Super AI (Self-Play)`);
    tester.log(`Timestamp: ${new Date().toISOString()}`);

    // Initialize stats
    const statsMap = new Map<string, PlayerStats>();

    try {
        for (let i = 0; i < rounds; i++) {
            tester.log(`\n-----------------------------------`);
            tester.log(` GAME ${i + 1} / ${rounds}`);
            tester.log(`-----------------------------------`);

            tester.reset();

            // Ensure stats entries exist
            tester.engine.players.forEach(p => {
                if (!statsMap.has(p.name)) {
                    statsMap.set(p.name, {
                        name: p.name,
                        handsPlayed: 0,
                        vpipCount: 0,
                        pfrCount: 0,
                        wins: 0,
                        chipsDelta: 0
                    });
                }
            });

            await runFullAiGame(tester, statsMap);
        }

        tester.log(`\n=== Training Session Completed ===`);

        // Output JSON Stats
        const report = Array.from(statsMap.values()).map(s => ({
            ...s,
            vpip: s.handsPlayed > 0 ? (s.vpipCount / s.handsPlayed).toFixed(2) : "0.00",
            pfr: s.handsPlayed > 0 ? (s.pfrCount / s.handsPlayed).toFixed(2) : "0.00",
            winRate: s.handsPlayed > 0 ? (s.wins / s.handsPlayed).toFixed(2) : "0.00"
        }));

        console.log("\n[STATS_JSON_START]");
        console.log(JSON.stringify(report, null, 2));
        console.log("[STATS_JSON_END]");

    } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        tester.log(`CRITICAL ERROR: ${errorMessage}`);
        throw e;
    }
}

/**
 * 运行一局完整的 AI 对战
 */
async function runFullAiGame(tester: ScenarioTester, statsMap: Map<string, PlayerStats>) {
    const engine = tester.engine;

    // Ensure Super AI Mode
    tester.setAIMode('super');
    (engine as unknown as { processTurn: () => void }).processTurn = () => { };
    (engine as unknown as { speakRandom: () => void }).speakRandom = () => { };

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

    // Track VPIP/PFR for this hand
    const playerActions = new Map<string, Set<string>>(); // player -> Set<'vpip' | 'pfr'>

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

        const originalAI = (engine as TestEngine)._originalAiAction;
        if (originalAI) {
            await executeTurnWithSuperAI(tester, currentPlayer, playerActions);
        } else {
            tester.log("Error: AI Action not available");
            break;
        }

        steps++;
    }

    // Update Stats at end of game
    engine.players.forEach(p => {
        const stats = statsMap.get(p.name);
        if (stats && !p.isEliminated) { // Only count if player was in the hand (not eliminated before)
            // Simplified: Assume all non-eliminated players "played" the hand if they were dealt cards
            // Correct logic: Everyone dealt cards increments handsPlayed
            stats.handsPlayed++;

            const actions = playerActions.get(p.name);
            if (actions) {
                if (actions.has('vpip')) stats.vpipCount++;
                if (actions.has('pfr')) stats.pfrCount++;
            }
        }
    });

    // Game Over Log
    if (engine.stage === 'showdown' || engine.winners.length > 0) {
        const board = engine.communityCards.map(c => c.toString()).join(" ");
        tester.log(`\n[Result] Board: [ ${board} ]`);

        // Log Winners Explicitly
        if (engine.winners.length > 0) {
            const winnerNames = engine.winners.map(id => engine.players.find(p => p.id === id)?.name).join(", ");
            tester.log(`Winners: ${winnerNames}`);

            // Update Win Stats
            engine.winners.forEach(id => {
                const winner = engine.players.find(p => p.id === id);
                if (winner) {
                    const s = statsMap.get(winner.name);
                    if (s) s.wins++;
                }
            });
        }

        // Detailed Chip Changes and Winners
        tester.log(`Chip Changes:`);
        engine.players.forEach(p => {
            const start = startChips.get(p.name) || 0;
            const end = p.chips;
            const diff = end - start;

            // Update Chip Stats
            const s = statsMap.get(p.name);
            if (s) s.chipsDelta += diff;

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
async function executeTurnWithSuperAI(
    tester: ScenarioTester,
    player: Player,
    playerActions: Map<string, Set<string>>
) {
    const engine = tester.engine;
    const oldStage = engine.stage;
    const previousHighestBet = engine.highestBet;
    const previousCurrentBet = player.currentBet;
    const previousTotalHandBet = player.totalHandBet;
    const previousStatus = player.status;

    // Use Engine's internal AI logic retrieval
    const runAI = (engine as TestEngine)._originalAiAction;
    if (runAI) {
        runAI.call(engine, player);
    }

    // Capture Action Log & Update Stats
    const contributed = player.totalHandBet - previousTotalHandBet;
    const callAmtBefore = previousHighestBet - previousCurrentBet;

    let actionType = 'call';
    let actionDesc = '';

    // Initialize actions set for player if not exists
    if (!playerActions.has(player.name)) {
        playerActions.set(player.name, new Set());
    }
    const actions = playerActions.get(player.name)!;

    if (player.status === 'folded' && previousStatus !== 'folded') {
        actionType = 'fold';
    } else if (player.status === 'allin') {
        actionType = 'allin';
        actionDesc = `(Total ${previousCurrentBet + Math.max(0, contributed)})`;
        if (oldStage === 'preflop' && contributed > 0) actions.add('vpip');
        if (oldStage === 'preflop' && contributed > callAmtBefore) actions.add('pfr');
    } else {
        if (contributed === 0 && callAmtBefore === 0) {
            actionType = 'check';
        } else if (contributed > callAmtBefore) {
            actionType = 'raise';
            actionDesc = `(to ${previousCurrentBet + contributed})`;
            if (oldStage === 'preflop' && contributed > 0) actions.add('vpip');
            if (oldStage === 'preflop') actions.add('pfr');
        } else {
            actionType = 'call';
            actionDesc = `(${contributed})`;
            if (oldStage === 'preflop' && contributed > 0) actions.add('vpip');
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
const args = process.argv.slice(2).filter(a => a !== '--');
const roundsArg = args.find(a => /^\d+$/.test(a));
const rounds = roundsArg ? parseInt(roundsArg, 10) : 10;

runTrainingGames(rounds).then(() => {
    // console.log("Done.");
}).catch(e => {
    console.error(e);
    process.exit(1);
});
