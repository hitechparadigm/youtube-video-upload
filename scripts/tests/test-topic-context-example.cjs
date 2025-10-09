#!/usr/bin/env node

/**
 * Show Real Example of Topic Context Structure
 */

const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');

const lambdaClient = new LambdaClient({ region: 'us-east-1' });

async function invokeLambda(functionName, payload) {
    try {
        const command = new InvokeCommand({
            FunctionName: functionName,
            Payload: JSON.stringify(payload),
            InvocationType: 'RequestResponse'
        });
        
        const response = await lambdaClient.send(command);
        
        let result = null;
        if (response.Payload) {
            const payloadString = new TextDecoder().decode(response.Payload);
            result = JSON.parse(payloadString);
        }
        
        return result;
        
    } catch (error) {
        throw new Error(`Lambda invocation failed: ${error.message}`);
    }
}

async function showTopicContextExample() {
    console.log('📋 REAL EXAMPLE: What Topic Management Should Produce');
    console.log('=' .repeat(70));

    // Show what the current Topic Management produces
    console.log('\n🔍 Testing current Topic Management enhanced generation...');
    
    try {
        const testProjectId = `example-${Date.now()}`;
        const result = await invokeLambda('automated-video-pipeline-topic-management-v2', {
            httpMethod: 'POST',
            path: '/topics/enhanced',
            body: JSON.stringify({
                projectId: testProjectId,
                baseTopic: 'AI Tools for Content Creation',
                targetAudience: 'content creators',
                videoDuration: 480
            })
        });

        if (result.statusCode === 200) {
            console.log('✅ Enhanced topic generation working!');
            const data = JSON.parse(result.body);
            
            console.log('\n📊 ACTUAL TOPIC CONTEXT PRODUCED:');
            console.log('=' .repeat(50));
            console.log(JSON.stringify(data, null, 2));
            
        } else {
            console.log('❌ Enhanced topic generation failed:', result.statusCode);
            if (result.body) {
                const errorData = JSON.parse(result.body);
                console.log('Error:', errorData);
            }
        }
    } catch (error) {
        console.log('❌ Error:', error.message);
    }

    // Show what Script Generator expects
    console.log('\n📝 WHAT SCRIPT GENERATOR EXPECTS:');
    console.log('=' .repeat(50));
    console.log(`
{
  "mainTopic": "AI Tools for Content Creation",
  "expandedTopics": [
    {
      "subtopic": "Best AI Writing Tools for 2025",
      "priority": "high",
      "contentComplexity": "moderate",
      "visualNeeds": "tool screenshots",
      "trendScore": 92,
      "estimatedCoverage": "90-120 seconds"
    },
    {
      "subtopic": "AI Image Generation Revolution", 
      "priority": "high",
      "contentComplexity": "simple",
      "visualNeeds": "before/after examples",
      "trendScore": 88,
      "estimatedCoverage": "60-90 seconds"
    }
  ],
  "videoStructure": {
    "recommendedScenes": 6,
    "hookDuration": 15,
    "mainContentDuration": 384,
    "conclusionDuration": 72,
    "totalDuration": 480
  },
  "seoContext": {
    "primaryKeywords": ["AI tools", "content creation", "AI writing", "automation"],
    "longTailKeywords": ["best AI tools for content creators 2025", "AI content creation workflow"]
  },
  "contentGuidance": {
    "complexConcepts": ["AI model training", "prompt engineering"],
    "quickWins": ["copy-paste templates", "one-click generation"],
    "visualOpportunities": ["tool demos", "before/after comparisons"],
    "callToActionSuggestions": ["try these tools", "subscribe for more AI tips"]
  }
}
    `);

    console.log('\n🎯 KEY POINTS:');
    console.log('- videoStructure.hookDuration: Used by Script Generator for intro timing');
    console.log('- videoStructure.mainContentDuration: Used for main content sections');  
    console.log('- videoStructure.conclusionDuration: Used for outro timing');
    console.log('- expandedTopics: Used to select specific subtopic for the video');
    console.log('- seoContext: Used for keyword optimization in script');
    console.log('- contentGuidance: Used to structure the narrative flow');
}

showTopicContextExample()
    .catch(error => {
        console.error('Example failed:', error);
        process.exit(1);
    });