import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { PointsProvider } from '@/components/gamification/PointsProvider';
import { PointsPopup } from '@/components/gamification/PointsPopup';
import '@/styles/globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'AIeGator - Discover Events by Vibe',
  description: 'AI-powered event discovery based on mood, not category. Find holistic, dance, and community events near you.',
  keywords: ['events', 'discovery', 'holistic', 'dance', 'nightlife', 'wellness', 'san francisco'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-bg-base antialiased">
        <PointsProvider>
          {children}
          <PointsPopup />
        </PointsProvider>
      </body>
    </html>
  );
}
