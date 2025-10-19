# Manual Setup Instructions for Travel to Spain E2E Test

## Step 1: Get your API URL and API Key

Run these AWS CLI commands to get your deployed stack information:

```bash
# Get API URL
aws cloudformation describe-stacks \
  --stack-name automated-video-pipeline-dev \
  --query "Stacks[0].Outputs[?OutputKey=='ApiUrl'].OutputValue" \
  --output text

# Get API Key  
aws cloudformation describe-stacks \
  --stack-name automated-video-pipeline-dev \
  --query "Stacks[0].Outputs[?OutputKey=='ApiKey'].OutputValue" \
  --output text
```

## Step 2: Set environment variables and run test

```bash
# Set your API URL and Key (replace with actual values)
export API_URL="https://your-api-id.execute-api.us-east-1.amazonaws.com/dev"
export API_KEY="your-actual-api-key"

# Run the Travel to Spain E2E test
node test-travel-spain-e2e.js
```

## Alternative: Direct test with inline values

Edit the test-travel-spain-e2e.js file and replace these lines:

```javascript
this.baseUrl = process.env.API_URL || 'https://your-api-gateway-url.execute-api.us-east-1.amazonaws.com/dev';
this.apiKey = process.env.API_KEY || 'your-api-key';
```

With your actual values:

```javascript
this.baseUrl = 'https://YOUR-ACTUAL-API-ID.execute-api.us-east-1.amazonaws.com/dev';
this.apiKey = 'YOUR-ACTUAL-API-KEY';
```

## Expected Test Flow

The test will execute these 7 steps for "Travel to Spain":

1. ✅ **Topic Management** - Create topic entry
2. ✅ **Script Generation** - Generate travel script  
3. ✅ **Audio Generation** - Convert script to speech
4. ✅ **Media Curation** - Find Spain travel images
5. ✅ **Video Assembly** - Combine audio + images
6. ✅ **Manifest Builder** - Create video manifest
7. ✅ **YouTube Publishing** - Test publish (test mode)

## Troubleshooting

- **403 Forbidden**: Check your API Key is correct
- **404 Not Found**: Verify API URL and endpoints are deployed
- **500 Internal Error**: Check CloudWatch logs for Lambda function errors
- **Timeout**: Some steps (video assembly) may take longer

## Stack Information

- **Environment**: dev
- **Stack Name**: automated-video-pipeline-dev
- **Region**: us-east-1
