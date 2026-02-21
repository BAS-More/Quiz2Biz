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
});
