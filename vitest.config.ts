import { defineConfig } from 'vitest/config';
import { config as loadEnvFile } from 'dotenv';

// Local-only overrides (e.g. TEST_DATABASE_URL with a password). Git-ignored,
// so no credential lives in a committed file.
loadEnvFile({ path: '.env.test.local' });

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    testTimeout: 30_000,
    hookTimeout: 30_000,
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
  },
});
