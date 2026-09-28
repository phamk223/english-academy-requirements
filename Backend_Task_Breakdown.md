# English Academy — Backend Work Breakdown

**Document type:** Backend implementation work plan  
**Version:** 1.0  
**Status:** Draft for estimation and sprint planning  
**Related specification:** [English_Academy_FR_NFR_Requirements.md](./English_Academy_FR_NFR_Requirements.md)  
**Related work plan:** [Frontend_Task_Breakdown.md](./Frontend_Task_Breakdown.md)  
**Scope:** Backend services and data contracts for Student and center Admin experiences. Teacher-specific permissions, parent accounts, and future learning modules remain subject to confirmation.

## 1. Purpose

This document breaks the English Academy requirements into Backend tasks that can be estimated, assigned, implemented, and accepted. It focuses on API behavior, persistence, authorization, reporting, media handling, operational requirements, and integration with the Frontend. It does not prescribe a programming language, framework, database, or hosting provider.

Task IDs use `BE-###`. Requirement references point to the related FR/NFR IDs. Items marked **Clarification required** need Product/BA or IT decisions before implementation is treated as final scope.

## 2. Backend scope

### MVP-aligned work

- Authentication and account lifecycle for confirmed roles.
- Student-specific data, lesson assignment, lesson/question content, submissions and results.
- Listening Time records and aggregation by student, lesson, day, week, and month.
- Admin APIs for account/content management and learning reports.
- API documentation, access control, data integrity, backup/recovery, and operational handoff.

### Conditional or future scope

Speaking media submissions, Vocabulary/Reading/Writing exercises, rewards/badges, parent accounts, charts beyond agreed report summaries, Excel export, and Super Admin-specific capabilities are conditional, proposed, or future items. Do not build these as approved MVP behavior without scope confirmation.

## 3. Work breakdown

| ID | Work item | Backend deliverable / acceptance criteria | Depends on | Requirement refs | Priority / status |
|---|---|---|---|---|---|
| BE-001 | Confirm domain and access rules | Agree entities, role matrix, ownership boundaries, class membership, content assignment, history retention, and MVP/future scope. Record decisions and unresolved cases before finalizing API contracts. | BA/customer/IT | FR-02–04, FR-31, FR-63–72, FR-87–91 | Must; several decisions TBD |
| BE-002 | Define API and data contracts | Publish versioned API contract for auth, accounts, content, assignment, questions, attempts, Listening Time, and reports. Define field names, validation/error format, pagination, date/time format, and idempotency expectations. Frontend can implement from contract without guessing. | BE-001; Frontend coordination | All API-backed FRs | Must |
| BE-003 | Bootstrap service and environments | Set up application configuration, environment separation, health/readiness endpoints, migrations, secrets configuration, and documented local/deploy workflows using the team-approved stack. No secrets committed to source control. | Engineering/IT stack decisions | NFR-13, NFR-15 | Must; stack TBD |
| BE-004 | Persistence model and migrations | Define and migrate the approved model for users, roles, students, classes if approved, month/week/lesson, media references, questions, assignments, attempts, answers, Listening Time events/aggregates, and audit data if approved. Enforce referential integrity and preserve historical associations. | BE-001, BE-002 | FR-05–71, NFR-20, NFR-24 | Must; class and audit scope TBD |
| BE-005 | Authentication | Implement sign-in using center-issued username/password, secure credential verification, generic invalid-login response, and authenticated identity context. No plaintext password storage or disclosure. | BE-002, security decisions | FR-01, FR-74; NFR-05, NFR-18 | Must |
| BE-006 | Session lifecycle | Implement logout, session expiry/renewal, revocation, and locked-account behavior according to the approved session model. Expired/invalid sessions cannot access protected data. | BE-005; session policy | FR-08, FR-73, FR-76; NFR-05 | Must; expiry/refresh policy TBD |
| BE-007 | Authorization and role permissions | Enforce role and resource-level authorization server-side for every operation. Implement only approved roles; deny by default where permission is absent. Document Admin/Teacher scope; do not assume Super Admin or parent role exists. | BE-001, BE-005 | FR-02–04, FR-69–70; NFR-06–07 | Must; permission matrix TBD |
| BE-008 | Student account management | Provide Admin APIs to create and update student accounts, generate/assign unique usernames per policy, change/reset passwords, and lock/unlock accounts. Validate fields and return actionable validation errors. | BE-004, BE-007; account field policy | FR-05–08, FR-75 | Must; credential delivery/reset policy TBD |
| BE-009 | Account search and pagination | Provide paginated student list and agreed search/filter fields. Enforce Admin scope; ensure locked/inactive status and count semantics are consistent. | BE-008; list/filter decisions | FR-77 | Should; search fields/bulk actions TBD |
| BE-010 | Class and membership services | If Classes are approved, support class CRUD, student membership, teacher assignment, and class status/ownership rules. Ensure reports and lesson assignments use the same class membership definition. | BE-001 | FR-64, FR-66–69 | Conditional; class model needs confirmation |
| BE-011 | Month and week content structure | Provide APIs to create/update month and week groupings, ordering, and active/historical state. Preserve links from prior attempts/reports when new content is added. | BE-004; month/week rules | FR-10–15, FR-79 | Must |
| BE-012 | Lesson management | Provide authorized create/update/remove-or-replace APIs for Listening lessons with title/details, month/week links, order, and optional schedule. Validate references and prevent accidental loss of history under the agreed deletion policy. | BE-007, BE-011 | FR-16–18, FR-22, FR-71 | Must; schedule conditional, delete/archive behavior TBD |
| BE-013 | Media storage and link handling | Implement approved media upload/reference flow, access policy, metadata, replacement, and validation for type/size/provider. Return a stable playback reference to the frontend. Define storage capacity and delivery approach with IT. | BE-012; media/storage decisions | FR-19–21, FR-95; NFR-17 | Must; formats, size, provider, storage TBD |
| BE-014 | Question authoring APIs | Create/update/delete and order questions of the approved types: Multiple Choice, True/False, Choose Correct Answer, Short Answer, Matching. Validate type-specific data and restrict answer-key access to authorized roles. | BE-007, BE-012; question schema | FR-23–30 | Must; schemas and marking rules TBD |
| BE-015 | Lesson assignment | Provide APIs to assign lessons to student accounts and/or classes, and query assigned lessons for a student. Enforce assignment visibility consistently. Support 2–3 lessons per week as content guidance unless a hard cap is approved. | BE-010 if classes approved, BE-011–12 | FR-31, FR-67–68, FR-78–79 | Must; assignment rules TBD |
| BE-016 | Student lesson query | Return only lessons assigned to the authenticated student or approved class, with required content/media/questions and current status, while omitting answer keys and unauthorized student data. | BE-007, BE-014–15 | FR-31, FR-36, FR-70 | Must |
| BE-017 | Attempt and answer persistence | Create or update a student attempt with answers, timestamps, status, and duration fields. Define uniqueness/idempotency for repeated submits and simultaneous sessions; do not overwrite prior attempts unless the agreed policy says so. | BE-002, BE-016; attempt policy | FR-38–43, FR-96 | Must; retry/resubmission/autosave rules TBD |
| BE-018 | Scoring and completion rules | Implement server-authoritative scoring for supported question types and calculate Completed/In Progress/Not Started using approved rules. Define short-answer normalization/manual marking, score visibility, retries, and answer reveal before final acceptance. | BE-014, BE-017; BA scoring decisions | FR-34, FR-39–42 | Must; scoring/completion policy TBD |
| BE-019 | Listening Time event ingestion | Accept authenticated playback events tied to student, lesson, and attempt; validate ownership, event order, duplicate/replayed events, and plausible durations. Exclude idle page time. Agree the event/heartbeat contract with Frontend and avoid trusting arbitrary client totals as authoritative. | BE-002, BE-016; tracking semantics | FR-44–48, FR-80; NFR-24 | Must; pause/seek/background/reconnect rules TBD |
| BE-020 | Listening Time aggregation | Persist/query totals by student, lesson, day, week, and month; define timezone and week boundary; avoid double-counting overlap, retry, duplicate events, or concurrent playback. Reconcile aggregate totals with source events. | BE-019; reporting/timezone decisions | FR-48–51, FR-80, FR-56, FR-59 | Must; aggregation definitions/timezone TBD |
| BE-021 | Student activity/history API | Provide authorized history for Admin and own approved progress/history for Student, including lesson status, result, exercise duration, activity timestamp, and Listening Time. Respect visibility policy and historical content links. | BE-017–20, BE-007 | FR-09, FR-41–43, FR-53–56, FR-70 | Must; student-visible result policy TBD |
| BE-022 | Report metrics and filters | Define and implement consistent totals for students, completed/not-completed lessons, Listening Time, and results by lesson/week/month. Filter by student/class/week/month/lesson; return the applied scope and pagination metadata. Confirm whether filters combine. | BE-010, BE-015, BE-017–21; metric definitions | FR-57–64, FR-81–84 | Must; combined semantics TBD |
| BE-023 | Chart data support | If charts are approved, expose aggregated series with documented dimensions, units, and time buckets; data must match report table totals. | BE-022; chart scope | FR-85 | Conditional |
| BE-024 | Excel export | If export is approved, generate an export using authorized scope and current filters; define columns, timezone, format, size limits, and secure download lifetime. | BE-007, BE-022; export decisions | FR-65, FR-86 | Conditional; not confirmed baseline |
| BE-025 | Audit trail | If approved, record actor, action, target, time, and relevant before/after values for sensitive Admin changes. Limit audit access and retention; never record passwords or secrets. | BE-007; audit policy | FR-72; NFR-18 | BA-proposed; confirm scope/retention |
| BE-026 | Input validation and error contract | Validate payloads and references at service boundaries. Return stable error codes and field-level validation details; avoid leaking internal errors, SQL details, credentials, or student data across scopes. | BE-002 | All FR; NFR-05–07, NFR-24 | Must |
| BE-027 | Data protection and privacy | Define encryption in transit/at rest, credential hashing, secret handling, access logging, data minimization, retention/deletion, and privacy incident procedures with IT. Document controls without treating browser checks as authorization. | Security/privacy decisions | NFR-05–07, NFR-18, NFR-20, NFR-24 | Must; policy/verification TBD |
| BE-028 | Backup and recovery | Implement and document approved database/media backup and restore procedures. Define schedule, retention, encryption, recovery objectives, access control, and restore verification with IT. | Hosting/storage decisions | FR-92; NFR-16 | Must; RPO/RTO/schedule TBD |
| BE-029 | Performance and scalability baseline | Measure representative API/report/media workloads after concurrency and response targets are agreed. Optimize and document evidence against approved targets; do not treat the prior 500-user/2-second example as approved. | NFR decisions, representative dataset | NFR-08, NFR-14–17 | Must; numeric capacity target TBD |
| BE-030 | Observability and operational health | Provide structured operational logs, correlation/request IDs, health/readiness signals, and actionable service metrics. Exclude credentials and unnecessary student data from logs; define alerting with IT. | Platform/operations decisions | NFR-09–10, NFR-18 | Must; availability/alert targets TBD |
| BE-031 | API documentation and integration support | Publish endpoint/auth schemas, example requests/responses, error codes, pagination, filter behavior, event contract, and environment setup for Frontend. Keep docs aligned with deployed behavior. | BE-002; FE coordination | All API-backed FRs | Must |
| BE-032 | Deployment and data migrations | Provide repeatable deployment and migration process, safe rollback guidance, environment configuration, and release notes. Validate migrations preserve historical attempts and Listening Time. | IT/release process | NFR-13, NFR-15–16, NFR-20 | Must |
| BE-033 | Future learning modules | Keep the domain extensible for Speaking, vocabulary, reading, writing, rewards/badges, and parent experiences, but implement their APIs/data only after separate scope and privacy decisions. | Product roadmap decisions | FR-87–91 | Future scope |

## 4. Suggested implementation sequence

1. **Requirements and contracts:** BE-001–002; settle role/access, class/assignment model, scoring, Listening Time semantics, reports, and media policy.
2. **Platform and persistence:** BE-003–004; establish environments, migrations, and data model.
3. **Identity and account services:** BE-005–010; authentication, authorization, student management, and conditional class services.
4. **Learning content and assignment:** BE-011–016; month/week, lesson/media, questions, assignments, student lesson reads.
5. **Attempts and listening tracking:** BE-017–021; submission, scoring, event ingestion, aggregation, and history.
6. **Reports and optional outputs:** BE-022–025; metrics first, then conditional chart/export/audit additions.
7. **Security and operations:** BE-026–032; validation, data protection, backups, performance evidence, observability, docs, deployment.
8. **Future scope:** BE-033 only after product approval.

Parallel work is possible after BE-001–004 and API contracts are stable: account/auth services, content authoring, and reporting groundwork may be owned separately. Listening Time and report totals should share agreed event and metric definitions.

## 5. Frontend integration contracts

Backend should provide the Frontend team with:

- Authentication endpoints and session lifecycle; authenticated user identity and approved role claims.
- Error response shape, validation error field mapping, pagination conventions, and request/correlation ID behavior.
- Student dashboard and assigned lesson response schemas without answer-key leakage.
- Media upload/reference flow, accepted types/limits, and playback URLs/authorization behavior.
- Submission/scoring contract, completion state definitions, retry/resubmission behavior, and save-progress semantics.
- Listening Time event API/SDK contract and exact counting rules.
- Report filter names, combined-filter behavior, date/time zone, metric definitions, pagination, and optional export contract.
- Environment endpoints and test accounts/data that contain no real student information.

## 6. Definition of Done for each Backend task

A task is complete when:

- The agreed acceptance criteria and authorization boundaries are implemented.
- Input validation, expected errors, and persistence behavior are documented.
- API/data contracts are documented and shared with Frontend.
- Historical records and student data separation are preserved as required.
- Security-sensitive fields are not returned or logged improperly.
- Migration/deployment impact and operational ownership are documented where relevant.
- The implementation is reviewed and demonstrated in the agreed environment against approved acceptance criteria.

## 7. Planning notes

This is a work breakdown, not a committed estimate, architecture decision, or sprint schedule. Estimate tasks after the stack, API contracts, role matrix, scoring rules, Listening Time semantics, retention, media limits, and service-level targets are agreed. Requirement IDs inherit their status from the requirements specification; BA-proposed, conditional, and TBD items are not automatically approved customer scope.
