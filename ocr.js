/* LAB PVGAS Services – "Chụp phiếu" (v88): chụp / chọn ảnh phiếu số liệu gốc viết tay → AI (Gemini, qua Edge Function ocr-phieu) chép số đọc vào ô nhập.
 * Nguyên tắc an toàn: AI chỉ CHÉP; mọi ô do AI điền bị đánh dấu vàng và bắt buộc người dùng đối chiếu với phiếu gốc (bấm "Đã đối chiếu")
 * mới tính / in được. Phiếu có cột hiệu chỉnh / chênh lệch viết tay → app tự kiểm lại phép trừ, ô nào lệch bị đánh dấu đỏ (bắt lỗi đọc sai chữ số).
 * Hỗ trợ: PT, PS. Khóa Gemini nằm trong Supabase Secrets, không có trong app. */
(function () {
  "use strict";
  const MAXPX = 2000, Q = 0.85;
  function toJpegB64(file) {
    return new Promise((res, rej) => {
      const url = URL.createObjectURL(file), img = new Image();
      img.onload = () => {
        const k = Math.min(1, MAXPX / Math.max(img.width, img.height)), c = document.createElement("canvas");
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
        res(c.toDataURL("image/jpeg", Q).split(",")[1]);
      };
      img.onerror = () => { URL.revokeObjectURL(url); rej(new Error("Không đọc được ảnh")); };
      img.src = url;
    });
  }
  async function read(file, type) {
    const C = window.LabCloud; if (!C || !C.enabled) throw new Error("Chưa kết nối máy chủ – cần mạng và đăng nhập");
    const image = await toJpegB64(file);
    const r = await C.fn("ocr-phieu", { type, image });
    if (r.error) throw new Error(r.msg || r.error);
    return r;
  }
  const norm = s => String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const isNum = v => typeof v === "number" && isFinite(v);
  /* Biến kết quả AI thành danh sách ô cần điền + ô nghi sai + ghi chú. Thuần tính toán (không đụng DOM) để test được.
   * rec: hồ sơ hiện tại; num: hàm đổi chuỗi → số của app. */
  function plan(type, rec, d, num) {
    const out = { fills: [], bad: [], notes: [], stop: "" }, h = rec.h, rows = (d && d.rows) || [];
    if (rec.h.tag && d.tag && norm(d.tag) !== norm(rec.h.tag)) { out.stop = `Tag trên ảnh là "${d.tag}" nhưng hồ sơ đang là "${rec.h.tag}" – có thể chụp nhầm phiếu. Chưa điền gì.`; return out; }
    if (!rows.length) { out.stop = "Không thấy bảng số liệu trong ảnh. Chụp lại rõ hơn, thấy cả bảng."; return out; }
    const fmt = (v, dec) => { const s = String(v); const m = /\.(\d+)$/.exec(s); return !m ? v.toFixed(dec) : (m[1].length < dec ? v.toFixed(dec) : s); };
    const put = (p, v, dec) => { if (isNum(v)) out.fills.push({ p, v: fmt(v, dec) }); else out.notes.push(`Ô ${p} không đọc được – nhập tay`); };
    if (type === "PT") {
      const mn = num(h.max) > num(h.min) ? num(h.min) : NaN, mx = num(h.max);
      rows.slice(0, rec.pt.rise.length).forEach((r, i) => {
        put(`pt.rise.${i}`, r.inc, 3); put(`pt.fall.${i}`, r.dec, 3);
        const x = num(rec.pt.points[i]), ideal = isFinite(mn) && isFinite(x) ? 4 + 16 * (x - mn) / (mx - mn) : NaN;
        [["inc", "corr_inc", "rise"], ["dec", "corr_dec", "fall"]].forEach(([a, c, k]) => {
          if (!isNum(r[a]) || !isNum(r[c]) || !isFinite(ideal)) return;
          if (Math.abs(ideal - r[a] - r[c]) > 0.0021) out.bad.push(`pt.${k}.${i}`);
        });
      });
    } else if (type === "PS") {
      const ps = num(h.pset);
      rows.slice(0, rec.ps.set.length).forEach((r, i) => {
        put(`ps.set.${i}`, r.set_pressure, 2); put(`ps.reset.${i}`, r.reset_pressure, 2);
        if (!isFinite(ps)) return;
        if (isNum(r.set_pressure) && isNum(r.set_dev) && Math.abs((ps - r.set_pressure) - r.set_dev) > 0.006) out.bad.push(`ps.set.${i}`);
        if (isNum(r.reset_pressure) && isNum(r.reset_dev) && Math.abs((ps - r.reset_pressure) - r.reset_dev) > 0.006) out.bad.push(`ps.reset.${i}`);
      });
      if (!isFinite(ps)) out.notes.push("Chưa nhập Pset nên chưa kiểm tra chéo được cột chênh lệch");
    }
    if (rows.length < (type === "PT" ? rec.pt.rise.length : rec.ps.set.length)) out.notes.push(`Ảnh chỉ đọc được ${rows.length} dòng`);
    if (d.cert_no) out.notes.push(`Số GCN ghi trên phiếu: ${d.cert_no}`);
    if (d.calib_date) out.notes.push(`Ngày trên phiếu: ${d.calib_date}`);
    out.fills.forEach(f => { f.bad = out.bad.includes(f.p); });
    return out;
  }
  window.LabOCR = { read, plan, supported: t => t === "PT" || t === "PS" };
})();
