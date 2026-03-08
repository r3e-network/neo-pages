import React from 'react';

interface GitHubConnectButtonProps {
  signedIn: boolean;
  appEnabled: boolean;
}

export function GitHubConnectButton({ signedIn, appEnabled }: GitHubConnectButtonProps) {
  const href = signedIn ? (appEnabled ? '/api/github/install' : '#') : '/api/auth/github?next=/dashboard';
  const label = signedIn
    ? appEnabled
      ? 'Install NeoPages GitHub App'
      : 'Add GitHub App secrets'
    : 'Sign in with GitHub';

  return (
    <a className={`button ${href === '#' ? 'button--muted' : ''}`} href={href}>
      {label}
    </a>
  );
}
