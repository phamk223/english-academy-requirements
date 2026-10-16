ALTER TABLE academy.users
 ADD COLUMN deleted_at timestamptz,
 ADD COLUMN deleted_by uuid REFERENCES academy.users(id) ON DELETE RESTRICT,
 ADD CONSTRAINT ck_users_deleted_state CHECK (
  (deleted_at IS NULL AND deleted_by IS NULL) OR
  (deleted_at IS NOT NULL AND deleted_by IS NOT NULL AND status='INACTIVE')
 );

CREATE FUNCTION academy.prevent_account_restore() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF OLD.deleted_at IS NOT NULL AND
    (NEW.deleted_at IS DISTINCT FROM OLD.deleted_at OR NEW.deleted_by IS DISTINCT FROM OLD.deleted_by) THEN
  RAISE EXCEPTION 'Deleted account tombstone is immutable' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER users_prevent_restore BEFORE UPDATE ON academy.users
FOR EACH ROW EXECUTE FUNCTION academy.prevent_account_restore();

CREATE OR REPLACE FUNCTION academy.revoke_user_sessions() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.deleted_at IS NOT NULL OR NEW.status IS DISTINCT FROM OLD.status
    OR NEW.password_hash IS DISTINCT FROM OLD.password_hash THEN
  UPDATE academy.auth_sessions SET revoked_at=coalesce(revoked_at,clock_timestamp())
  WHERE user_id=NEW.id AND revoked_at IS NULL;
 END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER users_delete_revoke_sessions AFTER UPDATE OF deleted_at ON academy.users
FOR EACH ROW EXECUTE FUNCTION academy.revoke_user_sessions();
