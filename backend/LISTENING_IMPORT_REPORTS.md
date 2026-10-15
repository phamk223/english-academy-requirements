# BE-014/015/016 — Frontend API contract

Các endpoint JSON dùng envelope BE-003. Authorize Bearer token tại `/docs`. Các ID đều UUID. Không gửi score, tổng listeningTime hoặc userId để tự chọn owner; server lấy user từ session.

## Listening

Chỉ STUDENT được gọi, chỉ áp dụng audio gắn vào LISTENING section của đúng exam version trong attempt `IN_PROGRESS`.

`POST /listening/sessions` (201):

```json
{ "attemptId": "<uuid>", "sectionId": "<uuid>", "mediaId": "<uuid>" }
```

Response `data`: `id`, `attemptId`, `sectionId`, `mediaId`, `startedAt`, `endedAt`, `actualListeningTime`, `unit: "seconds"`. Chỉ một session mở trên một attempt; gọi lại cùng section/media trả session hiện có, media khác trả 409 đến khi đóng session cũ.

`POST /listening/sessions/{id}/events` (200):

```json
{ "eventId": "<uuid>", "type": "HEARTBEAT", "position": 12.5, "clientTimestamp": "2026-10-15T08:00:12.500Z" }
```

Types: `PLAY`, `PAUSE`, `SEEK`, `HEARTBEAT`, `END`. Position là giây, không âm, tối đa 86400 và không vượt duration media nếu đã biết. Frontend gửi tuần tự theo đồng hồ client, heartbeat mỗi 10 giây khi phát; retry giữ nguyên eventId và payload. EventId idempotent trong session, payload khác dùng cùng ID trả 409. Timestamp đi lùi hoặc vượt server hơn 5 giây bị từ chối.

`POST /listening/sessions/{id}/end` dùng cùng payload, type bắt buộc `END`. END qua `/events` cũng đóng session. Bài nộp tự đóng session còn mở; chỉ retry event cũ được chấp nhận sau khi đóng, event mới trả 409. Session student khác trả 404; role khác Student trả 403; thiếu login trả 401.

Server tính thời gian cho khoảng trước event khi đang PLAY: nhỏ nhất của thời gian server đã trôi, delta clientTimestamp, delta playback position và 15 giây. PAUSE dừng cộng; SEEK không cộng khoảng nhảy vị trí; heartbeat khi pause không cộng. Gửi offline hàng loạt, sửa tổng hoặc nhảy position không làm tăng thời gian vượt quan sát của server. Không tính phần không có event kết thúc/heartbeat. Đây là thời gian playback quan sát được, không xác nhận người dùng thực sự nghe hoặc chú ý. Reading/Writing/Speaking và score không dùng chỉ số này.

## Async import

ADMIN/TEACHER gọi `POST /exam-imports` multipart với `file` duy nhất, tối đa 20 MiB. Response **202**: `data.jobId`, `status: UPLOADED`, `createdAt`. HTTP chỉ kiểm tra kích thước/MIME/signature và lưu source, không chạy parser.

Poll `GET /exam-imports/{jobId}`: `jobId`, `status`, `examId`, `result`, `error`, `createdAt`, `updatedAt`. `error` gồm code ổn định và reason rõ ràng, không có stack/path/secret. Owner hoặc Admin được xem; Student bị 403, giáo viên khác 404.

State: `UPLOADED → PROCESSING → NEEDS_REVIEW → READY`; lỗi chuyển `FAILED`. Source và metadata nằm trong storage/DB. Worker PostgreSQL queue có row lock SKIP LOCKED, lease 120 giây, tối đa 3 lần khi worker chết; một transaction tạo draft và ghi kết quả nên worker retry không tạo hai đề.

| Input | MVP result |
|---|---|
| DOCX | Lấy chữ từ `word/document.xml` vào section READING `config.sourceText` |
| PDF | `pdftotext`, timeout 20 giây; scan không có text cần tác giả nhập/OCR bên ngoài |
| Audio | Section LISTENING có media reference; chưa STT/tự tạo câu hỏi |
| PNG/JPEG/WebP | Section READING có media reference; chưa OCR/tự tạo câu hỏi |
| UTF-8 text | Section READING với `sourceText` |
| ZIP | Chỉ chứa `exam.json` theo [sample](./examples/exam-import.json); parse question/options/AnswerKey vào schema chuẩn |

DOCX/ZIP giới hạn 100 entries, 32 MiB mỗi entry, tổng 64 MiB, expansion ratio tối đa 100x (trừ payload dưới 1 KiB). Từ chối encryption, ZIP64, symlink, traversal và XML entity/doctype. ZIP assets chưa hỗ trợ: upload media riêng sau đó gắn vào section/question. Không tự đoán đáp án từ tài liệu tự do.

`result` chỉ trả examId/title/sectionCount/questionCount/warnings, không trả AnswerKey/storage key. Mở `GET /exams/{examId}` bằng Teacher token để sửa draft, tạo/sửa câu hỏi qua BE-008/009. `POST /exam-imports/{jobId}/review` với `{}` đánh dấu READY, giữ exam DRAFT. Chỉ `PATCH /exams/{examId}` với `status: PUBLISHED` của Teacher/Admin mới publish. Với source text/media, giáo viên cần bổ sung câu hỏi trước khi giao bài.

`config.sourceText` là tài liệu nguồn riêng cho tác giả, có thể chứa cả đáp án gốc; backend loại trường này khỏi student exam/attempt response kể cả sau publish. Giáo viên chuyển phần nội dung phù hợp sang prompt/content hoặc config phục vụ bài làm sau khi review.

## Reports

`GET /reports/students`, `/reports/classes`, `/reports/exams`, `/reports/listening` nhận `studentId`, `classId`, `examId`, `week=2026-W42` **hoặc** `month=2026-10`, `page=1`, `limit=20` (tối đa 100). Tuần ISO bắt đầu thứ Hai, tất cả mốc UTC; khoảng [start,end). Không gửi week và month cùng lúc. Không filter thời gian nghĩa là tất cả dữ liệu.

Admin xem toàn trung tâm. Teacher chỉ xem attempt trên đề mình sở hữu hoặc học sinh thuộc lớp mình được phân công; report classes chỉ có lớp được phân công, filter class ngoài quyền trả 404. Student 403, thiếu login 401. Không trả đáp án/password/session/storage metadata.

Reports students/classes/exams: `id`, `label`, `attemptCount`, `submittedCount`, `gradedCount`, `needsManualGradingCount`, `totalScore`, `averagePercent`. Chỉ bài GRADED vào điểm tổng/trung bình; avg bỏ bài maxScore=0 và trả null khi chưa có bài chấm xong. Thời gian filter theo attempt.startedAt, gồm mọi lần retake. Report classes dựa trên **membership hiện tại**, không tái dựng lịch sử chuyển lớp; một attempt có thể thuộc nhiều lớp nhưng không bị nhân trong report student/exam.

Report listening: `studentId`, `examId`, `sectionId`, `mediaId`, `eventCount`, `actualListeningTime` (giây). Sum `credited_ms` từ playback_events, không lấy tổng client hoặc tổng cache session; filter theo event.receivedAt. Mọi list dùng pagination và snapshot transaction để count/page nhất quán. Chưa có export: frontend phân trang tối đa 100 hàng/request.
