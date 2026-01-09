import { useState } from 'react';
import { ThemeToggle } from '@/components/theme-toggle';
import { GithubIcon } from '@/components/icons/github-icon';
import { InfinityIcon } from '@/components/icons/infinity-icon';
import { Bot, Brain } from 'lucide-react';

interface ModeSelectionProps {
    onStartGame: (mode: 'normal' | 'super', roundLimit: number | null) => void;
}

export function ModeSelection({ onStartGame }: ModeSelectionProps) {
    const [roundLimitEnabled, setRoundLimitEnabled] = useState(false);
    const ROUND_LIMIT = 8;

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
            <div className="max-w-md w-full bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 p-8 text-center space-y-8">
                <div className="space-y-2">
                    <h1 className="text-2xl font-black text-zinc-900 dark:text-zinc-100">
                        单机德州扑克
                    </h1>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    {/* Normal Mode Button */}
                    <button
                        onClick={() => onStartGame('normal', roundLimitEnabled ? ROUND_LIMIT : null)}
                        className="group flex flex-col items-center justify-center p-5 rounded-2xl border-2 border-zinc-200 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-500 bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
                    >
                        <div className="p-3 bg-white dark:bg-zinc-800 rounded-full shadow-sm group-hover:scale-110 transition-transform mb-3">
                            <Bot className="w-8 h-8 text-zinc-900 dark:text-zinc-100" />
                        </div>
                        <div className="font-bold text-base text-zinc-900 dark:text-zinc-100">普通电脑</div>
                    </button>

                    {/* Super Mode Button */}
                    <button
                        onClick={() => onStartGame('super', roundLimitEnabled ? ROUND_LIMIT : null)}
                        className="group relative flex flex-col items-center justify-center p-5 rounded-2xl border-2 border-zinc-200 dark:border-zinc-700 hover:border-black dark:hover:border-white bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
                    >
                        {/* Badge */}
                        <span className="absolute top-[-8px] right-[-8px] bg-black text-white dark:bg-white dark:text-black text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg">
                            硬核
                        </span>

                        <div className="p-3 bg-white dark:bg-zinc-800 rounded-full shadow-sm group-hover:scale-110 transition-transform mb-3">
                            <Brain className="w-8 h-8 text-zinc-900 dark:text-zinc-100" />
                        </div>
                        <div className="font-bold text-base text-zinc-900 dark:text-zinc-100">超级电脑</div>
                    </button>
                </div>

                {/* Round Limit Toggle - 3D Circular Button Design */}
                <button
                    onClick={() => setRoundLimitEnabled(!roundLimitEnabled)}
                    className="group flex flex-col items-center justify-center w-20 h-20 rounded-full font-bold active:scale-95 transition-all select-none mx-auto
            bg-gradient-to-b from-zinc-600 via-zinc-800 to-zinc-950
            dark:bg-gradient-to-b dark:from-white dark:via-zinc-100 dark:to-zinc-300
            text-white dark:text-zinc-800
            shadow-[0_6px_20px_rgba(0,0,0,0.4),inset_0_2px_4px_rgba(255,255,255,0.15),inset_0_-2px_4px_rgba(0,0,0,0.3)]
            dark:shadow-[0_6px_20px_rgba(0,0,0,0.3),inset_0_2px_4px_rgba(255,255,255,0.9),inset_0_-2px_4px_rgba(0,0,0,0.1)]
            hover:shadow-[0_8px_25px_rgba(0,0,0,0.5),inset_0_2px_4px_rgba(255,255,255,0.2),inset_0_-2px_4px_rgba(0,0,0,0.4)]
            dark:hover:shadow-[0_8px_25px_rgba(0,0,0,0.4),inset_0_2px_4px_rgba(255,255,255,1),inset_0_-2px_4px_rgba(0,0,0,0.15)]
            border border-zinc-500 dark:border-zinc-400"
                >
                    {/* Rotating Icon */}
                    <div
                        className="transition-transform duration-500 ease-in-out"
                        style={{
                            transform: roundLimitEnabled ? 'rotate(90deg)' : 'rotate(0deg)'
                        }}
                    >
                        <InfinityIcon className="w-7 h-7" />
                    </div>
                    <span className="text-[10px] mt-1 font-semibold">
                        {roundLimitEnabled ? '8 局制' : '无限制'}
                    </span>
                </button>
            </div>
        </div>
    );
}
