import {
  SUITS, RANKS, RANK_VALUE, BOT_NAMES, SPEECH_LINES,
  DEFAULT_SUPER_AI_CONFIG, PREFLOP_HAND_STRENGTH, DEFAULT_GAME_CONFIG,
  GAME_RULES, UI_CONSTANTS
} from './poker/constants';
import { Card, Deck } from './poker/card';
import { evaluateHand } from './poker/evaluator';
import {
  Suit, Rank, HandRankType, HandResult, PersonaType,
  AIMode, SuperAIConfig, OpponentProfile, GameConfig,
  PlayerStatus, Player, GameLog
} from './poker/types';
import {
  formatCards as formatCardsHelper,
  getRankName as getRankNameHelper,
  getHandDetailedDescription as getHandDetailedDescriptionHelper
} from './poker/display-helpers';
import { OpponentProfileManager } from './poker/opponent-profiling';
import { getHandStrength, makeNormalAIDecision, getRandomSpeech, type AIContext } from './poker/ai-strategy';
import { makeSuperAIDecision, type SuperAIContext } from './poker/ai-super';
import { getPositionAdvantage, getBoardTexture } from './poker/board-analysis';
import { calculateWinRateMonteCarlo, getPreflopStrength, getHandKey } from './poker/monte-carlo';
import { calculatePotDistribution } from './poker/pot-distribution';


export {
  SUITS, RANKS, RANK_VALUE, BOT_NAMES, SPEECH_LINES,
  DEFAULT_SUPER_AI_CONFIG, PREFLOP_HAND_STRENGTH, DEFAULT_GAME_CONFIG,
  GAME_RULES, UI_CONSTANTS,
  Card, Deck,
  evaluateHand,
  type Suit, type Rank, HandRankType, type HandResult, type PersonaType,
  type AIMode, type SuperAIConfig, type OpponentProfile, type GameConfig,
  type PlayerStatus, type Player, type GameLog
};
export { formatCardsHelper as formatCards, getRankNameHelper as getRankName, getHandDetailedDescriptionHelper as getHandDetailedDescription };
export { OpponentProfileManager };



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
  isAutoPlayMode: boolean = false;
  protected _isDestroyed: boolean = false;

  winners: number[] = [];
  winningCards: Card[] = [];
  lastRaiseAmount: number = 0;
  bigBlind: number = GAME_RULES.BIG_BLIND;

  /** 当前 AI 模式 */
  aiMode: AIMode = 'normal';
  /** 超级 AI 配置 */
  superAIConfig: SuperAIConfig = { ...DEFAULT_SUPER_AI_CONFIG };
  /** 对手建模档案管理器 */
  opponentProfiles: OpponentProfileManager = new OpponentProfileManager();

  /** 局数上限 (null = 无限制) */
  roundLimit: number | null = null;
  /** 当前第几局 (从1开始) */
  currentRoundNumber: number = 0;
  /** 本轮对局是否完成 */
  isSessionComplete: boolean = false;
  /** 初始筹码 (用于计算变化) */
  initialChips: number = GAME_RULES.INITIAL_CHIPS;

  constructor(onChange: (snapshot: ReturnType<PokerGameEngine['getSnapshot']>) => void) {
    this.onChange = onChange;
    this.players = [];
    this.logs = [];

    this.resetGame();
  }

  destroy() {
    this._isDestroyed = true;
  }

  setAutoPlayMode(enabled: boolean) {
    this.isAutoPlayMode = enabled;
  }


  resetGame() {
    if (this._isDestroyed) return;
    this.players = [];

    this.logs = [];

    // Initialize Random Expert Players
    const shuffledNames = [...BOT_NAMES].sort(() => 0.5 - Math.random());

    for (let i = 0; i < GAME_RULES.MAX_PLAYERS; i++) {
      const isHuman = i === 0;
      this.players.push({
        id: i,
        persona: isHuman ? 'human' : 'bot',
        name: isHuman ? 'You' : shuffledNames[i - 1],
        isHuman: isHuman,
        chips: GAME_RULES.INITIAL_CHIPS,
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
    // this.startNextRound(); 
  }

  startNextRound() {
    if (this._isDestroyed) return;

    // 1. 先进行淘汰判定 (Check for eliminations)
    this.players.forEach(p => {
      if (p.chips <= 0) {
        p.isEliminated = true;
        p.status = 'eliminated';
        p.chips = 0; // 确保不为负数
      }
    });

    // 2. 检查是否只剩最后一名赢家 (Winner Takes All Mode)
    const survivors = this.players.filter(p => !p.isEliminated);
    if (survivors.length <= 1) {
      this.isSessionComplete = true;
      this.notify();
      return;
    }

    // 3. 局数限制检查
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

    this.bet(this.players[sbIdx], GAME_RULES.SMALL_BLIND);
    this.bet(this.players[bbIdx], GAME_RULES.BIG_BLIND);
    this.highestBet = GAME_RULES.BIG_BLIND;

    this.log(`庄家 ${this.players[this.dealerIdx].name}, 盲注 $${GAME_RULES.SMALL_BLIND}/$${GAME_RULES.BIG_BLIND}`, 'phase');

    this.prepareBettingRound(this.getNextActive(bbIdx));
    this.notify();
  }

  handleFoldWin(winner: Player) {
    // 退还未被跟注的筹码 (Uncalled Bet)

    const others = this.players.filter(p => p.id !== winner.id);
    const maxOpponentBet = Math.max(0, ...others.map(p => p.currentBet));

    let returnAmount = 0;
    if (winner.currentBet > maxOpponentBet) {
      returnAmount = winner.currentBet - maxOpponentBet;
      // 从底池扣除
      this.pot -= returnAmount;
      // 退还
      winner.chips += returnAmount;
      winner.currentBet = maxOpponentBet;
      winner.totalHandBet -= returnAmount;
    }

    // 赢走剩余底池（死钱）
    const winAmount = this.pot;
    winner.chips += winAmount;
    this.pot = 0;

    this.winners = [winner.id];
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

    // 如果只剩一名玩家，直接获胜
    if (activePlayers.length === 1) {
      this.handleFoldWin(activePlayers[0]);
      return;
    }

    // 1. 评估所有活跃玩家手牌
    const results = activePlayers.map(p => ({
      player: p,
      result: evaluateHand([...p.hand, ...this.communityCards])
    }));

    // 2. 显示牌型描述
    results.forEach(({ player, result }) => {
      let info = this.getHandDetailedDescription(result);
      const isPlayingBoard = result.bestHand.every(wc =>
        this.communityCards.some(cc => cc.suit === wc.suit && cc.rank === wc.rank)
      );
      if (isPlayingBoard) info += " (Board)";
      player.handDescription = info;
      this.log(`${player.name} 亮牌: ${this.formatCards(player.hand)} (${info})`, 'showdown');
    });

    // 3. 边池与分池分配逻辑

    try {
      // const allContributors = [...activePlayers, ...foldedPlayers];

      const distributionResult = calculatePotDistribution(
        activePlayers,
        foldedPlayers,
        results
      );

      this.winners = distributionResult.winners;
      this.winningCards = distributionResult.winningCards;
      const { playerWins } = distributionResult;

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
        this.log(`${player.name} 加注至 $${player.currentBet}`, 'action');
        player.hasActed = true;
        break;
      case 'allin':
        const allInAmt = player.chips;
        this.bet(player, allInAmt);

        if (player.currentBet > this.highestBet) {
          this.highestBet = player.currentBet;
          this.raisesInRound++;
          this.log(`${player.name} All In! (加注至 $${player.currentBet})`, 'action');
        } else if (player.currentBet === this.highestBet) {
          // 这种情况通常已经被 call 分支覆盖，但以防万一
          this.log(`${player.name} All In (跟注至 $${player.currentBet})`, 'action');
        } else {
          // 短码全压，被视为 Call 但金额不足
          const added = allInAmt; // 近似
          this.log(`${player.name} All In (短码跟注 $${added})`, 'action');
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
    // 保留最多日志
    if (this.logs.length > GAME_RULES.LOG_HISTORY_LIMIT) this.logs.pop();
  }

  notify() {
    if (this._isDestroyed) return;
    this.onChange(this.getSnapshot());
  }

  formatCards(cards: Card[]) {
    return formatCardsHelper(cards);
  }

  getRankName(rank: HandRankType): string {
    return getRankNameHelper(rank);
  }

  getHandDetailedDescription(result: HandResult): string {
    return getHandDetailedDescriptionHelper(result);
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
        }, this.isAutoPlayMode
          ? UI_CONSTANTS.FAST.AI_THINKING_DELAY_BASE + Math.random() * UI_CONSTANTS.FAST.AI_THINKING_DELAY_VARIANCE
          : UI_CONSTANTS.AI_THINKING_DELAY_BASE + Math.random() * UI_CONSTANTS.AI_THINKING_DELAY_VARIANCE
        );
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
    return active.every(p => {
      if (p.status === 'allin') return true;
      return p.currentBet === amount && p.hasActed;
    });
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
    }, this.isAutoPlayMode
      ? UI_CONSTANTS.FAST.SPEECH_DISPLAY_TIME
      : UI_CONSTANTS.SPEECH_DISPLAY_TIME
    );

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
    return getHandStrength(player.hand, this.communityCards);
  }

  _aiActionLogic(player: Player) {
    const ctx: AIContext = {
      communityCards: this.communityCards,
      stage: this.stage,
      pot: this.pot,
      highestBet: this.highestBet,
      bigBlind: this.bigBlind,
      raisesInRound: this.raisesInRound,
      currentTurnIdx: this.currentTurnIdx,
      playersCount: this.players.length
    };

    const decision = makeNormalAIDecision(player, ctx);

    // 更新状态
    if (decision.isBluffing !== undefined) {
      player.isBluffing = decision.isBluffing;
    }

    // 执行动作
    if (decision.action === 'raise' && decision.raiseAmount) {
      this.handleAction(player, 'raise', decision.raiseAmount);
    } else {
      this.handleAction(player, decision.action);
    }

    // 发言逻辑
    if (decision.speechType) {
      if ((player.isBluffing && decision.speechType === 'bluff_act') || decision.shouldSpeak) {
        // 随机延迟一点发言
        setTimeout(() => {
          if (!this._isDestroyed && decision.speechType) {
            this.speakRandom(player, decision.speechType);
          }
        }, 200 + Math.random() * 500);
      }
    }
  }

  // 随机发言助手
  speakRandom(player: Player, type: keyof typeof SPEECH_LINES['bot']) {
    const category = this.aiMode === 'super' ? 'super' : 'bot';
    const text = getRandomSpeech(type, category);
    if (text) {
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
      .sort((a, b) => b.chips - a.chips);

    return sorted.map((player, index) => ({
      rank: index + 1,
      player,
      delta: player.chips - this.initialChips
    }));
  }

  /**
   * 开始新一轮对局
   * - 重置局数计数器
   * - 重置所有玩家筹码为初始值
   * - 重置所有玩家的淘汰和游戏状态
   * - 保留玩家名单
   */
  startNewSession() {
    if (this._isDestroyed) return;

    this.currentRoundNumber = 0;
    this.isSessionComplete = false;

    // 记录当前筹码作为新的初始值
    this.players.forEach(p => {
      // 重置所有玩家的筹码为初始值
      p.chips = this.initialChips;
      p.isEliminated = false;
      p.status = 'active';
      // 重置其他状态
      p.currentBet = 0;
      p.totalHandBet = 0;
      p.hand = [];
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
    return this.opponentProfiles.getOrCreateProfile(playerId);
  }

  /**
   * 更新对手档案统计数据
   * 在每次玩家行动后调用
   */
  _updateOpponentProfile(player: Player, action: 'fold' | 'call' | 'raise' | 'allin') {
    this.opponentProfiles.updateProfile(player, action, this.stage === 'preflop');
  }

  /**
   * 更新对手摊牌牌力统计
   * 在摊牌后调用，用于建模对手的手牌范围
   */
  _updateShowdownStrength(player: Player, handRank: HandRankType) {
    this.opponentProfiles.updateShowdownStrength(player, handRank);
  }

  /**
   * 获取活跃对手的平均统计数据
   */
  _getAverageOpponentStats(): { avgVpip: number; avgPfr: number; avgAggression: number } {
    return this.opponentProfiles.getAverageStats(this.players);
  }

  /**
   * 蒙特卡洛模拟核心方法
   * 计算当前玩家在剩下发牌随机情况下的胜率
   */
  _calculateWinRateMonteCarlo(player: Player): number {
    const activeOpponentsCount = this.players.filter(p => !p.isEliminated && p.status !== 'folded' && p.id !== player.id).length;
    return calculateWinRateMonteCarlo(player.hand, this.communityCards, activeOpponentsCount, this.superAIConfig.monteCarloSims);
  }

  /**
   * 获取手牌的标准 Key (用于查表)
   * @returns 'AA', 'AKs' (同花), 'AKo' (杂色) 格式
   */
  _getHandKey(hand: Card[]): string {
    return getHandKey(hand);
  }

  /**
   * 翻前使用查表获取手牌强度 (比蒙特卡洛快 100x+)
   * @returns 0.0 - 1.0 的强度值
   */
  _getPreflopStrength(player: Player): number {
    const activeOpponents = this.players.filter(
      p => !p.isEliminated && p.status !== 'folded' && p.id !== player.id
    ).length;
    return getPreflopStrength(player.hand, activeOpponents);
  }

  /**
   * 获取位置优势
   * @returns 0.0 (最差, OOP) ~ 1.0 (最好, IP/Button)
   */
  _getPositionAdvantage(player: Player): number {
    return getPositionAdvantage(player.id, this.players, this.dealerIdx);
  }

  /**
   * 分析牌面材质 (Board Texture)
   * @returns score 0.0 (Dry/干燥) ~ 1.0 (Wet/湿润/危险)
   */
  _getBoardTexture(): number {
    return getBoardTexture(this.communityCards);
  }

  /**
   * 超级电脑决策逻辑 (Enhanced)
   */
  _superAIActionLogic(player: Player) {
    const ctx: SuperAIContext = {
      communityCards: this.communityCards,
      stage: this.stage,
      pot: this.pot,
      highestBet: this.highestBet,
      bigBlind: this.bigBlind,
      raisesInRound: this.raisesInRound,
      lastRaiseAmount: this.lastRaiseAmount,
      players: this.players,
      dealerIdx: this.dealerIdx,
      monteCarloSims: this.superAIConfig.monteCarloSims,
      opponentProfiles: this.opponentProfiles
    };

    const decision = makeSuperAIDecision(player, ctx);

    if (decision.isBluffing !== undefined) {
      player.isBluffing = decision.isBluffing;
    }

    if (decision.action === 'raise' && decision.raiseAmount) {
      this.handleAction(player, 'raise', decision.raiseAmount);
    } else {
      this.handleAction(player, decision.action);
    }

    // 发言
    if (decision.speechType) {
      if ((player.isBluffing && decision.speechType === 'bluff_act') || decision.shouldSpeak) {
        setTimeout(() => {
          if (!this._isDestroyed && decision.speechType) {
            this.speakRandom(player, decision.speechType);
          }
        }, 200 + Math.random() * 500);
      }
    }
  }
}
