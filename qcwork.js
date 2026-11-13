/* LAB PVGAS Services – "Bảng tính chi tiết cho Quality Checker" (mục 5, tab Nhập liệu), v74 – yêu cầu NGOC 13/11/2026:
 * cả 3 cấp xem được; mỗi bước ghi công thức chuẩn (như tab Công thức), dòng dưới thay đúng số người dùng đã nhập vào công thức, ra kết quả.
 * Số lấy thẳng từ kết quả calc.js / calc2.js (r) và số liệu đầu vào của lần tính đó (r.inp), theo đúng phiên bản công thức của hồ sơ (r.fv).
 * Không tính lại kết quả – chỉ trình bày; mỗi số kết quả ở dòng "=" là số app dùng. */
(function () {
  "use strict";
  const R = String.raw, S3 = Math.sqrt(3);
  const tex = s => { try { return window.temml.renderToString(R`\displaystyle ` + s, { displayMode: false, throwOnError: false }); } catch (e) { return `<code>${s}</code>`; } };
  const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  // số → LaTeX: 5 chữ số có nghĩa, dấu phẩy thập phân
  const N = (v, p = 5) => {
    if (v == null || !isFinite(v)) return R`\text{—}`;
    if (v === 0 || Math.abs(v) < 1e-12) return "0";                      // nhiễu dấu phẩy động (1e-16) → 0
    let s = String(Number(Number(v).toPrecision(p)));
    if (/e/.test(s)) { const [m, e] = s.split("e"); return R`\left(` + m.replace(".", "{,}") + R`\cdot10^{${Number(e)}}\right)`; }
    return s.replace(".", "{,}");
  };
  const P = (v, p) => v < 0 ? R`\left(${N(v, p)}\right)` : N(v, p);          // số âm trong ngoặc khi thay vào biểu thức
  // NGOC 13/11/2026: số người dùng nhập (số đọc, phạm vi, độ chính xác) và số lấy từ thư viện chuẩn – tô màu riêng
  const IC = "#e8590c";
  const In = (v, p) => R`{\color{${IC}}${N(v, p)}}`;
  const PIn = (v, p) => v < 0 ? R`\left(${In(v, p)}\right)` : In(v, p);
  const U_ = s => s ? R`\;\text{${String(s).replace(/%/g, R`\%`)}}` : "";
  const T = s => R`\text{${s}}`;
  const sum2 = a => a.reduce((s, v) => s + v * v, 0);
  const mean = a => a.reduce((s, v) => s + v, 0) / a.length;
  const devsq = a => { const m = mean(a); return a.reduce((s, v) => s + (v - m) ** 2, 0); };
  const argmax = a => a.reduce((b, v, i) => v > a[b] ? i : b, 0);
  const uPub = v => window.LabCalc.uPub(v).v;

  /* Một bước: tiêu đề · công thức chuẩn · "= thay số = kết quả" */
  const st = (title, sym, sub, res, unit) => `<div class="qs"><div class="ql">${title}</div>`
    + (sym ? `<div class="fm">${tex(sym)}</div>` : "")
    + `<div class="fm">${tex((sub ? "=" + sub : "") + R`=\mathbf{${res}}` + U_(unit))}</div></div>`;
  // chỉ ra kết quả (giá trị đã có, không thay số)
  const val = (title, sym, res, unit) => `<div class="qs"><div class="ql">${title}</div><div class="fm">${tex(sym + R`=\mathbf{${res}}` + U_(unit))}</div></div>`;
  const hd = t => `<div class="qh">${t}</div>`;
  const note = t => `<div class="qn">${t}</div>`;
  const verdict = (title, lhsSym, lhsSub, lhs, rhsSym, rhsSub, rhs, unit, ok) => `<div class="qs qd ${ok ? "ok" : "ko"}"><div class="ql">${title}</div>`
    + `<div class="fm">${tex(lhsSym + R`\;\le\;` + rhsSym)}</div>`
    + `<div class="fm">${tex((lhsSub ? lhsSub + "=" : "") + N(lhs) + R`\;${ok ? R`\le` : ">"}\;` + N(rhs) + (rhsSub ? "=" + rhsSub : "") + U_(unit))}</div>`
    + `<div class="qv">${ok ? "→ ĐẠT" : "→ KHÔNG ĐẠT"}</div></div>`;

  // hệ số phủ: V1 k = 2; V2 k = t95,45(ν_eff) Welch–Satterthwaite (EA-4/02)
  const kStep = (V2, comps, uc, nu, k) => {
    if (!V2) return val("Hệ số phủ", "k", "2");
    const live = comps.filter(c => c[2] > 0 && isFinite(c[2]));
    const den = live.map(c => R`\frac{${N(c[1], 4)}^4}{${N(c[2], 4)}}`).join("+");
    return st("Bậc tự do hiệu dụng (Welch–Satterthwaite)", R`\nu_{\text{eff}}=\frac{u_c^4}{\sum_i u_i^4/\nu_i}`, live.length ? R`\frac{${N(uc, 4)}^4}{${den}}` : "", isFinite(nu) ? N(nu, 4) : R`\infty`)
      + val(R`Hệ số phủ (bảng t<sub>95,45</sub> EA-4/02, ν làm tròn xuống)`, R`k=t_{95{,}45}(\nu_{\text{eff}})`, N(k, 4));
  };
  const heat = (title, h, v, sym = R`u_{\text{lò}}`) => st(title, R`${sym}=\sqrt{\left(\frac{\delta_{\text{ổn định}}}{\sqrt3}\right)^2+\left(\frac{\delta_{\text{radial}}}{\sqrt3}\right)^2+\left(\frac{\delta_{\text{axial}}}{\sqrt3}\right)^2}`,
    R`\sqrt{\left(\frac{${In((h && h.stab) || 0)}}{\sqrt3}\right)^2+\left(\frac{${In((h && h.radial) || 0)}}{\sqrt3}\right)^2+\left(\frac{${In((h && h.axial) || 0)}}{\sqrt3}\right)^2}`, N(v), "°C");
  const rss = (title, lhs, names, vals, res, unit) => st(title, R`${lhs}=\sqrt{${names.map(n => n + "^2").join("+")}}`, R`\sqrt{${vals.map(v => P(v) + "^2").join("+")}}`, N(res), unit);
  const sdA = (title, sym, arr, res, unit) => { const n = arr.length; return st(title, R`${sym}=\sqrt{\frac{\sum_{i=1}^{n}(x_i-\bar x)^2}{n(n-1)}}`, R`\sqrt{\frac{${N(devsq(arr))}}{${n}\cdot${n - 1}}}`, N(res), unit); };

  /* ---------- PT / DPT ---------- */
  function PT(r, unit) {
    const I = r.inp, V2 = r.fv === 2, mn = I.min, mx = I.max, span = mx - mn, s1 = I.stand1;
    const iU = argmax(r.rows.map(x => x.U)), row = r.rows[iU], m = r.rows.length;
    const cU = r.cols[iU], cD = r.cols[iU + m], cw = cU.uc >= cD.uc ? cU : cD, dirW = cw === cU ? "tăng" : "giảm";
    let h = hd(`Điểm có U lớn nhất: x = ${esc(String(row.x))} ${esc(unit)} (điểm ${iU + 1})`);
    h += st("Dòng lý tưởng", R`I=4+16\cdot\frac{x-\text{Min}}{\text{span}}`, R`4+16\cdot\frac{${PIn(row.x)}-${P(mn)}}{${N(span)}}`, N(cw.I), "mA");
    h += hd("Hồi quy y = a + b·x trên 10 cặp (5 tăng + 5 giảm)");
    h += val("Hệ số hồi quy", R`a;\;b`, R`${N(r.a, 6)};\;${N(r.b, 6)}`);
    h += val("Sai số chuẩn của hồi quy (STEYX)", R`S_y=\sqrt{\frac{\sum(y-\bar y)^2-\frac{[\sum(x-\bar x)(y-\bar y)]^2}{\sum(x-\bar x)^2}}{n-2}}`, N(r.Sy), "mA");
    h += st("", R`S_a=S_y\sqrt{\frac{\sum I^2}{n\sum(I-\bar I)^2}}`, R`${N(r.Sy)}\sqrt{\frac{${N(r.L34)}}{${r.M34}\cdot${N(r.K34)}}}`, N(r.Sa), "mA");
    h += st("", R`S_b=\frac{S_y}{\sqrt{\sum(I-\bar I)^2}}`, R`\frac{${N(r.Sy)}}{\sqrt{${N(r.K34)}}}`, N(r.Sb));
    h += st("", R`r=-\frac{\sum I}{\sqrt{n\sum I^2}}`, R`-\frac{${N(r.N34)}}{\sqrt{${r.M34}\cdot${N(r.L34)}}}`, N(r.r));
    h += hd(`Thành phần độ KĐBĐ (% span) – chiều ${dirW}${V2 ? " (chiều có u<sub>c</sub> lớn hơn)" : ""}`);
    h += st("Loại A từ hồi quy", R`u_A=\frac{100}{16}\sqrt{S_a^2+I^2S_b^2+2\,I\,S_aS_b\,r}`, R`\frac{100}{16}\sqrt{${N(r.Sa)}^2+${N(cw.I)}^2\cdot${N(r.Sb)}^2+2\cdot${N(cw.I)}\cdot${N(r.Sa)}\cdot${N(r.Sb)}\cdot${P(r.r)}}`, N(cw.uA), "%");
    if (s1.uncUnit === "%") h += val("U chuẩn áp suất (Stand1)", R`E_{12}`, N(r.E12), "%");
    else h += st("U chuẩn áp suất quy đổi", R`E_{12}=\frac{U_{\text{chuẩn}}}{\text{Max}_{\text{chuẩn}}-\text{Min}_{\text{chuẩn}}}\cdot100`, R`\frac{${In(r.E11)}}{${PIn(r.E10)}-${PIn(r.E9)}}\cdot100`, N(r.E12), "%");
    if (s1.deadweight) h += st("Chuẩn áp suất (quả cân)", R`u_s=\frac{E_{12}\,|x|}{2\cdot\text{span}}`, R`\frac{${N(r.E12)}\cdot${In(Math.abs(cw.x))}}{2\cdot${N(span)}}`, N(cw.us), "%");
    else if (V2) h += st("Chuẩn áp suất", R`u_s=\sqrt{\left(\frac{E_{12}(\text{Max}_{\text{c}}-\text{Min}_{\text{c}})}{2\,\text{span}}\right)^2+\left(\frac{E_{13}\,|x|}{\sqrt3\,\text{span}}\right)^2}`,
      R`\sqrt{\left(\frac{${N(r.E12)}\cdot${N(r.E10 - r.E9)}}{2\cdot${N(span)}}\right)^2+\left(\frac{${In(r.E13)}\cdot${In(Math.abs(cw.x))}}{\sqrt3\cdot${N(span)}}\right)^2}`, N(cw.us), "%");
    else h += st("Chuẩn áp suất", R`u_s=\frac{E_{12}(\text{Max}_{\text{c}}-\text{Min}_{\text{c}})+E_{13}\,|x|}{2\cdot\text{span}}`, R`\frac{${N(r.E12)}\cdot${N(r.E10 - r.E9)}+${In(r.E13)}\cdot${In(Math.abs(cw.x))}}{2\cdot${N(span)}}`, N(cw.us), "%");
    h += st("Chuẩn điện mA (Stand2)", R`u_v=\sqrt{\left(\frac{H_{12}(H_{10}-H_9)}{2\cdot16}\right)^2+\left(\frac{H_{13}/(H_{10}-H_9)}{2\sqrt3}\right)^2}`,
      R`\sqrt{\left(\frac{${N(r.H12)}\cdot${N(r.H10 - r.H9)}}{32}\right)^2+\left(\frac{${In(r.H13)}/${N(r.H10 - r.H9)}}{2\sqrt3}\right)^2}`, N(r.uv), "%");
    h += rss("Độ KĐBĐ tổng hợp", "u_c", ["u_A", "u_s", "u_v"], [cw.uA, cw.us, r.uv], cw.uc, "%");
    if (!V2) {
      const o = cw === cU ? cD : cU;
      h += val(`u<sub>c</sub> chiều ${dirW === "tăng" ? "giảm" : "tăng"} (tính tương tự)`, "u_c'", N(o.uc), "%");
      h += st("Trung bình hai chiều", R`\bar u_c=\frac{u_{c,\uparrow}+u_{c,\downarrow}}{2}`, R`\frac{${N(cU.uc)}+${N(cD.uc)}}{2}`, N(row.ucAvg), "%");
    }
    h += kStep(V2, [["u_A", cw.uA, r.M34 - 2]], cw.uc, row.nu, row.k);
    h += st("Độ KĐBĐ mở rộng (% span)", V2 ? R`U\%=k\cdot u_c` : R`U\%=k\cdot\bar u_c`, R`${N(row.k, 4)}\cdot${N(row.ucAvg)}`, N(row.Upct), "%");
    h += st("Đổi ra đơn vị thiết bị", R`U=U\%\cdot\frac{\text{span}}{100}`, R`${N(row.Upct)}\cdot\frac{${N(span)}}{100}`, N(row.U), unit);
    h += hd("Kết luận");
    if (V2) {
      const d = r.rows.map(x => Math.max(Math.abs(x.shcR), Math.abs(x.shcF)) * span / 16 + x.U), j = argmax(d), x = r.rows[j], sh = Math.max(Math.abs(x.shcR), Math.abs(x.shcF));
      h += st("SHC tại điểm xấu nhất (điểm " + (j + 1) + ")", R`\text{SHC}=I_{\text{lý tưởng}}-I_{\text{đo}}`, "", R`\pm${N(sh, 4)}`, "mA");
      h += verdict("|sai số| + U ≤ MPE (quy tắc chung 06/11/2026)", R`|\text{SHC}|\cdot\frac{\text{span}}{16}+U`, R`${N(sh, 4)}\cdot\frac{${N(span)}}{16}+${N(x.U)}`, r.decRule, R`\frac{\text{acc}\cdot\text{span}}{100}`, R`\frac{${In(I.acc)}\cdot${N(span)}}{100}`, r.limU, unit, r.pass);
    } else {
      h += verdict("U lớn nhất ≤ MPE", R`U_{\max}`, "", r.Umax, R`\frac{\text{acc}\cdot\text{span}}{100}`, R`\frac{${In(I.acc)}\cdot${N(span)}}{100}`, r.limU, unit, r.checks.uOK);
      h += verdict("|SHC| lớn nhất ≤ giới hạn mA", R`\max|\text{SHC}|`, "", r.shcMax, R`\frac{\text{acc}\cdot16}{100}`, R`\frac{${In(I.acc)}\cdot16}{100}`, r.limI, "mA", r.checks.iOK);
    }
    return h;
  }

  /* ---------- PS / DPS ---------- */
  function PS(r, unit) {
    const I = r.inp, V2 = r.fv === 2, s1 = I.stand1, n = r.hi.length, ris = r.dir === "Rising";
    let h = hd(`Chiều tác động: ${r.dir === "Rising" ? "Rising (tăng áp)" : "Falling (giảm áp)"}`);
    h += st("Chọn chiều", R`\text{Falling nếu }|\overline{P_{\text{set}}-P_H}|>|\overline{P_{\text{set}}-P_L}|`, "", R`|${N(mean(r.G))}|\;${Math.abs(mean(r.G)) > Math.abs(mean(r.H)) ? ">" : R`\le`}\;|${N(mean(r.H))}|\Rightarrow\text{${r.dir}}`);
    h += hd("Độ KĐBĐ");
    h += sdA("Loại A – áp suất mở (P<sub>H</sub>)", R`u_{A,\text{mở}}`, r.hi, r.F26, unit);
    h += sdA("Loại A – áp suất đóng (P<sub>L</sub>)", R`u_{A,\text{đóng}}`, r.lo, r.F27, unit);
    if (s1.uncUnit === "%") h += val("U chuẩn (Stand1)", R`E_{14}`, N(r.E14), "%");
    else h += st("U chuẩn quy đổi", R`E_{14}=\frac{U_{\text{chuẩn}}}{\text{FS}-\text{Min}}\cdot100`, R`\frac{${In(r.E13)}}{${P(r.E12)}-${PIn(r.E11)}}\cdot100`, N(r.E14), "%");
    if (s1.deadweight) h += st("Chuẩn (quả cân)", R`u_{B,\text{chuẩn}}=\frac{E_{14}\cdot P_{\text{set}}}{200}`, R`\frac{${N(r.E14)}\cdot${PIn(I.pset)}}{200}`, N(r.F31), unit);
    else if (V2) h += st("Chuẩn áp suất", R`u_{B,\text{chuẩn}}=\sqrt{\left(\frac{E_{14}\cdot\text{FS}}{200}\right)^2+\left(\frac{G_{14}\,|P_{\text{set}}|}{100\sqrt3}\right)^2}`,
      R`\sqrt{\left(\frac{${N(r.E14)}\cdot${In(r.E12)}}{200}\right)^2+\left(\frac{${In(r.G14)}\cdot${In(Math.abs(I.pset))}}{100\sqrt3}\right)^2}`, N(r.F31), unit);
    else h += st("Chuẩn áp suất", R`u_{B,\text{chuẩn}}=\frac{E_{14}\cdot\text{FS}+G_{14}\cdot P_{\text{set}}}{200}`, R`\frac{${N(r.E14)}\cdot${N(r.E12)}+${In(r.G14)}\cdot${PIn(I.pset)}}{200}`, N(r.F31), unit);
    h += st("Độ phân giải thước đặt mức", R`u_{B,\text{pg}}=\frac{d}{2}`, R`\frac{${In(I.resolution || 0)}}{2}`, N(r.F32), unit);
    const uA = ris ? r.F26 : r.F27, uc = ris ? r.F34 : r.F35;
    h += st(`Độ KĐBĐ tổng hợp (chiều ${ris ? "mở" : "đóng"})`, R`u_c=\sqrt{u_A^2+u_{B,\text{chuẩn}}^2+\left(\frac{u_{B,\text{pg}}}{\sqrt3}\right)^2}`,
      R`\sqrt{${N(uA)}^2+${N(r.F31)}^2+\left(\frac{${N(r.F32)}}{\sqrt3}\right)^2}`, N(uc), unit);
    h += kStep(V2, [["u_A", uA, n - 1]], uc, r.nu, r.k);
    h += st("Độ KĐBĐ mở rộng", R`U=k\cdot u_c`, R`${N(r.k, 4)}\cdot${N(uc)}`, N(r.U), unit);
    h += hd("Kết luận");
    const md = Math.max(...r.setDev.map(Math.abs));
    h += verdict("max|Set − Pset| + U ≤ MPE", R`\max|P_{\text{set}}-P_i|+U`, R`${N(md)}+${N(r.U)}`, r.J42, R`\frac{\text{acc}\cdot P_{\text{set}}}{100}`, R`\frac{${In(I.acc)}\cdot${PIn(I.pset)}}{100}`, r.K42, unit, r.pass);
    return h;
  }

  /* ---------- PG ---------- */
  function PG(r, unit) {
    const I = r.inp, d = r.rows.map(x => Math.max(Math.abs(x.cR), Math.abs(x.cF))), j = argmax(d), x = r.rows[j], up = Math.abs(x.cR) >= Math.abs(x.cF);
    let h = hd(`Điểm có |SHC| lớn nhất: điểm ${j + 1} (${up ? "chiều tăng" : "chiều giảm"})`);
    h += st("Số hiệu chính", R`\text{SHC}=P_{\text{chuẩn}}-P_{\text{đọc}}`, R`${PIn(x.x)}-${PIn(up ? x.rise : x.fall)}`, N(up ? x.cR : x.cF), unit);
    h += hd("Kết luận (ĐLVN 08:2011 – kiểm định, không tính U)");
    h += verdict("max|SHC| ≤ sai số cho phép", R`\max|\text{SHC}|`, "", r.maxSHC, R`\frac{\text{acc}\,(\text{Max}-\text{Min})}{100}`, R`\frac{${In(I.acc)}\cdot(${PIn(I.max)}-${PIn(I.min)})}{100}`, r.lim, unit, r.pass);
    if (r.red) h += st("Sụt áp của chuẩn (phải < 5 %)", R`\delta=\frac{P_{\text{trước}}-P_{\text{sau}}}{P_{\text{trước}}}\cdot100`, R`\frac{${N(r.red.d)}}{${In(Number(I.before))}}\cdot100`, N(r.red.pct, 4), "%");
    return h;
  }

  /* ---------- TS ---------- */
  function TS(r) {
    const I = r.inp, V2 = r.fv === 2, ris = r.rising;
    const Tm = ris ? r.set : r.reset, Td = ris ? r.reset : r.set;
    let h = hd(`Chiều tác động: ${ris ? "Rising" : "Falling"} · T<sub>set</sub> = ${esc(String(I.tset))} °C`);
    h += sdA("Loại A – nhiệt độ mở", R`u_{tm}`, Tm, r.F30, "°C");
    h += sdA("Loại A – nhiệt độ đóng", R`u_{td}`, Td, r.F31, "°C");
    h += st("Chuẩn nhiệt (GCN chuẩn, k = 2)", R`u_{ch1}=\frac{U_{\text{chuẩn}}}{${V2 ? 2 : "k"}}`, R`\frac{${In(I.stand.unc || 0)}}{2}`, N(r.F33), "°C");
    h += heat("Lò / bể nhiệt", I.heat, r.F35, "u_{ch3}");
    if (V2) h += st("Độ phân giải số đọc chuẩn", R`u_{\text{pg}}=\frac{d}{2\sqrt3}`, R`\frac{${In(I.res || 0)}}{2\sqrt3}`, N(r.uRes), "°C");
    h += V2 ? rss("Thành phần chuẩn", "u_{ch}", ["u_{ch1}", "u_{ch3}", R`u_{\text{pg}}`], [r.F33, r.F35, r.uRes], r.F36, "°C")
      : rss("Thành phần chuẩn", "u_{ch}", ["u_{ch1}", "u_{ch3}"], [r.F33, r.F35], r.F36, "°C");
    const uA = ris ? r.F30 : r.F31, uc = ris ? r.F38 : r.F39;
    h += rss("Độ KĐBĐ tổng hợp", "u_c", [ris ? "u_{tm}" : "u_{td}", "u_{ch}"], [uA, r.F36], uc, "°C");
    h += kStep(V2, [["u_A", uA, r.n - 1]], uc, r.nu, r.k);
    h += st("Độ KĐBĐ mở rộng", R`U=k\cdot u_c`, R`${N(r.k, 4)}\cdot${N(uc)}`, N(r.U), "°C");
    h += hd("Kết luận");
    if (V2) h += verdict("max|T − Tset| + U ≤ MPE", R`\max|T_i-T_{\text{set}}|+U`, R`${N(r.maxDev)}+${N(r.Uprint)}`, r.maxDev + r.Uprint, R`\frac{\text{acc}\cdot T_{\text{set}}}{100}`, R`\frac{${In(I.acc)}\cdot${PIn(I.tset)}}{100}`, r.lim, "°C", r.pass);
    else h += verdict("max|T − Tset| ≤ sai số cho phép", R`\max|T_i-T_{\text{set}}|`, "", r.maxDev, R`\frac{\text{acc}\cdot T_{\text{set}}}{100}`, R`\frac{${In(I.acc)}\cdot${PIn(I.tset)}}{100}`, r.lim, "°C", r.pass);
    return h;
  }

  /* ---------- TT / TG: theo dải thấp (≤ 150 °C) / trung (≤ 400 °C) / cao ---------- */
  const RN = { low: "Dải thấp (≤ 150 °C) – Stand1", mid: "Dải trung (150 ÷ 400 °C) – Stand2", high: "Dải cao (> 400 °C) – Stand2" };
  function TT(r) {
    const I = r.inp, V2 = r.fv === 2, span = I.max - I.min, a = I.amm || {}, n = r.n;
    let h = hd("Chung cho các dải");
    h += st("Hệ số đổi mA → °C", R`C_j=\frac{\text{span}}{16}`, R`\frac{${N(span)}}{16}`, N(r.Cj), "°C/mA");
    h += st("Ampe kế đo dòng (Stand3)", R`u_{ch2}=\sqrt{\left(\frac{U_{\text{A}}\,C_j}{2}\right)^2+\left(\frac{\delta_{\text{A}}\,C_j}{2\sqrt3}\right)^2}`,
      R`\sqrt{\left(\frac{${In(r.L17)}\cdot${N(r.Cj)}}{2}\right)^2+\left(\frac{${In(r.N17)}\cdot${N(r.Cj)}}{2\sqrt3}\right)^2}`, N(r.F40), "°C");
    h += st("Độ phân giải transmitter", R`u_{bk3}=\frac{0{,}5\cdot d\cdot C_j}{\sqrt3}`, R`\frac{0{,}5\cdot${In(I.res || 0)}\cdot${N(r.Cj)}}{\sqrt3}`, N(r.F52), "°C");
    ["low", "mid", "high"].forEach(key => {
      const g = r.R[key]; if (!g.cnt) return;
      const sd = key === "low" ? I.s1 : I.s2;
      h += hd(`${RN[key]} · ${g.cnt} điểm`);
      h += val("Độ lệch chuẩn gộp số đọc chuẩn (RMS)", R`\bar s_{\text{chuẩn}}=\sqrt{\frac{\sum s_i^2}{2m}}`, N(g.UltbS), "°C");
      h += st("Lặp lại của chuẩn", R`u_{ch4}=\frac{\bar s_{\text{chuẩn}}}{\sqrt{n}}`, R`\frac{${N(g.UltbS)}}{\sqrt{${n}}}`, N(g.uch4), "°C");
      h += st("Chuẩn nhiệt (GCN chuẩn)", R`u_{ch1}=\frac{U_{\text{chuẩn}}}{2}`, R`\frac{${In((sd && sd.unc) || 0)}}{2}`, N(g.uch1), "°C");
      h += heat("Lò / bể nhiệt", sd, g.uch3, "u_{ch3}");
      h += rss("Thành phần chuẩn", "u_{ch}", ["u_{ch4}", "u_{ch1}", "u_{ch2}", "u_{ch3}"], [g.uch4, g.uch1, r.F40, g.uch3], g.uch, "°C");
      h += val("Độ lệch chuẩn gộp số đọc mA (RMS)", R`\bar s_{\text{TB}}`, N(g.UltbD), "mA");
      h += st("Lặp lại của transmitter", R`u_{bk1}=\frac{\bar s_{\text{TB}}\cdot C_j}{\sqrt{n}}`, R`\frac{${N(g.UltbD)}\cdot${N(r.Cj)}}{\sqrt{${n}}}`, N(g.ubk1), "°C");
      h += st("Trễ (lớn nhất trong dải)", R`u_{bk2}=\frac{|\bar I_{\downarrow}-\bar I_{\uparrow}|\cdot C_j}{2\sqrt3}`, R`\frac{${N(g.hyst)}\cdot${N(r.Cj)}}{2\sqrt3}`, N(g.ubk2), "°C");
      h += rss("Thành phần thiết bị", R`u_{\text{TB}}`, ["u_{bk1}", "u_{bk2}", "u_{bk3}"], [g.ubk1, g.ubk2, r.F52], g.uDUT, "°C");
      h += rss("Độ KĐBĐ tổng hợp", "u_c", ["u_{ch}", R`u_{\text{TB}}`], [g.uch, g.uDUT], g.uc, "°C");
      h += kStep(V2, [["u_{ch4}", g.uch4, 2 * g.cnt * (n - 1)], ["u_{bk1}", g.ubk1, 2 * g.cnt * (n - 1)]], g.uc, g.nu, g.k);
      h += st("Độ KĐBĐ mở rộng", R`U=k\cdot u_c`, R`${N(g.k, 4)}\cdot${N(g.uc)}`, N(g.U), "°C");
    });
    h += hd("Kết luận");
    const lim = R`\frac{\text{acc}\cdot\text{span}}{100}`, limS = R`\frac{${In(I.acc)}\cdot${N(span)}}{100}`;
    if (V2) {
      const d = r.pt.map((p, i) => Math.max(Math.abs(p.cR), Math.abs(p.cF)) * r.Cj + uPub((r.R[r.cls[i]] || { U: r.Umax }).U)), j = argmax(d), p = r.pt[j], sh = Math.max(Math.abs(p.cR), Math.abs(p.cF));
      h += st(`SHC tại điểm xấu nhất (điểm ${j + 1})`, R`\text{SHC}=I_{\text{lý tưởng}}-\bar I_{\text{đo}}`, "", R`\pm${N(sh, 4)}`, "mA");
      h += verdict("|sai số| + U ≤ MPE (°C)", R`|\text{SHC}|\cdot C_j+U_{\text{dải}}`, R`${N(sh, 4)}\cdot${N(r.Cj)}+${N(uPub((r.R[r.cls[j]] || { U: r.Umax }).U))}`, r.decRule, lim, limS, r.lim, "°C", r.pass);
    } else h += verdict("max(sai số %, U các dải, |SHC|) ≤ MPE (như file Excel)", R`\max(\varepsilon_{\%},U_{\text{thấp}},U_{\text{trung}},U_{\text{cao}},|\text{SHC}|)`,
      R`\max(${N(r.maxErr, 4)},${N(r.R.low.U, 4)},${N(r.R.mid.U, 4)},${N(r.R.high.U, 4)},${N(r.maxSHC, 4)})`, Math.max(r.maxErr, r.R.low.U, r.R.mid.U, r.R.high.U, r.maxSHC), lim, limS, r.lim, "", r.pass);
    return h;
  }
  function TG(r) {
    const I = r.inp, V2 = r.fv === 2, n = r.n;
    let h = hd("Chung cho các dải");
    h += st(`Độ phân giải đồng hồ (${r.F7 === 1 ? "Analog: F7 = 1" : "Digital: F7 = 0,5"})`, R`u_{bk3}=\frac{F_7\cdot d}{\sqrt3}`, R`\frac{${In(r.F7)}\cdot${In(r.res)}}{\sqrt3}`, N(r.ubk3), "°C");
    ["low", "mid", "high"].forEach(key => {
      const g = r.R[key]; if (!g.cnt) return;
      const sd = key === "low" ? I.s1 : I.s2;
      h += hd(`${RN[key]} · ${g.cnt} điểm`);
      h += val("Độ lệch chuẩn gộp số đọc chuẩn (RMS)", R`\bar s_{\text{chuẩn}}=\sqrt{\frac{\sum s_i^2}{2m}}`, N(g.UltbS), "°C");
      h += st("Lặp lại của chuẩn", R`u_{ch4}=\frac{\bar s_{\text{chuẩn}}}{\sqrt{n}}`, R`\frac{${N(g.UltbS)}}{\sqrt{${n}}}`, N(g.uch4), "°C");
      h += st("Chuẩn nhiệt (GCN chuẩn)", R`u_{ch1}=\frac{U_{\text{chuẩn}}}{2}`, R`\frac{${In((sd && sd.unc) || 0)}}{2}`, N(g.uch1), "°C");
      h += heat("Lò / bể nhiệt", sd, g.uch3, "u_{ch3}");
      h += rss("Thành phần chuẩn", "u_{ch}", ["u_{ch4}", "u_{ch1}", "u_{ch3}"], [g.uch4, g.uch1, g.uch3], g.uch, "°C");
      h += val("Độ lệch chuẩn gộp số đọc đồng hồ (RMS)", R`\bar s_{\text{TB}}`, N(g.UltbD), "°C");
      h += st("Lặp lại của đồng hồ", R`u_{bk2}=\frac{\bar s_{\text{TB}}}{\sqrt{n}}`, R`\frac{${N(g.UltbD)}}{\sqrt{${n}}}`, N(g.ubk2), "°C");
      h += st("Trễ (lớn nhất trong dải)", R`u_{bk1}=\frac{|\bar t_{\downarrow}-\bar t_{\uparrow}|}{2\sqrt3}`, R`\frac{${N(g.hyst)}}{2\sqrt3}`, N(g.ubk1), "°C");
      h += rss("Thành phần thiết bị", R`u_{\text{TB}}`, ["u_{bk2}", "u_{bk1}", "u_{bk3}"], [g.ubk2, g.ubk1, r.ubk3], g.uDUT, "°C");
      h += rss("Độ KĐBĐ tổng hợp", "u_c", ["u_{ch}", R`u_{\text{TB}}`], [g.uch, g.uDUT], g.uc, "°C");
      h += kStep(V2, [["u_{ch4}", g.uch4, 2 * g.cnt * (n - 1)], ["u_{bk2}", g.ubk2, 2 * g.cnt * (n - 1)]], g.uc, g.nu, g.k);
      h += st("Độ KĐBĐ mở rộng", R`U=k\cdot u_c`, R`${N(g.k, 4)}\cdot${N(g.uc)}`, N(g.U), "°C");
    });
    h += hd("Kết luận");
    const lim = R`\frac{\text{acc}\,(\text{Max}-\text{Min})}{100}`, limS = R`\frac{${In(I.acc)}\cdot(${PIn(I.max)}-${PIn(I.min)})}{100}`;
    if (V2) {
      const d = r.pt.map((p, i) => Math.max(Math.abs(p.corr), Math.abs(p.cF)) + uPub(r.R[r.cls[i]].U)), j = argmax(d), p = r.pt[j], sh = Math.max(Math.abs(p.corr), Math.abs(p.cF)), up = Math.abs(p.corr) >= Math.abs(p.cF);
      h += st(`SHC tại điểm xấu nhất (điểm ${j + 1}, ${up ? "chiều tăng" : "chiều giảm"})`, R`\text{SHC}=\bar t_{\text{chuẩn}}-\bar t_{\text{đọc}}`, R`${N(p.stdT)}-${N(up ? p.rise : p.fall)}`, N(up ? p.corr : p.cF, 4), "°C");
      h += verdict("|sai số| + U ≤ MPE", R`|\text{SHC}|+U_{\text{dải}}`, R`${N(sh, 4)}+${N(uPub(r.R[r.cls[j]].U))}`, r.decRule, lim, limS, r.lim, "°C", r.pass);
    } else h += verdict("max(U, |SHC|) ≤ MPE (như file Excel)", R`\max(U_{\max},\max|\text{SHC}|)`, R`\max(${N(r.Umax, 4)},${N(r.maxSHC, 4)})`, Math.max(r.Umax, r.maxSHC), lim, limS, r.lim, "°C", r.pass);
    return h;
  }

  /* ---------- RTD ---------- */
  function RTD(r) {
    const I = r.inp, V2 = r.fv === 2, S = r.sens, kS = V2 ? 2 : (I.k || 2), mt = I.meter || {}, n = r.n;
    let h = hd(`Đặc tuyến R(t) – bình phương tối thiểu bậc ${r.neg ? 3 : 2} trên 5 điểm`);
    const f = r.fit;
    h += val("Hệ số đặc tuyến", r.neg ? R`R(t)=c_0+c_1t+c_2t^2+c_3t^3` : R`R(t)=R_0+R_0A\,t+R_0B\,t^2`, f.map(c => N(c, 6)).join(R`;\;`));
    h += val("Tổng bình phương dư", R`\sum\left(R_{\text{fit}}-\bar R\right)^2`, N(r.ss), "Ω²");
    h += hd("Thành phần thiết bị (°C)");
    if (V2) h += st("Độ khớp đặc tuyến", R`u_{bk6}=\frac{1}{S}\sqrt{\frac{\sum(\text{dư})^2}{5-p}}`, R`\frac{1}{${N(S)}}\sqrt{\frac{${N(r.ss)}}{5-${r.pfit}}}`, N(r.Q36), "°C");
    else h += st("Độ khớp đặc tuyến", R`u_{bk6}=\sqrt{\frac{\sum(\text{dư})^2}{(5-3)\,S}}`, R`\sqrt{\frac{${N(r.ss)}}{2\cdot${N(S)}}}`, N(r.Q36), "°C");
    const ssi = sum2(r.Si.slice(0, 5));
    if (V2) h += st("Độ lệch chuẩn gộp số đọc Ω", R`s_{\text{TB}}=\sqrt{\frac{\sum s_i^2}{5}}`, R`\sqrt{\frac{${N(ssi)}}{5}}`, N(r.O33), "Ω");
    else h += st("S(DUT) như file Excel", R`s_{\text{TB}}=\frac{\sum s_i^2}{5}`, R`\frac{${N(ssi)}}{5}`, N(r.O33));
    h += st("Lặp lại", R`u_{bk5}=\frac{s_{\text{TB}}}{\sqrt{n}\,S}`, R`\frac{${N(r.O33)}}{\sqrt{${n}}\cdot${N(S)}}`, N(r.Q34), "°C");
    h += st("Trễ tại điểm 3", R`u_{bk4}=\frac{|\bar R_6-\bar R_3|}{2\sqrt3\,S}`, R`\frac{|${N(r.Rm[5])}-${N(r.Rm[2])}|}{2\sqrt3\cdot${N(S)}}`, N(r.Q35), "°C");
    h += rss("Thành phần thiết bị", R`u_{\text{TB}}`, ["u_{bk5}", "u_{bk4}", "u_{bk6}"], [r.Q34, r.Q35, r.Q36], r.Q38, "°C");
    h += hd("Thành phần chuẩn (°C)");
    const sd = I.max >= 150 ? I.s2 : I.s1;
    h += st(`Chuẩn nhiệt (${I.max >= 150 ? "Stand2" : "Stand1"})`, R`u_{ch1}=\frac{U_{\text{chuẩn}}}{2}`, R`\frac{${In((sd && sd.unc) || 0)}}{${kS}}`, N(r.G35), "°C");
    const Um = mt.uncUnit === "%" ? (mt.unc || 0) * (mt.max || 0) / 100 : mt.uncUnit === "ppm" ? (mt.unc || 0) * (mt.max || 0) * 1e-6 : (mt.unc || 0);
    h += st("Thiết bị đo điện trở (Stand3)", R`u_{ch2}=\sqrt{\left(\frac{U_{\Omega}}{S\cdot2}\right)^2+\left(\frac{\delta_{\Omega}/S}{2\sqrt3}\right)^2}`,
      R`\sqrt{\left(\frac{${N(Um)}}{${N(S)}\cdot${kS}}\right)^2+\left(\frac{${In(mt.err || 0)}/${N(S)}}{2\sqrt3}\right)^2}`, N(r.G36), "°C");
    h += heat(`Lò / bể nhiệt (${I.max < 140 ? "Stand1" : "Stand2"})`, I.max < 140 ? I.s1 : I.s2, r.G37, "u_{ch3}");
    h += rss("Thành phần chuẩn", "u_{ch}", ["u_{ch1}", "u_{ch2}", "u_{ch3}"], [r.G35, r.G36, r.G37], r.G38, "°C");
    h += hd("Tổng hợp");
    h += rss("Độ KĐBĐ tổng hợp", "u_c", ["u_{ch}", R`u_{\text{TB}}`], [r.G38, r.Q38], r.G39, "°C");
    h += kStep(V2, [["u_{bk5}", r.Q34, 5 * (n - 1)], ["u_{bk6}", r.Q36, 5 - r.pfit]], r.G39, r.nu, r.k);
    h += st("Độ KĐBĐ mở rộng", R`U=k\cdot u_c`, R`${N(r.k, 4)}\cdot${N(r.G39)}`, N(r.U), "°C");
    h += hd("Kết luận");
    const j = argmax(r.rows.map(x => Math.abs(x.eC))), x = r.rows[j], mE = V2 ? Math.abs(x.eC) : r.maxE;
    h += st(`Sai lệch lớn nhất (điểm ${j + 1})`, R`\Delta t=\frac{R_{\text{fit}}-R_{\text{Pt100}}}{S}`, R`\frac{${N(x.Rfit, 6)}-${N(x.ref, 6)}}{${N(S)}}`, N(x.eC, 4), "°C");
    h += verdict("max|Δt| + U ≤ MPE", R`\max|\Delta t|+U`, R`${N(mE, 4)}+${N(r.Uprint)}`, mE + r.Uprint, R`\frac{\text{acc}\,(\text{Max}-\text{Min})}{100}`, R`\frac{${In(I.acc)}\cdot(${PIn(I.max)}-${PIn(I.min)})}{100}`, r.lim, "°C", r.pass);
    return h;
  }

  /* ---------- TC ---------- */
  function TC(r) {
    const I = r.inp, V2 = r.fv === 2, S = r.S, kS = V2 ? 2 : (I.k || 2), n = 5, pt = r.pt, odd = [0, 2, 4, 6].filter(i => pt[i]), Nd = V2 ? odd.length : 8;
    let h = hd(`Cặp nhiệt loại ${esc(r.tcType)} · ITS-90`);
    h += V2 ? val("Độ nhạy (dE/dt nhỏ nhất trong các điểm đo)", R`S=\min\frac{dE}{dt}`, N(S), "mV/°C") : val("Độ nhạy (Ref!C37:C38)", "S", N(S), "mV/°C");
    h += hd("Thành phần chuẩn (°C)");
    const sS = odd.map(i => pt[i].sStd), sD = odd.map(i => pt[i].sDut);
    h += st("Độ lệch chuẩn gộp số đọc chuẩn (điểm 1, 3, 5, 7)", R`\bar s_{\text{chuẩn}}=\sqrt{\frac{\sum s_i^2}{${Nd}}}`, R`\sqrt{\frac{${sS.map(v => N(v) + "^2").join("+")}}{${Nd}}}`, N(r.Ultb), "°C");
    h += st("Lặp lại của chuẩn", R`u_{ch9}=\frac{\bar s_{\text{chuẩn}}}{\sqrt{n}}`, R`\frac{${N(r.Ultb)}}{\sqrt5}`, N(r.uch9), "°C");
    h += st("Bù đầu tự do (Cài đặt)", R`u_{ch7}=\frac{U_{CJ}}{2}`, R`\frac{${In(I.uCJ || 0)}}{${kS}}`, N(r.uch7), "°C");
    h += heat(`Lò nhiệt (${I.max <= 140 ? "Stand1" : "Stand2"})`, I.max <= 140 ? I.h1 : I.h2, r.uch8, "u_{ch8}");
    const sd = I.max >= 155 ? I.s2 : I.s1;
    h += st(`Chuẩn nhiệt (${I.max >= 155 ? "Stand2" : "Stand1"})`, R`u_{ch1}=\frac{U_{\text{chuẩn}}}{2}`, R`\frac{${In((sd && sd.unc) || 0)}}{${kS}}`, N(r.uch1), "°C");
    h += rss("Thành phần chuẩn", "u_{ch}", ["u_{ch9}", "u_{ch7}", "u_{ch8}", "u_{ch1}"], [r.uch9, r.uch7, r.uch8, r.uch1], r.uch, "°C");
    h += hd("Thành phần cặp nhiệt + milivôn kế (°C)");
    h += st("Độ lệch chuẩn gộp số đọc mV (điểm 1, 3, 5, 7)", R`\bar s_{\text{TB}}=\sqrt{\frac{\sum s_i^2}{${Nd}}}`, R`\sqrt{\frac{${sD.map(v => N(v) + "^2").join("+")}}{${Nd}}}`, N(r.UltbD), "mV");
    h += st("Lặp lại", R`u_{bk6}=\frac{\bar s_{\text{TB}}}{\sqrt{n}}`, R`\frac{${N(r.UltbD)}}{\sqrt5}`, N(r.ubk6));
    const E8 = pt[pt.length - 1].E;
    h += st("Milivôn kế (U % số đọc, tại điểm cuối)", R`u_{bk1}=\frac{U_{mV}\%\cdot E/100}{2\,S}`, R`\frac{${In((I.mv && I.mv.unc) || 0)}\cdot${N(E8)}/100}{${kS}\cdot${N(S)}}`, N(r.ubk1), "°C");
    h += st("Độ phân giải milivôn kế", R`u_{bk2}=\frac{0{,}5\cdot d_{mV}}{\sqrt3\,S}`, R`\frac{0{,}5\cdot${In(I.mvRes || 0.001)}}{\sqrt3\cdot${N(S)}}`, N(r.ubk2), "°C");
    const a = r.a, res2 = pt.reduce((s, p) => s + (p.V - (a[0] + a[1] * p.t + a[2] * p.t ** 2)) ** 2, 0);
    h += val("Hồi quy ΔE = a₀ + a₁t + a₂t² – tổng bình phương dư", R`\sum(\text{dư})^2`, N(res2), "mV²");
    if (V2) h += st("Độ khớp hồi quy", R`u_{bk7}=\frac{1}{S}\sqrt{\frac{\sum(\text{dư})^2}{N-3}}`, R`\frac{1}{${N(S)}}\sqrt{\frac{${N(res2)}}{${pt.length}-3}}`, N(r.ubk7), "°C");
    else h += st("Độ khớp hồi quy (như file Excel)", R`u_{bk7}=\sqrt{\frac{\sum(\text{dư})^2}{5\,S}}`, R`\sqrt{\frac{${N(res2)}}{5\cdot${N(S)}}}`, N(r.ubk7), "°C");
    h += st("Độ ổn định cặp nhiệt (0,1 % Max)", R`u_{bk8}=\frac{\text{Max}\cdot0{,}1}{100}`, R`\frac{${In(I.max)}\cdot0{,}1}{100}`, N(r.ubk8), "°C");
    h += rss("Thành phần thiết bị", R`u_{\text{TB}}`, ["u_{bk6}", "u_{bk1}", "u_{bk2}", "u_{bk7}", "u_{bk8}"], [r.ubk6, r.ubk1, r.ubk2, r.ubk7, r.ubk8], r.uDUT, "°C");
    h += hd("Tổng hợp");
    h += rss("Độ KĐBĐ tổng hợp", "u_c", ["u_{ch}", R`u_{\text{TB}}`], [r.uch, r.uDUT], r.uc, "°C");
    h += kStep(V2, [["u_{ch9}", r.uch9, odd.length * (n - 1)], ["u_{bk6}", r.ubk6, odd.length * (n - 1)], ["u_{bk7}", r.ubk7, pt.length - 3]], r.uc, r.nu, r.k);
    h += st("Độ KĐBĐ mở rộng", R`U=k\cdot u_c`, R`${N(r.k, 4)}\cdot${N(r.uc)}`, N(r.U), "°C");
    h += hd("Kết luận");
    const j = argmax(pt.map(p => Math.abs(p.dT))), p = pt[j], Uv = V2 ? Number(r.Utext) : r.U;
    h += st(`Sai lệch lớn nhất (điểm ${j + 1})`, R`\Delta E=\bar E_{\text{đo}}-E_{\text{ITS-90}}(\bar t)`, R`${N(p.E, 6)}-${N(p.Eref, 6)}`, N(p.dE, 4), "mV");
    h += val("Đổi ΔE ra °C (hàm ngược ITS-90)", R`\Delta t`, N(p.dT, 4), "°C");
    h += verdict("U + max|Δt| ≤ MPE", R`U+\max|\Delta t|`, R`${N(Uv)}+${N(r.maxErr, 4)}`, Uv + r.maxErr, R`\frac{\text{acc}\,(\text{Max}-\text{Min})}{100}`, R`\frac{${In(I.acc)}\cdot(${PIn(I.max)}-${PIn(I.min)})}{100}`, r.lim, "°C", r.pass);
    return h;
  }

  /* ---------- DPG / PDI ---------- */
  function DPG(r, unit) {
    const I = r.inp, V2 = r.fv === 2, span = I.max - I.min, s1 = I.stand1, X = I.std.concat(I.std);
    const K = devsq(X), L = sum2(X), M = X.length, Sx = X.reduce((s, v) => s + v, 0);
    const iU = argmax(r.rows.map(x => x.U)), row = r.rows[iU], m = r.rows.length;
    const cU = r.cols[iU], cD = r.cols[iU + m], cw = cU.uc >= cD.uc ? cU : cD, dirW = cw === cU ? "tăng" : "giảm";
    let h = hd(`Hồi quy y = a + b·x trên ${M} cặp (tăng + giảm)`);
    h += val("Hệ số hồi quy", R`a;\;b`, R`${N(r.a, 6)};\;${N(r.b, 6)}`);
    h += val("Sai số chuẩn của hồi quy (STEYX)", R`S_y`, N(r.Sy), unit);
    h += st("", R`S_a=S_y\sqrt{\frac{\sum x^2}{n\sum(x-\bar x)^2}}`, R`${N(r.Sy)}\sqrt{\frac{${N(L)}}{${M}\cdot${N(K)}}}`, N(r.Sa));
    h += st("", R`S_b=\frac{S_y}{\sqrt{\sum(x-\bar x)^2}}`, R`\frac{${N(r.Sy)}}{\sqrt{${N(K)}}}`, N(r.Sb));
    h += st("", R`r=-\frac{\sum x}{\sqrt{n\sum x^2}}`, R`-\frac{${N(Sx)}}{\sqrt{${M}\cdot${N(L)}}}`, N(r.r));
    h += hd(`Điểm có U lớn nhất: x = ${esc(String(row.x))} ${esc(unit)} (điểm ${iU + 1}) – chiều ${dirW}`);
    if (V2) h += st("Loại A từ hồi quy (% span)", R`u_A=\frac{100}{\text{span}}\sqrt{S_a^2+x^2S_b^2+2\,x\,S_aS_b\,r}`, R`\frac{100}{${N(span)}}\sqrt{${N(r.Sa)}^2+${PIn(cw.x)}^2\cdot${N(r.Sb)}^2+2\cdot${PIn(cw.x)}\cdot${N(r.Sa)}\cdot${N(r.Sb)}\cdot${P(r.r)}}`, N(cw.uA), "%");
    else h += st("Loại A từ hồi quy (như file Excel)", R`u_A=\sqrt{S_a^2+x^2S_b^2+2\,x\,S_aS_b\,r}`, R`\sqrt{${N(r.Sa)}^2+${PIn(cw.x)}^2\cdot${N(r.Sb)}^2+2\cdot${PIn(cw.x)}\cdot${N(r.Sa)}\cdot${N(r.Sb)}\cdot${P(r.r)}}`, N(cw.uA));
    if (s1.uncUnit === "%") h += val("U chuẩn áp suất (Stand1)", R`E_{12}`, N(r.E12), "%");
    else h += st("U chuẩn áp suất quy đổi", R`E_{12}=\frac{U_{\text{chuẩn}}}{\text{Max}_{\text{c}}-\text{Min}_{\text{c}}}\cdot100`, R`\frac{${In(r.E11)}}{${PIn(r.E10)}-${PIn(r.E9)}}\cdot100`, N(r.E12), "%");
    if (s1.deadweight) h += st("Chuẩn áp suất (quả cân)", R`u_s=\frac{E_{12}\,|x|}{2\cdot\text{span}}`, R`\frac{${N(r.E12)}\cdot${In(Math.abs(cw.x))}}{2\cdot${N(span)}}`, N(cw.us), "%");
    else if (V2) h += st("Chuẩn áp suất", R`u_s=\sqrt{\left(\frac{E_{12}(\text{Max}_{\text{c}}-\text{Min}_{\text{c}})}{2\,\text{span}}\right)^2+\left(\frac{E_{13}\,|x|}{\sqrt3\,\text{span}}\right)^2}`,
      R`\sqrt{\left(\frac{${N(r.E12)}\cdot${N(r.E10 - r.E9)}}{2\cdot${N(span)}}\right)^2+\left(\frac{${In(r.E13)}\cdot${In(Math.abs(cw.x))}}{\sqrt3\cdot${N(span)}}\right)^2}`, N(cw.us), "%");
    else h += st("Chuẩn áp suất", R`u_s=\frac{E_{12}(\text{Max}_{\text{c}}-\text{Min}_{\text{c}})+E_{13}\,|x|}{2\cdot\text{span}}`, R`\frac{${N(r.E12)}\cdot${N(r.E10 - r.E9)}+${In(r.E13)}\cdot${In(Math.abs(cw.x))}}{2\cdot${N(span)}}`, N(cw.us), "%");
    if (V2) h += st("Độ phân giải đồng hồ", R`u_v=\frac{d\cdot100/\text{span}}{2\sqrt3}`, R`\frac{${In(I.res || 0)}\cdot100/${N(span)}}{2\sqrt3}`, N(r.uv), "%");
    else h += st("Độ phân giải đồng hồ", R`u_v=\frac{d\cdot100/\text{span}}{2\sqrt6}`, R`\frac{${In(I.res || 0)}\cdot100/${N(span)}}{2\sqrt6}`, N(r.uv), "%");
    h += rss("Độ KĐBĐ tổng hợp", "u_c", ["u_A", "u_s", "u_v"], [cw.uA, cw.us, r.uv], cw.uc, "%");
    if (!V2) h += st("Trung bình hai chiều", R`\bar u_c=\frac{u_{c,\uparrow}+u_{c,\downarrow}}{2}`, R`\frac{${N(cU.uc)}+${N(cD.uc)}}{2}`, N(row.ucAvg), "%");
    h += kStep(V2, [["u_A", cw.uA, M - 2]], cw.uc, row.nu, row.k);
    h += st("Độ KĐBĐ mở rộng (% span)", V2 ? R`U\%=k\cdot u_c` : R`U\%=k\cdot\bar u_c`, R`${N(row.k, 4)}\cdot${N(row.ucAvg)}`, N(row.Upct), "%");
    h += st("Đổi ra đơn vị đồng hồ", R`U=U\%\cdot\frac{\text{span}}{100}`, R`${N(row.Upct)}\cdot\frac{${N(span)}}{100}`, N(row.Uu), unit);
    h += hd("Kết luận");
    const lim = R`\frac{\text{acc}\cdot\text{span}}{100}`, limS = R`\frac{${In(I.acc)}\cdot${N(span)}}{100}`;
    if (V2) {
      const d = r.rows.map(x => Math.max(Math.abs(x.cR), Math.abs(x.cF)) + uPub(x.Uu)), j = argmax(d), x = r.rows[j], sh = Math.max(Math.abs(x.cR), Math.abs(x.cF));
      h += verdict(`|SHC| + U ≤ MPE (điểm xấu nhất: ${j + 1})`, R`|\text{SHC}|+U`, R`${N(sh, 4)}+${N(uPub(x.Uu))}`, r.decRule, lim, limS, r.lim, unit, r.pass);
    } else h += verdict("U lớn nhất + max|SHC| ≤ MPE", R`U_{\max}+\max|\text{SHC}|`, R`${N(r.Umax)}+${N(r.maxSHC, 4)}`, r.Umax + r.maxSHC, lim, limS, r.lim, unit, r.pass);
    return h;
  }

  const F = { PT, PS, PG, TS, TT, TG, RTD, TC, DPG };
  function html(type, r, unit) {
    if (!r || !r.inp || !F[type]) return "";
    try { return `<div class="qcw"><div class="qleg"><span class="qin">■</span> số đã nhập / lấy từ chuẩn · <b>số đậm</b> = kết quả</div>${F[type](r, unit || "")}</div>`; }
    catch (e) { return `<div class="qcw"><p class="hint">Chưa dựng được bảng tính chi tiết: ${esc(e.message)}</p></div>`; }
  }
  // khung QC thu gọn (bấm để mở) – dùng cho cả 9 loại
  const panel = (type, r, unit) => { const b = html(type, r, unit); return b ? `<details class="qcd"><summary>Bảng tính chi tiết cho Quality Checker</summary>${b}</details>` : ""; };
  window.LabQC = { html, panel };
})();
