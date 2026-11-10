# Bật đồng bộ Supabase – LAB PVGAS Services (cập nhật 10/11/2026)

Đăng nhập bằng **ID dạng `ngoc.nm` + PIN** (giống bản PIN trên máy). Không tự đăng ký: Trưởng phòng (cấp 3) tạo tài khoản.

1. supabase.com → đăng nhập → New organization (Plan **Free**) → **New project** (Region: Southeast Asia – Singapore). Mật khẩu database tự giữ.
2. **SQL Editor → New query** → dán toàn bộ `cloud/setup.sql` → **Run** (chạy lại nhiều lần không sao).
3. **Authentication → Sign In / Providers**: tắt **Allow new users to sign up** (chỉ cấp 3 tạo tài khoản); Email: tắt **Confirm email**.
4. **Project Settings → API** (hoặc Data API / API Keys): lấy **Project URL** và khoá **anon public**, điền vào đầu `cloud.js` (CONFIG). **Không bao giờ** dùng / đưa khoá `service_role` hay secret key vào repo.
5. Tạo tài khoản: dán file SQL tạo danh sách người dùng (file riêng, có PIN, không để trên GitHub) vào SQL Editor → Run.
   Sau này thêm người: cấp 3 vào app › Cài đặt › Người dùng › Tạo tài khoản (hoặc SQL `select public.admin_create_user('ten.hl','Họ Tên',1,'123456');`).
6. Mỗi người đăng nhập lần đầu bằng PIN tạm → app bắt đổi PIN riêng (ít nhất 6 số). Quên PIN: cấp 3 bấm **Đặt lại PIN**.
7. Máy đã có dữ liệu cũ: đăng nhập cấp 3 trên máy đó trước – hồ sơ, ảnh, thư viện chuẩn, cài đặt sẽ được đẩy lên.

Ghi chú
- Bên trong, ID được đổi thành email nội bộ `<id>@lab-pvgas.local` (không gửi thư). Phải trùng `public.lab_domain()` trong setup.sql và `CONFIG.domain` trong cloud.js.
- Danh sách thiết bị (devices.js) và thư viện chuẩn mặc định nằm sẵn trong mã app, không cần nhập vào Supabase.
- Chống tạm dừng: workflow `.github/workflows/supabase-keepalive.yml` gọi máy chủ 2 lần/tuần.
- Gói Free không có bản sao lưu tải về được: cấp 3 vào Cài đặt › Sao lưu toàn bộ mỗi tuần (app nhắc khi quá 7 ngày), cất file ở ổ công ty + USB. Khôi phục bằng nút "Khôi phục từ file sao lưu".
- App vẫn chạy offline; có mạng lại thì tự đồng bộ. Hai người sửa cùng một hồ sơ: bản lưu sau cùng thắng.
- Số GCN tự chạy trong dải của công trình và hỏi máy chủ số lớn nhất đã cấp; máy chủ chặn trùng số (v51).

Luồng duyệt 2 bước (v49, 10/11/2026)
- Người nhập chọn Người kiểm soát (cấp 2/3) → Chuyển duyệt. Người kiểm soát: Duyệt kiểm soát và chọn người duyệt final (cấp 3), hoặc chuyển cho cấp 2/3 khác, hoặc Trả lại.
- Cấp 3 Duyệt final → mới được in / tải PDF. Hồ sơ không đạt: không có chứng chỉ, chỉ có Biên bản QTG; báo động đỏ ở tab Hồ sơ.
- Cấp 1/2 chỉ thấy hồ sơ mình nhập và hồ sơ được chuyển tới mình (máy chủ chặn bằng cột records.viewers); cấp 3 thấy tất cả.

Dải số GCN / QTG theo công trình (v51, 10/11/2026)
- Chạy `04_v51_so_gcn.sql` (hoặc mục 9 của setup.sql) trong SQL Editor TRƯỚC khi merge PR v51.
- Bảng phân dải (anh Khai, 2025_Rev1) nằm ở Cài đặt › Dải số chứng chỉ; cấp 3 sửa từ/đến và mã công trình.
- GCN và QTG cùng đuôi: CN.PT.26.2301 ↔ BB.PT.26.2301. "26" lấy theo năm của ngày hiệu chuẩn (2027 → 27).
- Số ngoài dải, sai dạng/năm, hoặc đã có người dùng (app báo thiết bị, người nhập, tình trạng) → không chuyển duyệt / duyệt được.
- Địa điểm gõ tay: chọn ô "Dải số chứng chỉ". Công trình chưa có dải: chỉ cảnh báo, vẫn kiểm trùng.
- v52: chạy `05_v52_dai_so_chung.sql` TRƯỚC khi merge. Mọi loại (PT, PS, TT…) dùng chung dải: đuôi số đã cấp cho loại này thì loại khác không dùng lại trong năm (PS 2301 có rồi thì không có PT 2301).
- Cài đặt › "Số tem / GCN còn trống theo site": mọi cấp xem được các khoảng số chưa dùng (A–B) của từng dải theo năm.
