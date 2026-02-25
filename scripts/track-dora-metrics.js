/**
 * DORA Metrics Tracking Script
 * Measures: Lead Time, Deployment Frequency, MTTR, Change Failure Rate
 * 
 * Usage: node scripts/track-dora-metrics.js [--days=30]
 */

const https = require('https');

const REPO_OWNER = 'Avi-Bendetsky';
const REPO_NAME = 'Quiz-to-build';
const DEFAULT_DAYS = 30;

// Parse command line arguments
const args = process.argv.slice(2);
const daysArg = args.find(a => a.startsWith('--days='));
const DAYS = daysArg ? parseInt(daysArg.split('=')[1]) : DEFAULT_DAYS;

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

/**
 * Make GitHub API request
 */
async function githubRequest(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path,
      method: 'GET',
      headers: {
        'User-Agent': 'DORA-Metrics-Tracker',
        'Accept': 'application/vnd.github.v3+json',
        ...(GITHUB_TOKEN && { 'Authorization': `token ${GITHUB_TOKEN}` })
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve(data);
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

/**
 * Get workflow runs (deployments)
 */
async function getWorkflowRuns() {
  const since = new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000).toISOString();
  const runs = await githubRequest(
    `/repos/${REPO_OWNER}/${REPO_NAME}/actions/runs?created=>${since}&per_page=100`
  );
  return runs.workflow_runs || [];
}

/**
 * Get commits in date range
 */
async function getCommits() {
  const since = new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000).toISOString();
  const commits = await githubRequest(
    `/repos/${REPO_OWNER}/${REPO_NAME}/commits?since=${since}&per_page=100`
  );
  return Array.isArray(commits) ? commits : [];
}

/**
 * Get merged pull requests
 */
async function getMergedPRs() {
  const since = new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000).toISOString();
  const prs = await githubRequest(
    `/repos/${REPO_OWNER}/${REPO_NAME}/pulls?state=closed&sort=updated&direction=desc&per_page=100`
  );
  
  if (!Array.isArray(prs)) return [];
  
  return prs.filter(pr => 
    pr.merged_at && new Date(pr.merged_at) > new Date(since)
  );
}

/**
 * Calculate DORA Metrics
 */
async function calculateDORAMetrics() {
  console.log(`\n📊 DORA Metrics Report (Last ${DAYS} days)`);
  console.log('═'.repeat(50));
  
  const [runs, commits, prs] = await Promise.all([
    getWorkflowRuns(),
    getCommits(),
    getMergedPRs()
  ]);

  // 1. Deployment Frequency
  const deployments = runs.filter(r => 
    r.name?.toLowerCase().includes('deploy') && r.conclusion === 'success'
  );
  const deploymentFrequency = deployments.length / DAYS;
  
  console.log('\n1️⃣ Deployment Frequency');
  console.log(`   Deployments: ${deployments.length}`);
  console.log(`   Frequency: ${deploymentFrequency.toFixed(2)}/day`);
  console.log(`   Rating: ${rateDeploymentFrequency(deploymentFrequency)}`);

  // 2. Lead Time for Changes
  let totalLeadTime = 0;
  let leadTimeCount = 0;
  
  for (const pr of prs) {
    if (pr.merged_at && pr.created_at) {
      const leadTime = new Date(pr.merged_at) - new Date(pr.created_at);
      totalLeadTime += leadTime;
      leadTimeCount++;
    }
  }
  
  const avgLeadTimeHours = leadTimeCount > 0 
    ? (totalLeadTime / leadTimeCount) / (1000 * 60 * 60) 
    : 0;
  
  console.log('\n2️⃣ Lead Time for Changes');
  console.log(`   PRs Analyzed: ${leadTimeCount}`);
  console.log(`   Avg Lead Time: ${avgLeadTimeHours.toFixed(1)} hours`);
  console.log(`   Rating: ${rateLeadTime(avgLeadTimeHours)}`);

  // 3. Change Failure Rate
  const failedDeployments = runs.filter(r => 
    r.name?.toLowerCase().includes('deploy') && r.conclusion === 'failure'
  );
  const totalDeploymentAttempts = deployments.length + failedDeployments.length;
  const changeFailureRate = totalDeploymentAttempts > 0 
    ? (failedDeployments.length / totalDeploymentAttempts) * 100 
    : 0;
  
  console.log('\n3️⃣ Change Failure Rate');
  console.log(`   Failed: ${failedDeployments.length}`);
  console.log(`   Total: ${totalDeploymentAttempts}`);
  console.log(`   Rate: ${changeFailureRate.toFixed(1)}%`);
  console.log(`   Rating: ${rateChangeFailureRate(changeFailureRate)}`);

  // 4. Mean Time to Recovery (estimate from failed → successful runs)
  let recoveryTimes = [];
  const sortedRuns = runs.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  
  for (let i = 0; i < sortedRuns.length - 1; i++) {
    if (sortedRuns[i].conclusion === 'failure' && sortedRuns[i + 1].conclusion === 'success') {
      const recoveryTime = new Date(sortedRuns[i + 1].created_at) - new Date(sortedRuns[i].created_at);
      recoveryTimes.push(recoveryTime);
    }
  }
  
  const avgMTTRHours = recoveryTimes.length > 0
    ? (recoveryTimes.reduce((a, b) => a + b, 0) / recoveryTimes.length) / (1000 * 60 * 60)
    : 0;
  
  console.log('\n4️⃣ Mean Time to Recovery (MTTR)');
  console.log(`   Recovery Events: ${recoveryTimes.length}`);
  console.log(`   Avg MTTR: ${avgMTTRHours.toFixed(1)} hours`);
  console.log(`   Rating: ${rateMTTR(avgMTTRHours)}`);

  // Overall Score
  console.log('\n' + '═'.repeat(50));
  console.log('📈 OVERALL DORA PERFORMANCE');
  
  const score = calculateOverallScore(
    deploymentFrequency,
    avgLeadTimeHours,
    changeFailureRate,
    avgMTTRHours
  );
  
  console.log(`   Score: ${score.score}/100`);
  console.log(`   Rating: ${score.rating}`);
  console.log('═'.repeat(50) + '\n');
  
  return {
    deploymentFrequency,
    leadTimeHours: avgLeadTimeHours,
    changeFailureRate,
    mttrHours: avgMTTRHours,
    score: score.score,
    rating: score.rating
  };
}

// Rating functions based on DORA research
function rateDeploymentFrequency(freq) {
  if (freq >= 1) return '🏆 Elite (multiple/day)';
  if (freq >= 0.14) return '✅ High (weekly)';
  if (freq >= 0.03) return '⚠️ Medium (monthly)';
  return '❌ Low (< monthly)';
}

function rateLeadTime(hours) {
  if (hours <= 24) return '🏆 Elite (< 1 day)';
  if (hours <= 168) return '✅ High (< 1 week)';
  if (hours <= 720) return '⚠️ Medium (< 1 month)';
  return '❌ Low (> 1 month)';
}

function rateChangeFailureRate(rate) {
  if (rate <= 5) return '🏆 Elite (0-5%)';
  if (rate <= 10) return '✅ High (5-10%)';
  if (rate <= 15) return '⚠️ Medium (10-15%)';
  return '❌ Low (> 15%)';
}

function rateMTTR(hours) {
  if (hours <= 1) return '🏆 Elite (< 1 hour)';
  if (hours <= 24) return '✅ High (< 1 day)';
  if (hours <= 168) return '⚠️ Medium (< 1 week)';
  return '❌ Low (> 1 week)';
}

function calculateOverallScore(deployFreq, leadTime, failureRate, mttr) {
  // Weighted scoring
  let score = 0;
  
  // Deployment Frequency (25%)
  if (deployFreq >= 1) score += 25;
  else if (deployFreq >= 0.14) score += 20;
  else if (deployFreq >= 0.03) score += 10;
  
  // Lead Time (25%)
  if (leadTime <= 24) score += 25;
  else if (leadTime <= 168) score += 20;
  else if (leadTime <= 720) score += 10;
  
  // Change Failure Rate (25%)
  if (failureRate <= 5) score += 25;
  else if (failureRate <= 10) score += 20;
  else if (failureRate <= 15) score += 10;
  
  // MTTR (25%)
  if (mttr <= 1) score += 25;
  else if (mttr <= 24) score += 20;
  else if (mttr <= 168) score += 10;
  
  let rating;
  if (score >= 90) rating = '🏆 Elite';
  else if (score >= 70) rating = '✅ High';
  else if (score >= 50) rating = '⚠️ Medium';
  else rating = '❌ Low';
  
  return { score, rating };
}

// Run
calculateDORAMetrics()
  .then(metrics => {
    // Output JSON for CI integration
    if (process.env.CI) {
      console.log('\n::set-output name=dora-score::' + metrics.score);
      console.log('::set-output name=dora-rating::' + metrics.rating);
    }
  })
  .catch(err => {
    console.error('Error calculating DORA metrics:', err.message);
    process.exit(1);
  });
