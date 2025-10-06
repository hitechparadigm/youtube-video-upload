#!/bin/bash

# System Testing Script
# Tests all implemented features of the Automated YouTube Video Pipeline

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
API_BASE_URL="https://0m7kt3zxhi.execute-api.us-east-1.amazonaws.com/prod"
API_KEY="aoik68fmg2"

# Test results tracking
TESTS_PASSED=0
TESTS_FAILED=0
FAILED_TESTS=()

# Function to make API calls
api_call() {
    local method=$1
    local endpoint=$2
    local data=$3
    local description=$4
    
    echo -e "${BLUE}Testing: $description${NC}"
    echo -e "${CYAN}$method $endpoint${NC}"
    
    if [ -n "$data" ]; then
        response=$(curl -s -w "\n%{http_code}" -X "$method" \
            "$API_BASE_URL$endpoint" \
            -H "Content-Type: application/json" \
            -H "X-Api-Key: $API_KEY" \
            -d "$data")
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" \
            "$API_BASE_URL$endpoint" \
            -H "X-Api-Key: $API_KEY")
    fi
    
    # Extract response body and status code
    response_body=$(echo "$response" | head -n -1)
    status_code=$(echo "$response" | tail -n 1)
    
    # Check if successful
    if [[ "$status_code" =~ ^2[0-9][0-9]$ ]]; then
        echo -e "${GREEN}✓ SUCCESS (HTTP $status_code)${NC}"
        echo -e "${CYAN}Response: $(echo "$response_body" | jq -r '.message // .generatedTopics[0].title // .count // .processed // "Success"' 2>/dev/null || echo "Success")${NC}"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${RED}✗ FAILED (HTTP $status_code)${NC}"
        echo -e "${RED}Response: $response_body${NC}"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        FAILED_TESTS+=("$description")
    fi
    
    echo ""
    sleep 1 # Rate limiting
}

# Function to test topic management
test_topic_management() {
    echo -e "${YELLOW}=== TESTING TOPIC MANAGEMENT SYSTEM ===${NC}"
    echo ""
    
    # Test 1: Create a topic
    api_call "POST" "/topics" '{
        "topic": "AI and Machine Learning for Beginners",
        "priority": 1,
        "dailyFrequency": 2,
        "status": "active",
        "targetAudience": "tech beginners",
        "region": "US",
        "contentStyle": "engaging_educational",
        "tags": ["ai", "machine-learning", "beginners"]
    }' "Create new topic"
    
    # Test 2: List all topics
    api_call "GET" "/topics" "" "List all topics"
    
    # Test 3: List topics with filters
    api_call "GET" "/topics?status=active&limit=5" "" "List active topics (filtered)"
    
    # Test 4: Get specific topic (we'll use a generic ID for demo)
    # api_call "GET" "/topics/test-topic-id" "" "Get specific topic"
}

# Function to test AI topic generation
test_ai_topic_generation() {
    echo -e "${YELLOW}=== TESTING AI TOPIC GENERATION ===${NC}"
    echo ""
    
    # Test 1: Generate AI topics
    api_call "POST" "/ai-topics/generate" '{
        "baseTopic": "cryptocurrency investing",
        "frequency": 2,
        "targetAudience": "millennials",
        "contentStyle": "engaging"
    }' "Generate AI-powered topics"
    
    # Test 2: Analyze trends with AI
    api_call "POST" "/ai-topics/analyze" '{
        "topic": "artificial intelligence",
        "timeframe": "7d"
    }' "Analyze trends with AI"
    
    # Test 3: Get topic suggestions
    api_call "GET" "/ai-topics/suggestions?limit=5" "" "Get topic suggestions"
}

# Function to test trend data collection
test_trend_collection() {
    echo -e "${YELLOW}=== TESTING TREND DATA COLLECTION ===${NC}"
    echo ""
    
    # Test 1: Collect trend data
    api_call "POST" "/trends/collect" '{
        "action": "collect",
        "topic": "investing for beginners",
        "sources": ["google-trends", "youtube"],
        "timeframe": "7d"
    }' "Collect trend data"
    
    # Test 2: Get collected trend data
    api_call "GET" "/trends?topic=investing&limit=10" "" "Get trend data"
}

# Function to test trend data processing
test_trend_processing() {
    echo -e "${YELLOW}=== TESTING TREND DATA PROCESSING ===${NC}"
    echo ""
    
    # Test 1: Process trend data
    api_call "POST" "/trends/process" '{
        "source": "all",
        "batchSize": 50
    }' "Process raw trend data"
    
    # Test 2: Get processed trends
    api_call "GET" "/trends/processed?minScore=50&limit=10" "" "Get processed trends"
    
    # Test 3: Aggregate trend data
    api_call "POST" "/trends/aggregate" '{
        "timeframe": "24h",
        "groupBy": "category",
        "metrics": ["score", "volume", "engagement"],
        "limit": 10
    }' "Aggregate trend data"
    
    # Test 4: Get trend analytics
    api_call "GET" "/trends/analytics?timeframe=24h" "" "Get trend analytics"
    
    # Test 5: Score trend data
    api_call "POST" "/trends/score" '{
        "rescoreAll": false,
        "trendIds": []
    }' "Score trend data"
}

# Function to test Google Sheets sync
test_google_sheets_sync() {
    echo -e "${YELLOW}=== TESTING GOOGLE SHEETS SYNC ===${NC}"
    echo ""
    
    # Test 1: Validate Google Sheets structure (with demo URL)
    api_call "POST" "/sync/validate" '{
        "action": "validate",
        "spreadsheetUrl": "https://docs.google.com/spreadsheets/d/1example/edit#gid=0"
    }' "Validate Google Sheets structure"
    
    # Test 2: Get sync history
    api_call "GET" "/sync/history?limit=5" "" "Get sync history"
}

# Function to test configuration
test_configuration() {
    echo -e "${YELLOW}=== TESTING CONFIGURATION SYSTEM ===${NC}"
    echo ""
    
    # Test Lambda environment variables
    echo -e "${BLUE}Testing Lambda configuration...${NC}"
    
    # Check AI Topic Generator configuration
    ai_config=$(aws lambda get-function-configuration \
        --function-name ai-topic-generator \
        --query 'Environment.Variables' \
        --output json 2>/dev/null || echo '{}')
    
    if echo "$ai_config" | jq -e '.BEDROCK_MODEL_ID' > /dev/null 2>&1; then
        model_id=$(echo "$ai_config" | jq -r '.BEDROCK_MODEL_ID')
        echo -e "${GREEN}✓ AI Model configured: $model_id${NC}"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${RED}✗ AI Model configuration not found${NC}"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        FAILED_TESTS+=("AI Model Configuration")
    fi
    
    # Check Trend Processor configuration
    processor_config=$(aws lambda get-function-configuration \
        --function-name trend-data-processor \
        --query 'Environment.Variables' \
        --output json 2>/dev/null || echo '{}')
    
    if echo "$processor_config" | jq -e '.PROCESSING_BATCH_SIZE' > /dev/null 2>&1; then
        batch_size=$(echo "$processor_config" | jq -r '.PROCESSING_BATCH_SIZE')
        echo -e "${GREEN}✓ Trend Processor configured: Batch size $batch_size${NC}"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${RED}✗ Trend Processor configuration not found${NC}"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        FAILED_TESTS+=("Trend Processor Configuration")
    fi
    
    echo ""
}

# Function to test infrastructure
test_infrastructure() {
    echo -e "${YELLOW}=== TESTING INFRASTRUCTURE ===${NC}"
    echo ""
    
    # Test Lambda functions
    echo -e "${BLUE}Testing Lambda functions...${NC}"
    
    functions=("topic-management" "google-sheets-sync" "trend-data-collection" "ai-topic-generator" "trend-data-processor")
    
    for func in "${functions[@]}"; do
        status=$(aws lambda get-function --function-name "$func" --query 'Configuration.State' --output text 2>/dev/null || echo "NotFound")
        
        if [ "$status" = "Active" ]; then
            echo -e "${GREEN}✓ $func: Active${NC}"
            TESTS_PASSED=$((TESTS_PASSED + 1))
        else
            echo -e "${RED}✗ $func: $status${NC}"
            TESTS_FAILED=$((TESTS_FAILED + 1))
            FAILED_TESTS+=("Lambda: $func")
        fi
    done
    
    echo ""
    
    # Test DynamoDB tables
    echo -e "${BLUE}Testing DynamoDB tables...${NC}"
    
    tables=("automated-video-pipeline-topics" "automated-video-pipeline-sync-history" "automated-video-pipeline-trends" "automated-video-pipeline-processed-trends")
    
    for table in "${tables[@]}"; do
        status=$(aws dynamodb describe-table --table-name "$table" --query 'Table.TableStatus' --output text 2>/dev/null || echo "NotFound")
        
        if [ "$status" = "ACTIVE" ]; then
            echo -e "${GREEN}✓ $table: Active${NC}"
            TESTS_PASSED=$((TESTS_PASSED + 1))
        else
            echo -e "${RED}✗ $table: $status${NC}"
            TESTS_FAILED=$((TESTS_FAILED + 1))
            FAILED_TESTS+=("DynamoDB: $table")
        fi
    done
    
    echo ""
}

# Function to show test summary
show_summary() {
    echo -e "${YELLOW}=== TEST SUMMARY ===${NC}"
    echo ""
    echo -e "${GREEN}Tests Passed: $TESTS_PASSED${NC}"
    echo -e "${RED}Tests Failed: $TESTS_FAILED${NC}"
    echo ""
    
    if [ $TESTS_FAILED -gt 0 ]; then
        echo -e "${RED}Failed Tests:${NC}"
        for test in "${FAILED_TESTS[@]}"; do
            echo -e "${RED}  ✗ $test${NC}"
        done
        echo ""
    fi
    
    # Calculate success rate
    total_tests=$((TESTS_PASSED + TESTS_FAILED))
    if [ $total_tests -gt 0 ]; then
        success_rate=$(( (TESTS_PASSED * 100) / total_tests ))
        echo -e "${BLUE}Success Rate: $success_rate%${NC}"
    fi
    
    echo ""
    
    if [ $TESTS_FAILED -eq 0 ]; then
        echo -e "${GREEN}🎉 ALL TESTS PASSED! System is working correctly.${NC}"
        return 0
    else
        echo -e "${RED}❌ Some tests failed. Check the output above for details.${NC}"
        return 1
    fi
}

# Function to show help
show_help() {
    echo -e "${BLUE}System Testing Script${NC}"
    echo ""
    echo "Usage: $0 [test-category]"
    echo ""
    echo -e "${YELLOW}Test Categories:${NC}"
    echo "  all              - Run all tests (default)"
    echo "  topics           - Test topic management system"
    echo "  ai               - Test AI topic generation"
    echo "  trends           - Test trend data collection"
    echo "  processing       - Test trend data processing"
    echo "  sync             - Test Google Sheets sync"
    echo "  config           - Test configuration system"
    echo "  infrastructure   - Test AWS infrastructure"
    echo ""
    echo -e "${YELLOW}Examples:${NC}"
    echo "  $0                    # Run all tests"
    echo "  $0 ai                 # Test only AI features"
    echo "  $0 topics             # Test only topic management"
    echo ""
}

# Function to check prerequisites
check_prerequisites() {
    echo -e "${BLUE}Checking prerequisites...${NC}"
    
    # Check if curl is available
    if ! command -v curl &> /dev/null; then
        echo -e "${RED}✗ curl is required but not installed${NC}"
        exit 1
    fi
    
    # Check if jq is available
    if ! command -v jq &> /dev/null; then
        echo -e "${RED}✗ jq is required but not installed${NC}"
        echo -e "${YELLOW}Install jq: https://stedolan.github.io/jq/download/${NC}"
        exit 1
    fi
    
    # Check if AWS CLI is available
    if ! command -v aws &> /dev/null; then
        echo -e "${RED}✗ AWS CLI is required but not installed${NC}"
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        echo -e "${RED}✗ AWS credentials not configured${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✓ All prerequisites met${NC}"
    echo ""
}

# Main testing function
run_tests() {
    local test_category=${1:-all}
    
    echo -e "${CYAN}🚀 Starting System Tests for: $test_category${NC}"
    echo -e "${CYAN}API Base URL: $API_BASE_URL${NC}"
    echo -e "${CYAN}Timestamp: $(date)${NC}"
    echo ""
    
    case "$test_category" in
        "all")
            test_infrastructure
            test_configuration
            test_topic_management
            test_ai_topic_generation
            test_trend_collection
            test_trend_processing
            test_google_sheets_sync
            ;;
        "topics")
            test_topic_management
            ;;
        "ai")
            test_ai_topic_generation
            ;;
        "trends")
            test_trend_collection
            ;;
        "processing")
            test_trend_processing
            ;;
        "sync")
            test_google_sheets_sync
            ;;
        "config")
            test_configuration
            ;;
        "infrastructure")
            test_infrastructure
            ;;
        "help"|"-h"|"--help")
            show_help
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown test category: $test_category${NC}"
            show_help
            exit 1
            ;;
    esac
    
    show_summary
}

# Check prerequisites first
check_prerequisites

# Run the tests
run_tests "$1"