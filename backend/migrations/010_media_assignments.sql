CREATE TABLE academy.media (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    type text NOT NULL CHECK (type IN ('AUDIO', 'IMAGE', 'DOCUMENT')),
    storage_key text NOT NULL UNIQUE CHECK (storage_key ~ '^[0-9a-f-]{36}$'),
    mime_type text NOT NULL,
    size bigint NOT NULL CHECK (size > 0 AND size <= 20971520),
    duration_seconds integer CHECK (duration_seconds IS NULL OR duration_seconds BETWEEN 1 AND 86400),
    created_by uuid NOT NULL REFERENCES academy.users(id) ON DELETE RESTRICT,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE academy.exam_media_attachments (
    media_id uuid NOT NULL REFERENCES academy.media(id) ON DELETE RESTRICT,
    exam_version_id uuid NOT NULL REFERENCES academy.exam_versions(id) ON DELETE RESTRICT,
    section_id uuid,
    question_id uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    CHECK (num_nonnulls(section_id, question_id) = 1),
    FOREIGN KEY (section_id, exam_version_id) REFERENCES academy.exam_sections(id, exam_version_id) ON DELETE CASCADE,
    FOREIGN KEY (question_id, exam_version_id) REFERENCES academy.exam_questions(id, exam_version_id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX uq_exam_media_section ON academy.exam_media_attachments(media_id, exam_version_id, section_id) WHERE section_id IS NOT NULL;
CREATE UNIQUE INDEX uq_exam_media_question ON academy.exam_media_attachments(media_id, exam_version_id, question_id) WHERE question_id IS NOT NULL;
CREATE INDEX ix_exam_media_attachment_version ON academy.exam_media_attachments(exam_version_id, media_id);

CREATE TABLE academy.exam_assignments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id uuid NOT NULL REFERENCES academy.exams(id) ON DELETE RESTRICT,
    student_id uuid REFERENCES academy.student_profiles(user_id) ON DELETE RESTRICT,
    class_id uuid REFERENCES academy.classes(id) ON DELETE RESTRICT,
    due_at timestamptz,
    status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'CANCELLED')),
    assigned_by uuid NOT NULL REFERENCES academy.users(id) ON DELETE RESTRICT,
    created_at timestamptz NOT NULL DEFAULT now(),
    CHECK (num_nonnulls(student_id, class_id) = 1)
);
CREATE UNIQUE INDEX uq_exam_assignments_active_student ON academy.exam_assignments(exam_id, student_id) WHERE student_id IS NOT NULL AND status='ACTIVE';
CREATE UNIQUE INDEX uq_exam_assignments_active_class ON academy.exam_assignments(exam_id, class_id) WHERE class_id IS NOT NULL AND status='ACTIVE';
CREATE INDEX ix_exam_assignments_student_status ON academy.exam_assignments(student_id, status, exam_id) WHERE student_id IS NOT NULL;
CREATE INDEX ix_exam_assignments_class_status ON academy.exam_assignments(class_id, status, exam_id) WHERE class_id IS NOT NULL;
CREATE INDEX ix_exam_assignments_exam_status ON academy.exam_assignments(exam_id, status);
