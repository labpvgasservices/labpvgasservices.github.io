# LAB PVGAS Services

App: **https://labpvgasservices.github.io/** · Repo: `labpvgasservices/labpvgasservices.github.io` (GitHub Pages từ `main`, thư mục gốc).
Từ 11/11/2026 repo chuyển từ `ngoc-12/lab-pvgas-services`; link cũ `ngoc-12.github.io/lab-pvgas-services` không còn chạy.
Mọi đường dẫn trong app là tương đối (`./`), nên chạy được cả ở gốc domain lẫn thư mục con.

PWA (chạy offline, cài lên màn hình chính) để nhập số liệu QTG, tính độ không đảm bảo đo và xuất
Giấy chứng nhận hiệu chuẩn + Biên bản QTG + Bảng tính ĐKĐBĐ dạng PDF (lưu vào Tệp / chia sẻ trên iPhone).

Bản hiện tại: **PT/DPT (4–20 mA)** và **PS/DPS**. Không làm PSV.

## Nguồn logic
- PT: `GPP_2024_PT_Uncer Form.xls` – sheet `DLVN112-2002_Rev2` (TM.10.BM.112.2-1), `Data112`, macro PT_CALC.
- PS: `GPP_PS Uncer Form.xls` – sheet `DLVN133 - 2004` (DVK.LAB.TM.10.BM.133-03), `Data133`.
- Mẫu chứng chỉ: `14 PT - Thang 8.docx`, `133.3-2 PS 801 Cert khong logo vcl.docx`.

`calc.js` đã được đối chiếu: 28/28 thiết bị PT và 12/12 PS của năm 2024 cho cùng Uexp, Pass/Fail và số in trên chứng chỉ
(trừ 1 ô PS mà file Excel làm tròn tay, xem ghi chú phân tích). Tab Cài đặt › Tự kiểm tra chạy lại 2 ca mẫu.

## Cấu trúc
`index.html` giao diện · `app.js` xử lý · `calc.js` công thức · `docs.js` trang A4 · `data.js` chuẩn & địa điểm 2024 ·
`vendor/` jsPDF 2.5.1 + html2canvas 1.4.1 (offline) · `sw.js` cache offline.

Cập nhật app: sửa file, tăng `CACHE` trong `sw.js`, push lên `main`.

## Bản v3 – mẫu 2026 (29/10/2026)
- Xuất 3 loại theo mẫu 2026: **Biên bản hiệu chuẩn (QTG)** BB.PT/BB.PS (DVK.LAB.TM21.PL03 / ĐLVN 133:2004.PL1), **Giấy chứng nhận 2 trang** theo MailMerge_PT_Cert / MailMerge_PS_Cert, **Bảng Uncer** theo sheet DLVN112-2002_Rev2 / DLVN133 - 2004 kèm khối "Kiểm tra".
- Tab Hồ sơ: **Bảng kiểm tra PT/PS (QC)** gom nhiều hồ sơ như sheet ẩn "Kiểm tra".
- Danh mục chuẩn và địa điểm lấy từ PT_DGCP_10_2026.xls. Công thức đối chiếu lại: PT 31/31, PS 13/13 thiết bị DGCP; số in trên chứng chỉ trùng 30/30 chứng chỉ trong PT_DGCP_10-2026.docx.
- PS nhập Áp tác động / Áp trả về như QTG, theo chiều Rising/Falling.
