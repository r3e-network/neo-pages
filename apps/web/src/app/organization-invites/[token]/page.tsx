import Link from 'next/link';
import { notFound } from 'next/navigation';

import { AcceptOrganizationInviteCard } from '../../../components/accept-organization-invite-card';
import { hasSupabasePublicConfig } from '../../../lib/env';
import { getOrganizationInviteByToken } from '../../../lib/organization-invites';
import { getOptionalAuthenticatedUser } from '../../../lib/supabase-auth';

export default async function OrganizationInvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invite = await getOrganizationInviteByToken(token);
  const user = await getOptionalAuthenticatedUser();

  if (!invite) {
    notFound();
  }

  return (
    <main className="stack">
      <section className="card stack">
        <p className="eyebrow">Organization invite</p>
        <h1>{invite.email}</h1>
        <p className="muted">Role: {invite.role}</p>
        <p className="muted">Status: {invite.status}</p>
        {!user && hasSupabasePublicConfig() ? (
          <p>
            <Link href={`/api/auth/github?next=/organization-invites/${token}`} className="button">
              Sign in to accept
            </Link>
          </p>
        ) : (
          <AcceptOrganizationInviteCard token={token} email={invite.email} status={invite.status} />
        )}
      </section>
    </main>
  );
}
