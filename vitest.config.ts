import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      enabled: true,
      reporter: ['text', 'lcov'],
      lines: 60,
      functions: 60,
      statements: 60,
      branches: 50
    }
  }
});