# Security Best Practices

## 🔒 **API Key Security**

### ❌ **What NOT to Do:**
- Never display API keys in console output
- Never commit API keys to version control
- Never share API keys in chat/email/documentation
- Never store API keys in plain text files

### ✅ **What TO Do:**

#### 1. Retrieve API Keys Securely
```bash
# Get API key value securely via AWS CLI
aws apigateway get-api-key --api-key YOUR_API_KEY_ID --include-value --query "value" --output text

# Store in environment variable for local testing
export API_KEY=$(aws apigateway get-api-key --api-key YOUR_API_KEY_ID --include-value --query "value" --output text)
```

#### 2. Use API Keys in Applications
```javascript
// ✅ Good: Read from environment variable
const apiKey = process.env.API_KEY;

// ✅ Good: Read from AWS Secrets Manager
const secretsManager = new AWS.SecretsManager();
const secret = await secretsManager.getSecretValue({ SecretId: 'api-gateway-key' }).promise();
const apiKey = JSON.parse(secret.SecretString).apiKey;
```

#### 3. GitHub Secrets Configuration
Store sensitive values in GitHub repository secrets:

**Required Secrets:**
- `AWS_ACCESS_KEY_ID` - AWS access key for staging
- `AWS_SECRET_ACCESS_KEY` - AWS secret key for staging  
- `AWS_ACCESS_KEY_ID_PROD` - AWS access key for production
- `AWS_SECRET_ACCESS_KEY_PROD` - AWS secret key for production
- `AWS_ACCOUNT_ID` - AWS account ID for staging
- `AWS_ACCOUNT_ID_PROD` - AWS account ID for production

## 🏗️ **Infrastructure Security**

### IAM Best Practices
```yaml
# Principle of least privilege
- Only grant necessary permissions
- Use specific resource ARNs when possible
- Regularly audit and rotate credentials
- Use IAM roles instead of users when possible
```

### API Gateway Security
```yaml
# API Key protection
- Enable API key requirement on all endpoints
- Use usage plans to control rate limiting
- Monitor API usage via CloudWatch
- Set up alerts for unusual activity
```

### Lambda Security
```yaml
# Function security
- Use environment variables for configuration
- Store secrets in AWS Secrets Manager
- Enable VPC if accessing private resources
- Use least privilege IAM roles
```

## 🔐 **Secrets Management**

### AWS Secrets Manager Structure
```json
{
  "youtube-credentials": {
    "client_id": "your-youtube-client-id",
    "client_secret": "your-youtube-client-secret", 
    "refresh_token": "your-youtube-refresh-token"
  },
  "media-credentials": {
    "pexels_api_key": "your-pexels-key",
    "pixabay_api_key": "your-pixabay-key"
  },
  "api-gateway": {
    "api_key": "your-api-gateway-key"
  }
}
```

### Creating Secrets Securely
```bash
# Create YouTube credentials secret
aws secretsmanager create-secret \
  --name "automated-video-pipeline/youtube-credentials" \
  --description "YouTube API credentials for video upload" \
  --secret-string '{
    "client_id": "your-client-id",
    "client_secret": "your-client-secret",
    "refresh_token": "your-refresh-token"
  }'

# Create media API credentials
aws secretsmanager create-secret \
  --name "automated-video-pipeline/media-credentials" \
  --description "Media API credentials for Pexels/Pixabay" \
  --secret-string '{
    "pexels_api_key": "your-pexels-key",
    "pixabay_api_key": "your-pixabay-key"
  }'
```

## 🚀 **CI/CD Security**

### GitHub Actions Security
```yaml
# Environment protection rules
- Require reviewers for production deployments
- Use environment-specific secrets
- Enable branch protection rules
- Require status checks before merging
```

### Deployment Security
```yaml
# Secure deployment practices
- Use separate AWS accounts for staging/production
- Implement approval workflows for production
- Audit all deployments
- Use infrastructure as code (CDK)
```

## 📊 **Monitoring & Auditing**

### CloudWatch Monitoring
```yaml
# Set up alerts for:
- Failed Lambda executions
- High API Gateway error rates
- Unusual cost spikes
- Security-related events
```

### AWS CloudTrail
```yaml
# Enable CloudTrail for:
- API calls auditing
- Resource access logging
- Security event tracking
- Compliance requirements
```

## 🔧 **Local Development Security**

### Environment Variables
```bash
# .env file (never commit this!)
AWS_REGION=us-east-1
API_KEY=your-local-api-key
YOUTUBE_CLIENT_ID=your-client-id
# ... other local variables
```

### Git Security
```bash
# .gitignore entries
.env
.env.local
.env.production
deployment-outputs*.json
**/node_modules/
**/.aws-sam/
```

## 🚨 **Incident Response**

### If API Key is Compromised:
1. **Immediately rotate the API key**
   ```bash
   aws apigateway create-api-key --name "new-api-key"
   aws apigateway delete-api-key --api-key OLD_KEY_ID
   ```

2. **Update usage plans**
3. **Audit access logs**
4. **Update applications with new key**

### If AWS Credentials are Compromised:
1. **Immediately disable the credentials**
2. **Create new credentials**
3. **Update GitHub secrets**
4. **Audit CloudTrail logs**
5. **Review all resources for unauthorized changes**

## ✅ **Security Checklist**

### Before Deployment:
- [ ] All secrets stored in AWS Secrets Manager
- [ ] No hardcoded credentials in code
- [ ] GitHub secrets configured properly
- [ ] IAM roles follow least privilege
- [ ] API Gateway has proper authentication
- [ ] CloudWatch monitoring enabled

### After Deployment:
- [ ] Test API key access
- [ ] Verify secrets are accessible to Lambda functions
- [ ] Check CloudWatch logs for errors
- [ ] Validate all endpoints require authentication
- [ ] Monitor costs and usage

### Regular Maintenance:
- [ ] Rotate API keys quarterly
- [ ] Review IAM permissions monthly
- [ ] Audit CloudTrail logs weekly
- [ ] Update dependencies regularly
- [ ] Review security groups and NACLs

## 📚 **Additional Resources**

- [AWS Security Best Practices](https://aws.amazon.com/architecture/security-identity-compliance/)
- [GitHub Actions Security](https://docs.github.com/en/actions/security-guides)
- [API Gateway Security](https://docs.aws.amazon.com/apigateway/latest/developerguide/security.html)
- [Lambda Security](https://docs.aws.amazon.com/lambda/latest/dg/lambda-security.html)