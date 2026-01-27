import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
  UnauthorizedException,
  Ip,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { OAuthLoginDto } from './dto/oauth-login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Public } from './decorators/public.decorator';
import { Request } from 'express';

interface RequestWithUser extends Request {
  user: {
    userId: string;
    email: string;
    role: string;
  };
}

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // Phase 13: 5 requests/minute
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // Phase 13: 5 requests/minute
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto, @Ip() ip: string) {
    return this.authService.login(loginDto, ip);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // Phase 13: 5 requests/minute
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: Request, @Ip() ip: string) {
    // Extract refresh token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Refresh token missing or invalid format');
    }

    const refreshToken = authHeader.replace('Bearer ', '');

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }

    return this.authService.refreshTokens(refreshToken, ip);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: RequestWithUser, @Ip() ip: string) {
    await this.authService.logout(req.user.userId, ip);
    return { message: 'Logged out successfully' };
  }

  /**
   * Google OAuth Login - Phase 14
   * 
   * POST /api/v1/auth/google
   * Body: { idToken: "google_id_token" }
   * 
   * SECURITY:
   * - Backend verifies token with Google
   * - All OAuth users are CUSTOMER role
   * - No role injection from client
   */
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('google')
  @HttpCode(HttpStatus.OK)
  async loginWithGoogle(@Body() dto: OAuthLoginDto, @Ip() ip: string) {
    return this.authService.loginWithGoogle(dto.idToken, ip);
  }

  /**
   * Microsoft OAuth Login - Phase 14
   * 
   * POST /api/v1/auth/microsoft
   * Body: { idToken: "microsoft_id_token" }
   * 
   * SECURITY:
   * - Backend verifies token with Microsoft
   * - All OAuth users are CUSTOMER role
   * - No role injection from client
   */
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('microsoft')
  @HttpCode(HttpStatus.OK)
  async loginWithMicrosoft(@Body() dto: OAuthLoginDto, @Ip() ip: string) {
    return this.authService.loginWithMicrosoft(dto.idToken, ip);
  }

  /**
   * Forgot Password - Phase 15
   * 
   * POST /api/v1/auth/forgot-password
   * Body: { email: "user@example.com" }
   * 
   * SECURITY:
   * - Always returns success (prevent email enumeration)
   * - Only sends email if user exists AND provider = LOCAL
   * - Generates secure random token (32 bytes)
   * - Hashes token before storing (bcrypt)
   * - Token expires in 15 minutes
   * - Rate limited: 3 requests/minute
   */
  @Public()
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto, @Ip() ip: string) {
    await this.authService.forgotPassword(dto.email, ip);
    return {
      message: 'If your email is registered, you will receive a password reset link shortly.',
    };
  }

  /**
   * Reset Password - Phase 15
   * 
   * POST /api/v1/auth/reset-password
   * Body: { token: "reset_token", newPassword: "NewPass@123" }
   * 
   * SECURITY:
   * - Token must be valid, not expired, not used
   * - Token hash verified with bcrypt
   * - Rejects OAuth users (GOOGLE/MICROSOFT)
   * - Invalidates all refresh tokens
   * - Marks token as used
   * - Rate limited: 5 requests/minute
   */
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto, @Ip() ip: string) {
    await this.authService.resetPassword(dto.token, dto.newPassword, ip);
    return {
      message: 'Password reset successfully. You can now login with your new password.',
    };
  }
}
