# Test Suite Documentation

## 🎯 **Essential Test Scripts**

This document describes the clean, focused test suite for the Automated Video Pipeline after cleanup.

### **Individual Agent Tests**

#### 1. Topic Management AI Test
```bash
node test-topic-management-direct.js
```
- **Purpose**: Validates Topic Management AI with Bedrock Claude 3 Sonnet
- **Expected**: 200 OK, 6+ expanded topics, AI-generated content
- **Performance**: ~17 seconds execution time

#### 2. Script Generator Test  
```bash
node test-script-simplified.js
```
- **Purpose**: Validates simplified Script Generator endpoint
- **Expected**: 200 OK, 6-scene script with professional content
- **Performance**: ~12 seconds execution time

#### 3. Detailed Agent Tests
```bash
node test-script-generator-detailed.js  # Comprehensive script validation
node test-audio-generator-detailed.js   # Audio generation validation  
node test-media-curator-detailed.js     # Media curation validation
```

### **Pipeline Integration Tests**

#### 4. Full Pipeline Test
```bash
node test-pipeline-fixed.js
```
- **Purpose**: Validates complete 6-agent pipeline coordination
- **Expected**: 5/6 agents working (83% success rate - exceeds 3/6 success criteria)
- **Performance**: ~30 seconds total execution

### **Infrastructure Tests**

#### 5. S3 Structure Validation
```bash
node check-s3-bucket.js
```
- **Purpose**: Validates S3 bucket structure and content organization
- **Expected**: Standardized folder structure verification

#### 6. Production Monitoring
```bash
node monitor-production-run.js
```
- **Purpose**: Monitors production pipeline execution
- **Expected**: Real-time pipeline status and metrics

## 📊 **Test Results Interpretation**

### **Success Criteria**

#### Topic Management AI
```json
{
  "statusCode": 200,
  "success": true,
  "topicContext": {
    "expandedTopics": [6+ topics],
    "contentGuidance": {...},
    "seoContext": {...}
  },
  "executionTime": "under-10-seconds"
}
```

#### Script Generator AI
```json
{
  "statusCode": 200,
  "success": true,
  "sceneContext": {
    "scenes": [6 scenes],
    "totalDuration": 480,
    "selectedSubtopic": "...",
    "metadata": {
      "model": "claude-3-sonnet-fast-track"
    }
  }
}
```

#### Full Pipeline (5/6 Agents Working)
```json
{
  "success": true,
  "result": {
    "workingAgents": 5,
    "totalAgents": 6,
    "steps": [
      {"agent": "Topic Management", "success": true},
      {"agent": "Script Generator", "success": true},
      {"agent": "Media Curator", "success": true},
      {"agent": "Audio Generator", "success": true},
      {"agent": "Video Assembler", "success": true},
      {"agent": "YouTube Publisher", "success": false}
    ]
  }
}
```

### **Common Issues & Solutions**

#### 502 Bad Gateway
- **Cause**: Lambda timeout < AI processing time
- **Solution**: Check infrastructure timeout configuration
- **Reference**: `TROUBLESHOOTING.md`

#### 400 Bad Request  
- **Cause**: Parameter format mismatch
- **Solution**: Validate request body format
- **Reference**: `LESSONS_LEARNED.md`

#### Pipeline Timeout
- **Cause**: Orchestrator timeout too short
- **Solution**: Increase orchestrator timeout to 5 minutes
- **Reference**: `infrastructure/lib/video-pipeline-stack.js`

## 🚀 **Quick Test Commands**

### **Health Check (30 seconds)**
```bash
# Test all essential components
node test-topic-management-direct.js && \
node test-script-simplified.js && \
node test-pipeline-fixed.js
```

### **Comprehensive Test (2 minutes)**
```bash
# Run all tests
node test-topic-management-direct.js && \
node test-script-simplified.js && \
node test-script-generator-detailed.js && \
node test-audio-generator-detailed.js && \
node test-media-curator-detailed.js && \
node test-pipeline-fixed.js && \
node check-s3-bucket.js
```

### **Production Validation**
```bash
# Monitor real pipeline execution
node monitor-production-run.js
```

## 📁 **Supporting Files**

### **Test Data**
- `topic-context-pipeline-ai.json` - Latest AI-generated topic context example
- `test-payload.json` - Generic test payload for manual testing

### **Documentation**
- `TEST_SCRIPTS_AUDIT.md` - Cleanup audit and rationale
- `TROUBLESHOOTING.md` - Common issues and solutions
- `LESSONS_LEARNED.md` - Debugging insights and best practices

## 🎯 **Test Strategy**

### **Development Workflow**
1. **Individual Tests**: Validate each agent works in isolation
2. **Integration Tests**: Validate agent coordination and communication
3. **Pipeline Tests**: Validate end-to-end workflow
4. **Infrastructure Tests**: Validate AWS resources and configuration

### **Debugging Approach**
1. Start with individual agent tests
2. Check CloudWatch logs for detailed error information
3. Validate parameter formats and timeout configurations
4. Use troubleshooting guide for common issues

### **Performance Benchmarks**
- **Topic Management**: < 20 seconds (AI processing)
- **Script Generator**: < 15 seconds (AI processing)
- **Media Curator**: < 5 seconds (API calls)
- **Audio Generator**: < 5 seconds (placeholder)
- **Full Pipeline**: < 35 seconds (5 working agents)

## ✅ **Cleanup Benefits**

### **Before Cleanup**
- 47 test-related files
- Confusing mix of old and new scripts
- Difficult to identify current vs obsolete tests
- High maintenance overhead

### **After Cleanup**
- 10 essential files (79% reduction)
- Clear, focused test suite
- Easy to understand and maintain
- Documented test strategy and expectations

This clean test suite provides comprehensive coverage while eliminating confusion and maintenance overhead.