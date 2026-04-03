/**
 * Super AI 参数网格对比
 * 固定随机种子，比较多组 tuning 在同一批对战下的表现。
 */

import { PokerGameEngine, GAME_RULES, BOT_NAMES, Deck } from '../src/lib/poker-engine';
import type { Player, AIMode, SuperAITuning } from '../src/lib/poker/types';

interface SimulationResult {
    normalWins: number;
    superWins: number;
    gamesPlayed: number;
    normalChipsWon: number;
    superChipsWon: number;
}

interface Candidate {
    name: string;
    tuning?: SuperAITuning;
}

const NORMAL_PLAYER_IDS = [0, 1, 2, 3];
const TOTAL_PLAYERS = 8;
const INITIAL_CHIPS = GAME_RULES.INITIAL_CHIPS;

class MixedAIGameEngine extends PokerGameEngine {
    playerModes: Map<number, AIMode> = new Map();

    constructor(onChange: (snapshot: ReturnType<PokerGameEngine['getSnapshot']>) => void) {
        super(onChange);
    }

    resetGameMixed() {
        if (this._isDestroyed) return;
        this.players = [];
        this.logs = [];
        this.playerModes.clear();

        const shuffledNames = [...BOT_NAMES].sort(() => 0.5 - Math.random());

        for (let i = 0; i < TOTAL_PLAYERS; i++) {
            const isNormalAI = NORMAL_PLAYER_IDS.includes(i);
            const aiMode: AIMode = isNormalAI ? 'normal' : 'super';
            const prefix = isNormalAI ? '[普通]' : '[超级]';

            this.players.push({
                id: i,
                persona: 'bot',
                name: `${prefix}${shuffledNames[i]}`,
                isHuman: false,
                chips: INITIAL_CHIPS,
                hand: [],
                status: 'active',
                currentBet: 0,
                isEliminated: false,
                totalHandBet: 0,
                hasActed: false
            });

            this.playerModes.set(i, aiMode);
        }

        this.deck = new Deck();
        this.communityCards = [];
        this.pot = 0;
        this.dealerIdx = -1;
        this.highestBet = 0;
        this.stage = 'preflop';
        this.actorsLeft = 0;
        this.raisesInRound = 0;
        this.currentTurnIdx = 0;
        this.winners = [];
        this.winningCards = [];
    }

    processTurn() {
        if (this._isDestroyed) return;

        while (true) {
            const currentTurnIdx = this.currentTurnIdx;
            const p = this.players[currentTurnIdx];

            if (!p) return;

            if (p.status === 'folded' || p.isEliminated || p.status === 'allin') {
                if (this.isBetsSettled()) {
                    this.nextStage();
                    return;
                } else {
                    this.currentTurnIdx = this.getNextActive(currentTurnIdx);
                    continue;
                }
            }

            this.notify();
            return;
        }
    }

    aiAction(player: Player) {
        try {
            const playerMode = this.playerModes.get(player.id) || 'normal';
            if (playerMode === 'super') {
                this._superAIActionLogic(player);
            } else {
                this._aiActionLogic(player);
            }
        } catch {
            this.handleAction(player, 'fold');
        }
    }
}

function createSeededRandom(seed: number): () => number {
    let x = seed | 0;
    return () => {
        x ^= x << 13;
        x ^= x >>> 17;
        x ^= x << 5;
        return ((x >>> 0) / 4294967296);
    };
}

async function withSeed<T>(seed: number, fn: () => Promise<T>): Promise<T> {
    const originalRandom = Math.random;
    Math.random = createSeededRandom(seed);
    try {
        return await fn();
    } finally {
        Math.random = originalRandom;
    }
}

async function runSingleGame(
    engine: MixedAIGameEngine,
    maxRounds: number,
    sims: number,
    tuning?: SuperAITuning
): Promise<Player | null> {
    engine.resetGameMixed();
    engine.setAIMode('super');
    engine.superAIConfig = {
        monteCarloSims: sims,
        opponentModeling: true,
        thinkingDelay: 0,
        tuning
    };
    engine.testMode = true;

    let rounds = 0;
    while (rounds < maxRounds) {
        const activePlayers = engine.players.filter(p => !p.isEliminated);
        if (activePlayers.length <= 1) return activePlayers[0] || null;

        engine.startNextRound();
        rounds++;

        let stepCount = 0;
        while (engine.stage !== 'showdown' && stepCount < 220) {
            const currentPlayer = engine.players[engine.currentTurnIdx];
            if (!currentPlayer) break;
            if (currentPlayer.status === 'active' && !currentPlayer.isHuman) {
                engine.aiAction(currentPlayer);
            }
            stepCount++;
        }
    }

    return engine.players
        .filter(p => !p.isEliminated)
        .sort((a, b) => b.chips - a.chips)[0] || null;
}

async function runSimulation(numGames: number, sims: number, tuning?: SuperAITuning): Promise<SimulationResult> {
    const result: SimulationResult = {
        normalWins: 0,
        superWins: 0,
        gamesPlayed: 0,
        normalChipsWon: 0,
        superChipsWon: 0
    };

    for (let i = 0; i < numGames; i++) {
        const engine = new MixedAIGameEngine(() => { });
        const winner = await runSingleGame(engine, 200, sims, tuning);

        if (winner) {
            const winnerMode = engine.playerModes.get(winner.id);
            if (winnerMode === 'normal') result.normalWins++;
            else result.superWins++;

            const normalChips = engine.players
                .filter(p => NORMAL_PLAYER_IDS.includes(p.id))
                .reduce((sum, p) => sum + p.chips, 0);
            const superChips = engine.players
                .filter(p => !NORMAL_PLAYER_IDS.includes(p.id))
                .reduce((sum, p) => sum + p.chips, 0);

            result.normalChipsWon += normalChips;
            result.superChipsWon += superChips;
        }

        result.gamesPlayed++;
        engine.destroy();
    }

    return result;
}

function formatPct(v: number): string {
    return `${(v * 100).toFixed(1)}%`;
}

function parseArgs() {
    const args = process.argv.slice(2);
    const gamesArg = args.find(a => a.startsWith('--games='));
    const simsArg = args.find(a => a.startsWith('--sims='));
    const seedArg = args.find(a => a.startsWith('--seed='));
    return {
        games: gamesArg ? parseInt(gamesArg.split('=')[1], 10) : 80,
        sims: simsArg ? parseInt(simsArg.split('=')[1], 10) : 1000,
        seed: seedArg ? parseInt(seedArg.split('=')[1], 10) : 20260403
    };
}

async function main() {
    const { games, sims, seed } = parseArgs();
    const candidates: Candidate[] = [
        { name: 'baseline' },
        {
            name: 'pressure_plus',
            tuning: {
                ev: { raisePressure: 1.35, raiseValueEdge: 2.15, priorBoost: 0.24 }
            }
        },
        {
            name: 'control_risk',
            tuning: {
                ev: { allInBase: 2.45, deepOpenAllInPenalty: 0.95, foldBase: 2.55 }
            }
        },
        {
            name: 'target_focus',
            tuning: {
                targetSourceWeights: {
                    streetAggressor: 1.15,
                    previousStreetAggressor: 0.8,
                    lastAggressor: 0.45
                },
                ev: { raisePressure: 1.25, bluffRaiseBase: 0.15 }
            }
        },
        {
            name: 'balanced_v2',
            tuning: {
                targetSourceWeights: {
                    streetAggressor: 1.05,
                    previousStreetAggressor: 0.75,
                    lastAggressor: 0.55
                },
                ev: {
                    foldBase: 2.5,
                    callBase: 2.2,
                    raisePressure: 1.3,
                    allInBase: 2.35,
                    priorBoost: 0.26
                }
            }
        }
    ];

    console.log(`\nSuper AI Tuning Benchmark`);
    console.log(`games=${games}, sims=${sims}, seed=${seed}`);
    console.log(`${'-'.repeat(72)}`);

    const rows: Array<{
        name: string;
        superWinRate: number;
        normalWinRate: number;
        avgSuperChips: number;
        avgNormalChips: number;
        tuning?: SuperAITuning;
    }> = [];

    for (const [index, candidate] of candidates.entries()) {
        process.stdout.write(`[${index + 1}/${candidates.length}] ${candidate.name} ... `);
        const result = await withSeed(seed, () => runSimulation(games, sims, candidate.tuning));
        const superWinRate = result.superWins / result.gamesPlayed;
        const normalWinRate = result.normalWins / result.gamesPlayed;
        const avgSuperChips = Math.round(result.superChipsWon / result.gamesPlayed);
        const avgNormalChips = Math.round(result.normalChipsWon / result.gamesPlayed);
        rows.push({
            name: candidate.name,
            superWinRate,
            normalWinRate,
            avgSuperChips,
            avgNormalChips,
            tuning: candidate.tuning
        });
        console.log(`super=${formatPct(superWinRate)}, chips=${avgSuperChips}`);
    }

    const baseline = rows.find(r => r.name === 'baseline');
    rows.sort((a, b) => b.superWinRate - a.superWinRate);

    console.log(`\n${'='.repeat(72)}`);
    console.log(`Ranking (by super win rate)`);
    console.log(`${'='.repeat(72)}`);
    rows.forEach((row, idx) => {
        const delta = baseline ? row.superWinRate - baseline.superWinRate : 0;
        const deltaStr = `${delta >= 0 ? '+' : ''}${(delta * 100).toFixed(1)}pp`;
        console.log(
            `${String(idx + 1).padStart(2, ' ')}. ${row.name.padEnd(14)} ` +
            `super=${formatPct(row.superWinRate).padStart(6)} ` +
            `normal=${formatPct(row.normalWinRate).padStart(6)} ` +
            `chips(S/N)=${String(row.avgSuperChips).padStart(5)}/${String(row.avgNormalChips).padEnd(5)} ` +
            `delta_vs_base=${deltaStr}`
        );
    });

    if (rows.length > 0) {
        console.log(`\nBest candidate: ${rows[0].name}`);
        if (rows[0].tuning) {
            const tuningJson = JSON.stringify(rows[0].tuning, null, 2);
            console.log(`\nSuggested tuning JSON:`);
            console.log(tuningJson);
            console.log(`\nPaste-ready block (for DEFAULT_SUPER_AI_CONFIG.tuning):`);
            console.log(`tuning: ${tuningJson.replace(/\n/g, '\n  ')}`);
        } else {
            console.log(`Best candidate is baseline; keep current tuning settings.`);
        }
    }
}

main().catch((e) => {
    console.error('Benchmark failed:', e);
    process.exit(1);
});
