import { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { PrivyProvider, usePrivy } from '@privy-io/react-auth';

const PRIVY_APP_ID = 'cmei6qqd0007hl20cjvh0h5md';

declare global {
  interface Window {
    flowbPrivy: {
      login: () => void;
      logout: () => Promise<void>;
    };
  }
}

/** Extracts the best display name from a Privy user */
function getDisplayName(user: ReturnType<typeof usePrivy>['user']): string {
  if (!user) return 'User';

  // Check linked accounts for a human-readable name
  for (const account of user.linkedAccounts ?? []) {
    if (account.type === 'telegram_account' && 'username' in account && account.username) {
      return account.username;
    }
    if (account.type === 'farcaster_account' && 'username' in account && account.username) {
      return account.username;
    }
    if (account.type === 'discord_account' && 'username' in account && account.username) {
      return account.username;
    }
    if (account.type === 'twitter_account' && 'username' in account && account.username) {
      return account.username;
    }
    if (account.type === 'github_account' && 'username' in account && account.username) {
      return (account as { username: string }).username;
    }
  }

  // Email
  if (user.email?.address) {
    return user.email.address.split('@')[0];
  }

  // Wallet - truncated
  if (user.wallet?.address) {
    const addr = user.wallet.address;
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  }

  return 'User';
}

function AuthBridge() {
  const { ready, authenticated, user, login, logout } = usePrivy();

  // Expose login/logout to vanilla JS
  useEffect(() => {
    window.flowbPrivy = { login, logout };
  }, [login, logout]);

  // Emit auth state changes for vanilla JS to consume
  useEffect(() => {
    if (!ready) return;

    window.dispatchEvent(
      new CustomEvent('privy-auth-change', {
        detail: {
          authenticated,
          user: authenticated && user
            ? {
                id: user.id,
                displayName: getDisplayName(user),
                wallet: user.wallet?.address ?? null,
                email: user.email?.address ?? null,
              }
            : null,
        },
      }),
    );
  }, [ready, authenticated, user]);

  return null;
}

const el = document.getElementById('privy-root');
if (el) {
  createRoot(el).render(
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        appearance: {
          theme: 'dark',
          accentColor: '#6366f1',
        },
      }}
    >
      <AuthBridge />
    </PrivyProvider>,
  );
}
