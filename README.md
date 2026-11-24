# LAB PVGAS Services

PWA (chạy offline, cài lên màn hình chính) cho Phòng TNHC: nhập số liệu hiệu chuẩn, tính độ không đảm bảo đo, xuất QTG + Giấy chứng nhận
(GCN) + bảng Uncer dạng PDF / Excel, duyệt 2 bước, đồng bộ nhiều người qua Supabase.

Chín loại thiết bị: **PT/DPT, PS/DPS, PG, DPG, TT, TG, RTD, TC, TS**. Không làm PSV.

## Cấu trúc
- `index.html` giao diện · `app.js` xử lý chính · `auth.js` đăng nhập/phân quyền · `cloud.js` đồng bộ Supabase
- `calc.js`, `calc2.js` công thức · `formulas.js`, `qcwork.js`, `qcxlsx.js` tab Công thức, bảng QC, Excel bảng tính
- `docs.js`, `docs2.js` trang A4 (QTG, GCN, Uncer) · `mocan.js` mộc ẩn · `zip.js` gói thư mục
- `data.js` chuẩn & địa điểm · `devices.js` danh mục thiết bị · `refs.js` căn cứ · `pid.js` P&ID · `photos.js` ảnh bằng chứng (đang ẩn)
- `ocr.js` + `cloud/functions/ocr-phieu/` Chụp phiếu: đọc số từ ảnh phiếu gốc (Gemini qua Supabase Edge Function), bắt buộc đối chiếu
- `cloud/` SQL + hướng dẫn Supabase · `vendor/` thư viện chạy offline · `sw.js` cache offline

## Cập nhật
Sửa file, tăng `CACHE` trong `sw.js` (và thêm file mới vào `FILES`), tạo PR vào `main`; GitHub Pages cập nhật sau vài phút.
Bản khôi phục ổn định: nhánh `backup/v87-stable-2026-11-20`.

Ghi chú nguồn logic ban đầu: `PHAN_TICH.md`.
