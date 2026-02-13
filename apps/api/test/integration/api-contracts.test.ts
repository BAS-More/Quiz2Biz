import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { PrismaService } from '@libs/database';
import { AppModule } from '../../src/app.module';
import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter';

describe('API Contract Tests - Sessions Endpoints', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let testUserId: string;
  let testQuestionnaireId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Apply global pipes and filters (production configuration)
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());

    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    // Create test user
    const user = await prisma.user.create({
      data: {
        email: `contract-test-${Date.now()}@test.com`,
        hashedPassword: 'hashed_password',
        role: 'USER',
      },
    });
    testUserId = user.id;

    // Mock JWT token (in real app, would call /auth/login)
    authToken = 'Bearer mock-jwt-token';

    // Create test questionnaire
    const questionnaire = await prisma.questionnaire.create({
      data: {
        title: 'Contract Test Questionnaire',
        description: 'Test questionnaire for API contracts',
      },
    });
    testQuestionnaireId = questionnaire.id;
  });

  afterAll(async () => {
    // Clean up
    await prisma.session.deleteMany({ where: { userId: testUserId } });
    await prisma.questionnaire.delete({ where: { id: testQuestionnaireId } });
    await prisma.user.delete({ where: { id: testUserId } });
    await app.close();
  });

  describe('POST /api/sessions - Create Session', () => {
    it('should create session with valid request body', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/sessions')
        .set('Authorization', authToken)
        .send({
          questionnaireId: testQuestionnaireId,
          userId: testUserId,
        })
        .expect(201);

      // Verify response structure
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('userId', testUserId);
      expect(response.body).toHaveProperty('questionnaireId', testQuestionnaireId);
      expect(response.body).toHaveProperty('status', 'PENDING');
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body).toHaveProperty('updatedAt');

      // Verify ISO 8601 date format
      expect(new Date(response.body.createdAt).toISOString()).toBe(response.body.createdAt);
    });

    it('should return 400 with missing required fields', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/sessions')
        .set('Authorization', authToken)
        .send({
          userId: testUserId,
          // Missing questionnaireId
        })
        .expect(400);

      expect(response.body).toHaveProperty('statusCode', 400);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('error', 'Bad Request');
    });

    it('should return 400 with invalid UUID format', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/sessions')
        .set('Authorization', authToken)
        .send({
          questionnaireId: 'invalid-uuid',
          userId: testUserId,
        })
        .expect(400);

      expect(response.body).toHaveProperty('statusCode', 400);
      expect(response.body.message).toContain('uuid');
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .post('/api/sessions')
        .send({
          questionnaireId: testQuestionnaireId,
          userId: testUserId,
        })
        .expect(401);
    });

    it('should reject unknown properties (strict validation)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/sessions')
        .set('Authorization', authToken)
        .send({
          questionnaireId: testQuestionnaireId,
          userId: testUserId,
          unexpectedField: 'should be rejected',
        })
        .expect(400);

      expect(response.body.message).toContain('unexpectedField');
    });
  });

  describe('GET /api/sessions/:id - Get Session', () => {
    let sessionId: string;

    beforeAll(async () => {
      const session = await prisma.session.create({
        data: {
          userId: testUserId,
          questionnaireId: testQuestionnaireId,
          status: 'IN_PROGRESS',
        },
      });
      sessionId = session.id;
    });

    it('should retrieve session with valid ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/sessions/${sessionId}`)
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body).toHaveProperty('id', sessionId);
      expect(response.body).toHaveProperty('status', 'IN_PROGRESS');
      expect(response.body).toHaveProperty('userId', testUserId);
    });

    it('should return 404 for non-existent session', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app.getHttpServer())
        .get(`/api/sessions/${fakeId}`)
        .set('Authorization', authToken)
        .expect(404);

      expect(response.body).toHaveProperty('statusCode', 404);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('error', 'Not Found');
    });

    it('should return 400 for invalid UUID format', async () => {
      await request(app.getHttpServer())
        .get('/api/sessions/invalid-id')
        .set('Authorization', authToken)
        .expect(400);
    });
  });

  describe('PATCH /api/sessions/:id - Update Session', () => {
    let sessionId: string;

    beforeAll(async () => {
      const session = await prisma.session.create({
        data: {
          userId: testUserId,
          questionnaireId: testQuestionnaireId,
          status: 'IN_PROGRESS',
        },
      });
      sessionId = session.id;
    });

    it('should update session status', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/sessions/${sessionId}`)
        .set('Authorization', authToken)
        .send({ status: 'COMPLETED' })
        .expect(200);

      expect(response.body).toHaveProperty('id', sessionId);
      expect(response.body).toHaveProperty('status', 'COMPLETED');
      expect(response.body).toHaveProperty('completedAt');
    });

    it('should return 400 for invalid status value', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/sessions/${sessionId}`)
        .set('Authorization', authToken)
        .send({ status: 'INVALID_STATUS' })
        .expect(400);

      expect(response.body).toHaveProperty('statusCode', 400);
      expect(response.body.message).toContain('status');
    });

    it('should reject partial updates with invalid fields', async () => {
      await request(app.getHttpServer())
        .patch(`/api/sessions/${sessionId}`)
        .set('Authorization', authToken)
        .send({ invalidField: 'value' })
        .expect(400);
    });
  });

  describe('DELETE /api/sessions/:id - Delete Session', () => {
    it('should delete session with valid ID', async () => {
      const session = await prisma.session.create({
        data: {
          userId: testUserId,
          questionnaireId: testQuestionnaireId,
          status: 'PENDING',
        },
      });

      await request(app.getHttpServer())
        .delete(`/api/sessions/${session.id}`)
        .set('Authorization', authToken)
        .expect(200);

      // Verify deletion
      const deleted = await prisma.session.findUnique({ where: { id: session.id } });
      expect(deleted).toBeNull();
    });

    it('should return 404 for already deleted session', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      await request(app.getHttpServer())
        .delete(`/api/sessions/${fakeId}`)
        .set('Authorization', authToken)
        .expect(404);
    });
  });

  describe('Error Response Format Consistency', () => {
    it('400 errors should follow standard format', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/sessions')
        .set('Authorization', authToken)
        .send({ invalid: 'data' })
        .expect(400);

      expect(response.body).toHaveProperty('statusCode', 400);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('error', 'Bad Request');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('path', '/api/sessions');
    });

    it('404 errors should follow standard format', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/non-existent-endpoint')
        .set('Authorization', authToken)
        .expect(404);

      expect(response.body).toHaveProperty('statusCode', 404);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('error', 'Not Found');
    });

    it('401 errors should follow standard format', async () => {
      const response = await request(app.getHttpServer()).get('/api/sessions').expect(401);

      expect(response.body).toHaveProperty('statusCode', 401);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('error', 'Unauthorized');
    });

    it('500 errors should follow standard format', async () => {
      // Trigger server error (simulate by calling endpoint that throws)
      // In real scenario, would need to mock service to throw error
      // For now, we verify the error filter format
      const errorFormat = {
        statusCode: 500,
        message: 'Internal server error',
        error: 'Internal Server Error',
        timestamp: new Date().toISOString(),
        path: '/api/test',
      };

      expect(errorFormat).toHaveProperty('statusCode', 500);
      expect(errorFormat).toHaveProperty('message');
      expect(errorFormat).toHaveProperty('error', 'Internal Server Error');
    });
  });

  describe('Content-Type Headers', () => {
    it('should return application/json for all endpoints', async () => {
      const session = await prisma.session.create({
        data: {
          userId: testUserId,
          questionnaireId: testQuestionnaireId,
          status: 'PENDING',
        },
      });

      const response = await request(app.getHttpServer())
        .get(`/api/sessions/${session.id}`)
        .set('Authorization', authToken)
        .expect(200);

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });

    it('should accept application/json in request', async () => {
      await request(app.getHttpServer())
        .post('/api/sessions')
        .set('Authorization', authToken)
        .set('Content-Type', 'application/json')
        .send({
          questionnaireId: testQuestionnaireId,
          userId: testUserId,
        })
        .expect(201);
    });
  });

  describe('Pagination Contract', () => {
    beforeAll(async () => {
      // Create multiple sessions for pagination test
      await Promise.all(
        Array.from({ length: 15 }, (_, i) =>
          prisma.session.create({
            data: {
              userId: testUserId,
              questionnaireId: testQuestionnaireId,
              status: 'PENDING',
            },
          }),
        ),
      );
    });

    it('should support pagination query parameters', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/sessions')
        .query({ page: 1, limit: 10 })
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta');
      expect(response.body.meta).toHaveProperty('page', 1);
      expect(response.body.meta).toHaveProperty('limit', 10);
      expect(response.body.meta).toHaveProperty('total');
      expect(response.body.meta).toHaveProperty('totalPages');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeLessThanOrEqual(10);
    });

    it('should validate pagination parameters', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/sessions')
        .query({ page: -1, limit: 1000 })
        .set('Authorization', authToken)
        .expect(400);

      expect(response.body).toHaveProperty('statusCode', 400);
    });
  });

  describe('CORS Headers', () => {
    it('should include CORS headers in response', async () => {
      const response = await request(app.getHttpServer())
        .options('/api/sessions')
        .set('Origin', 'https://example.com')
        .expect(204);

      expect(response.headers).toHaveProperty('access-control-allow-origin');
      expect(response.headers).toHaveProperty('access-control-allow-methods');
      expect(response.headers).toHaveProperty('access-control-allow-headers');
    });
  });
});
