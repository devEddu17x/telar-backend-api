import { registerAs } from '@nestjs/config';

export default registerAs('api', () => {
  const { API_PREFIX } = process.env;
  const missingVars = [['API_PREFIX', API_PREFIX]]
    .filter(
      ([, value]) => typeof value !== 'string' || value.trim().length === 0,
    )
    .map(([name]) => name);

  if (missingVars.length) {
    throw new Error(`Missing required API env vars: ${missingVars.join(', ')}`);
  }
  return {
    prefix: API_PREFIX || 'api/v1',
  };
});
