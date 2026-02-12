'use client';

import { X, Flame } from 'lucide-react';
import { usePoints } from './PointsProvider';

export function MilestoneBanner() {
  const { activeMilestone, dismissMilestone } = usePoints();

  if (!activeMilestone) return null;

  return (
    <div className="relative overflow-hidden animate-slide-down">
      <div className="mx-auto max-w-3xl px-4 py-3">
        <div className="relative flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-accent/20 via-accent/10 to-transparent border border-accent/20 backdrop-blur-sm overflow-hidden">
          {/* Shimmer overlay */}
          <div className="absolute inset-0 milestone-shimmer pointer-events-none" />

          <div className="relative flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-accent/20 milestone-icon-glow">
              <Flame className="w-4 h-4 text-accent" />
            </div>
            <div>
              <p className="text-sm font-semibold text-accent">
                {activeMilestone.title}
              </p>
              <p className="text-xs text-text-secondary">
                {activeMilestone.message}
              </p>
            </div>
          </div>
          <button
            onClick={dismissMilestone}
            className="relative p-1 rounded-lg hover:bg-bg-surface/50 text-text-tertiary hover:text-text-secondary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
