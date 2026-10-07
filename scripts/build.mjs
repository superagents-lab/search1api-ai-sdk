import { rm } from 'node:fs/promises';
import { build } from 'esbuild';

await rm('dist', { recursive: true, force: true });
for (const [format, outfile] of [['esm', 'dist/index.js'], ['cjs', 'dist/index.cjs']]) {
  await build({
    entryPoints: ['src/index.ts'],
    bundle: true,
    packages: 'external',
    platform: 'neutral',
    target: 'es2022',
    sourcemap: true,
    format,
    outfile,
  });
}
