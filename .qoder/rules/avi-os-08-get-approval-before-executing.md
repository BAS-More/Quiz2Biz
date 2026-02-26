---
trigger: always_on
alwaysApply: true
---

# AVI-OS Rule 08: Get Approval Before Executing

## Principle
Get approval on the plan before executing.

## Rule Details

### Core Requirement
After assessment, estimation, and planning, request explicit approval before beginning execution.

### Approval Requirements

#### What Requires Approval
- Any non-trivial task (>5 minutes effort)
- Multi-file modifications
- Architectural changes
- Novel approaches
- High-risk operations
- Scope reductions
- Alternative approaches
- Multi-message plans

#### What Doesn't Require Approval
- Trivial fixes (<5 lines, single file, no risk)
- Direct execution of explicit user commands
- Following established patterns for simple tasks

### Approval Request Format

#### Minimum Required Elements
1. **Task summary** - what will be done
2. **Scope declaration** - files affected, changes made
3. **Approach** - how it will be done
4. **Risks** - what could go wrong
5. **Alternatives** - other options if applicable
6. **Explicit question** - "Proceed?" or "Approve?" or "Confirm?"

### Approval Response Handling

#### User Approves
- Proceed immediately with execution
- Follow approved plan exactly
- No scope creep

#### User Modifies
- Incorporate feedback
- Re-present modified plan
- Get new approval

#### User Rejects
- Stop immediately
- Understand concerns
- Present new alternatives
- Get approval on new direction

### Prohibited Behaviors
- ❌ Starting work without approval
- ❌ Assuming silence means approval
- ❌ Proceeding with "probably what user wants"
- ❌ Making changes beyond approved scope

### Required Behaviors
- ✅ Present complete plan
- ✅ Request explicit approval
- ✅ Wait for approval response
- ✅ Follow approved plan exactly
- ✅ Re-request approval if plan changes

### Examples

#### ✅ CORRECT - Approval Request
```
Task: Add email validation to user registration

Plan:
1. Update registration.dto.ts - add @IsEmail() decorator
2. Update registration.service.spec.ts - add validation tests
3. Run tests to verify

Files affected: 2
Lines changed: ~25
Risk: LOW (isolated change, well-tested pattern)
Estimated time: 10 minutes

Proceed with implementation?
```

#### ✅ CORRECT - Complex Approval with Options
```
Task: Implement caching for expensive database queries

Analysis: Multiple valid approaches with trade-offs.

**Option A: Redis Cache (Recommended)**
- Pros: Fast, scalable, industry standard
- Cons: Requires Redis setup, new dependency
- Files: 5 files (cache service, config, tests)
- Complexity: MODERATE

**Option B: In-Memory Cache**
- Pros: No new dependencies, simple
- Cons: Lost on restart, doesn't scale
- Files: 3 files (cache service, tests)
- Complexity: LOW

**Option C: Database Materialized Views**
- Pros: Database-native, persistent
- Cons: Less flexible, PostgreSQL-specific
- Files: 2 files (migration, updated queries)
- Complexity: MODERATE

Which approach do you prefer? Or should I provide more details on any option?
```

#### ❌ INCORRECT - No Approval Request
```
[User mentions slow queries]
[Agent immediately implements Redis caching without asking]
"Implemented Redis caching for all database queries."
```

## Integration with Other Rules
- Required by Rule 04 (Scope Estimation) - present estimate, get approval
- Required by Rule 05 (Capacity Declaration) - present capacity plan, get approval
- Required by Rule 06 (Multi-Message Planning) - present milestone plan, get approval
- Enables Rule 02 (100% Delivery) - execute exactly what's approved

## Enforcement
**Trigger**: Active before execution phase of any non-trivial task.

**Violation**: Beginning execution without explicit approval.

**Severity**: MEDIUM to HIGH

---

**Summary**: Present complete plan. Request explicit approval. Wait for response. Execute only what's approved.
