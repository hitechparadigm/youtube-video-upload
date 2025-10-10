# 🚨 Pipeline Issue Analysis & Resolution Plan

**Date**: 2025-10-10  
**Issue**: Script Generator Context Key Bug  
**Status**: **REQUIRES CODE DEPLOYMENT**

## 🔍 Root Cause Analysis

### **The Bug**:
The Script Generator Lambda has a bug where it progressively adds extra dashes to project IDs:

1. **Attempt 1**: Looking for `2025-10-10T14-57--53_travel-tips` (double dash)
2. **Attempt 2**: Looking for `2025-10-10T14-57---53_travel-tips` (triple dash)
3. **Pattern**: Each retry adds another dash

### **Evidence**:
```
⚠️ No topic context found for project 2025-10-10T14-57---53_travel-tips
```

### **Impact**:
- ❌ Script Generator fails every time
- ❌ Pipeline cannot progress beyond Topic Management
- ❌ Multiple S3 folders created from failed attempts
- ❌ Context retrieval always fails

## 🛠️ Required Fix

### **What Needs to be Fixed**:
The bug is in the **Script Generator Lambda function** in the context retrieval logic.

**File**: `src/lambda/script-generator/index.js`  
**Issue**: Project ID manipulation is adding extra dashes

### **Fix Required**:
1. **Identify the bug** in the Script Generator code
2. **Fix the project ID handling** to prevent extra dashes
3. **Deploy the updated Lambda function**
4. **Test with a fresh project ID**

## 🚀 Resolution Plan

### **Option 1: Quick Fix (Recommended)**
1. **Fix the Script Generator code**
2. **Deploy only the Script Generator Lambda**
3. **Test with new project ID**

### **Option 2: Complete Redeployment**
1. **Fix the Script Generator code**
2. **Deploy entire VideoPipelineStack**
3. **Clean up S3 folders**
4. **Test complete pipeline**

## 📊 Current Status

### **Working Components**:
- ✅ Topic Management AI (with manual context)
- ✅ EventBridge Scheduler
- ✅ Cost Tracker
- ✅ All other Lambda functions (untested but likely working)

### **Broken Components**:
- ❌ Script Generator AI (context key bug)
- ❌ Pipeline flow (blocked by Script Generator)

### **S3 Folder Cleanup Needed**:
- `videos/` folder (from failed attempts)
- `context/` folder (from manual fixes)

## 💡 Immediate Actions Required

### **1. Code Fix**:
```javascript
// BEFORE (buggy):
const projectId = someTransformation(originalProjectId); // Adds dashes

// AFTER (fixed):  
const projectId = originalProjectId; // Use as-is
```

### **2. Deployment**:
```bash
cd infrastructure
npm run deploy -- --stack VideoPipelineStack
```

### **3. Testing**:
- Create fresh project with clean project ID
- Test complete pipeline end-to-end
- Verify S3 folder structure

## 🎯 Expected Outcome

After the fix:
- ✅ Script Generator will find context correctly
- ✅ Pipeline will flow through all stages
- ✅ Single S3 project folder will be created
- ✅ Complete video will be generated and published

## ⚠️ Why Workarounds Won't Work

**Data fixes won't solve this** because:
- The bug is in the **code logic**
- Each attempt creates **more dashes**
- Context keys become **increasingly wrong**
- Only a **code fix and deployment** will resolve it

## 🔧 Next Steps

1. **Locate the bug** in Script Generator code
2. **Fix the project ID handling**
3. **Deploy the corrected Lambda function**
4. **Test with fresh project ID**
5. **Clean up S3 folders from failed attempts**

**Bottom Line**: This requires a **code fix and deployment** - data workarounds will not solve the underlying bug.