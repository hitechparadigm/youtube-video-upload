# Configuration Guide

## 🔧 **System Configuration**

This guide covers the essential configuration steps for the Automated YouTube Video Pipeline.

## 📋 **Prerequisites**

- AWS Account with appropriate permissions
- Node.js 20.x installed
- AWS CDK installed globally: `npm install -g aws-cdk`

## 🔐 **AWS Secrets Manager Configuration**

All API credentials are stored securely in AWS Secrets Manager. The system is pre-configured with the following secrets:

### **Required Secrets**
```json
{
  "pexels-api-key": "your-pexels-api-key",
  "pixabay-api-key": "your-pixabay-api-key", 
  "youtube-oauth-client-id": "your-youtube-client-id",
  "youtube-oauth-client-secret": "your-youtube-client-secret",
  "youtube-oauth-refresh-token": "your-youtube-refresh-token"
}
```

### **Accessing Secrets**
```bash
# View configured secrets (without values)
aws secretsmanager list-secrets --region us-east-1

# Get specific secret value
aws secretsmanager get-secret-value --secret-id pexels-api-key --region us-east-1
```

## 🏗️ **Infrastructure Configuration**

### **Deploy Infrastructure**
```bash
cd infrastructure
npm install
npx cdk deploy --require-approval never
```

### **Environment Variables**
The system uses the following environment configuration:

```bash
# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCOUNT_ID=your-account-id

# Lambda Configuration
LAMBDA_RUNTIME=nodejs20.x
LAMBDA_MEMORY=512
LAMBDA_TIMEOUT=300

# Storage Configuration
S3_BUCKET_PREFIX=automated-video-pipeline
DYNAMODB_TABLE_PREFIX=automated-video-pipeline
```

## 📊 **Google Sheets Configuration**

### **Sheet Structure**
Your Google Sheets should have the following columns:

| Column | Header | Required | Description |
|--------|--------|----------|-------------|
| A | Topic | ✅ Yes | The main topic for video generation |
| B | Daily Frequency | ❌ No | Number of videos per day (1-10) |
| C | Priority | ❌ No | Priority level (1-10, 1=highest) |
| D | Status | ❌ No | active, paused, or archived |

### **Sheet Permissions**
1. Set sharing to "Anyone with the link can view"
2. Copy the sheet URL for configuration
3. The system will automatically convert to CSV export format

## 🧪 **Testing Configuration**

### **Test Environment Setup**
```bash
# Install test dependencies
npm install

# Run health check
npm run test:health

# Run full test suite
npm test
```

### **Test Configuration**
Tests are configured in `jest.config.js` with:
- Unit tests: `tests/unit/`
- Integration tests: `tests/integration/`
- Test utilities: `tests/utils/`
- Coverage threshold: 80% overall, 90% for shared utilities

## 📈 **Monitoring Configuration**

### **CloudWatch Logs**
All Lambda functions log to CloudWatch with structured logging:
- Log Group: `/aws/lambda/automated-video-pipeline-*`
- Retention: 14 days
- Log Level: INFO (configurable via environment variables)

### **Cost Tracking**
The system includes built-in cost tracking:
- Target: <$1.00 per video
- Current average: ~$0.80 per video
- Detailed cost breakdown available in CloudWatch metrics

## 🔄 **Scheduling Configuration**

### **EventBridge Rules**
The system supports automated scheduling:
- Regular schedule: Every 8 hours
- High priority: Every 4 hours (disabled by default)
- Manual triggers: Available via API Gateway

### **Enable Automatic Scheduling**
```bash
# Enable regular schedule
aws events enable-rule --name automated-video-pipeline-auto-schedule

# Enable high priority schedule (optional)
aws events enable-rule --name automated-video-pipeline-high-priority-schedule
```

## 🚨 **Troubleshooting**

### **Common Issues**

#### Lambda Function Errors
```bash
# Check CloudWatch logs
aws logs describe-log-groups --log-group-name-prefix "/aws/lambda/automated-video-pipeline"

# View recent logs
aws logs filter-log-events --log-group-name "/aws/lambda/automated-video-pipeline-topic-management"
```

#### API Gateway Issues
```bash
# Test API endpoints
curl -H "x-api-key: YOUR_API_KEY" https://your-api-gateway-url/topics
```

#### Secrets Manager Issues
```bash
# Verify secrets exist
aws secretsmanager describe-secret --secret-id pexels-api-key
```

## 📚 **Additional Resources**

- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)
- [AWS Lambda Best Practices](https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html)
- [AWS Secrets Manager User Guide](https://docs.aws.amazon.com/secretsmanager/)

## 🎯 **Next Steps**

1. **Verify Infrastructure**: Run `npm run test:health` to confirm all agents are operational
2. **Configure Google Sheets**: Set up your topic spreadsheet with proper permissions
3. **Test Pipeline**: Run `npm run test:e2e` to validate end-to-end functionality
4. **Enable Scheduling**: Configure EventBridge rules for automated video generation

For additional support, refer to the [KIRO_ENTRY_POINT.md](../KIRO_ENTRY_POINT.md) for current system status and troubleshooting guidance.