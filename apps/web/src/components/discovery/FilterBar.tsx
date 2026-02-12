'use client';

import { cn } from '@/lib/cn';
import { usePoints } from '@/components/gamification/PointsProvider';
import { MapPin, Sparkles, Music, Flower2, Calendar, CalendarDays } from 'lucide-react';

type QuickFilter = 'tonight' | 'weekend' | 'holistic' | 'dance' | 'nearby';

interface FilterBarProps {
  activeFilter?: QuickFilter;
  onFilterChange: (filter: QuickFilter | null) => void;
  neighborhood?: string;
  onNeighborhoodClick?: () => void;
  className?: string;
}

const QUICK_FILTERS: { id: QuickFilter; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'tonight', label: 'Tonight', icon: Calendar },
  { id: 'weekend', label: 'This Weekend', icon: CalendarDays },
  { id: 'holistic', label: 'Holistic', icon: Flower2 },
  { id: 'dance', label: 'Dance', icon: Music },
  { id: 'nearby', label: 'Nearby', icon: Sparkles },
];

export function FilterBar({
  activeFilter,
  onFilterChange,
  neighborhood,
  onNeighborhoodClick,
  className,
}: FilterBarProps) {
  const { awardPoints } = usePoints();

  const handleFilterClick = (id: QuickFilter, label: string) => {
    const isSelecting = activeFilter !== id;
    onFilterChange(isSelecting ? id : null);
    if (isSelecting) {
      awardPoints(1, `${label} filter`);
    }
  };

  return (
    <div className={cn('sticky top-16 z-40 glass py-3', className)}>
      <div className="container-app">
        <div className="flex items-center gap-4">
          {/* Quick filters */}
          <div className="flex-1 scroll-x gap-2">
            {QUICK_FILTERS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => handleFilterClick(id, label)}
                className={cn(
                  'chip-interactive flex-shrink-0',
                  activeFilter === id && 'chip-selected bg-accent'
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>

          {/* Neighborhood selector */}
          <button
            onClick={onNeighborhoodClick}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border-subtle hover:border-accent transition-colors"
          >
            <MapPin className="w-4 h-4 text-accent" />
            <span className="text-sm text-text-secondary hidden sm:inline">
              {neighborhood || 'Location'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
