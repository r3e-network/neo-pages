export function normalizeCustomDomain(input: string): string {
  const normalized = input.trim().toLowerCase().replace(/\.$/, '');

  if (!normalized || normalized.includes('*') || !normalized.includes('.')) {
    throw new Error('Enter a valid custom domain');
  }

  const labels = normalized.split('.');
  if (labels.some((label) => !label || label.length > 63 || !/^[a-z0-9-]+$/.test(label) || label.startsWith('-') || label.endsWith('-'))) {
    throw new Error('Enter a valid custom domain');
  }

  if (normalized.length > 253) {
    throw new Error('Enter a valid custom domain');
  }

  return normalized;
}

export function buildDomainVerificationHostname(host: string): string {
  return `_neopages.${normalizeCustomDomain(host)}`;
}

export function buildDomainRoutingTarget(rootDomain: string): string {
  return `cname.${rootDomain.toLowerCase()}`;
}

export function summarizeDomainVerification(input: {
  token: string;
  txtValues: string[];
  cnameTarget: string;
  actualCname: string | null;
  isNNS?: boolean;
}) {
  if (input.isNNS) {
    return {
      verified: true,
      dnsConfigured: true,
      verificationError: null,
      routingError: null
    };
  }

  const normalizedTxtValues = input.txtValues.map((value) => value.trim());
  const verified = normalizedTxtValues.includes(input.token);
  const dnsConfigured = input.actualCname?.toLowerCase().replace(/\.$/, '') === input.cnameTarget.toLowerCase().replace(/\.$/, '');

  return {
    verified,
    dnsConfigured,
    verificationError: verified ? null : `Missing TXT record value ${input.token}`,
    routingError: dnsConfigured ? null : `Point your domain to ${input.cnameTarget}`
  };
}
