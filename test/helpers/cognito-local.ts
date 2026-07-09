import {
  CognitoIdentityProviderClient,
  CreateGroupCommand,
  CreateUserPoolClientCommand,
  CreateUserPoolCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { ROLES } from 'src/common/enum/roles';

export function createTestCognitoClient(): CognitoIdentityProviderClient {
  return new CognitoIdentityProviderClient({
    region: process.env.AWS_COGNITO_REGION,
    endpoint: process.env.AWS_COGNITO_ENDPOINT,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });
}

export async function createTestUserPool(): Promise<{
  userPoolId: string;
  clientId: string;
}> {
  const client = createTestCognitoClient();
  const pool = await client.send(
    new CreateUserPoolCommand({
      PoolName: `telar-test-${Date.now()}`,
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

  const userPoolId = pool.UserPool!.Id!;

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
      ClientName: 'telar-test-client',
      UserPoolId: userPoolId,
      ExplicitAuthFlows: [
        'ALLOW_USER_PASSWORD_AUTH',
        'ALLOW_REFRESH_TOKEN_AUTH',
      ],
    }),
  );

  const clientId = poolClient.UserPoolClient!.ClientId!;

  process.env.AWS_COGNITO_USER_POOL_ID = userPoolId;
  process.env.AWS_COGNITO_CLIENT_ID = clientId;

  return { userPoolId, clientId };
}
