---
name: Production deployment bundle
description: Production Docker images must start the built API without implicit database DDL; full database.sql restores are separate and destructive.
---

The production image intentionally does not run a schema script at startup. The repository's `database.sql` is a full PostgreSQL dump, not an idempotent migration, so normal deployments must preserve the database and apply reviewed migrations explicitly after a backup. Full dump restore belongs only to fresh installs or intentional recovery.

**Why:** The deployment documentation referenced missing scripts and treated a full dump as an automatic migration, which caused clean Docker builds to fail and could risk production data.

**How to apply:** Keep Docker build inputs limited to files committed in the repository. Use Compose database health checks for startup ordering, `docker compose build`/`up` for code updates, and a separate reviewed migration or deliberate restore procedure for database changes.