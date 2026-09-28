-- English Academy reference schema (PostgreSQL)
-- Draft only: review Database_Design.md and resolve TBD items before production use.
-- Large media binaries belong in approved media/object storage, not in these tables.

CREATE TABLE users (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    username            text NOT NULL,
    username_normalized text NOT NULL,
    password_hash       text NOT NULL,
    display_name        text NOT NULL,
    email               text,
    account_status      text NOT NULL DEFAULT 'ACTIVE'
                            CHECK (account_status IN ('ACTIVE', 'LOCKED', 'INACTIVE')),
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now(),
    last_login_at       timestamptz,
    deleted_at          timestamptz,
    CONSTRAINT uq_users_username_normalized UNIQUE (username_normalized)
);

CREATE TABLE roles (
    id          smallint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code        text NOT NULL UNIQUE,
    name        text NOT NULL,
    description text,
    is_system   boolean NOT NULL DEFAULT true,
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE user_roles (
    user_id    uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    role_id    smallint NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
    assigned_at timestamptz NOT NULL DEFAULT now(),
    assigned_by uuid REFERENCES users(id) ON DELETE SET NULL,
    PRIMARY KEY (user_id, role_id)
);

CREATE TABLE student_profiles (
    user_id       uuid PRIMARY KEY REFERENCES users(id) ON DELETE RESTRICT,
    student_code  text UNIQUE,
    created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE teacher_profiles (
    user_id       uuid PRIMARY KEY REFERENCES users(id) ON DELETE RESTRICT,
    teacher_code  text UNIQUE,
    created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE classes (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    class_code  text NOT NULL UNIQUE,
    class_name  text NOT NULL,
    description text,
    status      text NOT NULL DEFAULT 'ACTIVE'
                    CHECK (status IN ('ACTIVE', 'INACTIVE', 'ARCHIVED')),
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now(),
    archived_at timestamptz
);

CREATE TABLE class_memberships (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id    uuid NOT NULL REFERENCES classes(id) ON DELETE RESTRICT,
    student_id  uuid NOT NULL REFERENCES student_profiles(user_id) ON DELETE RESTRICT,
    valid_from  date NOT NULL DEFAULT CURRENT_DATE,
    valid_until date,
    created_at  timestamptz NOT NULL DEFAULT now(),
    CHECK (valid_until IS NULL OR valid_until >= valid_from),
    UNIQUE (class_id, student_id, valid_from)
);
CREATE INDEX ix_class_memberships_student_dates
    ON class_memberships(student_id, valid_from, valid_until);

CREATE TABLE teacher_class_assignments (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id    uuid NOT NULL REFERENCES classes(id) ON DELETE RESTRICT,
    teacher_id  uuid NOT NULL REFERENCES teacher_profiles(user_id) ON DELETE RESTRICT,
    valid_from  date NOT NULL DEFAULT CURRENT_DATE,
    valid_until date,
    assigned_by uuid REFERENCES users(id) ON DELETE SET NULL,
    created_at  timestamptz NOT NULL DEFAULT now(),
    CHECK (valid_until IS NULL OR valid_until >= valid_from),
    UNIQUE (class_id, teacher_id, valid_from)
);
CREATE INDEX ix_teacher_class_assignments_teacher
    ON teacher_class_assignments(teacher_id, valid_from, valid_until);

CREATE TABLE learning_months (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    calendar_year smallint NOT NULL CHECK (calendar_year BETWEEN 2000 AND 2200),
    month_number smallint NOT NULL CHECK (month_number BETWEEN 1 AND 12),
    title       text NOT NULL,
    status      text NOT NULL DEFAULT 'DRAFT'
                    CHECK (status IN ('DRAFT', 'ACTIVE', 'ARCHIVED')),
    created_by  uuid REFERENCES users(id) ON DELETE SET NULL,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now(),
    archived_at timestamptz,
    UNIQUE (calendar_year, month_number)
);

CREATE TABLE learning_weeks (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    month_id    uuid NOT NULL REFERENCES learning_months(id) ON DELETE RESTRICT,
    week_number smallint NOT NULL CHECK (week_number BETWEEN 1 AND 6),
    title       text NOT NULL,
    start_date  date,
    end_date    date,
    sort_order  smallint NOT NULL DEFAULT 1 CHECK (sort_order > 0),
    status      text NOT NULL DEFAULT 'DRAFT'
                    CHECK (status IN ('DRAFT', 'ACTIVE', 'ARCHIVED')),
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now(),
    CHECK (start_date IS NULL OR end_date IS NULL OR end_date >= start_date),
    UNIQUE (month_id, week_number),
    UNIQUE (month_id, sort_order)
);

CREATE TABLE lessons (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_code text UNIQUE,
    created_by  uuid REFERENCES users(id) ON DELETE SET NULL,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now(),
    archived_at timestamptz
);

CREATE TABLE lesson_versions (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id     uuid NOT NULL REFERENCES lessons(id) ON DELETE RESTRICT,
    week_id       uuid NOT NULL REFERENCES learning_weeks(id) ON DELETE RESTRICT,
    version_number integer NOT NULL CHECK (version_number > 0),
    title         text NOT NULL,
    description   text,
    instructions  text,
    status        text NOT NULL DEFAULT 'DRAFT'
                      CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
    is_current    boolean NOT NULL DEFAULT false,
    published_at  timestamptz,
    published_by  uuid REFERENCES users(id) ON DELETE SET NULL,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now(),
    UNIQUE (lesson_id, version_number),
    UNIQUE (id, lesson_id),
    CHECK (NOT is_current OR status = 'PUBLISHED')
);
CREATE UNIQUE INDEX uq_lesson_versions_one_current
    ON lesson_versions(lesson_id) WHERE is_current;
CREATE INDEX ix_lesson_versions_week_status
    ON lesson_versions(week_id, status, is_current);

CREATE TABLE lesson_media (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_version_id uuid NOT NULL REFERENCES lesson_versions(id) ON DELETE RESTRICT,
    media_type       text NOT NULL CHECK (media_type IN ('AUDIO', 'VIDEO')),
    source_type      text NOT NULL CHECK (source_type IN ('UPLOAD', 'EXTERNAL_LINK')),
    storage_key      text,
    external_url     text,
    original_name    text,
    mime_type        text,
    size_bytes       bigint CHECK (size_bytes IS NULL OR size_bytes >= 0),
    duration_seconds integer CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
    checksum         text,
    sort_order       smallint NOT NULL DEFAULT 1 CHECK (sort_order > 0),
    created_by       uuid REFERENCES users(id) ON DELETE SET NULL,
    created_at       timestamptz NOT NULL DEFAULT now(),
    CHECK (
        (source_type = 'UPLOAD' AND storage_key IS NOT NULL AND external_url IS NULL)
        OR (source_type = 'EXTERNAL_LINK' AND external_url IS NOT NULL AND storage_key IS NULL)
    ),
    UNIQUE (lesson_version_id, sort_order),
    UNIQUE (id, lesson_version_id)
);

CREATE TABLE questions (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_version_id uuid NOT NULL REFERENCES lesson_versions(id) ON DELETE RESTRICT,
    question_type     text NOT NULL CHECK (question_type IN (
                          'MULTIPLE_CHOICE', 'TRUE_FALSE', 'CHOOSE_CORRECT_ANSWER',
                          'SHORT_ANSWER', 'MATCHING'
                      )),
    prompt            text NOT NULL,
    explanation       text,
    points            numeric(8,2) NOT NULL DEFAULT 1 CHECK (points >= 0),
    is_required       boolean NOT NULL DEFAULT true,
    sort_order        smallint NOT NULL CHECK (sort_order > 0),
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now(),
    UNIQUE (lesson_version_id, sort_order),
    UNIQUE (id, lesson_version_id)
);

CREATE TABLE question_options (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id uuid NOT NULL REFERENCES questions(id) ON DELETE RESTRICT,
    option_key  text NOT NULL,
    option_text text NOT NULL,
    sort_order  smallint NOT NULL CHECK (sort_order > 0),
    UNIQUE (question_id, option_key),
    UNIQUE (question_id, sort_order)
);

-- Restrict access to this table in the application/database roles.
-- Store only grading keys/accepted answers, never include them in Student API payloads.
CREATE TABLE question_answer_keys (
    question_id uuid PRIMARY KEY REFERENCES questions(id) ON DELETE RESTRICT,
    answer_key  jsonb NOT NULL,
    updated_at  timestamptz NOT NULL DEFAULT now(),
    updated_by  uuid REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE class_lesson_assignments (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id    uuid NOT NULL REFERENCES classes(id) ON DELETE RESTRICT,
    lesson_id   uuid NOT NULL REFERENCES lessons(id) ON DELETE RESTRICT,
    assigned_by uuid REFERENCES users(id) ON DELETE SET NULL,
    assigned_at timestamptz NOT NULL DEFAULT now(),
    available_from timestamptz,
    available_until timestamptz,
    due_at      timestamptz,
    status      text NOT NULL DEFAULT 'ACTIVE'
                    CHECK (status IN ('ACTIVE', 'CANCELLED', 'ARCHIVED')),
    CHECK (available_until IS NULL OR available_from IS NULL OR available_until >= available_from),
    UNIQUE (class_id, lesson_id, assigned_at)
);
CREATE INDEX ix_class_lesson_assignments_class_status
    ON class_lesson_assignments(class_id, status, available_from, available_until);

CREATE TABLE student_lesson_assignments (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id  uuid NOT NULL REFERENCES student_profiles(user_id) ON DELETE RESTRICT,
    lesson_id   uuid NOT NULL REFERENCES lessons(id) ON DELETE RESTRICT,
    assigned_by uuid REFERENCES users(id) ON DELETE SET NULL,
    assigned_at timestamptz NOT NULL DEFAULT now(),
    available_from timestamptz,
    available_until timestamptz,
    due_at      timestamptz,
    status      text NOT NULL DEFAULT 'ACTIVE'
                    CHECK (status IN ('ACTIVE', 'CANCELLED', 'ARCHIVED')),
    CHECK (available_until IS NULL OR available_from IS NULL OR available_until >= available_from),
    UNIQUE (student_id, lesson_id, assigned_at)
);
CREATE INDEX ix_student_lesson_assignments_student_status
    ON student_lesson_assignments(student_id, status, available_from, available_until);

CREATE TABLE lesson_attempts (
    id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id            uuid NOT NULL REFERENCES student_profiles(user_id) ON DELETE RESTRICT,
    lesson_version_id     uuid NOT NULL REFERENCES lesson_versions(id) ON DELETE RESTRICT,
    attempt_number        integer NOT NULL CHECK (attempt_number > 0),
    status                text NOT NULL DEFAULT 'IN_PROGRESS'
                              CHECK (status IN ('IN_PROGRESS', 'SUBMITTED', 'COMPLETED', 'ABANDONED')),
    started_at            timestamptz NOT NULL DEFAULT now(),
    submitted_at          timestamptz,
    completed_at          timestamptz,
    exercise_duration_seconds integer CHECK (exercise_duration_seconds IS NULL OR exercise_duration_seconds >= 0),
    score                 numeric(10,2) CHECK (score IS NULL OR score >= 0),
    correct_count         integer CHECK (correct_count IS NULL OR correct_count >= 0),
    question_count        integer CHECK (question_count IS NULL OR question_count >= 0),
    created_at            timestamptz NOT NULL DEFAULT now(),
    updated_at            timestamptz NOT NULL DEFAULT now(),
    UNIQUE (student_id, lesson_version_id, attempt_number),
    UNIQUE (id, student_id, lesson_version_id),
    UNIQUE (id, lesson_version_id),
    CHECK (question_count IS NULL OR correct_count IS NULL OR correct_count <= question_count)
);
CREATE INDEX ix_lesson_attempts_student_started
    ON lesson_attempts(student_id, started_at DESC);
CREATE INDEX ix_lesson_attempts_version_status
    ON lesson_attempts(lesson_version_id, status, submitted_at);

CREATE TABLE lesson_attempt_answers (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id        uuid NOT NULL,
    question_id       uuid NOT NULL,
    lesson_version_id uuid NOT NULL,
    answer_data       jsonb NOT NULL,
    is_correct        boolean,
    awarded_points    numeric(8,2) CHECK (awarded_points IS NULL OR awarded_points >= 0),
    answered_at       timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now(),
    UNIQUE (attempt_id, question_id),
    FOREIGN KEY (attempt_id, lesson_version_id)
        REFERENCES lesson_attempts(id, lesson_version_id) ON DELETE RESTRICT,
    FOREIGN KEY (question_id, lesson_version_id)
        REFERENCES questions(id, lesson_version_id) ON DELETE RESTRICT
);
CREATE INDEX ix_lesson_attempt_answers_question
    ON lesson_attempt_answers(question_id);

CREATE TABLE listening_sessions (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id        uuid NOT NULL REFERENCES student_profiles(user_id) ON DELETE RESTRICT,
    lesson_version_id uuid NOT NULL REFERENCES lesson_versions(id) ON DELETE RESTRICT,
    attempt_id        uuid,
    started_at        timestamptz NOT NULL DEFAULT now(),
    ended_at          timestamptz,
    credited_seconds  integer NOT NULL DEFAULT 0 CHECK (credited_seconds >= 0),
    created_at        timestamptz NOT NULL DEFAULT now(),
    CHECK (ended_at IS NULL OR ended_at >= started_at),
    FOREIGN KEY (attempt_id, student_id, lesson_version_id)
        REFERENCES lesson_attempts(id, student_id, lesson_version_id) ON DELETE RESTRICT
);
CREATE INDEX ix_listening_sessions_student_started
    ON listening_sessions(student_id, started_at);
CREATE INDEX ix_listening_sessions_version_started
    ON listening_sessions(lesson_version_id, started_at);

CREATE TABLE listening_playback_events (
    id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id            uuid NOT NULL REFERENCES listening_sessions(id) ON DELETE RESTRICT,
    client_event_id       text NOT NULL,
    event_type            text NOT NULL CHECK (event_type IN (
                              'PLAY', 'PAUSE', 'RESUME', 'SEEK', 'HEARTBEAT', 'ENDED', 'ERROR'
                          )),
    client_occurred_at    timestamptz,
    received_at           timestamptz NOT NULL DEFAULT now(),
    media_position_seconds integer CHECK (media_position_seconds IS NULL OR media_position_seconds >= 0),
    metadata              jsonb NOT NULL DEFAULT '{}'::jsonb,
    UNIQUE (session_id, client_event_id)
);
CREATE INDEX ix_listening_events_session_received
    ON listening_playback_events(session_id, received_at);

CREATE TABLE audit_log (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_user_id  uuid REFERENCES users(id) ON DELETE SET NULL,
    action         text NOT NULL,
    target_type    text NOT NULL,
    target_id      uuid,
    occurred_at    timestamptz NOT NULL DEFAULT now(),
    change_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
    request_id     text
);
CREATE INDEX ix_audit_log_target_time
    ON audit_log(target_type, target_id, occurred_at DESC);
CREATE INDEX ix_audit_log_actor_time
    ON audit_log(actor_user_id, occurred_at DESC);

-- Initial system roles only. Enable additional roles only after role policy approval.
INSERT INTO roles (code, name, description) VALUES
    ('STUDENT', 'Student', 'Learner account'),
    ('ADMIN', 'Admin', 'Center administration account'),
    ('TEACHER', 'Teacher', 'Teacher account; permissions require approval');

