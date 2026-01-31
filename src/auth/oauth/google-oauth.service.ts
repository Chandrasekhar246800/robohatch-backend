import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';

export interface GoogleTokenPayload {
  sub: string;         // Google user ID (providerId)
  email: string;
  email_verified: boolean;
  name?: string;
  picture?: string;
}

/**
 * GoogleOAuthService - Phase 14 Social Login
 * 
 * CRITICAL SECURITY:
 * - NEVER trust frontend-decoded tokens
 * - ALWAYS verify token server-side
 * - Check signature, audience, issuer
 * 
 * RULES:
 * - All OAuth users are CUSTOMER role
 * - No role injection from client
 * - Backend verifies token before user creation
 */
@Injectable()
export class GoogleOAuthService {
  private readonly logger = new Logger(GoogleOAuthService.name);
  private readonly client: OAuth2Client;
  private readonly clientId: string;

  constructor(private configService: ConfigService) {
    this.clientId = this.configService.get<string>('GOOGLE_CLIENT_ID') || '';
    
    if (!this.clientId) {
      this.logger.warn('⚠️  Google OAuth not configured (GOOGLE_CLIENT_ID missing)');
    }

    this.client = new OAuth2Client(this.clientId);
  }

  /**
   * Verify Google ID Token
   * 
   * CRITICAL SECURITY CHECKS:
   * 1. Signature verification (Google's public keys)
   * 2. Audience check (must match GOOGLE_CLIENT_ID)
   * 3. Issuer check (must be accounts.google.com)
   * 4. Expiration check (token not expired)
   * 
   * @throws UnauthorizedException if verification fails
   */
  async verifyIdToken(idToken: string): Promise<GoogleTokenPayload> {
    if (!this.clientId) {
      throw new UnauthorizedException('Google OAuth is not configured');
    }

    try {
      // Verify token signature and claims
      const ticket = await this.client.verifyIdToken({
        idToken,
        audience: this.clientId,
      });

      const payload = ticket.getPayload();

      if (!payload) {
        throw new UnauthorizedException('Invalid Google token payload');
      }

      // Additional security checks
      if (!payload.email_verified) {
        throw new UnauthorizedException('Google email not verified');
      }

      if (!payload.sub || !payload.email) {
        throw new UnauthorizedException('Missing required Google user data');
      }

      this.logger.log(`✅ Google token verified for user: ${payload.email}`);

      return {
        sub: payload.sub,
        email: payload.email,
        email_verified: payload.email_verified,
        name: payload.name,
        picture: payload.picture,
      };
    } catch (error: any) {
      this.logger.error(`❌ Google token verification failed: ${error.message}`);
      
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      
      throw new UnauthorizedException('Invalid Google ID token');
    }
  }

  /**
   * Check if Google OAuth is configured
   */
  isConfigured(): boolean {
    return !!this.clientId;
  }
}

