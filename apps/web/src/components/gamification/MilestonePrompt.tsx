'use client';

import { Flame, X } from 'lucide-react';
import { usePoints } from './PointsProvider';

export function MilestonePrompt() {
  const { showClaimPrompt, dismissClaimPrompt, totalPoints, currentMilestone } = usePoints();

  if (!showClaimPrompt) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[90] p-4 animate-slide-up">
      <div className="mx-auto max-w-md">
        <div className="relative rounded-2xl bg-bg-elevated/95 border border-border-subtle backdrop-blur-md shadow-xl shadow-black/30 p-5">
          {/* Close */}
          <button
            onClick={dismissClaimPrompt}
            className="absolute top-3 right-3 p-1 rounded-lg hover:bg-bg-surface/50 text-text-tertiary hover:text-text-secondary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Content */}
          <div className="flex items-start gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-accent/15 flex-shrink-0">
              <Flame className="w-6 h-6 text-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-text-primary">
                {totalPoints} points earned!
              </p>
              <p className="text-xs text-text-secondary mt-1">
                {currentMilestone
                  ? `You've reached ${currentMilestone.title}. `
                  : ''}
                Register to save your progress and unlock referral rewards.
              </p>
            </div>
          </div>

          {/* Actions - intentionally inverted: "Maybe later" is prominent */}
          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={dismissClaimPrompt}
              className="flex-1 px-4 py-2.5 rounded-xl bg-bg-surface text-sm font-medium text-text-primary hover:bg-bg-overlay transition-colors"
            >
              Maybe later
            </button>
            <button
              onClick={() => {
                dismissClaimPrompt();
                // Future: open registration modal/redirect
              }}
              className="px-4 py-2.5 rounded-xl text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              Register
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
