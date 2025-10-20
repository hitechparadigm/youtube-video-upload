module.exports = {
    env: {
        browser: true,
        es2021: true,
        node: true
    },
    extends: [
        'eslint:recommended'
    ],
    parserOptions: {
        ecmaVersion: 2021,
        sourceType: 'module'
    },
    rules: {
        // Enforce proper optional chaining syntax
        'no-unexpected-multiline': 'error',
        'no-irregular-whitespace': 'error',

        // Custom rule to catch the specific ? . pattern
        'no-restricted-syntax': [
            'error',
            {
                'selector': 'MemberExpression[optional=true][computed=false]',
                'message': 'Use ?. for optional chaining, not ? .'
            }
        ],

        // Enforce consistent spacing
        'space-infix-ops': 'error',
        'no-multi-spaces': 'error',

        // Catch potential syntax issues early
        'no-undef': 'error',
        'no-unused-vars': 'warn',
        'semi': ['error', 'always'],
        'quotes': ['error', 'single', {
            'allowTemplateLiterals': true
        }]
    }
};