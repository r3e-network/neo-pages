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
          <Link href="/" className="brand">
            NeoPages
          </Link>
          <nav className="nav-links">
            <Link href="/dashboard">Dashboard</Link>
            <a href="https://github.com/neo-project" target="_blank" rel="noreferrer">
              Neo
            </a>
            {authEnabled ? (
              user ? (
                <>
                  <span>{user.email ?? 'Signed in'}</span>
                  <a href="/auth/signout">Sign out</a>
                </>
              ) : (
                <a href="/api/auth/github?next=/dashboard">Sign in</a>
              )
            ) : null}
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
