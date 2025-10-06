#!/bin/bash

# Deployment script for Topic Management Lambda Function
# Automated Video Pipeline - Task 2.1

set -e

echo "🚀 Starting deployment of Topic Management Lambda Function..."

# Check if Node.js 20.x is available
NODE_VERSION=$(node --version)
echo "📋 Node.js version: $NODE_VERSION"

if [[ ! "$NODE_VERSION" =~ ^v20\. ]]; then
    echo "⚠️  Warning: Node.js 20.x is recommended for AWS Lambda compatibility"
fi

# Install dependencies for Lambda function
echo "📦 Installing Lambda function dependencies..."
cd src/lambda/topic-management
npm install
cd ../../../

# Install CDK dependencies
echo "📦 Installing CDK dependencies..."
cd infrastructure
npm install
cd ..

# Bootstrap CDK (if not already done)
echo "🔧 Bootstrapping CDK..."
cd infrastructure
npx cdk bootstrap --require-approval never
cd ..

# Deploy infrastructure
echo "🏗️  Deploying infrastructure..."
cd infrastructure
npx cdk deploy TopicManagementStack --require-approval never
cd ..

echo "✅ Deployment completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Note the API Gateway URL from the CDK output"
echo "2. Get the API key from AWS Console or CDK output"
echo "3. Test the endpoints using the provided test events"
echo ""
echo "🔗 API Endpoints:"
echo "  GET    /topics           - List all topics"
echo "  POST   /topics           - Create new topic"
echo "  GET    /topics/{id}      - Get specific topic"
echo "  PUT    /topics/{id}      - Update topic"
echo "  DELETE /topics/{id}      - Delete topic"
echo ""
echo "🔑 Authentication: Include 'x-api-key' header with your API key"