

export type Suit = '♠' | '♥' | '♣' | '♦';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'T' | 'J' | 'Q' | 'K' | 'A';

export const SUITS: Suit[] = ['♠', '♥', '♣', '♦'];
export const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
export const RANK_VALUE: Record<Rank, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, 'T': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
};

export class Card {
  rank: Rank;
  suit: Suit;
  value: number;

  constructor(rank: Rank, suit: Suit) {
    this.rank = rank;
    this.suit = suit;
    this.value = RANK_VALUE[rank];
  }

  get color(): 'red' | 'black' {
    return (this.suit === '♥' || this.suit === '♦') ? 'red' : 'black';
  }

  toString(): string {
    // 显示时将 'T' 转换为 '10'，内部逻辑保持 'T' 不变
    const displayRank = this.rank === 'T' ? '10' : this.rank;
    return `${this.suit}${displayRank}`;
  }

  static fromString(str: string): Card {
    // str like "Ah", "Td", "2s", "Tc"
    const suitChar = str.slice(-1).toLowerCase();
    const rankChar = str.slice(0, -1).toUpperCase();

    let suit: Suit;
    switch (suitChar) {
      case 's': suit = '♠'; break;
      case 'h': suit = '♥'; break;
      case 'd': suit = '♦'; break;
      case 'c': suit = '♣'; break;
      default: suit = '♠'; // fallback
    }

    // Handle '10' if strictly passed, but mostly 'T' is expected
    let rank: Rank = rankChar as Rank;
    if (rankChar === '10') rank = 'T';

    return new Card(rank, suit);
  }
}

export class Deck {
  cards: Card[];

  constructor() {
    this.cards = [];
    this.reset();
  }

  reset() {
    this.cards = [];
    for (const s of SUITS) {
      for (const r of RANKS) {
        this.cards.push(new Card(r, s));
      }
    }
    this.shuffle();
  }

  shuffle() {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }

  deal(): Card | undefined {
    return this.cards.pop();
  }
}

export enum HandRankType {
  HIGH_CARD = 0,
  PAIR = 1,
  TWO_PAIR = 2,
  TRIPS = 3,
  STRAIGHT = 4,
  FLUSH = 5,
  FULL_HOUSE = 6,
  QUADS = 7,
  STRAIGHT_FLUSH = 8
}

export interface HandResult {
  rank: HandRankType;
  score: number;
  winningCards: Card[];
  bestHand: Card[];
}

export function evaluateHand(cards: Card[]): HandResult {
  const sorted = [...cards].sort((a, b) => b.value - a.value);

  const suitCounts: Record<string, number> = {};
  const rankCounts: Record<number, number> = {};

  sorted.forEach(c => {
    suitCounts[c.suit] = (suitCounts[c.suit] || 0) + 1;
    rankCounts[c.value] = (rankCounts[c.value] || 0) + 1;
  });

  const flushSuit = Object.keys(suitCounts).find(s => suitCounts[s] >= 5);
  const flushCards = flushSuit ? sorted.filter(c => c.suit === flushSuit) : [];

  const getStraight = (cardList: Card[]): Card[] | null => {
    const unique: Card[] = [];
    cardList.forEach(c => { if (!unique.find(u => u.value === c.value)) unique.push(c); });

    // 检查 A 小顺子 (A, 2, 3, 4, 5)
    if (unique.some(c => c.value === 14)) {
      const aceLow = new Card('A', unique.find(c => c.value === 14)!.suit);
      aceLow.value = 1;
      unique.push(aceLow);
    }
    // 重新排序，因为可能在最后添加了作为 1 的 A
    unique.sort((a, b) => b.value - a.value);

    for (let i = 0; i <= unique.length - 5; i++) {
      if (unique[i].value - unique[i + 4].value === 4) return unique.slice(i, i + 5);
    }
    return null;
  };

  const straightCards = getStraight(sorted);
  const straightFlushCards = flushSuit ? getStraight(flushCards) : null;

  const calcScore = (rankIdx: number, best5: Card[]) => {
    let s = rankIdx * 10000000000;
    if (best5[0]) s += (best5[0].value * 100000000);
    if (best5[1]) s += (best5[1].value * 1000000);
    if (best5[2]) s += (best5[2].value * 10000);
    if (best5[3]) s += (best5[3].value * 100);
    if (best5[4]) s += (best5[4].value * 1);
    return s;
  };

  if (straightFlushCards) return { rank: HandRankType.STRAIGHT_FLUSH, score: calcScore(8, straightFlushCards), winningCards: straightFlushCards, bestHand: straightFlushCards };

  const quadsValStr = Object.keys(rankCounts).find(r => rankCounts[parseInt(r)] === 4);
  if (quadsValStr) {
    const quadsVal = parseInt(quadsValStr);
    const quads = sorted.filter(c => c.value === quadsVal);
    const kicker = sorted.find(c => c.value !== quadsVal);
    const best5 = [...quads, ...(kicker ? [kicker] : [])];
    return { rank: HandRankType.QUADS, score: calcScore(7, best5), winningCards: quads, bestHand: best5 };
  }

  const tripsVals = Object.keys(rankCounts).filter(r => rankCounts[parseInt(r)] === 3).map(Number).sort((a, b) => b - a);
  const pairVals = Object.keys(rankCounts).filter(r => rankCounts[parseInt(r)] === 2).map(Number).sort((a, b) => b - a);

  if (tripsVals.length > 0) {
    const tVal = tripsVals[0];
    let pVal = -1;
    if (tripsVals.length > 1) pVal = tripsVals[1];
    else if (pairVals.length > 0) pVal = pairVals[0];

    if (pVal !== -1) {
      const tCards = sorted.filter(c => c.value === tVal);
      const pCards = sorted.filter(c => c.value === pVal).slice(0, 2);
      const best5 = [...tCards, ...pCards];
      return { rank: HandRankType.FULL_HOUSE, score: calcScore(6, best5), winningCards: best5, bestHand: best5 };
    }
  }

  if (flushCards.length >= 5) {
    const best5 = flushCards.slice(0, 5);
    return { rank: HandRankType.FLUSH, score: calcScore(5, best5), winningCards: best5, bestHand: best5 };
  }

  if (straightCards) return { rank: HandRankType.STRAIGHT, score: calcScore(4, straightCards), winningCards: straightCards, bestHand: straightCards };

  if (tripsVals.length > 0) {
    const tVal = tripsVals[0];
    const trips = sorted.filter(c => c.value === tVal);
    const kickers = sorted.filter(c => c.value !== tVal).slice(0, 2);
    const best5 = [...trips, ...kickers];
    return { rank: HandRankType.TRIPS, score: calcScore(3, best5), winningCards: trips, bestHand: best5 };
  }

  if (pairVals.length >= 2) {
    const p1 = pairVals[0], p2 = pairVals[1];
    const pair1 = sorted.filter(c => c.value === p1);
    const pair2 = sorted.filter(c => c.value === p2);
    const kicker = sorted.find(c => c.value !== p1 && c.value !== p2);
    const best5 = [...pair1, ...pair2, ...(kicker ? [kicker] : [])];
    return { rank: HandRankType.TWO_PAIR, score: calcScore(2, best5), winningCards: [...pair1, ...pair2], bestHand: best5 };
  }

  if (pairVals.length === 1) {
    const p1 = pairVals[0];
    const pair = sorted.filter(c => c.value === p1);
    const kickers = sorted.filter(c => c.value !== p1).slice(0, 3);
    const best5 = [...pair, ...kickers];
    return { rank: HandRankType.PAIR, score: calcScore(1, best5), winningCards: pair, bestHand: best5 };
  }

  const best5 = sorted.slice(0, 5);
  return { rank: HandRankType.HIGH_CARD, score: calcScore(0, best5), winningCards: [best5[0]], bestHand: best5 };
}

const BOT_NAMES = [
  '亚历克斯', '萨姆', '乔丹', '泰勒', '凯西', '摩根', '赖利', '杰米',
  '奎因', '艾弗里', '帕克', '瑞思', '布雷克', '查理', '达科塔', '里弗',
  '菲尼克斯', '塞奇', '斯凯', '西德尼', '马弗里克', '埃斯', '拉克', '奇普'
];

export type PersonaType = 'human' | 'bot';

export const SPEECH_LINES: Record<'bot', {
  raise: string[];
  call: string[];
  fold: string[];
  check: string[];
  allin: string[];
  bluff_act: string[];
}> = {
  bot: {
    raise: [
      "加注!", "这就怕了?", "再来点刺激的!", "这才刚开始!", "这点钱不够看!",
      "我看你有多少筹码!", "全压了! 哈哈!", "这就对了!", "Show hand!",
      "必须加!", "来啊互相伤害啊!", "我就是钱多!", "这牌值得加注.",
      "目前的赔率不错.", "稍微加一点.", "不得不加.", "根据概率...",
      "今天运气不错!", "感觉来了!", "幸运女神眷顾我!", "这把稳了!", "一定是好牌!"
    ],
    call: [
      "看看你的底牌.", "别想偷鸡.", "跟!", "我也来.", "这点钱我跟得起.",
      "陪你玩玩.", "我也来凑热闹!", "这把我有预感!", "谁怕谁啊!", "跟跟跟!",
      "好像有好牌!", "我看一看.", "这注跟得起.", "保持跟进.", "还在很多范围内.",
      "合理.", "那就跟吧.", "多少钱?", "我也玩玩.", "别太贵就行.", "跟你看一看.",
      "拼一把运气!", "听天由命吧!", "试试手气.", "希望能中!", "保佑我!"
    ],
    fold: [
      "算你运气好.", "这把放过你.", "暂避锋芒.", "不跟了.", "好汉不吃眼前亏.",
      "没意思.", "这牌有鬼.", "晦气!", "不玩了.", "把把烂牌!", "与其冒险不如放弃.",
      "这局胜率不高.", "我退出.", "冷静...", "等待时机.", "太大了不跟.",
      "我不行了.", "这牌太烂了.", "算了.", "有点怕.", "运气不好.",
      "风水不对.", "下把再来.", "今天不宜赌博.", "没感觉."
    ],
    check: [
      "这把我不加.", "过.", "看看下面什么牌.", "你先请.", "快点快点!",
      "过过过!", "别墨迹!", "快出牌!", "先看看.", "过牌.", "暂且不动.",
      "观察一下.", "不用给钱? 那我过.", "怎么玩来着? 哦过.", "那我看一眼.",
      "看看运气.", "转运!", "天灵灵地灵灵.", "发张A给我!"
    ],
    allin: [
      "Show hand!", "全压了!", "这就让你回家!", "要么赢，要么回家!",
      "梭哈!", "赢了会所嫩模!", "输了下海干活!", "这把定生死!",
      "经过计算，全压是最佳策略.", "胜率很高.", "这是最合理的选择.",
      "All in 是什么意思?", "全都给你!", "不管了!", "反正也是虚拟币.",
      "赌神附体!", "一波肥!", "单车变摩托!", "就在这一把!"
    ],
    bluff_act: [
      "看这次谁怕谁!", "感觉到了恐惧吗?", "你真的敢跟吗?", "不加注怎么赢?",
      "这把底牌绝了!", "猜猜我有什么牌?", "别犹豫了，弃牌吧."
    ],
  }
};

// ============================================
// 超级电脑模式 (Super AI Mode) 类型定义
// ============================================

/** AI 模式:  'normal' 普通模式 | 'super' 超级电脑模式 */
export type AIMode = 'normal' | 'super';

/** 超级 AI 配置 */
export interface SuperAIConfig {
  /** 蒙特卡洛模拟次数 (500-2000) */
  monteCarloSims: number;
  /** 是否启用对手建模 */
  opponentModeling: boolean;
  /** 思考延迟(ms) - 营造真实感 */
  thinkingDelay: number;
}

/** 默认超级 AI 配置 */
export const DEFAULT_SUPER_AI_CONFIG: SuperAIConfig = {
  monteCarloSims: 1000,
  opponentModeling: true,
  thinkingDelay: 1500
};

/** 对手建模档案 */
export interface OpponentProfile {
  playerId: number;
  /** 入池率 (Voluntarily Put In Pot) 0-1 */
  vpip: number;
  /** 翻前加注率 (Preflop Raise) 0-1 */
  pfr: number;
  /** 激进度因子 */
  aggression: number;
  /** 统计样本数 */
  handsPlayed: number;
  /** 摊牌统计：追踪对手历史摊牌的牌力 */
  showdownStrengths: number[];
}

/** 创建默认对手档案 */
function createDefaultProfile(playerId: number): OpponentProfile {
  return {
    playerId,
    vpip: 0.5,      // 默认假设中等松紧
    pfr: 0.2,       // 默认假设中等激进
    aggression: 1.0,
    handsPlayed: 0,
    showdownStrengths: []
  };
}


export type PlayerStatus = 'active' | 'folded' | 'allin' | 'eliminated';

export interface Player {
  id: number;
  persona: PersonaType;
  name: string;
  isHuman: boolean;
  chips: number;
  hand: Card[];
  status: PlayerStatus;
  currentBet: number;
  isEliminated: boolean;
  currentSpeech?: string;
  speechTs?: number;
  totalHandBet: number;
  hasActed: boolean;
  isBluffing?: boolean; // 追踪当前策略是否为诈唬
  handDescription?: string; // 例如 "Two Pair" 用于摊牌时显示
}

export interface GameLog {
  id: string;
  message: string;
  type: 'normal' | 'phase' | 'win' | 'action' | 'showdown';
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
      aiMode: this.aiMode
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
  // 超级电脑模式核心逻辑
  // ============================================

  setAIMode(mode: AIMode) {
    this.aiMode = mode;
    this.log(`切换 AI 模式为: ${mode === 'super' ? '超级电脑' : '普通模式'}`, 'normal');
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
   * 超级电脑决策逻辑
   */
  _superAIActionLogic(player: Player) {
    // 1. 计算精确胜率 (Win Rate/Equity)
    const winRate = this._calculateWinRateMonteCarlo(player);
    // player.handDescription = `WR: ${(winRate * 100).toFixed(1)}%`; // Debug Info - Hidden for production

    // 2. 计算基本赔率 (Pot Odds)
    const callAmt = this.highestBet - player.currentBet;
    const potOdds = callAmt > 0 ? callAmt / (this.pot + callAmt) : 0;

    // 3. 调整因子
    const boldness = 1.0; // GTO 倾向于理性，减少随机情绪
    const stage = this.stage;

    // 4. 获取位置优势 (Position)
    // 简化版：越晚行动越好。last to act (currentTurnIdx close to dealerIdx?)
    // 暂不深度实现

    let action: 'fold' | 'call' | 'raise' | 'allin' = 'fold';
    const rnd = Math.random();

    // 基础策略矩阵
    // 如果 胜率 >> 赔率，正期望值 -> 玩

    // 极强牌: 慢打或者做大底池
    if (winRate > 0.8) {
      if (rnd < 0.3 && this.raisesInRound < 2) action = 'call'; // 30% 慢打
      else if (rnd < 0.95) action = 'raise';
      else action = 'allin';
    }
    // 强牌
    else if (winRate > 0.6) {
      action = 'raise';
    }
    // 中等牌 / 边缘牌
    else if (winRate > potOdds + 0.1) {
      // 有正期望，加注保护或跟注
      if (rnd < 0.4) action = 'raise';
      else action = 'call';
    }
    // 听牌/弱牌但赔率合适
    else if (winRate > potOdds) {
      action = 'call';
    }
    // 没赔率，但也许可以诈唬 (Bluff)
    else {
      // 诈唬频率：
      // 简单模型：如果在后位且大家都过牌，尝试偷
      // 或者手牌极烂（阻断牌概念太复杂暂略）

      let bluffChance = 0.05; // 基础诈唬率 5%
      if (this.raisesInRound === 0 && callAmt === 0) bluffChance = 0.2; // 没人加注时尝试偷

      if (rnd < bluffChance) {
        player.isBluffing = true;
        action = 'raise';
      } else {
        if (callAmt === 0) action = 'call'; // Check
        else action = 'fold';
      }
    }

    // 修正与安全检查 (Sanity Check)
    if (callAmt >= player.chips) {
      if (action === 'raise' || action === 'call') action = 'allin';
    }

    // 如果加注但筹码不够
    if (action === 'raise') {
      const minRaise = Math.max(this.bigBlind, this.lastRaiseAmount);
      if (player.chips <= callAmt + minRaise) {
        action = 'allin'; // 只有一点点筹码了，直接推
      }
    }

    // 执行动作
    if (action === 'raise') {
      // 计算合理加注额：底池的 0.5 ~ 1.0 倍
      // 价值下注：下注 2/3 - 1.0 底池
      let betSize = this.pot * 0.6;
      if (winRate > 0.8) betSize = this.pot * 1.0; // 强牌下重注
      if (player.isBluffing) betSize = this.pot * 0.75; // 诈唬也装作强牌

      // 确保最小加注
      const minRaise = Math.max(this.bigBlind, this.lastRaiseAmount);
      if (betSize < minRaise) betSize = minRaise;

      this.handleAction(player, 'raise', Math.floor(betSize));
    } else {
      this.handleAction(player, action);
    }

    // 发言逻辑复用
    const speakChance = 0.3;
    if (Math.random() < speakChance) {
      let st: any = action === 'call' && callAmt === 0 ? 'check' : action;
      if (player.status === 'folded') st = 'fold';
      if (player.isBluffing) st = 'bluff_act';
      this.speakRandom(player, st);
    }

  }
}
