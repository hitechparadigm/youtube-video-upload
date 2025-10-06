#!/bin/bash

# Configuration Management Script
# Usage: ./scripts/manage-config.sh [command] [options]

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration paths
CONFIG_DIR="config"
DEFAULT_CONFIG="$CONFIG_DIR/default.json"
LOCAL_CONFIG="$CONFIG_DIR/local.json"

# Function to display help
show_help() {
    echo -e "${BLUE}Configuration Management Script${NC}"
    echo ""
    echo "Usage: $0 [command] [options]"
    echo ""
    echo -e "${YELLOW}Commands:${NC}"
    echo "  init [env]           - Initialize configuration for environment"
    echo "  validate             - Validate configuration files"
    echo "  show [path]          - Show configuration value"
    echo "  set <path> <value>   - Set configuration value"
    echo "  export [env]         - Export configuration for deployment"
    echo "  secrets create       - Create AWS Secrets Manager configuration"
    echo "  secrets update       - Update AWS Secrets Manager configuration"
    echo "  model <model-name>   - Set AI model configuration"
    echo "  env <environment>    - Set environment configuration"
    echo ""
    echo -e "${YELLOW}Examples:${NC}"
    echo "  $0 init development                    # Initialize dev config"
    echo "  $0 set ai.models.primary.id claude-3.5-sonnet"
    echo "  $0 show ai.models.primary             # Show AI model config"
    echo "  $0 model claude-3-haiku               # Set to Haiku model"
    echo "  $0 env production                     # Set production environment"
    echo "  $0 export production                  # Export prod config"
    echo ""
}

# Function to initialize configuration
init_config() {
    local env=${1:-development}
    
    echo -e "${BLUE}Initializing configuration for environment: $env${NC}"
    
    # Create config directory if it doesn't exist
    mkdir -p "$CONFIG_DIR"
    
    # Create local config if it doesn't exist
    if [ ! -f "$LOCAL_CONFIG" ]; then
        echo -e "${YELLOW}Creating local configuration file...${NC}"
        cat > "$LOCAL_CONFIG" << EOF
{
  "environment": "$env",
  "ai": {
    "models": {
      "primary": {
        "id": "anthropic.claude-3-sonnet-20240229-v1:0",
        "region": "us-east-1"
      }
    }
  },
  "monitoring": {
    "logging": {
      "level": "info"
    }
  }
}
EOF
        echo -e "${GREEN}✓ Local configuration created${NC}"
    else
        echo -e "${YELLOW}Local configuration already exists${NC}"
    fi
    
    # Set environment variables
    export NODE_ENV="$env"
    echo "NODE_ENV=$env" > .env
    
    echo -e "${GREEN}✓ Configuration initialized for $env${NC}"
}

# Function to validate configuration
validate_config() {
    echo -e "${BLUE}Validating configuration files...${NC}"
    
    local files=("$DEFAULT_CONFIG")
    
    # Add environment-specific config if it exists
    if [ -n "$NODE_ENV" ] && [ -f "$CONFIG_DIR/$NODE_ENV.json" ]; then
        files+=("$CONFIG_DIR/$NODE_ENV.json")
    fi
    
    # Add local config if it exists
    if [ -f "$LOCAL_CONFIG" ]; then
        files+=("$LOCAL_CONFIG")
    fi
    
    local valid=true
    
    for file in "${files[@]}"; do
        if [ -f "$file" ]; then
            echo -n "Validating $file... "
            if jq empty "$file" 2>/dev/null; then
                echo -e "${GREEN}✓${NC}"
            else
                echo -e "${RED}✗ Invalid JSON${NC}"
                valid=false
            fi
        fi
    done
    
    if [ "$valid" = true ]; then
        echo -e "${GREEN}✓ All configuration files are valid${NC}"
    else
        echo -e "${RED}✗ Configuration validation failed${NC}"
        exit 1
    fi
}

# Function to show configuration value
show_config() {
    local path=${1:-""}
    
    if [ -z "$path" ]; then
        echo -e "${BLUE}Current configuration:${NC}"
        if [ -f "$LOCAL_CONFIG" ]; then
            jq . "$LOCAL_CONFIG"
        else
            echo -e "${YELLOW}No local configuration found${NC}"
        fi
        return
    fi
    
    echo -e "${BLUE}Configuration value for '$path':${NC}"
    
    if [ -f "$LOCAL_CONFIG" ]; then
        local value=$(jq -r ".$path // empty" "$LOCAL_CONFIG" 2>/dev/null)
        if [ -n "$value" ] && [ "$value" != "null" ]; then
            echo "$value"
        else
            echo -e "${YELLOW}Value not found in local config${NC}"
        fi
    else
        echo -e "${YELLOW}No local configuration found${NC}"
    fi
}

# Function to set configuration value
set_config() {
    local path="$1"
    local value="$2"
    
    if [ -z "$path" ] || [ -z "$value" ]; then
        echo -e "${RED}Error: Both path and value are required${NC}"
        echo "Usage: $0 set <path> <value>"
        exit 1
    fi
    
    echo -e "${BLUE}Setting configuration: $path = $value${NC}"
    
    # Create local config if it doesn't exist
    if [ ! -f "$LOCAL_CONFIG" ]; then
        echo "{}" > "$LOCAL_CONFIG"
    fi
    
    # Set the value using jq
    local temp_file=$(mktemp)
    jq --arg path "$path" --arg value "$value" 'setpath($path | split("."); $value)' "$LOCAL_CONFIG" > "$temp_file"
    mv "$temp_file" "$LOCAL_CONFIG"
    
    echo -e "${GREEN}✓ Configuration updated${NC}"
}

# Function to export configuration
export_config() {
    local env=${1:-${NODE_ENV:-development}}
    
    echo -e "${BLUE}Exporting configuration for environment: $env${NC}"
    
    # Create merged configuration
    local temp_file=$(mktemp)
    local merged_config="$temp_file"
    
    # Start with default config
    cp "$DEFAULT_CONFIG" "$merged_config"
    
    # Merge environment-specific config
    if [ -f "$CONFIG_DIR/$env.json" ]; then
        jq -s '.[0] * .[1]' "$merged_config" "$CONFIG_DIR/$env.json" > "${merged_config}.tmp"
        mv "${merged_config}.tmp" "$merged_config"
    fi
    
    # Merge local config
    if [ -f "$LOCAL_CONFIG" ]; then
        jq -s '.[0] * .[1]' "$merged_config" "$LOCAL_CONFIG" > "${merged_config}.tmp"
        mv "${merged_config}.tmp" "$merged_config"
    fi
    
    # Output the merged configuration
    echo -e "${GREEN}Merged configuration for $env:${NC}"
    jq . "$merged_config"
    
    # Clean up
    rm -f "$merged_config"
}

# Function to create secrets in AWS Secrets Manager
create_secrets() {
    echo -e "${BLUE}Creating configuration in AWS Secrets Manager...${NC}"
    
    local secret_name="automated-video-pipeline/config"
    local env=${NODE_ENV:-production}
    
    # Export current configuration
    local temp_file=$(mktemp)
    export_config "$env" > "$temp_file"
    
    # Create secret
    aws secretsmanager create-secret \
        --name "$secret_name" \
        --description "Configuration for automated video pipeline" \
        --secret-string file://"$temp_file" \
        --region "${AWS_REGION:-us-east-1}"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Configuration secret created: $secret_name${NC}"
    else
        echo -e "${RED}✗ Failed to create configuration secret${NC}"
    fi
    
    rm -f "$temp_file"
}

# Function to update secrets in AWS Secrets Manager
update_secrets() {
    echo -e "${BLUE}Updating configuration in AWS Secrets Manager...${NC}"
    
    local secret_name="automated-video-pipeline/config"
    local env=${NODE_ENV:-production}
    
    # Export current configuration
    local temp_file=$(mktemp)
    export_config "$env" > "$temp_file"
    
    # Update secret
    aws secretsmanager update-secret \
        --secret-id "$secret_name" \
        --secret-string file://"$temp_file" \
        --region "${AWS_REGION:-us-east-1}"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Configuration secret updated: $secret_name${NC}"
    else
        echo -e "${RED}✗ Failed to update configuration secret${NC}"
    fi
    
    rm -f "$temp_file"
}

# Function to set AI model
set_model() {
    local model_name="$1"
    
    case "$model_name" in
        "claude-3.5-sonnet")
            set_config "ai.models.primary.id" "anthropic.claude-3-5-sonnet-20240620-v1:0"
            ;;
        "claude-3-sonnet")
            set_config "ai.models.primary.id" "anthropic.claude-3-sonnet-20240229-v1:0"
            ;;
        "claude-3-haiku")
            set_config "ai.models.primary.id" "anthropic.claude-3-haiku-20240307-v1:0"
            ;;
        "claude-instant")
            set_config "ai.models.primary.id" "anthropic.claude-instant-v1"
            ;;
        *)
            echo -e "${RED}Error: Unknown model '$model_name'${NC}"
            echo "Available models: claude-3.5-sonnet, claude-3-sonnet, claude-3-haiku, claude-instant"
            exit 1
            ;;
    esac
    
    echo -e "${GREEN}✓ AI model set to: $model_name${NC}"
}

# Function to set environment
set_environment() {
    local env="$1"
    
    if [ -z "$env" ]; then
        echo -e "${RED}Error: Environment name is required${NC}"
        exit 1
    fi
    
    export NODE_ENV="$env"
    echo "NODE_ENV=$env" > .env
    
    set_config "environment" "$env"
    
    echo -e "${GREEN}✓ Environment set to: $env${NC}"
}

# Main script logic
case "${1:-help}" in
    "init")
        init_config "$2"
        ;;
    "validate")
        validate_config
        ;;
    "show")
        show_config "$2"
        ;;
    "set")
        set_config "$2" "$3"
        ;;
    "export")
        export_config "$2"
        ;;
    "secrets")
        case "$2" in
            "create")
                create_secrets
                ;;
            "update")
                update_secrets
                ;;
            *)
                echo -e "${RED}Error: Unknown secrets command '$2'${NC}"
                echo "Available: create, update"
                exit 1
                ;;
        esac
        ;;
    "model")
        set_model "$2"
        ;;
    "env")
        set_environment "$2"
        ;;
    "help"|"-h"|"--help")
        show_help
        ;;
    *)
        echo -e "${RED}Error: Unknown command '$1'${NC}"
        show_help
        exit 1
        ;;
esac