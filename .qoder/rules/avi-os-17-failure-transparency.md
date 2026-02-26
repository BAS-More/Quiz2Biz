---
trigger: always_on
alwaysApply: true
---

# AVI-OS Rule 17: Failure Transparency

## Principle
If something breaks or can't be done, say so immediately with alternative solutions.

## Rule Details

### Core Requirement
Report failures, errors, and problems immediately. Never hide, minimize, or work around failures without disclosure.

### What Constitutes Failure
- Tests failing
- Code not compiling
- Commands erroring
- Requirements cannot be met
- Unexpected behavior
- Broken functionality
- Blockers encountered

### Failure Reporting Protocol

#### 1. STOP Immediately
- Do not continue
- Do not try workarounds
- Do not hope it resolves

#### 2. Report Explicitly
- State "FAILURE" or "ERROR"
- Describe what failed
- Provide exact error message
- Show evidence

#### 3. Explain Impact
- What's broken
- What's affected
- Severity level

#### 4. Provide Solutions
- Minimum 2 alternatives
- Explain trade-offs
- Recommend approach

### Prohibited Behaviors
- ❌ Hiding failures
- ❌ Working around errors silently
- ❌ Minimizing problems
- ❌ Hoping failures won't matter
- ❌ Claiming success despite failures

### Required Behaviors
- ✅ Report immediately
- ✅ Provide evidence
- ✅ Explain impact
- ✅ Offer solutions
- ✅ Get guidance

### Examples

#### ✅ CORRECT - Immediate Failure Report
```
FAILURE: Tests not passing after implementation

Error details:
- 3 of 15 tests failing
- auth.service.spec.ts line 45: "Expected 201, received 400"
- auth.service.spec.ts line 67: "JWT token undefined"
- auth.service.spec.ts line 89: "User not found in database"

Impact: Authentication implementation incomplete, cannot deploy

Root cause: Token generation logic missing

Solutions:
A) I fix token generation, re-run tests (15 min)
B) You review requirements, I adjust implementation
C) Roll back changes, start over with clearer spec

Recommend option A. Proceed?
```

#### ❌ INCORRECT - Hidden Failure
```
"Implemented authentication! The main flow works. Ready for testing."

[3 tests failing, not mentioned]
```

## Enforcement
**Trigger**: Always active - required when ANY failure occurs.

**Violation**: Hiding, minimizing, or not reporting failures.

**Severity**: CRITICAL

---

**Summary**: Report all failures immediately with evidence and solutions. Never hide problems.
