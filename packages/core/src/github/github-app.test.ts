import { describe, expect, it } from 'vitest';

import { buildGitHubAppInstallUrl, createGitHubAppJwt, normalizeGitHubAppPrivateKey, parseRepoOwner } from '../index';

describe('buildGitHubAppInstallUrl', () => {
  it('builds the standard GitHub App installation URL from the app slug', () => {
    expect(buildGitHubAppInstallUrl('neo-pages')).toBe('https://github.com/apps/neo-pages/installations/new');
  });

  it('adds an optional target_id query parameter', () => {
    expect(buildGitHubAppInstallUrl('neo-pages', 42)).toBe('https://github.com/apps/neo-pages/installations/new?target_id=42');
  });
});

describe('normalizeGitHubAppPrivateKey', () => {
  it('turns escaped newlines into real PEM newlines', () => {
    expect(normalizeGitHubAppPrivateKey('line-1\\nline-2')).toBe('line-1\nline-2');
  });
});

describe('parseRepoOwner', () => {
  it('extracts the owner segment from owner/repo strings', () => {
    expect(parseRepoOwner('neo-project/neo-pages')).toBe('neo-project');
  });
});

describe('createGitHubAppJwt', () => {
  it('emits an RS256 JWT with the app id as issuer', () => {
    const privateKey = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDki5nqO4pzvH0N
hE1HTwNfF7uio0pIc5R5GS2/vUgHdhGw0Y1mBu5e6mZsLz4TyRKNQ9SzXRoF7nR4
Pso7mF2W2Si8HMmnJxfpNNGNn5lgw7gJkvNw/ZakTRn2g4RiB+gYvYRC7Ja7U9zh
j8VJmRcybOLsP8Ymjlwm5sLsw4CZxNqIABwAGnYyQXgQ6VWjxtEVztqhyRUQ5Mnw
rjM7fct8XqWv7x+O5qPXevJ4gywlLe2j7/HLv61EUNl5wflsY7FK4EJj0uTxw9bO
lLGfuQnp6fgTgTZA7OCW7M8u4jWm0x7Yhqfd0Y4+7v+4vIl4ypfBv2Yuq3ViEUhL
+R3cpIpDAgMBAAECggEAMNn4PX4zLxkz+I7JgmyYMdUNz6wnLzR54tCZfmyU4bq0
1Zo3C0muvz4Bhr+7m2Tf9qglK3AYIhJGBkC4z8DmyXf1X5bbCwzW2bQ2Zyv6Q+nt
GC/3EhK1v1f1osA5lzQx8p2K2zA4tn5l6yW+vwbm2AS1qLjsS0A45Q7P+e2rgVuR
z18FB2pcZMRQHfG9rY+bvN1NkM1ms9kQYHjv1o0+w1FaEONLZ5MdnXlU6sD90v4f
rnkWtSgW/jl8Z8Y1h0jl4ZlJj9rUZ4LCQ3KoUw1BJqPfP6nYx5ZqkFMec6vt/EMI
9qB3Uu2W4Dqdw6u1CBvD9A2u2uH3jQv1pEdrxIm1YQKBgQD8OZ2NQWzjVeT/su4u
0BvQ0FL8S9tIhNoa3p12Qj5MUUszjio3va0xrwdrtB/yO9dMWM/NOv9zlOUYFM0M
Dk3BkYg5JqdX2SoYBf0m0j+euV6df+gQnD9wF+z6QhRbOIL1vgg6q2l2d7Yv5RLA
rM+4w7oE9BxX/pBe5S4KM1AlNQKBgQDoyfWQzYHiaGNtsvHZ+0epUb2vofV6SP8Q
zW5g8V5v1DgPcYgMkt7P8h3+ts5ByM8v7qwcqJtqckg+EM6mPJxS4Q6Wt2xOV2+E
ps6qB+v2h8N+1wzxJ8v2B0RkG0T/Pn16ANvt2N6N1vPf6BC1C3aA6ub9wDqDUOML
9M42D6x5EwKBgQDKxk+WoM1Bkxps4LfrtCI5i5D9r7LE3IUm5eI0j2Jwqtg58SeV
MV1iYf/jAXN0TRnVZc6QdA6pvXTR7V9/c1zzcOtfyNaPH4sYmD2lhdNCLpT3dI8M
n3x6fE2tGQ7lR9VtpZdJZc9CZBpI9UzY9G2vz3XkFWp4Jk1Jnh66U9z0qQKBgD3N
a2B4pWbxYwmIFQZZSHB45W8+2uZ7AFZPqhxy7XPAQkn+c1I8iD1Q+e8qDVSR7+T5
LhRZ+ghDMZta+S3mCGtqnaT1ZV2IH22KQ4Hr2Oi1bfV3i0c2qQ2yaG26jN6mwfZq
nK9BwCzA7ajPlbHwx1jmKVdQn0mM3cSq4lMPuNmDAoGAH4fK6Trnrw7khcfk35gH
0eW8V9WQ7uXwTkoefNf0Vh7fm19l9iw0g0CQ55NBfFP0Fym19Oz2jQq/ksgY8YGo
W+46mbdT1Iea3Nrxh2S9jyl7FT85SP2pS/FE6+HFz6Lj7+WaR/w6B0cf5hEV9yWy
D1mqGUzkIexWG4bzDN0jP1U=
-----END PRIVATE KEY-----`;
    const token = createGitHubAppJwt({ appId: '123456', privateKey, now: 1_700_000_000 });
    const [header, payload] = token.split('.');

    expect(token.split('.')).toHaveLength(3);
    expect(JSON.parse(Buffer.from(header, 'base64url').toString('utf8'))).toMatchObject({ alg: 'RS256', typ: 'JWT' });
    expect(JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))).toMatchObject({ iss: '123456' });
  });
});
