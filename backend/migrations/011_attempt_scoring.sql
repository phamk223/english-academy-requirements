ALTER TABLE academy.exam_attempts DROP CONSTRAINT exam_attempts_status_check;
UPDATE academy.exam_attempts SET status=CASE status WHEN 'COMPLETED' THEN 'GRADED' WHEN 'ABANDONED' THEN 'SUBMITTED' ELSE status END;
ALTER TABLE academy.exam_attempts ALTER COLUMN status SET DEFAULT 'NOT_STARTED';
ALTER TABLE academy.exam_attempts ADD CHECK (status IN ('NOT_STARTED','IN_PROGRESS','SUBMITTED','GRADED'));
ALTER TABLE academy.exam_attempts ADD COLUMN score integer NOT NULL DEFAULT 0 CHECK (score >= 0);
ALTER TABLE academy.exam_attempts ADD COLUMN max_score integer NOT NULL DEFAULT 0 CHECK (max_score >= score);
ALTER TABLE academy.exam_attempts ADD COLUMN grading_status text NOT NULL DEFAULT 'NOT_GRADED' CHECK (grading_status IN ('NOT_GRADED','GRADED','NEEDS_MANUAL_GRADING'));
ALTER TABLE academy.exam_attempts ADD COLUMN graded_at timestamptz;
ALTER TABLE academy.exam_attempts ADD UNIQUE (id,exam_version_id);
CREATE INDEX ix_attempts_open ON academy.exam_attempts(student_id,exam_id) WHERE status IN ('NOT_STARTED','IN_PROGRESS');

CREATE TABLE academy.attempt_answers (
    attempt_id uuid NOT NULL,
    exam_version_id uuid NOT NULL,
    question_id uuid NOT NULL,
    answer jsonb NOT NULL CHECK (jsonb_typeof(answer)='object'),
    score integer NOT NULL DEFAULT 0 CHECK (score >= 0),
    max_score integer NOT NULL DEFAULT 1 CHECK (max_score >= score),
    grading_status text NOT NULL DEFAULT 'NOT_GRADED' CHECK (grading_status IN ('NOT_GRADED','GRADED','NEEDS_MANUAL_GRADING')),
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (attempt_id,question_id),
    FOREIGN KEY (attempt_id,exam_version_id) REFERENCES academy.exam_attempts(id,exam_version_id) ON DELETE CASCADE,
    FOREIGN KEY (question_id,exam_version_id) REFERENCES academy.exam_questions(id,exam_version_id) ON DELETE RESTRICT
);
