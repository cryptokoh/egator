'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';

interface PointAward {
  id: string;
  amount: number;
  label: string;
  timestamp: number;
}

interface PointsContextValue {
  totalPoints: number;
  recentAwards: PointAward[];
  awardPoints: (amount: number, label: string) => void;
  dismissAward: (id: string) => void;
}

const PointsContext = createContext<PointsContextValue | null>(null);

const STORAGE_KEY = 'aiegator-points';

export function PointsProvider({ children }: { children: React.ReactNode }) {
  const [totalPoints, setTotalPoints] = useState(0);
  const [recentAwards, setRecentAwards] = useState<PointAward[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setTotalPoints(parseInt(stored, 10) || 0);
    }
    setHydrated(true);
  }, []);

  // Persist to localStorage
  useEffect(() => {
    if (hydrated) {
      localStorage.setItem(STORAGE_KEY, String(totalPoints));
    }
  }, [totalPoints, hydrated]);

  const awardPoints = useCallback((amount: number, label: string) => {
    const award: PointAward = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      amount,
      label,
      timestamp: Date.now(),
    };

    setTotalPoints((prev) => prev + amount);
    setRecentAwards((prev) => [...prev, award]);

    // Auto-dismiss after 2s
    setTimeout(() => {
      setRecentAwards((prev) => prev.filter((a) => a.id !== award.id));
    }, 2000);
  }, []);

  const dismissAward = useCallback((id: string) => {
    setRecentAwards((prev) => prev.filter((a) => a.id !== id));
  }, []);

  return (
    <PointsContext.Provider value={{ totalPoints, recentAwards, awardPoints, dismissAward }}>
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
