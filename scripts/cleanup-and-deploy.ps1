# Automated Video Pipeline - Cleanup and Deploy Script
# Removes old resources and deploys the new complete pipeline

param(
    [switch]$Force = $false
)

# Colors for output
$Red = "`e[31m"
$Green = "`e[32m"
$Yellow = "`e[33m"
$Blue = "`e[34m"
$Reset = "`e[0m"

function Write-ColorOutput {
    param([string]$Message, [string]$Color = $Reset)
    Write-Host "$Color$Message$Reset"
}

Write-ColorOutput "🎬 Automated Video Pipeline - Cleanup and Deploy" $Blue
Write-ColorOutput "================================================" $Blue
Write-Host ""

# Check prerequisites
Write-ColorOutput "🔍 Checking prerequisites..." $Blue

if (!(Get-Command aws -ErrorAction SilentlyContinue)) {
    Write-ColorOutput "❌ AWS CLI is not installed" $Red
    exit 1
}

if (!(Get-Command cdk -ErrorAction SilentlyContinue)) {
    Write-ColorOutput "❌ AWS CDK is not installed" $Red
    exit 1
}

# Test AWS credentials
try {
    aws sts get-caller-identity | Out-Null
    Write-ColorOutput "✅ AWS credentials verified" $Green
} catch {
    Write-ColorOutput "❌ AWS credentials not configured" $Red
    exit 1
}

Write-Host ""

# Warning about cleanup
if (-not $Force) {
    Write-ColorOutput "⚠️  WARNING: This will delete ALL existing automated-video-pipeline resources!" $Yellow
    Write-ColorOutput "This includes:" $Yellow
    Write-ColorOutput "• CloudFormation stacks (TopicManagementStack, etc.)" $Yellow
    Write-ColorOutput "• S3 buckets and all their contents" $Yellow
    Write-ColorOutput "• DynamoDB tables and all data" $Yellow
    Write-ColorOutput "• Lambda functions" $Yellow
    Write-Host ""
    
    $confirmation = Read-Host "Are you sure you want to continue? (yes/no)"
    if ($confirmation -ne "yes") {
        Write-ColorOutput "❌ Operation cancelled" $Yellow
        exit 0
    }
}

Write-Host ""
Write-ColorOutput "🧹 Starting cleanup of existing resources..." $Blue
Write-ColorOutput "==========================================" $Blue

# Delete existing CloudFormation stacks
Write-ColorOutput "🗑️  Deleting existing CloudFormation stacks..." $Yellow

$existingStacks = aws cloudformation list-stacks --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE --query "StackSummaries[?contains(StackName, 'automated-video') || contains(StackName, 'TopicManagement') || contains(StackName, 'VideoPipeline')].StackName" --output text

if ($existingStacks) {
    $stacks = $existingStacks -split "`t"
    foreach ($stack in $stacks) {
        if ($stack.Trim()) {
            Write-ColorOutput "  Deleting stack: $stack" $Yellow
            try {
                aws cloudformation delete-stack --stack-name $stack
                Write-ColorOutput "  ✅ Initiated deletion of: $stack" $Green
            } catch {
                Write-ColorOutput "  ❌ Failed to delete: $stack" $Red
            }
        }
    }
    
    # Wait for stack deletions to complete
    Write-ColorOutput "⏳ Waiting for stack deletions to complete..." $Yellow
    Start-Sleep -Seconds 30
}

# Clean up S3 buckets
Write-ColorOutput "🗑️  Cleaning up S3 buckets..." $Yellow

$buckets = aws s3 ls | Select-String "automated-video-pipeline" | ForEach-Object { ($_ -split "\s+")[-1] }

foreach ($bucket in $buckets) {
    if ($bucket) {
        Write-ColorOutput "  Emptying and deleting bucket: $bucket" $Yellow
        try {
            # Empty the bucket first
            aws s3 rm s3://$bucket --recursive --quiet
            # Delete the bucket
            aws s3 rb s3://$bucket --force
            Write-ColorOutput "  ✅ Deleted bucket: $bucket" $Green
        } catch {
            Write-ColorOutput "  ❌ Failed to delete bucket: $bucket" $Red
        }
    }
}

# Clean up DynamoDB tables
Write-ColorOutput "🗑️  Cleaning up DynamoDB tables..." $Yellow

$tables = aws dynamodb list-tables --query "TableNames[?contains(@, 'automated-video-pipeline')]" --output text

if ($tables) {
    $tableList = $tables -split "`t"
    foreach ($table in $tableList) {
        if ($table.Trim()) {
            Write-ColorOutput "  Deleting table: $table" $Yellow
            try {
                aws dynamodb delete-table --table-name $table | Out-Null
                Write-ColorOutput "  ✅ Deleted table: $table" $Green
            } catch {
                Write-ColorOutput "  ❌ Failed to delete table: $table" $Red
            }
        }
    }
}

Write-ColorOutput "✅ Cleanup completed!" $Green
Write-Host ""

# Deploy new infrastructure
Write-ColorOutput "🚀 Deploying new infrastructure..." $Blue
Write-ColorOutput "==================================" $Blue

try {
    # Change to infrastructure directory
    Set-Location infrastructure
    
    # Install dependencies
    Write-ColorOutput "📦 Installing dependencies..." $Yellow
    npm install
    
    # Bootstrap CDK
    Write-ColorOutput "🏗️  Bootstrapping CDK..." $Yellow
    cdk bootstrap
    
    # Deploy the stack
    Write-ColorOutput "📦 Deploying VideoPipelineStack..." $Yellow
    Write-ColorOutput "This may take 10-15 minutes..." $Yellow
    
    cdk deploy VideoPipelineStack --require-approval never --outputs-file ../deployment-outputs.json
    
    # Return to root directory
    Set-Location ..
    
    Write-ColorOutput "✅ Deployment completed successfully!" $Green
    
} catch {
    Write-ColorOutput "❌ Deployment failed: $($_.Exception.Message)" $Red
    Set-Location ..
    exit 1
}

Write-Host ""
Write-ColorOutput "📋 Deployment Results:" $Blue
Write-ColorOutput "=====================" $Blue

# Display outputs if available
if (Test-Path "deployment-outputs.json") {
    try {
        $outputs = Get-Content "deployment-outputs.json" | ConvertFrom-Json
        $stackOutputs = $outputs.VideoPipelineStack
        
        Write-ColorOutput "🌐 API Endpoint: $($stackOutputs.APIEndpoint)" $Green
        Write-ColorOutput "🔑 API Key ID: $($stackOutputs.APIKeyId)" $Green
        Write-ColorOutput "📦 S3 Bucket: $($stackOutputs.PrimaryBucketName)" $Green
        Write-ColorOutput "⚙️  State Machine: $($stackOutputs.StateMachineArn)" $Green
    } catch {
        Write-ColorOutput "Could not parse deployment outputs" $Yellow
    }
}

Write-Host ""
Write-ColorOutput "🎯 Next Steps:" $Blue
Write-ColorOutput "==============" $Blue
Write-ColorOutput "1. Get your API Key value:" $Yellow
Write-ColorOutput "   aws apigateway get-api-key --api-key <API_KEY_ID> --include-value" $Yellow
Write-Host ""
Write-ColorOutput "2. Test the deployment:" $Yellow
Write-ColorOutput "   node scripts/upload-first-video.js" $Yellow
Write-Host ""
Write-ColorOutput "🎬 Your automated video pipeline is ready!" $Green