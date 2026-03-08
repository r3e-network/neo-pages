import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { randomUUID } from 'crypto';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Testing End-to-End deployment loop...');

  // 1. Get or create a user to own the project
  let { data: users, error: userError } = await supabase.auth.admin.listUsers();
  if (userError) throw userError;
  
  let userId = users.users.length > 0 ? users.users[0].id : null;
  if (!userId) {
     console.log('No users found. Creating a test user...');
     const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
       email: 'test-runner@neopages.dev',
       password: 'Password123!',
       email_confirm: true
     });
     if (createError) throw createError;
     userId = newUser.user.id;
  }
  
  console.log('Using User ID:', userId);

  // Ensure profile exists
  const { data: profile } = await supabase.from('profiles').select('id').eq('id', userId).single();
  if (!profile) {
    console.log('Inserting profile...');
    const { error: profileErr } = await supabase.from('profiles').insert({ id: userId, github_login: 'test-runner' });
    if (profileErr) throw profileErr;
  }

  const projectId = randomUUID();
  const projectName = 'e2e-test-vite-' + Date.now();

  // 2. Insert a project
  const { error: projError } = await supabase.from('projects').insert({
    id: projectId,
    owner_id: userId,
    name: projectName,
    repo_full_name: 'local/dummy-repo',
    subdomain: projectName,
    framework: 'static',
    output_directory: '.',
    install_command: 'echo "No install needed"',
    build_command: 'echo "<h1>Hello NeoPages End-to-End Test</h1>" > index.html',
    status: 'draft'
  });

  if (projError) throw projError;
  console.log('Created project:', projectName);

  // 3. Queue a deployment
  const deploymentId = randomUUID();
  const { error: depError } = await supabase.from('deployments').insert({
    id: deploymentId,
    project_id: projectId,
    status: 'queued',
    branch: 'master',
    environment: 'production',
    commit_sha: 'HEAD',
    commit_message: 'End-to-End Test Deployment'
  });

  if (depError) throw depError;
  console.log('Queued deployment:', deploymentId);
  
  // 4. Update project status to queued
  await supabase.from('projects').update({ status: 'queued' }).eq('id', projectId);

  console.log('Waiting for builder to pick it up...');
  
  // 5. Poll for completion
  for (let i = 0; i < 60; i++) {
    await new Promise(resolve => setTimeout(resolve, 5000));
    const { data: dep } = await supabase.from('deployments').select('status, logs, container_id').eq('id', deploymentId).single();
    if (dep) {
      console.log(`[${i*5}s] Status: ${dep.status}`);
      if (dep.status === 'deployed' || dep.status === 'failed') {
        console.log('Final Logs:\\n', dep.logs);
        console.log('Container ID:', dep.container_id);
        break;
      }
    }
  }
  
  console.log('Done. If deployed, test the gateway proxy using the container ID.');
}

run().catch(console.error);
