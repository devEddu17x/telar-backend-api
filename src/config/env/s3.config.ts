import { registerAs } from '@nestjs/config';

export default registerAs('s3', () => {
  const {
    IMAGES_BUCKET_NAME,
    IMAGES_BUCKET_REGION,
    IMAGES_BUCKET_REGIONAL_DOMAIN_NAME,
    AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY,
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
    AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY
      ? {
          accessKeyId: AWS_ACCESS_KEY_ID,
          secretAccessKey: AWS_SECRET_ACCESS_KEY,
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
