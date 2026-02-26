---
trigger: always_on
alwaysApply: true
---

# Agent Contract - File Modification Protocol

## Pre-Modification Requirements

Before writing or modifying any code, you MUST complete the following steps in order:

### 1. List All Files to Be Changed
- **Explicitly enumerate** every file you intend to modify
- State the full absolute path for each file
- Provide a brief description of what will be changed in each file
- Get user confirmation of the file list before proceeding

**Format:**
```
Files to be modified:
1. [absolute/path/to/file1.ts] - [brief description of changes]
2. [absolute/path/to/file2.ts] - [brief description of changes]
3. [absolute/path/to/file3.ts] - [brief description of changes]
```

### 2. Verify File Existence and Content
For EVERY file in the list, perform verification operations:

- **Use `list_dir`** to confirm file exists in expected directory
- **Use `read_file`** to load current content and verify:
  - File exists at the specified path
  - Current content matches expected state
  - File structure is as anticipated
  - No unexpected modifications present

### 3. Handle Missing Files Appropriately

If ANY file is missing during verification:

#### Immediate Actions
1. **IMMEDIATELY STOP** the modification process
2. **DO NOT proceed** with any file modifications
3. **DO NOT guess** or create the missing file without explicit approval

#### Discovery Process
1. **Attempt to locate** the correct file path through:
   - `search_file` with filename pattern
   - `list_dir` to explore related directories
   - `grep_code` to find references to the file

2. **Document findings**:
   ```
   ❌ File Not Found: [expected_path]
   
   Search performed:
   - search_file: [results]
   - list_dir: [directories checked]
   - grep_code: [references found]
   
   Status: [Found at alternative path / Not found / Multiple candidates]
   ```

3. **If correct path cannot be determined**:
   - Notify the user with the specific missing file
   - Present search results and findings
   - Request user guidance on correct location
   - Offer options (create new, use alternative, skip)

4. **Offer best practice recommendation**:
   - Review project structure and conventions
   - Suggest appropriate file location based on project standards
   - Explain reasoning for recommendation

---

## Modification Execution Protocol

### Step-by-Step Process

#### Phase 1: Planning (Pre-Execution)
```
1. Identify all files requiring changes
2. List files with descriptions
3. Present list to user for confirmation
4. Wait for user approval before proceeding
```

#### Phase 2: Verification (Pre-Modification)
```
For each file in approved list:
  1. Execute list_dir on parent directory
  2. Confirm file presence
  3. Execute read_file on target
  4. Verify content state
  5. Identify exact modification points
  6. Document current state
```

#### Phase 3: Execution (Modification)
```
For each verified file:
  1. Use search_replace tool with exact content
  2. Verify replacement success
  3. Document changes made
  4. Proceed to next file only if current succeeded
```

#### Phase 4: Validation (Post-Modification)
```
After all modifications:
  1. List all modified files
  2. Confirm all planned changes completed
  3. Report any skipped files with reasons
  4. Offer to verify compilation/tests
```

---

## Error Handling Matrix

| Error Condition | Action | User Notification | Recovery Options |
|-----------------|--------|-------------------|------------------|
| File not found | STOP immediately | ❌ Detailed report | Locate / Create / Skip |
| File exists but content unexpected | STOP and report | ⚠️ Content mismatch | Confirm intent / Adjust approach |
| Multiple files with same name | STOP and clarify | ⚠️ Ambiguity detected | User selects correct path |
| Permission denied | STOP and report | ❌ Access denied | Request elevated access / Skip |
| File locked by another process | STOP and report | ⚠️ File in use | Wait / Force / Skip |

---

## Missing File Protocol (Detailed)

### Detection
```
IF file expected but not found THEN:
  SET status = "MISSING_FILE"
  STOP modification_process
  BEGIN discovery_process
```

### Discovery Sequence
```
1. search_file [filename_pattern]
   - Check all matches
   - Verify each candidate
   - Record all findings

2. list_dir [expected_directory]
   - List all files in expected location
   - Check for similar names
   - Document directory contents

3. list_dir [parent_directory]
   - Check if directory structure changed
   - Look for moved/renamed files
   - Document findings

4. grep_code [filename_reference]
   - Find code references to file
   - Identify import/require statements
   - Track where file is expected
```

### Reporting Template
```markdown
🔍 **Missing File Investigation**

**Expected Path**: [full/path/to/file.ts]
**Status**: NOT FOUND

**Discovery Results**:
1. search_file "file.ts":
   - [result 1]
   - [result 2]
   - Total matches: [N]

2. list_dir exploration:
   - Expected directory: [path] - [exists/missing]
   - Parent directory: [path] - [contents]
   - Similar files found: [list]

3. Code references:
   - Import statements: [locations]
   - References found: [count]

**Analysis**:
- File likely [moved/deleted/never existed]
- Suggested location: [path]
- Alternative matches: [list]

**Recommended Actions**:
1. [Primary recommendation with reasoning]
2. [Alternative option 1]
3. [Alternative option 2]

**Awaiting user decision before proceeding.**
```

---

## Best Practice Recommendations

When offering recommendations after missing file discovery:

### Context Review
1. Examine project structure (`.qoder/rules/project-standards.md`)
2. Review naming conventions
3. Check directory organization patterns
4. Identify similar existing files

### Recommendation Criteria
- **Consistency**: Follow established project patterns
- **Convention**: Align with tech stack conventions (NestJS, React, etc.)
- **Proximity**: Place near related functionality
- **Discoverability**: Use intuitive, searchable names

### Recommendation Format
```markdown
💡 **Best Practice Recommendation**

**Context**:
- Project uses [pattern/convention]
- Similar files located in [directory]
- Standard convention for [file type] is [pattern]

**Recommended Path**: [full/path/recommendation]

**Reasoning**:
1. Follows project convention [reference to project-standards.md]
2. Co-located with related functionality [specific examples]
3. Consistent with existing [similar files]
4. Aligns with [NestJS/React/framework] conventions

**Alternative Options**:
- Option A: [path] - [pros/cons]
- Option B: [path] - [pros/cons]

**Request**: Please confirm preferred location before file creation.
```

---

## Prohibited Actions

### NEVER Do This
- ❌ Modify files without verification
- ❌ Proceed with missing files silently
- ❌ Create files without user approval
- ❌ Guess file locations without investigation
- ❌ Skip error reporting
- ❌ Make assumptions about file state
- ❌ Continue after file not found errors
- ❌ Use cached file contents
- ❌ Batch modify files without individual verification

### ALWAYS Do This
- ✅ List all files before modification
- ✅ Verify every file exists
- ✅ Read current content first
- ✅ Report missing files immediately
- ✅ Investigate before recommending
- ✅ Offer multiple options
- ✅ Request user confirmation
- ✅ Document all findings
- ✅ Stop on errors

---

## Integration with Existing Rules

### Works With
- **Reality Check & Fresh Context Protocol**: Reinforces file verification requirements
- **Anti-Drift & Scope Control**: Ensures only planned files are modified
- **Project Standards**: Uses conventions for recommendations

### Enforcement Priority
1. **STOP** on missing file (this rule)
2. **VERIFY** content state (Reality Check)
3. **CONFIRM** scope boundaries (Anti-Drift)
4. **APPLY** standards (Project Standards)

---

## Example Workflow

### Scenario: Modify 3 files for new feature

#### Step 1: List Files
```
Files to be modified:
1. c:\Repos\Quiz-to-Build\apps\api\src\modules\users\users.service.ts
   - Add new method: findByEmail()

2. c:\Repos\Quiz-to-Build\apps\api\src\modules\users\users.controller.ts
   - Add new endpoint: GET /users/by-email

3. c:\Repos\Quiz-to-Build\apps\api\src\modules\users\dto\find-user.dto.ts
   - Add email validation

Proceed with these changes? [Awaiting confirmation]
```

#### Step 2: Verify Files
```
Verifying files...

✅ users.service.ts - Found, content verified
✅ users.controller.ts - Found, content verified
❌ dto/find-user.dto.ts - NOT FOUND

STOPPING: Missing file detected. Investigating...
```

#### Step 3: Investigate Missing File
```
🔍 Missing File Investigation

Expected Path: c:\Repos\Quiz-to-Build\apps\api\src\modules\users\dto\find-user.dto.ts
Status: NOT FOUND

Discovery Results:
- search_file "find-user.dto.ts": 0 matches
- list_dir dto/: create-user.dto.ts, update-user.dto.ts (find-user.dto.ts missing)
- grep_code: No imports found

Analysis: File does not exist yet - needs to be created

💡 Recommended Path: c:\Repos\Quiz-to-Build\apps\api\src\modules\users\dto\find-user.dto.ts

Reasoning:
- Follows existing DTO naming pattern (create-user, update-user)
- Located with other user DTOs
- Aligns with NestJS convention

Options:
A) Create file at recommended path
B) Use existing create-user.dto.ts and extend it
C) Skip DTO creation

Please confirm preferred approach.
```

---

## Compliance Checklist

Before modifying ANY file:

- [ ] All target files listed explicitly
- [ ] User confirmed file list
- [ ] All files verified with list_dir
- [ ] All files read with read_file
- [ ] No missing files detected
- [ ] Current content matches expectations
- [ ] Modification points identified
- [ ] No ghost paths in scope
- [ ] Ready to execute modifications

If ANY checkbox is unchecked: **STOP and resolve before proceeding**

---

## Compliance Verification

### Mandatory Pre-Operation Verification

**All file operations MUST be preceded by verification steps**:

1. **File Existence Verification**
   - Use `list_dir` to confirm file presence in expected directory
   - Use `search_file` if path is uncertain
   - Document verification results

2. **File Content Verification**
   - Use `read_file` to load and inspect current content
   - Verify structure matches expectations
   - Identify exact modification points
   - Document current state

3. **Dependency Verification**
   - Verify all imported/referenced files exist
   - Check all related files in modification scope
   - Confirm no circular dependencies

### Assumption Prohibition

**No assumptions about file existence or content are permitted**:

❌ **PROHIBITED Assumptions**:
- "This file probably exists because it's standard"
- "The content is likely unchanged since last session"
- "This import path should work based on convention"
- "The file structure follows the typical pattern"
- "Memory from previous conversation is accurate"

✅ **REQUIRED Verification**:
- "Verified file exists via list_dir: ✅"
- "Read current content via read_file: ✅"
- "Confirmed import paths resolve: ✅"
- "Validated structure matches expectations: ✅"
- "All dependencies verified present: ✅"

### Risk Assessment for Deviations

**Risk assessment MUST accompany any deviation from planned modifications**:

#### When Deviation Occurs

If you must deviate from the originally planned modifications:

1. **STOP** and document the deviation
2. **ASSESS** the risk level
3. **REPORT** to user with risk analysis
4. **WAIT** for user approval before proceeding

#### Risk Assessment Template

```markdown
⚠️ **DEVIATION DETECTED**

**Original Plan**:
[Description of planned modification]

**Proposed Deviation**:
[Description of actual required change]

**Reason for Deviation**:
[Explanation of why deviation is necessary]

**RISK ASSESSMENT**:

**Risk Level**: [LOW / MEDIUM / HIGH / CRITICAL]

**Impact Analysis**:
- Files affected: [list]
- Scope change: [description]
- Dependencies impacted: [list]
- Testing implications: [description]
- Rollback complexity: [LOW/MEDIUM/HIGH]

**Risk Factors**:
1. [Risk factor 1 with impact]
2. [Risk factor 2 with impact]
3. [Risk factor 3 with impact]

**Mitigation Strategy**:
1. [Mitigation step 1]
2. [Mitigation step 2]
3. [Mitigation step 3]

**Alternatives Considered**:
A) [Alternative approach 1] - [pros/cons]
B) [Alternative approach 2] - [pros/cons]

**Recommendation**: [Proceed with deviation / Seek alternative / Abort]

**User Approval Required**: YES
```

#### Risk Level Definitions

| Risk Level | Definition | Approval Required | Example |
|------------|------------|-------------------|----------|
| **LOW** | Minor deviation, same scope, no new dependencies | User notification | Rename variable differently than planned |
| **MEDIUM** | Moderate deviation, slightly expanded scope, minimal new dependencies | User approval | Add validation not in original plan |
| **HIGH** | Significant deviation, expanded scope, new dependencies or files | Explicit user approval + justification | Modify additional files not listed |
| **CRITICAL** | Major deviation, completely different approach, architectural impact | Full review + explicit approval | Change entire implementation strategy |

#### Deviation Decision Matrix

| Deviation Type | Risk Level | Action |
|----------------|------------|--------|
| Variable/parameter name change | LOW | Notify |
| Add minor validation logic | LOW | Notify |
| Add new function parameter | MEDIUM | Approve |
| Modify additional file | MEDIUM | Approve |
| Create new file not planned | HIGH | Approve + Justify |
| Change file structure | HIGH | Approve + Justify |
| Add new dependency | HIGH | Approve + Justify |
| Change architectural approach | CRITICAL | Full review |

### Compliance Audit Trail

Every file operation must generate an audit trail:

```markdown
📋 **File Operation Audit**

**Operation**: [CREATE / MODIFY / DELETE]
**File**: [absolute/path/to/file]
**Timestamp**: [ISO 8601 timestamp]

**Pre-Operation Verification**:
- [ ] File existence verified via list_dir
- [ ] Content loaded via read_file (if exists)
- [ ] Dependencies verified
- [ ] No assumptions made
- [ ] Current state documented

**Planned Modification**:
[Description of planned change]

**Deviation Status**:
- [ ] No deviation - proceeding as planned
- [ ] Deviation detected - risk assessment completed
- [ ] Deviation approved by user

**Risk Level**: [LOW / MEDIUM / HIGH / CRITICAL / N/A]

**Execution Status**: [PENDING / IN_PROGRESS / COMPLETED / FAILED]

**Post-Operation Verification**:
- [ ] Modification successful
- [ ] File compiles/validates
- [ ] No unintended side effects
- [ ] Audit trail complete
```

---

## Enforcement

This protocol is **MANDATORY** and **NON-NEGOTIABLE**.

**Violations include**:
- Modifying files without verification
- Proceeding with missing files
- Creating files without approval
- Skipping investigation steps
- Not reporting findings to user
- **Making assumptions about file state**
- **Deviating from plan without risk assessment**
- **Skipping compliance verification steps**

**Consequence**: Any violation constitutes a critical failure requiring immediate stop and reset.

**Trigger**: Always active - applies to every file creation, modification, or deletion operation.

---

**Summary**: Verify everything. Assume nothing. Assess all deviations. Document all operations. Request user guidance. Never proceed without verification and compliance confirmation.
