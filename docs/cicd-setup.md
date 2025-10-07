# CI/CD Setup Guide

## 🚀 **GitHub Actions CI/CD Pipeline**

This guide sets up a secure, automated deployment pipeline using GitHub Actions with proper environment separation and security best practices.

## 📋 **Prerequisites**

### 1. AWS Account Setup
- **Staging Account**: For development and testing
- **Production Account**: For live deployments (recommended separate account)
- **IAM Users**: With programmatic access for GitHub Actions

### 2. GitHub Repository Setup
- Repository with the video pipeline code
- Admin access to configure secrets and environments

## 🔧 **Step 1: Configure GitHub Environments**

### Create Environments
1. Go to your GitHub repository
2. Navigate to **Settings** → **Environments**
3. Create three environments:
   - `staging`
   - `production` 
   - `cleanup`

### Configure Environment Protection Rules

#### Staging Environment
```yaml
# Settings → Environments → staging
- Required reviewers: (optional for staging)
- Wait timer: 0 minutes
- Deployment branches: develop, main
```

#### Production Environment
```yaml
# Settings → Environments → production
- Required reviewers: 1-2 team members
- Wait timer: 5 minutes
- Deployment branches: main only
```

## 🔐 **Step 2: Configure GitHub Secrets**

### Repository Secrets (Settings → Secrets and variables → Actions)

#### AWS Credentials for Staging
```
AWS_ACCESS_KEY_ID = AKIA...
AWS_SECRET_ACCESS_KEY = your-staging-secret-key
AWS_ACCOUNT_ID = 123456789012
```

#### AWS Credentials for Production
```
AWS_ACCESS_KEY_ID_PROD = AKIA...
AWS_SECRET_ACCESS_KEY_PROD = your-production-secret-key
AWS_ACCOUNT_ID_PROD = 987654321098
```

### Creating AWS IAM Users

#### Staging IAM User Policy
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "cloudformation:*",
        "lambda:*",
        "s3:*",
        "dynamodb:*",
        "apigateway:*",
        "iam:*",
        "states:*",
        "events:*",
        "logs:*",
        "secretsmanager:*"
      ],
      "Resource": "*",
      "Condition": {
        "StringEquals": {
          "aws:RequestedRegion": "us-east-1"
        }
      }
    }
  ]
}
```

#### Production IAM User Policy (More Restrictive)
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "cloudformation:CreateStack",
        "cloudformation:UpdateStack",
        "cloudformation:DescribeStacks",
        "cloudformation:DescribeStackEvents",
        "cloudformation:GetTemplate",
        "lambda:CreateFunction",
        "lambda:UpdateFunctionCode",
        "lambda:UpdateFunctionConfiguration",
        "s3:CreateBucket",
        "s3:PutObject",
        "s3:GetObject",
        "dynamodb:CreateTable",
        "dynamodb:UpdateTable",
        "apigateway:*",
        "iam:PassRole",
        "states:CreateStateMachine",
        "states:UpdateStateMachine"
      ],
      "Resource": "*",
      "Condition": {
        "StringEquals": {
          "aws:RequestedRegion": "us-east-1"
        }
      }
    }
  ]
}
```

## 🏗️ **Step 3: Workflow Configuration**

The GitHub Actions workflow (`.github/workflows/deploy.yml`) handles:

### Automated Triggers
- **Push to `develop`** → Deploy to staging
- **Push to `main`** → Deploy to production (with approval)
- **Pull requests** → Run tests only
- **Manual dispatch** → Deploy to chosen environment

### Security Features
- ✅ Environment-specific AWS credentials
- ✅ Required approvals for production
- ✅ No sensitive data in logs
- ✅ Separate staging/production stacks
- ✅ Automated testing before deployment

## 🧪 **Step 4: Testing Strategy**

### Automated Tests
```yaml
# Tests run on every push/PR
- Unit tests for all Lambda functions
- Integration tests for API endpoints
- Security audits (npm audit)
- Code linting and formatting
```

### Manual Testing
```yaml
# After staging deployment
- Test API endpoints manually
- Verify Lambda functions work
- Check CloudWatch logs
- Validate cost tracking
```

## 📦 **Step 5: Deployment Process**

### Staging Deployment
1. **Trigger**: Push to `develop` branch
2. **Process**:
   - Run all tests
   - Deploy to staging environment
   - Run integration tests
   - Store deployment outputs securely

### Production Deployment
1. **Trigger**: Push to `main` branch
2. **Process**:
   - Run all tests
   - Wait for manual approval (5 minutes + reviewers)
   - Deploy to production environment
   - Run health checks
   - Store deployment outputs securely

### Manual Deployment
```bash
# Trigger manual deployment via GitHub UI
# Go to Actions → Deploy Automated Video Pipeline → Run workflow
# Choose environment: staging or production
```

## 🔒 **Step 6: Security Best Practices**

### API Key Management
```bash
# ❌ NEVER do this in CI/CD logs:
echo "API Key: $API_KEY"

# ✅ DO this instead:
echo "API Key configured successfully"
echo "Use AWS CLI to retrieve: aws apigateway get-api-key --api-key $API_KEY_ID --include-value"
```

### Secrets Management
```yaml
# Store in AWS Secrets Manager, not environment variables
- YouTube API credentials
- Media API keys (Pexels, Pixabay)
- Database connection strings
- Third-party service tokens
```

### Access Control
```yaml
# GitHub repository settings
- Require branch protection on main
- Require status checks before merging
- Require up-to-date branches
- Restrict pushes to main branch
```

## 📊 **Step 7: Monitoring & Alerting**

### CloudWatch Integration
```yaml
# Automated monitoring setup
- Lambda function errors
- API Gateway 4xx/5xx errors
- DynamoDB throttling
- S3 access patterns
- Cost anomalies
```

### Slack/Email Notifications
```yaml
# Add to GitHub Actions workflow
- Deployment success/failure notifications
- Test failure alerts
- Security audit warnings
- Cost threshold alerts
```

## 🔄 **Step 8: Rollback Strategy**

### Automated Rollback
```bash
# If deployment fails, automatically rollback
- Revert to previous CloudFormation stack
- Restore previous Lambda function versions
- Update API Gateway to previous stage
```

### Manual Rollback
```bash
# Emergency rollback process
1. Go to GitHub Actions
2. Re-run previous successful deployment
3. Or use AWS Console to rollback stack
```

## 📋 **Step 9: Deployment Checklist**

### Before First Deployment
- [ ] AWS accounts set up (staging/production)
- [ ] IAM users created with proper policies
- [ ] GitHub secrets configured
- [ ] GitHub environments configured with protection rules
- [ ] Branch protection rules enabled
- [ ] All tests passing locally

### Before Production Deployment
- [ ] Staging deployment successful
- [ ] All integration tests passing
- [ ] Manual testing completed
- [ ] Security review completed
- [ ] Cost analysis reviewed
- [ ] Rollback plan confirmed

### After Deployment
- [ ] Health checks passing
- [ ] CloudWatch logs reviewed
- [ ] API endpoints tested
- [ ] Cost monitoring enabled
- [ ] Documentation updated

## 🚨 **Step 10: Troubleshooting**

### Common Issues

#### Deployment Fails
```bash
# Check GitHub Actions logs
# Look for specific error messages
# Verify AWS credentials are correct
# Check CloudFormation events in AWS Console
```

#### Lambda Functions Not Working
```bash
# Check CloudWatch logs for specific function
# Verify environment variables are set
# Check IAM role permissions
# Test function individually
```

#### API Gateway Issues
```bash
# Verify API key is configured correctly
# Check usage plan associations
# Test endpoints with correct headers
# Review CloudWatch API Gateway logs
```

## 📚 **Additional Resources**

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [AWS CDK Best Practices](https://docs.aws.amazon.com/cdk/v2/guide/best-practices.html)
- [AWS IAM Best Practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)
- [CloudFormation Best Practices](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/best-practices.html)

## 🎯 **Next Steps**

1. **Set up the GitHub environments and secrets**
2. **Test the staging deployment**
3. **Configure monitoring and alerting**
4. **Document your specific deployment procedures**
5. **Train team members on the CI/CD process**

This CI/CD setup provides a robust, secure, and scalable deployment pipeline for your automated video pipeline infrastructure.