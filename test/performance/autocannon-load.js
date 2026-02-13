/**
 * Autocannon API Load Tests - Quiz2Biz
 * 
 * Run: npm run test:load
 * 
 * This provides simpler Node.js-based load testing using autocannon.
 */

const autocannon = require('autocannon');
const fs = require('fs');
const path = require('path');

// Configuration
const API_URL = process.env.API_URL || 'http://localhost:3001';
const DURATION = parseInt(process.env.DURATION) || 30; // seconds
const CONNECTIONS = parseInt(process.env.CONNECTIONS) || 100;
const PIPELINING = parseInt(process.env.PIPELINING) || 10;

// Test scenarios
const scenarios = [
  {
    name: 'Health Check',
    url: '/health',
    method: 'GET',
    expectedStatus: 200,
    targetRps: 1000,
    maxLatencyP95: 50,
  },
  {
    name: 'Authentication - Login',
    url: '/api/auth/login',
    method: 'POST',
    body: JSON.stringify({ email: 'test@example.com', password: 'TestPassword123!' }),
    headers: { 'Content-Type': 'application/json' },
    expectedStatus: [200, 401],
    targetRps: 500,
    maxLatencyP95: 200,
  },
  {
    name: 'Questionnaire List',
    url: '/api/questionnaires',
    method: 'GET',
    headers: { 
      'Authorization': 'Bearer test-token',
      'Content-Type': 'application/json',
    },
    expectedStatus: [200, 401],
    targetRps: 800,
    maxLatencyP95: 150,
  },
  {
    name: 'Session List',
    url: '/api/sessions',
    method: 'GET',
    headers: { 
      'Authorization': 'Bearer test-token',
      'Content-Type': 'application/json',
    },
    expectedStatus: [200, 401],
    targetRps: 600,
    maxLatencyP95: 200,
  },
  {
    name: 'Heatmap Data',
    url: '/api/heatmap',
    method: 'GET',
    headers: { 
      'Authorization': 'Bearer test-token',
      'Content-Type': 'application/json',
    },
    expectedStatus: [200, 401],
    targetRps: 400,
    maxLatencyP95: 300,
  },
  {
    name: 'Readiness Score',
    url: '/api/scoring/readiness',
    method: 'GET',
    headers: { 
      'Authorization': 'Bearer test-token',
      'Content-Type': 'application/json',
    },
    expectedStatus: [200, 401],
    targetRps: 500,
    maxLatencyP95: 200,
  },
];

// Results storage
const results = [];

/**
 * Run a single scenario test
 */
async function runScenario(scenario) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Running: ${scenario.name}`);
  console.log(`URL: ${API_URL}${scenario.url}`);
  console.log(`Duration: ${DURATION}s, Connections: ${CONNECTIONS}`);
  console.log('='.repeat(60));

  return new Promise((resolve, reject) => {
    const instance = autocannon({
      url: `${API_URL}${scenario.url}`,
      connections: CONNECTIONS,
      pipelining: PIPELINING,
      duration: DURATION,
      method: scenario.method,
      headers: scenario.headers,
      body: scenario.body,
    });

    autocannon.track(instance, { renderProgressBar: true });

    instance.on('done', (result) => {
      const passed = checkThresholds(result, scenario);
      
      const testResult = {
        scenario: scenario.name,
        url: scenario.url,
        duration: DURATION,
        connections: CONNECTIONS,
        requests: {
          total: result.requests.total,
          average: result.requests.average,
          mean: result.requests.mean,
          stddev: result.requests.stddev,
        },
        latency: {
          average: result.latency.average,
          mean: result.latency.mean,
          stddev: result.latency.stddev,
          min: result.latency.min,
          max: result.latency.max,
          p50: result.latency.p50,
          p75: result.latency.p75,
          p90: result.latency.p90,
          p95: result.latency.p95,
          p99: result.latency.p99,
        },
        throughput: {
          average: result.throughput.average,
          mean: result.throughput.mean,
          stddev: result.throughput.stddev,
        },
        errors: result.errors,
        timeouts: result.timeouts,
        status2xx: result['2xx'],
        status4xx: result['4xx'],
        status5xx: result['5xx'],
        passed,
        thresholds: {
          targetRps: scenario.targetRps,
          actualRps: result.requests.average,
          maxLatencyP95: scenario.maxLatencyP95,
          actualLatencyP95: result.latency.p95,
        },
      };

      results.push(testResult);
      printResult(testResult);
      resolve(testResult);
    });

    instance.on('error', (err) => {
      console.error(`Error in ${scenario.name}:`, err);
      reject(err);
    });
  });
}

/**
 * Check if result meets thresholds
 */
function checkThresholds(result, scenario) {
  const checks = [];
  
  // Check error rate
  const errorRate = (result.errors + result.timeouts) / result.requests.total;
  checks.push({
    name: 'Error rate < 1%',
    passed: errorRate < 0.01,
    actual: `${(errorRate * 100).toFixed(2)}%`,
  });

  // Check RPS
  if (scenario.targetRps) {
    checks.push({
      name: `RPS >= ${scenario.targetRps * 0.8}`,
      passed: result.requests.average >= scenario.targetRps * 0.8,
      actual: result.requests.average.toFixed(2),
    });
  }

  // Check P95 latency
  if (scenario.maxLatencyP95) {
    checks.push({
      name: `P95 latency <= ${scenario.maxLatencyP95}ms`,
      passed: result.latency.p95 <= scenario.maxLatencyP95,
      actual: `${result.latency.p95}ms`,
    });
  }

  // Check average latency
  checks.push({
    name: 'Avg latency < 200ms',
    passed: result.latency.average < 200,
    actual: `${result.latency.average.toFixed(2)}ms`,
  });

  return checks.every(c => c.passed);
}

/**
 * Print result summary
 */
function printResult(result) {
  console.log('\n--- Results ---');
  console.log(`Requests/sec: ${result.requests.average.toFixed(2)} (target: ${result.thresholds.targetRps})`);
  console.log(`Latency avg: ${result.latency.average.toFixed(2)}ms`);
  console.log(`Latency P95: ${result.latency.p95}ms (max: ${result.thresholds.maxLatencyP95}ms)`);
  console.log(`Latency P99: ${result.latency.p99}ms`);
  console.log(`2xx responses: ${result.status2xx}`);
  console.log(`4xx responses: ${result.status4xx}`);
  console.log(`5xx responses: ${result.status5xx}`);
  console.log(`Errors: ${result.errors}`);
  console.log(`Timeouts: ${result.timeouts}`);
  
  const status = result.passed ? '\x1b[32mPASSED\x1b[0m' : '\x1b[31mFAILED\x1b[0m';
  console.log(`Status: ${status}`);
}

/**
 * Print final summary
 */
function printSummary() {
  console.log('\n' + '='.repeat(60));
  console.log('LOAD TEST SUMMARY');
  console.log('='.repeat(60));
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.length - passed;
  
  console.log(`Total scenarios: ${results.length}`);
  console.log(`Passed: \x1b[32m${passed}\x1b[0m`);
  console.log(`Failed: \x1b[31m${failed}\x1b[0m`);
  console.log('');
  
  results.forEach(r => {
    const status = r.passed ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m';
    console.log(`${status} ${r.scenario}`);
    console.log(`    RPS: ${r.requests.average.toFixed(0)} | P95: ${r.latency.p95}ms | Errors: ${r.errors}`);
  });
  
  return failed === 0;
}

/**
 * Save results to file
 */
function saveResults() {
  const resultsDir = path.join(__dirname, 'results');
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = path.join(resultsDir, `autocannon-${timestamp}.json`);
  
  fs.writeFileSync(filename, JSON.stringify({
    timestamp: new Date().toISOString(),
    config: {
      apiUrl: API_URL,
      duration: DURATION,
      connections: CONNECTIONS,
      pipelining: PIPELINING,
    },
    results,
    summary: {
      total: results.length,
      passed: results.filter(r => r.passed).length,
      failed: results.filter(r => !r.passed).length,
    },
  }, null, 2));
  
  console.log(`\nResults saved to: ${filename}`);
}

/**
 * Main execution
 */
async function main() {
  console.log('Quiz2Biz API Load Tests');
  console.log('=======================\n');
  console.log(`Target: ${API_URL}`);
  console.log(`Duration per scenario: ${DURATION}s`);
  console.log(`Concurrent connections: ${CONNECTIONS}`);
  console.log(`Pipelining: ${PIPELINING}`);
  
  try {
    // Run each scenario sequentially
    for (const scenario of scenarios) {
      try {
        await runScenario(scenario);
      } catch (err) {
        console.error(`Failed to run scenario ${scenario.name}:`, err.message);
        results.push({
          scenario: scenario.name,
          passed: false,
          error: err.message,
        });
      }
      
      // Short pause between scenarios
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Print and save summary
    const allPassed = printSummary();
    saveResults();
    
    // Exit with appropriate code
    process.exit(allPassed ? 0 : 1);
    
  } catch (err) {
    console.error('Load test failed:', err);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = { runScenario, scenarios };
