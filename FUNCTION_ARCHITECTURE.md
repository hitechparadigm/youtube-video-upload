# 🏗️ FUNCTION ARCHITECTURE - Clear Distinction of Responsibilities

**Branch**: `fix-pipeline-coordination`  
**Purpose**: Define clear separation of concerns for each Lambda function  
**Architecture**: API Gateway + Lambda Layers + Context Flow

---

## 🎯 **FUNCTION OVERVIEW**

The video pipeline consists of **7 specialized Lambda functions**, each with distinct responsibilities and clear interfaces. No function should duplicate another's work.

---

## 📋 **1. TOPIC MANAGEMENT**
**Function**: `topic-management`  
**Primary Role**: Topic Analysis & Project Initialization

### **Responsibilities:**
- 📊 **Topic Analysis**: Analyze base topic and generate expanded subtopics
- 🎯 **Duration Planning**: Determine optimal video duration (6-12 minutes)
- 📁 **Project Creation**: Generate unique project ID with timestamp
- 🔄 **Context Storage**: Store topic context for downstream agents
- 📈 **SEO Research**: Generate keywords and trending terms

### **Input:**
```json
{
  "baseTopic": "Travel to Mexico",
  "targetAudience": "travelers",
  "contentType": "educational"
}
```

### **Output:**
```json
{
  "projectId": "2025-10-10T04-15-30_travel-to-mexico",
  "topicContext": {
    "mainTopic": "Travel to Mexico",
    "expandedTopics": ["Best destinations", "Food guide", "Culture tips"],
    "videoStructure": {
      "totalDuration": 480,
      "recommendedScenes": 6,
      "hookDuration": 15,
      "mainContentDuration": 420,
      "conclusionDuration": 45
    },
    "seoContext": {
      "primaryKeywords": ["Mexico travel", "vacation guide"],
      "longTailKeywords": ["best places to visit in Mexico"]
    }
  }
}
```

### **Context Storage:**
- Stores `topicContext` to DynamoDB and S3
- Used by: Script Generator

---

## 📝 **2. SCRIPT GENERATOR**
**Function**: `script-generator`  
**Primary Role**: Professional Script Creation with Scene Breakdown

### **Responsibilities:**
- 📖 **Script Writing**: Create engaging 6-12 minute scripts
- 🎬 **Scene Breakdown**: Divide into 4-8 scenes with specific timing
- 🎯 **Visual Requirements**: Generate scene-specific media requirements
- ⏱️ **Timing Precision**: Exact timestamps for each scene
- 🎭 **Engagement Optimization**: Hooks, retention, call-to-action

### **Input:**
- Uses `topicContext` from Topic Management
- Additional parameters for style and audience

### **Output:**
```json
{
  "sceneContext": {
    "scenes": [
      {
        "sceneNumber": 1,
        "title": "Hook - Why Mexico?",
        "startTime": 0,
        "endTime": 15,
        "duration": 15,
        "script": "Have you ever wondered why Mexico...",
        "mediaRequirements": {
          "specificLocations": ["Mexico City skyline"],
          "visualStyle": "cinematic",
          "searchKeywords": ["Mexico travel", "destination"]
        }
      }
    ],
    "totalDuration": 480,
    "sceneCount": 6
  }
}
```

### **Context Storage:**
- Stores `sceneContext` to DynamoDB and S3
- Used by: Media Curator, Audio Generator

---

## 🎨 **3. MEDIA CURATOR**
**Function**: `media-curator`  
**Primary Role**: Scene-Specific Media Downloads

### **Responsibilities:**
- 🔍 **Scene Analysis**: Use script context to understand media needs
- 📸 **Media Search**: Search Pexels/Pixabay with scene-specific keywords
- ⬇️ **Real Downloads**: Download actual high-resolution images/videos
- 📁 **Organization**: Organize media by scene in S3
- 🎯 **Quality Control**: Ensure professional quality (>100KB images)

### **Input:**
- Uses `sceneContext` from Script Generator
- Scene-specific media requirements

### **Output:**
```json
{
  "mediaContext": {
    "sceneMediaMapping": [
      {
        "sceneNumber": 1,
        "mediaAssets": [
          {
            "assetId": "pexels-img-123456",
            "type": "image",
            "url": "s3://bucket/videos/project/03-media/scene-1/mexico-skyline.jpg",
            "duration": 5,
            "source": "pexels",
            "resolution": "1920x1080",
            "fileSize": 245678
          }
        ]
      }
    ],
    "totalAssets": 15,
    "industryCompliance": true
  }
}
```

### **Context Storage:**
- Stores `mediaContext` to DynamoDB and S3
- Used by: Video Assembler

---

## 🎙️ **4. AUDIO GENERATOR**
**Function**: `audio-generator`  
**Primary Role**: Professional Narration with Scene Timing

### **Responsibilities:**
- 🗣️ **Audio Synthesis**: Generate audio using Amazon Polly
- ⏱️ **Scene Timing**: Create audio segments matching scene durations
- 🎵 **Quality Control**: Professional audio quality (MP3, proper bitrate)
- 📊 **Timing Marks**: Precise timestamps for video synchronization
- 🔄 **Rate Limiting**: Respect Polly API limits

### **Input:**
- Uses `sceneContext` from Script Generator
- Voice preferences and audio settings

### **Output:**
```json
{
  "audioContext": {
    "masterAudioId": "audio-123456",
    "audioSegments": [
      {
        "sceneNumber": 1,
        "audioUrl": "s3://bucket/videos/project/04-audio/scene-1-narration.mp3",
        "duration": 15,
        "startTime": 0,
        "endTime": 15,
        "voiceId": "Ruth",
        "fileSize": 234567
      }
    ],
    "totalDuration": 480,
    "timingMarks": [
      {"type": "scene_start", "sceneNumber": 1, "timestamp": 0}
    ]
  }
}
```

### **Context Storage:**
- Stores `audioContext` to DynamoDB and S3
- Used by: Video Assembler

---

## 🎬 **5. VIDEO ASSEMBLER**
**Function**: `video-assembler`  
**Primary Role**: Professional Video Creation with Scene Synchronization

### **Responsibilities:**
- 🎞️ **Video Assembly**: Combine media and audio into final video
- ⏱️ **Scene Sync**: Precise synchronization of media with audio timing
- 🎨 **Transitions**: Professional transitions between scenes
- 📏 **Quality Control**: 1080p MP4 output with proper encoding
- 🔄 **Processing**: Handle video rendering and compression

### **Input:**
- Uses `sceneContext` from Script Generator
- Uses `mediaContext` from Media Curator  
- Uses `audioContext` from Audio Generator

### **Output:**
```json
{
  "videoResult": {
    "videoId": "video-123456",
    "videoUrl": "s3://bucket/videos/project/05-video/final-video.mp4",
    "duration": 480,
    "resolution": "1920x1080",
    "format": "mp4",
    "fileSize": 45678901,
    "scenes": 6,
    "processingTime": 120
  }
}
```

### **Context Storage:**
- Stores `videoResult` to DynamoDB and S3
- Used by: YouTube Publisher

---

## 📺 **6. YOUTUBE PUBLISHER**
**Function**: `youtube-publisher`  
**Primary Role**: YouTube Upload with SEO Optimization

### **Responsibilities:**
- 📤 **Video Upload**: Upload final video to YouTube
- 🎯 **SEO Optimization**: Generate optimized titles, descriptions, tags
- 📊 **Metadata Management**: Handle YouTube-specific metadata
- 🔐 **Authentication**: Manage YouTube OAuth credentials
- 📈 **Analytics Setup**: Configure video analytics and tracking

### **Input:**
- Uses `videoResult` from Video Assembler
- Uses `topicContext` for SEO optimization

### **Output:**
```json
{
  "youtubeResult": {
    "youtubeVideoId": "dQw4w9WgXcQ",
    "youtubeUrl": "https://youtube.com/watch?v=dQw4w9WgXcQ",
    "title": "Ultimate Travel Guide to Mexico 2025",
    "uploadStatus": "completed",
    "visibility": "public",
    "publishedAt": "2025-10-10T04:15:30Z"
  }
}
```

---

## 🔄 **7. WORKFLOW ORCHESTRATOR**
**Function**: `workflow-orchestrator`  
**Primary Role**: Pipeline Coordination & Context Flow Management

### **Responsibilities:**
- 🚀 **Pipeline Execution**: Coordinate all 6 agents in sequence
- 🔄 **Context Flow**: Ensure proper context passing between agents
- 📊 **Progress Tracking**: Monitor execution status and handle failures
- 🔧 **Error Recovery**: Retry failed steps and handle partial failures
- 📈 **Performance Monitoring**: Track timing and success rates

### **Execution Flow:**
```
1. Topic Management → Store topicContext
2. Script Generator → Read topicContext → Store sceneContext  
3. Media Curator → Read sceneContext → Store mediaContext
4. Audio Generator → Read sceneContext → Store audioContext
5. Video Assembler → Read all contexts → Store videoResult
6. YouTube Publisher → Read videoResult + topicContext → Publish
```

---

## 🏗️ **ARCHITECTURE PRINCIPLES**

### **1. Single Responsibility**
- Each function has ONE primary role
- No overlapping responsibilities
- Clear input/output contracts

### **2. Context Flow**
- Functions communicate through stored context
- Downstream functions read context from upstream functions
- No direct function-to-function calls

### **3. Industry Standards**
- All durations must be consistent across agents
- Professional video production practices
- Quality validation at each step

### **4. Error Handling**
- Each function validates its inputs
- Proper error messages and recovery
- Graceful degradation when possible

---

## 🔧 **IMPLEMENTATION PLAN**

### **Phase 1: Clean Slate**
1. ✅ Delete broken `src/layers/` and `src/shared/`
2. ✅ Create new Lambda layers from scratch
3. ✅ Update broken tests

### **Phase 2: Core Utilities**
1. Create `context-layer` with proper context management
2. Create `config-layer` with AWS service utilities
3. Implement proper error handling

### **Phase 3: Function Updates**
1. Update all Lambda functions to use new layers
2. Implement proper context flow
3. Fix duration consistency issues

### **Phase 4: Real Content**
1. Implement real Pexels/Pixabay API calls
2. Fix Amazon Polly audio generation
3. Create actual video assembly

### **Phase 5: Testing**
1. Create new integration tests
2. Test complete pipeline end-to-end
3. Validate industry standards compliance

---

**Ready to proceed with clean slate approach?** 🚀