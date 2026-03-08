import { describe, expect, it } from 'vitest';

import { buildArtifactUrl } from './artifacts';

describe('buildArtifactUrl', () => {
  it('appends non-root asset paths to a deployment URL', () => {
    expect(buildArtifactUrl('https://neo-arcade.neopages.dev', 'assets/app.js')).toBe('https://neo-arcade.neopages.dev/assets/app.js');
  });

  it('keeps the root deployment URL for index.html', () => {
    expect(buildArtifactUrl('https://neo-arcade.neopages.dev', 'index.html')).toBe('https://neo-arcade.neopages.dev');
  });
});
