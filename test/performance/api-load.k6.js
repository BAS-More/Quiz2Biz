/**
 * k6 API Load Tests - Quiz2Biz
 * 
 * Installation: Download k6 from https://k6.io/docs/getting-started/installation/
 * Run: k6 run test/performance/api-load.k6.js
 * 
 * Scenarios:
 * - 100 concurrent users (smoke test)
 * - 500 concurrent users (load test)
 * - 1000 concurrent users (stress test)
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const apiResponseTime = new Trend('api_response_time');
const dbQueryTime = new Trend('db_query_time');
const successfulRequests = new Counter('successful_requests');
const failedRequests = new Counter('failed_requests');

// Configuration
const BASE_URL = __ENV.API_URL || 'http://localhost:3001/api';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || 'test-token';

// Test scenarios
export const options = {
  scenarios: {
    // Smoke test - 10 users for 1 minute
    smoke: {
      executor: 'constant-vus',
      vus: 10,
      duration: '1m',
      tags: { scenario: 'smoke' },
      env: { SCENARIO: 'smoke' },
    },
    // Load test - ramp up to 100 users
    load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 50 },   // Ramp up to 50
        { duration: '3m', target: 100 },  // Ramp up to 100
        { duration: '5m', target: 100 },  // Stay at 100
        { duration: '2m', target: 0 },    // Ramp down
      ],
      tags: { scenario: 'load' },
      env: { SCENARIO: 'load' },
    },
    // Stress test - ramp up to 500 users
    stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 100 },
        { duration: '3m', target: 300 },
        { duration: '3m', target: 500 },
        { duration: '5m', target: 500 },
        { duration: '2m', target: 0 },
      ],
      tags: { scenario: 'stress' },
      env: { SCENARIO: 'stress' },
      startTime: '15m', // Start after load test
    },
    // Spike test - sudden spike to 1000 users
    spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 100 },
        { duration: '1m', target: 100 },
        { duration: '10s', target: 1000 },  // Spike!
        { duration: '3m', target: 1000 },
        { duration: '10s', target: 100 },
        { duration: '1m', target: 100 },
        { duration: '10s', target: 0 },
      ],
      tags: { scenario: 'spike' },
      env: { SCENARIO: 'spike' },
      startTime: '30m', // Start after stress test
    },
  },
  thresholds: {
    // Response time thresholds
    http_req_duration: [
      'p(95)<500',    // 95% of requests under 500ms
      'p(99)<1000',   // 99% of requests under 1000ms
      'avg<200',      // Average under 200ms
    ],
    // Error rate threshold
    errors: ['rate<0.01'], // Less than 1% errors
    // Custom thresholds
    api_response_time: ['p(95)<300'],
  },
};

// Request headers
const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${AUTH_TOKEN}`,
};

// Setup - runs once at the start
export function setup() {
  console.log(`Starting load test against ${BASE_URL}`);
  
  // Verify API is reachable
  const healthCheck = http.get(`${BASE_URL.replace('/api', '')}/health`);
  check(healthCheck, {
    'API is healthy': (r) => r.status === 200,
  });
  
  return { baseUrl: BASE_URL };
}

// Main test function
export default function(data) {
  const baseUrl = data.baseUrl;

  group('Health Check', () => {
    const response = http.get(`${baseUrl.replace('/api', '')}/health`);
    check(response, { 'health check status 200': (r) => r.status === 200 });
    apiResponseTime.add(response.timings.duration);
  });

  group('Authentication', () => {
    // Login endpoint
    const loginPayload = JSON.stringify({
      email: `testuser${__VU}@example.com`,
      password: 'TestPassword123!',
    });
    
    const loginResponse = http.post(`${baseUrl}/auth/login`, loginPayload, { headers });
    const loginSuccess = check(loginResponse, {
      'login status 200 or 401': (r) => r.status === 200 || r.status === 401,
      'login response time < 500ms': (r) => r.timings.duration < 500,
    });
    
    if (loginSuccess) {
      successfulRequests.add(1);
    } else {
      failedRequests.add(1);
      errorRate.add(1);
    }
    apiResponseTime.add(loginResponse.timings.duration);
  });

  group('Questionnaire Operations', () => {
    // Get questionnaire list
    const listResponse = http.get(`${baseUrl}/questionnaires`, { headers });
    check(listResponse, {
      'questionnaire list status 2xx': (r) => r.status >= 200 && r.status < 300,
      'questionnaire list < 300ms': (r) => r.timings.duration < 300,
    });
    apiResponseTime.add(listResponse.timings.duration);

    // Get single questionnaire (if exists)
    if (listResponse.status === 200) {
      try {
        const questionnaires = JSON.parse(listResponse.body);
        if (questionnaires && questionnaires.length > 0) {
          const questionnaireId = questionnaires[0].id;
          const detailResponse = http.get(`${baseUrl}/questionnaires/${questionnaireId}`, { headers });
          check(detailResponse, {
            'questionnaire detail status 2xx': (r) => r.status >= 200 && r.status < 300,
            'questionnaire detail < 500ms': (r) => r.timings.duration < 500,
          });
          apiResponseTime.add(detailResponse.timings.duration);
        }
      } catch (e) {
        // Ignore parse errors
      }
    }
  });

  group('Session Operations', () => {
    // Create session
    const sessionPayload = JSON.stringify({
      questionnaireId: 'test-questionnaire',
    });
    
    const createResponse = http.post(`${baseUrl}/sessions`, sessionPayload, { headers });
    check(createResponse, {
      'create session status': (r) => r.status >= 200 && r.status < 400,
      'create session < 500ms': (r) => r.timings.duration < 500,
    });
    apiResponseTime.add(createResponse.timings.duration);

    // List sessions
    const listResponse = http.get(`${baseUrl}/sessions`, { headers });
    check(listResponse, {
      'list sessions status': (r) => r.status >= 200 && r.status < 400,
      'list sessions < 300ms': (r) => r.timings.duration < 300,
    });
    apiResponseTime.add(listResponse.timings.duration);
  });

  group('Scoring Engine', () => {
    // Get heatmap data
    const heatmapResponse = http.get(`${baseUrl}/heatmap`, { headers });
    check(heatmapResponse, {
      'heatmap status': (r) => r.status >= 200 && r.status < 400,
      'heatmap < 500ms': (r) => r.timings.duration < 500,
    });
    apiResponseTime.add(heatmapResponse.timings.duration);

    // Get readiness score
    const scoreResponse = http.get(`${baseUrl}/scoring/readiness`, { headers });
    check(scoreResponse, {
      'readiness score status': (r) => r.status >= 200 && r.status < 400,
      'readiness score < 300ms': (r) => r.timings.duration < 300,
    });
    apiResponseTime.add(scoreResponse.timings.duration);
  });

  group('Document Generation', () => {
    // Generate document (complex operation)
    const docPayload = JSON.stringify({
      templateId: 'technology-roadmap',
      sessionId: 'test-session',
    });
    
    const genResponse = http.post(`${baseUrl}/documents/generate`, docPayload, { 
      headers,
      timeout: '30s', // Longer timeout for document generation
    });
    check(genResponse, {
      'document generation status': (r) => r.status >= 200 && r.status < 400,
      'document generation < 10s': (r) => r.timings.duration < 10000,
    });
    apiResponseTime.add(genResponse.timings.duration);
  });

  // Random sleep between iterations (simulates real user behavior)
  sleep(Math.random() * 3 + 1);
}

// Teardown - runs once at the end
export function teardown(data) {
  console.log('Load test completed');
  console.log(`Total successful requests: ${successfulRequests.name}`);
  console.log(`Total failed requests: ${failedRequests.name}`);
}

// Handle test summary
export function handleSummary(data) {
  return {
    'test/performance/results/summary.json': JSON.stringify(data, null, 2),
    'stdout': textSummary(data, { indent: '  ', enableColors: true }),
  };
}

// Text summary formatter
function textSummary(data, options = {}) {
  const { indent = '', enableColors = false } = options;
  const c = enableColors ? {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    reset: '\x1b[0m'
  } : { green: '', red: '', yellow: '', reset: '' };

  let summary = '\n=== LOAD TEST SUMMARY ===\n\n';
  
  const metrics = data.metrics;
  
  // HTTP request duration
  if (metrics.http_req_duration) {
    const duration = metrics.http_req_duration;
    summary += `${indent}HTTP Request Duration:\n`;
    summary += `${indent}  Average: ${duration.values.avg.toFixed(2)}ms\n`;
    summary += `${indent}  p(95): ${duration.values['p(95)'].toFixed(2)}ms\n`;
    summary += `${indent}  p(99): ${duration.values['p(99)'].toFixed(2)}ms\n`;
    summary += `${indent}  Max: ${duration.values.max.toFixed(2)}ms\n\n`;
  }
  
  // Error rate
  if (metrics.errors) {
    const errorRate = metrics.errors.values.rate * 100;
    const color = errorRate < 1 ? c.green : errorRate < 5 ? c.yellow : c.red;
    summary += `${indent}Error Rate: ${color}${errorRate.toFixed(2)}%${c.reset}\n\n`;
  }
  
  // Request counts
  if (metrics.http_reqs) {
    summary += `${indent}Total Requests: ${metrics.http_reqs.values.count}\n`;
    summary += `${indent}Requests/sec: ${metrics.http_reqs.values.rate.toFixed(2)}\n\n`;
  }
  
  // Threshold results
  summary += `${indent}Thresholds:\n`;
  for (const [name, threshold] of Object.entries(data.thresholds || {})) {
    const passed = threshold.ok;
    const color = passed ? c.green : c.red;
    const status = passed ? 'PASS' : 'FAIL';
    summary += `${indent}  ${color}${status}${c.reset} ${name}\n`;
  }
  
  return summary;
}
