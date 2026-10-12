# BE-007 — Exam Core

Migration `008_exam_core.sql` tạo `exams`, `exam_versions` và `exam_attempts`. Mỗi exam khởi tạo version 1 ở trạng thái DRAFT. `sections` là placeholder JSON array để mở rộng cấu trúc sau.

## API

- `POST /exams`: tạo đề DRAFT; có thể truyền `status: PUBLISHED` để publish ngay.
- `GET /exams`: list có `q`, `status`, pagination; Student chỉ nhận đề PUBLISHED.
- `GET /exams/:id`: Student chỉ xem published snapshot; draft không hiện sẽ trả 404.
- `PATCH /exams/:id`: sửa draft hoặc tạo draft version kế tiếp từ version đã publish; `status: PUBLISHED` đóng băng draft thành published snapshot.
- `DELETE /exams/:id`: archive, không xóa lịch sử.

Teacher chỉ quản lý đề do mình tạo; Admin quản lý toàn bộ. Version đã publish không bị chỉnh sửa. `exam_attempts` tham chiếu cặp exam/version có foreign key `ON DELETE RESTRICT`, giữ nguyên đề của attempt cũ.

Thử bằng Swagger: tạo exam DRAFT, xác minh Student nhận 404, publish qua PATCH, xác minh Student xem được. Sửa title/sections rồi publish lại; version được tăng và attempt cũ tiếp tục tham chiếu version ban đầu.
