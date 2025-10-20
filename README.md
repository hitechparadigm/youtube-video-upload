# 🎬 Automated Video Pipeline

**Version**: 5.1.0
**Status**: ✅ Production Ready
**Architecture**: AI-Powered Content Creation with Multi-Scene Rate Limiting

An intelligent video creation pipeline that automatically generates professional YouTube videos from topics using AI-powered script generation, real media curation from multiple APIs, and automated publishing.

---

## ✨ Key Features

- **🧠 AI-Powered Script Generation**: Intelligent content creation with contextual scene planning
- **🎬 Real Media Integration**: Downloads authentic content from Google Places, Pexels, and Pixabay
- **🔍 Multi-Scene Rate Limiting**: Intelligent delays and API rotation prevent Scene 3+ placeholder fallback
- **🔄 Duplicate Prevention**: Advanced content hashing ensures unique media across scenes
- **🎵 AI Voice Narration**: Professional audio generation with AWS Polly
- **📺 YouTube Publishing**: Automated upload with metadata optimization
- **🚀 CI/CD Pipeline**: Automated deployment with comprehensive testing

---

## 🚀 Quick Start

### Prerequisites
- AWS Account with appropriate permissions
- API keys for Pexels, Pixabay, and Google Places
- Node.js 18+ and AWS CLI

### 1. Deploy Infrastructure
```bash
# Clone and deploy
git clone <repository-url>
cd automated-video-pipeline
sam build --template-file template-simplified.yaml
sam deploy --guided
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

### 3. Test the Pipeline
```bash
# Run a test video creation
node run-france-pipeline.js
```

## 🚨 Critical Requirements

**Secrets Manager Permission**: The Media Curator Lambda function MUST have `secretsmanager:GetSecretValue` permission to access API keys. Without this:
- ❌ Only 47-byte placeholder files are created
- ❌ No real YouTube videos are generated
- ✅ With permission: MB-sized real media files and actual video creation

See [Troubleshooting Guide](TROUBLESHOOTING_MEDIA_DOWNLOAD.md) for complete setup validation.

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

### Local Testing
```bash
# Validate syntax
npm run test:syntax

# Run linting
npm run lint

# Test individual components
node debug-media-curator.js
node debug-video-size.js
```

### CI/CD Pipeline
The project includes GitHub Actions workflows for:
- Automated testing and validation
- Multi-environment deployment (dev/staging/prod)
- Syntax error prevention
- Resource cleanup

See [GitHub Actions Setup](GITHUB_ACTIONS_SETUP.md) for configuration details.

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
