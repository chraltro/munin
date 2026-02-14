import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'jsdom',
        globals: true,
        include: ['tests/**/*.test.js'],
        coverage: {
            provider: 'v8',
            include: ['lib/**/*.js', 'analytics.js', 'advanced-search.js', 'export-utils.js'],
        },
    },
});
