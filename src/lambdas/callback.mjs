// GET /delegated/callback
import { ConfidentialClientApplication, LogLevel } from '@azure/msal-node';
import graph from '@microsoft/microsoft-graph-client';

const notificationHost =
  'https://7ibw8e2eyl.execute-api.us-east-1.amazonaws.com';

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
      logLevel: LogLevel.Verbose,
    },
  },
};

const msalClient = new ConfidentialClientApplication(msalConfig);

/**
 * Gets a Graph client configured to use delegated auth
 * @param  {IConfidentialClientApplication} msalClient - The MSAL client used to retrieve user tokens
 * @param  {string} userAccountId - The user's account ID
 */
const getGraphClientForUser = (msalClient, userAccountId) => {
  if (!msalClient || !userAccountId) {
    throw new Error(
      `Invalid MSAL state. Client: ${
        msalClient ? 'present' : 'missing'
      }, User Account ID: ${userAccountId ? 'present' : 'missing'}`,
    );
  }

  // Initialize Graph client
  return graph.Client.init({
    // Implement an auth provider that gets a token
    // from the app's MSAL instance
    authProvider: async (done) => {
      try {
        // Get the user's account
        const account = await msalClient
          .getTokenCache()
          .getAccountByHomeId(userAccountId);

        if (account) {
          // Attempt to get the token silently
          // This method uses the token cache and
          // refreshes expired tokens as needed
          const response = await msalClient.acquireTokenSilent({
            scopes: ['https://graph.microsoft.com/.default'],
            redirectUri: `${notificationHost}/callback`,
            account: account,
          });
          console.log(response);

          // First param to callback is the error,
          // Set to null in success case
          done(null, response.accessToken);
        }
      } catch (err) {
        console.log(JSON.stringify(err, Object.getOwnPropertyNames(err)));
        done(err, null);
      }
    },
  });
};

export const handler = async (event, context) => {
  // Microsoft identity platform redirects the browser here with the
  // authorization result
  const tokenRequest = {
    code: event.queryStringParameters.code,
    scopes: ['https://graph.microsoft.com/.default'],
    redirectUri: `${notificationHost}/callback`,
  };

  const response = await msalClient.acquireTokenByCode(tokenRequest);
  // const userAccountId = response.account.homeAccountId;
  // const account = await msalClient
  //   .getTokenCache()
  //   .getAccountByHomeId(userAccountId);

  // const token = await msalClient.acquireTokenSilent({
  //   scopes: ['Mail.Read'],
  //   redirectUri: `${notificationHost}/callback`,
  //   account: account,
  //   forceRefresh: true,
  // });

  // console.log(account, token);

  const client = getGraphClientForUser(
    msalClient,
    response.account.homeAccountId,
  );

  // // Get the user's profile from Microsoft Graph
  const user = await client.api('/subscriptions').get();
  console.log(user);

  // Save the user's homeAccountId in their session
  // const userAccountId = response.account.homeAccountId;

  // const client = await getGraphClientForUser(
  //   msalClient,
  //   req.session.userAccountId,
  // );

  // Get the user's profile from Microsoft Graph
  // const user = await client.api('/me').select('displayName, mail').get();

  // Save user's name and email address in the session
  // req.session.user = {
  //   name: user.displayName,
  //   email: user.mail,
  // };

  // console.log(`Logged in as ${user.displayName}`);

  // If in production, use the current host to receive notifications
  // In development, must use an ngrok proxy

  // Create the subscription

  const subscription = await client.api('/subscriptions').create({
    changeType: 'created',
    notificationUrl: `${notificationHost}/listen`,
    // lifecycleNotificationUrl: `${notificationHost}/lifecycle`,
    resource: 'me/mailFolders/inbox/messages',
    // clientState: process.env.SUBSCRIPTION_CLIENT_STATE,
    includeResourceData: false,
    expirationDateTime: new Date(Date.now() + 3600000).toISOString(),
  });

  // // Save the subscription ID in the session
  // console.log(
  //   `Subscribed to user's inbox, subscription ID: ${subscription.id}`,
  // );
  // console.log(response.accessToken);
  // const sub = await fetch('https://graph.microsoft.com/v1.0/subscriptions', {
  //   method: 'POST',
  //   headers: {
  //     Authorization: `Bearer ${response.accessToken}`,
  //     'content-type': 'application/json',
  //   },
  //   body: JSON.stringify({
  //     changeType: 'created',
  //     notificationUrl: `${notificationHost}/listen`,
  //     // lifecycleNotificationUrl: `${notificationHost}/lifecycle`,
  //     resource: 'me/mailFolders/inbox/messages',
  //     // clientState: 'secretClientState',
  //     includeResourceData: false,
  //     expirationDateTime: new Date(Date.now() + 3600000).toISOString(),
  //   }),
  // });

  // const j = await sub.json();

  // Save the subscription ID in the session
  // req.session.subscriptionId = subscription.id;
  // console.log(JSON.stringify(j));
  // console.log(
  //   `Subscribed to user's inbox, subscription ID: ${subscription.id}`,
  // );

  // Add the subscription to the database
  // await dbHelper.addSubscription(subscription.id, req.session.userAccountId);

  // Redirect to subscription page
  // res.redirect('/watch');
  return { statusCode: 200, body: JSON.stringify({ user, subscription }) };
};
