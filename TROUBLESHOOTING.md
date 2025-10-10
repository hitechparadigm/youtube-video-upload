# Troubleshooting Guide

This guide covers common issues and solutions for the Automated Video Pipeline.

## 🚨 Common Pipeline Issues

### 1. 502 Bad Gateway Errors

**Symptoms:**
- Lambda functions returning 502 status codes
- "Task timed out after X seconds" error messages
- Pipeline agents failing during AI processing

**Root Cause:**
Lambda timeout is shorter than AI processing time (e.g., 25s Lambda timeout vs 45s Bedrock call)

**Solution:**
```javascript
// In infrastructure/lib/video-pipeline-stack.js
timeout: Duration.seconds(60), // Increased for AI processing
```

**Prevention:**
- Always set Lambda timeout > AI processing timeout + buffer
- Monitor CloudWatch logs for timeout patterns
- Use async processing for operations > 15 minutes

### 2. Parameter Mismatch Errors

**Symptoms:**
- 400 Bad Request errors in pipeline
- "Missing required parameter" messages
- Agents working individually but failing in pipeline

**Root Cause:**
Orchestrator sending parameters in different format than agent expects

**Solution:**
1. Check orchestrator parameter format:
```javascript
const scriptResult = await this.invokeAgent('scriptGenerator', 'POST', '/scripts/generate', {
  projectId: projectId,
  scriptOptions: {
    targetLength: config.videoDuration,
    videoStyle: config.videoStyle,
    targetAudience: config.targetAudience
  }
});
```

2. Verify agent endpoint expects same format:
```javascript
// In agent handler
const { projectId, scriptOptions } = requestBody;
```

**Prevention:**
- Use TypeScript interfaces for parameter validation
- Create shared parameter schemas
- Test individual agents before pipeline integration

### 3. Pipeline Orchestrator Timeouts

**Symptoms:**
- Entire pipeline timing out after 25-30 seconds
- Partial agent completion but no final result
- "Orchestrator timeout" errors

**Root Cause:**
Orchestrator timeout too short for sequential agent execution

**Solution:**
```javascript
// Increase orchestrator timeout for full pipeline
timeout: Duration.minutes(5), // For full 6-agent pipeline
```

**Prevention:**
- Calculate total pipeline time: (agents × avg_time) + buffer
- Use parallel processing where possible
- Implement circuit breakers for failing agents

### 4. AI Generation Failures

**Symptoms:**
- Empty or malformed AI responses
- "AI generation failed" fallback messages
- Inconsistent content quality

**Root Cause:**
- Network timeouts to Bedrock
- Prompt engineering issues
- Rate limiting

**Solution:**
```javascript
// Implement timeout and fallback
const timeoutPromise = new Promise((_, reject) =>
  setTimeout(() => reject(new Error('Bedrock timeout')), 45000)
);

const response = await Promise.race([bedrockPromise, timeoutPromise]);

// Fallback on failure
if (!response) {
  return generateFallbackContext(params);
}
```

**Prevention:**
- Always implement fallback mechanisms
- Monitor Bedrock quotas and limits
- Use exponential backoff for retries

## 🔍 Debugging Techniques

### 1. Individual Agent Testing

Create test scripts for each agent:

```javascript
// test-agent-individual.js
const result = await lambda.invoke({
  FunctionName: 'agent-name',
  Payload: JSON.stringify({
    httpMethod: 'POST',
    path: '/endpoint',
    body: JSON.stringify(testParams)
  })
}).promise();
```

### 2. CloudWatch Log Analysis

Key log patterns to monitor:
- `Task timed out after X seconds` → Timeout issues
- `Missing required parameter` → Parameter validation
- `Bedrock timeout` → AI service issues
- `Context not found` → Context management issues

### 3. Pipeline Step Debugging

Add detailed logging in orchestrator:
```javascript
console.log(`🔄 Step ${step}: ${agent} starting...`);
const result = await this.invokeAgent(agent, method, path, body);
console.log(`${result.success ? '✅' : '❌'} Step ${step}: ${agent} ${result.success ? 'SUCCESS' : 'FAILED'}`);
```

## 🛠️ Infrastructure Troubleshooting

### 1. CDK Deployment Issues

**Common Problems:**
- Layer version conflicts
- IAM permission errors
- Resource naming conflicts

**Solutions:**
```bash
# Clean deployment
cdk destroy --all
cdk deploy --all

# Check for resource conflicts
aws cloudformation describe-stacks --stack-name VideoPipelineStack
```

### 2. Lambda Layer Issues

**Symptoms:**
- "Cannot find module" errors
- Layer import failures

**Solution:**
```javascript
// Use try-catch for layer imports
try {
  const contextManager = require('/opt/nodejs/context-manager');
} catch (error) {
  console.log('Layer not available, using fallback');
  // Implement fallback
}
```

### 3. API Gateway Timeout Limits

**Important:** API Gateway has a hard 30-second timeout limit.

**Solutions:**
- Use async processing for long operations
- Implement job queues for >30s operations
- Return immediate response with job ID for status polling

## 📊 Performance Optimization

### 1. Timeout Configuration Guidelines

| Component | Recommended Timeout | Reason |
|-----------|-------------------|---------|
| Topic Management | 60s | AI processing + fallback |
| Script Generator | 60s | AI processing + context |
| Media Curator | 25s | API calls only |
| Audio Generator | 25s | Polly synthesis |
| Video Assembler | 15min | Video processing |
| YouTube Publisher | 15min | Upload + processing |
| Orchestrator | 5min | Full pipeline coordination |

### 2. Memory Allocation

| Component | Recommended Memory | Reason |
|-----------|-------------------|---------|
| Topic Management | 512MB | AI processing |
| Script Generator | 1024MB | Large context handling |
| Media Curator | 512MB | Image processing |
| Audio Generator | 512MB | Audio synthesis |
| Video Assembler | 1024MB | Video processing |
| YouTube Publisher | 1024MB | Upload handling |

### 3. Monitoring and Alerts

Set up CloudWatch alarms for:
- Lambda duration > 80% of timeout
- Error rate > 5%
- Memory utilization > 90%
- API Gateway 5xx errors

## 🔄 Recovery Procedures

### 1. Pipeline Failure Recovery

```javascript
// Implement retry logic
const maxRetries = 3;
let attempt = 0;

while (attempt < maxRetries) {
  try {
    const result = await executeAgent(agent, params);
    if (result.success) break;
  } catch (error) {
    attempt++;
    if (attempt === maxRetries) {
      // Log failure and continue with next agent
      console.error(`Agent ${agent} failed after ${maxRetries} attempts`);
    }
    await sleep(1000 * attempt); // Exponential backoff
  }
}
```

### 2. Context Recovery

```javascript
// Auto-recovery for missing context
if (!context) {
  console.log('Context not found, attempting recovery...');
  context = await generateFallbackContext(projectId);
  await storeContext(context, 'topic', projectId);
}
```

## 🔍 Historical Issue Analysis

### Script Generator Context Key Bug (Resolved)

**Symptoms:**
- Script Generator progressively adding extra dashes to project IDs
- Context retrieval failures with malformed project IDs
- Multiple S3 folders created from failed attempts

**Root Cause:**
Project ID manipulation in Script Generator adding extra dashes on each retry:
```
Attempt 1: 2025-10-10T14-57--53_travel-tips (double dash)
Attempt 2: 2025-10-10T14-57---53_travel-tips (triple dash)
```

**Resolution:**
Fixed project ID handling in `src/lambda/script-generator/index.js` to prevent dash accumulation.

### API Timeout Cascade Issues (Resolved)

**Symptoms:**
- Multiple agents timing out simultaneously
- 502 errors across different endpoints
- Pipeline coordination failures

**Root Cause:**
Lambda timeout hierarchy mismatch with AI processing requirements.

**Resolution:**
Implemented proper timeout hierarchy:
- API Gateway: 30s (hard limit)
- Orchestrator: 5 minutes
- AI Agents: 60s
- External APIs: 25s

## 📞 Support and Escalation

### When to Escalate:
1. Multiple agents failing simultaneously
2. Infrastructure-wide timeouts
3. AWS service quotas exceeded
4. Data corruption in DynamoDB/S3

### Debug Information to Collect:
1. CloudWatch log streams for all affected components
2. API Gateway access logs
3. DynamoDB query patterns
4. S3 bucket access patterns
5. Lambda performance metrics

### Quick Health Check:
```bash
# Test all endpoints
curl -X GET "https://api-url/topics/health" -H "x-api-key: YOUR_KEY"
curl -X GET "https://api-url/scripts/health" -H "x-api-key: YOUR_KEY"
curl -X GET "https://api-url/media/health" -H "x-api-key: YOUR_KEY"
```