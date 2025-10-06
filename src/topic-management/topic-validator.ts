/**
 * Topic Validation Utility
 * 
 * Provides comprehensive validation for topic content and configuration:
 * - Content quality and appropriateness validation
 * - Keyword extraction and optimization
 * - Schedule validation and conflict detection
 * - Priority and resource allocation validation
 * - Cost estimation and budget validation
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
  estimatedCost?: number;
  extractedKeywords?: string[];
}

export interface TopicValidationConfig {
  minTopicLength: number;
  maxTopicLength: number;
  maxKeywords: number;
  minKeywords: number;
  maxScheduledTimes: number;
  budgetLimit?: number;
  contentFilters: string[];
}

export class TopicValidator {
  private config: TopicValidationConfig;
  private inappropriateWords: Set<string>;
  private stopWords: Set<string>;

  constructor(config?: Partial<TopicValidationConfig>) {
    this.config = {
      minTopicLength: 10,
      maxTopicLength: 500,
      maxKeywords: 15,
      minKeywords: 2,
      maxScheduledTimes: 10,
      contentFilters: ['spam', 'scam', 'illegal', 'hack', 'piracy', 'adult', 'gambling'],
      ...config
    };

    this.inappropriateWords = new Set(this.config.contentFilters);
    
    this.stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
      'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those',
      'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them'
    ]);
  }

  /**
   * Validate complete topic configuration
   */
  validateTopic(
    topic: string,
    keywords?: string[],
    schedule?: any,
    priority?: number
  ): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: []
    };

    // Validate topic content
    const contentValidation = this.validateTopicContent(topic);
    result.errors.push(...contentValidation.errors);
    result.warnings.push(...contentValidation.warnings);
    result.suggestions.push(...contentValidation.suggestions);

    // Extract and validate keywords
    const keywordValidation = this.validateKeywords(topic, keywords);
    result.errors.push(...keywordValidation.errors);
    result.warnings.push(...keywordValidation.warnings);
    result.suggestions.push(...keywordValidation.suggestions);
    result.extractedKeywords = keywordValidation.extractedKeywords;

    // Validate schedule if provided
    if (schedule) {
      const scheduleValidation = this.validateSchedule(schedule);
      result.errors.push(...scheduleValidation.errors);
      result.warnings.push(...scheduleValidation.warnings);
      result.suggestions.push(...scheduleValidation.suggestions);
    }

    // Validate priority if provided
    if (priority !== undefined) {
      const priorityValidation = this.validatePriority(priority);
      result.errors.push(...priorityValidation.errors);
      result.warnings.push(...priorityValidation.warnings);
    }

    // Estimate cost
    result.estimatedCost = this.estimateTopicCost(topic, result.extractedKeywords);

    // Validate against budget if configured
    if (this.config.budgetLimit && result.estimatedCost > this.config.budgetLimit) {
      result.warnings.push(`Estimated cost ($${result.estimatedCost.toFixed(2)}) exceeds budget limit ($${this.config.budgetLimit.toFixed(2)})`);
    }

    result.isValid = result.errors.length === 0;
    return result;
  }

  /**
   * Validate topic content quality and appropriateness
   */
  private validateTopicContent(topic: string): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: []
    };

    // Basic length validation
    if (!topic || topic.trim().length < this.config.minTopicLength) {
      result.errors.push(`Topic must be at least ${this.config.minTopicLength} characters long`);
    }

    if (topic && topic.length > this.config.maxTopicLength) {
      result.errors.push(`Topic must be less than ${this.config.maxTopicLength} characters`);
    }

    if (!topic) {
      return result;
    }

    const cleanTopic = topic.trim().toLowerCase();

    // Check for inappropriate content
    for (const word of this.inappropriateWords) {
      if (cleanTopic.includes(word)) {
        result.errors.push(`Topic contains inappropriate content: "${word}"`);
      }
    }

    // Check for very generic topics
    const genericPhrases = [
      'how to make money',
      'get rich quick',
      'easy money',
      'work from home',
      'make money online'
    ];

    for (const phrase of genericPhrases) {
      if (cleanTopic.includes(phrase)) {
        result.warnings.push(`Topic appears generic: "${phrase}". Consider being more specific for better content quality.`);
      }
    }

    // Check for sufficient detail
    const wordCount = cleanTopic.split(/\s+/).length;
    if (wordCount < 4) {
      result.warnings.push('Topic is quite short. Consider adding more detail for better content generation.');
    }

    // Check for question format
    if (cleanTopic.includes('?')) {
      result.suggestions.push('Question-format topics work well for educational content.');
    }

    // Check for trending keywords
    const trendingKeywords = ['2025', 'ai', 'crypto', 'sustainability', 'remote work', 'digital transformation'];
    const foundTrending = trendingKeywords.filter(keyword => cleanTopic.includes(keyword));
    
    if (foundTrending.length > 0) {
      result.suggestions.push(`Topic includes trending keywords: ${foundTrending.join(', ')}. This may increase engagement.`);
    }

    // Check for location specificity
    const locations = ['canada', 'usa', 'europe', 'asia', 'australia', 'uk', 'germany', 'france', 'japan'];
    const foundLocations = locations.filter(location => cleanTopic.includes(location));
    
    if (foundLocations.length > 0) {
      result.suggestions.push(`Location-specific content (${foundLocations.join(', ')}) can improve targeting and relevance.`);
    }

    return result;
  }

  /**
   * Validate and optimize keywords
   */
  private validateKeywords(topic: string, providedKeywords?: string[]): ValidationResult & { extractedKeywords: string[] } {
    const result: ValidationResult & { extractedKeywords: string[] } = {
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: [],
      extractedKeywords: []
    };

    // Extract keywords from topic if not provided
    let keywords = providedKeywords || this.extractKeywords(topic);

    // Validate keyword count
    if (keywords.length < this.config.minKeywords) {
      if (providedKeywords) {
        result.errors.push(`At least ${this.config.minKeywords} keywords are required`);
      } else {
        result.warnings.push(`Only ${keywords.length} keywords could be extracted. Consider providing keywords manually for better results.`);
        // Try to extract more keywords with relaxed rules
        keywords = this.extractKeywords(topic, true);
      }
    }

    if (keywords.length > this.config.maxKeywords) {
      result.warnings.push(`Too many keywords (${keywords.length}). Using first ${this.config.maxKeywords} for optimization.`);
      keywords = keywords.slice(0, this.config.maxKeywords);
    }

    // Validate keyword quality
    const shortKeywords = keywords.filter(k => k.length < 3);
    if (shortKeywords.length > 0) {
      result.warnings.push(`Some keywords are very short: ${shortKeywords.join(', ')}. Consider using more descriptive terms.`);
    }

    // Check for duplicate keywords
    const uniqueKeywords = [...new Set(keywords.map(k => k.toLowerCase()))];
    if (uniqueKeywords.length < keywords.length) {
      result.warnings.push('Duplicate keywords detected. Removing duplicates for optimization.');
      keywords = uniqueKeywords;
    }

    // Suggest additional keywords based on topic analysis
    const suggestedKeywords = this.suggestAdditionalKeywords(topic, keywords);
    if (suggestedKeywords.length > 0) {
      result.suggestions.push(`Consider adding these keywords: ${suggestedKeywords.join(', ')}`);
    }

    result.extractedKeywords = keywords;
    return result;
  }

  /**
   * Validate schedule configuration
   */
  private validateSchedule(schedule: any): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: []
    };

    if (!schedule.frequency) {
      result.errors.push('Schedule frequency is required');
      return result;
    }

    if (!['daily', 'weekly', 'custom'].includes(schedule.frequency)) {
      result.errors.push('Schedule frequency must be "daily", "weekly", or "custom"');
    }

    if (!schedule.times || !Array.isArray(schedule.times) || schedule.times.length === 0) {
      result.errors.push('At least one scheduled time is required');
      return result;
    }

    if (schedule.times.length > this.config.maxScheduledTimes) {
      result.warnings.push(`Too many scheduled times (${schedule.times.length}). Consider reducing for cost optimization.`);
    }

    // Validate time format
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    const invalidTimes = schedule.times.filter((time: string) => !timeRegex.test(time));
    
    if (invalidTimes.length > 0) {
      result.errors.push(`Invalid time format: ${invalidTimes.join(', ')}. Use HH:MM format (24-hour).`);
    }

    // Check for optimal scheduling times
    const optimalTimes = ['09:00', '12:00', '15:00', '18:00', '21:00'];
    const hasOptimalTime = schedule.times.some((time: string) => optimalTimes.includes(time));
    
    if (!hasOptimalTime) {
      result.suggestions.push(`Consider scheduling during peak engagement times: ${optimalTimes.join(', ')}`);
    }

    // Check for too frequent scheduling
    if (schedule.frequency === 'daily' && schedule.times.length > 3) {
      result.warnings.push('More than 3 videos per day may impact quality and increase costs significantly.');
    }

    return result;
  }

  /**
   * Validate priority setting
   */
  private validatePriority(priority: number): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: []
    };

    if (!Number.isInteger(priority) || priority < 1 || priority > 10) {
      result.errors.push('Priority must be an integer between 1 and 10');
    }

    if (priority > 8) {
      result.warnings.push('Very high priority topics will be processed first but may increase costs.');
    }

    if (priority < 3) {
      result.suggestions.push('Low priority topics may experience delays during high-demand periods.');
    }

    return result;
  }

  /**
   * Extract keywords from topic text
   */
  private extractKeywords(topic: string, relaxed: boolean = false): string[] {
    if (!topic) return [];

    const minLength = relaxed ? 2 : 3;
    
    return topic
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '') // Remove punctuation
      .split(/\s+/) // Split by whitespace
      .filter(word => 
        word.length >= minLength && 
        !this.stopWords.has(word) &&
        !/^\d+$/.test(word) // Exclude pure numbers
      )
      .slice(0, this.config.maxKeywords);
  }

  /**
   * Suggest additional keywords based on topic analysis
   */
  private suggestAdditionalKeywords(topic: string, existingKeywords: string[]): string[] {
    const suggestions: string[] = [];
    const topicLower = topic.toLowerCase();
    const existing = new Set(existingKeywords.map(k => k.toLowerCase()));

    // Industry-specific keyword suggestions
    const industryKeywords = {
      'real estate': ['property', 'investment', 'housing', 'market', 'mortgage'],
      'technology': ['innovation', 'digital', 'software', 'ai', 'automation'],
      'finance': ['money', 'investment', 'trading', 'market', 'economy'],
      'health': ['wellness', 'fitness', 'nutrition', 'medical', 'lifestyle'],
      'education': ['learning', 'skills', 'training', 'knowledge', 'development'],
      'travel': ['tourism', 'destination', 'culture', 'adventure', 'experience'],
      'business': ['strategy', 'growth', 'management', 'leadership', 'success']
    };

    for (const [industry, keywords] of Object.entries(industryKeywords)) {
      if (topicLower.includes(industry)) {
        keywords.forEach(keyword => {
          if (!existing.has(keyword) && suggestions.length < 3) {
            suggestions.push(keyword);
          }
        });
      }
    }

    // Year-based suggestions
    if (topicLower.includes('2025') && !existing.has('trends')) {
      suggestions.push('trends');
    }

    return suggestions;
  }

  /**
   * Estimate cost for generating content on this topic
   */
  private estimateTopicCost(topic: string, keywords: string[]): number {
    // Base cost estimation based on topic complexity
    let baseCost = 0.50; // Base cost per video

    // Adjust based on topic length (more content = higher cost)
    const wordCount = topic.split(/\s+/).length;
    baseCost += wordCount * 0.02; // $0.02 per word

    // Adjust based on keyword count (more keywords = more research)
    baseCost += keywords.length * 0.05; // $0.05 per keyword

    // Adjust based on topic complexity indicators
    const complexityIndicators = [
      'analysis', 'comparison', 'detailed', 'comprehensive', 'advanced',
      'technical', 'professional', 'expert', 'in-depth', 'complete'
    ];

    const topicLower = topic.toLowerCase();
    const complexityScore = complexityIndicators.filter(indicator => 
      topicLower.includes(indicator)
    ).length;

    baseCost += complexityScore * 0.10; // $0.10 per complexity indicator

    // Cap the estimate at reasonable bounds
    return Math.min(Math.max(baseCost, 0.30), 3.00);
  }
}