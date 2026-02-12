'use client';

import { cn } from '@/lib/cn';
import { usePoints } from '@/components/gamification/PointsProvider';
import {
  Activity,
  Coffee,
  Users,
  BookOpen,
  PartyPopper,
  Palette,
  Compass,
} from 'lucide-react';

// Inline type definitions for now (until monorepo resolution is fixed)
export type Mood = 'move' | 'chill' | 'connect' | 'learn' | 'celebrate' | 'create' | 'explore';

export const MOOD_CONFIG: Record<Mood, { label: string; description: string; keywords: string[] }> = {
  move: { label: 'Move', description: 'Get your body moving', keywords: ['dance', 'yoga', 'fitness', 'sports'] },
  chill: { label: 'Chill', description: 'Relax and unwind', keywords: ['meditation', 'spa', 'lounge', 'peaceful'] },
  connect: { label: 'Connect', description: 'Meet new people', keywords: ['networking', 'social', 'community', 'meetup'] },
  learn: { label: 'Learn', description: 'Expand your mind', keywords: ['workshop', 'class', 'talk', 'lecture'] },
  celebrate: { label: 'Celebrate', description: 'Party and have fun', keywords: ['party', 'festival', 'celebration', 'concert'] },
  create: { label: 'Create', description: 'Make something', keywords: ['art', 'craft', 'workshop', 'creative'] },
  explore: { label: 'Explore', description: 'Discover something new', keywords: ['tour', 'adventure', 'discovery', 'experience'] },
};

const MOOD_ICONS: Record<Mood, React.ComponentType<{ className?: string }>> = {
  move: Activity,
  chill: Coffee,
  connect: Users,
  learn: BookOpen,
  celebrate: PartyPopper,
  create: Palette,
  explore: Compass,
};

const MOOD_GRADIENTS: Record<Mood, string> = {
  move: 'bg-gradient-move',
  chill: 'bg-gradient-chill',
  connect: 'bg-gradient-connect',
  learn: 'bg-gradient-learn',
  celebrate: 'bg-gradient-celebrate',
  create: 'bg-gradient-create',
  explore: 'bg-gradient-explore',
};

interface MoodChipProps {
  mood: Mood;
  selected?: boolean;
  onClick?: () => void;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function MoodChip({
  mood,
  selected = false,
  onClick,
  showLabel = true,
  size = 'md',
  className,
}: MoodChipProps) {
  const Icon = MOOD_ICONS[mood];
  const config = MOOD_CONFIG[mood];

  const sizes = {
    sm: 'px-2 py-1 text-xs gap-1',
    md: 'px-3 py-1.5 text-sm gap-1.5',
    lg: 'px-4 py-2 text-base gap-2',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center rounded-full font-medium',
        'transition-all duration-200',
        sizes[size],
        selected
          ? cn(MOOD_GRADIENTS[mood], 'text-white shadow-glow')
          : 'bg-bg-surface text-text-secondary hover:bg-bg-overlay hover:text-text-primary',
        onClick && 'cursor-pointer',
        className
      )}
    >
      <Icon className={iconSizes[size]} />
      {showLabel && <span>{config.label}</span>}
    </button>
  );
}

interface MoodSelectorProps {
  selected: Mood[];
  onChange: (moods: Mood[]) => void;
  multiSelect?: boolean;
  className?: string;
}

export function MoodSelector({
  selected,
  onChange,
  multiSelect = true,
  className,
}: MoodSelectorProps) {
  const { awardPoints } = usePoints();
  const moods: Mood[] = ['move', 'chill', 'connect', 'learn', 'celebrate', 'create', 'explore'];

  const handleClick = (mood: Mood) => {
    const isSelecting = !selected.includes(mood);
    if (multiSelect) {
      if (isSelecting) {
        onChange([...selected, mood]);
      } else {
        onChange(selected.filter((m) => m !== mood));
      }
    } else {
      onChange(isSelecting ? [mood] : []);
    }

    if (isSelecting) {
      awardPoints(1, `${MOOD_CONFIG[mood].label} mood`);
    }
  };

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {moods.map((mood) => (
        <MoodChip
          key={mood}
          mood={mood}
          selected={selected.includes(mood)}
          onClick={() => handleClick(mood)}
        />
      ))}
    </div>
  );
}
