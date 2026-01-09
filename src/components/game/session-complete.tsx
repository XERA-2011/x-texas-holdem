import { ThemeToggle } from '@/components/theme-toggle';
import { GithubIcon } from '@/components/icons/github-icon';
import { Trophy } from 'lucide-react';
import type { Player, AIMode } from '@/lib/poker/types';

interface SessionCompleteProps {
    roundLimit: number | null;
    roundsPlayed: number;
    aiMode: AIMode;
    leaderboard: { rank: number; player: Player; delta: number }[];
    onStartNewSession: () => void;
    onExitGame: () => void;
}

export function SessionComplete({
    roundLimit,
    roundsPlayed,
    aiMode,
    leaderboard,
    onStartNewSession,
    onExitGame
}: SessionCompleteProps) {
    return (
        <div className="relative flex h-dvh items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4">
            {/* Top Right Controls */}
            <div className="absolute top-4 right-4 z-50 flex items-center gap-4">
                <a
                    href="https://github.com/XERA-2011/x-texas-holdem"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center rounded-full w-8 h-8 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                    aria-label="GitHub Source Code"
                >
                    <GithubIcon className="w-5 h-5" />
                </a>
                <ThemeToggle />
            </div>

            <div className="max-w-2xl w-full bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 p-4 sm:p-8 space-y-4 sm:space-y-6">
                {/* Title */}
                <div className="text-center space-y-2">
                    <div className="flex items-center justify-center gap-3">
                        <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                            {aiMode === 'super' ? '超级电脑 对局结束' : '普通电脑 对局结束'}
                        </h1>
                    </div>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        {roundLimit ? `${roundLimit} 局已完成` : `无限制模式结束 (共 ${roundsPlayed} 局)`}
                    </p>
                </div>

                {/* Leaderboard */}
                <div className="space-y-2">
                    <div className="grid grid-cols-12 gap-1 sm:gap-2 px-2 sm:px-4 py-2 text-xs font-bold text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-700">
                        <div className="col-span-2 text-center">排名</div>
                        <div className="col-span-4">玩家</div>
                        <div className="col-span-3 text-right">筹码</div>
                        <div className="col-span-3 text-right">变化</div>
                    </div>
                    {leaderboard.map(({ rank, player, delta }) => (
                        <div
                            key={player.id}
                            className={`grid grid-cols-12 gap-1 sm:gap-2 px-2 sm:px-4 py-3 rounded-lg transition-colors ${player.isHuman
                                ? 'bg-zinc-100 dark:bg-zinc-800 font-bold'
                                : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                                }`}
                        >
                            <div className="col-span-2 flex items-center justify-center">
                                {rank === 1 ? (
                                    <Trophy className="w-5 h-5 text-yellow-500 dark:text-yellow-400" />
                                ) : (
                                    <span className="text-zinc-500 dark:text-zinc-400">#{rank}</span>
                                )}
                            </div>
                            <div className="col-span-4 flex items-center text-zinc-900 dark:text-zinc-100">
                                {player.name}
                            </div>
                            <div className="col-span-3 flex items-center justify-end text-zinc-900 dark:text-zinc-100">
                                ${player.chips}
                            </div>
                            <div className={`col-span-3 flex items-center justify-end font-medium ${delta > 0 ? 'text-green-600 dark:text-green-400' : delta < 0 ? 'text-red-600 dark:text-red-400' : 'text-zinc-500'
                                }`}>
                                {delta > 0 ? '+' : ''}{delta === 0 ? '±0' : (delta < 0 ? `-$${Math.abs(delta)}` : `$${delta}`)}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-4 pt-4">
                    <button
                        onClick={onStartNewSession}
                        className="px-6 py-3 bg-black dark:bg-white text-white dark:text-black font-bold rounded-lg hover:opacity-80 active:scale-95 transition-all"
                    >
                        继续下一轮
                    </button>
                    <button
                        onClick={onExitGame}
                        className="px-6 py-3 bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 font-bold rounded-lg hover:bg-zinc-300 dark:hover:bg-zinc-600 active:scale-95 transition-all"
                    >
                        返回主菜单
                    </button>
                </div>
            </div>
        </div>
    );
}
