#!/usr/bin/env node

/**
 * Test Available Polly Voices
 * Check what voices and engines are available in our region
 */

const AWS = require('aws-sdk');

// Configuration
const REGION = process.env.AWS_REGION || 'us-east-1';
AWS.config.update({ region: REGION });

const lambda = new AWS.Lambda();

async function testVoices() {
    try {
        console.log('🎙️ Testing Available Polly Voices');
        console.log('==================================');
        
        const result = await lambda.invoke({
            FunctionName: 'automated-video-pipeline-audio-generator-v2',
            Payload: JSON.stringify({
                httpMethod: 'GET',
                path: '/audio/voices',
                queryStringParameters: { engine: 'all', languageCode: 'en-US' }
            })
        }).promise();
        
        const response = JSON.parse(result.Payload);
        
        if (response.statusCode === 200) {
            const body = JSON.parse(response.body);
            
            console.log(`📊 Total voices found: ${body.summary.total}`);
            console.log(`🤖 Generative voices: ${body.summary.generative}`);
            console.log(`🧠 Neural voices: ${body.summary.neural}`);
            console.log(`📢 Standard voices: ${body.summary.standard}`);
            
            console.log('\n🤖 Recommended Generative Voices:');
            body.recommended.generative.forEach(voice => {
                console.log(`  - ${voice.name} (${voice.id}) - ${voice.gender}`);
            });
            
            console.log('\n🧠 Recommended Neural Voices:');
            body.recommended.neural.forEach(voice => {
                console.log(`  - ${voice.name} (${voice.id}) - ${voice.gender}`);
            });
            
        } else {
            console.error('❌ Failed to get voices:', response.body);
        }
        
    } catch (error) {
        console.error('❌ Error testing voices:', error.message);
    }
}

testVoices();