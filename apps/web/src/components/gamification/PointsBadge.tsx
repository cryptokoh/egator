'use client';

import { Flame } from 'lucide-react';
import { usePoints } from './PointsProvider';

export function PointsBadge() {
  const { totalPoints } = usePoints();

  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20">
      <Flame className="w-4 h-4 text-accent" />
      <span className="text-sm font-semibold text-accent tabular-nums">
        {totalPoints}
      </span>
    </div>
  );
}
