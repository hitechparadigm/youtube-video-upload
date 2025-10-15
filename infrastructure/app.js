#!/usr/bin/env node

/**
 * AWS CDK App for Automated YouTube Video Pipeline
 * Entry point for deploying infrastructure
 */

import {
    App,
    Tags
} from 'aws-cdk-lib';
import {
    VideoPipelineStack
} from './lib/video-pipeline-stack.js';

const app = new App();

// Simple single-account configuration
const account = process.env.CDK_DEFAULT_ACCOUNT || '786673323159';
const region = process.env.CDK_DEFAULT_REGION || 'us-east-1';

// Deploy single consolidated video pipeline stack
const videoPipelineStack = new VideoPipelineStack(app, 'VideoPipelineStack', {
    env: {
        account,
        region
    },
    environment: 'production',
    description: 'Automated YouTube Video Pipeline Infrastructure with Scheduling and Cost Tracking',
    alertEmail: process.env.ALERT_EMAIL || 'admin@example.com',
    tags: {
        Project: 'automated-video-pipeline',
        Environment: 'production',
        ManagedBy: 'github-actions',
        CostCenter: 'content-creation'
    }
});

// Apply global tags
Tags.of(app).add('Project', 'automated-video-pipeline');
Tags.of(app).add('Environment', 'production');
Tags.of(app).add('ManagedBy', 'github-actions');
Tags.of(app).add('Owner', 'video-automation-team');