import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@libs/database';
import { Request } from 'express';

export interface AuditLogParams {
  userId: string;
  action: string;
  resourceType: 'Questionnaire' | 'Section' | 'Question' | 'VisibilityRule';
  resourceId: string;
  changes?: { before?: unknown; after?: unknown };
  request?: Request;
}

@Injectable()
export class AdminAuditService {
  private readonly logger = new Logger(AdminAuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(params: AuditLogParams): Promise<void> {
    const { userId, action, resourceType, resourceId, changes, request } = params;

    try {
      await this.prisma.auditLog.create({
        data: {
          userId,
          action,
          resourceType,
          resourceId,
          changes: changes ? JSON.parse(JSON.stringify(changes)) : null,
          ipAddress: request?.ip ?? request?.socket?.remoteAddress ?? null,
          userAgent: request?.headers?.['user-agent'] ?? null,
          requestId: (request?.headers?.['x-request-id'] as string) ?? null,
        },
      });

      this.logger.log(`Audit: ${action} on ${resourceType}:${resourceId} by user ${userId}`);
    } catch (error) {
      this.logger.error(
        `Failed to create audit log: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
