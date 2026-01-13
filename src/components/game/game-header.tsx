import { ThemeToggle } from '@/components/theme-toggle';
import { LanguageToggle } from '@/components/language-toggle';
import { useTranslation } from 'react-i18next';
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
    const { t } = useTranslation();
    return (
        <>
            {/* Top Left Controls - Auto Play */}
            <div className="absolute top-4 left-4 z-50 flex items-center gap-4">
                <button
                    onClick={onToggleAutoPlay}
                    className={`flex items-center gap-2 h-8 px-3 rounded-full border shadow-sm transition-all hover:opacity-80 active:scale-95
            ${isAutoPlay
                            ? 'bg-gradient-to-r from-green-500 to-emerald-600 border-transparent text-white ring-2 ring-green-200 dark:ring-green-900'
                            : 'bg-white dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700'
                        }`}
                    title={isAutoPlay ? t('common.auto_off_title') : t('common.auto_on_title')}
                >
                    <span className={`text-xs font-bold ${isAutoPlay ? 'animate-pulse' : ''}`}>
                        {isAutoPlay ? t('common.auto_playing') : t('common.auto_play')}
                    </span>
                </button>
            </div>

            {/* Top Right Controls */}
            <div className="absolute top-4 right-4 z-50 flex items-center gap-4">
                {/* Round Counter & Leaderboard Trigger */}
                <button
                    onClick={onShowLeaderboard}
                    className="flex items-center justify-center md:justify-start gap-2 rounded-full border shadow-sm transition-all hover:opacity-80 active:scale-95 bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700
                    w-8 h-8 p-0 md:w-auto md:px-3"
                    title={t('common.leaderboard_btn')}
                >
                    <span className="text-xs font-bold md:hidden">
                        {roundLimit
                            ? t('common.round_info_limit_short', { current: currentRoundNumber, limit: roundLimit })
                            : t('common.round_info_short', { current: currentRoundNumber })}
                    </span>
                    <span className="text-xs font-bold hidden md:block">
                        {roundLimit
                            ? t('common.round_info_limit', { current: currentRoundNumber, limit: roundLimit })
                            : t('common.round_info', { current: currentRoundNumber })}
                    </span>
                </button>

                {/* Current Mode Display & Reset Trigger - with Dialog Confirmation */}
                <Dialog>
                    <DialogTrigger asChild>
                        <button
                            className={`flex items-center justify-center md:justify-start gap-2 rounded-full border shadow-sm transition-all hover:opacity-80 active:scale-95
                                w-8 h-8 p-0 md:w-auto md:px-3
                ${aiMode === 'super'
                                    ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white'
                                    : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700'
                                }`}
                            title={t('common.switch_mode_title')}
                        >
                            {aiMode === 'super' ? (
                                <Brain className="w-4 h-4" />
                            ) : (
                                <Bot className="w-4 h-4" />
                            )}
                            <span className="hidden md:block text-xs font-bold">
                                {aiMode === 'super' ? t('menu.super_mode') : t('menu.normal_mode')}
                            </span>
                        </button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{t('common.restart_confirm_title')}</DialogTitle>
                            <DialogDescription>
                                {t('common.restart_confirm_desc')}
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <DialogClose asChild>
                                <Button variant="outline">{t('common.cancel')}</Button>
                            </DialogClose>
                            <Button variant="destructive" onClick={onExitGame}>
                                {t('common.confirm_restart')}
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
                <LanguageToggle />
                <ThemeToggle />
            </div>
        </>
    );
}
