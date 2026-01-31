import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .required(),

  PORT: Joi.number()
    .port()
    .default(3000),

  DATABASE_URL: Joi.string()
    .uri()
    .required(),

  JWT_ACCESS_SECRET: Joi.string()
    .min(32)
    .required(),

  JWT_REFRESH_SECRET: Joi.string()
    .min(32)
    .required(),

  // Razorpay - optional for development
  RAZORPAY_KEY_ID: Joi.string()
    .optional()
    .default(''),

  RAZORPAY_KEY_SECRET: Joi.string()
    .optional()
    .default(''),

  // AWS S3 - optional for development, required for production
  AWS_REGION: Joi.string()
    .when('NODE_ENV', {
      is: 'production',
      then: Joi.required(),
      otherwise: Joi.optional().default('ap-south-1'),
    }),

  AWS_S3_BUCKET: Joi.string()
    .when('NODE_ENV', {
      is: 'production',
      then: Joi.required(),
      otherwise: Joi.optional().default('robohatch-dev'),
    }),

  AWS_ACCESS_KEY_ID: Joi.string()
    .when('NODE_ENV', {
      is: 'production',
      then: Joi.required(),
      otherwise: Joi.optional().default('dev-key'),
    }),

  AWS_SECRET_ACCESS_KEY: Joi.string()
    .when('NODE_ENV', {
      is: 'production',
      then: Joi.required(),
      otherwise: Joi.optional().default('dev-secret'),
    }),
});

