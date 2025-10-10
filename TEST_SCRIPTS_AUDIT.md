# Test Scripts Audit & Cleanup Plan

## 📊 Current Test Scripts Analysis

### ✅ **KEEP - Essential & Current**

#### **Individual Agent Tests (Latest)**
- `test-topic-management-direct.js` - ✅ KEEP (validates Topic Management AI)
- `test-script-simplified.js` - ✅ KEEP (validates simplified Script Generator)
- `test-pipeline-fixed.js` - ✅ KEEP (validates full pipeline after fixes)

#### **Comprehensive Agent Tests**
- `test-script-generator-detailed.js` - ✅ KEEP (detailed Script Generator validation)
- `test-audio-generator-detailed.js` - ✅ KEEP (detailed Audio Generator validation)
- `test-media-curator-detailed.js` - ✅ KEEP (detailed Media Curator validation)

#### **Infrastructure & Monitoring**
- `check-s3-bucket.js` - ✅ KEEP (S3 structure validation)
- `monitor-production-run.js` - ✅ KEEP (production monitoring)

### 🗑️ **DELETE - Obsolete & Redundant**

#### **Old Coffee Tests (Superseded)**
- `test-coffee-async.js` - ❌ DELETE (superseded by pipeline-fixed)
- `test-coffee-complete.js` - ❌ DELETE (superseded by pipeline-fixed)
- `test-coffee-focused.js` - ❌ DELETE (superseded by pipeline-fixed)
- `test-coffee-pipeline-e2e.js` - ❌ DELETE (superseded by pipeline-fixed)

#### **Old Travel Mexico Tests (Superseded)**
- `run-travel-mexico-final.js` - ❌ DELETE (old version)
- `run-travel-mexico-full-production.js` - ❌ DELETE (old version)
- `run-travel-mexico-pipeline.js` - ❌ DELETE (old version)
- `run-travel-mexico-real-content.js` - ❌ DELETE (old version)
- `run-travel-mexico-standalone.js` - ❌ DELETE (old version)
- `run-travel-mexico-with-s3.js` - ❌ DELETE (old version)

#### **Old Individual Agent Tests (Superseded)**
- `test-audio-generator.js` - ❌ DELETE (superseded by detailed version)
- `test-media-curator.js` - ❌ DELETE (superseded by detailed version)
- `test-script-generator.js` - ❌ DELETE (superseded by simplified version)
- `test-topic-management.js` - ❌ DELETE (superseded by direct version)

#### **Old Pipeline Tests (Superseded)**
- `test-workflow-communication.js` - ❌ DELETE (superseded by pipeline-fixed)
- `test-workflow-simple.js` - ❌ DELETE (superseded by pipeline-fixed)
- `test-pipeline-coordination.js` - ❌ DELETE (superseded by pipeline-fixed)

#### **Old Enhancement Tests (Superseded)**
- `test-script-enhanced.js` - ❌ DELETE (superseded by simplified)
- `test-script-with-context.js` - ❌ DELETE (superseded by simplified)
- `test-video-assembler-enhanced.js` - ❌ DELETE (not currently used)
- `test-media-curator-cv.js` - ❌ DELETE (superseded by detailed)

#### **Old Infrastructure Tests (Superseded)**
- `check-real-content-s3.js` - ❌ DELETE (superseded by check-s3-bucket)
- `check-travel-mexico-s3.js` - ❌ DELETE (superseded by check-s3-bucket)
- `integration-test.js` - ❌ DELETE (superseded by pipeline-fixed)

#### **Old Debug/Fix Scripts (Completed)**
- `debug-api-timeouts.js` - ❌ DELETE (issues resolved)
- `fix-agent-coordination.js` - ❌ DELETE (fixes applied)
- `fix-context-aware-pipeline.js` - ❌ DELETE (fixes applied)
- `fix-topic-management-timeout.js` - ❌ DELETE (fixes applied)
- `final-context-fix.js` - ❌ DELETE (fixes applied)
- `test-timeout-fixes.js` - ❌ DELETE (fixes validated)
- `investigate-pipeline-issues.js` - ❌ DELETE (issues resolved)

#### **Old Infrastructure Scripts (Completed)**
- `cleanup-aws-infrastructure.js` - ❌ DELETE (cleanup completed)
- `cleanup-infrastructure.js` - ❌ DELETE (cleanup completed)

### 🔄 **CONSOLIDATE - JSON Files**

#### **Context Files (Keep Latest)**
- `topic-context-pipeline-ai.json` - ✅ KEEP (latest AI context)
- `topic-context-ai-enhanced.json` - ❌ DELETE (old version)
- `topic-context-ai-test.json` - ❌ DELETE (old version)
- `topic-context-coffee.json` - ❌ DELETE (old version)
- `topic-context-final-ai.json` - ❌ DELETE (old version)

#### **Test Payloads (Keep Essential)**
- `test-payload.json` - ✅ KEEP (generic test payload)
- `script-test-payload.json` - ❌ DELETE (superseded by simplified tests)

#### **Test Results (Keep Latest)**
- `timeout-test-results.json` - ❌ DELETE (issues resolved)

## 📋 **Recommended Final Test Suite**

### **Essential Tests (8 files)**
1. `test-topic-management-direct.js` - Topic Management AI validation
2. `test-script-simplified.js` - Script Generator validation  
3. `test-pipeline-fixed.js` - Full pipeline validation
4. `test-script-generator-detailed.js` - Detailed script validation
5. `test-audio-generator-detailed.js` - Audio generation validation
6. `test-media-curator-detailed.js` - Media curation validation
7. `check-s3-bucket.js` - S3 structure validation
8. `monitor-production-run.js` - Production monitoring

### **Supporting Files (2 files)**
1. `topic-context-pipeline-ai.json` - Latest AI context example
2. `test-payload.json` - Generic test payload

## 📊 **Cleanup Summary**
- **Total Files**: 47 test-related files
- **Keep**: 10 files (21%)
- **Delete**: 37 files (79%)
- **Space Saved**: ~85% reduction in test file clutter
- **Maintenance**: Much easier to understand and maintain

## 🎯 **Benefits of Cleanup**
1. **Clarity**: Only current, working tests remain
2. **Maintenance**: Easier to update and maintain
3. **Onboarding**: New developers won't be confused by obsolete scripts
4. **Performance**: Faster file searches and navigation
5. **Documentation**: Clear test strategy with focused scripts