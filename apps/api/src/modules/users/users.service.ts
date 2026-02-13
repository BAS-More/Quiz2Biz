import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@libs/database';
import { User, UserRole, Prisma } from '@prisma/client';
import { UpdateUserDto } from './dto/update-user.dto';
import { PaginationDto } from '@libs/shared';

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  profile: {
    name?: string;
    phone?: string;
    timezone?: string;
    language?: string;
    avatarUrl?: string;
  };
  preferences: {
    notifications?: {
      email: boolean;
      push: boolean;
    };
    theme?: string;
  };
  organization?: {
    id: string;
    name: string;
  };
  statistics: {
    completedSessions: number;
    documentsGenerated: number;
    lastActiveAt: Date | null;
  };
  createdAt: Date;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<UserProfile> {
    const user = await this.prisma.user.findUnique({
      where: { id, deletedAt: null },
      include: {
        organization: true,
        sessions: {
          where: { status: 'COMPLETED' },
          select: { id: true },
        },
        _count: {
          select: {
            sessions: { where: { status: 'COMPLETED' } },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Count documents
    const documentsCount = await this.prisma.document.count({
      where: {
        session: {
          userId: user.id,
        },
        status: 'GENERATED',
      },
    });

    return this.mapToUserProfile(user, documentsCount);
  }

  async update(id: string, dto: UpdateUserDto, requestingUserId: string): Promise<UserProfile> {
    // Check if user exists
    const existingUser = await this.prisma.user.findUnique({
      where: { id, deletedAt: null },
    });

    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    // Check permission - users can only update their own profile
    if (existingUser.id !== requestingUserId && existingUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException('You can only update your own profile');
    }

    // Build update data
    const updateData: Prisma.UserUpdateInput = {};

    if (dto.name !== undefined || dto.phone !== undefined || dto.timezone !== undefined) {
      const currentProfile = (existingUser.profile as Record<string, unknown>) || {};
      updateData.profile = {
        ...currentProfile,
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.timezone !== undefined && { timezone: dto.timezone }),
      };
    }

    if (dto.preferences !== undefined) {
      const currentPrefs = (existingUser.preferences as Record<string, unknown>) || {};
      updateData.preferences = {
        ...currentPrefs,
        ...dto.preferences,
      };
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: updateData,
      include: {
        organization: true,
      },
    });

    const documentsCount = await this.prisma.document.count({
      where: {
        session: { userId: id },
        status: 'GENERATED',
      },
    });

    return this.mapToUserProfile(updatedUser, documentsCount);
  }

  async findAll(
    pagination: PaginationDto,
    role?: UserRole,
  ): Promise<{ items: UserProfile[]; total: number }> {
    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      ...(role && { role }),
    };

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip: pagination.skip,
        take: pagination.limit,
        orderBy: { createdAt: 'desc' },
        include: {
          organization: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    const items = await Promise.all(
      users.map(async (user) => {
        const documentsCount = await this.prisma.document.count({
          where: {
            session: { userId: user.id },
            status: 'GENERATED',
          },
        });
        return this.mapToUserProfile(user, documentsCount);
      }),
    );

    return { items, total };
  }

  private mapToUserProfile(
    user: User & {
      organization?: { id: string; name: string } | null;
      _count?: { sessions: number };
    },
    documentsCount: number,
  ): UserProfile {
    const profile = (user.profile as Record<string, unknown>) || {};
    const preferences = (user.preferences as Record<string, unknown>) || {};

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      profile: {
        name: profile.name as string | undefined,
        phone: profile.phone as string | undefined,
        timezone: profile.timezone as string | undefined,
        language: profile.language as string | undefined,
        avatarUrl: profile.avatarUrl as string | undefined,
      },
      preferences: {
        notifications: preferences.notifications as { email: boolean; push: boolean } | undefined,
        theme: preferences.theme as string | undefined,
      },
      organization: user.organization
        ? { id: user.organization.id, name: user.organization.name }
        : undefined,
      statistics: {
        completedSessions: user._count?.sessions || 0,
        documentsGenerated: documentsCount,
        lastActiveAt: user.lastLoginAt,
      },
      createdAt: user.createdAt,
    };
  }
}
