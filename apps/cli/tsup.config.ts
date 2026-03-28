import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  sourcemap: true,
  clean: true,
  splitting: false,
  treeshake: true,
  target: 'node22',
  banner: {
    js: '#!/usr/bin/env node',
  },
  noExternal: ['@atlascrew/apparatus-lib'],
});
