# BE-006 — Student, Teacher và Class Management

Migration `007_management.sql` tạo `student_profiles`, `teacher_profiles`, `classes`, `class_memberships` và `teacher_class_assignments` trong schema `academy`. Khóa chính kép trên từng bảng liên kết ngăn duplicate membership/assignment. Mật khẩu tạo mới và reset được hash Argon2id; API chỉ trả password tạm một lần, còn thay đổi status/password thu hồi session.

## API

- `/students`: POST, GET (search `q`, status, pagination), GET `/:id`, PATCH `/:id`, POST `/:id/reset-password`, PATCH `/:id/status`.
- `/teachers`: POST, GET, GET `/:id`, PATCH `/:id`, PATCH `/:id/status`, DELETE `/:id` (deactivate).
- `/classes`: POST, GET, GET `/:id`, PATCH `/:id`, DELETE `/:id` (archive), POST/GET `/:id/members`, DELETE `/:id/members/:studentId`, POST/GET/DELETE `/:id/teachers`.

ADMIN và TEACHER được phép quản lý theo RBAC. Teacher chỉ xem/cập nhật lớp được phân công; lớp do Teacher tạo tự động gán người tạo. Danh sách lớp theo assignment; danh sách member ẩn student LOCKED/INACTIVE. Student LOCKED/INACTIVE không thể được thêm vào membership. Tất cả list response theo pagination BE-003.

Thử bằng Swagger: đăng nhập Admin qua `/auth/login`, bấm **Authorize** với access token; tạo student và teacher, tạo class, dùng student `id` để thêm member. Gọi lại thao tác thêm cùng student/class sẽ trả 409. Đặt `status=INACTIVE` rồi đăng nhập student đó sẽ bị từ chối.
