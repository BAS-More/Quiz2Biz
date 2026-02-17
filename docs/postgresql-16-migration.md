# PostgreSQL 16 Migration Guide

## Overview

This project has been upgraded to use PostgreSQL 16 (from PostgreSQL 15). This document outlines the compatibility considerations and migration path.

## What Changed

- **docker-compose.yml**: Updated from `postgres:15-alpine` to `postgres:16-alpine`
- **CI/CD workflows**: Updated test database containers to PostgreSQL 16
- **Terraform**: Verify `postgresql_version` variable supports version 16 for Azure PostgreSQL

## PostgreSQL 16 Features Used

PostgreSQL 16 includes several improvements that benefit this project:

1. **Performance improvements** for queries with aggregates and window functions
2. **Improved VACUUM performance** for large tables
3. **Better query parallelism** for better performance on multi-core systems
4. **JSON improvements** for better handling of JSON data

## Compatibility

### Prisma ORM

- Prisma supports PostgreSQL 16 out of the box
- No schema changes required
- All existing migrations are compatible

### Raw SQL Queries

All raw SQL queries in the MCP client (`libs/orchestrator/src/mcp/client.ts`) have been verified to be compatible with PostgreSQL 16. The queries use standard SQL features that are consistent across PostgreSQL 15 and 16.

## Migration Path

### Local Development

1. Stop existing containers: `docker-compose down`
2. Remove old volumes if you want a fresh start: `docker volume rm quiz-to-build_postgres_data`
3. Start with PostgreSQL 16: `docker-compose up -d postgres`
4. Run migrations: `npx prisma migrate deploy`

### Production (Azure PostgreSQL)

1. Verify Azure PostgreSQL supports version 16 in your region
2. Update Terraform variable `postgresql_version = "16"`
3. Plan the upgrade:
   - Azure PostgreSQL Flexible Server supports in-place major version upgrades
   - Schedule maintenance window for the upgrade
   - Take a backup before upgrading
4. Apply Terraform changes or use Azure Portal to upgrade
5. Test the application after upgrade

### CI/CD

The CI/CD workflows have been updated to use PostgreSQL 16 for testing. No action required.

## Breaking Changes

PostgreSQL 16 has minimal breaking changes that affect this project:

- **None identified** - All SQL queries use standard features compatible with both PG 15 and 16
- Prisma handles any low-level protocol changes automatically

## Rollback Plan

If issues are encountered after upgrading:

1. **Local Development**: 
   - Change `docker-compose.yml` back to `postgres:15-alpine`
   - Restore from backup if data migration occurred

2. **Production**:
   - Azure PostgreSQL does not support automatic downgrade
   - Restore from backup taken before upgrade
   - Or provision new PG 15 instance and restore data

## Verification

After upgrading, verify:

1. Application starts successfully
2. Database connections work
3. Migrations run without errors
4. All tests pass
5. No query performance regressions

## Resources

- [PostgreSQL 16 Release Notes](https://www.postgresql.org/docs/16/release-16.html)
- [Azure PostgreSQL Version Policy](https://learn.microsoft.com/en-us/azure/postgresql/flexible-server/concepts-version-policy)
- [Prisma PostgreSQL Support](https://www.prisma.io/docs/reference/database-reference/supported-databases)
