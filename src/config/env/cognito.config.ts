import { registerAs } from '@nestjs/config';

export default registerAs('cognito', () => {
  const {
    AWS_COGNITO_USER_POOL_ID,
    AWS_COGNITO_REGION,
    AWS_COGNITO_CLIENT_ID,
    AWS_COGNITO_INTERNAL_AUTH_TOKEN,
  } = process.env;

  const missingVars = [
    ['AWS_COGNITO_USER_POOL_ID', AWS_COGNITO_USER_POOL_ID],
    ['AWS_COGNITO_REGION', AWS_COGNITO_REGION],
    ['AWS_COGNITO_CLIENT_ID', AWS_COGNITO_CLIENT_ID],
    ['AWS_COGNITO_INTERNAL_AUTH_TOKEN', AWS_COGNITO_INTERNAL_AUTH_TOKEN],
  ]
    .filter(
      ([, value]) => typeof value !== 'string' || value.trim().length === 0,
    )
    .map(([name]) => name);

  if (missingVars.length) {
    throw new Error(
      `Missing required Cognito env vars: ${missingVars.join(', ')}`,
    );
  }

  return {
    userPoolId: AWS_COGNITO_USER_POOL_ID,
    region: AWS_COGNITO_REGION,
    clientId: AWS_COGNITO_CLIENT_ID,
    internalAuthToken: AWS_COGNITO_INTERNAL_AUTH_TOKEN,
  };
});
