# Automated Video Pipeline - Topic Management System

## 🎯 Project Status

### ✅ Completed Tasks (Ready for Production)

- **✅ Task 2.1**: Topic Management Lambda Function (Node.js 20.x)
- **✅ Task 2.2**: Google Sheets Integration Service
- **✅ Task 2.3**: REST API Gateway with Authentication (Partially Complete)

### 🚧 What's Been Delivered

**Complete Topic Management System** with:

- Full CRUD operations for video topics
- Google Sheets integration (simplified, no API keys needed!)
- REST API with authentication
- Production-ready AWS infrastructure
- Comprehensive monitoring and error handling

### 🎯 Next Up: Video Generation Pipeline

**Ready to implement:**

- **Task 3.1**: Trend Data Collection Lambda Function
- **Task 3.2**: AI-Powered Topic Generation Service
- **Task 3.3**: Trend Data Processing and Storage

## 🚀 What You Can Do Right Now

### 1. Manage Video Topics via API

Create, update, and organize your video topics with full validation and priority scheduling.

### 2. Sync Topics from Google Sheets

Simply share a Google Sheets document and sync topics automatically - no complex setup required!

### 3. Monitor Everything

Complete audit trails, sync history, and CloudWatch monitoring built-in.

## 🎉 Key Features Delivered

### 📊 Topic Management System

- **Smart CRUD Operations**: Create, read, update, delete topics with validation
- **Priority Scheduling**: 1-10 priority levels for video generation order
- **Keyword Extraction**: Automatic keyword generation from topic text
- **Multi-Region Support**: US, CA, UK, AU, EU targeting
- **Content Styles**: Educational, entertainment, professional, casual modes

### 📋 Google Sheets Integration (Revolutionary Simplification!)

- **🔥 No API Keys Required**: Just share your Google Sheets link - that's it!
- **Universal Access**: Works with any Google account, no setup needed
- **Smart Sync Modes**: Incremental, overwrite, and merge strategies
- **Conflict Resolution**: Handles concurrent updates intelligently
- **Complete Audit Trail**: Every sync operation logged and tracked
- **Pre-Sync Validation**: Checks sheet structure before processing

### 🔐 Production-Ready Infrastructure

- **API Gateway**: RESTful endpoints with API key authentication
- **DynamoDB**: Optimized schema with GSI indexes for fast queries
- **Lambda Functions**: Node.js 20.x runtime with cost optimization
- **CloudWatch**: Comprehensive logging and monitoring
- **IAM Security**: Least privilege access controls

## 🚀 Quick Start Guide

### Option 1: Google Sheets (Recommended - 2 minutes)

1. **Create a Google Sheets document** with this format:

   ```
   Topic                              | Daily Frequency | Priority | Status | Target Audience | Region | Content Style        | Tags
   Investing for beginners in the USA | 2              | 1        | active | beginners       | US     | engaging_educational | investing,finance
   Travel tips for Europe             | 1              | 3        | active | travelers       | EU     | entertainment        | travel,europe
   ```

2. **Share the sheet**: Click "Share" → "Anyone with the link" → "Viewer"

3. **Sync to the system**:
   ```bash
   curl -X POST https://your-api-url/sync \
     -H "x-api-key: your-key" \
     -d '{"action": "sync", "spreadsheetUrl": "YOUR_GOOGLE_SHEETS_URL", "syncMode": "incremental"}'
   ```

### Option 2: Direct API (For Developers)

```bash
# Create a topic
curl -X POST https://your-api-url/topics \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-key" \
  -d '{
    "topic": "Investing for beginners in the USA",
    "dailyFrequency": 2,
    "priority": 1,
    "status": "active",
    "targetAudience": "beginners",
    "region": "US",
    "contentStyle": "engaging_educational"
  }'
```

## 📡 API Reference

### Topic Management Endpoints

| Method | Endpoint       | Description                    | Status   |
| ------ | -------------- | ------------------------------ | -------- |
| GET    | `/topics`      | List all topics with filtering | ✅ Ready |
| POST   | `/topics`      | Create new topic               | ✅ Ready |
| GET    | `/topics/{id}` | Get specific topic             | ✅ Ready |
| PUT    | `/topics/{id}` | Update topic                   | ✅ Ready |
| DELETE | `/topics/{id}` | Delete topic                   | ✅ Ready |

### Google Sheets Integration

| Method | Endpoint         | Description              | Status   |
| ------ | ---------------- | ------------------------ | -------- |
| POST   | `/sync`          | Sync from Google Sheets  | ✅ Ready |
| POST   | `/sync/validate` | Validate sheet structure | ✅ Ready |
| GET    | `/sync/history`  | Get sync history         | ✅ Ready |

### Query Options

- **Filtering**: `?status=active&priority=1&limit=10`
- **Sync Modes**: `incremental`, `overwrite`, `merge`
- **Regions**: `US`, `CA`, `UK`, `AU`, `EU`

## 🏗️ System Architecture

### Current Infrastructure (Production Ready)

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  Google Sheets  │───▶│   API Gateway    │───▶│ Lambda Functions│
│  (Public URLs)  │    │ (Authentication) │    │  (Node.js 20.x) │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                         │
                       ┌──────────────────┐             │
                       │   CloudWatch     │◀────────────┘
                       │ (Logs & Metrics) │             │
                       └──────────────────┘             ▼
                                                ┌─────────────────┐
                                                │   DynamoDB      │
                                                │ (Topics & Sync) │
                                                └─────────────────┘
```

### AWS Services Deployed

- **✅ Lambda Functions**: 2 functions (topic management + Google Sheets sync)
- **✅ DynamoDB Tables**: 2 tables (topics + sync history) with GSI indexes
- **✅ API Gateway**: REST API with authentication and rate limiting
- **✅ CloudWatch**: Complete logging and monitoring setup
- **✅ IAM Roles**: Least privilege security policies

## 🚀 Deployment Guide

### Prerequisites

- Node.js 20.x or later
- AWS CLI configured with deployment permissions
- AWS CDK v2 installed globally (`npm install -g aws-cdk`)

### One-Command Deploy

```bash
# Deploy everything
chmod +x deploy.sh && ./deploy.sh
```

### Manual Deployment Steps

```bash
# 1. Install dependencies
cd src/lambda/topic-management && npm install && cd ../../../
cd src/lambda/google-sheets-sync && npm install && cd ../../../
cd infrastructure && npm install

# 2. Bootstrap CDK (first time only)
npx cdk bootstrap

# 3. Deploy infrastructure
npx cdk deploy TopicManagementStack --require-approval never
```

### Post-Deployment

1. **Get API Gateway URL** from CDK output
2. **Get API Key** from AWS Console → API Gateway → API Keys
3. **Test the system** with provided examples

## 🧪 Testing & Validation

### Quick Health Check

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

### Test Files Included

- `src/lambda/topic-management/test-events.json` - Lambda test events
- `src/lambda/google-sheets-sync/test-events.json` - Sync test scenarios
- `docs/google-sheets-template.md` - Complete setup guide

## 📋 Data Validation & Rules

### Topic Fields

| Field            | Required | Type    | Rules                                                     | Default              |
| ---------------- | -------- | ------- | --------------------------------------------------------- | -------------------- |
| `topic`          | ✅ Yes   | String  | 1-200 chars, non-empty                                    | -                    |
| `dailyFrequency` | ❌ No    | Integer | 1-10 videos per day                                       | 1                    |
| `priority`       | ❌ No    | Integer | 1-10 (1=highest)                                          | 5                    |
| `status`         | ❌ No    | String  | active, paused, archived                                  | active               |
| `targetAudience` | ❌ No    | String  | Max 100 chars                                             | general              |
| `region`         | ❌ No    | String  | US, CA, UK, AU, EU                                        | US                   |
| `contentStyle`   | ❌ No    | String  | engaging_educational, entertainment, professional, casual | engaging_educational |

### Google Sheets Format

```
Topic (Required) | Daily Frequency | Priority | Status | Target Audience | Region | Content Style | Tags
Your topic here  | 2              | 1        | active | beginners       | US     | engaging_educational | tag1,tag2
```

## 🔒 Security & Monitoring

### Security Features

- **🔐 API Key Authentication**: All endpoints protected
- **🛡️ IAM Least Privilege**: Minimal required permissions
- **🔍 Input Validation**: Comprehensive data sanitization
- **🚫 Error Sanitization**: No sensitive data in responses

### Monitoring & Observability

- **📊 CloudWatch Logs**: Detailed request/response logging
- **📈 Performance Metrics**: Lambda execution times and success rates
- **💰 Cost Tracking**: Per-operation cost monitoring ready
- **🔍 Audit Trail**: Complete sync history in DynamoDB

### Cost Optimization

- **⚡ Reserved Concurrency**: Limited to prevent runaway costs
- **💾 Memory Optimization**: Right-sized for performance vs cost
- **💸 Pay-per-Request**: DynamoDB scales to zero when not used
- **🎯 Rate Limiting**: API Gateway usage plans prevent abuse

## 🎯 What's Next: Video Generation Pipeline

### 🚧 Ready to Build (Next Sprint)

**Task 3.1: Trend Data Collection Lambda Function**

- Google Trends API integration
- Twitter API v2 integration
- YouTube Data API integration
- News API integration for current events
- Rate limiting and error handling

**Task 3.2: AI-Powered Topic Generation Service**

- Amazon Bedrock integration for trend analysis
- Topic scoring based on engagement potential
- Keyword extraction and SEO optimization
- Content strategy recommendations

**Task 3.3: Trend Data Processing and Storage**

- Data normalization for different API formats
- Trend scoring algorithms
- Data partitioning by date and source
- Trend aggregation and reporting

### 🔮 Future Pipeline Components

**Content Generation (Tasks 4.x)**

- AI script generation with engagement optimization
- Click-worthy title and thumbnail generation
- Scene-by-scene breakdown with timing

**Media & Production (Tasks 5.x-7.x)**

- Multi-source media curation (Pexels, Pixabay, etc.)
- Amazon Polly audio production
- FFmpeg video assembly on ECS Fargate

**Publishing & Analytics (Tasks 8.x-10.x)**

- YouTube publishing with SEO optimization
- Performance tracking and analytics
- Cost monitoring and optimization

## 📚 Documentation & Support

### Available Guides

- **📖 `docs/google-sheets-template.md`** - Complete Google Sheets setup guide
- **🔧 `docs/implementation-updates.md`** - Technical implementation details
- **📋 `.kiro/specs/`** - Complete technical specifications
- **🧪 Test Events** - Ready-to-use test scenarios in each Lambda folder

### Getting Help

- **CloudWatch Logs**: Detailed error information and request tracking
- **Sync History API**: Complete audit trail of all operations
- **Validation Endpoints**: Pre-flight checks for data integrity
- **Comprehensive Error Messages**: Specific guidance for fixing issues

### Current System Status

✅ **Production Ready**: Topic management and Google Sheets sync  
🚧 **In Development**: Video generation pipeline  
📋 **Planned**: Full end-to-end automation

---

**Ready to continue building?** The foundation is solid - let's add the video generation capabilities! 🚀
