/**
 * Context Integration Helper Functions
 * Provides easy integration of context management into existing Lambda functions
 */

const { storeContext, getContext, updateContext } = require('./context-manager');

/**
 * Store topic context from Topic Management AI
 */
async function storeTopicContext(projectId, topicContext) {
    try {
        const contextId = `${projectId}-topic`;
        
        const result = await storeContext(contextId, 'topic', topicContext, {
            ttlHours: 48, // Topic context valid for 48 hours
            compress: true,
            useS3ForLarge: true
        });
        
        console.log(`Topic context stored for project: ${projectId}`);
        return result;
        
    } catch (error) {
        console.error('Error storing topic context:', error);
        throw error;
    }
}

/**
 * Store scene context from Script Generator AI
 */
async function storeSceneContext(projectId, sceneContext) {
    try {
        const contextId = `${projectId}-scene`;
        
        const result = await storeContext(contextId, 'scene', sceneContext, {
            ttlHours: 24, // Scene context valid for 24 hours
            compress: true,
            useS3ForLarge: true
        });
        
        console.log(`Scene context stored for project: ${projectId}`);
        return result;
        
    } catch (error) {
        console.error('Error storing scene context:', error);
        throw error;
    }
}

/**
 * Store media context from Media Curator AI
 */
async function storeMediaContext(projectId, mediaContext) {
    try {
        const contextId = `${projectId}-media`;
        
        const result = await storeContext(contextId, 'media', mediaContext, {
            ttlHours: 12, // Media context valid for 12 hours
            compress: true,
            useS3ForLarge: true
        });
        
        console.log(`Media context stored for project: ${projectId}`);
        return result;
        
    } catch (error) {
        console.error('Error storing media context:', error);
        throw error;
    }
}

/**
 * Store assembly context from Video Assembler AI
 */
async function storeAssemblyContext(projectId, assemblyContext) {
    try {
        const contextId = `${projectId}-assembly`;
        
        const result = await storeContext(contextId, 'assembly', assemblyContext, {
            ttlHours: 6, // Assembly context valid for 6 hours
            compress: false, // Assembly context is usually small
            useS3ForLarge: false
        });
        
        console.log(`Assembly context stored for project: ${projectId}`);
        return result;
        
    } catch (error) {
        console.error('Error storing assembly context:', error);
        throw error;
    }
}

/**
 * Retrieve topic context for Script Generator AI
 */
async function getTopicContext(projectId) {
    try {
        const contextId = `${projectId}-topic`;
        const context = await getContext(contextId);
        
        console.log(`Topic context retrieved for project: ${projectId}`);
        return context.contextData;
        
    } catch (error) {
        console.error('Error retrieving topic context:', error);
        throw error;
    }
}

/**
 * Retrieve scene context for Media Curator AI
 */
async function getSceneContext(projectId) {
    try {
        const contextId = `${projectId}-scene`;
        const context = await getContext(contextId);
        
        console.log(`Scene context retrieved for project: ${projectId}`);
        return context.contextData;
        
    } catch (error) {
        console.error('Error retrieving scene context:', error);
        throw error;
    }
}

/**
 * Retrieve media context for Video Assembler AI
 */
async function getMediaContext(projectId) {
    try {
        const contextId = `${projectId}-media`;
        const context = await getContext(contextId);
        
        console.log(`Media context retrieved for project: ${projectId}`);
        return context.contextData;
        
    } catch (error) {
        console.error('Error retrieving media context:', error);
        throw error;
    }
}

/**
 * Retrieve assembly context for final processing
 */
async function getAssemblyContext(projectId) {
    try {
        const contextId = `${projectId}-assembly`;
        const context = await getContext(contextId);
        
        console.log(`Assembly context retrieved for project: ${projectId}`);
        return context.contextData;
        
    } catch (error) {
        console.error('Error retrieving assembly context:', error);
        throw error;
    }
}

/**
 * Update project summary with context information
 */
async function updateProjectSummary(projectId, stage, stageData) {
    try {
        const contextId = `${projectId}-summary`;
        
        // Try to get existing summary, create if doesn't exist
        let summaryData;
        try {
            const existingSummary = await getContext(contextId);
            summaryData = existingSummary.contextData;
        } catch (error) {
            // Create new summary if doesn't exist
            summaryData = {
                projectId,
                createdAt: new Date().toISOString(),
                stages: {}
            };
        }
        
        // Update the specific stage
        summaryData.stages[stage] = {
            ...stageData,
            completedAt: new Date().toISOString()
        };
        summaryData.lastUpdated = new Date().toISOString();
        
        // Store updated summary
        await storeContext(contextId, 'summary', summaryData, {
            ttlHours: 72, // Project summary valid for 72 hours
            compress: false,
            useS3ForLarge: false
        });
        
        console.log(`Project summary updated for ${projectId}, stage: ${stage}`);
        return summaryData;
        
    } catch (error) {
        console.error('Error updating project summary:', error);
        throw error;
    }
}

/**
 * Get complete project summary
 */
async function getProjectSummary(projectId) {
    try {
        const contextId = `${projectId}-summary`;
        const context = await getContext(contextId);
        
        console.log(`Project summary retrieved for project: ${projectId}`);
        return context.contextData;
        
    } catch (error) {
        console.error('Error retrieving project summary:', error);
        throw error;
    }
}

/**
 * Create a new project with initial context
 */
async function createProject(baseTopic, options = {}) {
    try {
        const projectId = `project-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        const initialSummary = {
            projectId,
            baseTopic,
            createdAt: new Date().toISOString(),
            status: 'initialized',
            options,
            stages: {}
        };
        
        await updateProjectSummary(projectId, 'initialization', {
            baseTopic,
            options,
            status: 'initialized'
        });
        
        console.log(`New project created: ${projectId}`);
        return {
            projectId,
            summary: initialSummary
        };
        
    } catch (error) {
        console.error('Error creating project:', error);
        throw error;
    }
}

/**
 * Enhanced context flow validation
 */
async function validateContextFlow(projectId) {
    try {
        const validation = {
            projectId,
            validatedAt: new Date().toISOString(),
            stages: {},
            isValid: true,
            errors: []
        };
        
        // Check each stage context
        const stages = ['topic', 'scene', 'media', 'assembly'];
        
        for (const stage of stages) {
            try {
                const contextId = `${projectId}-${stage}`;
                const context = await getContext(contextId);
                
                validation.stages[stage] = {
                    exists: true,
                    contextType: context.contextType,
                    size: context.metadata.size,
                    createdAt: context.metadata.createdAt,
                    compressed: context.metadata.compressed,
                    storedInS3: context.metadata.storedInS3
                };
                
            } catch (error) {
                validation.stages[stage] = {
                    exists: false,
                    error: error.message
                };
                
                if (!error.message.includes('not found')) {
                    validation.isValid = false;
                    validation.errors.push(`Error accessing ${stage} context: ${error.message}`);
                }
            }
        }
        
        // Check project summary
        try {
            const summary = await getProjectSummary(projectId);
            validation.summary = {
                exists: true,
                stages: Object.keys(summary.stages || {}),
                lastUpdated: summary.lastUpdated
            };
        } catch (error) {
            validation.summary = {
                exists: false,
                error: error.message
            };
        }
        
        console.log(`Context flow validation completed for project: ${projectId}`);
        return validation;
        
    } catch (error) {
        console.error('Error validating context flow:', error);
        throw error;
    }
}

module.exports = {
    storeTopicContext,
    storeSceneContext,
    storeMediaContext,
    storeAssemblyContext,
    getTopicContext,
    getSceneContext,
    getMediaContext,
    getAssemblyContext,
    updateProjectSummary,
    getProjectSummary,
    createProject,
    validateContextFlow
};