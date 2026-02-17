# Orchestrator Library - Package Distribution

## Current Status

The `@libs/orchestrator` package is currently:
- Marked as `private: true` in package.json (prevents accidental npm publish)
- Imported using TypeScript path aliases (`@libs/orchestrator`)
- Part of the npm workspaces monorepo structure

## Distribution Options

### Option 1: Keep as Monorepo Library (Current)

**Pros:**
- Simple to maintain
- No versioning/publishing overhead
- Direct TypeScript imports with full type safety
- Changes are immediately available to all consumers

**Cons:**
- Cannot be shared across multiple repositories
- No semantic versioning
- Tightly coupled to this repository

**Recommended for:** Single-repository projects where the orchestrator is only used within this codebase.

### Option 2: Private npm Registry

**Setup:**
1. Set up a private npm registry (options below)
2. Update package.json:
   ```json
   {
     "name": "@quiz2biz/orchestrator",
     "version": "1.0.0",
     "private": false,
     "publishConfig": {
       "registry": "https://your-private-registry.com"
     }
   }
   ```
3. Configure authentication for the registry
4. Publish with `npm publish`

**Private Registry Options:**
- **npm Enterprise**: Official npm private registry
- **GitHub Packages**: Free for private repos, integrates with GitHub auth
- **Azure Artifacts**: Integrates with Azure DevOps
- **Verdaccio**: Self-hosted, open-source npm registry
- **JFrog Artifactory**: Enterprise artifact management

**Pros:**
- Can be shared across multiple repositories
- Semantic versioning
- Dependency management
- Release notes and changelogs

**Cons:**
- Additional infrastructure to maintain
- Publishing/versioning overhead
- Authentication setup required

**Recommended for:** Multi-repository projects or when the orchestrator needs to be shared with external teams.

### Option 3: Git Submodule

**Setup:**
1. Extract orchestrator to separate repository
2. Add as git submodule:
   ```bash
   git submodule add https://github.com/your-org/orchestrator.git libs/orchestrator
   ```

**Pros:**
- No registry infrastructure needed
- Simple to set up
- Can pin to specific commits

**Cons:**
- Clunky developer experience (submodule updates)
- Difficult to manage versions
- Nested git repositories can be confusing

**Recommended for:** Simple cases where you want to share code between 2-3 repositories without setting up a registry.

### Option 4: npm Workspaces with Lerna/Nx (Enhanced Monorepo)

**Setup:**
1. Use Lerna or Nx to manage the monorepo
2. Add versioning and publishing workflows
3. Keep the workspace structure but add tooling for releases

**Pros:**
- Better monorepo tooling
- Independent versioning for packages
- Can publish to registry if needed
- Better dependency management

**Cons:**
- More complex tooling
- Learning curve for Lerna/Nx

**Recommended for:** Large monorepos with multiple publishable packages.

## Recommendation for Quiz2Biz

**Keep the current approach (Option 1)** unless there's a specific need to share the orchestrator across multiple repositories.

**Reasons:**
1. The orchestrator is tightly coupled to the Quiz2Biz domain model
2. Single repository deployment model
3. Simpler development workflow
4. No additional infrastructure overhead
5. Can always migrate to a private registry later if needed

## If You Need to Publish

If you later decide to publish the orchestrator:

1. **Update package.json:**
   ```json
   {
     "name": "@quiz2biz/orchestrator",
     "version": "1.0.0",
     "private": false,
     "main": "dist/index.js",
     "types": "dist/index.d.ts",
     "files": ["dist", "README.md", "LICENSE"],
     "publishConfig": {
       "registry": "https://npm.pkg.github.com"
     }
   }
   ```

2. **Add build script:**
   ```json
   {
     "scripts": {
       "build": "tsc",
       "prepublishOnly": "npm run build"
     }
   }
   ```

3. **Add tsconfig.json for compilation:**
   ```json
   {
     "extends": "../../tsconfig.json",
     "compilerOptions": {
       "outDir": "dist",
       "declaration": true
     },
     "include": ["src/**/*"]
   }
   ```

4. **Set up GitHub Packages authentication:**
   ```bash
   npm login --registry=https://npm.pkg.github.com
   ```

5. **Publish:**
   ```bash
   npm publish
   ```

## Documentation

The `name` field in package.json (`@libs/orchestrator`) matches the TypeScript path alias, which is the correct configuration for npm workspaces. No changes needed.
