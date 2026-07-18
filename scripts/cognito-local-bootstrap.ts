import {
  CognitoIdentityProviderClient,
  CreateGroupCommand,
  CreateUserPoolClientCommand,
  CreateUserPoolCommand,
  ListGroupsCommand,
  ListUserPoolClientsCommand,
  ListUserPoolsCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { ROLES } from '../src/common/enum/roles';

const config = {
  endpoint:
    process.env.COGNITO_BOOTSTRAP_ENDPOINT ??
    process.env.AWS_COGNITO_ENDPOINT ??
    'http://localhost:9229',
  localEndpoint:
    process.env.LOCAL_COGNITO_ENDPOINT ??
    process.env.AWS_COGNITO_ENDPOINT ??
    'http://localhost:9229',
  region: process.env.AWS_COGNITO_REGION ?? 'us-east-1',
  poolName: process.env.COGNITO_LOCAL_POOL_NAME ?? 'telar-local',
  clientName: process.env.COGNITO_LOCAL_CLIENT_NAME ?? 'telar-local-client',
  envFile: process.env.LOCAL_ENV_FILE ?? '.env.local.docker',
  internalAuthToken:
    process.env.AWS_COGNITO_INTERNAL_AUTH_TOKEN ?? 'test-internal-token',
};

const client = new CognitoIdentityProviderClient({
  region: config.region,
  endpoint: config.endpoint,
  credentials: { accessKeyId: 'local', secretAccessKey: 'local' },
});

async function main() {
  const userPoolId = await ensureUserPool();
  await ensureGroups(userPoolId);
  const clientId = await ensureUserPoolClient(userPoolId);
  await writeLocalEnv(userPoolId, clientId);

  console.log(`Local Cognito resources are ready in ${config.envFile}`);
}

async function ensureUserPool(): Promise<string> {
  const { UserPools = [] } = await client.send(
    new ListUserPoolsCommand({ MaxResults: 60 }),
  );
  const userPool = UserPools.find((pool) => pool.Name === config.poolName);

  if (userPool?.Id) return userPool.Id;

  const response = await client.send(
    new CreateUserPoolCommand({
      PoolName: config.poolName,
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

  return required(
    response.UserPool?.Id,
    'Cognito did not return a user pool id',
  );
}

async function ensureGroups(userPoolId: string): Promise<void> {
  const { Groups = [] } = await client.send(
    new ListGroupsCommand({ UserPoolId: userPoolId }),
  );
  const groupNames = new Set(Groups.map((group) => group.GroupName));

  await Promise.all(
    Object.values(ROLES)
      .filter((role) => !groupNames.has(role))
      .map((role) =>
        client.send(
          new CreateGroupCommand({ GroupName: role, UserPoolId: userPoolId }),
        ),
      ),
  );
}

async function ensureUserPoolClient(userPoolId: string): Promise<string> {
  const { UserPoolClients = [] } = await client.send(
    new ListUserPoolClientsCommand({ UserPoolId: userPoolId, MaxResults: 60 }),
  );
  const userPoolClient = UserPoolClients.find(
    (poolClient) => poolClient.ClientName === config.clientName,
  );

  if (userPoolClient?.ClientId) return userPoolClient.ClientId;

  const response = await client.send(
    new CreateUserPoolClientCommand({
      ClientName: config.clientName,
      UserPoolId: userPoolId,
      ExplicitAuthFlows: [
        'ALLOW_USER_PASSWORD_AUTH',
        'ALLOW_REFRESH_TOKEN_AUTH',
      ],
    }),
  );

  return required(
    response.UserPoolClient?.ClientId,
    'Cognito did not return a client id',
  );
}

async function writeLocalEnv(userPoolId: string, clientId: string) {
  const values = {
    NODE_ENV: 'local',
    API_PREFIX: 'api/v1',
    API_PORT: '5000',
    DB_HOST: 'localhost',
    DB_PORT: '5433',
    DB_USERNAME: 'telar_app_user',
    DB_PASSWORD: 'telar_app_password',
    DB_NAME: 'telar_local',
    DB_SSL: 'false',
    STORAGE_BUCKET_NAME: 'telar-local-assets',
    STORAGE_REGION: 'us-east-1',
    STORAGE_ENDPOINT: 'http://localhost:9090',
    STORAGE_PUBLIC_URL: 'http://localhost:9090/telar-local-assets',
    STORAGE_ACCESS_KEY_ID: 'local',
    STORAGE_SECRET_ACCESS_KEY: 'local',
    AWS_COGNITO_ENDPOINT: config.localEndpoint,
    AWS_COGNITO_REGION: config.region,
    AWS_ACCESS_KEY_ID: 'local',
    AWS_SECRET_ACCESS_KEY: 'local',
    AWS_COGNITO_USER_POOL_ID: userPoolId,
    AWS_COGNITO_CLIENT_ID: clientId,
    AWS_COGNITO_INTERNAL_AUTH_TOKEN: config.internalAuthToken,
    LOG_FORMAT: 'pretty',
    LOG_LEVEL: 'info',
  };

  const content = `${Object.entries(values)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n')}\n`;

  await writeFile(resolve(config.envFile), content);
}

function required<T>(value: T | undefined, message: string): T {
  if (!value) throw new Error(message);
  return value;
}

main().catch((error) => {
  console.error('Failed to bootstrap local Cognito values');
  console.error(error);
  process.exitCode = 1;
});
