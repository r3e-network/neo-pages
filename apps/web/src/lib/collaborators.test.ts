import { describe, expect, it } from 'vitest';

import {
  canEditProject,
  canManageProjectCollaborators,
  canViewProject,
  normalizeProjectRole
} from './collaborators';

describe('normalizeProjectRole', () => {
  it('accepts supported roles', () => {
    expect(normalizeProjectRole('owner')).toBe('owner');
    expect(normalizeProjectRole('editor')).toBe('editor');
    expect(normalizeProjectRole('viewer')).toBe('viewer');
  });

  it('rejects unsupported roles', () => {
    expect(() => normalizeProjectRole('admin')).toThrow();
  });
});

describe('project role permissions', () => {
  it('lets any project role view', () => {
    expect(canViewProject('owner')).toBe(true);
    expect(canViewProject('editor')).toBe(true);
    expect(canViewProject('viewer')).toBe(true);
  });

  it('limits edits to owner and editor', () => {
    expect(canEditProject('owner')).toBe(true);
    expect(canEditProject('editor')).toBe(true);
    expect(canEditProject('viewer')).toBe(false);
  });

  it('limits collaborator management to owner', () => {
    expect(canManageProjectCollaborators('owner')).toBe(true);
    expect(canManageProjectCollaborators('editor')).toBe(false);
    expect(canManageProjectCollaborators('viewer')).toBe(false);
  });
});
