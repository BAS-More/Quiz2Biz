# Protocol: Reality Check & Fresh Context

## Core Principles

### Confirm File State
- **Pre-Edit Verification**: Before editing any file, you must perform a `read_file` operation to ensure you are working with the version currently on disk.
- **No Cache Reliance**: Do not rely on cached memory or assumed file contents from previous interactions.
- **Current State Priority**: Always work with the actual current state of files, not remembered or inferred state.

### Ghost Detection
- **Path Verification**: If a file path exists in your memory but you cannot locate it via `list_dir` or `search_file`, report the discrepancy immediately.
- **Explicit Reporting**: When a ghost file is detected, inform the user: "File path [path] exists in conversation memory but cannot be located on disk. Requesting clarification."
- **No Assumptions**: Never assume a file exists or has specific content without verification.

## Operational Rules

### Before Every File Edit

1. **Read Current State**
   ```
   - Execute read_file on target file
   - Verify file exists and is accessible
   - Confirm content matches expected structure
   - Identify exact location for changes
   ```

2. **Verify File Location**
   ```
   - Use search_file if path is uncertain
   - Use list_dir to confirm directory structure
   - Validate full absolute path
   ```

3. **Detect Discrepancies**
   ```
   - Compare memory vs disk state
   - Report any conflicts immediately
   - Request user clarification before proceeding
   ```

### Ghost File Detection Protocol

When file path discrepancy detected:

```markdown
⚠️ **Ghost File Detected**

**Memory Reference**: [file_path_from_memory]
**Disk Verification**: File not found via list_dir/search_file
**Action Required**: User clarification needed

Possible causes:
- File was moved or renamed
- File was deleted
- Path was misremembered
- Working directory changed

Please confirm correct file location.
```

### Fresh Context Validation

Before any code modification task:

- [ ] Read target file(s) to confirm current state
- [ ] Verify all referenced files exist on disk
- [ ] Confirm directory structure matches expectations
- [ ] Validate no ghost paths in task scope
- [ ] Report any memory/disk state conflicts

## Implementation Checklist

### For Every File Edit
1. Execute `read_file` on target first
2. Verify content structure matches task requirements
3. Identify exact change locations
4. Make modifications based on **current disk state only**
5. Never rely on conversation memory for file contents

### For Multi-File Operations
1. List all files in scope
2. Read each file individually to confirm state
3. Verify file relationships and dependencies
4. Report any missing or misplaced files
5. Proceed only after all files verified

### For Path References
1. Use `search_file` to locate files by name
2. Use `list_dir` to verify directory contents
3. Never assume path structure from memory
4. Always use absolute paths when available
5. Report path ambiguities immediately

## Error Handling

### File Not Found
```
❌ File Not Found: [path]
- Searched in: [directory]
- Expected based on: [context]
- Action: Requesting user confirmation of correct path
```

### Content Mismatch
```
⚠️ Content Mismatch Detected
- Expected structure: [description]
- Actual content: [summary]
- Action: Verifying task requirements against actual file state
```

### Memory/Disk Conflict
```
🔍 State Conflict Detected
- Memory state: [description]
- Disk state: [description]
- Resolution: Prioritizing disk state, updating working context
```

## Prohibited Behaviors

- ❌ Editing files without reading current state first
- ❌ Assuming file contents from conversation history
- ❌ Proceeding with ghost file paths without clarification
- ❌ Making changes based on outdated memory
- ❌ Silently ignoring file location discrepancies
- ❌ Using cached/remembered file contents for modifications

## Mandatory Verification Steps

### Step 1: Pre-Flight Check
```
Before ANY file modification:
1. read_file [target_path]
2. Verify file exists
3. Confirm content structure
4. Proceed with modification
```

### Step 2: Path Validation
```
For ANY file reference:
1. search_file or list_dir to confirm location
2. Validate absolute path
3. Report if path cannot be verified
```

### Step 3: Ghost Detection
```
If file remembered but not found:
1. Stop immediately
2. Report discrepancy with details
3. Request user clarification
4. Do not proceed until resolved
```

## Enforcement

This protocol is **mandatory** for every file operation. Violations constitute a critical workflow failure.

**Trigger**: Always active - applies to every file read, edit, or reference operation.

## Integration with Other Rules

- Works with **Anti-Drift & Scope Control**: Ensures changes are made to actual current code, not remembered versions
- Supports **AVI-OS Standards**: Transparency requirement includes reporting file state discrepancies
- Enables **ISO Best Practices**: Current state verification supports maintainability and reliability

---

**Summary**: Always read files before editing. Always verify paths before referencing. Always report memory/disk conflicts. Never trust cached memory for file operations.
