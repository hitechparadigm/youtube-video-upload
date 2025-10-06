/**
 * Unit Tests for Secrets Manager Infrastructure
 * 
 * Tests Secrets Manager secret creation, configuration, and access
 * for storing API credentials used by the video pipeline.
 */

import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { AutomatedVideoPipelineStack } from '../../lib/automated-video-pipeline-stack';

describe('Secrets Manager Infrastructure', () => {
  let template: Template;
  let stack: AutomatedVideoPipelineStack;

  beforeAll(() => {
    const app = new cdk.App();
    stack = new AutomatedVideoPipelineStack(app, 'TestStack', {
      env: {
        account: '123456789012',
        region: 'us-east-1'
      }
    });
    template = Template.fromStack(stack);
  });

  describe('API Credentials Secret', () => {
    test('should create secret with correct name', () => {
      template.hasResourceProperties('AWS::SecretsManager::Secret', {
        Name: 'automated-video-pipeline/api-credentials'
      });
    });

    test('should have proper description', () => {
      template.hasResourceProperties('AWS::SecretsManager::Secret', {
        Description: 'API keys and OAuth tokens for external services used by the video pipeline'
      });
    });

    test('should generate secret string with correct template structure', () => {
      template.hasResourceProperties('AWS::SecretsManager::Secret', {
        GenerateSecretString: {
          SecretStringTemplate: JSON.stringify({
            googleTrendsApiKey: '',
            twitterBearerToken: '',
            youtubeClientId: '',
            youtubeClientSecret: '',
            youtubeRefreshToken: '',
            pexelsApiKey: '',
            pixabayApiKey: '',
            newsApiKey: ''
          }),
          GenerateStringKey: 'placeholder',
          ExcludeCharacters: '"@/\\'
        }
      });
    });

    test('should have proper resource tags', () => {
      template.hasResourceProperties('AWS::SecretsManager::Secret', {
        Tags: expect.arrayContaining([
          {
            Key: 'youtube-video-upload',
            Value: 'true'
          },
          {
            Key: 'Project',
            Value: 'youtube-video-upload'
          },
          {
            Key: 'Service',
            Value: 'automated-video-pipeline'
          },
          {
            Key: 'Environment',
            Value: 'development'
          },
          {
            Key: 'ManagedBy',
            Value: 'CDK'
          },
          {
            Key: 'CostCenter',
            Value: 'video-content-creation'
          }
        ])
      });
    });
  });

  describe('Secret Access Permissions', () => {
    test('should grant Lambda functions access to secrets', () => {
      // Check that Lambda functions have IAM policies to access secrets
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: expect.arrayContaining([
            expect.objectContaining({
              Effect: 'Allow',
              Action: ['secretsmanager:GetSecretValue'],
              Resource: expect.objectContaining({
                Ref: expect.stringMatching(/ApiCredentialsSecret/)
              })
            })
          ])
        }
      });
    });

    test('should not allow public access to secrets', () => {
      // Verify no resource policy allows public access
      const secrets = template.findResources('AWS::SecretsManager::Secret');
      Object.values(secrets).forEach((secret: any) => {
        expect(secret.Properties.ResourcePolicy).toBeUndefined();
      });
    });
  });

  describe('Secret Configuration Validation', () => {
    test('should create exactly one API credentials secret', () => {
      const secrets = template.findResources('AWS::SecretsManager::Secret');
      const apiSecrets = Object.values(secrets).filter((secret: any) => 
        secret.Properties?.Name === 'automated-video-pipeline/api-credentials'
      );
      expect(apiSecrets.length).toBe(1);
    });

    test('should have all required API credential fields in template', () => {
      const secrets = template.findResources('AWS::SecretsManager::Secret');
      const apiSecret = Object.values(secrets).find((secret: any) => 
        secret.Properties?.Name === 'automated-video-pipeline/api-credentials'
      ) as any;

      const secretTemplate = JSON.parse(apiSecret.Properties.GenerateSecretString.SecretStringTemplate);
      
      // Verify all required API keys are present
      expect(secretTemplate).toHaveProperty('googleTrendsApiKey');
      expect(secretTemplate).toHaveProperty('twitterBearerToken');
      expect(secretTemplate).toHaveProperty('youtubeClientId');
      expect(secretTemplate).toHaveProperty('youtubeClientSecret');
      expect(secretTemplate).toHaveProperty('youtubeRefreshToken');
      expect(secretTemplate).toHaveProperty('pexelsApiKey');
      expect(secretTemplate).toHaveProperty('pixabayApiKey');
      expect(secretTemplate).toHaveProperty('newsApiKey');
    });

    test('should initialize all credential fields as empty strings', () => {
      const secrets = template.findResources('AWS::SecretsManager::Secret');
      const apiSecret = Object.values(secrets).find((secret: any) => 
        secret.Properties?.Name === 'automated-video-pipeline/api-credentials'
      ) as any;

      const secretTemplate = JSON.parse(apiSecret.Properties.GenerateSecretString.SecretStringTemplate);
      
      // All fields should be empty strings initially
      Object.values(secretTemplate).forEach(value => {
        expect(value).toBe('');
      });
    });

    test('should exclude problematic characters from generated strings', () => {
      template.hasResourceProperties('AWS::SecretsManager::Secret', {
        GenerateSecretString: {
          ExcludeCharacters: '"@/\\'
        }
      });
    });
  });

  describe('Secret Security Configuration', () => {
    test('should not have automatic rotation enabled by default', () => {
      const secrets = template.findResources('AWS::SecretsManager::Secret');
      Object.values(secrets).forEach((secret: any) => {
        expect(secret.Properties.RotationConfiguration).toBeUndefined();
      });
    });

    test('should not have KMS key specified (uses default encryption)', () => {
      const secrets = template.findResources('AWS::SecretsManager::Secret');
      Object.values(secrets).forEach((secret: any) => {
        expect(secret.Properties.KmsKeyId).toBeUndefined();
      });
    });

    test('should not have replica regions configured', () => {
      const secrets = template.findResources('AWS::SecretsManager::Secret');
      Object.values(secrets).forEach((secret: any) => {
        expect(secret.Properties.ReplicaRegions).toBeUndefined();
      });
    });
  });

  describe('Integration with Lambda Functions', () => {
    test('should allow topic management function to access secrets', () => {
      // Find the topic management function's IAM role
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: expect.arrayContaining([
            expect.objectContaining({
              Effect: 'Allow',
              Action: ['secretsmanager:GetSecretValue']
            })
          ])
        },
        Roles: expect.arrayContaining([
          expect.objectContaining({
            Ref: expect.stringMatching(/TopicManagementFunction.*Role/)
          })
        ])
      });
    });

    test('should allow sheets sync function to access secrets', () => {
      // Find the sheets sync function's IAM role
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: expect.arrayContaining([
            expect.objectContaining({
              Effect: 'Allow',
              Action: ['secretsmanager:GetSecretValue']
            })
          ])
        },
        Roles: expect.arrayContaining([
          expect.objectContaining({
            Ref: expect.stringMatching(/SheetsSyncFunction.*Role/)
          })
        ])
      });
    });
  });

  describe('Cost Optimization', () => {
    test('should not have unnecessary secret versions', () => {
      // Verify no explicit secret versions are created
      const secretVersions = template.findResources('AWS::SecretsManager::SecretVersion');
      expect(Object.keys(secretVersions).length).toBe(0);
    });

    test('should use default encryption to avoid KMS costs', () => {
      const secrets = template.findResources('AWS::SecretsManager::Secret');
      Object.values(secrets).forEach((secret: any) => {
        // No KMS key specified means default encryption is used
        expect(secret.Properties.KmsKeyId).toBeUndefined();
      });
    });
  });
});