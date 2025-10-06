#!/usr/bin/env node

/**
 * AWS CDK App for Automated YouTube Video Pipeline
 * Entry point for deploying infrastructure
 */

import { App, Tags } from 'aws-cdk-lib';
import { TopicManagementStack } from './lib/topic-management-stack.js';

const app = new App();

// Get environment configuration
const account = process.env.CDK_DEFAULT_ACCOUNT || '786673323159';
const region = process.env.CDK_DEFAULT_REGION || 'us-east-1';
const environment = process.env.ENVIRONMENT || 'production';

// Deploy Topic Management Stack
const topicManagementStack = new TopicManagementStack(app, 'TopicManagementStack', {
  env: {
    account,
    region
  },
  description: 'Topic Management infrastructure for Automated YouTube Video Pipeline',
  tags: {
    Project: 'automated-video-pipeline',
    Environment: environment,
    ManagedBy: 'aws-cdk',
    CostCenter: 'content-creation'
  }
});

// Apply global tags
Tags.of(app).add('Project', 'automated-video-pipeline');
Tags.of(app).add('Environment', environment);
Tags.of(app).add('ManagedBy', 'aws-cdk');
Tags.of(app).add('Owner', 'video-automation-team');