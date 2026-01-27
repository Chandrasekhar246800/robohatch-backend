import { IsEmail, IsNotEmpty } from 'class-validator';

/**
 * ForgotPasswordDto - Request validation for forgot password
 * 
 * SECURITY:
 * - Only email is required
 * - Response always succeeds (prevent email enumeration)
 * - No userId from client
 */
export class ForgotPasswordDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;
}
