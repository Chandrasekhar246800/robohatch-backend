import { registerAs } from '@nestjs/config';

export default registerAs('razorpay', () => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

  // Warn if missing in production, but don't crash the app
  // This allows deployment to succeed even if Razorpay is not configured yet
  if (process.env.NODE_ENV === 'production') {
    if (!keyId || !keySecret || !webhookSecret) {
      console.warn('⚠️  WARNING: Razorpay credentials not configured. Payment features will be unavailable.');
      console.warn('⚠️  Set RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, and RAZORPAY_WEBHOOK_SECRET to enable payments.');
    }
  }

  return {
    keyId: keyId || '',
    keySecret: keySecret || '',
    webhookSecret: webhookSecret || '',
  };
});
