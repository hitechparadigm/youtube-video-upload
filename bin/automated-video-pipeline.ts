#!/usr/bin/env node
/**
 * AWS CDK Entry Point for Automated Video Pipeline
 * 
 * This file serves as the main entry point for deploying the entire
 * automated video generation infrastructure to AWS. It creates and
 * configures the CDK app and instantiates the main infrastructure stack.
 * 
 * The pipeline includes:
 * - S3 buckets for media storage and video archives
 * - DynamoDB tables for topic management and video tracking
 * - Lambda functions for API endpoints and processing
 * - ECS Fargate for video processing with FFmpeg
 * - EventBridge for scheduling automated video creation
 * - Bedrock Agents for AI-powered content generation
 * - IAM roles and policies for secure service communication
 */

import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { AutomatedVideoPipelineStack } from '../lib/automated-video-pipeline-stack';

// Create the CDK application instance
const app = new cdk.App();

// Deploy the main infrastructure stack
// This creates all AWS resources needed for the video pipeline
new AutomatedVideoPipelineStack(app, 'AutomatedVideoPipelineStack', {
  // Configure stack properties
  env: {
    // Use default AWS account and region from AWS CLI/SDK configuration
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
  
  // Add stack description for AWS CloudFormation
  description: 'Automated Video Pipeline - AI-powered video generation and YouTube publishing system',
  
  // Enable termination protection for production deployments
  terminationProtection: false, // Set to true for production
  
  // Add tags to all resources in this stack for cost tracking and organization
  tags: {
    Project: 'AutomatedVideoPipeline',
    Environment: 'Development', // Change to 'Production' for prod deployment
    Owner: 'VideoContentTeam',
    CostCenter: 'ContentCreation'
  }
});