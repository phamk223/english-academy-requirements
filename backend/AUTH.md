# BE-004 — Authentication

Auth API dùng success/error envelope BE-003. Migration `004_auth_sessions.sql` thêm session/refresh token và trigger thu hồi phiên; `005_argon2_hash_format.sql` hỗ trợ hai thứ tự tham số PHC Argon2id hợp lệ mà không sửa migration cũ.

## Chiến lược token

- Access token: JWT HS256, default 15 phút. Claims `sub` (user UUID), `sid` (session UUID), `jti`, `iat`, `exp`, issuer `english-academy`, audience `english-academy-api`, type `at+jwt`. Guard kiểm tra algorithm cố định, chữ ký và claims.
- Session: thời hạn tuyệt đối default 7 ngày. Refresh không kéo dài phiên; access token cũng không vượt thời hạn phiên. `.env` cho phép access TTL tối đa 1 giờ và session TTL tối đa 30 ngày.
- Refresh token: 32 bytes ngẫu nhiên, base64url; DB chỉ lưu SHA-256, không lưu token raw. Mỗi refresh hợp lệ thay bằng token mới; giữ hash token đã dùng để phát hiện replay. Row lock serialize các lần refresh cùng session. Token cũ dùng lại thu hồi toàn bộ session.
- Logout thu hồi session và vô hiệu cả access/refresh token thuộc phiên đó. Logout một phiên không đăng xuất các phiên khác.
- Mỗi request qua AuthGuard kiểm tra session, trạng thái user và role hiện tại từ DB. JWT không chứa password/hash hoặc bản sao roles bị cũ.
- Thay đổi status hoặc password hash thu hồi tất cả phiên của user qua trigger. Mở khóa/kích hoạt lại không khôi phục phiên cũ.
- User chưa được gán role không được login. Hỗ trợ một hoặc nhiều role `ADMIN`, `TEACHER`, `STUDENT`. BE-005 bổ sung global RBAC guard; xem [AUTHORIZATION.md](./AUTHORIZATION.md) để khai báo route permission. Resource scope cho dữ liệu nghiệp vụ được kiểm tra ở service của module tương ứng.

## Endpoints

### POST /auth/login

```json
{ "username": "student01", "password": "<password>" }
```

Username lookup không phân biệt hoa/thường và trim hai đầu. Password được giữ nguyên, so sánh bằng `argon2.verify`, không compare plaintext. Hash mới dùng Argon2id (19 MiB, 2 iterations, parallelism 1) và salt ngẫu nhiên. Username không tồn tại vẫn chạy verify trên dummy hash để giảm khác biệt timing.

Thành công HTTP **200**:

```json
{
  "success": true,
  "data": {
    "accessToken": "<JWT>",
    "refreshToken": "<opaque token>",
    "tokenType": "Bearer",
    "expiresIn": 900,
    "sessionExpiresAt": "2026-10-19T00:00:00.000Z",
    "user": { "id": "<UUID>", "username": "student01", "status": "ACTIVE", "roles": ["STUDENT"] }
  },
  "meta": { "requestId": "<UUID>", "timestamp": "<ISO UTC>" }
}
```

Username không tồn tại, password sai, user LOCKED/INACTIVE hoặc không có role đều trả **401** với cùng error `{ "code": "UNAUTHORIZED", "message": "Authentication required" }`. Body không hợp lệ trả 400 field-level validation theo BE-003.

### GET /auth/me

Header `Authorization: Bearer <accessToken>`. HTTP **200** với `data` gồm `id`, `username`, `status`, `roles`. Không trả password hash. Token sai/hết hạn, session hết hạn/thu hồi hoặc user không ACTIVE trả 401.

### POST /auth/refresh

```json
{ "refreshToken": "<current refresh token>" }
```

HTTP **200** trả cùng data shape như login, gồm access/refresh token mới. Token không tồn tại, đã dùng, phiên hết hạn/thu hồi hoặc tài khoản không ACTIVE trả 401. Client thay refresh token sau mỗi lần thành công và serialize refresh để tránh hai request dùng cùng token; replay cố tình thu hồi phiên kể cả khi request trước đã thành công.

### POST /auth/logout

Body giống refresh. HTTP **200**, `data: null`. Không cần access token vì refresh token chứng minh quyền thu hồi phiên ngay cả khi access token đã hết hạn. Token đang dùng hoặc token cũ đều thu hồi phiên tương ứng. Token không tồn tại và logout lặp vẫn trả 200. Body sai định dạng trả 400.

## Chạy local và tạo tài khoản

`.env` của workspace đã có JWT secret ngẫu nhiên; không commit hoặc log secret. Khi setup mới từ `.env.example`, thay placeholder bằng 32 bytes ngẫu nhiên trước khi chạy Compose:

```powershell
Copy-Item .env.example .env
node -e "const fs=require('node:fs'); const c=require('node:crypto'); fs.writeFileSync('.env',fs.readFileSync('.env','utf8').replace('replace_with_random_64_hex_characters',c.randomBytes(32).toString('hex')))"
# Đổi POSTGRES_PASSWORD và password trong DATABASE_URL.
docker compose up --build -d --wait
```

Không seed tài khoản mặc định. Tạo user local bằng CLI đọc password từ stdin và chỉ lưu hash, không truyền password trong command arguments. Chạy từ thư mục backend:

```powershell
$taskUsername = Read-Host 'Username'
$taskRoles = (Read-Host 'Roles, separated by commas: ADMIN,TEACHER,STUDENT').Split(',') | ForEach-Object { $_.Trim() }
$taskSecurePassword = Read-Host 'Password (15-1024 characters)' -AsSecureString
$taskCredential = [System.Net.NetworkCredential]::new('', $taskSecurePassword)
@{ username = $taskUsername; password = $taskCredential.Password; roles = @($taskRoles) } | ConvertTo-Json -Compress | docker compose exec -T api node scripts/create-user.cjs
Remove-Variable taskCredential, taskSecurePassword
```

CLI tạo user ACTIVE và roles trong một transaction, từ chối username trùng; không log input hoặc hash. Không có registration API trong scope này.

## Kiểm thử

```powershell
npm run build
npm test
Get-Content test/auth.integration.cjs -Raw | docker compose exec -T api node
if ($LASTEXITCODE -ne 0) { throw 'Auth integration failed' }
```

Integration test tạo fixture với password ngẫu nhiên, kiểm tra cả ba role, login lỗi chung, status, current roles, refresh rotation/replay/concurrency, logout, expiry, JWT audience, password change và throttling. Fixtures được xóa ở cuối test. Native `npm run test:auth` cần `.env` trỏ tới DB truy cập được; Compose không publish cổng DB.

## Vận hành

- API trả token trong JSON, không dùng ambient cookie; client gửi Bearer explicit. Tích hợp browser cần quyết định token storage phù hợp (ví dụ BFF/HttpOnly cookie với CSRF protection), không đưa token vào URL hay log.
- Auth responses có `Cache-Control: no-store`. HTTP loopback phục vụ local; deployment dùng HTTPS và secrets manager. Secret sai định dạng làm API fail startup.
- Rate limit local: login 20 requests/phút/IP, tổng `/auth` 60 requests/phút/IP; 429 vẫn dùng error envelope, có Retry-After. Store hiện ở memory, phù hợp stack một process. Deploy nhiều replica cần shared store/gateway và trust-proxy theo topology thực tế; hiện không tin header forwarded của client.
- Giữ token hash đã dùng đến hết thời hạn session để phát hiện replay. Dọn session đã hết hạn qua scheduled maintenance sau khi chốt retention; xóa session cascade token hashes. Chưa có automation dọn dữ liệu trong BE-004.
- BE-004 không tạo reset password, registration hoặc MFA; RBAC đã được bổ sung ở BE-005. PasswordService được export để các service tạo/đổi user sau này dùng cùng hashing policy.

Tham chiếu: [OWASP Password Storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html), [OWASP Authentication](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html), [JOSE](https://github.com/panva/jose), [node-argon2](https://github.com/ranisalt/node-argon2).
