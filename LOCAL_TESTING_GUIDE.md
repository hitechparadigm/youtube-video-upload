# 🧪 Local Testing Guide - CI/CD Pipeline & API Gateway

**Last Updated**: October 18, 2025  
**Purpose**: Test the API Gateway and Lambda functions locally without GitHub Actions

---

## 🎯 **Quick Start - Test Without GitHub Actions**

### **Option 1: Test Deployed API (Fastest)**
```bash
# Get your API details from AWS
aws cloudformation describe-stacks --stack-name automated-video-pipeline-prod --query "Stacks[0].Outputs"

# Set environment variables and test
API_URL="https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/prod" \
API_KEY="YOUR_API_KEY" \
node test-local-deployment.js
```

### **Option 2: Test with SAM CLI (Local Development)**
```bash
# Install SAM CLI if not installed
pip install aws-sam-cli

# Test locally
node test-sam-local.js server    # Start local API at http://localhost:3000
node test-sam-local.js functions # Test individual functions
node test-sam-local.js           # Quick validation
```

### **Option 3: Direct AWS CLI Testing**
```bash
# Test individual Lambda functions directly
aws lambda invoke \
  --function-name automated-video-pipeline-health-check-prod \
  --payload '{"httpMethod":"GET","path":"/"}' \
  response.json && cat response.json
```

---

## 📋 **Step-by-Step Testing Process**

### **Step 1: Get Your API Configuration**

```bash
# Get stack outputs (includes API URL and API Key ID)
aws cloudformation describe-stacks \
  --stack-name automated-video-pipeline-prod \
  --query "Stacks[0].Outputs" \
  --output table

# Get the actual API Key value
API_KEY_ID=$(aws cloudformation describe-stacks \
  --stack-name automated-video-pipeline-prod \
  --query "Stacks[0].Outputs[?OutputKey==\`ApiKey\`].OutputValue" \
  --output text)

aws apigateway get-api-key \
  --api-key $API_KEY_ID \
  --include-value \
  --query "value" \
  --output text
```

### **Step 2: Test API Gateway Health**

```bash
# Update the configuration in test-local-deployment.js
# Then run the comprehensive test
node test-local-deployment.js
```

**Expected Results:**
- ✅ Health Check (Root): 200 OK
- ✅ Health Check Endpoint: 200 OK  
- ✅ Topic Management Health: 200 OK
- ✅ Script Generator Health: 200 OK
- ✅ Topic Creation Test: 200 OK (creates new project)
- ⚠️ Script Generation Test: 400 Bad Request (expected - no topic context)

### **Step 3: Test Individual Functions**

```bash
# Test health check function
aws lambda invoke \
  --function-name automated-video-pipeline-health-check-prod \
  --payload '{"httpMethod":"GET","path":"/","headers":{"x-api-key":"YOUR_API_KEY"}}' \
  health-response.json

cat health-response.json | jq .

# Test topic management
aws lambda invoke \
  --function-name automated-video-pipeline-topic-management-prod \
  --payload '{"httpMethod":"POST","path":"/topics","headers":{"x-api-key":"YOUR_API_KEY"},"body":"{\"topic\":\"AWS Testing\"}"}' \
  topic-response.json

cat topic-response.json | jq .
```

### **Step 4: Test Complete Pipeline Flow**

```bash
# Create a complete test script
cat > test-complete-flow.js << 'EOF'
const { callAPI } = require('./test-local-deployment.js');

async function testCompleteFlow() {
    console.log('🧪 Testing Complete Pipeline Flow...');
    
    // Step 1: Create topic
    const topicResult = await callAPI('/topics', 'POST', {
        topic: 'Complete Flow Test',
        targetAudience: 'developers',
        videoDuration: 300
    });
    
    if (!topicResult.success) {
        console.log('❌ Topic creation failed:', topicResult.error);
        return;
    }
    
    console.log('✅ Topic created:', topicResult.data.projectId);
    
    // Step 2: Generate script
    const scriptResult = await callAPI('/scripts/generate', 'POST', {
        projectId: topicResult.data.projectId,
        scriptOptions: { targetLength: 300 }
    });
    
    if (!scriptResult.success) {
        console.log('❌ Script generation failed:', scriptResult.error);
        return;
    }
    
    console.log('✅ Script generated:', scriptResult.data.totalScenes, 'scenes');
    console.log('🎉 Complete pipeline flow working!');
}

testCompleteFlow().catch(console.error);
EOF

node test-complete-flow.js
```

---

## 🔧 **Troubleshooting Common Issues**

### **403 Forbidden Errors**
```bash
# Check API key is correct
aws apigateway get-api-key --api-key YOUR_API_KEY_ID --include-value

# Check API Gateway configuration
aws apigateway get-usage-plans

# Verify stack deployment
aws cloudformation describe-stacks --stack-name automated-video-pipeline-prod
```

### **Function Not Found Errors**
```bash
# List all Lambda functions
aws lambda list-functions --query "Functions[?contains(FunctionName, 'automated-video-pipeline')].FunctionName"

# Check specific function
aws lambda get-function --function-name automated-video-pipeline-health-check-prod
```

### **Timeout Issues**
```bash
# Check function configuration
aws lambda get-function-configuration --function-name automated-video-pipeline-topic-management-prod

# Check CloudWatch logs
aws logs describe-log-groups --log-group-name-prefix "/aws/lambda/automated-video-pipeline"
```

---

## 🚀 **SAM CLI Local Development**

### **Prerequisites**
```bash
# Install SAM CLI
pip install aws-sam-cli

# Install Docker (required for local testing)
# Visit: https://docs.docker.com/get-docker/

# Verify installation
sam --version
docker --version
```

### **Local API Server**
```bash
# Build and start local API
sam build --template-file template-simplified.yaml
sam local start-api --port 3000

# Test local API (in another terminal)
curl -H "x-api-key: test-key" http://localhost:3000/
curl -H "x-api-key: test-key" http://localhost:3000/topics
```

### **Individual Function Testing**
```bash
# Test health check function
sam local invoke HealthCheckFunction --event test-events/health-check.json

# Test topic management
sam local invoke TopicManagementFunction --event test-events/topic-create.json
```

---

## 📊 **Performance Testing**

### **Load Testing with curl**
```bash
# Test API Gateway performance
for i in {1..10}; do
  echo "Request $i:"
  time curl -s -H "x-api-key: YOUR_API_KEY" \
    https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/prod/ \
    | jq .status
done
```

### **Concurrent Testing**
```bash
# Install Apache Bench (if not installed)
# sudo apt-get install apache2-utils  # Ubuntu
# brew install httpie                  # macOS

# Run concurrent tests
ab -n 100 -c 10 \
  -H "x-api-key: YOUR_API_KEY" \
  https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/prod/
```

---

## 🔍 **Debugging Tools**

### **CloudWatch Logs**
```bash
# Get recent logs for a function
aws logs filter-log-events \
  --log-group-name "/aws/lambda/automated-video-pipeline-health-check-prod" \
  --start-time $(date -d '1 hour ago' +%s)000

# Stream logs in real-time
aws logs tail "/aws/lambda/automated-video-pipeline-health-check-prod" --follow
```

### **API Gateway Logs**
```bash
# Enable API Gateway logging (if not enabled)
aws apigateway update-stage \
  --rest-api-id YOUR_API_ID \
  --stage-name prod \
  --patch-ops op=replace,path=/accessLogSettings/destinationArn,value=arn:aws:logs:REGION:ACCOUNT:log-group:API-Gateway-Execution-Logs_YOUR_API_ID/prod
```

### **X-Ray Tracing**
```bash
# Get trace summaries
aws xray get-trace-summaries \
  --time-range-type TimeRangeByStartTime \
  --start-time $(date -d '1 hour ago' +%s) \
  --end-time $(date +%s)
```

---

## 📈 **Monitoring and Metrics**

### **CloudWatch Metrics**
```bash
# Get Lambda function metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Invocations \
  --dimensions Name=FunctionName,Value=automated-video-pipeline-health-check-prod \
  --start-time $(date -d '1 hour ago' -u +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Sum
```

### **API Gateway Metrics**
```bash
# Get API Gateway metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/ApiGateway \
  --metric-name Count \
  --dimensions Name=ApiName,Value=automated-video-pipeline-prod \
  --start-time $(date -d '1 hour ago' -u +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Sum
```

---

## 🎯 **Success Criteria**

### **✅ API Gateway Working**
- Health check endpoints return 200 OK
- All function endpoints respond correctly
- API key authentication working
- No 403 Forbidden errors

### **✅ Lambda Functions Working**
- Functions return proper JSON responses
- Error handling works correctly
- CloudWatch logs show successful execution
- Function timeouts and memory allocation appropriate

### **✅ Pipeline Flow Working**
- Topic Management creates projects successfully
- Script Generator reads topic context correctly
- Context synchronization between functions working
- S3 and DynamoDB integration functional

---

## 🚨 **Emergency Fixes**

### **If API Gateway Returns 403**
```bash
# Check usage plan association
aws apigateway get-usage-plans

# Re-associate API key if needed
aws apigateway create-usage-plan-key \
  --usage-plan-id YOUR_USAGE_PLAN_ID \
  --key-id YOUR_API_KEY_ID \
  --key-type API_KEY
```

### **If Functions Return 500**
```bash
# Check function configuration
aws lambda get-function-configuration --function-name FUNCTION_NAME

# Update function if needed
aws lambda update-function-configuration \
  --function-name FUNCTION_NAME \
  --timeout 300 \
  --memory-size 1024
```

### **If Context Sync Fails**
```bash
# Check S3 bucket permissions
aws s3 ls s3://automated-video-pipeline-prod-ACCOUNT-REGION/

# Check DynamoDB table
aws dynamodb describe-table --table-name automated-video-pipeline-context-prod
```

---

**🎉 With these testing tools, you can validate your entire API Gateway and Lambda function setup locally without going through the GitHub Actions pipeline. This enables rapid development and debugging!**