# BE-012/013 — Attempt và chấm điểm

## Luồng API trên Swagger

1. Admin/Teacher tạo câu hỏi, publish đề và giao cho student qua BE-011.
2. Student đăng nhập, Authorize token, gọi `POST /exams/{id}/attempts` với body rỗng. API trả attempt `IN_PROGRESS` cùng snapshot đề, options và media; không trả answer key.
3. Gọi `PATCH /attempts/{id}/answers` để lưu từng batch. Dùng question ID và option ID trong snapshot attempt.
4. Gọi `POST /attempts/{id}/submit` với body rỗng. Backend chấm đáp án đã lưu và khóa sửa. Gọi `GET /attempts/{id}` để xem kết quả.

```json
{
  "answers": [
    { "questionId": "<uuid>", "answer": { "selectedOptionIds": ["<option-uuid>"] } },
    { "questionId": "<uuid>", "answer": { "value": false } },
    { "questionId": "<uuid>", "answer": { "text": "Hello world" } },
    { "questionId": "<uuid>", "answer": { "pairs": [{ "left": "A", "right": "1" }] } }
  ]
}
```

## State, quyền và phiên bản

- Trước khi tạo attempt, trạng thái nghiệp vụ là `NOT_STARTED`; DB hỗ trợ state này. Endpoint bắt đầu tạo hoặc chuyển attempt sang `IN_PROGRESS`.
- Chỉ Student được bắt đầu/lưu/nộp bài của mình. Student khác nhận 404; Admin/Teacher chỉ đọc attempt (Teacher cần sở hữu đề), không sửa điểm qua các API này.
- Bắt đầu mới cần đề `PUBLISHED`, assignment `ACTIVE` trực tiếp hoặc qua class active và còn hạn. Chỉ cần một nguồn assignment còn hiệu lực. Student inactive/locked mất quyền qua auth guard.
- Gọi bắt đầu nhiều lần khi đang làm trả cùng attempt; các request bắt đầu đồng thời được serialize. Sau khi nộp được bắt đầu một attempt mới; chưa giới hạn số lần làm bài.
- `examVersionId` được cố định lúc bắt đầu. Publish đề mới, đổi answer key hoặc archive đề không thay đổi nội dung/chấm điểm attempt cũ. Attempt đang làm có thể tiếp tục lưu/nộp sau khi assignment hết hạn hoặc bị hủy; deadline chỉ chặn lần bắt đầu mới.
- Nộp bài idempotent. Lưu câu trả lời sau `SUBMITTED` hoặc `GRADED` trả 409. Batch lưu đáp án là atomic; câu không thuộc snapshot hoặc đáp án sai type làm rollback toàn batch.

## Quy tắc chấm điểm

- Mỗi câu tối đa **1 điểm**, chấm tất cả hoặc không có điểm; chưa hỗ trợ trọng số/điểm một phần.
- `MULTIPLE_CHOICE`/`CHOOSE_CORRECT`: so đúng tập option ID với các index trong AnswerKey của snapshot; thứ tự chọn không ảnh hưởng.
- `TRUE_FALSE`: so boolean chính xác.
- `SHORT_ANSWER`: so accepted answers sau chuẩn hóa Unicode NFKC, bỏ khoảng trắng đầu/cuối, gộp khoảng trắng và không phân biệt hoa/thường.
- `MATCHING`: so toàn bộ cặp left/right, bỏ khoảng trắng đầu/cuối, không phụ thuộc thứ tự cặp; phân biệt hoa/thường.
- Câu chưa trả lời nhận 0 điểm. Writing/Speaking hoặc câu không có key/support được ghi `NEEDS_MANUAL_GRADING`, score tạm thời 0, maxScore 1.
- Có câu cần chấm tay: attempt giữ `SUBMITTED`, `gradingStatus=NEEDS_MANUAL_GRADING`. Tất cả câu auto-grade: attempt là `GRADED`. Chưa cung cấp API chấm tay/rubric.
- Tổng `score` là điểm đã chấm; `maxScore` tính cả câu cần chấm tay, nên điểm khi còn manual là tạm thời. Backend đọc `attempt_answers`, tính và ghi score trong cùng transaction với submit; không nhận score/status/version từ client.

## Kiểm thử

`npm run build`, `npm test`, và với Docker/PostgreSQL đã migrate:

```powershell
Get-Content test/attempt-scoring.integration.cjs -Raw | docker compose exec -T api node
```

Integration kiểm tra start đồng thời, phân quyền, chặn score giả, lưu/nộp bài, version/key snapshot, khóa bài đã nộp, chấm đúng năm type objective, câu thiếu đáp án và manual grading.
