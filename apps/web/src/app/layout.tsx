import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { hasSupabasePublicConfig } from '../lib/env';
import { getOptionalAuthenticatedUser } from '../lib/supabase-auth';
import './globals.css';

export const metadata: Metadata = {
  title: 'NeoPages',
  description: 'Ship frontend code to NeoFS in a Vercel-style workflow.'
};

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const user = await getOptionalAuthenticatedUser();
  const authEnabled = hasSupabasePublicConfig();

  return (
    <html lang="en">
      <body>
        <header className="navbar">
          <div className="navbar-inner">
            <Link href="/" className="brand">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
                <polyline points="2 17 12 22 22 17"></polyline>
                <polyline points="2 12 12 17 22 12"></polyline>
              </svg>
              NeoPages
            </Link>
            <nav className="nav-links">
              <Link href="/dashboard">Dashboard</Link>
              <a href="https://github.com/r3e-network/neo-pages" target="_blank" rel="noreferrer">
                GitHub
              </a>
              {authEnabled ? (
                user ? (
                  <>
                    <span style={{ color: '#fff', fontWeight: 500 }}>{user.email}</span>
                    <a href="/auth/signout" className="button button--muted" style={{ height: '32px', padding: '0 12px' }}>Sign out</a>
                  </>
                ) : (
                  <a href="/api/auth/github?next=/dashboard" className="button button--muted" style={{ height: '32px', padding: '0 12px' }}>Sign in</a>
                )
              ) : null}
            </nav>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}