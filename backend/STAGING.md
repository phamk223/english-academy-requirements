# Staging/UAT operations — BE-017

## Deploy

1. Dùng Node 22 và PostgreSQL 17; Docker Compose build cả API và worker. Clone repo, vào `backend`, tạo `.env` từ `.env.example`, tạo secret/password ngẫu nhiên, không dùng placeholder. Không commit file này.
2. Staging đặt `NODE_ENV=production`, `SWAGGER_ENABLED=false` sau UAT (hoặc giới hạn docs tại ingress), JWT secret ít nhất 32 byte. PORT chỉ bind loopback trong Compose; TLS và hostname do reverse proxy quản lý. CORS hiện chưa mở: frontend khác origin cần allowlist cấu hình rõ trước deploy.
3. Tách migration owner và runtime DB LOGIN. Runtime không là owner/superuser, không có CREATE/ALTER/TRUNCATE; chạy [staging-grants.sql](./scripts/staging-grants.sql) bằng migration owner sau migration. Local Compose dùng tài khoản owner của image để phát triển; staging truyền credential riêng cho migrate và api/worker qua secret manager/override environment.
4. Chạy `docker compose up --build -d --wait`. Migrate chạy trước API/worker, advisory lock và checksum chặn migration trùng/sửa file cũ. Không sửa migration đã apply. Verify `/health` 200 và API/DB/worker healthy.
5. Dùng một API replica trong cấu hình này: limiter memory theo IP auth 60/min, login 20/min, upload+import chung 20 POST/min; token/auth guard chạy trước FileInterceptor. Nếu có nhiều replica, thêm limiter dùng shared store ở gateway và cấu hình trust proxy theo đúng proxy count/CIDR; hiện không tin X-Forwarded-For. Không bật trust proxy tùy tiện. Tại ingress giới hạn request multipart khoảng 21 MiB và timeout upload phù hợp.

API/worker chạy user node, filesystem read-only trừ media volume (và worker tmpfs). API/worker memory 512 MiB; worker 1 CPU/64 PID, parser Node heap 256 MiB, timeout 30 giây, child không nhận DB/JWT env; PDF timeout 20 giây. Worker heartbeat cập nhật sau DB poll thành công; healthcheck stale >90 giây thì fail. Theo dõi unhealthy và queue bị kẹt; Docker restart policy không tự restart chỉ vì healthcheck fail.

## Logs, audit và monitoring

- Request log JSON: correlation `requestId` do server tạo, method, route template, status, durationMs, actorId. Không log URL query, username, header Authorization, token, password/hash, payload hoặc nội dung đề. Error log gồm requestId/errorType và DB errorCode nếu có; response vẫn lỗi chung không stack.
- Async job giữ requestId, worker log jobId/requestId/examId hoặc error code an toàn. Client đưa X-Request-Id khi báo lỗi để tìm cả request và worker log; frontend không tự chọn correlation ID.
- `academy.audit_log` có audit DATABASE trigger cùng transaction cho user/role, auth session (tạo/thu hồi/xóa), class/membership, đề/key, media, assignment, attempt và import job. Không lưu row JSON/hash/answer key. Audit REQUEST bổ sung actorId/requestId cho mutation thành công; nếu ghi audit bổ sung lỗi sẽ log `request_audit_write_failed`, audit trigger vẫn bảo vệ thay đổi chính trong transaction. Runtime không được UPDATE/DELETE audit.
- Theo dõi 5xx/429, latency, DB pool/query timeout, disk volume, worker health, job PROCESSING lease quá hạn/FAILED, tuổi job UPLOADED và `request_audit_write_failed`. Thu log ra hệ thống tập trung, phân quyền ops, đặt retention theo chính sách trung tâm. Audit và import sources chưa có cron xóa tự động: ops archive/xóa có kiểm soát theo retention đã duyệt, không xóa file còn reference.

## Backup và rollback

Chạy [backup.ps1](./scripts/backup.ps1) từ thư mục backend. Script tạo thư mục checkpoint mới trong `backups/` (đã gitignore), **gracefully stop API/worker** tối đa 45 giây để chốt DB/storage cùng thời điểm, pg_dump custom-format, copy media volume và SHA256 manifest rồi khởi động lại writers trong finally. Có gián đoạn ngắn; lịch chạy do ops chọn. Backup chứa dữ liệu cá nhân, hash và file: mã hóa khi lưu ngoài máy, giới hạn quyền đọc và giữ bản off-host. Không đưa backup vào Git.

Rehearsal local tự động: chạy `./scripts/verify-backup.ps1 -BackupDirectory ./backups/<checkpoint>` để verify manifest, restore dump vào database tạm, restore media vào volume mới và so hash, rồi dọn đúng database/volume tạm vừa tạo. Script dùng image `backend-api` được Compose build ở backend; không chạy bằng runtime DB role trên production.

Restore staging: tạo PostgreSQL/volume **mới**, copy `database.dump` vào DB container, tạo database trống và dùng `pg_restore --no-owner --no-acl --exit-on-error -U <migration_owner> -d <restore_database> <dump>`. Copy **nội dung** checkpoint `media/` vào root media volume mới, giữ/chown node:node. Kiểm tra checksum manifest, grants, migration checksums, `/health`, login, media stream, pinned attempt và reports trên restored stack trước khi chuyển traffic. Không restore đè database/volume đang phục vụ.

Rollback ưu tiên quay lại image trước nếu schema additive vẫn tương thích hoặc thêm forward-fix migration. Nếu không tương thích: dừng writers, restore checkpoint DB **và** storage vào stack mới, chạy image tương ứng checkpoint và chuyển traffic sau kiểm tra. Không tự chạy DROP/"down migration" trên dữ liệu UAT. Mọi migration của runner chạy trong transaction; failure rollback toàn migration batch. Test fresh database có script riêng, không chạm dữ liệu chính.

## Security review và UAT gate

- Auth: Argon2id, generic login failure, access JWT + refresh rotation/replay revoke, inactive/locked revoke sessions, rate limiting và không seed password.
- RBAC: deny-by-default guard, owner/assigned-class checks trong service; student chỉ ghi own attempt/listening, import/report dành Teacher/Admin. Gắn media cũ cần Admin hoặc uploader, ngăn UUID đoán được vượt quyền.
- Answer keys: không có trong student exam/question/attempt/job/report response; scoring chỉ đọc DB pinned version. Client score/total listeningTime/unknown DTO fields bị reject.
- Upload/import: MIME allowlist + signature và 20 MiB; UUID storage paths, không dùng filename client, không lưu binary trong PostgreSQL; ZIP không extract đường dẫn ra disk, có decompression bounds; source được worker sandbox xử lý, không chạy macro/script/remote URL. MVP không có antivirus/CDR, OCR/STT hoặc parser bố cục thông minh: staging dùng bộ tài liệu UAT kiểm soát, bổ sung scanning trước khi mở upload công khai rộng rãi.
- Staging readiness là mã/config và nghiệm thu local; TLS, domain, secret manager, quyền DB, backup off-host, alerts và restore rehearsal trên hạ tầng staging cần ops cấu hình theo môi trường.

## Acceptance commands

```powershell
npm ci
npm run build
npm test
docker compose up --build -d --wait
Get-Content test/listening-import-reports.integration.cjs -Raw | docker compose exec -T api node
Get-Content test/fresh-migrations.integration.cjs -Raw | docker compose exec -T api node
```

Fresh migration test tạo/xóa database tạm tên random `academy_acceptance_*` bằng local owner; không chạy bằng runtime DB role trên production.
