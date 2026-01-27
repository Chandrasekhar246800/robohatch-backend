import { Injectable, UnauthorizedException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Role } from '@prisma/client';
import { AuditLogService } from '../platform/audit-log.service';
import { GoogleOAuthService, GoogleTokenPayload } from './oauth/google-oauth.service';
import { MicrosoftOAuthService, MicrosoftTokenPayload } from './oauth/microsoft-oauth.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    role: Role;
    fullName?: string;
  };
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private auditLogService: AuditLogService,
    private googleOAuthService: GoogleOAuthService,
    private microsoftOAuthService: MicrosoftOAuthService,
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponse> {
    // Only CUSTOMER role allowed for public registration
    // Accept either 'name' or 'fullName' from frontend
    const fullName = registerDto.fullName || registerDto.name;
    
    const user = await this.usersService.createUser(
      registerDto.email,
      registerDto.password,
      Role.CUSTOMER,
      fullName,
    );

    // Generate tokens
    const tokens = await this.generateTokens(user.id, user.email, user.role);

    // Store refresh token
    await this.usersService.updateRefreshToken(user.id, tokens.refreshToken);

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        fullName: user.profile?.fullName ?? undefined,
      },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async login(loginDto: LoginDto, ip: string): Promise<AuthResponse> {
    // Find user by email
    const user = await this.usersService.findByEmail(loginDto.email);

    if (!user) {
      // Phase 13: Log failed login attempt
      await this.auditLogService.logLoginFailure(
        loginDto.email,
        ip,
        'User not found',
      );
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user is OAuth-only (no password)
    if (!user.password) {
      await this.auditLogService.logLoginFailure(
        loginDto.email,
        ip,
        'OAuth user tried password login',
      );
      throw new UnauthorizedException(
        'This account uses social login. Please login with Google or Microsoft.',
      );
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);

    if (!isPasswordValid) {
      // Phase 13: Log failed login attempt
      await this.auditLogService.logLoginFailure(
        loginDto.email,
        ip,
        'Invalid password',
      );
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate new tokens
    const tokens = await this.generateTokens(user.id, user.email, user.role);

    // Update refresh token in database
    await this.usersService.updateRefreshToken(user.id, tokens.refreshToken);

    // Phase 13: Log successful login
    await this.auditLogService.logLoginSuccess(user.id, user.email, ip);

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async refreshTokens(refreshToken: string, ip: string): Promise<AuthResponse> {
    // Decode refresh token to extract userId (verify signature)
    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
      });
    } catch (error) {
      throw new ForbiddenException('Invalid or expired refresh token');
    }

    const userId = payload.sub;

    // Validate refresh token against stored hash
    const isValid = await this.usersService.validateRefreshToken(userId, refreshToken);

    if (!isValid) {
      throw new ForbiddenException('Invalid refresh token');
    }

    // Get user details
    const user = await this.usersService.findById(userId);

    // Generate new tokens (rotate refresh token)
    const tokens = await this.generateTokens(user.id, user.email, user.role);

    // Update refresh token in database
    await this.usersService.updateRefreshToken(user.id, tokens.refreshToken);

    // Phase 13: Log refresh token usage
    await this.auditLogService.logRefreshToken(user.id, ip);

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async logout(userId: string, ip: string): Promise<void> {
    // Clear refresh token from database
    await this.usersService.updateRefreshToken(userId, null);

    // Phase 13: Log logout
    await this.auditLogService.logLogout(userId, ip);
  }

  private async generateTokens(
    userId: string,
    email: string,
    role: Role,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const payload: JwtPayload = {
      sub: userId,
      email,
      role,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('jwt.accessSecret'),
        expiresIn: this.configService.get<string>('jwt.accessExpiration'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
        expiresIn: this.configService.get<string>('jwt.refreshExpiration'),
      }),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }

  /**
   * Google OAuth Login - Phase 14
   * 
   * FLOW:
   * 1. Verify ID token with Google
   * 2. Find or create user
   * 3. Link existing email users to Google
   * 4. Generate JWT + refresh tokens
   * 
   * SECURITY:
   * - All OAuth users are CUSTOMER role
   * - No role injection from client
   * - Backend verifies token
   */
  async loginWithGoogle(idToken: string, ip: string): Promise<AuthResponse> {
    // Step 1: Verify token with Google
    const googleUser = await this.googleOAuthService.verifyIdToken(idToken);

    // Step 2: Find or create user (with profile relation)
    const user = await this.usersService.findOrCreateOAuthUser({
      email: googleUser.email,
      provider: 'GOOGLE',
      providerId: googleUser.sub,
      fullName: googleUser.name,
    });

    // Step 3: Generate JWT tokens
    const tokens = await this.generateTokens(user.id, user.email, user.role);

    // Step 4: Store refresh token
    await this.usersService.updateRefreshToken(user.id, tokens.refreshToken);

    // Step 5: Log successful login
    await this.auditLogService.logLoginSuccess(user.id, user.email, ip);

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        fullName: user.profile?.fullName ?? undefined,
      },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  /**
   * Microsoft OAuth Login - Phase 14
   * 
   * FLOW:
   * 1. Verify ID token with Microsoft
   * 2. Find or create user
   * 3. Link existing email users to Microsoft
   * 4. Generate JWT + refresh tokens
   * 
   * SECURITY:
   * - All OAuth users are CUSTOMER role
   * - No role injection from client
   * - Backend verifies token
   */
  async loginWithMicrosoft(idToken: string, ip: string): Promise<AuthResponse> {
    // Step 1: Verify token with Microsoft
    const microsoftUser = await this.microsoftOAuthService.verifyIdToken(idToken);

    // Step 2: Find or create user (with profile relation)
    const user = await this.usersService.findOrCreateOAuthUser({
      email: microsoftUser.email,
      provider: 'MICROSOFT',
      providerId: microsoftUser.sub,
      fullName: microsoftUser.name,
    });

    // Step 3: Generate JWT tokens
    const tokens = await this.generateTokens(user.id, user.email, user.role);

    // Step 4: Store refresh token
    await this.usersService.updateRefreshToken(user.id, tokens.refreshToken);

    // Step 5: Log successful login
    await this.auditLogService.logLoginSuccess(user.id, user.email, ip);

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        fullName: user.profile?.fullName ?? undefined,
      },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  /**
   * Forgot Password - Phase 15
   * 
   * SECURITY:
   * - Always succeeds (prevent email enumeration)
   * - Only sends email if user exists AND provider = LOCAL
   * - Generates 32-byte secure random token
   * - Hashes token before storing (bcrypt, salt rounds = 10)
   * - Token expires in 15 minutes
   * - Fire-and-forget email (does not block)
   * 
   * FLOW:
   * 1. Find user by email
   * 2. If not found OR OAuth user → return success (do nothing)
   * 3. Generate random token (crypto.randomBytes)
   * 4. Hash token with bcrypt
   * 5. Delete old reset tokens for user
   * 6. Save hashed token with expiry
   * 7. Send reset email (fire-and-forget)
   */
  async forgotPassword(email: string, ip: string): Promise<void> {
    // Step 1: Find user by email
    const user = await this.usersService.findByEmail(email);

    // Step 2: Silent fail if user not found or OAuth user
    if (!user || user.provider !== 'LOCAL') {
      // Log attempt but don't reveal whether email exists
      await this.auditLogService.log({
        action: 'FORGOT_PASSWORD_ATTEMPT',
        entity: 'User',
        ip: ip,
        metadata: { email, reason: !user ? 'User not found' : 'OAuth user' },
      });
      return; // Return success (prevent enumeration)
    }

    // Step 3: Generate secure random token (32 bytes = 64 hex chars)
    const resetToken = crypto.randomBytes(32).toString('hex');

    // Step 4: Hash token before storing (never store plain tokens)
    const hashedToken = await bcrypt.hash(resetToken, 10);

    // Step 5: Calculate expiry (15 minutes from now)
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    // Step 6: Delete old reset tokens for this user + save new one (transaction)
    await this.prisma.$transaction(async (tx) => {
      // Delete old tokens
      await tx.passwordResetToken.deleteMany({
        where: { userId: user.id },
      });

      // Create new reset token
      await tx.passwordResetToken.create({
        data: {
          userId: user.id,
          token: hashedToken, // Store hashed
          expiresAt,
        },
      });
    });

    // Step 7: Send reset email (fire-and-forget)
    this.notificationsService.notifyPasswordReset({
      email: user.email,
      resetToken, // Send PLAIN token in email
      expiresAt,
    });

    // Step 8: Log successful token generation
    await this.auditLogService.log({
      actorId: user.id,
      action: 'PASSWORD_RESET_TOKEN_GENERATED',
      entity: 'User',
      entityId: user.id,
      ip: ip,
    });
  }

  /**
   * Reset Password - Phase 15
   * 
   * SECURITY:
   * - Validates token hash with bcrypt.compare
   * - Checks expiry
   * - Checks if already used
   * - Rejects OAuth users (GOOGLE/MICROSOFT)
   * - Invalidates ALL refresh tokens (force re-login)
   * - Marks token as used (one-time use)
   * - Uses transaction for atomicity
   * 
   * FLOW:
   * 1. Hash incoming token
   * 2. Find matching token record (by hash)
   * 3. Validate expiry
   * 4. Validate not used
   * 5. Get user
   * 6. Validate user is LOCAL provider
   * 7. BEGIN TRANSACTION
   *    7.1 Update user password (hashed)
   *    7.2 Clear all refresh tokens
   *    7.3 Mark reset token as used
   * 8. COMMIT
   * 9. Log password reset
   */
  async resetPassword(token: string, newPassword: string, ip: string): Promise<void> {
    // Step 1 & 2: Find ALL reset tokens and compare hashes
    // (Cannot query by hash directly since bcrypt.compare is needed)
    const resetTokens = await this.prisma.passwordResetToken.findMany({
      where: {
        expiresAt: { gte: new Date() }, // Only non-expired
        usedAt: null, // Only unused
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            provider: true,
          },
        },
      },
    });

    // Find matching token by comparing hashes
    let matchedResetToken: typeof resetTokens[0] | null = null;
    for (const rt of resetTokens) {
      const isMatch = await bcrypt.compare(token, rt.token);
      if (isMatch) {
        matchedResetToken = rt;
        break;
      }
    }

    // Step 3: Validate token exists and matches
    if (!matchedResetToken) {
      await this.auditLogService.log({
        action: 'PASSWORD_RESET_FAILED',
        entity: 'User',
        ip: ip,
        metadata: { reason: 'Invalid or expired token' },
      });
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Step 4: Validate token not expired (double-check)
    if (matchedResetToken.expiresAt < new Date()) {
      await this.auditLogService.log({
        actorId: matchedResetToken.userId,
        action: 'PASSWORD_RESET_FAILED',
        entity: 'User',
        entityId: matchedResetToken.userId,
        ip: ip,
        metadata: { reason: 'Token expired' },
      });
      throw new BadRequestException('Reset token has expired');
    }

    // Step 5: Validate token not used (double-check)
    if (matchedResetToken.usedAt) {
      await this.auditLogService.log({
        actorId: matchedResetToken.userId,
        action: 'PASSWORD_RESET_FAILED',
        entity: 'User',
        entityId: matchedResetToken.userId,
        ip: ip,
        metadata: { reason: 'Token already used' },
      });
      throw new BadRequestException('Reset token has already been used');
    }

    // Step 6: Validate user is LOCAL provider (OAuth users cannot reset password)
    if (matchedResetToken.user.provider !== 'LOCAL') {
      await this.auditLogService.log({
        actorId: matchedResetToken.userId,
        action: 'PASSWORD_RESET_FAILED',
        entity: 'User',
        entityId: matchedResetToken.userId,
        ip: ip,
        metadata: { reason: 'OAuth user cannot reset password' },
      });
      throw new BadRequestException(
        'This account uses social login. Password reset is not available.',
      );
    }

    // Step 7: Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Step 8: BEGIN TRANSACTION - Update password, clear refresh tokens, mark token used
    await this.prisma.$transaction(async (tx) => {
      // 8.1 Update user password
      await tx.user.update({
        where: { id: matchedResetToken.userId },
        data: {
          password: hashedPassword,
          refreshToken: null, // Clear refresh token (force re-login)
        },
      });

      // 8.2 Mark reset token as used
      await tx.passwordResetToken.update({
        where: { id: matchedResetToken.id },
        data: { usedAt: new Date() },
      });
    });

    // Step 9: Log successful password reset
    await this.auditLogService.log({
      actorId: matchedResetToken.userId,
      action: 'PASSWORD_RESET_SUCCESS',
      entity: 'User',
      entityId: matchedResetToken.userId,
      ip: ip,
    });
  }
}
