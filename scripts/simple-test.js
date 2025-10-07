#!/usr/bin/env node

/**
 * Simple Test - Just trigger the workflow orchestrator
 */

const AWS = require('aws-sdk');

// Configuration
const REGION = process.env.AWS_REGION || 'us-east-1';

// Initialize AWS SDK
AWS.config.update({ region: REGION });
const lambda = new AWS.Lambda();

async function testWorkflowOrchestrator() {
    try {
        console.log('🧪 Testing Workflow Orchestrator...');
        
        const payload = {
            action: 'start',
            topicId: 'test-video-001',
            topic: 'Best Investment Apps for Beginners in 2025',
            keywords: ['investment apps', 'beginners', '2025'],
            priority: 1,
            scheduledBy: 'manual-test'
        };
        
        const params = {
            FunctionName: 'automated-video-pipeline-workflow-orchestrator-v2',
            Payload: JSON.stringify(payload),
            InvocationType: 'RequestResponse'
        };
        
        const result = await lambda.invoke(params).promise();
        
        if (result.StatusCode === 200) {
            const response = JSON.parse(result.Payload);
            console.log('✅ Workflow Orchestrator Response:', JSON.stringify(response, null, 2));
            return true;
        } else {
            console.log('❌ Failed with status:', result.StatusCode);
            return false;
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        return false;
    }
}

// Run the test
testWorkflowOrchestrator()
    .then(success => {
        if (success) {
            console.log('🎉 Test completed successfully!');
        } else {
            console.log('❌ Test failed');
        }
    })
    .catch(console.error);