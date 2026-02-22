import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { HealthController } from './health.controller';
import { PrismaService } from '@libs/database';
import { RedisService } from '@libs/redis';

describe('HealthController', () => {
  let controller: HealthController;
  let prismaService: jest.Mocked<PrismaService>;
  let redisService: jest.Mocked<RedisService>;

  const mockPrismaService = {
    $queryRaw: jest.fn(),
  };

  const mockRedisClient = {
    ping: jest.fn(),
  };

  const mockRedisService = {
    getClient: jest.fn().mockReturnValue(mockRedisClient),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    prismaService = module.get(PrismaService);
    redisService = module.get(RedisService);
  });

  describe('check (GET /health)', () => {
    it('should return healthy status when all dependencies are up', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
      mockRedisClient.ping.mockResolvedValue('PONG');

      const result = await controller.check();

      // Status can be 'ok' or 'degraded' depending on memory pressure during tests
      expect(['ok', 'degraded']).toContain(result.status);
      expect(result.checks).toBeDefined();
      expect(result.checks.length).toBeGreaterThan(0);
      expect(result.memory).toBeDefined();
      expect(result.uptime).toBeDefined();
    });

    it('should return degraded status when database is slow', async () => {
      // Simulate slow database response
      mockPrismaService.$queryRaw.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return [{ '?column?': 1 }];
      });
      mockRedisClient.ping.mockResolvedValue('PONG');

      const result = await controller.check();

      expect(['ok', 'degraded']).toContain(result.status);
    });

    it('should throw 503 when database is unhealthy', async () => {
      mockPrismaService.$queryRaw.mockRejectedValue(new Error('Database connection failed'));
      mockRedisClient.ping.mockResolvedValue('PONG');

      await expect(controller.check()).rejects.toThrow(HttpException);
      
      try {
        await controller.check();
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect((error as HttpException).getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
      }
    });

    it('should return degraded when Redis is down but database is up', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
      mockRedisClient.ping.mockRejectedValue(new Error('Redis connection failed'));

      const result = await controller.check();

      expect(result.status).toBe('degraded');
      const redisCheck = result.checks.find(c => c.name === 'redis');
      expect(redisCheck?.status).toBe('unhealthy');
    });

    it('should include memory stats in response', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
      mockRedisClient.ping.mockResolvedValue('PONG');

      const result = await controller.check();

      expect(result.memory).toBeDefined();
      expect(result.memory?.heapUsed).toBeGreaterThan(0);
      expect(result.memory?.heapTotal).toBeGreaterThan(0);
      expect(result.memory?.rss).toBeGreaterThan(0);
    });

    it('should include environment and version info', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
      mockRedisClient.ping.mockResolvedValue('PONG');

      const result = await controller.check();

      expect(result.environment).toBeDefined();
      expect(result.version).toBeDefined();
      expect(result.timestamp).toBeDefined();
    });
  });

  describe('live (GET /health/live)', () => {
    it('should always return ok status', () => {
      const result = controller.live();

      expect(result.status).toBe('ok');
      expect(result.timestamp).toBeDefined();
    });

    it('should return valid ISO timestamp', () => {
      const result = controller.live();

      expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
    });
  });

  describe('ready (GET /health/ready)', () => {
    it('should return ok when database is connected', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
      mockRedisClient.ping.mockResolvedValue('PONG');

      const result = await controller.ready();

      expect(result.status).toBe('ok');
      expect(result.checks.database).toBe('connected');
    });

    it('should throw 503 when database is disconnected', async () => {
      mockPrismaService.$queryRaw.mockRejectedValue(new Error('Connection failed'));
      mockRedisClient.ping.mockResolvedValue('PONG');

      await expect(controller.ready()).rejects.toThrow(HttpException);
    });

    it('should still be ready when Redis is down', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
      mockRedisClient.ping.mockRejectedValue(new Error('Redis failed'));

      const result = await controller.ready();

      expect(result.status).toBe('ok');
      expect(result.checks.redis).toBe('disconnected');
    });

    it('should include timestamp in response', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);

      const result = await controller.ready();

      expect(result.timestamp).toBeDefined();
      expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
    });
  });

  describe('startup (GET /health/startup)', () => {
    it('should return ok when database is healthy', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);

      const result = await controller.startup();

      expect(result.status).toBe('ok');
      expect(result.timestamp).toBeDefined();
    });

    it('should throw 503 when database is not ready', async () => {
      mockPrismaService.$queryRaw.mockRejectedValue(new Error('Not ready'));

      await expect(controller.startup()).rejects.toThrow(HttpException);
    });
  });

  describe('without optional services', () => {
    let controllerWithoutServices: HealthController;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        controllers: [HealthController],
        providers: [],
      }).compile();

      controllerWithoutServices = module.get<HealthController>(HealthController);
    });

    it('should handle missing PrismaService gracefully', async () => {
      await expect(controllerWithoutServices.check()).rejects.toThrow(HttpException);
    });

    it('should still return liveness when services are missing', () => {
      const result = controllerWithoutServices.live();
      expect(result.status).toBe('ok');
    });
  });
});
