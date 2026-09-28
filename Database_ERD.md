# English Academy — Database ER Diagram

The diagram below visualizes the PostgreSQL reference schema in [`database/schema.sql`](./database/schema.sql). It is a logical ERD; the SQL file is the source for exact column definitions and constraints.

```mermaid
erDiagram
    USERS {
        uuid id PK
        text username
        text username_normalized UK
        text password_hash
        text display_name
        text account_status
        timestamptz created_at
        timestamptz deleted_at
    }
    ROLES {
        smallint id PK
        text code UK
        text name
    }
    USER_ROLES {
        uuid user_id PK, FK
        smallint role_id PK, FK
        timestamptz assigned_at
        uuid assigned_by FK
    }
    STUDENT_PROFILES {
        uuid user_id PK, FK
        text student_code UK
    }
    TEACHER_PROFILES {
        uuid user_id PK, FK
        text teacher_code UK
    }
    CLASSES {
        uuid id PK
        text class_code UK
        text class_name
        text status
    }
    CLASS_MEMBERSHIPS {
        uuid id PK
        uuid class_id FK
        uuid student_id FK
        date valid_from
        date valid_until
    }
    TEACHER_CLASS_ASSIGNMENTS {
        uuid id PK
        uuid class_id FK
        uuid teacher_id FK
        date valid_from
        date valid_until
    }
    LEARNING_MONTHS {
        uuid id PK
        smallint calendar_year
        smallint month_number
        text title
        text status
    }
    LEARNING_WEEKS {
        uuid id PK
        uuid month_id FK
        smallint week_number
        date start_date
        date end_date
        smallint sort_order
    }
    LESSONS {
        uuid id PK
        text lesson_code UK
        uuid created_by FK
        timestamptz archived_at
    }
    LESSON_VERSIONS {
        uuid id PK
        uuid lesson_id FK
        uuid week_id FK
        integer version_number
        text title
        text status
        boolean is_current
        timestamptz published_at
    }
    LESSON_MEDIA {
        uuid id PK
        uuid lesson_version_id FK
        text media_type
        text source_type
        text storage_key
        text external_url
    }
    QUESTIONS {
        uuid id PK
        uuid lesson_version_id FK
        text question_type
        text prompt
        numeric points
        smallint sort_order
    }
    QUESTION_OPTIONS {
        uuid id PK
        uuid question_id FK
        text option_key
        text option_text
        smallint sort_order
    }
    QUESTION_ANSWER_KEYS {
        uuid question_id PK, FK
        jsonb answer_key
        timestamptz updated_at
    }
    CLASS_LESSON_ASSIGNMENTS {
        uuid id PK
        uuid class_id FK
        uuid lesson_id FK
        timestamptz available_from
        timestamptz due_at
        text status
    }
    STUDENT_LESSON_ASSIGNMENTS {
        uuid id PK
        uuid student_id FK
        uuid lesson_id FK
        timestamptz available_from
        timestamptz due_at
        text status
    }
    LESSON_ATTEMPTS {
        uuid id PK
        uuid student_id FK
        uuid lesson_version_id FK
        integer attempt_number
        text status
        timestamptz started_at
        timestamptz submitted_at
        numeric score
    }
    LESSON_ATTEMPT_ANSWERS {
        uuid id PK
        uuid attempt_id FK
        uuid question_id FK
        uuid lesson_version_id FK
        jsonb answer_data
        boolean is_correct
        numeric awarded_points
    }
    LISTENING_SESSIONS {
        uuid id PK
        uuid student_id FK
        uuid lesson_version_id FK
        uuid attempt_id FK
        timestamptz started_at
        timestamptz ended_at
        integer credited_seconds
    }
    LISTENING_PLAYBACK_EVENTS {
        uuid id PK
        uuid session_id FK
        text client_event_id
        text event_type
        timestamptz client_occurred_at
        timestamptz received_at
        integer media_position_seconds
    }
    AUDIT_LOG {
        uuid id PK
        uuid actor_user_id FK
        text action
        text target_type
        uuid target_id
        timestamptz occurred_at
        jsonb change_summary
    }

    USERS ||--o{ USER_ROLES : assigned
    ROLES ||--o{ USER_ROLES : grants
    USERS ||--o| STUDENT_PROFILES : has
    USERS ||--o| TEACHER_PROFILES : has
    CLASSES ||--o{ CLASS_MEMBERSHIPS : contains
    STUDENT_PROFILES ||--o{ CLASS_MEMBERSHIPS : joins
    CLASSES ||--o{ TEACHER_CLASS_ASSIGNMENTS : taught_by
    TEACHER_PROFILES ||--o{ TEACHER_CLASS_ASSIGNMENTS : assigned
    LEARNING_MONTHS ||--o{ LEARNING_WEEKS : contains
    LEARNING_WEEKS ||--o{ LESSON_VERSIONS : organizes
    LESSONS ||--o{ LESSON_VERSIONS : versioned_as
    LESSON_VERSIONS ||--o{ LESSON_MEDIA : includes
    LESSON_VERSIONS ||--o{ QUESTIONS : contains
    QUESTIONS ||--o{ QUESTION_OPTIONS : offers
    QUESTIONS ||--o| QUESTION_ANSWER_KEYS : has_key
    CLASSES ||--o{ CLASS_LESSON_ASSIGNMENTS : receives
    LESSONS ||--o{ CLASS_LESSON_ASSIGNMENTS : assigned
    STUDENT_PROFILES ||--o{ STUDENT_LESSON_ASSIGNMENTS : receives
    LESSONS ||--o{ STUDENT_LESSON_ASSIGNMENTS : assigned
    STUDENT_PROFILES ||--o{ LESSON_ATTEMPTS : makes
    LESSON_VERSIONS ||--o{ LESSON_ATTEMPTS : attempted_as
    LESSON_ATTEMPTS ||--o{ LESSON_ATTEMPT_ANSWERS : records
    QUESTIONS ||--o{ LESSON_ATTEMPT_ANSWERS : answered
    STUDENT_PROFILES ||--o{ LISTENING_SESSIONS : listens
    LESSON_VERSIONS ||--o{ LISTENING_SESSIONS : played
    LESSON_ATTEMPTS o|--o{ LISTENING_SESSIONS : may_link
    LISTENING_SESSIONS ||--o{ LISTENING_PLAYBACK_EVENTS : emits
    USERS o|--o{ AUDIT_LOG : acts
```

## How to read it

- `||` means exactly one; `o|` means zero or one; `o{` means zero or many; `|{` means one or many.
- A Student or Teacher profile extends a user account. Role assignments are kept separately in `USER_ROLES`.
- A lesson has versioned content. Questions and media belong to a specific lesson version; attempts retain the version taken.
- A Student can receive a lesson through a class assignment, an individual assignment, or both, subject to approved rules.
- Attempt answers reference both an attempt and its lesson version/question so an answer cannot be attached to a question from a different lesson version.
- Listening sessions store validated credited time; playback events provide the trace used to calculate it. The event edge rules still need Product/BA agreement.
- `QUESTION_ANSWER_KEYS` is restricted grading data and must not be exposed through Student APIs.

## Scope caveats

Class management, Teacher-to-class assignments, individual lesson assignment, audit logging, and some role rules are conditional or require confirmation in the requirements. They are shown to make dependencies visible; their presence in this diagram does not independently approve them for MVP. See [Database_Design.md](./Database_Design.md) for design assumptions and open decisions.

