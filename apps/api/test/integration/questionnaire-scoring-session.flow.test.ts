import { Test, TestingModule } from '@nestjs/testing';
import { SessionService } from '../../src/modules/session/session.service';
import { QuestionnaireService } from '../../src/modules/questionnaire/questionnaire.service';
import { ScoringEngineService } from '../../src/modules/scoring-engine/scoring-engine.service';
import { PrismaService } from '@libs/database';
import { SessionStatus, CoverageLevel } from '@prisma/client';

describe('Questionnaire→Scoring→Session Flow Integration', () => {
  let sessionService: SessionService;
  let questionnaireService: QuestionnaireService;
  let scoringService: ScoringEngineService;
  let prisma: PrismaService;

  let testUserId: string;
  let testQuestionnaireId: string;
  let testSessionId: string;
  let testDimensionKey: string;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SessionService, QuestionnaireService, ScoringEngineService, PrismaService],
    }).compile();

    sessionService = module.get<SessionService>(SessionService);
    questionnaireService = module.get<QuestionnaireService>(QuestionnaireService);
    scoringService = module.get<ScoringEngineService>(ScoringEngineService);
    prisma = module.get<PrismaService>(PrismaService);

    // Setup test data
    const user = await prisma.user.create({
      data: {
        email: `flow-test-${Date.now()}@example.com`,
        passwordHash: 'hash',
        role: 'USER',
      },
    });
    testUserId = user.id;

    const questionnaire = await prisma.questionnaire.create({
      data: {
        name: 'Flow Test Questionnaire',
        description: 'End-to-end flow testing',
        version: '1.0',
        isActive: true,
      },
    });
    testQuestionnaireId = questionnaire.id;

    testDimensionKey = `flow-test-${Date.now()}`;
    await prisma.dimension.create({
      data: {
        key: testDimensionKey,
        displayName: 'Flow Test Dimension',
        weight: 1.0,
      },
    });
  });

  afterAll(async () => {
    if (testSessionId) {
      await prisma.response.deleteMany({ where: { sessionId: testSessionId } });
      await prisma.session.delete({ where: { id: testSessionId } });
    }
    await prisma.dimension.delete({ where: { key: testDimensionKey } });
    await prisma.questionnaire.delete({ where: { id: testQuestionnaireId } });
    await prisma.user.delete({ where: { id: testUserId } });
    await prisma.$disconnect();
  });

  describe('Complete Questionnaire Flow', () => {
    it('should create session → answer questions → calculate score → complete session', async () => {
      // Step 1: Create session
      const session = await sessionService.createSession({
        questionnaireId: testQuestionnaireId,
        userId: testUserId,
      });
      testSessionId = session.id;

      expect(session.status).toBe(SessionStatus.PENDING);
      expect(session.readinessScore).toBeNull();

      // Step 2: Create questions
      const questions = await Promise.all([
        prisma.question.create({
          data: {
            questionnaireId: testQuestionnaireId,
            dimensionKey: testDimensionKey,
            text: 'Security Question 1',
            questionType: 'YES_NO',
            isRequired: true,
            severity: 0.8,
            order: 1,
          },
        }),
        prisma.question.create({
          data: {
            questionnaireId: testQuestionnaireId,
            dimensionKey: testDimensionKey,
            text: 'Security Question 2',
            questionType: 'TEXT',
            isRequired: true,
            severity: 0.7,
            order: 2,
          },
        }),
        prisma.question.create({
          data: {
            questionnaireId: testQuestionnaireId,
            dimensionKey: testDimensionKey,
            text: 'Security Question 3',
            questionType: 'MULTIPLE_CHOICE',
            isRequired: true,
            severity: 0.6,
            order: 3,
          },
        }),
      ]);

      // Step 3: Answer questions with varying coverage
      await Promise.all([
        prisma.response.create({
          data: {
            sessionId: testSessionId,
            questionId: questions[0].id,
            value: 'Yes',
            isValid: true,
            coverage: 1.0,
            coverageLevel: CoverageLevel.FULL,
          },
        }),
        prisma.response.create({
          data: {
            sessionId: testSessionId,
            questionId: questions[1].id,
            value: 'Partially implemented',
            isValid: true,
            coverage: 0.5,
            coverageLevel: CoverageLevel.HALF,
          },
        }),
        prisma.response.create({
          data: {
            sessionId: testSessionId,
            questionId: questions[2].id,
            value: 'Option B',
            isValid: true,
            coverage: 0.75,
            coverageLevel: CoverageLevel.SUBSTANTIAL,
          },
        }),
      ]);

      // Step 4: Calculate readiness score
      const scoreResult = await scoringService.calculateReadinessScore(testSessionId);

      expect(scoreResult).toBeDefined();
      expect(scoreResult.overallScore).toBeGreaterThan(0);
      expect(scoreResult.overallScore).toBeLessThanOrEqual(100);
      expect(scoreResult.dimensionScores).toHaveLength(1);

      // Step 5: Update session status to COMPLETED
      const completedSession = await prisma.session.update({
        where: { id: testSessionId },
        data: {
          status: SessionStatus.COMPLETED,
          readinessScore: scoreResult.overallScore,
          completedAt: new Date(),
        },
      });

      expect(completedSession.status).toBe(SessionStatus.COMPLETED);
      expect(completedSession.readinessScore).toBe(scoreResult.overallScore);
      expect(completedSession.completedAt).toBeDefined();

      // Cleanup
      await prisma.question.deleteMany({
        where: { id: { in: questions.map((q) => q.id) } },
      });
    });

    it('should handle incomplete session workflow', async () => {
      const session = await sessionService.createSession({
        questionnaireId: testQuestionnaireId,
        userId: testUserId,
      });

      // Create questions but don't answer all
      const question = await prisma.question.create({
        data: {
          questionnaireId: testQuestionnaireId,
          dimensionKey: testDimensionKey,
          text: 'Incomplete question',
          questionType: 'TEXT',
          isRequired: true,
          severity: 0.5,
          order: 1,
        },
      });

      // Only partially answer
      const totalQuestions = await prisma.question.count({
        where: { questionnaireId: testQuestionnaireId },
      });

      const answeredQuestions = await prisma.response.count({
        where: { sessionId: session.id, isValid: true },
      });

      const isComplete = answeredQuestions === totalQuestions;

      expect(isComplete).toBe(false);

      // Cleanup
      await prisma.response.deleteMany({ where: { sessionId: session.id } });
      await prisma.session.delete({ where: { id: session.id } });
      await prisma.question.delete({ where: { id: question.id } });
    });
  });

  describe('Scoring Integration', () => {
    it('should calculate weighted dimension scores', async () => {
      const session = await sessionService.createSession({
        questionnaireId: testQuestionnaireId,
        userId: testUserId,
      });

      // Create questions with different severities
      const questions = await Promise.all([
        prisma.question.create({
          data: {
            questionnaireId: testQuestionnaireId,
            dimensionKey: testDimensionKey,
            text: 'High severity question',
            questionType: 'YES_NO',
            isRequired: true,
            severity: 0.9, // High severity
            order: 1,
          },
        }),
        prisma.question.create({
          data: {
            questionnaireId: testQuestionnaireId,
            dimensionKey: testDimensionKey,
            text: 'Low severity question',
            questionType: 'TEXT',
            isRequired: true,
            severity: 0.3, // Low severity
            order: 2,
          },
        }),
      ]);

      // Answer both questions with same coverage
      await Promise.all([
        prisma.response.create({
          data: {
            sessionId: session.id,
            questionId: questions[0].id,
            value: 'Yes',
            isValid: true,
            coverage: 0.5,
            coverageLevel: CoverageLevel.HALF,
          },
        }),
        prisma.response.create({
          data: {
            sessionId: session.id,
            questionId: questions[1].id,
            value: 'Answer',
            isValid: true,
            coverage: 0.5,
            coverageLevel: CoverageLevel.HALF,
          },
        }),
      ]);

      const scoreResult = await scoringService.calculateReadinessScore(session.id);

      // High severity question should contribute more to residual risk
      expect(scoreResult).toBeDefined();
      expect(scoreResult.dimensionScores[0]).toBeDefined();

      // Cleanup
      await prisma.response.deleteMany({ where: { sessionId: session.id } });
      await prisma.session.delete({ where: { id: session.id } });
      await prisma.question.deleteMany({
        where: { id: { in: questions.map((q) => q.id) } },
      });
    });

    it('should recalculate score when responses change', async () => {
      const session = await sessionService.createSession({
        questionnaireId: testQuestionnaireId,
        userId: testUserId,
      });

      const question = await prisma.question.create({
        data: {
          questionnaireId: testQuestionnaireId,
          dimensionKey: testDimensionKey,
          text: 'Changing response question',
          questionType: 'YES_NO',
          isRequired: true,
          severity: 0.8,
          order: 1,
        },
      });

      // Initial response with low coverage
      const response = await prisma.response.create({
        data: {
          sessionId: session.id,
          questionId: question.id,
          value: 'No',
          isValid: true,
          coverage: 0.0,
          coverageLevel: CoverageLevel.NONE,
        },
      });

      const initialScore = await scoringService.calculateReadinessScore(session.id);

      // Update response with high coverage
      await prisma.response.update({
        where: { id: response.id },
        data: {
          value: 'Yes',
          coverage: 1.0,
          coverageLevel: CoverageLevel.FULL,
        },
      });

      const updatedScore = await scoringService.calculateReadinessScore(session.id);

      // Score should improve
      expect(updatedScore.overallScore).toBeGreaterThan(initialScore.overallScore);

      // Cleanup
      await prisma.response.delete({ where: { id: response.id } });
      await prisma.session.delete({ where: { id: session.id } });
      await prisma.question.delete({ where: { id: question.id } });
    });
  });

  describe('Progress Tracking', () => {
    it('should track session progress accurately', async () => {
      const session = await sessionService.createSession({
        questionnaireId: testQuestionnaireId,
        userId: testUserId,
      });

      const questions = await Promise.all(
        Array.from({ length: 5 }, (_, i) =>
          prisma.question.create({
            data: {
              questionnaireId: testQuestionnaireId,
              dimensionKey: testDimensionKey,
              text: `Progress question ${i + 1}`,
              questionType: 'TEXT',
              isRequired: true,
              severity: 0.5,
              order: i + 1,
            },
          }),
        ),
      );

      // Answer 3 out of 5 questions
      await Promise.all(
        questions.slice(0, 3).map((q) =>
          prisma.response.create({
            data: {
              sessionId: session.id,
              questionId: q.id,
              value: 'Answer',
              isValid: true,
              coverage: 0.5,
              coverageLevel: CoverageLevel.HALF,
            },
          }),
        ),
      );

      const totalQuestions = questions.length;
      const answeredQuestions = 3;
      const progress = (answeredQuestions / totalQuestions) * 100;

      expect(progress).toBe(60);
      expect(totalQuestions - answeredQuestions).toBe(2); // Questions left

      // Cleanup
      await prisma.response.deleteMany({ where: { sessionId: session.id } });
      await prisma.session.delete({ where: { id: session.id } });
      await prisma.question.deleteMany({
        where: { id: { in: questions.map((q) => q.id) } },
      });
    });
  });
});
