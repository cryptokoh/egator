'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MapPin, Search, Menu, X } from 'lucide-react';
import { cn } from '@/lib/cn';

interface HeaderProps {
  neighborhood?: string;
  onLocationClick?: () => void;
}

export function Header({ neighborhood, onLocationClick }: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 glass">
      <div className="container-app">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-bold bg-gradient-to-r from-accent to-mood-connect bg-clip-text text-transparent">
              AIeGator
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/discover" className="text-text-secondary hover:text-text-primary transition-colors">
              Discover
            </Link>
            <Link href="/holistic" className="text-text-secondary hover:text-text-primary transition-colors">
              Holistic
            </Link>
            <Link href="/dance" className="text-text-secondary hover:text-text-primary transition-colors">
              Dance
            </Link>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {/* Location */}
            <button
              onClick={onLocationClick}
              className="btn-ghost flex items-center gap-2 text-sm"
            >
              <MapPin className="w-4 h-4 text-accent" />
              <span className="hidden sm:inline text-text-secondary">
                {neighborhood || 'Set location'}
              </span>
            </button>

            {/* Search */}
            <button className="btn-ghost p-2">
              <Search className="w-5 h-5" />
            </button>

            {/* Mobile menu */}
            <button
              className="btn-ghost p-2 md:hidden"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <nav className="md:hidden py-4 border-t border-border-subtle animate-fade-in-up">
            <div className="flex flex-col gap-2">
              <Link
                href="/discover"
                className="px-4 py-2 text-text-secondary hover:text-text-primary hover:bg-bg-surface rounded-lg transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Discover
              </Link>
              <Link
                href="/holistic"
                className="px-4 py-2 text-text-secondary hover:text-text-primary hover:bg-bg-surface rounded-lg transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Holistic
              </Link>
              <Link
                href="/dance"
                className="px-4 py-2 text-text-secondary hover:text-text-primary hover:bg-bg-surface rounded-lg transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Dance
              </Link>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
