/**
 * Unit Tests for IAM Roles and Permissions
 * 
 * Tests IAM role creation, policies, and permissions for all components
 * in the automated video pipeline infrastructure.
 */

import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { AutomatedVideoPipelineStack } from '../../lib/automated-video-pipeline-stack';

describe('IAM Roles and Permissions', () => {
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

  describe('Lambda Function IAM Roles', () => {
    test('should create IAM role for topic management function', () => {
      template.hasResourceProperties('AWS::IAM::Role', {
        AssumeRolePolicyDocument: {
          Statement: [
            {
              Effect: 'Allow',
              Principal: {
                Service: 'lambda.amazonaws.com'
              },
              Action: 'sts:AssumeRole'
            }
          ]
        },
        ManagedPolicyArns: [
          {
            'Fn::Join': [
              '',
              [
                'arn:',
                { Ref: 'AWS::Partition' },
                ':iam::aws:policy/service-role/AWSLambdaBasicExecutionRole'
              ]
            ]
          }
        ]
      });
    });

    test('should grant DynamoDB permissions to topic management function', () => {
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: expect.arrayContaining([
            expect.objectContaining({
              Effect: 'Allow',
              Action: [
                'dynamodb:GetItem',
                'dynamodb:PutItem',
                'dynamodb:UpdateItem',
                'dynamodb:DeleteItem',
                'dynamodb:Query',
                'dynamodb:Scan'
              ]
            })
          ])
        }
      });
    });

    test('should create IAM role for sheets sync function', () => {
      template.hasResourceProperties('AWS::IAM::Role', {
        AssumeRolePolicyDocument: {
          Statement: [
            {
              Effect: 'Allow',
              Principal: {
                Service: 'lambda.amazonaws.com'
              },
              Action: 'sts:AssumeRole'
            }
          ]
        }
      });
    });

    test('should grant Secrets Manager access to sheets sync function', () => {
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: expect.arrayContaining([
            expect.objectContaining({
              Effect: 'Allow',
              Action: ['secretsmanager:GetSecretValue']
            })
          ])
        }
      });
    });
  });

  describe('ECS Task IAM Roles', () => {
    test('should create ECS task execution role', () => {
      template.hasResourceProperties('AWS::IAM::Role', {
        AssumeRolePolicyDocument: {
          Statement: [
            {
              Effect: 'Allow',
              Principal: {
                Service: 'ecs-tasks.amazonaws.com'
              },
              Action: 'sts:AssumeRole'
            }
          ]
        },
        ManagedPolicyArns: [
          {
            'Fn::Join': [
              '',
              [
                'arn:',
                { Ref: 'AWS::Partition' },
                ':iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy'
              ]
            ]
          }
        ]
      });
    });

    test('should create ECS task role with S3 permissions', () => {
      template.hasResourceProperties('AWS::IAM::Role', {
        AssumeRolePolicyDocument: {
          Statement: [
            {
              Effect: 'Allow',
              Principal: {
                Service: 'ecs-tasks.amazonaws.com'
              },
              Action: 'sts:AssumeRole'
            }
          ]
        }
      });

      // Check for S3 access policy
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: expect.arrayContaining([
            expect.objectContaining({
              Effect: 'Allow',
              Action: [
                's3:GetObject',
                's3:PutObject',
                's3:DeleteObject'
              ]
            })
          ])
        }
      });
    });

    test('should grant DynamoDB access to ECS task role', () => {
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: expect.arrayContaining([
            expect.objectContaining({
              Effect: 'Allow',
              Action: [
                'dynamodb:UpdateItem',
                'dynamodb:GetItem'
              ]
            })
          ])
        }
      });
    });
  });

  describe('Permission Scope Validation', () => {
    test('should limit S3 permissions to specific bucket', () => {
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: expect.arrayContaining([
            expect.objectContaining({
              Effect: 'Allow',
              Action: expect.arrayContaining([
                's3:GetObject',
                's3:PutObject',
                's3:DeleteObject'
              ]),
              Resource: expect.arrayContaining([
                expect.objectContaining({
                  'Fn::GetAtt': expect.arrayContaining([
                    expect.stringMatching(/VideoPipelineBucket/),
                    'Arn'
                  ])
                }),
                expect.objectContaining({
                  'Fn::Join': expect.arrayContaining([
                    '',
                    expect.arrayContaining([
                      expect.objectContaining({
                        'Fn::GetAtt': expect.arrayContaining([
                          expect.stringMatching(/VideoPipelineBucket/),
                          'Arn'
                        ])
                      }),
                      '/*'
                    ])
                  ])
                })
              ])
            })
          ])
        }
      });
    });

    test('should limit DynamoDB permissions to specific tables', () => {
      const policies = template.findResources('AWS::IAM::Policy');
      
      // Find policies with DynamoDB permissions
      const dynamoDbPolicies = Object.values(policies).filter((policy: any) => {
        return policy.Properties.PolicyDocument.Statement.some((statement: any) => 
          statement.Action && statement.Action.some((action: string) => action.startsWith('dynamodb:'))
        );
      });

      expect(dynamoDbPolicies.length).toBeGreaterThan(0);

      dynamoDbPolicies.forEach((policy: any) => {
        const dynamoStatements = policy.Properties.PolicyDocument.Statement.filter((statement: any) => 
          statement.Action && statement.Action.some((action: string) => action.startsWith('dynamodb:'))
        );

        dynamoStatements.forEach((statement: any) => {
          // Should have specific resource ARNs, not wildcard
          expect(statement.Resource).toBeDefined();
          expect(Array.isArray(statement.Resource)).toBe(true);
        });
      });
    });

    test('should limit Secrets Manager permissions to specific secret', () => {
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
  });

  describe('Least Privilege Principle', () => {
    test('should not grant unnecessary administrative permissions', () => {
      const policies = template.findResources('AWS::IAM::Policy');
      
      Object.values(policies).forEach((policy: any) => {
        policy.Properties.PolicyDocument.Statement.forEach((statement: any) => {
          // Should not have wildcard actions
          if (Array.isArray(statement.Action)) {
            statement.Action.forEach((action: string) => {
              expect(action).not.toBe('*');
            });
          } else if (typeof statement.Action === 'string') {
            expect(statement.Action).not.toBe('*');
          }

          // Should not have wildcard resources for sensitive actions
          if (statement.Resource === '*') {
            // Only allow for basic Lambda execution permissions
            if (Array.isArray(statement.Action)) {
              statement.Action.forEach((action: string) => {
                expect(['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents']).toContain(action);
              });
            }
          }
        });
      });
    });

    test('should not grant cross-account access', () => {
      const roles = template.findResources('AWS::IAM::Role');
      
      Object.values(roles).forEach((role: any) => {
        const assumeRolePolicy = role.Properties.AssumeRolePolicyDocument;
        assumeRolePolicy.Statement.forEach((statement: any) => {
          if (statement.Principal && statement.Principal.AWS) {
            // Should not allow cross-account access
            expect(statement.Principal.AWS).not.toMatch(/arn:aws:iam::\d{12}:root/);
          }
        });
      });
    });

    test('should use service-specific principals', () => {
      const roles = template.findResources('AWS::IAM::Role');
      
      Object.values(roles).forEach((role: any) => {
        const assumeRolePolicy = role.Properties.AssumeRolePolicyDocument;
        assumeRolePolicy.Statement.forEach((statement: any) => {
          if (statement.Principal && statement.Principal.Service) {
            // Should use specific AWS services
            const validServices = [
              'lambda.amazonaws.com',
              'ecs-tasks.amazonaws.com',
              'events.amazonaws.com'
            ];
            expect(validServices).toContain(statement.Principal.Service);
          }
        });
      });
    });
  });

  describe('Role Configuration Validation', () => {
    test('should have appropriate number of IAM roles', () => {
      const roles = template.findResources('AWS::IAM::Role');
      // Should have roles for: Lambda functions, ECS execution, ECS task
      expect(Object.keys(roles).length).toBeGreaterThanOrEqual(4);
    });

    test('should attach managed policies where appropriate', () => {
      // Lambda execution role should have basic execution policy
      template.hasResourceProperties('AWS::IAM::Role', {
        ManagedPolicyArns: expect.arrayContaining([
          expect.objectContaining({
            'Fn::Join': expect.arrayContaining([
              '',
              expect.arrayContaining([
                'arn:',
                { Ref: 'AWS::Partition' },
                ':iam::aws:policy/service-role/AWSLambdaBasicExecutionRole'
              ])
            ])
          })
        ])
      });

      // ECS execution role should have ECS execution policy
      template.hasResourceProperties('AWS::IAM::Role', {
        ManagedPolicyArns: expect.arrayContaining([
          expect.objectContaining({
            'Fn::Join': expect.arrayContaining([
              '',
              expect.arrayContaining([
                'arn:',
                { Ref: 'AWS::Partition' },
                ':iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy'
              ])
            ])
          })
        ])
      });
    });

    test('should have proper resource tags on IAM roles', () => {
      const roles = template.findResources('AWS::IAM::Role');
      
      Object.values(roles).forEach((role: any) => {
        if (role.Properties.Tags) {
          expect(role.Properties.Tags).toEqual(expect.arrayContaining([
            expect.objectContaining({
              Key: 'youtube-video-upload',
              Value: 'true'
            })
          ]));
        }
      });
    });
  });

  describe('EventBridge Permissions', () => {
    test('should allow EventBridge to invoke Lambda functions', () => {
      // EventBridge should have permission to invoke the sheets sync function
      template.hasResourceProperties('AWS::Lambda::Permission', {
        Action: 'lambda:InvokeFunction',
        Principal: 'events.amazonaws.com'
      });
    });

    test('should have proper source ARN for EventBridge permissions', () => {
      template.hasResourceProperties('AWS::Lambda::Permission', {
        Action: 'lambda:InvokeFunction',
        Principal: 'events.amazonaws.com',
        SourceArn: expect.objectContaining({
          'Fn::GetAtt': expect.arrayContaining([
            expect.stringMatching(/SheetsSyncSchedule/),
            'Arn'
          ])
        })
      });
    });
  });
});