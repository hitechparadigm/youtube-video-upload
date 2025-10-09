/**
 * ESLint Configuration for Automated Video Pipeline
 */

module.exports = {
  env: {
    node: true,
    es2022: true,
    jest: true
  },
  
  extends: [
    'eslint:recommended'
  ],
  
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module'
  },
  
  rules: {
    // Code quality rules
    'no-unused-vars': ['error', { 
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_' 
    }],
    'no-console': 'off', // Allow console in Lambda functions
    'prefer-const': 'error',
    'no-var': 'error',
    
    // Style rules
    'indent': ['error', 2],
    'quotes': ['error', 'single', { avoidEscape: true }],
    'semi': ['error', 'always'],
    'comma-dangle': ['error', 'never'],
    
    // Best practices
    'eqeqeq': ['error', 'always'],
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    'no-return-assign': 'error',
    'no-self-compare': 'error',
    'no-throw-literal': 'error',
    'no-unused-expressions': 'error',
    'no-useless-call': 'error',
    'no-useless-concat': 'error',
    'no-useless-return': 'error',
    
    // ES6+ rules
    'arrow-spacing': 'error',
    'no-duplicate-imports': 'error',
    'no-useless-constructor': 'error',
    'prefer-arrow-callback': 'error',
    'prefer-template': 'error'
  },
  
  overrides: [
    {
      // Test files
      files: ['tests/**/*.js', '**/*.test.js', '**/*.spec.js'],
      env: {
        jest: true
      },
      rules: {
        'no-unused-expressions': 'off' // Allow expect() statements
      }
    },
    {
      // Lambda functions
      files: ['src/lambda/**/*.js'],
      rules: {
        'no-console': 'off' // Allow console.log in Lambda functions for CloudWatch
      }
    },
    {
      // Shared utilities
      files: ['src/shared/**/*.js'],
      rules: {
        'no-console': 'warn' // Warn about console usage in shared utilities
      }
    }
  ],
  
  ignorePatterns: [
    'node_modules/',
    'coverage/',
    'test-results/',
    'infrastructure/node_modules/',
    'src/lambda/*/node_modules/',
    '*.min.js',
    'dist/',
    'build/'
  ]
};