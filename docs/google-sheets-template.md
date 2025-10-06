# Google Sheets Template for Topic Management

## Overview

This document describes the Google Sheets template format for managing video topics. The system can read any publicly accessible Google Sheets document that follows this structure.

## Sheet Structure

### Required Headers (Row 1)
The first row must contain these headers (case-insensitive):

| Column | Header | Required | Description |
|--------|--------|----------|-------------|
| A | Topic | ✅ Yes | The main topic for video generation |
| B | Daily Frequency | ❌ No | Number of videos per day (1-10, default: 1) |
| C | Priority | ❌ No | Priority level (1-10, default: 5) |
| D | Status | ❌ No | active, paused, or archived (default: active) |
| E | Target Audience | ❌ No | Target audience description (default: general) |
| F | Region | ❌ No | Target region: US, CA, UK, AU, EU (default: US) |
| G | Content Style | ❌ No | engaging_educational, entertainment, professional, casual |
| H | Tags | ❌ No | Comma-separated tags for categorization |

### Sample Data

```
Topic                              | Daily Frequency | Priority | Status | Target Audience | Region | Content Style        | Tags
Investing for beginners in the USA | 2              | 1        | active | beginners       | US     | engaging_educational | investing,finance,beginners
Travel tips for Europe             | 1              | 3        | active | travelers       | EU     | entertainment        | travel,europe,tips
Cooking healthy meals              | 1              | 5        | paused | health-conscious| US     | professional         | cooking,health,recipes
```

## Google Sheets Setup

### 1. Create Your Spreadsheet
1. Go to [Google Sheets](https://sheets.google.com)
2. Create a new spreadsheet
3. Add the headers in row 1
4. Add your topic data starting from row 2

### 2. Make It Accessible
**Option A: Public Access (Recommended)**
1. Click "Share" button
2. Click "Change to anyone with the link"
3. Set permission to "Viewer"
4. Copy the link

**Option B: Specific Access**
1. Click "Share" button
2. Add specific email addresses with "Viewer" permission
3. Copy the link

### 3. Get the Correct URL Format
The system accepts these URL formats:
- `https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/edit#gid=0`
- `https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/edit#gid={SHEET_ID}`

## Sync Modes

### Incremental (Default)
- Only updates topics that have changed since last sync
- Safest option for regular syncing
- Preserves local changes made via API

### Overwrite
- Updates all topics from the sheet
- Overwrites any local changes
- Use when you want sheet to be the source of truth

### Merge
- Only updates fields that have actually changed
- Compares field-by-field differences
- Best for collaborative editing scenarios

## Validation Rules

### Topic (Required)
- Must not be empty
- Maximum 200 characters
- Will be used to generate keywords automatically

### Daily Frequency (Optional)
- Integer between 1 and 10
- Default: 1
- Invalid values will show warnings but won't fail sync

### Priority (Optional)
- Integer between 1 and 10 (1 = highest priority)
- Default: 5
- Used for scheduling order

### Status (Optional)
- Must be: "active", "paused", or "archived"
- Default: "active"
- Case-insensitive

### Target Audience (Optional)
- Free text, maximum 100 characters
- Default: "general"
- Used for content personalization

### Region (Optional)
- Must be: "US", "CA", "UK", "AU", or "EU"
- Default: "US"
- Affects trend analysis and content localization

### Content Style (Optional)
- Must be: "engaging_educational", "entertainment", "professional", or "casual"
- Default: "engaging_educational"
- Influences script generation style

### Tags (Optional)
- Comma-separated list
- Used for categorization and filtering
- Example: "investing,finance,beginners"

## API Usage

### Sync Topics
```bash
curl -X POST https://your-api-gateway-url/sync \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key" \
  -d '{
    "action": "sync",
    "spreadsheetUrl": "https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit#gid=0",
    "syncMode": "incremental"
  }'
```

### Validate Sheet Structure
```bash
curl -X POST https://your-api-gateway-url/sync/validate \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key" \
  -d '{
    "action": "validate",
    "spreadsheetUrl": "https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit#gid=0"
  }'
```

### Get Sync History
```bash
curl -X GET "https://your-api-gateway-url/sync/history?limit=10" \
  -H "x-api-key: your-api-key"
```

## Best Practices

### Sheet Organization
- Keep one topic per row
- Use consistent formatting
- Avoid empty rows in the middle of data
- Use the first sheet (gid=0) for simplicity

### Content Guidelines
- Write clear, specific topics
- Use proper capitalization
- Include target keywords in topic text
- Keep topics focused and actionable

### Sync Strategy
- Use "incremental" mode for regular syncing
- Use "validate" before first sync to check format
- Monitor sync history for errors
- Set up scheduled syncing for automation

### Error Handling
- Check validation results before syncing
- Review sync history for failed operations
- Fix sheet formatting issues promptly
- Use specific sheet URLs (with gid) for multiple sheets

## Troubleshooting

### Common Issues

**"No data found in sheet"**
- Check if sheet is publicly accessible
- Verify the URL format is correct
- Ensure sheet has data beyond just headers

**"Invalid Google Sheets URL format"**
- Use the full Google Sheets URL
- Include the spreadsheet ID in the URL
- Don't use shortened URLs

**"HTTP 403: Forbidden"**
- Sheet is not publicly accessible
- Change sharing settings to "Anyone with the link"
- Ensure viewer permissions are granted

**"Empty response from Google Sheets"**
- Sheet might be empty
- Check if correct sheet tab is selected (gid parameter)
- Verify sheet contains data

### Getting Help
- Check CloudWatch logs for detailed error messages
- Use the validate endpoint to check sheet structure
- Review sync history for patterns in failures
- Ensure sheet follows the exact template format

## Example Template

You can copy this [sample Google Sheet](https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit#gid=0) as a starting point for your own topic management.