import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
  Res,
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
import { Request, Response } from 'express';

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
  @Throttle({ auth: { limit: 5, ttl: 60000 } })
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() registerDto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.register(registerDto);
    
    const isProduction = process.env.NODE_ENV === 'production';
    
    res.cookie('access_token', result.accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000,
      path: '/',
    });
    
    res.cookie('refresh_token', result.refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });
    
    return { user: result.user };
  }

  @Public()
  @Throttle({ auth: { limit: 5, ttl: 60000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Ip() ip: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(loginDto, ip);
    
    const isProduction = process.env.NODE_ENV === 'production';
    
    res.cookie('access_token', result.accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000,
      path: '/',
    });
    
    res.cookie('refresh_token', result.refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });
    
    return { user: result.user };
  }

  @Public()
  @Throttle({ auth: { limit: 5, ttl: 60000 } })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Ip() ip: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.refresh_token;

    if (!refreshToken) {
      res.clearCookie('access_token', { path: '/' });
      res.clearCookie('refresh_token', { path: '/' });
      throw new UnauthorizedException('Refresh token is required');
    }

    try {
      const result = await this.authService.refreshTokens(refreshToken, ip);
      
      const isProduction = process.env.NODE_ENV === 'production';
      
      res.cookie('access_token', result.accessToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        maxAge: 15 * 60 * 1000,
        path: '/',
      });
      
      res.cookie('refresh_token', result.refreshToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/',
      });
      
      return { user: result.user };
    } catch (error) {
      res.clearCookie('access_token', { path: '/' });
      res.clearCookie('refresh_token', { path: '/' });
      throw error;
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() req: RequestWithUser,
    @Ip() ip: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logout(req.user.userId, ip);
    
    res.clearCookie('access_token', { path: '/' });
    res.clearCookie('refresh_token', { path: '/' });
    
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
  @Throttle({ auth: { limit: 5, ttl: 60000 } })
  @Post('google')
  @HttpCode(HttpStatus.OK)
  async loginWithGoogle(
    @Body() dto: OAuthLoginDto,
    @Ip() ip: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.loginWithGoogle(dto.idToken, ip);
    
    const isProduction = process.env.NODE_ENV === 'production';
    
    res.cookie('access_token', result.accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000,
      path: '/',
    });
    
    res.cookie('refresh_token', result.refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });
    
    return { user: result.user };
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
  @Throttle({ auth: { limit: 5, ttl: 60000 } })
  @Post('microsoft')
  @HttpCode(HttpStatus.OK)
  async loginWithMicrosoft(
    @Body() dto: OAuthLoginDto,
    @Ip() ip: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.loginWithMicrosoft(dto.idToken, ip);
    
    const isProduction = process.env.NODE_ENV === 'production';
    
    res.cookie('access_token', result.accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000,
      path: '/',
    });
    
    res.cookie('refresh_token', result.refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });
    
    return { user: result.user };
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
  @Throttle({ auth: { limit: 5, ttl: 60000 } })
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
  @Throttle({ auth: { limit: 5, ttl: 60000 } })
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto, @Ip() ip: string) {
    await this.authService.resetPassword(dto.token, dto.newPassword, ip);
    return {
      message: 'Password reset successfully. You can now login with your new password.',
    };
  }
}

