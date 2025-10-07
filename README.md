# Automated Video Pipeline

Clean, simple AWS-based video creation system.

## Current Status

### ✅ Deployed and Working
- **Topic Management** - CRUD operations with Google Sheets sync
- **Media Curator** - Smart image/video collection from Pexels/Pixabay
- **Video Assembler** - Orchestrates video creation
- **AI Integration** - Claude 3.x models for content generation

### 🏗️ Infrastructure
- **Serverless AWS** - Lambda functions with DynamoDB
- **Cost Tracking** - Comprehensive monitoring
- **Configuration** - Environment-based settings

## Quick Start

```bash
# Deploy infrastructure
npm run deploy

# Test system
npm test

# Sync topics from Google Sheets
node scripts/sync-spreadsheet.js
```

## Project Structure

```
src/
├── lambda/           # Lambda functions
├── shared/           # Shared utilities
└── layers/           # Lambda layers

test/
├── unit/            # Unit tests
├── integration/     # Integration tests
└── e2e/            # End-to-end tests

docs/
├── configuration-guide.md
├── project-overview.md
└── deployment/
```

## Documentation

- [Configuration Guide](docs/configuration-guide.md)
- [Project Overview](docs/project-overview.md)
- [Deployment Guide](docs/deployment/deployment-guide.md)

Simple, clean, and focused on what works.
