import {
  CognitoIdentityProviderClient,
  CreateGroupCommand,
  CreateUserPoolClientCommand,
  CreateUserPoolCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { ROLES } from '../src/common/enum/roles';

const endpoint = process.env.AWS_COGNITO_ENDPOINT ?? 'http://localhost:9229';
const region = process.env.AWS_COGNITO_REGION ?? 'us-east-1';
const accessKeyId = 'local';
const secretAccessKey = 'local';
const internalAuthToken =
  process.env.AWS_COGNITO_INTERNAL_AUTH_TOKEN ?? 'test-internal-token';

const client = new CognitoIdentityProviderClient({
  region,
  endpoint,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

async function main() {
  const poolName = `telar-local-${Date.now()}`;
  const pool = await client.send(
    new CreateUserPoolCommand({
      PoolName: poolName,
      UsernameAttributes: ['email'],
      Schema: [
        {
          Name: 'tenant_id',
          AttributeDataType: 'String',
          Mutable: true,
          Required: false,
        },
      ],
    }),
  );

  const userPoolId = pool.UserPool?.Id;
  if (!userPoolId) {
    throw new Error('Cognito did not return a user pool id');
  }

  await Promise.all(
    Object.values(ROLES).map((role) =>
      client.send(
        new CreateGroupCommand({
          GroupName: role,
          UserPoolId: userPoolId,
        }),
      ),
    ),
  );

  const poolClient = await client.send(
    new CreateUserPoolClientCommand({
      ClientName: 'telar-local-client',
      UserPoolId: userPoolId,
      ExplicitAuthFlows: [
        'ALLOW_USER_PASSWORD_AUTH',
        'ALLOW_REFRESH_TOKEN_AUTH',
      ],
    }),
  );

  const clientId = poolClient.UserPoolClient?.ClientId;
  if (!clientId) {
    throw new Error('Cognito did not return a client id');
  }

  console.log('Copy these values into your .env.local:');
  console.log('');
  console.log(`AWS_COGNITO_ENDPOINT=${endpoint}`);
  console.log(`AWS_COGNITO_REGION=${region}`);
  console.log(`AWS_ACCESS_KEY_ID=${accessKeyId}`);
  console.log(`AWS_SECRET_ACCESS_KEY=${secretAccessKey}`);
  console.log(`AWS_COGNITO_USER_POOL_ID=${userPoolId}`);
  console.log(`AWS_COGNITO_CLIENT_ID=${clientId}`);
  console.log(`AWS_COGNITO_INTERNAL_AUTH_TOKEN=${internalAuthToken}`);
  console.log('');
  console.log('Created Cognito local resources:');
  console.log(`- Pool: ${poolName}`);
  console.log(`- Pool ID: ${userPoolId}`);
  console.log(`- Client ID: ${clientId}`);
}

main().catch((error) => {
  console.error('Failed to bootstrap local Cognito values');
  console.error(error);
  process.exitCode = 1;
});
