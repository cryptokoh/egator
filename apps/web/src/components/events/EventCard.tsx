'use client';

import Image from 'next/image';
import { format } from 'date-fns';
import { MapPin, Clock, DollarSign, Zap, Users, Footprints, Heart, Share2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { usePoints } from '@/components/gamification/PointsProvider';
import { MoodChip } from '@/components/discovery/MoodChip';
import type { DiscoveredEvent } from '@/lib/api';

interface EventCardProps {
  event: DiscoveredEvent;
  onClick?: () => void;
  className?: string;
}

export function EventCard({ event, onClick, className }: EventCardProps) {
  const { awardPoints, anonId } = usePoints();
  const startDate = new Date(event.startTime);
  const primaryMood = event.vibe.moods[0];

  const handleClick = () => {
    awardPoints(2, 'Event explored');
    onClick?.();
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();

    // Build share URL with user's own referral code (generated on demand)
    let ownRefCode = '';
    try {
      const res = await fetch(`/api/v1/points/balance?user_id=${encodeURIComponent(anonId)}&generate_ref=true`);
      if (res.ok) {
        const data = await res.json();
        ownRefCode = data.referralCode || '';
      }
    } catch { /* non-critical */ }

    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const shareUrl = ownRefCode
      ? `${baseUrl}/events/${event.id}?ref=${ownRefCode}`
      : `${baseUrl}/events/${event.id}`;

    const shareData = {
      title: event.title,
      text: `Check out ${event.title}`,
      url: shareUrl,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        awardPoints(5, 'Shared!', 'info');
      } else {
        await navigator.clipboard.writeText(shareUrl);
        awardPoints(5, 'Link copied!', 'info');
      }
    } catch {
      // User cancelled share or clipboard failed - no points
    }
  };

  return (
    <article
      onClick={handleClick}
      className={cn(
        'card-interactive overflow-hidden cursor-pointer group',
        className
      )}
    >
      {/* Image */}
      <div className="relative aspect-event bg-bg-surface overflow-hidden">
        {event.imageUrl ? (
          <Image
            src={event.imageUrl}
            alt={event.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className={cn(
            'absolute inset-0 flex items-center justify-center',
            primaryMood ? `mood-${primaryMood}` : 'bg-bg-overlay'
          )}>
            <span className="text-4xl opacity-50">
              {event.vibe.isHolistic ? '🧘' : event.vibe.isDance ? '💃' : '✨'}
            </span>
          </div>
        )}

        {/* Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Badges */}
        <div className="absolute top-3 left-3 flex gap-2">
          {primaryMood && (
            <MoodChip mood={primaryMood} size="sm" selected showLabel={false} />
          )}
          {event.vibe.isHolistic && (
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-holistic/90 text-white">
              Holistic
            </span>
          )}
          {event.vibe.isDance && (
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-dance/90 text-white">
              Dance
            </span>
          )}
        </div>

        {/* Right side badges */}
        <div className="absolute top-3 right-3 flex flex-col gap-2 items-end">
          {/* Distance */}
          {event.distance && (
            <div className="px-2 py-1 rounded-full text-xs font-medium bg-black/60 text-white flex items-center gap-1">
              <Footprints className="w-3 h-3" />
              {event.distance.walkingMinutes} min
            </div>
          )}
          {/* Charity badge */}
          {event.charityPartner && (
            <div className="px-2 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-pink-500 to-rose-500 text-white flex items-center gap-1 shadow-lg">
              <Heart className="w-3 h-3 fill-current" />
              Charity
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Title */}
        <h3 className="font-semibold text-text-primary line-clamp-2 group-hover:text-accent transition-colors">
          {event.title}
        </h3>

        {/* Venue & Neighborhood */}
        {event.venue && (
          <div className="flex items-center gap-1 text-sm text-text-secondary">
            <MapPin className="w-4 h-4 flex-shrink-0" />
            <span className="line-clamp-1">
              {event.venue.name}
              {event.neighborhoodName && ` • ${event.neighborhoodName}`}
            </span>
          </div>
        )}

        {/* Date & Time */}
        <div className="flex items-center gap-1 text-sm text-text-secondary">
          <Clock className="w-4 h-4 flex-shrink-0" />
          <span>
            {format(startDate, 'EEE, MMM d')} • {format(startDate, 'h:mm a')}
          </span>
        </div>

        {/* Price */}
        {event.price && (
          <div className="flex items-center gap-1 text-sm text-text-secondary">
            <DollarSign className="w-4 h-4 flex-shrink-0" />
            <span>
              {event.price.min && event.price.max
                ? `$${event.price.min}-${event.price.max}`
                : event.price.min
                  ? `From $${event.price.min}`
                  : 'Free'}
            </span>
          </div>
        )}

        {/* Charity Partner */}
        {event.charityPartner && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-pink-500/10 to-rose-500/10 border border-pink-500/20">
            <Heart className="w-4 h-4 text-pink-500 fill-pink-500/30 flex-shrink-0" />
            <span className="text-sm text-pink-400">
              Supports <span className="font-medium text-pink-300">{event.charityPartner.name}</span>
            </span>
          </div>
        )}

        {/* Vibe indicators + Share */}
        <div className="flex items-center gap-3 pt-2 border-t border-border-subtle">
          {/* Energy */}
          {event.vibe.energyLevel && (
            <div className="flex items-center gap-1 text-xs text-text-tertiary" title="Energy level">
              <Zap className="w-3 h-3" />
              <span>{event.vibe.energyLevel}/5</span>
            </div>
          )}

          {/* Social density */}
          {event.vibe.socialDensity && (
            <div className="flex items-center gap-1 text-xs text-text-tertiary" title="Social density">
              <Users className="w-3 h-3" />
              <span className="capitalize">{event.vibe.socialDensity}</span>
            </div>
          )}

          {/* Solo friendly */}
          {event.vibe.soloFriendly && (
            <span className="text-xs text-text-tertiary">Solo-friendly</span>
          )}

          {/* Share button */}
          <button
            onClick={handleShare}
            className="ml-auto p-1 rounded-lg hover:bg-bg-surface text-text-tertiary hover:text-accent transition-colors"
            title="Share event"
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Tags */}
        {(event.vibe.holisticTags.length > 0 || event.vibe.danceTags.length > 0) && (
          <div className="flex flex-wrap gap-1">
            {[...event.vibe.holisticTags, ...event.vibe.danceTags].slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 rounded text-xs bg-bg-surface text-text-tertiary"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

interface EventGridProps {
  events: DiscoveredEvent[];
  onEventClick?: (event: DiscoveredEvent) => void;
  className?: string;
}

export function EventGrid({ events, onEventClick, className }: EventGridProps) {
  if (events.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-text-secondary">No events found</p>
        <p className="text-text-tertiary text-sm mt-1">Try adjusting your filters</p>
      </div>
    );
  }

  return (
    <div className={cn(
      'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6',
      className
    )}>
      {events.map((event, i) => (
        <EventCard
          key={event.id}
          event={event}
          onClick={() => onEventClick?.(event)}
          className={cn('animate-fade-in-up', `delay-${Math.min(i, 5)}`)}
        />
      ))}
    </div>
  );
}
