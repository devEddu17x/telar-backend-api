import { registerAs } from '@nestjs/config';

export default registerAs('storage', () => {
  const {
    STORAGE_BUCKET_NAME,
    STORAGE_REGION,
    STORAGE_ENDPOINT,
    STORAGE_PUBLIC_URL,
    STORAGE_ACCESS_KEY_ID,
    STORAGE_SECRET_ACCESS_KEY,
  } = process.env;

  const bucket = STORAGE_BUCKET_NAME;
  const region = STORAGE_REGION;
  const endpoint = normalizeEndpoint(STORAGE_ENDPOINT, bucket);
  const publicUrl = normalizePublicBaseUrl(STORAGE_PUBLIC_URL);

  const missingVars = [
    ['STORAGE_BUCKET_NAME', bucket],
    ['STORAGE_REGION', region],
    ['STORAGE_PUBLIC_URL', publicUrl],
  ]
    .filter(
      ([, value]) => typeof value !== 'string' || value.trim().length === 0,
    )
    .map(([name]) => name);

  if (missingVars.length) {
    throw new Error(`Missing required S3 env vars: ${missingVars.join(', ')}`);
  }

  const credentials =
    STORAGE_ACCESS_KEY_ID && STORAGE_SECRET_ACCESS_KEY
      ? {
          accessKeyId: STORAGE_ACCESS_KEY_ID,
          secretAccessKey: STORAGE_SECRET_ACCESS_KEY,
        }
      : undefined;

  return {
    config: {
      region,
      ...(endpoint && { endpoint, forcePathStyle: true }),
      ...(credentials && { credentials }),
    },
    bucket,
    publicUrl,
  };
});

function normalizeEndpoint(endpoint: string | undefined, bucket?: string) {
  if (!endpoint) return undefined;

  const normalizedEndpoint = endpoint.trim().replace(/\/+$/, '');
  if (!bucket) return normalizedEndpoint;

  const bucketPath = `/${bucket}`;
  if (normalizedEndpoint.endsWith(bucketPath)) {
    return normalizedEndpoint.slice(0, -bucketPath.length);
  }

  return normalizedEndpoint;
}

function normalizePublicBaseUrl(url: string | undefined) {
  return url?.trim().replace(/\/+$/, '');
}
