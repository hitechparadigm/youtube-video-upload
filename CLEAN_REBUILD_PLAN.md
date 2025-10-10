# 🔧 CLEAN REBUILD PLAN - V3 Pipeline

**Branch**: `clean-rebuild`  
**Version**: v3 (Lambda functions prefixed with `-v3`)  
**Status**: 🚧 **REBUILDING FROM SCRATCH**  
**Goal**: Create a properly coordinated video pipeline with real content generation

---

## 🎯 **REBUILD OBJECTIVES**

### **Primary Goals**
1. **Agent Coordination**: Proper context flow between all agents
2. **Real Content**: Actual media downloads and audio generation
3. **Industry Standards**: Professional video production practices
4. **Duration Consistency**: All agents use consistent timing
5. **Quality Validation**: Verify content format and quality

### **Success Criteria**
- ✅ Consistent duration across all agents (e.g., 480s for 8-minute video)
- ✅ Real images downloaded from Pexels/Pixabay (>100KB each)
- ✅ Valid MP3 audio files matching script duration
- ✅ Proper scene breakdown with 4-8 scenes
- ✅ Context flow between agents working correctly

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

## 📋 **IMPLEMENTATION PHASES**

### **Phase 1: Core Agent Coordination**
1. **Topic Management Agent**
   - Generate consistent topic context with specified duration
   - Create proper scene recommendations
   - Store context for downstream agents

2. **Script Generator Agent**
   - Read topic context from previous agent
   - Generate script with proper scene breakdown
   - Use consistent duration from topic context
   - Create scene-specific visual requirements

3. **Context Flow Validation**
   - Verify agents can read context from previous agents
   - Ensure duration consistency across agents
   - Test basic coordination before adding complexity

### **Phase 2: Real Content Generation**
1. **Media Curator Agent**
   - Read script context with scene breakdown
   - Implement real Pexels/Pixabay API calls
   - Download actual high-resolution images
   - Organize by scene with proper metadata

2. **Audio Generator Agent**
   - Read script content from context
   - Generate real MP3 files with Amazon Polly
   - Match audio duration to script requirements
   - Create scene-aware audio segments

### **Phase 3: Video Assembly & Publishing**
1. **Video Assembler Agent**
   - Read media and audio context
   - Implement scene-media synchronization
   - Create actual video files (or detailed assembly metadata)
   - Validate timing and quality

2. **YouTube Publisher Agent**
   - Read video assembly context
   - Prepare SEO-optimized metadata
   - Implement publishing workflow

### **Phase 4: Testing & Validation**
1. **Integration Tests**
   - End-to-end pipeline testing
   - Context flow validation
   - Content quality verification

2. **Industry Standards Validation**
   - Duration consistency checks
   - Media quality validation
   - Professional video production standards

---

## 🔧 **TECHNICAL IMPLEMENTATION**

### **Context Flow Architecture**
```
Topic Management → Script Generator → Media Curator → Audio Generator → Video Assembler → YouTube Publisher
      ↓                    ↓                ↓               ↓                ↓                    ↓
   S3 Context         S3 Context      S3 Context     S3 Context      S3 Context         S3 Context
   DynamoDB           DynamoDB        DynamoDB       DynamoDB        DynamoDB           DynamoDB
```

### **Context Structure**
```json
{
  "projectId": "2025-10-10T12-00-00_travel-to-mexico-v3",
  "baseTopic": "Travel to Mexico",
  "duration": 480,
  "scenes": [
    {
      "sceneNumber": 1,
      "title": "Introduction to Mexico",
      "duration": 60,
      "content": "...",
      "visualRequirements": ["Mexico landmarks", "colorful culture"]
    }
  ],
  "mediaAssets": [...],
  "audioSegments": [...],
  "videoMetadata": {...}
}
```

### **Quality Validation**
- **File Format Validation**: Verify MP3 headers, JPEG headers
- **Size Validation**: Images >100KB, audio matches duration
- **Content Validation**: Verify actual content, not placeholders
- **Duration Validation**: All agents use consistent timing

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

## 📊 **SUCCESS METRICS**

### **Technical Metrics**
- **Duration Consistency**: 100% (all agents use same duration)
- **Real Content**: 100% (no placeholder files)
- **Context Flow**: 100% (agents read from previous agents)
- **File Quality**: 100% (valid formats, proper sizes)

### **Industry Standards**
- **Scene Structure**: 4-8 scenes for professional videos
- **Media Quality**: High-resolution images (>100KB each)
- **Audio Quality**: Professional narration matching script
- **Timing**: Proper scene duration distribution

### **Pipeline Health**
- **Agent Coordination**: All agents working together
- **Error Handling**: Proper failure detection and recovery
- **Validation**: Quality checks at each stage
- **Documentation**: Clear, accurate system status

---

## 🎯 **NEXT STEPS**

1. **Start with Topic Management**: Create proper context generation
2. **Add Script Generator**: Implement context reading and scene breakdown
3. **Test Coordination**: Verify agents can communicate
4. **Add Real Content**: Implement actual media and audio generation
5. **Validate Quality**: Ensure professional standards
6. **Deploy and Test**: End-to-end pipeline validation

---

*Rebuild Plan Created: 2025-10-10*  
*Status: Ready to Begin Phase 1* 🚀