export const handler = async (event, context) => {
  console.log(event);
  if (event?.queryStringParameters?.validationToken) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/plain' },
      body: event.queryStringParameters.validationToken,
    };
  }
  console.log(event);
  return { statusCode: 200, body: JSON.stringify({ hello: 'world' }) };
};
