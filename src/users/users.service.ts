import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { UpdateProfileDto } from './dto/update-profile.dto';

interface CreateOAuthUserDto {
  email: string;
  provider: 'LOCAL' | 'GOOGLE' | 'MICROSOFT';
  providerId: string;
  fullName?: string;
}

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async createUser(email: string, password: string, role: Role, fullName?: string) {
    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user with profile
    return this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role,
        profile: fullName
          ? {
              create: {
                fullName,
              },
            }
          : undefined,
      },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        profile: {
          select: {
            fullName: true,
          },
        },
      },
    });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      include: {
        profile: true,
      },
    });
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateRefreshToken(userId: string, refreshToken: string | null) {
    const hashedRefreshToken = refreshToken ? await bcrypt.hash(refreshToken, 10) : null;

    return this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: hashedRefreshToken },
    });
  }

  async validateRefreshToken(userId: string, refreshToken: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.refreshToken) {
      return false;
    }

    return bcrypt.compare(refreshToken, user.refreshToken);
  }

  // Phase 3: Profile Management
  async getProfile(userId: string) {
    // Auto-create profile if it doesn't exist
    let profile = await this.prisma.profile.findUnique({
      where: { userId },
      select: {
        id: true,
        fullName: true,
        phone: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!profile) {
      profile = await this.prisma.profile.create({
        data: { userId },
        select: {
          id: true,
          fullName: true,
          phone: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    }

    return profile;
  }

  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto) {
    // Ensure profile exists first
    await this.getProfile(userId);

    return this.prisma.profile.update({
      where: { userId },
      data: updateProfileDto,
      select: {
        id: true,
        fullName: true,
        phone: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  /**
   * Find or create OAuth user - Phase 14
   * 
   * CRITICAL LOGIC:
   * 1. Check if user exists by provider + providerId
   * 2. If exists → return user (login)
   * 3. If not, check by email
   * 4. If email exists → link OAuth to existing user
   * 5. If new → create user with OAuth
   * 
   * SECURITY:
   * - All OAuth users are CUSTOMER role
   * - Password is null for OAuth users
   * - Existing password users can link OAuth
   */
  async findOrCreateOAuthUser(dto: CreateOAuthUserDto) {
    // Step 1: Check if OAuth user exists (provider + providerId)
    let user = await this.prisma.user.findFirst({
      where: {
        provider: dto.provider,
        providerId: dto.providerId,
      },
      include: {
        profile: {
          select: {
            fullName: true,
          },
        },
      },
    });

    if (user) {
      return user; // OAuth user exists, return it
    }

    // Step 2: Check if email exists (link OAuth to existing user)
    user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: {
        profile: {
          select: {
            fullName: true,
          },
        },
      },
    });

    if (user) {
      // Link OAuth provider to existing user
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          provider: dto.provider,
          providerId: dto.providerId,
        },
        include: {
          profile: {
            select: {
              fullName: true,
            },
          },
        },
      });
      return user;
    }

    // Step 3: Create new OAuth user
    user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: null, // OAuth users have no password
        role: Role.CUSTOMER, // All OAuth users are CUSTOMER
        provider: dto.provider,
        providerId: dto.providerId,
        profile: dto.fullName
          ? {
              create: {
                fullName: dto.fullName,
              },
            }
          : undefined,
      },
      include: {
        profile: {
          select: {
            fullName: true,
          },
        },
      },
    });

    return user;
  }
}
