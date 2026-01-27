import { IsString, IsNotEmpty, MinLength } from 'class-validator';

/**
 * ResetPasswordDto - Request validation for password reset
 * 
 * SECURITY:
 * - Token from URL/body (never from user object)
 * - Password must be strong (8+ chars)
 * - No userId from client
 */
export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  token!: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  newPassword!: string;
}
