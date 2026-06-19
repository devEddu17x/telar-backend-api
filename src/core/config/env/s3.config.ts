import { registerAs } from '@nestjs/config';

export default registerAs('s3', () => {
  const {
    IMAGES_BUCKET_NAME,
    IMAGES_BUCKET_REGION,
    IMAGES_BUCKET_REGIONAL_DOMAIN_NAME,
    IMAGES_AWS_ACCESS_KEY_ID,
    IMAGES_AWS_SECRET_ACCESS_KEY,
  } = process.env;

  const missingVars = [
    ['IMAGES_BUCKET_NAME', IMAGES_BUCKET_NAME],
    ['IMAGES_BUCKET_REGION', IMAGES_BUCKET_REGION],
    ['IMAGES_BUCKET_REGIONAL_DOMAIN_NAME', IMAGES_BUCKET_REGIONAL_DOMAIN_NAME],
  ]
    .filter(
      ([, value]) => typeof value !== 'string' || value.trim().length === 0,
    )
    .map(([name]) => name);

  if (missingVars.length) {
    throw new Error(`Missing required S3 env vars: ${missingVars.join(', ')}`);
  }

  const credentials =
    IMAGES_AWS_ACCESS_KEY_ID && IMAGES_AWS_SECRET_ACCESS_KEY
      ? {
          accessKeyId: IMAGES_AWS_ACCESS_KEY_ID,
          secretAccessKey: IMAGES_AWS_SECRET_ACCESS_KEY,
        }
      : undefined;

  return {
    config: {
      region: IMAGES_BUCKET_REGION,
      ...(credentials && { credentials }),
    },
    bucket: IMAGES_BUCKET_NAME,
    baseUrlImages: `https://${IMAGES_BUCKET_REGIONAL_DOMAIN_NAME}`,
  };
});
