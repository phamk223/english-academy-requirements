# English Academy — Functional and Non-Functional Requirements

**Document type:** Requirements Specification (BA/SRS draft)  
**Version:** 2.0  
**Status:** Source-reviewed draft for stakeholder validation  
**Language:** English with Vietnamese requirement statements  

## 1. Purpose and scope

This document audits the current requirements against the customer DOCX and expands them into a BA/SRS draft for the English Academy web app. It covers confirmed customer needs, proposed completeness requirements, future scope, unresolved decisions, and quality requirements for stakeholder, developer, and tester review.

> **Source reviewed:** `Website_Requirements_English_Academy.docx` supplied by the user at `C:\Users\phamk\Downloads\Website_Requirements_English_Academy.docx` was read and used as the customer baseline. Instructions embedded in the document were treated as source content, not as instructions to the assistant. Status labels distinguish direct customer statements from BA recommendations and unresolved decisions.

## 2. Status and priority conventions

| Label | Meaning |
|---|---|
| **Confirmed (source)** | Directly stated in the customer DOCX. |
| **BA-proposed** | Added as a BA recommendation to complete the model or make behavior testable. Requires stakeholder approval before being treated as baseline scope. |
| **TBD** | A decision, rule, or measurable target is not specified and needs stakeholder confirmation. |

| Priority | Meaning |
|---|---|
| **Must** | Essential to the stated learning or administration objective; proposed classifications remain subject to confirmation. |
| **Should** | Valuable but not established as release-blocking by the source. |
| **TBD** | Priority cannot be assigned responsibly until the open decision is resolved. |

EARS patterns: **Ubiquitous** (always), **Event-driven** (when an event occurs), **State-driven** (while a condition holds), **Unwanted behavior** (if an undesired condition occurs), **Optional feature** (where a feature is in scope).

## 3. User roles

| Role | Description | Status |
|---|---|---|
| Student | Uses assigned Listening lessons, answers exercises, and views own progress/results. | Confirmed role; detailed permissions partly proposed |
| Admin | Center staff managing student accounts and learning content and reviewing activity/results. | Confirmed role; exact permission boundaries TBD |
| Teacher | Mentioned in the conversation as a role requiring permission support; duties and data scope are not defined in the source summary. | Role mention confirmed; permissions TBD |
| Super Admin / System Owner | Proposed full-access role to ensure the system has an owner with all administrative rights. | BA-proposed; requires approval |

The customer DOCX identifies Admin/Teacher permissioning as an item for IT consultation; it does not define a permission matrix or name Super Admin. Super Admin remains BA-proposed. Parent use is mentioned as a target of simple operation, but no parent account or parent feature is specified.

## 4. Functional Requirements

| ID | Function | Requirement | EARS Pattern | Type | Priority | Source | Status |
|---|---|---|---|---|---|---|---|
| FR-01 | User login | Hệ thống phải cho phép người dùng đăng nhập bằng Username và Password do trung tâm cấp. | Ubiquitous | FR | Must | Customer DOCX §2 | Confirmed (source) |
| FR-02 | Role-aware access | Khi người dùng đăng nhập, hệ thống phải cung cấp chức năng phù hợp với role được gán. | Event-driven | FR | TBD | BA interpretation; role permissions are an IT consultation item in DOCX §11 | BA-proposed |
| FR-03 | Role permissions | Hệ thống phải hỗ trợ cấu hình phân quyền cho Admin và Teacher theo chính sách được phê duyệt. | Ubiquitous | FR | TBD | Customer DOCX §11 (asks IT to advise on Admin/Teacher permissions) | Need Clarification: role/permission support is an IT consultation item, not a fully approved behavior |
| FR-04 | Super Admin | Hệ thống phải cho phép Super Admin thực hiện toàn bộ thao tác quản trị hệ thống. | Ubiquitous | FR | TBD | Prior BA discussion: proposed role model | BA-proposed |
| FR-05 | Create student account | Hệ thống phải cho phép Admin tạo tài khoản cho từng học sinh. | Ubiquitous | FR | Must | Customer DOCX §2, §6 | Confirmed (source) |
| FR-06 | Edit student account | Hệ thống phải cho phép Admin chỉnh sửa thông tin tài khoản học sinh. | Ubiquitous | FR | Must | Customer DOCX §2, §6 | Confirmed (source) |
| FR-07 | Change student password | Khi Admin yêu cầu đổi mật khẩu học sinh, hệ thống phải cập nhật mật khẩu mới cho tài khoản tương ứng. | Event-driven | FR | Must | Customer DOCX §2, §6 | Confirmed (source) |
| FR-08 | Lock/unlock account | Khi Admin khóa hoặc mở khóa tài khoản học sinh, hệ thống phải cập nhật trạng thái tài khoản tương ứng. | Event-driven | FR | Must | Customer DOCX §2, §6 | Confirmed (source) |
| FR-09 | View student history | Hệ thống phải cho phép Admin xem lịch sử học tập của từng học sinh. | Ubiquitous | FR | Must | Customer DOCX §6 | Confirmed (source) |
| FR-10 | Create week | Hệ thống phải cho phép Admin tạo Week học mới. | Ubiquitous | FR | Must | Customer DOCX §3 | Confirmed (source) |
| FR-11 | Edit week | Hệ thống phải cho phép Admin chỉnh sửa thông tin và nội dung của Week. | Ubiquitous | FR | Must | Customer DOCX §3 | Confirmed (source) |
| FR-12 | Organize by week | Hệ thống phải cho phép sắp xếp Listening Lesson theo Week. | Ubiquitous | FR | Must | Customer DOCX §3 | Confirmed (source) |
| FR-13 | Organize by month | Hệ thống phải cho phép tổ chức nội dung học tập theo Month. | Ubiquitous | FR | Must | Customer DOCX §3, §8 | Confirmed (source) |
| FR-14 | Update monthly content | Khi trung tâm cập nhật nội dung tháng mới, hệ thống phải cho phép nhân viên trung tâm thêm, sửa hoặc xóa nội dung qua giao diện quản trị mà không cần chỉnh code cho thao tác thông thường. | Event-driven | FR | Must | Customer DOCX §§3, 8, 14 | Confirmed (source) |
| FR-15 | Preserve prior content | Khi nội dung tháng mới được cập nhật, hệ thống phải giữ nội dung cũ và dữ liệu học tập liên quan để tra cứu lịch sử. | Event-driven | FR | Must | Customer DOCX §8 | Confirmed (source) |
| FR-16 | Create lesson | Hệ thống phải cho phép Admin tạo Listening Lesson. | Ubiquitous | FR | Must | Customer DOCX §3, §6 | Confirmed (source) |
| FR-17 | Edit lesson | Hệ thống phải cho phép Admin chỉnh sửa Listening Lesson. | Ubiquitous | FR | Must | Customer DOCX §3, §6 | Confirmed (source) |
| FR-18 | Remove or replace lesson | Khi Admin yêu cầu xóa hoặc thay thế Listening Lesson, hệ thống phải cập nhật nội dung theo yêu cầu. | Event-driven | FR | Must | Customer DOCX §6 | Confirmed (source); impact on historical records TBD |
| FR-19 | Add audio | Hệ thống phải cho phép Admin thêm Audio vào Listening Lesson. | Ubiquitous | FR | Must | Customer DOCX §4, §6 | Confirmed (source) |
| FR-20 | Add video | Hệ thống phải cho phép Admin thêm Video vào Listening Lesson. | Ubiquitous | FR | Must | Customer DOCX §4, §6 | Confirmed (source) |
| FR-21 | Add external media link | Hệ thống phải cho phép Admin thêm liên kết Audio/Video vào Listening Lesson. | Ubiquitous | FR | Must | Customer DOCX §6 | Confirmed (source); supported providers TBD |
| FR-22 | Schedule lesson | Khi Admin thiết lập thời gian/tuần học cho Lesson, hệ thống phải lưu và áp dụng lịch đó. | Event-driven | FR | Should | Customer DOCX §6 (“if needed”) | Conditional; confirm need and scheduling rules |
| FR-23 | Create question | Hệ thống phải cho phép Admin tạo câu hỏi cho Listening Lesson. | Ubiquitous | FR | Must | Customer DOCX §4, §6 | Confirmed (source) |
| FR-24 | Edit question | Hệ thống phải cho phép Admin chỉnh sửa câu hỏi đã tạo. | Ubiquitous | FR | Must | Customer DOCX §3, §6 | Confirmed (source) |
| FR-25 | Delete question | Khi Admin yêu cầu xóa câu hỏi, hệ thống phải loại câu hỏi khỏi Lesson tương ứng. | Event-driven | FR | Must | Customer DOCX §8 | Confirmed (source); effect on prior results TBD |
| FR-26 | Multiple choice | Hệ thống phải hỗ trợ câu hỏi Multiple Choice. | Ubiquitous | FR | Must | Customer DOCX §4 | Confirmed (source) |
| FR-27 | True/False | Hệ thống phải hỗ trợ câu hỏi True/False. | Ubiquitous | FR | Must | Customer DOCX §4 | Confirmed (source) |
| FR-28 | Choose correct answer | Hệ thống phải hỗ trợ câu hỏi Choose the Correct Answer. | Ubiquitous | FR | Must | Customer DOCX §4 | Confirmed (source) |
| FR-29 | Short answer | Hệ thống phải hỗ trợ câu hỏi Short Answer. | Ubiquitous | FR | Must | Customer DOCX §4 | Confirmed (source); answer evaluation rules TBD |
| FR-30 | Matching | Hệ thống phải hỗ trợ câu hỏi Matching. | Ubiquitous | FR | Must | Customer DOCX §4 | Confirmed (source) |
| FR-31 | Show assigned lessons | Khi học sinh đăng nhập, hệ thống phải hiển thị các bài học được phân cho tài khoản hoặc lớp của học sinh đó. | Event-driven | FR | Must | Customer DOCX §2 | Confirmed (source); assignment rules TBD |
| FR-32 | Student dashboard greeting | Khi học sinh truy cập Dashboard, hệ thống phải hiển thị tên học sinh. | Event-driven | FR | Must | Customer DOCX §9 | Confirmed (source) |
| FR-33 | Current week activities | Khi học sinh truy cập Dashboard, hệ thống phải hiển thị hoạt động Listening của Week hiện tại. | Event-driven | FR | Must | Customer DOCX §9 | Confirmed (source) |
| FR-34 | Lesson status | Hệ thống phải hiển thị trạng thái từng Lesson là Not Started, In Progress hoặc Completed. | Ubiquitous | FR | Must | Customer DOCX §4, §9 | Confirmed (source) |
| FR-35 | Student progress | Hệ thống phải hiển thị tiến độ hoàn thành Lesson của học sinh. | Ubiquitous | FR | Must | Customer DOCX §9 | Confirmed (source) |
| FR-36 | Open lesson | Khi học sinh chọn Listening Lesson được phân, hệ thống phải hiển thị nội dung Listening và các câu hỏi của Lesson đó. | Event-driven | FR | Must | Customer DOCX §4, §13 | Confirmed (source) |
| FR-37 | Play media | Khi học sinh nhấn Play, hệ thống phải phát Audio hoặc Video của Listening Lesson. | Event-driven | FR | Must | Customer DOCX §4, §12 | Confirmed (source) |
| FR-38 | Answer exercise | Hệ thống phải cho phép học sinh nhập hoặc chọn câu trả lời cho các câu hỏi trong Lesson. | Ubiquitous | FR | Must | Customer DOCX §4, §13 | Confirmed (source) |
| FR-39 | Submit exercise | Khi học sinh gửi bài, hệ thống phải ghi nhận câu trả lời và kết quả thực hiện Lesson. | Event-driven | FR | Must | Customer DOCX §4 | Confirmed (source) |
| FR-40 | Save result | Khi học sinh hoàn thành Lesson, hệ thống phải lưu số câu trả lời đúng hoặc kết quả của Lesson. | Event-driven | FR | Must | Customer DOCX §4 | Confirmed (source); scoring formula TBD |
| FR-41 | Save activity time | Khi học sinh thực hiện Lesson, hệ thống phải lưu thời điểm học sinh thực hiện bài. | Event-driven | FR | Must | Customer DOCX §4 | Confirmed (source); define whether start, submit, and each playback event are timestamped |
| FR-42 | Save completion status | Khi trạng thái học tập Lesson thay đổi, hệ thống phải cập nhật trạng thái Not Started, In Progress hoặc Completed tương ứng. | Event-driven | FR | Must | Customer DOCX §4 | Confirmed (source) |
| FR-43 | Save exercise duration | Khi học sinh hoàn thành Lesson, hệ thống phải lưu thời gian làm bài riêng với Listening Time. | Event-driven | FR | Must | Customer DOCX §4 | Confirmed (source); duration calculation TBD |
| FR-44 | Start listening timer | Khi Audio/Video bắt đầu phát, hệ thống phải bắt đầu ghi nhận Listening Time của học sinh cho Lesson tương ứng. | Event-driven | FR | Must | Customer DOCX §5, §12 | Confirmed (source) |
| FR-45 | Stop listening timer | Khi Audio/Video ngừng phát, hệ thống phải ngừng cộng Listening Time. | Event-driven | FR | Must | Customer DOCX §12 | Confirmed (source) |
| FR-46 | Count actual playback | Trong khi Audio/Video thực sự đang phát, hệ thống phải ghi nhận thời gian đó là Listening Time. | State-driven | FR | Must | Customer DOCX §12 | Confirmed (source) |
| FR-47 | Exclude idle page time | Nếu học sinh chỉ mở trang nhưng Audio/Video không phát, hệ thống không được tính khoảng thời gian đó vào Listening Time. | Unwanted behavior | FR | Must | Customer DOCX §12 | Confirmed (source) |
| FR-48 | Listening time by lesson | Hệ thống phải lưu Listening Time của từng học sinh theo từng Listening Lesson. | Ubiquitous | FR | Must | Customer DOCX §§5, 12 | Confirmed (source) |
| FR-49 | Listening time by week | Hệ thống phải cho phép tổng hợp Listening Time của từng học sinh theo Week. | Ubiquitous | FR | Must | Customer DOCX §§5, 12 | Confirmed (source) |
| FR-50 | Listening time by month | Hệ thống phải cho phép tổng hợp Listening Time của từng học sinh theo Month. | Ubiquitous | FR | Must | Customer DOCX §§5, 12 | Confirmed (source) |
| FR-51 | Total listening time | Hệ thống phải cho phép xác định tổng Listening Time của từng học sinh. | Ubiquitous | FR | Must | Customer DOCX §5 | Confirmed (source) |
| FR-52 | Track access count | Ở nơi hệ thống có thể hỗ trợ, hệ thống phải ghi nhận số lần học sinh truy cập hoặc thực hiện bài. | Optional feature | FR | Should | Customer DOCX §5 (“if system can support”) | Conditional; confirm inclusion |
| FR-53 | View completed students | Hệ thống phải cho phép Admin xem danh sách học sinh đã hoàn thành Lesson. | Ubiquitous | FR | Must | Customer DOCX §6 | Confirmed (source) |
| FR-54 | View incomplete students | Hệ thống phải cho phép Admin xem danh sách học sinh chưa thực hiện hoặc chưa hoàn thành Lesson. | Ubiquitous | FR | Must | Customer DOCX §6 | Confirmed (source) |
| FR-55 | View student result | Hệ thống phải cho phép Admin xem kết quả của từng học sinh theo từng Lesson. | Ubiquitous | FR | Must | Customer DOCX §6 | Confirmed (source) |
| FR-56 | View listening time | Hệ thống phải cho phép Admin xem Listening Time của từng học sinh. | Ubiquitous | FR | Must | Customer DOCX §6 | Confirmed (source) |
| FR-57 | Student count statistic | Hệ thống phải hiển thị tổng số học sinh trong Statistics/Reports. | Ubiquitous | FR | Must | Customer DOCX §7 | Confirmed (source) |
| FR-58 | Completion statistic | Hệ thống phải hiển thị số học sinh đã hoàn thành và chưa hoàn thành. | Ubiquitous | FR | Must | Customer DOCX §7 | Confirmed (source) |
| FR-59 | Listening statistic | Hệ thống phải hiển thị tổng Listening Time trong Statistics/Reports. | Ubiquitous | FR | Must | Customer DOCX §7 | Confirmed (source) |
| FR-60 | Results by lesson | Hệ thống phải cho phép Admin xem kết quả theo từng Listening Lesson. | Ubiquitous | FR | Must | Customer DOCX §7 | Confirmed (source) |
| FR-61 | Results by week | Hệ thống phải cho phép Admin xem kết quả theo Week. | Ubiquitous | FR | Must | Customer DOCX §7 | Confirmed (source) |
| FR-62 | Results by month | Hệ thống phải cho phép Admin xem kết quả theo Month. | Ubiquitous | FR | Must | Customer DOCX §7 | Confirmed (source) |
| FR-63 | Filter report by student | Khi Admin lọc báo cáo theo học sinh, hệ thống phải chỉ hiển thị dữ liệu của học sinh được chọn. | Event-driven | FR | Should | Customer DOCX §7 | Confirmed (source); verify scope in DOCX |
| FR-64 | Filter report by class | Khi Admin lọc báo cáo theo lớp, hệ thống phải chỉ hiển thị dữ liệu thuộc lớp được chọn. | Event-driven | FR | Should | Customer DOCX §7 | Confirmed (source); class model and data definition TBD |
| FR-65 | Export report | Khi chức năng Excel export được phê duyệt, hệ thống phải cho phép người có quyền xuất dữ liệu/thống kê đã chọn sang Excel. | Event-driven | FR | Should | Customer DOCX §11 (IT consultation item) | Need Clarification; not a confirmed feature |
| FR-66 | Class management | Hệ thống phải cho phép Admin tạo, chỉnh sửa lớp và quản lý học sinh thuộc lớp. | Ubiquitous | FR | TBD | BA completeness proposal; DOCX mentions class-specific assignment and reporting, but not class CRUD | BA-proposed; confirm class feature |
| FR-67 | Assign lesson to class | Hệ thống phải cho phép người có quyền phân Listening Lesson cho lớp. | Ubiquitous | FR | Must | Customer DOCX §§2, 13 | Confirmed (source); actor and assignment rules TBD |
| FR-68 | Assign lesson to individual | Hệ thống phải cho phép Admin phân Listening Lesson riêng cho một học sinh. | Ubiquitous | FR | TBD | BA interpretation of DOCX §2 account-based assignment | BA-proposed; confirm individual assignment alongside class assignment |
| FR-69 | Teacher data scope | Trong khi Teacher đang đăng nhập, hệ thống phải chỉ hiển thị lớp/học sinh được giao cho Teacher. | State-driven | FR | TBD | BA completeness proposal; DOCX §11 only raises permissions for IT consultation | BA-proposed; teacher scope requires approval |
| FR-70 | Student data scope | Trong khi Student đang đăng nhập, hệ thống phải chỉ cho phép truy cập dữ liệu học tập thuộc tài khoản của chính học sinh đó. | State-driven | FR | Must | Customer DOCX §2 requires separate student data; access restriction phrased as BA acceptance criterion | BA-proposed; security scope should be confirmed |
| FR-71 | Archive lesson with history | Nếu Lesson đã có dữ liệu học tập, hệ thống phải giữ dữ liệu lịch sử khi Lesson bị gỡ khỏi nội dung đang hoạt động. | Unwanted behavior | FR | Must | Customer DOCX §8 requires old content/history to remain; archive behavior is BA recommendation | BA-proposed implementation behavior to satisfy confirmed history need |
| FR-72 | Audit administration changes | Khi người dùng quản trị tạo, sửa, khóa hoặc xóa dữ liệu, hệ thống phải ghi nhận người thao tác, đối tượng thay đổi và thời điểm thay đổi. | Event-driven | FR | TBD | Conversation recommended audit log | BA-proposed |

## 5. Non-Functional Requirements

NFRs are quality attributes or constraints. Where the source provided no measurable target, the requirement is explicitly marked TBD instead of inventing a threshold.

| ID | Quality Attribute | Requirement | Priority | Source | Status / Acceptance target |
|---|---|---|---|---|---|
| NFR-01 | Usability | Giao diện học sinh phải đơn giản, dễ hiểu và phù hợp để học sinh nhỏ tuổi sử dụng. | Must | Customer DOCX: student-facing design requirements | Confirmed (source); usability test criteria TBD |
| NFR-02 | User experience | Giao diện học sinh phải thân thiện, sinh động, hiện đại và phù hợp môi trường giáo dục. | Should | Customer DOCX: design requirements | Confirmed (source); visual acceptance criteria TBD |
| NFR-03 | Compatibility | Website phải sử dụng được trên desktop, tablet và mobile phone. | Must | Customer DOCX: device support | Confirmed (source); supported OS/browser versions TBD |
| NFR-04 | Responsive design | Giao diện phải tự điều chỉnh phù hợp với kích thước màn hình thiết bị được hỗ trợ. | Must | BA wording of device support | BA-proposed; viewport/device matrix TBD |
| NFR-05 | Security | Hệ thống phải bảo vệ tài khoản và dữ liệu học sinh khỏi truy cập trái phép. | Must | BA recommendation based on account security concern in DOCX §11 | BA-proposed; security controls and verification criteria TBD |
| NFR-06 | Access control | Hệ thống phải giới hạn quyền truy cập chức năng và dữ liệu theo role đã được phê duyệt. | Must | Prior BA discussion: role permissions | Confirmed need for permissions; detailed policy TBD |
| NFR-07 | Privacy | Hệ thống phải giới hạn việc xem dữ liệu học tập theo phạm vi được cấp cho từng role. | Must | BA recommendation | BA-proposed; privacy/data retention policy TBD |
| NFR-08 | Performance | Hệ thống phải phục vụ tối thiểu 500 người dùng đồng thời với thời gian phản hồi dưới 2 giây. | TBD | User-provided example in conversation table; attributed to IT and marked for confirmation | Need Clarification: confirm concurrency profile, response-time percentile, workload, and measurement conditions |
| NFR-09 | Availability | TBD — Mục tiêu uptime, khung giờ vận hành và lịch bảo trì chưa được xác định. | TBD | Not specified in available source summary | Need Clarification |
| NFR-10 | Reliability | TBD — Yêu cầu khôi phục lỗi và giới hạn mất dữ liệu chưa được xác định. | TBD | Not specified in available source summary | Need Clarification |
| NFR-11 | Data retention | TBD — Thời hạn lưu trữ lịch sử bài học, kết quả và Listening Time chưa được xác định. | TBD | Source summary requests retaining historical content/data, without a retention period | Need Clarification |
| NFR-12 | Accessibility | TBD — Tiêu chuẩn hỗ trợ accessibility, phụ đề/transcript và yêu cầu đặc biệt chưa được xác định. | TBD | Not specified in available source summary | Need Clarification |
| NFR-13 | Maintainability | TBD — Quy trình cập nhật nội dung đã được nêu, nhưng các mục tiêu maintainability khác chưa được xác định. | TBD | Customer DOCX: content should be managed without source-code change | Confirmed functional constraint; other NFR target TBD |

## 6. Open questions for stakeholder validation

1. Please provide the source DOCX so section references and every reconstructed item can be verified against the original.
2. Is **Super Admin** an approved role? Who creates the initial Super Admin account?
3. What exact permissions and data scope apply to Admin and Teacher?
4. Are Classes required? Can a Student belong to multiple classes? Who may assign Students and Teachers?
5. Are lessons assigned by class, by individual student, or both? Can assignments have start/end dates?
6. What does “lesson completed” mean: opened, media played, all questions answered, or submitted?
7. How are Short Answer responses scored? Are retries allowed? Can students see correct answers and scores?
8. How is Listening Time measured during pause, seek, playback speed changes, background tabs, and interrupted connections?
9. Are reports filtered by day/week/month/class/student? Which export formats are required and in scope?
10. Is the 500 concurrent users / under 2 seconds target approved? Define typical workload, percentile, and test conditions.
11. Confirm browser/device support, availability target, security requirements, data-retention duration, and accessibility expectations.

## 7. Traceability note

The source column preserves the section labels cited in the conversation. Because the original DOCX was unavailable in the project mirror and attachment cache, these labels and the distinction “confirmed” reflect the conversation record only. Validate against `Website_Requirements_English_Academy.docx` before using this draft as an approved baseline.


## 8. Coverage review: current requirements versus customer DOCX

The previous draft captured the core student, lesson, Listening Time, dashboard, and reporting flows. The DOCX review confirms those areas and adds/clarifies:

- The stated learning scope includes **Listening/Speaking practice at home**, while detailed requirements currently cover Listening only. Speaking is future-facing and not defined as MVP behavior.
- Each week is expected to have **2–3 Listening lessons** (expectation, not a hard validation rule unless the client confirms).
- Listening Time should be traceable by **student, lesson, day/week/month**; a sample dated lesson-time table is included.
- Reports should filter by **student, class, week, month, and Listening lesson**, with charts preferred if feasible.
- Admin content authoring should support routine weekly/monthly create, edit, delete, and replacement without IT/code changes; historical content must remain available.
- The IT consultation list includes hosting/database, audio/video capacity, backup, account security, concurrent load, account growth, Excel export, and Admin/Teacher permissions. These are decision areas, not finalized technical requirements or targets.
- Future capabilities listed are Speaking practice/recording, vocabulary, reading, writing, badges/rewards, and other motivation/progress features. These are explicitly future scope, not confirmed MVP requirements.

### Gaps in the previous draft now made explicit

1. The scope did not distinguish current Listening requirements from future Speaking and other exercise types.
2. The suggested 2–3 lessons per week and daily Listening Time traceability needed explicit treatment.
3. Report filters for week and lesson were not fully captured; the DOCX explicitly lists all five filter dimensions.
4. Parent usability was mentioned, but there is no parent role or parent portal requirement. This remains a scope question.
5. The DOCX does not define password recovery, logout/session expiry, duplicate usernames, account provisioning rules, media format/size limits, delete behavior with existing attempts, grading/retake policy, privacy/retention, accessibility, backups/RPO/RTO, uptime, supported browsers, or quantified performance. These are listed below as BA-proposed controls or clarification items rather than misrepresented as customer-confirmed.

## 9. Additional Functional Requirements — web app completeness

These requirements make common web-app flows explicit. Unless the DOCX directly states them, they are BA-proposed and require approval.

| ID | Function | Requirement | EARS Pattern | Type | Priority | Source | Status |
|---|---|---|---|---|---|---|---|
| FR-73 | Logout | Khi người dùng chọn Logout, hệ thống phải kết thúc phiên đăng nhập và đưa người dùng về màn hình đăng nhập. | Event-driven | FR | Should | BA completeness proposal | BA-proposed |
| FR-74 | Invalid login feedback | Nếu thông tin đăng nhập không hợp lệ, hệ thống phải từ chối truy cập và hiển thị thông báo không tiết lộ thông tin nhạy cảm. | Unwanted behavior | FR | Should | BA completeness proposal | BA-proposed |
| FR-75 | Username uniqueness | Khi tạo tài khoản, hệ thống phải từ chối Username đã được sử dụng và chỉ rõ trường cần sửa. | Event-driven | FR | Should | BA completeness proposal | BA-proposed |
| FR-76 | Session expiry | Trong khi phiên không hoạt động quá thời hạn được cấu hình, hệ thống phải yêu cầu người dùng đăng nhập lại trước khi truy cập dữ liệu được bảo vệ. | State-driven | FR | TBD | BA completeness proposal | Need Clarification: timeout duration and unsaved work behavior |
| FR-77 | Account list/search | Hệ thống phải cho phép Admin tìm kiếm và xem danh sách học sinh theo các tiêu chí được thống nhất. | Ubiquitous | FR | Should | BA completeness proposal; supports student administration | Need Clarification: search fields, pagination, bulk actions |
| FR-78 | Assign content | Hệ thống phải cho phép Admin phân bài học cho tài khoản hoặc lớp học sinh. | Ubiquitous | FR | Must | Customer DOCX §2, §13 | Confirmed (source); assignment rules TBD |
| FR-79 | Week lesson count | Hệ thống phải cho phép Admin thêm 2–3 Listening lessons cho mỗi Week theo kế hoạch nội dung. | Ubiquitous | FR | Should | Customer DOCX §3 | Confirmed as expected volume, not a hard system limit |
| FR-80 | Listening time by day | Hệ thống phải lưu và truy xuất Listening Time theo từng học sinh, từng bài và từng ngày. | Ubiquitous | FR | Must | Customer DOCX §12 and sample table | Confirmed (source) |
| FR-81 | Filter report by week | Khi Admin chọn Week làm điều kiện lọc, hệ thống phải chỉ hiển thị dữ liệu trong Week đó. | Event-driven | FR | Must | Customer DOCX §7 | Confirmed (source) |
| FR-82 | Filter report by month | Khi Admin chọn Month làm điều kiện lọc, hệ thống phải chỉ hiển thị dữ liệu trong Month đó. | Event-driven | FR | Must | Customer DOCX §7 | Confirmed (source) |
| FR-83 | Filter report by lesson | Khi Admin chọn Listening Lesson làm điều kiện lọc, hệ thống phải chỉ hiển thị dữ liệu của Lesson đó. | Event-driven | FR | Must | Customer DOCX §7 | Confirmed (source) |
| FR-84 | Combined report filters | Khi Admin chọn đồng thời nhiều bộ lọc, hệ thống phải áp dụng tất cả điều kiện đã chọn để giới hạn kết quả. | Event-driven | FR | Should | BA interpretation of listed report filters | Need Clarification: confirm filters can be combined |
| FR-85 | Visual reports | Ở nơi biểu đồ trực quan được hỗ trợ, hệ thống phải trình bày thống kê học tập dưới dạng biểu đồ phù hợp. | Optional feature | FR | Should | Customer DOCX §7 (“if possible”) | Confirmed as preference; feasibility/scope TBD |
| FR-86 | Excel export | Ở nơi export Excel được triển khai, hệ thống phải cho phép người có quyền xuất dữ liệu/thống kê đang được xem. | Optional feature | FR | Should | Customer DOCX §11 | Need Clarification: export fields, permissions, format |
| FR-87 | Parent account | Nếu phụ huynh được cấp tài khoản, hệ thống phải cho phép phụ huynh xem dữ liệu của trẻ được liên kết với tài khoản đó. | Optional feature | FR | TBD | Customer DOCX §1 usability audience; BA interpretation | Need Clarification: parent role/portal is not specified |
| FR-88 | Speaking practice | Ở giai đoạn mở rộng có Speaking practice, hệ thống phải cho phép học sinh thực hiện bài luyện nói theo yêu cầu được xác định riêng. | Optional feature | FR | TBD | Customer DOCX §10 | Future scope; behavior TBD |
| FR-89 | Record/upload speaking | Ở giai đoạn mở rộng có bài nộp Speaking, hệ thống phải cho phép ghi âm hoặc tải lên bài nói theo chính sách được xác định. | Optional feature | FR | TBD | Customer DOCX §10 | Future scope; formats, size, retention TBD |
| FR-90 | Other future exercise types | Ở giai đoạn mở rộng có Vocabulary, Reading hoặc Writing, hệ thống phải hỗ trợ các bài tập tương ứng theo đặc tả riêng. | Optional feature | FR | TBD | Customer DOCX §10 | Future scope; not MVP confirmed |
| FR-91 | Rewards and badges | Ở giai đoạn mở rộng có cơ chế tạo động lực, hệ thống phải hiển thị điểm thưởng/badge theo quy tắc được phê duyệt. | Optional feature | FR | TBD | Customer DOCX §10 | Future scope; rules TBD |
| FR-92 | Backup/restore operation | Khi quản trị viên được ủy quyền yêu cầu khôi phục dữ liệu từ bản sao lưu, hệ thống phải thực hiện theo quy trình khôi phục đã phê duyệt. | Event-driven | FR | TBD | Customer DOCX §11 identifies backup for IT consultation | Need Clarification: ownership and restore workflow |
| FR-93 | Content publishing state | Khi Admin tạo hoặc sửa nội dung, hệ thống phải cho phép kiểm tra nội dung trước khi học sinh nhìn thấy phiên bản đang áp dụng. | Event-driven | FR | TBD | BA completeness proposal | BA-proposed; draft/publish workflow needs approval |
| FR-94 | Delete confirmation | Khi Admin xóa Week, Lesson, Question, Student, hoặc media có liên kết, hệ thống phải cảnh báo ảnh hưởng và yêu cầu xác nhận trước khi hoàn tất thao tác. | Event-driven | FR | Should | BA completeness proposal | BA-proposed; soft delete/history rules TBD |
| FR-95 | Media playback failure | Nếu Audio/Video không thể tải hoặc phát, hệ thống phải thông báo cho học sinh và cho phép thử lại mà không làm mất câu trả lời đã lưu. | Unwanted behavior | FR | Should | BA completeness proposal | BA-proposed |
| FR-96 | Save progress | Khi học sinh rời khỏi bài hoặc mất kết nối trong lúc làm, hệ thống phải giữ lại câu trả lời/tiến độ đã lưu gần nhất nếu cơ chế lưu nháp được phê duyệt. | Event-driven | FR | TBD | BA completeness proposal | Need Clarification: autosave behavior and offline expectations |

## 10. Additional Non-Functional Requirements and constraints

| ID | Quality Attribute | Requirement | Priority | Source | Status / Acceptance target |
|---|---|---|---|---|---|
| NFR-14 | Capacity | Hệ thống phải phục vụ tối thiểu 500 người dùng đồng thời với thời gian phản hồi dưới 2 giây, nếu khách hàng phê duyệt mục tiêu này. | TBD | Conversation example; DOCX §11 asks IT to advise capacity and contains no numeric target | Need Clarification: this number is not a customer DOCX requirement |
| NFR-15 | Scalability | Hệ thống phải cho phép tăng số lượng tài khoản và nội dung mà không làm mất dữ liệu hiện có; ngưỡng tăng trưởng và kiểm chứng phải được thống nhất. | TBD | Customer DOCX §10–11 | Confirmed growth objective; measurable target TBD |
| NFR-16 | Backup and recovery | Hệ thống phải có cơ chế sao lưu và khôi phục dữ liệu theo lịch/chính sách được phê duyệt. | Must | Customer DOCX §11 asks IT to advise backup mechanism | Need Clarification: frequency, retention, RPO/RTO, restore tests |
| NFR-17 | Media storage | Hệ thống phải hỗ trợ lưu trữ/phát nội dung Audio/Video theo giới hạn dung lượng và định dạng được thống nhất. | Must | Customer DOCX §6, §11 | Need Clarification: formats, per-file size, storage capacity, streaming needs |
| NFR-18 | Security | Hệ thống phải bảo vệ thông tin xác thực và dữ liệu học tập khỏi truy cập trái phép; phương thức và tiêu chí kiểm thử phải được phê duyệt. | Must | Customer DOCX §11 asks about student account security | Customer concern confirmed; implementation criteria TBD |
| NFR-19 | Availability | TBD — Uptime, supported operating hours, maintenance windows, and incident targets must be agreed. | TBD | Not specified in customer DOCX | Need Clarification |
| NFR-20 | Data retention | TBD — Define retention and deletion rules for accounts, submissions, listening records, and historical lessons. | TBD | Customer DOCX §8 requires old content/history kept; duration is unspecified | Need Clarification |
| NFR-21 | Browser compatibility | TBD — Agree supported browsers and minimum versions for desktop, tablet, and mobile. | TBD | Customer DOCX §1 | Need Clarification |
| NFR-22 | Accessibility | TBD — Agree accessibility standard, keyboard support, captions/transcripts, and accommodations. | TBD | Not specified in customer DOCX | Need Clarification |
| NFR-23 | Operational maintainability | Trung tâm phải thực hiện các thao tác quản trị nội dung và tài khoản thông thường qua giao diện mà không cần IT chỉnh code. | Must | Customer DOCX §3, §8, §14 | Confirmed (source); define which operations are “routine” |
| NFR-24 | Data integrity | Hệ thống phải liên kết chính xác mỗi kết quả, thời điểm và Listening Time với đúng học sinh và Lesson. | Must | Customer DOCX §2, §4–5, §12 | BA-derived from explicit data separation and tracking needs; approval recommended |
| NFR-25 | Localization/time zone | TBD — Confirm interface languages, date/time display format, and time zone used for daily/weekly/monthly reports. | TBD | Customer DOCX uses Vietnamese/English labels and dated examples | Need Clarification |

## 11. Scope boundary

### Customer-stated current website scope

- Student account access and personal learning records.
- Listening lessons organized by week/month, with media and comprehension questions.
- Student exercise status, answers/results, duration, and execution timestamp.
- Listening Time tracking by student, lesson, and reporting period, prioritizing actual playback time.
- Admin content/account management, monitoring, statistics, and reports.
- Responsive use on computers, phones, and tablets; simple, engaging educational UI.

### Future or conditional scope

Speaking practice, speaking recording/upload, vocabulary, reading, writing, reward/badge features, and additional motivation features are future expansion items. Excel export and charts are conditional (“if possible” / for IT consultation). Do not treat these as approved MVP requirements without confirmation.

## 12. Updated stakeholder questions

1. Confirm whether Speaking practice, parent accounts, chart reports, and Excel export are part of MVP or future scope.
2. Confirm whether 2–3 lessons per week is an expectation or a validation limit.
3. Define Admin/Teacher roles, class ownership, student assignment, and who may manage content.
4. Define lesson completion, grading, short-answer marking, retries, answer reveal, and resubmission rules.
5. Define Listening Time behavior for pause, seek, playback speed, tab backgrounding, interruptions, repeated playback, and simultaneous sessions.
6. Define media types/formats, maximum file size, upload progress, replacement behavior, and allowed external link providers.
7. Define account lifecycle: username uniqueness, initial credentials delivery, password reset/recovery, session timeout, and what happens to records when a student is locked or removed.
8. Define deletion/archive behavior for lessons/questions that already have submissions and historical results.
9. Define report calculations and whether multiple filters combine; define chart and Excel export details.
10. Confirm capacity/performance target. The example of 500 concurrent users / under 2 seconds does not appear as a requirement in the supplied DOCX.
11. Define backup schedule, retention, recovery objectives, supported browsers, availability, security controls, accessibility, localization, and data retention.

## 13. Traceability note

Sections in the Source column now refer to the supplied customer DOCX. “Confirmed (source)” means the document directly states the need; it does not mean every operational rule or measurable acceptance criterion has been agreed. Recommendations, future items, conditional requests, and unanswered technical issues remain explicitly labeled for approval or clarification.

