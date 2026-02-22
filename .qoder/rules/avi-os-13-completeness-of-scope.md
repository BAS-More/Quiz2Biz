# AVI-OS Rule 13: Completeness of Scope

## Principle
All agreed scope items present. No silent omissions.

## Rule Details

### Core Requirement
Every item in the agreed scope must be delivered. Never silently omit any item, no matter how small.

### Scope Tracking

#### Define Scope Clearly
- List all deliverable items
- Number each item
- Document acceptance criteria
- Confirm understanding

#### Track During Execution
- Check off completed items
- Flag blocked items immediately
- Report progress against full list
- Never drop items silently

#### Verify Before Done
- Review complete scope list
- Confirm every item delivered
- Provide evidence for each
- Report any omissions explicitly

### Scope Completeness Checklist

Before claiming "done":
- [ ] Every agreed item delivered
- [ ] No items silently dropped
- [ ] All acceptance criteria met
- [ ] Evidence provided for each item
- [ ] User notified of any omissions

### Prohibited Behaviors
- ❌ Silently skipping difficult items
- ❌ Dropping items hoping user won't notice
- ❌ Claiming "done" with items missing
- ❌ Omitting items without explanation
- ❌ Focusing only on easy items

### Required Behaviors
- ✅ Deliver every agreed item
- ✅ Report blocked items immediately
- ✅ Explain any unavoidable omissions
- ✅ Get approval for scope reduction
- ✅ Provide completeness checklist

### Examples

#### ✅ CORRECT - Complete Delivery with Checklist
```
Agreed scope:
1. User registration endpoint
2. Email validation
3. Password strength validation
4. Registration email notification
5. Unit tests
6. Integration tests

Delivery:
✅ 1. User registration endpoint (POST /api/v1/auth/register)
✅ 2. Email validation (@IsEmail decorator, line 12)
✅ 3. Password strength validation (custom validator, line 15)
✅ 4. Registration email notification (auth.service.ts line 67)
✅ 5. Unit tests (auth.service.spec.ts, 12 tests, all passing)
✅ 6. Integration tests (auth.e2e.spec.ts, 4 scenarios, all passing)

All 6 scope items delivered. 100% complete.
```

#### ❌ INCORRECT - Silent Omissions
```
Agreed scope:
1. User registration endpoint
2. Email validation
3. Password strength validation
4. Registration email notification
5. Unit tests
6. Integration tests

Delivery:
✅ 1. User registration endpoint
✅ 2. Email validation
✅ 3. Password strength validation
✅ 5. Unit tests

"Registration feature implemented! Ready for testing."

[Items 4 and 6 missing, not mentioned]
```

#### ✅ CORRECT - Explicit Partial Delivery with Reason
```
Agreed scope:
1. User registration endpoint
2. Email validation
3. Password strength validation
4. Registration email notification
5. Unit tests
6. Integration tests

Delivery status:
✅ 1. User registration endpoint (completed)
✅ 2. Email validation (completed)
✅ 3. Password strength validation (completed)
❌ 4. Registration email notification (BLOCKED)
✅ 5. Unit tests (completed)
✅ 6. Integration tests (completed, except email notification tests)

Blocking issue: Email service not configured (SMTP credentials missing).

Options:
A) I provide email service setup instructions, you configure, I complete item 4
B) Mock email service for now, add real implementation later
C) Skip email notification, document as future enhancement

5 of 6 items delivered. Item 4 blocked. Awaiting guidance.
```

## Integration with Other Rules
- Implementation of Rule 02 (100% Delivery) - deliver everything
- Required by Rule 11 (Delivery Integrity) - exact scope must be met
- Part of Quality Gate - verify completeness before output
- Enables Rule 01 (Transparency) - report omissions explicitly

## Enforcement
**Trigger**: Always active - applies to every deliverable with multiple scope items.

**Violation**: Silently omitting any agreed scope item.

**Severity**: HIGH

---

**Summary**: Deliver every agreed scope item. Never skip silently. Report omissions immediately with reason.
