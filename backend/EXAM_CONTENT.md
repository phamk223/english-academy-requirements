# BE-008/009 — Exam Sections và Question Engine

Migration `009_exam_sections_questions.sql` thêm section, question, options và answer key gắn với `exam_version`. Section type dùng chung: `READING`, `LISTENING`, `WRITING`, `SPEAKING`. Các section giữ thứ tự bằng `sort_order`; mọi mutation chạy trong transaction. ID section/question ổn định qua các version để route giữ nguyên khi tạo draft kế tiếp.

## API

- `POST /exams/:examId/sections`: thêm section vào draft, nhận `type`, optional `order` và `config`.
- `PATCH /sections/:id`: đổi `type`, `order`, `config`.
- `DELETE /sections/:id`: xóa section của draft. Questions, options và answer key của section trong version đó bị cascade xóa; version đã publish và attempt cũ giữ nguyên. Media chưa có bảng trong phạm vi hiện tại; khi thêm cần FK theo version với cùng chính sách cascade trong draft.
- `POST /sections/:sectionId/questions`: thêm question.
- `GET /sections/:sectionId/questions`: list phân trang; Student chỉ đọc version published và không nhận `answerKey`; Admin/Teacher có answer key.
- `PATCH /questions/:questionId`, `DELETE /questions/:questionId`: sửa/xóa trong draft.
- `POST /questions/reorder`: body `{ "sectionId": "<uuid>", "questionIds": ["<uuid>", "<uuid>"] }`; phải gửi đủ mỗi question hiện có đúng một lần. Cập nhật thứ tự nguyên tử, giữ nguyên question.

Question type và answer key:

| Type | Options | `answerKey` |
|---|---|---|
| `MULTIPLE_CHOICE` | Tối thiểu 2 | `{ "correctOptionIndexes": [0] }`, có thể nhiều index |
| `CHOOSE_CORRECT` | Tối thiểu 2 | `{ "correctOptionIndexes": [1] }`, đúng một index |
| `TRUE_FALSE` | Không dùng | `{ "value": true }` |
| `SHORT_ANSWER` | Không dùng | `{ "acceptedAnswers": ["answer"] }` |
| `MATCHING` | Không dùng | `{ "pairs": [{ "left": "A", "right": "1" }, { "left": "B", "right": "2" }] }` |

POST/PATCH/DELETE exam content chỉ cho ADMIN/TEACHER; Teacher chỉ thao tác đề do mình tạo. Thử API qua Swagger `/docs`: tạo draft, tạo section, thêm MC question, publish đề, login bằng student và đọc list câu hỏi để xác nhận answer key không xuất hiện. Sau đó sửa đề và publish lại để kiểm tra attempt cũ vẫn tham chiếu version trước.

Kiểm thử tích hợp PostgreSQL thật (chạy từ `backend`):

```powershell
Get-Content test/exam-content.integration.cjs -Raw | docker compose exec -T api node
if ($LASTEXITCODE -ne 0) { throw 'Exam content integration failed' }
```
