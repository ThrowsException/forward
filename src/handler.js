export const handler = async (event, context) => {
    console.log('Event:', JSON.stringify(event, null, 2));
    
    try {
        const { httpMethod, path, queryStringParameters, body } = event;
        
        // Simple routing based on HTTP method and path
        if (httpMethod === 'GET' && path === '/') {
            return {
                statusCode: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    message: 'Hello from AWS Lambda!',
                    timestamp: new Date().toISOString(),
                    requestId: context.awsRequestId
                })
            };
        }
        
        if (httpMethod === 'GET' && path === '/health') {
            return {
                statusCode: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    status: 'healthy',
                    timestamp: new Date().toISOString()
                })
            };
        }
        
        if (httpMethod === 'POST' && path === '/echo') {
            const requestBody = body ? JSON.parse(body) : {};
            return {
                statusCode: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    message: 'Echo response',
                    receivedData: requestBody,
                    timestamp: new Date().toISOString()
                })
            };
        }
        
        // Default response for unmatched routes
        return {
            statusCode: 404,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                error: 'Route not found',
                path: path,
                method: httpMethod
            })
        };
        
    } catch (error) {
        console.error('Error:', error);
        
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                error: 'Internal server error',
                message: error.message
            })
        };
    }
};