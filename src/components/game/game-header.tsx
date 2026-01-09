import { ThemeToggle } from '@/components/theme-toggle';
import { GithubIcon } from '@/components/icons/github-icon';
import { Bot, Brain } from 'lucide-react';
import type { AIMode } from '@/lib/poker/types';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface GameHeaderProps {
    roundLimit: number | null;
    currentRoundNumber: number;
    aiMode: AIMode;
    isAutoPlay: boolean;
    onToggleAutoPlay: () => void;
    onExitGame: () => void;
    onShowLeaderboard: () => void;
}

export function GameHeader({
    roundLimit,
    currentRoundNumber,
    aiMode,
    isAutoPlay,
    onToggleAutoPlay,
    onExitGame,
    onShowLeaderboard
}: GameHeaderProps) {
    return (
        <>
            {/* Top Left Controls - Auto Play */}
            <div className="absolute top-4 left-4 z-50 flex items-center gap-4">
                <button
                    onClick={onToggleAutoPlay}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full border shadow-sm transition-all hover:opacity-80 active:scale-95
            ${isAutoPlay
                            ? 'bg-gradient-to-r from-green-500 to-emerald-600 border-transparent text-white ring-2 ring-green-200 dark:ring-green-900'
                            : 'bg-white dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700'
                        }`}
                    title={isAutoPlay ? "点击关闭自动托管" : "点击开启自动托管"}
                >
                    <span className={`text-xs font-bold ${isAutoPlay ? 'animate-pulse' : ''}`}>
                        {isAutoPlay ? '自动中' : '自动'}
                    </span>
                </button>
            </div>

            {/* Top Right Controls */}
            <div className="absolute top-4 right-4 z-50 flex items-center gap-4">
                {/* Round Counter & Leaderboard Trigger */}
                <button
                    onClick={onShowLeaderboard}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full border shadow-sm transition-all hover:opacity-80 active:scale-95 bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700"
                    title="点击查看排名"
                >
                    <span className="text-xs font-bold">
                        {roundLimit
                            ? `第 ${currentRoundNumber}/${roundLimit} 局`
                            : `第 ${currentRoundNumber} 局`}
                    </span>
                </button>

                {/* Current Mode Display & Reset Trigger - with Dialog Confirmation */}
                <Dialog>
                    <DialogTrigger asChild>
                        <button
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-full border shadow-sm transition-all hover:opacity-80 active:scale-95
            ${aiMode === 'super'
                                    ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white'
                                    : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700'
                                }`}
                            title="点击切换模式（将重新开始游戏）"
                        >
                            {aiMode === 'super' ? (
                                <Brain className="w-4 h-4" />
                            ) : (
                                <Bot className="w-4 h-4" />
                            )}
                            <span className="hidden md:block text-xs font-bold">
                                {aiMode === 'super' ? '超级电脑' : '普通电脑'}
                            </span>
                        </button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>重新开始游戏？</DialogTitle>
                            <DialogDescription>
                                切换模式将结束当前对局，所有进度将丢失。
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <DialogClose asChild>
                                <Button variant="outline">取消</Button>
                            </DialogClose>
                            <Button variant="destructive" onClick={onExitGame}>
                                确认重开
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

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
        </>
    );
}
