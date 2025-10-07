# Project Structure

## Overview
This document describes the organized structure of the Automated Video Pipeline codebase after restructuring.

## Directory Structure

```
automated-video-pipeline/
├── src/                          # Source code
│   ├── lambda/                   # Lambda functions
│   │   ├── topic-management/     # Topic CRUD operations
│   │   ├── video-assembler/      # Video assembly orchestration
│   │   ├── script-generator/     # AI script generation
│   │   ├── audio-generator/      # Audio synthesis
│   │   └── media-curator/        # Media collection
│   ├── shared/                   # Shared utilities
│   │   ├── http/                 # HTTP response handlers
│   │   ├── aws-clients/          # AWS client factories
│   │   ├── middleware/           # Lambda middleware
│   │   └── config/               # Configuration management
│   ├── layers/                   # Lambda layers
│   └── cost-reporting/           # Cost tracking utilities
├── test/                         # Test files (organized)
│   ├── unit/                     # Unit tests
│   ├── integration/              # Integration tests
│   ├── e2e/                      # End-to-end tests
│   └── fixtures/                 # Test data
├── docs/                         # Documentation
│   ├── architecture/             # Architecture docs
│   ├── api/                      # API documentation
│   ├── deployment/               # Deployment guides
│   └── user-guides/              # User documentation
├── infrastructure/               # AWS CDK infrastructure
├── scripts/                      # Utility scripts
│   ├── cleanup/                  # Cleanup and restructuring
│   └── deployment/               # Deployment scripts
└── config/                       # Configuration files
```

## Key Improvements

### ✅ Eliminated Code Duplication
- Removed duplicate Lambda functions
- Consolidated configuration managers
- Created shared utilities for common patterns

### ✅ Consistent Architecture
- Standardized error handling with middleware
- Unified AWS client management
- Consistent HTTP response patterns

### ✅ Organized File Structure
- Moved test files to proper locations
- Organized documentation by category
- Separated scripts by purpose

### ✅ Shared Utilities
- `src/shared/http/response-handler.js` - HTTP response utilities
- `src/shared/aws-clients/factory.js` - AWS client factory
- `src/shared/middleware/error-handler.js` - Error handling middleware
- `src/shared/config/environment.js` - Environment configuration

## Usage Examples

### Lambda Function with Shared Utilities
```javascript
import { createResponse } from '../../shared/http/response-handler.js';
import { createAWSClients } from '../../shared/aws-clients/factory.js';
import { withErrorHandler } from '../../shared/middleware/error-handler.js';

const { docClient } = createAWSClients();

const handler = async (event, context) => {
  // Your logic here
  return createResponse(200, { message: 'Success' });
};

export default withErrorHandler(handler);
```

### Running Tests
```bash
# Unit tests
npm run test:unit

# Integration tests  
npm run test:integration

# End-to-end tests
npm run test:e2e

# All tests
npm test
```

## Migration Status

- ✅ **Phase 1**: Duplicate removal and structure creation
- ✅ **Phase 2**: Shared utilities and middleware
- 🔄 **Phase 3**: Lambda function updates (in progress)
- ⏳ **Phase 4**: Documentation and testing (next)

## Next Steps

1. Complete Lambda function migrations to use shared utilities
2. Update package.json for ES6 module support
3. Run comprehensive test suite
4. Update deployment scripts
5. Complete documentation
