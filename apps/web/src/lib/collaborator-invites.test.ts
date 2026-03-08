import { describe, expect, it } from 'vitest';

import { canAcceptCollaboratorInvite, normalizeInviteEmail } from './collaborator-invites';

describe('normalizeInviteEmail', () => {
  it('normalizes email casing and whitespace', () => {
    expect(normalizeInviteEmail('  Dev@Example.COM ')).toBe('dev@example.com');
  });

  it('rejects invalid email addresses', () => {
    expect(() => normalizeInviteEmail('not-an-email')).toThrow();
  });
});

describe('canAcceptCollaboratorInvite', () => {
  it('accepts when the signed-in email matches the invite email', () => {
    expect(canAcceptCollaboratorInvite('dev@example.com', 'Dev@example.com')).toBe(true);
  });

  it('rejects when the signed-in email differs', () => {
    expect(canAcceptCollaboratorInvite('dev@example.com', 'other@example.com')).toBe(false);
  });
});
