@echo off
REM Test Video Assembly System
REM Tests the complete video assembly pipeline

echo 🎬 Testing Video Assembly System...
echo.

REM Set variables
set LAMBDA_NAME=automated-video-pipeline-video-assembler
set REGION=us-east-1

echo 📋 Testing video assembly from script...

REM Test 1: Assemble video from script
echo.
echo Test 1: Assemble video from existing script and audio
aws lambda invoke ^
    --function-name %LAMBDA_NAME% ^
    --region %REGION% ^
    --payload "{\"httpMethod\":\"POST\",\"path\":\"/video/assemble-from-script\",\"body\":\"{\\\"scriptId\\\":\\\"test-script-001\\\",\\\"videoOptions\\\":{\\\"resolution\\\":\\\"1920x1080\\\",\\\"fps\\\":30,\\\"bitrate\\\":\\\"5000k\\\"},\\\"autoSelectMedia\\\":true,\\\"mediaPerScene\\\":2}\"}" ^
    test-video-assembly-response.json

echo.
echo Response:
type test-video-assembly-response.json
echo.

REM Test 2: Generate video preview
echo Test 2: Generate video preview
aws lambda invoke ^
    --function-name %LAMBDA_NAME% ^
    --region %REGION% ^
    --payload "{\"httpMethod\":\"POST\",\"path\":\"/video/preview\",\"body\":\"{\\\"scriptId\\\":\\\"test-script-001\\\",\\\"audioId\\\":\\\"test-audio-001\\\",\\\"previewDuration\\\":30}\"}" ^
    test-video-preview-response.json

echo.
echo Preview Response:
type test-video-preview-response.json
echo.

REM Test 3: Check video status
echo Test 3: Check video status
aws lambda invoke ^
    --function-name %LAMBDA_NAME% ^
    --region %REGION% ^
    --payload "{\"httpMethod\":\"GET\",\"path\":\"/video/status\",\"queryStringParameters\":{\"videoId\":\"test-video-001\"}}" ^
    test-video-status-response.json

echo.
echo Status Response:
type test-video-status-response.json
echo.

REM Test 4: Manual video assembly with specific components
echo Test 4: Manual video assembly with components
aws lambda invoke ^
    --function-name %LAMBDA_NAME% ^
    --region %REGION% ^
    --payload "{\"httpMethod\":\"POST\",\"path\":\"/video/assemble\",\"body\":\"{\\\"scriptId\\\":\\\"test-script-001\\\",\\\"audioId\\\":\\\"test-audio-001\\\",\\\"mediaItems\\\":[{\\\"s3Key\\\":\\\"media/test-image-1.jpg\\\",\\\"type\\\":\\\"image\\\",\\\"keywords\\\":[\\\"business\\\",\\\"success\\\"]},{\\\"s3Key\\\":\\\"media/test-image-2.jpg\\\",\\\"type\\\":\\\"image\\\",\\\"keywords\\\":[\\\"technology\\\",\\\"innovation\\\"]}],\\\"videoOptions\\\":{\\\"outputFormat\\\":\\\"mp4\\\",\\\"resolution\\\":\\\"1920x1080\\\",\\\"fps\\\":30,\\\"bitrate\\\":\\\"5000k\\\"}}\"}" ^
    test-manual-assembly-response.json

echo.
echo Manual Assembly Response:
type test-manual-assembly-response.json
echo.

echo ✅ Video Assembly System tests completed!
echo.
echo 📊 Test Results Summary:
echo - Video assembly from script: Check test-video-assembly-response.json
echo - Video preview generation: Check test-video-preview-response.json  
echo - Video status checking: Check test-video-status-response.json
echo - Manual video assembly: Check test-manual-assembly-response.json
echo.
echo 🔍 Next Steps:
echo 1. Check ECS Fargate tasks in AWS Console
echo 2. Monitor CloudWatch logs for video processing
echo 3. Verify final videos are uploaded to S3
echo 4. Test with real script and audio data

pause