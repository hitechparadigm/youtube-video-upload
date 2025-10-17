/**
 * YouTube OAuth Manager Tests
 * Tests for OAuth authentication, token refresh, and credential management
 */

const {
    YouTubeOAuthManager
} = require('../oauth-manager');

// Mock AWS SDK
jest.mock('@aws-sdk/client-secrets-manager');

describe('YouTubeOAuthManager', () => {
    let oauthManager;
    let mockSecretsClient;

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();

        // Mock SecretsManagerClient
        mockSecretsClient = {
            send: jest.fn()
        };

        const {
            SecretsManagerClient
        } = require('@aws-sdk/client-secrets-manager');
        SecretsManagerClient.mockImplementation(() => mockSecretsClient);

        oauthManager = new YouTubeOAuthManager({
            secretName: 'test-youtube-credentials',
            region: 'us-east-1'
        });
    });

    describe('initialization', () => {
        test('should initialize with default configuration', () => {
            const manager = new YouTubeOAuthManager();
            expect(manager.config.secretName).toBe('youtube-automation/credentials');
            expect(manager.config.redirectUri).toBe('urn:ietf:wg:oauth:2.0:oob');
        });

        test('should initialize with custom configuration', () => {
            const manager = new YouTubeOAuthManager({
                secretName: 'custom-secret',
                region: 'us-west-2'
            });
            expect(manager.config.secretName).toBe('custom-secret');
        });
    });

    describe('credential management', () => {
        test('should retrieve credentials from Secrets Manager', async () => {
            const mockCredentials = {
                client_id: 'test-client-id',
                client_secret: 'test-client-secret',
                refresh_token: 'test-refresh-token'
            };

            mockSecretsClient.send.mockResolvedValue({
                SecretString: JSON.stringify(mockCredentials)
            });

            const credentials = await oauthManager.getCredentials();

            expect(credentials).toEqual(mockCredentials);
            expect(mockSecretsClient.send).toHaveBeenCalledTimes(1);
        });

        test('should throw error for missing required credentials', async () => {
            const incompleteCredentials = {
                client_id: 'test-client-id'
                // Missing client_secret
            };

            mockSecretsClient.send.mockResolvedValue({
                SecretString: JSON.stringify(incompleteCredentials)
            });

            await expect(oauthManager.getCredentials()).rejects.toThrow('Missing required credential: client_secret');
        });

        test('should handle Secrets Manager errors', async () => {
            mockSecretsClient.send.mockRejectedValue(new Error('Secret not found'));

            await expect(oauthManager.getCredentials()).rejects.toThrow('Credentials retrieval failed: Secret not found');
        });
    });

    describe('token management', () => {
        test('should detect expired tokens', () => {
            const expiredCredentials = {
                expiry_date: Date.now() - 10000 // 10 seconds ago
            };

            const isExpired = oauthManager.isTokenExpired(expiredCredentials);
            expect(isExpired).toBe(true);
        });

        test('should detect valid tokens', () => {
            const validCredentials = {
                expiry_date: Date.now() + 3600000 // 1 hour from now
            };

            const isExpired = oauthManager.isTokenExpired(validCredentials);
            expect(isExpired).toBe(false);
        });

        test('should handle missing expiry date', () => {
            const credentialsWithoutExpiry = {};

            const isExpired = oauthManager.isTokenExpired(credentialsWithoutExpiry);
            expect(isExpired).toBe(false);
        });
    });

    describe('authentication status', () => {
        test('should return authentication status', async () => {
            const mockCredentials = {
                client_id: 'test-client-id',
                client_secret: 'test-client-secret',
                refresh_token: 'test-refresh-token',
                access_token: 'test-access-token'
            };

            mockSecretsClient.send.mockResolvedValue({
                SecretString: JSON.stringify(mockCredentials)
            });

            // Mock the validateAuthentication method
            oauthManager.validateAuthentication = jest.fn().mockResolvedValue({
                valid: true,
                channelId: 'test-channel-id',
                channelTitle: 'Test Channel'
            });

            const authStatus = await oauthManager.getAuthStatus();

            expect(authStatus.authenticated).toBe(true);
            expect(authStatus.channelInfo).toEqual({
                channelId: 'test-channel-id',
                channelTitle: 'Test Channel',
                channelDescription: undefined
            });
            expect(authStatus.credentials.hasClientId).toBe(true);
            expect(authStatus.credentials.hasRefreshToken).toBe(true);
        });

        test('should handle authentication failures', async () => {
            mockSecretsClient.send.mockRejectedValue(new Error('Credentials not found'));

            const authStatus = await oauthManager.getAuthStatus();

            expect(authStatus.authenticated).toBe(false);
            expect(authStatus.error).toBe('Credentials not found');
            expect(authStatus.needsReauth).toBe(true);
        });
    });

    describe('authorization URL generation', () => {
        test('should generate authorization URL', async () => {
            const mockCredentials = {
                client_id: 'test-client-id',
                client_secret: 'test-client-secret'
            };

            mockSecretsClient.send.mockResolvedValue({
                SecretString: JSON.stringify(mockCredentials)
            });

            await oauthManager.initialize();

            const authUrl = oauthManager.generateAuthUrl();

            expect(authUrl).toContain('https://accounts.google.com/o/oauth2/v2/auth');
            expect(authUrl).toContain('client_id=test-client-id');
            expect(authUrl).toContain('access_type=offline');
        });

        test('should throw error if not initialized', () => {
            expect(() => oauthManager.generateAuthUrl()).toThrow('OAuth client not initialized');
        });
    });
});