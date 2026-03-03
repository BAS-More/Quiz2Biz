# Cursor Setup for This Repository

Use this guide to add and use this repository in Cursor quickly.

## 1) Open repository in Cursor

### Option A: repository already cloned locally
1. Open Cursor.
2. Select **File -> Open Folder...**
3. Choose your local `Quiz-to-build` repository directory.

### Option B: clone directly from Cursor
1. Open Cursor.
2. Select **Clone Repository**.
3. Paste the repository URL.
4. Choose your local destination folder and open it.

## 2) Confirm Cursor project config is loaded

This repository includes:
- `.cursor/rules/quiz2biz-project.mdc` (project AI guardrails)
- `.cursorignore` (indexing scope optimization)

After opening the repo, Cursor will pick these up automatically.

## 3) Verify the correct branch and remotes

Run:

```bash
git status
git remote -v
```

Make sure you are on the branch you expect before editing.

## 4) Recommended first validation commands

Run from repo root:

```bash
npm ci
npx turbo run build
```

If you are changing database-related code:

```bash
npx prisma generate
```

## 5) Daily workflow

1. Pull latest changes.
2. Create or switch to your task branch.
3. Make focused edits.
4. Run tests and lint checks for changed scope.
5. Commit with a descriptive message.
