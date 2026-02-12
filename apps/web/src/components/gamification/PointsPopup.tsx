'use client';

import { usePoints } from './PointsProvider';

export function PointsPopup() {
  const { recentAwards } = usePoints();

  if (recentAwards.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col-reverse gap-2 pointer-events-none">
      {recentAwards.map((award) => (
        <div
          key={award.id}
          className="points-toast flex items-center gap-2 px-4 py-2 rounded-xl bg-bg-elevated/95 border border-accent/30 backdrop-blur-md shadow-lg shadow-accent/10"
        >
          <span className="text-lg font-bold text-accent">
            +{award.amount}
          </span>
          <span className="text-sm text-text-secondary">{award.label}</span>
        </div>
      ))}
    </div>
  );
}
