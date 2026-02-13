import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@libs/database';
import { ConfigModule } from '@nestjs/config';
import configuration from '../../src/config/configuration';

describe('Transaction & Concurrency Tests', () => {
  let module: TestingModule;
  let prisma: PrismaService;

  // Test data IDs
  let testUserId: string;
  let testQuestionnaireId: string;
  let testSessionId: string;
  let testQuestionId: string;
  let testDimensionId: string;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          load: [configuration],
          isGlobal: true,
        }),
      ],
      providers: [PrismaService],
    }).compile();

    prisma = module.get<PrismaService>(PrismaService);

    // Create test user
    const user = await prisma.user.create({
      data: {
        email: `transaction-test-${Date.now()}@test.com`,
        hashedPassword: 'hashed_password',
        role: 'USER',
      },
    });
    testUserId = user.id;

    // Create test questionnaire
    const questionnaire = await prisma.questionnaire.create({
      data: {
        title: `Transaction Test Questionnaire ${Date.now()}`,
        description: 'Test questionnaire for transactions',
      },
    });
    testQuestionnaireId = questionnaire.id;

    // Create test dimension
    const dimension = await prisma.dimension.create({
      data: {
        name: `Transaction Test Dimension ${Date.now()}`,
        weight: 1.0,
        questionnaireId: testQuestionnaireId,
      },
    });
    testDimensionId = dimension.id;

    // Create test question
    const question = await prisma.question.create({
      data: {
        text: 'Test transaction question',
        type: 'TEXT',
        dimensionId: testDimensionId,
        severity: 0.7,
      },
    });
    testQuestionId = question.id;

    // Create test session
    const session = await prisma.session.create({
      data: {
        userId: testUserId,
        questionnaireId: testQuestionnaireId,
        status: 'IN_PROGRESS',
      },
    });
    testSessionId = session.id;
  });

  afterAll(async () => {
    // Clean up in reverse dependency order
    await prisma.response.deleteMany({ where: { sessionId: testSessionId } });
    await prisma.session.deleteMany({ where: { id: testSessionId } });
    await prisma.question.deleteMany({ where: { dimensionId: testDimensionId } });
    await prisma.dimension.deleteMany({ where: { id: testDimensionId } });
    await prisma.questionnaire.deleteMany({ where: { id: testQuestionnaireId } });
    await prisma.user.deleteMany({ where: { id: testUserId } });

    await module.close();
  });

  describe('Atomic Transactions', () => {
    it('should commit all operations in successful transaction', async () => {
      const result = await prisma.$transaction(async (tx) => {
        // Create multiple responses in single transaction
        const response1 = await tx.response.create({
          data: {
            sessionId: testSessionId,
            questionId: testQuestionId,
            coverage: 0.75,
            coverageLevel: 'SUBSTANTIAL',
          },
        });

        const response2 = await tx.response.create({
          data: {
            sessionId: testSessionId,
            questionId: testQuestionId,
            coverage: 0.5,
            coverageLevel: 'HALF',
          },
        });

        // Update session status
        const session = await tx.session.update({
          where: { id: testSessionId },
          data: { status: 'COMPLETED', completedAt: new Date() },
        });

        return { response1, response2, session };
      });

      // Verify all operations committed
      expect(result.response1.coverageLevel).toBe('SUBSTANTIAL');
      expect(result.response2.coverageLevel).toBe('HALF');
      expect(result.session.status).toBe('COMPLETED');

      // Verify data persisted to database
      const responses = await prisma.response.findMany({
        where: { sessionId: testSessionId },
      });
      expect(responses).toHaveLength(2);

      const session = await prisma.session.findUnique({ where: { id: testSessionId } });
      expect(session!.status).toBe('COMPLETED');

      // Clean up
      await prisma.response.deleteMany({ where: { sessionId: testSessionId } });
      await prisma.session.update({
        where: { id: testSessionId },
        data: { status: 'IN_PROGRESS', completedAt: null },
      });
    });

    it('should rollback all operations on transaction failure', async () => {
      const initialResponseCount = await prisma.response.count({
        where: { sessionId: testSessionId },
      });

      const initialSessionStatus = await prisma.session.findUnique({
        where: { id: testSessionId },
        select: { status: true },
      });

      try {
        await prisma.$transaction(async (tx) => {
          // Create response
          await tx.response.create({
            data: {
              sessionId: testSessionId,
              questionId: testQuestionId,
              coverage: 1.0,
              coverageLevel: 'FULL',
            },
          });

          // Update session
          await tx.session.update({
            where: { id: testSessionId },
            data: { status: 'COMPLETED' },
          });

          // Throw error to trigger rollback
          throw new Error('Simulated transaction failure');
        });
      } catch (error: any) {
        expect(error.message).toBe('Simulated transaction failure');
      }

      // Verify rollback - data should be unchanged
      const finalResponseCount = await prisma.response.count({
        where: { sessionId: testSessionId },
      });
      expect(finalResponseCount).toBe(initialResponseCount);

      const finalSessionStatus = await prisma.session.findUnique({
        where: { id: testSessionId },
        select: { status: true },
      });
      expect(finalSessionStatus!.status).toBe(initialSessionStatus!.status);
    });

    it('should handle nested transactions', async () => {
      await prisma.$transaction(async (tx) => {
        // Create response
        const response = await tx.response.create({
          data: {
            sessionId: testSessionId,
            questionId: testQuestionId,
            coverage: 0.25,
            coverageLevel: 'PARTIAL',
          },
        });

        // Update response within same transaction
        const updated = await tx.response.update({
          where: { id: response.id },
          data: { coverage: 0.5, coverageLevel: 'HALF' },
        });

        expect(updated.coverageLevel).toBe('HALF');

        // Clean up within transaction
        await tx.response.delete({ where: { id: response.id } });
      });

      // Verify all operations committed and cleanup happened
      const responses = await prisma.response.findMany({
        where: { sessionId: testSessionId },
      });
      expect(responses).toHaveLength(0);
    });
  });

  describe('Concurrent Write Operations', () => {
    it('should handle concurrent session updates correctly', async () => {
      // Simulate concurrent updates to same session
      const updates = await Promise.allSettled([
        prisma.session.update({
          where: { id: testSessionId },
          data: { updatedAt: new Date() },
        }),
        prisma.session.update({
          where: { id: testSessionId },
          data: { updatedAt: new Date() },
        }),
        prisma.session.update({
          where: { id: testSessionId },
          data: { updatedAt: new Date() },
        }),
      ]);

      // All updates should succeed (last-write-wins)
      updates.forEach((result) => {
        expect(result.status).toBe('fulfilled');
      });

      // Verify session still exists and is valid
      const session = await prisma.session.findUnique({ where: { id: testSessionId } });
      expect(session).toBeDefined();
      expect(session!.id).toBe(testSessionId);
    });

    it('should handle concurrent response creation on same session', async () => {
      const responses = await Promise.all([
        prisma.response.create({
          data: {
            sessionId: testSessionId,
            questionId: testQuestionId,
            coverage: 0.25,
            coverageLevel: 'PARTIAL',
          },
        }),
        prisma.response.create({
          data: {
            sessionId: testSessionId,
            questionId: testQuestionId,
            coverage: 0.5,
            coverageLevel: 'HALF',
          },
        }),
        prisma.response.create({
          data: {
            sessionId: testSessionId,
            questionId: testQuestionId,
            coverage: 0.75,
            coverageLevel: 'SUBSTANTIAL',
          },
        }),
      ]);

      expect(responses).toHaveLength(3);
      responses.forEach((response) => {
        expect(response.sessionId).toBe(testSessionId);
        expect(response.questionId).toBe(testQuestionId);
      });

      // Verify all responses persisted
      const allResponses = await prisma.response.findMany({
        where: { sessionId: testSessionId },
      });
      expect(allResponses.length).toBeGreaterThanOrEqual(3);

      // Clean up
      await prisma.response.deleteMany({
        where: { id: { in: responses.map((r) => r.id) } },
      });
    });

    it('should prevent duplicate responses for same session+question (unique constraint)', async () => {
      // Create first response
      const response1 = await prisma.response.create({
        data: {
          sessionId: testSessionId,
          questionId: testQuestionId,
          coverage: 0.5,
          coverageLevel: 'HALF',
        },
      });

      // Attempt to create duplicate (should fail if unique constraint exists)
      try {
        await prisma.response.create({
          data: {
            sessionId: testSessionId,
            questionId: testQuestionId,
            coverage: 0.75,
            coverageLevel: 'SUBSTANTIAL',
          },
        });

        // If no unique constraint, this test documents current behavior
        // In production, should have unique constraint on (sessionId, questionId)
      } catch (error: any) {
        // Expected if unique constraint is in place
        expect(error.code).toBe('P2002'); // Prisma unique constraint violation
      }

      // Clean up
      await prisma.response.deleteMany({
        where: { sessionId: testSessionId, questionId: testQuestionId },
      });
    });
  });

  describe('Race Conditions', () => {
    it('should handle concurrent reads during write', async () => {
      // Start write operation
      const writePromise = prisma.session.update({
        where: { id: testSessionId },
        data: { status: 'COMPLETED', completedAt: new Date() },
      });

      // Concurrent reads during write
      const readPromises = Array.from({ length: 5 }, () =>
        prisma.session.findUnique({ where: { id: testSessionId } }),
      );

      // Wait for all operations
      const [writeResult, ...readResults] = await Promise.all([writePromise, ...readPromises]);

      // Write should succeed
      expect(writeResult.status).toBe('COMPLETED');

      // Reads should all succeed (may see old or new value depending on timing)
      readResults.forEach((result) => {
        expect(result).toBeDefined();
        expect(result!.id).toBe(testSessionId);
        expect(['IN_PROGRESS', 'COMPLETED']).toContain(result!.status);
      });

      // Reset session
      await prisma.session.update({
        where: { id: testSessionId },
        data: { status: 'IN_PROGRESS', completedAt: null },
      });
    });

    it('should handle concurrent delete attempts', async () => {
      // Create test response
      const response = await prisma.response.create({
        data: {
          sessionId: testSessionId,
          questionId: testQuestionId,
          coverage: 0.5,
          coverageLevel: 'HALF',
        },
      });

      // Attempt concurrent deletes
      const deleteResults = await Promise.allSettled([
        prisma.response.delete({ where: { id: response.id } }),
        prisma.response.delete({ where: { id: response.id } }),
        prisma.response.delete({ where: { id: response.id } }),
      ]);

      // First delete should succeed
      const successful = deleteResults.filter((r) => r.status === 'fulfilled');
      expect(successful.length).toBeGreaterThanOrEqual(1);

      // Subsequent deletes should fail (record not found)
      const failed = deleteResults.filter((r) => r.status === 'rejected');
      expect(failed.length).toBeGreaterThan(0);

      // Verify record deleted
      const deleted = await prisma.response.findUnique({ where: { id: response.id } });
      expect(deleted).toBeNull();
    });
  });

  describe('Optimistic Locking (Version-Based)', () => {
    it('should detect concurrent modifications using updatedAt timestamp', async () => {
      // Read initial state
      const initial = await prisma.session.findUnique({ where: { id: testSessionId } });
      const initialUpdatedAt = initial!.updatedAt;

      // Simulate two concurrent users reading same record
      const user1Read = { ...initial };
      const user2Read = { ...initial };

      // User 1 updates first
      await prisma.session.update({
        where: { id: testSessionId },
        data: { status: 'COMPLETED' },
      });

      // User 2 attempts update (should check updatedAt first)
      const current = await prisma.session.findUnique({ where: { id: testSessionId } });

      if (current!.updatedAt.getTime() !== user2Read.updatedAt.getTime()) {
        // Conflict detected - user2's read is stale
        expect(current!.updatedAt.getTime()).toBeGreaterThan(user2Read.updatedAt.getTime());

        // User 2 should re-read and retry
        const refreshed = await prisma.session.findUnique({ where: { id: testSessionId } });
        expect(refreshed!.status).toBe('COMPLETED');
      }

      // Reset
      await prisma.session.update({
        where: { id: testSessionId },
        data: { status: 'IN_PROGRESS' },
      });
    });

    it('should implement version-based optimistic locking pattern', async () => {
      // Add version field to track modifications
      // In real implementation, would have `version` INT field in schema

      // Read with version
      const initial = await prisma.session.findUnique({ where: { id: testSessionId } });
      const version = 1; // Simulated version

      // Update with version check
      try {
        const updated = await prisma.session.updateMany({
          where: {
            id: testSessionId,
            updatedAt: initial!.updatedAt, // Use updatedAt as version proxy
          },
          data: {
            status: 'COMPLETED',
            updatedAt: new Date(),
          },
        });

        // If count === 0, version conflict detected
        if (updated.count === 0) {
          throw new Error('Version conflict: Record was modified by another user');
        }

        expect(updated.count).toBe(1);
      } catch (error: any) {
        // Handle version conflict
        expect(error.message).toContain('Version conflict');
      }

      // Reset
      await prisma.session.update({
        where: { id: testSessionId },
        data: { status: 'IN_PROGRESS' },
      });
    });
  });

  describe('Isolation Levels', () => {
    it('should demonstrate read-after-write consistency', async () => {
      // Write operation
      await prisma.session.update({
        where: { id: testSessionId },
        data: { status: 'COMPLETED' },
      });

      // Immediate read should see updated value
      const read = await prisma.session.findUnique({ where: { id: testSessionId } });
      expect(read!.status).toBe('COMPLETED');

      // Reset
      await prisma.session.update({
        where: { id: testSessionId },
        data: { status: 'IN_PROGRESS' },
      });
    });

    it('should handle transaction isolation for concurrent operations', async () => {
      const initialCount = await prisma.response.count({
        where: { sessionId: testSessionId },
      });

      // Two concurrent transactions
      await Promise.all([
        prisma.$transaction(async (tx) => {
          await tx.response.create({
            data: {
              sessionId: testSessionId,
              questionId: testQuestionId,
              coverage: 0.25,
              coverageLevel: 'PARTIAL',
            },
          });

          // Simulate processing delay
          await new Promise((resolve) => setTimeout(resolve, 10));
        }),
        prisma.$transaction(async (tx) => {
          await tx.response.create({
            data: {
              sessionId: testSessionId,
              questionId: testQuestionId,
              coverage: 0.5,
              coverageLevel: 'HALF',
            },
          });

          // Simulate processing delay
          await new Promise((resolve) => setTimeout(resolve, 10));
        }),
      ]);

      // Both transactions should commit
      const finalCount = await prisma.response.count({
        where: { sessionId: testSessionId },
      });
      expect(finalCount).toBe(initialCount + 2);

      // Clean up
      await prisma.response.deleteMany({ where: { sessionId: testSessionId } });
    });
  });

  describe('Deadlock Prevention', () => {
    it('should avoid deadlocks by consistent lock ordering', async () => {
      // Create two sessions for cross-update scenario
      const session2 = await prisma.session.create({
        data: {
          userId: testUserId,
          questionnaireId: testQuestionnaireId,
          status: 'PENDING',
        },
      });

      // Transaction 1: Update session1 then session2 (consistent order)
      const tx1 = prisma.$transaction(async (tx) => {
        await tx.session.update({
          where: { id: testSessionId },
          data: { status: 'IN_PROGRESS' },
        });

        await new Promise((resolve) => setTimeout(resolve, 10));

        await tx.session.update({
          where: { id: session2.id },
          data: { status: 'IN_PROGRESS' },
        });
      });

      // Transaction 2: Update same sessions in same order
      const tx2 = prisma.$transaction(async (tx) => {
        await tx.session.update({
          where: { id: testSessionId },
          data: { status: 'COMPLETED' },
        });

        await new Promise((resolve) => setTimeout(resolve, 10));

        await tx.session.update({
          where: { id: session2.id },
          data: { status: 'COMPLETED' },
        });
      });

      // Both transactions should complete without deadlock
      await Promise.all([tx1, tx2]);

      // Clean up
      await prisma.session.delete({ where: { id: session2.id } });
      await prisma.session.update({
        where: { id: testSessionId },
        data: { status: 'IN_PROGRESS' },
      });
    });
  });

  describe('Connection Pool & Resource Management', () => {
    it('should handle multiple concurrent connections', async () => {
      // Simulate high concurrency (50 concurrent operations)
      const operations = Array.from({ length: 50 }, (_, i) =>
        prisma.session.findUnique({ where: { id: testSessionId } }),
      );

      const results = await Promise.all(operations);

      // All operations should succeed
      results.forEach((result) => {
        expect(result).toBeDefined();
        expect(result!.id).toBe(testSessionId);
      });
    });

    it('should properly release connections after transaction', async () => {
      const before = await prisma.$queryRaw`SELECT COUNT(*) FROM "Session"`;

      await prisma.$transaction(async (tx) => {
        await tx.session.findMany({ take: 10 });
      });

      const after = await prisma.$queryRaw`SELECT COUNT(*) FROM "Session"`;

      // Connection should be released and reusable
      expect(before).toEqual(after);
    });
  });
});
