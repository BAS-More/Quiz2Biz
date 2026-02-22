# AVI-OS Rule 06: Multi-Message Planning with Milestones

## Principle
If multi-message delivery is required, declare the plan with milestones upfront.

## Rule Details

### Core Requirement
When a task requires multiple messages, provide a complete milestone plan before beginning execution.

### Planning Requirements

#### Milestone Plan Components
1. **Total message count estimate**
2. **Milestone breakdown** - what gets delivered in each message
3. **Dependencies** - what each milestone depends on
4. **Validation points** - how to verify each milestone
5. **Approval gates** - when to wait for user confirmation

#### Milestone Definition
Each milestone must:
- Be independently verifiable
- Deliver working functionality
- Have clear acceptance criteria
- Build on previous milestones
- Not leave system in broken state

### Planning Process

#### 1. Analyze Complete Scope
- Break down into logical phases
- Identify dependency order
- Determine message boundaries
- Plan validation points

#### 2. Create Milestone Plan
- Number each milestone
- Define deliverables per milestone
- State dependencies
- Define validation method

#### 3. Present Plan
- Show complete milestone structure
- Explain rationale
- Request approval
- Proceed only after approval

### Prohibited Behaviors
- ❌ Starting multi-message work without plan
- ❌ Planning only the first message
- ❌ Deciding milestones on-the-fly
- ❌ Leaving milestones undefined
- ❌ Creating milestones that leave system broken

### Required Behaviors
- ✅ Plan all milestones upfront
- ✅ Define clear boundaries
- ✅ Ensure each milestone is independently valuable
- ✅ Get approval before starting
- ✅ Track progress against milestones
- ✅ Confirm completion of each milestone

### Examples

#### ✅ CORRECT - Complete Milestone Plan
```
Task: Implement user profile management system

Multi-Message Plan (4 messages):

**Milestone 1: Data Layer**
- Prisma schema updates for profile fields
- Database migration
- Profile repository with CRUD operations
- Unit tests for repository
- Validation: Repository tests pass, migration runs successfully

**Milestone 2: API Layer**
- Profile DTOs (create, update, response)
- Profile service with business logic
- Profile controller with endpoints
- Integration tests
- Validation: API tests pass, endpoints accessible

**Milestone 3: Frontend Components**
- Profile form component
- Profile display component
- API integration hooks
- Component tests
- Validation: Components render, forms submit

**Milestone 4: E2E Integration**
- E2E test scenarios
- Error handling
- Loading states
- Final validation
- Validation: Full user workflow works end-to-end

Dependencies:
- Milestone 2 depends on Milestone 1 (needs schema)
- Milestone 3 depends on Milestone 2 (needs API)
- Milestone 4 depends on Milestone 3 (needs UI)

Proceed with Milestone 1?
```

#### ❌ INCORRECT - No Planning
```
[User: Implement user profile management]
"I'll start with the database schema..."
[Completes schema]
"What should I work on next?"
```

## Integration with Other Rules
- Required by Rule 05 (Capacity Declaration) - triggered when multi-message needed
- Supports Rule 02 (100% Delivery) - ensures full scope covered across messages
- Enables Rule 18 (Resource Awareness) - demonstrates resource planning
- Foundation for Rule 08 (Get Approval) - plan requires approval before execution

## Enforcement
**Trigger**: Active when multi-message delivery declared.

**Violation**: Beginning multi-message work without complete milestone plan.

**Severity**: HIGH

---

**Summary**: Plan all milestones upfront for multi-message tasks. Get approval. Execute systematically. Validate each milestone.
