#!/usr/bin/env node

/**
 * AWS Helpers - Centralized AWS service utilities
 */

import { S3Client, PutObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { LambdaClient } from '@aws-sdk/client-lambda';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { SFNClient } from '@aws-sdk/client-sfn';
import { PollyClient } from '@aws-sdk/client-polly';

const AWS_REGION = 'us-east-1';
const BUCKET_NAME = 'automated-video-pipeline-v2-786673323159-us-east-1';

class AWSHelpers {
    static getS3Client() {
        return new S3Client({ region: AWS_REGION });
    }

    static getLambdaClient() {
        return new LambdaClient({ region: AWS_REGION });
    }

    static getSecretsManager() {
        return new SecretsManagerClient({ region: AWS_REGION });
    }

    static getStepFunctionsClient() {
        return new SFNClient({ region: AWS_REGION });
    }

    static getPollyClient() {
        return new PollyClient({ region: AWS_REGION });
    }

    static async uploadToS3(key, data, contentType = 'application/json') {
        const s3Client = this.getS3Client();
        const command = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
            Body: data,
            ContentType: contentType
        });
        return await s3Client.send(command);
    }

    static async listS3Objects(prefix = '') {
        const s3Client = this.getS3Client();
        const command = new ListObjectsV2Command({
            Bucket: BUCKET_NAME,
            Prefix: prefix
        });
        return await s3Client.send(command);
    }

    static async getApiKeys() {
        try {
            const secretsClient = this.getSecretsManager();
            const command = new GetSecretValueCommand({
                SecretId: 'automated-video-pipeline/api-keys'
            });
            const response = await secretsClient.send(command);
            return JSON.parse(response.SecretString);
        } catch (error) {
            console.log('⚠️  Using fallback API configuration');
            return {
                pexels: 'demo-key',
                pixabay: 'demo-key'
            };
        }
    }

    static getBucketName() {
        return BUCKET_NAME;
    }

    static getRegion() {
        return AWS_REGION;
    }
}

export default AWSHelpers;