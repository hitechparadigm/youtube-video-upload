# 🎬 Automated Video Pipeline

**Version**: 5.1.1
**Status**: ✅ Production Ready
**Architecture**: AI-Powered Content Creation with Multi-Scene Rate Limiting

An intelligent video creation pipeline that automatically generates professional YouTube videos from topics using AI-powered script generation, real media curation from multiple APIs, and automated publishing.

---

## ✨ Key Features

- **🧠 AI-Powered Script Generation**: Intelligent content creation with contextual scene planning
- **🗺️ Google Places Priority**: Heavily prioritized authentic location photos for travel content
- **🎬 Real Media Integration**: Downloads authentic content from Google Places, Pexels, and Pixabay
- **🔍 Multi-Scene Rate Limiting**: Enhanced delays and retry logic eliminate Scene 3+ placeholder fallback
- **🔄 Duplicate Prevention**: Advanced content hashing ensures unique media across scenes
- **🎵 AI Voice Narration**: Professional audio generation with AWS Polly
- **📺 YouTube Publishing**: Automated upload with metadata optimization
- **🚀 CI/CD Pipeline**: Automated deployment with comprehensive testing

---

## 🚀 Quick Start

### Prerequisites
- AWS Account with appropriate permissions
- GitHub repository with Actions enabled
- API keys for Pexels, Pixabay, and Google Places

### 1. Setup CI/CD Pipeline (Recommended)
```bash
# Clone and setup
git clone <repository-url>
cd automated-video-pipeline

# Configure GitHub Secrets (required for CI/CD)
# Go to GitHub → Settings → Secrets and variables → Actions
# Add: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
```

### 2. Configure API Keys (CRITICAL)
```bash
# Add external API keys to AWS Secrets Manager
aws secretsmanager create-secret \
  --name "automated-video-pipeline/api-keys" \
  --secret-string '{
    "pexels-api-key": "your-pexels-key",
    "pixabay-api-key": "your-pixabay-key",
    "google-places-api-key": "your-google-places-key"
  }'
```

### 3. Deploy via CI/CD (Recommended)
```bash
# Deploy to development
git checkout develop
git push origin develop

# Deploy to production
git checkout main
git push origin main

# Or use manual deployment via GitHub Actions UI
```

### 4. Alternative: Local Deployment
```bash
# Install SAM CLI and deploy locally
sam deploy --config-env dev
```

### 5. Test the Pipeline
```bash
# Test the deployed pipeline
node test-complete-pipeline.js
```

## 🚨 Critical Requirements

**CI/CD Pipeline**: The enhanced CI/CD pipeline automatically handles:
- ✅ **FFmpeg Layer**: Production Linux binaries for real MP4 creation
- ✅ **Secrets Manager**: Proper IAM permissions for API key access
- ✅ **Scene 3 Fix**: Rate limiting solution for consistent media generation
- ✅ **Multi-Environment**: Safe dev → staging → production deployment

**Manual Setup Requirements** (if not using CI/CD):
- Secrets Manager permission for Media Curator Lambda
- FFmpeg layer deployment for real video creation
- API keys properly configured in AWS Secrets Manager

See [CI/CD Deployment Guide](CICD_DEPLOYMENT_GUIDE.md) and [Troubleshooting Guide](TROUBLESHOOTING_MEDIA_DOWNLOAD.md) for complete setup.

---

## 🏗️ Architecture

The pipeline consists of 7 Lambda functions orchestrated through API Gateway:

1. **Topic Management** - Processes video topics and generates context
2. **Script Generator** - Creates AI-powered video scripts with scene planning
3. **Media Curator** - Downloads real media from external APIs with duplicate prevention
4. **Audio Generator** - Creates professional narration using AWS Polly
5. **Manifest Builder** - Validates content and creates video assembly instructions
6. **Video Assembler** - Combines media and audio into final MP4 using FFmpeg
7. **YouTube Publisher** - Uploads videos to YouTube with optimized metadata

### Data Flow
```
Topic → Script → Media → Audio → Manifest → Video → YouTube
```

Each component stores context in S3 and DynamoDB for the next stage to consume.

---

## 📚 Documentation

### Essential Reading
- **[KIRO_ENTRY_POINT.md](KIRO_ENTRY_POINT.md)** - Current project status and overview
- **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)** - Complete deployment instructions
- **[COMPLETE_ARCHITECTURE_GUIDE.md](COMPLETE_ARCHITECTURE_GUIDE.md)** - Detailed technical architecture

### Troubleshooting
- **[TROUBLESHOOTING_MEDIA_DOWNLOAD.md](TROUBLESHOOTING_MEDIA_DOWNLOAD.md)** - Fix placeholder image issues
- **[SYNTAX_ERROR_PREVENTION.md](SYNTAX_ERROR_PREVENTION.md)** - Prevent CI/CD syntax errors

### Reference
- **[DOCUMENTATION_INDEX.md](DOCUMENTATION_INDEX.md)** - Complete documentation catalog
- **[CHANGELOG.md](CHANGELOG.md)** - Version history and updates
- **[Specifications](.kiro/specs/real-media-generation/)** - Technical requirements and design

---

## 🔧 Development

### CI/CD Pipeline (Enhanced)
The project includes a comprehensive CI/CD pipeline with:
- **Production FFmpeg Layer**: Real MP4 video creation
- **Multi-Environment Support**: Dev, Staging, Production
- **Smart Deployment**: Conditional deployment based on changes
- **Comprehensive Testing**: Multi-stage validation
- **Scene 3 Fix**: Automated rate limiting solution

### Local Testing
```bash
# Test complete pipeline
node test-complete-pipeline.js

# Test Scene 3 fix
node test-hotfix-validation.js

# Test Video Assembler
node test-video-assembler-direct.js

# Deploy via CI/CD helper
node deploy-via-cicd.js
```

### Deployment Methods
1. **CI/CD Pipeline** (Recommended): Push to deploy automatically
2. **Manual GitHub Actions**: Use workflow dispatch
3. **Local SAM**: `sam deploy --config-env dev`

See [CI/CD Deployment Guide](CICD_DEPLOYMENT_GUIDE.md) for detailed instructions.

---

## 🤝 Contributing

1. Follow the syntax error prevention guidelines
2. Ensure all Lambda functions have proper IAM permissions
3. Test with real API keys before submitting
4. Update documentation for any architectural changes

---

## 📄 License

MIT License - See LICENSE file for details.

---

## 🆘 Support

For issues related to:
- **Placeholder images**: See [TROUBLESHOOTING_MEDIA_DOWNLOAD.md](TROUBLESHOOTING_MEDIA_DOWNLOAD.md)
- **Syntax errors**: See [SYNTAX_ERROR_PREVENTION.md](SYNTAX_ERROR_PREVENTION.md)
- **Deployment**: See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)
- **Architecture**: See [COMPLETE_ARCHITECTURE_GUIDE.md](COMPLETE_ARCHITECTURE_GUIDE.md)
