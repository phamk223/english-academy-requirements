# English Academy — BE-01

Nền tảng TypeScript / NestJS, PostgreSQL 17 và Docker Compose. BE-02 bổ sung dữ liệu user/role; BE-004 bổ sung Auth API.

BE-003: xem [API_CONTRACT.md](./API_CONTRACT.md) để dùng success/error envelope, validation theo field và pagination. Global setup áp dụng tự động cho các JSON endpoint chạy qua bootstrap.

BE-004: xem [AUTH.md](./AUTH.md) cho login/logout/refresh/me, tạo tài khoản local, JWT secret, session expiry và kiểm thử auth.

BE-005: xem [AUTHORIZATION.md](./AUTHORIZATION.md) cho global RBAC guard, decorators, ma trận quyền và route-level permission. Route mới mặc định bị từ chối khi chưa khai báo policy.

BE-006 và BE-007 bổ sung [Student/Teacher/Class management](./MANAGEMENT.md) và [Exam Core](./EXAMS.md). Các API đã hiển thị trong Swagger tại `/docs` và dùng envelope/pagination BE-003 cùng RBAC BE-005.

BE-008/009 thêm [Exam Sections và Question Engine](./EXAM_CONTENT.md): bốn skill type dùng cùng engine, question/options/answer key được version hóa theo exam. Student nhận câu hỏi không kèm answer key.

## Test API bằng Swagger

Mở [Swagger UI](http://localhost:3000/docs) sau khi chạy Docker. OpenAPI JSON ở [docs-json](http://localhost:3000/docs-json).

1. Tạo tài khoản local theo mục CLI trong [AUTH.md](./AUTH.md); không có username/password mặc định.
2. Mở `POST /auth/login`, bấm **Try it out**, nhập username/password và **Execute**.
3. Copy `data.accessToken`, bấm **Authorize**, dán token (không thêm chữ `Bearer`). Chạy `GET /auth/me` để xem user/roles.
4. Chạy `POST /auth/refresh` với `data.refreshToken`. Sau thành công thay cả access token trong Authorize và refresh token đang giữ.
5. Chạy `POST /auth/logout` với refresh token mới nhất. `/auth/me` với token cũ sẽ trả 401.

Swagger không giữ token qua reload; không chia sẻ response chứa token. Schema phản hồi gồm envelope BE-003 và lỗi validation theo field. Các endpoint nghiệp vụ chưa triển khai không xuất hiện trong Swagger.

`SWAGGER_ENABLED=true` mặc định cho local. Đặt `SWAGGER_ENABLED=false` trong `.env` rồi recreate API để tắt cả UI và JSON khi triển khai môi trường khác. Docs là route public do Swagger đăng ký riêng; các Auth API vẫn giữ nguyên guard/RBAC.

Swagger 11 tương thích NestJS 11; override `js-yaml` 5.4.3 để dùng bản đã vá của dependency được Swagger pin. Kiểm tra override khi nâng cấp Swagger.

## BE-02 — User và Role

Migration `002_user_roles.sql` tạo `academy.users`, `academy.roles`, `academy.user_roles`. Migration `003_seed_roles.sql` seed `ADMIN`, `TEACHER`, `STUDENT` tự động khi chạy stack:

```powershell
docker compose up --build -d --wait
docker compose exec db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT code FROM academy.roles ORDER BY code;"'
Get-Content scripts/verify-user-roles.sql -Raw | docker compose exec -T db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
```

- Username unique không phân biệt chữ hoa/thường qua cột generated `username_normalized`; không chấp nhận tên rỗng hoặc khoảng trắng ở đầu/cuối. Giới hạn 100 ký tự.
- `status`: `ACTIVE` (mặc định), `LOCKED`, `INACTIVE`. UUID cho user; `timestamptz` cho thời gian. Trigger tự cập nhật `updated_at` và giữ nguyên `created_at` khi update.
- Mỗi user có thể có nhiều role; khóa chính kép ngăn gán trùng. Foreign key ngăn tham chiếu không tồn tại và ngăn xóa user/role đang được gán.
- Chỉ có cột `password_hash`, yêu cầu định dạng encoded Argon2id. Ràng buộc DB chỉ kiểm tra định dạng, không xác minh chất lượng hash; tầng tạo user sau này phải hash password bằng thư viện trước khi ghi DB và không log password/hash.
- Không seed tài khoản hay password. Seed role dùng `ON CONFLICT DO NOTHING`; migration được ghi nhận và kiểm tra checksum như BE-01.
- Script kiểm tra ràng buộc dùng transaction và rollback toàn bộ dữ liệu test.

## Chạy local bằng Docker

Yêu cầu Docker Desktop đang chạy Linux containers.

```powershell
cd backend
Copy-Item .env.example .env
# Đổi POSTGRES_PASSWORD và password trong DATABASE_URL trong .env.
# Tạo JWT_SECRET ngẫu nhiên theo AUTH.md nếu setup mới.
docker compose up --build -d
Invoke-RestMethod http://localhost:3000/health
```

Nếu `.env` đã được tạo trong workspace, giữ nguyên file đó. Không commit `.env`.

Kết quả mong đợi: HTTP **200 OK**, `{"success":true,"data":{"status":"ok","database":"up"},"meta":{"requestId":"<UUID>","timestamp":"<ISO UTC>"}}`. Health chạy `SELECT 1`; DB lỗi trả **503** với code `SERVICE_UNAVAILABLE` và không lộ thông tin kết nối. API khởi động thất bại nếu cấu hình hoặc DB không hợp lệ.

```powershell
docker compose ps
docker compose logs api migrate
docker compose run --rm migrate
docker compose down
```

`down` giữ dữ liệu trong volume. Không dùng `down -v` nếu cần giữ dữ liệu. Chạy migration lần nữa sẽ bỏ qua migration đã áp dụng; sửa migration đã áp dụng sẽ bị từ chối bằng checksum. Thêm file SQL mới có số thứ tự tăng dần; runner dùng transaction và advisory lock để tránh chạy đồng thời. Không đặt lệnh ngoài transaction như `CREATE INDEX CONCURRENTLY` trong migration này. Không tự rollback schema khi API dừng.

## Cấu trúc

```text
src/
  app.module.ts
  main.ts
  config/environment.ts
  database/database.module.ts
  database/database.service.ts
  modules/health/health.module.ts
  modules/health/health.controller.ts
  modules/health/health.service.ts
migrations/001_foundation.sql
scripts/migrate.cjs
test/health.test.cjs
```

Controller nhận request, service xử lý, module đăng ký dependency. Module nghiệp vụ sau này đặt trong `src/modules/<module>/`; sử dụng DTO validation và truy vấn SQL có tham số.

## Phát triển và kiểm tra

```powershell
npm ci
npm run build
npm test
```

Test HTTP kiểm tra 200/503/404 với DB giả lập; nghiệm thu Docker phải kiểm tra DB thật riêng. `npm run dev` phục vụ phát triển; cần PostgreSQL truy cập được bằng `DATABASE_URL`. Compose không publish cổng DB mặc định; dùng Docker cho toàn bộ stack hoặc PostgreSQL riêng khi chạy Node native.

## Cấu hình và bảo mật

- `.env.example` chỉ có placeholder; `.env` bị loại khỏi Git và Docker build context. Compose truyền biến PG riêng, tránh lỗi password có ký tự đặc biệt trong URL.
- API chỉ publish trên loopback `127.0.0.1`; DB chỉ truy cập qua mạng Compose. Container API chạy user `node`, filesystem chỉ đọc và không có Linux capabilities.
- Helmet thêm security headers; body JSON giới hạn 100 KB; DTO validation bật whitelist và từ chối trường không cho phép. CORS chưa bật vì chưa có frontend origin được phê duyệt.
- Connection pool có giới hạn và timeout; đóng kết nối khi shutdown. Không ghi password hoặc lỗi kết nối chi tiết ra response.
- User PostgreSQL do image tạo dùng cho môi trường local và migration. Khi triển khai production, tách tài khoản migration và runtime với quyền tối thiểu, dùng secrets manager và TLS, cấu hình gateway/rate limit và logging theo môi trường triển khai.
- `/health` là endpoint hạ tầng, giữ nguyên đường dẫn theo BE-01; API nghiệp vụ sau này nên có version `/api/v1`.

Tham khảo tổ chức module và lifecycle: [NestJS documentation](https://docs.nestjs.com/).
