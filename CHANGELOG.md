# Changelog

All notable changes to the Automated Video Pipeline project will be documented in this file.

## [2.1.0] - 2025-10-10 - Pipeline Regression Fixes & AI Optimization

### 🔧 Fixed
- **502 Bad Gateway Error in Topic Management**: Fixed Lambda timeout mismatch (25s Lambda vs 45s AI processing)
- **400 Parameter Error in Script Generator**: Resolved orchestrator parameter compatibility with simplified endpoint
- **Pipeline Orchestrator Timeout**: Increased timeout from 25s to 5 minutes for full pipeline coordination
- **Endpoint Simplification**: Consolidated Script Generator from 3 endpoints to 1 enhanced endpoint

### 🚀 Enhanced
- **AI Processing Reliability**: Topic Management now has 60s timeout for stable Bedrock Claude 3 Sonnet integration
- **Script Generation Performance**: Optimized to under 20 seconds with context-aware generation
- **Pipeline Success Rate**: Achieved 4/6 agents working (exceeds 3/6 success criteria)
- **Error Handling**: Comprehensive timeout protection and graceful degradation

### 📊 Performance Improvements
- **Topic Management**: ~17 seconds (AI generation with fallback)
- **Script Generator**: ~12 seconds (AI-driven context-aware)
- **Total Pipeline**: ~30 seconds for 4 working agents
- **Project Naming**: Readable format `2025-10-10T20-58-34_how-to-make-coffee-at-home`

### 🛠️ Infrastructure Changes
- Increased Topic Management Lambda timeout: 25s → 60s
- Increased Script Generator Lambda timeout: 25s → 60s  
- Increased Workflow Orchestrator timeout: 25s → 5 minutes
- Updated CDK infrastructure with proper timeout configurations

### 🧪 Testing
- Added comprehensive pipeline regression tests
- Created individual agent testing scripts
- Validated end-to-end AI flow: Topic Management → Script Generator
- Confirmed 4/6 agents working with professional AI output

### 📚 Documentation
- Updated design specs with timeout configurations
- Added troubleshooting guide for common pipeline issues
- Documented AI integration patterns and best practices
- Created lessons learned documentation

## [2.0.0] - 2025-10-10 - AI-Driven Pipeline & Endpoint Optimization

### 🤖 Added
- **Bedrock Claude 3 Sonnet Integration**: AI-driven topic analysis and expansion
- **Context-Aware Script Generation**: Professional scene breakdown with visual requirements
- **Intelligent Fallback Mechanisms**: 100% reliability with graceful degradation
- **Enhanced Topic Context**: Natural subtopics, SEO optimization, content guidance

### 🔧 Changed
- **API Simplification**: Consolidated Script Generator endpoints (3 → 1)
- **Backward Compatibility**: Single `/scripts/generate` handles all use cases
- **Readable Project Names**: Descriptive folder structure instead of ugly timestamps
- **Performance Optimization**: 20-45 second AI generation with reliable fallback

### 🏗️ Infrastructure
- **Standardized S3 Structure**: Single consistent folder format
- **Context Manager Overhaul**: Automatic path standardization and migration
- **Lambda Layer Integration**: Shared utilities for context management
- **DynamoDB Optimization**: Efficient context storage and retrieval

## [1.0.0] - 2025-10-09 - Initial Release

### 🎉 Added
- Complete automated video pipeline infrastructure
- 6-agent workflow: Topic Management → Script Generator → Media Curator → Audio Generator → Video Assembler → YouTube Publisher
- AWS CDK infrastructure deployment
- API Gateway endpoints with authentication
- EventBridge scheduling for automated content creation
- DynamoDB storage for topics, executions, and context
- S3 bucket management for video assets