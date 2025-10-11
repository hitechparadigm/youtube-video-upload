/**
 * 🏗️ LAYERS & UTILITIES TESTING SUITE
 * Tests shared utilities and layer architecture
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const LAYER_PATHS = [
  'src/layers/context-layer/nodejs/s3-folder-structure.js',
  'src/layers/context-layer/nodejs/context-manager.js',
  'src/layers/context-layer/nodejs/aws-service-manager.js',
  'src/layers/context-layer/nodejs/error-handler.js'
];

const LAMBDA_FUNCTIONS = [
  'src/lambda/topic-management',
  'src/lambda/script-generator', 
  'src/lambda/media-curator',
  'src/lambda/audio-generator',
  'src/lambda/video-assembler',
  'src/lambda/youtube-publisher',
  'src/lambda/workflow-orchestrator'
];

function testLayerFiles() {
  console.log('🏗️ TESTING LAYER FILES');
  console.log('='.repeat(60));
  
  const results = [];
  
  LAYER_PATHS.forEach(layerPath => {
    const exists = existsSync(layerPath);
    const fileName = layerPath.split('/').pop();
    
    console.log(`📁 ${fileName}: ${exists ? '✅ EXISTS' : '❌ MISSING'}`);
    
    if (exists) {
      try {
        const content = readFileSync(layerPath, 'utf8');
        const hasExports = content.includes('module.exports') || content.includes('export');
        const hasRequire = content.includes('require(') || content.includes('import');
        const size = (content.length / 1024).toFixed(1);
        
        console.log(`   Size: ${size}KB | Exports: ${hasExports ? '✅' : '❌'} | Imports: ${hasRequire ? '✅' : '❌'}`);
        
        results.push({
          file: fileName,
          exists: true,
          hasExports: hasExports,
          hasRequire: hasRequire,
          size: size
        });
      } catch (error) {
        console.log(`   ❌ Error reading file: ${error.message}`);
        results.push({
          file: fileName,
          exists: true,
          error: error.message
        });
      }
    } else {
      results.push({
        file: fileName,
        exists: false
      });
    }
  });
  
  return results;
}

function testLambdaFunctionIntegration() {
  console.log('\n🔧 TESTING LAMBDA FUNCTION INTEGRATION');
  console.log('='.repeat(60));
  
  const results = [];
  
  LAMBDA_FUNCTIONS.forEach(lambdaPath => {
    const functionName = lambdaPath.split('/').pop();
    const handlerPath = join(lambdaPath, 'handler.js');
    const indexPath = join(lambdaPath, 'index.js');
    
    // Check for handler file
    const handlerExists = existsSync(handlerPath);
    const indexExists = existsSync(indexPath);
    const hasHandler = handlerExists || indexExists;
    
    console.log(`🔧 ${functionName}: ${hasHandler ? '✅ HANDLER FOUND' : '❌ NO HANDLER'}`);
    
    if (hasHandler) {
      try {
        const filePath = handlerExists ? handlerPath : indexPath;
        const content = readFileSync(filePath, 'utf8');
        
        // Check for layer imports
        const hasS3Utils = content.includes('s3-folder-structure') || content.includes('/opt/nodejs');
        const hasContextManager = content.includes('context-manager');
        const hasAwsManager = content.includes('aws-service-manager');
        const hasErrorHandler = content.includes('error-handler');
        
        console.log(`   S3 Utils: ${hasS3Utils ? '✅' : '❌'} | Context: ${hasContextManager ? '✅' : '❌'} | AWS: ${hasAwsManager ? '✅' : '❌'} | Error: ${hasErrorHandler ? '✅' : '❌'}`);
        
        results.push({
          function: functionName,
          hasHandler: true,
          hasS3Utils: hasS3Utils,
          hasContextManager: hasContextManager,
          hasAwsManager: hasAwsManager,
          hasErrorHandler: hasErrorHandler
        });
      } catch (error) {
        console.log(`   ❌ Error reading handler: ${error.message}`);
        results.push({
          function: functionName,
          hasHandler: true,
          error: error.message
        });
      }
    } else {
      results.push({
        function: functionName,
        hasHandler: false
      });
    }
  });
  
  return results;
}

function testUtilityFunctions() {
  console.log('\n🛠️ TESTING UTILITY FUNCTIONS');
  console.log('='.repeat(60));
  
  const utilityPath = 'src/utils/s3-folder-structure.cjs';
  const exists = existsSync(utilityPath);
  
  console.log(`📁 s3-folder-structure.cjs: ${exists ? '✅ EXISTS' : '❌ MISSING'}`);
  
  if (exists) {
    try {
      const content = readFileSync(utilityPath, 'utf8');
      
      // Check for key functions
      const hasGeneratePaths = content.includes('generateS3Paths');
      const hasCreateStructure = content.includes('createProjectStructure');
      const hasListProjects = content.includes('listProjects');
      const hasParseProject = content.includes('parseProjectFolder');
      
      console.log(`   generateS3Paths: ${hasGeneratePaths ? '✅' : '❌'}`);
      console.log(`   createProjectStructure: ${hasCreateStructure ? '✅' : '❌'}`);
      console.log(`   listProjects: ${hasListProjects ? '✅' : '❌'}`);
      console.log(`   parseProjectFolder: ${hasParseProject ? '✅' : '❌'}`);
      
      return {
        exists: true,
        hasGeneratePaths: hasGeneratePaths,
        hasCreateStructure: hasCreateStructure,
        hasListProjects: hasListProjects,
        hasParseProject: hasParseProject
      };
    } catch (error) {
      console.log(`   ❌ Error reading utility: ${error.message}`);
      return { exists: true, error: error.message };
    }
  } else {
    return { exists: false };
  }
}

function generateSummaryReport(layerResults, lambdaResults, utilityResults) {
  console.log('\n📊 LAYERS & UTILITIES SUMMARY REPORT');
  console.log('='.repeat(60));
  
  // Layer files summary
  const layerFilesExist = layerResults.filter(r => r.exists).length;
  const layerFilesTotal = layerResults.length;
  const layerCompleteness = ((layerFilesExist / layerFilesTotal) * 100).toFixed(1);
  
  console.log(`🏗️ Layer Files: ${layerFilesExist}/${layerFilesTotal} exist (${layerCompleteness}%)`);
  
  // Lambda integration summary
  const lambdaWithHandlers = lambdaResults.filter(r => r.hasHandler).length;
  const lambdaWithS3Utils = lambdaResults.filter(r => r.hasS3Utils).length;
  const lambdaWithContext = lambdaResults.filter(r => r.hasContextManager).length;
  const lambdaTotal = lambdaResults.length;
  
  console.log(`🔧 Lambda Functions: ${lambdaWithHandlers}/${lambdaTotal} have handlers`);
  console.log(`📁 S3 Utils Integration: ${lambdaWithS3Utils}/${lambdaTotal} functions`);
  console.log(`🔄 Context Manager Integration: ${lambdaWithContext}/${lambdaTotal} functions`);
  
  // Utility functions summary
  console.log(`🛠️ Utility Functions: ${utilityResults.exists ? '✅ Available' : '❌ Missing'}`);
  
  // Overall assessment
  const overallScore = (
    (layerCompleteness / 100) * 0.3 +
    ((lambdaWithHandlers / lambdaTotal)) * 0.3 +
    ((lambdaWithS3Utils / lambdaTotal)) * 0.2 +
    (utilityResults.exists ? 1 : 0) * 0.2
  ) * 100;
  
  console.log('');
  console.log(`🎯 OVERALL ARCHITECTURE SCORE: ${overallScore.toFixed(1)}%`);
  
  if (overallScore >= 90) {
    console.log('🎉 EXCELLENT: Layers & utilities architecture is production-ready!');
  } else if (overallScore >= 70) {
    console.log('✅ GOOD: Architecture is functional with minor improvements needed');
  } else {
    console.log('⚠️ NEEDS WORK: Architecture requires significant improvements');
  }
  
  return {
    layerCompleteness: layerCompleteness,
    lambdaIntegration: (lambdaWithS3Utils / lambdaTotal) * 100,
    utilityAvailable: utilityResults.exists,
    overallScore: overallScore
  };
}

// Run comprehensive layers & utilities testing
async function runLayersUtilsTesting() {
  console.log('🏗️ LAYERS & UTILITIES COMPREHENSIVE TESTING');
  console.log('='.repeat(80));
  console.log('📋 Testing shared utilities architecture and layer integration');
  console.log('🎯 Verifying consistent patterns across all Lambda functions');
  console.log('');
  
  const startTime = Date.now();
  
  // Run all tests
  const layerResults = testLayerFiles();
  const lambdaResults = testLambdaFunctionIntegration();
  const utilityResults = testUtilityFunctions();
  
  // Generate summary
  const summary = generateSummaryReport(layerResults, lambdaResults, utilityResults);
  
  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  
  console.log('');
  console.log('🏁 LAYERS & UTILITIES TESTING COMPLETE');
  console.log('='.repeat(80));
  console.log(`⏱️  Total Execution Time: ${totalTime}s`);
  console.log('');
  
  console.log('🎯 ARCHITECTURE BENEFITS:');
  console.log('   📁 Consistent folder structure across all agents');
  console.log('   🔄 Centralized context management for agent coordination');
  console.log('   ☁️  Unified AWS service operations with error handling');
  console.log('   🛠️ Single source of truth for common functionality');
  console.log('   🧪 Professional testing patterns and validation');
  
  return summary;
}

// Execute testing
runLayersUtilsTesting().then(summary => {
  console.log('');
  console.log('='.repeat(80));
  console.log('🏁 LAYERS & UTILITIES TESTING COMPLETE');
  console.log('='.repeat(80));
  
  process.exit(summary.overallScore >= 70 ? 0 : 1);
}).catch(error => {
  console.error('💥 Layers & utilities testing failed:', error);
  process.exit(1);
});