CREATE TABLE academy.exams (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    status text NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
    created_by uuid NOT NULL REFERENCES academy.users(id) ON DELETE RESTRICT,
    published_version_id uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    archived_at timestamptz,
    CHECK (status <> 'PUBLISHED' OR published_version_id IS NOT NULL)
);

CREATE TABLE academy.exam_versions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id uuid NOT NULL REFERENCES academy.exams(id) ON DELETE RESTRICT,
    version_number integer NOT NULL CHECK (version_number > 0),
    title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 200),
    description text,
    sections jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(sections) = 'array'),
    status text NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PUBLISHED')),
    created_by uuid NOT NULL REFERENCES academy.users(id) ON DELETE RESTRICT,
    published_by uuid REFERENCES academy.users(id) ON DELETE RESTRICT,
    created_at timestamptz NOT NULL DEFAULT now(),
    published_at timestamptz,
    UNIQUE (exam_id, version_number),
    UNIQUE (exam_id, id),
    CHECK ((status = 'PUBLISHED') = (published_at IS NOT NULL)),
    CHECK ((status = 'PUBLISHED') = (published_by IS NOT NULL))
);
CREATE UNIQUE INDEX uq_exam_versions_one_draft ON academy.exam_versions(exam_id) WHERE status = 'DRAFT';
CREATE INDEX ix_exam_versions_exam_created ON academy.exam_versions(exam_id, version_number DESC);

ALTER TABLE academy.exams ADD CONSTRAINT fk_exams_published_version
    FOREIGN KEY (id, published_version_id) REFERENCES academy.exam_versions(exam_id, id) ON DELETE RESTRICT;

-- Historical attempts pin the exact immutable version they started from.
CREATE TABLE academy.exam_attempts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id uuid NOT NULL,
    exam_version_id uuid NOT NULL,
    student_id uuid NOT NULL REFERENCES academy.student_profiles(user_id) ON DELETE RESTRICT,
    status text NOT NULL DEFAULT 'IN_PROGRESS' CHECK (status IN ('IN_PROGRESS', 'SUBMITTED', 'COMPLETED', 'ABANDONED')),
    started_at timestamptz NOT NULL DEFAULT now(),
    submitted_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    FOREIGN KEY (exam_id, exam_version_id) REFERENCES academy.exam_versions(exam_id, id) ON DELETE RESTRICT,
    CHECK (submitted_at IS NULL OR submitted_at >= started_at)
);
CREATE INDEX ix_exam_attempts_student_started ON academy.exam_attempts(student_id, started_at DESC);
CREATE INDEX ix_exam_attempts_exam_version ON academy.exam_attempts(exam_id, exam_version_id);

CREATE FUNCTION academy.update_exam_timestamp() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    NEW.created_at := OLD.created_at;
    NEW.updated_at := clock_timestamp();
    RETURN NEW;
END;
$$;
CREATE TRIGGER exams_updated BEFORE UPDATE ON academy.exams
FOR EACH ROW EXECUTE FUNCTION academy.update_exam_timestamp();
