# 🔧 Troubleshooting Guide: Media Download Issues

## 🚨 Critical Issue: Placeholder Images Instead of Real Media

### **Symptoms**
- Media Curator reports "success" but downloads tiny files (47-53 bytes)
- All media files have `"source": "fallback"` in API responses
- Video files are instruction JSON files instead of real MP4s
- No actual videos appear on YouTube channel despite "successful" publishing

### **Root Cause Analysis**

#### **Primary Cause: Missing Secrets Manager Permission**
The Media Curator Lambda function requires `secretsmanager:GetSecretValue` permission to retrieve API keys from AWS Secrets Manager.

**Without this permission:**
- ❌ Cannot access Pexels, Pixabay, or Google Places API keys
- ❌ Falls back to generating placeholder text files
- ❌ Reports "success" but creates 47-53 byte text files
- ❌ Duplicate prevention works on placeholders (not real content)

**With this permission:**
- ✅ Accesses all external API keys successfully
- ✅ Downloads real MB-sized images and videos
- ✅ Duplicate prevention works on actual unique content
- ✅ Creates real MP4 videos for YouTube

---

## 🔍 Diagnostic Steps

### **Step 1: Check File Sizes**
```bash
# Run this diagnostic script
node debug-media-curator.js

# Look for these indicators:
# ❌ BAD: Size: 47 bytes, Source: fallback
# ✅ GOOD: Size: 2847392 bytes, Source: pexels
```

### **Step 2: Verify IAM Permissions**
Check the SAM template (`template-simplified.yaml`) for Media Curator:

```yaml
MediaCuratorFunction:
  Type: AWS::Serverless::Function
  Properties:
    # ... other properties ...
    Policies:
      - S3FullAccessPolicy:
          BucketName: !Ref VideoBucket
      - DynamoDBCrudPolicy:
          TableName: !Ref ContextTable
      # ✅ THIS MUST BE PRESENT:
      - Statement:
          Effect: Allow
          Action:
            - secretsmanager:GetSecretValue
          Resource: !Sub 'arn:aws:secretsmanager:${AWS::Region}:${AWS::AccountId}:secret:automated-video-pipeline/api-keys*'
```

### **Step 3: Verify Secrets Manager Configuration**
```bash
# Check if the secret exists
aws secretsmanager get-secret-value \
  --secret-id "automated-video-pipeline/api-keys" \
  --region us-east-1

# Expected structure:
{
  "pexels-api-key": "your-pexels-key",
  "pixabay-api-key": "your-pixabay-key",
  "google-places-api-key": "your-google-places-key"
}
```

### **Step 4: Check CloudWatch Logs**
Look for these error patterns in Media Curator logs:
```
❌ "API keys retrieval failed"
❌ "AccessDenied" or "UnauthorizedOperation"
❌ "Falling back to placeholder images"
✅ "Retrieved API keys for 3 services"
✅ "Downloaded real image from pexels"
```

---

## 🛠️ Fix Procedures

### **Fix 1: Add Secrets Manager Permission (Primary Fix)**

1. **Update SAM Template**:
   ```yaml
   # In template-simplified.yaml, add to MediaCuratorFunction policies:
   - Statement:
       Effect: Allow
       Action:
         - secretsmanager:GetSecretValue
       Resource: !Sub 'arn:aws:secretsmanager:${AWS::Region}:${AWS::AccountId}:secret:automated-video-pipeline/api-keys*'
   ```

2. **Deploy the Fix**:
   ```bash
   sam build --template-file template-simplified.yaml
   sam deploy
   ```

3. **Verify the Fix**:
   ```bash
   # Test media curation after deployment
   node debug-media-curator.js

   # Should now show:
   # ✅ Size: 2847392 bytes, Source: pexels
   # ✅ Size: 1456789 bytes, Source: pixabay
   ```

### **Fix 2: Verify API Keys in Secrets Manager**

1. **Check Secret Exists**:
   ```bash
   aws secretsmanager describe-secret \
     --secret-id "automated-video-pipeline/api-keys"
   ```

2. **Update API Keys if Needed**:
   ```bash
   aws secretsmanager update-secret \
     --secret-id "automated-video-pipeline/api-keys" \
     --secret-string '{
       "pexels-api-key": "your-actual-pexels-key",
       "pixabay-api-key": "your-actual-pixabay-key",
       "google-places-api-key": "your-actual-google-places-key"
     }'
   ```

### **Fix 3: Validate API Key Formats**

Ensure your API keys are valid:
- **Pexels**: Should be a long alphanumeric string
- **Pixabay**: Should be a numeric string followed by dash and alphanumeric
- **Google Places**: Should start with "AIza" followed by alphanumeric characters

---

## 🧪 Testing Procedures

### **Test 1: Minimal Media Download Test**
```bash
# Create a simple test project
node -e "
const https = require('https');
// Call topic creation, script generation, then media curation
// Check file sizes in response
"
```

### **Test 2: Full Pipeline Test**
```bash
# Run complete pipeline and monitor file sizes
node run-france-pipeline.js

# Monitor for:
# ✅ Real file sizes (MB range)
# ✅ Diverse content across scenes
# ✅ Actual YouTube video upload
```

### **Test 3: CloudWatch Monitoring**
Set up CloudWatch alerts for:
- Media Curator execution duration (should be longer for real downloads)
- Error rates in Media Curator function
- S3 object sizes (should be MB range, not bytes)

---

## 📋 Prevention Checklist

### **Deployment Checklist**
- [ ] Media Curator has Secrets Manager IAM permission
- [ ] API keys exist in Secrets Manager with correct names
- [ ] API keys are valid and not expired
- [ ] Secret is in the same region as Lambda functions
- [ ] Lambda execution role has proper permissions

### **Monitoring Checklist**
- [ ] CloudWatch logs show successful API key retrieval
- [ ] Media file sizes are in MB range (not bytes)
- [ ] Media sources show "pexels", "pixabay", "google-places" (not "fallback")
- [ ] Video Assembler processes real images (not text files)
- [ ] YouTube videos actually appear on channel

### **Testing Checklist**
- [ ] Run diagnostic scripts after any deployment
- [ ] Verify file sizes before running full pipeline
- [ ] Test with different topics to ensure consistency
- [ ] Monitor duplicate prevention across multiple runs

---

## 🆘 Emergency Recovery

If media download is completely broken:

1. **Immediate Diagnosis**:
   ```bash
   # Check current status
   node debug-media-curator.js
   ```

2. **Quick Permission Fix**:
   ```bash
   # Add permission via AWS CLI if SAM deployment fails
   aws iam attach-role-policy \
     --role-name [MediaCuratorRole] \
     --policy-arn arn:aws:iam::aws:policy/SecretsManagerReadWrite
   ```

3. **Fallback Testing**:
   ```bash
   # Test with minimal project to isolate issue
   node debug-api-keys.js
   ```

4. **Escalation Path**:
   - Check CloudWatch logs for specific error messages
   - Verify IAM role permissions in AWS Console
   - Test API keys manually outside of Lambda
   - Contact AWS support if IAM issues persist

---

## 📚 Related Documentation

- [AWS Secrets Manager IAM Permissions](https://docs.aws.amazon.com/secretsmanager/latest/userguide/auth-and-access.html)
- [SAM Template IAM Policies](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-resource-function.html#sam-function-policies)
- [Pexels API Documentation](https://www.pexels.com/api/documentation/)
- [Pixabay API Documentation](https://pixabay.com/api/docs/)
- [Google Places API Documentation](https://developers.google.com/maps/documentation/places/web-service)

---

## 🎯 Success Indicators

**When everything is working correctly:**
- Media files are 1MB+ in size (not 47-53 bytes)
- Sources show "pexels", "pixabay", "google-places" (not "fallback")
- Different scenes have different content (duplicate prevention working)
- Videos actually appear on YouTube channel
- CloudWatch logs show successful API calls to external services

**Remember**: The system will report "success" even with placeholder files. Always verify file sizes and sources to confirm real media download is working!
