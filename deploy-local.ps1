# Local deployment script using AWS CLI profile (secure)
# No hardcoded credentials - uses AWS CLI profile

$env:AWS_PROFILE = "hitechparadigm"
$env:AWS_DEFAULT_REGION = "us-east-1"

Write-Host "🚀 Deploying Enhanced Video Pipeline with Manifest Builder..."

# Verify credentials
aws sts get-caller-identity --profile hitechparadigm

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ AWS credentials verified"
    
    # Deploy CDK stack
    cd infrastructure
    npx cdk deploy --all --require-approval never --profile hitechparadigm
    
    Write-Host "🎉 Deployment complete!"
} else {
    Write-Host "❌ AWS credentials not configured properly"
}