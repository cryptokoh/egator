'use client';

import { usePoints } from './PointsProvider';

const variantStyles = {
  default: {
    border: 'border-accent/30',
    shadow: 'shadow-accent/10',
    amountColor: 'text-accent',
  },
  bonus: {
    border: 'border-amber-400/40',
    shadow: 'shadow-amber-400/15',
    amountColor: 'text-amber-400',
  },
  info: {
    border: 'border-emerald-400/30',
    shadow: 'shadow-emerald-400/10',
    amountColor: 'text-emerald-400',
  },
};

export function PointsPopup() {
  const { recentAwards } = usePoints();

  if (recentAwards.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col-reverse gap-2 pointer-events-none">
      {recentAwards.map((award) => {
        const style = variantStyles[award.variant] || variantStyles.default;
        return (
          <div
            key={award.id}
            className={`points-toast flex items-center gap-2 px-4 py-2 rounded-xl bg-bg-elevated/95 border ${style.border} backdrop-blur-md shadow-lg ${style.shadow}`}
          >
            {award.variant === 'bonus' && (
              <span className="text-sm">&#x2728;</span>
            )}
            <span className={`text-lg font-bold ${style.amountColor}`}>
              +{award.amount}
            </span>
            <span className="text-sm text-text-secondary">{award.label}</span>
          </div>
        );
      })}
    </div>
  );
}
