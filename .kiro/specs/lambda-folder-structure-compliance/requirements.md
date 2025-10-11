# Lambda Folder Structure Compliance - Requirements Document

## Introduction

This specification defines the systematic revision of all Lambda functions in the automated video pipeline to ensure 100% compliance with the standardized folder structure. Each Lambda function must create the appropriate folder and files in S3 according to their role in the pipeline.

## Requirements

### Requirement 1: Standardized Folder Structure

**User Story:** As a video pipeline operator, I want all Lambda functions to create consistent folder structures, so that I can reliably locate and manage video assets.

#### Acceptance Criteria

1. WHEN any Lambda function processes a project THEN it SHALL create files in the correct numbered folder
2. WHEN a project is processed THEN the S3 structure SHALL follow the pattern: `videos/{projectId}/{folder-number}-{folder-name}/`
3. WHEN all pipeline steps complete THEN all 6 folders SHALL exist with appropriate content

### Requirement 2: Topic Management AI (01-context)

**User Story:** As a video pipeline operator, I want Topic Management AI to create the foundational context folder, so that subsequent agents have access to project metadata.

#### Acceptance Criteria

1. WHEN Topic Management AI processes a topic THEN it SHALL create folder `01-context/`
2. WHEN topic processing completes THEN it SHALL store `topic-context.json` in the context folder
3. WHEN context is stored THEN it SHALL include expanded topics, SEO guidance, and content structure
4. WHEN the function completes THEN it SHALL return confirmation of context folder creation

### Requirement 3: Script Generator AI (02-script)

**User Story:** As a video pipeline operator, I want Script Generator AI to create structured script files, so that subsequent agents can access scene-by-scene content.

#### Acceptance Criteria

1. WHEN Script Generator AI processes a project THEN it SHALL create folder `02-script/`
2. WHEN script generation completes THEN it SHALL store `script.json` with scene structure
3. WHEN script is stored THEN it SHALL include scene numbers, content, duration, and media requirements
4. WHEN the function completes THEN it SHALL return confirmation of script folder creation

### Requirement 3: Media Curator AI (03-media)

**User Story:** As a video pipeline operator, I want Media Curator AI to download and organize visual assets, so that video assembly has access to high-quality images.

#### Acceptance Criteria

1. WHEN Media Curator AI processes a project THEN it SHALL create folder `03-media/`
2. WHEN media curation completes THEN it SHALL download actual images from Pexels/Pixabay APIs
3. WHEN images are downloaded THEN they SHALL be stored as `scene-{number}-image-{index}.jpg`
4. WHEN media processing completes THEN it SHALL store `media-manifest.json` with image metadata
5. WHEN the function completes THEN it SHALL return confirmation of media folder creation

### Requirement 4: Audio Generator AI (04-audio)

**User Story:** As a video pipeline operator, I want Audio Generator AI to create professional narration files, so that video assembly has access to high-quality audio.

#### Acceptance Criteria

1. WHEN Audio Generator AI processes a project THEN it SHALL create folder `04-audio/`
2. WHEN audio generation completes THEN it SHALL create MP3 files using Amazon Polly
3. WHEN audio files are created THEN they SHALL be stored as `scene-{number}-narration.mp3`
4. WHEN audio processing completes THEN it SHALL store `audio-manifest.json` with timing data
5. WHEN the function completes THEN it SHALL return confirmation of audio folder creation

### Requirement 5: Video Assembler AI (05-video)

**User Story:** As a video pipeline operator, I want Video Assembler AI to create video assembly instructions, so that the final video can be produced.

#### Acceptance Criteria

1. WHEN Video Assembler AI processes a project THEN it SHALL create folder `05-video/`
2. WHEN video assembly completes THEN it SHALL create `assembly-instructions.json`
3. WHEN assembly instructions are created THEN they SHALL include scene timing, transitions, and effects
4. WHEN video processing completes THEN it SHALL store `video-metadata.json` with production details
5. WHEN the function completes THEN it SHALL return confirmation of video folder creation

### Requirement 6: YouTube Publisher AI (06-metadata)

**User Story:** As a video pipeline operator, I want YouTube Publisher AI to create publication metadata, so that videos can be uploaded with proper titles, descriptions, and tags.

#### Acceptance Criteria

1. WHEN YouTube Publisher AI processes a project THEN it SHALL create folder `06-metadata/`
2. WHEN metadata generation completes THEN it SHALL create `youtube-metadata.json`
3. WHEN metadata is created THEN it SHALL include title, description, tags, and thumbnail specifications
4. WHEN publishing completes THEN it SHALL store `publication-log.json` with upload details
5. WHEN the function completes THEN it SHALL return confirmation of metadata folder creation

### Requirement 7: Error Handling and Validation

**User Story:** As a video pipeline operator, I want robust error handling for folder creation, so that I can identify and resolve issues quickly.

#### Acceptance Criteria

1. WHEN any Lambda function encounters S3 errors THEN it SHALL retry with exponential backoff
2. WHEN folder creation fails THEN it SHALL return specific error messages with folder path
3. WHEN file uploads fail THEN it SHALL log the exact S3 key and error details
4. WHEN validation fails THEN it SHALL return structured error responses with actionable information

### Requirement 8: Performance and Reliability

**User Story:** As a video pipeline operator, I want consistent performance from all Lambda functions, so that the pipeline completes reliably within expected timeframes.

#### Acceptance Criteria

1. WHEN any Lambda function processes a project THEN it SHALL complete within its allocated timeout
2. WHEN S3 operations are performed THEN they SHALL use appropriate retry logic
3. WHEN multiple files are created THEN they SHALL be uploaded efficiently with proper error handling
4. WHEN the pipeline runs THEN each function SHALL report accurate file creation counts

### Requirement 9: Monitoring and Observability

**User Story:** As a video pipeline operator, I want comprehensive logging from all Lambda functions, so that I can monitor pipeline health and troubleshoot issues.

#### Acceptance Criteria

1. WHEN any Lambda function starts THEN it SHALL log the project ID and operation type
2. WHEN folder creation occurs THEN it SHALL log the S3 path and file count
3. WHEN errors occur THEN they SHALL be logged with sufficient context for debugging
4. WHEN functions complete THEN they SHALL log success metrics and execution time

### Requirement 10: Integration and Context Sharing

**User Story:** As a video pipeline operator, I want seamless context sharing between Lambda functions, so that each agent has access to the data it needs.

#### Acceptance Criteria

1. WHEN any Lambda function stores context THEN it SHALL use the shared context manager
2. WHEN context is retrieved THEN it SHALL validate the data structure before processing
3. WHEN context is missing THEN functions SHALL provide clear error messages about dependencies
4. WHEN context is updated THEN it SHALL maintain backward compatibility with existing data