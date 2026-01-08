import { useState } from 'react';

interface ControlsProps {
  onAction: (action: 'fold' | 'call' | 'raise' | 'allin', raiseAmount?: number) => void;
  canRaise: boolean;
  callAmount: number;
  isHumanTurn: boolean;
  showNextRound: boolean;
  onNextRound: () => void;
  isGameOver?: boolean;
  onReset?: () => void;
  playerChips: number;
  potSize: number;
}

export function GameControls({
  onAction,
  canRaise,
  callAmount,
  isHumanTurn,
  showNextRound,
  onNextRound,
  isGameOver,
  onReset,
  playerChips,
  potSize
}: ControlsProps) {
  const [showRaiseOptions, setShowRaiseOptions] = useState(false);

  if (showNextRound) {
    if (isGameOver && onReset) {
      return (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 dark:bg-neutral-900/90 border-t border-zinc-200 dark:border-white/10 backdrop-blur md:static md:bg-transparent md:border-none md:p-0 flex justify-center z-50">
          <button
            onClick={onReset}
            className="w-full max-w-md bg-green-600 hover:bg-green-700 text-white font-bold h-14 flex items-center justify-center px-6 rounded-lg shadow-lg active:scale-95 transition-all text-lg md:text-xl"
          >
            Game Over! Restart Game 🔄
          </button>
        </div>
      );
    }

    return (
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 dark:bg-neutral-900/90 border-t border-zinc-200 dark:border-white/10 backdrop-blur md:static md:bg-transparent md:border-none md:p-0 flex justify-center z-50">
        <button
          onClick={onNextRound}
          className="w-full max-w-md bg-black dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-black font-bold h-14 flex items-center justify-center px-6 rounded-lg shadow-lg active:scale-95 transition-all text-lg md:text-xl"
        >
          Start Next Round
        </button>
      </div>
    );
  }

  const isDisabled = !isHumanTurn;

  // 计算加注选项
  const availableChips = playerChips - callAmount; // 跟注后剩余筹码
  const minRaise = 10; // 最小加注

  // 生成加注选项（从小到大，翻倍递增）
  const generateRaiseOptions = (): { label: string; amount: number; isAllIn?: boolean }[] => {
    const options: { label: string; amount: number; isAllIn?: boolean }[] = [];

    if (availableChips <= 0) return options;

    // 从10开始，逐步翻倍：10, 20, 40, 80, 160...
    let amount = minRaise;
    while (amount < availableChips) {
      options.push({ label: `+$${amount}`, amount });
      amount *= 2;
    }

    // 始终添加 All In 选项
    options.push({
      label: `ALL IN`,
      amount: playerChips,
      isAllIn: true
    });

    return options;
  };

  const raiseOptions = generateRaiseOptions();

  const handleRaiseClick = () => {
    if (raiseOptions.length === 1 && raiseOptions[0].isAllIn) {
      // 只有 All In 选项时直接执行
      onAction('allin');
    } else {
      setShowRaiseOptions(!showRaiseOptions);
    }
  };

  const handleRaiseOption = (option: { amount: number; isAllIn?: boolean }) => {
    setShowRaiseOptions(false);
    if (option.isAllIn) {
      onAction('allin');
    } else {
      onAction('raise', option.amount);
    }
  };

  return (
    <>
      {/* Raise 选项面板 */}
      {showRaiseOptions && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowRaiseOptions(false)}
        />
      )}

      <div className="fixed bottom-0 left-0 right-0 p-4 [@media(max-height:500px)]:p-1 bg-white/90 dark:bg-neutral-900/90 border-t border-zinc-200 dark:border-white/10 backdrop-blur md:static md:bg-transparent md:border-none md:p-0 flex justify-between md:justify-center gap-2 sm:gap-4 z-50">
        <button
          onClick={() => onAction('fold')}
          disabled={isDisabled}
          className="flex-1 md:flex-none md:w-[140px] bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed text-black dark:text-white font-bold h-12 md:h-14 [@media(max-height:700px)]:h-10 [@media(max-height:500px)]:h-8 [@media(max-height:400px)]:h-6 flex items-center justify-center px-1 md:px-2 rounded-lg shadow-lg active:scale-95 transition-all text-sm md:text-lg [@media(max-height:700px)]:text-xs [@media(max-height:500px)]:text-[10px] [@media(max-height:400px)]:text-[9px]"
        >
          Fold
        </button>

        <button
          onClick={() => onAction('call')}
          disabled={isDisabled}
          className="flex-1 md:flex-none md:w-[140px] bg-zinc-800 dark:bg-zinc-700 hover:bg-zinc-700 dark:hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold h-12 md:h-14 [@media(max-height:700px)]:h-10 [@media(max-height:500px)]:h-8 [@media(max-height:400px)]:h-6 flex items-center justify-center px-1 md:px-2 rounded-lg shadow-lg active:scale-95 transition-all text-sm md:text-lg [@media(max-height:700px)]:text-xs [@media(max-height:500px)]:text-[10px] [@media(max-height:400px)]:text-[9px] whitespace-nowrap"
        >
          {callAmount === 0 ? 'Check' : `Call $${callAmount}`}
        </button>

        {/* Raise 按钮 + 选项 */}
        <div className="relative flex-1 md:flex-none md:w-[140px]">
          {/* 选项面板 */}
          {showRaiseOptions && (
            <div className="absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-zinc-800 rounded-lg shadow-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden z-50 w-full min-w-[100px]">
              {raiseOptions.slice().reverse().map((option, idx) => (
                <button
                  key={idx}
                  onClick={() => handleRaiseOption(option)}
                  className={`w-full px-2 md:px-4 py-2 md:py-2.5 text-xs md:text-sm [@media(max-height:700px)]:py-1.5 [@media(max-height:500px)]:py-1 [@media(max-height:400px)]:py-0.5 [@media(max-height:500px)]:text-[10px] [@media(max-height:400px)]:text-[9px] font-bold transition-colors text-center whitespace-nowrap
                    ${option.isAllIn
                      ? 'bg-red-600 hover:bg-red-700 text-white border-b-2 border-red-500'
                      : 'hover:bg-zinc-100 dark:hover:bg-zinc-700 text-black dark:text-white border-b border-zinc-200 dark:border-zinc-700 last:border-b-0'
                    }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}

          <button
            onClick={handleRaiseClick}
            disabled={isDisabled || !canRaise}
            className={`w-full bg-black dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed text-white dark:text-black font-bold h-12 md:h-14 [@media(max-height:700px)]:h-10 [@media(max-height:500px)]:h-8 [@media(max-height:400px)]:h-6 flex items-center justify-center gap-1 px-1 md:px-2 rounded-lg shadow-lg active:scale-95 transition-all text-sm md:text-lg [@media(max-height:700px)]:text-xs [@media(max-height:500px)]:text-[10px] [@media(max-height:400px)]:text-[9px]
              ${showRaiseOptions ? 'ring-2 ring-blue-500' : ''}`}
          >
            <span>Raise</span>
            <span className="text-[10px] md:text-xs">{showRaiseOptions ? '▼' : '▲'}</span>
          </button>
        </div>
      </div>
    </>
  );
}
