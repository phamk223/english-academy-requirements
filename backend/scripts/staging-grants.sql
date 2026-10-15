-- Run as migration owner with psql -v runtime_role=academy_runtime -f scripts/staging-grants.sql.
-- Provision LOGIN credentials securely outside this file. Runtime role must not own tables or be superuser.
GRANT USAGE ON SCHEMA academy TO :"runtime_role";
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA academy TO :"runtime_role";
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA academy TO :"runtime_role";
REVOKE UPDATE, DELETE ON academy.audit_log FROM :"runtime_role";
REVOKE ALL ON public.schema_migrations FROM :"runtime_role";
-- Reapply after each migration: deliberately do not grant automatic privileges on future tables.
