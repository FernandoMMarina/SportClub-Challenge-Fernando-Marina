// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    files: ['test/**/*.mjs'],
    languageOptions: { ecmaVersion: 2025, sourceType: 'module' },
  },
  {
    ignores: ['dist/**', '.expo/**'],
  },
]);
