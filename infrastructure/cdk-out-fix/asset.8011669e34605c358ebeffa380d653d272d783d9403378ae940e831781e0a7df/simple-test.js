/**
 * Simple test handler to isolate the 502 issue
 */

const handler = async (event, context) => {
    console.log('Simple test handler invoked');
    
    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
            success: true,
            message: 'Simple test working',
            timestamp: new Date().toISOString()
        })
    };
};

module.exports = { handler };