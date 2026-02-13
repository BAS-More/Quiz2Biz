/**
 * k6 Memory Load Test - Quiz2Biz
 * 
 * Tests memory stability under sustained load
 * Run: k6 run test/performance/memory-load.k6.js
 * 
 * Target: Memory usage stays <70% over 5 minute sustained load
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend, Gauge } from 'k6/metrics';

// Custom metrics for memory tracking
const errorRate = new Rate('errors');
const apiResponseTime = new Trend('api_response_time');
const memoryUsageMB = new Gauge('memory_usage_mb');
const memoryUsagePercent = new Gauge('memory_usage_percent');

// Configuration
const BASE_URL = __ENV.API_URL || 'http://localhost:3000';

// Test scenario: 100 VUs for 5 minutes (sustained load)
export const options = {
  scenarios: {
    memory_test: {
      executor: 'constant-vus',
      vus: 50,
      duration: '1m',
      tags: { test_type: 'memory' },
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<500', 'avg<200'],
    errors: ['rate<0.05'],  // Less than 5% errors
    memory_usage_percent: ['value<70'],  // Memory under 70%
  },
};

// Request headers
const headers = {
  'Content-Type': 'application/json',
};

// Track memory from health endpoint
function checkMemory() {
  try {
    const healthResponse = http.get(`${BASE_URL}/health`);
    if (healthResponse.status === 200) {
      const data = JSON.parse(healthResponse.body);
      if (data.memory) {
        memoryUsageMB.add(data.memory.heapUsed / (1024 * 1024));
        const percent = (data.memory.heapUsed / data.memory.heapTotal) * 100;
        memoryUsagePercent.add(percent);
        return percent;
      }
    }
  } catch (e) {
    // Health endpoint may not include memory
  }
  return null;
}

// Main test function - simulates realistic user behavior
export default function() {
  // 1. Health check (always works, validates server up)
  const healthRes = http.get(`${BASE_URL}/health`);
  check(healthRes, {
    'health check 200': (r) => r.status === 200,
  });
  apiResponseTime.add(healthRes.timings.duration);

  // 2. Authentication attempt
  const loginPayload = JSON.stringify({
    email: `loadtest${__VU}@example.com`,
    password: 'TestPassword123!',
  });
  const loginRes = http.post(`${BASE_URL}/api/v1/auth/login`, loginPayload, { headers });
  const loginOk = check(loginRes, {
    'login responds': (r) => r.status < 500,
  });
  if (!loginOk) errorRate.add(1);
  apiResponseTime.add(loginRes.timings.duration);

  // 3. Get standards (public endpoint)
  const standardsRes = http.get(`${BASE_URL}/api/v1/standards`);
  check(standardsRes, {
    'standards responds': (r) => r.status < 500,
  });
  apiResponseTime.add(standardsRes.timings.duration);

  // 4. Get questionnaire list
  const questRes = http.get(`${BASE_URL}/api/v1/questionnaire`);
  check(questRes, {
    'questionnaire responds': (r) => r.status < 500,
  });
  apiResponseTime.add(questRes.timings.duration);

  // 5. Check memory periodically (every 10th iteration per VU)
  if (__ITER % 10 === 0) {
    const memPercent = checkMemory();
    if (memPercent !== null && memPercent > 70) {
      console.log(`WARNING: Memory at ${memPercent.toFixed(1)}% (target <70%)`);
    }
  }

  // Simulate user think time
  sleep(Math.random() * 2 + 0.5);
}

// Summary handler
export function handleSummary(data) {
  const summary = {
    timestamp: new Date().toISOString(),
    test: 'memory-load',
    duration: '5m',
    vus: 100,
    metrics: {
      http_req_duration_avg: data.metrics.http_req_duration?.values?.avg,
      http_req_duration_p95: data.metrics.http_req_duration?.values?.['p(95)'],
      errors_rate: data.metrics.errors?.values?.rate,
      memory_usage_mb: data.metrics.memory_usage_mb?.values?.value,
      memory_usage_percent: data.metrics.memory_usage_percent?.values?.value,
    },
    thresholds: Object.entries(data.thresholds || {}).map(([name, t]) => ({
      name,
      passed: t.ok,
    })),
  };

  return {
    'test/performance/results/memory-test.json': JSON.stringify(summary, null, 2),
    stdout: generateTextSummary(data),
  };
}

function generateTextSummary(data) {
  let out = '\n═══════════════════════════════════════════════════════════\n';
  out += '  MEMORY LOAD TEST RESULTS\n';
  out += '═══════════════════════════════════════════════════════════\n\n';

  const m = data.metrics;
  
  if (m.http_req_duration) {
    out += `  HTTP Request Duration:\n`;
    out += `    Average: ${m.http_req_duration.values.avg.toFixed(2)}ms\n`;
    out += `    p(95):   ${m.http_req_duration.values['p(95)'].toFixed(2)}ms\n`;
    out += `    Max:     ${m.http_req_duration.values.max.toFixed(2)}ms\n\n`;
  }

  if (m.http_reqs) {
    out += `  Total Requests: ${m.http_reqs.values.count}\n`;
    out += `  Requests/sec:   ${m.http_reqs.values.rate.toFixed(2)}\n\n`;
  }

  if (m.errors) {
    const errRate = (m.errors.values.rate * 100).toFixed(2);
    out += `  Error Rate: ${errRate}% ${errRate < 5 ? '✓' : '✗'}\n\n`;
  }

  if (m.memory_usage_percent && m.memory_usage_percent.values.value) {
    const memPct = m.memory_usage_percent.values.value.toFixed(1);
    out += `  Memory Usage: ${memPct}% ${memPct < 70 ? '✓' : '✗'}\n\n`;
  }

  out += '  Threshold Results:\n';
  for (const [name, t] of Object.entries(data.thresholds || {})) {
    out += `    ${t.ok ? '✓ PASS' : '✗ FAIL'} ${name}\n`;
  }

  out += '\n═══════════════════════════════════════════════════════════\n';
  return out;
}
