'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

// ============================================================================
// Types
// ============================================================================

type AwardVariant = 'default' | 'bonus' | 'info';

interface PointAward {
  id: string;
  amount: number;
  label: string;
  timestamp: number;
  variant: AwardVariant;
}

interface Milestone {
  points: number;
  level: number;
  title: string;
  message: string;
}

const MILESTONES: Milestone[] = [
  { points: 25, level: 1, title: 'Explorer', message: "You're getting the hang of this!" },
  { points: 50, level: 2, title: 'Seeker', message: "You've found your rhythm." },
  { points: 100, level: 3, title: 'Pathfinder', message: '100 points - you know your way around.' },
  { points: 250, level: 4, title: 'Navigator', message: 'A true navigator of vibes.' },
  { points: 500, level: 5, title: 'Trailblazer', message: 'Half a thousand. Impressive.' },
  { points: 1000, level: 6, title: 'Legend', message: 'Welcome to the 1K club.' },
];

// Claim prompt shown at 25 and 100 only
const CLAIM_PROMPT_THRESHOLDS = [25, 100];

interface PointsContextValue {
  totalPoints: number;
  recentAwards: PointAward[];
  awardPoints: (amount: number, label: string, variant?: AwardVariant) => void;
  dismissAward: (id: string) => void;
  currentMilestone: Milestone | null;
  nextMilestone: Milestone | null;
  milestoneProgress: number; // 0-1 progress toward next milestone
  activeMilestone: Milestone | null; // newly reached milestone (for banner)
  dismissMilestone: () => void;
  showClaimPrompt: boolean;
  dismissClaimPrompt: () => void;
  anonId: string;
  streak: number;
}

const PointsContext = createContext<PointsContextValue | null>(null);

// ============================================================================
// Storage keys
// ============================================================================

const STORAGE_KEY = 'aiegator-points';
const ANON_ID_KEY = 'aiegator-anon-id';
const MILESTONE_KEY = 'aiegator-milestone-level';
const CLAIM_DISMISSED_KEY = 'aiegator-claim-dismissed';
const STREAK_KEY = 'aiegator-streak';
const LAST_ACTIVE_KEY = 'aiegator-last-active';
const REF_CODE_KEY = 'aiegator-ref-code';

// ============================================================================
// Helpers
// ============================================================================

function getOrCreateAnonId(): string {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem(ANON_ID_KEY);
  if (!id) {
    id = `anon-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    localStorage.setItem(ANON_ID_KEY, id);
  }
  return id;
}

function getMilestoneForPoints(total: number): Milestone | null {
  for (let i = MILESTONES.length - 1; i >= 0; i--) {
    if (total >= MILESTONES[i].points) return MILESTONES[i];
  }
  return null;
}

function getNextMilestone(total: number): Milestone | null {
  for (const m of MILESTONES) {
    if (total < m.points) return m;
  }
  return null;
}

function getMilestoneProgress(total: number): number {
  const current = getMilestoneForPoints(total);
  const next = getNextMilestone(total);
  if (!next) return 1; // maxed out
  const floor = current?.points ?? 0;
  const range = next.points - floor;
  if (range <= 0) return 0;
  return (total - floor) / range;
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

// ============================================================================
// Provider
// ============================================================================

export function PointsProvider({ children }: { children: React.ReactNode }) {
  const [totalPoints, setTotalPoints] = useState(0);
  const [recentAwards, setRecentAwards] = useState<PointAward[]>([]);
  const [milestoneLevel, setMilestoneLevel] = useState(0);
  const [activeMilestone, setActiveMilestone] = useState<Milestone | null>(null);
  const [showClaimPrompt, setShowClaimPrompt] = useState(false);
  const [anonId, setAnonId] = useState('');
  const [streak, setStreak] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const claimDismissedRef = useRef<Set<number>>(new Set());

  // Hydrate from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const storedMilestone = localStorage.getItem(MILESTONE_KEY);
    const storedStreak = localStorage.getItem(STREAK_KEY);
    const storedDismissed = localStorage.getItem(CLAIM_DISMISSED_KEY);

    setTotalPoints(stored ? parseInt(stored, 10) || 0 : 0);
    setMilestoneLevel(storedMilestone ? parseInt(storedMilestone, 10) || 0 : 0);
    setStreak(storedStreak ? parseInt(storedStreak, 10) || 0 : 0);
    setAnonId(getOrCreateAnonId());

    if (storedDismissed) {
      try {
        const parsed = JSON.parse(storedDismissed);
        claimDismissedRef.current = new Set(parsed);
      } catch { /* ignore */ }
    }

    // Update streak on load
    const lastActive = localStorage.getItem(LAST_ACTIVE_KEY);
    const today = todayStr();
    if (lastActive && lastActive !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      if (lastActive === yesterday.toISOString().slice(0, 10)) {
        // Consecutive day
        const newStreak = (parseInt(storedStreak || '0', 10) || 0) + 1;
        setStreak(newStreak);
        localStorage.setItem(STREAK_KEY, String(newStreak));
      } else {
        // Streak broken
        setStreak(1);
        localStorage.setItem(STREAK_KEY, '1');
      }
    } else if (!lastActive) {
      setStreak(1);
      localStorage.setItem(STREAK_KEY, '1');
    }
    localStorage.setItem(LAST_ACTIVE_KEY, today);

    // Check for ref code in URL
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) {
      localStorage.setItem(REF_CODE_KEY, ref);
      // POST to API to track referral click
      const id = localStorage.getItem(ANON_ID_KEY) || getOrCreateAnonId();
      fetch('/api/v1/points/referral-click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ref_code: ref, user_id: id }),
      }).catch(() => { /* non-critical */ });
      // Clean URL
      const url = new URL(window.location.href);
      url.searchParams.delete('ref');
      window.history.replaceState({}, '', url.toString());
    }

    setHydrated(true);
  }, []);

  // Persist points
  useEffect(() => {
    if (hydrated) {
      localStorage.setItem(STORAGE_KEY, String(totalPoints));
    }
  }, [totalPoints, hydrated]);

  // Persist milestone level
  useEffect(() => {
    if (hydrated) {
      localStorage.setItem(MILESTONE_KEY, String(milestoneLevel));
    }
  }, [milestoneLevel, hydrated]);

  const awardPoints = useCallback((amount: number, label: string, variant: AwardVariant = 'default') => {
    const award: PointAward = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      amount,
      label,
      timestamp: Date.now(),
      variant,
    };

    setTotalPoints((prev) => {
      const newTotal = prev + amount;

      // Check milestone
      const newMilestone = getMilestoneForPoints(newTotal);
      if (newMilestone && newMilestone.level > milestoneLevel) {
        setMilestoneLevel(newMilestone.level);
        setActiveMilestone(newMilestone);

        // Auto-dismiss milestone banner after 8s
        setTimeout(() => setActiveMilestone(null), 8000);

        // Show claim prompt at specific thresholds (only once each)
        if (
          CLAIM_PROMPT_THRESHOLDS.includes(newMilestone.points) &&
          !claimDismissedRef.current.has(newMilestone.points)
        ) {
          setShowClaimPrompt(true);
        }
      }

      return newTotal;
    });

    setRecentAwards((prev) => [...prev, award]);

    // Auto-dismiss toast after 2s
    setTimeout(() => {
      setRecentAwards((prev) => prev.filter((a) => a.id !== award.id));
    }, 2000);
  }, [milestoneLevel]);

  const dismissAward = useCallback((id: string) => {
    setRecentAwards((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const dismissMilestone = useCallback(() => {
    setActiveMilestone(null);
  }, []);

  const dismissClaimPrompt = useCallback(() => {
    setShowClaimPrompt(false);
    // Remember which thresholds were dismissed
    const current = getMilestoneForPoints(totalPoints);
    if (current) {
      claimDismissedRef.current.add(current.points);
      localStorage.setItem(
        CLAIM_DISMISSED_KEY,
        JSON.stringify([...claimDismissedRef.current]),
      );
    }
  }, [totalPoints]);

  const currentMilestone = getMilestoneForPoints(totalPoints);
  const nextMilestone = getNextMilestone(totalPoints);
  const milestoneProgress = getMilestoneProgress(totalPoints);

  return (
    <PointsContext.Provider
      value={{
        totalPoints,
        recentAwards,
        awardPoints,
        dismissAward,
        currentMilestone,
        nextMilestone,
        milestoneProgress,
        activeMilestone,
        dismissMilestone,
        showClaimPrompt,
        dismissClaimPrompt,
        anonId,
        streak,
      }}
    >
      {children}
    </PointsContext.Provider>
  );
}

export function usePoints() {
  const ctx = useContext(PointsContext);
  if (!ctx) {
    throw new Error('usePoints must be used within a PointsProvider');
  }
  return ctx;
}
