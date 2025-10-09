# GitHub Actions Setup Guide

## Overview

This directory contains GitHub Actions workflows for automated deployment and testing of the Automated YouTube Video Pipeline.

## Workflows

### 1. `deploy.yml` - Multi-Environment Deployment
- **Triggers**: Push to `main`/`develop`, manual dispatch
- **Environments**: Staging and Production
- **Features**: 
  - Comprehensive Jest test suite
  - Environment-specific deployments
  - Security audits
  - Health checks

### 2. `deploy-single-env.yml` - Single Environment Deployment
- **Triggers**: Push to `main`, manual dispatch
- **Environment**: Production only
- **Features**:
  - Simplified deployment process
  - Comprehensive test coverage
  - Health checks

### 3. `cleanup.yml` - Resource Cleanup
- **Triggers**: Manual dispatch only
- **Purpose**: Clean up old AWS resources
- **Safety**: Requires "CONFIRM" input

## Required Secrets

Configure these secrets in your GitHub repository:

### For Staging
- `AWS_ACCESS_KEY_ID` - AWS access key for staging
- `AWS_SECRET_ACCESS_KEY` - AWS secret key for staging
- `AWS_ACCOUNT_ID` - AWS account ID for staging

### For Production
- `AWS_ACCESS_KEY_ID_PROD` - AWS access key for production
- `AWS_SECRET_ACCESS_KEY_PROD` - AWS secret key for production
- `AWS_ACCOUNT_ID_PROD` - AWS account ID for production

## Environment Configuration

### Production Environment (`environments/production.yml`)
- **Protection**: Requires 1 reviewer
- **Wait Timer**: 5 minutes before deployment
- **Auto Deploy**: Disabled (manual approval required)

## Test Suite Integration

All workflows now use the consolidated Jest test suite:

```bash
npm run test:health      # Quick health check of all agents
npm run test:unit        # Unit tests for shared utilities and Lambda functions
npm run test:integration # Integration tests for context flow
npm test                 # Run all tests
```

## Deployment Process

### Staging Deployment
1. Push to `develop` branch
2. Tests run automatically
3. Deploy to staging environment
4. Run integration tests

### Production Deployment
1. Push to `main` branch
2. Tests run automatically
3. Wait for manual approval (5 minutes + reviewer)
4. Deploy to production environment
5. Run health checks

### Manual Deployment
1. Go to Actions → Deploy Automated Video Pipeline
2. Click "Run workflow"
3. Choose environment (staging/production)
4. Confirm deployment

## Security Features

- **No sensitive data in logs**: API keys and secrets are handled securely
- **Environment protection**: Production requires manual approval
- **Security audits**: Automated npm audit on every deployment
- **Least privilege**: Separate AWS credentials for staging/production

## Troubleshooting

### Common Issues

#### Tests Failing
- Check that all npm scripts are properly configured
- Ensure shared utilities are working correctly
- Verify Jest configuration is valid

#### Deployment Failures
- Check AWS credentials are correctly configured
- Verify CDK bootstrap has been run
- Check CloudFormation stack status in AWS Console

#### Health Check Failures
- Verify all Lambda functions are deployed
- Check CloudWatch logs for specific errors
- Ensure API Gateway endpoints are accessible

## Maintenance

### Regular Tasks
- Review and rotate AWS credentials quarterly
- Update Node.js version when new LTS is available
- Monitor workflow execution times and optimize as needed
- Review and update environment protection rules

### Cleanup
- Use the cleanup workflow to remove old resources
- Monitor AWS costs and clean up unused resources
- Archive old deployment outputs and logs

## Best Practices

1. **Always test locally first** before pushing to main branches
2. **Use feature branches** for development work
3. **Review deployment outputs** after each deployment
4. **Monitor CloudWatch logs** for any issues
5. **Keep secrets up to date** and rotate regularly

For more information, see the main project documentation in the root directory.