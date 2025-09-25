import { ConfidentialClientApplication, LogLevel } from '@azure/msal-node';

// MSAL config
const msalConfig = {
  auth: {
    clientId: '9e556ddc-fd02-427e-a268-2bde7564f03b',
    authority: `https://login.microsoftonline.com/b91098dd-a998-44c7-80fc-e70c0a9672ed`,
    clientSecret: process.env.CLIENT_SECRET,
  },
  system: {
    loggerOptions: {
      loggerCallback(logLevel, message, containsPii) {
        console.log(message);
      },
      piiLoggingEnabled: false,
      logLevel: LogLevel.Error,
    },
  },
};

// Create msal application object
const msalClient = new ConfidentialClientApplication(msalConfig);

export const handler = async (event, context) => {
  const urlParameters = {
    scopes: ['Mail.Read', 'Mail.ReadWrite', 'Mail.Send', 'email'], //process.env.OAUTH_SCOPES.split(','),
    redirectUri:
      'https://7ibw8e2eyl.execute-api.us-east-1.amazonaws.com/callback',
    prompt: 'select_account',
  };
  const authUrl = await msalClient.getAuthCodeUrl(urlParameters);
  return { statusCode: 200, body: JSON.stringify({ authUrl }) };
};
