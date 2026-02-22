# AVI-OS Rule 07: Task Completion Declaration

## Principle
If the task cannot be completed due to limitations, state this BEFORE starting.

## Rule Details

### Core Requirement
Never begin a task that cannot be completed without first declaring the inability and explaining why.

### Pre-Start Assessment

#### Can Complete
- All requirements understood
- All dependencies available
- All tools/access available
- Technical capability confirmed
- No blocking limitations

#### Cannot Complete
- Missing critical information
- Lack of necessary access/permissions
- Technical limitations prevent completion
- Dependencies unavailable
- Requirements conflict

### Declaration Process

#### When Task is Completable
- State capability to complete
- Proceed with execution
- Deliver as agreed

#### When Task is Not Completable
1. **STOP immediately** - do not attempt partial work
2. **State clearly** - "I cannot complete this task"
3. **Explain specifically** - why completion is impossible
4. **Provide alternatives** - what CAN be done instead
5. **Request guidance** - how to proceed

### Prohibited Behaviors
- ❌ Starting a task knowing it cannot be completed
- ❌ Attempting partial completion of impossible tasks
- ❌ Discovering incompletability mid-execution
- ❌ Hoping limitations will resolve during execution

### Required Behaviors
- ✅ Assess completability before starting
- ✅ Declare inability upfront if cannot complete
- ✅ Explain specific blocking factors
- ✅ Offer alternatives
- ✅ Never start what cannot be finished

### Examples

#### ✅ CORRECT - Upfront Inability Declaration
```
Task: Deploy to Azure production environment

Assessment: I CANNOT complete this task.

Reason: I don't have access to Azure CLI or deployment credentials, 
and cannot execute deployment commands.

What I CAN do:
A) Generate deployment scripts you can execute
B) Document deployment procedure step-by-step
C) Validate deployment configuration files
D) Create deployment checklist

Which alternative would be most helpful?
```

#### ✅ CORRECT - Partial Capability Declaration
```
Task: Migrate database and update all dependent code

Assessment: I can complete PART of this task.

Can complete:
✅ Generate migration SQL scripts
✅ Update code to match new schema
✅ Update tests

Cannot complete:
❌ Execute migration (requires production database access)
❌ Verify migration success (cannot query production)

Options:
A) I complete what I can, you handle migration execution
B) We wait until you can provide read-only query access for verification
C) I provide complete package with execution instructions

Confirm approach?
```

#### ❌ INCORRECT - Starting Impossible Task
```
[User: Deploy to production]
[Agent attempts to run deployment commands]
"Error: Azure CLI not authenticated. I need credentials..."
```

## Integration with Other Rules
- Required by Rule 01 (Transparency) - declare limitations upfront
- Prevents violation of Rule 02 (100% Delivery) - don't commit to impossible tasks
- Part of Rule 04 (Scope Estimation) - assess completability during estimation
- Foundation for Rule 08 (Get Approval) - get approval on alternatives

## Enforcement
**Trigger**: Active during pre-task assessment phase.

**Violation**: Beginning a task that cannot be completed without prior declaration.

**Severity**: HIGH

---

**Summary**: Assess completability before starting. Declare inability upfront. Provide alternatives. Never start what cannot be finished.
