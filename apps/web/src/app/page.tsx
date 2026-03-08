import Link from 'next/link';

import { GitHubConnectButton } from '../components/github-connect-button';
import { hasSupabasePublicConfig, isGitHubAppEnabled } from '../lib/env';
import { getOptionalAuthenticatedUser } from '../lib/supabase-auth';

const features = [
  {
    title: 'GitHub to DApp in one flow',
    description: 'Connect GitHub, pick a repo, queue a deployment, and let NeoPages handle build plus storage.'
  },
  {
    title: 'NeoFS abstracted away',
    description: 'Website container attributes, object uploads, and public gateway links are all managed by the platform.'
  },
  {
    title: 'Edge-routed domains',
    description: 'Cloudflare Worker resolves project hosts to containers, with cache-friendly static delivery.'
  }
];

export default async function HomePage() {
  const user = await getOptionalAuthenticatedUser();
  const authEnabled = hasSupabasePublicConfig();

  return (
    <main>
      <section className="hero">
        <p className="eyebrow">Web3 hosting for Web2 teams</p>
        <h1>Deploy to NeoFS without learning blockchain plumbing.</h1>
        <p>
          NeoPages turns a frontend repo into a decentralized deployment target with a dashboard, build worker, and edge gateway.
        </p>

        <div className="hero-actions">
          <Link href="/dashboard" className="button">
            Open dashboard
          </Link>
          <GitHubConnectButton signedIn={authEnabled ? Boolean(user) : false} appEnabled={authEnabled && isGitHubAppEnabled()} />
        </div>
      </section>

      <section className="feature-grid">
        {features.map((feature) => (
          <article key={feature.title} className="card">
            <p className="eyebrow">Feature</p>
            <h2>{feature.title}</h2>
            <p className="muted">{feature.description}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
