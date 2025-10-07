#!/bin/bash

# Automated Video Pipeline Deployment Script
# Deploys the complete infrastructure to AWS

set -e

echo "🚀 Starting Automated Video Pipeline Deployment"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${ENVIRONMENT:-production}
AWS_REGION=${AWS_REGION:-us-east-1}
AWS_ACCOUNT=${AWS_ACCOUNT:-786673323159}

echo -e "${BLUE}Environment: ${ENVIRONMENT}${NC}"
echo -e "${BLUE}Region: ${AWS_REGION}${NC}"
echo -e "${BLUE}Account: ${AWS_ACCOUNT}${NC}"
echo ""

# Check prerequisites
echo "🔍 Checking prerequisites..."

# Check if AWS CLI is installed and configured
if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ AWS CLI is not installed${NC}"
    exit 1
fi

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}❌ AWS credentials not configured${NC}"
    exit 1
fi

# Check if CDK is installed
if ! command -v cdk &> /dev/null; then
    echo -e "${RED}❌ AWS CDK is not installed${NC}"
    echo "Install with: npm install -g aws-cdk"
    exit 1
fi

echo -e "${GREEN}✅ Prerequisites check passed${NC}"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."

# Install infrastructure dependencies
cd infrastructure
if [ ! -d "node_modules" ]; then
    echo "Installing infrastructure dependencies..."
    npm install
fi

# Install Lambda function dependencies
echo "Installing Lambda function dependencies..."

# Topic Management
cd ../src/lambda/topic-management
if [ ! -d "node_modules" ]; then
    npm install
fi

# Script Generator
cd ../script-generator
if [ ! -d "node_modules" ]; then
    npm install
fi

# Media Curator
cd ../media-curator
if [ ! -d "node_modules" ]; then
    npm install
fi

# Audio Generator
cd ../audio-generator
if [ ! -d "node_modules" ]; then
    npm install
fi

# Video Assembler
cd ../video-assembler
if [ ! -d "node_modules" ]; then
    npm install
fi

# YouTube Publisher
cd ../youtube-publisher
if [ ! -d "node_modules" ]; then
    npm install
fi

# Workflow Orchestrator
cd ../workflow-orchestrator
if [ ! -d "node_modules" ]; then
    npm install
fi

cd ../../../../infrastructure

echo -e "${GREEN}✅ Dependencies installed${NC}"
echo ""

# Bootstrap CDK (if needed)
echo "🏗️ Bootstrapping CDK..."
cdk bootstrap aws://${AWS_ACCOUNT}/${AWS_REGION} || true
echo ""

# Deploy the stack
echo "🚀 Deploying Video Pipeline Stack..."
echo "This may take 10-15 minutes..."
echo ""

# Set environment variables for deployment
export CDK_DEFAULT_ACCOUNT=${AWS_ACCOUNT}
export CDK_DEFAULT_REGION=${AWS_REGION}
export ENVIRONMENT=${ENVIRONMENT}

# Deploy with approval for security changes
cdk deploy VideoPipelineStack \
    --require-approval never \
    --outputs-file ../deployment-outputs.json \
    --progress events

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
    echo ""
    
    # Display important outputs
    echo "📋 Deployment Outputs:"
    echo "====================="
    
    if [ -f "../deployment-outputs.json" ]; then
        # Extract key information from outputs
        API_ENDPOINT=$(cat ../deployment-outputs.json | grep -o '"APIEndpoint"[^,]*' | cut -d'"' -f4)
        API_KEY_ID=$(cat ../deployment-outputs.json | grep -o '"APIKeyId"[^,]*' | cut -d'"' -f4)
        BUCKET_NAME=$(cat ../deployment-outputs.json | grep -o '"PrimaryBucketName"[^,]*' | cut -d'"' -f4)
        STATE_MACHINE_ARN=$(cat ../deployment-outputs.json | grep -o '"StateMachineArn"[^,]*' | cut -d'"' -f4)
        
        echo -e "${BLUE}API Endpoint:${NC} ${API_ENDPOINT}"
        echo -e "${BLUE}API Key ID:${NC} ${API_KEY_ID}"
        echo -e "${BLUE}S3 Bucket:${NC} ${BUCKET_NAME}"
        echo -e "${BLUE}State Machine:${NC} ${STATE_MACHINE_ARN}"
    fi
    
    echo ""
    echo "🎯 Next Steps:"
    echo "=============="
    echo "1. Get your API Key value from AWS Console:"
    echo "   aws apigateway get-api-key --api-key ${API_KEY_ID} --include-value"
    echo ""
    echo "2. Test the API:"
    echo "   curl -X GET \"${API_ENDPOINT}topics\" -H \"X-Api-Key: YOUR_API_KEY\""
    echo ""
    echo "3. Start your first video generation:"
    echo "   Use the workflow orchestrator to trigger video creation"
    echo ""
    echo -e "${GREEN}🎬 Your Automated Video Pipeline is ready!${NC}"
    
else
    echo ""
    echo -e "${RED}❌ Deployment failed${NC}"
    echo "Check the error messages above for details"
    exit 1
fi