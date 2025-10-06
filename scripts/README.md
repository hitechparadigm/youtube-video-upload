# Infrastructure Validation Scripts

This directory contains scripts to validate and test the automated video pipeline infrastructure.

## validate-infrastructure.js

Comprehensive validation script that tests all AWS infrastructure components.

### What it tests:

#### 🪣 S3 Buckets
- ✅ Bucket existence and accessibility
- ✅ Versioning configuration
- ✅ Lifecycle rules for cost optimization
- ✅ Required project tags

#### 🗄️ DynamoDB Tables
- ✅ Table existence and active status
- ✅ On-demand billing mode
- ✅ AWS managed encryption
- ✅ Global Secondary Index (GSI) configuration

#### 🔐 Secrets Manager
- ✅ Secret existence and accessibility
- ✅ Valid JSON structure (where applicable)
- ✅ Media sources configuration
- ✅ API credentials presence

#### 👤 IAM Roles
- ✅ IAM access permissions
- ✅ Project-specific roles (when deployed)

#### 🏷️ Project Isolation
- ✅ No conflicts with existing YouTube automation project
- ✅ Separate resource naming

### Usage:

```bash
# Run all validation tests
npm run test:infrastructure

# Or run directly
node scripts/validate-infrastructure.js
```

### Expected Results:

When all infrastructure is properly deployed, you should see:
- ✅ **35 tests passed**
- ✅ **0 tests failed** 
- ✅ **100% success rate**

### Sample Output:

```
🧪 Starting Infrastructure Validation Tests...

🪣 Testing S3 Bucket Infrastructure...
✅ PASS S3 Bucket exists: automated-video-pipeline-786673323159-us-east-1
✅ PASS S3 Versioning enabled: automated-video-pipeline-786673323159-us-east-1
✅ PASS S3 Lifecycle rules: automated-video-pipeline-786673323159-us-east-1
✅ PASS S3 Required tags: automated-video-pipeline-786673323159-us-east-1

🗄️ Testing DynamoDB Tables...
✅ PASS DynamoDB Table exists: automated-video-pipeline-topics
✅ PASS DynamoDB Table active: automated-video-pipeline-topics
✅ PASS DynamoDB On-demand billing: automated-video-pipeline-topics

🔐 Testing Secrets Manager...
✅ PASS Secret exists: automated-video-pipeline/media-sources
✅ PASS Media sources configured: automated-video-pipeline/media-sources

📊 Test Summary:
✅ Passed: 35
❌ Failed: 0
📈 Success Rate: 100.0%

🎉 All infrastructure validation tests passed!
✅ Ready to proceed with Task 2: Topic Management System
```

### Troubleshooting:

If tests fail, check:

1. **AWS Credentials**: Ensure AWS CLI is configured with proper permissions
2. **Region**: Script assumes `us-east-1` region
3. **Account ID**: Script expects account `786673323159`
4. **Deployment**: Ensure CDK stack has been deployed successfully

### Adding New Tests:

To add new validation tests:

1. Add test function to `validate-infrastructure.js`
2. Call the function in `runAllTests()`
3. Use `logTest()` to record results
4. Update this README with new test descriptions