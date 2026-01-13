
import { Card } from '../src/lib/poker/card';
import { evaluateHand } from '../src/lib/poker/evaluator';
import { HandRankType } from '../src/lib/poker/types';

// Simple Assertion Helper
function assert(condition: boolean, message: string) {
    if (!condition) {
        throw new Error(`❌ FAILED: ${message}`);
    } else {
        console.log(`✅ PASSED: ${message}`);
    }
}

// Helper to parse "Ah Kd" string format to Card objects
// h=♥, d=♦, c=♣, s=♠
function parseCards(str: string): Card[] {
    if (!str.trim()) return [];
    return str.trim().split(/\s+/).map(s => {
        const rankChar = s.substring(0, s.length - 1);
        const suitChar = s.substring(s.length - 1);

        let suit: '♥' | '♦' | '♣' | '♠' = '♠';
        if (suitChar === 'h') suit = '♥';
        else if (suitChar === 'd') suit = '♦';
        else if (suitChar === 'c') suit = '♣';
        else if (suitChar === 's') suit = '♠';

        return new Card(rankChar as import('../src/lib/poker/types').Rank, suit);
    });
}

async function runTests() {
    console.log("=================================");
    console.log("🃏 Running Poker Evaluator Tests");
    console.log("=================================");

    let passed = 0;
    let failed = 0;

    const test = (name: string, fn: () => void) => {
        try {
            fn();
            passed++;
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            console.error(msg);
            failed++;
        }
    };

    test("Royal Flush Detection", () => {
        const hand = parseCards("Ah Kh Qh Jh Th");
        const res = evaluateHand(hand);
        assert(res.rank === HandRankType.STRAIGHT_FLUSH, "Should be Straight Flush");
        assert(res.winningCards[0].rank === 'A', "High card should be A");
    });

    test("Steel Wheel (A-5 Straight Flush)", () => {
        const hand = parseCards("Ah 2h 3h 4h 5h");
        const res = evaluateHand(hand);
        assert(res.rank === HandRankType.STRAIGHT_FLUSH, "Should be Straight Flush (Wheel)");
        assert(res.winningCards[0].rank === '5', "High card should be 5");
    });

    test("Four of a Kind (Quads)", () => {
        const hand = parseCards("9h 9d 9c 9s 2h");
        const res = evaluateHand(hand);
        assert(res.rank === HandRankType.QUADS, "Should be Quads");
    });

    test("Full House", () => {
        const hand = parseCards("Td Th Tc 4s 4d");
        const res = evaluateHand(hand);
        assert(res.rank === HandRankType.FULL_HOUSE, "Should be Full House");
    });

    test("Flush", () => {
        const hand = parseCards("Ah 8h 5h 2h Jh"); // Not straight
        const res = evaluateHand(hand);
        assert(res.rank === HandRankType.FLUSH, "Should be Flush");
    });

    test("Straight (Normal)", () => {
        const hand = parseCards("5h 6d 7c 8s 9h");
        const res = evaluateHand(hand);
        assert(res.rank === HandRankType.STRAIGHT, "Should be Straight");
    });

    test("Straight (Wheel A-5)", () => {
        const hand = parseCards("Ah 2d 3c 4s 5h");
        const res = evaluateHand(hand);
        assert(res.rank === HandRankType.STRAIGHT, "Should be Straight (Wheel)");
    });

    test("Three of a Kind (Trips)", () => {
        // Kickers: Q, 2
        const hand = parseCards("7h 7d 7c Qs 2h");
        const res = evaluateHand(hand);
        assert(res.rank === HandRankType.TRIPS, "Should be Trips");
    });

    test("Two Pair", () => {
        // Kickers: A
        const hand = parseCards("Jh Jd 5c 5s Ah");
        const res = evaluateHand(hand);
        assert(res.rank === HandRankType.TWO_PAIR, "Should be Two Pair");
        // Check kickers
    });

    test("One Pair", () => {
        const hand = parseCards("Ah Ad Kc Qs 2h");
        const res = evaluateHand(hand);
        assert(res.rank === HandRankType.PAIR, "Should be Pair");
    });

    test("High Card", () => {
        const hand = parseCards("Ah Kd Qs Js 9h"); // A,K,Q,J,9 (not straight, mixed suits)
        const res = evaluateHand(hand);
        assert(res.rank === HandRankType.HIGH_CARD, "Should be High Card");
    });

    test("Best 5 out of 7", () => {
        // Board: Ah Kh Qh Jh 2c
        // Hand: Th 2d
        // Combined: Ah Kh Qh Jh Th 2c 2d
        // Should ignore the pair of 2s and take the Royal Flush
        const hand = parseCards("Ah Kh Qh Jh 2c Th 2d");
        const res = evaluateHand(hand);
        assert(res.rank === HandRankType.STRAIGHT_FLUSH, "Should pick Royal Flush over Pair/TwoPair");
    });

    console.log("=================================");
    if (failed > 0) {
        console.log(`❌ ${failed} Tests Failed.`);
        console.log(`✅ ${passed} Tests Passed.`);
        process.exit(1);
    } else {
        console.log(`✅ All ${passed} Tests Passed Successfully!`);
    }
}

runTests();
