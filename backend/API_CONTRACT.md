# BE-003 — Global API Contract

Áp dụng cho mọi JSON endpoint, bao gồm `/health`. HTTP status giữ đúng ý nghĩa REST: GET 200, POST tạo mới 201, validation 400, không tìm thấy 404, lỗi server 500. HTTP 204/304 không có body. Download/stream sau này cần thiết kế contract riêng; không tự trả response bằng `@Res()` cho JSON endpoint vì sẽ bỏ qua interceptor.

## Success

```json
{
  "success": true,
  "data": { "status": "ok", "database": "up" },
  "meta": {
    "requestId": "01564857-e86d-42cb-a624-0a07657c9da1",
    "timestamp": "2026-10-12T00:00:00.000Z"
  }
}
```

`data` có thể là object, array hoặc null. Controller chỉ trả dữ liệu; `SuccessInterceptor` thêm envelope. Không trả envelope thủ công. Thời gian theo ISO 8601 UTC. Server tạo UUID mới cho mỗi request và trả cùng ID trong header `X-Request-Id`; không tin ID gửi từ client.

## Error và validation

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "fields": [
      { "field": "profile.name", "code": "isNotEmpty", "message": "Field must not be empty" }
    ]
  },
  "meta": {
    "requestId": "01564857-e86d-42cb-a624-0a07657c9da1",
    "timestamp": "2026-10-12T00:00:00.000Z"
  }
}
```

Validation trả **400**. `fields` chỉ có trong lỗi validation; một field có thể có nhiều lỗi. Field lồng nhau dùng dấu chấm, array dùng index (`students.0.name`); `$` chỉ lỗi cấp root. Code field lấy từ tên constraint của class-validator; client dùng `code` để xử lý/i18n, không parse `message`.

| HTTP | Code |
|---|---|
| 400 | BAD_REQUEST hoặc VALIDATION_ERROR |
| 401 | UNAUTHORIZED |
| 403 | FORBIDDEN |
| 404 | NOT_FOUND |
| 405 | METHOD_NOT_ALLOWED |
| 409 | CONFLICT |
| 413 | PAYLOAD_TOO_LARGE |
| 415 | UNSUPPORTED_MEDIA_TYPE |
| 422 | UNPROCESSABLE_ENTITY |
| 429 | TOO_MANY_REQUESTS |
| 500 | INTERNAL_SERVER_ERROR |
| 502 / 503 / 504 | BAD_GATEWAY / SERVICE_UNAVAILABLE / GATEWAY_TIMEOUT |

HttpException chưa có mapping dùng `REQUEST_FAILED` cho 4xx và `INTERNAL_SERVER_ERROR` cho 5xx. Exception không xác định trả 500. Message raw của exception, lỗi SQL, stack, request body và giá trị validation không được gửi cho client. Lỗi 5xx chỉ log request ID/status; khi bổ sung observability cần logging có redaction. Không tự suy diễn mọi lỗi database thành 409; service nghiệp vụ sau này phải map lỗi đã nhận diện sang HttpException phù hợp.

## Pagination

Query chuẩn: `?page=1&limit=20`. `page` bắt đầu từ 1, tối đa 2147483647; `limit` từ 1 đến 100. Thiếu giá trị dùng default 1/20, giá trị sai trả validation 400.

```json
{
  "success": true,
  "data": [],
  "meta": {
    "requestId": "01564857-e86d-42cb-a624-0a07657c9da1",
    "timestamp": "2026-10-12T00:00:00.000Z",
    "pagination": { "page": 1, "limit": 20, "total": 0, "totalPages": 0 }
  }
}
```

`total` là tổng số bản ghi sau filter/authorization, trước pagination. `totalPages = ceil(total / limit)`; không có bản ghi thì bằng 0. Page vượt phạm vi trả array rỗng, giữ nguyên page yêu cầu. Dùng thứ tự sort ổn định với ID làm tie-breaker. Chưa tạo list API trong BE-003.

## Quy tắc cho endpoint tiếp theo

1. Dùng DTO class cụ thể với decorator class-validator cho body/query/params. Interface/type không đủ runtime metadata. Pipe không thể validate DTO không được khai báo.
2. Dùng `@ValidateNested()` và `@Type(() => NestedDto)` cho object lồng nhau, `each: true` cho array.
3. List DTO kế thừa `PaginationQueryDto`; service query có tham số và tính tổng; controller trả `paginate(items, total, query.page, query.limit)`.
4. Return dữ liệu đã chọn field an toàn; interceptor không tự loại `password_hash` hay secret từ dữ liệu thành công.
5. Throw HttpException phù hợp. Nếu thêm code nghiệp vụ, mở rộng mapper và tests; không trả message database trực tiếp.

Global configuration đặt tại `src/config/configure-application.ts`, được gọi từ bootstrap và HTTP tests. Pipe bật transform có kiểm soát, whitelist, từ chối field ngoài DTO; implicit conversion tắt. JSON body giới hạn 100 KB; lỗi parser được chuẩn hóa thành contract lỗi chung. Helmet giữ security headers. Query/filter mới phải được khai báo trong DTO.

Kiểm tra: `npm run build` rồi `npm test`. Test dùng controller fixture riêng, không đưa endpoint test vào app production.
