'use client';

import { useState } from 'react';

interface Provider {
  id: string;
  name: string;
  icon: string;
  color: string;
  authUrl?: string;
  clientIdEnv: string;
  scopes?: string[];
  description: string;
  docsUrl: string;
}

const PROVIDERS: Provider[] = [
  {
    id: 'ticketmaster',
    name: 'Ticketmaster',
    icon: '🎫',
    color: 'from-blue-500 to-blue-600',
    clientIdEnv: 'TICKETMASTER_API_KEY',
    description: 'Concerts, sports, theater, and live events',
    docsUrl: 'https://developer.ticketmaster.com/',
  },
  {
    id: 'eventbrite',
    name: 'Eventbrite',
    icon: '🎪',
    color: 'from-orange-500 to-red-500',
    clientIdEnv: 'EVENTBRITE_API_KEY',
    scopes: ['user', 'event'],
    description: 'Community events, workshops, conferences (Search API deprecated)',
    docsUrl: 'https://www.eventbrite.com/platform/',
  },
  {
    id: 'meetup',
    name: 'Meetup',
    icon: '👥',
    color: 'from-red-500 to-pink-500',
    clientIdEnv: 'MEETUP_CLIENT_ID',
    scopes: ['basic', 'event_management'],
    description: 'Local groups and community meetups',
    docsUrl: 'https://www.meetup.com/api/',
  },
  {
    id: 'yelp',
    name: 'Yelp',
    icon: '⭐',
    color: 'from-red-600 to-red-700',
    clientIdEnv: 'YELP_API_KEY',
    description: 'Local business events and activities',
    docsUrl: 'https://www.yelp.com/developers/',
  },
];

export default function AuthPage() {
  const [clientId, setClientId] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);

  const handleOAuthStart = (provider: Provider) => {
    if (!clientId) {
      alert(`Please enter your ${provider.name} Client ID`);
      return;
    }

    const redirectUri = `${window.location.origin}/auth/callback/${provider.id}`;
    let authUrl = '';

    switch (provider.id) {
      case 'ticketmaster':
        // Ticketmaster uses API key, not OAuth - redirect to docs
        window.open(provider.docsUrl, '_blank');
        return;
      case 'eventbrite':
        authUrl = `https://www.eventbrite.com/oauth/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}`;
        break;
      case 'meetup':
        authUrl = `https://secure.meetup.com/oauth2/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${provider.scopes?.join('+')}`;
        break;
      default:
        alert(`OAuth not implemented for ${provider.name}`);
        return;
    }

    window.location.href = authUrl;
  };

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Header */}
      <header className="border-b border-border-subtle bg-bg-surface/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <span className="text-2xl">🐊</span>
            <span className="text-xl font-bold text-text-primary">AIeGator</span>
          </a>
          <span className="text-sm text-text-secondary">API Connections</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-text-primary mb-2">Connect Event Sources</h1>
          <p className="text-text-secondary">
            Link your API accounts to aggregate events from multiple platforms
          </p>
        </div>

        {/* Provider Cards */}
        <div className="grid gap-4 md:grid-cols-2">
          {PROVIDERS.map((provider) => (
            <div
              key={provider.id}
              className={`bg-bg-surface rounded-xl border border-border-subtle p-6 transition-all ${
                selectedProvider === provider.id ? 'ring-2 ring-accent' : 'hover:border-border-default'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${provider.color} flex items-center justify-center text-2xl shadow-lg`}>
                  {provider.icon}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-text-primary">{provider.name}</h3>
                  <p className="text-sm text-text-secondary mt-1">{provider.description}</p>
                </div>
              </div>

              {selectedProvider === provider.id ? (
                <div className="mt-4 space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">
                      {provider.clientIdEnv.includes('CLIENT') ? 'Client ID' : 'API Key'}
                    </label>
                    <input
                      type="text"
                      value={clientId}
                      onChange={(e) => setClientId(e.target.value)}
                      placeholder={`Enter your ${provider.name} credentials`}
                      className="w-full px-3 py-2 bg-bg-primary border border-border-subtle rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleOAuthStart(provider)}
                      className="flex-1 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors font-medium"
                    >
                      {provider.id === 'ticketmaster' || provider.id === 'yelp' ? 'Get API Key' : 'Authorize'}
                    </button>
                    <button
                      onClick={() => {
                        setSelectedProvider(null);
                        setClientId('');
                      }}
                      className="px-4 py-2 bg-bg-primary text-text-secondary rounded-lg hover:bg-bg-overlay transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                  <a
                    href={provider.docsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-center text-sm text-accent hover:underline"
                  >
                    View API Documentation →
                  </a>
                </div>
              ) : (
                <button
                  onClick={() => setSelectedProvider(provider.id)}
                  className="mt-4 w-full px-4 py-2 bg-bg-primary text-text-primary rounded-lg hover:bg-bg-overlay transition-colors border border-border-subtle"
                >
                  Connect
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Redirect URI Info */}
        <div className="mt-8 p-6 bg-bg-surface rounded-xl border border-border-subtle">
          <h3 className="text-lg font-semibold text-text-primary mb-3">OAuth Redirect URIs</h3>
          <p className="text-sm text-text-secondary mb-4">
            When setting up OAuth apps, use these redirect URIs:
          </p>
          <div className="space-y-2">
            {PROVIDERS.filter(p => p.scopes).map((provider) => (
              <div key={provider.id} className="flex items-center gap-2">
                <span className="text-lg">{provider.icon}</span>
                <code className="flex-1 px-3 py-1.5 bg-bg-primary rounded text-sm text-text-primary font-mono">
                  https://aiegato.netlify.app/auth/callback/{provider.id}
                </code>
                <button
                  onClick={() => navigator.clipboard.writeText(`https://aiegato.netlify.app/auth/callback/${provider.id}`)}
                  className="px-2 py-1 text-xs bg-accent/20 text-accent rounded hover:bg-accent/30 transition-colors"
                >
                  Copy
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* No OAuth Needed */}
        <div className="mt-6 p-6 bg-green-500/10 rounded-xl border border-green-500/20">
          <h3 className="text-lg font-semibold text-green-400 mb-2">✅ No OAuth Required</h3>
          <p className="text-sm text-text-secondary">
            These providers work with just an API key (no OAuth flow needed):
          </p>
          <ul className="mt-2 text-sm text-text-secondary space-y-1">
            <li>• <strong>Ticketmaster</strong> - Free API key from developer portal</li>
            <li>• <strong>Yelp</strong> - Free API key from developer portal</li>
            <li>• <strong>Humanitix</strong> - Public API works without authentication</li>
            <li>• <strong>Schema.org Crawler</strong> - No authentication needed</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
