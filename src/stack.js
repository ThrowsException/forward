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

import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = new cdk.App();
const stack = new cdk.Stack(app, 'Stack');

const myfunc = new lambda.Function(stack, 'MyFunction', {
  runtime: lambda.Runtime.NODEJS_20_X,
  handler: 'handler.handler',
  code: lambda.Code.fromAsset(path.join(__dirname, 'lambdas')),
  architecture: '',
});

const bookStoreDefaultIntegration = new HttpLambdaIntegration(
  'EmailIntegration',
  myfunc,
);

const httpApi = new apigwv2.HttpApi(stack, 'LambdaApi');

httpApi.addRoutes({
  path: '/health',
  methods: [apigwv2.HttpMethod.GET],
  integration: bookStoreDefaultIntegration,
});

app.synth();
