import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { GameLog as GameLogType, Player, Card, Rank, Suit } from '@/lib/poker-engine';
import { Card as CardUI } from './card';

interface LogProps {
  logs: GameLogType[];
  players?: Player[];
  communityCards?: Card[];
}


// Helper to create cards for display
const c = (r: Rank, s: Suit) => new Card(r, s);

const HAND_PATTERNS = [
  { key: 'straight_flush', cards: [c('A', '♠'), c('K', '♠'), c('Q', '♠'), c('J', '♠'), c('T', '♠')], winningIndices: [0, 1, 2, 3, 4] },
  { key: 'quads', cards: [c('A', '♠'), c('A', '♥'), c('A', '♣'), c('A', '♦'), c('K', '♠')], winningIndices: [0, 1, 2, 3] },
  { key: 'full_house', cards: [c('A', '♠'), c('A', '♥'), c('A', '♣'), c('K', '♠'), c('K', '♥')], winningIndices: [0, 1, 2, 3, 4] },
  { key: 'flush', cards: [c('A', '♠'), c('J', '♠'), c('8', '♠'), c('5', '♠'), c('2', '♠')], winningIndices: [0, 1, 2, 3, 4] },
  { key: 'straight', cards: [c('Q', '♠'), c('J', '♥'), c('T', '♦'), c('9', '♣'), c('8', '♠')], winningIndices: [0, 1, 2, 3, 4] },
  { key: 'trips', cards: [c('A', '♠'), c('A', '♥'), c('A', '♣'), c('K', '♠'), c('Q', '♥')], winningIndices: [0, 1, 2] },
  { key: 'two_pair', cards: [c('A', '♠'), c('A', '♥'), c('K', '♣'), c('K', '♠'), c('Q', '♥')], winningIndices: [0, 1, 2, 3] },
  { key: 'pair', cards: [c('A', '♠'), c('A', '♥'), c('K', '♣'), c('Q', '♠'), c('J', '♥')], winningIndices: [0, 1] },
  { key: 'high_card', cards: [c('A', '♠'), c('K', '♥'), c('Q', '♣'), c('J', '♠'), c('9', '♥')], winningIndices: [0] },
];

export function GameLog({ logs, players, communityCards }: LogProps) {
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'history_copied'>('idle');
  const [showRules, setShowRules] = useState(false);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="w-[85%] sm:w-full mx-auto flex flex-col bg-white/90 dark:bg-black/40 border border-zinc-200 dark:border-white/10 rounded-lg backdrop-blur-sm shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-2 py-1 border-b border-zinc-200 dark:border-white/10 bg-zinc-50/50 dark:bg-white/5">
        <span className="text-xs md:text-sm font-bold text-zinc-700 dark:text-gray-400">{t('common.game_log')}</span>
        <div className="flex gap-2">
          {/* Rules Modal */}
          <Dialog open={showRules} onOpenChange={setShowRules}>
            <DialogContent className="sm:max-w-[400px] max-h-[85vh] overflow-y-auto w-[95%] rounded-xl">
              <DialogHeader>
                <DialogTitle>{t('common.hand_ranks_title')}</DialogTitle>
                <DialogDescription className="sr-only">
                  {t('common.hand_ranks_desc')}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-1">
                {HAND_PATTERNS.map((ex, i) => (
                  <div key={i} className="flex items-center justify-between pb-1 pt-1 border-b border-zinc-100 dark:border-white/5 last:border-0">
                    <div className="font-bold text-xs text-zinc-800 dark:text-zinc-200">
                      {t(`hands.${ex.key}`)}
                    </div>
                    <div className="flex gap-1">
                      {ex.cards.map((card, idx) => {
                        const isWinning = ex.winningIndices.includes(idx);
                        return (
                          <CardUI
                            key={idx}
                            card={card}
                            className={`!w-6 !h-9 sm:!w-8 sm:!h-11 text-[8px] sm:text-[10px] ${isWinning
                              ? '!border-yellow-500 !border-3 shadow-[0_0_4px_rgba(234,179,8,0.4)]'
                              : '!border-transparent'
                              }`}
                          />
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </DialogContent>
          </Dialog>

          <button
            onClick={() => setShowRules(true)}
            className="text-[10px] px-2 py-0.5 rounded transition-all duration-300 bg-zinc-800 dark:bg-white hover:bg-zinc-700 dark:hover:bg-zinc-200 text-white dark:text-black border border-zinc-700 dark:border-zinc-300"
          >
            {t('common.rules')}
          </button>

          <button
            onClick={() => {
              if (!players) return;
              let text = "=== Hand History ===\n\n";

              if (communityCards && communityCards.length > 0) {
                text += `Public Cards: [${communityCards.map(c => c.toString()).join(' ')}]\n\n`;
              }

              text += "-- Player Status (End of Hand) --\n";
              players.forEach(p => {
                let status: string = p.status;
                if (p.isEliminated) status = 'Eliminated';

                // For debugging: Always show hands if available
                const handStr = p.hand.map(c => c.toString()).join(' ');

                text += `${p.name}: $${p.chips} (Bet: $${p.currentBet}) [${status}] {${handStr}}\n`;
              });
              text += "\n-- Action Logs --\n";
              [...logs].reverse().forEach(l => {
                const clean = l.message.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ');
                text += `[${l.type.toUpperCase()}] ${clean}\n`;
              });

              // Modern clipboard API
              if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(text).then(() => {
                  setCopyState('history_copied');
                  setTimeout(() => setCopyState('idle'), 2000);
                }).catch((e) => {
                  console.error(e);
                  alert(t('common.copy_fail'));
                });
              } else {
                // Non-secure context or incompatible browser
                alert(t('common.copy_fail'));
              }
            }}
            className={`text-[10px] px-2 py-0.5 rounded transition-all duration-300 ${copyState === 'history_copied'
              ? 'bg-green-500 text-white'
              : 'bg-zinc-800 dark:bg-white hover:bg-zinc-700 dark:hover:bg-zinc-200 text-white dark:text-black border border-zinc-700 dark:border-zinc-300'}`}
          >
            {copyState === 'history_copied' ? t('common.copied') : t('common.copy_hand')}
          </button>


        </div>
      </div>

      {/* Log Content */}
      <div
        ref={scrollRef}
        className="h-24 sm:h-36 overflow-y-auto p-2 font-mono text-xs md:text-sm text-zinc-700 dark:text-gray-300 scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-gray-700 scrollbar-track-transparent"
      >
        {logs.length === 0 && <div className="text-center text-gray-500 italic">{t('common.game_log_placeholder')}</div>}
        {logs.map((log) => (
          <div key={log.id} className="mb-0.5 leading-tight">
            {log.type === 'phase' && (
              <div className="text-zinc-900 dark:text-zinc-100 font-bold border-t border-zinc-200 dark:border-white/10 mt-1 pt-1">
                {log.message}
              </div>
            )}
            {log.type === 'win' && (
              <div className="text-zinc-900 dark:text-white font-extrabold underline decoration-dotted decoration-zinc-500">
                {log.message}
              </div>
            )}
            {log.type === 'action' && (
              <div className="text-zinc-600 dark:text-zinc-400">
                {log.message}
              </div>
            )}
            {log.type === 'normal' && (
              <div className="text-zinc-500 dark:text-zinc-500">
                {log.message}
              </div>
            )}
            {log.type === 'showdown' && (
              <div className="text-zinc-800 dark:text-zinc-200 font-bold italic">
                {log.message}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
