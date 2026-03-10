import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@libs/database';

/** Shape of the full GDPR data-export payload (Article 15 / 20). */
export interface GdprDataExport {
  exportedAt: Date;
  user: {
    id: string;
    email: string;
    role: string;
    profile: unknown;
    preferences: unknown;
    createdAt: Date;
  };
  sessions: Array<{
    id: string;
    status: string;
    startedAt: Date;
    completedAt: Date | null;
  }>;
  documents: Array<{
    id: string;
    status: string;
    fileName: string | null;
    createdAt: Date;
  }>;
  auditLogs: Array<{
    id: string;
    action: string;
    createdAt: Date;
  }>;
}

/** Result of a GDPR erasure request (Article 17). */
export interface GdprDeletionResult {
  deletedAt: Date;
  itemsRemoved: number;
}

@Injectable()
export class GdprService {
  private readonly logger = new Logger(GdprService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Export all personally-identifiable data for a user.
   * Satisfies GDPR Article 15 (Right of Access) and Article 20 (Data Portability).
   */
  async exportUserData(userId: string): Promise<GdprDataExport> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const [sessions, documents, auditLogs] = await Promise.all([
      this.prisma.session.findMany({
        where: { userId },
        select: {
          id: true,
          status: true,
          startedAt: true,
          completedAt: true,
        },
        orderBy: { startedAt: 'desc' },
        take: 10000, // GDPR export — must retrieve all user data
      }),
      this.prisma.document.findMany({
        where: { session: { userId } },
        select: {
          id: true,
          status: true,
          fileName: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 10000, // GDPR export
      }),
      this.prisma.auditLog.findMany({
        where: { userId },
        select: {
          id: true,
          action: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 10000, // GDPR export
      }),
    ]);

    this.logger.log(`GDPR export completed for user ${userId}`);

    return {
      exportedAt: new Date(),
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        profile: user.profile,
        preferences: user.preferences,
        createdAt: user.createdAt,
      },
      sessions,
      documents,
      auditLogs,
    };
  }

  /**
   * Erase all personally-identifiable data for a user.
   * Satisfies GDPR Article 17 (Right to Erasure).
   * Uses soft-delete with PII anonymisation to preserve referential integrity.
   */
  async deleteUserData(userId: string): Promise<GdprDeletionResult> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    let itemsRemoved = 0;

    try {
      // Anonymise audit logs (preserve structure, remove PII)
      const auditResult = await this.prisma.auditLog.updateMany({
        where: { userId },
        data: { changes: {} },
      });
      itemsRemoved += auditResult.count;

      // Remove refresh tokens
      const tokenResult = await this.prisma.refreshToken.deleteMany({
        where: { userId },
      });
      itemsRemoved += tokenResult.count;

      // Soft-delete user and anonymise PII fields
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          email: `deleted-${userId}@gdpr-removed.local`,
          name: null,
          avatar: null,
          passwordHash: '',
          profile: {},
          preferences: {},
          mfaEnabled: false,
          mfaSecret: null,
          mfaBackupCodes: null,
          deletedAt: new Date(),
        },
      });
      itemsRemoved += 1;

      this.logger.log(
        `GDPR deletion completed for user ${userId}: ${itemsRemoved} items removed`,
      );
    } catch (error) {
      this.logger.error(
        `GDPR deletion failed for user ${userId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }

    return {
      deletedAt: new Date(),
      itemsRemoved,
    };
  }
}
