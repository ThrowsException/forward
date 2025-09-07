export const handler = async (event, context) => {
  console.log('Event:', JSON.stringify(event, null, 2));

  const { httpMethod, path, queryStringParameters, body } = event;

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify({
      message: 'Hello from AWS Lambda!',
      timestamp: new Date().toISOString(),
      requestId: context.awsRequestId,
    }),
  };
};
