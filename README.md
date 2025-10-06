# Automated Video Pipeline

An AWS-based serverless system that automatically generates, produces, and publishes highly engaging YouTube videos designed to grow your subscriber base using AI agents, trend analysis, and engagement psychology.

## 🎯 What This System Does

The Automated Video Pipeline creates subscriber-worthy videos by:

1. **Simple Topic Input** - You specify basic topics like "Investing for beginners" in Google Sheets
2. **AI Trend Analysis** - Monitors current trends from Google, Twitter, YouTube, and news to find engaging angles
3. **Engaging Content Creation** - Uses Amazon Bedrock AI to create click-worthy titles, hooks, and subscriber-focused scripts
4. **Professional Production** - Combines trending media with dynamic audio using FFmpeg on AWS Fargate
5. **Growth-Optimized Publishing** - Uploads to YouTube with engagement-focused titles, thumbnails, and descriptions
6. **Fully Automated** - Generates multiple videos per day based on your frequency settings

## 🏗️ Architecture Overview

### Core AWS Services Used

- **Amazon Bedrock Agents** - AI orchestration and content generation
- **AWS Lambda** - Serverless functions for API integrations and processing
- **Amazon S3** - Storage for media assets, videos, and data archives
- **Amazon DynamoDB** - Database for topics, trends, and video metadata
- **AWS Fargate** - Containerized video processing with FFmpeg
- **Amazon Polly** - Text-to-speech for high-quality audio generation
- **Amazon EventBridge** - Scheduling and workflow automation
- **AWS Secrets Manager** - Secure storage of API credentials
- **Amazon CloudWatch** - Monitoring, logging, and alerting

### Data Flow

```
User Topics → Trend Analysis → Content Generation → Media Acquisition → 
Audio Production → Video Assembly → YouTube Publishing
```

## 📁 Project Structure

```
automated-video-pipeline/
├── bin/                          # CDK entry point
│   └── automated-video-pipeline.ts
├── lib/                          # Infrastructure as Code
│   └── automated-video-pipeline-stack.ts
├── src/                          # Lambda function source code
│   ├── topic-management/         # Topic CRUD operations
│   ├── trend-analysis/          # External API integrations
│   ├── content-generation/      # AI script and SEO generation
│   ├── media-acquisition/       # Stock media downloading
│   ├── audio-production/        # Polly integration
│   ├── video-processing/        # FFmpeg orchestration
│   ├── youtube-publishing/      # YouTube API integration
│   └── shared/                  # Common utilities and types
├── test/                        # Unit and integration tests
├── docker/                      # Container images for video processing
├── .kiro/specs/                # Feature specifications and requirements
└── README.md                   # This file
```

## 🚀 Getting Started

### Prerequisites

1. **AWS Account** with appropriate permissions
2. **AWS CLI** configured with credentials
3. **Node.js** (version 18 or later)
4. **Docker** for building video processing containers
5. **API Keys** for external services:
   - Google Trends API
   - Twitter API v2
   - YouTube Data API v3
   - Pexels API
   - Pixabay API

### Installation

1. **Clone and Install Dependencies**
   ```bash
   npm install
   ```

2. **Deploy Infrastructure**
   ```bash
   # Bootstrap CDK (first time only)
   npx cdk bootstrap

   # Deploy the stack
   npm run deploy
   ```

3. **Configure API Credentials**
   After deployment, add your API keys to AWS Secrets Manager:
   ```bash
   aws secretsmanager update-secret \
     --secret-id automated-video-pipeline/api-credentials \
     --secret-string '{
       "googleTrendsApiKey": "your-key-here",
       "twitterBearerToken": "your-token-here",
       "youtubeClientId": "your-client-id",
       "youtubeClientSecret": "your-client-secret",
       "youtubeRefreshToken": "your-refresh-token",
       "pexelsApiKey": "your-pexels-key",
       "pixabayApiKey": "your-pixabay-key",
       "newsApiKey": "your-news-api-key"
     }'
   ```

4. **Set Up YouTube OAuth**
   - Create a project in Google Cloud Console
   - Enable YouTube Data API v3
   - Create OAuth 2.0 credentials
   - Generate refresh token for automated access

### Development Commands

```bash
# Compile TypeScript
npm run build

# Watch for changes during development
npm run watch

# Run tests
npm test

# Deploy infrastructure changes
npm run deploy

# Remove all AWS resources
npm run destroy
```

## 🎬 How to Use

### 1. Define Video Topics (Super Simple!)

Add topics to your Google Sheets (https://docs.google.com/spreadsheets/d/1WnUJredElhFEgXAhnnNtcbjmJ1l9t3i1YNnYblVOaao):

| Topic | Daily Frequency | Status | Notes |
|-------|----------------|--------|-------|
| Investing for beginners in the USA | 2 | active | Simple steps to start |
| Travel to Mexico | 1 | active | Budget-friendly options |

**That's it!** The AI handles everything else - trend analysis, engaging titles, keywords, and content creation.

### 2. Monitor Pipeline Execution

- **CloudWatch Dashboard** - View system metrics and performance
- **DynamoDB Tables** - Track video production status
- **S3 Bucket** - Access generated content and assets
- **SNS Notifications** - Receive alerts for successes and failures

### 3. Customize Content Generation

Modify AI prompts and video parameters in the Lambda functions:
- Video duration (5-10 minutes)
- Voice selection for audio
- Video resolution and quality
- SEO optimization strategies

## 🔧 Configuration Options

### Scheduling
- Modify EventBridge rules to change video creation frequency
- Adjust timing to match your audience's peak engagement hours

### Content Quality
- Update Bedrock model parameters for script generation
- Configure Polly voice settings for audio quality
- Adjust FFmpeg parameters for video rendering

### Cost Optimization
- Configure S3 lifecycle policies for data archival
- Set Lambda reserved concurrency limits
- Use Fargate Spot instances for non-critical processing

## 📊 Monitoring and Troubleshooting

### Key Metrics to Monitor
- Video creation success rate
- Processing time per video
- API call success rates
- YouTube upload success rate
- Cost per video generated

### Common Issues
1. **API Rate Limits** - Implement exponential backoff and caching
2. **Video Processing Failures** - Check FFmpeg logs and media asset quality
3. **YouTube Upload Errors** - Verify OAuth tokens and API quotas
4. **High Costs** - Review S3 storage usage and Lambda execution times

### Logs and Debugging
- CloudWatch Logs for all Lambda functions
- ECS task logs for video processing
- X-Ray tracing for performance analysis
- SNS notifications for critical errors

## 💰 Cost Tracking and Optimization

### Real-Time Cost Monitoring

The system tracks the exact cost of generating each video, providing detailed breakdowns by AWS service:

- **Per-Video Cost Analysis** - Know exactly what each video costs to produce
- **Service-Level Breakdown** - See costs for Lambda, Fargate, S3, Bedrock, Polly, etc.
- **Daily/Monthly Summaries** - Track spending trends and projections
- **Cost Optimization Suggestions** - Automated recommendations to reduce costs
- **Budget Alerts** - Get notified when costs exceed thresholds

### Cost Tracking Features

```typescript
// Example cost breakdown for a single video
{
  "videoId": "video-123",
  "totalCost": 0.45,
  "costBreakdown": {
    "lambda": 0.02,
    "fargate": 0.15,
    "s3": 0.08,
    "bedrock": 0.12,
    "polly": 0.05,
    "externalApis": 0.03
  },
  "resourceUsage": {
    "lambdaDurationMs": 45000,
    "fargateTaskDurationMs": 180000,
    "bedrockTokensUsed": 8500,
    "pollyCharactersProcessed": 3200
  }
}
```

### Cost Optimization Strategies

1. **Fargate Spot Instances** - Up to 70% savings on video processing
2. **Aggressive S3 Lifecycle Policies** - Move to cheaper storage classes faster
3. **Bedrock Prompt Optimization** - Reduce token usage with efficient prompts
4. **Lambda Memory Optimization** - Right-size function memory allocation
5. **External API Caching** - Reduce redundant API calls

### Estimated Monthly Costs (90 videos/month)

**Optimized Configuration:**
- **Lambda Functions**: ~$8-15
- **Fargate (with Spot)**: ~$12-25 (70% savings)
- **S3 Storage**: ~$10-20 (with lifecycle policies)
- **DynamoDB**: ~$5-10 (on-demand pricing)
- **Bedrock**: ~$25-50 (optimized prompts)
- **Polly**: ~$5-10 (neural voices)
- **Other Services**: ~$8-15

**Total Optimized**: ~$73-145/month for 90 professional videos
**Cost Per Video**: ~$0.80-1.60 each

### Cost Monitoring API Endpoints

- `GET /cost/daily?date=2025-01-15` - Daily cost summary
- `GET /cost/trends?startDate=2025-01-01&endDate=2025-01-31` - Cost trends
- `GET /cost/video?videoId=video-123` - Individual video cost breakdown
- `GET /cost/optimization?startDate=2025-01-01&endDate=2025-01-31` - Optimization suggestions
- `GET /cost/projection?month=2025-01` - Monthly cost projection

## 🔒 Security Considerations

- All API credentials stored in AWS Secrets Manager
- S3 buckets configured with encryption and access controls
- IAM roles follow least privilege principle
- VPC isolation for video processing tasks
- CloudTrail logging for audit compliance

## 🤝 Contributing

1. Follow the existing code structure and naming conventions
2. Add comprehensive tests for new features
3. Update documentation for any configuration changes
4. Use TypeScript for type safety
5. Follow AWS best practices for security and cost optimization

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For issues and questions:
1. Check CloudWatch logs for error details
2. Review the troubleshooting section above
3. Verify API credentials and quotas
4. Monitor AWS service health status

---

**Note**: This system is designed for educational and development purposes. For production use, implement additional security measures, monitoring, and compliance controls as required by your organization.