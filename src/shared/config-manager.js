/**
 * Configuration Management System
 * Handles loading and merging configurations from multiple sources
 */

const fs = require('fs');
const path = require('path');

class ConfigManager {
    constructor() {
        this.config = {};
        this.loaded = false;
        this.environment = process.env.NODE_ENV || 'development';
    }

    /**
     * Load configuration from multiple sources
     */
    async loadConfig() {
        if (this.loaded) {
            return this.config;
        }

        try {
            // 1. Load default configuration
            const defaultConfig = await this.loadJsonFile('config/default.json');
            
            // 2. Load environment-specific configuration
            const envConfig = await this.loadJsonFile(`config/${this.environment}.json`);
            
            // 3. Load local overrides (not committed to git)
            const localConfig = await this.loadJsonFile('config/local.json');
            
            // 4. Load configuration from environment variables
            const envVarConfig = this.loadFromEnvironmentVariables();
            
            // 5. Load configuration from AWS Secrets Manager (if available)
            const secretsConfig = await this.loadFromSecretsManager();
            
            // Merge configurations (later sources override earlier ones)
            this.config = this.deepMerge(
                defaultConfig,
                envConfig,
                localConfig,
                envVarConfig,
                secretsConfig
            );
            
            // Apply environment-specific overrides
            if (this.config.environments && this.config.environments[this.environment]) {
                this.config = this.deepMerge(this.config, this.config.environments[this.environment]);
            }
            
            this.loaded = true;
            console.log(`Configuration loaded for environment: ${this.environment}`);
            
            return this.config;
            
        } catch (error) {
            console.error('Error loading configuration:', error);
            throw error;
        }
    }

    /**
     * Get configuration value by path
     */
    get(path, defaultValue = undefined) {
        if (!this.loaded) {
            throw new Error('Configuration not loaded. Call loadConfig() first.');
        }
        
        return this.getNestedValue(this.config, path, defaultValue);
    }

    /**
     * Set configuration value by path
     */
    set(path, value) {
        if (!this.loaded) {
            throw new Error('Configuration not loaded. Call loadConfig() first.');
        }
        
        this.setNestedValue(this.config, path, value);
    }

    /**
     * Get all configuration
     */
    getAll() {
        if (!this.loaded) {
            throw new Error('Configuration not loaded. Call loadConfig() first.');
        }
        
        return { ...this.config };
    }

    /**
     * Validate configuration against schema
     */
    validate() {
        const requiredPaths = [
            'ai.models.primary.id',
            'ai.models.primary.region',
            'video.processing.quality.resolution',
            'content.generation.defaultFrequency'
        ];

        const missing = [];
        
        for (const path of requiredPaths) {
            if (this.get(path) === undefined) {
                missing.push(path);
            }
        }

        if (missing.length > 0) {
            throw new Error(`Missing required configuration: ${missing.join(', ')}`);
        }

        return true;
    }

    /**
     * Load JSON file with error handling
     */
    async loadJsonFile(filePath) {
        try {
            const fullPath = path.resolve(filePath);
            
            if (!fs.existsSync(fullPath)) {
                console.log(`Configuration file not found: ${filePath}`);
                return {};
            }
            
            const content = fs.readFileSync(fullPath, 'utf8');
            return JSON.parse(content);
            
        } catch (error) {
            console.warn(`Error loading configuration file ${filePath}:`, error.message);
            return {};
        }
    }

    /**
     * Load configuration from environment variables
     */
    loadFromEnvironmentVariables() {
        const config = {};
        
        // Map environment variables to configuration paths
        const envMappings = {
            'BEDROCK_MODEL_ID': 'ai.models.primary.id',
            'BEDROCK_MODEL_REGION': 'ai.models.primary.region',
            'BEDROCK_MODEL_TEMPERATURE': 'ai.models.primary.temperature',
            'BEDROCK_MODEL_MAX_TOKENS': 'ai.models.primary.maxTokens',
            'VIDEO_RESOLUTION': 'video.processing.quality.resolution',
            'VIDEO_FPS': 'video.processing.quality.fps',
            'VIDEO_BITRATE': 'video.processing.quality.bitrate',
            'CONTENT_FREQUENCY': 'content.generation.defaultFrequency',
            'MIN_ENGAGEMENT_SCORE': 'content.generation.minEngagementScore',
            'TTS_VOICE_ID': 'audio.tts.voice.id',
            'TTS_ENGINE': 'audio.tts.voice.engine',
            'YOUTUBE_DEFAULT_PRIVACY': 'publishing.youtube.defaultPrivacy',
            'YOUTUBE_DEFAULT_CATEGORY': 'publishing.youtube.defaultCategory',
            'LOG_LEVEL': 'monitoring.logging.level',
            'COST_BUDGET_DAILY': 'cost.optimization.budgetLimits.daily',
            'COST_BUDGET_MONTHLY': 'cost.optimization.budgetLimits.monthly',
            'COST_BUDGET_PER_VIDEO': 'cost.optimization.budgetLimits.perVideo',
            'API_RATE_LIMIT': 'security.access.rateLimiting.requestsPerMinute',
            'ENABLE_BACKGROUND_MUSIC': 'audio.backgroundMusic.enabled',
            'ENABLE_WATERMARK': 'video.branding.watermark.enabled',
            'PEXELS_ENABLED': 'media.sources.pexels.enabled',
            'PIXABAY_ENABLED': 'media.sources.pixabay.enabled',
            'UNSPLASH_ENABLED': 'media.sources.unsplash.enabled'
        };

        for (const [envVar, configPath] of Object.entries(envMappings)) {
            const value = process.env[envVar];
            if (value !== undefined) {
                this.setNestedValue(config, configPath, this.parseValue(value));
            }
        }

        return config;
    }

    /**
     * Load configuration from AWS Secrets Manager
     */
    async loadFromSecretsManager() {
        try {
            const secretName = process.env.CONFIG_SECRET_NAME;
            if (!secretName) {
                return {};
            }

            const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
            const client = new SecretsManagerClient({ region: process.env.AWS_REGION || 'us-east-1' });
            
            const response = await client.send(new GetSecretValueCommand({
                SecretId: secretName
            }));

            if (response.SecretString) {
                return JSON.parse(response.SecretString);
            }

            return {};

        } catch (error) {
            console.warn('Could not load configuration from Secrets Manager:', error.message);
            return {};
        }
    }

    /**
     * Deep merge objects
     */
    deepMerge(target, ...sources) {
        if (!sources.length) return target;
        const source = sources.shift();

        if (this.isObject(target) && this.isObject(source)) {
            for (const key in source) {
                if (this.isObject(source[key])) {
                    if (!target[key]) Object.assign(target, { [key]: {} });
                    this.deepMerge(target[key], source[key]);
                } else {
                    Object.assign(target, { [key]: source[key] });
                }
            }
        }

        return this.deepMerge(target, ...sources);
    }

    /**
     * Get nested value from object using dot notation
     */
    getNestedValue(obj, path, defaultValue = undefined) {
        const keys = path.split('.');
        let current = obj;

        for (const key of keys) {
            if (current === null || current === undefined || typeof current !== 'object') {
                return defaultValue;
            }
            current = current[key];
        }

        return current !== undefined ? current : defaultValue;
    }

    /**
     * Set nested value in object using dot notation
     */
    setNestedValue(obj, path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        let current = obj;

        for (const key of keys) {
            if (!(key in current) || typeof current[key] !== 'object') {
                current[key] = {};
            }
            current = current[key];
        }

        current[lastKey] = value;
    }

    /**
     * Parse string value to appropriate type
     */
    parseValue(value) {
        // Boolean
        if (value === 'true') return true;
        if (value === 'false') return false;
        
        // Number
        if (/^\d+$/.test(value)) return parseInt(value, 10);
        if (/^\d*\.\d+$/.test(value)) return parseFloat(value);
        
        // JSON
        if (value.startsWith('{') || value.startsWith('[')) {
            try {
                return JSON.parse(value);
            } catch {
                // Fall through to string
            }
        }
        
        // String
        return value;
    }

    /**
     * Check if value is an object
     */
    isObject(item) {
        return item && typeof item === 'object' && !Array.isArray(item);
    }

    /**
     * Get configuration for specific service
     */
    getServiceConfig(serviceName) {
        const serviceConfigs = {
            'ai-topic-generator': [
                'ai.models',
                'ai.prompts',
                'content.generation',
                'content.validation',
                'monitoring.logging'
            ],
            'trend-data-collection': [
                'content.generation.trendDataMaxAge',
                'monitoring.logging',
                'cost.optimization'
            ],
            'media-curator': [
                'media.sources',
                'media.processing',
                'monitoring.logging'
            ],
            'video-processor': [
                'video.processing',
                'video.branding',
                'audio.tts',
                'audio.backgroundMusic',
                'monitoring.logging'
            ],
            'youtube-publisher': [
                'publishing.youtube',
                'publishing.thumbnails',
                'monitoring.logging'
            ]
        };

        const paths = serviceConfigs[serviceName] || [];
        const config = {};

        for (const path of paths) {
            const value = this.get(path);
            if (value !== undefined) {
                this.setNestedValue(config, path, value);
            }
        }

        return config;
    }

    /**
     * Export configuration for deployment
     */
    exportForDeployment() {
        const sensitiveKeys = ['apiKey', 'token', 'password', 'secret', 'key'];
        
        const sanitized = JSON.parse(JSON.stringify(this.config));
        
        const sanitize = (obj) => {
            for (const [key, value] of Object.entries(obj)) {
                if (typeof value === 'object' && value !== null) {
                    sanitize(value);
                } else if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
                    obj[key] = '***REDACTED***';
                }
            }
        };

        sanitize(sanitized);
        return sanitized;
    }
}

// Singleton instance
let configManager = null;

/**
 * Get configuration manager instance
 */
function getConfigManager() {
    if (!configManager) {
        configManager = new ConfigManager();
    }
    return configManager;
}

/**
 * Initialize configuration (call this once at startup)
 */
async function initializeConfig() {
    const manager = getConfigManager();
    await manager.loadConfig();
    manager.validate();
    return manager;
}

module.exports = {
    ConfigManager,
    getConfigManager,
    initializeConfig
};