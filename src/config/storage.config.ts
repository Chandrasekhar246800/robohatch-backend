import { registerAs } from '@nestjs/config';

export default registerAs('storage', () => ({
  aws: {
    region: process.env.AWS_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    bucket: process.env.AWS_S3_BUCKET || '',
  },
  signedUrlExpiry: parseInt(process.env.SIGNED_URL_EXPIRY_SECONDS || '300', 10), // 5 minutes max
}));

