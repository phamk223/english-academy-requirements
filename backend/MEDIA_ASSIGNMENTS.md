# BE-010/011 — Media và Assignment

## Media upload

`POST /media/upload` nhận `multipart/form-data` với `file` bắt buộc, tùy chọn `sectionId` hoặc `questionId` (chỉ một trong hai) để gắn vào bản nháp đề, và `durationSeconds` chỉ dành cho audio. Giá trị trả về có `id`, `type`, `mimeType`, `size`, `durationSeconds` và URL `GET /media/{id}/content`.

File tối đa 20 MiB. MIME được giới hạn cho audio MPEG/WAV/OGG/MP4/WebM/AAC; ảnh PNG/JPEG/WebP; PDF, văn bản UTF-8 và DOCX. API kiểm tra chữ ký/nội dung file cơ bản khớp MIME, không dùng tên file do client cung cấp làm storage key. Binary lưu trong volume Docker `media_data`; PostgreSQL chỉ có metadata và khóa ngẫu nhiên. Trong triển khai nhiều instance, thay volume local bằng object storage tương thích và giữ nguyên storage-key abstraction.

Có thể gắn file đã upload bằng `POST /media/{id}/attachments` với `{ "sectionId": "<uuid>" }` hoặc `{ "questionId": "<uuid>" }`. Attachment đi theo exam version; khi sửa đề đã publish, file được sao chép vào draft để lịch sử attempt giữ nguyên. Student chỉ stream được media của đề đã publish và được giao; Teacher/Admin cần là owner/uploader hoặc Admin. `DELETE /media/{id}` xóa metadata và object khi file chưa được dùng; nếu còn được tham chiếu bởi bất kỳ version đề nào thì API trả 409. Xóa section/question trong draft sẽ bỏ attachment tương ứng của draft; object được giữ cho đến khi không còn version nào tham chiếu.

## Assignments

- `POST /exams/{id}/assignments`: Teacher (đề của mình) hoặc Admin gán đề đã publish bằng đúng một `studentId` hoặc `classId`, có thể đặt `dueAt` dạng ISO-8601. Student/class phải active; Teacher chỉ gán vào lớp được phân công.
- `GET /students/me/assignments`: danh sách dành cho Student hiện tại.
- `GET /students/{id}/assignments`: Admin xem mọi student; Teacher chỉ xem student có chung lớp active được phân công. Student chỉ xem chính mình.

Mỗi cặp exam/student hoặc exam/class chỉ có một assignment `ACTIVE`; tạo trùng cùng đối tượng trả 409. Khi cùng student nhận đề trực tiếp và qua lớp, list trả một exam duy nhất với `sources` là `DIRECT`, `CLASS` hoặc cả hai. List dùng contract pagination BE-003. Exam phải còn trạng thái `PUBLISHED`; exam draft/archive không hiển thị cho Student.

## Thử trên Swagger

1. Mở `/docs`, đăng nhập Admin/Teacher tại `POST /auth/login`, rồi Authorize bằng `data.accessToken`.
2. Tạo đề và section, rồi gọi `POST /media/upload` bằng file thực (Swagger gửi multipart). Có thể upload trước và gắn sau qua `/media/{id}/attachments`.
3. Publish đề bằng `PATCH /exams/{id}` với `{ "status": "PUBLISHED" }`; gọi `POST /exams/{id}/assignments` cho student hoặc class.
4. Đăng nhập Student, thay token trong Authorize; gọi `GET /students/me/assignments` và `GET /media/{id}/content`.

Các response JSON dùng success/error envelope chung. Khi vượt 20 MiB trả 413; MIME không hỗ trợ hoặc không khớp nội dung trả 415; xóa media còn được dùng trả 409.
