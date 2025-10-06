# AI Topic Generator Service

## Overview

The AI Topic Generator service uses Amazon Bedrock (Claude 3 Sonnet) to analyze trends and generate highly engaging, specific video topics from basic topic inputs. This service is designed to create viral, subscriber-focused content that drives high watch time and engagement.

## Features

### 🤖 AI-Powered Topic Generation
- Uses Amazon Bedrock Claude 3 Sonnet for intelligent topic creation
- Generates engaging titles with proven viral formats
- Creates compelling hooks and content angles
- Incorporates current trends naturally

### 📊 Trend Analysis Integration
- Analyzes recent trend data from multiple sources
- Synthesizes insights from Google Trends, YouTube, Twitter, and news
- Provides momentum analysis and content opportunities
- Offers timing recommendations for optimal publishing

### 🎯 Engagement Optimization
- Focuses on subscriber growth and retention
- Uses proven formats like "Secrets", "Mistakes", "Shocking Truth"
- Creates curiosity-driven titles without clickbait
- Includes engagement scoring and ranking

### 🔄 Intelligent Fallback
- Provides backup topic generation when AI is unavailable
- Maintains service reliability with fallback algorithms
- Ensures continuous content creation capability

## API Endpoints

### POST /ai-topics/generate
Generate AI-powered video topics from basic inputs.

**Request Body:**
```json
{
  "baseTopic": "investing for beginners",
  "frequency": 2,
  "targetAudience": "millennials",
  "contentStyle": "engaging"
}
```

**Response:**
```json
{
  "baseTopic": "investing for beginners",
  "generatedTopics": [
    {
      "title": "5 Investment Secrets Millennials Need to Know in 2025",
      "hook": "What if I told you most investment advice is keeping you poor?",
      "angle": "Contrarian perspective on traditional investment wisdom",
      "keywords": ["investing", "millennials", "secrets", "2025"],
      "engagementScore": 8.5,
      "format": "secrets",
      "finalScore": 9.2,
      "trendingKeywords": 2,
      "createdAt": "2025-01-06T15:30:00Z"
    }
  ],
  "storedCount": 5,
  "trendDataUsed": true
}
```

### POST /ai-topics/analyze
Analyze current trends for a given topic using AI.

**Request Body:**
```json
{
  "topic": "cryptocurrency",
  "timeframe": "7d"
}
```

**Response:**
```json
{
  "topic": "cryptocurrency",
  "timeframe": "7d",
  "trendCount": 15,
  "analysis": {
    "summary": "Cryptocurrency trends show increasing interest in DeFi and regulatory clarity",
    "momentum": "increasing",
    "insights": [
      "DeFi protocols gaining mainstream attention",
      "Regulatory news driving volatility",
      "Institutional adoption accelerating"
    ],
    "opportunities": [
      "Create beginner DeFi guides",
      "Explain regulatory impacts",
      "Compare institutional vs retail strategies"
    ],
    "recommendations": [
      "Focus on educational content",
      "Address regulatory concerns",
      "Highlight practical applications"
    ]
  },
  "lastUpdated": "2025-01-06T15:30:00Z"
}
```

### GET /ai-topics/suggestions
Get high-performing topic suggestions based on historical data.

**Query Parameters:**
- `category` (optional): Filter by topic category
- `limit` (optional): Number of suggestions to return (default: 10)

**Response:**
```json
{
  "suggestions": [
    {
      "topicId": "topic-123",
      "title": "The Crypto Mistake That Cost Me $50,000",
      "engagementScore": 9.1,
      "keywords": ["crypto", "mistakes", "loss"],
      "createdAt": "2025-01-05T10:00:00Z"
    }
  ],
  "category": "finance",
  "count": 1
}
```

## AI Prompt Engineering

### Topic Generation Prompts
The service uses carefully crafted prompts to generate engaging content:

```
You are an expert YouTube content strategist specializing in viral, engaging content that drives subscriptions and high watch time.

Base Topic: "{baseTopic}"
Target Audience: {targetAudience}
Content Style: {contentStyle}
Videos Needed: {frequency} per day
Current Trends: {trendContext}

Generate {frequency * 3} highly engaging, specific video topic ideas that will:
1. Hook viewers in the first 5 seconds
2. Drive high watch time and engagement
3. Encourage subscriptions and return viewers
4. Incorporate current trends naturally
5. Use proven viral formats
```

### Proven Viral Formats
- "The Shocking Truth About..."
- "5 Secrets [Experts] Don't Want You to Know"
- "I Tried [Trend] for 30 Days - Here's What Happened"
- "Why Everyone is Wrong About..."
- "The [Number] Mistakes That Are Costing You..."

## Scoring Algorithm

### Engagement Score Calculation
1. **Base Score**: AI-generated engagement score (1-10)
2. **Trending Boost**: +1.5 points per trending keyword match
3. **Format Boost**: +1 point for proven viral formats
4. **Final Score**: Normalized to 1-10 range

### Ranking Factors
- AI-predicted engagement potential
- Trending keyword relevance
- Proven format usage
- Content freshness and timeliness

## Configuration

### Environment Variables
- `TOPICS_TABLE_NAME`: DynamoDB table for storing topics
- `TRENDS_TABLE_NAME`: DynamoDB table for trend data
- `BEDROCK_MODEL_ID`: AI model to use (default: Claude 3 Sonnet)
- `BEDROCK_MODEL_REGION`: Region for Bedrock service
- `AWS_REGION`: AWS region for services
- `NODE_ENV`: Environment (production/development)

### AI Model Configuration
The service supports multiple AI models. See [AI Model Configuration Guide](./ai-model-configuration.md) for:
- Switching between Claude 3.5 Sonnet, Claude 3 Sonnet, Claude 3 Haiku
- Cost optimization strategies
- Regional availability
- Performance comparisons

### IAM Permissions Required
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel"
      ],
      "Resource": [
        "arn:aws:bedrock:*::foundation-model/anthropic.claude-3-sonnet-20240229-v1:0"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:Query",
        "dynamodb:Scan"
      ],
      "Resource": [
        "arn:aws:dynamodb:*:*:table/topics-table",
        "arn:aws:dynamodb:*:*:table/trends-table"
      ]
    }
  ]
}
```

## Error Handling

### Bedrock Failures
- Automatic fallback to rule-based topic generation
- Maintains service availability during AI outages
- Logs errors for monitoring and debugging

### Rate Limiting
- Implements exponential backoff for API calls
- Respects Bedrock model invocation limits
- Queues requests during high-traffic periods

### Data Validation
- Validates input parameters and formats
- Sanitizes AI-generated content
- Ensures topic quality and appropriateness

## Monitoring and Metrics

### CloudWatch Metrics
- Topic generation success rate
- AI model invocation latency
- Engagement score distribution
- Error rates by endpoint

### Logging
- Structured JSON logging for analysis
- Request/response tracking
- Performance metrics
- Error details and stack traces

## Best Practices

### Content Quality
- Focus on educational and entertaining value
- Avoid misleading or clickbait content
- Ensure factual accuracy in generated topics
- Maintain brand consistency

### Performance Optimization
- Cache frequently requested topics
- Batch process multiple topic requests
- Optimize AI prompt length and complexity
- Monitor and tune engagement scoring

### Cost Management
- Monitor Bedrock usage and costs
- Implement request throttling
- Use fallback generation to reduce AI calls
- Optimize memory and timeout settings

## Integration Examples

### Generate Topics for Daily Content
```javascript
const response = await fetch('/ai-topics/generate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Api-Key': 'your-api-key'
  },
  body: JSON.stringify({
    baseTopic: 'personal finance',
    frequency: 2,
    targetAudience: 'young professionals',
    contentStyle: 'educational'
  })
});

const data = await response.json();
console.log(`Generated ${data.generatedTopics.length} topics`);
```

### Analyze Market Trends
```javascript
const analysis = await fetch('/ai-topics/analyze', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Api-Key': 'your-api-key'
  },
  body: JSON.stringify({
    topic: 'artificial intelligence',
    timeframe: '7d'
  })
});

const insights = await analysis.json();
console.log('Market momentum:', insights.analysis.momentum);
```

## Future Enhancements

### Planned Features
- Multi-language topic generation
- A/B testing for topic variations
- Seasonal trend integration
- Competitor analysis integration
- Custom format templates

### AI Model Upgrades
- Support for newer Claude models
- Multi-model ensemble approaches
- Fine-tuning for specific niches
- Custom prompt optimization

## Troubleshooting

### Common Issues
1. **Bedrock Access Denied**: Verify IAM permissions for model access
2. **Topic Quality Issues**: Review and adjust AI prompts
3. **High Latency**: Check memory allocation and timeout settings
4. **Cost Concerns**: Monitor usage and implement caching

### Debug Mode
Enable detailed logging by setting `NODE_ENV=development` for enhanced debugging information.