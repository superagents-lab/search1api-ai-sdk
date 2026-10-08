import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

const root = new URL('../', import.meta.url);
const directory = await mkdtemp(join(tmpdir(), 'search1api-ai-sdk-compat-'));
try {
  for (const ai of [5, 6, 7]) {
    for (const zod of [3, 4]) {
      const cwd = join(directory, `ai-${ai}-zod-${zod}`);
      for (const path of ['src', 'test', 'scripts', 'tsconfig.json', 'tsconfig.build.json']) {
        await cp(new URL(path, root), join(cwd, path), { recursive: true });
      }
      const pkg = JSON.parse(await readFile(new URL('package.json', root), 'utf8'));
      pkg.devDependencies.ai = `${ai}`;
      pkg.devDependencies.zod = `${zod}`;
      await writeFile(join(cwd, 'package.json'), JSON.stringify(pkg, null, 2));
      for (const args of [['install', '--no-audit', '--no-fund'], ['run', 'typecheck'], ['test'], ['run', 'build'], ['run', 'test:smoke']]) {
        try {
          execFileSync('npm', args, { cwd, stdio: 'pipe', timeout: 120_000 });
        } catch (error) {
          process.stderr.write(error.stdout ?? '');
          process.stderr.write(error.stderr ?? '');
          throw error;
        }
      }
      const versions = JSON.parse(await readFile(join(cwd, 'package-lock.json'), 'utf8'));
      console.log(`PASS ai ${versions.packages['node_modules/ai'].version} / zod ${versions.packages['node_modules/zod'].version}: types, unit tests, build, generation/streaming loop, ESM/CJS`);
    }
  }
} finally {
  await rm(directory, { recursive: true, force: true });
}
