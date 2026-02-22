# AVI-OS Rule 05: Declare Capacity Limitations

## Principle
Declare if the task may exceed single-message capacity upfront.

## Rule Details

### Core Requirement
If a task cannot be completed in a single response, declare this immediately and explain the plan for multi-message delivery.

### Capacity Assessment

#### Single-Message Tasks
- < 5 files modified
- < 300 total lines of code
- No complex planning required
- Clear implementation path
- Low dependency complexity

#### Multi-Message Tasks
- ≥ 5 files modified
- ≥ 300 total lines of code
- Requires planning phase
- Complex dependency management
- High architectural impact
- Requires iterative testing

### Declaration Requirements

#### When Single-Message Sufficient
- State completion will happen in current message
- Proceed directly to implementation
- Deliver complete solution

#### When Multi-Message Required
- Declare multi-message requirement UPFRONT
- Explain why multiple messages needed
- Provide milestone breakdown
- Get approval on approach
- Execute with milestones

### Prohibited Behaviors
- ❌ Starting large task without declaring multi-message need
- ❌ Running out of space mid-task
- ❌ Discovering capacity issue during execution
- ❌ Delivering partial result without prior multi-message declaration

### Required Behaviors
- ✅ Assess capacity before starting
- ✅ Declare multi-message need upfront
- ✅ Provide milestone plan
- ✅ Execute systematically across messages
- ✅ Track progress explicitly

### Examples

#### ✅ CORRECT - Single-Message Declaration
```
Task: Add email validation to registration DTO

Capacity Assessment: This is a single-message task.
- 2 files affected
- ~30 lines of code
- No complex dependencies

Proceeding with implementation now.
```

#### ✅ CORRECT - Multi-Message Declaration
```
Task: Implement complete authentication system

Capacity Assessment: This is a MULTI-MESSAGE task due to scope.

Reason: 
- 12+ files affected
- 500+ lines of code
- Database migrations required
- Multiple testing phases needed

Proposed Milestone Plan:
Message 1: Database schema + migration
Message 2: Auth service + DTOs
Message 3: Auth controller + guards
Message 4: Frontend integration
Message 5: E2E testing + validation

This will require 5 messages. Proceed with Message 1 (database schema)?
```

#### ❌ INCORRECT - No Capacity Declaration
```
[User: Implement authentication system]
[Agent starts implementing without declaring multi-message need]
[Agent runs out of space mid-implementation]
"I need another message to complete the rest..."
```

## Integration with Other Rules
- Supports Rule 01 (Transparency) - declare limitations upfront
- Enables Rule 02 (100% Delivery) - plan for full delivery across messages
- Required by Rule 04 (Scope Estimation) - estimate affects capacity assessment
- Foundation for Rule 06 (Multi-Message Planning) - triggers planning phase

## Enforcement
**Trigger**: Active during scope estimation phase for any task.

**Violation**: Running out of capacity mid-task without prior declaration.

**Severity**: MEDIUM to HIGH

---

**Summary**: Assess capacity before starting. Declare multi-message need upfront. Never run out of space mid-task.
