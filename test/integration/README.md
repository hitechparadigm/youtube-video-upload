# Integration Tests for Topic Management System

## Overview

This test suite validates the complete Topic Management System including REST API endpoints, Google Sheets sync functionality, and error handling scenarios.

## Test Coverage

### Topic CRUD Operations
- ✅ Create new topics with validation
- ✅ Retrieve topics by ID and with filtering
- ✅ Update existing topics
- ✅ Delete topics
- ✅ List topics with pagination and filtering

### Google Sheets Integration
- ✅ Validate Google Sheets structure
- ✅ Sync topics from Google Sheets
- ✅ Handle sync errors and invalid URLs
- ✅ Retrieve sync history

### Validation & Error Handling
- ✅ Input validation for all fields
- ✅ Authentication and authorization
- ✅ Malformed request handling
- ✅ Rate limiting and concurrent requests

### Performance & Monitoring
- ✅ Cost tracking integration
- ✅ Concurrent request handling
- ✅ Response time validation

## Setup

### Environment Variables

Create a `.env` file in the project root:

```bash
# Required for integration tests
API_BASE_URL=https://your-api-gateway-url
API_KEY=your-api-key

# Optional - for Google Sheets testing
TEST_SHEET_URL=https://docs.google.com/spreadsheets/d/your-test-sheet/edit#gid=0
```

### Prerequisites

1. **Deployed Infrastructure**: The Topic Management system must be deployed to AWS
2. **API Gateway URL**: Get from CDK deployment output
3. **API Key**: Get from AWS Console → API Gateway → API Keys
4. **Test Google Sheet**: Create a public test sheet (optional)

## Running Tests

### All Integration Tests
```bash
npm run test:integration
```

### Specific Test Suites
```bash
# Topic CRUD operations only
npm run test:integration -- --testNamePattern="Topic CRUD"

# Google Sheets sync only
npm run test:integration -- --testNamePattern="Google Sheets"

# Validation tests only
npm run test:integration -- --testNamePattern="Validation"
```

### With Coverage
```bash
npm run test:integration:coverage
```

### Watch Mode (for development)
```bash
npm run test:integration:watch
```

## Test Structure

```
test/integration/
├── topic-management.test.js    # Main integration test suite
├── jest.config.js             # Jest configuration
├── setup.js                   # Test setup and utilities
└── README.md                  # This file
```

## Test Data

The tests use dynamically generated test data to avoid conflicts:

```javascript
const testTopic = {
  topic: 'Integration Test Topic - ' + Date.now(),
  dailyFrequency: 2,
  priority: 1,
  status: 'active',
  targetAudience: 'test-audience',
  region: 'US',
  contentStyle: 'engaging_educational'
};
```

## Expected Results

### Successful Test Run
```
✅ Topic Management Integration Tests
  ✅ Topic CRUD Operations
    ✅ should create a new topic
    ✅ should retrieve the created topic
    ✅ should list topics with filtering
    ✅ should update the topic
    ✅ should delete the topic
  ✅ Topic Validation
    ✅ should reject invalid topic data
    ✅ should handle missing required fields
    ✅ should handle non-existent topic retrieval
  ✅ Authentication and Authorization
    ✅ should reject requests without API key
    ✅ should reject requests with invalid API key
  ✅ Google Sheets Sync Integration
    ✅ should validate Google Sheets structure
    ✅ should handle sync operation
    ✅ should retrieve sync history
    ✅ should handle invalid spreadsheet URL
```

## Troubleshooting

### Common Issues

**"API Gateway URL not found"**
- Ensure the infrastructure is deployed: `npm run deploy`
- Check CDK output for the API Gateway URL
- Verify the URL in your `.env` file

**"Invalid API Key"**
- Get the API key from AWS Console → API Gateway → API Keys
- Ensure the key is associated with the usage plan
- Check the key value in your `.env` file

**"Google Sheets tests failing"**
- Ensure the test sheet is publicly accessible
- Use "Anyone with the link" sharing permission
- Verify the sheet URL format is correct

**"Rate limiting errors"**
- Reduce concurrent test execution
- Increase delays between requests
- Check API Gateway usage plan limits

### Debug Mode

Run tests with debug output:
```bash
DEBUG=true npm run test:integration
```

## Integration with CI/CD

### GitHub Actions Example
```yaml
- name: Run Integration Tests
  env:
    API_BASE_URL: ${{ secrets.API_BASE_URL }}
    API_KEY: ${{ secrets.API_KEY }}
  run: npm run test:integration
```

### Local Development
```bash
# Set up environment
cp .env.example .env
# Edit .env with your values

# Run tests
npm run test:integration
```

## Cost Considerations

Integration tests make real API calls and may incur small AWS costs:
- **Lambda invocations**: ~$0.0000002 per request
- **DynamoDB operations**: ~$0.0000125 per read/write
- **API Gateway requests**: ~$0.0000035 per request

Total cost per test run: < $0.01

## Security Notes

- Tests use read-only operations where possible
- Test data is automatically cleaned up
- No sensitive data is stored in test fixtures
- API keys should be stored securely in environment variables