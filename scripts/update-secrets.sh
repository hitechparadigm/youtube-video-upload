#!/bin/bash

# Update AWS Secrets Manager with API Credentials
# This script updates the automated-video-pipeline/api-credentials secret with all necessary API keys

echo "🔐 Updating AWS Secrets Manager with API credentials..."

# Update the secret with all API credentials
aws secretsmanager update-secret \
  --secret-id automated-video-pipeline/api-credentials \
  --secret-string '{
    "youtubeClientId": "YOUR_YOUTUBE_CLIENT_ID",
    "youtubeClientSecret": "YOUR_YOUTUBE_CLIENT_SECRET",
    "youtubeRefreshToken": "YOUR_YOUTUBE_REFRESH_TOKEN",
    "youtubeApiKey": "YOUR_YOUTUBE_API_KEY",
    "pexelsApiKey": "YOUR_PEXELS_API_KEY",
    "pixabayApiKey": "",
    "googleTrendsApiKey": "",
    "twitterBearerToken": "",
    "newsApiKey": "",
    "googleSheetsServiceAccountEmail": "",
    "googleSheetsServiceAccountPrivateKey": ""
  }' \
  --region us-east-1

if [ $? -eq 0 ]; then
    echo "✅ Successfully updated API credentials in AWS Secrets Manager!"
    echo ""
    echo "📋 Credentials Added:"
    echo "  ✅ YouTube Client ID"
    echo "  ✅ YouTube Client Secret" 
    echo "  ✅ YouTube Refresh Token"
    echo "  ✅ YouTube API Key"
    echo "  ✅ Pexels API Key"
    echo ""
    echo "📝 Still Need (Optional):"
    echo "  ⏳ Google Sheets Service Account (for spreadsheet sync)"
    echo "  ⏳ Pixabay API Key (additional media source)"
    echo "  ⏳ Google Trends API Key (enhanced trend analysis)"
    echo "  ⏳ Twitter Bearer Token (social media trends)"
    echo "  ⏳ News API Key (news trend analysis)"
    echo ""
    echo "🚀 Ready to deploy! Run: npm run deploy"
else
    echo "❌ Failed to update secrets. Please check your AWS credentials and try again."
    exit 1
fi