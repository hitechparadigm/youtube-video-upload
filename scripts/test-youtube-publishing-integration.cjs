#!/usr/bin/env node

/**
 * YouTube Publishing Integration Tests
 * Tests the complete workflow: Video Assembly → SEO Optimization → YouTube Publishing
 */

const https = require('https');

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'https://your-api-gateway-url.amazonaws.com/prod';
const API_KEY = process.env.API_KEY || 'your-api-key';

console.log('🎬 Testing YouTube Publishing Integration');
console.log('='.repeat(80));

/**
 * Make HTTP request to Lambda function
 */
function makeRequest(endpoint, method = 'POST', data = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(endpoint, API_BASE_URL);
        
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': API_KEY
            }
        };
        
        const req = https.request(url, options, (res) => {
            let responseData = '';
            
            res.on('data', (chunk) => {
                responseData += chunk;
            });
            
            res.on('end', () => {
                try {
                    const jsonData = JSON.parse(responseData);
                    resolve({
                        statusCode: res.statusCode,
                        data: jsonData
                    });
                } catch (error) {
                    resolve({
                        statusCode: res.statusCode,
                        data: responseData
                    });
                }
            });
        });
        
        req.on('error', (error) => {
            reject(error);
        });
        
        if (data) {
            req.write(JSON.stringify(data));
        }
        
        req.end();
    });
}

/**
 * Test 1: SEO Optimization for YouTube
 */
async function testSEOOptimization() {
    console.log('\n🎯 Test 1: SEO Optimization for YouTube Publishing');
    
    const projectId = "project-2025-10-07-investing-beginners";
    
    const requestData = {
        projectId: projectId,
        targetAudience: 'beginners',
        contentStyle: 'educational',
        competitorAnalysis: true
    };
    
    console.log(`📝 Optimizing metadata for project: ${projectId}`);
    
    try {
        const response = await makeRequest('/seo/optimize-metadata', 'POST', requestData);
        
        if (response.statusCode === 200) {
            const result = response.data;
            console.log('✅ SEO optimization completed:');
            console.log(`   📊 SEO Score: ${result.seoScore}/100`);
            console.log(`   📝 Title: "${result.optimizedMetadata?.titleVariations?.[0] || 'N/A'}"`);
            console.log(`   🏷️  Tags: ${result.optimizedMetadata?.tags?.length || 0} tags`);
            
            return {
                success: true,
                videoId: result.videoId,
                optimizedMetadata: result.optimizedMetadata
            };
        } else {
            console.log(`❌ SEO optimization failed: ${response.statusCode}`);
            return { success: false, error: response.data };
        }
        
    } catch (error) {
        console.log(`❌ Error in SEO optimization: ${error.message}`);
        return { success: false, error: error.message };
    }
}

/**
 * Test 2: YouTube Publishing with Optimized Metadata
 */
async function testYouTubePublishing(seoResult) {
    console.log('\n📺 Test 2: YouTube Publishing with Optimized Metadata');
    
    if (!seoResult.success) {
        console.log('❌ Skipping YouTube publishing test due to SEO optimization failure');
        return { success: false, error: 'SEO optimization failed' };
    }
    
    const publishRequest = {
        videoId: seoResult.videoId,
        videoFilePath: `s3://automated-video-pipeline-786673323159-us-east-1/videos/project-2025-10-07-investing-beginners/final/project-2025-10-07-investing-beginners.mp4`,
        
        // Use optimized metadata from SEO optimizer
        title: seoResult.optimizedMetadata?.titleVariations?.[0] || 'Default Title',
        description: seoResult.optimizedMetadata?.description || 'Default description',
        tags: seoResult.optimizedMetadata?.tags || ['default'],
        
        // Publishing options
        privacy: 'private', // Use private for testing
        categoryId: '27', // Education category
        defaultLanguage: 'en',
        
        // Thumbnail (optional)
        thumbnail: `s3://automated-video-pipeline-786673323159-us-east-1/videos/project-2025-10-07-investing-beginners/thumbnails/thumbnail.jpg`
    };
    
    console.log(`📝 Publishing video: ${publishRequest.videoId}`);
    console.log(`📋 Title: "${publishRequest.title}"`);
    console.log(`🏷️  Tags: ${publishRequest.tags.length} tags`);
    
    try {
        const response = await makeRequest('/youtube/publish', 'POST', publishRequest);
        
        if (response.statusCode === 200) {
            const result = response.data;
            console.log('✅ YouTube publishing initiated:');
            console.log(`   📺 YouTube Video ID: ${result.youtubeVideoId || 'Pending'}`);
            console.log(`   📊 Upload Status: ${result.status}`);
            console.log(`   🔗 Video URL: ${result.videoUrl || 'Pending'}`);
            
            return {
                success: true,
                youtubeVideoId: result.youtubeVideoId,
                uploadStatus: result.status,
                videoUrl: result.videoUrl
            };
        } else {
            console.log(`❌ YouTube publishing failed: ${response.statusCode}`);
            return { success: false, error: response.data };
        }
        
    } catch (error) {
        console.log(`❌ Error in YouTube publishing: ${error.message}`);
        return { success: false, error: error.message };
    }
}

/**
 * Test 3: Upload Status Monitoring
 */
async function testUploadStatusMonitoring(publishResult) {
    console.log('\n📊 Test 3: Upload Status Monitoring');
    
    if (!publishResult.success) {
        console.log('❌ Skipping status monitoring test due to publishing failure');
        return { success: false, error: 'Publishing failed' };
    }
    
    const statusRequest = {
        videoId: publishResult.youtubeVideoId || 'test-video-id',
        action: 'status'
    };
    
    console.log(`📝 Checking upload status for: ${statusRequest.videoId}`);
    
    try {
        const response = await makeRequest('/youtube/status', 'GET', statusRequest);
        
        if (response.statusCode === 200) {
            const result = response.data;
            console.log('✅ Status monitoring working:');
            console.log(`   📊 Current Status: ${result.status?.uploadStatus || 'Unknown'}`);
            console.log(`   📈 Progress: ${result.status?.progress || 0}%`);
            console.log(`   ⏱️  Processing Time: ${result.status?.processingTime || 'N/A'}`);
            
            return {
                success: true,
                status: result.status
            };
        } else {
            console.log(`❌ Status monitoring failed: ${response.statusCode}`);
            return { success: false, error: response.data };
        }
        
    } catch (error) {
        console.log(`❌ Error in status monitoring: ${error.message}`);
        return { success: false, error: error.message };
    }
}

/**
 * Test 4: OAuth Authentication Flow
 */
async function testOAuthAuthentication() {
    console.log('\n🔐 Test 4: OAuth Authentication Flow');
    
    const authRequest = {
        action: 'test-auth'
    };
    
    console.log('📝 Testing YouTube OAuth authentication...');
    
    try {
        const response = await makeRequest('/youtube/auth/test', 'POST', authRequest);
        
        if (response.statusCode === 200) {
            const result = response.data;
            console.log('✅ OAuth authentication working:');
            console.log(`   🔑 Auth Status: ${result.authenticated ? 'Valid' : 'Invalid'}`);
            console.log(`   📋 Scopes: ${result.scopes?.join(', ') || 'N/A'}`);
            console.log(`   ⏱️  Token Expiry: ${result.tokenExpiry || 'N/A'}`);
            
            return {
                success: true,
                authenticated: result.authenticated,
                scopes: result.scopes
            };
        } else {
            console.log(`❌ OAuth authentication failed: ${response.statusCode}`);
            return { success: false, error: response.data };
        }
        
    } catch (error) {
        console.log(`❌ Error in OAuth authentication: ${error.message}`);
        return { success: false, error: error.message };
    }
}

/**
 * Mock Integration Test (for demonstration)
 */
async function mockIntegrationTest() {
    console.log('🎬 Testing YouTube Publishing Integration');
    console.log('🧪 Running in MOCK mode (no actual API calls)');
    
    // Mock Test 1: SEO Optimization
    console.log('\n🎯 Test 1: SEO Optimization for YouTube Publishing');
    console.log('📝 Optimizing metadata for project: project-2025-10-07-investing-beginners');
    
    const mockSEOResult = {
        success: true,
        videoId: `video-project-2025-10-07-investing-beginners-${Date.now()}`,
        optimizedMetadata: {
            titleVariations: [
                "Investing for Beginners: 3 Best Apps to Start Today!",
                "How to Start Investing: Complete Beginner's Guide 2025",
                "Best Investment Apps for Beginners (Start with $1!)"
            ],
            description: `🎯 Ready to start investing but don't know where to begin? This complete 8-minute guide shows you the 3 best investment apps for beginners in 2025!

📊 What you'll learn:
1. Hook - Investment Success Story (0:00)
2. Problem - Investment Confusion (0:15)
3. Solution - Top 3 Beginner Apps (1:15)
4. App Demonstrations (3:15)
5. Getting Started Guide (4:45)
6. Call to Action (7:15)

💰 Featured Apps:
• Robinhood - Commission-free trading
• Acorns - Automatic investing with spare change
• Fidelity - Professional tools for beginners

🚀 Start investing today with as little as $1!

👍 Like this video if it helped you!
🔔 Subscribe for more investing tips!
💬 Comment below: Which app will you try first?

#InvestingForBeginners #BestInvestmentApps #HowToInvest`,
            tags: [
                "investing for beginners",
                "best investment apps",
                "how to start investing",
                "beginner investing",
                "investment apps 2025",
                "robinhood app",
                "acorns app",
                "fidelity investing",
                "personal finance",
                "wealth building",
                "financial freedom",
                "investment tutorial",
                "money management",
                "passive income",
                "stock market basics"
            ],
            seoScore: 92
        }
    };
    
    console.log('✅ SEO optimization completed:');
    console.log(`   📊 SEO Score: ${mockSEOResult.optimizedMetadata.seoScore}/100`);
    console.log(`   📝 Title: "${mockSEOResult.optimizedMetadata.titleVariations[0]}"`);
    console.log(`   🏷️  Tags: ${mockSEOResult.optimizedMetadata.tags.length} tags`);
    
    // Mock Test 2: YouTube Publishing
    console.log('\n📺 Test 2: YouTube Publishing with Optimized Metadata');
    console.log(`📝 Publishing video: ${mockSEOResult.videoId}`);
    console.log(`📋 Title: "${mockSEOResult.optimizedMetadata.titleVariations[0]}"`);
    console.log(`🏷️  Tags: ${mockSEOResult.optimizedMetadata.tags.length} tags`);
    
    const mockPublishResult = {
        success: true,
        youtubeVideoId: `YT-${Date.now()}`,
        uploadStatus: 'processing',
        videoUrl: `https://youtube.com/watch?v=YT-${Date.now()}`
    };
    
    console.log('✅ YouTube publishing initiated:');
    console.log(`   📺 YouTube Video ID: ${mockPublishResult.youtubeVideoId}`);
    console.log(`   📊 Upload Status: ${mockPublishResult.uploadStatus}`);
    console.log(`   🔗 Video URL: ${mockPublishResult.videoUrl}`);
    
    // Mock Test 3: Status Monitoring
    console.log('\n📊 Test 3: Upload Status Monitoring');
    console.log(`📝 Checking upload status for: ${mockPublishResult.youtubeVideoId}`);
    
    const mockStatusResult = {
        success: true,
        status: {
            uploadStatus: 'completed',
            progress: 100,
            processingTime: '4m 32s'
        }
    };
    
    console.log('✅ Status monitoring working:');
    console.log(`   📊 Current Status: ${mockStatusResult.status.uploadStatus}`);
    console.log(`   📈 Progress: ${mockStatusResult.status.progress}%`);
    console.log(`   ⏱️  Processing Time: ${mockStatusResult.status.processingTime}`);
    
    // Mock Test 4: OAuth Authentication
    console.log('\n🔐 Test 4: OAuth Authentication Flow');
    console.log('📝 Testing YouTube OAuth authentication...');
    
    const mockAuthResult = {
        success: true,
        authenticated: true,
        scopes: ['https://www.googleapis.com/auth/youtube.upload', 'https://www.googleapis.com/auth/youtube']
    };
    
    console.log('✅ OAuth authentication working:');
    console.log(`   🔑 Auth Status: ${mockAuthResult.authenticated ? 'Valid' : 'Invalid'}`);
    console.log(`   📋 Scopes: ${mockAuthResult.scopes.join(', ')}`);
    console.log(`   ⏱️  Token Expiry: Valid for 1 hour`);
    
    return {
        seoResult: mockSEOResult,
        publishResult: mockPublishResult,
        statusResult: mockStatusResult,
        authResult: mockAuthResult
    };
}

/**
 * Run the integration tests
 */
async function runIntegrationTests() {
    try {
        console.log('🚀 Starting YouTube Publishing Integration Tests...\n');
        
        let results;
        
        if (process.argv.includes('--mock')) {
            console.log('🧪 Running in MOCK mode (no actual API calls)\n');
            results = await mockIntegrationTest();
        } else {
            console.log('🌐 Running with ACTUAL API calls');
            console.log('📝 Make sure to set API_BASE_URL and API_KEY environment variables\n');
            
            // Run actual tests
            const seoResult = await testSEOOptimization();
            const publishResult = await testYouTubePublishing(seoResult);
            const statusResult = await testUploadStatusMonitoring(publishResult);
            const authResult = await testOAuthAuthentication();
            
            results = { seoResult, publishResult, statusResult, authResult };
        }
        
        // Test Results Summary
        console.log('\n' + '='.repeat(80));
        console.log('🎉 YouTube Publishing Integration Tests COMPLETED!');
        
        console.log('\n📊 Test Results Summary:');
        console.log(`   🎯 SEO Optimization: ${results.seoResult?.success ? '✅ PASSED' : '❌ FAILED'}`);
        console.log(`   📺 YouTube Publishing: ${results.publishResult?.success ? '✅ PASSED' : '❌ FAILED'}`);
        console.log(`   📊 Status Monitoring: ${results.statusResult?.success ? '✅ PASSED' : '❌ FAILED'}`);
        console.log(`   🔐 OAuth Authentication: ${results.authResult?.success ? '✅ PASSED' : '❌ FAILED'}`);
        
        const passedTests = [
            results.seoResult?.success,
            results.publishResult?.success,
            results.statusResult?.success,
            results.authResult?.success
        ].filter(Boolean).length;
        
        console.log(`\n📈 Overall Success Rate: ${passedTests}/4 tests passed (${Math.round(passedTests/4*100)}%)`);
        
        if (results.seoResult?.success && results.publishResult?.success) {
            console.log('\n💡 Integration Features Demonstrated:');
            console.log('   • End-to-end workflow from SEO optimization to YouTube publishing');
            console.log('   • Context-aware metadata generation and optimization');
            console.log('   • Professional YouTube video upload with optimized metadata');
            console.log('   • Real-time upload status monitoring and progress tracking');
            console.log('   • OAuth 2.0 authentication flow validation');
            console.log('   • Error handling and retry logic for robust publishing');
            
            console.log('\n🔄 Complete Publishing Pipeline:');
            console.log('   Video Assembly → SEO Optimization → YouTube Publishing → Status Monitoring');
            
            console.log('\n🎯 Production-Ready Features:');
            console.log('   • Automated metadata optimization for maximum discoverability');
            console.log('   • Professional video upload with progress tracking');
            console.log('   • Secure OAuth authentication with proper scope management');
            console.log('   • Comprehensive error handling and status monitoring');
            console.log('   • Integration with existing AI pipeline context system');
        }
        
        console.log('\n🚀 Next Steps:');
        console.log('   1. Deploy YouTube publishing service to production');
        console.log('   2. Set up OAuth credentials in AWS Secrets Manager');
        console.log('   3. Configure automated publishing triggers');
        console.log('   4. Monitor upload success rates and performance metrics');
        
    } catch (error) {
        console.error('\n💥 Integration tests failed:', error);
    }
}

// Run the tests
runIntegrationTests().catch(console.error);