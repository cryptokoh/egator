'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function TicketmasterCallback() {
  const searchParams = useSearchParams();

  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');
  const state = searchParams.get('state');

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
              href="/"
              className="inline-block px-6 py-3 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors"
            >
              Return Home
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
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
              <span className="text-3xl">✅</span>
            </div>
            <h1 className="text-2xl font-bold text-text-primary mb-2">Authorization Successful!</h1>
            <p className="text-text-secondary">Ticketmaster has authorized your application.</p>
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

            {state && (
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  State
                </label>
                <code className="block w-full p-3 bg-bg-primary rounded-lg text-text-tertiary text-sm font-mono break-all border border-border-subtle">
                  {state}
                </code>
              </div>
            )}

            <div className="pt-4 border-t border-border-subtle">
              <p className="text-sm text-text-tertiary mb-3">
                Add this code to your <code className="text-accent">.env</code> file:
              </p>
              <code className="block w-full p-3 bg-bg-primary rounded-lg text-green-400 text-sm font-mono border border-border-subtle">
                TICKETMASTER_AUTH_CODE={code}
              </code>
            </div>
          </div>

          <div className="mt-6 text-center">
            <a
              href="/"
              className="inline-block px-6 py-3 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors"
            >
              Return to AIeGator
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
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-accent/20 flex items-center justify-center animate-pulse">
            <span className="text-3xl">🎫</span>
          </div>
          <h1 className="text-2xl font-bold text-text-primary mb-2">Waiting for Authorization</h1>
          <p className="text-text-secondary">
            Complete the authorization in the Ticketmaster window...
          </p>
        </div>
      </div>
    </div>
  );
}

export default function TicketmasterCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full" />
      </div>
    }>
      <TicketmasterCallback />
    </Suspense>
  );
}
