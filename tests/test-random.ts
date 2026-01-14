/**
 * 纯粹随机测试 (Pure Random Testing)
 * 
 * 运行完全随机的德州扑克对局，用于压力测试和发现潜在边缘情况。
 * 所有决策都基于随机数生成，不使用任何预设脚本或 AI。
 * 
 * 命令行参数:
 *   --rounds=N      测试轮数 (默认 10)
 *   --extended      启用扩展边缘测试
 *   --super-ai      启用 Super AI 模式测试
 *   --stress        压力测试模式 (500+ 轮)
 */

import { ScenarioTester } from './utils';
import { PokerGameEngine, Player } from '../src/lib/poker-engine';

interface TestEngine extends PokerGameEngine {
    _originalAiAction?: (player: Player) => void;
}

class ExtendedTester extends ScenarioTester {
    /**
     * 扩展随机测试 - 包含边缘情况和极端场景
     * Extended random testing with edge cases and extreme scenarios
     */
    async runExtendedRandomTests(rounds: number = 20) {
        this.log(`\n=== Extended Random Tests (${rounds} rounds) ===`);

        for (let i = 0; i < rounds; i++) {
            this.log(`\n--- Extended Round ${i + 1} / ${rounds} ---`);

            // Randomly choose test type
            const testType = Math.floor(Math.random() * 4);

            switch (testType) {
                case 0:
                    await this.runEdgeCaseChipsTest();
                    break;
                case 1:
                    await this.runRandomGame();
                    break;
                case 2:
                    await this.runSessionResetTest();
                    break;
                default:
                    await this.runRandomGame();
            }
        }

        this.log(`\n=== Extended Random Tests Completed ===`);
    }

    /**
     * 边缘筹码测试 - 测试极端筹码分布
     * Edge case chips test - tests extreme chip distributions
     */
    async runEdgeCaseChipsTest() {
        this.reset();

        // Randomly assign extreme chips: some very low (10-50), some very high (10000+)
        this.engine.players.forEach((p, i) => {
            if (i % 3 === 0) {
                p.chips = Math.floor(Math.random() * 40) + 10; // 10-50 (short stack)
            } else if (i % 3 === 1) {
                p.chips = Math.floor(Math.random() * 10000) + 5000; // 5000-15000 (big stack)
            } else {
                p.chips = Math.floor(Math.random() * 500) + 100; // 100-600 (medium)
            }
        });

        const initialTotal = this.engine.players.reduce((sum, p) => sum + p.chips, 0) + this.engine.pot;
        this.log(`Edge Case Test | Chip Distribution: ${this.engine.players.map(p => p.chips).join(', ')}`);

        let steps = 0;
        const maxSteps = 200;

        while (this.engine.stage !== 'showdown' && this.engine.winners.length === 0 && steps < maxSteps) {
            const active = this.engine.players.filter(p => !p.isEliminated && p.status !== 'folded');
            if (active.length <= 1) break;

            const currentPlayer = this.engine.players[this.engine.currentTurnIdx];
            if (!currentPlayer || currentPlayer.status !== 'active') break;

            // More aggressive action selection to force edge cases
            const rand = Math.random();
            let action: 'fold' | 'call' | 'raise' | 'allin' = 'call';

            if (rand < 0.3) action = 'allin'; // Higher all-in chance
            else if (rand < 0.5) action = 'fold';
            else if (rand < 0.8) action = 'call';
            else action = 'raise';

            try {
                let amount = 0;
                if (action === 'raise') {
                    const callAmt = this.engine.highestBet - currentPlayer.currentBet;
                    const minRaise = this.engine.lastRaiseAmount || this.engine.bigBlind;
                    const maxRaise = currentPlayer.chips - callAmt;
                    if (maxRaise < minRaise) action = 'allin';
                    else amount = Math.floor(Math.random() * (maxRaise - minRaise)) + minRaise;
                }
                this.act(currentPlayer.name, action, amount);
            } catch {
                try { this.act(currentPlayer.name, 'call'); }
                catch { try { this.act(currentPlayer.name, 'fold'); } catch { break; } }
            }

            await new Promise(r => setTimeout(r, 0));
            steps++;
        }

        // Verify integrity
        const finalTotal = this.engine.players.reduce((sum, p) => sum + p.chips, 0) + this.engine.pot;
        if (Math.abs(finalTotal - initialTotal) > 1) {
            throw new Error(`Edge Case Chips Integrity Failed! Diff: ${finalTotal - initialTotal}`);
        }
        this.log(`Edge Case Test Passed | Chips Integrity OK (${finalTotal})`);
    }

    /**
     * Session 重置后连续测试
     * Tests session reset followed by continued play
     */
    async runSessionResetTest() {
        this.log(`Session Reset Continuity Test`);

        // Run a quick game first
        await this.runRandomGame();

        // Now reset and verify
        this.engine.startNewSession();

        // Verify all players are reset
        let allOk = true;
        this.engine.players.forEach(p => {
            if (p.isEliminated) {
                this.log(`FAIL: Player ${p.name} still eliminated after session reset`);
                allOk = false;
            }
        });

        if (!allOk) {
            throw new Error("Session reset failed to reset player states");
        }

        // Run another game after reset
        await this.runRandomGame();

        this.log(`Session Reset Continuity Test Passed`);
    }

    /**
     * Super AI 模式随机测试
     * Random testing with Super AI mode enabled
     */
    async runSuperAIRandomTests(rounds: number = 10) {
        this.log(`\n=== Super AI Random Tests (${rounds} rounds) ===`);

        this.setAIMode('super');

        // Lower Monte Carlo sims for faster testing
        this.engine.superAIConfig.monteCarloSims = 50;

        // Restore AI action for these tests
        const original = (this.engine as TestEngine)._originalAiAction;
        if (original) {
            this.engine.aiAction = original;
        }

        for (let i = 0; i < rounds; i++) {
            this.log(`Super AI Round ${i + 1} / ${rounds}`);

            try {
                this.reset();

                // Randomize chips
                this.engine.players.forEach(p => {
                    p.chips = Math.floor(Math.random() * 4500) + 500;
                });

                const initialTotal = this.engine.players.reduce((sum, p) => sum + p.chips, 0) + this.engine.pot;

                let steps = 0;
                const maxSteps = 200;

                while (this.engine.stage !== 'showdown' && this.engine.winners.length === 0 && steps < maxSteps) {
                    const active = this.engine.players.filter(p => !p.isEliminated && p.status !== 'folded');
                    if (active.length <= 1) break;

                    const currentPlayer = this.engine.players[this.engine.currentTurnIdx];
                    if (!currentPlayer || currentPlayer.status !== 'active') break;

                    // Let AI make decision (Super AI logic) or random for human
                    if (currentPlayer.isHuman) {
                        const rand = Math.random();
                        let action: 'fold' | 'call' | 'raise' | 'allin' = 'call';
                        if (rand < 0.1) action = 'fold';
                        else if (rand < 0.6) action = 'call';
                        else if (rand < 0.9) action = 'raise';
                        else action = 'allin';

                        try {
                            let amount = 0;
                            if (action === 'raise') {
                                const callAmt = this.engine.highestBet - currentPlayer.currentBet;
                                const minRaise = this.engine.lastRaiseAmount || this.engine.bigBlind;
                                const maxRaise = currentPlayer.chips - callAmt;
                                if (maxRaise < minRaise) action = 'allin';
                                else amount = Math.floor(Math.random() * (maxRaise - minRaise)) + minRaise;
                            }
                            this.act(currentPlayer.name, action, amount);
                        } catch {
                            try { this.act(currentPlayer.name, 'call'); }
                            catch { try { this.act(currentPlayer.name, 'fold'); } catch { break; } }
                        }
                    } else {
                        // Let Super AI decide
                        try {
                            this.engine.aiAction(currentPlayer);
                        } catch (e) {
                            const err = e instanceof Error ? e.message : String(e);
                            this.log(`Super AI Error: ${err}`);
                            // Fallback
                            try { this.act(currentPlayer.name, 'call'); }
                            catch { try { this.act(currentPlayer.name, 'fold'); } catch { break; } }
                        }
                    }

                    await new Promise(r => setTimeout(r, 0));
                    steps++;
                }

                // Verify integrity
                const finalTotal = this.engine.players.reduce((sum, p) => sum + p.chips, 0) + this.engine.pot;
                if (Math.abs(finalTotal - initialTotal) > 1) {
                    throw new Error(`Super AI Chips Integrity Failed! Diff: ${finalTotal - initialTotal}`);
                }
                this.log(`Super AI Round ${i + 1} Passed | Chips OK (${finalTotal})`);

            } catch (e) {
                const err = e instanceof Error ? e.message : String(e);
                this.log(`❌ Super AI Round ${i + 1} Failed: ${err}`);
                throw e;
            }
        }

        this.setAIMode('normal');
        // Restore disabled AI
        this.engine.aiAction = () => { };

        this.log(`\n=== Super AI Random Tests Completed ===`);
    }

    /**
     * 压力测试 - 大量轮次的快速测试
     * Stress test - rapid testing with many rounds
     */
    async runStressTest(rounds: number = 500) {
        this.log(`\n=== Stress Test (${rounds} rounds) ===`);

        let passed = 0;
        let failed = 0;

        for (let i = 0; i < rounds; i++) {
            try {
                // Silent mode - minimal logging
                const oldLog = console.log;
                if (i % 50 !== 0) {
                    // eslint-disable-next-line @typescript-eslint/no-empty-function
                    console.log = () => { };
                }

                await this.runRandomGame();
                passed++;

                console.log = oldLog;

                if (i % 50 === 0) {
                    this.log(`Stress Progress: ${i + 1} / ${rounds} (${passed} passed, ${failed} failed)`);
                }
            } catch (e) {
                failed++;
                const err = e instanceof Error ? e.message : String(e);
                this.log(`❌ Stress Test Round ${i + 1} Failed: ${err}`);
            }
        }

        this.log(`\n=== Stress Test Complete ===`);
        this.log(`Total: ${rounds} | Passed: ${passed} | Failed: ${failed}`);

        if (failed > 0) {
            throw new Error(`Stress Test had ${failed} failures out of ${rounds} rounds`);
        }
    }
}

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

// Parse command line arguments
const args = process.argv.slice(2);
const roundsArg = args.find(a => a.startsWith('--rounds='));
const rounds = roundsArg ? parseInt(roundsArg.split('=')[1], 10) : 10;
const isExtended = args.includes('--extended');
const isSuperAI = args.includes('--super-ai');
const isStress = args.includes('--stress');

console.log("===========================================");
console.log("   纯粹随机测试 (Pure Random Simulation)   ");
console.log("===========================================");

if (isStress) {
    console.log(`模式: 压力测试 (Stress Test)\n`);
    const tester = new ExtendedTester();
    tester.runStressTest(rounds > 10 ? rounds : 500).then(() => {
        console.log("\n-------------------------------------------");
        console.log("压力测试完成。");
        console.log("-------------------------------------------");
    }).catch((e) => {
        console.error("压力测试执行出错:", e);
        process.exit(1);
    });
} else if (isSuperAI) {
    console.log(`模式: Super AI 测试 (${rounds} 轮)\n`);
    const tester = new ExtendedTester();
    tester.runSuperAIRandomTests(rounds).then(() => {
        console.log("\n-------------------------------------------");
        console.log(`Super AI 测试完成，共 ${rounds} 轮。`);
        console.log("-------------------------------------------");
    }).catch((e) => {
        console.error("Super AI 测试执行出错:", e);
        process.exit(1);
    });
} else if (isExtended) {
    console.log(`模式: 扩展边缘测试 (${rounds} 轮)\n`);
    const tester = new ExtendedTester();
    tester.runExtendedRandomTests(rounds).then(() => {
        console.log("\n-------------------------------------------");
        console.log(`扩展测试完成，共 ${rounds} 轮。`);
        console.log("-------------------------------------------");
    }).catch((e) => {
        console.error("扩展测试执行出错:", e);
        process.exit(1);
    });
} else {
    console.log(`配置: ${rounds} 轮\n`);
    runRandomSimulations(rounds).then(() => {
        console.log("\n-------------------------------------------");
        console.log(`随机测试完成，共 ${rounds} 轮。`);
        console.log("-------------------------------------------");
    }).catch((e) => {
        console.error("随机测试执行出错:", e);
        process.exit(1);
    });
}
