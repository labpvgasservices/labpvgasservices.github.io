# Tải trọn bộ hồ sơ đã duyệt – 07/11/2026 (v41)

Yêu cầu của NGOC: tải một lần toàn bộ hồ sơ **đã duyệt**, chia 3 thư mục, đặt tên file theo tag thiết bị.

## Cách dùng
- Tab Hồ sơ › **⬇ Tải trọn bộ đã duyệt**: mọi hồ sơ đã duyệt đang hiện (theo ô tìm kiếm và nút Tất cả / Hồ sơ của tôi).
- Trong từng thư mục người nhập › **⬇ Trọn bộ đã duyệt (n)**: chỉ hồ sơ đã duyệt của người đó.
- Kết quả là 1 file ZIP `TronBo_DaDuyet[_Tên người]_dd-mm-yyyy.zip`, gồm:
  - `QTG/` – toàn bộ biên bản QTG
  - `GCN/` – toàn bộ giấy chứng nhận
  - `Uncer/` – toàn bộ bảng tính
- Mọi chủng loại thiết bị chung một thư mục theo loại giấy.

## Tên file
`<Tag thiết bị>_<GCN|QTG|Uncer>_<dd-mm-yyyy>.pdf`, ngày = **ngày hiệu chuẩn** của hồ sơ. Ví dụ `PT-1506A_GCN_30-10-2026.pdf`.
- Ký tự không dùng được trong tên file (`/ \ : * ? " < > |`) đổi thành `-`; khoảng trắng đổi thành `_`.
- Trùng tag và ngày: thêm `_2`, `_3`.
- Nút xuất lẻ từng hồ sơ cũng dùng cách đặt tên này (`_GCN_`, `_QTG_`, `_Uncer_`, `_GCN_Uncer_`, `_TronBo_`).

## Quy tắc giữ nguyên
- Thiết bị Không đạt (PT, PS, TT): không có GCN, vẫn có QTG và Uncer.
- Cấp 1 không tải QTG.
- Hồ sơ chưa duyệt hoặc sửa sau khi duyệt (mất duyệt) không vào bộ tải.

## Kiểm chứng
Trình duyệt không đầu: 5 hồ sơ (4 đã duyệt, 1 chưa duyệt, 1 Không đạt, 2 trùng tag) → ZIP 11 file, QTG 4, GCN 3, Uncer 4, tên đúng mẫu, file ZIP mở được và mọi PDF hợp lệ.
