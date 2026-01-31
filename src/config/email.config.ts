import { registerAs } from '@nestjs/config';

export default registerAs('email', () => ({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT || '587', 10),
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
  from: {
    name: process.env.EMAIL_FROM_NAME || 'RoboHatch',
    address: process.env.EMAIL_FROM_ADDRESS || 'noreply@robohatch.com',
  },
  adminEmail: process.env.ADMIN_EMAIL,
}));

