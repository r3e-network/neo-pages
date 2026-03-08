import { describe, expect, it } from 'vitest';

import {
  formatOrganizationActivityLabel,
  formatProjectActivityLabel,
  organizationActivityEventSchema,
  projectActivityEventSchema
} from '../index';

describe('projectActivityEventSchema', () => {
  it('parses supported activity event names', () => {
    expect(projectActivityEventSchema.parse('project.created')).toBe('project.created');
    expect(projectActivityEventSchema.parse('deployment.succeeded')).toBe('deployment.succeeded');
    expect(projectActivityEventSchema.parse('domain.verified')).toBe('domain.verified');
  });
});

describe('organizationActivityEventSchema', () => {
  it('parses supported organization event names', () => {
    expect(organizationActivityEventSchema.parse('organization.created')).toBe('organization.created');
    expect(organizationActivityEventSchema.parse('organization.member.invited')).toBe('organization.member.invited');
  });
});

describe('formatProjectActivityLabel', () => {
  it('returns human-readable labels for key events', () => {
    expect(formatProjectActivityLabel('project.created')).toBe('Project created');
    expect(formatProjectActivityLabel('deployment.promoted')).toBe('Deployment promoted');
    expect(formatProjectActivityLabel('webhook.deleted')).toBe('Webhook removed');
  });
});

describe('formatOrganizationActivityLabel', () => {
  it('returns human-readable labels for organization events', () => {
    expect(formatOrganizationActivityLabel('organization.created')).toBe('Organization created');
    expect(formatOrganizationActivityLabel('organization.member.added')).toBe('Organization member added');
  });
});
