\set ON_ERROR_STOP on
BEGIN;

DO $$
DECLARE
    test_user uuid;
    student_role smallint;
    before_update timestamptz;
    original_created timestamptz;
    -- Format-only test fixture, not a usable credential; rolled back below.
    fixture_hash text := '$argon2id$v=19$m=19456,t=2,p=1$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
BEGIN
    IF (SELECT array_agg(code ORDER BY code) FROM academy.roles)
       IS DISTINCT FROM ARRAY['ADMIN', 'STUDENT', 'TEACHER']::text[] THEN
        RAISE EXCEPTION 'Expected exactly three seeded roles';
    END IF;

    INSERT INTO academy.users (username, password_hash)
    VALUES ('BE02_Verification', fixture_hash)
    RETURNING id, updated_at, created_at INTO test_user, before_update, original_created;

    BEGIN
        INSERT INTO academy.users (username, password_hash)
        VALUES ('be02_verification', fixture_hash);
        RAISE EXCEPTION 'Case-insensitive duplicate accepted';
    EXCEPTION WHEN unique_violation THEN NULL;
    END;
    BEGIN
        INSERT INTO academy.users (username, password_hash) VALUES ('BE02_Plaintext', 'plaintext');
        RAISE EXCEPTION 'Plaintext password accepted';
    EXCEPTION WHEN check_violation THEN NULL;
    END;
    BEGIN
        UPDATE academy.users SET status = 'INVALID' WHERE id = test_user;
        RAISE EXCEPTION 'Invalid status accepted';
    EXCEPTION WHEN check_violation THEN NULL;
    END;

    UPDATE academy.users SET status = 'LOCKED', created_at = now() + interval '1 day'
    WHERE id = test_user;
    IF NOT EXISTS (SELECT 1 FROM academy.users WHERE id = test_user
        AND updated_at > before_update AND created_at = original_created) THEN
        RAISE EXCEPTION 'Timestamp trigger failed';
    END IF;

    SELECT id INTO student_role FROM academy.roles WHERE code = 'STUDENT';
    INSERT INTO academy.user_roles (user_id, role_id) VALUES (test_user, student_role);
    BEGIN
        INSERT INTO academy.user_roles (user_id, role_id) VALUES (test_user, student_role);
        RAISE EXCEPTION 'Duplicate role assignment accepted';
    EXCEPTION WHEN unique_violation THEN NULL;
    END;
    BEGIN
        INSERT INTO academy.user_roles (user_id, role_id) VALUES (gen_random_uuid(), student_role);
        RAISE EXCEPTION 'Missing user reference accepted';
    EXCEPTION WHEN foreign_key_violation THEN NULL;
    END;
    BEGIN
        INSERT INTO academy.user_roles (user_id, role_id) VALUES (test_user, -1);
        RAISE EXCEPTION 'Missing role reference accepted';
    EXCEPTION WHEN foreign_key_violation THEN NULL;
    END;
    BEGIN
        DELETE FROM academy.roles WHERE id = student_role;
        RAISE EXCEPTION 'Assigned role deletion accepted';
    EXCEPTION WHEN foreign_key_violation THEN NULL;
    END;
    RAISE NOTICE 'BE-02 constraints verified';
END;
$$;

ROLLBACK;
SELECT code FROM academy.roles ORDER BY code;
