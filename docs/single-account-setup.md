# Single Account CI/CD Setup Guide

## 🎯 **Perfect for Single Account Setup**

This guide is specifically for your scenario: **1 AWS account, 1 environment, simple CI/CD**.

## 🚀 **Quick Setup (5 Minutes)**

### Step 1: Create GitHub Secrets
Go to your GitHub repository → **Settings** → **Secrets and variables** → **Actions**

Add these 3 secrets:
```
AWS_ACCESS_KEY_ID = your-aws-access-key
AWS_SECRET_ACCESS_KEY = your-aws-secret-key  
AWS_ACCOUNT_ID = 786673323159
```

### Step 2: Create GitHub Environment
1. Go to **Settings** → **Environments**
2. Create environment named: `production`
3. Add protection rule: **Required reviewers** (optional - add yourself if you want approval step)

### Step 3: Enable GitHub Actions
1. Go to **Actions** tab in your repository
2. Enable workflows if not already enabled
3. The workflow will trigger automatically on push to `main`

## 🔧 **How It Works**

### Simple Workflow
```yaml
Trigger: Push to main branch
Process:
1. Run tests on all Lambda functions
2. Deploy to your AWS account
3. Run health checks
4. Display secure results (no API keys in logs)
```

### What Gets Deployed
- ✅ All Lambda functions updated
- ✅ API Gateway with secure API key
- ✅ S3 buckets and DynamoDB tables
- ✅ Step Functions state machine
- ✅ CloudWatch monitoring

## 🔒 **Security Features**

### No More API Key Exposure
```bash
# ❌ Before: API key shown in logs
API Key: Jv0lnwVcLfaFznOtvocBq7s783MyxaXw8DJUomPx

# ✅ Now: Secure message only
API key stored securely in AWS - retrieve when needed via:
aws apigateway get-api-key --api-key <KEY_ID> --include-value
```

### Secure Credential Management
- ✅ AWS credentials stored in GitHub Secrets
- ✅ No hardcoded values in code
- ✅ Automatic credential rotation support
- ✅ Audit trail of all deployments

## 📋 **Simple Deployment Process**

### Automatic Deployment
1. **Make changes** to your code
2. **Commit and push** to `main` branch
3. **GitHub Actions automatically**:
   - Runs tests
   - Deploys to AWS
   - Validates deployment
   - Reports success

### Manual Deployment
1. Go to **Actions** tab
2. Click **Deploy Video Pipeline**
3. Click **Run workflow**
4. Choose **main** branch
5. Click **Run workflow**

## 🧪 **Testing Your Setup**

### Test the CI/CD Pipeline
```bash
# 1. Make a small change to any file
echo "# Test change" >> README.md

# 2. Commit and push
git add .
git commit -m "Test CI/CD pipeline"
git push origin main

# 3. Watch the deployment in GitHub Actions tab
```

### Test Your API After Deployment
```bash
# Get your API key securely
API_KEY=$(aws apigateway get-api-key --api-key YOUR_KEY_ID --include-value --query "value" --output text)

# Test the API
curl -X GET "https://YOUR_API_ENDPOINT/topics" -H "X-Api-Key: $API_KEY"
```

## 🔧 **Current Infrastructure Update**

Let me update your CDK stack to work with single environment:

### Simplified Stack Name
- **Before**: `VideoPipelineStack-Production` (complex)
- **After**: `VideoPipelineStack` (simple)

### Resource Naming
- **Before**: `automated-video-pipeline-v2-786673323159-us-east-1`
- **After**: `automated-video-pipeline-786673323159-us-east-1`

## 💡 **Benefits for Your Setup**

### Simplicity
- ✅ One environment to manage
- ✅ Straightforward deployment process
- ✅ No complex environment switching
- ✅ Easy to understand and maintain

### Security
- ✅ No more exposed API keys
- ✅ Secure credential management
- ✅ Audit trail of changes
- ✅ Automated security scanning

### Reliability
- ✅ Automated testing before deployment
- ✅ Consistent deployments
- ✅ Easy rollback if needed
- ✅ Health checks after deployment

## 🚨 **Immediate Action Required**

### 1. Rotate Your Exposed API Key
```bash
# Your current API key was exposed, so rotate it:
aws apigateway create-api-key --name "video-pipeline-key-new"
# Then update your usage plan to use the new key
# Delete the old key: aws apigateway delete-api-key --api-key beusjltbol
```

### 2. Set Up GitHub Secrets
Add the 3 required secrets to your GitHub repository as shown above.

### 3. Test the New Pipeline
Push a small change to trigger the new secure deployment.

## 🎯 **Perfect for Your Needs**

This setup gives you:
- ✅ **Professional CI/CD** without complexity
- ✅ **Enterprise security** with simplicity
- ✅ **Automated deployments** on every push
- ✅ **No more manual AWS console work**
- ✅ **Secure credential management**
- ✅ **Easy maintenance and updates**

Your single-account setup will be just as professional and secure as multi-account setups, but much simpler to manage! 🎉