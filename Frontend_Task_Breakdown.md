# English Academy — Frontend Work Breakdown

**Document type:** Frontend implementation work plan  
**Version:** 1.0  
**Status:** Draft for estimation and sprint planning  
**Related specification:** [English_Academy_FR_NFR_Requirements.md](./English_Academy_FR_NFR_Requirements.md)  
**Scope:** Responsive web application for Student and center Admin experiences. Teacher permissions, parent accounts, and future learning modules remain subject to confirmation.

## 1. Purpose

This document breaks the approved/draft requirements into Frontend tasks that can be estimated, assigned, implemented, and accepted. It describes UI responsibilities and integration contracts. It does not prescribe a framework or claim that backend services already exist.

Task IDs use `FE-###`. Requirement references point to the related FR/NFR IDs in the requirements specification. Items marked **Clarification required** must be agreed with Product/BA and Backend before the affected behavior is finalized.

## 2. Frontend scope

### MVP-aligned work

- Shared application shell and responsive layouts for desktop, tablet, and mobile.
- Sign-in and role-aware navigation for the roles and permissions confirmed by the project.
- Student dashboard, weekly activities, lesson status and progress.
- Listening lesson player, comprehension questions, submission feedback, and progress display.
- Admin student account management, learning content management, and reports/statistics.
- Forms, loading/empty/error states, accessible interaction, and backend integration.

### Not assumed to be MVP

Speaking recording/practice, vocabulary, Reading/Writing exercises, rewards/badges, parent portal, Excel export, charts, and Super Admin-specific screens are conditional, future, or proposed in the specification. Build these only after scope approval.

## 3. Work breakdown

| ID | Work item | Frontend deliverable / acceptance criteria | Depends on | Requirement refs | Priority / status |
|---|---|---|---|---|---|
| FE-001 | Confirm UI flows and permissions | Review Student/Admin journeys with BA. Produce approved screen list, navigation map, and role-to-screen matrix. Record unresolved Teacher, parent, and Super Admin behavior; do not invent access rules. | BA / customer decisions | FR-02–04, FR-69, FR-87 | Must; permission details TBD |
| FE-002 | Establish frontend project shell | Application starts with agreed environment/configuration, route structure, shared layout, and error boundary. Document local run/build steps. Framework and hosting assumptions to be agreed with engineering. | FE lead / project setup | All UI features | Must |
| FE-003 | Design tokens and reusable UI | Implement agreed typography, colors, spacing, buttons, inputs, dialogs, tables, cards, status tags, and responsive breakpoints. Components have documented variants and keyboard behavior. | Approved design direction | NFR-01–04 | Must; exact visual spec TBD |
| FE-004 | Global navigation and page shell | Provide Student/Admin shells with page title, navigation, responsive menu, current-user display, and logout entry. Navigation items are gated by approved role permissions. | FE-001–003, auth contract | FR-02, FR-73 | Must |
| FE-005 | Sign-in screen and auth states | Implement username/password form, validation, pending state, generic failure message, and redirect handling. Never store plaintext credentials in browser storage. Backend owns authentication and authorization decisions. | Backend auth contract | FR-01–03, FR-74; NFR-05–07 | Must; session rules TBD |
| FE-006 | Protected routes and session handling | Prevent unauthenticated access to protected views; handle expired/invalid sessions and return the user to sign-in without exposing protected content. Show a safe message and preserve unsaved work only if approved behavior exists. | FE-005, backend session contract | FR-76; NFR-05–07 | Must; idle timeout and refresh flow TBD |
| FE-007 | Student dashboard | Show “Welcome, [Student Name]”, current-week activities, lesson cards, status, and completion progress. Handle loading, no assigned lessons, and service error states. | Student summary and assignment APIs | FR-31–35 | Must |
| FE-008 | Lesson details and media player | Show lesson content and audio/video or approved external media link. Provide play/pause/seek/replay controls supported by the product decision; communicate media load/play errors and retry. | Lesson/media API, media policy | FR-36–37, FR-95; NFR-17 | Must; formats/provider behavior TBD |
| FE-009 | Listening-time event integration | Send playback start/pause/resume/end/seek events or consume the agreed tracking SDK/API; avoid counting idle page time in the UI. Display listening totals only from the authoritative service response. Document behavior for background tabs, speed, seeking, and reconnects. | Backend tracking contract; agreed measurement rules | FR-44–51, FR-80; NFR-24 | Must; tracking semantics TBD |
| FE-010 | Question renderer | Render Multiple Choice, True/False, Choose Correct Answer, Short Answer, and Matching from the question schema. Validate required answers and preserve user input while the learner navigates the lesson. | Approved question schema | FR-23–30, FR-38 | Must; schema/scoring rules TBD |
| FE-011 | Submit exercise and show result | Submit answers, prevent accidental duplicate submission while request is pending, and show returned score/result/status. Do not calculate authoritative grades in the browser unless explicitly agreed. Support retry/resubmission only if policy is defined. | Backend submission/scoring contract | FR-39–43 | Must; grading, retry and answer reveal TBD |
| FE-012 | Student progress and history | Show completion state and approved progress/result history for the signed-in student only. Handle no-history and partial data states. | Student result API and permissions | FR-34–35, FR-40–43, FR-70 | Must; visibility of scores TBD |
| FE-013 | Admin dashboard overview | Show agreed headline statistics: student count, completed/not completed, and total Listening Time. Keep figures tied to selected scope/period and provide loading/empty/error states. | Reporting API and metric definitions | FR-53–62 | Must |
| FE-014 | Student account list and search | Display student list with approved search/filter fields, pagination, status, and entry to student detail/history. Apply server-side pagination/filtering where supported. | Student management API, list UX decision | FR-05–09, FR-77 | Must; fields and bulk actions TBD |
| FE-015 | Create/edit student account | Build validated forms for account details and username/password fields as specified by backend. Show field-level errors and success/failure feedback. Avoid exposing password after save. | FE-014, account API/schema | FR-05–07, FR-75 | Must; field schema and credential delivery TBD |
| FE-016 | Lock/unlock student account | Add confirmation and clear status feedback for lock/unlock. Update or refresh the affected list/detail after success; explain failure without changing displayed state. | Account API and permission matrix | FR-08 | Must |
| FE-017 | Student learning history view | Show lesson, status, result, exercise duration, activity timestamp, and Listening Time at the agreed level of detail. Identify units and date/time zone. | History/report APIs and definitions | FR-09, FR-41–56, NFR-25 | Must; data fields/time zone TBD |
| FE-018 | Month/week content navigation | Provide Admin views to browse/create/edit month and week groupings, order weeks/lessons, and preserve historical content. Warn before destructive actions affecting historical attempts. | Content API, archive/delete policy | FR-10–15, FR-71 | Must; month/week model and archive behavior TBD |
| FE-019 | Listening lesson editor | Build create/edit lesson form for title/details, week/month assignment, media upload or external link, and optional schedule. Validate required fields and show upload progress/errors. | Content API, media upload contract | FR-16–22, FR-93 | Must; media constraints and schedule scope TBD |
| FE-020 | Question editor | Build question authoring for supported types, options/matching pairs, answer key fields, ordering, edit, delete, and preview. Restrict answer-key display to authorized Admin/editor UI. | Question schema, permission matrix | FR-23–30, FR-93–94 | Must; answer model/scoring TBD |
| FE-021 | Content preview and publish | If draft/publish workflow is approved, allow Admin to preview content as a student and publish changes. Otherwise deliver only the approved edit/save flow. | FE-018–020, publishing API | FR-93 | Conditional; BA-proposed |
| FE-022 | Reports filters | Add filters for student, class, week, month, and lesson; display applied filters and a clear/reset action. Define whether filters combine and keep filter state while navigating results. | Reporting API supports filters; class model | FR-63–64, FR-81–84 | Must for listed filters; combined behavior TBD |
| FE-023 | Report tables and visualizations | Display result/completion/listening summaries and detail rows. Add charts only if approved and supported by defined metrics. Include accessible labels and non-chart summaries. | FE-013, reporting definitions | FR-57–64, FR-85 | Must for summaries; charts conditional |
| FE-024 | Excel export action | If export is approved, expose export only to authorized roles, include the current filter context, and show progress/failure/download feedback. | Export API and approved permissions | FR-65, FR-86 | Conditional; not baseline confirmed |
| FE-025 | Shared form and data states | Standardize loading, skeleton, empty, validation, permission-denied, not-found, offline/network, and retry states. Ensure failed requests do not falsely imply saved changes. | API error format and design system | All FR; NFR-01, NFR-05 | Must |
| FE-026 | Responsive and cross-browser behavior | Validate core Student/Admin flows at agreed desktop/tablet/mobile sizes and supported browser versions. No horizontal overflow for core views; media controls remain usable on touch devices. | Design breakpoints and supported browser list | NFR-01–04, NFR-21 | Must; browser matrix TBD |
| FE-027 | Accessibility and localization | Use semantic headings/landmarks, keyboard-operable controls, visible focus, labels, appropriate contrast, and language-aware text. Agree accessibility target and supported languages/date formats before sign-off. | Approved design/content and locale | NFR-01–02, NFR-22, NFR-25 | Must baseline; formal standard TBD |
| FE-028 | Frontend security and privacy review | Check protected routes, avoid exposing sensitive student data in URLs/logs, ensure role-based UI complements server authorization, and review browser storage behavior. UI hiding is not a substitute for backend authorization. | Backend auth/authorization design | FR-70, NFR-05–07, NFR-24 | Must |
| FE-029 | Integration and release handoff | Provide API mapping, environment variable list without secrets, build/run instructions, route list, known limitations, and deployment handoff notes. Verify production build with project-approved commands. | Backend endpoints, release process | NFR-13, NFR-15 | Must |
| FE-030 | Future learning modules | Design extension points for Speaking, Vocabulary, Reading, Writing, rewards/badges, and parent-facing experiences; implement screens only after separate scope, UX, API, and privacy decisions. | Product roadmap decisions | FR-87–91 | Future scope |

## 4. Suggested implementation sequence

1. **Discovery and contracts:** FE-001; resolve roles, API schemas, status meanings, score rules, media rules, and supported browsers.
2. **Foundation:** FE-002–006 and FE-003 design system; unblock all feature work.
3. **Student MVP:** FE-007–012; integrate assignment, lesson, submission, and listening-time APIs.
4. **Admin MVP:** FE-013–020; student and content administration.
5. **Reporting:** FE-017 and FE-022–024; finalize metrics and filter semantics before implementation.
6. **Quality and release:** FE-025–029; run agreed responsive/accessibility/security review and prepare handoff.
7. **Future scope:** FE-021 and FE-030 only after explicit approval.

Parallel work is possible after FE-001 and API contracts are agreed: Student experience (FE-007–012), Admin account/content experience (FE-014–020), and reporting (FE-013, FE-022–024) can proceed on separate branches or ownership areas.

## 5. Cross-team dependencies

### Backend/API

- Authentication, session expiry/refresh, logout, and user profile.
- Role/permission matrix and server-side authorization for every protected operation.
- Student list/detail, account create/edit/lock/unlock, and learning history.
- Month/week/lesson/question CRUD, media upload/link validation, and history/archive semantics.
- Assignment model and student-to-class relationships.
- Submission/scoring/result contract and lesson completion rules.
- Listening Time event contract and aggregation by student, lesson, day, week, and month.
- Reporting calculations and filters; optional chart/export endpoints.
- Consistent validation/error response format and pagination convention.

### BA/Product/Design

- Approved Student/Admin/Teacher role matrix; confirm whether Super Admin and parent role exist.
- MVP versus future scope, including Speaking and other exercises, charts, and Excel export.
- Lesson completion, grading, retry/resubmission, answer visibility, and deletion/archive rules.
- Listening Time behavior for pause, seek, repeated playback, playback speed, hidden tab, and interruptions.
- Supported browsers/devices, language, date/time zone, visual design, and accessibility target.
- Whether 2–3 lessons per week is guidance or an enforced limit; whether report filters combine.

## 6. Definition of Done for each Frontend task

A task is complete when:

- The agreed user flow works for the relevant role and screen sizes.
- Success, loading, empty, validation, permission-denied, and failure states are handled where applicable.
- The UI consumes the agreed API contract and does not fake successful persistence.
- Keyboard focus, labels, and accessible control names are present for interactive elements.
- No unrelated requirement is silently added; unresolved behavior is logged for BA/Product.
- The implementation is reviewed and the task's acceptance criteria are demonstrated in the agreed review environment.

## 7. Planning notes

This is a work breakdown, not a committed estimate or sprint schedule. The team should estimate each FE item after design/API dependencies are clarified. FR references inherit the status of the requirements specification; tasks tied to BA-proposed or conditional features must not be treated as confirmed customer scope.
