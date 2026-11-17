/// <reference types="node" />
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { expect, it } from 'vitest';

it('generates a directly addressable legal page with the built app shell and specific metadata', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'bzead-delete-account-'));
  try {
    const appShell = await readFile('index.html', 'utf8');
    await writeFile(path.join(dir, 'index.html'), appShell);
    execFileSync(process.execPath, ['scripts/generate-delete-account-page.mjs', dir]);
    const html = await readFile(path.join(dir, 'deleteaccount', 'index.html'), 'utf8');
    expect(html).toContain('<title>Delete Account Policy - BZEAD</title>');
    expect(html).toContain('Learn how to request deletion');
    expect(html).toContain('<div id="root"></div>');
    expect(html).toContain('<script type="module" src="/src/main.tsx"></script>');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

it.each([
  '<div id="root"></div>',
  '<title>First</title><title>Second</title><meta name="description" content="Description" />',
])('fails rather than generating incorrect metadata for an invalid app shell', async (appShell) => {
  const dir = await mkdtemp(path.join(tmpdir(), 'bzead-delete-account-'));
  try {
    await writeFile(path.join(dir, 'index.html'), appShell);
    expect(() => execFileSync(process.execPath, ['scripts/generate-delete-account-page.mjs', dir], { stdio: 'pipe' }))
      .toThrow();
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
