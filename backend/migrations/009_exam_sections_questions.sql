CREATE TABLE academy.exam_sections (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    exam_version_id uuid NOT NULL REFERENCES academy.exam_versions(id) ON DELETE RESTRICT,
    sort_order integer NOT NULL CHECK (sort_order > 0),
    section_type text NOT NULL CHECK (section_type IN ('READING', 'LISTENING', 'WRITING', 'SPEAKING')),
    config jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(config) = 'object'),
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (id, exam_version_id),
    UNIQUE (exam_version_id, sort_order)
);
CREATE INDEX ix_exam_sections_version_order ON academy.exam_sections(exam_version_id, sort_order, id);

CREATE TABLE academy.exam_questions (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    exam_version_id uuid NOT NULL,
    section_id uuid NOT NULL,
    sort_order integer NOT NULL CHECK (sort_order > 0),
    question_type text NOT NULL CHECK (question_type IN ('MULTIPLE_CHOICE', 'TRUE_FALSE', 'CHOOSE_CORRECT', 'SHORT_ANSWER', 'MATCHING')),
    prompt text NOT NULL CHECK (char_length(btrim(prompt)) BETWEEN 1 AND 10000),
    content jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(content) = 'object'),
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (id, exam_version_id),
    UNIQUE (section_id, exam_version_id, sort_order),
    FOREIGN KEY (section_id, exam_version_id) REFERENCES academy.exam_sections(id, exam_version_id) ON DELETE CASCADE
);
CREATE INDEX ix_exam_questions_section_order ON academy.exam_questions(section_id, exam_version_id, sort_order, id);

CREATE TABLE academy.exam_question_options (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    question_id uuid NOT NULL,
    exam_version_id uuid NOT NULL,
    sort_order integer NOT NULL CHECK (sort_order > 0),
    content jsonb NOT NULL CHECK (jsonb_typeof(content) IN ('object', 'string', 'number', 'boolean')),
    PRIMARY KEY (id, question_id, exam_version_id),
    UNIQUE (question_id, exam_version_id, sort_order),
    FOREIGN KEY (question_id, exam_version_id) REFERENCES academy.exam_questions(id, exam_version_id) ON DELETE CASCADE
);
CREATE INDEX ix_exam_question_options_question_order ON academy.exam_question_options(question_id, exam_version_id, sort_order, id);

CREATE TABLE academy.exam_answer_keys (
    question_id uuid NOT NULL,
    exam_version_id uuid NOT NULL,
    answer_key jsonb NOT NULL CHECK (jsonb_typeof(answer_key) IN ('object', 'array', 'string', 'number', 'boolean')),
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (question_id, exam_version_id),
    FOREIGN KEY (question_id, exam_version_id) REFERENCES academy.exam_questions(id, exam_version_id) ON DELETE CASCADE
);
