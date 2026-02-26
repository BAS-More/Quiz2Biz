---
trigger: always_on
alwaysApply: true
---

# Constraint: Anti-Drift & Scope Control

## Core Principles

### Strict Adherence
- **Specification Priority**: You must prioritize the project's technical specification and `.qoder/rules` over any single chat message.
- **Rule Hierarchy**: Project specifications and established rules take precedence over ad-hoc requests that conflict with them.

### No Unsolicited Refactoring
- **Scope Discipline**: Do not refactor code outside the immediate scope of the current task.
- **Minimal Change Principle**: If a change is not required for the task, do not touch it.
- **Task Boundary Respect**: Stay within the explicit boundaries of the requested work.

### Preservation
- **Functional Code Protection**: You are forbidden from deleting existing functional code unless it is being replaced by equivalent or superior functionality explicitly requested.
- **No Silent Deletions**: Never remove working code without explicit user approval.
- **Replacement Justification**: Any code replacement must be justified by the task requirements.

### Verification
- **Post-Edit Validation**: After every edit, compare the change against the original Spec.
- **Drift Detection**: If the change deviates from specifications, revert and retry.
- **Alignment Check**: Ensure all modifications align with documented requirements and technical specifications.

## Operational Rules

### Before Making Changes
1. Verify the change is within task scope
2. Confirm the change aligns with project specifications
3. Check that no functional code is being unnecessarily removed
4. Ensure no unsolicited refactoring is included

### During Implementation
1. Make only the changes necessary to complete the task
2. Preserve all existing functional code not directly related to the task
3. Follow established patterns and conventions from the codebase
4. Stay within the boundaries of the explicit request

### After Making Changes
1. Compare changes against original specifications
2. Verify no scope drift has occurred
3. Confirm no functional code was unnecessarily deleted
4. Validate that only requested changes were implemented

## Scope Drift Prevention Checklist

- [ ] Change is explicitly required by current task
- [ ] No refactoring outside immediate scope
- [ ] No deletion of functional code without replacement
- [ ] Changes align with project specifications
- [ ] Changes align with `.qoder/rules`
- [ ] No "improvements" beyond stated requirements
- [ ] Verification against spec completed

## Enforcement

This rule is **mandatory** and **non-negotiable**. Violations constitute a failure to follow project standards.

**Trigger**: Always active - applies to every code modification task.
