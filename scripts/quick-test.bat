@echo off
setlocal enabledelayedexpansion

REM Quick Test Script for Automated YouTube Video Pipeline (Windows)
set "API_BASE_URL=https://0m7kt3zxhi.execute-api.us-east-1.amazonaws.com/prod"
set "API_KEY=aoik68fmg2"

echo 🚀 Quick Testing - Automated YouTube Video Pipeline
echo.

REM Test 1: Topic Management
echo 📝 Testing Topic Management...
curl -s -H "X-Api-Key: %API_KEY%" -H "Content-Type: application/json" "%API_BASE_URL%/topics" > temp_response.json
if %errorlevel% equ 0 (
    echo ✓ Topics API working
) else (
    echo ✗ Topics API failed
)

REM Test 2: AI Topic Generation
echo 🤖 Testing AI Topic Generation...
echo {"baseTopic": "artificial intelligence", "frequency": 2} > temp_data.json
curl -s -X POST -H "X-Api-Key: %API_KEY%" -H "Content-Type: application/json" -d @temp_data.json "%API_BASE_URL%/ai-topics/generate" > temp_response.json
if %errorlevel% equ 0 (
    echo ✓ AI Generation working
) else (
    echo ✗ AI Generation failed
)

REM Test 3: Trend Collection
echo 📈 Testing Trend Collection...
echo {"action": "collect", "topic": "technology"} > temp_data.json
curl -s -X POST -H "X-Api-Key: %API_KEY%" -H "Content-Type: application/json" -d @temp_data.json "%API_BASE_URL%/trends/collect" > temp_response.json
if %errorlevel% equ 0 (
    echo ✓ Trend Collection working
) else (
    echo ✗ Trend Collection failed
)

REM Clean up
if exist temp_data.json del temp_data.json
if exist temp_response.json del temp_response.json

echo.
echo ✅ Quick test complete! Check output above for results.
echo.
echo For detailed testing, use: scripts/test-system.sh (requires WSL/Git Bash)

pause