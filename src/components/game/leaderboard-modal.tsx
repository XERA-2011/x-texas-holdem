import { X, BarChart3, Trophy } from 'lucide-react';
import type { Player } from '@/lib/poker/types';

interface LeaderboardModalProps {
    isOpen: boolean;
    onClose: () => void;
    roundLimit: number | null;
    currentRoundNumber: number;
    leaderboard: { rank: number; player: Player; delta: number }[];
}

export function LeaderboardModal({
    isOpen,
    onClose,
    roundLimit,
    currentRoundNumber,
    leaderboard
}: LeaderboardModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="max-w-2xl w-full bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 p-4 sm:p-8 space-y-4 sm:space-y-6 relative animate-in zoom-in-95 duration-200">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Title */}
                <div className="text-center space-y-2">
                    <div className="flex items-center justify-center gap-3">
                        <BarChart3 className="w-8 h-8 text-zinc-900 dark:text-zinc-100" />
                        <h2 className="text-2xl font-black text-zinc-900 dark:text-zinc-100">
                            实时排名
                        </h2>
                    </div>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        {roundLimit
                            ? `当前进度: 第 ${currentRoundNumber}/${roundLimit} 局`
                            : `当前进度: 第 ${currentRoundNumber} 局`}
                    </p>
                </div>

                {/* Leaderboard Table */}
                <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                    <div className="grid grid-cols-12 gap-1 sm:gap-2 px-2 sm:px-4 py-2 text-xs font-bold text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-700 sticky top-0 bg-white dark:bg-zinc-900 z-10">
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
                            <div className="col-span-4 flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
                                <span>{player.name}</span>
                                {player.chips <= 0 && <span className="text-xs text-red-500 font-bold">(已淘汰)</span>}
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
            </div>
        </div>
    );
}
