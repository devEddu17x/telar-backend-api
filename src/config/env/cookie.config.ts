import { registerAs } from '@nestjs/config';

export default registerAs('cookie', () => {
  const { COOKIE_DOMAIN, COOKIE_SAME_SITE, COOKIE_SECURE, NODE_ENV } =
    process.env;
  const missingVars = [
    ['COOKIE_SAME_SITE', COOKIE_SAME_SITE],
    ['COOKIE_SECURE', COOKIE_SECURE],
    ['NODE_ENV', NODE_ENV],
  ]
    .filter(
      ([, value]) => typeof value !== 'string' || value.trim().length === 0,
    )
    .map(([name]) => name);

  if (missingVars.length) {
    throw new Error(
      `Missing required Cookie env vars: ${missingVars.join(', ')}`,
    );
  }

  return {
    cookieSameSite: COOKIE_SAME_SITE,
    cookieSecure: COOKIE_SECURE === 'true',
    antiCsrf: NODE_ENV === 'local' ? 'NONE' : 'VIA_TOKEN',
    ...(COOKIE_DOMAIN ? { cookieDomain: COOKIE_DOMAIN } : {}),
  };
});
