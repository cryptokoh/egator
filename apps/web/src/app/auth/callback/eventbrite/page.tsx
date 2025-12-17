'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function EventbriteCallback() {
  const searchParams = useSearchParams();

  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  if (error) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-bg-surface rounded-2xl p-8 border border-border-subtle">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
              <span className="text-3xl">❌</span>
            </div>
            <h1 className="text-2xl font-bold text-text-primary mb-2">Authorization Failed</h1>
            <p className="text-text-secondary mb-4">{errorDescription || error}</p>
            <a
              href="/auth"
              className="inline-block px-6 py-3 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors"
            >
              Try Again
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (code) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
        <div className="max-w-lg w-full bg-bg-surface rounded-2xl p-8 border border-border-subtle">
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
              <span className="text-3xl">🎪</span>
            </div>
            <h1 className="text-2xl font-bold text-text-primary mb-2">Eventbrite Connected!</h1>
            <p className="text-text-secondary">Your Eventbrite account has been authorized.</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Authorization Code
              </label>
              <div className="relative">
                <code className="block w-full p-3 bg-bg-primary rounded-lg text-text-primary text-sm font-mono break-all border border-border-subtle">
                  {code}
                </code>
                <button
                  onClick={() => navigator.clipboard.writeText(code)}
                  className="absolute top-2 right-2 px-2 py-1 text-xs bg-accent/20 text-accent rounded hover:bg-accent/30 transition-colors"
                >
                  Copy
                </button>
              </div>
            </div>

            <div className="p-4 bg-amber-500/10 rounded-lg border border-amber-500/20">
              <p className="text-sm text-amber-400">
                <strong>Note:</strong> Eventbrite deprecated their public event search API in 2019.
                This token only allows access to your own organization's events.
              </p>
            </div>

            <div className="pt-4 border-t border-border-subtle">
              <p className="text-sm text-text-tertiary mb-3">
                Exchange this code for an access token using:
              </p>
              <code className="block w-full p-3 bg-bg-primary rounded-lg text-green-400 text-xs font-mono border border-border-subtle overflow-x-auto">
                curl -X POST https://www.eventbrite.com/oauth/token \{'\n'}
                {'  '}-d "grant_type=authorization_code" \{'\n'}
                {'  '}-d "code={code}" \{'\n'}
                {'  '}-d "client_secret=YOUR_SECRET" \{'\n'}
                {'  '}-d "redirect_uri=https://aiegato.netlify.app/auth/callback/eventbrite"
              </code>
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <a
              href="/auth"
              className="flex-1 text-center px-6 py-3 bg-bg-primary text-text-primary rounded-lg hover:bg-bg-overlay transition-colors border border-border-subtle"
            >
              Back to Connections
            </a>
            <a
              href="/"
              className="flex-1 text-center px-6 py-3 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors"
            >
              Go to AIeGator
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-bg-surface rounded-2xl p-8 border border-border-subtle">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-orange-500/20 flex items-center justify-center animate-pulse">
            <span className="text-3xl">🎪</span>
          </div>
          <h1 className="text-2xl font-bold text-text-primary mb-2">Connecting to Eventbrite</h1>
          <p className="text-text-secondary">
            Waiting for authorization...
          </p>
        </div>
      </div>
    </div>
  );
}

export default function EventbriteCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full" />
      </div>
    }>
      <EventbriteCallback />
    </Suspense>
  );
}
