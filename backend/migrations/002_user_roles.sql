CREATE TABLE academy.users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    username text NOT NULL,
    username_normalized text GENERATED ALWAYS AS (lower(btrim(username))) STORED,
    password_hash text NOT NULL,
    status text NOT NULL DEFAULT 'ACTIVE',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_users_username UNIQUE (username_normalized),
    CONSTRAINT ck_users_username CHECK (
        username = btrim(username) AND char_length(username) BETWEEN 1 AND 100
    ),
    CONSTRAINT ck_users_status CHECK (status IN ('ACTIVE', 'LOCKED', 'INACTIVE')),
    -- Require an encoded Argon2id hash, never a raw password.
    -- This format check cannot prove a hash was generated correctly.
    CONSTRAINT ck_users_password_hash CHECK (
        password_hash ~ '^\$argon2id\$v=19\$m=[1-9][0-9]*,t=[1-9][0-9]*,p=[1-9][0-9]*\$[A-Za-z0-9+/]{16,}\$[A-Za-z0-9+/]{32,}$'
    )
);

CREATE TABLE academy.roles (
    id smallint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code text NOT NULL UNIQUE,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT ck_roles_code CHECK (code IN ('ADMIN', 'TEACHER', 'STUDENT'))
);

CREATE TABLE academy.user_roles (
    user_id uuid NOT NULL REFERENCES academy.users(id) ON DELETE RESTRICT,
    role_id smallint NOT NULL REFERENCES academy.roles(id) ON DELETE RESTRICT,
    assigned_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, role_id)
);
CREATE INDEX ix_user_roles_role_id ON academy.user_roles(role_id);

CREATE FUNCTION academy.set_user_timestamps() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    NEW.created_at := OLD.created_at;
    NEW.updated_at := clock_timestamp();
    RETURN NEW;
END;
$$;

CREATE TRIGGER users_update_timestamps
BEFORE UPDATE ON academy.users
FOR EACH ROW EXECUTE FUNCTION academy.set_user_timestamps();
