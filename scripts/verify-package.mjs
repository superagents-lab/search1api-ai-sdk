import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';

const directory = await mkdtemp(join(tmpdir(), 'search1api-ai-sdk-install-'));
try {
  const manifest = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  const tarball = resolve(`search1api-ai-sdk-${manifest.version}.tgz`);
  await writeFile(join(directory, 'package.json'), JSON.stringify({ private: true, type: 'module' }));
  execFileSync('npm', ['install', '--no-audit', '--no-fund', tarball, 'ai@7', 'zod@4', 'typescript@5', '@types/node@22'], { cwd: directory, stdio: 'pipe' });
  await writeFile(join(directory, 'consumer.mts'), `import { search1apiTools } from '@search1api/ai-sdk';
const tools = search1apiTools({ only: ['search'] });
void tools.search;
// @ts-expect-error omitted tools are not in the inferred type
void tools.crawl;
`);
  await writeFile(join(directory, 'consumer.cts'), `import sdk = require('@search1api/ai-sdk');
const tools = sdk.search1apiTools({ only: ['crawl'] });
void tools.crawl;
// @ts-expect-error omitted tools are not in the inferred type
void tools.search;
`);
  await writeFile(join(directory, 'tsconfig.json'), JSON.stringify({ compilerOptions: { target: 'ES2022', module: 'NodeNext', moduleResolution: 'NodeNext', strict: true, noEmit: true, skipLibCheck: true }, include: ['consumer.mts', 'consumer.cts'] }));
  try {
    execFileSync('npx', ['--no-install', 'tsc'], { cwd: directory, stdio: 'pipe' });
  } catch (error) {
    process.stderr.write(error.stdout ?? '');
    throw error;
  }
  const output = execFileSync('node', ['--input-type=module', '-e', `
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { search1apiTools } from '@search1api/ai-sdk';
const response = { results: [{ title: 'Example', link: 'https://example.com', snippet: 'A source.' }] };
const tools = search1apiTools({ only: ['search'], apiKey: 'test-key', fetch: async () => Response.json(response) });
assert.deepEqual(await tools.search.execute({ query: 'example' }, { toolCallId: '1', messages: [], context: {} }), response);
const require = createRequire(import.meta.url);
assert.deepEqual(Object.keys(require('@search1api/ai-sdk').search1apiTools()), ['search', 'news', 'crawl']);
console.log('PASS fresh tarball install, ESM/CJS execution, and TypeScript consumers');
`], { cwd: directory, encoding: 'utf8' });
  assert.match(output, /PASS/);
  process.stdout.write(output);
} finally {
  await rm(directory, { recursive: true, force: true });
}
