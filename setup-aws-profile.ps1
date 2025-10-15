# Setup AWS CLI profile
Write-Host "🔧 Setting up AWS CLI profile..."

# This will prompt for your credentials
aws configure --profile youtube-pipeline

# Test the profile
aws sts get-caller-identity --profile youtube-pipeline

# Set the profile as default for this session
$env:AWS_PROFILE = "youtube-pipeline"

Write-Host "✅ AWS profile configured. You can now deploy with:"
Write-Host "cd infrastructure"
Write-Host "npx cdk deploy --all --require-approval never"