#!/usr/bin/env node

/**
 * Test Script Generator Scene Generation
 * 
 * Tests if the Script Generator is producing proper scene breakdown
 * instead of "0 scenes, 0s"
 */

const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');

const lambdaClient = new LambdaClient({ region: 'us-east-1' });

async function testScriptGeneratorScenes() {
    console.log('🧪 Testing Script Generator Scene Generation...\n');
    
    try {
        // Test script generation with a simple topic
        const testPayload = {
            topic: "AI Tools for Content Creation",
            title: "5 AI Tools That Will Transform Your Content Creation",
            targetLength: 480, // 8 minutes
            style: "educational",
            targetAudience: "content creators",
            includeVisuals: true,
            includeTiming: true
        };
        
        console.log('📝 Generating script with test payload...');
        console.log(`Topic: ${testPayload.topic}`);
        console.log(`Target Length: ${testPayload.targetLength} seconds\n`);
        
        const command = new InvokeCommand({
            FunctionName: 'automated-video-pipeline-script-generator-v2',
            Payload: JSON.stringify({
                httpMethod: 'POST',
                path: '/scripts/generate',
                body: JSON.stringify(testPayload)
            })
        });
        
        const response = await lambdaClient.send(command);
        const result = JSON.parse(new TextDecoder().decode(response.Payload));
        
        if (result.statusCode !== 200) {
            console.error('❌ Script generation failed:', result);
            return false;
        }
        
        const responseData = JSON.parse(result.body);
        const scriptData = responseData.script; // The actual script is nested under 'script'
        
        console.log('📊 Script Generation Results:');
        console.log(`✅ Title: ${scriptData.title}`);
        console.log(`✅ Topic: ${scriptData.topic}`);
        console.log(`✅ Estimated Duration: ${scriptData.estimatedDuration} seconds`);
        console.log(`✅ Total Duration: ${scriptData.totalDuration} seconds`);
        console.log(`✅ Word Count: ${scriptData.wordCount} words`);
        console.log(`✅ Scenes Count: ${scriptData.scenes?.length || 0}`);
        
        if (scriptData.scenes && scriptData.scenes.length > 0) {
            console.log('\n🎬 Scene Breakdown:');
            scriptData.scenes.forEach((scene, index) => {
                console.log(`   Scene ${scene.sceneNumber}: ${scene.title}`);
                console.log(`   Duration: ${scene.duration}s (${scene.startTime}s - ${scene.endTime}s)`);
                console.log(`   Script: ${scene.script.substring(0, 100)}...`);
                console.log('');
            });
        }
        
        // Check for the "0 scenes, 0s" issue
        const hasValidScenes = scriptData.scenes && scriptData.scenes.length > 0;
        const hasValidDuration = scriptData.totalDuration > 0;
        
        if (!hasValidScenes) {
            console.error('❌ CRITICAL ISSUE: No scenes generated!');
            return false;
        }
        
        if (!hasValidDuration) {
            console.error('❌ CRITICAL ISSUE: Total duration is 0!');
            return false;
        }
        
        if (scriptData.scenes.length < 3) {
            console.warn('⚠️ WARNING: Only generated', scriptData.scenes.length, 'scenes (expected 3-8)');
        }
        
        console.log('✅ SUCCESS: Script Generator is producing proper scene breakdown!');
        console.log(`📈 Generated ${scriptData.scenes.length} scenes with ${scriptData.totalDuration}s total duration`);
        
        return true;
        
    } catch (error) {
        console.error('❌ Error testing Script Generator:', error);
        return false;
    }
}

// Run the test
testScriptGeneratorScenes()
    .then(success => {
        if (success) {
            console.log('\n🎉 Script Generator scene generation test PASSED!');
            process.exit(0);
        } else {
            console.log('\n💥 Script Generator scene generation test FAILED!');
            process.exit(1);
        }
    })
    .catch(error => {
        console.error('Test execution failed:', error);
        process.exit(1);
    });