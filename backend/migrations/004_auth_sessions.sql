CREATE TABLE academy.auth_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES academy.users(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz NOT NULL,
    revoked_at timestamptz,
    CHECK (expires_at > created_at)
);
CREATE INDEX ix_auth_sessions_user_id ON academy.auth_sessions(user_id);

CREATE TABLE academy.refresh_tokens (
    token_hash text PRIMARY KEY CHECK (token_hash ~ '^[0-9a-f]{64}$'),
    session_id uuid NOT NULL REFERENCES academy.auth_sessions(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    used_at timestamptz
);
CREATE INDEX ix_refresh_tokens_session_id ON academy.refresh_tokens(session_id);

-- Revocation survives a later unlock/reactivation. Password change revokes all sessions.
CREATE FUNCTION academy.revoke_user_sessions() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.status IS DISTINCT FROM OLD.status
       OR NEW.password_hash IS DISTINCT FROM OLD.password_hash THEN
        UPDATE academy.auth_sessions SET revoked_at = COALESCE(revoked_at, clock_timestamp())
        WHERE user_id = NEW.id AND revoked_at IS NULL;
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER users_revoke_sessions
AFTER UPDATE OF status, password_hash ON academy.users
FOR EACH ROW EXECUTE FUNCTION academy.revoke_user_sessions();
