# Automated YouTube Video Pipeline

A comprehensive AWS-based system that automatically generates, produces, and publishes high-quality YouTube videos using AI agents, trend analysis, and automated content creation.

## 🎯 Overview

This system leverages AI agents and AWS services to create a complete video production pipeline:

- **AI-Driven Content Generation**: Uses Amazon Bedrock to create engaging scripts
- **Trend Analysis**: Analyzes current trends from multiple sources
- **Media Curation**: Automatically finds relevant images and videos
- **Professional Audio**: Generates natural-sounding narration with Amazon Polly
- **Video Assembly**: Creates polished videos using ECS Fargate and FFmpeg
- **YouTube Publishing**: Automatically uploads with SEO optimization

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Topic         │    │   AI Content     │    │   Media         │
│   Management    │───▶│   Generation     │───▶│   Curation      │
│                 │    │                  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Audio         │    │   Video          │    │   YouTube       │
│   Generation    │◀───│   Assembly       │───▶│   Publishing    │
│                 │    │   (ECS Fargate)  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites

1. **AWS CLI** configured with appropriate permissions
2. **Docker** installed and running
3. **Node.js 20.x** or later
4. **Git** for version control

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd automated-video-pipeline
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure AWS credentials**
   ```bash
   aws configure
   ```

4. **Deploy the infrastructure**
   ```bash
   node scripts/deploy-video-assembly.cjs
   ```

5. **Test the system**
   ```bash
   scripts/test-video-assembly.bat
   ```

## 📋 Components

### 1. Topic Management System
- **Location**: `src/lambda/topic-management/`
- **Purpose**: Manages video topics and scheduling
- **Features**: Google Sheets integration, priority scheduling, validation

### 2. AI Content Generation
- **Script Generator**: `src/lambda/script-generator/`
- **Metadata Generator**: `src/lambda/metadata-generator/`
- **Purpose**: Creates engaging video scripts and SEO-optimized metadata

### 3. Media Curation
- **Location**: `src/lambda/media-curator/`
- **Purpose**: Finds and curates relevant images/videos from Pexels and Pixabay
- **Features**: AI-powered relevance scoring, automatic downloads

### 4. Audio Production
- **Location**: `src/lambda/audio-generator/`
- **Purpose**: Converts scripts to natural-sounding audio
- **Features**: Amazon Polly integration, speech marks for synchronization

### 5. Video Assembly
- **Location**: `src/lambda/video-assembler/` + `docker/video-processor/`
- **Purpose**: Combines all components into professional videos
- **Features**: ECS Fargate with FFmpeg, subtitle generation, transitions

### 6. Infrastructure
- **Location**: `infrastructure/`
- **Purpose**: AWS CDK infrastructure as code
- **Features**: Complete AWS resource provisioning

## 🔧 Configuration

### Environment Variables

Key environment variables for the system:

```bash
# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCOUNT_ID=your-account-id

# ECS Configuration
ECS_CLUSTER_NAME=automated-video-pipeline-cluster
ECS_TASK_DEFINITION=video-processor-task

# Storage Configuration
S3_BUCKET_NAME=automated-video-pipeline-{account}-{region}
VIDEOS_TABLE_NAME=automated-video-pipeline-videos

# API Keys (stored in AWS Secrets Manager)
API_KEYS_SECRET_NAME=automated-video-pipeline/api-keys
```

### API Keys Setup

Store your API keys in AWS Secrets Manager:

```json
{
  "pexels": "your-pexels-api-key",
  "pixabay": "your-pixabay-api-key",
  "youtube": {
    "client_id": "your-youtube-client-id",
    "client_secret": "your-youtube-client-secret",
    "refresh_token": "your-refresh-token"
  }
}
```

## 📖 Usage

### 1. Define Topics

Create topics via API or Google Sheets:

```json
{
  "topic": "Investing for beginners in the USA",
  "dailyFrequency": 2,
  "priority": 1,
  "status": "active",
  "targetAudience": "beginners",
  "region": "US"
}
```

### 2. Generate Content

The system automatically:
1. Analyzes trends for your topics
2. Generates engaging scripts
3. Creates SEO-optimized metadata
4. Curates relevant media
5. Produces professional audio
6. Assembles final videos
7. Publishes to YouTube

### 3. Monitor Progress

Track video generation through:
- CloudWatch logs and metrics
- DynamoDB status tables
- API endpoints for real-time status

## 🧪 Testing

### Run All Tests
```bash
scripts/test-final-system.bat
```

### Individual Component Tests
```bash
# Test script generation
scripts/test-script-generator.bat

# Test media curation
scripts/test-media-curation.bat

# Test video assembly
scripts/test-video-assembly.bat
```

## 📊 Monitoring

### CloudWatch Dashboards
- Lambda function metrics
- ECS task performance
- S3 storage usage
- Cost tracking

### Logging
- **Lambda Logs**: `/aws/lambda/automated-video-pipeline-*`
- **ECS Logs**: `/aws/ecs/video-processor`
- **Application Logs**: Structured JSON logging

### Alerts
Set up CloudWatch alarms for:
- Failed video processing
- High processing costs
- API rate limits
- Storage quotas

## 💰 Cost Optimization

### Current Optimizations
- **Fargate Spot**: Up to 70% savings on video processing
- **S3 Lifecycle**: 7-day automatic cleanup
- **Reserved Concurrency**: Controlled Lambda scaling
- **Pay-per-Request**: DynamoDB on-demand pricing

### Estimated Costs
- **Per Video**: ~$0.50-$1.00 (depending on length and complexity)
- **Monthly**: ~$50-$200 (for 2-3 videos daily)
- **Storage**: Minimal due to automatic cleanup

## 🔒 Security

### IAM Roles
- Least privilege access for all components
- Separate roles for different services
- Cross-service permissions only where needed

### Data Protection
- S3 encryption at rest
- DynamoDB encryption enabled
- Secrets Manager for API keys
- VPC isolation for ECS tasks

### Network Security
- Private subnets for processing
- Security groups with minimal access
- NAT Gateway for outbound connections

## 🚀 Deployment

### Production Deployment
1. **Infrastructure**: Deploy using AWS CDK
2. **Lambda Functions**: Automated deployment with CI/CD
3. **Docker Images**: Pushed to ECR automatically
4. **Configuration**: Environment-specific settings

### Scaling
- **Horizontal**: Multiple ECS tasks for parallel processing
- **Vertical**: Adjustable CPU/memory for video processing
- **Auto-scaling**: Based on queue depth and processing time

## 🛠️ Development

### Project Structure
```
automated-video-pipeline/
├── src/lambda/              # Lambda function code
├── docker/                  # Container definitions
├── infrastructure/          # AWS CDK infrastructure
├── scripts/                 # Deployment and test scripts
├── docs/                    # Documentation
└── tests/                   # Test files and data
```

### Adding New Features
1. Create Lambda function in `src/lambda/`
2. Add infrastructure in `infrastructure/`
3. Create tests in `scripts/`
4. Update documentation

### Code Standards
- **Node.js 20.x**: Latest supported runtime
- **ES2022**: Modern JavaScript features
- **Error Handling**: Comprehensive try-catch blocks
- **Logging**: Structured JSON logging
- **Testing**: Unit and integration tests

## 📚 Documentation

- **[Video Assembly Setup](docs/video-assembly-setup.md)**: Detailed ECS Fargate setup
- **[Configuration Guide](docs/configuration-guide.md)**: Complete configuration reference
- **[AI Model Configuration](docs/ai-model-configuration.md)**: AI service setup

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Update documentation
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

### Common Issues
- **ECS Task Failures**: Check IAM roles and network configuration
- **Video Processing Errors**: Verify FFmpeg commands and media formats
- **API Rate Limits**: Implement exponential backoff and rotation

### Getting Help
1. Check the troubleshooting guides in `docs/`
2. Review CloudWatch logs for detailed error information
3. Verify all prerequisites are met
4. Test with minimal configuration first

## 🎉 Success Metrics

The system is designed to achieve:
- **80%+ Watch Time**: Engaging content that keeps viewers watching
- **5%+ Subscriber Conversion**: Content that drives channel growth
- **<$1.00 Per Video**: Cost-effective automated production
- **95%+ Uptime**: Reliable, production-ready system

---

**Ready to automate your YouTube content creation? Let's get started!** 🚀