# In đủ số chữ số lẻ của chuẩn – 07/11/2026 (v40)

Yêu cầu của NGOC: số đọc chuẩn in trên QTG, GCN và trang Uncer phải đúng số chữ số lẻ mà màn hình chuẩn hiển thị ở đơn vị đang dùng. Không cắt số 0 cuối, không bị trần 3 số lẻ.

## Áp dụng
- Phạm vi bản này: **PT/DPT** (áp suất chuẩn và số đọc mA) và **PS/DPS** (áp tác động, áp trả về). Trang GCN trang 2, QTG và Uncer.
- Số chữ số lẻ lấy từ `standDec` (cùng hàm kiểm tra khi nhập, theo manual/GCN của chuẩn). Ví dụ 700G05: 4 số lẻ ở bar, 2 số lẻ ở kPa; APM30: 1 số lẻ ở kPa.
- Số hiệu chính và độ lệch in theo số chữ số lẻ của bộ số đọc tương ứng.
- Quả cân, chuẩn không có số liệu, hoặc hồ sơ cũ nhập nhiều số lẻ hơn màn hình chuẩn: giữ quy tắc in cũ (không cắt ngắn số đã có).

## Chưa làm trong bản này (cần quyết định)
- TT, PG, TS, RTD, TC, TG, DPG vẫn in theo quy tắc riêng của từng loại.
- Hồ sơ đã lưu in lại sẽ có thêm số 0 cuối so với bản đã phát hành trước đó (giá trị không đổi).

## Kiểm chứng
- Trình duyệt không đầu: PT 700G05 kPa in "0,00 / 2,50"; PT 700G05 bar in "0,0000 / 0,5000"; PS 700G05 kPa in "300.10 / 290.00". QTG, GCN và Uncer dựng không lỗi.
