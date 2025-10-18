# Requirements Document

## Introduction

The Context Synchronization Fix addresses a critical issue where Topic Management successfully creates and stores context data, but Script Generator cannot retrieve it, causing pipeline failures. This issue prevents the automated video pipeline from working end-to-end for new projects, despite all individual components being operational.

## Context Storage and Retrieval Architecture

### How AI Agents Store Context

**Topic Management** stores context in two locations:
1. **S3**: `videos/{projectId}/01-context/topic-context.json` (direct storage)
2. **DynamoDB**: Topics table with project metadata (via shared utilities)

**Other Agents** use the shared context manager which stores context in:
1. **DynamoDB**: Context table with keys `PK: {contextType}#{projectId}`, `SK: {projectId}`
2. **S3**: `videos/{projectId}/01-context/{contextType}-context.json` (standardized path)

### How AI Agents Search for Context

All agents except Topic Management use `retrieveContext(contextType, projectId)` which:

1. **Primary Lookup**: Queries DynamoDB Context table using `{contextType}#{projectId}` as primary key
2. **Standard Path Retrieval**: Attempts to load from S3 at `videos/{projectId}/01-context/{contextType}-context.json`
3. **Fallback Path**: If standard path fails, tries the stored S3 location from DynamoDB record
4. **Path Standardization**: Copies context to standard path and updates DynamoDB record for future use

### Current Issue

**Topic Management** stores context directly in S3 but doesn't create the corresponding DynamoDB Context table entry that other agents expect. This causes `retrieveContext('topic', projectId)` to return null because:

1. No DynamoDB Context table entry exists for the topic context
2. The retrieval logic requires the DynamoDB entry to locate the S3 file
3. Script Generator fails immediately when `topicContext` is null

## Requirements

### Requirement 1: Context Storage Consistency

**User Story:** As a system administrator, I want consistent context storage and retrieval between Topic Management and Script Generator so that context data flows seamlessly between agents.

#### Acceptance Criteria

1. WHEN Topic Management stores context THEN it SHALL create both S3 file and DynamoDB Context table entry
2. WHEN storing in DynamoDB Context table THEN the entry SHALL use keys `PK: topic#{projectId}`, `SK: {projectId}`
3. WHEN storing context metadata THEN the DynamoDB entry SHALL include `s3Location`, `contextType`, `projectId`, and `createdAt`
4. WHEN Topic Management completes THEN the context SHALL be immediately discoverable via `retrieveContext('topic', projectId)`
5. WHEN using shared context utilities THEN Topic Management SHALL use the same `storeContext` function as other agents
6. WHEN context storage completes THEN there SHALL be a brief delay to ensure data is fully committed before proceeding
7. WHEN Script Generator requests context THEN it SHALL implement retry logic with delays to handle storage propagation delays

### Requirement 2: DynamoDB Context Table Integration

**User Story:** As a developer, I want Topic Management to create proper DynamoDB Context table entries so that the standard retrieval mechanism works consistently.

#### Acceptance Criteria

1. WHEN Topic Management stores context THEN it SHALL create a DynamoDB Context table entry with proper key structure
2. WHEN creating the DynamoDB entry THEN it SHALL include `s3Location: videos/{projectId}/01-context/topic-context.json`
3. WHEN storing context metadata THEN the entry SHALL include `contextType: 'topic'`, `projectId`, `createdAt`, and `status: 'completed'`
4. WHEN DynamoDB entry is created THEN it SHALL be immediately queryable by `retrieveContext('topic', projectId)`
5. WHEN using marshall/unmarshall THEN the data types SHALL be consistent with other agents' expectations

### Requirement 3: Storage Completion Synchronization

**User Story:** As a system operator, I want guaranteed storage completion before dependent operations so that race conditions don't cause context retrieval failures.

#### Acceptance Criteria

1. WHEN Topic Management completes storage THEN it SHALL wait for storage confirmation before returning success
2. WHEN storing in multiple locations THEN all storage operations SHALL complete before proceeding
3. WHEN storage operations are asynchronous THEN the system SHALL implement proper await patterns
4. WHEN storage completion is uncertain THEN the system SHALL add a safety delay to ensure data availability
5. WHEN returning from Topic Management THEN the context SHALL be immediately available for retrieval

### Requirement 4: Robust Context Retrieval

**User Story:** As a Script Generator, I want reliable context retrieval with intelligent retry logic so that temporary storage delays don't cause pipeline failures.

#### Acceptance Criteria

1. WHEN context is not found immediately THEN Script Generator SHALL wait 5 seconds and retry
2. WHEN first retry fails THEN Script Generator SHALL wait 10 seconds and retry again
3. WHEN all retries fail THEN Script Generator SHALL provide detailed error information including projectId and expected context location
4. WHEN context is found on retry THEN the system SHALL log the delay for monitoring purposes
5. WHEN implementing retries THEN the system SHALL use appropriate delay mechanisms without blocking other operations