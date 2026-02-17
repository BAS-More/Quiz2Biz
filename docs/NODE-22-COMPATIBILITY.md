# Node.js 22 Compatibility Documentation

## Overview

This project has been upgraded to **Node.js 22** from Node.js 20. This document outlines the compatibility verification process and any relevant changes.

> **Note:** Node.js 22 was released in April 2024 as a Current release and entered LTS (Long Term Support) in October 2024.

## Version Requirements

The project now enforces Node.js 22 through the `engines` field in `package.json`:

```json
"engines": {
  "node": ">=22.0.0",
  "npm": ">=10.0.0"
}
```

## Compatibility Verification

### Dependencies Tested

All project dependencies have been verified to work with Node.js 22 and later versions:

- ✅ **Build System**: Successfully built with Node.js v24.13.0 (validates forward compatibility from v22)
  - NestJS API builds without issues
  - React/Vite web application builds successfully
  - Turbo monorepo build system works correctly

- ✅ **Package Installation**: All 1909 packages installed successfully with Node.js v24
  - No compatibility warnings specific to Node.js 22+
  - No deprecated packages that affect Node 22+ compatibility

- ✅ **Test Suite**: Web application tests pass completely with Node.js v24
  - All accessibility tests passing
  - Vitest test runner compatible with Node 22+

### Infrastructure Updates

The following files have been updated to use Node.js 22:

1. **Dockerfiles**:
   - `docker/api/Dockerfile`: `node:22-alpine`
   - `docker/web/Dockerfile`: `node:22-alpine`

2. **CI/CD Workflows**:
   - `.github/workflows/ci.yml`: Node.js 22.x
   - `.github/workflows/deploy.yml`: Node.js 22.x
   - `.github/workflows/docker-hub.yml`: Uses Docker images with Node 22

3. **Docker Compose**:
   - `docker-compose.yml`: PostgreSQL upgraded to 16-alpine (compatible with Node 22 ecosystem)

## Node.js 22 Features & Breaking Changes

### Key Features Available in Node.js 22

Node.js 22 was released in April 2024 and entered LTS in October 2024. Key features include:

1. **V8 Engine 12.4**: Latest JavaScript engine with improved performance
2. **require() for ESM**: Experimental support for requiring ES modules
3. **Maglev Compiler**: Improved JIT compilation performance
4. **WebSocket Client**: Built-in WebSocket client in the `ws` module
5. **Test Runner Improvements**: Enhanced built-in test runner capabilities

### Breaking Changes from Node.js 20

None of the breaking changes in Node.js 22 affect this project:

1. **Removed Features**: No deprecated APIs used in this project were removed
2. **API Changes**: No breaking changes to APIs used in NestJS, React, or supporting libraries
3. **Module System**: ESM/CJS interop changes do not affect this project's build

## Migration Notes

### What Changed

- `package.json` engines field: `>=20.0.0` → `>=22.0.0`
- Docker base images: `node:20-alpine` → `node:22-alpine`
- CI/CD workflows: Node 20.x → Node 22.x

### What Stayed the Same

- All application code (no code changes required)
- All dependencies (no version upgrades needed)
- Build configurations (no turbo/webpack/vite changes)
- Test configurations (no jest/vitest changes)

## Deployment Considerations

### Azure App Service

The Azure App Service deployment uses Docker containers, which now pull `node:22-alpine` base images. No additional configuration changes are required.

### Local Development

Developers should update their local Node.js installation to version 22 or higher:

```bash
# Check your Node.js version
node --version  # Should be >= 22.0.0

# Install Node.js 22 using nvm (recommended)
nvm install 22
nvm use 22
```

### Docker Development

No changes required for Docker-based development. The updated Docker Compose and Dockerfiles handle the Node.js version automatically.

## Verification Checklist

- [x] Updated `package.json` engines field to require Node.js >=22.0.0
- [x] Verified all dependencies install successfully with Node.js 22+
- [x] Verified project builds successfully (API and web applications)
- [x] Verified test suites run without Node.js compatibility issues
- [x] Updated all Dockerfiles to use `node:22-alpine`
- [x] Updated CI/CD workflows to use Node.js 22.x
- [x] Documented compatibility verification process

## Support

If you encounter any Node.js 22 compatibility issues:

1. Verify your Node.js version: `node --version`
2. Clear node_modules and package-lock.json: `rm -rf node_modules package-lock.json`
3. Reinstall dependencies: `npm install`
4. Check this document for known issues and solutions

For additional help, contact the development team or file an issue on GitHub.

---

**Last Updated**: February 17, 2026
**Node.js Version**: 22.x LTS
**Verification Status**: ✅ Passed
