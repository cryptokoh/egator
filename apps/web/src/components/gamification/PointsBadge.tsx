'use client';

import { Flame } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { usePoints } from './PointsProvider';

const RING_SIZE = 36;
const RING_STROKE = 2.5;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export function PointsBadge() {
  const { totalPoints, streak, currentMilestone, nextMilestone, milestoneProgress, recentAwards } = usePoints();
  const [pulsing, setPulsing] = useState(false);
  const prevPointsRef = useRef(totalPoints);

  // Pulse on point gain
  useEffect(() => {
    if (totalPoints > prevPointsRef.current) {
      setPulsing(true);
      const t = setTimeout(() => setPulsing(false), 500);
      prevPointsRef.current = totalPoints;
      return () => clearTimeout(t);
    }
    prevPointsRef.current = totalPoints;
  }, [totalPoints]);

  const strokeDashoffset = RING_CIRCUMFERENCE * (1 - milestoneProgress);

  return (
    <div className="relative group">
      {/* Badge with progress ring */}
      <div className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20 cursor-default transition-transform duration-300 ${pulsing ? 'points-pulse' : ''}`}>
        {/* Progress ring behind the flame icon */}
        <div className="relative w-4 h-4">
          <svg
            width={RING_SIZE}
            height={RING_SIZE}
            viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
            className="absolute -inset-[10px]"
          >
            {/* Background track */}
            <circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_RADIUS}
              fill="none"
              stroke="currentColor"
              strokeWidth={RING_STROKE}
              className="text-accent/10"
            />
            {/* Progress arc */}
            <circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_RADIUS}
              fill="none"
              stroke="currentColor"
              strokeWidth={RING_STROKE}
              strokeLinecap="round"
              strokeDasharray={RING_CIRCUMFERENCE}
              strokeDashoffset={strokeDashoffset}
              className="text-accent transition-all duration-700 ease-out"
              transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
            />
          </svg>
          <Flame className="w-4 h-4 text-accent relative z-10" />
        </div>

        <span className="text-sm font-semibold text-accent tabular-nums">
          {totalPoints}
        </span>

        {/* Streak flame - visible when streak > 1 */}
        {streak > 1 && (
          <div className="flex items-center gap-0.5 ml-0.5 pl-1.5 border-l border-accent/20">
            <span className={`text-xs ${streak >= 7 ? 'streak-fire-hot' : streak >= 3 ? 'streak-fire-warm' : ''}`}>
              {streak >= 7 ? '🔥' : '🔸'}
            </span>
            <span className="text-xs font-medium text-accent/70 tabular-nums">
              {streak}
            </span>
          </div>
        )}
      </div>

      {/* Hover tooltip with progress info */}
      <div className="absolute right-0 top-full mt-2 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-50">
        <div className="px-3 py-2.5 rounded-xl bg-bg-elevated/95 border border-border-subtle backdrop-blur-md shadow-lg whitespace-nowrap text-xs space-y-1.5">
          {/* Current status */}
          <p className="text-text-primary font-medium">
            {totalPoints} pts
            {currentMilestone && (
              <span className="text-accent ml-1.5">{currentMilestone.title}</span>
            )}
          </p>

          {/* Progress to next */}
          {nextMilestone && (
            <div>
              <div className="flex items-center justify-between text-text-tertiary mb-1">
                <span>{totalPoints}</span>
                <span>{nextMilestone.points} {nextMilestone.title}</span>
              </div>
              <div className="w-32 h-1.5 rounded-full bg-accent/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-accent transition-all duration-700 ease-out"
                  style={{ width: `${milestoneProgress * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Max level */}
          {!nextMilestone && currentMilestone && (
            <p className="text-accent/70">Max level reached!</p>
          )}

          {/* Streak */}
          {streak > 0 && (
            <p className="text-text-secondary pt-0.5 border-t border-border-subtle">
              {streak >= 7 ? '🔥' : streak >= 3 ? '🔸' : '·'} {streak} day streak
              {streak >= 3 && streak < 7 && <span className="text-text-tertiary ml-1">({7 - streak} to 🔥)</span>}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
