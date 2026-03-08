import Link from 'next/link';

import { getProjectCollaboratorInviteByToken } from '../../../lib/collaborator-invites';
import { hasSupabasePublicConfig } from '../../../lib/env';
import { getOptionalAuthenticatedUser } from '../../../lib/supabase-auth';

import { AcceptCollaboratorInviteCard } from '../../../components/accept-collaborator-invite-card';

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invite = await getProjectCollaboratorInviteByToken(token);
  const user = await getOptionalAuthenticatedUser();

  if (!invite) {
    return (
      <main className="stack">
        <section className="card">
          <h1>Invite not found</h1>
          <p className="muted">This invitation is missing or no longer valid.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="stack">
      <section className="card">
        <p className="eyebrow">Project invite</p>
        <h1>{invite.email}</h1>
        <p className="muted">Role: {invite.role}</p>
        <p className="muted">Status: {invite.status}</p>
        {!user && hasSupabasePublicConfig() ? (
          <p>
            <Link href={`/api/auth/github?next=/invites/${token}`} className="button">
              Sign in to accept
            </Link>
          </p>
        ) : (
          <AcceptCollaboratorInviteCard token={token} email={invite.email} status={invite.status} />
        )}
      </section>
    </main>
  );
}
