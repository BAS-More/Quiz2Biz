# Universal Software Testing Framework

> **A comprehensive, project-agnostic testing methodology applicable to ANY software system.**
> Copy this to any project and adapt the specific tools to your tech stack.

---

## Framework Overview

This framework covers **every possible failure mode** in software systems, organized into:

| Document | Purpose | Applicability |
|----------|---------|---------------|
| Bug Taxonomy | What can go wrong | All software |
| Testing Methodology | How to test | All software |
| Pre-Deployment | Before release | All software |
| Post-Deployment | After release | All software |

---

## Universal Applicability Matrix

### By Software Type

| Software Type | Applicable Sections |
|---------------|---------------------|
| Web Application (SPA) | All sections |
| Web Application (MPA) | All sections |
| Mobile App (Native) | All except browser-specific |
| Mobile App (Hybrid) | All sections |
| Desktop Application | All except browser/mobile-specific |
| API/Backend Service | All except UI-specific |
| Microservices | All sections |
| CLI Tool | Core + Error Handling + Security |
| Library/Package | Core + Contract + Unit |
| Database/Data Pipeline | Data Integrity + Performance |
| IoT/Embedded | Core + Performance + Security |

### By Tech Stack

| Stack | Adapt These Tools |
|-------|-------------------|
| **JavaScript/Node.js** | Jest, Mocha, Playwright, k6 |
| **Python** | pytest, locust, Selenium |
| **Java** | JUnit, Gatling, Selenium |
| **Go** | go test, vegeta, chromedp |
| **Ruby** | RSpec, Capybara, JMeter |
| **.NET/C#** | xUnit, NUnit, Playwright |
| **PHP** | PHPUnit, Codeception |
| **Rust** | cargo test, criterion |
| **Mobile (React Native)** | Jest, Detox, Appium |
| **Mobile (Flutter)** | flutter_test, integration_test |
| **Mobile (Swift/Kotlin)** | XCTest, Espresso |

---

## Core Testing Categories (Universal)

### 1. Data & Type Safety
Applies to: **ALL SOFTWARE**

```
□ Type coercion handled correctly
□ Null/undefined/nil handled
□ Empty values handled
□ Encoding (UTF-8, ASCII) correct
□ Serialization/deserialization works
□ Date/time handling correct
□ Numeric precision maintained
□ Large numbers handled
□ Special characters handled
```

### 2. Input Validation
Applies to: **ALL SOFTWARE**

```
□ Required fields validated
□ Field types validated
□ Field lengths validated
□ Field formats validated
□ Injection attacks prevented (SQL, NoSQL, Command, etc.)
□ XSS prevented (for web)
□ Path traversal prevented
□ Malformed input handled gracefully
□ Oversized input rejected
```

### 3. Error Handling
Applies to: **ALL SOFTWARE**

```
□ All errors caught (no unhandled exceptions)
□ Error messages user-friendly
□ Error messages don't leak internals
□ Error logging complete
□ Error recovery works
□ Graceful degradation implemented
□ Retry logic works
□ Timeout handling works
□ Resource cleanup on error
```

### 4. State Management
Applies to: **ALL SOFTWARE**

```
□ State initialization correct
□ State transitions valid
□ State persistence works
□ State synchronization works
□ Concurrent state access safe
□ State cleanup on exit
□ Undo/redo works (if applicable)
□ State recovery after crash
```

### 5. Security
Applies to: **ALL SOFTWARE**

```
□ Authentication implemented correctly
□ Authorization enforced
□ Secrets not hardcoded
□ Secrets not logged
□ Encryption used appropriately
□ Secure communication (TLS)
□ Input sanitization complete
□ Output encoding correct
□ Access control enforced
□ Audit logging enabled
```

### 6. Performance
Applies to: **ALL SOFTWARE**

```
□ Response time acceptable
□ Memory usage stable (no leaks)
□ CPU usage acceptable
□ Disk I/O optimized
□ Network usage optimized
□ Concurrency handled
□ Scalability tested
□ Resource limits respected
□ Caching effective
```

### 7. Reliability
Applies to: **ALL SOFTWARE**

```
□ Idempotency maintained
□ Transactions atomic
□ Data consistency maintained
□ Failover works
□ Recovery works
□ Backup/restore works
□ High availability tested
□ Disaster recovery tested
```

### 8. Integration
Applies to: **ALL SOFTWARE WITH DEPENDENCIES**

```
□ API contracts honored
□ External services handled gracefully
□ Dependency failures handled
□ Timeouts configured
□ Retries implemented
□ Circuit breakers work
□ Fallbacks work
□ Version compatibility maintained
```

---

## Pre-Deployment Checklist (Universal)

### Phase 1: Code Quality
```
□ All linting rules pass
□ All type checks pass
□ Code coverage meets threshold (≥80%)
□ No critical security vulnerabilities
□ No deprecated dependencies
□ No hardcoded secrets
□ No debug code in production build
```

### Phase 2: Testing
```
□ Unit tests pass (100%)
□ Integration tests pass (100%)
□ Contract tests pass (100%)
□ End-to-end tests pass (100%)
□ Security tests pass (100%)
□ Performance tests within thresholds
□ Accessibility tests pass (if UI)
```

### Phase 3: Documentation
```
□ API documentation complete
□ Deployment procedure documented
□ Rollback procedure documented
□ Configuration documented
□ Changelog updated
□ Version number updated
```

### Phase 4: Infrastructure
```
□ Target environment ready
□ Configuration verified
□ Secrets deployed
□ Database migrations ready
□ Rollback plan tested
□ Monitoring configured
□ Alerts configured
```

### Phase 5: Approval
```
□ All checks passed TWICE consecutively
□ No manual overrides
□ Stakeholder sign-off obtained
□ Deployment window confirmed
```

---

## Post-Deployment Checklist (Universal)

### Immediate (0-5 minutes)
```
□ Deployment completed without errors
□ Application started successfully
□ Health check passing
□ Basic functionality works
□ No critical errors in logs
```

### Short-term (5 minutes - 1 hour)
```
□ All features functional
□ Performance within baseline ±20%
□ Error rate < 0.1%
□ No new error types
□ Dependencies connected
```

### Medium-term (1-24 hours)
```
□ User flows completing successfully
□ Business metrics normal
□ No user complaints spike
□ Resource usage stable
□ No memory leaks detected
```

### Long-term (1-7 days)
```
□ Error rate trending stable/down
□ Performance trending stable
□ User satisfaction maintained
□ No regression detected
□ Capacity adequate
```

---

## Adapting to Your Stack

### Step 1: Map Tools

Replace generic tool references with your stack:

| Generic | JavaScript | Python | Java | Go |
|---------|------------|--------|------|-----|
| Unit Test | Jest/Mocha | pytest | JUnit | go test |
| E2E Test | Playwright | Selenium | Selenium | chromedp |
| Load Test | k6 | locust | Gatling | vegeta |
| Security Scan | npm audit | bandit | OWASP DC | gosec |
| Linter | ESLint | pylint | Checkstyle | golint |
| Type Check | TypeScript | mypy | javac | go build |

### Step 2: Adjust Thresholds

Set appropriate values for your context:

| Metric | Startup | Scale-up | Enterprise |
|--------|---------|----------|------------|
| Code coverage | ≥70% | ≥80% | ≥90% |
| Response time p95 | <1s | <500ms | <200ms |
| Error rate | <1% | <0.1% | <0.01% |
| Uptime SLA | 99% | 99.9% | 99.99% |

### Step 3: Select Applicable Sections

Not everything applies to every project:

| If your project has... | Include these sections |
|------------------------|------------------------|
| Web UI | Browser, Responsive, Accessibility |
| Mobile UI | Mobile-specific, Accessibility |
| API | Contract, Integration, Performance |
| Database | Data Integrity, Transactions |
| Authentication | All Security sections |
| Payment | Transaction Integrity, PCI compliance |
| Personal data | GDPR, Data Protection |
| High traffic | Load, Stress, Scaling |

---

## Quick Start Template

Copy this for any new project:

```markdown
# Project Testing Checklist

## Pre-Deployment
- [ ] Code Quality
  - [ ] Linting: `npm run lint` / `pylint` / etc.
  - [ ] Types: `npm run type-check` / `mypy` / etc.
  - [ ] Security: `npm audit` / `bandit` / etc.
  
- [ ] Testing
  - [ ] Unit: `npm test` / `pytest` / etc.
  - [ ] Integration: `npm run test:integration`
  - [ ] E2E: `npm run test:e2e`
  
- [ ] Performance
  - [ ] Load test: `k6 run load.js` / `locust` / etc.
  
- [ ] Documentation
  - [ ] README updated
  - [ ] CHANGELOG updated
  - [ ] API docs updated

## Post-Deployment
- [ ] Health check passing
- [ ] Smoke tests passing
- [ ] Error rate < threshold
- [ ] Response time < threshold
- [ ] Monitoring active
- [ ] Alerts configured
```

---

## Language-Specific Implementations

### JavaScript/TypeScript
```json
{
  "scripts": {
    "test": "jest",
    "test:unit": "jest --testPathPattern=unit",
    "test:integration": "jest --testPathPattern=integration",
    "test:e2e": "playwright test",
    "test:security": "npm audit && snyk test",
    "test:performance": "k6 run load-test.js",
    "test:accessibility": "pa11y-ci",
    "test:all": "npm run test:unit && npm run test:integration && npm run test:e2e",
    "lint": "eslint . --ext .ts,.tsx",
    "type-check": "tsc --noEmit"
  }
}
```

### Python
```ini
# setup.cfg or pyproject.toml
[tool:pytest]
testpaths = tests
addopts = --cov=src --cov-report=html

# Makefile
test:
	pytest tests/unit
test-integration:
	pytest tests/integration
test-e2e:
	pytest tests/e2e
test-security:
	bandit -r src/ && safety check
test-all:
	make test test-integration test-e2e test-security
lint:
	pylint src/ && flake8 src/
type-check:
	mypy src/
```

### Java
```xml
<!-- pom.xml -->
<plugins>
  <plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-surefire-plugin</artifactId>
    <configuration>
      <includes>
        <include>**/*Test.java</include>
      </includes>
    </configuration>
  </plugin>
  <plugin>
    <groupId>org.jacoco</groupId>
    <artifactId>jacoco-maven-plugin</artifactId>
  </plugin>
</plugins>

<!-- Commands -->
<!-- mvn test                    # Unit tests -->
<!-- mvn verify                  # Integration tests -->
<!-- mvn dependency-check:check  # Security scan -->
```

### Go
```makefile
# Makefile
.PHONY: test test-unit test-integration test-e2e test-security lint

test-unit:
	go test -v -race -cover ./...

test-integration:
	go test -v -tags=integration ./...

test-e2e:
	go test -v -tags=e2e ./...

test-security:
	gosec ./...
	govulncheck ./...

lint:
	golangci-lint run

test-all: lint test-unit test-integration test-security
```

---

## CI/CD Pipeline Template (Universal)

```yaml
# .github/workflows/test.yml (GitHub Actions)
name: Universal Test Pipeline

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      # Adapt to your stack
      - name: Setup
        run: |
          # Node: npm ci
          # Python: pip install -r requirements.txt
          # Java: mvn dependency:resolve
          # Go: go mod download
          
      - name: Lint
        run: npm run lint  # Adapt command
        
      - name: Type Check
        run: npm run type-check  # Adapt command
        
      - name: Security Scan
        run: npm audit  # Adapt command
        
      - name: Unit Tests
        run: npm run test:unit  # Adapt command
        
      - name: Integration Tests
        run: npm run test:integration  # Adapt command
        
      - name: E2E Tests
        run: npm run test:e2e  # Adapt command
        
      - name: Performance Tests
        run: npm run test:performance  # Adapt command
        
      - name: Upload Coverage
        uses: codecov/codecov-action@v3
```

---

## Summary

This framework is **technology-agnostic** and covers:

- **21 bug categories** (data, API, auth, database, cache, concurrency, state, time, input, output, files, errors, security, business logic, performance, integrations, deployment, observability, accessibility, mobile, i18n)
- **10 pre-deployment phases** (readiness, static analysis, unit, integration, contract, E2E, security, performance, accessibility, final checklist)
- **10 post-deployment phases** (immediate, functional, performance, error monitoring, user impact, security, database, infrastructure, long-term, sign-off)

**Use it for:**
- Web apps (any framework)
- Mobile apps (any platform)
- Backend services (any language)
- APIs (REST, GraphQL, gRPC)
- Microservices
- Desktop apps
- CLI tools
- Libraries/packages
- Data pipelines

**The key principle:** Test at boundaries where systems meet - that's where most bugs hide.
