# Trend Data Collection System

## Overview

The Trend Data Collection Lambda function is a multi-source data aggregation system that collects trending information from Google Trends, YouTube, Twitter, and News APIs. It processes and normalizes data from these sources to provide comprehensive trend insights for video topic generation.

## Features

### Multi-Source Data Collection
- **Google Trends**: Interest over time, related queries, rising queries, geographic data
- **YouTube Data API v3**: Trending videos, channel statistics, engagement metrics
- **Twitter API v2**: Recent tweets, engagement metrics, hashtag analysis, sentiment
- **News API**: Recent articles, publication trends, keyword frequency analysis

### Data Processing & Storage
- **Raw Data Storage**: Complete API responses stored in S3 for historical analysis
- **Processed Summaries**: Normalized trend summaries stored in DynamoDB
- **Trend Scoring**: Algorithmic scoring based on multiple engagement factors
- **Keyword Extraction**: Automated identification of trending keywords and topics

### Rate Limiting & Error Handling
- **API Rate Limiting**: Intelligent throttling to respect API quotas
- **Graceful Degradation**: Continues processing even if some sources fail
- **Retry Logic**: Automatic retries with exponential backoff
- **Cost Optimization**: Reserved concurrency to control API usage costs

## Architecture

### Data Flow
```
Topic Input → API Credentials → Multi-Source Collection → Data Processing → Storage
     ↓              ↓                    ↓                    ↓           ↓
Event Trigger → Secrets Manager → External APIs → Normalization → S3 + DynamoDB
```

### Storage Strategy
- **S3 Bucket**: Raw API responses with 30-day lifecycle policy
- **DynamoDB**: Processed trend summaries with TTL and GSI indexes
- **Secrets Manager**: Secure API credential storage

## API Integration

### Required API Keys

#### YouTube Data API v3
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Enable YouTube Data API v3
3. Create API key with YouTube Data API access
4. Add to Secrets Manager: `youtube.apiKey`

#### Twitter API v2
1. Apply for [Twitter Developer Account](https://developer.twitter.com/)
2. Create app and get Bearer Token
3. Add to Secrets Manager: `twitter.bearerToken`

#### News API
1. Sign up at [NewsAPI.org](https://newsapi.org/)
2. Get free API key (500 requests/day)
3. Add to Secrets Manager: `news.apiKey`

### Secrets Manager Configuration

Update the API credentials secret with your keys:

```json
{
  "youtube": {
    "apiKey": "your-youtube-api-key"
  },
  "twitter": {
    "bearerToken": "your-twitter-bearer-token"
  },
  "news": {
    "apiKey": "your-news-api-key"
  }
}
```

## Usage

### Trigger Trend Collection

```bash
curl -X POST https://your-api-url/trends/collect \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key" \
  -d '{
    "action": "collect",
    "topic": "investing for beginners",
    "sources": ["google-trends", "youtube", "twitter", "news"],
    "timeframe": "7d"
  }'
```

### Get Trend Data

```bash
curl -X GET "https://your-api-url/trends?topic=investing&limit=10" \
  -H "x-api-key: your-api-key"
```

### Response Format

```json
{
  "collectionId": "uuid",
  "topic": "investing for beginners",
  "sourcesProcessed": ["google-trends", "youtube", "twitter", "news"],
  "summary": {
    "overallScore": 87,
    "keyInsights": [
      "Google Trends average interest: 88/100",
      "YouTube videos found: 45",
      "Twitter engagement: 1250 interactions",
      "News articles: 23"
    ],
    "trendingKeywords": [
      "investment apps",
      "beginner investing",
      "stock market 2025",
      "portfolio diversification"
    ],
    "contentOpportunities": [
      "investment apps comparison",
      "beginner mistakes",
      "2025 market predictions"
    ]
  }
}
```

## Data Models

### Trend Summary (DynamoDB)
```json
{
  "collectionId": "uuid",
  "topic": "investing for beginners",
  "collectedAt": "2025-01-15T10:00:00.000Z",
  "completedAt": "2025-01-15T10:02:30.000Z",
  "sources": ["google-trends", "youtube", "twitter", "news"],
  "successfulSources": ["google-trends", "youtube", "twitter"],
  "failedSources": ["news"],
  "overallScore": 87,
  "keyInsights": ["..."],
  "trendingKeywords": ["..."],
  "contentOpportunities": ["..."],
  "ttl": 1738742400
}
```

### Raw Data (S3)
```json
{
  "collectionId": "uuid",
  "topic": "investing for beginners",
  "collectedAt": "2025-01-15T10:00:00.000Z",
  "data": {
    "google-trends": { "source": "google-trends", "data": {...} },
    "youtube": { "source": "youtube", "data": {...} },
    "twitter": { "source": "twitter", "data": {...} },
    "news": { "source": "news", "data": {...} }
  }
}
```

## Configuration

### Environment Variables
- `TRENDS_TABLE_NAME`: DynamoDB table for trend summaries
- `S3_BUCKET_NAME`: S3 bucket for raw trend data
- `API_CREDENTIALS_SECRET_NAME`: Secrets Manager secret name
- `AWS_REGION`: AWS region for services

### Lambda Configuration
- **Runtime**: Node.js 20.x
- **Memory**: 1024 MB (for data processing)
- **Timeout**: 10 minutes (for multiple API calls)
- **Reserved Concurrency**: 3 (to manage API rate limits)

## Cost Optimization

### API Usage Costs
- **YouTube API**: 100 quota units per search (~$0.01 per 1000 requests)
- **Twitter API v2**: Free tier (500,000 tweets/month)
- **News API**: Free tier (500 requests/day)
- **Google Trends**: Free (unofficial API)

### AWS Costs
- **Lambda**: ~$0.20 per 1M requests + compute time
- **DynamoDB**: Pay-per-request (~$1.25 per million writes)
- **S3**: ~$0.023 per GB/month (30-day lifecycle)
- **Secrets Manager**: ~$0.40 per secret/month

### Total Estimated Cost
- **Per trend collection**: ~$0.001-0.005
- **Monthly (100 collections/day)**: ~$3-15

## Monitoring & Troubleshooting

### CloudWatch Metrics
- Lambda invocations and duration
- Error rates by source
- API quota usage
- DynamoDB read/write metrics

### Common Issues

**"YouTube API quota exceeded"**
- Check Google Cloud Console quota usage
- Implement request batching
- Consider upgrading to paid tier

**"Twitter rate limit exceeded"**
- Reduce collection frequency
- Implement exponential backoff
- Check bearer token validity

**"News API limit reached"**
- Free tier limited to 500 requests/day
- Upgrade to paid plan for higher limits
- Cache results to reduce API calls

### Debug Mode

Set environment variable for detailed logging:
```bash
DEBUG=true
```

## Integration with Video Pipeline

### Workflow Integration
1. **Topic Input**: From topic management system
2. **Trend Collection**: Automated via EventBridge schedule
3. **Data Processing**: AI analysis of trend data
4. **Content Generation**: Use trends for script creation

### Next Steps
- **Task 3.2**: AI-powered topic generation using trend data
- **Task 3.3**: Trend data processing and scoring algorithms
- **Integration**: Connect with content generation pipeline

## Security

### API Key Management
- All credentials stored in AWS Secrets Manager
- IAM roles with least privilege access
- No hardcoded credentials in code
- Automatic credential rotation support

### Data Privacy
- No personal data stored from social media
- Aggregate trend data only
- Compliance with API terms of service
- 30-day data retention policy

## Testing

### Test Events
Use the provided test events in `test-events.json`:
- All sources collection
- Single source testing
- Error scenario testing
- Custom timeframe testing

### Integration Testing
```bash
# Test with real APIs (requires valid credentials)
npm run test:integration:trends

# Test with mock data
npm run test:unit:trends
```

## Future Enhancements

### Additional Sources
- Reddit API for community trends
- TikTok API for short-form video trends
- Instagram API for visual content trends
- LinkedIn API for professional content

### Advanced Analytics
- Sentiment analysis improvements
- Trend prediction algorithms
- Cross-source correlation analysis
- Real-time trend monitoring

### Performance Optimizations
- Parallel API calls
- Intelligent caching
- Predictive data collection
- Cost-based source selection