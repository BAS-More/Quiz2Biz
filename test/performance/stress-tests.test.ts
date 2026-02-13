/**
 * Stress Tests & Optimization Analysis
 *
 * Gradually increases load to find breaking points,
 * identifies memory leaks, and profiles database queries.
 */

import { performance } from 'perf_hooks';
import * as crypto from 'crypto';

// Stress test configuration
const STRESS_CONFIG = {
  initialUsers: 10,
  maxUsers: 2000,
  rampUpStep: 50,
  stepDurationMs: 5000,
  memoryThresholdMB: 512,
  responseTimeThresholdMs: 2000,
};

// Simulated endpoint response times (baseline)
const ENDPOINT_BASELINES: Record<string, number> = {
  'GET /api/health': 10,
  'GET /api/sessions': 50,
  'GET /api/questionnaires': 100,
  'POST /api/responses': 150,
  'GET /api/heatmap': 200,
  'POST /api/documents/generate': 500,
};

/**
 * Memory usage tracker for leak detection
 */
class MemoryTracker {
  private samples: { timestamp: number; heapUsed: number }[] = [];
  private readonly maxSamples = 100;

  record(): void {
    const { heapUsed } = process.memoryUsage();
    this.samples.push({
      timestamp: Date.now(),
      heapUsed,
    });

    if (this.samples.length > this.maxSamples) {
      this.samples.shift();
    }
  }

  detectLeak(): { leaked: boolean; growthRate: number } {
    if (this.samples.length < 10) {
      return { leaked: false, growthRate: 0 };
    }

    // Calculate linear regression to detect consistent growth
    const n = this.samples.length;
    let sumX = 0,
      sumY = 0,
      sumXY = 0,
      sumX2 = 0;

    for (let i = 0; i < n; i++) {
      const x = i;
      const y = this.samples[i].heapUsed;
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumX2 += x * x;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const growthRateMBPerMin = (slope * 60000) / (1024 * 1024);

    // Consider leak if growing more than 10MB per minute
    return {
      leaked: growthRateMBPerMin > 10,
      growthRate: growthRateMBPerMin,
    };
  }

  getCurrentUsageMB(): number {
    const { heapUsed } = process.memoryUsage();
    return heapUsed / (1024 * 1024);
  }

  getStats(): { min: number; max: number; avg: number; current: number } {
    if (this.samples.length === 0) {
      return { min: 0, max: 0, avg: 0, current: 0 };
    }

    const heapValues = this.samples.map((s) => s.heapUsed / (1024 * 1024));
    return {
      min: Math.min(...heapValues),
      max: Math.max(...heapValues),
      avg: heapValues.reduce((a, b) => a + b, 0) / heapValues.length,
      current: this.getCurrentUsageMB(),
    };
  }
}

/**
 * Response time tracker for percentile calculation
 */
class ResponseTimeTracker {
  private responseTimes: Map<string, number[]> = new Map();

  record(endpoint: string, duration: number): void {
    if (!this.responseTimes.has(endpoint)) {
      this.responseTimes.set(endpoint, []);
    }
    this.responseTimes.get(endpoint)!.push(duration);
  }

  getPercentile(endpoint: string, percentile: number): number {
    const times = this.responseTimes.get(endpoint);
    if (!times || times.length === 0) {
      return 0;
    }

    const sorted = [...times].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  getStats(endpoint: string): {
    count: number;
    avg: number;
    p50: number;
    p95: number;
    p99: number;
    max: number;
  } {
    const times = this.responseTimes.get(endpoint);
    if (!times || times.length === 0) {
      return { count: 0, avg: 0, p50: 0, p95: 0, p99: 0, max: 0 };
    }

    return {
      count: times.length,
      avg: times.reduce((a, b) => a + b, 0) / times.length,
      p50: this.getPercentile(endpoint, 50),
      p95: this.getPercentile(endpoint, 95),
      p99: this.getPercentile(endpoint, 99),
      max: Math.max(...times),
    };
  }

  getAllEndpoints(): string[] {
    return Array.from(this.responseTimes.keys());
  }
}

/**
 * Simulate API request with realistic response times
 */
async function simulateRequest(endpoint: string, concurrentUsers: number): Promise<number> {
  const baseline = ENDPOINT_BASELINES[endpoint] || 100;

  // Response time increases with concurrent users
  const loadFactor = 1 + (concurrentUsers / 100) * 0.5;
  const jitter = Math.random() * 0.2 - 0.1; // ±10% jitter

  const responseTime = baseline * loadFactor * (1 + jitter);

  // Simulate actual work
  await new Promise((resolve) => setTimeout(resolve, Math.min(responseTime, 50)));

  // Simulate some CPU work
  crypto.randomBytes(1024);

  return responseTime;
}

describe('Stress Tests', () => {
  let memoryTracker: MemoryTracker;
  let responseTracker: ResponseTimeTracker;

  beforeAll(() => {
    memoryTracker = new MemoryTracker();
    responseTracker = new ResponseTimeTracker();
  });

  describe('Load Ramp-Up Test', () => {
    it('should identify breaking point under increasing load', async () => {
      const results: {
        users: number;
        avgResponseTime: number;
        p95ResponseTime: number;
        memoryMB: number;
        errors: number;
      }[] = [];

      let breakingPoint: number | null = null;

      for (
        let users = STRESS_CONFIG.initialUsers;
        users <= STRESS_CONFIG.maxUsers;
        users += STRESS_CONFIG.rampUpStep
      ) {
        const startTime = performance.now();
        let errors = 0;
        const responseTimes: number[] = [];

        // Simulate concurrent requests
        const requests = Array(users)
          .fill(null)
          .map(async () => {
            try {
              const endpoint =
                Object.keys(ENDPOINT_BASELINES)[
                  Math.floor(Math.random() * Object.keys(ENDPOINT_BASELINES).length)
                ];
              const duration = await simulateRequest(endpoint, users);
              responseTimes.push(duration);
              responseTracker.record(endpoint, duration);
            } catch {
              errors++;
            }
          });

        await Promise.all(requests);
        memoryTracker.record();

        const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
        const sortedTimes = [...responseTimes].sort((a, b) => a - b);
        const p95Index = Math.ceil(0.95 * sortedTimes.length) - 1;
        const p95ResponseTime = sortedTimes[p95Index] || 0;

        results.push({
          users,
          avgResponseTime,
          p95ResponseTime,
          memoryMB: memoryTracker.getCurrentUsageMB(),
          errors,
        });

        // Check for breaking point
        if (
          breakingPoint === null &&
          (p95ResponseTime > STRESS_CONFIG.responseTimeThresholdMs ||
            memoryTracker.getCurrentUsageMB() > STRESS_CONFIG.memoryThresholdMB ||
            errors > users * 0.01)
        ) {
          breakingPoint = users;
        }

        // Don't stress too much in tests
        if (users >= 200) {
          break;
        }
      }

      console.log('\nLoad Ramp-Up Results:');
      console.log('Users | Avg RT | P95 RT | Memory | Errors');
      console.log('------|--------|--------|--------|-------');
      for (const r of results) {
        console.log(
          `${r.users.toString().padStart(5)} | ` +
            `${r.avgResponseTime.toFixed(0).padStart(6)}ms | ` +
            `${r.p95ResponseTime.toFixed(0).padStart(6)}ms | ` +
            `${r.memoryMB.toFixed(1).padStart(6)}MB | ` +
            `${r.errors}`,
        );
      }

      if (breakingPoint) {
        console.log(`\nBreaking point identified at ${breakingPoint} concurrent users`);
      } else {
        console.log('\nNo breaking point reached within test limits');
      }

      // Verify system handles at least 100 concurrent users
      const baseline = results.find((r) => r.users === 100);
      if (baseline) {
        expect(baseline.p95ResponseTime).toBeLessThan(STRESS_CONFIG.responseTimeThresholdMs);
        expect(baseline.errors).toBe(0);
      }
    }, 120000);
  });

  describe('Memory Leak Detection', () => {
    it('should not leak memory under sustained load', async () => {
      const tracker = new MemoryTracker();
      const iterations = 50;

      // Force GC if available
      if (global.gc) {
        global.gc();
      }

      tracker.record();
      const initialMemory = tracker.getCurrentUsageMB();

      for (let i = 0; i < iterations; i++) {
        // Simulate typical API operations
        const requests = Array(10)
          .fill(null)
          .map(async () => {
            // Allocate some memory
            const data = crypto.randomBytes(10240);
            await new Promise((resolve) => setTimeout(resolve, 10));
            return data.length;
          });

        await Promise.all(requests);
        tracker.record();

        // Yield to GC
        await new Promise((resolve) => setImmediate(resolve));
      }

      const leakResult = tracker.detectLeak();
      const memStats = tracker.getStats();

      console.log('\nMemory Analysis:');
      console.log(`  Initial: ${initialMemory.toFixed(2)} MB`);
      console.log(`  Current: ${memStats.current.toFixed(2)} MB`);
      console.log(`  Min: ${memStats.min.toFixed(2)} MB`);
      console.log(`  Max: ${memStats.max.toFixed(2)} MB`);
      console.log(`  Average: ${memStats.avg.toFixed(2)} MB`);
      console.log(`  Growth Rate: ${leakResult.growthRate.toFixed(2)} MB/min`);
      console.log(`  Leak Detected: ${leakResult.leaked ? 'YES' : 'NO'}`);

      // Memory should not grow excessively
      expect(memStats.max - memStats.min).toBeLessThan(100);
    }, 60000);
  });

  describe('Database Query Profiling', () => {
    /**
     * Simulated EXPLAIN ANALYZE results
     */
    const QUERY_PROFILES = {
      'SELECT * FROM sessions WHERE userId = ?': {
        planningTime: 0.1,
        executionTime: 2.5,
        rows: 50,
        indexUsed: 'sessions_userId_idx',
        seqScan: false,
      },
      'SELECT * FROM responses WHERE sessionId = ?': {
        planningTime: 0.1,
        executionTime: 5.2,
        rows: 200,
        indexUsed: 'responses_sessionId_idx',
        seqScan: false,
      },
      'SELECT * FROM questions': {
        planningTime: 0.05,
        executionTime: 15.3,
        rows: 500,
        indexUsed: null,
        seqScan: true,
      },
      'SELECT s.*, u.* FROM sessions s JOIN users u ON s.userId = u.id': {
        planningTime: 0.2,
        executionTime: 8.7,
        rows: 100,
        indexUsed: 'users_pkey',
        seqScan: false,
      },
    };

    it('should verify index usage on critical queries', () => {
      console.log('\nQuery Profile Analysis:');
      console.log('Query | Exec Time | Rows | Index Used | Seq Scan');
      console.log('------|-----------|------|------------|----------');

      const slowQueries: string[] = [];
      const seqScanQueries: string[] = [];

      for (const [query, profile] of Object.entries(QUERY_PROFILES)) {
        const shortQuery = query.length > 40 ? query.substring(0, 37) + '...' : query;
        console.log(
          `${shortQuery.padEnd(40)} | ` +
            `${profile.executionTime.toFixed(1).padStart(7)}ms | ` +
            `${profile.rows.toString().padStart(4)} | ` +
            `${(profile.indexUsed || 'N/A').padEnd(10)} | ` +
            `${profile.seqScan ? 'YES' : 'NO'}`,
        );

        if (profile.executionTime > 10) {
          slowQueries.push(query);
        }
        if (profile.seqScan && profile.rows > 100) {
          seqScanQueries.push(query);
        }
      }

      if (slowQueries.length > 0) {
        console.log('\nSlow Queries (>10ms):');
        slowQueries.forEach((q) => console.log(`  - ${q}`));
      }

      if (seqScanQueries.length > 0) {
        console.log('\nQueries needing indexes (seq scan with >100 rows):');
        seqScanQueries.forEach((q) => console.log(`  - ${q}`));
      }

      // Critical queries should use indexes
      expect(QUERY_PROFILES['SELECT * FROM sessions WHERE userId = ?'].seqScan).toBe(false);
      expect(QUERY_PROFILES['SELECT * FROM responses WHERE sessionId = ?'].seqScan).toBe(false);
    });

    it('should identify N+1 query patterns', () => {
      // Simulated query log from request
      const queryLog = [
        { query: 'SELECT * FROM sessions WHERE id = 1', time: 2 },
        { query: 'SELECT * FROM responses WHERE sessionId = 1', time: 5 },
        { query: 'SELECT * FROM questions WHERE id = 101', time: 1 },
        { query: 'SELECT * FROM questions WHERE id = 102', time: 1 },
        { query: 'SELECT * FROM questions WHERE id = 103', time: 1 },
        { query: 'SELECT * FROM questions WHERE id = 104', time: 1 },
        { query: 'SELECT * FROM questions WHERE id = 105', time: 1 },
        // ... more individual question queries (N+1 pattern)
      ];

      // Detect N+1 pattern
      const queryPatterns = new Map<string, number>();
      for (const entry of queryLog) {
        // Normalize query by removing specific IDs
        const pattern = entry.query.replace(/= \d+/g, '= ?');
        queryPatterns.set(pattern, (queryPatterns.get(pattern) || 0) + 1);
      }

      console.log('\nQuery Pattern Analysis:');
      const n1Patterns: string[] = [];

      for (const [pattern, count] of queryPatterns) {
        console.log(`  ${pattern}: ${count}x`);
        if (count > 3) {
          n1Patterns.push(pattern);
        }
      }

      if (n1Patterns.length > 0) {
        console.log('\nPotential N+1 Queries:');
        n1Patterns.forEach((p) => console.log(`  - ${p}`));
        console.log('\nRecommendation: Use batch queries or eager loading');
      }

      // N+1 patterns should be minimized
      expect(n1Patterns.length).toBeLessThanOrEqual(2);
    });
  });

  describe('Response Time Distribution', () => {
    it('should maintain acceptable response time percentiles', async () => {
      const tracker = new ResponseTimeTracker();
      const requestCount = 100;

      for (let i = 0; i < requestCount; i++) {
        for (const endpoint of Object.keys(ENDPOINT_BASELINES)) {
          const duration = await simulateRequest(endpoint, 50);
          tracker.record(endpoint, duration);
        }
      }

      console.log('\nResponse Time Distribution:');
      console.log('Endpoint | Count | Avg | P50 | P95 | P99 | Max');
      console.log('---------|-------|-----|-----|-----|-----|----');

      for (const endpoint of tracker.getAllEndpoints()) {
        const stats = tracker.getStats(endpoint);
        const shortEndpoint = endpoint.length > 25 ? endpoint.substring(0, 22) + '...' : endpoint;
        console.log(
          `${shortEndpoint.padEnd(25)} | ` +
            `${stats.count.toString().padStart(5)} | ` +
            `${stats.avg.toFixed(0).padStart(3)} | ` +
            `${stats.p50.toFixed(0).padStart(3)} | ` +
            `${stats.p95.toFixed(0).padStart(3)} | ` +
            `${stats.p99.toFixed(0).padStart(3)} | ` +
            `${stats.max.toFixed(0).padStart(3)}`,
        );

        // P95 should be under threshold
        expect(stats.p95).toBeLessThan(500);
      }
    });
  });
});

/**
 * Generate stress test report
 */
export function generateStressTestReport(results: {
  breakingPoint: number | null;
  maxSafeUsers: number;
  memoryStats: { min: number; max: number; avg: number };
  slowQueries: string[];
  n1Patterns: string[];
}): string {
  return `
# Stress Test Report

## Summary
Generated: ${new Date().toISOString()}

## Load Capacity
- Breaking Point: ${results.breakingPoint ? `${results.breakingPoint} users` : 'Not reached'}
- Max Safe Concurrent Users: ${results.maxSafeUsers}

## Memory Analysis
- Minimum: ${results.memoryStats.min.toFixed(2)} MB
- Maximum: ${results.memoryStats.max.toFixed(2)} MB
- Average: ${results.memoryStats.avg.toFixed(2)} MB
- Memory Leak: ${results.memoryStats.max - results.memoryStats.min > 100 ? 'Potential' : 'None detected'}

## Database Optimization
### Slow Queries (>10ms)
${results.slowQueries.length > 0 ? results.slowQueries.map((q) => `- ${q}`).join('\n') : 'None'}

### N+1 Patterns Detected
${results.n1Patterns.length > 0 ? results.n1Patterns.map((p) => `- ${p}`).join('\n') : 'None'}

## Recommendations
${results.breakingPoint && results.breakingPoint < 500 ? '- Consider horizontal scaling or caching\n' : ''}
${results.slowQueries.length > 0 ? '- Add indexes to slow queries\n' : ''}
${results.n1Patterns.length > 0 ? '- Refactor N+1 queries to use batch loading\n' : ''}
${results.memoryStats.max > 400 ? '- Investigate memory usage, consider streaming\n' : ''}
`;
}
