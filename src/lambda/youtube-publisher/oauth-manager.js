/**
 * YouTube OAuth Authentication Manager
 * Enhanced OAuth 2.0 authentication with token refresh and multi-channel support
 */

const {
    SecretsManagerClient,
    GetSecretValueCommand,
    PutSecretValueCommand
} = require('@aws-sdk/client-secrets-manager');
const {
    google
} = require('googleapis');

class YouTubeOAuthManager {
    constructor(options = {}) {
        this.secretsClient = new SecretsManagerClient({
            region: options.region || process.env.AWS_REGION || 'us-east-1'
        });

        this.config = {
            secretName: options.secretName || process.env.YOUTUBE_SECRET_NAME || 'youtube-automation/credentials',
            redirectUri: options.redirectUri || 'urn:ietf:wg:oauth:2.0:oob',
            scopes: [
                'https://www.googleapis.com/auth/youtube.upload',
                'https://www.googleapis.com/auth/youtube',
                'https://www.googleapis.com/auth/youtube.force-ssl'
            ]
        };

        this.oauth2Client = null;
        this.credentials = null;
    }

    /**
     * Initialize OAuth client with credentials from Secrets Manager
     */
    async initialize() {
        try {
            console.log('🔐 Initializing YouTube OAuth manager...');

            // Get credentials from Secrets Manager
            this.credentials = await this.getCredentials();

            // Create OAuth2 client
            this.oauth2Client = new google.auth.OAuth2(
                this.credentials.client_id,
                this.credentials.client_secret,
                this.config.redirectUri
            );

            // Set existing tokens if available
            if (this.credentials.refresh_token) {
                this.oauth2Client.setCredentials({
                    refresh_token: this.credentials.refresh_token,
                    access_token: this.credentials.access_token || null
                });
            }

            console.log('✅ YouTube OAuth manager initialized successfully');
            return true;

        } catch (error) {
            console.error('❌ Failed to initialize OAuth manager:', error);
            throw new Error(`OAuth initialization failed: ${error.message}`);
        }
    }

    /**
     * Get authenticated YouTube API client
     */
    async getAuthenticatedClient() {
        try {
            if (!this.oauth2Client) {
                await this.initialize();
            }

            // Check if we need to refresh the access token
            await this.ensureValidToken();

            // Create YouTube API client
            const youtube = google.youtube({
                version: 'v3',
                auth: this.oauth2Client
            });

            return youtube;

        } catch (error) {
            console.error('❌ Failed to get authenticated client:', error);
            throw new Error(`Authentication failed: ${error.message}`);
        }
    }

    /**
     * Ensure we have a valid access token, refresh if necessary
     */
    async ensureValidToken() {
        try {
            const credentials = this.oauth2Client.credentials;

            // If no access token or it's expired, refresh it
            if (!credentials.access_token || this.isTokenExpired(credentials)) {
                console.log('🔄 Refreshing access token...');
                await this.refreshAccessToken();
            }

            return true;

        } catch (error) {
            console.error('❌ Token validation failed:', error);
            throw new Error(`Token validation failed: ${error.message}`);
        }
    }

    /**
     * Refresh the access token using the refresh token
     */
    async refreshAccessToken() {
        try {
            if (!this.oauth2Client || !this.credentials.refresh_token) {
                throw new Error('OAuth client not initialized or no refresh token available');
            }

            console.log('🔄 Refreshing YouTube access token...');

            // Refresh the token
            const {
                credentials
            } = await this.oauth2Client.refreshAccessToken();

            // Update the OAuth client with new credentials
            this.oauth2Client.setCredentials(credentials);

            // Update stored credentials with new access token
            const updatedCredentials = {
                ...this.credentials,
                access_token: credentials.access_token,
                token_expiry: credentials.expiry_date ? new Date(credentials.expiry_date).toISOString() : null
            };

            // Store updated credentials back to Secrets Manager
            await this.updateStoredCredentials(updatedCredentials);
            this.credentials = updatedCredentials;

            console.log('✅ Access token refreshed successfully');
            return credentials;

        } catch (error) {
            console.error('❌ Token refresh failed:', error);
            throw new Error(`Token refresh failed: ${error.message}`);
        }
    }

    /**
     * Check if the current access token is expired
     */
    isTokenExpired(credentials) {
        if (!credentials.expiry_date) {
            return false; // If no expiry date, assume it's still valid
        }

        // Add 5 minute buffer before actual expiry
        const bufferTime = 5 * 60 * 1000; // 5 minutes in milliseconds
        const expiryTime = new Date(credentials.expiry_date).getTime();
        const currentTime = Date.now();

        return (currentTime + bufferTime) >= expiryTime;
    }

    /**
     * Validate current authentication status
     */
    async validateAuthentication() {
        try {
            if (!this.oauth2Client) {
                return {
                    valid: false,
                    reason: 'OAuth client not initialized'
                };
            }

            // Try to make a simple API call to validate authentication
            const youtube = await this.getAuthenticatedClient();

            // Test with a simple channels.list call
            const response = await youtube.channels.list({
                part: ['snippet'],
                mine: true
            });

            if (response.data && response.data.items && response.data.items.length > 0) {
                const channel = response.data.items[0];
                return {
                    valid: true,
                    channelId: channel.id,
                    channelTitle: channel.snippet.title,
                    channelDescription: channel.snippet.description
                };
            } else {
                return {
                    valid: false,
                    reason: 'No channels found for authenticated user'
                };
            }

        } catch (error) {
            console.error('❌ Authentication validation failed:', error);
            return {
                valid: false,
                reason: error.message,
                needsReauth: error.message.includes('invalid_grant') || error.message.includes('unauthorized')
            };
        }
    }

    /**
     * Get credentials from AWS Secrets Manager
     */
    async getCredentials() {
        try {
            console.log(`🔐 Retrieving credentials from: ${this.config.secretName}`);

            const response = await this.secretsClient.send(new GetSecretValueCommand({
                SecretId: this.config.secretName
            }));

            const credentials = JSON.parse(response.SecretString);

            // Validate required fields
            const required = ['client_id', 'client_secret'];
            for (const field of required) {
                if (!credentials[field]) {
                    throw new Error(`Missing required credential: ${field}`);
                }
            }

            // Warn if no refresh token (needed for automated operation)
            if (!credentials.refresh_token) {
                console.warn('⚠️ No refresh token found - manual authentication may be required');
            }

            console.log('✅ Credentials retrieved successfully');
            return credentials;

        } catch (error) {
            console.error('❌ Failed to get credentials:', error);
            throw new Error(`Credentials retrieval failed: ${error.message}`);
        }
    }

    /**
     * Update stored credentials in Secrets Manager
     */
    async updateStoredCredentials(updatedCredentials) {
        try {
            console.log('💾 Updating stored credentials...');

            await this.secretsClient.send(new PutSecretValueCommand({
                SecretId: this.config.secretName,
                SecretString: JSON.stringify(updatedCredentials, null, 2)
            }));

            console.log('✅ Credentials updated successfully');

        } catch (error) {
            console.error('❌ Failed to update credentials:', error);
            // Don't throw - this is not critical for operation
            console.warn('⚠️ Continuing without updating stored credentials');
        }
    }

    /**
     * Generate authorization URL for manual OAuth flow (if needed)
     */
    generateAuthUrl() {
        if (!this.oauth2Client) {
            throw new Error('OAuth client not initialized');
        }

        const authUrl = this.oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: this.config.scopes,
            prompt: 'consent' // Force consent to get refresh token
        });

        return authUrl;
    }

    /**
     * Exchange authorization code for tokens (for initial setup)
     */
    async exchangeCodeForTokens(authorizationCode) {
        try {
            if (!this.oauth2Client) {
                await this.initialize();
            }

            console.log('🔄 Exchanging authorization code for tokens...');

            const {
                tokens
            } = await this.oauth2Client.getToken(authorizationCode);

            // Set the credentials
            this.oauth2Client.setCredentials(tokens);

            // Update stored credentials
            const updatedCredentials = {
                ...this.credentials,
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token,
                token_expiry: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null
            };

            await this.updateStoredCredentials(updatedCredentials);
            this.credentials = updatedCredentials;

            console.log('✅ Authorization code exchanged successfully');
            return tokens;

        } catch (error) {
            console.error('❌ Failed to exchange authorization code:', error);
            throw new Error(`Code exchange failed: ${error.message}`);
        }
    }

    /**
     * Get current authentication status and channel info
     */
    async getAuthStatus() {
        try {
            // Try to initialize first if not already done
            if (!this.oauth2Client || !this.credentials) {
                console.log('🔄 Initializing OAuth manager for status check...');
                await this.initialize();
            }

            const validation = await this.validateAuthentication();

            return {
                authenticated: validation.valid,
                channelInfo: validation.valid ? {
                    channelId: validation.channelId,
                    channelTitle: validation.channelTitle,
                    channelDescription: validation.channelDescription
                } : null,
                error: validation.valid ? null : validation.reason,
                needsReauth: validation.needsReauth || false,
                credentials: {
                    hasClientId: !!(this.credentials && this.credentials.client_id),
                    hasClientSecret: !!(this.credentials && this.credentials.client_secret),
                    hasRefreshToken: !!(this.credentials && this.credentials.refresh_token),
                    hasAccessToken: !!(this.credentials && this.credentials.access_token)
                }
            };

        } catch (error) {
            console.error('❌ getAuthStatus failed:', error);
            return {
                authenticated: false,
                channelInfo: null,
                error: error.message,
                needsReauth: true,
                credentials: {
                    hasClientId: false,
                    hasClientSecret: false,
                    hasRefreshToken: false,
                    hasAccessToken: false
                }
            };
        }
    }
}

module.exports = {
    YouTubeOAuthManager
};