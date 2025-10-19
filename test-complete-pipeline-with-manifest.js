#!/usr/bin/env node

/**
 * Complete Pipeline Test with Manifest
 * Based on documentation: Referenced in README.md as the core pipeline test
 * Tests the complete pipeline with quality validation
 */

const https = require('https');
const fs = require('fs');

class CompletePipelineWithManifestTest {
    constructor() {
        this.baseUrl = 'https://f00upvjiwg.execute-api.us-east-1.amazonaws.com/prod';
        this.apiKey = 'gNmDejkMZOaT5Y5rsBVfq6tHz03xL0sC8s66JIyk';
        this.topic = 'Travel to Spain';
        this.projectId = null;
        this.results = {
            startTime: new Date(),
            steps: [],
            success: false
        };
    }

    async makeRequest(path, method = 'POST', data = null) {
        return new Promise((resolve, reject) => {
            const url = new URL(path, this.baseUrl);
            const options = {
                hostname: url.hostname,
                port: 443,
                path: url.pathname,
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': this.apiKey,
                    'User-Agent': 'Complete-Pipeline-Manifest-Test/1.0'
                }
            };

            if (data) {
                const postData = JSON.stringify(data);
                options.headers['Content-Length'] = Buffer.byteLength(postData);
            }

            const req = https.request(options, (res) => {
                let body = '';
                res.on('data', (chunk) => body += chunk);
                res.on('end', () => {
                    try {
                        resolve({
                            statusCode: res.statusCode,
                            headers: res.headers,
                            body: body ? JSON.parse(body) : null
                        });
                    } catch (error) {
                        resolve({
                            statusCode: res.statusCode,
                            headers: res.headers,
                            body: body,
                            parseError: error.message
                        });
                    }
                });
            });

            req.on('error', reject);

            if (data) {
                req.write(JSON.stringify(data));
            }

            req.end();
        });
    }

    logStep(step, status, details = '') {
        const timestamp = new Date().toISOString();
        const result = {
            step,
            status,
            timestamp,
            details
        };
        this.results.steps.push(result);

        const statusIcon = status === 'SUCCESS' ? '✅' : status === 'FAILED' ? '❌' : '🔄';
        console.log(`${statusIcon} [${timestamp}] ${step}: ${status}`);
        if (details) console.log(`   ${details}`);
    }

    async testTopicManagement() {
        this.logStep('Topic Management', 'RUNNING', 'Creating Spain travel project with enhanced prompts');

        try {
            const response = await this.makeRequest('/topics', 'POST', {
                topic: this.topic,
                category: 'travel',
                targetAudience: 'travel enthusiasts',
                duration: 'medium',
                style: 'informative',
                requirements: {
                    concrete: true,
                    valueProposition: true,
                    visualGuidance: true,
                    actionable: true
                }
            });

            if (response.statusCode === 200 && response.body && response.body.success) {
                this.projectId = response.body.projectId || response.body.topicId;
                this.topicContext = response.body.topicContext;
                this.logStep('Topic Management', 'SUCCESS', `Enhanced project created: ${this.projectId}`);
                return true;
            } else {
                this.logStep('Topic Management', 'FAILED', `Status: ${response.statusCode}, Body: ${JSON.stringify(response.body)}`);
                return false;
            }
        } catch (error) {
            this.logStep('Topic Management', 'FAILED', `Error: ${error.message}`);
            return false;
        }
    }

    async testScriptGeneration() {
        this.logStep('Script Generation', 'RUNNING', 'Generating scene-aware script with timing');

        try {
            const response = await this.makeRequest('/scripts/generate', 'POST', {
                topic: this.topic,
                projectId: this.projectId,
                topicContext: this.topicContext,
                style: 'informative',
                duration: 480, // 8 minutes
                targetAudience: 'travel enthusiasts',
                requirements: {
                    sceneBreakdown: true,
                    visualRequirements: true,
                    timing: true
                }
            });

            if (response.statusCode === 200 && response.body && response.body.success) {
                this.script = response.body.script;
                this.sceneContext = response.body.sceneContext;
                const scriptLength = this.script ? this.script.length : 0;
                const sceneCount = this.sceneContext && this.sceneContext.scenes ? this.sceneContext.scenes.length : 0;
                this.logStep('Script Generation', 'SUCCESS', `Script generated: ${scriptLength} chars, ${sceneCount} scenes`);
                return true;
            } else {
                this.logStep('Script Generation', 'FAILED', `Status: ${response.statusCode}, Body: ${JSON.stringify(response.body)}`);
                return false;
            }
        } catch (error) {
            this.logStep('Script Generation', 'FAILED', `Error: ${error.message}`);
            return false;
        }
    }

    async testMediaCuration() {
        this.logStep('Media Curation', 'RUNNING', 'Curating scene-specific media with proper organization');

        try {
            const response = await this.makeRequest('/media/curate', 'POST', {
                topic: this.topic,
                projectId: this.projectId,
                script: this.script,
                sceneContext: this.sceneContext,
                requirements: {
                    sceneOrganization: true,
                    minVisualsPerScene: 3,
                    properFolderStructure: true
                }
            });

            if (response.statusCode === 200 && response.body && response.body.success) {
                this.mediaItems = response.body.mediaItems;
                this.mediaContext = response.body.mediaContext;
                const mediaCount = this.mediaItems ? this.mediaItems.length : 0;
                this.logStep('Media Curation', 'SUCCESS', `Media curated: ${mediaCount} items with scene organization`);
                return true;
            } else {
                this.logStep('Media Curation', 'FAILED', `Status: ${response.statusCode}, Body: ${JSON.stringify(response.body)}`);
                return false;
            }
        } catch (error) {
            this.logStep('Media Curation', 'FAILED', `Error: ${error.message}`);
            return false;
        }
    }

    async testAudioGeneration() {
        this.logStep('Audio Generation', 'RUNNING', 'Generating professional narration with AWS Polly');

        try {
            const response = await this.makeRequest('/audio/generate', 'POST', {
                script: this.script,
                projectId: this.projectId,
                sceneContext: this.sceneContext,
                voice: 'Joanna',
                speed: 'medium',
                requirements: {
                    sceneSynchronization: true,
                    masterFile: true,
                    metadata: true
                }
            });

            if (response.statusCode === 200 && response.body && response.body.success) {
                this.audioUrl = response.body.audioUrl;
                this.audioContext = response.body.audioContext;
                this.logStep('Audio Generation', 'SUCCESS', `Professional narration generated: ${this.audioUrl}`);
                return true;
            } else {
                this.logStep('Audio Generation', 'FAILED', `Status: ${response.statusCode}, Body: ${JSON.stringify(response.body)}`);
                return false;
            }
        } catch (error) {
            this.logStep('Audio Generation', 'FAILED', `Error: ${error.message}`);
            return false;
        }
    }

    async testManifestBuilder() {
        this.logStep('Manifest Builder', 'RUNNING', 'Quality gatekeeper validation and manifest creation');

        try {
            const response = await this.makeRequest('/manifest/build', 'POST', {
                projectId: this.projectId,
                topicContext: this.topicContext,
                sceneContext: this.sceneContext,
                mediaContext: this.mediaContext,
                audioContext: this.audioContext,
                script: this.script,
                audioUrl: this.audioUrl,
                mediaItems: this.mediaItems,
                title: `Amazing Travel Guide: ${this.topic}`,
                requirements: {
                    qualityValidation: true,
                    minVisualsPerScene: 3,
                    audioSceneParity: true,
                    completeContexts: true
                }
            });

            if (response.statusCode === 200 && response.body && response.body.success) {
                this.manifest = response.body.manifest;
                this.qualityScore = response.body.qualityScore;
                this.kpis = response.body.kpis;
                this.logStep('Manifest Builder', 'SUCCESS', `Quality validation passed, score: ${this.qualityScore}`);

                if (this.kpis) {
                    console.log('   📊 Quality KPIs:');
                    Object.entries(this.kpis).forEach(([key, value]) => {
                        console.log(`      ${key}: ${value}`);
                    });
                }

                return true;
            } else if (response.statusCode === 400) {
                this.logStep('Manifest Builder', 'FAILED', `Quality validation failed: ${JSON.stringify(response.body)}`);
                return false;
            } else {
                this.logStep('Manifest Builder', 'FAILED', `Status: ${response.statusCode}, Body: ${JSON.stringify(response.body)}`);
                return false;
            }
        } catch (error) {
            this.logStep('Manifest Builder', 'FAILED', `Error: ${error.message}`);
            return false;
        }
    }

    async testVideoAssembly() {
        this.logStep('Video Assembly', 'RUNNING', 'Deterministic video rendering from unified manifest');

        try {
            const response = await this.makeRequest('/video/assemble', 'POST', {
                projectId: this.projectId,
                manifest: this.manifest,
                requirements: {
                    ffmpegIntegration: true,
                    realMP4Creation: true,
                    manifestDriven: true
                }
            });

            if (response.statusCode === 200 && response.body && response.body.success) {
                this.videoUrl = response.body.videoUrl;
                this.logStep('Video Assembly', 'SUCCESS', `Real MP4 video created: ${this.videoUrl}`);
                return true;
            } else {
                this.logStep('Video Assembly', 'FAILED', `Status: ${response.statusCode}, Body: ${JSON.stringify(response.body)}`);
                return false;
            }
        } catch (error) {
            this.logStep('Video Assembly', 'FAILED', `Error: ${error.message}`);
            return false;
        }
    }

    async testYouTubePublisher() {
        this.logStep('YouTube Publisher', 'RUNNING', 'OAuth 2.0 authentication and upload test');

        try {
            const response = await this.makeRequest('/youtube/publish', 'POST', {
                manifest: this.manifest,
                videoUrl: this.videoUrl,
                testMode: true, // Don't actually publish during testing
                title: `[TEST] Amazing Travel Guide: ${this.topic}`,
                description: `Complete pipeline test for ${this.topic} with quality validation.`,
                tags: ['test', 'travel', 'spain', 'automation', 'quality'],
                privacy: 'private',
                requirements: {
                    oauth2Authentication: true,
                    smartUploadMode: true,
                    robustFallback: true
                }
            });

            if (response.statusCode === 200 && response.body && response.body.success) {
                this.logStep('YouTube Publisher', 'SUCCESS', `OAuth 2.0 test successful: ${response.body.message}`);
                return true;
            } else {
                this.logStep('YouTube Publisher', 'FAILED', `Status: ${response.statusCode}, Body: ${JSON.stringify(response.body)}`);
                return false;
            }
        } catch (error) {
            this.logStep('YouTube Publisher', 'FAILED', `Error: ${error.message}`);
            return false;
        }
    }

    async runCompleteTest() {
        console.log('🎬 Complete Pipeline Test with Manifest Quality Validation');
        console.log('='.repeat(70));
        console.log(`📅 Test Started: ${this.results.startTime.toISOString()}`);
        console.log(`🌐 API Base URL: ${this.baseUrl}`);
        console.log(`🎯 Topic: ${this.topic}`);
        console.log(`📋 Mode: Complete pipeline with quality gatekeeper`);
        console.log(`📚 Based on: README.md core pipeline test`);
        console.log('='.repeat(70));

        const steps = [
            () => this.testTopicManagement(),
            () => this.testScriptGeneration(),
            () => this.testMediaCuration(),
            () => this.testAudioGeneration(),
            () => this.testManifestBuilder(),
            () => this.testVideoAssembly(),
            () => this.testYouTubePublisher()
        ];

        let allStepsSuccessful = true;

        for (let i = 0; i < steps.length; i++) {
            const stepResult = await steps[i]();
            if (!stepResult) {
                allStepsSuccessful = false;
                console.log(`\n⚠️  Step ${i + 1} failed. Continuing with remaining steps...\n`);
            }

            if (i < steps.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }

        this.results.success = allStepsSuccessful;
        this.results.endTime = new Date();
        this.results.duration = this.results.endTime - this.results.startTime;

        this.printResults();
        return this.results;
    }

    printResults() {
        console.log('\n' + '='.repeat(70));
        console.log('📊 COMPLETE PIPELINE WITH MANIFEST RESULTS');
        console.log('='.repeat(70));

        const successCount = this.results.steps.filter(s => s.status === 'SUCCESS').length;
        const failedCount = this.results.steps.filter(s => s.status === 'FAILED').length;

        console.log(`✅ Successful Steps: ${successCount}/7`);
        console.log(`❌ Failed Steps: ${failedCount}/7`);
        console.log(`⏱️  Total Duration: ${Math.round(this.results.duration / 1000)}s`);
        console.log(`🎯 Overall Result: ${this.results.success ? '✅ SUCCESS' : '❌ FAILED'}`);

        if (this.qualityScore) {
            console.log(`📊 Quality Score: ${this.qualityScore}`);
        }

        if (failedCount > 0) {
            console.log('\n🔍 Failed Steps Details:');
            this.results.steps
                .filter(s => s.status === 'FAILED')
                .forEach(step => {
                    console.log(`   ❌ ${step.step}: ${step.details}`);
                });
        }

        console.log('\n📋 Complete Step Summary:');
        this.results.steps.forEach((step, index) => {
            const icon = step.status === 'SUCCESS' ? '✅' : '❌';
            console.log(`   ${icon} Step ${index + 1}: ${step.step}`);
        });

        const resultsFile = `complete-pipeline-manifest-results-${Date.now()}.json`;
        fs.writeFileSync(resultsFile, JSON.stringify(this.results, null, 2));
        console.log(`\n💾 Detailed results saved to: ${resultsFile}`);

        console.log('='.repeat(70));

        if (this.results.success) {
            console.log('🎉 SUCCESS: Complete pipeline with quality validation is operational!');
            console.log('📚 This matches the documentation showing 100% working system');
            console.log('🛡️  Quality gatekeeper is enforcing content standards');
            console.log('🎬 Ready for production video creation');
        } else {
            console.log('⚠️  Some steps failed - this may indicate API configuration changes');
            console.log('📚 Documentation shows system working - may need endpoint/auth updates');
            console.log('💡 Focus on fixing authentication and endpoint configuration');
        }
    }
}

if (require.main === module) {
    const test = new CompletePipelineWithManifestTest();
    test.runCompleteTest()
        .then(results => {
            process.exit(results.success ? 0 : 1);
        })
        .catch(error => {
            console.error('❌ Test execution failed:', error);
            process.exit(1);
        });
}

module.exports = CompletePipelineWithManifestTest;