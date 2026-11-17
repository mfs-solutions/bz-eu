#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const dist = path.resolve(process.argv[2] || 'dist-buyer');
const html = await readFile(path.join(dist, 'index.html'), 'utf8');
const title = /<title>[^<]*<\/title>/gi;
const description = /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/gi;
if ((html.match(title) || []).length !== 1 || (html.match(description) || []).length !== 1) {
  throw new Error('Built app shell must contain exactly one title and description');
}
const page = html
  .replace(title, '<title>Delete Account Policy - BZEAD</title>')
  .replace(
    description,
    '<meta name="description" content="Learn how to request deletion of your BZEAD account and personal data." />',
  );
const destination = path.join(dist, 'deleteaccount');
await mkdir(destination, { recursive: true });
await writeFile(path.join(destination, 'index.html'), page, 'utf8');
console.log('[legal-page] Generated deleteaccount/index.html');
