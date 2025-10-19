# Get Stack Information for Travel to Spain Test

Since you have AWS credentials in the AWS Toolkit, here are several ways to get your API URL and API Key:

## Method 1: AWS Console (Easiest)

1. **Go to CloudFormation Console**: https://console.aws.amazon.com/cloudformation/
2. **Find your stack**: Look for `automated-video-pipeline-dev`
3. **Click on the stack name**
4. **Go to "Outputs" tab**
5. **Copy the values**:
   - `ApiUrl`: Your API Gateway endpoint
   - `ApiKey`: Your API key for authentication

## Method 2: AWS Toolkit in VS Code

1. **Open AWS Toolkit panel** in VS Code
2. **Navigate to CloudFormation**
3. **Find stack**: `automated-video-pipeline-dev`
4. **View stack outputs**
5. **Copy ApiUrl and ApiKey values**

## Method 3: Configure AWS CLI (One-time setup)

```bash
# Configure AWS CLI with your credentials
aws configure

# Then get stack outputs
aws cloudformation describe-stacks \
  --stack-name automated-video-pipeline-dev \
  --query "Stacks[0].Outputs" \
  --output table
```

## Method 4: SAM CLI (If stack was deployed with SAM)

```bash
# List stack outputs using SAM
sam list stack-outputs --stack-name automated-video-pipeline-dev
```

## Once you have the values:

### Option A: Set environment variables
```bash
# Windows PowerShell
$env:API_URL = "https://your-api-id.execute-api.us-east-1.amazonaws.com/dev"
$env:API_KEY = "your-actual-api-key"
node test-travel-spain-e2e.js

# Windows CMD
set API_URL=https://your-api-id.execute-api.us-east-1.amazonaws.com/dev
set API_KEY=your-actual-api-key
node test-travel-spain-e2e.js
```

### Option B: Edit the test file directly
Edit `test-travel-spain-e2e.js` lines 12-13:

```javascript
// Replace these lines:
this.baseUrl = process.env.API_URL || 'https://your-api-gateway-url.execute-api.us-east-1.amazonaws.com/dev';
this.apiKey = process.env.API_KEY || 'your-api-key';

// With your actual values:
this.baseUrl = 'https://YOUR-ACTUAL-API-ID.execute-api.us-east-1.amazonaws.com/dev';
this.apiKey = 'YOUR-ACTUAL-API-KEY';
```

## Expected Stack Outputs Format:

```
ApiUrl: https://abc123def4.execute-api.us-east-1.amazonaws.com/dev
ApiKey: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0
```

## Test Validation:

The test will validate your complete pipeline:
- ✅ Topic Management (Create "Travel to Spain" topic)
- ✅ Script Generation (Generate travel guide script)
- ✅ Audio Generation (Convert to speech with AWS Polly)
- ✅ Media Curation (Find Spain travel images)
- ✅ Video Assembly (Combine audio + images)
- ✅ Manifest Builder (Quality validation)
- ✅ YouTube Publishing (Test mode - won't actually publish)

Once you have the API URL and API Key, you can run the test and validate that your optimized CI/CD pipeline deployed everything correctly!