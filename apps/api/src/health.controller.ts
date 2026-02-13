import { Controller, Get, HttpException, HttpStatus, Inject, Optional } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { PrismaService } from '@libs/database';

// =============================================================================
// Health Response Interfaces
// =============================================================================

interface HealthResponse {
  status: 'ok' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  environment: string;
  version: string;
  checks: DependencyCheck[];
  memory?: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
  };
}

interface DependencyCheck {
  name: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  responseTime?: number;
  message?: string;
}

interface LivenessResponse {
  status: 'ok';
  timestamp: string;
}

interface ReadinessResponse {
  status: 'ok' | 'not_ready';
  timestamp: string;
  checks: {
    database: 'connected' | 'disconnected';
    redis?: 'connected' | 'disconnected';
  };
}

// =============================================================================
// Health Controller
// =============================================================================

@ApiTags('health')
@Controller()
@SkipThrottle()
export class HealthController {
  private readonly startTime: Date;

  constructor(@Optional() @Inject(PrismaService) private readonly prisma?: PrismaService) {
    this.startTime = new Date();
  }

  // ===========================================================================
  // Full Health Check - /health
  // ===========================================================================

  @Get('health')
  @ApiOperation({
    summary: 'Full health check with dependency status',
    description: 'Returns comprehensive health status including all dependencies',
  })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  @ApiResponse({ status: 503, description: 'Service is degraded or unhealthy' })
  async check(): Promise<HealthResponse> {
    const checks: DependencyCheck[] = [];
    let overallStatus: 'ok' | 'degraded' | 'unhealthy' = 'ok';

    // Check Database
    const dbCheck = await this.checkDatabase();
    checks.push(dbCheck);
    if (dbCheck.status !== 'healthy') {
      if (dbCheck.status === 'unhealthy') {
        overallStatus = 'unhealthy';
      } else if (overallStatus === 'ok') {
        overallStatus = 'degraded';
      }
    }

    // Check Redis (if available)
    const redisCheck = await this.checkRedis();
    if (redisCheck) {
      checks.push(redisCheck);
      if (redisCheck.status !== 'healthy' && overallStatus === 'ok') {
        overallStatus = 'degraded'; // Redis is non-critical, so only degrade
      }
    }

    // Check Memory
    const memoryCheck = this.checkMemory();
    checks.push(memoryCheck);
    if (memoryCheck.status === 'unhealthy') {
      overallStatus = 'degraded';
    }

    // Check Disk (simplified - just process working dir)
    const diskCheck = this.checkDisk();
    checks.push(diskCheck);

    const memUsage = process.memoryUsage();
    const response: HealthResponse = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.APP_VERSION || '1.0.0',
      checks,
      memory: {
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        external: memUsage.external,
        rss: memUsage.rss,
      },
    };

    // Return 503 if unhealthy
    if (overallStatus === 'unhealthy') {
      throw new HttpException(response, HttpStatus.SERVICE_UNAVAILABLE);
    }

    return response;
  }

  // ===========================================================================
  // Kubernetes Liveness Probe - /health/live
  // ===========================================================================

  @Get('health/live')
  @ApiOperation({
    summary: 'Kubernetes liveness probe',
    description:
      'Simple check to verify the process is running. Should always return 200 if the process is alive.',
  })
  @ApiResponse({ status: 200, description: 'Process is alive' })
  live(): LivenessResponse {
    // Liveness check should be as simple as possible
    // It just confirms the process is running and can respond
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  // ===========================================================================
  // Kubernetes Readiness Probe - /health/ready
  // ===========================================================================

  @Get('health/ready')
  @ApiOperation({
    summary: 'Kubernetes readiness probe',
    description: 'Check if the service is ready to accept traffic. Verifies database connectivity.',
  })
  @ApiResponse({ status: 200, description: 'Service is ready' })
  @ApiResponse({ status: 503, description: 'Service is not ready' })
  async ready(): Promise<ReadinessResponse> {
    const checks = {
      database: 'disconnected' as 'connected' | 'disconnected',
      redis: undefined as 'connected' | 'disconnected' | undefined,
    };

    // Check database connection
    const dbCheck = await this.checkDatabase();
    checks.database = dbCheck.status === 'healthy' ? 'connected' : 'disconnected';

    // Check redis if available
    const redisCheck = await this.checkRedis();
    if (redisCheck) {
      checks.redis = redisCheck.status === 'healthy' ? 'connected' : 'disconnected';
    }

    // Service is ready only if database is connected
    // Redis is optional for readiness
    const isReady = checks.database === 'connected';

    const response: ReadinessResponse = {
      status: isReady ? 'ok' : 'not_ready',
      timestamp: new Date().toISOString(),
      checks,
    };

    if (!isReady) {
      throw new HttpException(response, HttpStatus.SERVICE_UNAVAILABLE);
    }

    return response;
  }

  // ===========================================================================
  // Startup Probe - /health/startup
  // ===========================================================================

  @Get('health/startup')
  @ApiOperation({
    summary: 'Kubernetes startup probe',
    description:
      'Check if the application has started successfully. Similar to readiness but used during initial startup.',
  })
  @ApiResponse({ status: 200, description: 'Application has started' })
  @ApiResponse({ status: 503, description: 'Application is still starting' })
  async startup(): Promise<{ status: 'ok' | 'starting'; timestamp: string }> {
    // Check if database is available (main dependency for startup)
    const dbCheck = await this.checkDatabase();
    const isStarted = dbCheck.status === 'healthy';

    const response = {
      status: isStarted ? ('ok' as const) : ('starting' as const),
      timestamp: new Date().toISOString(),
    };

    if (!isStarted) {
      throw new HttpException(response, HttpStatus.SERVICE_UNAVAILABLE);
    }

    return response;
  }

  // ===========================================================================
  // Private Helper Methods
  // ===========================================================================

  private async checkDatabase(): Promise<DependencyCheck> {
    const startTime = Date.now();

    try {
      if (!this.prisma) {
        return {
          name: 'database',
          status: 'unhealthy',
          message: 'Prisma service not available',
        };
      }

      // Simple query to check database connectivity
      await this.prisma.$queryRaw`SELECT 1`;
      const responseTime = Date.now() - startTime;

      // Slow database is degraded
      if (responseTime > 1000) {
        return {
          name: 'database',
          status: 'degraded',
          responseTime,
          message: 'Database responding slowly',
        };
      }

      return {
        name: 'database',
        status: 'healthy',
        responseTime,
      };
    } catch (error) {
      return {
        name: 'database',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async checkRedis(): Promise<DependencyCheck | null> {
    // Redis check would go here if RedisService is injected
    // For now, return null to indicate Redis is not configured
    // This can be enhanced when Redis is properly integrated
    return null;
  }

  private checkMemory(): DependencyCheck {
    const memUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
    const usagePercent = (heapUsedMB / heapTotalMB) * 100;

    // Thresholds
    const WARNING_THRESHOLD = 80; // 80% heap usage
    const CRITICAL_THRESHOLD = 95; // 95% heap usage

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    let message: string | undefined;

    if (usagePercent >= CRITICAL_THRESHOLD) {
      status = 'unhealthy';
      message = `Memory critical: ${heapUsedMB}MB / ${heapTotalMB}MB (${usagePercent.toFixed(1)}%)`;
    } else if (usagePercent >= WARNING_THRESHOLD) {
      status = 'degraded';
      message = `Memory warning: ${heapUsedMB}MB / ${heapTotalMB}MB (${usagePercent.toFixed(1)}%)`;
    }

    return {
      name: 'memory',
      status,
      message: message || `${heapUsedMB}MB / ${heapTotalMB}MB (${usagePercent.toFixed(1)}%)`,
    };
  }

  private checkDisk(): DependencyCheck {
    // Simple disk check - in production, you'd use a proper disk space check
    // This is a placeholder that always returns healthy
    return {
      name: 'disk',
      status: 'healthy',
      message: 'Disk space check not implemented',
    };
  }
}
