# BE-01 — Kết quả kiểm tra

Ngày kiểm tra: 12/10/2026.

- `npm run build`: pass.
- `npm test`: pass; kiểm tra HTTP 200 với DB khả dụng, 503 với DB lỗi, không lộ chi tiết DB và 404 cho route không tồn tại.
- `npm audit --omit=dev`: 0 lỗ hổng được báo cáo tại thời điểm kiểm tra.
- `docker compose config --quiet`: pass.
- Docker image build thành công; PostgreSQL thật khởi động healthy.
- Migration `001_foundation.sql` được áp dụng thành công.
- Chạy lại migration: thành công, không áp dụng trùng.
- Request thực tế `GET http://127.0.0.1:3000/health`: **200 OK** với `{"status":"ok","database":"up"}`.

Không áp dụng schema nghiệp vụ từ tài liệu draft. File tham chiếu của project giữ nguyên; mã nguồn mới nằm trong `backend/`.

## BE-02 — User và Role

Ngày kiểm tra: 12/10/2026, trên PostgreSQL thật trong Docker.

- `docker compose up --build -d --wait`: pass, API và DB healthy.
- Migration `002_user_roles.sql` và `003_seed_roles.sql`: áp dụng thành công.
- Query `academy.roles`: đúng ba role `ADMIN`, `STUDENT`, `TEACHER`.
- Chạy lại migration: pass, không seed trùng.
- Script `scripts/verify-user-roles.sql`: pass cho unique username không phân biệt hoa/thường, từ chối plaintext, status hợp lệ, timestamp trigger, không gán role trùng, foreign key user/role và ngăn xóa role đang dùng. Toàn bộ fixture đã rollback.
- `GET /health`: vẫn trả 200.
- Chỉ triển khai ba bảng user/role được yêu cầu; không tạo login API hay tài khoản seed.

## BE-003 — Global API Contract

Ngày kiểm tra: 12/10/2026.

- Build TypeScript pass.
- HTTP integration tests pass (2 suites): success 200/201, validation 400 với lỗi field lồng nhau và field không cho phép, query pagination default/coercion/giới hạn/query trùng, metadata và request ID, 404/409/500/503, malformed JSON 400, body quá lớn 413 và 204 không body.
- Error mapper không trả exception message, stack, raw body hoặc giá trị validation. Test cố tình đưa nội dung secret vào exception và request để xác minh không leak.
- Contract của `/health` đổi sang envelope BE-003: `success`, `data`, `meta`; mã HTTP giữ 200/503. Ví dụ BE-01 phía trên ghi nhận kết quả trước khi áp dụng envelope này.
- Pagination helper và DTO dùng chung; chưa tạo list API nghiệp vụ. Endpoint fixture chỉ nằm trong tests.
- Docker build và `up --wait` pass; API/DB healthy. Request `/health` thực tế trả HTTP 200 với envelope mới, `data.database = up`; request ID trong body khớp header `X-Request-Id`.

## BE-004 — Authentication

Ngày kiểm tra: 12/10/2026.

- `npm run build`: pass; `npm test`: 2 regression tests pass.
- `test/auth.integration.cjs` chạy trong Docker với PostgreSQL thật: pass.
- Login, me, refresh và logout thành công cho cả ADMIN, TEACHER, STUDENT.
- Argon2id hash/verify thực tế: password đúng pass, password sai fail; DB lưu encoded hash.
- Username không tồn tại, password sai, LOCKED và INACTIVE: cùng status 401 và error body chung.
- `/auth/me` trả current user/roles; thay role trong DB được phản ánh ở request sau; không lộ password_hash.
- Refresh xoay token, giữ thời hạn session tuyệt đối; DB chỉ lưu token digest. Replay token cũ và hai refresh đồng thời thu hồi session; chỉ một lần rotation thành công.
- Logout idempotent, access và refresh của phiên đã logout bị từ chối.
- Đổi password hash, khóa tài khoản thu hồi phiên; kích hoạt lại không khôi phục phiên cũ.
- Token hết hạn, JWT sai audience/không hợp lệ, thiếu Bearer token, refresh không tồn tại và session hết hạn đều bị từ chối.
- Rate limit trả 429 theo BE-003 với Retry-After.
- Fixtures có password ngẫu nhiên được xóa sau test; không seed tài khoản/password mặc định.
- Docker final build và up --wait: API/DB healthy; `/health` 200. Migration chạy lại thành công.
- `npm audit --omit=dev`: 0 vulnerabilities được báo cáo tại thời điểm kiểm tra.

Rate limit hiện dùng memory store cho một process; shared store/proxy configuration và retention cleanup cần cấu hình theo deployment như mô tả trong AUTH.md.

## BE-005 — Authorization và RBAC

Ngày kiểm tra: 12/10/2026.

- Build TypeScript pass; `npm test`: 3 tests pass, gồm guard default deny và precedence của policy.
- `test/rbac.integration.cjs` trên PostgreSQL/JWT thật: pass; đúng role 200, sai role 403, thiếu/sai token 401.
- Public route, permission registry, controller policy, method override, empty role list và unconfigured route: đúng hành vi.
- Query/header role giả mạo không nâng quyền; user có nhiều role được hợp quyền; thêm/xóa role trong DB có hiệu lực ở request kế tiếp.
- User bị LOCKED mất quyền truy cập (401 do session bị thu hồi).
- Auth integration BE-004 vẫn pass sau khi đăng ký guard global.
- Docker build/up --wait pass; API và DB healthy. Fixtures RBAC/auth được xóa sau test.
- Không thêm endpoint nghiệp vụ giả lập vào production; catalog mô tả quyền cho module tiếp theo. TEACHER mặc định chỉ self:read vì quyền nghiệp vụ trong tài liệu chưa được chốt.

## Swagger UI

Ngày kiểm tra: 12/10/2026.

- Swagger 11 tương thích NestJS 11, UI `/docs`, OpenAPI JSON `/docs-json`.
- Test HTTP Swagger pass: UI và JSON 200, bearer security chỉ khai báo cho `/auth/me`, DTO login/refresh và schema success/error có meta/field-level errors.
- Token không persist qua reload. `SWAGGER_ENABLED=false` tắt đăng ký UI/JSON.
- Build pass; `npm test`: 4 tests pass. Audit runtime: 0 vulnerabilities sau override js-yaml 5.4.3.
- Docker API/DB healthy; mở Swagger trong browser và dùng Try it out/Execute gọi GET /health thực tế trả 200 với DB up.

## BE-006/BE-007 — Management và Exam Core

Ngày kiểm tra: 13/10/2026.

- Build TypeScript: pass.
- Docker Compose build/up: PostgreSQL healthy, migration `007_management.sql` và `008_exam_core.sql` áp dụng thành công; API healthy.
- `npm test`: 4/4 test regression hiện có pass (API contract, health/DB readiness, RBAC default-deny, Swagger).
- `GET /health`: HTTP 200, `data.database = up`.
- OpenAPI `/docs-json`: có các nhóm route students, teachers, classes và exams.
- Khởi động Docker ban đầu phát hiện lỗi Swagger 404/409/422 và thiếu import DatabaseModule; đã sửa trước lần xác nhận healthy cuối.
- Các endpoint nghiệp vụ mới được biên dịch và phát hiện trong OpenAPI. Chưa chạy fixture integration end-to-end cho CRUD, RBAC từng endpoint, duplicate membership và exam versioning.

## BE-010/011 — Media Upload và Assignment

Ngày kiểm tra: 14/10/2026.

- `npm run build`: pass; `npm test`: 4/4 regression tests pass.
- Docker Compose build/up --wait: migration `010_media_assignments.sql` áp dụng; PostgreSQL và API healthy. `/health` và `/docs-json` trả HTTP 200.
- `test/media-assignment.integration.cjs` chạy với PostgreSQL thật: MIME giả bị từ chối 415, file vượt 20 MiB trả 413 theo error contract, PNG upload lưu object và metadata, media gắn đúng exam section và được giữ trong published snapshot.
- Student không thể xem assignment của user khác; Teacher chỉ thấy assignment qua lớp được phân công hoặc đề do chính họ tạo. Direct assignment trùng trả 409; assignment trực tiếp cùng assignment qua class được gộp thành một item có cả hai source.
- Student chỉ stream media của đề published đã giao; xóa media đang được một exam version tham chiếu trả 409. Fixture được dọn sau test.
- Object file đặt ở Docker volume `media_data`, API container vẫn filesystem read-only ngoài volume được mount. Không ghi binary trong PostgreSQL.
- Swagger JSON có `/media/upload`, attachment/content/delete và các route assignment. Hướng dẫn dùng ở [MEDIA_ASSIGNMENTS.md](./MEDIA_ASSIGNMENTS.md).

## BE-012/013 — Attempt Lifecycle và Scoring Engine

Ngày kiểm tra: 14/10/2026.

- TypeScript build pass; `npm test`: 5/5 tests pass, gồm scoring đúng/sai, thiếu đáp án và manual grading.
- Migration `011_attempt_scoring.sql` áp dụng thành công trên PostgreSQL thật; Docker API/DB healthy.
- Integration `test/attempt-scoring.integration.cjs`: pass. Start đồng thời trả cùng attempt; chỉ Student sở hữu được lưu/nộp, student khác 404, thiếu token 401, Admin không sửa qua endpoint Student.
- Request gửi score trực tiếp, trong answer hoặc trong submit bị từ chối. Bài dùng đáp án đã lưu và AnswerKey của version lúc bắt đầu; publish key mới không thay đổi điểm bài cũ.
- Năm type objective đúng được tổng 5 điểm; Writing đánh dấu NEEDS_MANUAL_GRADING, attempt SUBMITTED và tổng maxScore 6. Bản objective-only không có đáp án nhận 0/5, state GRADED.
- Submit đồng thời/idempotent không tính lặp; lưu sau submit trả 409. Response snapshot không có answerKey.
- Integration exam-content và media-assignment vẫn pass sau thay đổi schema/FK và truy cập media theo version attempt.
- OpenAPI có đủ bốn route attempt; POST start mô tả 201. Hướng dẫn/chính sách scoring, retake và deadline ở [ATTEMPTS.md](./ATTEMPTS.md).

## BE-014/015/016/017 — Listening, import, reports và operational hardening

Ngày kiểm tra: 15/10/2026.

- Build TypeScript pass; `npm test`: 9/9 test pass (contract, readiness, RBAC, scoring, Swagger, listening credit bounds, ZIP/schema validation, report calendar windows và upload rate limiting).
- Migration `012_listening_import_reports_audit.sql` và `013_auth_session_audit.sql` áp dụng trên DB local. Fresh-database integration tạo DB tạm rỗng, chạy đủ migration và seed, kiểm tra bảng, chạy lại idempotent rồi dọn DB tạm: pass.
- Bảy integration suites auth, RBAC, exam-content, media-assignment, attempt-scoring, listening-import-reports và fresh-migrations đều pass. Sau audit-session migration đã chạy lại auth/fresh; sau source redaction đã chạy lại listening/import/reports, exam-content và attempt-scoring.
- Listening: chỉ audio LISTENING của pinned attempt được theo dõi; sai section 400, student khác 404, duplicate eventId không cộng trùng, payload khác cùng ID 409, tổng thời gian client gửi bị reject. Credit dựa trên thời gian server và playback events, PAUSE/SEEK/END đúng quy tắc.
- Import thật DOCX/PDF/audio/PNG và ZIP exam.json đều tạo draft NEEDS_REVIEW; ZIP lỗi chuyển FAILED với code/reason cụ thể. Review chuyển READY nhưng không publish. Student bị 403 ở import, không xem draft; teacher khác 404. Source text vẫn có cho tác giả nhưng không có trong student exam hoặc attempt sau publish.
- Reports đủ bốn endpoint; dựa trên graded attempts/playback events thật, phân trang, Teacher chỉ xem scope hợp lệ, student 403, thiếu token 401, filter class ngoài quyền 404, ISO week không tồn tại 400. Listening report sum event credits bằng tổng đã nhận từ server.
- Audit DATABASE và REQUEST có bản ghi thật; không ghi payload/password/hash/token/answer key. Media attach chéo owner bằng UUID bị từ chối 404. Limiter upload trả 429 có correlation ID và Retry-After; upload validation/size regression vẫn pass.
- Backup script đã chạy; restore rehearsal thành công với 12 migration đã restore và một file mẫu được so checksum trong database/volume tạm, rồi dọn tài nguyên tạm. Source database/media không bị ghi đè; writers được start lại.
- Docker API/DB/worker healthy. `/health` và `/docs-json` 200; Swagger có đủ listening, import và reports routes, POST import mô tả 202.
- API notes: [LISTENING_IMPORT_REPORTS.md](./LISTENING_IMPORT_REPORTS.md). Runbook staging, least-privilege grants, logging/audit, checkpoint/restore và rollback strategy: [STAGING.md](./STAGING.md). Chưa deploy lên hạ tầng staging bên ngoài; không có OCR/STT/antivirus hoặc auto-question extraction từ tài liệu tự do trong MVP.
