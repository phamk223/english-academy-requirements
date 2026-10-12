CREATE TABLE academy.student_profiles (
    user_id uuid PRIMARY KEY REFERENCES academy.users(id) ON DELETE RESTRICT,
    student_code text UNIQUE,
    display_name text NOT NULL CHECK (char_length(btrim(display_name)) BETWEEN 1 AND 150),
    email text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE academy.teacher_profiles (
    user_id uuid PRIMARY KEY REFERENCES academy.users(id) ON DELETE RESTRICT,
    teacher_code text UNIQUE,
    display_name text NOT NULL CHECK (char_length(btrim(display_name)) BETWEEN 1 AND 150),
    email text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE academy.classes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    class_code text NOT NULL UNIQUE CHECK (class_code = btrim(class_code) AND char_length(class_code) BETWEEN 1 AND 50),
    class_name text NOT NULL CHECK (char_length(btrim(class_name)) BETWEEN 1 AND 150),
    description text,
    status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'ARCHIVED')),
    created_by uuid NOT NULL REFERENCES academy.users(id) ON DELETE RESTRICT,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    archived_at timestamptz
);

CREATE TABLE academy.class_memberships (
    class_id uuid NOT NULL REFERENCES academy.classes(id) ON DELETE RESTRICT,
    student_id uuid NOT NULL REFERENCES academy.student_profiles(user_id) ON DELETE RESTRICT,
    created_by uuid NOT NULL REFERENCES academy.users(id) ON DELETE RESTRICT,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (class_id, student_id)
);
CREATE INDEX ix_class_memberships_student_id ON academy.class_memberships(student_id, class_id);

CREATE TABLE academy.teacher_class_assignments (
    class_id uuid NOT NULL REFERENCES academy.classes(id) ON DELETE RESTRICT,
    teacher_id uuid NOT NULL REFERENCES academy.teacher_profiles(user_id) ON DELETE RESTRICT,
    assigned_by uuid NOT NULL REFERENCES academy.users(id) ON DELETE RESTRICT,
    assigned_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (class_id, teacher_id)
);
CREATE INDEX ix_teacher_class_assignments_teacher_id ON academy.teacher_class_assignments(teacher_id, class_id);

CREATE FUNCTION academy.update_profile_timestamp() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    NEW.created_at := OLD.created_at;
    NEW.updated_at := clock_timestamp();
    RETURN NEW;
END;
$$;
CREATE TRIGGER student_profiles_updated BEFORE UPDATE ON academy.student_profiles
FOR EACH ROW EXECUTE FUNCTION academy.update_profile_timestamp();
CREATE TRIGGER teacher_profiles_updated BEFORE UPDATE ON academy.teacher_profiles
FOR EACH ROW EXECUTE FUNCTION academy.update_profile_timestamp();
CREATE TRIGGER classes_updated BEFORE UPDATE ON academy.classes
FOR EACH ROW EXECUTE FUNCTION academy.update_profile_timestamp();

CREATE OR REPLACE FUNCTION academy.revoke_user_sessions() RETURNS trigger
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
