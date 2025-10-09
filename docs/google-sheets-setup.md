# Google Sheets Integration Setup Guide

This guide walks you through setting up Google Sheets integration for the Automated Video Pipeline.

## 📋 Overview

The system uses a **simplified, no-API-key approach** that reads topics directly from publicly shared Google Sheets using CSV export. No Google Cloud project or service account required!

### **Simplified Setup**
1. Create a Google Sheets document
2. Set sharing to "Anyone with the link can view"
3. Configure the sheet URL in the system
4. The system automatically converts to CSV export format

### **Required Sheet Format**
| Topic | Daily Frequency | Priority | Status |
|-------|----------------|----------|--------|
| Investing for beginners in the USA | 2 | 1 | active |
| Travel to Mexico | 1 | 3 | active |

## 🔧 Simple Setup Steps

### Step 1: Create Google Sheets Document

1. Go to [Google Sheets](https://sheets.google.com)
2. Create a new spreadsheet
3. Set up the required columns (see format below)
4. Add your video topics

### Step 2: Configure Sharing

1. Click the **Share** button in your spreadsheet
2. Change access to **"Anyone with the link can view"**
3. Copy the spreadsheet URL
4. The system will automatically convert this to CSV export format

### Step 3: Configure System

The system automatically handles URL conversion:
- **Input**: `https://docs.google.com/spreadsheets/d/ABC123/edit#gid=0`
- **Output**: `https://docs.google.com/spreadsheets/d/ABC123/export?format=csv&gid=0`

**No API keys, service accounts, or Google Cloud setup required!**

## 📊 Simplified Spreadsheet Format

### Required Columns (Simplified)

| Column | Description | Example | Required |
|--------|-------------|---------|----------|
| **Topic** | Basic topic idea | "Investing for beginners in the USA" | ✅ Yes |
| **Daily Frequency** | Videos per day | 2 | ✅ Yes |
| **Status** | active, paused, completed, archived | "active" | ❌ No (default: active) |
| **Notes** | Additional context | "Simple steps to start" | ❌ No |

### Your Actual Spreadsheet Content

**Spreadsheet URL:** https://docs.google.com/spreadsheets/d/1WnUJredElhFEgXAhnnNtcbjmJ1l9t3i1YNnYblVOaao

**Expected Format:**
```
Topic                                    | Daily Frequency | Status | Notes
Investing for beginners in the USA      | 2              | active | Simple steps to start
Travel to Mexico                        | 1              | active | Budget-friendly options
Healthy meal prep ideas                 | 3              | active | Quick and easy recipes
Tech gadgets 2025                       | 1              | paused | Wait for CES announcements
Home workout routines                   | 2              | active | No equipment needed
```

### How AI Processes Your Topics

**Your Input:** "Investing for beginners in the USA" + Daily Frequency: 2

**AI Analysis:** The Trend Research Analyst will:
1. Analyze current investment trends from last 7 days
2. Identify what's popular among beginners
3. Find trending investment apps, strategies, and news
4. Generate 2 engaging video topics per day like:
   - "This App Turned $50 Into $127 in 3 Weeks (Beginners Only)"
   - "Why 90% of Beginners Choose the Wrong Investment App"
   - "5 Investment Mistakes That Cost Me $2,000 (Don't Do This)"
   - "Robinhood vs Acorns: The Shocking Truth They Don't Tell You"

**Result:** You get fresh, engaging, click-worthy video topics that are designed to grow your subscriber base!

## 🔄 Sync Behavior

### Automatic Sync
- Runs every 15 minutes by default
- Detects changes in your spreadsheet
- Updates existing topics or creates new ones
- Archives topics removed from spreadsheet

### Manual Sync
```bash
# Trigger manual sync via API
curl -X POST https://your-api-gateway-url/sync/sheets

# Test connection
curl -X GET https://your-api-gateway-url/sync/sheets/test

# View sync history
curl -X GET https://your-api-gateway-url/sync/sheets/history
```

## 🛠️ Troubleshooting

### Common Issues

**"Access denied to Google Sheets"**
- Verify service account email is shared with the spreadsheet
- Check that Google Sheets API is enabled in your project
- Ensure service account has proper permissions

**"Spreadsheet not found"**
- Verify the spreadsheet ID in the URL
- Make sure the spreadsheet is shared with the service account
- Check that the spreadsheet is not deleted

**"Invalid time format"**
- Use 24-hour format: `14:00` not `2:00 PM`
- Separate multiple times with commas: `09:00, 15:00, 21:00`
- Ensure no extra spaces around times

**"Topic validation failed"**
- Topics must be at least 10 characters long
- Priority must be a number between 1-10
- Status must be: active, paused, completed, or archived

### Debug Steps

1. **Test API Connection**
   ```bash
   curl -X GET https://your-api-gateway-url/sync/sheets/test
   ```

2. **Check CloudWatch Logs**
   - Go to AWS CloudWatch > Log Groups
   - Find `/aws/lambda/automated-video-sheets-sync`
   - Check recent log streams for errors

3. **Verify Spreadsheet Format**
   - Ensure headers are in row 1
   - Data starts from row 2
   - No empty rows between data

4. **Check Secrets Manager**
   ```bash
   aws secretsmanager get-secret-value \
     --secret-id automated-video-pipeline/api-credentials
   ```

## 📈 Monitoring

### Sync Reports
Each sync operation creates a detailed report including:
- Number of topics processed
- Topics created/updated/skipped
- Validation errors
- Processing time and costs

### Cost Tracking
- Google Sheets API calls: ~$0.001 per sync
- Lambda execution: ~$0.002 per sync
- DynamoDB operations: ~$0.001 per topic

### Performance
- Typical sync time: 2-5 seconds for 50 topics
- Memory usage: ~100MB
- API rate limits: 100 requests/100 seconds per user

## 🔒 Security Best Practices

1. **Service Account Security**
   - Store private key securely in AWS Secrets Manager
   - Use least privilege access (Viewer permission on spreadsheet)
   - Rotate service account keys periodically

2. **Spreadsheet Access**
   - Only share with necessary service accounts
   - Use specific sheet permissions, not entire Google Drive access
   - Monitor access logs in Google Admin Console

3. **AWS Security**
   - Use IAM roles with minimal required permissions
   - Enable CloudTrail for audit logging
   - Set up CloudWatch alarms for unusual activity

## 📞 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review CloudWatch logs for detailed error messages
3. Test the connection using the `/sync/sheets/test` endpoint
4. Verify your spreadsheet format matches the examples

The Google Sheets integration provides a user-friendly way to manage video topics without needing technical knowledge of APIs or databases!