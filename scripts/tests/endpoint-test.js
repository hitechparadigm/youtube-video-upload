#!/usr/bin/env node

/**
 * Test different endpoints on Video Assembler
 */

import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

const lambdaClient = new LambdaClient({ region: 'us-east-1' });

async function testEndpoint(path, method = 'GET') {
    console.log(`🔍 Testing ${method} ${path}...`);
    
    try {
        const payload = {
            httpMethod: method,
            path: path,
            headers: {
                'Content-Type': 'application/json'
            }
        };
        
        const command = new InvokeCommand({
            FunctionName: 'automated-video-pipeline-video-assembler-v2',
            Payload: JSON.stringify(payload)
        });
        
        const response = await lambdaClient.send(command);
        const responsePayload = JSON.parse(new TextDecoder().decode(response.Payload));
        
        console.log(`   Status: ${responsePayload.statusCode}`);
        if (responsePayload.statusCode === 200) {
            const body = JSON.parse(responsePayload.body);
            console.log(`   Response: ${JSON.stringify(body, null, 2).substring(0, 200)}...`);
        } else {
            console.log(`   Error: ${responsePayload.body}`);
        }
        
        return responsePayload;
        
    } catch (error) {
        console.error(`   ❌ Error: ${error.message}`);
        return null;
    }
}

async function main() {
    console.log('🚀 Testing Video Assembler Endpoints\n');
    
    // Test different possible endpoints
    await testEndpoint('/health');
    await testEndpoint('/');
    await testEndpoint('/video/status');
    
    // Test with no path (might be the default)
    console.log('🔍 Testing with empty event...');
    try {
        const command = new InvokeCommand({
            FunctionName: 'automated-video-pipeline-video-assembler-v2',
            Payload: JSON.stringify({})
        });
        
        const response = await lambdaClient.send(command);
        const responsePayload = JSON.parse(new TextDecoder().decode(response.Payload));
        console.log(`   Empty event response: ${JSON.stringify(responsePayload, null, 2)}`);
    } catch (error) {
        console.error(`   ❌ Error with empty event: ${error.message}`);
    }
}

main().catch(console.error);