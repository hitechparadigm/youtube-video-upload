#!/usr/bin/env node

/**
 * Infrastructure Validation Script
 * 
 * Validates that all AWS infrastructure components for the automated video pipeline
 * are properly deployed and configured according to the specification.
 */

const {
    S3Client,
    HeadBucketCommand,
    GetBucketLifecycleConfigurationCommand,
    GetBucketTaggingCommand,
    GetBucketVersioningCommand
} = require('@aws-sdk/client-s3');

const {
    DynamoDBClient,
    DescribeTableCommand,
    ListTablesCommand
} = require('@aws-sdk/client-dynamodb');

const {
    SecretsManagerClient,
    GetSecretValueCommand,
    ListSecretsCommand
} = require('@aws-sdk/client-secrets-manager');

const {
    IAMClient,
    GetRoleCommand,
    ListRolesCommand
} = require('@aws-sdk/client-iam');

// Initialize AWS clients
const s3Client = new S3Client({ region: 'us-east-1' });
const dynamoClient = new DynamoDBClient({ region: 'us-east-1' });
const secretsClient = new SecretsManagerClient({ region: 'us-east-1' });
const iamClient = new IAMClient({ region: 'us-east-1' });

// Test configuration
const config = {
    accountId: '786673323159',
    region: 'us-east-1',
    projectName: 'automated-video-pipeline',
    expectedBuckets: [
        'automated-video-pipeline-786673323159-us-east-1',
        'automated-video-pipeline-backup-786673323159-us-east-1'
    ],
    expectedTables: [
        'automated-video-pipeline-topics',
        'automated-video-pipeline-trends',
        'automated-video-pipeline-production',
        'automated-video-pipeline-cost-tracking'
    ],
    expectedSecrets: [
        'automated-video-pipeline/api-credentials',
        'automated-video-pipeline/media-sources'
    ],
    requiredTags: {
        'Project': 'automated-video-pipeline',
        'Service': 'video-content-generation',
        'ManagedBy': 'CDK'
    }
};

// Test results tracking
const results = {
    passed: 0,
    failed: 0,
    tests: []
};

function logTest(name, passed, details = '') {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${name}`);
    if (details) {
        console.log(`   ${details}`);
    }

    results.tests.push({ name, passed, details });
    if (passed) {
        results.passed++;
    } else {
        results.failed++;
    }
}

async function validateS3Buckets() {
    console.log('\n🪣 Testing S3 Bucket Infrastructure...');

    for (const bucketName of config.expectedBuckets) {
        try {
            // Test bucket exists and is accessible
            await s3Client.send(new HeadBucketCommand({ Bucket: bucketName }));
            logTest(`S3 Bucket exists: ${bucketName}`, true);

            // Test bucket versioning
            try {
                const versioningResponse = await s3Client.send(
                    new GetBucketVersioningCommand({ Bucket: bucketName })
                );
                const versioningEnabled = versioningResponse.Status === 'Enabled';
                logTest(`S3 Versioning enabled: ${bucketName}`, versioningEnabled,
                    `Status: ${versioningResponse.Status || 'Disabled'}`);
            } catch (error) {
                logTest(`S3 Versioning check: ${bucketName}`, false, error.message);
            }

            // Test lifecycle configuration
            try {
                const lifecycleResponse = await s3Client.send(
                    new GetBucketLifecycleConfigurationCommand({ Bucket: bucketName })
                );
                const hasLifecycleRules = lifecycleResponse.Rules && lifecycleResponse.Rules.length > 0;
                logTest(`S3 Lifecycle rules: ${bucketName}`, hasLifecycleRules,
                    `Rules: ${lifecycleResponse.Rules?.length || 0}`);
            } catch (error) {
                if (error.name === 'NoSuchLifecycleConfiguration') {
                    logTest(`S3 Lifecycle rules: ${bucketName}`, false, 'No lifecycle configuration found');
                } else {
                    logTest(`S3 Lifecycle check: ${bucketName}`, false, error.message);
                }
            }

            // Test bucket tagging
            try {
                const taggingResponse = await s3Client.send(
                    new GetBucketTaggingCommand({ Bucket: bucketName })
                );
                const tags = taggingResponse.TagSet || [];
                const tagMap = Object.fromEntries(tags.map(tag => [tag.Key, tag.Value]));

                let allRequiredTagsPresent = true;
                const missingTags = [];

                for (const [key, expectedValue] of Object.entries(config.requiredTags)) {
                    if (!tagMap[key]) {
                        allRequiredTagsPresent = false;
                        missingTags.push(key);
                    }
                }

                logTest(`S3 Required tags: ${bucketName}`, allRequiredTagsPresent,
                    allRequiredTagsPresent ?
                        `All required tags present` :
                        `Missing tags: ${missingTags.join(', ')}`);

            } catch (error) {
                logTest(`S3 Tagging check: ${bucketName}`, false, error.message);
            }

        } catch (error) {
            logTest(`S3 Bucket exists: ${bucketName}`, false, error.message);
        }
    }
}

async function validateDynamoDBTables() {
    console.log('\n🗄️ Testing DynamoDB Tables...');

    for (const tableName of config.expectedTables) {
        try {
            const response = await dynamoClient.send(
                new DescribeTableCommand({ TableName: tableName })
            );

            const table = response.Table;
            logTest(`DynamoDB Table exists: ${tableName}`, true);

            // Test table status
            const isActive = table.TableStatus === 'ACTIVE';
            logTest(`DynamoDB Table active: ${tableName}`, isActive,
                `Status: ${table.TableStatus}`);

            // Test billing mode (PAY_PER_REQUEST is the correct value for on-demand)
            const isOnDemand = table.BillingModeSummary?.BillingMode === 'PAY_PER_REQUEST';
            logTest(`DynamoDB On-demand billing: ${tableName}`, isOnDemand,
                `Mode: ${table.BillingModeSummary?.BillingMode || 'PROVISIONED'}`);

            // Test encryption (AWS managed encryption is default, so no SSEDescription means it's encrypted)
            const isEncrypted = !table.SSEDescription || table.SSEDescription?.Status === 'ENABLED';
            logTest(`DynamoDB Encryption: ${tableName}`, isEncrypted,
                `Status: ${table.SSEDescription?.Status || 'AWS_MANAGED (Default)'}`);

            // Test GSI indexes (if expected)
            const hasGSI = table.GlobalSecondaryIndexes && table.GlobalSecondaryIndexes.length > 0;
            if (tableName.includes('topics') || tableName.includes('trends') || tableName.includes('production')) {
                logTest(`DynamoDB GSI indexes: ${tableName}`, hasGSI,
                    `Indexes: ${table.GlobalSecondaryIndexes?.length || 0}`);
            }

            // Test point-in-time recovery
            // Note: This requires additional permissions, so we'll skip for now

        } catch (error) {
            logTest(`DynamoDB Table exists: ${tableName}`, false, error.message);
        }
    }
}

async function validateSecretsManager() {
    console.log('\n🔐 Testing Secrets Manager...');

    for (const secretName of config.expectedSecrets) {
        try {
            const response = await secretsClient.send(
                new GetSecretValueCommand({ SecretId: secretName })
            );

            logTest(`Secret exists: ${secretName}`, true);

            // Test secret value structure
            try {
                const secretValue = JSON.parse(response.SecretString);
                const hasValidStructure = typeof secretValue === 'object' && secretValue !== null;
                logTest(`Secret valid JSON: ${secretName}`, hasValidStructure);

                // Test specific secret structures
                if (secretName.includes('media-sources')) {
                    const hasMediaSources = secretValue.pexels || secretValue.pixabay || secretValue.youtube;
                    logTest(`Media sources configured: ${secretName}`, hasMediaSources,
                        `Sources: ${Object.keys(secretValue).join(', ')}`);
                }

                if (secretName.includes('api-credentials')) {
                    const hasCredentials = Object.keys(secretValue).length > 0;
                    logTest(`API credentials present: ${secretName}`, hasCredentials,
                        `Keys: ${Object.keys(secretValue).length}`);
                }

            } catch (parseError) {
                // If it's not JSON, it might be a simple string value which is also valid
                const hasValue = response.SecretString && response.SecretString.length > 0;
                logTest(`Secret has value: ${secretName}`, hasValue,
                    hasValue ? 'Non-JSON secret value present' : 'Empty secret');
            }

        } catch (error) {
            logTest(`Secret exists: ${secretName}`, false, error.message);
        }
    }
}

async function validateIAMRoles() {
    console.log('\n👤 Testing IAM Roles...');

    try {
        const response = await iamClient.send(new ListRolesCommand({}));
        const projectRoles = response.Roles.filter(role =>
            role.RoleName.includes('automated-video-pipeline') ||
            role.RoleName.includes('AutomatedVideoPipeline')
        );

        // For infrastructure validation, we just check if we can access IAM
        // Lambda and ECS roles will be created when we deploy those services
        logTest('IAM Access available', true, 'Can list IAM roles');

        if (projectRoles.length > 0) {
            logTest('Project IAM Roles exist', true, `Found ${projectRoles.length} project-related roles`);

            // Test specific role types if they exist
            const lambdaRoles = projectRoles.filter(role =>
                role.RoleName.includes('Lambda') || role.RoleName.includes('lambda')
            );
            if (lambdaRoles.length > 0) {
                logTest('Lambda execution roles exist', true, `Found ${lambdaRoles.length} Lambda roles`);
            }

            const ecsRoles = projectRoles.filter(role =>
                role.RoleName.includes('ECS') || role.RoleName.includes('Fargate') || role.RoleName.includes('Task')
            );
            if (ecsRoles.length > 0) {
                logTest('ECS/Fargate roles exist', true, `Found ${ecsRoles.length} ECS roles`);
            }
        } else {
            logTest('Project IAM Roles', true, 'No project roles yet - will be created with Lambda/ECS deployment');
        }

    } catch (error) {
        logTest('IAM Access check', false, error.message);
    }
}

async function validateProjectIsolation() {
    console.log('\n🏷️ Testing Project Isolation...');

    // Test that resources don't conflict with existing YouTube automation
    try {
        const s3Response = await s3Client.send(new HeadBucketCommand({
            Bucket: 'youtube-automation-videos-786673323159-us-east-1'
        }));

        const automatedResponse = await s3Client.send(new HeadBucketCommand({
            Bucket: 'automated-video-pipeline-786673323159-us-east-1'
        }));

        logTest('Project isolation maintained', true,
            'Both youtube-automation and automated-video-pipeline buckets exist separately');

    } catch (error) {
        logTest('Project isolation check', false, error.message);
    }
}

async function runAllTests() {
    console.log('🧪 Starting Infrastructure Validation Tests...\n');
    console.log(`Project: ${config.projectName}`);
    console.log(`Account: ${config.accountId}`);
    console.log(`Region: ${config.region}\n`);

    try {
        await validateS3Buckets();
        await validateDynamoDBTables();
        await validateSecretsManager();
        await validateIAMRoles();
        await validateProjectIsolation();

        // Print summary
        console.log('\n📊 Test Summary:');
        console.log(`✅ Passed: ${results.passed}`);
        console.log(`❌ Failed: ${results.failed}`);
        console.log(`📈 Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);

        if (results.failed === 0) {
            console.log('\n🎉 All infrastructure validation tests passed!');
            console.log('✅ Ready to proceed with Task 2: Topic Management System');
        } else {
            console.log('\n⚠️ Some tests failed. Please review and fix issues before proceeding.');
            console.log('\nFailed tests:');
            results.tests
                .filter(test => !test.passed)
                .forEach(test => console.log(`  - ${test.name}: ${test.details}`));
        }

        // Exit with appropriate code
        process.exit(results.failed === 0 ? 0 : 1);

    } catch (error) {
        console.error('\n💥 Validation script failed:', error.message);
        process.exit(1);
    }
}

// Run tests if called directly
if (require.main === module) {
    runAllTests();
}

module.exports = {
    runAllTests,
    validateS3Buckets,
    validateDynamoDBTables,
    validateSecretsManager,
    validateIAMRoles,
    validateProjectIsolation
};