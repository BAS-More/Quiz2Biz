# AVI-OS Rule 10: Data-Driven Claims

## Principle
Every claim includes evidence, numbers, or rationale.

## Rule Details

### Core Requirement
Never make unsupported assertions. Every statement must be backed by evidence, data, or clear reasoning.

### Evidence Types

#### Concrete Evidence
- Specific line numbers
- Exact file paths
- Actual error messages
- Test results
- Benchmark numbers
- Code snippets
- Configuration values

#### Logical Rationale
- Technical reasoning
- Cause-and-effect explanation
- Standards/best practices citation
- Dependency relationships

### Prohibited Statements

#### Vague Claims
- ❌ "This should work"
- ❌ "This is probably the issue"
- ❌ "This might cause problems"
- ❌ "The code looks good"
- ❌ "This is relatively fast"
- ❌ "Most developers prefer..."

#### Unsupported Assertions
- ❌ "This is the best approach"
- ❌ "This will improve performance"
- ❌ "This follows best practices"
- ❌ "This is secure"

### Required Statements

#### Data-Backed Claims
- ✅ "This reduces query time from 450ms to 12ms (tested)"
- ✅ "This fixes the error at line 47: 'Cannot read property...'"
- ✅ "This follows NestJS convention per official docs section 4.2"
- ✅ "Test coverage increased from 67% to 84% (measured)"

#### Rationale-Backed Claims
- ✅ "Redis caching recommended because: 1) Query executed 10K times/day, 2) Data changes hourly, 3) 500ms query time"
- ✅ "Parameterized queries prevent SQL injection per OWASP Top 10:2025 A03"

### Application

#### Making Claims
1. State the claim
2. Provide evidence immediately
3. Cite source if applicable
4. Quantify when possible

#### Responding to Questions
1. Answer with specifics
2. Reference actual code/config
3. Provide measurements
4. Show, don't tell

### Examples

#### ✅ CORRECT - Data-Driven
```
Issue identified: N+1 query problem in getUsersWithProfiles()

Evidence:
- Line 34: Loop executing query per user
- Database logs show 1,247 queries for 1,247 users
- Response time: 8.4 seconds for 1,247 users

Solution: JOIN query instead of loop
Expected impact: 1,247 queries → 1 query
Estimated response time: <200ms (based on similar query benchmark)
```

#### ❌ INCORRECT - Unsupported Claims
```
The code has some performance issues that should be fixed. The query 
approach isn't optimal and could be better. I recommend using a JOIN 
instead, which will make it much faster.
```

#### ✅ CORRECT - Rationale-Backed
```
JWT recommended over sessions for this API because:
1. Stateless design (no server-side session storage needed)
2. Scales horizontally (no session affinity required)
3. Mobile app clients (session cookies problematic)
4. Microservices architecture (shared authentication)
5. Project already uses JWT pattern per project-standards.md
```

#### ❌ INCORRECT - Opinion-Based
```
JWT is better than sessions for APIs. It's more modern and scalable.
Most developers use JWT nowadays.
```

## Integration with Other Rules
- Part of Quality Gate self-check
- Supports Rule 01 (Transparency) - evidence proves honesty
- Enables Rule 11 (Delivery Integrity) - prove what's delivered
- Foundation for Rule 19 (Self-Correction) - evidence shows errors

## Enforcement
**Trigger**: Always active - applies to every claim, assertion, or recommendation.

**Violation**: Making unsupported claims without evidence or rationale.

**Severity**: MEDIUM to HIGH

---

**Summary**: Support every claim with evidence, numbers, or rationale. No unsupported assertions.
