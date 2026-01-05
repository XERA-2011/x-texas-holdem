import { useState } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ControlsProps {
  onAction: (action: 'fold' | 'call' | 'raise' | 'allin') => void;
  canRaise: boolean;
  callAmount: number;
  isHumanTurn: boolean;
  showNextRound: boolean;
  onNextRound: () => void;
  isGameOver?: boolean;
  onReset?: () => void;
}

export function GameControls({
  onAction,
  canRaise,
  callAmount,
  isHumanTurn,
  showNextRound,
  onNextRound,
  isGameOver,
  onReset
}: ControlsProps) {
  const [showConfirmAllIn, setShowConfirmAllIn] = useState(false);

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

  return (
    <>
      <Dialog open={showConfirmAllIn} onOpenChange={setShowConfirmAllIn}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirm All In?</DialogTitle>
            <DialogDescription className="sr-only">
              Are you sure you want to go all in? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col sm:flex-col gap-3 w-full items-center">
            <Button
              size="lg"
              className="w-full font-bold bg-red-600 hover:bg-red-700 text-white hover:text-white border-2 border-red-500"
              onClick={() => {
                onAction('allin');
                setShowConfirmAllIn(false);
              }}
            >
              YES, ALL IN!
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-full"
              onClick={() => setShowConfirmAllIn(false)}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 dark:bg-neutral-900/90 border-t border-zinc-200 dark:border-white/10 backdrop-blur md:static md:bg-transparent md:border-none md:p-0 flex justify-center gap-2 sm:gap-4 z-50">
        <button
          onClick={() => onAction('fold')}
          disabled={isDisabled}
          className="flex-1 max-w-[100px] md:max-w-[140px] bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed text-black dark:text-white font-bold h-14 flex items-center justify-center px-2 rounded-lg shadow-lg active:scale-95 transition-all md:text-lg"
        >
          Fold
        </button>

        <button
          onClick={() => onAction('call')}
          disabled={isDisabled}
          className="flex-1 max-w-[100px] md:max-w-[140px] bg-zinc-800 dark:bg-zinc-700 hover:bg-zinc-700 dark:hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold h-14 flex items-center justify-center px-2 rounded-lg shadow-lg active:scale-95 transition-all md:text-lg"
        >
          {callAmount === 0 ? 'Check' : `Call $${callAmount}`}
        </button>

        <button
          onClick={() => onAction('raise')}
          disabled={isDisabled || !canRaise}
          className="flex-1 max-w-[100px] md:max-w-[140px] bg-black dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed text-white dark:text-black font-bold h-14 flex items-center justify-center px-2 rounded-lg shadow-lg active:scale-95 transition-all md:text-lg"
        >
          Raise (+20)
        </button>

        <button
          onClick={() => setShowConfirmAllIn(true)}
          disabled={isDisabled}
          className="flex-none w-[80px] md:w-[100px] bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black h-14 flex flex-col items-center justify-center px-2 rounded-lg shadow-lg active:scale-95 transition-all md:text-lg border-2 border-red-500"
        >
          <span className="leading-none text-sm md:text-base">ALL</span>
          <span className="leading-none text-sm md:text-base">IN</span>
        </button>
      </div>
    </>
  );
}
