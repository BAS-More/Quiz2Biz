---
trigger: always_on
---

# Development Measurable Standards and Validation Protocol

## 1. ISO/IEC 5055 Compliance

### Gold Standard for Code Risk Measurement

Apply ISO/IEC 5055 as the primary standard for measuring code risk across four dimensions:

| Dimension | Target Score | Threshold |
|-----------|-------------|-----------|
| Security | ≥90% | Fail < 80% |
| Reliability | ≥90% | Fail < 80% |
| Efficiency | ≥85% | Fail < 75% |
| Maintainability | ≥85% | Fail < 65% |

### Automated Scanning Requirements

- Integrate ISO/IEC 5055 compliance scanning in CI/CD pipeline
- Run architectural-level security analysis on every build
- Block deployments failing Security or Reliability thresholds
- Generate compliance reports with specific remediation guidance

---

## 2. Cyclomatic Complexity Management

### Target Metrics

| Complexity Score | Status | Action Required |
|------------------|--------|-----------------|
| 1-10 | Excellent | None |
| 11-15 | Acceptable | Monitor |
| 16-20 | Warning | Schedule refactoring |
| >20 | Critical | Immediate refactoring required |

### Implementation Rules

- **Target:** Cyclomatic complexity score of 10-15 per module
- **Maximum:** No module may exceed 20 complexity points
- **Enforcement:** Automated complexity measurement in build pipeline
- **Flagging:** Modules exceeding 15 points flagged for refactoring review

### Tooling

- **JavaScript/TypeScript:** ESLint with complexity rules
- **Python:** Radon, pylint
- **Java:** PMD, SonarQube
- **General:** SonarQube for multi-language analysis

---

## 3. Maintainability Index (MI) Requirements

### Scoring Scale (0-100)

| MI Score | Classification | Action |
|----------|----------------|--------|
| 85-100 | Highly Maintainable | None |
| 65-84 | Moderately Maintainable | Monitor |
| 20-64 | Difficult to Maintain | **Immediate Refactoring** |
| 0-19 | Unmaintainable | **Critical - Block Deployment** |

### Mandatory Requirements

- **Minimum MI Score:** 65 (hard requirement)
- **Target MI Score:** ≥80
- **Integration:** MI measurement in build pipeline
- **Reporting:** MI scores reported after each test cycle
- **Blocking:** Code with MI < 65 blocks deployment

### Calculation Components

MI considers:
- Halstead Volume
- Cyclomatic Complexity
- Lines of Code
- Percentage of Comment Lines

---

## 4. Development Documentation Heuristics

### The 150-Line Rule

Any documentation workflow exceeding **150 lines of text** MUST include:
- Visual flow diagram (Mermaid, PlantUML, or image)
- Quick-reference summary at top
- Table of contents for navigation

**Validation:** Automated line count check with diagram presence verification

### Invariant Visibility Rule

Every document MUST explicitly state **Invariants**—rules that must always hold true:

```markdown
## Invariants
- User ID must never be null after authentication
- Session tokens expire after 24 hours
- All monetary values stored in cents (integer)
```

**Validation:** Scan for `## Invariants` section presence

### Purpose + Scope Start Rule

Every document MUST begin with:
1. **Purpose:** Why this exists (1-2 sentences)
2. **Scope:** What it covers and doesn't cover
3. **Target Audience:** Who should read this

**15-Second Rule:** If a developer can't understand why a module exists in 15 seconds, it fails.

---

## 5. Operational Readiness (DORA Metrics)

### Lead Time for Changes

| Performance Level | Lead Time Target |
|-------------------|------------------|
| Elite | < 1 hour |
| High | < 1 day |
| Medium | < 1 week |
| Low | > 1 month |

**Target:** Elite (<1 hour from commit to production-ready)

**Measurement:** Track timestamps from:
1. Code commit timestamp
2. CI pipeline completion
3. Staging deployment
4. Production-ready approval

### Rework Rate

- **Target:** < 5% of code rewritten within 48 hours of initial commit
- **Warning:** 5-10% rework rate
- **Critical:** > 10% rework rate (indicates poor requirements/documentation)

**Tracking Method:**
```bash
# Rework Detection
- Monitor git history for file changes within 48 hours of initial commit
- Flag files with >3 modifications in 48-hour window
- Calculate: (lines_modified_within_48h / total_lines_committed) * 100
```

### Pull Request (PR) Size

| PR Size (Lines) | Classification | Review Quality | Target % |
|-----------------|----------------|----------------|----------|
| < 100 | Small | Excellent | 30% |
| 100-200 | Medium | High | 40% |
| 200-300 | Acceptable | Good | 20% |
| 300-500 | Large | Reduced | 10% |
| > 500 | Too Large | **Split Required** | 0% |

**Targets:**
- **70% of PRs** should be under 200 lines
- **Maximum PR Size:** 300 lines (larger PRs must be split)
- PRs > 500 lines automatically blocked

---

## 6. Security & Compliance (Shift-Left Stack)

### NIST SSDF Integration

Implement security practices at every development stage:

| Phase | Requirements | Validation |
|-------|--------------|------------|
| **Prepare** | Security training, secure environment setup | Checklist completion |
| **Design** | Threat modeling, security requirements | Design review approval |
| **Implement** | Secure coding practices, code review | SAST scan passed |
| **Verify** | Security testing, penetration testing | DAST scan passed |
| **Release** | Final security review, vulnerability scan | No HIGH/CRITICAL issues |
| **Respond** | Incident response plan, monitoring | Monitoring active |

Mandatory practices for every development cycle:
- [ ] Secure design review completed
- [ ] Threat modeling performed
- [ ] Security code review conducted
- [ ] Vulnerability detection scan passed
- [ ] Supply chain security verified (dependency audit)

### SAST & DAST Gates

**Quality Gate Requirements:**

| Gate | Tool Examples | Blocking | Threshold |
|------|---------------|----------|-----------|
| SAST (Static) | SonarQube, Snyk, ESLint | Yes | No HIGH/CRITICAL |
| DAST (Dynamic) | OWASP ZAP, Burp Suite | Yes | No HIGH/CRITICAL |
| Dependency Scan | npm audit, Snyk | Yes | No known vulnerabilities |
| Secret Scan | GitLeaks, TruffleHog | Yes | Zero secrets detected |

**Blocking Rules:**
- **CRITICAL vulnerabilities:** Immediate block - no merge allowed
- **HIGH vulnerabilities:** Block until remediated or risk-accepted
- **MEDIUM vulnerabilities:** Warning - must document remediation plan
- **LOW vulnerabilities:** Advisory - track for future sprint

### AI Verification Policy

All AI-generated code MUST pass mandatory verification:

| Verification Step | Requirement | Pass Criteria |
|-------------------|-------------|---------------|
| Static Analysis | ESLint + TypeScript strict | Zero errors |
| Type Checking | tsc --noEmit | Zero type errors |
| Unit Test Coverage | Jest/Vitest | ≥80% coverage |
| Peer Review | Human verification | Approved by reviewer |
| Hallucination Scan | Logic validation | No undefined references |

**AI Code Verification Checklist:**
```markdown
- [ ] Code compiles without errors
- [ ] All imports resolve correctly
- [ ] No undefined variables or functions
- [ ] Logic matches intended behavior
- [ ] Unit tests pass
- [ ] Peer review completed
- [ ] No hallucinated APIs or methods
```

**Blocking:** AI-generated code without verification is **blocked from merge**

---

## 7. Sprint Validation Scoring Protocol

### Post-Sprint Validation Test

Run after each sprint/development cycle:

```bash
# Sprint Validation Report
===========================================
ISO/IEC 5055 Compliance:     __/100%
  - Security:                __/100%
  - Reliability:             __/100%
  - Efficiency:              __/100%
  - Maintainability:         __/100%

Cyclomatic Complexity:       __/100%
  - Modules ≤15:             __/__
  - Modules >15 (flagged):   __

Maintainability Index:       __/100%
  - Average MI:              __
  - Modules < 65 (critical): __

Documentation Heuristics:    __/100%
  - 150-Line Rule:           __/100%
  - Invariant Visibility:    __/100%
  - Purpose + Scope:         __/100%

DORA Metrics:                __/100%
  - Lead Time:               __ (target: <1hr)
  - Rework Rate:             __% (target: <5%)
  - PR Size Compliance:      __% (target: 70% <200 lines)

Security Gates:              __/100%
  - SAST Passed:             Yes/No (HIGH/CRIT: __)
  - DAST Passed:             Yes/No (HIGH/CRIT: __)
  - Dependency Scan:         Yes/No (vulnerabilities: __)
  - Secret Scan:             Yes/No (secrets found: __)

AI Verification:             __/100%
  - AI Code Reviewed:        __/__
  - Verification Complete:   __/__
  - Hallucinations Found:    __

OVERALL SCORE:               __/100%
PIPELINE HEALTH:             [HEALTHY/WARNING/CRITICAL]
===========================================
```

### Scoring Weights

| Category | Weight |
|----------|--------|
| ISO/IEC 5055 | 20% |
| Cyclomatic Complexity | 10% |
| Maintainability Index | 15% |
| Documentation Heuristics | 10% |
| DORA Metrics | 15% |
| Security Gates | 20% |
| AI Verification | 10% |

### Pipeline Health Classification

| Overall Score | Pipeline Health | Action |
|---------------|-----------------|--------|
| ≥90% | HEALTHY | Deploy approved |
| 80-89% | HEALTHY | Deploy with monitoring |
| 70-79% | WARNING | Review required |
| 60-69% | WARNING | Remediation needed |
| <60% | CRITICAL | Deploy blocked |

### Deployment Gate

| Overall Score | Deployment Status |
|---------------|-------------------|
| ≥90% | Approved |
| 80-89% | Approved with warnings |
| 70-79% | Requires review approval |
| <70% | **Blocked** |

---

## 8. Integration with CI/CD

### check-deployment-readiness.sh Integration

The deployment readiness script MUST validate:

1. **Code Quality Metrics**
   - Cyclomatic complexity per module
   - Maintainability Index scores
   - Test coverage percentage

2. **Security Scans**
   - SAST results (no critical/high vulnerabilities)
   - Dependency audit (no known vulnerabilities)
   - Secret scan (no exposed credentials)

3. **Documentation Compliance**
   - Invariants documented
   - Purpose statements present
   - Visual diagrams for long docs

4. **DORA Metrics**
   - PR size within limits
   - No excessive rework detected

---

**Execute validation after every sprint. Block deployment if score < 70%.**
