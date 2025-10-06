@echo off
setlocal enabledelayedexpansion

REM AI Model Configuration Script for Windows
REM Usage: configure-ai-model.bat [model-name]

set "RED=[91m"
set "GREEN=[92m"
set "YELLOW=[93m"
set "BLUE=[94m"
set "NC=[0m"

REM Available models
set "claude-3.5-sonnet=anthropic.claude-3-5-sonnet-20240620-v1:0"
set "claude-3-sonnet=anthropic.claude-3-sonnet-20240229-v1:0"
set "claude-3-haiku=anthropic.claude-3-haiku-20240307-v1:0"
set "claude-instant=anthropic.claude-instant-v1"
set "titan-express=amazon.titan-text-express-v1"
set "titan-lite=amazon.titan-text-lite-v1"

if "%1"=="" goto show_help
if "%1"=="help" goto show_help
if "%1"=="-h" goto show_help
if "%1"=="--help" goto show_help
if "%1"=="list" goto show_models
if "%1"=="ls" goto show_models
if "%1"=="current" goto show_current
if "%1"=="deploy" goto deploy_model
if "%1"=="test" goto test_model

REM Set model
call :set_model %1
goto end

:show_help
echo AI Model Configuration Script
echo.
echo Usage: %0 [command^|model-name]
echo.
echo Commands:
echo   list, ls     - Show available models
echo   current      - Show current model configuration
echo   deploy       - Deploy current configuration
echo   test         - Test the deployed model
echo   help         - Show this help message
echo.
echo Model Names:
call :show_models_list
echo.
echo Examples:
echo   %0 claude-3.5-sonnet    # Set to Claude 3.5 Sonnet
echo   %0 claude-3-haiku       # Set to Claude 3 Haiku (cost-optimized)
echo   %0 list                 # Show available models
echo   %0 deploy               # Deploy current configuration
goto end

:show_models
call :show_models_list
call :show_current
goto end

:show_models_list
echo %BLUE%Available AI Models:%NC%
echo %YELLOW%High Quality (Recommended):%NC%
echo   claude-3.5-sonnet  - Claude 3.5 Sonnet (Latest, Best Quality)
echo   claude-3-sonnet    - Claude 3 Sonnet (Current Production)
echo.
echo %YELLOW%Cost Optimized:%NC%
echo   claude-3-haiku     - Claude 3 Haiku (Fast, Affordable)
echo   claude-instant     - Claude Instant (Fastest, Cheapest)
echo.
echo %YELLOW%Alternative Models:%NC%
echo   titan-express      - Amazon Titan Text Express
echo   titan-lite         - Amazon Titan Text Lite
echo.
goto :eof

:show_current
if exist ".env" (
    for /f "tokens=2 delims==" %%a in ('findstr "BEDROCK_MODEL_ID" .env 2^>nul') do (
        set "current=%%a"
        set "current=!current:"=!"
        echo %GREEN%Current model: !current!%NC%
        goto :eof
    )
)
echo %YELLOW%No model configured in .env file%NC%
goto :eof

:set_model
set "model_name=%1"
set "model_id=!%model_name%!"

if "!model_id!"=="" (
    echo %RED%Error: Unknown model '%model_name%'%NC%
    call :show_models_list
    goto end
)

echo %BLUE%Configuring AI model: %model_name%%NC%
echo %BLUE%Model ID: !model_id!%NC%

REM Create or update .env file
if exist ".env" (
    REM Update existing .env file
    powershell -Command "(Get-Content .env) -replace 'BEDROCK_MODEL_ID=.*', 'BEDROCK_MODEL_ID=\"!model_id!\"' | Set-Content .env.tmp"
    move .env.tmp .env >nul
    
    findstr "BEDROCK_MODEL_REGION" .env >nul
    if errorlevel 1 (
        echo BEDROCK_MODEL_REGION="us-east-1" >> .env
    ) else (
        powershell -Command "(Get-Content .env) -replace 'BEDROCK_MODEL_REGION=.*', 'BEDROCK_MODEL_REGION=\"us-east-1\"' | Set-Content .env.tmp"
        move .env.tmp .env >nul
    )
) else (
    REM Create new .env file
    echo # AI Model Configuration > .env
    echo BEDROCK_MODEL_ID="!model_id!" >> .env
    echo BEDROCK_MODEL_REGION="us-east-1" >> .env
)

echo %GREEN%✓ Model configuration saved to .env file%NC%

REM Set environment variables for current session
set "BEDROCK_MODEL_ID=!model_id!"
set "BEDROCK_MODEL_REGION=us-east-1"

echo %GREEN%✓ Environment variables set for current session%NC%

REM Ask about deployment
echo.
set /p "deploy_now=Deploy the new configuration now? (y/N): "
if /i "!deploy_now!"=="y" (
    call :deploy_model
) else (
    echo %YELLOW%Remember to run 'npm run deploy' in the infrastructure directory to apply changes%NC%
)
goto :eof

:deploy_model
echo %BLUE%Deploying AI model configuration...%NC%

if not exist "infrastructure" (
    echo %RED%Error: infrastructure directory not found%NC%
    echo Please run this script from the project root directory
    goto end
)

cd infrastructure

REM Check if npm dependencies are installed
if not exist "node_modules" (
    echo %YELLOW%Installing dependencies...%NC%
    npm install
)

REM Deploy the stack
echo %BLUE%Running CDK deploy...%NC%
npm run deploy

if errorlevel 1 (
    echo %RED%✗ Deployment failed%NC%
    cd ..
    goto end
)

echo %GREEN%✓ Deployment completed successfully!%NC%
echo %GREEN%✓ AI model configuration is now active%NC%

cd ..
goto :eof

:test_model
echo %BLUE%Testing AI model configuration...%NC%
echo %YELLOW%Note: Manual testing required. Use the API Gateway URL and your API key.%NC%
echo.
echo Test endpoint: POST /ai-topics/generate
echo Example payload:
echo {
echo   "baseTopic": "artificial intelligence",
echo   "frequency": 1,
echo   "targetAudience": "tech enthusiasts"
echo }
goto :eof

:end
endlocal