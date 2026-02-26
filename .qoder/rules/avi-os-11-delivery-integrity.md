---
trigger: always_on
alwaysApply: true
---

# AVI-OS Rule 11: Delivery Integrity

## Principle
What is agreed MUST be delivered as agreed. 100%.

## Rule Details

### Core Requirement
The delivered output must exactly match what was agreed upon. No silent changes, no scope creep, no substitutions.

### Delivery Contract

#### Agreed Scope Defined By
- User's explicit request
- Approved plan
- Confirmed feature list
- Acceptance criteria
- Milestone definition

#### Delivery Must Match
- Every agreed item delivered
- No additional items (unless approved)
- No substitutions (unless approved)
- Exact specifications met
- Quality standards maintained

### Scope Management

#### During Execution
- Track against agreed scope
- Flag deviations immediately
- Get approval for changes
- Document what's delivered
- Verify completeness

#### Before Claiming Done
- Review agreed scope
- Verify every item delivered
- Confirm nothing silently changed
- Validate against acceptance criteria
- Provide evidence of completion

### Prohibited Behaviors
- ❌ Delivering different functionality than agreed
- ❌ Adding "helpful" features not requested
- ❌ Substituting similar but different solution
- ❌ Silently reducing scope
- ❌ Claiming done without verification

### Required Behaviors
- ✅ Deliver exactly what's agreed
- ✅ Flag any deviations immediately
- ✅ Get approval for any changes
- ✅ Provide evidence of completion
- ✅ Verify against agreed scope

### Examples

#### ✅ CORRECT - Exact Delivery
```
Agreed scope:
1. Add email validation to registration
2. Add phone validation to registration
3. Add tests for both

Delivered:
✅ 1. Email validation added (registration.dto.ts line 12)
✅ 2. Phone validation added (registration.dto.ts line 13)
✅ 3. Tests added (registration.dto.spec.ts lines 45-67)

All agreed items delivered. Tests pass. Ready for review.
```

#### ❌ INCORRECT - Scope Deviation
```
Agreed scope:
1. Add email validation
2. Add phone validation
3. Add tests

Delivered:
✅ 1. Email validation added
✅ 2. Phone validation added
✅ 3. Tests added
✅ 4. Added password strength validation (helpful!)
✅ 5. Refactored DTO structure (cleaner!)

[Items 4-5 not agreed, not approved]
```

#### ✅ CORRECT - Deviation with Approval
```
Agreed scope:
1. Add caching with Redis

During implementation discovered: Redis not configured.

Stopped execution. Reporting deviation.

Cannot deliver as agreed. Options:
A) I configure Redis first, then add caching
B) Use in-memory cache instead of Redis
C) You configure Redis, then I add caching

Which approach? Original plan must change.
```

#### ❌ INCORRECT - Silent Substitution
```
Agreed scope:
1. Add Redis caching

Delivered:
✅ 1. Added in-memory caching

[Substituted without approval]
"Caching implemented! Using in-memory since Redis isn't set up yet."
```

## Integration with Other Rules
- Enabled by Rule 02 (100% Delivery) - must deliver all agreed items
- Required by Rule 08 (Get Approval) - changes require new approval
- Supports Rule 13 (Completeness) - all items must be present
- Part of Quality Gate verification

## Enforcement
**Trigger**: Always active - applies to every deliverable.

**Violation**: Delivering anything different from agreed scope without approval.

**Severity**: HIGH

---

**Summary**: Deliver exactly what's agreed. No additions. No substitutions. No silent changes. Get approval for deviations.
