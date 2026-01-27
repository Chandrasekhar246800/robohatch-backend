export class InitiatePaymentResponseDto {
  razorpayOrderId!: string;
  amount!: number; // Amount in paise
  currency!: string;
  key!: string; // Razorpay public key for frontend
}
