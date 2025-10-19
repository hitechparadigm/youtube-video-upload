#!/usr/bin/env node

/**
 * End-to-End Test: Travel to Spain Video Pipeline
 * Tests the complete automated video pipeline with optimized CI/CD
 */

const https = require('https');
const fs = require('fs');

class TravelSpainE2ETest {
    constructor() {
        this.baseUrl = process.env.API_URL || 'https://f00upvjiwg.execute-api.us-east-1.amazonaws.com/prod';
        this.apiKey = process.env.API_KEY || 'gNmDejkMZOaT5Y5rsBVfq6tHz03xL0sC8s66JIyk';
        this.topic = 'Travel to Spain';
        this.testResults = {
            startTime: new Date(),
            steps: [],
            success: false,
            errors: []
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
                    'User-Agent': 'Travel-Spain-E2E-Test/1.0'
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
                        const response = {
                            statusCode: res.statusCode,
                            headers: res.headers,
                            body: body ? JSON.parse(body) : null
                        };
                        resolve(response);
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
        this.testResults.steps.push(result);

        const statusIcon = status === 'SUCCESS' ? '✅' : status === 'FAILED' ? '❌' : '🔄';
        console.log(`${statusIcon} [${timestamp}] ${step}: ${status}`);
        if (details) console.log(`   ${details}`);
    }

    async testStep1_TopicManagement() {
        this.logStep('Step 1: Topic Management', 'RUNNING', 'Creating topic: Travel to Spain');

        try {
            const response = await this.makeRequest('/topics', 'POST', {
                topic: this.topic,
                category: 'travel',
                targetAudience: 'travel enthusiasts',
                duration: 'medium',
                style: 'informative'
            });

            if (response.statusCode === 200 && response.body && response.body.success) {
                this.logStep('Step 1: Topic Management', 'SUCCESS', `Topic created with ID: ${response.body.topicId}`);
                this.topicId = response.body.topicId;
                return true;
            } else {
                this.logStep('Step 1: Topic Management', 'FAILED', `Status: ${response.statusCode}, Body: ${JSON.stringify(response.body)}`);
                return false;
            }
        } catch (error) {
            this.logStep('Step 1: Topic Management', 'FAILED', `Error: ${error.message}`);
            return false;
        }
    }

    async testStep2_ScriptGeneration() {
        this.logStep('Step 2: Script Generation', 'RUNNING', 'Generating script for Travel to Spain');

        try {
            const response = await this.makeRequest('/scripts/generate', 'POST', {
                topic: this.topic,
                topicId: this.topicId,
                style: 'informative',
                duration: 300,
                targetAudience: 'travel enthusiasts'
            });

            if (response.statusCode === 200 && response.body && response.body.success) {
                const scriptLength = response.body.script ? response.body.script.length : 0;
                this.logStep('Step 2: Script Generation', 'SUCCESS', `Script generated: ${scriptLength} characters`);
                this.script = response.body.script;
                return true;
            } else {
                this.logStep('Step 2: Script Generation', 'FAILED', `Status: ${response.statusCode}, Body: ${JSON.stringify(response.body)}`);
                return false;
            }
        } catch (error) {
            this.logStep('Step 2: Script Generation', 'FAILED', `Error: ${error.message}`);
            return false;
        }
    }

    async testStep3_AudioGeneration() {
        this.logStep('Step 3: Audio Generation', 'RUNNING', 'Converting script to audio');

        try {
            const response = await this.makeRequest('/audio/generate', 'POST', {
                script: this.script,
                voice: 'Joanna',
                speed: 'medium',
                topicId: this.topicId
            });

            if (response.statusCode === 200 && response.body && response.body.success) {
                this.logStep('Step 3: Audio Generation', 'SUCCESS', `Audio generated: ${response.body.audioUrl}`);
                this.audioUrl = response.body.audioUrl;
                return true;
            } else {
                this.logStep('Step 3: Audio Generation', 'FAILED', `Status: ${response.statusCode}, Body: ${JSON.stringify(response.body)}`);
                return false;
            }
        } catch (error) {
            this.logStep('Step 3: Audio Generation', 'FAILED', `Error: ${error.message}`);
            return false;
        }
    }

    async testStep4_MediaCuration() {
        this.logStep('Step 4: Media Curation', 'RUNNING', 'Finding Spain travel images');

        try {
            const response = await this.makeRequest('/media/curate', 'POST', {
                topic: this.topic,
                script: this.script,
                topicId: this.topicId,
                mediaType: 'images',
                count: 10
            });

            if (response.statusCode === 200 && response.body && response.body.success) {
                const mediaCount = response.body.mediaItems ? response.body.mediaItems.length : 0;
                this.logStep('Step 4: Media Curation', 'SUCCESS', `Found ${mediaCount} media items`);
                this.mediaItems = response.body.mediaItems;
                return true;
            } else {
                this.logStep('Step 4: Media Curation', 'FAILED', `Status: ${response.statusCode}, Body: ${JSON.stringify(response.body)}`);
                return false;
            }
        } catch (error) {
            this.logStep('Step 4: Media Curation', 'FAILED', `Error: ${error.message}`);
            return false;
        }
    }

    async testStep5_VideoAssembly() {
        this.logStep('Step 5: Video Assembly', 'RUNNING', 'Assembling Travel to Spain video');

        try {
            const response = await this.makeRequest('/video/assemble', 'POST', {
                topicId: this.topicId,
                audioUrl: this.audioUrl,
                mediaItems: this.mediaItems,
                script: this.script,
                title: `Amazing Travel Guide: ${this.topic}`,
                description: `Discover the beauty and culture of Spain in this comprehensive travel guide.`
            });

            if (response.statusCode === 200 && response.body && response.body.success) {
                this.logStep('Step 5: Video Assembly', 'SUCCESS', `Video assembled: ${response.body.videoUrl}`);
                this.videoUrl = response.body.videoUrl;
                return true;
            } else {
                this.logStep('Step 5: Video Assembly', 'FAILED', `Status: ${response.statusCode}, Body: ${JSON.stringify(response.body)}`);
                return false;
            }
        } catch (error) {
            this.logStep('Step 5: Video Assembly', 'FAILED', `Error: ${error.message}`);
            return false;
        }
    }

    async testStep6_ManifestBuilder() {
        this.logStep('Step 6: Manifest Builder', 'RUNNING', 'Building video manifest');

        try {
            const response = await this.makeRequest('/manifest/build', 'POST', {
                topicId: this.topicId,
                videoUrl: this.videoUrl,
                audioUrl: this.audioUrl,
                script: this.script,
                mediaItems: this.mediaItems,
                title: `Amazing Travel Guide: ${this.topic}`,
                tags: ['travel', 'spain', 'tourism', 'culture', 'guide']
            });

            if (response.statusCode === 200 && response.body && response.body.success) {
                this.logStep('Step 6: Manifest Builder', 'SUCCESS', `Manifest created with quality score: ${response.body.qualityScore}`);
                this.manifest = response.body.manifest;
                return true;
            } else {
                this.logStep('Step 6: Manifest Builder', 'FAILED', `Status: ${response.statusCode}, Body: ${JSON.stringify(response.body)}`);
                return false;
            }
        } catch (error) {
            this.logStep('Step 6: Manifest Builder', 'FAILED', `Error: ${error.message}`);
            return false;
        }
    }

    async testStep7_YouTubePublishing() {
        this.logStep('Step 7: YouTube Publishing', 'RUNNING', 'Publishing to YouTube (TEST MODE)');

        try {
            const response = await this.makeRequest('/youtube/publish', 'POST', {
                manifest: this.manifest,
                testMode: true,
                title: `[TEST] Amazing Travel Guide: ${this.topic}`,
                description: `Test video for Travel to Spain pipeline validation.`,
                tags: ['test', 'travel', 'spain', 'automation'],
                privacy: 'private'
            });

            if (response.statusCode === 200 && response.body && response.body.success) {
                this.logStep('Step 7: YouTube Publishing', 'SUCCESS', `Test publish successful: ${response.body.message}`);
                return true;
            } else {
                this.logStep('Step 7: YouTube Publishing', 'FAILED', `Status: ${response.statusCode}, Body: ${JSON.stringify(response.body)}`);
                return false;
            }
        } catch (error) {
            this.logStep('Step 7: YouTube Publishing', 'FAILED', `Error: ${error.message}`);
            return false;
        }
    }

    async runCompleteTest() {
        console.log('🚀 Starting End-to-End Test: Travel to Spain Video Pipeline');
        console.log('='.repeat(60));
        console.log(`📅 Test Started: ${this.testResults.startTime.toISOString()}`);
        console.log(`🌐 API Base URL: ${this.baseUrl}`);
        console.log(`🎯 Topic: ${this.topic}`);
        console.log('='.repeat(60));

        const steps = [
            () => this.testStep1_TopicManagement(),
            () => this.testStep2_ScriptGeneration(),
            () => this.testStep3_AudioGeneration(),
            () => this.testStep4_MediaCuration(),
            () => this.testStep5_VideoAssembly(),
            () => this.testStep6_ManifestBuilder(),
            () => this.testStep7_YouTubePublishing()
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

        this.testResults.success = allStepsSuccessful;
        this.testResults.endTime = new Date();
        this.testResults.duration = this.testResults.endTime - this.testResults.startTime;

        this.printFinalResults();
        return this.testResults;
    }

    printFinalResults() {
        console.log('\n' + '='.repeat(60));
        console.log('📊 FINAL TEST RESULTS');
        console.log('='.repeat(60));

        const successCount = this.testResults.steps.filter(s => s.status === 'SUCCESS').length;
        const failedCount = this.testResults.steps.filter(s => s.status === 'FAILED').length;

        console.log(`✅ Successful Steps: ${successCount}`);
        console.log(`❌ Failed Steps: ${failedCount}`);
        console.log(`⏱️  Total Duration: ${Math.round(this.testResults.duration / 1000)}s`);
        console.log(`🎯 Overall Result: ${this.testResults.success ? '✅ SUCCESS' : '❌ FAILED'}`);

        if (failedCount > 0) {
            console.log('\n🔍 Failed Steps Details:');
            this.testResults.steps
                .filter(s => s.status === 'FAILED')
                .forEach(step => {
                    console.log(`   ❌ ${step.step}: ${step.details}`);
                });
        }

        console.log('\n📋 Complete Step Summary:');
        this.testResults.steps.forEach((step, index) => {
            const icon = step.status === 'SUCCESS' ? '✅' : '❌';
            console.log(`   ${icon} Step ${index + 1}: ${step.step}`);
        });

        const resultsFile = `test-results-travel-spain-${Date.now()}.json`;
        fs.writeFileSync(resultsFile, JSON.stringify(this.testResults, null, 2));
        console.log(`\n💾 Detailed results saved to: ${resultsFile}`);

        console.log('='.repeat(60));
    }
}

if (require.main === module) {
    const test = new TravelSpainE2ETest();
    test.runCompleteTest()
        .then(results => {
            process.exit(results.success ? 0 : 1);
        })
        .catch(error => {
            console.error('❌ Test execution failed:', error);
            process.exit(1);
        });
}

module.exports = TravelSpainE2ETest;