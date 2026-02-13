import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';

/**
 * Memory Optimization Service
 *
 * Implements memory management best practices:
 * - Periodic GC hints for long-running sessions
 * - Memory usage monitoring with threshold alerts
 * - Request pool cleanup after batch operations
 * - WeakRef patterns for cached data
 */
@Injectable()
export class MemoryOptimizationService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MemoryOptimizationService.name);
  private gcIntervalId?: ReturnType<typeof setInterval>;
  private memoryCheckIntervalId?: ReturnType<typeof setInterval>;

  // Memory thresholds in MB
  private readonly WARNING_THRESHOLD_MB = 400;
  private readonly CRITICAL_THRESHOLD_MB = 512;
  private readonly GC_INTERVAL_MS = 60000; // 1 minute
  private readonly MEMORY_CHECK_INTERVAL_MS = 30000; // 30 seconds

  // Request cache with TTL
  private readonly requestCache = new Map<string, { data: WeakRef<object>; expiry: number }>();
  private readonly CACHE_TTL_MS = 300000; // 5 minutes

  onModuleInit(): void {
    this.startMemoryMonitoring();
    this.logger.log('Memory optimization service initialized');
  }

  onModuleDestroy(): void {
    this.stopMemoryMonitoring();
    this.logger.log('Memory optimization service destroyed');
  }

  /**
   * Start periodic memory monitoring and GC hints
   */
  private startMemoryMonitoring(): void {
    // Periodic GC hints (works if --expose-gc flag is set)
    this.gcIntervalId = setInterval(() => {
      this.performGCHint();
    }, this.GC_INTERVAL_MS);

    // Memory usage monitoring
    this.memoryCheckIntervalId = setInterval(() => {
      this.checkMemoryUsage();
    }, this.MEMORY_CHECK_INTERVAL_MS);
  }

  /**
   * Stop memory monitoring
   */
  private stopMemoryMonitoring(): void {
    if (this.gcIntervalId) {
      clearInterval(this.gcIntervalId);
    }
    if (this.memoryCheckIntervalId) {
      clearInterval(this.memoryCheckIntervalId);
    }
  }

  /**
   * Hint V8 to run garbage collection if exposed
   */
  performGCHint(): void {
    if (global.gc) {
      const before = this.getHeapUsedMB();
      global.gc();
      const after = this.getHeapUsedMB();
      this.logger.debug(
        `GC completed: ${before.toFixed(2)}MB → ${after.toFixed(2)}MB (freed ${(before - after).toFixed(2)}MB)`,
      );
    }
    // Clean expired cache entries
    this.cleanExpiredCache();
  }

  /**
   * Check current memory usage and log warnings
   */
  private checkMemoryUsage(): void {
    const memUsage = process.memoryUsage();
    const heapUsedMB = memUsage.heapUsed / (1024 * 1024);
    const heapTotalMB = memUsage.heapTotal / (1024 * 1024);
    const rssMB = memUsage.rss / (1024 * 1024);
    const usagePercent = (heapUsedMB / heapTotalMB) * 100;

    if (heapUsedMB > this.CRITICAL_THRESHOLD_MB) {
      this.logger.error(
        `CRITICAL: Memory usage at ${heapUsedMB.toFixed(2)}MB (${usagePercent.toFixed(1)}% of heap). ` +
          `RSS: ${rssMB.toFixed(2)}MB. Triggering GC.`,
      );
      this.performGCHint();
    } else if (heapUsedMB > this.WARNING_THRESHOLD_MB) {
      this.logger.warn(
        `WARNING: Memory usage at ${heapUsedMB.toFixed(2)}MB (${usagePercent.toFixed(1)}% of heap). ` +
          `RSS: ${rssMB.toFixed(2)}MB`,
      );
    } else {
      this.logger.debug(
        `Memory: ${heapUsedMB.toFixed(2)}MB heap (${usagePercent.toFixed(1)}%), RSS: ${rssMB.toFixed(2)}MB`,
      );
    }
  }

  /**
   * Get current heap used in MB
   */
  getHeapUsedMB(): number {
    return process.memoryUsage().heapUsed / (1024 * 1024);
  }

  /**
   * Get memory stats for health check endpoint
   */
  getMemoryStats(): {
    heapUsedMB: number;
    heapTotalMB: number;
    rssMB: number;
    externalMB: number;
    usagePercent: number;
    status: 'healthy' | 'warning' | 'critical';
  } {
    const memUsage = process.memoryUsage();
    const heapUsedMB = memUsage.heapUsed / (1024 * 1024);
    const heapTotalMB = memUsage.heapTotal / (1024 * 1024);
    const rssMB = memUsage.rss / (1024 * 1024);
    const externalMB = memUsage.external / (1024 * 1024);
    const usagePercent = (heapUsedMB / heapTotalMB) * 100;

    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (heapUsedMB > this.CRITICAL_THRESHOLD_MB) {
      status = 'critical';
    } else if (heapUsedMB > this.WARNING_THRESHOLD_MB) {
      status = 'warning';
    }

    return {
      heapUsedMB: Math.round(heapUsedMB * 100) / 100,
      heapTotalMB: Math.round(heapTotalMB * 100) / 100,
      rssMB: Math.round(rssMB * 100) / 100,
      externalMB: Math.round(externalMB * 100) / 100,
      usagePercent: Math.round(usagePercent * 100) / 100,
      status,
    };
  }

  /**
   * Cache a request result with TTL
   */
  cacheRequest<T extends object>(key: string, data: T): void {
    this.requestCache.set(key, {
      data: new WeakRef(data),
      expiry: Date.now() + this.CACHE_TTL_MS,
    });
  }

  /**
   * Get cached request data
   */
  getCachedRequest<T extends object>(key: string): T | null {
    const cached = this.requestCache.get(key);
    if (!cached) {
      return null;
    }

    if (Date.now() > cached.expiry) {
      this.requestCache.delete(key);
      return null;
    }

    const data = cached.data.deref();
    if (!data) {
      this.requestCache.delete(key);
      return null;
    }

    return data as T;
  }

  /**
   * Clean expired cache entries
   */
  private cleanExpiredCache(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, value] of this.requestCache.entries()) {
      if (now > value.expiry || !value.data.deref()) {
        this.requestCache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.debug(`Cleaned ${cleaned} expired cache entries`);
    }
  }

  /**
   * Clear all caches (for use after large batch operations)
   */
  clearAllCaches(): void {
    this.requestCache.clear();
    this.performGCHint();
    this.logger.log('All caches cleared and GC triggered');
  }
}
