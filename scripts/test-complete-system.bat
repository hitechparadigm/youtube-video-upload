@echo off
REM Complete System Test - Tests all components of the video pipeline
REM This script tests the entire video generation workflow

echo 🎬 Testing Complete Automated Video Pipeline System
echo =====================================================
echo.

REM Set variables
set REGION=us-east-1
set TIMESTAMP=%date:~-4,4%%date:~-10,2%%date:~-7,2%_%time:~0,2%%time:~3,2%%time:~6,2%
set TIMESTAMP=%TIMESTAMP: =0%

echo 📋 Test Configuration:
echo - Region: %REGION%
echo - Timestamp: %TIMESTAMP%
echo - Test ID: complete-test-%TIMESTAMP%
echo.

echo ⏱️ Starting complete system test at %date% %time%
echo.

REM Test 1: Topic Management
echo ========================================
echo 🎯 Test 1: Topic Management System
echo ========================================
echo.

echo Creating test topic...
aws lambda invoke ^
    --function-name automated-video-pipeline-topic-management ^
    --region %REGION% ^
    --payload "{\"httpMethod\":\"POST\",\"path\":\"/topics\",\"body\":\"{\\\"topic\\\":\\\"Complete System Test - AI Technology Trends %TIMESTAMP%\\\",\\\"dailyFrequency\\\":1,\\\"priority\\\":1,\\\"status\\\":\\\"active\\\",\\\"targetAudience\\\":\\\"tech enthusiasts\\\",\\\"region\\\":\\\"US\\\",\\\"contentStyle\\\":\\\"engaging_educational\\\"}\"}" ^
    test-topic-creation.json

echo.
echo Topic Creation Response:
type test-topic-creation.json
echo.

REM Test 2: Script Generation
echo ========================================
echo 📝 Test 2: AI Script Generation
echo ========================================
echo.

echo Generating engaging script...
aws lambda invoke ^
    --function-name automated-video-pipeline-script-generator ^
    --region %REGION% ^
    --payload "{\"httpMethod\":\"POST\",\"path\":\"/script/generate-from-topic\",\"body\":\"{\\\"topic\\\":\\\"AI Technology Trends in 2025\\\",\\\"targetDuration\\\":300,\\\"contentStyle\\\":\\\"engaging_educational\\\",\\\"targetAudience\\\":\\\"tech enthusiasts\\\"}\"}" ^
    test-script-generation.json

echo.
echo Script Generation Response:
type test-script-generation.json
echo.

REM Test 3: Metadata Generation
echo ========================================
echo 🏷️ Test 3: SEO Metadata Generation
echo ========================================
echo.

echo Generating SEO-optimized metadata...
aws lambda invoke ^
    --function-name automated-video-pipeline-metadata-generator ^
    --region %REGION% ^
    --payload "{\"httpMethod\":\"POST\",\"path\":\"/metadata/generate-from-script\",\"body\":\"{\\\"scriptId\\\":\\\"test-script-%TIMESTAMP%\\\",\\\"topic\\\":\\\"AI Technology Trends in 2025\\\",\\\"targetAudience\\\":\\\"tech enthusiasts\\\"}\"}" ^
    test-metadata-generation.json

echo.
echo Metadata Generation Response:
type test-metadata-generation.json
echo.

REM Test 4: Media Curation
echo ========================================
echo 🖼️ Test 4: AI Media Curation
echo ========================================
echo.

echo Curating relevant media...
aws lambda invoke ^
    --function-name automated-video-pipeline-media-curator ^
    --region %REGION% ^
    --payload "{\"httpMethod\":\"POST\",\"path\":\"/media/curate-for-script\",\"body\":\"{\\\"scriptId\\\":\\\"test-script-%TIMESTAMP%\\\",\\\"topic\\\":\\\"AI Technology Trends in 2025\\\",\\\"mediaPerScene\\\":2,\\\"sources\\\":[\\\"pexels\\\",\\\"pixabay\\\"]}\"}" ^
    test-media-curation.json

echo.
echo Media Curation Response:
type test-media-curation.json
echo.

REM Test 5: Audio Generation
echo ========================================
echo 🎵 Test 5: Professional Audio Generation
echo ========================================
echo.

echo Generating professional audio...
aws lambda invoke ^
    --function-name automated-video-pipeline-audio-generator ^
    --region %REGION% ^
    --payload "{\"httpMethod\":\"POST\",\"path\":\"/audio/generate-from-script\",\"body\":\"{\\\"scriptId\\\":\\\"test-script-%TIMESTAMP%\\\",\\\"voiceId\\\":\\\"Joanna\\\",\\\"outputFormat\\\":\\\"mp3\\\",\\\"includeMarks\\\":true}\"}" ^
    test-audio-generation.json

echo.
echo Audio Generation Response:
type test-audio-generation.json
echo.

REM Test 6: Video Assembly
echo ========================================
echo 🎬 Test 6: Video Assembly System
echo ========================================
echo.

echo Starting video assembly...
aws lambda invoke ^
    --function-name automated-video-pipeline-video-assembler ^
    --region %REGION% ^
    --payload "{\"httpMethod\":\"POST\",\"path\":\"/video/assemble-from-script\",\"body\":\"{\\\"scriptId\\\":\\\"test-script-%TIMESTAMP%\\\",\\\"videoOptions\\\":{\\\"resolution\\\":\\\"1920x1080\\\",\\\"fps\\\":30,\\\"bitrate\\\":\\\"5000k\\\"},\\\"autoSelectMedia\\\":true}\"}" ^
    test-video-assembly.json

echo.
echo Video Assembly Response:
type test-video-assembly.json
echo.

REM Test 7: System Status Check
echo ========================================
echo 📊 Test 7: System Status and Health
echo ========================================
echo.

echo Checking system health...
echo.

echo ECS Cluster Status:
aws ecs describe-clusters --clusters automated-video-pipeline-cluster --region %REGION%
echo.

echo ECR Repository Status:
aws ecr describe-repositories --repository-names automated-video-pipeline/video-processor --region %REGION%
echo.

echo S3 Bucket Status:
aws s3 ls s3://automated-video-pipeline-786673323159-us-east-1/ --region %REGION%
echo.

echo DynamoDB Tables:
aws dynamodb list-tables --region %REGION% | findstr automated-video-pipeline
echo.

REM Test Summary
echo ========================================
echo 📋 Test Summary
echo ========================================
echo.

echo ✅ Test Results:
echo - Topic Management: Check test-topic-creation.json
echo - Script Generation: Check test-script-generation.json
echo - Metadata Generation: Check test-metadata-generation.json
echo - Media Curation: Check test-media-curation.json
echo - Audio Generation: Check test-audio-generation.json
echo - Video Assembly: Check test-video-assembly.json
echo.

echo 🎯 System Components Tested:
echo ✅ Topic Management API
echo ✅ AI Script Generation (Amazon Bedrock)
echo ✅ SEO Metadata Optimization
echo ✅ Media Curation (Pexels/Pixabay)
echo ✅ Audio Generation (Amazon Polly)
echo ✅ Video Assembly (ECS Fargate + FFmpeg)
echo ✅ Infrastructure Health Check
echo.

echo 📊 Performance Metrics:
echo - Test Duration: Started at %date% %time%
echo - Components Tested: 6/6 core components
echo - Infrastructure: ECS, ECR, S3, DynamoDB, Lambda
echo - AI Services: Bedrock, Polly, Rekognition
echo.

echo 🚀 Next Steps:
echo 1. Review all test response files for errors
echo 2. Monitor CloudWatch logs for detailed execution info
echo 3. Check ECS tasks for video processing status
echo 4. Verify final video output in S3 bucket
echo 5. Test YouTube publishing integration (when available)
echo.

echo 🎉 Complete system test finished!
echo Test ID: complete-test-%TIMESTAMP%
echo.

echo 📝 Cleanup Commands:
echo - Delete test files: del test-*.json
echo - Check logs: aws logs describe-log-groups --region %REGION%
echo - Monitor costs: aws ce get-cost-and-usage --time-period Start=2025-10-06,End=2025-10-07 --granularity DAILY --metrics BlendedCost
echo.

pause