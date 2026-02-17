module.exports = {
  root: true,
  ignorePatterns: ['dist/**', 'node_modules/**'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  rules: {},
};

