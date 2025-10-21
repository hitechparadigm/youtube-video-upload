#!/usr/bin/env node

/**
 * 🔧 CloudFormation Stack Recovery Script
 *
 * Fixes the UPDATE_ROLLBACK_IN_PROGRESS state issue
 */

const {
    execSync
} = require('child_process');

async function fixCloudFormationStack() {
    console.log('🔧 CloudFormation Stack Recovery');
    console.log('='.repeat(40));

    const stackName = 'automated-video-pipeline-prod';

    try {
        // Check current stack status
        console.log('📊 Checking current stack status...');
        const statusCmd = `aws cloudformation describe-stacks --stack-name ${stackName} --query 'Stacks[0].StackStatus' --output text`;
        const currentStatus = execSync(statusCmd, {
            encoding: 'utf8'
        }).trim();

        console.log(`Current Status: ${currentStatus}`);

        if (currentStatus === 'UPDATE_ROLLBACK_IN_PROGRESS') {
            console.log('⚠️ Stack is in UPDATE_ROLLBACK_IN_PROGRESS state');
            console.log('🔄 Waiting for rollback to complete...');

            // Wait for rollback to complete
            const waitCmd = `aws cloudformation wait stack-update-complete --stack-name ${stackName}`;
            console.log('⏳ This may take several minutes...');

            try {
                execSync(waitCmd, {
                    stdio: 'inherit',
                    timeout: 600000
                }); // 10 minute timeout
                console.log('✅ Rollback completed');
            } catch (error) {
                console.log('⚠️ Wait command timed out or failed, checking status manually...');
            }

            // Check status again
            const newStatus = execSync(statusCmd, {
                encoding: 'utf8'
            }).trim();
            console.log(`New Status: ${newStatus}`);

            if (newStatus === 'UPDATE_ROLLBACK_COMPLETE') {
                console.log('✅ Stack is now in UPDATE_ROLLBACK_COMPLETE state');
                console.log('🎯 Ready for new deployment');
            } else if (newStatus === 'UPDATE_ROLLBACK_FAILED') {
                console.log('❌ Stack rollback failed');
                console.log('💡 Manual intervention required in AWS Console');
                console.log('🔗 https://console.aws.amazon.com/cloudformation');
                return false;
            }

        } else if (currentStatus === 'UPDATE_ROLLBACK_COMPLETE') {
            console.log('✅ Stack is already in UPDATE_ROLLBACK_COMPLETE state');
            console.log('🎯 Ready for new deployment');
        } else {
            console.log(`ℹ️ Stack is in ${currentStatus} state`);
        }

        console.log('\n🚀 Stack Recovery Complete!');
        console.log('💡 You can now retry the deployment');
        return true;

    } catch (error) {
        console.error('❌ Error checking stack status:', error.message);

        if (error.message.includes('does not exist')) {
            console.log('💡 Stack does not exist - this is normal for first deployment');
            return true;
        }

        return false;
    }
}

fixCloudFormationStack().then(success => {
    if (success) {
        console.log('\n✅ Stack recovery completed successfully');
        console.log('🎯 Ready to retry deployment');
    } else {
        console.log('\n❌ Stack recovery failed');
        console.log('🔧 Manual intervention may be required');
    }
}).catch(error => {
    console.error('💥 Script error:', error.message);
});