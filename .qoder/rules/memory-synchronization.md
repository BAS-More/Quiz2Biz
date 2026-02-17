---
trigger: always_on
---

# Memory Synchronization Protocol

## Automatic Memory Refresh Cycle

### Refresh Schedule

- **Interval:** Every 3 hours during active session
- **Trigger:** Automatic, continuous synchronization
- **Scope:** All memory categories

### Memory Categories to Synchronize

1. **User Preference Memory** - Communication style, development standards, response formats
2. **Project Information Memory** - Tech stack, configuration, environment variables
3. **Common Pitfalls Experience** - Known issues, workarounds, error patterns
4. **Development Practice Specification** - Security rules, coding standards, best practices
5. **Project Configuration** - Endpoints, credentials, deployment settings
6. **History Task Workflow** - Previous task patterns, recovery procedures
7. **Project SCM Configuration** - GitHub secrets, repository settings
8. **Development Test Specification** - Testing standards, coverage requirements
9. **Skill Experience** - Design workflows, specialized knowledge
10. **Project Environment Configuration** - PATH settings, MCP server configs

---

## Memory Verification Process

### On Session Start

1. Load all available memory categories from `<user_memories>` context
2. Verify memory overview accessibility
3. Confirm user preference memories are loaded and active
4. Validate project information memories match current workspace

### During Execution

1. **Before Task Execution** - Review relevant memories for the task type
2. **During Code Changes** - Cross-reference with development practice specifications
3. **On Error Encounter** - Search common pitfalls experience for known solutions
4. **Before Commit/Deploy** - Verify against project configuration and SCM settings

### Memory Retrieval Protocol

When memory overview indicates relevant content:
- Use `search_memory` tool with appropriate category and keywords
- Retrieve detailed content before proceeding with task
- Apply retrieved memories to current execution context

---

## Continuous Synchronization Rules

### Memory Freshness Checks

- Verify memories remain accessible throughout session
- Re-fetch memory content if context appears stale
- Report any memory synchronization failures immediately

### Memory Application Order

1. **User Preference Memory** - HIGHEST PRIORITY, must always be followed
2. **Project Information Memory** - Required for correct assumptions
3. **Development Practice Specification** - Applied to all code changes
4. **Common Pitfalls Experience** - Referenced to avoid known issues
5. **All Other Categories** - Applied as contextually relevant

### Memory Conflict Resolution

- User preference memories override all other memory types
- More recent memories take precedence over older ones
- Project-specific memories override general memories

---

## Memory Health Monitoring

### Indicators of Healthy Memory State

- All memory categories accessible via `search_memory`
- User preference memories actively influencing responses
- Project configurations correctly applied to commands
- Common pitfalls avoided through preemptive checks

### Recovery Actions

If memory synchronization fails:
1. Re-request memory context from system
2. Perform deep search across all categories
3. Report synchronization issue to user
4. Continue with available memory state

---

## Integration with Task Execution

### Pre-Task Memory Load

Before starting any task:
```
1. Check memory_overview for relevant categories
2. Retrieve detailed memories for task type
3. Apply user preferences to response format
4. Load project-specific configurations
```

### Post-Task Memory Update

After completing significant tasks:
```
1. Identify new learnings or patterns
2. Consider if new memory should be created
3. Verify existing memories remain accurate
4. Update outdated memories if discovered
```

---

## Memory Categories Quick Reference

| Category | Keywords | When to Retrieve |
|----------|----------|------------------|
| user_preference_memory | communication, standards, format | Always active |
| project_information_memory | config, env, API keys | Before commands |
| common_pitfalls_experience | error, bug, workaround | On issue encounter |
| development_practice_specification | security, code, testing | During code changes |
| project_configuration | endpoints, credentials | Before deployment |
| history_task_workflow | recovery, procedures | On similar tasks |

---

**Maintain continuous memory synchronization throughout all sessions.**
