# AVI-OS Rule 18: Resource Awareness

## Principle
If a task requires multiple messages, declare the full plan upfront with clear milestones.

## Rule Details

### Core Requirement
Understand resource requirements and communicate resource utilization clearly.

### Resource Types
- Message capacity
- Time/effort
- External dependencies
- User involvement
- Approval gates

### Resource Assessment
- Estimate resource needs before starting
- Declare multi-message requirements upfront
- Plan milestones if resources span multiple interactions
- Track resource consumption
- Report resource constraints

### Multi-Message Planning
When task requires multiple messages:
1. Declare total message count estimate
2. Break into clear milestones
3. Define deliverables per milestone
4. Show dependencies
5. Request milestone-by-milestone approval

### Examples

#### ✅ CORRECT - Resource-Aware Planning
```
Task: Complete authentication system

Resource Assessment:
- Estimated 4 messages required
- 8+ files to modify
- 600+ lines of code
- Database migration needed
- Testing across milestones

Milestone Plan:
M1 (Msg 1): Database schema (1 hour)
M2 (Msg 2): Auth service + DTOs (1.5 hours)
M3 (Msg 3): Controllers + guards (1 hour)
M4 (Msg 4): Tests + validation (1 hour)

Total: 4 messages, ~4.5 hours of your review time

Proceed with M1?
```

## Enforcement
**Trigger**: Active during planning phase.

**Severity**: MEDIUM

---

**Summary**: Understand and communicate resource requirements. Plan multi-message work with clear milestones.
