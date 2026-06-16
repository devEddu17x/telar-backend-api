import { registerAs } from '@nestjs/config';

export default registerAs('api', () => {
  const { API_PREFIX, API_PORT } = process.env;
  const missingVars = [
    ['API_PREFIX', API_PREFIX],
    ['API_PORT', API_PORT],
  ]
    .filter(
      ([, value]) => typeof value !== 'string' || value.trim().length === 0,
    )
    .map(([name]) => name);

  if (missingVars.length) {
    throw new Error(`Missing required API env vars: ${missingVars.join(', ')}`);
  }
  return {
    prefix: API_PREFIX || 'api/v1',
    port: parseInt(API_PORT, 10) || 3000,
  };
});
