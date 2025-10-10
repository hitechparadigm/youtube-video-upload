#!/usr/bin/env node

/**
 * AWS Infrastructure Cleanup Script
 * Safely removes API Gateway + Lambda infrastructure if needed
 */

const { 
  CloudFormationClient, 
  DescribeStacksCommand, 
  DeleteStackCommand,
  ListStacksCommand 
} = require('@aws-sdk/client-cloudformation');
const { 
  APIGatewayClient, 
  GetRestApisCommand, 
  DeleteRestApiCommand 
} = require('@aws-sdk/client-api-gateway');
const { 
  LambdaClient, 
  ListFunctionsCommand, 
  DeleteFunctionCommand 
} = require('@aws-sdk/client-lambda');

async function cleanupInfrastructure() {
  console.log('🧹 AWS Infrastructure Cleanup Tool');
  console.log('=' .repeat(50));
  console.log('⚠️  WARNING: This will DELETE AWS resources!');
  console.log('');

  const region = process.env.AWS_REGION || 'us-east-1';
  console.log(`🌍 Region: ${region}`);
  console.log('');

  try {
    // 1. List CloudFormation Stacks
    console.log('📋 1. CLOUDFORMATION STACKS:');
    const cfClient = new CloudFormationClient({ region });
    
    const stacksResult = await cfClient.send(new ListStacksCommand({
      StackStatusFilter: ['CREATE_COMPLETE', 'UPDATE_COMPLETE', 'ROLLBACK_COMPLETE']
    }));

    const videoPipelineStacks = stacksResult.StackSummaries.filter(stack => 
      stack.StackName.includes('video-pipeline') || 
      stack.StackName.includes('VideoPipeline') ||
      stack.StackName.includes('automated-video')
    );

    if (videoPipelineStacks.length > 0) {
      console.log(`   Found ${videoPipelineStacks.length} video pipeline stacks:`);
      videoPipelineStacks.forEach((stack, index) => {
        console.log(`   ${index + 1}. ${stack.StackName} (${stack.StackStatus})`);
      });
    } else {
      console.log('   ✅ No video pipeline CloudFormation stacks found');
    }

    console.log('');

    // 2. List API Gateway APIs
    console.log('🌐 2. API GATEWAY APIS:');
    const apiClient = new APIGatewayClient({ region });
    
    const apisResult = await apiClient.send(new GetRestApisCommand({}));
    const videoPipelineApis = apisResult.items.filter(api => 
      api.name.includes('video-pipeline') || 
      api.name.includes('VideoPipeline') ||
      api.name.includes('automated-video')
    );

    if (videoPipelineApis.length > 0) {
      console.log(`   Found ${videoPipelineApis.length} video pipeline APIs:`);
      videoPipelineApis.forEach((api, index) => {
        console.log(`   ${index + 1}. ${api.name} (${api.id})`);
      });
    } else {
      console.log('   ✅ No video pipeline API Gateway APIs found');
    }

    console.log('');

    // 3. List Lambda Functions
    console.log('⚡ 3. LAMBDA FUNCTIONS:');
    const lambdaClient = new LambdaClient({ region });
    
    const functionsResult = await lambdaClient.send(new ListFunctionsCommand({}));
    const videoPipelineFunctions = functionsResult.Functions.filter(func => 
      func.FunctionName.includes('video-pipeline') || 
      func.FunctionName.includes('VideoPipeline') ||
      func.FunctionName.includes('automated-video')
    );

    if (videoPipelineFunctions.length > 0) {
      console.log(`   Found ${videoPipelineFunctions.length} video pipeline functions:`);
      videoPipelineFunctions.forEach((func, index) => {
        console.log(`   ${index + 1}. ${func.FunctionName} (${func.Runtime})`);
      });
    } else {
      console.log('   ✅ No video pipeline Lambda functions found');
    }

    console.log('');

    // 4. Cleanup Options
    console.log('🛠️  CLEANUP OPTIONS:');
    console.log('');
    
    if (videoPipelineStacks.length > 0) {
      console.log('📋 CloudFormation Stack Cleanup:');
      videoPipelineStacks.forEach((stack, index) => {
        console.log(`   To delete: aws cloudformation delete-stack --stack-name ${stack.StackName} --region ${region}`);
      });
      console.log('');
    }

    if (videoPipelineApis.length > 0) {
      console.log('🌐 API Gateway Cleanup:');
      videoPipelineApis.forEach((api, index) => {
        console.log(`   To delete: aws apigateway delete-rest-api --rest-api-id ${api.id} --region ${region}`);
      });
      console.log('');
    }

    if (videoPipelineFunctions.length > 0) {
      console.log('⚡ Lambda Function Cleanup:');
      videoPipelineFunctions.forEach((func, index) => {
        console.log(`   To delete: aws lambda delete-function --function-name ${func.FunctionName} --region ${region}`);
      });
      console.log('');
    }

    // 5. CDK Cleanup
    console.log('🏗️  CDK CLEANUP:');
    console.log('   To destroy CDK stack: cdk destroy --all');
    console.log('   To list CDK stacks: cdk list');
    console.log('');

    // 6. Safe Cleanup Script
    console.log('🔒 SAFE CLEANUP SCRIPT:');
    console.log('   Run this to safely clean up everything:');
    console.log('   1. cd infrastructure');
    console.log('   2. cdk destroy --all');
    console.log('   3. Confirm deletion when prompted');
    console.log('');

    console.log('✅ Infrastructure scan completed');
    console.log('💡 Use the commands above to clean up resources if needed');

  } catch (error) {
    console.error('❌ Error scanning infrastructure:', error.message);
    
    if (error.name === 'CredentialsProviderError') {
      console.log('\n💡 AWS credentials not configured. To fix this:');
      console.log('   1. Run: aws configure');
      console.log('   2. Or set environment variables: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY');
    }
  }
}

// Run the cleanup scan
if (require.main === module) {
  cleanupInfrastructure()
    .then(() => {
      console.log('\n✅ Infrastructure cleanup scan completed');
    })
    .catch((error) => {
      console.error('\n💥 Infrastructure scan failed:', error);
      process.exit(1);
    });
}

module.exports = { cleanupInfrastructure };