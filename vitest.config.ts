import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    coverage: {
      enabled: false,
      reporter: ['text', 'lcov'],
      thresholds: {
        lines: 60,
        functions: 60,
        statements: 60,
        branches: 50
      }
    }
  }
});