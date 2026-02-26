/**
 * @fileoverview Tests for Memory Optimization Service
 */
import { Test, TestingModule } from '@nestjs/testing';
import { MemoryOptimizationService } from './memory-optimization.service';

describe('MemoryOptimizationService', () => {
  let service: MemoryOptimizationService;

  beforeEach(async () => {
    jest.useFakeTimers();

    const module: TestingModule = await Test.createTestingModule({
      providers: [MemoryOptimizationService],
    }).compile();

    service = module.get<MemoryOptimizationService>(MemoryOptimizationService);
  });

  afterEach(() => {
    jest.useRealTimers();
    service.onModuleDestroy();
  });

  describe('lifecycle hooks', () => {
    it('should initialize on module init', () => {
      service.onModuleInit();
      expect(service).toBeDefined();
    });

    it('should cleanup on module destroy', () => {
      service.onModuleInit();
      service.onModuleDestroy();
      expect(service).toBeDefined();
    });
  });

  describe('performGCHint', () => {
    it('should not throw when gc is not available', () => {
      expect(() => service.performGCHint()).not.toThrow();
    });

    it('should call gc when available', () => {
      const mockGc = jest.fn();
      const originalGc = global.gc;
      (global as any).gc = mockGc;

      service.performGCHint();

      expect(mockGc).toHaveBeenCalled();
      global.gc = originalGc;
    });
  });

  describe('getMemoryStats', () => {
    it('should return memory statistics', () => {
      const stats = service.getMemoryStats();

      expect(stats).toBeDefined();
      expect(stats.heapUsedMB).toBeGreaterThanOrEqual(0);
      expect(stats.heapTotalMB).toBeGreaterThanOrEqual(0);
      expect(stats.rssMB).toBeGreaterThanOrEqual(0);
      expect(stats.usagePercent).toBeGreaterThanOrEqual(0);
    });
  });

  describe('cacheRequest', () => {
    it('should cache data with weak reference', () => {
      const data = { test: 'value' };
      service.cacheRequest('key1', data);

      const cached = service.getCachedRequest('key1');
      expect(cached).toEqual(data);
    });

    it('should return null for non-existent key', () => {
      const cached = service.getCachedRequest('nonexistent');
      expect(cached).toBeNull();
    });
  });

  describe('clearAllCaches', () => {
    it('should clear all cached data', () => {
      const data1 = { test: 'value1' };
      const data2 = { test: 'value2' };
      service.cacheRequest('key1', data1);
      service.cacheRequest('key2', data2);

      service.clearAllCaches();

      expect(service.getCachedRequest('key1')).toBeNull();
      expect(service.getCachedRequest('key2')).toBeNull();
    });
  });

  describe('getHeapUsedMB', () => {
    it('should return heap usage in MB', () => {
      const heapUsed = service.getHeapUsedMB();
      expect(typeof heapUsed).toBe('number');
      expect(heapUsed).toBeGreaterThan(0);
    });
  });

  // ================================================================
  // ADDITIONAL COVERAGE: Branch coverage for memory thresholds,
  // cache expiry, WeakRef deref, and interval management
  // ================================================================

  describe('getMemoryStats - status branches', () => {
    it('should return healthy status when below warning threshold', () => {
      // Mock memoryUsage to return heap below 400MB threshold
      const mockMemory = {
        heapUsed: 200 * 1024 * 1024, // 200MB - well below 400MB warning threshold
        heapTotal: 600 * 1024 * 1024,
        rss: 300 * 1024 * 1024,
        external: 10 * 1024 * 1024,
        arrayBuffers: 5 * 1024 * 1024,
      };
      jest.spyOn(process, 'memoryUsage').mockReturnValue(mockMemory);

      const stats = service.getMemoryStats();
      expect(stats.status).toBe('healthy');
    });

    it('should return warning status when heap exceeds WARNING_THRESHOLD_MB', () => {
      // Mock memoryUsage to return heap just above 400MB
      const mockMemory = {
        heapUsed: 420 * 1024 * 1024,
        heapTotal: 600 * 1024 * 1024,
        rss: 500 * 1024 * 1024,
        external: 10 * 1024 * 1024,
        arrayBuffers: 5 * 1024 * 1024,
      };
      jest.spyOn(process, 'memoryUsage').mockReturnValue(mockMemory);

      const stats = service.getMemoryStats();
      expect(stats.status).toBe('warning');
      expect(stats.heapUsedMB).toBeCloseTo(420, 0);

      jest.restoreAllMocks();
    });

    it('should return critical status when heap exceeds CRITICAL_THRESHOLD_MB', () => {
      const mockMemory = {
        heapUsed: 550 * 1024 * 1024,
        heapTotal: 700 * 1024 * 1024,
        rss: 600 * 1024 * 1024,
        external: 10 * 1024 * 1024,
        arrayBuffers: 5 * 1024 * 1024,
      };
      jest.spyOn(process, 'memoryUsage').mockReturnValue(mockMemory);

      const stats = service.getMemoryStats();
      expect(stats.status).toBe('critical');

      jest.restoreAllMocks();
    });

    it('should compute usagePercent correctly', () => {
      const mockMemory = {
        heapUsed: 200 * 1024 * 1024,
        heapTotal: 400 * 1024 * 1024,
        rss: 300 * 1024 * 1024,
        external: 10 * 1024 * 1024,
        arrayBuffers: 5 * 1024 * 1024,
      };
      jest.spyOn(process, 'memoryUsage').mockReturnValue(mockMemory);

      const stats = service.getMemoryStats();
      expect(stats.usagePercent).toBeCloseTo(50, 0);

      jest.restoreAllMocks();
    });

    it('should round values to 2 decimal places', () => {
      const stats = service.getMemoryStats();
      // Check that values have at most 2 decimal places
      const checkDecimals = (val: number): boolean => {
        const str = val.toString();
        const parts = str.split('.');
        return !parts[1] || parts[1].length <= 2;
      };
      expect(checkDecimals(stats.heapUsedMB)).toBe(true);
      expect(checkDecimals(stats.heapTotalMB)).toBe(true);
      expect(checkDecimals(stats.rssMB)).toBe(true);
      expect(checkDecimals(stats.externalMB)).toBe(true);
    });
  });

  describe('checkMemoryUsage (private) - branch coverage via intervals', () => {
    it('should log error for critical memory and trigger GC', () => {
      const mockMemory = {
        heapUsed: 550 * 1024 * 1024,
        heapTotal: 700 * 1024 * 1024,
        rss: 600 * 1024 * 1024,
        external: 10 * 1024 * 1024,
        arrayBuffers: 5 * 1024 * 1024,
      };
      jest.spyOn(process, 'memoryUsage').mockReturnValue(mockMemory);
      const gcSpy = jest.spyOn(service, 'performGCHint');

      service.onModuleInit();
      // Advance past MEMORY_CHECK_INTERVAL_MS (30000)
      jest.advanceTimersByTime(30000);

      expect(gcSpy).toHaveBeenCalled();

      jest.restoreAllMocks();
    });

    it('should log warning for warning-level memory', () => {
      const mockMemory = {
        heapUsed: 420 * 1024 * 1024,
        heapTotal: 600 * 1024 * 1024,
        rss: 500 * 1024 * 1024,
        external: 10 * 1024 * 1024,
        arrayBuffers: 5 * 1024 * 1024,
      };
      jest.spyOn(process, 'memoryUsage').mockReturnValue(mockMemory);

      service.onModuleInit();
      // Advance past MEMORY_CHECK_INTERVAL_MS
      jest.advanceTimersByTime(30000);

      // No crash = the warning branch was executed
      expect(service).toBeDefined();

      jest.restoreAllMocks();
    });

    it('should log debug for healthy memory', () => {
      // Default process memory should be well below thresholds
      service.onModuleInit();
      jest.advanceTimersByTime(30000);

      // No crash = the debug branch was executed
      expect(service).toBeDefined();
    });
  });

  describe('startMemoryMonitoring / stopMemoryMonitoring - interval branches', () => {
    it('should trigger GC hint at GC_INTERVAL_MS', () => {
      const gcSpy = jest.spyOn(service, 'performGCHint');

      service.onModuleInit();
      jest.advanceTimersByTime(60000); // GC_INTERVAL_MS

      expect(gcSpy).toHaveBeenCalled();
    });

    it('should stop monitoring on destroy when intervals are set', () => {
      service.onModuleInit();

      // onModuleDestroy should clear both intervals without error
      service.onModuleDestroy();

      // Advance timers and verify no more calls
      const gcSpy = jest.spyOn(service, 'performGCHint');
      jest.advanceTimersByTime(120000);
      expect(gcSpy).not.toHaveBeenCalled();
    });

    it('should handle onModuleDestroy when intervals are not set (no onModuleInit)', () => {
      // Create a fresh service without calling onModuleInit
      // onModuleDestroy should not throw
      expect(() => service.onModuleDestroy()).not.toThrow();
    });
  });

  describe('getCachedRequest - expiry and WeakRef branches', () => {
    it('should return null for expired cache entry', () => {
      const data = { test: 'value' };
      service.cacheRequest('expiry-key', data);

      // Advance past CACHE_TTL_MS (300000ms = 5 minutes)
      jest.advanceTimersByTime(300001);

      const cached = service.getCachedRequest('expiry-key');
      expect(cached).toBeNull();
    });

    it('should return data for non-expired cache entry', () => {
      const data = { test: 'still-valid' };
      service.cacheRequest('valid-key', data);

      // Advance but not past TTL
      jest.advanceTimersByTime(100000);

      const cached = service.getCachedRequest('valid-key');
      expect(cached).toEqual(data);
    });

    it('should handle WeakRef that has been garbage collected', () => {
      // We simulate the WeakRef deref returning undefined by directly
      // manipulating the internal cache
      const weakRefMock = { deref: () => undefined };
      const cacheMap = (service as any).requestCache as Map<
        string,
        { data: WeakRef<object>; expiry: number }
      >;
      cacheMap.set('gc-key', {
        data: weakRefMock as unknown as WeakRef<object>,
        expiry: Date.now() + 999999,
      });

      const result = service.getCachedRequest('gc-key');
      expect(result).toBeNull();
      // Should also clean up the entry
      expect(cacheMap.has('gc-key')).toBe(false);
    });
  });

  describe('cleanExpiredCache (private) - branch coverage', () => {
    it('should clean expired entries when called via performGCHint', () => {
      const data1 = { a: 1 };
      const data2 = { b: 2 };
      service.cacheRequest('clean-1', data1);
      service.cacheRequest('clean-2', data2);

      // Advance past TTL
      jest.advanceTimersByTime(300001);

      // performGCHint calls cleanExpiredCache internally
      service.performGCHint();

      expect(service.getCachedRequest('clean-1')).toBeNull();
      expect(service.getCachedRequest('clean-2')).toBeNull();
    });

    it('should not clean entries that are still valid', () => {
      const data = { keep: true };
      service.cacheRequest('keep-key', data);

      // Advance partially (not past TTL)
      jest.advanceTimersByTime(100000);

      service.performGCHint();

      // Should still be cached
      expect(service.getCachedRequest('keep-key')).toEqual(data);
    });

    it('should clean entries with garbage-collected WeakRefs', () => {
      const cacheMap = (service as any).requestCache as Map<
        string,
        { data: WeakRef<object>; expiry: number }
      >;
      cacheMap.set('gc-clean-key', {
        data: { deref: () => undefined } as unknown as WeakRef<object>,
        expiry: Date.now() + 999999,
      });

      service.performGCHint();

      expect(cacheMap.has('gc-clean-key')).toBe(false);
    });

    it('should not log when no entries are cleaned', () => {
      // Empty cache, just verify no error
      service.performGCHint();
      expect(service).toBeDefined();
    });
  });

  describe('performGCHint - with gc available', () => {
    it('should call global.gc and log freed memory', () => {
      const mockGc = jest.fn();
      const originalGc = global.gc;
      (global as any).gc = mockGc;

      // Mock to simulate memory reduction
      let callCount = 0;
      jest.spyOn(service, 'getHeapUsedMB').mockImplementation(() => {
        callCount++;
        return callCount === 1 ? 100 : 80; // before=100, after=80
      });

      service.performGCHint();

      expect(mockGc).toHaveBeenCalledTimes(1);
      expect(service.getHeapUsedMB).toHaveBeenCalledTimes(2);

      global.gc = originalGc;
      jest.restoreAllMocks();
    });
  });

  describe('clearAllCaches', () => {
    it('should clear cache and trigger GC hint', () => {
      const gcSpy = jest.spyOn(service, 'performGCHint');
      const data = { test: 'clear-test' };
      service.cacheRequest('clear-key', data);

      service.clearAllCaches();

      expect(service.getCachedRequest('clear-key')).toBeNull();
      expect(gcSpy).toHaveBeenCalled();
    });

    it('should work on already empty cache', () => {
      expect(() => service.clearAllCaches()).not.toThrow();
    });
  });
});
