import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup/setup.js'],
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'html'],
      all: true,
      reportsDirectory: path.resolve('./coverage'),
    },
  },
});
