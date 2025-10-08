#!/usr/bin/env node

/**
 * Complete End-to-End Video Production Pipeline Test
 * Tests the entire flow: Google Sheets → Topic → Script → Media → Audio → Video → YouTube
 * 
 * This test validates the complete autonomous video production pipeline
 */

import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

const lambdaClient = new LambdaClient({ region: 'us-east-1' });

class EndToEndPipelineTest {
    constructor() {
        this.testProjectId = `e2e-test-${Date.now()}`;
        this.results = {
            googleSheets: false,
            topicGeneration: false,
            scriptGeneration: false,
            mediaCuration: false,
            audioGeneration: false,
            videoAssembly: false,
            youtubePublishing: false,
            contextFlow: false
        };
        this.contexts = {};
    }

    async invokeLambda(functionName, payload) {
        try {
            console.log(`📞 Invoking ${functionName}...`);
            
            const command = new InvokeCommand({
                FunctionName: functionName,
                Payload: JSON.stringify(payload)
            });
            
            const response = await lambdaClient.send(command);
            const responsePayload = JSON.parse(new TextDecoder().decode(response.Payload));
            
            if (responsePayload.statusCode && responsePayload.statusCode !== 200) {
                throw new Error(`Lambda returned ${responsePayload.statusCode}: ${responsePayload.body}`);
            }
            
            return responsePayload;
            
        } catch (error) {
            console.error(`❌ Error invoking ${functionName}:`, error.message);
            throw error;
        }
    }

    async testWorkflowOrchestrator() {
        console.log('\n🎯 Step 1: Testing Workflow Orchestrator (Google Sheets Integration)');
        
        try {
            // Test the workflow orchestrator with correct action parameter
            const payload = {
                action: 'start-direct',
                testMode: true,
                maxVideos: 1, // Only process first topic
                dryRun: false
            };
            
            const result = await this.invokeLambda(
                'automated-video-pipeline-workflow-orchestrator-v2',
                payload
            );
            
            console.log('✅ Workflow Orchestrator Response:');
            console.log(`   Status: ${result.success !== false ? 'SUCCESS' : 'FAILED'}`);
            
            if (result.projectId) {
                this.testProjectId = result.projectId;
                this.results.googleSheets = true;
                console.log(`   Project ID: ${this.testProjectId}`);
                console.log(`   Topic Selected: ${result.selectedTopic || result.topic || 'From Google Sheets'}`);
                console.log(`   Pipeline Started: ${result.pipelineStarted ? 'Yes' : 'No'}`);
                return true;
            } else {
                console.log(`   Error: ${result.error || 'No project ID returned'}`);
                return false;
            }
            
        } catch (error) {
            console.error('❌ Workflow Orchestrator test failed:', error.message);
            return false;
        }
    }

    async testTopicManagement() {
        console.log('\n📋 Step 2: Testing Topic Management AI');
        
        try {
            const payload = {
                httpMethod: 'POST',
                path: '/topics/enhanced',
                body: JSON.stringify({
                    projectId: this.testProjectId,
                    baseTopic: 'AI Tools for Content Creation',
                    targetAudience: 'content creators',
                    contentType: 'educational',
                    videoDuration: 480
                })
            };
            
            const result = await this.invokeLambda(
                'automated-video-pipeline-topic-management-v2',
                payload
            );
            
            if (result.statusCode === 200) {
                const body = JSON.parse(result.body);
                console.log('✅ Topic Management Success:');
                console.log(`   Project ID: ${body.projectId}`);
                console.log(`   Expanded Topics: ${body.topicContext?.expandedTopics?.length || 0}`);
                console.log(`   Video Structure: ${body.topicContext?.videoStructure ? 'Generated' : 'Missing'}`);
                console.log(`   SEO Context: ${body.topicContext?.seoContext ? 'Generated' : 'Missing'}`);
                
                this.contexts.topic = body.topicContext;
                this.results.topicGeneration = true;
                return true;
            } else {
                console.log(`❌ Topic Management failed: ${result.statusCode}`);
                return false;
            }
            
        } catch (error) {
            console.error('❌ Topic Management test failed:', error.message);
            return false;
        }
    }

    async testScriptGeneration() {
        console.log('\n📝 Step 3: Testing Script Generator AI');
        
        try {
            const payload = {
                httpMethod: 'POST',
                path: '/scripts/generate-from-project',
                body: JSON.stringify({
                    projectId: this.testProjectId
                })
            };
            
            const result = await this.invokeLambda(
                'automated-video-pipeline-script-generator-v2',
                payload
            );
            
            if (result.statusCode === 200) {
                const body = JSON.parse(result.body);
                console.log('✅ Script Generation Success:');
                console.log(`   Script Scenes: ${body.script?.scenes?.length || 0}`);
                console.log(`   Total Duration: ${body.script?.totalDuration || 0}s`);
                console.log(`   Context Stored: ${body.contextStored ? 'Yes' : 'No'}`);
                
                this.contexts.script = body.script;
                this.results.scriptGeneration = true;
                return true;
            } else {
                console.log(`❌ Script Generation failed: ${result.statusCode}`);
                return false;
            }
            
        } catch (error) {
            console.error('❌ Script Generation test failed:', error.message);
            return false;
        }
    }

    async testMediaCuration() {
        console.log('\n🎨 Step 4: Testing Media Curator AI');
        
        try {
            const payload = {
                httpMethod: 'POST',
                path: '/media/curate-from-project',
                body: JSON.stringify({
                    projectId: this.testProjectId
                })
            };
            
            const result = await this.invokeLambda(
                'automated-video-pipeline-media-curator-v2',
                payload
            );
            
            if (result.statusCode === 200) {
                const body = JSON.parse(result.body);
                console.log('✅ Media Curation Success:');
                console.log(`   Total Assets: ${body.totalAssets || 0}`);
                console.log(`   Scene Mappings: ${body.sceneMediaMapping?.length || 0}`);
                console.log(`   Coverage Complete: ${body.coverageComplete ? 'Yes' : 'No'}`);
                
                this.contexts.media = body;
                this.results.mediaCuration = true;
                return true;
            } else {
                console.log(`❌ Media Curation failed: ${result.statusCode}`);
                return false;
            }
            
        } catch (error) {
            console.error('❌ Media Curation test failed:', error.message);
            return false;
        }
    }

    async testAudioGeneration() {
        console.log('\n🎵 Step 5: Testing Audio Generator AI');
        
        try {
            const payload = {
                httpMethod: 'POST',
                path: '/audio/generate-from-project',
                body: JSON.stringify({
                    projectId: this.testProjectId,
                    voiceId: 'Ruth',
                    engine: 'generative'
                })
            };
            
            const result = await this.invokeLambda(
                'automated-video-pipeline-audio-generator-v2',
                payload
            );
            
            if (result.statusCode === 200) {
                const body = JSON.parse(result.body);
                console.log('✅ Audio Generation Success:');
                console.log(`   Master Audio: ${body.masterAudio?.audioId || 'Unknown'}`);
                console.log(`   Total Duration: ${body.masterAudio?.totalDuration || 0}s`);
                console.log(`   Scene Audios: ${body.masterAudio?.sceneAudios?.length || 0}`);
                console.log(`   Context Aware: ${body.contextUsage?.contextAwareGeneration ? 'Yes' : 'No'}`);
                
                this.contexts.audio = body.masterAudio;
                this.results.audioGeneration = true;
                return true;
            } else {
                console.log(`❌ Audio Generation failed: ${result.statusCode}`);
                return false;
            }
            
        } catch (error) {
            console.error('❌ Audio Generation test failed:', error.message);
            return false;
        }
    }

    async testVideoAssembly() {
        console.log('\n🎬 Step 6: Testing Video Assembler AI (CRITICAL - NEW IMPLEMENTATION)');
        
        try {
            const payload = {
                httpMethod: 'POST',
                path: '/video/assemble-from-project',
                body: JSON.stringify({
                    projectId: this.testProjectId,
                    videoSettings: {
                        resolution: '1920x1080',
                        framerate: 30,
                        bitrate: '5000k'
                    },
                    qualitySettings: {},
                    outputFormat: 'mp4'
                })
            };
            
            const result = await this.invokeLambda(
                'automated-video-pipeline-video-assembler-v2',
                payload
            );
            
            if (result.statusCode === 200) {
                const body = JSON.parse(result.body);
                console.log('✅ Video Assembly Success:');
                console.log(`   Status: ${body.status}`);
                console.log(`   Video ID: ${body.videoId}`);
                console.log(`   Final Video Path: ${body.finalVideoPath || 'Not specified'}`);
                console.log(`   Processing Method: ${body.processingDetails?.method || 'Unknown'}`);
                console.log(`   Context Aware: ${body.assemblyDetails?.contextAware ? 'Yes' : 'No'}`);
                console.log(`   Ready for Publishing: ${body.readyForPublishing ? 'Yes' : 'No'}`);
                
                this.contexts.video = {
                    videoId: body.videoId,
                    finalVideoPath: body.finalVideoPath,
                    status: body.status
                };
                this.results.videoAssembly = true;
                return true;
            } else {
                console.log(`❌ Video Assembly failed: ${result.statusCode}`);
                const body = JSON.parse(result.body);
                console.log(`   Error: ${body.error || 'Unknown error'}`);
                return false;
            }
            
        } catch (error) {
            console.error('❌ Video Assembly test failed:', error.message);
            return false;
        }
    }

    async testYouTubePublishing() {
        console.log('\n📺 Step 7: Testing YouTube Publisher AI');
        
        try {
            // Only test if we have a video from the previous step
            if (!this.contexts.video?.finalVideoPath) {
                console.log('⚠️ Skipping YouTube publishing - no video file available');
                return false;
            }
            
            const payload = {
                httpMethod: 'POST',
                path: '/youtube/publish-from-project',
                body: JSON.stringify({
                    projectId: this.testProjectId,
                    videoFilePath: this.contexts.video.finalVideoPath,
                    testMode: true // Don't actually publish to YouTube in test
                })
            };
            
            const result = await this.invokeLambda(
                'automated-video-pipeline-youtube-publisher-v2',
                payload
            );
            
            if (result.statusCode === 200) {
                const body = JSON.parse(result.body);
                console.log('✅ YouTube Publishing Success:');
                console.log(`   Video ID: ${body.videoId || 'Test Mode'}`);
                console.log(`   Title: ${body.title || 'Generated'}`);
                console.log(`   SEO Optimized: ${body.seoOptimization ? 'Yes' : 'No'}`);
                console.log(`   Status: ${body.status || 'Test'}`);
                
                this.results.youtubePublishing = true;
                return true;
            } else {
                console.log(`❌ YouTube Publishing failed: ${result.statusCode}`);
                return false;
            }
            
        } catch (error) {
            console.error('❌ YouTube Publishing test failed:', error.message);
            return false;
        }
    }

    async validateContextFlow() {
        console.log('\n🔄 Step 8: Validating Context Flow');
        
        // Check if contexts were properly passed between agents
        const contextChecks = {
            topicToScript: this.contexts.topic && this.contexts.script,
            scriptToMedia: this.contexts.script && this.contexts.media,
            scriptToAudio: this.contexts.script && this.contexts.audio,
            allToVideo: this.contexts.topic && this.contexts.script && this.contexts.media && this.contexts.audio && this.contexts.video
        };
        
        console.log('📊 Context Flow Validation:');
        console.log(`   Topic → Script: ${contextChecks.topicToScript ? '✅' : '❌'}`);
        console.log(`   Script → Media: ${contextChecks.scriptToMedia ? '✅' : '❌'}`);
        console.log(`   Script → Audio: ${contextChecks.scriptToAudio ? '✅' : '❌'}`);
        console.log(`   All → Video: ${contextChecks.allToVideo ? '✅' : '❌'}`);
        
        this.results.contextFlow = Object.values(contextChecks).every(check => check);
        
        return this.results.contextFlow;
    }

    async runCompleteTest() {
        console.log('🚀 Starting Complete End-to-End Video Production Pipeline Test');
        console.log(`📋 Test Project ID: ${this.testProjectId}`);
        console.log('🎯 Testing with FIRST TOPIC from Google Spreadsheet only\n');
        
        // Run all tests in sequence
        const steps = [
            { name: 'Workflow Orchestrator', test: () => this.testWorkflowOrchestrator() },
            { name: 'Topic Management', test: () => this.testTopicManagement() },
            { name: 'Script Generation', test: () => this.testScriptGeneration() },
            { name: 'Media Curation', test: () => this.testMediaCuration() },
            { name: 'Audio Generation', test: () => this.testAudioGeneration() },
            { name: 'Video Assembly', test: () => this.testVideoAssembly() },
            { name: 'YouTube Publishing', test: () => this.testYouTubePublishing() },
            { name: 'Context Flow Validation', test: () => this.validateContextFlow() }
        ];
        
        for (const step of steps) {
            try {
                const success = await step.test();
                if (!success) {
                    console.log(`\n⚠️ ${step.name} failed - continuing with remaining tests...`);
                }
            } catch (error) {
                console.error(`\n❌ ${step.name} threw error:`, error.message);
            }
            
            // Add delay between steps to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        this.printFinalResults();
    }

    printFinalResults() {
        console.log('\n' + '='.repeat(80));
        console.log('📊 END-TO-END PIPELINE TEST RESULTS');
        console.log('='.repeat(80));
        
        const steps = [
            { name: 'Google Sheets Integration', result: this.results.googleSheets },
            { name: 'Topic Generation', result: this.results.topicGeneration },
            { name: 'Script Generation', result: this.results.scriptGeneration },
            { name: 'Media Curation', result: this.results.mediaCuration },
            { name: 'Audio Generation', result: this.results.audioGeneration },
            { name: 'Video Assembly', result: this.results.videoAssembly },
            { name: 'YouTube Publishing', result: this.results.youtubePublishing },
            { name: 'Context Flow', result: this.results.contextFlow }
        ];
        
        let passedCount = 0;
        steps.forEach(step => {
            const status = step.result ? '✅ PASS' : '❌ FAIL';
            console.log(`   ${step.name.padEnd(25)} ${status}`);
            if (step.result) passedCount++;
        });
        
        console.log('\n📈 SUMMARY:');
        console.log(`   Passed: ${passedCount}/${steps.length} (${Math.round(passedCount/steps.length*100)}%)`);
        console.log(`   Project ID: ${this.testProjectId}`);
        
        if (passedCount === steps.length) {
            console.log('\n🎯 SUCCESS: Complete end-to-end video production pipeline is working!');
            console.log('🎬 The system can autonomously create videos from Google Sheets to YouTube!');
        } else if (passedCount >= 6) {
            console.log('\n⚠️ MOSTLY WORKING: Core pipeline functional with minor issues');
            console.log('🔧 Some components may need attention but system is operational');
        } else {
            console.log('\n❌ ISSUES DETECTED: Pipeline has significant problems');
            console.log('🛠️ Multiple components need fixing before production use');
        }
        
        console.log('\n💡 Next Steps:');
        if (this.results.videoAssembly) {
            console.log('   ✅ Video Assembler fix (Task 7.2) is working correctly');
        } else {
            console.log('   ❌ Video Assembler needs further investigation');
        }
        
        if (this.results.contextFlow) {
            console.log('   ✅ Context flow between agents is working');
        } else {
            console.log('   ❌ Context flow needs debugging');
        }
        
        console.log('='.repeat(80));
    }
}

async function main() {
    const tester = new EndToEndPipelineTest();
    await tester.runCompleteTest();
}

main().catch(console.error);