/**
 * esbuild config for the production SSR server.
 * Compiles src/ssr-server.ts → dist/server.mjs (standalone Node.js bundle).
 * Run via: node build-server.mjs
 */
import { build } from 'esbuild';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));

await build({
  entryPoints: [path.join(dir, 'src/ssr-server.ts')],
  bundle:   true,
  platform: 'node',
  target:   'node20',
  format:   'esm',
  outfile:  path.join(dir, 'dist/server.mjs'),
  sourcemap: 'linked',
  logLevel: 'info',
  // Externalize native bindings and packages that can't be bundled
  external: [
    '*.node',
    'sharp', 'canvas', 'fsevents', 'pg-native',
    '@google-cloud/*', 'lightningcss',
  ],
  // Inject __dirname / __filename / require for ESM output running on Node
  banner: {
    js: `import { createRequire as __crReq } from 'node:module';
import __nodePath from 'node:path';
import __nodeUrl from 'node:url';
globalThis.require   = __crReq(import.meta.url);
globalThis.__filename = __nodeUrl.fileURLToPath(import.meta.url);
globalThis.__dirname  = __nodePath.dirname(globalThis.__filename);
`,
  },
});
