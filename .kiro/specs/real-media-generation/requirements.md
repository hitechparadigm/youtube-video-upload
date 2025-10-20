# Requirements Document

## Introduction

The Automated Video Pipeline currently has a fully operational architecture with 7/7 components working, but the Media Curator and Video Assembler are generating placeholder content instead of real media files. This feature will implement real image downloads from external APIs (Pexels/Pixabay) and ensure the FFmpeg layer creates actual MP4 videos instead of instruction files.

## Glossary

- **Media_Curator**: Lambda function responsible for downloading and organizing visual content for video scenes
- **Video_Assembler**: Lambda function responsible for creating final MP4 video files using FFmpeg
- **External_APIs**: Google Places, Pexels, and Pixabay services with API keys in AWS Secrets Manager
- **Google_Places_API**: Google Places API v1 for authentic location photos and place metadata
- **Triple_API_Integration**: Simultaneous search across Google Places, Pexels, and Pixabay APIs
- **FFmpeg_Layer**: AWS Lambda layer containing FFmpeg binaries for video processing
- **Placeholder_Content**: Text-based dummy files currently being generated instead of real media
- **Real_Media**: Actual image files downloaded from external APIs and real MP4 video files
- **Location_Intelligence**: AI system for extracting location context and selecting authentic place photos

## Requirements

### Requirement 1

**User Story:** As a content creator, I want the video pipeline to download real images from Google Places, Pexels, and Pixabay APIs, so that my videos contain authentic, high-quality visual content instead of text placeholders.

#### Acceptance Criteria

1. WHEN the Media Curator processes a scene, THE Media_Curator SHALL search Triple_API_Integration simultaneously for optimal content selection
2. WHEN processing travel content, THE Media_Curator SHALL prioritize Google_Places_API for authentic location photos
3. WHEN downloading images, THE Media_Curator SHALL retrieve API keys from AWS Secrets Manager using the hitechparadigm profile
4. WHEN multiple APIs return results, THE Media_Curator SHALL apply intelligent priority scoring with Google Places receiving highest priority
5. WHERE multiple images are needed per scene, THE Media_Curator SHALL download at least 3-4 real images per scene with duplicate prevention

### Requirement 2

**User Story:** As a content creator, I want the Video Assembler to create real MP4 files using FFmpeg, so that I get playable video content instead of instruction files.

#### Acceptance Criteria

1. WHEN the Video Assembler processes a manifest, THE Video_Assembler SHALL use the FFmpeg_Layer to create real MP4 files
2. WHEN FFmpeg is available, THE Video_Assembler SHALL combine real images and audio into a playable video file
3. WHEN processing images, THE Video_Assembler SHALL use actual image files from S3 instead of placeholder text
4. IF FFmpeg processing fails, THEN THE Video_Assembler SHALL log detailed error information and attempt fallback processing
5. THE Video_Assembler SHALL create MP4 files larger than 100KB to ensure real content generation

### Requirement 3

**User Story:** As a system administrator, I want proper error handling and API rate limiting, so that the system handles external API failures gracefully without breaking the pipeline.

#### Acceptance Criteria

1. WHEN External_APIs return rate limit errors, THE Media_Curator SHALL implement exponential backoff retry logic
2. WHEN API keys are invalid or missing, THE Media_Curator SHALL log clear error messages and fall back to placeholders
3. WHEN network requests timeout, THE Media_Curator SHALL retry up to 3 times before falling back
4. THE Media_Curator SHALL respect API rate limits by implementing appropriate delays between requests
5. WHERE API quotas are exceeded, THE Media_Curator SHALL switch to alternative APIs automatically

### Requirement 4

**User Story:** As a content creator, I want the system to validate that real content was generated, so that I can be confident my videos contain actual media instead of placeholders.

#### Acceptance Criteria

1. WHEN media processing completes, THE Media_Curator SHALL validate that downloaded files are actual images (not text)
2. WHEN video processing completes, THE Video_Assembler SHALL validate that the output file is a real MP4 (not JSON)
3. THE Media_Curator SHALL log file sizes and types to confirm real content generation
4. THE Video_Assembler SHALL verify MP4 file headers to ensure valid video format
5. WHERE validation fails, THE system SHALL clearly indicate placeholder content was used and why

### Requirement 5

**User Story:** As a content creator, I want multi-scene video processing to consistently generate real media for all scenes, so that Scene 3 and later scenes don't fall back to placeholder content due to rate limiting.

#### Acceptance Criteria

1. WHEN processing multiple scenes sequentially, THE Media_Curator SHALL implement intelligent delays between API calls to prevent rate limiting
2. WHEN API rate limits are approached, THE Media_Curator SHALL automatically distribute requests across available APIs to maintain real content generation
3. WHEN duplicate prevention filters too aggressively, THE Media_Curator SHALL expand search criteria for later scenes to ensure content availability
4. THE Media_Curator SHALL track API usage across scenes and implement progressive backoff strategies for sustained processing
5. WHERE Scene 3 or later scenes encounter rate limits, THE Media_Curator SHALL implement alternative search strategies before falling back to placeholders
