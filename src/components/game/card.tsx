import { Card as CardType } from '@/lib/poker-engine';
import { Check } from 'lucide-react';

interface CardProps {
  card?: CardType;
  hidden?: boolean;
  className?: string;
  isWinning?: boolean;
}

export function Card({ card, hidden, className = "", isWinning }: CardProps) {
  if (hidden || !card) {
    return (
      <div
        className={`w-8 h-11 sm:w-12 sm:h-16 bg-zinc-800 border-[1px] sm:border-2 border-zinc-600 rounded-sm sm:rounded-md shadow-sm bg-[repeating-linear-gradient(45deg,#52525b,#52525b_1px,transparent_1px,transparent_8px),repeating-linear-gradient(-45deg,#52525b,#52525b_1px,transparent_1px,transparent_8px)] bg-[position:center] ${className}`}
      />
    );
  }

  const isRed = card.color === 'red';

  return (
    <div
      className={`
        w-8 h-11 sm:w-12 sm:h-16 bg-white rounded-sm sm:rounded-md shadow-sm flex flex-col items-center justify-center select-none
        border-[1px] sm:border-2 border-gray-200
        relative overflow-hidden
        ${className}
      `}
    >
      {isWinning && (
        <div className="absolute bottom-0 right-0 z-20 pointer-events-none">
          <div className="w-5 h-5 sm:w-7 sm:h-7 bg-yellow-500" style={{ clipPath: 'polygon(100% 0, 0 100%, 100% 100%)' }} />
          <Check className="absolute bottom-[1px] right-[1px] w-3 h-3 sm:w-4 sm:h-4 text-white stroke-[4]" />
        </div>
      )}
      <div className={`text-xs sm:text-lg font-bold leading-none ${isRed ? 'text-red-600' : 'text-gray-900'}`}>
        {card.suit}
      </div>
      <div className={`text-[10px] sm:text-base font-bold leading-none ${isRed ? 'text-red-600' : 'text-gray-900'}`}>
        {card.rank === 'T' ? '10' : card.rank}
      </div>
    </div>
  );
}
