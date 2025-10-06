#!/bin/bash

# AI Model Configuration Script
# Usage: ./scripts/configure-ai-model.sh [model-name]

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Available models
declare -A MODELS=(
    ["claude-3.5-sonnet"]="anthropic.claude-3-5-sonnet-20240620-v1:0"
    ["claude-3-sonnet"]="anthropic.claude-3-sonnet-20240229-v1:0"
    ["claude-3-haiku"]="anthropic.claude-3-haiku-20240307-v1:0"
    ["claude-instant"]="anthropic.claude-instant-v1"
    ["titan-express"]="amazon.titan-text-express-v1"
    ["titan-lite"]="amazon.titan-text-lite-v1"
)

# Function to display available models
show_models() {
    echo -e "${BLUE}Available AI Models:${NC}"
    echo -e "${YELLOW}High Quality (Recommended):${NC}"
    echo "  claude-3.5-sonnet  - Claude 3.5 Sonnet (Latest, Best Quality)"
    echo "  claude-3-sonnet    - Claude 3 Sonnet (Current Production)"
    echo ""
    echo -e "${YELLOW}Cost Optimized:${NC}"
    echo "  claude-3-haiku     - Claude 3 Haiku (Fast, Affordable)"
    echo "  claude-instant     - Claude Instant (Fastest, Cheapest)"
    echo ""
    echo -e "${YELLOW}Alternative Models:${NC}"
    echo "  titan-express      - Amazon Titan Text Express"
    echo "  titan-lite         - Amazon Titan Text Lite"
    echo ""
}

# Function to get current model
get_current_model() {
    if [ -f ".env" ]; then
        current=$(grep "BEDROCK_MODEL_ID" .env 2>/dev/null | cut -d'=' -f2 | tr -d '"' || echo "")
        if [ -n "$current" ]; then
            echo -e "${GREEN}Current model: $current${NC}"
        else
            echo -e "${YELLOW}No model configured in .env file${NC}"
        fi
    else
        echo -e "${YELLOW}No .env file found${NC}"
    fi
}

# Function to set model
set_model() {
    local model_name=$1
    local model_id=${MODELS[$model_name]}
    
    if [ -z "$model_id" ]; then
        echo -e "${RED}Error: Unknown model '$model_name'${NC}"
        show_models
        exit 1
    fi
    
    echo -e "${BLUE}Configuring AI model: $model_name${NC}"
    echo -e "${BLUE}Model ID: $model_id${NC}"
    
    # Create or update .env file
    if [ -f ".env" ]; then
        # Update existing .env file
        if grep -q "BEDROCK_MODEL_ID" .env; then
            sed -i.bak "s/BEDROCK_MODEL_ID=.*/BEDROCK_MODEL_ID=\"$model_id\"/" .env
        else
            echo "BEDROCK_MODEL_ID=\"$model_id\"" >> .env
        fi
        
        if grep -q "BEDROCK_MODEL_REGION" .env; then
            sed -i.bak "s/BEDROCK_MODEL_REGION=.*/BEDROCK_MODEL_REGION=\"us-east-1\"/" .env
        else
            echo "BEDROCK_MODEL_REGION=\"us-east-1\"" >> .env
        fi
    else
        # Create new .env file
        cat > .env << EOF
# AI Model Configuration
BEDROCK_MODEL_ID="$model_id"
BEDROCK_MODEL_REGION="us-east-1"
EOF
    fi
    
    echo -e "${GREEN}✓ Model configuration saved to .env file${NC}"
    
    # Export for current session
    export BEDROCK_MODEL_ID="$model_id"
    export BEDROCK_MODEL_REGION="us-east-1"
    
    echo -e "${GREEN}✓ Environment variables set for current session${NC}"
    
    # Ask about deployment
    echo ""
    read -p "Deploy the new configuration now? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        deploy_model
    else
        echo -e "${YELLOW}Remember to run 'npm run deploy' in the infrastructure directory to apply changes${NC}"
    fi
}

# Function to deploy model configuration
deploy_model() {
    echo -e "${BLUE}Deploying AI model configuration...${NC}"
    
    if [ ! -d "infrastructure" ]; then
        echo -e "${RED}Error: infrastructure directory not found${NC}"
        echo "Please run this script from the project root directory"
        exit 1
    fi
    
    cd infrastructure
    
    # Check if npm dependencies are installed
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}Installing dependencies...${NC}"
        npm install
    fi
    
    # Deploy the stack
    echo -e "${BLUE}Running CDK deploy...${NC}"
    npm run deploy
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Deployment completed successfully!${NC}"
        echo -e "${GREEN}✓ AI model configuration is now active${NC}"
    else
        echo -e "${RED}✗ Deployment failed${NC}"
        exit 1
    fi
    
    cd ..
}

# Function to test model configuration
test_model() {
    echo -e "${BLUE}Testing AI model configuration...${NC}"
    
    # Get API Gateway URL from CDK outputs
    api_url=$(cd infrastructure && npx cdk list --json 2>/dev/null | jq -r '.[0]' | xargs npx cdk describe 2>/dev/null | grep "ApiGatewayUrl" | cut -d'"' -f4 || echo "")
    
    if [ -z "$api_url" ]; then
        echo -e "${RED}Error: Could not find API Gateway URL${NC}"
        echo "Make sure the infrastructure is deployed"
        exit 1
    fi
    
    # Get API Key (you'll need to provide this)
    read -p "Enter your API Key: " api_key
    
    if [ -z "$api_key" ]; then
        echo -e "${RED}Error: API Key is required for testing${NC}"
        exit 1
    fi
    
    # Test API call
    echo -e "${BLUE}Making test API call...${NC}"
    
    response=$(curl -s -X POST "$api_url/ai-topics/generate" \
        -H "Content-Type: application/json" \
        -H "X-Api-Key: $api_key" \
        -d '{
            "baseTopic": "artificial intelligence",
            "frequency": 1,
            "targetAudience": "tech enthusiasts"
        }')
    
    if echo "$response" | jq -e '.generatedTopics' > /dev/null 2>&1; then
        echo -e "${GREEN}✓ AI model is working correctly!${NC}"
        echo -e "${BLUE}Generated topic:${NC}"
        echo "$response" | jq -r '.generatedTopics[0].title'
    else
        echo -e "${RED}✗ Test failed${NC}"
        echo "Response: $response"
    fi
}

# Main script logic
case "${1:-}" in
    "list"|"ls")
        show_models
        get_current_model
        ;;
    "current"|"status")
        get_current_model
        ;;
    "deploy")
        deploy_model
        ;;
    "test")
        test_model
        ;;
    "help"|"-h"|"--help")
        echo "AI Model Configuration Script"
        echo ""
        echo "Usage: $0 [command|model-name]"
        echo ""
        echo "Commands:"
        echo "  list, ls     - Show available models"
        echo "  current      - Show current model configuration"
        echo "  deploy       - Deploy current configuration"
        echo "  test         - Test the deployed model"
        echo "  help         - Show this help message"
        echo ""
        echo "Model Names:"
        show_models
        echo ""
        echo "Examples:"
        echo "  $0 claude-3.5-sonnet    # Set to Claude 3.5 Sonnet"
        echo "  $0 claude-3-haiku       # Set to Claude 3 Haiku (cost-optimized)"
        echo "  $0 list                 # Show available models"
        echo "  $0 deploy               # Deploy current configuration"
        ;;
    "")
        echo -e "${YELLOW}AI Model Configuration${NC}"
        echo ""
        get_current_model
        echo ""
        show_models
        echo ""
        echo "Usage: $0 [model-name] or $0 help for more options"
        ;;
    *)
        set_model "$1"
        ;;
esac