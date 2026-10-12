# BE-005 — Authorization và RBAC

`RbacGuard` được đăng ký bằng `APP_GUARD` trong AuthModule, áp dụng toàn bộ controller của AppModule. Mỗi route phải khai báo policy. Backend xác thực Bearer token và kiểm tra role từ DB trước khi chạy controller; việc frontend ẩn button không cấp hoặc thu hồi quyền.

## Hành vi chung

| Trường hợp | Kết quả |
|---|---|
| Protected route chưa login/token sai/hết hạn/phiên thu hồi | 401 UNAUTHORIZED |
| User đăng nhập, sai role hoặc thiếu permission | 403 FORBIDDEN |
| User đăng nhập, route chưa khai báo policy | 403 FORBIDDEN |
| Chưa login, route chưa khai báo policy | 401 UNAUTHORIZED |
| Role và permission đúng | Controller được chạy |
| Route được đánh dấu Public | Không yêu cầu Bearer token |

401/403 dùng error envelope BE-003. Không trả danh sách role cần có trong lỗi. Role lấy từ `request.currentUser` do AuthGuard truy vấn DB; không tin body/query/header role từ frontend và không dùng role claim trong JWT. Thay role có hiệu lực ở request sau. Nhiều role được hợp quyền; không có hierarchy ngầm hoặc role SUPER_ADMIN.

## Ma trận permission hiện tại

| Permission | ADMIN | TEACHER | STUDENT | Phạm vi |
|---|---|---|---|---|
| self:read | Có | Có | Có | Chính tài khoản hiện tại |
| students:read / students:manage | Có | Không | Không | Quản trị tài khoản học sinh |
| content:read / content:manage | Có | Không | Không | Month/week/lesson/question/media quản trị |
| assignments:manage | Có | Không | Không | Phân bài học |
| reports:read | Có | Không | Không | Báo cáo trung tâm |
| assigned-lessons:read | Không | Không | Có | Bài học được phân |
| own-attempts:manage | Không | Không | Có | Bài làm của mình |
| own-progress:read | Không | Không | Có | Tiến độ của mình |
| own-listening:write | Không | Không | Có | Listening events của mình |

Quyền nghiệp vụ TEACHER trong tài liệu tham chiếu chưa được chốt. Mặc định triển khai ở BE-005 chỉ cho TEACHER truy cập hồ sơ cá nhân; các quyền nghiệp vụ khác bị từ chối. `RequireRoles(TEACHER)` vẫn hỗ trợ cho route được phê duyệt sau này. Không tự cấp quyền xem toàn trung tâm hoặc quản lý nội dung cho Teacher.

## Policy của route hiện có

| Route | Policy |
|---|---|
| GET /health | Public |
| POST /auth/login | Public; service kiểm tra password và trạng thái |
| POST /auth/refresh | Public đối với Bearer; service bắt buộc refresh token hợp lệ |
| POST /auth/logout | Public đối với Bearer; service dùng refresh token để thu hồi phiên |
| GET /auth/me | self:read, cả ba role |

## Route-level permission cho module chính

Catalog typed nằm ở `src/common/authorization/route-policies.ts`. Các route nghiệp vụ dưới đây là contract cho module tiếp theo, chưa đăng ký thành endpoint trong BE-005. Dấu `*` mô tả nhóm route trong catalog, không phải matcher bảo mật.

| Nhóm route | Method | Permission |
|---|---|---|
| /api/v1/admin/students và /:id | GET | students:read |
| /api/v1/admin/students | POST | students:manage |
| /api/v1/admin/students/:id, /:id/password, /:id/status | PATCH | students:manage |
| /api/v1/admin/content/* | GET | content:read |
| /api/v1/admin/content/* | POST/PATCH/DELETE | content:manage |
| /api/v1/admin/assignments | POST | assignments:manage |
| /api/v1/admin/assignments/:id | PATCH/DELETE | assignments:manage |
| /api/v1/admin/reports/* | GET | reports:read |
| /api/v1/me/lessons và /:id | GET | assigned-lessons:read |
| /api/v1/me/attempts | POST | own-attempts:manage |
| /api/v1/me/attempts/:id | PATCH | own-attempts:manage |
| /api/v1/me/progress | GET | own-progress:read |
| /api/v1/me/listening-events | POST | own-listening:write |

Classes và Teacher-specific data scope chưa có module hoặc policy nghiệp vụ được phê duyệt; khi bổ sung phải khai báo permission và resource scope trước khi mở route.

## Dùng guard và decorator

```typescript
@Controller('api/v1/admin/students')
@RequirePermission(Permission.STUDENTS_READ)
export class StudentsController {
  @Get()
  list() { /* trả dữ liệu qua service */ }

  @Post()
  @RequirePermission(Permission.STUDENTS_MANAGE)
  create(@Body() input: CreateStudentDto) { /* gọi service */ }
}
```

Các decorator ở `src/common/authorization/access.decorators.ts`:

- `@RequirePermission(Permission.X)`: dùng permission registry tập trung; khuyến nghị cho module nghiệp vụ.
- `@RequireRoles(Role.ADMIN, Role.TEACHER)`: chấp nhận ít nhất một role được khai báo; danh sách rỗng từ chối tất cả.
- `@Authenticated()`: chỉ cần đăng nhập, không yêu cầu permission cụ thể.
- `@Public()`: không cần đăng nhập; chỉ đánh dấu route cố ý công khai.

Policy method thay thế policy controller, không hợp hai policy. Không xếp nhiều access decorator lên cùng một method/controller; chỉ chọn một policy rõ ràng. Global guard không cần `@UseGuards()` trên từng route; module chạy trong AppModule được bảo vệ tự động. App/module tách riêng phải import AuthModule để đăng ký global guard. Không thêm `@Public()` vào cả module/controller nghiệp vụ để bỏ qua kiểm tra.

RBAC kiểm tra quyền thao tác, không thay thế kiểm tra sở hữu tài nguyên. Khi triển khai dữ liệu học tập, service phải lọc theo authenticated user/assignment; không nhận student ID từ client làm căn cứ cấp quyền. Admin query phải giới hạn phạm vi trung tâm thực tế. Endpoint data chưa tồn tại nên các kiểm tra resource scope sẽ được triển khai và kiểm thử trong task tương ứng.

## Kiểm thử

```powershell
npm run build
npm test
Get-Content test/rbac.integration.cjs -Raw | docker compose exec -T api node
if ($LASTEXITCODE -ne 0) { throw 'RBAC integration failed' }
Get-Content test/auth.integration.cjs -Raw | docker compose exec -T api node
if ($LASTEXITCODE -ne 0) { throw 'Auth regression failed' }
```

RBAC integration dùng PostgreSQL và JWT thật; kiểm tra ADMIN/TEACHER/STUDENT đúng/sai role, 401/403, permission, default deny, controller/method override, nhiều role, thay đổi role trong DB, khóa tài khoản và role giả mạo từ frontend. Route fixture chỉ nằm trong test, không đưa vào production. Native `npm run test:rbac` cần DB truy cập được qua `.env`. Không có migration mới cho BE-005.
