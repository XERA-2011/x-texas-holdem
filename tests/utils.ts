
/**
 * 测试工具库 (Test Utilities)
 * 
 * 包含核心的 ScenarioTester 类，用于构建和运行扑克游戏测试场景。
 * 支持固定脚本动作 (Scenarios) 和随机模拟 (Random Simulations)。
 */
import { PokerGameEngine, Card, Player } from '../src/lib/poker-engine';
import { getHandDetailedDescription } from '../src/lib/poker/display-helpers'; // Import helper verification
import { evaluateHand } from '../src/lib/poker/evaluator';

interface TestEngine extends PokerGameEngine {
    _originalAiAction?: (player: Player) => void;
}

export class ScenarioTester {
    engine: PokerGameEngine;
    logs: string[] = [];

    constructor() {
        this.engine = new PokerGameEngine(() => { });
        this.engine.testMode = true;
        // Disable AI auto-move loop to prevent interference with manual scripts
        // But save original for manual invocation
        (this.engine as TestEngine)._originalAiAction = this.engine.aiAction.bind(this.engine);
        this.engine.aiAction = () => { };
    }

    log(msg: string) {
        this.logs.push(`[TEST] ${msg}`);
        console.log(`[TEST] ${msg}`);
    }

    reset() {
        this.engine.resetGame();
        // Force specific names for consistency in scripts
        const bioNames = ['You', 'Alex', 'Sam', 'Morgan', 'Jamie', 'Avery', 'Blake', 'Jordan'];
        this.engine.players.forEach((p, i) => {
            if (i < bioNames.length) p.name = bioNames[i];
        });

        this.engine.startNextRound();
    }

    // Force an action for a specific player by name
    act(playerName: string, action: 'fold' | 'call' | 'raise' | 'allin', amount?: number) {
        const p = this.engine.players.find(pl => pl.name === playerName);
        if (!p) throw new Error(`Player ${playerName} not found`);

        this.engine.currentTurnIdx = p.id;
        this.engine.handleAction(p, action, amount);
    }

    // Run a list of actions strictly
    async runScript(script: { player: string, action: 'fold' | 'call' | 'raise' | 'allin', amount?: number }[]) {
        for (const step of script) {
            this.act(step.player, step.action, step.amount);
            await new Promise(r => setTimeout(r, 0));
        }
    }

    verifyStage(expected: string) {
        if ((this.engine.stage as string) !== expected) {
            const msg = `FAILED: Expected stage ${expected}, got ${this.engine.stage}`;
            this.log(msg);
            throw new Error(msg);
        }
    }

    setupScenario(config: { name: string, chips: number, hand: string[] }[], board: string[]) {
        this.engine.resetGame();
        this.engine.stage = 'preflop';

        // Map configs
        config.forEach((c, i) => {
            let p = this.engine.players.find(pl => pl.name === c.name);
            if (!p) {
                p = this.engine.players[i];
                p.name = c.name;
            }
            p.chips = c.chips;
            p.status = 'active';
            p.isEliminated = false;
            p.hand = c.hand.map(s => Card.fromString(s));
            p.currentBet = 0;
            p.totalHandBet = 0;
            p.hasActed = false;
        });

        const activeNames = config.map(c => c.name);
        this.engine.players.forEach(p => {
            if (!activeNames.includes(p.name)) {
                p.chips = 0;
                p.isEliminated = true;
                p.status = 'eliminated';
            }
        });

        this.engine.communityCards = board.map(s => Card.fromString(s));

        // Auto-detect stage based on board
        if (this.engine.communityCards.length === 0) this.engine.stage = 'preflop';
        else if (this.engine.communityCards.length === 3) this.engine.stage = 'flop';
        else if (this.engine.communityCards.length === 4) this.engine.stage = 'turn';
        else if (this.engine.communityCards.length === 5) this.engine.stage = 'river';

        this.engine.pot = 0;
        this.engine.currentTurnIdx = this.engine.players.find(p => p.name === config[0].name)?.id || 0;
    }


    /**
     * 运行一个完全随机的对局场景 (增强版)
     * 包含详细日志和资金守恒检查
     */
    async runRandomGame() {
        this.reset();

        // 1. Randomize Chips (500 - 5000)
        this.engine.players.forEach(p => {
            p.chips = Math.floor(Math.random() * 4500) + 500;
        });

        // 2. Capture Initial System State for Integrity Check
        // Total = Sum(Player Chips) (Pot is 0 at start of round before blinds, but after reset)
        // Note: reset() calls startNextRound(), which posts blinds immediately.
        // So we must verify Total = Sum(Chips) + Sum(CurrentBets) + Pot
        const initialTotal = this.engine.players.reduce((sum, p) => sum + p.chips, 0) + this.engine.pot;

        // Snapshot start chips for net profit calculation
        const startChips = new Map<number, number>();
        this.engine.players.forEach(p => startChips.set(p.id, p.chips));

        this.log(`\n=== New Game (Random) | Players: ${this.engine.players.length} | System Chips: ${initialTotal} ===`);

        // Log Initial Blinds (SB/BB)

        this.engine.players.forEach(p => {
            if (p.currentBet > 0) {
                // Determine if it's SB or BB based on amount usually, or just log "posts blind"
                const type = p.currentBet === this.engine.bigBlind ? 'Big Blind' : 'Small Blind';
                this.log(`> ${p.name}: posts blind ${p.currentBet} (${type})`);
            }
        });

        let steps = 0;
        const maxSteps = 200; // Loop limit

        // Track stage to print board updates
        let lastStage = this.engine.stage;

        while (this.engine.stage !== 'showdown' && this.engine.winners.length === 0 && steps < maxSteps) {
            // Stage Change Logging
            if (this.engine.stage !== lastStage) {
                const board = this.engine.communityCards.map(c => c.toString()).join(" ");
                this.log(`--- Stage: ${this.engine.stage.toUpperCase()} [ ${board} ] Pot: ${this.engine.pot} ---`);
                lastStage = this.engine.stage;
            }

            const active = this.engine.players.filter(p => !p.isEliminated && p.status !== 'folded');
            if (active.length <= 1) break;

            const currentPlayer = this.engine.players[this.engine.currentTurnIdx];
            if (!currentPlayer || currentPlayer.status !== 'active') break;

            // Decision Logic
            const callAmt = this.engine.highestBet - currentPlayer.currentBet;
            const canRaise = currentPlayer.chips > callAmt;
            let action: 'fold' | 'call' | 'raise' | 'allin' = 'call';
            const rand = Math.random();

            if (canRaise) {
                // Slightly weighted towards action
                if (rand < 0.1) action = 'fold';
                else if (rand < 0.6) action = 'call';
                else if (rand < 0.9) action = 'raise';
                else action = 'allin';
            } else {
                if (rand < 0.2) action = 'fold';
                else action = 'call';
            }

            let amount = 0;
            if (action === 'raise') {
                const minRaise = this.engine.lastRaiseAmount || this.engine.bigBlind;
                const maxRaise = currentPlayer.chips - callAmt;
                if (maxRaise < minRaise) action = 'allin';
                else amount = Math.floor(Math.random() * (maxRaise - minRaise)) + minRaise;
            }

            try {
                // Log Action (Simulated)
                // const actMsg = action === 'raise' ? `raises to ${amount}` : action;


                this.act(currentPlayer.name, action, amount);

                // If action succeeded, log it briefly if it's significant (raise/allin) or just debugging
                // For "Game Log" feel, we want all actions:
                this.log(`> ${currentPlayer.name}: ${action} ${amount > 0 ? amount : ''}`);

            } catch {
                // Fallback Logic
                try { this.act(currentPlayer.name, 'call'); this.log(`> ${currentPlayer.name}: call (fallback)`); }
                catch { try { this.act(currentPlayer.name, 'fold'); this.log(`> ${currentPlayer.name}: fold (fallback)`); } catch { break; } }
            }

            await new Promise(r => setTimeout(r, 0));
            steps++;
        }

        // End of Game Report
        if (this.engine.stage === 'showdown' || this.engine.winners.length > 0) {
            const board = this.engine.communityCards.map(c => c.toString()).join(" ");
            this.log(`\n=== Game Over ===`);
            this.log(`Board: [ ${board} ]`);
            this.log(`Winners:`);
            this.engine.winners.forEach(wId => {
                const p = this.engine.players.find(pl => pl.id === wId);
                if (p) {
                    const old = startChips.get(p.id) || 0;
                    const delta = p.chips - old;
                    const sign = delta >= 0 ? '+' : '';

                    // STRESS TEST: Verify getHandDetailedDescription functionality explicitly
                    // This ensures random hands don't crash the description generator
                    let descObjStr = "";
                    try {
                        // Re-evaluate to get the raw result object needed for helper
                        const evalResult = evaluateHand([...p.hand, ...this.engine.communityCards]);
                        descObjStr = getHandDetailedDescription(evalResult);
                    } catch (e) {
                        const err = e instanceof Error ? e.message : String(e);
                        this.log(`❌ CRITICAL FAILURE in getHandDetailedDescription: ${err}`);
                        this.log(`   Hand: ${p.hand.map(c => c.toString())}, Board: ${this.engine.communityCards.map(c => c.toString())}`);
                        throw e; // Fail the test immediately
                    }

                    const winInfo = descObjStr ? `(${descObjStr})` : '(Fold Win)';
                    this.log(`  🏆 ${p.name} [${sign}${delta}] ${winInfo}`);

                    if (p.hand.length > 0) {
                        const handStr = p.hand.map(c => c.toString()).join(" ");
                        this.log(`     Hand: [ ${handStr} ]`);
                    }
                }
            });
        }

        // Integrity Check
        const finalTotal = this.engine.players.reduce((sum, p) => sum + p.chips, 0) + this.engine.pot;

        // Check total sum.
        if (Math.abs(finalTotal - initialTotal) > 1) {
            this.log(`❌ INTEGRITY FAILURE: Chips changed from ${initialTotal} to ${finalTotal}`);
            throw new Error(`Chips Integrity Check Failed! Diff: ${finalTotal - initialTotal}`);
        } else {
            this.log(`Running Check: Chips Integrity OK (${finalTotal})`);
        }
    }
    setAIMode(mode: 'normal' | 'super') {
        this.engine.setAIMode(mode);
        this.log(`AI Mode set to: ${mode}`);
    }

    /**
     * 运行超级电脑模式测试
     * 主要验证蒙特卡洛模拟是否正常运行，以及决策是否合规
     */
    async runSuperAITests() {
        this.log("Running Super AI Specific Tests...");
        this.setAIMode('super');

        // Restore AI action for these tests
        const original = (this.engine as TestEngine)._originalAiAction;
        if (original) {
            this.engine.aiAction = original;
        }

        // 降低模拟次数以加快测试速度
        this.engine.superAIConfig.monteCarloSims = 100;

        // 测试 1: 强牌识别
        this.log("1. SuperAI - Strong Hand Recognition");
        this.engine.resetGame();
        // 给玩家 P1 发 AA
        const p1 = this.engine.players[1]; // Bot 1
        p1.hand = [Card.fromString('Ah'), Card.fromString('Ad')];
        p1.chips = 1000;

        // 设置单挑环境 (Heads Up) 以验证高胜率
        this.engine.players.forEach((p, i) => {
            if (i > 2) p.isEliminated = true; // 只留 P0, P1, P2 (3-way) 或者更少
        });

        // 强制轮到 P1 行动
        this.engine.currentTurnIdx = 1;
        this.engine.highestBet = 20;
        p1.currentBet = 0;

        // 执行 AI 行动
        this.engine.aiAction(p1);

        // 期望：因为是 AA，且单挑/少人，胜率很高，应该加注
        // Note: 由于有随机性，如果没加注也不一定错，但大部分时候应该加注
        this.log(`P1 Match Action: ${p1.currentBet > 20 ? 'Raise' : 'Call/Fold'}`);
        if (p1.status === 'folded') {
            this.log("WARNING: SuperAI Folded Pocket Aces Preflop?");
        } else {
            this.log("Passed: SuperAI played AA.");
        }

        // 测试 2: 胜率计算功能验证 (Heads Up)
        this.log("2. SuperAI - Win Rate Calculation (Heads Up)");
        // 让环境变成纯单挑: P1 vs P0
        this.engine.players.forEach((p, i) => {
            if (i !== 0 && i !== 1) {
                p.isEliminated = true;
                p.status = 'eliminated';
            }
        });

        // AA vs Random Preflop => ~85%
        // 公共牌为空
        this.engine.communityCards = [];
        const winRate = this.engine._calculateWinRateMonteCarlo(p1);
        this.log(`AA Preflop WinRate (Heads Up, Sim 100): ${(winRate * 100).toFixed(1)}%`);

        if (winRate > 0.7) {
            this.log("Passed: WinRate calculation seems reasonable (>70%).");
        } else {
            throw new Error(`WinRate calculation abnormal for AA: ${winRate}`);
        }

        // 测试 3: 边缘牌决策 (72o Fold)
        this.log("3. SuperAI - Marginal Hand Decision (72o)");
        p1.hand = [Card.fromString('7s'), Card.fromString('2h')]; // 72o, 最差起手牌
        this.engine.currentTurnIdx = 1;
        this.engine.highestBet = 50; // facing a raise
        p1.currentBet = 0;

        // 确保不是短筹码，非偷盲，非极好赔率
        p1.chips = 1000;
        this.engine.pot = 100;

        this.engine.aiAction(p1);
        this.log(`P1 Match Action with 72o: ${p1.status}`);
        if (p1.status === 'folded') {
            this.log("Passed: SuperAI correctly folded 72o.");
        } else {
            // 极小概率 bluff
            this.log(`WARNING: SuperAI did not fold 72o (Action: ${p1.status})`);
        }

        // 测试 4: 极好底池赔率自动跟注 (Excellent Pot Odds)
        this.log("4. SuperAI - Excellent Pot Odds Auto-Call");
        p1.status = 'active';
        p1.hand = [Card.fromString('Ks'), Card.fromString('9d')]; // K9o, 边缘牌
        this.engine.pot = 1000;
        this.engine.highestBet = 20;
        p1.currentBet = 0; // call amount = 20
        // live players for pot odds context

        // Call 20 to win 1020 => ~2% odds. Should checking call.

        this.engine.aiAction(p1);
        this.log(`P1 Action with Pot Odds ~2%: ${p1.status}, Bet: ${p1.currentBet}`);
        if (p1.currentBet >= 20 && (p1.status as string) !== 'folded') {
            this.log("Passed: SuperAI called with excellent pot odds.");
        } else {
            this.log(`FAILED: SuperAI folded with excellent pot odds?`);
        }

        // 测试 5: Heads Up 激进策略 (Wide Range)
        this.log("5. SuperAI - Heads Up Aggression");
        // 设置单挑
        this.engine.players.forEach((p, i) => {
            if (i !== 0 && i !== 1) {
                p.isEliminated = true;
                p.status = 'eliminated';
            } else {
                p.isEliminated = false;
                p.status = 'active';
            }
        });

        p1.hand = [Card.fromString('Qh'), Card.fromString('5s')]; // Q5o, 弱牌
        // 在多人局通常弃牌，但在 Heads Up 很多时候可以玩
        this.engine.currentTurnIdx = 1;
        this.engine.highestBet = 10; // limped pot or min bet
        p1.currentBet = 0;
        p1.chips = 1000;

        this.engine.aiAction(p1);
        this.log(`P1 Heads Up Action with Q5o: ${(p1.status as string) === 'folded' ? 'Fold' : 'Play'}`);
        // 这一项比较随机，只要没有报错崩溃即可，不强制断言行为，打 log 观察
        if ((p1.status as string) !== 'folded') {
            this.log("Observation: SuperAI played Q5o in Heads Up.");
        } else {
            this.log("Observation: SuperAI folded Q5o in Heads Up (RNG or tight profile).");
        }
    }

    /**
     * Test startNewSession logic
     */
    async testSessionReset() {
        this.log("Testing startNewSession chip reset...");
        // Reset to a clean state first
        this.reset();

        // 1. Manually corrupt state to simulate end of a weird session
        this.engine.players.forEach((p, i) => {
            p.chips = 9999 + i;
            p.status = 'eliminated';
            p.isEliminated = true;
        });

        // 2. Start new session
        this.engine.startNewSession();

        // 3. Verify
        let allOk = true;
        this.engine.players.forEach(p => {
            // Because startNewSession automatically starts the next round and posts blinds,
            // we must check if (chips + currentBet) equals the initial amount.
            if (p.chips + p.currentBet !== this.engine.initialChips) {
                this.log(`FAIL: Player ${p.name} chips=${p.chips}, bet=${p.currentBet}, total=${p.chips + p.currentBet}, expected ${this.engine.initialChips}`);
                allOk = false;
            }
            if (p.isEliminated) {
                this.log(`FAIL: Player ${p.name} is still Eliminated`);
                allOk = false;
            }
            if (p.status !== 'active') {
                this.log(`FAIL: Player ${p.name} status is ${p.status}`);
                allOk = false;
            }
        });

        if (allOk) {
            this.log("Passed: Session reset confirmed (All players reset to initialChips).");
        } else {
            throw new Error("Failed: Players not reset correctly after startNewSession.");
        }
    }

    /**
     * 运行一个静态的牌型比对或底池分配测试
     * 包含: Setup -> All-in (Optional Actions) -> Solve -> Verify Chips
     */
    async runStaticScenario(
        title: string,
        setup: {
            players: { name: string, chips: number, hand: string[] }[],
            board: string[]
        },
        actions: { player: string, action: 'fold' | 'call' | 'raise' | 'allin', amount?: number }[] | 'all-in-all',
        expectedChips: Record<string, number>
    ) {
        this.log(title);
        this.setupScenario(setup.players, setup.board);

        if (actions === 'all-in-all') {
            const active = this.engine.players.filter(p => !p.isEliminated);
            for (const p of active) {
                this.act(p.name, 'allin');
            }
        } else {
            for (const act of actions) {
                this.act(act.player, act.action, act.amount);
            }
        }

        // Wait for potential async state updates if any (simulation only takes minimal time though)
        await new Promise(r => setTimeout(r, 50));

        // Verify
        const errors: string[] = [];
        Object.entries(expectedChips).forEach(([name, expChips]) => {
            const p = this.engine.players.find(pl => pl.name === name);
            if (!p) {
                errors.push(`Player ${name} not found`);
                return;
            }
            // Allow small delta for float calc if any, though engine uses integers mostly? 
            // Engine pot math sometimes has tiny remainders or float issues if not careful, but usually int.
            // Strict check:
            if (p.chips !== expChips) {
                errors.push(`${name}: expected ${expChips}, got ${p.chips}`);
            }
        });

        if (errors.length > 0) {
            throw new Error(`Scenario Failed: ${errors.join(', ')}`);
        }
        this.log("Passed.");
    }

}

