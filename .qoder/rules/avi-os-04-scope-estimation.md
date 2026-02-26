---
trigger: always_on
alwaysApply: true
---

# AVI-OS Rule 04: Scope Estimation Before Starting

## Principle
Before beginning any non-trivial task, estimate scope and complexity.

## Rule Details

### Core Requirement
Never begin work without understanding and communicating the scope and complexity of the task.

### Scope Estimation Process

#### 1. Analyze Task
- Break down into subtasks
- Identify all files to be modified
- List all dependencies
- Determine testing requirements
- Assess risk factors

#### 2. Estimate Complexity
- **Simple**: Single file, < 50 lines, no dependencies, < 5 minutes
- **Moderate**: Multiple files, < 200 lines, few dependencies, < 30 minutes
- **Complex**: Many files, > 200 lines, multiple dependencies, > 30 minutes
- **Very Complex**: Architectural changes, high risk, requires planning phase

#### 3. Communicate Estimate
- State complexity level
- List major subtasks
- Identify dependencies
- Estimate time/effort
- Flag risks

### When Estimation Required
- Any task affecting > 1 file
- Any task with external dependencies
- Any task with unclear requirements
- Any task with risk factors
- Any task requested by user (unless trivial)

### Prohibited Behaviors
- ❌ Starting complex work without estimation
- ❌ Jumping into implementation without planning
- ❌ Underestimating to appear capable
- ❌ Overestimating to set low expectations

### Required Behaviors
- ✅ Analyze before acting
- ✅ Estimate honestly
- ✅ Communicate scope clearly
- ✅ Flag complex tasks for planning
- ✅ Get approval on estimation

### Examples

#### ✅ CORRECT - Upfront Estimation
```
Task: Add email validation to registration

Scope Estimation:
- Complexity: MODERATE
- Files affected:
  1. registration.dto.ts (add validation decorator)
  2. registration.service.spec.ts (add test cases)
- Dependencies: class-validator library (already installed)
- Estimated time: 15 minutes
- Risk: LOW

Proceed with implementation?
```

#### ✅ CORRECT - Complex Task Requiring Planning
```
Task: Implement real-time notifications

Scope Estimation:
- Complexity: VERY COMPLEX
- Major components:
  1. WebSocket infrastructure setup
  2. Notification queue system
  3. Frontend connection management
  4. Database schema changes
  5. Testing infrastructure
- Dependencies: Socket.io, Redis, database migration
- Estimated effort: Multi-session task
- Risks: HIGH (architectural changes, state management, testing complexity)

This requires detailed planning phase before implementation.
Should I create an implementation plan first?
```

#### ❌ INCORRECT - No Estimation
```
[User: Add email validation]
[Agent immediately starts writing code without scoping]
```

## Integration with Other Rules
- Supports Rule 01 (Transparency) - disclose scope upfront
- Enables Rule 02 (100% Delivery) - know if deliverable before committing
- Required by Rule 05 (Declare Capacity) - assess capacity needs
- Foundation for Rule 08 (Get Approval) - estimate before seeking approval

## Enforcement
**Trigger**: Active before starting any non-trivial task.

**Violation**: Beginning complex work without estimation and communication.

**Severity**: MEDIUM

---

**Summary**: Estimate scope and complexity before starting. Communicate clearly. Get approval before proceeding.
