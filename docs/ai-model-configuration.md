# AI Model Configuration Guide

## Overview

The AI Topic Generator supports multiple AI models through configurable environment variables. You can easily switch between different Claude models or other supported Bedrock models without code changes.

## Supported Models

### Claude 3 Family (Recommended)
- **Claude 3.5 Sonnet** (Latest): `anthropic.claude-3-5-sonnet-20240620-v1:0`
- **Claude 3 Sonnet** (Current): `anthropic.claude-3-sonnet-20240229-v1:0`
- **Claude 3 Haiku** (Fast): `anthropic.claude-3-haiku-20240307-v1:0`

### Claude Legacy
- **Claude Instant**: `anthropic.claude-instant-v1`

### Amazon Titan (Alternative)
- **Titan Text Express**: `amazon.titan-text-express-v1`
- **Titan Text Lite**: `amazon.titan-text-lite-v1`

### AI21 Labs (Alternative)
- **Jurassic-2 Ultra**: `ai21.j2-ultra-v1`
- **Jurassic-2 Mid**: `ai21.j2-mid-v1`

## Configuration Methods

### Method 1: Environment Variables (Recommended)

Set environment variables before deployment:

```bash
# Use Claude 3.5 Sonnet (latest and most capable)
export BEDROCK_MODEL_ID="anthropic.claude-3-5-sonnet-20240620-v1:0"
export BEDROCK_MODEL_REGION="us-east-1"

# Deploy with new configuration
cd infrastructure
npm run deploy
```

### Method 2: CDK Context Variables

```bash
# Deploy with specific model
cdk deploy --context bedrockModelId=anthropic.claude-3-5-sonnet-20240620-v1:0
```

### Method 3: Direct Infrastructure Update

Edit `infrastructure/lib/topic-management-stack.js`:

```javascript
environment: {
  TOPICS_TABLE_NAME: topicsTable.tableName,
  TRENDS_TABLE_NAME: trendsTable.tableName,
  BEDROCK_MODEL_ID: 'anthropic.claude-3-5-sonnet-20240620-v1:0', // Change this
  BEDROCK_MODEL_REGION: 'us-east-1',
  NODE_ENV: 'production'
},
```

## Model Comparison

| Model | Speed | Cost | Quality | Best For |
|-------|-------|------|---------|----------|
| Claude 3.5 Sonnet | Medium | High | Excellent | Complex topic generation, best quality |
| Claude 3 Sonnet | Medium | High | Excellent | Current production model |
| Claude 3 Haiku | Fast | Low | Good | High-volume, cost-sensitive scenarios |
| Claude Instant | Very Fast | Very Low | Fair | Basic topic generation |
| Titan Text | Fast | Medium | Good | AWS-native alternative |

## Regional Availability

### Claude 3 Models
- **US East (N. Virginia)**: `us-east-1` ✅
- **US West (Oregon)**: `us-west-2` ✅
- **Europe (Frankfurt)**: `eu-central-1` ✅
- **Asia Pacific (Tokyo)**: `ap-northeast-1` ✅

### Check Model Availability
```bash
# List available models in your region
aws bedrock list-foundation-models --region us-east-1 --query 'modelSummaries[?contains(modelId, `anthropic`)]'
```

## Configuration Examples

### High Quality Setup (Recommended)
```bash
export BEDROCK_MODEL_ID="anthropic.claude-3-5-sonnet-20240620-v1:0"
export BEDROCK_MODEL_REGION="us-east-1"
```

### Cost-Optimized Setup
```bash
export BEDROCK_MODEL_ID="anthropic.claude-3-haiku-20240307-v1:0"
export BEDROCK_MODEL_REGION="us-east-1"
```

### High-Speed Setup
```bash
export BEDROCK_MODEL_ID="anthropic.claude-instant-v1"
export BEDROCK_MODEL_REGION="us-east-1"
```

## Deployment Steps

1. **Set Environment Variables**:
   ```bash
   export BEDROCK_MODEL_ID="your-chosen-model-id"
   export BEDROCK_MODEL_REGION="your-region"
   ```

2. **Deploy Infrastructure**:
   ```bash
   cd infrastructure
   npm run deploy
   ```

3. **Verify Configuration**:
   ```bash
   # Check Lambda environment variables
   aws lambda get-function-configuration --function-name ai-topic-generator --query 'Environment.Variables'
   ```

## Testing Different Models

### Test API Call
```bash
curl -X POST https://your-api-gateway-url/ai-topics/generate \
  -H "Content-Type: application/json" \
  -H "X-Api-Key: your-api-key" \
  -d '{
    "baseTopic": "artificial intelligence",
    "frequency": 2,
    "targetAudience": "tech enthusiasts"
  }'
```

### Monitor Performance
- **CloudWatch Metrics**: Check invocation duration and error rates
- **Cost Analysis**: Monitor Bedrock usage costs in AWS Cost Explorer
- **Quality Assessment**: Compare generated topic quality

## Model-Specific Considerations

### Claude 3.5 Sonnet
- **Pros**: Best quality, latest capabilities, excellent reasoning
- **Cons**: Higher cost, moderate speed
- **Use Case**: Premium content creation, complex topic analysis

### Claude 3 Haiku
- **Pros**: Fast, cost-effective, good quality
- **Cons**: Less sophisticated than Sonnet models
- **Use Case**: High-volume topic generation, budget-conscious scenarios

### Claude Instant
- **Pros**: Very fast, very cheap
- **Cons**: Lower quality, less creative
- **Use Case**: Basic topic generation, development/testing

## Troubleshooting

### Model Not Available Error
```json
{
  "error": "ValidationException",
  "message": "The model ID is not supported in this region"
}
```

**Solution**: Check model availability in your region or switch regions.

### Permission Denied Error
```json
{
  "error": "AccessDeniedException", 
  "message": "User is not authorized to perform: bedrock:InvokeModel"
}
```

**Solution**: Ensure the model ARN is included in IAM permissions and redeploy.

### High Latency Issues
- Switch to Claude 3 Haiku or Claude Instant for faster responses
- Consider regional proximity to reduce network latency
- Monitor CloudWatch metrics for performance patterns

## Cost Optimization

### Model Pricing (Approximate)
- **Claude 3.5 Sonnet**: $3.00 per 1M input tokens, $15.00 per 1M output tokens
- **Claude 3 Sonnet**: $3.00 per 1M input tokens, $15.00 per 1M output tokens  
- **Claude 3 Haiku**: $0.25 per 1M input tokens, $1.25 per 1M output tokens
- **Claude Instant**: $0.80 per 1M input tokens, $2.40 per 1M output tokens

### Cost Reduction Strategies
1. **Use Haiku for bulk generation**: Switch to Claude 3 Haiku for high-volume scenarios
2. **Optimize prompts**: Reduce input token count with concise prompts
3. **Cache results**: Store and reuse generated topics when appropriate
4. **Batch processing**: Generate multiple topics in single API calls

## Future Model Support

The system is designed to support new models as they become available:

1. **Add new model ARN** to IAM permissions in CDK
2. **Update model ID** in environment variables
3. **Test compatibility** with existing prompt formats
4. **Adjust parameters** if needed (max_tokens, temperature, etc.)

## Best Practices

1. **Start with Claude 3.5 Sonnet** for best quality
2. **Test thoroughly** when switching models
3. **Monitor costs** and performance metrics
4. **Use appropriate regions** for your user base
5. **Keep fallback options** configured
6. **Document your model choice** and reasoning

## Support and Updates

- **AWS Bedrock Documentation**: [https://docs.aws.amazon.com/bedrock/](https://docs.aws.amazon.com/bedrock/)
- **Model Updates**: Check AWS announcements for new model releases
- **Regional Expansion**: Monitor AWS for new regional availability