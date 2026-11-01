# Bật đồng bộ Supabase – LAB PVGAS Services

1. supabase.com → đăng ký miễn phí → **New project** (Region: Southeast Asia – Singapore). Mật khẩu database tự giữ.
2. **SQL Editor → New query** → dán toàn bộ `cloud/setup.sql` → **Run** (chạy lại nhiều lần không sao).
3. (Khuyên dùng) **Authentication → Sign In / Providers → Email**: tắt *Confirm email* nếu muốn tạo tài khoản dùng ngay, không cần mở thư.
4. **Project Settings → API**: lấy **Project URL** và khoá **anon public**, điền vào đầu `cloud.js` (CONFIG). Không dùng khoá service_role.
5. Mở app: người đăng ký **đầu tiên** thành cấp 3 (Trưởng phòng). Người sau tự tạo tài khoản, chờ cấp 3 cấp quyền ở Cài đặt › Người dùng.
6. Máy đã có dữ liệu cũ: đăng nhập cấp 3 trên máy đó trước – toàn bộ hồ sơ, ảnh, thư viện chuẩn, cài đặt sẽ được đẩy lên.

Ghi chú
- App vẫn chạy offline; có mạng lại thì tự đồng bộ (mỗi phút, khi mở lại app, và ngay khi máy khác thay đổi).
- Hai người sửa cùng một hồ sơ: bản lưu sau cùng thắng.
- Số GCN tự động tính trên máy: nên đồng bộ (có mạng) trước khi tạo hồ sơ mới để không trùng số.
- Gói miễn phí: 500 MB database, 1 GB ảnh; dự án bị tạm dừng nếu 7 ngày không ai dùng (bấm Restore trong trang Supabase).
