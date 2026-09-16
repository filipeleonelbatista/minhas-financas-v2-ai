import { runMigrations } from '../../src/db/migrate';

test('migrate runner imports SQL as string (not require sql file at runtime)', async () => {
  const mod = require('../../src/db/migrate');
  expect(mod.runMigrations).toBeDefined();
  // should not throw when expoDb is null (jest)
  await expect(mod.runMigrations()).resolves.toBeUndefined();
});

test('migrate module does not use require for .sql files at runtime', () => {
  const fs = require('fs');
  const path = require('path');
  const migratePath = path.resolve(__dirname, '../../src/db/migrate.ts');
  const content = fs.readFileSync(migratePath, 'utf8');
  // should not contain require('./migrations/*.sql') dynamic require for bundling
  expect(content).not.toMatch(/require\(['"].*\.sql['"]\)/);
  // should contain ?raw import or inline SQL string guard
  const hasRawImport = content.includes('?raw') || content.includes('CREATE TABLE');
  expect(hasRawImport).toBe(true);
});

test('runMigrations uses globalThis.Buffer guard if Buffer needed', async () => {
  const fs = require('fs');
  const path = require('path');
  const migratePath = path.resolve(__dirname, '../../src/db/migrate.ts');
  const content = fs.readFileSync(migratePath, 'utf8');
  // if Buffer polyfill is used, must be guarded via globalThis.Buffer or global.Buffer check
  if (content.includes('Buffer')) {
    expect(content).toMatch(/globalThis\.Buffer|global\.Buffer/);
  } else {
    expect(content).not.toContain('require(\'buffer\')');
  }
});
