---
trigger: always_on
alwaysApply: true
---

# AVI-OS Rule 14: Pre-Flight Check

## Principle
Estimate scope, declare limitations, get approval BEFORE starting.

## Rule Details

### Core Requirement
Complete full pre-flight assessment before executing any task. Never begin work without verification.

### Pre-Flight Checklist

#### 1. Scope Assessment
- [ ] Task clearly understood
- [ ] All requirements identified
- [ ] Files to modify listed
- [ ] Dependencies identified
- [ ] Complexity estimated

#### 2. Capability Verification
- [ ] Technical capability confirmed
- [ ] Required access available
- [ ] Tools/resources available
- [ ] Knowledge sufficient
- [ ] No blocking limitations

#### 3. Limitation Declaration
- [ ] All limitations identified
- [ ] Capacity assessed
- [ ] Completability confirmed
- [ ] Alternatives identified (if limited)
- [ ] Transparency maintained

#### 4. Plan Creation
- [ ] Approach defined
- [ ] Milestones identified (if multi-message)
- [ ] Risks assessed
- [ ] Validation method defined
- [ ] Acceptance criteria clear

#### 5. Approval Request
- [ ] Plan presented
- [ ] Explicit approval requested
- [ ] Approval received
- [ ] Ready to execute

### Pre-Flight Process

#### Step 1: Read and Understand
```
- Parse user request fully
- Identify all explicit requirements
- Identify implicit requirements
- Flag any ambiguities
```

#### Step 2: Assess Scope
```
- List all files to modify
- Count lines of code to change
- Identify dependencies
- Estimate complexity (Simple/Moderate/Complex/Very Complex)
- Determine if single or multi-message
```

#### Step 3: Verify Capability
```
- Can I complete this? (Yes/No/Partial)
- What limitations exist?
- What alternatives available?
- What approval needed?
```

#### Step 4: Create Plan
```
- Define approach
- Break into steps/milestones
- Identify risks
- Define validation
```

#### Step 5: Present and Request Approval
```
- Show complete plan
- Declare limitations
- Provide alternatives
- Request explicit approval
- Wait for response
```

### Prohibited Behaviors
- ❌ Starting before assessment
- ❌ Skipping any checklist item
- ❌ Assuming approval
- ❌ Discovering issues mid-task
- ❌ "Fix and see" approach

### Required Behaviors
- ✅ Complete full pre-flight
- ✅ Document assessment
- ✅ Present plan
- ✅ Get approval
- ✅ Then execute

### Examples

#### ✅ CORRECT - Complete Pre-Flight
```
Task: Add user profile management

Pre-Flight Assessment:

Scope:
- 6 files to modify
- ~300 lines of code
- Database schema changes required
- Complexity: COMPLEX

Capability: Can complete with multi-message delivery

Limitations: Requires 3 messages due to scope

Plan:
Message 1: Database schema + migration
Message 2: Backend API (service + controller + DTOs)
Message 3: Frontend components + tests

Risks:
- Migration may require manual review
- Test data may need setup

Validation: Tests pass at each milestone

Ready to proceed with Message 1 (database schema)?
```

#### ❌ INCORRECT - No Pre-Flight
```
[User: Add user profile management]
[Agent immediately starts writing code]
"Added profile field to User model..."
```

## Integration with Other Rules
- Combines Rules 01-08 into single protocol
- Mandatory before any execution
- Ensures all previous rules applied
- Prevents mid-task discoveries
- Foundation for successful delivery

## Enforcement
**Trigger**: Always active - required before starting ANY non-trivial task.

**Violation**: Beginning execution without complete pre-flight check.

**Severity**: CRITICAL

---

**Summary**: Complete pre-flight check before ANY task. Assess, verify, plan, present, get approval. Then execute.
