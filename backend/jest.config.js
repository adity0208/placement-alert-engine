// jest.config.js
export default {
  testEnvironment: 'node',
  transform: {},
  testMatch: ['**/tests/**/*.test.js'],
  moduleFileExtensions: ['js', 'mjs'],
  testTimeout: 30000,
  collectCoverageFrom: [
    'aiParser.js',
    'models/Job.js',
    'utils/filter.js',
  ],
};
