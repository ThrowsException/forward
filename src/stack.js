import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as path from 'node:path';
import {
  AccessLogFormat,
  AwsIntegration,
  LambdaIntegration,
  LambdaRestApi,
  LogGroupLogDestination,
  MethodLoggingLevel,
} from 'aws-cdk-lib/aws-apigateway';
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2';
import {
  HttpUrlIntegration,
  HttpLambdaIntegration,
} from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';

import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = new cdk.App();
const stack = new cdk.Stack(app, 'Stack');

// const myfunc = new NodejsFunction(stack, 'MyFunction', {
//   runtime: lambda.Runtime.NODEJS_20_X,
//   handler: 'handler.handler',
//   code: lambda.Code.fromAsset(path.join(__dirname, 'lambdas')),
// });

const myfunc = new NodejsFunction(stack, 'MyFunction', {
  runtime: lambda.Runtime.NODEJS_20_X,
  handler: 'handler',
  entry: path.join(__dirname, 'lambdas/handler.mjs'),
});

const callback = new NodejsFunction(stack, 'Callback', {
  runtime: lambda.Runtime.NODEJS_20_X,
  handler: 'handler',
  entry: path.join(__dirname, 'lambdas/callback.mjs'),
  timeout: cdk.Duration.seconds(30),
});

const listen = new NodejsFunction(stack, 'Listen', {
  runtime: lambda.Runtime.NODEJS_20_X,
  handler: 'handler',
  entry: path.join(__dirname, 'lambdas/listen.mjs'),
  timeout: cdk.Duration.seconds(30),
});

const bookStoreDefaultIntegration = new HttpLambdaIntegration(
  'EmailIntegration',
  myfunc,
);

const callbackIntegration = new HttpLambdaIntegration(
  'CallbackIntegration',
  callback,
);

const listenIntegration = new HttpLambdaIntegration(
  'ListenIntegration',
  listen,
);

const httpApi = new apigwv2.HttpApi(stack, 'LambdaApi');

httpApi.addRoutes({
  path: '/health',
  methods: [apigwv2.HttpMethod.GET],
  integration: bookStoreDefaultIntegration,
});

httpApi.addRoutes({
  path: '/callback',
  methods: [apigwv2.HttpMethod.GET],
  integration: callbackIntegration,
});

httpApi.addRoutes({
  path: '/listen',
  methods: [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.POST],
  integration: listenIntegration,
});

app.synth();
