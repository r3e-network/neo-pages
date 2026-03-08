import type { ProjectGasSponsorshipRecord, ProjectGasSponsorshipView } from '@neopages/core';
import { getProjectAccess } from './collaborators';
import { recordProjectActivity } from './project-activity';
import { createAdminSupabaseClient } from './supabase';

export async function getProjectGasSponsorship(projectId: string, actorId?: string): Promise<ProjectGasSponsorshipView | null> {
  const supabase = createAdminSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('project_gas_sponsorships')
    .select('*')
    .eq('project_id', projectId)
    .maybeSingle();

  if (error || !data) {
    return {
      id: 'temp-' + projectId,
      projectId,
      isEnabled: false,
      balance: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }
  
  const record = data as ProjectGasSponsorshipRecord;

  return {
    id: record.id,
    projectId: record.project_id,
    isEnabled: record.is_enabled,
    balance: record.balance,
    createdAt: record.created_at,
    updatedAt: record.updated_at
  };
}

export async function updateProjectGasSponsorship(projectId: string, actorId: string | undefined, isEnabled: boolean): Promise<ProjectGasSponsorshipView> {
  if (!actorId) {
    throw new Error('Authentication required');
  }

  const access = await getProjectAccess(projectId, actorId);
  if (!access || access.role !== 'owner') {
    throw new Error('Only project owners can manage gas sponsorships');
  }

  const supabase = createAdminSupabaseClient();
  if (!supabase) throw new Error('Supabase client is not configured');

  const { data, error } = await supabase
    .from('project_gas_sponsorships')
    .upsert(
      { project_id: projectId, is_enabled: isEnabled },
      { onConflict: 'project_id' }
    )
    .select()
    .single();

  if (error || !data) throw new Error(error?.message ?? 'Failed to update gas sponsorship');

  const record = data as ProjectGasSponsorshipRecord;
  
  await recordProjectActivity({
    projectId,
    ownerId: access.ownerId,
    actorId,
    eventType: 'gas_sponsorship.updated',
    summary: isEnabled ? 'Enabled gas sponsorship' : 'Disabled gas sponsorship',
    metadata: { isEnabled }
  });

  return {
    id: record.id,
    projectId: record.project_id,
    isEnabled: record.is_enabled,
    balance: record.balance,
    createdAt: record.created_at,
    updatedAt: record.updated_at
  };
}
