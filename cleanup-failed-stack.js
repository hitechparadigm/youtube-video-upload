#!/usr/bin/env node

const {
    CloudFormationClient,
    DeleteStackCommand,
    DescribeStacksCommand
} = require('@aws-sdk/client-cloudformation');

const client = new CloudFormationClient({
    region: 'us-east-1'
});
const stackName = 'automated-video-pipeline-prod';

async function cleanupFailedStack() {
    console.log('🧹 Cleaning up failed CloudFormation stack...');
    console.log(`Stack: ${stackName}`);

    try {
        // Check if stack exists
        console.log('Checking stack status...');
        const describeResult = await client.send(new DescribeStacksCommand({
            StackName: stackName
        }));

        const stack = describeResult.Stacks[0];
        console.log(`Current status: ${stack.StackStatus}`);

        if (stack.StackStatus === 'ROLLBACK_COMPLETE' ||
            stack.StackStatus === 'CREATE_FAILED' ||
            stack.StackStatus === 'UPDATE_ROLLBACK_COMPLETE') {

            console.log('Deleting failed stack...');
            await client.send(new DeleteStackCommand({
                StackName: stackName
            }));

            console.log('✅ Stack deletion initiated');
            console.log('⏳ This may take a few minutes to complete');
            console.log('');
            console.log('You can monitor progress in AWS Console:');
            console.log('https://console.aws.amazon.com/cloudformation/home?region=us-east-1#/stacks');

        } else {
            console.log(`⚠️ Stack is in ${stack.StackStatus} state`);
            console.log('Cannot delete stack in this state');
        }

    } catch (error) {
        if (error.name === 'ValidationError' && error.message.includes('does not exist')) {
            console.log('✅ Stack does not exist - nothing to clean up');
        } else {
            console.error('❌ Error:', error.message);
        }
    }
}

cleanupFailedStack();