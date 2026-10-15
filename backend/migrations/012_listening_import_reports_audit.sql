CREATE TABLE academy.listening_sessions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 attempt_id uuid NOT NULL REFERENCES academy.exam_attempts(id) ON DELETE RESTRICT,
 exam_version_id uuid NOT NULL,
 section_id uuid NOT NULL,
 media_id uuid NOT NULL REFERENCES academy.media(id) ON DELETE RESTRICT,
 student_id uuid NOT NULL REFERENCES academy.student_profiles(user_id) ON DELETE RESTRICT,
 started_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 ended_at timestamptz,
 last_received_at timestamptz,
 last_client_timestamp timestamptz,
 last_position double precision NOT NULL DEFAULT 0 CHECK(last_position>=0),
 playing boolean NOT NULL DEFAULT false,
 actual_listening_ms bigint NOT NULL DEFAULT 0 CHECK(actual_listening_ms>=0),
 FOREIGN KEY (section_id,exam_version_id) REFERENCES academy.exam_sections(id,exam_version_id) ON DELETE RESTRICT,
 FOREIGN KEY (attempt_id,exam_version_id) REFERENCES academy.exam_attempts(id,exam_version_id) ON DELETE RESTRICT
);
CREATE UNIQUE INDEX uq_listening_active_attempt ON academy.listening_sessions(attempt_id) WHERE ended_at IS NULL;
CREATE INDEX ix_listening_student_started ON academy.listening_sessions(student_id,started_at);
CREATE TABLE academy.playback_events (
 session_id uuid NOT NULL REFERENCES academy.listening_sessions(id) ON DELETE CASCADE,
 event_id uuid NOT NULL,
 type text NOT NULL CHECK(type IN ('PLAY','PAUSE','SEEK','HEARTBEAT','END')),
 position double precision NOT NULL CHECK(position>=0 AND position<=86400),
 client_timestamp timestamptz NOT NULL,
 received_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 credited_ms integer NOT NULL CHECK(credited_ms BETWEEN 0 AND 15000),
 PRIMARY KEY(session_id,event_id)
);
CREATE INDEX ix_playback_received ON academy.playback_events(received_at,session_id);

CREATE TABLE academy.import_jobs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 created_by uuid NOT NULL REFERENCES academy.users(id) ON DELETE RESTRICT,
 status text NOT NULL DEFAULT 'UPLOADED' CHECK(status IN ('UPLOADED','PROCESSING','NEEDS_REVIEW','READY','FAILED')),
 storage_key uuid NOT NULL UNIQUE,
 mime_type text NOT NULL,
 size integer NOT NULL CHECK(size>0 AND size<=20971520),
 exam_id uuid REFERENCES academy.exams(id) ON DELETE RESTRICT,
 result jsonb,
 error_code text,
 request_id uuid,
 lease_token uuid,
 lease_until timestamptz,
 processing_attempts integer NOT NULL DEFAULT 0,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_import_queue ON academy.import_jobs(status,lease_until,created_at);
CREATE TABLE academy.audit_log (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 kind text NOT NULL CHECK(kind IN ('DATABASE','REQUEST')),
 actor_id uuid,
 request_id uuid,
 resource_type text NOT NULL,
 resource_id text,
 action text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX ix_audit_created ON academy.audit_log(created_at);
CREATE INDEX ix_attempts_reports ON academy.exam_attempts(started_at,exam_id,student_id);
CREATE FUNCTION academy.audit_critical_change() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE row_data jsonb;
BEGIN
 row_data := CASE WHEN TG_OP='DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
 INSERT INTO academy.audit_log(kind,resource_type,resource_id,action)
 VALUES('DATABASE',TG_TABLE_NAME,coalesce(row_data->>'id',row_data->>'user_id',row_data->>'question_id',row_data->>'class_id'),TG_OP);
 RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END;
END; $$;
DO $$ DECLARE table_name text; BEGIN
 FOREACH table_name IN ARRAY ARRAY['users','user_roles','classes','class_memberships','teacher_class_assignments','exams','exam_versions','exam_sections','exam_questions','exam_answer_keys','media','exam_media_attachments','exam_assignments','exam_attempts','import_jobs'] LOOP
  EXECUTE format('CREATE TRIGGER audit_changes AFTER INSERT OR UPDATE OR DELETE ON academy.%I FOR EACH ROW EXECUTE FUNCTION academy.audit_critical_change()',table_name);
 END LOOP;
END; $$;
