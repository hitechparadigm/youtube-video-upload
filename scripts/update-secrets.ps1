# PowerShell script to update AWS Secrets Manager with API Credentials
# This script updates the automated-video-pipeline/api-credentials secret with all necessary API keys

Write-Host "🔐 Updating AWS Secrets Manager with API credentials..." -ForegroundColor Cyan

# Create the secret JSON
$secretJson = @{
    youtubeClientId = "YOUR_YOUTUBE_CLIENT_ID"
    youtubeClientSecret = "YOUR_YOUTUBE_CLIENT_SECRET"
    youtubeRefreshToken = "YOUR_YOUTUBE_REFRESH_TOKEN"
    youtubeApiKey = "YOUR_YOUTUBE_API_KEY"
    pexelsApiKey = "YOUR_PEXELS_API_KEY"
    pixabayApiKey = ""
    googleTrendsApiKey = ""
    twitterBearerToken = ""
    newsApiKey = ""
    googleSheetsServiceAccountEmail = ""
    googleSheetsServiceAccountPrivateKey = ""
} | ConvertTo-Json -Compress

try {
    # Update the secret
    aws secretsmanager update-secret `
        --secret-id automated-video-pipeline/api-credentials `
        --secret-string $secretJson `
        --region us-east-1

    Write-Host "✅ Successfully updated API credentials in AWS Secrets Manager!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Credentials Added:" -ForegroundColor Yellow
    Write-Host "  ✅ YouTube Client ID" -ForegroundColor Green
    Write-Host "  ✅ YouTube Client Secret" -ForegroundColor Green
    Write-Host "  ✅ YouTube Refresh Token" -ForegroundColor Green
    Write-Host "  ✅ YouTube API Key" -ForegroundColor Green
    Write-Host "  ✅ Pexels API Key" -ForegroundColor Green
    Write-Host ""
    Write-Host "📝 Still Need (Optional):" -ForegroundColor Yellow
    Write-Host "  ⏳ Google Sheets Service Account (for spreadsheet sync)" -ForegroundColor Gray
    Write-Host "  ⏳ Pixabay API Key (additional media source)" -ForegroundColor Gray
    Write-Host "  ⏳ Google Trends API Key (enhanced trend analysis)" -ForegroundColor Gray
    Write-Host "  ⏳ Twitter Bearer Token (social media trends)" -ForegroundColor Gray
    Write-Host "  ⏳ News API Key (news trend analysis)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "🚀 Ready to deploy! Run: npm run deploy" -ForegroundColor Cyan
}
catch {
    Write-Host "❌ Failed to update secrets. Please check your AWS credentials and try again." -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}