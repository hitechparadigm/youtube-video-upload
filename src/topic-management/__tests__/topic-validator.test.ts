/**
 * Unit Tests for Topic Validator
 * 
 * Tests cover:
 * - Topic content validation
 * - Keyword extraction and validation
 * - Schedule validation
 * - Priority validation
 * - Cost estimation
 * - Content quality assessment
 */

import { TopicValidator } from '../topic-validator';

describe('TopicValidator', () => {
  let validator: TopicValidator;

  beforeEach(() => {
    validator = new TopicValidator();
  });

  describe('validateTopic', () => {
    it('should validate a good topic successfully', () => {
      const result = validator.validateTopic(
        'investing in real estate properties in Canada for beginners',
        ['real estate', 'Canada', 'investment', 'beginners'],
        {
          frequency: 'daily',
          times: ['14:00', '18:00']
        },
        5
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.estimatedCost).toBeGreaterThan(0);
      expect(result.extractedKeywords).toBeDefined();
    });

    it('should detect multiple validation errors', () => {
      const result = validator.validateTopic(
        'spam', // Too short and inappropriate
        [],
        {
          frequency: 'invalid',
          times: []
        },
        15 // Invalid priority
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining('at least 10 characters'),
          expect.stringContaining('inappropriate content'),
          expect.stringContaining('frequency must be'),
          expect.stringContaining('at least one scheduled time'),
          expect.stringContaining('Priority must be')
        ])
      );
    });

    it('should provide helpful suggestions', () => {
      const result = validator.validateTopic(
        'real estate investment in Canada with AI technology trends 2025',
        undefined,
        {
          frequency: 'daily',
          times: ['09:00']
        }
      );

      expect(result.suggestions.length).toBeGreaterThan(0);
      expect(result.suggestions.join(' ')).toMatch(/trending keywords|location-specific/i);
    });
  });

  describe('content validation', () => {
    it('should reject topics that are too short', () => {
      const result = validator.validateTopic('short');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Topic must be at least 10 characters long');
    });

    it('should reject topics that are too long', () => {
      const longTopic = 'a'.repeat(501);
      const result = validator.validateTopic(longTopic);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Topic must be less than 500 characters');
    });

    it('should detect inappropriate content', () => {
      const inappropriateTopics = [
        'how to spam people effectively',
        'illegal hacking techniques',
        'scam people for money',
        'piracy and illegal downloads'
      ];

      inappropriateTopics.forEach(topic => {
        const result = validator.validateTopic(topic);
        expect(result.isValid).toBe(false);
        expect(result.errors.some(error => error.includes('inappropriate content'))).toBe(true);
      });
    });

    it('should warn about generic topics', () => {
      const genericTopics = [
        'how to make money online quickly',
        'get rich quick schemes that work',
        'easy money making opportunities'
      ];

      genericTopics.forEach(topic => {
        const result = validator.validateTopic(topic);
        expect(result.warnings.some(warning => warning.includes('generic'))).toBe(true);
      });
    });

    it('should suggest improvements for short topics', () => {
      const result = validator.validateTopic('AI trends');

      expect(result.warnings.some(warning => 
        warning.includes('short') && warning.includes('more detail')
      )).toBe(true);
    });

    it('should recognize question format topics', () => {
      const result = validator.validateTopic('What are the best real estate investment strategies?');

      expect(result.suggestions.some(suggestion => 
        suggestion.includes('Question-format')
      )).toBe(true);
    });

    it('should identify trending keywords', () => {
      const result = validator.validateTopic('AI and cryptocurrency trends in 2025');

      expect(result.suggestions.some(suggestion => 
        suggestion.includes('trending keywords')
      )).toBe(true);
    });

    it('should recognize location-specific content', () => {
      const result = validator.validateTopic('Real estate market analysis in Canada and USA');

      expect(result.suggestions.some(suggestion => 
        suggestion.includes('Location-specific')
      )).toBe(true);
    });
  });

  describe('keyword validation', () => {
    it('should extract keywords when not provided', () => {
      const result = validator.validateTopic('investing in real estate properties in Canada');

      expect(result.extractedKeywords).toEqual(
        expect.arrayContaining(['investing', 'real', 'estate', 'properties', 'canada'])
      );
    });

    it('should validate minimum keyword count', () => {
      const result = validator.validateTopic(
        'valid topic content here',
        ['single'] // Only one keyword
      );

      expect(result.errors).toContain('At least 2 keywords are required');
    });

    it('should warn about too many keywords', () => {
      const manyKeywords = Array.from({ length: 20 }, (_, i) => `keyword${i}`);
      const result = validator.validateTopic(
        'valid topic content here',
        manyKeywords
      );

      expect(result.warnings.some(warning => 
        warning.includes('Too many keywords')
      )).toBe(true);
    });

    it('should warn about short keywords', () => {
      const result = validator.validateTopic(
        'valid topic content here',
        ['good', 'keyword', 'a', 'b'] // 'a' and 'b' are too short
      );

      expect(result.warnings.some(warning => 
        warning.includes('very short')
      )).toBe(true);
    });

    it('should remove duplicate keywords', () => {
      const result = validator.validateTopic(
        'valid topic content here',
        ['keyword', 'test', 'keyword', 'TEST'] // Duplicates
      );

      expect(result.warnings.some(warning => 
        warning.includes('Duplicate keywords')
      )).toBe(true);
      
      expect(result.extractedKeywords).toEqual(['keyword', 'test']);
    });

    it('should suggest additional keywords', () => {
      const result = validator.validateTopic(
        'real estate investment strategies',
        ['real', 'estate']
      );

      expect(result.suggestions.some(suggestion => 
        suggestion.includes('Consider adding these keywords')
      )).toBe(true);
    });

    it('should extract keywords with relaxed rules when needed', () => {
      // Create validator with strict settings
      const strictValidator = new TopicValidator({
        minKeywords: 5
      });

      const result = strictValidator.validateTopic('AI and ML trends');

      // Should warn about insufficient keywords but still extract some
      expect(result.warnings.some(warning => 
        warning.includes('keywords could be extracted')
      )).toBe(true);
      
      expect(result.extractedKeywords.length).toBeGreaterThan(0);
    });
  });

  describe('schedule validation', () => {
    it('should validate valid schedules', () => {
      const validSchedules = [
        { frequency: 'daily', times: ['09:00', '15:00'] },
        { frequency: 'weekly', times: ['12:00'] },
        { frequency: 'custom', times: ['08:30', '16:45', '22:15'] }
      ];

      validSchedules.forEach(schedule => {
        const result = validator.validateTopic('valid topic content', undefined, schedule);
        expect(result.errors.filter(e => e.includes('Schedule') || e.includes('time')))
          .toHaveLength(0);
      });
    });

    it('should require frequency', () => {
      const result = validator.validateTopic(
        'valid topic content',
        undefined,
        { times: ['09:00'] } // Missing frequency
      );

      expect(result.errors).toContain('Schedule frequency is required');
    });

    it('should validate frequency values', () => {
      const result = validator.validateTopic(
        'valid topic content',
        undefined,
        { frequency: 'invalid', times: ['09:00'] }
      );

      expect(result.errors).toContain('Schedule frequency must be "daily", "weekly", or "custom"');
    });

    it('should require at least one scheduled time', () => {
      const result = validator.validateTopic(
        'valid topic content',
        undefined,
        { frequency: 'daily', times: [] }
      );

      expect(result.errors).toContain('At least one scheduled time is required');
    });

    it('should validate time format', () => {
      const invalidTimes = ['25:00', '12:60', '9:00', 'invalid'];
      
      const result = validator.validateTopic(
        'valid topic content',
        undefined,
        { frequency: 'daily', times: invalidTimes }
      );

      expect(result.errors.some(error => 
        error.includes('Invalid time format')
      )).toBe(true);
    });

    it('should warn about too many scheduled times', () => {
      const manyTimes = Array.from({ length: 15 }, (_, i) => 
        `${String(i + 8).padStart(2, '0')}:00`
      );

      const result = validator.validateTopic(
        'valid topic content',
        undefined,
        { frequency: 'daily', times: manyTimes }
      );

      expect(result.warnings.some(warning => 
        warning.includes('Too many scheduled times')
      )).toBe(true);
    });

    it('should suggest optimal scheduling times', () => {
      const result = validator.validateTopic(
        'valid topic content',
        undefined,
        { frequency: 'daily', times: ['03:00', '04:00'] } // Non-optimal times
      );

      expect(result.suggestions.some(suggestion => 
        suggestion.includes('peak engagement times')
      )).toBe(true);
    });

    it('should warn about frequent daily scheduling', () => {
      const result = validator.validateTopic(
        'valid topic content',
        undefined,
        { 
          frequency: 'daily', 
          times: ['09:00', '12:00', '15:00', '18:00', '21:00'] // More than 3 per day
        }
      );

      expect(result.warnings.some(warning => 
        warning.includes('More than 3 videos per day')
      )).toBe(true);
    });
  });

  describe('priority validation', () => {
    it('should validate valid priorities', () => {
      const validPriorities = [1, 5, 10];

      validPriorities.forEach(priority => {
        const result = validator.validateTopic('valid topic content', undefined, undefined, priority);
        expect(result.errors.filter(e => e.includes('Priority'))).toHaveLength(0);
      });
    });

    it('should reject invalid priority values', () => {
      const invalidPriorities = [0, 11, -1, 1.5, NaN];

      invalidPriorities.forEach(priority => {
        const result = validator.validateTopic('valid topic content', undefined, undefined, priority);
        expect(result.errors).toContain('Priority must be an integer between 1 and 10');
      });
    });

    it('should warn about very high priorities', () => {
      const result = validator.validateTopic('valid topic content', undefined, undefined, 9);

      expect(result.warnings.some(warning => 
        warning.includes('Very high priority')
      )).toBe(true);
    });

    it('should suggest caution for low priorities', () => {
      const result = validator.validateTopic('valid topic content', undefined, undefined, 2);

      expect(result.suggestions.some(suggestion => 
        suggestion.includes('Low priority topics')
      )).toBe(true);
    });
  });

  describe('cost estimation', () => {
    it('should estimate higher costs for complex topics', () => {
      const simpleTopic = 'basic cooking tips';
      const complexTopic = 'comprehensive technical analysis of advanced cryptocurrency trading strategies for professional investors';

      const simpleResult = validator.validateTopic(simpleTopic);
      const complexResult = validator.validateTopic(complexTopic);

      expect(complexResult.estimatedCost).toBeGreaterThan(simpleResult.estimatedCost);
    });

    it('should factor in keyword count', () => {
      const fewKeywords = ['simple'];
      const manyKeywords = ['complex', 'detailed', 'comprehensive', 'advanced', 'professional'];

      const fewResult = validator.validateTopic('valid topic content', fewKeywords);
      const manyResult = validator.validateTopic('valid topic content', manyKeywords);

      expect(manyResult.estimatedCost).toBeGreaterThan(fewResult.estimatedCost);
    });

    it('should identify complexity indicators', () => {
      const complexTopic = 'detailed comprehensive analysis of advanced technical professional strategies';
      const result = validator.validateTopic(complexTopic);

      // Should be higher due to complexity indicators
      expect(result.estimatedCost).toBeGreaterThan(1.0);
    });

    it('should cap cost estimates at reasonable bounds', () => {
      const extremelyComplexTopic = 'a'.repeat(500); // Very long topic
      const extremelyManyKeywords = Array.from({ length: 50 }, (_, i) => `keyword${i}`);

      const result = validator.validateTopic(extremelyComplexTopic, extremelyManyKeywords);

      expect(result.estimatedCost).toBeLessThanOrEqual(3.00);
      expect(result.estimatedCost).toBeGreaterThanOrEqual(0.30);
    });

    it('should warn about budget limits', () => {
      const budgetValidator = new TopicValidator({ budgetLimit: 0.50 });
      
      const expensiveTopic = 'extremely detailed comprehensive advanced technical analysis';
      const result = budgetValidator.validateTopic(expensiveTopic);

      if (result.estimatedCost && result.estimatedCost > 0.50) {
        expect(result.warnings.some(warning => 
          warning.includes('exceeds budget limit')
        )).toBe(true);
      }
    });
  });

  describe('keyword suggestion', () => {
    it('should suggest industry-specific keywords', () => {
      const topics = [
        { topic: 'real estate investment', expected: ['property', 'housing', 'market'] },
        { topic: 'technology innovation', expected: ['digital', 'software', 'ai'] },
        { topic: 'financial planning', expected: ['money', 'investment', 'economy'] },
        { topic: 'health and wellness', expected: ['fitness', 'nutrition', 'lifestyle'] }
      ];

      topics.forEach(({ topic, expected }) => {
        const result = validator.validateTopic(topic, ['basic']);
        
        if (result.suggestions.length > 0) {
          const suggestionText = result.suggestions.join(' ');
          const hasExpectedKeyword = expected.some(keyword => 
            suggestionText.includes(keyword)
          );
          expect(hasExpectedKeyword).toBe(true);
        }
      });
    });

    it('should suggest trends keyword for 2025 topics', () => {
      const result = validator.validateTopic('technology predictions for 2025', ['technology']);

      if (result.suggestions.length > 0) {
        expect(result.suggestions.join(' ')).toMatch(/trends/i);
      }
    });
  });

  describe('custom configuration', () => {
    it('should respect custom validation config', () => {
      const customValidator = new TopicValidator({
        minTopicLength: 20,
        maxTopicLength: 100,
        minKeywords: 5,
        maxKeywords: 8
      });

      const result = customValidator.validateTopic(
        'short topic', // Less than 20 chars
        ['one', 'two'] // Less than 5 keywords
      );

      expect(result.errors).toContain('Topic must be at least 20 characters long');
      expect(result.errors).toContain('At least 5 keywords are required');
    });

    it('should use custom content filters', () => {
      const customValidator = new TopicValidator({
        contentFilters: ['custom', 'forbidden', 'blocked']
      });

      const result = customValidator.validateTopic('this topic contains custom forbidden content');

      expect(result.errors.some(error => 
        error.includes('inappropriate content')
      )).toBe(true);
    });
  });
});