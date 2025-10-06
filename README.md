# Automated YouTube Video Pipeline

> **AI-powered serverless system that automatically generates, produces, and publishes high-quality YouTube videos from simple topic inputs using multi-agent orchestration and AWS services.**

## Overview

The Automated YouTube Video Pipeline transforms basic topic ideas (like "Investing for beginners in the USA") into complete, published YouTube videos through an intelligent multi-agent system. The platform leverages AI agents for trend analysis, content creation, media curation, and video production, running entirely on AWS serverless infrastructure.

### How It Works

1. **Topic Input**: Define topics via Google Sheets or REST API
2. **AI Analysis**: Trend Research Agent analyzes current trends and generates specific video concepts
3. **Content Creation**: Script Writer Agent creates engaging, subscriber-focused content
4. **Media Production**: Media Curator and Audio Producer agents handle visuals and narration
5. **Video Assembly**: Video Compositor assembles and publishes to YouTube
6. **Monitoring**: Complete cost tracking and performance analytics

### AI Agent Architecture

The system uses **Amazon Bedrock Agents** with hierarchical multi-agent collaboration:

- **🎯 Video Production Orchestrator** (Supervisor): Coordinates the entire workflow
- **📊 Trend Research Analyst**: Analyzes trends from Google, YouTube, Twitter, and news
- **✍️ Content Script Writer**: Creates engaging scripts optimized for subscriber growth
- **🎨 Media Curator**: Sources relevant images/videos from multiple APIs
- **🎵 Audio Producer**: Generates professional narration using Amazon Polly
- **🎬 Video Compositor**: Assembles final videos and publishes to YouTube

## Current Status

### ✅ Production Ready (Phase 1 & 2A)

- **Topic Management System**: Complete CRUD operations with validation and priority scheduling
- **Google Sheets Integration**: Simplified sync (no API keys required)
- **Multi-Source Trend Collection**: Google Trends, YouTube, Twitter, and News API integration
- **AI Topic Generation**: Amazon Bedrock integration with Claude 3.x models for intelligent topic creation
- **Configuration Management**: Comprehensive, hierarchical configuration system with no hardcoded values
- **REST API Gateway**: Authentication, rate limiting, and comprehensive endpoints
- **AWS Infrastructure**: Serverless, cost-optimized deployment with monitoring

### 🚧 In Development (Phase 2B)

- **Content Script Generation**: AI-powered script and title creation
- **Media Pipeline**: Automated video production and publishing

## Features

### 🔧 Comprehensive Configuration System

- **Zero Hardcoded Values**: Everything configurable through hierarchical configuration
- **Environment-Specific**: Optimized settings for development, staging, production
- **AI Model Management**: Easy switching between Claude 3.5 Sonnet, Claude 3 Sonnet, Claude 3 Haiku
- **Cost Control**: Configurable budgets, limits, and optimization settings
- **Security Integration**: AWS Secrets Manager for sensitive configuration
- **Management Tools**: Scripts for easy configuration changes and deployment

### Topic Management

- **CRUD Operations**: Full create, read, update, delete with validation
- **Priority Scheduling**: 1-10 priority levels for video generation order
- **Keyword Extraction**: Automatic keyword generation from topic text
- **Multi-Region Support**: US, CA, UK, AU, EU content targeting
- **Content Styles**: Educational, entertainment, professional, casual modes

### Google Sheets Integration

- **Zero Setup**: No API keys or Google Cloud configuration required
- **Universal Access**: Works with any Google account via public sharing
- **Smart Sync**: Incremental, overwrite, and merge strategies with conflict resolution
- **Audit Trail**: Complete sync history and error tracking
- **Validation**: Pre-sync structure validation with detailed error reporting

### Trend Data Collection
- **Multi-Source Integration**: Google Trends, YouTube Data API v3, Twitter API v2, News API
- **Real-Time Analysis**: Collects trending data from the last 7 days across all sources
- **Smart Processing**: Trend scoring algorithms and keyword extraction
- **Data Storage**: Raw data in S3, processed summaries in DynamoDB with TTL
- **Cost Optimized**: Rate limiting, graceful degradation, and reserved concurrency
- **Comprehensive Analytics**: Engagement metrics, sentiment analysis, and content opportunities

### Infrastructure

- **Serverless**: AWS Lambda (Node.js 20.x) with auto-scaling
- **Database**: DynamoDB with optimized GSI indexes for fast queries
- **Storage**: S3 buckets with lifecycle policies for cost optimization
- **Security**: Secrets Manager for API credentials, IAM least privilege access
- **API**: REST endpoints with authentication and rate limiting
- **Monitoring**: CloudWatch logging, metrics, and cost tracking

## Quick Start

### Prerequisites

- Node.js 20.x or later
- AWS CLI configured with deployment permissions
- AWS CDK v2 (`npm install -g aws-cdk`)

### 🚀 Deploy Infrastructure

```bash
# One-command deployment
chmod +x deploy.sh && ./deploy.sh

# Or manual deployment
cd infrastructure && npm install
npx cdk bootstrap  # First time only
npx cdk deploy TopicManagementStack
```

### ⚙️ Configure AI Models

```bash
# Quick model switching (Windows)
scripts\configure-ai-model.bat claude-3.5-sonnet

# Quick model switching (Linux/Mac)
./scripts/configure-ai-model.sh claude-3.5-sonnet

# Or use comprehensive configuration management
./scripts/manage-config.sh model claude-3.5-sonnet
./scripts/manage-config.sh env production
```

### Configure Trend Data Collection (Optional)

1. **Get API Keys** (see [`docs/trend-data-collection.md`](docs/trend-data-collection.md) for details):
   - YouTube Data API v3 key
   - Twitter API v2 Bearer Token  
   - News API key

2. **Update Secrets Manager**:
   ```bash
   aws secretsmanager update-secret \
     --secret-id automated-video-pipeline/api-credentials \
     --secret-string '{"youtube":{"apiKey":"your-key"},"twitter":{"bearerToken":"your-token"},"news":{"apiKey":"your-key"}}'
   ```

3. **Test Trend Collection**:
   ```bash
   curl -X POST https://your-api-url/trends/collect \
     -H "x-api-key: your-key" \
     -d '{"action":"collect","topic":"investing for beginners","sources":["google-trends","youtube"]}'
   ```

### Add Topics via Google Sheets

1. Create a Google Sheets document:
   ```
   Topic                              | Daily Frequency | Priority | Status | Target Audience | Region | Content Style        | Tags
   Investing for beginners in the USA | 2              | 1        | active | beginners       | US     | engaging_educational | investing,finance
   ```
2. Share: "Anyone with the link" → "Viewer"
3. Sync: `POST /sync` with your sheet URL

### Add Topics via API

```bash
curl -X POST https://your-api-url/topics \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-key" \
  -d '{"topic": "Investing for beginners", "priority": 1, "dailyFrequency": 2}'
```

## API Reference

### Endpoints

| Method                 | Endpoint         | Description        | Parameters                                                                        |
| ---------------------- | ---------------- | ------------------ | --------------------------------------------------------------------------------- |
| **Topic Management**   |
| GET                    | `/topics`        | List topics        | `?status=active&priority=1&limit=10`                                              |
| POST                   | `/topics`        | Create topic       | `{topic, priority, dailyFrequency, status, targetAudience, region, contentStyle}` |
| GET                    | `/topics/{id}`   | Get topic          | -                                                                                 |
| PUT                    | `/topics/{id}`   | Update topic       | `{priority, status, ...}`                                                         |
| DELETE                 | `/topics/{id}`   | Delete topic       | -                                                                                 |
| **AI Topic Generation** |
| POST                   | `/ai-topics/generate` | Generate AI topics | `{baseTopic, frequency, targetAudience, contentStyle}`                          |
| POST                   | `/ai-topics/analyze` | Analyze trends    | `{topic, timeframe}`                                                             |
| GET                    | `/ai-topics/suggestions` | Get suggestions | `?category=finance&limit=10`                                                    |
| **Google Sheets Sync** |
| POST                   | `/sync`          | Sync from sheets   | `{action: "sync", spreadsheetUrl, syncMode}`                                      |
| POST                   | `/sync/validate` | Validate structure | `{action: "validate", spreadsheetUrl}`                                            |
| GET                    | `/sync/history`  | Sync history       | `?limit=10`                                                                       |
| **Trend Data Collection** |
| POST                   | `/trends/collect` | Collect trend data | `{action: "collect", topic, sources, timeframe}`                                 |
| GET                    | `/trends`        | Get trend data     | `?topic=investing&limit=10`                                                      |

### Data Model

```json
{
  "topicId": "uuid",
  "topic": "Investing for beginners in the USA",
  "keywords": ["investing", "beginners", "usa"],
  "dailyFrequency": 2,
  "priority": 1,
  "status": "active",
  "targetAudience": "beginners",
  "region": "US",
  "contentStyle": "engaging_educational",
  "metadata": {
    "createdBy": "google-sheets-sync",
    "source": "google-sheets",
    "tags": ["investing", "finance"]
  }
}
```

## Architecture

### Current System (Phase 1 & 2A)

```
Google Sheets ──→ API Gateway ──→ Lambda Functions ──→ DynamoDB + S3
    │                  │              │                    │
    │                  │              ├─ Topic Management  │
    │                  │              ├─ Sheets Sync       │
    │                  │              └─ Trend Collection  │
    │                  │                     │             │
External APIs ─────────┼─────────────────────┘             │
(YouTube, Twitter,     │                                   │
News, Google Trends)   │                                   │
    │                  │                                   │
    └─ Rate Limited    └─ Auth/Rate    └─ Node.js 20.x     └─ Topics, Trends,
       API Calls          Limiting                            History & Raw Data
```

### Future System (Phase 2)

```
Topics ──→ AI Agents ──→ Content Pipeline ──→ YouTube
   │         │              │                   │
   │         ├─ Trend Analysis (Bedrock)        │
   │         ├─ Script Generation (Claude)      │
   │         ├─ Media Curation (APIs)           │
   │         ├─ Audio Production (Polly)        │
   │         └─ Video Assembly (Fargate)        │
   │                                            │
   └─ Priority Queue                            └─ Published Videos
```

### AWS Services

- **Lambda**: Serverless functions (Node.js 20.x) - 3 functions deployed
- **DynamoDB**: NoSQL database with GSI indexes - 3 tables (topics, sync history, trends)
- **S3**: Object storage with lifecycle policies - trend data and media assets
- **Secrets Manager**: Secure API credential storage for external services
- **API Gateway**: REST API with authentication and rate limiting
- **CloudWatch**: Logging and monitoring
- **Bedrock**: AI agents and LLM integration (planned)
- **Polly**: Text-to-speech (planned)
- **Fargate**: Video processing (planned)

## Configuration

### 🔧 Configuration Management

The system uses a comprehensive, hierarchical configuration system with **zero hardcoded values**:

#### Quick Configuration
```bash
# Switch AI models instantly
./scripts/manage-config.sh model claude-3.5-sonnet

# Set environment
./scripts/manage-config.sh env production

# Configure any setting
./scripts/manage-config.sh set ai.models.primary.temperature 0.8
./scripts/manage-config.sh set cost.optimization.budgetLimits.daily 100.00
```

#### Configuration Hierarchy (Priority Order)
1. **AWS Secrets Manager** (Highest Priority)
2. **Environment Variables**
3. **Local Configuration** (`config/local.json`)
4. **Environment-Specific** (`config/{environment}.json`)
5. **Default Configuration** (`config/default.json`)

#### Available Models
- **Claude 3.5 Sonnet**: Latest, best quality (`claude-3.5-sonnet`)
- **Claude 3 Sonnet**: Current production (`claude-3-sonnet`)
- **Claude 3 Haiku**: Cost-optimized (`claude-3-haiku`)
- **Claude Instant**: Fastest, cheapest (`claude-instant`)

#### Environment Variables
```bash
export BEDROCK_MODEL_ID="anthropic.claude-3-5-sonnet-20240620-v1:0"
export CONTENT_FREQUENCY="2"
export COST_BUDGET_DAILY="50.00"
export LOG_LEVEL="info"
```

See [`docs/configuration-guide.md`](docs/configuration-guide.md) for complete configuration reference.

### Topic Fields

| Field            | Required | Type    | Rules                                                     | Default              |
| ---------------- | -------- | ------- | --------------------------------------------------------- | -------------------- |
| `topic`          | ✅       | String  | 1-200 chars                                               | -                    |
| `dailyFrequency` | ❌       | Integer | 1-10 videos/day                                           | 1                    |
| `priority`       | ❌       | Integer | 1-10 (1=highest)                                          | 5                    |
| `status`         | ❌       | String  | active, paused, archived                                  | active               |
| `targetAudience` | ❌       | String  | Max 100 chars                                             | general              |
| `region`         | ❌       | String  | US, CA, UK, AU, EU                                        | US                   |
| `contentStyle`   | ❌       | String  | engaging_educational, entertainment, professional, casual | engaging_educational |

### Google Sheets Format

```
Topic (Required) | Daily Frequency | Priority | Status | Target Audience | Region | Content Style | Tags
Your topic here  | 2              | 1        | active | beginners       | US     | engaging_educational | tag1,tag2
```

### Sync Modes

- **incremental**: Only sync changes since last update
- **overwrite**: Replace all data with sheet contents
- **merge**: Smart field-by-field comparison and updates

## Testing

### Health Check

```bash
# Test topic creation
curl -X POST https://your-api-url/topics \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-key" \
  -d '{"topic": "Test Topic", "priority": 1}'

# Test Google Sheets sync
curl -X POST https://your-api-url/sync \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-key" \
  -d '{"action": "sync", "spreadsheetUrl": "YOUR_SHEET_URL", "syncMode": "incremental"}'
```

### Test Resources

- `src/lambda/*/test-events.json` - Lambda test events
- `test/infrastructure/` - Infrastructure validation tests
- `docs/google-sheets-template.md` - Setup guide with examples

## Monitoring & Security

### Security

- **Authentication**: API key required for all endpoints
- **Authorization**: IAM roles with least privilege access
- **Validation**: Comprehensive input sanitization and validation
- **Audit**: Complete operation logging and sync history tracking

### Monitoring

- **Logs**: CloudWatch detailed request/response logging
- **Metrics**: Lambda performance and success rates
- **Costs**: Per-operation cost tracking and optimization
- **Alerts**: Configurable thresholds for errors and performance

### Cost Optimization

- **Serverless**: Pay only for actual usage, scales to zero
- **Reserved Concurrency**: Prevents runaway costs
- **Memory Optimization**: Right-sized for performance vs cost
- **DynamoDB**: Pay-per-request billing with automatic scaling

## Roadmap

### Phase 1: Topic Management ✅ Complete

- [x] Topic CRUD operations with validation
- [x] Google Sheets integration (no API keys required)
- [x] REST API with authentication
- [x] Production-ready AWS infrastructure

### Phase 2: AI Video Generation ✅ Complete

- [x] **Task 3.1**: Multi-source trend data collection (Google, Twitter, YouTube, News)
- [x] **Task 3.2**: AI-powered topic generation using Amazon Bedrock with Claude 3.x models
- [ ] **Task 3.3**: Trend data processing and scoring algorithms

### Phase 3: Content Creation 📋 Planned

- [ ] **Task 4.1**: AI script generation with engagement optimization
- [ ] **Task 4.2**: Click-worthy title and thumbnail generation
- [ ] **Task 4.3**: Scene-by-scene breakdown with timing

### Phase 4: Media Production 📋 Planned

- [ ] **Task 5.1**: Multi-source media curation (Pexels, Pixabay, etc.)
- [ ] **Task 6.1**: Amazon Polly audio production with speech marks
- [ ] **Task 7.1**: FFmpeg video assembly on ECS Fargate

### Phase 5: Publishing & Analytics 📋 Planned

- [ ] **Task 8.1**: YouTube publishing with SEO optimization
- [ ] **Task 9.1**: Workflow orchestration with Step Functions
- [ ] **Task 10.1**: Production deployment and monitoring

## Contributing

### Development Setup

```bash
# Clone repository
git clone https://github.com/your-org/automated-youtube-video-pipeline.git
cd automated-youtube-video-pipeline

# Install dependencies
npm install
cd infrastructure && npm install && cd ..
cd src/lambda/topic-management && npm install && cd ../../..
cd src/lambda/google-sheets-sync && npm install && cd ../../..

# Run tests
npm test
```

### Project Structure

```
├── src/lambda/                 # Lambda function source code
│   ├── topic-management/       # Topic CRUD operations
│   ├── google-sheets-sync/     # Google Sheets integration
│   └── trend-data-collection/  # Multi-source trend data collection
├── infrastructure/             # AWS CDK infrastructure code
├── test/                      # Test suites
├── docs/                      # Documentation
└── .kiro/specs/               # Technical specifications
```

### Next Development Priorities

1. **Trend Data Collection** (Task 3.1) - Multi-source API integration
2. **AI Topic Generation** (Task 3.2) - Amazon Bedrock integration
3. **Content Pipeline** (Tasks 4.x) - Script and media generation

## Documentation

### 📚 Configuration & Setup

- [`docs/configuration-guide.md`](docs/configuration-guide.md) - **Comprehensive configuration management guide**
- [`docs/ai-model-configuration.md`](docs/ai-model-configuration.md) - **AI model switching and optimization**
- [`docs/ai-topic-generator.md`](docs/ai-topic-generator.md) - **AI-powered topic generation documentation**

### 📋 Integration Guides

- [`docs/google-sheets-template.md`](docs/google-sheets-template.md) - Google Sheets setup and format
- [`docs/trend-data-collection.md`](docs/trend-data-collection.md) - Multi-source trend data collection setup
- [`docs/implementation-updates.md`](docs/implementation-updates.md) - Technical implementation details
- [`.kiro/specs/`](.kiro/specs/) - Complete technical specifications and design documents

### Support

- **Issues**: Use GitHub Issues for bug reports and feature requests
- **Logs**: CloudWatch provides detailed error information and request tracking
- **API**: Use `/sync/history` and validation endpoints for troubleshooting
- **Community**: Discussions and questions welcome in GitHub Discussions

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**🚀 Ready to build the future of automated video content?** The foundation is production-ready - let's add AI-powered video generation!
