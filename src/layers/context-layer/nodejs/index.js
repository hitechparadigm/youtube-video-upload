// Main layer index - exports all utilities
module.exports = {
    ...require('./context-manager'),
    ...require('./aws-service-manager'),
    ...require('./error-handler')
};