import { registerAs } from '@nestjs/config';

export default registerAs('razorpay', () => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

  // Fail app startup if missing in production
  if (process.env.NODE_ENV === 'production') {
    if (!keyId || !keySecret || !webhookSecret) {
      throw new Error(
        'RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, and RAZORPAY_WEBHOOK_SECRET must be defined in production',
      );
    }
  }

  return {
    keyId,
    keySecret,
    webhookSecret,
  };
});
