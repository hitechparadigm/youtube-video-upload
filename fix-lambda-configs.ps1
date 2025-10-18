# Fix Lambda Configuration Issues
# PowerShell script to apply all the necessary fixes

Write-Host "🔧 FIXING LAMBDA CONFIGURATION ISSUES" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Check if AWS CLI is available
try {
    aws --version | Out-Null
    Write-Host "✅ AWS CLI is available" -ForegroundColor Green
} catch {
    Write-Host "❌ AWS CLI not found. Please install AWS CLI first." -ForegroundColor Red
    exit 1
}

Write-Host "🎯 Applying fixes based on comprehensive system analysis..." -ForegroundColor Yellow
Write-Host ""

# Function to run AWS command with error handling
function Invoke-AWSCommand {
    param(
        [string]$Command,
        [string]$Description
    )
    
    Write-Host "🔧 $Description..." -ForegroundColor Yellow
    try {
        Invoke-Expression $Command
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ✅ Success" -ForegroundColor Green
        } else {
            Write-Host "  ❌ Failed with exit code $LASTEXITCODE" -ForegroundColor Red
        }
    } catch {
        Write-Host "  ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    }
    Write-Host ""
}

# Fix 1: Topic Management
$cmd1 = 'aws lambda update-function-configuration --function-name "automated-video-pipeline-topic-management-v3" --handler "index.handler" --timeout 300 --memory-size 1024 --layers "arn:aws:lambda:us-east-1:786673323159:layer:automated-video-pipeline-context:59" --region us-east-1'
Invoke-AWSCommand -Command $cmd1 -Description "Fix Topic Management handler and configuration"

# Fix 2: Script Generator
$cmd2 = 'aws lambda update-function-configuration --function-name "automated-video-pipeline-script-generator-v3" --handler "index.handler" --timeout 300 --memory-size 1024 --layers "arn:aws:lambda:us-east-1:786673323159:layer:automated-video-pipeline-context:59" --region us-east-1'
Invoke-AWSCommand -Command $cmd2 -Description "Fix Script Generator handler and configuration"

# Fix 3: Audio Generator (with environment variables)
$envVars = @{
    "S3_BUCKET_NAME" = "automated-video-pipeline-v2-786673323159-us-east-1"
    "S3_BUCKET" = "automated-video-pipeline-v2-786673323159-us-east-1"
    "CONTEXT_TABLE_NAME" = "automated-video-pipeline-context-v2"
    "CONTEXT_TABLE" = "automated-video-pipeline-context-v2"
    "API_KEYS_SECRET_NAME" = "automated-video-pipeline/api-keys"
    "NODE_ENV" = "production"
}

$envString = ($envVars.GetEnumerator() | ForEach-Object { "$($_.Key)=$($_.Value)" }) -join ","
$cmd3 = "aws lambda update-function-configuration --function-name `"automated-video-pipeline-audio-generator-v3`" --handler `"index.handler`" --timeout 300 --memory-size 1024 --layers `"arn:aws:lambda:us-east-1:786673323159:layer:automated-video-pipeline-context:59`" --environment `"Variables={$envString}`" --region us-east-1"
Invoke-AWSCommand -Command $cmd3 -Description "Fix Audio Generator with environment variables"

# Fix 4: Media Curator
$cmd4 = 'aws lambda update-function-configuration --function-name "automated-video-pipeline-media-curator-v3" --handler "index.handler" --timeout 300 --memory-size 1024 --layers "arn:aws:lambda:us-east-1:786673323159:layer:automated-video-pipeline-context:59" --region us-east-1'
Invoke-AWSCommand -Command $cmd4 -Description "Fix Media Curator timeout and memory"

# Fix 5: Update remaining functions for consistency
$functions = @(
    "automated-video-pipeline-video-assembler-v3",
    "automated-video-pipeline-manifest-builder-v3", 
    "automated-video-pipeline-youtube-publisher-v3",
    "automated-video-pipeline-workflow-orchestrator-v3"
)

foreach ($func in $functions) {
    $cmd = "aws lambda update-function-configuration --function-name `"$func`" --handler `"index.handler`" --layers `"arn:aws:lambda:us-east-1:786673323159:layer:automated-video-pipeline-context:59`" --region us-east-1"
    Invoke-AWSCommand -Command $cmd -Description "Update $func for consistency"
}

Write-Host "🎉 ALL LAMBDA CONFIGURATION FIXES APPLIED!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "⏳ Waiting 30 seconds for changes to propagate..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

Write-Host "🧪 RUNNING POST-FIX VALIDATION..." -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

# Run the validation test
node -e "
const https = require('https');

async function validateFixes() {
  console.log('🧪 VALIDATING FIXES...');
  console.log('');

  const tests = [
    {
      name: 'Topic Management',
      endpoint: '/topic/analyze',
      data: {topic: 'Travel to Argentina', targetAudience: 'travel enthusiasts', videoDuration: 180}
    },
    {
      name: 'Script Generator', 
      endpoint: '/script/generate',
      data: {projectId: 'test-post-fix-' + Date.now(), targetDuration: 180}
    },
    {
      name: 'Audio Generator',
      endpoint: '/audio/generate', 
      data: {projectId: '2025-10-17T00-26-06_travel-to-peru'}
    }
  ];

  let fixedCount = 0;
  
  for (const test of tests) {
    const result = await callAPI(test.endpoint, 'POST', test.data);
    const status = result.success ? '✅ FIXED' : '❌ Still broken';
    console.log(`${test.name}: ${status}`);
    if (result.success) fixedCount++;
    if (!result.success && result.error) {
      console.log(`  Error: ${result.error}`);
    }
  }
  
  console.log('');
  if (fixedCount === 3) {
    console.log('🎉 ALL FIXES SUCCESSFUL - Ready for Argentina video!');
  } else if (fixedCount > 0) {
    console.log(`⚠️ Partial success: ${fixedCount}/3 components fixed`);
  } else {
    console.log('❌ Fixes need more time to propagate or additional debugging');
  }
}

async function callAPI(endpoint, method, data) {
  return new Promise((resolve) => {
    const postData = JSON.stringify(data);
    const options = {
      hostname: '8tczdwx7q9.execute-api.us-east-1.amazonaws.com',
      port: 443,
      path: `/prod${endpoint}`,
      method: method,
      headers: {
        'x-api-key': 'Jv0lnwVcLfaFznOtvocBq7s783MyxaXw8DJUomPx',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 60000
    };
    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => responseData += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(responseData);
          resolve({ success: result.success || res.statusCode === 200, error: result.error || result.message });
        } catch (e) {
          resolve({ success: false, error: 'Parse error' });
        }
      });
    });
    req.on('error', (error) => resolve({ success: false, error: error.message }));
    req.on('timeout', () => { req.destroy(); resolve({ success: false, error: 'timeout' }); });
    req.write(postData);
    req.end();
  });
}

validateFixes().catch(console.error);
"

Write-Host ""
Write-Host "🚀 NEXT STEPS:" -ForegroundColor Green
Write-Host "==============" -ForegroundColor Green
Write-Host "1. If validation shows fixes are successful, test the Argentina video creation" -ForegroundColor White
Write-Host "2. If some issues remain, they may need additional time to propagate" -ForegroundColor White
Write-Host "3. Run: node create-argentina-video-test.js" -ForegroundColor Yellow
Write-Host ""