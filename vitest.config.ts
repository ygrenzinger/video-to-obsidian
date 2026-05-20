import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node'
  },
  resolve: {
    alias: {
      obsidian: new URL('./src/test/obsidian-stub.ts', import.meta.url).pathname
    }
  }
});
