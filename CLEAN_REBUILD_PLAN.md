# 🔧 CLEAN REBUILD PLAN - V3 Pipeline

**Branch**: `clean-rebuild`  
**Version**: v3 (Lambda functions prefixed with `-v3`)  
**Status**: 🚧 **REBUILDING FROM SCRATCH**  
**Goal**: Create a properly coordinated video pipeline with real content generation

---

## 🎯 **REBUILD OBJECTIVES - ALIGNED WITH SPEC REQUIREMENTS**

### **Primary Goals (Per Requirements Document)**

1. **Agent Coordination**: Enhanced AI Agent Context Flow Architecture (Req 8)
2. **Real Content**: Scene-Specific Media Curation & Professional Audio (Req 4, 6)
3. **Industry Standards**: Professional Video Production Standards (Req 13)
4. **Validation**: Mandatory AI Agent Output Validation with Circuit Breaker (Req 17)
5. **Context Awareness**: Comprehensive Context Awareness for ALL Agents (Req 18)

### **Success Criteria (Per Spec Requirements)**

- ✅ **Context Flow**: Topic Management AI → Script Generator AI → Media Curator AI (Req 8.1-8.7)
- ✅ **Scene Breakdown**: 3-8 scenes with precise timing and visual requirements (Req 3.1-3.12)
- ✅ **Real Media**: Actual Pexels/Pixabay downloads with scene-specific matching (Req 4.1-4.11)
- ✅ **Professional Audio**: Amazon Polly generative voices with rate limiting (Req 6.1-6.8)
- ✅ **Circuit Breaker**: Pipeline termination on validation failures (Req 17.36-17.40)
- ✅ **Industry Standards**: Professional transitions, audio-visual sync (Req 13.1-13.7)

---

## 🏗️ **ARCHITECTURE DECISIONS**

### **Lambda Function Naming**

- **Prefix**: `-v3` (e.g., `automated-video-pipeline-topic-management-v3`)
- **Benefit**: Easy to identify and delete v3 functions if needed
- **Existing**: v2 functions remain deployed and functional

### **Approach**

- **Clean Slate**: Deleted broken `src/layers/` and `src/shared/` directories
- **Deleted Tests**: Removed obsolete test suite, will rebuild with working code
- **Context Flow**: Implement proper agent-to-agent context passing
- **Real APIs**: Actual Pexels/Pixabay integration, real Polly audio

---

## 📋 **IMPLEMENTATION PHASES - SPEC-ALIGNED TASKS**

### **Phase 1: Enhanced AI Agent Context Flow (Requirements 8, 17, 18)**

1. **Topic Management AI Enhancement (Req 1.1-1.11)**

   - Generate 10-20 related subtopics using AI analysis and trend data
   - Determine optimal video duration (6-12 minutes) based on topic complexity
   - Create comprehensive context: expandedTopics, videoStructure, contentGuidance, sceneContexts, seoContext
   - Implement mandatory validation with circuit breaker for invalid outputs

2. **Script Generator AI Enhancement (Req 3.1-3.12)**

   - Consume enhanced topic context from Topic Management AI
   - Generate 3-8 scenes with precise timing and professional structure
   - Create detailed scene breakdown: sceneNumber, purpose, duration, content, visualStyle, mediaNeeds, tone
   - Implement mandatory scene validation with pipeline termination on failures

3. **Context Management System (Req 8.1-8.7)**
   - DynamoDB context storage with TTL for temporary objects
   - S3 storage for large context objects with compression
   - Context validation rules and structured JSON schemas
   - Error handling with fallback mechanisms

### **Phase 2: Scene-Specific Content Generation (Requirements 4, 5, 6)**

1. **Media Curator AI Enhancement (Req 4.1-4.11)**

   - Analyze scene visual requirements, duration, and emotional tone
   - Use scene-specific keywords for highly relevant media search
   - AI similarity analysis for imperfect matches using Amazon Bedrock
   - Scene-media mapping with confidence scores and alternatives

2. **Audio Generator AI Enhancement (Req 6.1-6.8)**

   - Smart rate limiting for Amazon Polly (generative: 5 TPS, neural: 10 TPS)
   - Intelligent text splitting at natural sentence breaks
   - Scene-aware audio generation with proper timing
   - Audio quality validation and seamless chunk transitions

3. **Video Assembler AI Enhancement (Req 5.1-5.10)**
   - Precise scene-media synchronization using detailed mapping
   - Professional transitions with smooth effects and timing
   - Audio-visual sync with perfect timing alignment
   - Quality validation meeting technical specifications

### **Phase 3: Professional Standards & Validation (Requirements 13, 14, 15)**

1. **Professional Video Production Standards (Req 13.1-13.7)**

   - Hook-Value-CTA framework with optimal timing
   - Professional scene transitions (match cuts, fade, visual continuity)
   - Engagement hooks every 30-45 seconds
   - Consistent visual style and quality standards

2. **Intelligent Media Assessment (Req 14.1-14.7)**

   - AI image/video analysis for content similarity assessment
   - Quality evaluation (resolution, composition, professional appearance)
   - Media variety ensuring diverse styles with thematic consistency
   - Confidence scores and alternative options for each scene

3. **Context-Aware Error Handling (Req 15.1-15.7)**
   - Preserve context from successful agents during failures
   - Targeted regeneration for missing context elements
   - Fallback mechanisms with alternative sources
   - Partial failure handling with reduced functionality

---

## 🔧 **TECHNICAL IMPLEMENTATION**

### **Context Flow Architecture**

```
Topic Management → Script Generator → Media Curator → Audio Generator → Video Assembler → YouTube Publisher
      ↓                    ↓                ↓               ↓                ↓                    ↓
   S3 Context         S3 Context      S3 Context     S3 Context      S3 Context         S3 Context
   DynamoDB           DynamoDB        DynamoDB       DynamoDB        DynamoDB           DynamoDB
```

### **Enhanced Context Structure (Per Design Document)**

**Topic Context (Topic Management AI → Script Generator AI)**:

```json
{
  "mainTopic": "Travel to Mexico",
  "expandedTopics": [
    {
      "subtopic": "Best time to visit Mexico beaches",
      "priority": "high",
      "estimatedDuration": 90,
      "visualNeeds": "beach scenes, weather graphics",
      "trendScore": 95
    }
  ],
  "videoStructure": {
    "recommendedScenes": 6,
    "hookDuration": 15,
    "mainContentDuration": 420,
    "conclusionDuration": 45
  },
  "seoContext": {
    "primaryKeywords": ["Mexico travel", "vacation planning"],
    "longTailKeywords": ["best time visit Mexico 2025"],
    "trendingTerms": ["sustainable travel", "hidden gems"]
  }
}
```

**Scene Context (Script Generator AI → Media Curator AI)**:

```json
{
  "scenes": [
    {
      "sceneNumber": 1,
      "purpose": "hook",
      "duration": 15,
      "startTime": 0,
      "endTime": 15,
      "narration": "What if I told you Mexico has a secret beach...",
      "visualRequirements": {
        "primary": "stunning beach vista",
        "secondary": ["crystal clear water", "tropical paradise"],
        "style": "cinematic and breathtaking",
        "mood": "exciting and mysterious"
      },
      "mediaNeeds": {
        "imageCount": 2,
        "videoCount": 1,
        "keywords": ["Mexico beach", "paradise", "hidden gem"],
        "duration": 15
      }
    }
  ]
}
```

### **Mandatory Validation with Circuit Breaker (Requirement 17)**

- **Topic Management Validation**: Minimum 5 expanded topics, proper video structure, SEO context
- **Script Generator Validation**: 3-8 scenes with complete structure, timing validation (±30 seconds)
- **Media Curator Validation**: Scene-media mapping with 100% coverage, confidence scores >70%
- **Audio Generator Validation**: Valid MP3 files matching script duration, proper quality metrics
- **Video Assembler Validation**: Technical specifications (1920x1080, 30fps), professional transitions
- **Circuit Breaker**: Pipeline termination on validation failures with detailed diagnostics
- **Fallback Mechanisms**: Industry-standard templates and emergency recovery procedures

---

## 🚀 **DEPLOYMENT STRATEGY**

### **Development Process**

1. **Build Incrementally**: One agent at a time
2. **Test Each Agent**: Verify before moving to next
3. **Context Flow**: Ensure proper coordination
4. **Real Content**: Validate actual file generation

### **AWS Deployment**

- **Function Names**: All use `-v3` suffix
- **Parallel Deployment**: v2 functions remain operational
- **Easy Cleanup**: Can delete all v3 functions if needed
- **Rollback**: v2 functions available as fallback

### **Testing Strategy**

- **Unit Tests**: Individual agent functionality
- **Integration Tests**: Agent-to-agent coordination
- **End-to-End Tests**: Complete pipeline validation
- **Content Quality Tests**: Verify real content generation

---

## 📊 **SUCCESS METRICS - SPEC COMPLIANCE**

### **Context Flow Metrics (Requirement 8)**

- **Context Validation**: 100% schema compliance for all agent communications
- **Data Integrity**: No critical information lost between agents
- **Context Storage**: Proper DynamoDB/S3 storage with TTL and compression
- **Agent Coordination**: All 7 agents working in perfect synchronization

### **Content Quality Metrics (Requirements 4, 5, 6)**

- **Media Relevance**: >70% confidence scores for scene-media matching
- **Audio Quality**: Professional Polly generative voices with proper rate limiting
- **Video Standards**: 1920x1080, 30fps, professional transitions and sync
- **Real Content**: 100% actual API integrations (no placeholder files)

### **Professional Standards (Requirement 13)**

- **Scene Structure**: Hook-Value-CTA framework with optimal timing
- **Engagement**: Retention hooks every 30-45 seconds
- **Visual Flow**: Professional transitions and consistent quality
- **Industry Compliance**: All video production best practices implemented

### **Validation & Recovery (Requirements 15, 17)**

- **Circuit Breaker**: 100% pipeline termination on validation failures
- **Error Recovery**: Context-aware fallback mechanisms
- **Quality Assurance**: Mandatory validation for all agent outputs
- **Cost Optimization**: ~$0.80 per video target maintained

---

## 🎯 **NEXT STEPS - TASK EXECUTION PLAN**

### **Ready to Execute from Tasks.md**

The clean rebuild plan is now fully aligned with:

- ✅ **requirements.md**: All 18 requirements mapped to implementation phases
- ✅ **design.md**: Enhanced AI agent architecture and context flow
- ✅ **tasks.md**: Specific implementation tasks ready for execution

### **Recommended Task Execution Order**

1. **Task 11.1**: Enhance Topic Management AI with mandatory validation
2. **Task 11.2**: Enhance Script Generator AI with mandatory scene validation
3. **Task 4.3**: Implement context management system for agent communication
4. **Task 5.1**: Enhance Media Curator AI with scene context processing
5. **Task 7.2**: Implement actual video processing execution with FFmpeg
6. **Task 9.4**: Implement context-aware error handling and recovery

### **Execution Strategy**

- **One Task at a Time**: Focus on single task completion before moving to next
- **Validation First**: Implement circuit breaker and validation before content generation
- **Context Flow**: Ensure proper agent communication before adding complexity
- **Real Content**: Replace placeholder code with actual API integrations
- **Industry Standards**: Apply professional video production practices throughout

### **Ready to Begin**

The v3 functions are deployed and ready. The clean rebuild plan accounts for all spec requirements.

**Which task would you like to start with?** 🚀

---

_Rebuild Plan Created: 2025-10-10_  
_Status: Ready to Begin Phase 1_ 🚀
