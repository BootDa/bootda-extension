import { defineConfig } from 'vitest/config';
export default defineConfig(({ mode }) => ({
  test: {
    include: mode === 'chrome' ? ['tests/chrome-popup.test.ts'] : ['extension/src/**/*.test.ts'],
  },
}));
