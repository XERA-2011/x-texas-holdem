import {
  SUITS, RANKS, RANK_VALUE, BOT_NAMES, SPEECH_LINES,
  DEFAULT_SUPER_AI_CONFIG, PREFLOP_HAND_STRENGTH, DEFAULT_GAME_CONFIG
} from './poker/constants';
import { Card, Deck } from './poker/card';
import { evaluateHand } from './poker/evaluator';
import {
  Suit, Rank, HandRankType, HandResult, PersonaType,
  AIMode, SuperAIConfig, OpponentProfile, GameConfig,
  PlayerStatus, Player, GameLog
} from './poker/types';

export {
  SUITS, RANKS, RANK_VALUE, BOT_NAMES, SPEECH_LINES,
  DEFAULT_SUPER_AI_CONFIG, PREFLOP_HAND_STRENGTH, DEFAULT_GAME_CONFIG,
  Card, Deck,
  evaluateHand,
  type Suit, type Rank, HandRankType, type HandResult, type PersonaType,
  type AIMode, type SuperAIConfig, type OpponentProfile, type GameConfig,
  type PlayerStatus, type Player, type GameLog
};

function createDefaultProfile(playerId: number): OpponentProfile {
  return {
    playerId,
    vpip: 0.5,
    pfr: 0.2,
    aggression: 1.0,
    handsPlayed: 0,
    showdownStrengths: []
  };
}

export class PokerGameEngine {
  onChange: (snapshot: ReturnType<PokerGameEngine['getSnapshot']>) => void;

  players: Player[];
  logs: GameLog[];
  deck!: Deck;
  roundId: number = 0;
  communityCards!: Card[];
  pot!: number;
  dealerIdx!: number;
  highestBet!: number;
  stage!: 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
  actorsLeft!: number;
  raisesInRound!: number;
  currentTurnIdx!: number;

  testMode: boolean = false;
  isFastForwarding: boolean = false;
  private _isDestroyed: boolean = false;

  winners: number[] = [];
  winningCards: Card[] = [];
  lastRaiseAmount: number = 0;
  bigBlind: number = 10;

  // ============ 超级电脑模式属性 ============
  /** 当前 AI 模式 */
  aiMode: AIMode = 'normal';
  /** 超级 AI 配置 */
  superAIConfig: SuperAIConfig = { ...DEFAULT_SUPER_AI_CONFIG };
  /** 对手建模档案 Map */
  opponentProfiles: Map<number, OpponentProfile> = new Map();

  // ============ 对局倒数功能属性 ============
  /** 局数上限 (null = 无限制) */
  roundLimit: number | null = null;
  /** 当前第几局 (从1开始) */
  currentRoundNumber: number = 0;
  /** 本轮对局是否完成 */
  isSessionComplete: boolean = false;
  /** 初始筹码 (用于计算变化) */
  initialChips: number = 1000;

  constructor(onChange: (snapshot: ReturnType<PokerGameEngine['getSnapshot']>) => void) {
    this.onChange = onChange;
    this.players = [];
    this.logs = [];

    this.resetGame();
  }

  destroy() {
    this._isDestroyed = true;
  }


  resetGame() {
    if (this._isDestroyed) return;
    this.players = [];

    this.logs = [];

    // Initialize Random Expert Players
    const shuffledNames = [...BOT_NAMES].sort(() => 0.5 - Math.random());

    for (let i = 0; i < 7; i++) {
      const isHuman = i === 0;
      this.players.push({
        id: i,
        persona: isHuman ? 'human' : 'bot',
        name: isHuman ? 'You' : shuffledNames[i - 1],
        isHuman: isHuman,
        chips: 1000,
        hand: [],
        status: 'active',
        currentBet: 0,
        isEliminated: false,
        totalHandBet: 0,
        hasActed: false
      });
    }

    this.deck = new Deck();
    this.communityCards = [];
    this.pot = 0;
    this.dealerIdx = -1; // Initialize to -1 so first round rotation sets it to 0 (User)
    this.highestBet = 0;
    this.stage = 'preflop';
    this.actorsLeft = 0;
    this.raisesInRound = 0;
    this.currentTurnIdx = 0;
    this.winners = [];
    this.winningCards = [];

    this.notify();
    // Do NOT auto start. Let the UI/Control invoke startNextRound.
    // this.startNextRound(); 
  }

  startNextRound() {
    if (this._isDestroyed) return;

    // 对局倒数检查
    if (this.roundLimit !== null && this.currentRoundNumber >= this.roundLimit) {
      this.isSessionComplete = true;
      this.notify();
      return;
    }

    this.currentRoundNumber++;
    this.roundId++; // Invalidate previous timers
    this.stage = 'preflop';

    this.communityCards = [];
    this.pot = 0;
    this.highestBet = 0;
    this.raisesInRound = 0;
    this.lastRaiseAmount = this.bigBlind; // 基础加注增量为大盲注
    this.winners = [];
    this.logs = []; // Clear logs for new round
    this.winningCards = [];

    // Eliminate players with no chips
    this.players.forEach(p => {
      if (p.chips <= 0) {
        p.isEliminated = true;
        p.status = 'eliminated';
        p.chips = 0; // 确保不为负数
      }
    });

    // Rotate dealer
    this.dealerIdx = (this.dealerIdx + 1) % this.players.length;
    while (this.players[this.dealerIdx].isEliminated) {
      this.dealerIdx = (this.dealerIdx + 1) % this.players.length;
    }

    // 重置玩家状态
    this.players.forEach(p => {
      p.hand = [];
      p.status = p.isEliminated ? 'eliminated' : 'active';
      p.currentBet = 0;
      p.currentBet = 0;
      p.totalHandBet = 0;
      p.hasActed = false;
      p.currentSpeech = undefined;
      p.speechTs = undefined;
      p.isBluffing = false;
      p.handDescription = undefined;
    });

    this.deck = new Deck();
    this.deck.shuffle();

    // 发牌
    this.players.filter(p => !p.isEliminated).forEach(p => {
      p.hand.push(this.deck.deal()!);
      p.hand.push(this.deck.deal()!);
    });

    // 盲注
    let sbIdx = this.getNextActive(this.dealerIdx);

    // 单挑规则修正：在双人游戏中，庄家是小盲注
    const activePlayers = this.players.filter(p => !p.isEliminated);
    if (activePlayers.length === 2) {
      sbIdx = this.dealerIdx;
    }

    const bbIdx = this.getNextActive(sbIdx);

    this.bet(this.players[sbIdx], 5);
    this.bet(this.players[bbIdx], 10);
    this.highestBet = 10;

    this.log(`庄家 ${this.players[this.dealerIdx].name}, 盲注 $5/$10`, 'phase');

    this.prepareBettingRound(this.getNextActive(bbIdx));
    this.notify();
  }

  handleFoldWin(winner: Player) {
    // 1. 退还 winner 没有被匹配的下注 (Uncalled Bet)
    // 计算其实际被匹配的金额（即第二高下注额）
    // 注意：这里需要遍历所有玩家本轮（或本局？）的下注来决定。
    // 为简化：如果获胜者这轮下注了 X，而其他人这轮最多下注了 Y (Y < X)，那么 (X - Y) 退回。
    // 但对于复杂的边池，Fold Win 通常意味着他拿走底池中所有钱。
    // 唯一例外：如果他是因为 All-in 吓跑所有人，他这轮的 Action 其实是 "跟注" 或 "加注"。
    // 正确做法：将 winner.currentBet 与第二高 currentBet 比较。

    const others = this.players.filter(p => p.id !== winner.id);
    const maxOpponentBet = Math.max(0, ...others.map(p => p.currentBet));

    let returnAmount = 0;
    if (winner.currentBet > maxOpponentBet) {
      returnAmount = winner.currentBet - maxOpponentBet;
      // 从底池扣除
      this.pot -= returnAmount;
      // 退还
      winner.chips += returnAmount;
      // 修正 winner 的数据以反映实际投入 (用于日志或逻辑？虽然现在游戏结束了)
      winner.currentBet = maxOpponentBet;
      winner.totalHandBet -= returnAmount;
    }

    // 赢走剩余底池（死钱）
    const winAmount = this.pot;
    winner.chips += winAmount;
    this.pot = 0;

    this.winners = [winner.id];
    // 清空 winning cards 因为没有摊牌
    this.winningCards = [];

    if (returnAmount > 0) {
      this.log(`${winner.name} 拿回 $${returnAmount} (未被跟注)`, 'win');
    }
    this.log(`${winner.name} 赢得了 $${winAmount} (其他玩家弃牌)`, 'win');

    this.stage = 'showdown';
    this.currentTurnIdx = -1;
    this.notify();
  }

  showdown() {
    this.log('摊牌!', 'phase');
    const activePlayers = this.players.filter(p => !p.isEliminated && p.status !== 'folded');
    const foldedPlayers = this.players.filter(p => !p.isEliminated && p.status === 'folded');

    // 如果只剩一名玩家，直接获胜（理论上在 prepareBettingRound 已处理，这也是防御性代码）
    if (activePlayers.length === 1) {
      this.handleFoldWin(activePlayers[0]);
      return;
    }

    // 1. 评估所有活跃玩家手牌
    const results = activePlayers.map(p => ({
      player: p,
      result: evaluateHand([...p.hand, ...this.communityCards])
    }));

    // 2. 显示牌型描述 (日志)
    results.forEach(({ player, result }) => {
      let info = this.getHandDetailedDescription(result);
      const isPlayingBoard = result.bestHand.every(wc =>
        this.communityCards.some(cc => cc.suit === wc.suit && cc.rank === wc.rank)
      );
      if (isPlayingBoard) info += " (Board)";
      player.handDescription = info;
      this.log(`${player.name} 亮牌: ${this.formatCards(player.hand)} (${info})`, 'showdown');
    });

    // --- 3. 边池与分池分配逻辑 (Side Pot Distribution) ---
    // 核心思想：
    // 将所有玩家（无论是否弃牌）的有效下注 (totalHandBet) 收集起来。
    // 按下注额从小到大分层 (Levels)。每一层构成一个“边池”。
    // 只有在该层有下注 且 没有弃牌的玩家，才有资格争夺该层的奖金。

    try {
      const allContributors = [...activePlayers, ...foldedPlayers];
      // 提取所有人的下注额
      const bets = allContributors.map(p => ({ id: p.id, amount: p.totalHandBet }));

      // 找出所有唯一的非零下注额，从小到大排序
      const betLevels = Array.from(new Set(bets.map(b => b.amount).filter(a => a > 0))).sort((a, b) => a - b);

      let processedBet = 0;

      // 临时记录每个玩家赢得的总金额，用于最后日志汇总
      const playerWins: Record<number, { winnings: number, refund: number, types: string[] }> = {};

      this.winners = [];
      this.winningCards = []; // 主池赢家的牌

      // 遍历每一级下注 (Side Pot Slices)
      for (const level of betLevels) {
        const sliceAmount = level - processedBet;
        if (sliceAmount <= 0) continue;

        // 1) 计算当前层底池大小
        // 所有下注额 >= level 的人，都贡献了 sliceAmount
        const contributors = bets.filter(b => b.amount >= level);
        const potSlice = contributors.length * sliceAmount;

        // 2) 找出有资格赢这个池子的人
        // 资格：Active (未弃牌) 且 下注额 >= level
        const eligiblePlayers = activePlayers.filter(p => p.totalHandBet >= level);

        if (eligiblePlayers.length === 0) {
          // 异常情况：此层无人有资格赢 (例如大家都弃牌了？不可能，这里是showdown)
        } else if (eligiblePlayers.length === 1) {
          // 3) 退款情况 (Run-off / Refund)
          // 只有1个人达到了这个注额深度（通常是最大的那个 All-in 者）。
          const winner = eligiblePlayers[0];

          if (!playerWins[winner.id]) playerWins[winner.id] = { winnings: 0, refund: 0, types: [] };

          // 区分是 “退款” 还是 “赢取弃牌死钱”
          if (contributors.length === 1) {
            // 只有他自己下注到这 -> 纯退款
            playerWins[winner.id].refund += potSlice;
            playerWins[winner.id].types.push('退回');
          } else {
            // 有人跟了但弃牌了 -> 赢死钱
            playerWins[winner.id].winnings += potSlice;
            playerWins[winner.id].types.push('边池');
            if (!this.winners.includes(winner.id)) this.winners.push(winner.id);
          }

        } else {
          // 4) 竞争情况 (Showdown for this slice)
          // 在 eligiblePlayers 中比牌
          const eligibleResults = results.filter(r => r.player.totalHandBet >= level);

          // 排序
          eligibleResults.sort((a, b) => {
            if (a.result.rank !== b.result.rank) return b.result.rank - a.result.rank;
            return b.result.score - a.result.score;
          });

          const bestRes = eligibleResults[0];
          const winnersForSlice = eligibleResults.filter(r =>
            r.result.rank === bestRes.result.rank &&
            Math.abs(r.result.score - bestRes.result.score) < 0.001
          );

          // 如果是第一层（主池），记录 Winning Cards
          if (processedBet === 0) {
            this.winningCards = bestRes.result.winningCards;
          }

          // 分钱
          const share = Math.floor(potSlice / winnersForSlice.length);
          const remainder = potSlice % winnersForSlice.length;

          winnersForSlice.forEach((r, idx) => {
            const w = r.player;
            const winAmt = share + (idx < remainder ? 1 : 0); // 分配零头

            if (!playerWins[w.id]) playerWins[w.id] = { winnings: 0, refund: 0, types: [] };
            playerWins[w.id].winnings += winAmt;

            // 标记类型
            const isMainPot = eligiblePlayers.length === activePlayers.length;
            const type = isMainPot ? '主池' : '边池';
            if (!playerWins[w.id].types.includes(type)) {
              playerWins[w.id].types.push(type);
            }

            if (!this.winners.includes(w.id)) this.winners.push(w.id);
          });
        }

        processedBet = level;
      }

      // 4. 应用结果并产生日志
      Object.keys(playerWins).forEach(pidStr => {
        const pid = parseInt(pidStr);
        const p = this.players.find(pl => pl.id === pid);
        const winData = playerWins[pid];

        if (p) {
          p.chips += winData.refund + winData.winnings;

          // 1. 先报退款
          if (winData.refund > 0) {
            this.log(`${p.name} 拿回 $${winData.refund} (退回)`, 'win');
          }

          // 2. 再报盈利
          if (winData.winnings > 0) {
            // 过滤掉 '退回' 类型，只保留主池/边池
            const realTypes = Array.from(new Set(winData.types.filter(t => t !== '退回')));
            const typeStr = realTypes.length > 0 ? realTypes.join(' & ') : '主池';
            this.log(`${p.name} 赢得 $${winData.winnings} (${typeStr})`, 'win');
          }
        }
      });

    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error("Critical Error in SidePot Logic:", e);
      this.log(`结算错误: ${errorMessage}`, 'phase');
      // Fallback: 给第一名 active 玩家
      if (activePlayers.length > 0) {
        activePlayers[0].chips += this.pot;
      }
    }

    this.pot = 0;
    this.notify();
  }

  handleAction(player: Player, action: 'fold' | 'call' | 'raise' | 'allin', raiseAmount: number = 0) {
    if (player.status === 'folded' || player.isEliminated || player.status === 'allin') return;

    const callAmount = this.highestBet - player.currentBet;

    switch (action) {
      case 'fold':
        player.status = 'folded';
        this.log(`${player.name} 弃牌`, 'action');
        break;
      case 'call':
        if (callAmount === 0) { // 过牌
          this.log(`${player.name} 让牌/过牌`, 'action');
          player.hasActed = true;
        } else {
          // 检查跟注是否让玩家全压
          const chipsToBet = Math.min(callAmount, player.chips);
          this.bet(player, chipsToBet);

          if (player.chips === 0) {
            this.log(`${player.name} All In (跟注) $${chipsToBet}`, 'action');
          } else {
            this.log(`${player.name} 跟注 $${chipsToBet}`, 'action');
          }
          player.hasActed = true;
        }
        break;
      case 'raise':
        const minRaise = Math.max(this.bigBlind, this.lastRaiseAmount);

        if (raiseAmount < minRaise) raiseAmount = minRaise;

        const totalBet = callAmount + raiseAmount;

        if (totalBet >= player.chips) { // 视为全压
          this.handleAction(player, 'allin');
          return;
        }

        this.bet(player, totalBet);

        this.lastRaiseAmount = raiseAmount;

        this.highestBet = player.currentBet;
        this.raisesInRound++;
        this.log(`${player.name} 加注到 $${player.currentBet}`, 'action');
        player.hasActed = true;
        break;
      case 'allin':
        const allInAmt = player.chips;
        this.bet(player, allInAmt);

        if (player.currentBet > this.highestBet) {
          this.highestBet = player.currentBet;
          this.raisesInRound++;
          this.log(`${player.name} All In! ($${player.currentBet})`, 'action');
        } else if (player.currentBet === this.highestBet) {
          this.log(`${player.name} All In (跟注) $${player.currentBet}`, 'action');
        } else {
          this.log(`${player.name} All In (短码) $${player.currentBet}`, 'action');
        }
        player.hasActed = true;
        break;
    }

    // ============ 对手建模：收集统计数据 ============
    if (this.aiMode === 'super' && this.superAIConfig.opponentModeling && !player.isHuman) {
      this._updateOpponentProfile(player, action);
    }

    this.finishTurn();
  }

  // Debug / AI Testing Mechanism
  // 生成并结算随机All-in局 (Synchronous Simulation)
  simulateRandomHand() {
    // 1. Reset lightweight state
    const deck = new Deck();
    this.communityCards = [deck.deal()!, deck.deal()!, deck.deal()!, deck.deal()!, deck.deal()!];
    this.pot = 0;
    this.logs = [];
    this.winners = [];
    this.winningCards = [];
    this.players = [];

    // 2. Create random players (2-9)
    const numPlayers = 2 + Math.floor(Math.random() * 8);
    for (let i = 0; i < numPlayers; i++) {
      // Random stack sizes for side-pot complexity
      const startingChips = 100 + Math.floor(Math.random() * 1900);

      this.players.push({
        id: i,
        name: `Bot${i}`,
        persona: 'bot',
        isHuman: false,
        chips: 0, // Assuming All-in
        hand: [deck.deal()!, deck.deal()!],
        status: 'active',
        currentBet: 0,
        totalHandBet: startingChips, // They bet everything
        hasActed: true,
        isEliminated: false
      });
      this.pot += startingChips;
    }

    // 3. Invoke Showdown directly
    // showdown() uses logs, players, pot.
    this.showdown();

    // 4. Return summary for AI analysis
    return {
      id: Math.random().toString(36).substr(2, 5),
      board: this.formatCards(this.communityCards),
      potTotal: this.players.reduce((acc, p) => acc + p.totalHandBet, 0),
      payoutTotal: this.players.reduce((acc, p) => acc + p.chips, 0),
      players: this.players.map(p => ({
        name: p.name,
        hand: this.formatCards(p.hand),
        bet: p.totalHandBet,
        win: p.chips, // Chips they have now (which they won, since they started at 0 after all-in)
        desc: p.handDescription,
        bestHand: p.handDescription // Simplification
      })),
      logs: this.logs.map(l => l.message),
      valid: Math.abs(this.players.reduce((acc, p) => acc + p.chips, 0) - this.players.reduce((acc, p) => acc + p.totalHandBet, 0)) < 1
    };
  }

  getSnapshot() {
    return {
      players: this.players,
      communityCards: this.communityCards,
      pot: this.pot,
      dealerIdx: this.dealerIdx,
      highestBet: this.highestBet,
      currentTurnIdx: this.currentTurnIdx,
      stage: this.stage,
      logs: this.logs,
      winners: this.winners,
      winningCards: this.winningCards,
      aiMode: this.aiMode,
      // 对局倒数功能
      roundLimit: this.roundLimit,
      currentRoundNumber: this.currentRoundNumber,
      isSessionComplete: this.isSessionComplete,
      initialChips: this.initialChips
    };
  }

  log(message: string, type: GameLog['type'] = 'normal') {
    this.logs.unshift({
      id: Math.random().toString(36).substr(2, 9),
      message,
      type
    });
    // 保留最多 50 条日志
    if (this.logs.length > 50) this.logs.pop();
  }

  notify() {
    if (this._isDestroyed) return;
    this.onChange(this.getSnapshot());
  }

  formatCards(cards: Card[]) {
    return cards.map(c => c.toString()).join(' ');
  }

  getRankName(rank: HandRankType): string {
    const names = [
      'High Card 高牌',
      'Pair 对子',
      'Two Pair 两对',
      'Trips 三条',
      'Straight 顺子',
      'Flush 同花',
      'Full House 葫芦',
      'Quads 四条',
      'Straight Flush 同花顺'
    ];
    return names[rank];
  }

  getHandDetailedDescription(result: HandResult): string {
    const rank = result.rank;
    const cards = result.winningCards;

    // 获取格式化等级的助手
    const r = (i: number) => cards[i].rank;

    switch (rank) {
      case HandRankType.STRAIGHT_FLUSH:
        return `同花顺 (${r(0)} High)`;
      case HandRankType.QUADS:
        return `四条 (${r(0)})`;
      case HandRankType.FULL_HOUSE:
        // 葫芦：winningCards[0] 是三条，winningCards[3] 是对子
        return `葫芦 (${r(0)} & ${r(3)})`;
      case HandRankType.FLUSH:
        return `同花 (${r(0)} High)`;
      case HandRankType.STRAIGHT:
        return `顺子 (${r(0)} High)`;
      case HandRankType.TRIPS:
        return `三条 (${r(0)})`;
      case HandRankType.TWO_PAIR:
        // 两对：P1 在 [0]，P2 在 [2]
        return `两对 (${r(0)} & ${r(2)})`;
      case HandRankType.PAIR:
        return `对子 (${r(0)})`;
      case HandRankType.HIGH_CARD:
        return `高牌 (${r(0)})`;
      default:
        return this.getRankName(rank);
    }
  }

  getNextActive(idx: number): number {
    let next = (idx + 1) % this.players.length;
    let loopCount = 0;
    while ((this.players[next].status === 'folded' || this.players[next].isEliminated) && loopCount < this.players.length) {
      next = (next + 1) % this.players.length;
      loopCount++;
    }
    return next;
  }

  bet(player: Player, amount: number) {
    if (player.chips < amount) amount = player.chips; // 全压
    player.chips -= amount;
    player.currentBet += amount;
    player.totalHandBet += amount;
    this.pot += amount;
    if (player.chips === 0) player.status = 'allin';
  }

  prepareBettingRound(startIdx: number) {
    this.currentTurnIdx = startIdx;

    // 弃牌获胜检查
    const nonFolded = this.players.filter(p => !p.isEliminated && p.status !== 'folded');
    if (nonFolded.length <= 1) {
      // 不要进入 Showdown 阶段，而是直接结算
      if (nonFolded.length === 1) {
        this.handleFoldWin(nonFolded[0]);
      }
      return;
    }

    // 全压 / 自动运行检查
    this.actorsLeft = this.players.filter(p => p.status === 'active').length;
    if (this.actorsLeft <= 1 && !this.isFastForwarding) {
      this.runRemainingStages();
      return;
    }

    if (!this.isFastForwarding) {
      this.processTurn();
    }
  }

  humanAction(type: 'fold' | 'call' | 'raise' | 'allin', raiseAmount: number = 20) {
    const p = this.players[0];
    if (this.currentTurnIdx !== 0 || p.status !== 'active') return;
    this.handleAction(p, type, raiseAmount);
  }

  processTurn() {
    try {
      if (this._isDestroyed) return;
      const p = this.players[this.currentTurnIdx];

      if (!p) return;

      if (p.status === 'folded' || p.isEliminated || p.status === 'allin') {
        if (this.isBetsSettled()) {
          this.nextStage();
        } else {
          if (this._isDestroyed) return;
          this.currentTurnIdx = this.getNextActive(this.currentTurnIdx);
          const currentRoundId = this.roundId;
          setTimeout(() => {
            if (this.roundId === currentRoundId) this.processTurn();
          }, 100);
        }
        return;

      }

      this.notify();

      if (!p.isHuman) {
        const currentRoundId = this.roundId;
        setTimeout(() => {
          if (this._isDestroyed || this.roundId !== currentRoundId) return;
          this.aiAction(p);
        }, 800 + Math.random() * 1000);
      }

    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      this.log(`Critical Error in processTurn: ${errorMessage}`, 'phase');
      console.error(e);
    }
  }

  isBetsSettled(): boolean {
    const active = this.players.filter(p => !p.isEliminated && p.status !== 'folded');
    if (active.length === 0) return true;
    const amount = this.highestBet;
    // 所有活跃玩家必须下注等于 highestBet 或全压
    // 并且每个人都必须有机会行动？
    // 简化：检查所有活跃玩家是否匹配最高下注。
    // 所有活跃玩家必须下注等于 highestBet 或全压
    // 并且每个人都必须在本轮行动。
    return active.every(p => {
      if (p.status === 'allin') return true;
      return p.currentBet === amount && p.hasActed;
    });
    // actorsLeft 逻辑比较棘手。我们要不只是检查每个人是否匹配下注并且我们已经转了一圈？
    // 我们将依赖一个简单的检查：
    // 如果每个人都匹配下注，并且我们不是在回合中间...
    // 理想情况下我们追踪 'playersYetToAct'。
    // 对于这个 MV 逻辑，让我们更新 `advanceTurn` 来检查这个。
  }

  nextStage() {
    this.currentTurnIdx = -1; // 清除回合

    this.players.forEach(p => {
      p.currentBet = 0;
      p.hasActed = false;
    });
    this.highestBet = 0;
    this.raisesInRound = 0;
    this.lastRaiseAmount = this.bigBlind; // 重置新一轮的最小加注

    if (this.stage === 'preflop') {
      this.stage = 'flop';
      this.communityCards.push(this.deck.deal()!, this.deck.deal()!, this.deck.deal()!);
      this.log(`翻牌: ${this.formatCards(this.communityCards)}`, 'phase');
    } else if (this.stage === 'flop') {
      this.stage = 'turn';
      this.communityCards.push(this.deck.deal()!);
      this.log(`转牌: ${this.communityCards[3]}`, 'phase');
    } else if (this.stage === 'turn') {
      this.stage = 'river';
      this.communityCards.push(this.deck.deal()!);
      this.log(`河牌: ${this.communityCards[4]}`, 'phase');
    } else {
      this.stage = 'showdown';
      this.showdown();
      return;
    }

    this.prepareBettingRound(this.getNextActive(this.dealerIdx));
    this.notify();
  }

  runRemainingStages() {
    if (this.isFastForwarding) return;
    this.isFastForwarding = true;
    try {
      // 仅仅快进
      while (this.stage !== 'showdown') {
        this.nextStage();
        // 安全中断
        if (this.players.filter(p => !p.isEliminated && p.status !== 'folded').length <= 1) break;
      }
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      this.log(`Error in runRemainingStages: ${errorMessage}`, 'phase');
    } finally {
      this.isFastForwarding = false;
    }
  }

  // 在这里完成 handleAction 逻辑更安全：
  finishTurn() {
    // 检查是否只剩一名玩家 (其他人都弃牌了)
    const active = this.players.filter(p => !p.isEliminated && p.status !== 'folded');
    if (active.length === 1) {
      this.handleFoldWin(active[0]);
      return;
    }

    if (this.isBetsSettled()) {
      this.nextStage();
    } else {
      this.currentTurnIdx = this.getNextActive(this.currentTurnIdx);
      this.processTurn();
    }
  }
  // 重新实现 aiAction 并添加发言助手

  speak(player: Player, text: string) {
    player.currentSpeech = text;
    player.speechTs = Date.now();
    this.notify();

    // 3秒后自动清除
    setTimeout(() => {
      if (this._isDestroyed) return;
      if (player.currentSpeech === text) {
        player.currentSpeech = undefined;
        this.notify();
      }
    }, 3000);

  }

  aiAction(player: Player) {
    try {
      // 根据 AI 模式选择不同的决策逻辑
      if (this.aiMode === 'super') {
        this._superAIActionLogic(player);
      } else {
        this._aiActionLogic(player);
      }
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      this.log(`AI Error (${player.name}): ${errorMessage}`, 'action');
      console.error(e);
      // 后备方案：如果出错则弃牌以保持游戏进行
      this.handleAction(player, 'fold');
    }
  }

  _getHandStrength(player: Player): number {
    // 0.0 到 1.0 (近似胜率)
    const hole = player.hand;
    if (hole.length < 2) return 0;

    const community = this.communityCards;
    const fullHand = [...hole, ...community];

    // --- 翻牌前启发式 (Preflop) ---
    if (community.length === 0) {
      const v1 = hole[0].value;
      const v2 = hole[1].value;
      const suited = hole[0].suit === hole[1].suit;
      const pair = v1 === v2;
      const highVal = Math.max(v1, v2);
      const gap = highVal - Math.min(v1, v2);

      let score = 0;
      if (pair) {
        score = Math.max(20, highVal * 3); // 对子价值: 22=20分, AA=42分
      } else {
        score = highVal + (Math.min(v1, v2) / 2); // 高牌
      }

      if (suited) score += 3;
      if (gap === 1) score += 2; // 连张
      else if (gap === 2) score += 1;

      // AA ~ 45分 -> 1.0 (Strong)
      // 72o ~ 8.5分 -> 0.2 (Weak)
      // JTs ~ 11+5+3+2 = 21 -> 0.5 (Medium)
      return Math.min(Math.max(score / 45, 0.1), 1.0);
    }

    // --- 翻牌后 (Postflop) ---
    const res = evaluateHand(fullHand);
    let strength = 0;

    // 1. 成牌强度 (Made Hand)
    switch (res.rank) {
      case HandRankType.HIGH_CARD: strength = 0.1 + (res.score % 15 / 150); break; // 0.1 - 0.2
      case HandRankType.PAIR:
        // 顶对(Top Pair) vs底对(Bottom Pair)
        // 简单处理: 只要是对子，基础分 0.3，越大越好，最高0.55
        strength = 0.25 + (res.score % 15 / 50);
        break;
      case HandRankType.TWO_PAIR: strength = 0.6; break;
      case HandRankType.TRIPS: strength = 0.75; break;
      case HandRankType.STRAIGHT: strength = 0.85; break;
      case HandRankType.FLUSH: strength = 0.9; break;
      case HandRankType.FULL_HOUSE: strength = 0.95; break;
      case HandRankType.QUADS: strength = 0.99; break;
      case HandRankType.STRAIGHT_FLUSH: strength = 1.0; break;
    }

    // 2. 听牌潜力 (Draw Potential) - 鼓励半诈唬 (Semi-Bluff)
    // 检查有没有同花听牌 (4张同花)
    if (res.rank < HandRankType.FLUSH) {
      const suitCounts: Record<string, number> = {};
      fullHand.forEach(c => suitCounts[c.suit] = (suitCounts[c.suit] || 0) + 1);
      const isFlushDraw = Object.values(suitCounts).some(count => count === 4);
      if (isFlushDraw) strength += 0.15; // 听花很强
    }

    // 检查顺子听牌 (简化版：这也是最耗性能的部分，简单检查是否有4张连或间断连)
    if (res.rank < HandRankType.STRAIGHT) {
      // 这里不做复杂检查，简单假设如果 strength 很低但有两张高牌或连张，给予一点点潜力分
      // 真正的顺子听牌检查比较复杂，暂略，用 FlushDraw 代表听牌倾向
    }

    return Math.min(strength, 1.0);
  }

  _aiActionLogic(player: Player) {
    const callAmt = this.highestBet - player.currentBet;
    const strength = this._getHandStrength(player);
    const potOdds = callAmt > 0 ? callAmt / (this.pot + callAmt) : 0;

    // 个性化因子 (每回合、每个玩家随机波动，模拟情绪)
    // boldness > 1.0: 激进/上头, boldness < 1.0: 谨慎/害怕
    const boldness = 0.8 + Math.random() * 0.4; // 0.8 ~ 1.2

    // 如果之前赢过/输过，可以影响 boldness (暂略)

    // 修正强度感知
    let perceivedStrength = strength * boldness;

    // 行动阈值 (更激进的默认设置)
    let foldThresh = 0.25;  // 低于此直接弃
    const callThresh = 0.4;   // 高于此考虑跟/加
    const raiseThresh = 0.65; // 高于此强烈考虑加注
    let allInThresh = 0.90; // 绝杀

    // 动态调整阈值
    if (this.stage === 'preflop') {
      // Preflop 宽松策略：为了增加博弈感，大幅降低弃牌门槛
      // 只要不是极端的垃圾牌 (72o 这种)，或者对方加注极其离谱，都尽量看翻牌

      const bb = this.bigBlind;
      const isSmallBet = callAmt <= bb * 3;

      if (isSmallBet) {
        foldThresh = 0.15; // 面对小注，几乎全跟
      } else {
        foldThresh = 0.22; // 面对正常加注，也比较松
      }

      allInThresh = 0.96;
    }
    // 面对大注的"恐惧"逻辑
    // 如果跟注额超过底池的 50% 或者超过自己筹码的 40%，需要更强的牌
    const isBigBet = (callAmt > this.pot * 0.5) || (callAmt > player.chips * 0.4);
    if (isBigBet) {
      perceivedStrength -= 0.1; // 吓到了，手牌感觉变弱了
      // 甚至可能诈唬失败
      if (player.isBluffing) perceivedStrength -= 0.2;
    }

    // --- Progressive All-in Logic (User Request) ---
    // 能够主动 All-in 的概率随着公共牌数量增加而增加
    // Preflop(0): 0.1%, Flop(3): 2%, Turn(4): 5%, River(5): 10%
    const cardCount = this.communityCards.length;
    let randomAllInProb = 0;
    switch (cardCount) {
      case 0: randomAllInProb = 0.001; break;
      case 3: randomAllInProb = 0.02; break;
      case 4: randomAllInProb = 0.05; break;
      case 5: randomAllInProb = 0.10; break;
    }

    // 个性加成: 越激进(boldness高)概率越大
    randomAllInProb *= boldness;

    let forceAllIn = false;
    // 只有手牌还可以(>0.25)或者正在诈唬时，才触发这种“上头”式 All-in
    // 避免 72o 这种纯垃圾牌无意义送死 (除非是在偷鸡)
    if ((strength > 0.25 || player.isBluffing) && Math.random() < randomAllInProb) {
      forceAllIn = true;
    }

    // --- 决策核心 ---
    let action: 'fold' | 'call' | 'raise' | 'allin' = 'fold';
    const rnd = Math.random();

    // 1. 偷鸡 / 诈唬逻辑 (Bluff / Steal)
    // 条件：位置靠后(比如最后2人)，且没人加注(raisesInRound=0)，且手牌极烂
    const isLatePosition = this.currentTurnIdx > (this.players.length * 0.6); // 粗略位置
    const canSteal = (this.raisesInRound === 0 && callAmt === 0 && isLatePosition);

    // 0. 强制 All-in (Over-rides everything)
    if (forceAllIn) {
      action = 'allin';
    }
    // 激进策略：如果能偷，且 boldness 高，就偷
    else if (canSteal && boldness > 1.0 && rnd < 0.4) {
      player.isBluffing = true;
      action = 'raise'; // 偷鸡加注
    }
    // 常规诈唬：牌力弱但还没到弃牌，偶尔诈唬
    else if (strength < 0.4 && strength > 0.15 && rnd < 0.15 * boldness) {
      player.isBluffing = true;
      action = 'raise';
    }
    // 正常决策
    else {
      player.isBluffing = false;

      if (perceivedStrength > allInThresh) {
        // 强牌：大部分时候加注/全压，偶尔慢打(Call)钓鱼
        if (rnd < 0.7) action = 'allin';
        else if (rnd < 0.9) action = 'raise';
        else action = 'call'; // 慢打
      }
      else if (perceivedStrength > raiseThresh) {
        if (rnd < 0.6 * boldness) action = 'raise';
        else action = 'call';
      }
      else if (perceivedStrength > callThresh) {
        // 中等牌：跟注为主，偶尔试探性加注
        if (rnd < 0.2 * boldness && this.raisesInRound < 2) action = 'raise';
        else action = 'call';
      }
      else if (perceivedStrength > foldThresh) {
        // 边缘牌：看赔率
        // 如果赔率好(potOdds低) 或者 只需要过牌(callAmt=0) -> 跟/过
        if (callAmt === 0) action = 'call'; // Check
        else if (strength > potOdds) action = 'call';
        else action = 'fold';
      }
      else {
        // 垃圾牌
        if (callAmt === 0) action = 'call'; // 免费看牌
        else action = 'fold';
      }
    }

    // --- 1.5 好奇心机制 (Curiosity Catch) ---
    // 如果决定 Fold，但目前是 Preflop 且代价不高，有概率强行 Call
    // 模拟玩家 "我就看一眼翻牌" 的心态
    if (action === 'fold' && this.stage === 'preflop') {
      const costRatio = callAmt / player.chips;
      // 如果跟注额小于筹码的 10%，且小于 5倍大盲 (相对便宜)
      if (costRatio < 0.10 && callAmt <= this.bigBlind * 5) {
        // 随机给予 30% - 60% 的跟注机会 (取决于性格 boldness)
        if (rnd < 0.4 * boldness) {
          action = 'call';
        }
      }
    }

    // --- 2. 合理性检查和覆盖 ---
    // 如果没钱了，只能 Allin 或 Fold
    if (callAmt >= player.chips) {
      if (action === 'raise' || action === 'call') action = 'allin';
    }

    // 如果 Raise 意图，但其实只能 Allin (筹码不足最小加注)
    if (action === 'raise' && player.chips <= callAmt + this.bigBlind) {
      action = 'allin';
    }

    // 如果 Allin 但其实牌力不够强，再次确认 (防止诈唬送死)
    if (action === 'allin' && strength < 0.6 && !player.isBluffing) {
      // 除非只有一点点筹码了，那就赌了
      if (player.chips > this.pot * 0.2) action = 'fold';
    }

    // 执行
    if (action === 'raise') this.handleAction(player, 'raise', this.bigBlind * (Math.floor(Math.random() * 3) + 1));
    else this.handleAction(player, action);

    // --- 3. 发言 (保持原样) ---
    const speakChance = 0.4; // 稍微降低说话频率

    let speechType: keyof typeof SPEECH_LINES['bot'] = 'call';
    const isCheck = (action === 'call' && callAmt === 0);

    if (action === 'allin') speechType = 'allin';
    else if (player.status === 'folded') speechType = 'fold';
    else if (action === 'raise') speechType = 'raise';
    else if (isCheck) speechType = 'check';

    if (player.isBluffing && (action === 'raise' || action === 'allin')) {
      this.speakRandom(player, 'bluff_act');
    } else if (Math.random() < speakChance) {
      this.speakRandom(player, speechType);
    }
  }

  // 随机发言助手
  speakRandom(player: Player, type: keyof typeof SPEECH_LINES['bot']) {
    const lines = SPEECH_LINES['bot'][type];
    if (lines && lines.length > 0) {
      const text = lines[Math.floor(Math.random() * lines.length)];
      this.speak(player, text);
    }
  }

  // ============================================
  // 对局倒数功能方法
  // ============================================

  /**
   * 获取排行榜数据
   * 返回按筹码排序的玩家列表，包含排名和筹码变化
   */
  getLeaderboard(): { rank: number; player: Player; delta: number }[] {
    const sorted = [...this.players]
      .filter(p => !p.isEliminated || p.chips > 0) // 包含被淘汰但有筹码的玩家
      .sort((a, b) => b.chips - a.chips);

    return sorted.map((player, index) => ({
      rank: index + 1,
      player,
      delta: player.chips - this.initialChips
    }));
  }

  /**
   * 开始新一轮对局 (重置局数但保留玩家和筹码)
   */
  startNewSession() {
    if (this._isDestroyed) return;

    this.currentRoundNumber = 0;
    this.isSessionComplete = false;

    // 记录当前筹码作为新的初始值
    this.players.forEach(p => {
      // 如果玩家被淘汰，给予初始筹码复活
      if (p.isEliminated) {
        p.chips = this.initialChips;
        p.isEliminated = false;
        p.status = 'active';
      }
    });

    this.notify();
    this.startNextRound();
  }

  // ============================================
  // 超级电脑模式核心逻辑
  // ============================================

  setAIMode(mode: AIMode) {
    this.aiMode = mode;
    this.log(`切换 AI 模式为: ${mode === 'super' ? '超级电脑' : '普通模式'}`, 'normal');
  }

  /**
   * 获取或创建玩家的对手档案
   */
  _getOrCreateProfile(playerId: number): OpponentProfile {
    if (!this.opponentProfiles.has(playerId)) {
      this.opponentProfiles.set(playerId, createDefaultProfile(playerId));
    }
    return this.opponentProfiles.get(playerId)!;
  }

  /**
   * 更新对手档案统计数据
   * 在每次玩家行动后调用
   */
  _updateOpponentProfile(player: Player, action: 'fold' | 'call' | 'raise' | 'allin') {
    const profile = this._getOrCreateProfile(player.id);
    const n = profile.handsPlayed;

    // 1. 更新 VPIP (Voluntarily Put In Pot) - 入池率
    // 在翻前，如果玩家主动投入筹码 (call/raise/allin 而非 fold)
    if (this.stage === 'preflop') {
      const didVPIP = action !== 'fold';
      // 增量平均: newAvg = (oldAvg * n + newValue) / (n + 1)
      profile.vpip = (profile.vpip * n + (didVPIP ? 1 : 0)) / (n + 1);

      // 2. 更新 PFR (Pre-Flop Raise) - 翻前加注率
      const didPFR = action === 'raise' || action === 'allin';
      profile.pfr = (profile.pfr * n + (didPFR ? 1 : 0)) / (n + 1);
    }

    // 3. 更新激进度 (Aggression Factor)
    // AF = (Raise + Bet) / Call，这里简化为 raise 比例
    if (action === 'raise' || action === 'allin') {
      profile.aggression = Math.min(2.0, profile.aggression + 0.1);
    } else if (action === 'call') {
      profile.aggression = Math.max(0.3, profile.aggression - 0.05);
    }

    profile.handsPlayed = n + 1;
  }

  /**
   * 更新对手摊牌牌力统计
   * 在摊牌后调用，用于建模对手的手牌范围
   */
  _updateShowdownStrength(player: Player, handRank: HandRankType) {
    const profile = this._getOrCreateProfile(player.id);
    profile.showdownStrengths.push(handRank);
    // 只保留最近 20 次摊牌记录
    if (profile.showdownStrengths.length > 20) {
      profile.showdownStrengths.shift();
    }
  }

  /**
   * 获取活跃对手的平均统计数据
   */
  _getAverageOpponentStats(): { avgVpip: number; avgPfr: number; avgAggression: number } {
    const activeOpponents = this.players.filter(
      p => !p.isEliminated && p.status !== 'folded' && !p.isHuman
    );

    if (activeOpponents.length === 0) {
      return { avgVpip: 0.5, avgPfr: 0.2, avgAggression: 1.0 };
    }

    let totalVpip = 0, totalPfr = 0, totalAgg = 0;
    let count = 0;

    for (const opp of activeOpponents) {
      const profile = this.opponentProfiles.get(opp.id);
      if (profile && profile.handsPlayed > 0) {
        totalVpip += profile.vpip;
        totalPfr += profile.pfr;
        totalAgg += profile.aggression;
        count++;
      }
    }

    if (count === 0) {
      return { avgVpip: 0.5, avgPfr: 0.2, avgAggression: 1.0 };
    }

    return {
      avgVpip: totalVpip / count,
      avgPfr: totalPfr / count,
      avgAggression: totalAgg / count
    };
  }

  /**
   * 蒙特卡洛模拟核心方法
   * 计算当前玩家在剩下发牌随机情况下的胜率
   */
  _calculateWinRateMonteCarlo(player: Player): number {
    const startTs = Date.now();
    const simulations = this.superAIConfig.monteCarloSims;
    let wins = 0;
    let ties = 0;

    // 1. 确定已知牌
    const knownCards = [...player.hand, ...this.communityCards];
    // 用于快速查找已知牌的 Set (toString representation)
    const knownCardSet = new Set(knownCards.map(c => c.toString()));

    // 2. 确定需要模拟的对手数量 (Active players - 1)
    const activeOpponentsCount = this.players.filter(p => !p.isEliminated && p.status !== 'folded' && p.id !== player.id).length;
    // 如果没有对手了（理论上不会进入这里，因为那样就直接赢了），直接返回 1.0
    if (activeOpponentsCount === 0) return 1.0;

    // 预先生成一个完整的牌堆用于复制，避免反复创建对象
    const baseDeckCards: Card[] = [];
    for (const s of SUITS) {
      for (const r of RANKS) {
        const c = new Card(r, s);
        if (!knownCardSet.has(c.toString())) {
          baseDeckCards.push(c);
        }
      }
    }

    // 3. 开始模拟
    for (let i = 0; i < simulations; i++) {
      // 洗牌 (Fisher-Yates on a copy of baseDeckCards)
      const deck = [...baseDeckCards];
      let m = deck.length, t: Card, j: number;
      while (m) {
        j = Math.floor(Math.random() * m--);
        t = deck[m];
        deck[m] = deck[j];
        deck[j] = t;
      }

      // 模拟公共牌补全
      const simCommunity = [...this.communityCards];
      while (simCommunity.length < 5) {
        const c = deck.pop();
        if (c) simCommunity.push(c);
      }

      // 模拟对手手牌
      const simOpponentHands: Card[][] = [];
      for (let k = 0; k < activeOpponentsCount; k++) {
        const c1 = deck.pop();
        const c2 = deck.pop();
        if (c1 && c2) simOpponentHands.push([c1, c2]);
      }

      // 评估我的牌
      const myFullHand = [...player.hand, ...simCommunity];
      const myResult = evaluateHand(myFullHand);

      // 评估对手的牌
      let myRank = myResult.rank;
      let myScore = myResult.score;
      let won = true;
      let tie = false;

      for (const oppHand of simOpponentHands) {
        const oppFullHand = [...oppHand, ...simCommunity];
        const oppResult = evaluateHand(oppFullHand);

        if (oppResult.rank > myRank) {
          won = false; break;
        } else if (oppResult.rank === myRank) {
          if (oppResult.score > myScore) {
            won = false; break;
          } else if (Math.abs(oppResult.score - myScore) < 0.001) {
            tie = true; // 只要有一个平手，且没有输给任何人，暂时算 Tie
            // 注意：多人底池如果有一个人赢我，我就输了。如果所有人都没赢我，但有人平我，那就是平。
          }
        }
      }

      if (won) {
        if (tie) ties++;
        else wins++;
      }
    }

    const duration = Date.now() - startTs;
    // console.log(`[SuperAI] P${player.id} Sim in ${duration}ms: Win ${(wins/simulations).toFixed(2)}`);

    // 简单计算胜率 = (赢次数 + 平局次数/2) / 总次数
    return (wins + ties / 2) / simulations;
  }

  /**
   * 获取手牌的标准 Key (用于查表)
   * @returns 'AA', 'AKs' (同花), 'AKo' (杂色) 格式
   */
  _getHandKey(hand: Card[]): string {
    if (hand.length < 2) return '';

    const c1 = hand[0];
    const c2 = hand[1];

    // 按大小排序 (大的在前)
    let r1 = c1.rank;
    let r2 = c2.rank;
    if (c2.value > c1.value) {
      [r1, r2] = [r2, r1];
    }

    // 对子
    if (r1 === r2) {
      return `${r1}${r2}`;
    }

    // 同花 vs 杂色
    const suited = c1.suit === c2.suit;
    return `${r1}${r2}${suited ? 's' : 'o'}`;
  }

  /**
   * 翻前使用查表获取手牌强度 (比蒙特卡洛快 100x+)
   * @returns 0.0 - 1.0 的强度值
   */
  _getPreflopStrength(player: Player): number {
    const key = this._getHandKey(player.hand);
    const baseStrength = PREFLOP_HAND_STRENGTH[key] ?? 0.35; // 未知牌默认中低

    // 根据活跃对手数量调整 (多人局强度下降)
    const activeOpponents = this.players.filter(
      p => !p.isEliminated && p.status !== 'folded' && p.id !== player.id
    ).length;

    // 每增加一个对手，强度约下降 3-5%
    const multiWayPenalty = activeOpponents * 0.035;

    return Math.max(0.1, baseStrength - multiWayPenalty);
  }

  /**
   * 获取位置优势
   * @returns 0.0 (最差, OOP) ~ 1.0 (最好, IP/Button)
   */
  _getPositionAdvantage(player: Player): number {
    // 简单的位置评分逻辑：Postflop 越晚行动越好
    // Postflop 行动顺序从 Dealer+1 开始
    const N = this.players.length;
    const playerIdx = this.players.findIndex(p => p.id === player.id);
    const activePlayerCount = this.players.filter(p => !p.isEliminated && p.status !== 'folded').length;

    // 计算相对于"最早行动者"的偏移量
    // 0 = First to act (SB/Small Blind position postflop), 1 = Next...
    const postFlopOrder = (playerIdx - (this.dealerIdx + 1) + N) % N;

    // 归一化得分 (0.0 - 1.0)
    const score = postFlopOrder / (Math.max(1, N - 1));
    return Math.min(1.0, Math.max(0.0, score));
  }

  /**
   * 分析牌面材质 (Board Texture)
   * @returns score 0.0 (Dry/干燥) ~ 1.0 (Wet/湿润/危险)
   */
  _getBoardTexture(): number {
    const board = this.communityCards;
    if (board.length === 0) return 0.5; // Preflop 视为中性

    let score = 0.0;

    // 1. 检查同花可能 (Flush Draw potential)
    const suitCounts: Record<string, number> = { '♠': 0, '♥': 0, '♣': 0, '♦': 0 };
    board.forEach(c => { if (c.suit) suitCounts[c.suit as string]++ });
    const maxSuit = Math.max(...Object.values(suitCounts));

    if (maxSuit >= 3) score += 0.5;     // 已经成同花或强听花
    else if (maxSuit === 2) score += 0.2; // 有听花可能

    // 2. 检查顺子连牌 (Connectedness)
    const ranks = board.map(c => c.value).sort((a, b) => a - b);
    let maxConnected = 1;
    let currentConn = 1;
    // 去重后检查连号
    const uniqueRanks = Array.from(new Set(ranks)).sort((a, b) => a - b);
    for (let i = 0; i < uniqueRanks.length - 1; i++) {
      if (uniqueRanks[i + 1] - uniqueRanks[i] === 1) currentConn++;
      else currentConn = 1;
      maxConnected = Math.max(maxConnected, currentConn);
    }

    if (maxConnected >= 3) score += 0.4;    // 3连张 (e.g. 5-6-7)
    else if (maxConnected === 2) score += 0.15; // 2连张

    // 3. 检查公对 (Paired Board)
    const rankCounts: Record<number, number> = {};
    board.forEach(c => rankCounts[c.value] = (rankCounts[c.value] || 0) + 1);
    const maxRankCount = Math.max(...Object.values(rankCounts));

    if (maxRankCount >= 2) score += 0.25; // 牌面有对子，可能有葫芦/炸弹

    // High Card Texture (高牌面通常更适合激进)
    const highCardCount = board.filter(c => c.value >= 10).length;
    if (highCardCount >= 2) score += 0.1;

    return Math.min(1.0, score);
  }

  /**
   * 超级电脑决策逻辑 (Enhanced)
   */
  _superAIActionLogic(player: Player) {
    const isPreflop = this.stage === 'preflop';

    // 1. 获取胜率：翻前查表 (快速)，翻后蒙特卡洛 (精确)
    const winRate = isPreflop
      ? this._getPreflopStrength(player)
      : this._calculateWinRateMonteCarlo(player);

    const callAmt = this.highestBet - player.currentBet;
    const potOdds = callAmt > 0 ? callAmt / (this.pot + callAmt) : 0;

    // 新增：上下文感知
    const posAdvantage = this._getPositionAdvantage(player); // 0.0-1.0
    const boardTexture = this._getBoardTexture(); // 0.0-1.0
    const activeOpponents = this.players.filter(p => !p.isEliminated && p.status !== 'folded' && p.id !== player.id).length;

    // 动态调整胜率阈值 (Based on Pot Odds + Position)
    // 如果位置好(IP)，我们可以玩得更宽；位置差(OOP)需要更紧
    const posModifier = (posAdvantage - 0.5) * 0.1; // +/- 0.05
    const adjustedWinRate = winRate + posModifier;

    // ============ 对手建模：根据对手行为调整策略 ============
    const oppStats = this._getAverageOpponentStats();
    // 对手松 (高VPIP) -> 我们更多价值下注，少诈唬
    // 对手紧 (低VPIP) -> 我们可以更多偷鸡
    // 对手激进 (高Aggression) -> 我们的诈唬成功率下降，需要更强的牌
    const isLooseTable = oppStats.avgVpip > 0.55;
    const isTightTable = oppStats.avgVpip < 0.35;
    const isAggressiveTable = oppStats.avgAggression > 1.3;

    let action: 'fold' | 'call' | 'raise' | 'allin' = 'fold';
    const rnd = Math.random();

    // A. 极强牌 / 坚果 (Monster)
    // 胜率极高，或者胜率不错且已经投入很多
    if (winRate > 0.85 || (winRate > 0.7 && potOdds > 0.4)) {
      // === GTO 混合策略：防止被读牌 ===
      // 不是 100% 加注，而是按概率分布选择动作
      // 湿润牌面: 更多加注保护底池 (80% raise, 15% allin, 5% call)
      // 干燥牌面: 可以慢打更多 (60% raise, 10% allin, 30% call)
      const trapChance = boardTexture < 0.3 ? 0.30 : 0.05;
      const allinChance = boardTexture < 0.3 ? 0.10 : 0.15;

      if (rnd < trapChance && this.raisesInRound < 1) {
        action = 'call'; // 慢打/诱捕
      } else if (rnd < trapChance + allinChance) {
        action = 'allin'; // 偶尔直接全压增加不可预测性
      } else {
        action = 'raise'; // 价值加注
      }
    }
    // B. 强牌 (Strong)
    else if (winRate > 0.65) {
      // === GTO 混合策略 ===
      // 70% raise, 20% call (控池), 10% allin (极化)
      if (rnd < 0.70) action = 'raise';
      else if (rnd < 0.90) action = 'call';
      else action = 'allin';
    }
    // C. 边缘牌 / 中等牌 (Marginal)
    // 胜率略高于赔率，或者有正期望
    else if (adjustedWinRate > potOdds + 0.05) {
      // 如果位置好，倾向于主动加注夺取底池
      if (posAdvantage > 0.6 && rnd < 0.6) action = 'raise';
      else action = 'call';
    }
    // D. 听牌 / 弱牌 (Draw / Weak)
    else {
      // 即使胜率低，如果赔率极好（例如 Check 免费看牌），当然看
      if (callAmt === 0) {
        action = 'call'; // Check

        // 没人下注时，位置好可以尝试偷鸡 (Probe Bet / Steal)
        // 条件：位置好 + 牌面干燥 + 随机
        // ============ 对手建模调整 ============
        // 对手紧 -> 偷鸡成功率高，增加频率
        // 对手激进 -> 可能被反加，减少频率
        let bluffChance = 0.35;
        if (isTightTable) bluffChance += 0.15; // 紧桌多偷
        if (isAggressiveTable) bluffChance -= 0.15; // 激进桌少偷
        if (isLooseTable) bluffChance -= 0.10; // 松桌容易被跟注

        if (posAdvantage > 0.7 && boardTexture < 0.4 && rnd < bluffChance) {
          player.isBluffing = true;
          action = 'raise';
        }
      }
      // 面临下注时
      else {
        // 隐含赔率 (Implied Odds)：如果是强听牌（同花/顺子听牌），虽然胜率当前低，但潜在收益大
        // 简单判断：如果胜率 > 0.25 (听花/两头顺大约 30%+) 且剩余筹码深
        if (winRate > 0.25 && potOdds < 0.4) {
          action = 'call'; // 追牌 (Chase)
        }
        // 纯诈唬 (Pure Bluff)
        // 条件：对手表现弱 + 牌面有吓人张(A/K) + 随机
        else if (this.raisesInRound === 1 && rnd < 0.1) {
          // 10% 概率反击诈唬 (Re-raise Bluff) - 慎用
          // player.isBluffing = true;
          // action = 'raise';
          action = 'fold'; // 暂时保守一点，大部分时候弃牌
        }
        else {
          action = 'fold';
        }
      }
    }

    // === 修正与安全检查 ===
    if (callAmt >= player.chips) {
      if (action === 'raise' || action === 'call') action = 'allin';
    }

    // 如果加注但筹码不够 -> Allin
    if (action === 'raise') {
      const minRaise = Math.max(this.bigBlind, this.lastRaiseAmount);
      if (player.chips <= callAmt + minRaise) {
        action = 'allin';
      }
    }

    // === 执行动作与下注尺寸 (Bet Sizing) ===
    if (action === 'raise') {
      // 动态调整下注尺寸
      let betFactor = 0.6; // 默认 60% 底池

      // 1. 强牌价值下注：下重注 (75% - 120% Pot)
      if (winRate > 0.8) {
        betFactor = 0.8 + Math.random() * 0.4;
      }
      // 2. 诈唬下注：极化 (要么很小试探，要么很大吓人)
      else if (player.isBluffing) {
        betFactor = rnd < 0.5 ? 0.5 : 1.0;
      }
      // 3. 湿润牌面保护：下重注防止买牌
      if (boardTexture > 0.6 && winRate > 0.6) {
        betFactor += 0.3;
      }

      let betSize = this.pot * betFactor;

      // 确保最小加注
      const minRaise = Math.max(this.bigBlind, this.lastRaiseAmount);
      if (betSize < minRaise) betSize = minRaise;
      // 确保不超过自身筹码
      if (betSize > player.chips) betSize = player.chips;

      this.handleAction(player, 'raise', Math.floor(betSize));
    } else {
      this.handleAction(player, action);
    }

    // === 发言系统 ===
    const speakChance = 0.35;
    if (Math.random() < speakChance) {
      let st: any = action === 'call' && callAmt === 0 ? 'check' : action;
      if (player.status === 'folded') st = 'fold';
      if (player.isBluffing) st = 'bluff_act';

      // 随机延迟一点发言以免和音效重叠
      setTimeout(() => {
        if (!this._isDestroyed) this.speakRandom(player, st);
      }, 200 + Math.random() * 500);
    }
  }
}
