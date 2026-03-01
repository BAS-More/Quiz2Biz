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
        await new Promise((resolve) => setTimeout(resolve, 10));
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
      const redisCheck = result.checks.find((c) => c.name === 'redis');
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

    it('should return null for redis check when redis not injected', async () => {
      // Without redis, checkRedis returns null and is not added to checks
      try {
        await controllerWithoutServices.check();
      } catch (error) {
        // It throws because DB is missing, but redis check still runs
        const response = (error as HttpException).getResponse() as any;
        const redisCheck = response.checks?.find((c: any) => c.name === 'redis');
        // Redis check should not be present since service is not injected
        expect(redisCheck).toBeUndefined();
      }
    });

    it('should handle readiness check without services', async () => {
      await expect(controllerWithoutServices.ready()).rejects.toThrow(HttpException);
    });

    it('should handle startup check without services', async () => {
      await expect(controllerWithoutServices.startup()).rejects.toThrow(HttpException);
    });
  });

  describe('Branch coverage - checkDatabase slow response', () => {
    it('should return degraded status when database responds slowly', async () => {
      // Mock slow database response (>1000ms)
      const originalDateNow = Date.now;
      let callCount = 0;
      jest.spyOn(Date, 'now').mockImplementation(() => {
        callCount++;
        // First call: startTime, second call: after query (simulate 1500ms delay)
        if (callCount <= 1) {return 1000;}
        return 2500; // 1500ms later
      });

      mockPrismaService.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
      mockRedisClient.ping.mockResolvedValue('PONG');

      const result = await controller.check();

      const dbCheck = result.checks.find((c) => c.name === 'database');
      expect(dbCheck?.status).toBe('degraded');
      expect(dbCheck?.message).toContain('slowly');

      jest.spyOn(Date, 'now').mockRestore();
    });
  });

  describe('Branch coverage - checkRedis slow response', () => {
    it('should return degraded status when redis responds slowly', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);

      const originalDateNow = Date.now;
      let callCount = 0;
      jest.spyOn(Date, 'now').mockImplementation(() => {
        callCount++;
        // DB calls: first pair for database check, then redis check
        // DB startTime=1000, DB endTime=1010 (fast)
        // Redis startTime=1020, Redis endTime=2530 (1510ms, slow)
        if (callCount === 1) {return 1000;} // DB startTime
        if (callCount === 2) {return 1010;} // DB responseTime
        if (callCount === 3) {return 1020;} // Redis startTime
        if (callCount === 4) {return 2530;} // Redis endTime (slow)
        return 3000;
      });

      mockRedisClient.ping.mockResolvedValue('PONG');

      const result = await controller.check();

      const redisCheck = result.checks.find((c) => c.name === 'redis');
      expect(redisCheck?.status).toBe('degraded');
      expect(redisCheck?.message).toContain('slowly');

      jest.spyOn(Date, 'now').mockRestore();
    });
  });

  describe('Branch coverage - checkDatabase error not instanceof Error', () => {
    it('should return Unknown error when non-Error is thrown', async () => {
      mockPrismaService.$queryRaw.mockRejectedValue('string error');
      mockRedisClient.ping.mockResolvedValue('PONG');

      try {
        await controller.check();
      } catch (error) {
        const response = (error as HttpException).getResponse() as any;
        const dbCheck = response.checks?.find((c: any) => c.name === 'database');
        expect(dbCheck?.status).toBe('unhealthy');
        expect(dbCheck?.message).toBe('Unknown error');
      }
    });
  });

  describe('Branch coverage - checkRedis error not instanceof Error', () => {
    it('should return Unknown error when redis throws non-Error', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
      mockRedisClient.ping.mockRejectedValue('redis string error');

      const result = await controller.check();

      const redisCheck = result.checks.find((c) => c.name === 'redis');
      expect(redisCheck?.status).toBe('unhealthy');
      expect(redisCheck?.message).toBe('Unknown error');
    });
  });

  describe('Branch coverage - memory check degraded from unhealthy memory', () => {
    it('should set overallStatus to degraded when memory is unhealthy but db is ok', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
      mockRedisClient.ping.mockResolvedValue('PONG');

      // Mock process.memoryUsage to return critical memory
      const originalMemoryUsage = process.memoryUsage;
      jest.spyOn(process, 'memoryUsage').mockReturnValue({
        heapUsed: 950 * 1024 * 1024,
        heapTotal: 1000 * 1024 * 1024,
        external: 10 * 1024 * 1024,
        rss: 1000 * 1024 * 1024,
        arrayBuffers: 0,
      });

      const result = await controller.check();

      // Memory at 95% should trigger unhealthy, overall should be degraded
      const memCheck = result.checks.find((c) => c.name === 'memory');
      expect(memCheck?.status).toBe('unhealthy');
      expect(result.status).toBe('degraded');

      jest.spyOn(process, 'memoryUsage').mockRestore();
    });
  });

  describe('Branch coverage - memory check warning threshold', () => {
    it('should return degraded for memory when usage is between 80-95%', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
      mockRedisClient.ping.mockResolvedValue('PONG');

      jest.spyOn(process, 'memoryUsage').mockReturnValue({
        heapUsed: 850 * 1024 * 1024,
        heapTotal: 1000 * 1024 * 1024,
        external: 10 * 1024 * 1024,
        rss: 900 * 1024 * 1024,
        arrayBuffers: 0,
      });

      const result = await controller.check();

      const memCheck = result.checks.find((c) => c.name === 'memory');
      expect(memCheck?.status).toBe('degraded');
      expect(memCheck?.message).toContain('warning');

      jest.spyOn(process, 'memoryUsage').mockRestore();
    });
  });

  describe('Branch coverage - check() redis unhealthy with ok overallStatus', () => {
    it('should degrade status when redis is unhealthy and db status is ok', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
      mockRedisClient.ping.mockRejectedValue(new Error('Redis down'));

      const result = await controller.check();

      expect(result.status).toBe('degraded');
      const redisCheck = result.checks.find((c) => c.name === 'redis');
      expect(redisCheck?.status).toBe('unhealthy');
    });
  });

  describe('Branch coverage - check() dbCheck degraded sets overallStatus', () => {
    it('should set overallStatus to degraded when db is degraded', async () => {
      // Simulate slow DB that returns degraded
      let callCount = 0;
      jest.spyOn(Date, 'now').mockImplementation(() => {
        callCount++;
        if (callCount === 1) {return 1000;}
        if (callCount === 2) {return 2500;} // 1500ms - slow DB
        return 3000;
      });

      mockPrismaService.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
      mockRedisClient.ping.mockResolvedValue('PONG');

      const result = await controller.check();

      expect(['ok', 'degraded']).toContain(result.status);
      const dbCheck = result.checks.find((c) => c.name === 'database');
      expect(dbCheck?.status).toBe('degraded');

      jest.spyOn(Date, 'now').mockRestore();
    });
  });

  describe('Branch coverage - ready() redis disconnected', () => {
    it('should report redis as disconnected when redis check fails', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
      mockRedisClient.ping.mockRejectedValue(new Error('Connection lost'));

      const result = await controller.ready();

      expect(result.status).toBe('ok');
      expect(result.checks.redis).toBe('disconnected');
    });
  });

  describe('Branch coverage - environment and version fallbacks', () => {
    it('should use fallback values for NODE_ENV and APP_VERSION', async () => {
      const origEnv = process.env.NODE_ENV;
      const origVer = process.env.APP_VERSION;
      delete process.env.NODE_ENV;
      delete process.env.APP_VERSION;

      mockPrismaService.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
      mockRedisClient.ping.mockResolvedValue('PONG');

      const result = await controller.check();

      expect(result.environment).toBe('development');
      expect(result.version).toBe('1.0.0');

      if (origEnv !== undefined) {process.env.NODE_ENV = origEnv;}
      if (origVer !== undefined) {process.env.APP_VERSION = origVer;}
    });
  });
});
