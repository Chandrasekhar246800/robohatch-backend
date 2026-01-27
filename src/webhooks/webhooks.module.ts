import { Module } from '@nestjs/common';
import { RazorpayWebhookController } from './razorpay-webhook.controller';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [PaymentsModule],
  controllers: [RazorpayWebhookController],
})
export class WebhooksModule {}
