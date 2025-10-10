#!/usr/bin/env node

/**
 * Simple Infrastructure Cleanup Guide
 */

console.log('🧹 AWS Infrastructure Cleanup Guide');
console.log('=' .repeat(50));
console.log('⚠️  WARNING: This will DELETE AWS resources!');
console.log('');

console.log('🏗️  CDK CLEANUP COMMANDS:');
console.log('');
console.log('1. Navigate to infrastructure directory:');
console.log('   cd infrastructure');
console.log('');
console.log('2. List current CDK stacks:');
console.log('   cdk list');
console.log('');
console.log('3. Destroy all CDK stacks:');
console.log('   cdk destroy --all');
console.log('');
console.log('4. Confirm deletion when prompted');
console.log('');

console.log('🔍 MANUAL CLEANUP (if CDK fails):');
console.log('');
console.log('AWS CLI Commands:');
console.log('1. List CloudFormation stacks:');
console.log('   aws cloudformation list-stacks --region us-east-1');
console.log('');
console.log('2. Delete specific stack:');
console.log('   aws cloudformation delete-stack --stack-name VideoPipelineStack --region us-east-1');
console.log('');
console.log('3. List Lambda functions:');
console.log('   aws lambda list-functions --region us-east-1');
console.log('');
console.log('4. Delete Lambda function:');
console.log('   aws lambda delete-function --function-name FUNCTION_NAME --region us-east-1');
console.log('');

console.log('✅ Use these commands if you need to clean up the infrastructure');
console.log('💡 CDK destroy is the safest and most complete method');