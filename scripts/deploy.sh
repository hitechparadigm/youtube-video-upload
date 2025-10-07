#!/bin/bash

# Main Deployment Script
# Deploys the automated video pipeline infrastructure

set -e

echo "🚀 Deploying Automated Video Pipeline"
echo "====================================="

# Check if CDK is installed
if ! command -v cdk &> /dev/null; then
    echo "❌ AWS CDK not found. Installing..."
    npm install -g aws-cdk
fi

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ AWS credentials not configured. Please run 'aws configure'"
    exit 1
fi

echo "✅ Prerequisites check passed"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Bootstrap CDK (if needed)
echo "🔧 Bootstrapping CDK..."
cdk bootstrap

# Deploy infrastructure
echo "🏗️  Deploying infrastructure..."
cdk deploy --require-approval never

echo "✅ Deployment complete!"
echo ""
echo "🎯 Next steps:"
echo "   1. Run: node scripts/sync-spreadsheet.js"
echo "   2. Check AWS Console for deployed resources"
echo "   3. Test the pipeline with your topics"