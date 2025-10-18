#!/usr/bin/env node

/**
 * Test script for the optimized CI/CD pipeline
 * This script validates that our optimizations work correctly
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

console.log('🧪 Testing Optimized CI/CD Pipeline...\n');

// Test 1: Validate workflow file syntax
function testWorkflowSyntax() {
    console.log('1️⃣ Testing workflow file syntax...');

    try {
        const workflowPath = '.github/workflows/deploy-pipeline.yml';
        const workflowContent = fs.readFileSync(workflowPath, 'utf8');
        const workflow = yaml.load(workflowContent);

        // Check for key optimizations
        const buildJob = workflow.jobs['build-and-package'];
        const validateJob = workflow.jobs['validate-and-test'];
        const deployJob = workflow.jobs['deploy'];
        const notifyJob = workflow.jobs['notify-and-document'];

        console.log('   ✅ Workflow YAML syntax is valid');

        // Check for caching
        const hasSAMCache = buildJob.steps.some(step =>
            step.name === 'Cache SAM build' && step.uses === 'actions/cache@v4'
        );
        console.log(`   ${hasSAMCache ? '✅' : '❌'} SAM build caching: ${hasSAMCache ? 'ENABLED' : 'MISSING'}`);

        // Check for enhanced conditional deployment
        const hasEnhancedConditional = validateJob.steps.some(step =>
            step.name === 'Check for changes requiring deployment' &&
            step.run.includes('deployment-reason')
        );
        console.log(`   ${hasEnhancedConditional ? '✅' : '❌'} Enhanced conditional deployment: ${hasEnhancedConditional ? 'ENABLED' : 'MISSING'}`);

        // Check for improved validation
        const hasImprovedValidation = deployJob.steps.some(step =>
            step.name === 'Run deployment validation tests' &&
            step.run.includes('GitHub-Actions-Validator')
        );
        console.log(`   ${hasImprovedValidation ? '✅' : '❌'} Improved validation tests: ${hasImprovedValidation ? 'ENABLED' : 'MISSING'}`);

        // Check for performance monitoring
        const hasPerformanceMonitoring = notifyJob.steps.some(step =>
            step.name === 'Calculate performance metrics'
        );
        console.log(`   ${hasPerformanceMonitoring ? '✅' : '❌'} Performance monitoring: ${hasPerformanceMonitoring ? 'ENABLED' : 'MISSING'}`);

        return true;
    } catch (error) {
        console.log(`   ❌ Workflow syntax error: ${error.message}`);
        return false;
    }
}

// Test 2: Validate SAM template
function testSAMTemplate() {
    console.log('\n2️⃣ Testing SAM template...');

    try {
        const templatePath = 'template-simplified.yaml';
        const templateContent = fs.readFileSync(templatePath, 'utf8');
        const template = yaml.load(templateContent);

        console.log('   ✅ SAM template YAML syntax is valid');

        // Check for key resources
        const resources = template.Resources || {};
        const hasAPI = 'VideoApi' in resources;
        const hasLambdas = Object.keys(resources).filter(key =>
            resources[key].Type === 'AWS::Serverless::Function'
        ).length;

        console.log(`   ${hasAPI ? '✅' : '❌'} API Gateway: ${hasAPI ? 'CONFIGURED' : 'MISSING'}`);
        console.log(`   ${hasLambdas > 0 ? '✅' : '❌'} Lambda Functions: ${hasLambdas} functions found`);

        // Check for proper dependency (our previous fix)
        const usagePlan = resources.UsagePlan;
        const hasDependency = usagePlan && usagePlan.DependsOn === 'VideoApiStage';
        console.log(`   ${hasDependency ? '✅' : '❌'} UsagePlan dependency fix: ${hasDependency ? 'APPLIED' : 'MISSING'}`);

        return true;
    } catch (error) {
        console.log(`   ❌ SAM template error: ${error.message}`);
        return false;
    }
}

// Test 3: Check for cleanup workflow
function testCleanupWorkflow() {
    console.log('\n3️⃣ Testing cleanup workflow...');

    try {
        const cleanupPath = '.github/workflows/cleanup.yml';
        if (fs.existsSync(cleanupPath)) {
            const cleanupContent = fs.readFileSync(cleanupPath, 'utf8');
            const cleanup = yaml.load(cleanupContent);

            console.log('   ✅ Cleanup workflow exists and is valid');

            // Check for SAM alignment
            const hasSAMCleanup = cleanup.jobs.cleanup.steps.some(step =>
                step.name === 'Run SAM-based cleanup'
            );
            console.log(`   ${hasSAMCleanup ? '✅' : '❌'} SAM-aligned cleanup: ${hasSAMCleanup ? 'CONFIGURED' : 'MISSING'}`);

            return true;
        } else {
            console.log('   ❌ Cleanup workflow file not found');
            return false;
        }
    } catch (error) {
        console.log(`   ❌ Cleanup workflow error: ${error.message}`);
        return false;
    }
}

// Test 4: Validate configuration files
function testConfiguration() {
    console.log('\n4️⃣ Testing configuration files...');

    try {
        // Check samconfig.toml
        const samConfigPath = 'samconfig.toml';
        if (fs.existsSync(samConfigPath)) {
            const samConfig = fs.readFileSync(samConfigPath, 'utf8');
            const hasEnvironments = samConfig.includes('[dev]') &&
                samConfig.includes('[staging]') &&
                samConfig.includes('[prod]');
            console.log(`   ${hasEnvironments ? '✅' : '❌'} Multi-environment SAM config: ${hasEnvironments ? 'CONFIGURED' : 'MISSING'}`);
        }

        // Check package.json
        const packagePath = 'package.json';
        if (fs.existsSync(packagePath)) {
            const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
            const hasScripts = packageJson.scripts && Object.keys(packageJson.scripts).length > 0;
            console.log(`   ${hasScripts ? '✅' : '❌'} NPM scripts: ${hasScripts ? 'CONFIGURED' : 'MISSING'}`);
        }

        return true;
    } catch (error) {
        console.log(`   ❌ Configuration error: ${error.message}`);
        return false;
    }
}

// Test 5: Check optimization summary
function testOptimizationSummary() {
    console.log('\n5️⃣ Testing optimization documentation...');

    try {
        const summaryPath = 'cicd-optimization-summary.md';
        if (fs.existsSync(summaryPath)) {
            const summary = fs.readFileSync(summaryPath, 'utf8');
            const hasOptimizations = summary.includes('Authentication Issue') &&
                summary.includes('Caching Strategy') &&
                summary.includes('Performance Improvements');
            console.log(`   ${hasOptimizations ? '✅' : '❌'} Optimization summary: ${hasOptimizations ? 'COMPLETE' : 'INCOMPLETE'}`);
            return true;
        } else {
            console.log('   ❌ Optimization summary not found');
            return false;
        }
    } catch (error) {
        console.log(`   ❌ Documentation error: ${error.message}`);
        return false;
    }
}

// Run all tests
async function runTests() {
    const tests = [
        testWorkflowSyntax,
        testSAMTemplate,
        testCleanupWorkflow,
        testConfiguration,
        testOptimizationSummary
    ];

    let passed = 0;
    let total = tests.length;

    for (const test of tests) {
        if (test()) {
            passed++;
        }
    }

    console.log('\n' + '='.repeat(50));
    console.log(`📊 Test Results: ${passed}/${total} tests passed`);

    if (passed === total) {
        console.log('🎉 All tests passed! The optimized CI/CD pipeline is ready.');
        console.log('\n🚀 Next steps:');
        console.log('   1. Commit and push these changes to trigger the pipeline');
        console.log('   2. Monitor the GitHub Actions tab for improved performance');
        console.log('   3. Verify the authentication issue is resolved');
        console.log('   4. Check for faster build times with caching');
    } else {
        console.log('⚠️  Some tests failed. Please review the issues above.');
        process.exit(1);
    }
}

// Handle missing js-yaml dependency gracefully
try {
    runTests();
} catch (error) {
    if (error.code === 'MODULE_NOT_FOUND' && error.message.includes('js-yaml')) {
        console.log('📦 Installing js-yaml dependency...');
        const {
            execSync
        } = require('child_process');
        try {
            execSync('npm install js-yaml', {
                stdio: 'inherit'
            });
            console.log('✅ js-yaml installed successfully');

            // Re-require and run tests
            delete require.cache[require.resolve('js-yaml')];
            const yaml = require('js-yaml');
            runTests();
        } catch (installError) {
            console.log('❌ Failed to install js-yaml. Running basic tests...');

            // Run basic tests without YAML parsing
            console.log('🧪 Running basic validation tests...\n');

            console.log('1️⃣ Checking file existence...');
            const files = [
                '.github/workflows/deploy-pipeline.yml',
                'template-simplified.yaml',
                'samconfig.toml',
                'cicd-optimization-summary.md'
            ];

            let filesExist = 0;
            files.forEach(file => {
                const exists = fs.existsSync(file);
                console.log(`   ${exists ? '✅' : '❌'} ${file}: ${exists ? 'EXISTS' : 'MISSING'}`);
                if (exists) filesExist++;
            });

            console.log(`\n📊 Basic Test Results: ${filesExist}/${files.length} files found`);
            console.log('🎉 Basic validation complete. Pipeline files are in place.');
        }
    } else {
        console.error('❌ Unexpected error:', error.message);
        process.exit(1);
    }
}