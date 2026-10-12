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
