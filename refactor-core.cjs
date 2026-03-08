const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'packages/core/src');

const mapping = {
  'activity': ['activity.ts', 'activity.test.ts'],
  'billing': ['plan-tiers.ts', 'plan-tiers.test.ts'],
  'demo': ['demo-seed.ts', 'demo-seed.test.ts'],
  'domains': ['domains.ts', 'domains.test.ts'],
  'github': ['github-app.ts', 'github-app.test.ts'],
  'hosting': ['hosting.ts', 'previews.test.ts'],
  'local': ['local-supabase.ts', 'local-supabase.test.ts'],
  'models': ['models.ts', 'models.test.ts'],
  'notifications': ['notifications.ts', 'notifications.test.ts', 'notification-formats.test.ts']
};

const modulePaths = {
  './hosting': '../hosting/hosting',
  './models': '../models/models',
  './demo-seed': '../demo/demo-seed',
  './local-supabase': '../local/local-supabase',
  './github-app': '../github/github-app',
  './domains': '../domains/domains',
  './notifications': '../notifications/notifications',
  './activity': '../activity/activity',
  './plan-tiers': '../billing/plan-tiers',
  './index': '../index'
};

// 1. Create directories and move files
for (const [dir, files] of Object.entries(mapping)) {
  const fullDir = path.join(srcDir, dir);
  if (!fs.existsSync(fullDir)) {
    fs.mkdirSync(fullDir);
  }
  for (const file of files) {
    const oldPath = path.join(srcDir, file);
    const newPath = path.join(fullDir, file);
    if (fs.existsSync(oldPath)) {
      fs.renameSync(oldPath, newPath);
    }
  }
}

// 2. Update imports in moved files
for (const [dir, files] of Object.entries(mapping)) {
  for (const file of files) {
    const filePath = path.join(srcDir, dir, file);
    if (!fs.existsSync(filePath)) continue;

    let content = fs.readFileSync(filePath, 'utf-8');

    // Replace module paths
    for (const [oldImport, newImport] of Object.entries(modulePaths)) {
      const regex = new RegExp(`from '${oldImport}'`, 'g');
      content = content.replace(regex, `from '${newImport}'`);
    }

    fs.writeFileSync(filePath, content);
  }
}

// 3. Rewrite index.ts
const indexContent = `export * from './hosting/hosting';
export * from './models/models';
export * from './demo/demo-seed';
export * from './local/local-supabase';
export * from './github/github-app';
export * from './domains/domains';
export * from './notifications/notifications';
export * from './activity/activity';
export * from './billing/plan-tiers';
`;

fs.writeFileSync(path.join(srcDir, 'index.ts'), indexContent);

console.log('Refactoring complete.');
