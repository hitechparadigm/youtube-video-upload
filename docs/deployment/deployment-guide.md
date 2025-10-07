# Deployment Guide: Missing Lambda Functions

This guide helps you deploy the missing Lambda functions for your automated video pipeline.

## Overview

You currently have these Lambda functions deployed:
- ✅ script-generator
- ✅ ai-topic-generator  
- ✅ audio-generator
- ✅ trend-data-collection
- ✅ video-assembler

**Missing functions to deploy:**
- ❌ media-curator
- ❌ topic-management

## Prerequisites

1. **AWS CLI configured** with appropriate permissions
2. **Node.js 20.x** installed locally
3. **IAM Role** `automated-video-pipeline-lambda-role` exists
4. **DynamoDB Tables** created:
   - `automated-video-pipeline-topics`
   - Other pipeline tables
5. **S3 Bucket** `automated-video-pipeline-{account}-{region}` exists
6. **Secrets Manager** secret `automated-video-pipeline/api-keys` configured

## Quick Deployment

### Option 1: PowerShell (Windows)
```powershell
# Navigate to project root
cd automated-video-pipeline

# Run deployment script
.\scripts\deploy-missing-lambdas.ps1 -Region us-east-1
```

### Option 2: Bash (Linux/Mac)
```bash
# Navigate to project root
cd automated-video-pipeline

# Make script executable
chmod +x scripts/deploy-missing-lambdas.sh

# Run deployment script
./scripts/deploy-missing-lambdas.sh
```

### Option 3: Manual Deployment

#### Deploy Media Curator
```bash
# Navigate to function directory
cd src/lambda/media-curator

# Install dependencies
npm install --production

# Create deployment package
zip -r media-curator-deployment.zip . -x "*.git*" "node_modules/.cache/*" "*.test.js"

# Deploy to AWS
aws lambda create-function \
    --function-name "media-curator" \
    --runtime "nodejs20.x" \
    --role "arn:aws:iam::YOUR_ACCOUNT:role/automated-video-pipeline-lambda-role" \
    --handler "index.handler" \
    --zip-file "fileb://media-curator-deployment.zip" \
    --description "AI-powered media curation service for video production" \
    --timeout 60 \
    --memory-size 512 \
    --environment Variables='{
        "AWS_REGION":"us-east-1",
        "API_KEYS_SECRET_NAME":"automated-video-pipeline/api-keys",
        "S3_BUCKET_NAME":"automated-video-pipeline-YOUR_ACCOUNT-us-east-1"
    }'
```

#### Deploy Topic Management
```bash
# Navigate to function directory
cd src/lambda/topic-management

# Install dependencies
npm install --production

# Create deployment package
zip -r topic-management-deployment.zip . -x "*.git*" "node_modules/.cache/*" "*.test.js"

# Deploy to AWS
aws lambda create-function \
    --function-name "topic-management" \
    --runtime "nodejs20.x" \
    --role "arn:aws:iam::YOUR_ACCOUNT:role/automated-video-pipeline-lambda-role" \
    --handler "index.handler" \
    --zip-file "fileb://topic-management-deployment.zip" \
    --description "Lambda function for managing video topics with CRUD operations" \
    --timeout 30 \
    --memory-size 256 \
    --environment Variables='{
        "AWS_REGION":"us-east-1",
        "TOPICS_TABLE_NAME":"automated-video-pipeline-topics",
        "S3_BUCKET_NAME":"automated-video-pipeline-YOUR_ACCOUNT-us-east-1"
    }'
```

## Testing Deployment

After deployment, test the functions:

```bash
# Test both functions
node test-deployed-lambdas.js
```

Expected output:
```
🚀 Testing Deployed Lambda Functions
====================================

🧪 Testing media-curator: Search for business meeting images
==================================================
✅ Test passed

🧪 Testing topic-management: Get all active topics
==================================================
✅ Test passed

📊 TEST RESULTS SUMMARY
=======================
✅ Passed: 4
❌ Failed: 0
📊 Total: 4
🎯 Success Rate: 100.0%

🎉 ALL TESTS PASSED!
```

## Function Details

### Media Curator
- **Purpose**: Search and curate media from Pexels, Pixabay, and other sources
- **Runtime**: Node.js 20.x
- **Memory**: 512 MB
- **Timeout**: 60 seconds
- **Key Features**:
  - Multi-source media search
  - Relevance scoring
  - Quality filtering
  - Attribution tracking

### Topic Management
- **Purpose**: CRUD operations for video topics
- **Runtime**: Node.js 20.x
- **Memory**: 256 MB
- **Timeout**: 30 seconds
- **Key Features**:
  - Topic validation
  - Keyword extraction
  - Priority scheduling
  - Status management

## Environment Variables

Both functions use these environment variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `AWS_REGION` | AWS region | `us-east-1` |
| `TOPICS_TABLE_NAME` | DynamoDB topics table | `automated-video-pipeline-topics` |
| `API_KEYS_SECRET_NAME` | Secrets Manager secret | `automated-video-pipeline/api-keys` |
| `S3_BUCKET_NAME` | S3 bucket for assets | `automated-video-pipeline-123456-us-east-1` |

## Required IAM Permissions

The Lambda execution role needs these permissions:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "dynamodb:GetItem",
                "dynamodb:PutItem",
                "dynamodb:UpdateItem",
                "dynamodb:DeleteItem",
                "dynamodb:Query",
                "dynamodb:Scan"
            ],
            "Resource": "arn:aws:dynamodb:*:*:table/automated-video-pipeline-*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "secretsmanager:GetSecretValue"
            ],
            "Resource": "arn:aws:secretsmanager:*:*:secret:automated-video-pipeline/*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "s3:GetObject",
                "s3:PutObject",
                "s3:DeleteObject"
            ],
            "Resource": "arn:aws:s3:::automated-video-pipeline-*/*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "logs:CreateLogGroup",
                "logs:CreateLogStream",
                "logs:PutLogEvents"
            ],
            "Resource": "arn:aws:logs:*:*:*"
        }
    ]
}
```

## Troubleshooting

### Common Issues

1. **Function not found error**
   - Ensure you're in the correct AWS region
   - Check function name spelling

2. **Permission denied**
   - Verify IAM role has required permissions
   - Check if role is attached to the function

3. **DynamoDB table not found**
   - Ensure table `automated-video-pipeline-topics` exists
   - Check table name in environment variables

4. **Secrets Manager access denied**
   - Verify secret `automated-video-pipeline/api-keys` exists
   - Check IAM permissions for Secrets Manager

5. **Package size too large**
   - Remove dev dependencies: `npm install --production`
   - Exclude unnecessary files from zip

### Verification Commands

```bash
# List all Lambda functions
aws lambda list-functions --query 'Functions[].FunctionName'

# Check function configuration
aws lambda get-function-configuration --function-name media-curator

# View function logs
aws logs describe-log-groups --log-group-name-prefix "/aws/lambda/media-curator"
```

## Next Steps

After successful deployment:

1. **Set up API Gateway** endpoints for HTTP access
2. **Configure cross-function communication** permissions
3. **Add YouTube integration** to complete the pipeline
4. **Create Step Functions workflow** for orchestration
5. **Set up EventBridge scheduling** for automation

## Support

If you encounter issues:
1. Check CloudWatch logs for detailed error messages
2. Verify all prerequisites are met
3. Test functions individually before integration
4. Review IAM permissions and resource access