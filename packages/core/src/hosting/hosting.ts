const defaultOutputDirectories: Record<string, string> = {
  vite: 'dist',
  'next-static': 'out',
  cra: 'build',
  astro: 'dist',
  nuxt: '.output/public',
  svelte: 'build',
  gatsby: 'public',
  static: '.'
};

export function slugifySubdomain(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 48) || 'site';
}

export function inferDefaultOutputDirectory(framework?: string | null): string {
  return defaultOutputDirectories[framework ?? ''] ?? 'dist';
}

export function buildProjectHost(subdomain: string, rootDomain: string): string {
  return `${subdomain.toLowerCase()}.${rootDomain.toLowerCase()}`;
}

export function buildDeploymentUrl(subdomain: string, rootDomain: string, edgeOrigin?: string): string {
  const host = buildProjectHost(subdomain, rootDomain);

  if (!edgeOrigin) {
    return `https://${host}`;
  }

  const url = new URL(edgeOrigin);
  url.hostname = host;
  url.pathname = '';
  url.search = '';
  url.hash = '';

  return url.toString().replace(/\/$/, '');
}

export function isProductionBranch(branch: string, defaultBranch: string): boolean {
  return branch.trim().toLowerCase() === defaultBranch.trim().toLowerCase();
}

export function buildPreviewSubdomain(branch: string, projectSubdomain: string): string {
  const branchSlug = slugifySubdomain(branch);
  const available = Math.max(8, 63 - projectSubdomain.length - 2);
  return `${branchSlug.slice(0, available)}--${projectSubdomain}`;
}

export function buildPreviewDeploymentUrl(
  branch: string,
  projectSubdomain: string,
  rootDomain: string,
  edgeOrigin?: string
): string {
  return buildDeploymentUrl(buildPreviewSubdomain(branch, projectSubdomain), rootDomain, edgeOrigin);
}

export function resolveLookupKeys(hostname: string, rootDomain: string): string[] {
  const normalizedHost = hostname.toLowerCase();
  const normalizedRoot = rootDomain.toLowerCase();

  if (normalizedHost === normalizedRoot) {
    return [normalizedHost];
  }

  if (normalizedHost.endsWith(`.${normalizedRoot}`)) {
    const subdomain = normalizedHost.slice(0, -(normalizedRoot.length + 1));
    return [normalizedHost, subdomain];
  }

  return [normalizedHost];
}

export function isStaticAssetPath(pathname: string): boolean {
  return /\.[a-z0-9]+$/i.test(pathname);
}

export function inferFrameworkFromPackageJson(packageJson: Record<string, unknown>): string {
  const dependencies = {
    ...(typeof packageJson.dependencies === 'object' && packageJson.dependencies ? packageJson.dependencies : {}),
    ...(typeof packageJson.devDependencies === 'object' && packageJson.devDependencies ? packageJson.devDependencies : {})
  } as Record<string, string>;

  if (dependencies.next) {
    return 'next-static';
  }

  if (dependencies.nuxt) {
    return 'nuxt';
  }

  if (dependencies['@sveltejs/kit']) {
    return 'svelte';
  }

  if (dependencies.gatsby) {
    return 'gatsby';
  }

  if (dependencies.astro) {
    return 'astro';
  }

  if (dependencies['react-scripts']) {
    return 'cra';
  }

  if (dependencies.vite) {
    return 'vite';
  }

  return 'static';
}
