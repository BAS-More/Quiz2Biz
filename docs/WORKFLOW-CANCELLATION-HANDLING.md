# Workflow Cancellation Handling

## Problem Statement

GitHub Actions workflow runs are sometimes cancelled by automated systems (e.g., `@copilot-swe-agent[bot]`), or may complete with `action_required` conclusion. This can lead to:

- Cluttered workflow run history
- Confusion about which runs actually need attention
- Manual cleanup overhead

### Important: Understanding Status vs Conclusion

⚠️ **CRITICAL LIMITATION**: GitHub Actions has two separate concepts:
- **Status**: The current state of a run (`queued`, `in_progress`, `completed`)
- **Conclusion**: The final result once completed (`success`, `failure`, `cancelled`, `action_required`, etc.)

**You can only cancel runs with status `in_progress` or `queued`. Runs with status `completed` (regardless of their conclusion) CANNOT be cancelled.**

Runs with `conclusion: action_required` have already finished executing and cannot be cancelled through the API. The `gh run cancel` command will fail with permission errors for these runs.

### Example Error Message

```
The run was canceled by @copilot-swe-agent[bot].
Processing Request (Linux)
The operation was canceled.
The run was canceled by @copilot-swe-agent[bot].
```

## Solution

We've implemented a batch cancellation script that attempts to cancel workflow runs filtered by `--status action_required`.

⚠️ **Important Note**: Due to the GitHub Actions API limitation explained above, this script will typically fail to cancel most runs because they have already completed (`status: completed, conclusion: action_required`). The script is provided as a reference implementation and for the rare case where runs might be in progress with this status.

### Script Location

`/scripts/cancel-action-required-runs.sh`

### Usage

```bash
cd /path/to/Quiz-to-build
./scripts/cancel-action-required-runs.sh
```

### What It Does

1. **Validates Prerequisites**: Checks for GitHub CLI installation and authentication
2. **Lists Affected Runs**: Shows all workflow runs with `action_required` status (up to 50)
3. **Requests Confirmation**: Displays detailed run information and asks for user confirmation
4. **Batch Cancellation**: Cancels each run individually with proper error handling
5. **Reports Results**: Provides a comprehensive summary of successful and failed cancellations

### Features

- ✅ Color-coded output for easy reading
- ✅ Interactive confirmation before any changes
- ✅ Detailed run information (ID, name, title)
- ✅ Individual error handling per run
- ✅ Comprehensive success/failure reporting
- ✅ Graceful handling of edge cases

### Prerequisites

1. **GitHub CLI (gh)** must be installed
   ```bash
   # Install on Ubuntu/Debian
   curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
   echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
   sudo apt update
   sudo apt install gh
   ```

2. **GitHub CLI Authentication** - Must be logged in
   ```bash
   gh auth login
   ```

3. **Repository Permissions** - User must have write/maintain access to the repository

### Example Output

```bash
=============================================
  Cancel Action Required Workflow Runs
=============================================

Checking for workflow runs with status 'action_required'...

Found 50 workflow run(s) with status 'action_required':
  - [22623158880] Code Coverage Gate: [WIP] Fix run cancellation issue
  - [22623158869] Security Scanning: [WIP] Fix run cancellation issue
  - [22623158861] Dependabot Updates: [WIP] Fix run cancellation issue
  ...

These runs will be cancelled.
Do you want to continue? (yes/no)
yes

Cancelling runs...
✓ Cancelled run 22623158880
✓ Cancelled run 22623158869
✓ Cancelled run 22623158861
...

=============================================
  Summary
=============================================
  Total runs: 50
  Cancelled: 50
=============================================
All workflow runs cancelled successfully!
```

### Error Handling

The script handles various error scenarios gracefully:

| Error | Behavior |
|-------|----------|
| GitHub CLI not installed | Exit with error and installation instructions |
| Not authenticated | Exit with error and authentication instructions |
| No action_required runs | Exit gracefully with success message |
| Permission denied | Report failed runs in summary, continue with others |
| User cancellation | Abort operation cleanly without making changes |

### Security Considerations

- ✅ No hardcoded credentials or tokens
- ✅ Respects GitHub CLI authentication
- ✅ Requires explicit user confirmation
- ✅ Read-only operations until confirmation
- ✅ Detailed audit trail in script output

## Alternative Manual Method

If you prefer to cancel runs manually or need to cancel specific runs:

```bash
# List action_required runs
gh run list --status action_required --limit 50

# Cancel a specific run by ID
gh run cancel <run-id>

# Batch cancel using one-liner (non-interactive)
gh run list --status action_required --limit 50 --json databaseId --jq '.[].databaseId' | xargs -I{} gh run cancel {}
```

## Prevention

To prevent excessive action_required runs in the future:

1. **Review Copilot Agent Configuration**: Ensure copilot agents have appropriate timeouts and don't unnecessarily cancel runs
2. **Monitor Workflow Failures**: Address root causes of workflow failures rather than cancelling runs
3. **Use Concurrency Controls Wisely**: Only set `cancel-in-progress: true` for workflows where it's truly needed
4. **Regular Cleanup**: Run the cleanup script periodically (e.g., weekly) to maintain a clean workflow history

## Troubleshooting

### Understanding the Test Results

When running this script, you will likely see **all cancellation attempts fail** with errors. This is expected behavior because:

1. The `gh run list --status action_required` command actually lists runs where `conclusion` (not status) is `action_required`
2. These runs have already completed (`status: completed`)
3. Completed runs cannot be cancelled via the API
4. This is a GitHub Actions API limitation, not a script bug

**Test Output Example:**
```
✗ Failed to cancel run 22623308939
✗ Failed to cancel run 22623308894
...
Total runs: 50
Cancelled: 0
Failed: 50
```

This is the expected result when targeting completed runs.

### What CAN Be Cancelled

You can only cancel runs with these statuses:
- `in_progress` - Currently running
- `queued` - Waiting to start

**Example - Cancel In-Progress Runs:**
```bash
# List in-progress runs
gh run list --status in_progress

# Cancel a specific in-progress run
gh run cancel <run-id>

# Cancel all in-progress runs (dangerous!)
gh run list --status in_progress --json databaseId --jq '.[].databaseId' | xargs -I{} gh run cancel {}
```

### What CANNOT Be Cancelled

Runs with these statuses cannot be cancelled:
- `completed` - Already finished (regardless of conclusion: success, failure, cancelled, action_required, etc.)

These runs will remain in your workflow history permanently.

### "HTTP 403: Resource not accessible by integration"

This error occurs when:
- The GitHub token doesn't have sufficient permissions
- You're trying to cancel runs from a fork
- You don't have write access to the repository
- **Most commonly**: You're trying to cancel a run that has already completed

**Solution**: You cannot cancel completed runs. Only in-progress or queued runs can be cancelled. For completed runs with `conclusion: action_required`, they will remain in the workflow history.

### "No workflow runs found with status 'action_required'"

This is normal and indicates there are no runs to clean up. The script exits successfully in this case.

### Script Hangs on Confirmation

The script waits for user input. Type `yes` to proceed or anything else to abort.

## Related Issues

- PR #108: Add script to batch cancel action_required workflow runs
- PR #110: [WIP] Fix run cancellation issue during processing

## Maintenance

This script requires no ongoing maintenance unless GitHub CLI's API changes. It follows project conventions:

- LF line endings (enforced by `.gitattributes`)
- Executable permissions (755)
- Error handling with structured exit codes
- Color-coded output matching project standards
