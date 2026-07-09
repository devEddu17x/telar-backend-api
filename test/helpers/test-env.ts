process.env.NODE_ENV = 'test';
process.env.API_PREFIX = 'api/v1';
process.env.API_PORT = '0';

process.env.DB_HOST = process.env.DB_HOST ?? 'localhost';
process.env.DB_PORT = process.env.DB_PORT ?? '5433';
process.env.DB_USERNAME = process.env.DB_USERNAME ?? 'test_user';
process.env.DB_PASSWORD = process.env.DB_PASSWORD ?? 'test_password';
process.env.DB_NAME = process.env.DB_NAME ?? 'telar_test';
process.env.DB_SSL = process.env.DB_SSL ?? 'false';

process.env.STORAGE_BUCKET_NAME =
  process.env.STORAGE_BUCKET_NAME ?? 'telar-test-assets';
process.env.STORAGE_REGION = process.env.STORAGE_REGION ?? 'us-east-1';
process.env.STORAGE_ENDPOINT =
  process.env.STORAGE_ENDPOINT ?? 'http://localhost:9090';
process.env.STORAGE_PUBLIC_URL =
  process.env.STORAGE_PUBLIC_URL ?? 'http://localhost:9090';
process.env.STORAGE_ACCESS_KEY_ID =
  process.env.STORAGE_ACCESS_KEY_ID ?? 'test-access-key';
process.env.STORAGE_SECRET_ACCESS_KEY =
  process.env.STORAGE_SECRET_ACCESS_KEY ?? 'test-secret-key';

process.env.AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID ?? 'local';
process.env.AWS_SECRET_ACCESS_KEY =
  process.env.AWS_SECRET_ACCESS_KEY ?? 'local';
process.env.AWS_COGNITO_REGION = process.env.AWS_COGNITO_REGION ?? 'us-east-1';
process.env.AWS_COGNITO_ENDPOINT =
  process.env.AWS_COGNITO_ENDPOINT ?? 'http://localhost:9229';
process.env.AWS_COGNITO_USER_POOL_ID =
  process.env.AWS_COGNITO_USER_POOL_ID ?? 'local_pool';
process.env.AWS_COGNITO_CLIENT_ID =
  process.env.AWS_COGNITO_CLIENT_ID ?? 'local_client';
process.env.AWS_COGNITO_INTERNAL_AUTH_TOKEN =
  process.env.AWS_COGNITO_INTERNAL_AUTH_TOKEN ?? 'test-internal-token';

jest.mock('jwks-rsa', () => ({
  passportJwtSecret: jest.fn(() => 'test-secret-provider'),
}));
