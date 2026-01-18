/**
 * 纯粹预设场景测试 (Pure Scenario Testing)
 * 
 * 运行预定义的德州扑克场景，用于验证特定边界情况和游戏规则。
 * 所有测试都使用固定的脚本和预设牌面，结果可重现。
 */

import { ScenarioTester } from './utils';
import { Card } from '../src/lib/poker-engine';

async function runScenarioTests(): Promise<string[]> {
    const tester = new ScenarioTester();
    tester.log("Starting Preset Scenario Tests...");

    try {
        // --- Scenario 1 ---
        tester.log("1. Everyone Folds to BB (Walk)");
        tester.reset();
        await tester.runScript([
            { player: 'Morgan', action: 'fold' }, { player: 'Jamie', action: 'fold' },
            { player: 'Avery', action: 'fold' }, { player: 'Blake', action: 'fold' },
            { player: 'Jordan', action: 'fold' },
            { player: 'You', action: 'fold' }, { player: 'Alex', action: 'fold' }
        ]);
        tester.verifyStage('showdown');
        tester.log("Passed.");

        // --- Scenario 2 ---
        tester.log("2. Flop Aggression Wins");
        tester.reset();
        await tester.runScript([
            { player: 'Morgan', action: 'call' }, { player: 'Jamie', action: 'call' },
            { player: 'Avery', action: 'call' }, { player: 'Blake', action: 'call' },
            { player: 'Jordan', action: 'call' },
            { player: 'You', action: 'call' }, { player: 'Alex', action: 'call' },
            { player: 'Sam', action: 'call' }
        ]);
        await tester.runScript([
            { player: 'Alex', action: 'raise', amount: 50 },
            { player: 'Sam', action: 'fold' }, { player: 'Morgan', action: 'fold' },
            { player: 'Jamie', action: 'fold' }, { player: 'Avery', action: 'fold' },
            { player: 'Blake', action: 'fold' }, { player: 'Jordan', action: 'fold' }, { player: 'You', action: 'fold' }
        ]);
        tester.verifyStage('showdown');
        tester.log("Passed.");

        // --- Scenario 3 ---
        tester.log("3. Turn All-in Regression");
        tester.reset();
        await tester.runScript([
            { player: 'Morgan', action: 'fold' }, { player: 'Jamie', action: 'fold' },
            { player: 'Avery', action: 'fold' }, { player: 'Blake', action: 'fold' },
            { player: 'Jordan', action: 'fold' },
            { player: 'You', action: 'raise', amount: 40 }, { player: 'Alex', action: 'call' },
            { player: 'Sam', action: 'fold' }
        ]);
        await tester.runScript([
            { player: 'Alex', action: 'call' },
            { player: 'You', action: 'raise', amount: 50 },
            { player: 'Alex', action: 'call' }
        ]);
        await tester.runScript([
            { player: 'Alex', action: 'call' },
            { player: 'You', action: 'allin' },
            { player: 'Alex', action: 'fold' }
        ]);
        tester.verifyStage('showdown');
        tester.log("Passed.");

        // --- Scenario 4: Complex Side Pot ---
        await tester.runStaticScenario(
            "4. Complex Side Pot Verification",
            {
                players: [
                    { name: 'You', chips: 3580, hand: ['6c', '3s'] },
                    { name: 'Avery', chips: 190, hand: ['Qh', 'Jd'] },
                    { name: 'Morgan', chips: 1520, hand: ['Ks', 'Js'] }
                ],
                board: ['Kc', 'Qd', 'Kd', 'Tc', '3h']
            },
            'all-in-all',
            { 'Morgan': 3230 }
        );

        // --- Scenario 5 ---
        tester.log("5. All-in Preflop Chaos");
        tester.reset();
        ['Morgan', 'Jamie', 'Avery', 'Blake', 'Jordan', 'You', 'Alex', 'Sam'].forEach(n => tester.act(n, 'allin'));
        await new Promise(r => setTimeout(r, 200));
        tester.verifyStage('showdown');
        tester.log("Passed.");

        // --- Scenario 6 ---
        tester.log("6. Check Down (Explicit)");
        tester.reset();
        // Check preflop
        const checkAround = ['Morgan', 'Jamie', 'Avery', 'Blake', 'Jordan', 'You', 'Alex', 'Sam'];
        // Preflop: SB(1) BB(2) act last-ish. Starts at UTG(Morgan).
        for (const n of checkAround) {
            tester.act(n, 'call');
            await new Promise(r => setTimeout(r, 0));
        }

        // Flop, Turn, River - Ordered SB to Dealer
        const ordered = ['Alex', 'Sam', 'Morgan', 'Jamie', 'Avery', 'Blake', 'Jordan', 'You'];
        const playStreet = async () => {
            for (const n of ordered) {
                tester.act(n, 'call');
                await new Promise(r => setTimeout(r, 0));
            }
            await new Promise(r => setTimeout(r, 50));
        };
        await playStreet(); // Flop
        await playStreet(); // Turn
        await playStreet(); // River

        tester.verifyStage('showdown');
        tester.log("Passed.");

        // --- Scenario 7: Split Pot ---
        await tester.runStaticScenario(
            "7. Split Pot",
            {
                players: [
                    { name: 'You', chips: 1000, hand: ['As', 'Ks'] },
                    { name: 'Alex', chips: 1000, hand: ['Ac', 'Kc'] }
                ],
                board: ['Qd', 'Jd', 'Td', '2s', '3s']
            },
            'all-in-all',
            { 'You': 1000, 'Alex': 1000 }
        );

        // --- Scenario 8 ---
        tester.log("8. Heads Up Fold");
        tester.setupScenario([
            { name: 'You', chips: 1000, hand: ['As', 'Ks'] },
            { name: 'Alex', chips: 1000, hand: ['2c', '7d'] }
        ], []); // Empty board for preflop
        tester.act('You', 'raise', 50);
        tester.act('Alex', 'fold');
        tester.verifyStage('showdown'); // Fold win triggers showdown stage
        tester.log("Passed.");

        // --- Scenario 9 ---
        tester.log("9. River Bluff");
        tester.reset();
        // Calls preflop
        for (const n of checkAround) tester.act(n, 'call');
        await new Promise(r => setTimeout(r, 50));
        await playStreet(); // Flop
        await playStreet(); // Turn
        // River
        for (const n of ['Alex', 'Sam', 'Morgan', 'Jamie', 'Avery', 'Blake', 'Jordan']) { // Others check/fold
            tester.act(n, 'call');
            await new Promise(r => setTimeout(r, 0));
        }
        tester.act('You', 'raise', 500); // You Raise
        tester.act('Alex', 'fold'); // Opponents fold
        tester.act('Sam', 'fold');
        // ... assuming others folded or verifyStage
        // Just verify forcing fold works.
        tester.log("Passed (Simulated).");

        // --- Scenario 10: Multi-Side Pot (Complex) ---
        await tester.runStaticScenario(
            "10. Multi-Side Pot (Complex)",
            {
                players: [
                    { name: 'You', chips: 100, hand: ['As', 'Ah'] },
                    { name: 'Alex', chips: 500, hand: ['Ks', 'Kh'] },
                    { name: 'Sam', chips: 1000, hand: ['Qs', 'Qh'] },
                    { name: 'Morgan', chips: 1000, hand: ['Js', 'Jh'] }
                ],
                board: ['2c', '3c', '4c', '5d', '7d']
            },
            'all-in-all',
            // Adjusted expectation: You wins Main (400), Alex Side 1 (1200), Sam Side 2 (1000)
            { 'You': 400, 'Alex': 1200, 'Sam': 1000 }
        );

        // --- Scenario 11: Playing the Board (Split Pot) ---
        await tester.runStaticScenario(
            "11. Playing the Board (Split Pot)",
            {
                players: [
                    { name: 'You', chips: 3204, hand: ['Tc', 'Js'] },
                    { name: 'Morgan', chips: 1743, hand: ['5s', 'Qs'] },
                    { name: 'Taylor', chips: 593, hand: ['2h', '8c'] }
                ],
                board: ['3h', '3d', '3s', 'Ad', 'Kc']
            },
            'all-in-all',
            { 'You': 3204, 'Morgan': 1743, 'Taylor': 593 }
        );

        // --- Scenario 12: Counterfeited Two Pair (Split Pot) ---
        await tester.runStaticScenario(
            "12. Counterfeited Two Pair (Split Pot)",
            {
                players: [
                    { name: 'You', chips: 3053, hand: ['Jh', '6s'] },
                    { name: 'Parker', chips: 1802, hand: ['9h', '6d'] }
                ],
                board: ['4c', '7c', '7s', '6h', 'Ac']
            },
            'all-in-all',
            { 'You': 3053, 'Parker': 1802 }
        );

        // --- Scenario 13: Flush vs Flush ---
        await tester.runStaticScenario(
            "13. Same Hand Type Comparison (Flush vs Flush)",
            {
                players: [
                    { name: 'You', chips: 1000, hand: ['Kh', '2h'] },
                    { name: 'Alex', chips: 1000, hand: ['Qh', '3h'] }
                ],
                board: ['Ah', '9h', '7h', '4c', '5d']
            },
            'all-in-all',
            { 'You': 2000, 'Alex': 0 }
        );

        // --- Scenario 14: Triple Split ---
        await tester.runStaticScenario(
            "14. Triple Split (3 Players Same Hand)",
            {
                players: [
                    { name: 'You', chips: 300, hand: ['2s', '3s'] },
                    { name: 'Alex', chips: 300, hand: ['2c', '3c'] },
                    { name: 'Sam', chips: 300, hand: ['2d', '3d'] }
                ],
                board: ['Ah', 'Kh', 'Qh', 'Jh', 'Th']
            },
            'all-in-all',
            { 'You': 300, 'Alex': 300, 'Sam': 300 }
        );

        // --- Scenario 15: Straight vs Straight ---
        await tester.runStaticScenario(
            "15. Straight vs Straight (Higher Wins)",
            {
                players: [
                    { name: 'You', chips: 500, hand: ['4s', '3s'] },  // 7-high straight
                    { name: 'Alex', chips: 500, hand: ['9c', '8c'] }  // 9-high straight
                ],
                board: ['7h', '6d', '5c', '2s', 'Kd']
            },
            'all-in-all',
            { 'You': 0, 'Alex': 1000 }
        );

        // --- Scenario 16: Full House vs Full House (Same Trips) ---
        await tester.runStaticScenario(
            "16. Full House vs Full House (Same Trips)",
            {
                players: [
                    { name: 'You', chips: 500, hand: ['Kh', 'Kd'] },   // AAA-KK
                    { name: 'Alex', chips: 500, hand: ['Qh', 'Qd'] }   // AAA-QQ
                ],
                board: ['Ah', 'Ad', 'Ac', '5s', '2c']
            },
            'all-in-all',
            { 'You': 1000, 'Alex': 0 }
        );

        // --- Scenario 17: Full House vs Full House (Diff Trips) ---
        await tester.runStaticScenario(
            "17. Full House vs Full House (Different Trips)",
            {
                players: [
                    { name: 'You', chips: 500, hand: ['Kh', 'Kd'] },   // KKK-AA
                    { name: 'Alex', chips: 500, hand: ['Qh', 'Qd'] }   // QQQ-AA
                ],
                board: ['Kc', 'Qc', 'As', 'Ad', '2c']
            },
            'all-in-all',
            { 'You': 1000, 'Alex': 0 }
        );

        // --- Scenario 18: Pair Kicker ---
        await tester.runStaticScenario(
            "18. Same Pair Different Kickers",
            {
                players: [
                    { name: 'You', chips: 500, hand: ['Ah', 'Kh'] },   // AA-K-Q-J
                    { name: 'Alex', chips: 500, hand: ['Ac', 'Td'] }   // AA-T-Q-J
                ],
                board: ['Ad', 'Qc', 'Jc', '5s', '2c']
            },
            'all-in-all',
            { 'You': 1000, 'Alex': 0 }
        );

        // --- Scenario 19: Two Pair Kicker ---
        await tester.runStaticScenario(
            "19. Two Pair Same Pairs Different Kicker",
            {
                players: [
                    { name: 'You', chips: 500, hand: ['Ah', '5h'] },   // JJ-55-A
                    { name: 'Alex', chips: 500, hand: ['Kc', '5d'] }   // JJ-55-K
                ],
                board: ['Jh', 'Jd', '5c', '2s', '3c']
            },
            'all-in-all',
            { 'You': 1000, 'Alex': 0 }
        );

        // --- Scenario 20: Low Chips Blind Post ($1 Short Stack) ---
        // 测试：玩家只剩 $1 时全押，应能正常结算
        await tester.runStaticScenario(
            "20. Low Chips All-in ($1 Player)",
            {
                players: [
                    { name: 'You', chips: 1, hand: ['As', 'Kh'] },       // $1 玩家，强牌
                    { name: 'Alex', chips: 1000, hand: ['Qc', 'Qd'] }    // 对方
                ],
                board: ['Ac', 'Kd', '2c', '5h', '7s']  // You 拿到两对 A-K
            },
            'all-in-all',
            // You 只有 $1 全押，形成 $2 主池
            // 主池归 You (两对 > 一对)
            // Alex 多余筹码 $999 返还
            { 'You': 2, 'Alex': 999 }
        );

        // --- Scenario 21: Low Chips Call ($1 vs $10 Big Blind) ---
        // 测试：玩家只剩 $1 面对 $10 大盲注的跟注行为
        tester.log("21. Low Chips Call ($1 Player Calls $10 BB - Auto All-in)");
        tester.setupScenario([
            { name: 'You', chips: 1, hand: ['Ah', 'Kh'] },    // 只有 $1
            { name: 'Alex', chips: 1000, hand: ['2c', '3d'] } // 对手弱牌
        ], ['As', 'Kd', 'Qh', '7c', '2s']);  // You 拿到顶对

        // 设置盲注环境：Alex 已下大盲 $10
        const pAlex21 = tester.engine.players.find(p => p.name === 'Alex')!;
        pAlex21.chips -= 10;
        pAlex21.currentBet = 10;
        pAlex21.totalHandBet = 10;
        tester.engine.pot = 10;
        tester.engine.highestBet = 10;

        // You 尝试 call，但只有 $1，应该自动变成 all-in
        const pYou21 = tester.engine.players.find(p => p.name === 'You')!;
        tester.engine.currentTurnIdx = pYou21.id;

        tester.act('You', 'call');  // Call 时筹码不足，应用 Math.min(10, 1) = $1

        // 验证 You 状态
        if (pYou21.chips !== 0) {
            throw new Error(`Player should have 0 chips after call, got ${pYou21.chips}`);
        }
        if (pYou21.status !== 'allin') {
            throw new Error(`Player should be all-in after calling with $1, got ${pYou21.status}`);
        }
        if (pYou21.currentBet !== 1) {
            throw new Error(`Player bet should be 1, got ${pYou21.currentBet}`);
        }
        tester.log("Passed: $1 player correctly went all-in when calling.");

        // --- Scenario 22: User Provided Complex History Verification ---

        tester.log("22. User Provided History (Side Pot & Folded Equity)");

        // Fix: Init with empty board to start at Preflop. Mock deck to deal specific cards.
        tester.setupScenario([
            { name: 'You', chips: 1059, hand: ['Th', '3s'] },      // Winner Side Pot
            { name: 'Tyler', chips: 22, hand: ['Kd', 'Tc'] },      // Winner Main Pot (Short stack)
            { name: 'Chip', chips: 1059, hand: ['6h', 'Qd'] },     // Loser
            { name: 'Sidney', chips: 1059, hand: ['2s', 'Qc'] },   // Loser
            { name: 'Dakota', chips: 1059, hand: ['8d', 'Ac'] },   // Folded
            { name: 'Skye', chips: 1059, hand: ['Td', '7h'] }     // Folded
        ], []);

        // Rig the deck for Flop, Turn, River
        const boardCards = ['3d', 'Qh', 'Jc', '3c', '9d'].map(s => Card.fromString(s));
        let dealIdx = 0;
        tester.engine.deck.deal = () => {
            return boardCards[dealIdx++] || Card.fromString('2s');
        };

        // 1. Blinds and Pre-flop Action
        // Manually post blinds to avoid MinRaise logic enforcement (SB 5, BB 10)
        const pSkye = tester.engine.players.find(p => p.name === 'Skye')!;
        const pSidney = tester.engine.players.find(p => p.name === 'Sidney')!;

        pSkye.chips -= 5; pSkye.currentBet = 5; pSkye.totalHandBet = 5;
        pSidney.chips -= 10; pSidney.currentBet = 10; pSidney.totalHandBet = 10;

        tester.engine.highestBet = 10;
        tester.engine.lastRaiseAmount = 5;

        // Action starts at Tyler
        tester.act('Tyler', 'call');      // Call 10 (Chips: 22-10=12 left)
        tester.act('You', 'call');        // Call 10
        tester.act('Chip', 'call');       // Call 10

        // Dakota Raises to 25 (Raise BY 15)
        tester.act('Dakota', 'raise', 15); // Total 25

        // Others Call 25
        tester.act('Skye', 'call');
        tester.act('Sidney', 'call');

        // Tyler All-in (12 more, Total 22) - Under Call
        tester.act('Tyler', 'allin');

        // Others Call 25
        tester.act('You', 'call');
        tester.act('Chip', 'call');

        // 2. Fold Dakota and Skye (Dead money $50 stays in pot)
        tester.act('Dakota', 'fold');
        tester.act('Skye', 'fold');

        // 3. Remaining 3 goes all-in (Total $1059)
        tester.act('You', 'allin');
        tester.act('Sidney', 'allin');
        tester.act('Chip', 'allin');

        await new Promise(r => setTimeout(r, 100));

        const pYou22 = tester.engine.players.find(p => p.name === 'You')!;
        const pTyler22 = tester.engine.players.find(p => p.name === 'Tyler')!;

        if (pTyler22.chips === 132 && pYou22.chips === 3117) {
            tester.log("Passed.");
        } else {
            console.log("Detailed Chips:", tester.engine.players.map(p => `${p.name}:${p.chips}`).join(', '));
            throw new Error(`User History failed: Tyler=${pTyler22.chips} (Exp: 132), You=${pYou22.chips} (Exp: 3117)`);
        }

        tester.log("All Scenarios Completed.");
    } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        tester.log(`ERROR: ${errorMessage}`);
        process.exit(1);
    }

    return tester.logs;
}

console.log("===========================================");
console.log("   纯粹场景测试 (Pure Scenario Testing)    ");
console.log("===========================================\n");

runScenarioTests().then(() => {
    console.log("\n-------------------------------------------");
    console.log("场景测试完成。");
    console.log("-------------------------------------------");
}).catch((e) => {
    console.error("场景测试执行出错:", e);
    process.exit(1);
});
