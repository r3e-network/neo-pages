import { createSign } from 'node:crypto';

export function buildGitHubAppInstallUrl(appSlug: string, targetId?: number): string {
  const url = new URL(`https://github.com/apps/${appSlug}/installations/new`);
  if (typeof targetId === 'number' && Number.isFinite(targetId)) {
    url.searchParams.set('target_id', String(targetId));
  }
  return url.toString();
}

export function normalizeGitHubAppPrivateKey(privateKey: string): string {
  return privateKey.replace(/\\n/g, '\n');
}

export function parseRepoOwner(repoFullName: string): string {
  return repoFullName.split('/')[0] ?? '';
}

export function createGitHubAppJwt(input: { appId: string; privateKey: string; now?: number }): string {
  const issuedAt = Math.floor(input.now ?? Date.now() / 1000);
  const header = base64UrlEncodeJson({ alg: 'RS256', typ: 'JWT' });
  const payload = base64UrlEncodeJson({
    iat: issuedAt - 60,
    exp: issuedAt + 540,
    iss: input.appId
  });
  const signingInput = `${header}.${payload}`;
  const signer = createSign('RSA-SHA256');
  signer.update(signingInput);
  signer.end();
  const signature = signer.sign(normalizeGitHubAppPrivateKey(input.privateKey)).toString('base64url');
  return `${signingInput}.${signature}`;
}

function base64UrlEncodeJson(value: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}
