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
- Gói Free không có bản sao lưu tải về được: cấp 3 xuất Sao lưu JSON định kỳ (mỗi tuần) và cất ở máy / ổ công ty.
- App vẫn chạy offline; có mạng lại thì tự đồng bộ. Hai người sửa cùng một hồ sơ: bản lưu sau cùng thắng.
- Số GCN tự động tính trên máy: nên đồng bộ (có mạng) trước khi tạo hồ sơ mới để không trùng số.

Luồng duyệt 2 bước (v49, 10/11/2026)
- Người nhập chọn Người kiểm soát (cấp 2/3) → Chuyển duyệt. Người kiểm soát: Duyệt kiểm soát và chọn người duyệt final (cấp 3), hoặc chuyển cho cấp 2/3 khác, hoặc Trả lại.
- Cấp 3 Duyệt final → mới được in / tải PDF. Hồ sơ không đạt: không có chứng chỉ, chỉ có Biên bản QTG; báo động đỏ ở tab Hồ sơ.
- Cấp 1/2 chỉ thấy hồ sơ mình nhập và hồ sơ được chuyển tới mình (máy chủ chặn bằng cột records.viewers); cấp 3 thấy tất cả.
