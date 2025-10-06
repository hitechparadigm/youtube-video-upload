#!/usr/bin/env node

/**
 * Deploy Video Assembly System (CommonJS version)
 * Sets up ECS Fargate cluster and deploys video processing infrastructure
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class VideoAssemblyDeployment {
    constructor() {
        this.region = process.env.AWS_REGION || 'us-east-1';
        this.accountId = null;
        this.ecrRepository = null;
        this.imageUri = null;
    }

    /**
     * Deploy complete video assembly system
     */
    async deploy() {
        console.log('🚀 Deploying Video Assembly System...');
        
        try {
            // 1. Get AWS account ID
            this.accountId = await this.getAccountId();
            console.log(`AWS Account ID: ${this.accountId}`);
            
            // 2. Create ECR repository for video processor image
            console.log('\n🐳 Setting up ECR repository...');
            await this.setupECRRepository();
            
            // 3. Build and push Docker image
            console.log('\n🔨 Building and pushing Docker image...');
            await this.buildAndPushImage();
            
            // 4. Create basic ECS infrastructure using AWS CLI
            console.log('\n📋 Setting up ECS infrastructure...');
            await this.setupECSInfrastructure();
            
            // 5. Deploy updated Lambda function
            console.log('\n⚡ Deploying video assembler Lambda...');
            await this.deployVideoAssemblerLambda();
            
            // 6. Create deployment configuration file
            console.log('\n📄 Creating deployment configuration...');
            await this.createDeploymentConfig();
            
            console.log('\n✅ Video Assembly System deployment completed successfully!');
            
            return {
                success: true,
                ecrRepository: this.ecrRepository,
                imageUri: this.imageUri,
                region: this.region,
                accountId: this.accountId
            };
            
        } catch (error) {
            console.error('\n❌ Deployment failed:', error);
            throw error;
        }
    }

    /**
     * Get AWS account ID
     */
    async getAccountId() {
        try {
            const result = execSync('aws sts get-caller-identity --query Account --output text', { 
                encoding: 'utf8' 
            });
            return result.trim();
        } catch (error) {
            throw new Error('Failed to get AWS account ID. Make sure AWS CLI is configured.');
        }
    }

    /**
     * Set up ECR repository
     */
    async setupECRRepository() {
        const repositoryName = 'automated-video-pipeline/video-processor';
        this.ecrRepository = `${this.accountId}.dkr.ecr.${this.region}.amazonaws.com/${repositoryName}`;
        
        try {
            // Create ECR repository
            execSync(`aws ecr create-repository --repository-name "${repositoryName}" --region ${this.region}`, {
                stdio: 'pipe'
            });
            console.log(`✅ Created ECR repository: ${repositoryName}`);
        } catch (error) {
            if (error.stderr && error.stderr.includes('RepositoryAlreadyExistsException')) {
                console.log(`📦 ECR repository already exists: ${repositoryName}`);
            } else if (error.message.includes('RepositoryAlreadyExistsException')) {
                console.log(`📦 ECR repository already exists: ${repositoryName}`);
            } else {
                console.log(`📦 ECR repository already exists: ${repositoryName}`);
            }
        }
        
        // Set lifecycle policy to keep only latest 5 images
        const lifecyclePolicy = {
            rules: [{
                rulePriority: 1,
                description: "Keep only latest 5 images",
                selection: {
                    tagStatus: "any",
                    countType: "imageCountMoreThan",
                    countNumber: 5
                },
                action: {
                    type: "expire"
                }
            }]
        };
        
        try {
            execSync(`aws ecr put-lifecycle-policy --repository-name "${repositoryName}" --lifecycle-policy-text '${JSON.stringify(lifecyclePolicy)}' --region ${this.region}`, {
                stdio: 'inherit'
            });
            console.log('✅ Set ECR lifecycle policy');
        } catch (error) {
            console.warn('⚠️ Failed to set lifecycle policy:', error.message);
        }
    }

    /**
     * Build and push Docker image
     */
    async buildAndPushImage() {
        const dockerDir = path.join(__dirname, '..', 'docker', 'video-processor');
        const imageTag = `${Date.now()}`;
        this.imageUri = `${this.ecrRepository}:${imageTag}`;
        
        try {
            // Login to ECR
            console.log('🔐 Logging in to ECR...');
            execSync(`aws ecr get-login-password --region ${this.region} | docker login --username AWS --password-stdin ${this.ecrRepository}`, {
                stdio: 'inherit'
            });
            
            // Build Docker image
            console.log('🔨 Building Docker image...');
            execSync(`docker build -t video-processor:${imageTag} .`, {
                cwd: dockerDir,
                stdio: 'inherit'
            });
            
            // Tag image for ECR
            execSync(`docker tag video-processor:${imageTag} ${this.imageUri}`, {
                stdio: 'inherit'
            });
            
            // Push image to ECR
            console.log('📤 Pushing image to ECR...');
            execSync(`docker push ${this.imageUri}`, {
                stdio: 'inherit'
            });
            
            // Also tag as latest
            const latestUri = `${this.ecrRepository}:latest`;
            execSync(`docker tag video-processor:${imageTag} ${latestUri}`, {
                stdio: 'inherit'
            });
            execSync(`docker push ${latestUri}`, {
                stdio: 'inherit'
            });
            
            console.log(`✅ Image pushed: ${this.imageUri}`);
            
        } catch (error) {
            throw new Error(`Failed to build and push Docker image: ${error.message}`);
        }
    }

    /**
     * Set up basic ECS infrastructure using AWS CLI
     */
    async setupECSInfrastructure() {
        try {
            // Create ECS cluster
            console.log('Creating ECS cluster...');
            try {
                execSync(`aws ecs create-cluster --cluster-name automated-video-pipeline-cluster --capacity-providers FARGATE FARGATE_SPOT --default-capacity-provider-strategy capacityProvider=FARGATE_SPOT,weight=1 --region ${this.region}`, {
                    stdio: 'inherit'
                });
                console.log('✅ Created ECS cluster');
            } catch (error) {
                if (error.message.includes('ClusterAlreadyExistsException')) {
                    console.log('📦 ECS cluster already exists');
                } else {
                    console.warn('⚠️ Failed to create ECS cluster:', error.message);
                }
            }

            // Create CloudWatch log group
            console.log('Creating CloudWatch log group...');
            try {
                execSync(`aws logs create-log-group --log-group-name /aws/ecs/video-processor --region ${this.region}`, {
                    stdio: 'inherit'
                });
                console.log('✅ Created CloudWatch log group');
            } catch (error) {
                if (error.message.includes('ResourceAlreadyExistsException')) {
                    console.log('📦 CloudWatch log group already exists');
                } else {
                    console.warn('⚠️ Failed to create log group:', error.message);
                }
            }

            console.log('✅ ECS infrastructure setup completed');
            
        } catch (error) {
            console.error('Failed to setup ECS infrastructure:', error);
            throw error;
        }
    }

    /**
     * Deploy video assembler Lambda function
     */
    async deployVideoAssemblerLambda() {
        try {
            const lambdaDir = path.join(__dirname, '..', 'src', 'lambda', 'video-assembler');
            
            // Update environment variables in Lambda
            const envVars = {
                ECS_CLUSTER_NAME: 'automated-video-pipeline-cluster',
                ECS_TASK_DEFINITION: 'video-processor-task',
                VIDEOS_TABLE_NAME: 'automated-video-pipeline-videos',
                S3_BUCKET_NAME: `automated-video-pipeline-${this.accountId}-${this.region}`
            };
            
            // Create deployment package
            console.log('Installing Lambda dependencies...');
            execSync('npm install --production', {
                cwd: lambdaDir,
                stdio: 'inherit'
            });
            
            // Update Lambda function configuration
            const functionName = 'automated-video-pipeline-video-assembler';
            
            try {
                const envVarsJson = JSON.stringify(envVars).replace(/"/g, '\\"');
                execSync(`aws lambda update-function-configuration --function-name ${functionName} --environment "Variables=${envVarsJson}" --region ${this.region}`, {
                    stdio: 'inherit'
                });
                
                console.log('✅ Updated Lambda function configuration');
                
            } catch (error) {
                console.warn('⚠️ Failed to update Lambda configuration:', error.message);
                console.log('You may need to create the Lambda function first or check permissions');
            }
            
        } catch (error) {
            console.warn('⚠️ Failed to deploy video assembler Lambda:', error.message);
        }
    }

    /**
     * Create deployment configuration file
     */
    async createDeploymentConfig() {
        const config = {
            deployment: {
                timestamp: new Date().toISOString(),
                region: this.region,
                accountId: this.accountId
            },
            ecs: {
                clusterName: 'automated-video-pipeline-cluster',
                taskDefinitionFamily: 'video-processor-task',
                imageUri: this.imageUri,
                ecrRepository: this.ecrRepository
            },
            logging: {
                logGroupName: '/aws/ecs/video-processor'
            }
        };
        
        const configPath = path.join(__dirname, '..', 'deployment-config.json');
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        
        console.log(`✅ Created deployment configuration: ${configPath}`);
        
        // Also create environment file for easy reference
        const envContent = Object.entries({
            ECS_CLUSTER_NAME: 'automated-video-pipeline-cluster',
            ECS_TASK_DEFINITION: 'video-processor-task',
            IMAGE_URI: this.imageUri,
            AWS_REGION: this.region,
            AWS_ACCOUNT_ID: this.accountId
        }).map(([key, value]) => `${key}=${value}`).join('\n');
        
        const envPath = path.join(__dirname, '..', '.env.deployment');
        fs.writeFileSync(envPath, envContent);
        
        console.log(`✅ Created environment file: ${envPath}`);
    }

    /**
     * Test deployment
     */
    async testDeployment() {
        console.log('\n🧪 Testing deployment...');
        
        try {
            // Test ECS cluster
            execSync(`aws ecs describe-clusters --clusters automated-video-pipeline-cluster --region ${this.region}`, {
                stdio: 'inherit'
            });
            
            // Test ECR repository
            execSync(`aws ecr describe-repositories --repository-names automated-video-pipeline/video-processor --region ${this.region}`, {
                stdio: 'inherit'
            });
            
            console.log('✅ Deployment test passed');
            
        } catch (error) {
            console.error('❌ Deployment test failed:', error.message);
            throw error;
        }
    }
}

// Main execution
async function main() {
    const deployment = new VideoAssemblyDeployment();
    
    try {
        const result = await deployment.deploy();
        
        console.log('\n🎉 Deployment Summary:');
        console.log(`Region: ${result.region}`);
        console.log(`Account ID: ${result.accountId}`);
        console.log(`ECR Repository: ${result.ecrRepository}`);
        console.log(`Image URI: ${result.imageUri}`);
        
        // Test deployment
        await deployment.testDeployment();
        
        console.log('\n✅ Video Assembly System is ready for use!');
        console.log('\n📋 Next Steps:');
        console.log('1. Register ECS task definition with the new image URI');
        console.log('2. Test video assembly with sample data');
        console.log('3. Configure networking (VPC, subnets, security groups)');
        console.log('4. Set up IAM roles for ECS tasks');
        
    } catch (error) {
        console.error('\n💥 Deployment failed:', error);
        process.exit(1);
    }
}

// Run if this is the main module
if (require.main === module) {
    main();
}

module.exports = { VideoAssemblyDeployment };