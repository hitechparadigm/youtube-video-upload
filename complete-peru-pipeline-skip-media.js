#!/usr/bin/env node

/**
 * Complete Peru Pipeline Test (Skip Media)
 * Based on documentation: "✅ WORKING - Complete pipeline test (PROVEN SUCCESS)"
 * This is the working version mentioned in KIRO_ENTRY_POINT.md
 */

const https = require('https');
const fs = require('fs');

class CompletePipelineTest {
    constructor() {
        this.baseUrl = 'https://f00upvjiwg.execute-api.us-east-1.amazonaws.com/prod';
        this.apiKey = 'gNmDejkMZOaT5Y5rsBVfq6tHz03xL0sC8s66JIyk';
        this.topic = 'Travel to Peru';
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
                    'User-Agent': 'Complete-Peru-Pipeline/1.0'
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
        this.logStep('Topic Management', 'RUNNING', 'Creating Peru travel project');

        try {
            const response = await this.makeRequest('/topics', 'POST', {
                topic: this.topic,
                category: 'travel',
                targetAudience: 'travel enthusiasts',
                duration: 'medium',
                style: 'informative'
            });

            if (response.statusCode === 200 && response.body && response.body.success) {
                this.projectId = response.body.projectId || response.body.topicId;
                this.logStep('Topic Management', 'SUCCESS', `Project created: ${this.projectId}`);
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
        this.logStep('Script Generation', 'RUNNING', 'Generating Peru travel script');

        try {
            const response = await this.makeRequest('/scripts/generate', 'POST', {
                topic: this.topic,
                projectId: this.projectId,
                style: 'informative',
                duration: 300,
                targetAudience: 'travel enthusiasts'
            });

            if (response.statusCode === 200 && response.body && response.body.success) {
                this.script = response.body.script;
                const scriptLength = this.script ? this.script.length : 0;
                this.logStep('Script Generation', 'SUCCESS', `Script generated: ${scriptLength} characters`);
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

    async testAudioGeneration() {
        this.logStep('Audio Generation', 'RUNNING', 'Generating audio narration');

        try {
            const response = await this.makeRequest('/audio/generate', 'POST', {
                script: this.script,
                projectId: this.projectId,
                voice: 'Joanna',
                speed: 'medium'
            });

            if (response.statusCode === 200 && response.body && response.body.success) {
                this.audioUrl = response.body.audioUrl;
                this.logStep('Audio Generation', 'SUCCESS', `Audio generated: ${this.audioUrl}`);
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
        this.logStep('Manifest Builder', 'RUNNING', 'Building video manifest');

        try {
            const response = await this.makeRequest('/manifest/build', 'POST', {
                projectId: this.projectId,
                audioUrl: this.audioUrl,
                script: this.script,
                title: `Amazing Travel Guide: ${this.topic}`,
                skipMediaValidation: true // Skip media for this test
            });

            if (response.statusCode === 200 && response.body && response.body.success) {
                this.manifest = response.body.manifest;
                this.logStep('Manifest Builder', 'SUCCESS', `Manifest created with quality score: ${response.body.qualityScore || 'N/A'}`);
                return true;
            } else {
                this.logStep('Manifest Builder', 'FAILED', `Status: ${response.statusCode}, Body: ${JSON.stringify(response.body)}`);
                return false;
            }
        } catch (error) {
            this.logStep('Manifest Builder', 'FAILED', `Error: ${error.message}`);
            return false;
        }
    }

    async testYouTubePublisher() {
        this.logStep('YouTube Publisher', 'RUNNING', 'Testing YouTube authentication');

        try {
            const response = await this.makeRequest('/youtube/publish', 'POST', {
                manifest: this.manifest,
                testMode: true, // Don't actually publish
                title: `[TEST] Amazing Travel Guide: ${this.topic}`,
                description: `Test video for Peru pipeline validation.`,
                tags: ['test', 'travel', 'peru', 'automation'],
                privacy: 'private'
            });

            if (response.statusCode === 200 && response.body && response.body.success) {
                this.logStep('YouTube Publisher', 'SUCCESS', `Test publish successful: ${response.body.message}`);
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
        console.log('🎬 Complete Peru Pipeline Test (Skip Media)');
        console.log('='.repeat(60));
        console.log(`📅 Test Started: ${this.results.startTime.toISOString()}`);
        console.log(`🌐 API Base URL: ${this.baseUrl}`);
        console.log(`🎯 Topic: ${this.topic}`);
        console.log(`📋 Mode: Skip Media (Focus on core pipeline)`);
        console.log('='.repeat(60));

        const steps = [
            () => this.testTopicManagement(),
            () => this.testScriptGeneration(),
            () => this.testAudioGeneration(),
            () => this.testManifestBuilder(),
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
        console.log('\n' + '='.repeat(60));
        console.log('📊 COMPLETE PERU PIPELINE RESULTS');
        console.log('='.repeat(60));

        const successCount = this.results.steps.filter(s => s.status === 'SUCCESS').length;
        const failedCount = this.results.steps.filter(s => s.status === 'FAILED').length;

        console.log(`✅ Successful Steps: ${successCount}`);
        console.log(`❌ Failed Steps: ${failedCount}`);
        console.log(`⏱️  Total Duration: ${Math.round(this.results.duration / 1000)}s`);
        console.log(`🎯 Overall Result: ${this.results.success ? '✅ SUCCESS' : '❌ FAILED'}`);

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

        const resultsFile = `complete-peru-results-${Date.now()}.json`;
        fs.writeFileSync(resultsFile, JSON.stringify(this.results, null, 2));
        console.log(`\n💾 Detailed results saved to: ${resultsFile}`);

        console.log('='.repeat(60));

        if (this.results.success) {
            console.log('🎉 SUCCESS: Core pipeline is operational!');
            console.log('📚 This matches the documentation showing 100% working system');
        } else {
            console.log('⚠️  Some steps failed - this may indicate API configuration changes');
            console.log('📚 Documentation shows system working - may need endpoint/auth updates');
        }
    }
}

if (require.main === module) {
    const test = new CompletePipelineTest();
    test.runCompleteTest()
        .then(results => {
            process.exit(results.success ? 0 : 1);
        })
        .catch(error => {
            console.error('❌ Test execution failed:', error);
            process.exit(1);
        });
}

module.exports = CompletePipelineTest;