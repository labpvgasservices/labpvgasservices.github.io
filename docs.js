/* Builds the printable A4 pages as HTML, following the 2026 company templates:
 *   QTG  : QTG_PT_PT-1506A.docx (DVK.LAB.TM21.PL03), QTG_PS_PSHH-0522.docx (ĐLVN 133:2004.PL1)
 *   Cert : MailMerge_PT_Cert.docx, MailMerge_PS_Cert.docx (2 pages, as in the merged PT_DGCP_10-2026.docx)
 *   Uncer: sheets "DLVN112-2002_Rev2" / "DLVN133 - 2004" + hidden sheet "Kiểm tra" of PT/PS_DGCP_10_2026.xls
 */
(function () {
  "use strict";
  const C = window.LabCalc;
  const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const p2 = n => String(n).padStart(2, "0");
  function toDate(s) { if (!s) return null; const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); }
  const dVN = d => d ? `${p2(d.getDate())}-${p2(d.getMonth() + 1)}-${d.getFullYear()}` : "";
  const dEN = d => d ? `${p2(d.getDate())}-${MON[d.getMonth()]}-${String(d.getFullYear()).slice(2)}` : "";

  // Vietnamese number style used by the merged certificates: "5.000,00", "-0,018".
  function vn(v, d) {
    if (!isFinite(v)) return "";
    const s = C.xround(v, d).toFixed(d);
    const neg = s.startsWith("-") && Number(s) !== 0;
    const [i, f] = s.replace("-", "").split(".");
    return (neg ? "-" : "") + i.replace(/\B(?=(\d{3})+(?!\d))/g, ".") + (f ? "," + f : "");
  }
  // Publication rules 30/10/2026: PT "1.350,5" (comma, thousands dot), TT "1350,5" (comma), PS "1350.5" (dot)
  function nTxt(type, v, d) {
    if (type === "PT" || !["PS", "TT"].includes(type)) return vn(v, d);
    if (!isFinite(v)) return "";
    let s = C.xround(v, d).toFixed(d); if (Number(s) === 0) s = s.replace("-", "");
    return type === "TT" ? s.replace(".", ",") : s;
  }
  const uTxt = (type, u) => { const p = C.uPub(u); return nTxt(type, p.v, p.d); };
  // Bản công thức đã sửa 06/11/2026 (res.fv = 2, mục B3): mọi bộ in U 2 chữ số có nghĩa, làm tròn lên. Hồ sơ cũ giữ cách in cũ (legacy).
  const uV = (res, U, legacy) => res && res.fv === 2 ? uTxt(res.type, U) : legacy;
  const FV = { 1: "Excel 2026 (bản cũ)", 2: "Đã sửa 06/11/2026" };
  // Các điểm của báo cáo rà soát Uncer 01/11/2026 mà bản sửa áp dụng cho từng bộ
  const FVCH = {
    PT: ["B1 quy tắc |SHC|·span/16 + U ≤ MPE, xét từng điểm", "B2 k = t95,45(ν_eff)", "B4 U lấy chiều lớn hơn (không trung bình)", "B6 %Rdg chuẩn chia √3, cộng RSS"],
    PS: ["B2 k = t95,45(ν_eff)", "B6 %Rdg chuẩn chia √3, cộng RSS"],
    PG: ["A10 app vốn dùng đúng cột Rising – không đổi"],
    TS: ["B1 |sai số| + U ≤ MPE", "B2 k = t95,45(ν_eff)", "B3 U 2 CSCN làm tròn lên", "B4 thêm độ phân giải nhiệt kế chuẩn"],
    TT: ["A9 + B1 SHC quy về °C (×span/16), |sai số| + U dải ≤ MPE", "B2 k = t95,45(ν_eff)", "B8 ranh giới dải ≤ 400 cho mọi điểm"],
    TG: ["B1 |sai số| (2 chiều) + U dải ≤ MPE", "B2 k = t95,45(ν_eff)", "B3 U 2 CSCN làm tròn lên"],
    RTD: ["A1 u_DUT6 = √[Σdư²/(n − p)] / S", "A2 O33 lấy căn", "B2 k = t95,45(ν_eff)", "B3 U 2 CSCN làm tròn lên"],
    TC: ["A3 u_bk7 = √[Σdư²/(N − 3)] / S", "A4 U_ltb chia 4", "A5 STDEV chỉ 5 lần đọc", "A6 hồi quy theo hàm chuẩn đúng loại", "A7 đủ hệ số C1 dải âm", "B2 k = t95,45(ν_eff)", "B3 U 2 CSCN làm tròn lên", "B7 S = dE/dt nhỏ nhất tại các điểm đo"],
    DPG: ["A8 u_A quy về % span", "B1 |SHC| + U ≤ MPE, xét từng điểm", "B2 k = t95,45(ν_eff)", "B3 U 2 CSCN làm tròn lên", "B4 U lấy chiều lớn hơn", "B5 độ phân giải chia √3", "B6 %Rdg chuẩn chia √3, cộng RSS"]
  };
  const nuTxt = v => isFinite(v) ? (v > 999 ? ">999" : Number(v).toFixed(1)) : "∞";
  function fvBox(type, res) {
    if (!res || res.fv !== 2) return `<div class="unote">Phiên bản công thức: <b>${FV[1]}</b> – tính giống hệt file Excel của anh Khai.</div>`;
    const nus = [];
    if (res.nu !== undefined) nus.push(nuTxt(res.nu));
    (res.rows || []).forEach(r => { if (r.nu !== undefined && isFinite(r.nu)) nus.push(nuTxt(r.nu)); });
    if (res.R) Object.values(res.R).forEach(r => { if (r.cnt) nus.push(nuTxt(r.nu)); });
    return `<div class="unote">Phiên bản công thức: <b>${FV[2]}</b> (rà soát Uncer 01/11/2026). Áp dụng: ${(FVCH[type] || []).join("; ")}.
      ${type === "PG" ? "" : `ν<sub>eff</sub> = ${nus.length ? nus.join(" / ") : "∞"} → k = ${Number(res.k || 2).toFixed(2)}.`}
      ${res.decRule != null ? ` Giá trị so với MPE: ${g(res.decRule, 6)}.` : ""} Quy tắc quyết định chung: |sai số| + U ≤ MPE (NGOC chọn 06/11/2026).
      Bản này chưa có biên bản xác nhận bảng tính (ISO/IEC 17025 mục 7.11.2).</div>`;
  }
  const dot = s => String(s == null ? "" : s).replace(/(\d),(\d)/g, "$1.$2");
  const vnTxt = s => String(s == null ? "" : s).replace(/(\d)\.(\d)/g, "$1,$2");   // "0.0001 bar" -> "0,0001 bar"
  const num = v => (v === "" || v == null) ? NaN : Number(String(v).replace(",", "."));
  function decimalsOf(arr) { let d = 0; arr.forEach(v => { const s = String(v == null ? "" : v).replace(",", "."); const i = s.indexOf("."); if (i >= 0) d = Math.max(d, s.length - i - 1); }); return d; }
  const pDec = arr => Math.min(3, Math.max(2, decimalsOf(arr)));
  const g = (v, d = 6) => isFinite(v) ? Number(v.toPrecision(d)).toString() : "—";
  // NGOC 06/11/2026: bảng kết quả theo điểm của trang Uncer (cả 9 loại) in tối thiểu 2 chữ số thập phân (VD 62.5 → 62.50, 0 → 0.00);
  // số thật sự có nhiều số lẻ hơn thì giữ đủ (tối đa 6), không làm mất số đọc.
  const f2 = v => { v = Number(v); if (!isFinite(v)) return "—"; const x = Number(v.toPrecision(12)); const d = Math.max(2, Math.min(6, (String(x).split(".")[1] || "").length)); return x.toFixed(d); };
  const g2 = (v, d = 6) => isFinite(v) ? f2(Number(Number(v).toPrecision(d))) : "—";
  const cb = on => `<span class="cb${on ? " on" : ""}"></span>`;
  const it = s => `<i>${s}</i>`;

  function locOf(info) { return info.loc || {}; }
  function standTxt(s) {
    if (!s) return { name: "", model: "", serial: "", maker: "", range: "", unc: "", trace: "", acc: "" };
    const max = s.kind === "e" && s.certRange ? s.certRange : s.max;
    const unc = s.uncText || `${s.unc} ${s.uncUnit}`;
    return { name: s.name, model: s.model, serial: s.serial, maker: s.maker, range: `(${vn(s.min, decimalsOf([s.min]))}÷${vn(max, decimalsOf([max]))}) ${s.unit}`, unc: vnTxt(unc), uncRaw: unc, trace: s.trace, acc: s.accuracy || "" };
  }
  // QTG shows "Fluke 754" when the model is only a number
  const qModel = s => !s ? "" : (/^\d+$/.test(String(s.model)) ? `${s.maker} ${s.model}` : s.model);
  const qRange = s => !s ? "" : `(${s.min}÷${s.kind === "e" && s.certRange ? s.certRange : s.max}) ${s.unit}`;
  const accTxt = (h, PT) => PT ? `±${vnTxt(h.acc)}%FS` : `±${dot(h.acc)}%.Pset`;

  const draft = info => info.draft ? `<div class="draft">BẢN NHÁP – ${esc(info.draft)}</div>` : "";
  const wmImg = `<img class="wmimg" src="assets/wm.jpg" alt="">`;

  /* ================= CERTIFICATE ================= */
  // variant "lab" (RTD / TS 2026 certificates): company + lab name lines instead of the corporation line
  function certHeader(st, variant) {
    const L = st.certLines;
    const t = variant === "lab"
      ? `<div>${esc(L[1])} <span class="red b">${esc(st.companyTag)}</span></div><div class="i">${esc(L[2])}</div><div class="b">${esc(st.labName)}</div><div class="b i">${esc(st.labNameEN || "")}</div><div class="i">${esc(L[3])}</div><div class="i">${esc(L[4])}</div>`
      : `<div>${esc(L[0])}</div><div class="b">${esc(L[1])} <span class="red">${esc(st.companyTag)}</span></div><div class="i">${esc(L[2])}</div><div class="i">${esc(L[3])}</div><div class="i">${esc(L[4])}</div>`;
    return `<div class="chdr${variant === "lab" ? " lab" : ""}">${st.showLogo ? `<img src="assets/logo2026.jpg" alt="">` : `<span class="nologo"></span>`}<div class="t">${t}</div></div><div class="crule"></div>`;
  }
  const certFooter = (st, i, n) => `<table class="cftr"><tr><td class="pg"><b>Trang: ${i}/${n}</b><br><i>(No of paper)</i></td>
    <td><b>${esc(st.footerVN)}</b><br><i>${esc(st.footerEN)}</i></td></tr></table>`;

  function certPage1(rec, res, st, info) {
    const h = rec.h, PT = rec.type === "PT", L = locOf(info);
    const cal = toDate(h.calDate), due = C.eomonth(cal, Number(st.dueMonths) || 12), iss = toDate(h.issueDate) || cal;
    const s1 = standTxt(info.stand1), s2 = PT ? standTxt(info.stand2) : null;
    const row = (a, b) => `<tr><td>${a}</td><td>${b}</td></tr>`;
    let top;
    if (PT) {
      top = row(`Tên phương tiện đo ${it("(Dut)")}:`, `Thiết bị chuyển đổi áp suất ${it(`(${esc(h.description)})`)}`)
        + row(`Kiểu ${it("(Type)")}: ${esc(h.model)}`, `Số ${it("(Serial)")}/Mã QL ${it("(Tag)")}:<br>${esc(h.serial)}/${esc(h.tag)}`)
        + row(`Nơi sản xuất ${it("(Manufacturer)")}:`, esc(h.maker))
        + row(`Đặc trưng kỹ thuật đo lường<br>${it("(Specification)")}:`, `Phạm vi đo ${it("(Range)")}: (${vnTxt(h.min)}÷${vnTxt(h.max)}) ${esc(h.unit)}<br>Độ chính xác ${it("(Accuracy)")}: ${accTxt(h, true)}`);
    } else {
      top = row(`Tên đối tượng ${it("(Dut)")}:`, `Thiết bị đặt mức áp suất ${it(`(${esc(h.description)})`)}`)
        + row(`Kiểu ${it("(Type)")}: ${esc(h.model)}`, `Mã QL ${it("(Tag No)")}: ${esc(h.tag)}<br>Số hiệu ${it("(Serial No.)")}: ${esc(h.serial)}`)
        + row(`Nơi sản xuất ${it("(Manufacturer)")}:`, esc(h.maker))
        + row(`Đặc trưng kỹ thuật đo lường (${it("Specification")}):`, `Dải làm việc ${it("(Calib Range)")}: (${esc(dot(h.min))} ÷ ${esc(dot(h.max))}) ${esc(h.unit)}<br>Áp suất đặt ${it("(Set point)")}: ${esc(dot(h.pset))} ${esc(h.unitPset)}<br>Độ chính xác ${it("(Accuracy)")}: ${accTxt(h, false)}`);
    }
    top += row(`Cơ sở sử dụng ${it("(Customer)")}:`, esc(L.custVN))
      + row(`Địa điểm lắp đặt ${it("(Location)")}:`, esc(L.locVN))
      + row(`Phương pháp thực hiện<br>${it("(Method of calibration)")}:`, esc(h.procedure))
      + (PT ? row("", `Điều kiện môi trường ${it("(Environment)")}:<br>${envHtml(h.env)}`) : row(`Điều kiện môi trường ${it("(Environment)")}:`, envHtml(h.env)));
    const sRow = (lab, en, k) => `<tr><td class="ind">${lab} ${it(`(${en})`)}:</td><td>${esc(s1[k])}</td>${PT ? `<td>${esc(s2[k])}</td>` : ""}</tr>`;
    const stdT = `<table class="ckv std${PT ? "" : " one"}">
      ${sRow("Tên thiết bị", "Device Name", "name")}${sRow("Kiểu", "Model", "model")}${sRow("Số hiệu", "Serial No.", "serial")}
      ${sRow("Nơi sản xuất", "Manufacturer", "maker")}${sRow("Phạm vi đo", "Range", "range")}${sRow("Độ KĐBĐ", "Uncertainty", "unc")}${sRow("Dẫn xuất chuẩn", "Traceability", "trace")}</table>`;
    const day = st.issueDayBlank ? "...." : p2(iss.getDate());
    return `<section class="a4 cert">${wmImg}<div class="frame"></div>${draft(info)}${certHeader(st)}
      <h1>GIẤY CHỨNG NHẬN HIỆU CHUẨN</h1><div class="sub"><b><i>(Calibration Certificate)</i></b></div>
      <div class="no">Số ${it("(N<sup>o</sup>)")}: ${esc(rec.certNo)}</div>
      <table class="ckv">${top}<tr><td colspan="2">Chuẩn được sử dụng ${it("(Standards used)")}:</td></tr></table>
      ${stdT}
      <table class="ckv">
        ${row(`Kết quả ${it("(Result)")}:`, `Xem kết quả hiệu chuẩn tại trang sau.<br><span class="sm">${it("(The result of the calibration on the next page)")}</span>`)}
        ${row(`Ngày hiệu chuẩn lại đề nghị<br>${it("(Recalibration recommended)")}:`, `${dVN(due)} ${it(`(${dEN(due)})`)}`)}
      </table>
      <div class="issue">${it(`${esc(st.place)}, ngày ${day} tháng ${p2(iss.getMonth() + 1)} năm ${iss.getFullYear()}`)}<br>${it("(Date of issue)")}</div>
      <table class="csig"><tr><td><b>${esc(st.sig1Title)}</b><br>${it(esc(st.sig1TitleEn))}</td><td><b>${esc(st.sig2Title)}</b><br>${it(esc(st.sig2TitleEn))}</td></tr>
        <tr class="sp"><td>${st.showAccred ? `<img class="accr" src="assets/vilas.jpg" alt="">` : ""}</td><td></td></tr>
        <tr><td><b>${esc(st.sig1Name)}</b></td><td><b>${esc(st.sig2Name)}</b></td></tr></table>
      ${certFooter(st, 1, 2)}</section>`;
  }
  function envHtml(env) { return esc(env).replace(/\((Temp|Humidity)\)/g, "<i>($1)</i>"); }

  function certPage2(rec, res, st, info) {
    const h = rec.h, PT = rec.type === "PT", cal = toDate(h.calDate);
    let table, mid;
    if (PT) {
      // decimals per reading set (M = 3); corrections follow their reading set; U = 2 significant figures rounded up
      const pd = C.pubDec(rec.pt.points, 3), dR = C.pubDec(res.rows.map(r => r.rise), 3), dF = C.pubDec(res.rows.map(r => r.fall), 3), u = esc(h.unit);
      const rows = res.rows.map((r, i) => `<tr><td>${p2(i + 1)}</td><td>${vn(r.x, pd)}</td><td>${vn(r.ideal, 3)}</td><td>${vn(r.rise, dR)}</td><td>${vn(r.fall, dF)}</td><td>${vn(r.shcR, dR)}</td><td>${vn(r.shcF, dF)}</td><td>${uTxt("PT", r.U)}</td></tr>`).join("");
      table = `<table class="res cres"><thead>
        <tr><th rowspan="2">TT<br>${it("(N<sup>o</sup>)")}</th><th rowspan="2">Áp suất đặt<br>${it("(Input Pressure)")}<br>${u}</th><th rowspan="2">Tín hiệu điện quy đổi<br>${it("(Ideal Output Current)")}<br>mA</th>
        <th colspan="2">Giá trị dòng trên thiết bị<br>${it("(Measured Output Current)")}<br>mA</th><th colspan="2">Số hiệu chính<br>${it("(Correction)")}<br>mA</th><th rowspan="2">Độ KĐBĐ<br>${it("(Uncertainty)")}<br>${u}</th></tr>
        <tr><th>Tăng<br>${it("(Increasing)")}</th><th>Giảm<br>${it("(Decreasing)")}</th><th>Tăng<br>${it("(Increasing)")}</th><th>Giảm<br>${it("(Decreasing)")}</th></tr></thead><tbody>${rows}</tbody></table>`;
      mid = `<p><u>Công thức hiệu chuẩn</u> ${it("<u>(Calibration equation)</u>")}: y = ${vn(res.a, 3)} + ${vn(res.b, 3)} x</p>
        <ul class="dash"><li>x: giá trị áp suất chỉ thị trên phương tiện chuẩn.<br>${it("(x: Value of Input pressure from standard device)")}</li>
        <li>y: giá trị tín hiệu điện chỉ trên phương tiện cần hiệu chuẩn.<br>${it("(y:Value of Measured output current from transmitter)")}</li></ul>
        <p>Độ không đảm bảo đo mở rộng lớn nhất được tính ứng với độ tin cậy 95%, hệ số phủ k=2:<br>${it("(The maximum expanded uncertainty is based upon a standard uncertainty multiplied by a coverage factor k = 2, providing a level of confidence of approximate 95%):")}</p>
        <p class="c">U<sub>exp-max</sub> = ${uTxt("PT", res.Umax)} ${u}</p>`;
    } else {
      // PS: dot decimal, decimals per reading set (M = 2), deviations follow their set
      const dS = C.pubDec(res.set, 2), dR = C.pubDec(res.reset, 2), u = esc(h.unitPset), U = res.Utext.text, ps = (v, d) => nTxt("PS", v, d);
      const rows = res.set.map((v, i) => `<tr><td>${p2(i + 1)}</td>${i === 0 ? `<td rowspan="5">${esc(dot(h.pset))}</td>` : ""}<td>${ps(v, dS)}</td><td>${ps(res.reset[i], dR)}</td><td>${ps(res.setDev[i], dS)}</td><td>${ps(res.resetDev[i], dR)}</td>${i === 0 ? `<td rowspan="5">${U}</td>` : ""}</tr>`).join("");
      table = `<table class="res cres"><thead><tr><th rowspan="2">TT<br>${it("(N<sup>o</sup>)")}</th><th rowspan="2">Áp suất đặt ${it("(Pset)")}<br>${u}</th><th rowspan="2">Áp suất tác động<br>${it("(Set-Pressure)")}<br>${u}</th><th rowspan="2">Áp suất trả về<br>${it("(Reset-Pressure)")}<br>${u}</th>
        <th colspan="2">Áp suất chênh lệch</th><th rowspan="2">Độ KĐBĐ<br>${it("(Uncertainty)")}<br>${u}</th></tr>
        <tr><th>${it("Set-deviation")}<br>${u}</th><th>${it("Reset-deviation")}<br>${u}</th></tr></thead><tbody>${rows}</tbody></table>`;
      mid = `<p>Độ không đảm bảo đo mở rộng được tính ứng với độ tin cậy 95%, hệ số phủ k=2:<br>${it("(The reported expanded uncertainty is based upon a standard uncertainty multiplied by a coverage factor k = 2, providing a level of confidence of approximate 95%):")}</p>
        <p class="c">Giá trị cài đặt ${it("(Set point)")}: ${esc(dot(h.pset))} ${u}, U = ${U} ${u}</p>`;
    }
    const pf = res.pass ? "Đạt (Pass)" : "Không đạt (Fail)";
    const en = res.pass ? "(The calibration result meets the accuracy requirement)." : "(The calibration result does not meet the accuracy requirement).";
    return `<section class="a4 cert">${wmImg}<div class="frame"></div>${draft(info)}
      <h1 class="r">KẾT QUẢ HIỆU CHUẨN</h1><div class="sub"><b><i>(Calibration Result)</i></b></div>
      <div class="c"><b>Kèm theo giấy chứng nhận hiệu chuẩn số</b> ${it("(Attached to certificate No)")}: ${esc(rec.certNo)}</div>
      <div class="tagline"><span>Tagname: <b>${esc(h.tag)}</b></span><span>Ngày hiệu chuẩn ${it("(Calibration Date)")}: ${dVN(cal)} ${it(`(${dEN(cal)})`)}</span></div>
      ${table}
      <div class="box">${mid}
        <p>Các thông tin khác ${it("(Other information)")}:</p>
        <ul class="dash"><li>Phương tiện đo này không sử dụng để định lượng hàng hóa, dịch vụ trong mua bán, thanh toán, đảm bảo an toàn, bảo vệ sức khỏe cộng đồng, bảo vệ môi trường, trong thanh tra, kiểm tra, giám định tư pháp và trong các hoạt động công vụ khác.<br>${it("(This equipment is not used to quantify goods and services in purchase and sale, payment, safety assurance, community health protection, environmental protection, inspection, examination, judicial expertise and in other official activities)")}</li>
        <li>Phương tiện đo này không được sử dụng trực tiếp để kiểm định phương tiện đo nhóm 2.<br>${it("(This equipment is not used directly to verify the measuring instrument of group 2)")}</li></ul></div>
      <div class="box c"><span class="l"><u>Ghi chú</u> ${it("<u>(Note)</u>")}: Kết quả hiệu chuẩn trên là <b>${pf}</b> với yêu cầu về độ chính xác của thiết bị</span>${it(en)}</div>
      <table class="csig two"><tr><td><b>Người kiểm tra</b><br>${it("(Checked by)")}</td><td><b>Người thực hiện</b><br>${it("(Calibrated by)")}</td></tr>
        <tr class="sp"><td></td><td></td></tr><tr><td><b>${esc(rec.sig.controller)}</b></td><td><b>${esc(rec.sig.inspector)}</b></td></tr></table>
      ${certFooter(st, 2, 2)}</section>`;
  }

  /* ================= QTG – BIÊN BẢN HIỆU CHUẨN ================= */
  function qtgHeader(st, PT) {
    const logo = st.showLogo ? `<img src="assets/logo2026.jpg" alt="">` : `<span class="nologo"></span>`;
    const lines = PT
      ? `<div>${esc(st.certLines[1])} <span class="red">${esc(st.companyTag)}</span></div><div class="b u">${esc(st.labName)}</div><div>${esc(st.addrEN)}</div><div>${st.tel}</div>`
      : `<div>${esc(st.certLines[0])}</div><div class="b">${esc(st.certLines[1])} <span class="red">${esc(st.companyTag)}</span></div><div>${esc(st.addrVN)}</div><div>${esc(st.addrEN)}</div><div>${st.tel}</div>`;
    return `<div class="qhdr">${logo}<div class="t">${lines}</div></div>`;
  }
  function qtgSig(rec) {
    return `<table class="qsig"><tr><td><b>Người soát lại</b><br>${it("(Checked by)")}</td><td><b>Người thực hiện</b><br>${it("(Calibrated by)")}</td></tr>
      <tr class="sp"><td></td><td></td></tr><tr><td><b>${esc(rec.sig.controller)}</b></td><td><b>${esc(rec.sig.inspector)}</b></td></tr></table>`;
  }
  function qtgPage(rec, res, st, info) {
    const h = rec.h, PT = rec.type === "PT", cal = toDate(h.calDate), L = locOf(info);
    const S = PT ? st.PT : st.PS, s1 = info.stand1, s2 = info.stand2;
    const bb = rec.certNo ? `${S.bbPrefix}.${rec.certNo.split(".").slice(-2).join(".")}` : "";
    const asF = h.psType === "As Found", asL = h.psType === "As Left";
    let tbl, data;
    if (PT) {
      const stds = [s1, s2].filter(Boolean);
      const j = f => stds.map(f).join("; ");
      tbl = `<table class="dot q3"><colgroup><col style="width:15%"><col style="width:38%"><col style="width:47%"></colgroup>
        <tr><td colspan="3">Tên phương tiện đo ${it("(Dut)")}: Thiết bị chuyển đổi áp suất ${it(`(${esc(h.description)})`)}</td></tr>
        <tr><td colspan="2">Kiểu ${it("(Type)")}: ${it(esc(h.model))}</td><td>Tên ${it("(Tagname)")}: ${it(esc(h.tag))}</td></tr>
        <tr><td colspan="2">Cơ sở sản xuất ${it("(Manufacturer)")}: ${it(esc(h.maker))}</td><td>Số ${it("(Serial No.)")}: ${it(esc(h.serial))}</td></tr>
        <tr><td colspan="2">Đặc trưng kỹ thuật ${it("(Specification)")}</td><td>Phạm vi đo ${it("(Range)")}: (${it(`${esc(h.min)}÷${esc(h.max)}`)})${esc(h.unit)}</td></tr>
        <tr><td colspan="2"></td><td>Độ chính xác ${it("(Accuracy)")}: ${it(`±${esc(h.acc)}%FS`)}</td></tr>
        <tr><td colspan="3">Cơ sở sử dụng ${it("(Customer)")}: ${it(esc(L.custVN))}</td></tr>
        <tr><td colspan="2">Phương pháp thực hiện ${it("(Method)")}:</td><td>${esc(h.procedure)}</td></tr>
        <tr><td colspan="3">Chuẩn, thiết bị chính sử dụng ${it("(Standard set)")}: ${it(esc(s1 ? s1.name : ""))}</td></tr>
        <tr><td></td><td colspan="2">Kiểu ${it("(Model)")}: ${it(esc(j(qModel)))}</td></tr>
        <tr><td></td><td colspan="2">Số hiệu ${it("(Serial No.)")}: ${it(esc(j(s => s.serial)))}</td></tr>
        <tr><td></td><td colspan="2">Phạm vi đo ${it("(Range)")}: ${it(esc(j(qRange)))}</td></tr>
        <tr><td></td><td colspan="2">Độ chính xác ${it("(Accuracy)")}: ${esc(j(s => s.uncText || `${s.unc} ${s.uncUnit}`))}</td></tr>
        <tr><td colspan="2">Điều kiện môi trường ${it("(Environment)")}:</td><td></td></tr>
        <tr><td colspan="2" class="c">${cb(h.envOk)} &nbsp; Nhiệt độ ${it("(Ambient Temp.)")}: ${esc(S.qtgTemp)}</td><td class="c">${cb(h.envOk)} &nbsp; Độ ẩm ${it("(Humidity)")}: ${esc(S.qtgHum)}</td></tr>
        <tr><td colspan="3">Ngày thực hiện ${it("(Calib. Date)")}: ${dVN(cal)}</td></tr>
        <tr><td colspan="2">Số liệu và kết quả ${it("(Result)")}:</td><td class="sp2">${cb(asF)} &nbsp; AsFound <span class="gap"></span> ${cb(asL)} &nbsp; AsLeft</td></tr></table>`;
      const pd = pDec(rec.pt.points);
      data = `<table class="res qres"><thead>
        <tr><th rowspan="2">TT<br>${it("(N<sup>o</sup>)")}</th><th rowspan="2">Áp chuẩn<br>${it("(Standard Input Pressure)")}<br><br>${esc(h.unit)}</th><th rowspan="2">Tín hiệu điện quy đổi<br>${it("(Ideal Output Current)")}<br>mA</th>
          <th colspan="2">Giá trị dòng trên thiết bị<br>${it("(Measured Output Current)")}<br>mA</th><th colspan="2">Số hiệu chính<br>${it("(Correction)")}<br>mA</th></tr>
        <tr><th>Tăng<br>${it("(Increasing)")}</th><th>Giảm<br>${it("(Decreasing)")}</th><th>Tăng<br>${it("(Increasing)")}</th><th>Giảm<br>${it("(Decreasing)")}</th></tr></thead><tbody>
        ${res.rows.map((r, i) => `<tr><td>${p2(i + 1)}</td><td>${vn(r.x, pd)}</td><td>${vn(r.ideal, 3)}</td><td>${vn(r.rise, 3)}</td><td>${vn(r.fall, 3)}</td><td>${vn(r.shcR, 3)}</td><td>${vn(r.shcF, 3)}</td></tr>`).join("")}</tbody></table>`;
    } else {
      const rising = h.dirQTG !== "Falling";
      const mpe = num(h.acc) * num(h.pset) / 100;
      tbl = `<table class="dot q4"><colgroup><col style="width:11%"><col style="width:42%"><col style="width:13%"><col style="width:34%"></colgroup>
        <tr><td colspan="4">Tên đối tượng ${it("(Dut)")}: Thiết bị đặt mức áp suất ${it(`(${esc(h.description)})`)}</td></tr>
        <tr><td colspan="2">Kiểu ${it("(Type)")}: ${it(esc(h.model))}</td><td colspan="2">Số ${it("(Tag No)")}: &nbsp;${it(esc(h.tag))}<br>Số hiệu ${it("(Serial No.)")}: ${it(esc(h.serial))}</td></tr>
        <tr><td colspan="2">Cơ sở sản xuất ${it("(Manufacturer)")}: ${it(esc(h.maker))}</td><td colspan="2">Năm SX ${it("(Manufacture Year)")}: ${it(esc(h.mfgYear || "N/A"))}</td></tr>
        <tr><td colspan="2">Đặc trưng kỹ thuật ${it("(Specification)")}</td><td colspan="2"></td></tr>
        <tr><td></td><td>Áp suất đặt ${it("(Set point)")}: ${esc(h.pset)} ${esc(h.unitPset)}</td><td colspan="2">Dải làm việc ${it("(Calib Range)")}: ${it(`(${esc(h.min)}÷${esc(h.max)}) ${esc(h.unit)}`)}</td></tr>
        <tr><td></td><td>Độ chính xác ${it("(Accuracy)")}: ${it(`±${esc(h.acc)}%.Pset`)}</td><td colspan="2">Sai số cho phép ${it("(MPE)")}: ${it(`${isFinite(mpe) ? g(mpe, 6) : ""} ${esc(h.unitPset)}`)}</td></tr>
        <tr><td></td><td>Chế độ làm việc ${it("(Operating mode)")}:</td><td colspan="2">${cb(h.micro === "NO")} Thường mở ${it("(NO)")} <span class="gap"></span> ${cb(h.micro === "NC")} Thường đóng ${it("(NC)")}</td></tr>
        <tr><td></td><td></td><td colspan="2">${cb(rising)} Chiều tăng ${it("(Rising)")} <span class="gap"></span> ${cb(!rising)} Chiều giảm ${it("(Falling)")}</td></tr>
        <tr><td colspan="4">Cơ sở sử dụng ${it("(Customer)")}: ${esc(L.custVN)}</td></tr>
        <tr><td colspan="2">Phương pháp thực hiện ${it("(Method)")}:</td><td colspan="2">${esc(h.procedure)}</td></tr>
        <tr><td colspan="2">Chuẩn, thiết bị chính sử dụng ${it("(Standard set)")}:</td><td colspan="2">${it(esc(s1 ? s1.name : ""))}</td></tr>
        <tr><td></td><td colspan="2">Kiểu ${it("(Model)")}: ${it(esc(qModel(s1)))}</td><td>Độ chính xác ${it("(Accuracy)")}: ${it(esc(s1 ? s1.accuracy : ""))}</td></tr>
        <tr><td></td><td colspan="2">Số hiệu ${it("(Serial No.)")}: ${it(esc(s1 ? s1.serial : ""))}</td><td>Phạm vi đo ${it("(Range)")}: ${it(esc(qRange(s1)))}</td></tr>
        <tr><td colspan="4">Điều kiện môi trường ${it("(Environment)")}:</td></tr>
        <tr><td></td><td class="c">${cb(h.envOk)} Nhiệt độ ${it("(Ambient Temp.)")}: ${esc(S.qtgTemp)}</td><td colspan="2" class="c">${cb(h.envOk)} Độ ẩm ${it("(Humidity)")}: ${esc(S.qtgHum)}</td></tr>
        <tr><td colspan="4">Người thực hiện ${it("(Calibrated by)")}: ${it(esc(rec.sig.inspector))}</td></tr>
        <tr><td colspan="4">Ngày thực hiện ${it("(Calib. Date)")}: ${dVN(cal)}</td></tr>
        <tr><td colspan="4">Địa điểm thực hiện ${it("(Location)")}: ${it(esc(L.locVN || L.code))}</td></tr>
        <tr><td colspan="4" class="c"><b>KẾT QUẢ HIỆU CHUẨN ${it("(RESULT)")}:</b></td></tr></table>`;
      const pd = pDec([h.pset, ...rec.ps.set, ...rec.ps.reset]);
      data = `<table class="res qres ps"><thead>
        <tr><th rowspan="2">TT<br>${it("(N<sup>o</sup>)")}</th><th rowspan="2">Áp suất đặt<br>${it("(P<sub>set</sub>)")}<br><br>${esc(h.unitPset)}</th><th colspan="2">Áp suất hiển thị trên thiết bị chuẩn<br>${it("(Standard Pressure)")}</th><th rowspan="2">Chênh tác động<br>${it("(Set-deviation)")}</th><th rowspan="2">Chênh trả lại<br>${it("(Reset-deviation)")}</th></tr>
        <tr><th>Áp suất tác động<br>${it("(Set-Pressure)")}</th><th>Áp suất trả về<br>${it("(Reset-Pressure)")}</th></tr></thead><tbody>
        ${rec.ps.set.map((v, i) => { const sv = num(v), rv = num(rec.ps.reset[i]), ps = num(h.pset); return `<tr><td>${p2(i + 1)}</td>${i === 0 ? `<td rowspan="5">${esc(h.pset)}</td>` : ""}<td>${vn(sv, pd)}</td><td>${vn(rv, pd)}</td><td>${vn(ps - sv, pd)}</td><td>${vn(ps - rv, pd)}</td></tr>`; }).join("")}</tbody></table>`;
    }
    return `<section class="a4 qtg">${wmImg}${draft(info)}${qtgHeader(st, PT)}
      <h1 class="q">BIÊN BẢN HIỆU CHUẨN</h1><div class="sub"><b><i>(Calibration Report)</i></b></div>
      <div class="no">Số ${it("(N<sup>o</sup>)")}: ${esc(bb)}</div>
      <div class="formcode">${it(esc(S.qtgForm))}</div>
      ${tbl}${data}
      ${h.note ? `<div class="qnote">Ghi chú: ${esc(h.note)}</div>` : ""}
      ${qtgSig(rec)}</section>`;
  }

  /* ================= UNCERTAINTY SHEET (for the Quality Checker) ================= */
  function uncPage(rec, res, st, info) {
    const h = rec.h, PT = rec.type === "PT";
    const S = PT ? st.PT : st.PS;
    const r3 = (ref, lab, val, unit = "") => {
      const mono = /^[-+]?[\d.]+(e[-+]?\d+)?$|^\d+ \/ [\d.]+( \/ [\d.]+)?$/i.test(String(val).replace(/<[^>]+>/g, ""));
      return `<tr><td class="ref">${ref}</td><td>${lab}</td>${unit ? `<td class="${mono ? "num" : "txt"}">${val}</td><td>${unit}</td>` : `<td class="${mono ? "num" : "txt"}" colspan="2">${val}</td>`}</tr>`;
    };
    let body;
    if (PT) {
      const s1 = info.stand1, s2 = info.stand2, c = res.cols, n = c.length / 2;
      const inp = `<div class="ucols"><table class="ukv">
          ${r3("E5", "Thiết bị được hiệu chuẩn (DUT), output 4–20 mA", esc(h.description))}
          ${r3("E6", "Phạm vi đo (Min range)", esc(h.min), esc(h.unit))}${r3("E7", "Phạm vi đo (Max range)", esc(h.max), esc(h.unit))}
          ${r3("E8", "Thiết bị áp suất chuẩn (Stand1)", esc(s1.key))}
          ${r3("E9", "Stand1 Min range (đổi đơn vị ×" + g(res.factor1, 8) + ")", g(res.E9), esc(h.unit))}
          ${r3("E10", "Stand1 Full Scale", g(res.E10), esc(h.unit))}${r3("E11", "ĐKĐBĐ Stand1 (Uncer)", g(res.E11), esc(h.unit))}
          ${r3("E12", "ĐKĐBĐ quy đổi", g(res.E12), "%")}${r3("E13", "% of Reading", g(res.E13), "%")}
          ${r3("E14,E16", "Hệ số phủ k chuẩn / k (P=95%)", `2 / ${res.k}`)}${r3("E17", "Số điểm hiệu chuẩn", n)}
          ${r3("G14", "Hiệu chỉnh P (Stand Correct)", "Yes", "dùng trực tiếp xi")}
        </table><table class="ukv">
          ${r3("H8", "Chuẩn điện (Stand2)", esc(s2.key))}${r3("H9", "Min Range", g(res.H9), s2.unit)}${r3("H10", "Max Range", g(res.H10), s2.unit)}
          ${r3("H11", "Uncer", g(s2.unc), esc(s2.uncUnit))}${r3("H12", "ĐKĐBĐ quy đổi", g(res.H12), "%")}${r3("H13", "Sai số (Error)", g(res.H13), s2.unit)}
          ${r3("J8", "Loại chuẩn", esc(s1.name))}${r3("", "Hạn HC Stand1 / Stand2", `${esc(s1.due || "?")} / ${esc(s2.due || "?")}`)}
        </table></div>`;
      const hd = c.map((_, j) => `<th>${j < n ? "R" : "F"}${(j % n) + 1}</th>`).join("");
      const row = (ref, lab, f) => `<tr><td class="ref">${ref}</td><td class="l">${lab}</td>${c.map(x => `<td>${f(x)}</td>`).join("")}</tr>`;
      const grid = `<table class="res ug"><thead><tr><th class="ref">Hàng</th><th class="l">Đại lượng</th>${hd}</tr></thead><tbody>
        ${row("19", "Standard Pressure (xi)", x => g2(x.x))}${row("20", "Correct Pressure (xi)", x => g2(x.x))}${row("21", "Standard Current (mA)", x => g2(x.I))}
        ${row("22", "Instrument Yi (mA)", x => g2(x.y))}${row("23", "u<sub>A,i</sub> (mA)", x => g(x.uAmA, 4))}${row("24", "u<sub>A,i</sub> (%)", x => g(x.uA, 4))}
        ${row("38", "u<sub>s,i</sub> chuẩn (%)", x => g(x.us, 4))}${row("25", "U<sub>c,i</sub> (%)", x => g(x.uc, 4))}</tbody></table>`;
      const reg = `<div class="ucols"><table class="ukv">
          ${r3("F28", "1. Hệ số b = LINEST", g(res.b, 8))}${r3("F29", "Hệ số a = LINEST", g(res.a, 8))}
          ${r3("F33", "2.1 Sy = STEYX", g(res.Sy, 6), "mA")}${r3("F34", "Sa = Sy·√(L34/M34/K34)", g(res.Sa, 6))}
          ${r3("F35", "Sb = Sy·√(1/K34)", g(res.Sb, 6))}${r3("F36", "r(a,b) = −N34/√(M34·L34)", g(res.r, 6))}
        </table><table class="ukv">
          ${r3("K34", "DEVSQ Σ(xi−xtb)²", g(res.K34))}${r3("L34", "SUMSQ Σxi²", g(res.L34))}${r3("M34/N34", "COUNT n / SUM Σxi", `${res.M34} / ${g(res.N34)}`)}
          ${r3("F39", "2.2.2 uv Vôn/Ampe kế", g(res.uv, 6), "%")}${r3("F41", "3. Uc tổng hợp lớn nhất", g(res.F41, 6), "%")}${r3("F42", "4. Uexp tương đối = E16·F41", g(res.F42, 6), "%")}
        </table></div>`;
      const pd = pDec(rec.pt.points);
      const out = `<table class="res ug"><thead><tr><th>Áp suất chuẩn<br>B46</th><th>Quy đổi mA<br>C46</th><th>DUT tăng<br>D46</th><th>DUT giảm<br>E46</th><th>SHC tăng<br>F46</th><th>SHC giảm<br>G46</th><th>SHC TB<br>H46</th><th>Uc,i(tb) %<br>I46</th><th>Uexp ${esc(h.unit)}<br>J46</th><th>Uexp %<br>K46</th><th>In CC<br>${esc(h.unit)}</th></tr></thead><tbody>
        ${res.rows.map(r => `<tr><td>${g2(r.x)}</td><td>${g2(r.ideal)}</td><td>${f2(r.rise)}</td><td>${f2(r.fall)}</td><td>${g2(r.shcR, 4)}</td><td>${g2(r.shcF, 4)}</td><td>${g2(r.shcAvg, 4)}</td><td>${g(r.ucAvg, 6)}</td><td>${g(r.U, 6)}</td><td>${g(r.Upct, 6)}</td><td><b>${uTxt("PT", r.U)}</b></td></tr>`).join("")}</tbody></table>`;
      const ratioI = res.shcMax / res.limI, ratioU = res.Umax / res.limU;
      const chk = `<table class="res ug chk"><thead><tr><th>Max |SHC| (mA)</th><th>Giới hạn SHC = acc%×16</th><th>SHC / giới hạn</th><th>U lớn nhất (${esc(h.unit)})</th><th>Giới hạn U = acc%×span</th><th>U / giới hạn</th><th>Kết luận</th></tr></thead>
        <tbody><tr><td>${g(res.shcMax, 4)}</td><td>${g(res.limI, 4)}</td><td class="${ratioI > 1 ? "bad" : ""}">${(ratioI * 100).toFixed(1)}%</td><td>${g(res.Umax, 6)}</td><td>${g(res.limU, 6)}</td><td class="${ratioU > 1 ? "bad" : ""}">${(ratioU * 100).toFixed(1)}%</td><td><b>${res.pass ? "Đạt (Pass)" : "Không đạt (Fail)"}</b></td></tr></tbody></table>
        <div class="unote">Giá trị in trên chứng chỉ: y = ${vn(res.a, 3)} + ${vn(res.b, 3)} x · U<sub>exp-max</sub> = ${uTxt("PT", res.Umax)} ${esc(h.unit)} (quy tắc 30/10/2026: 2 chữ số có nghĩa, làm tròn lên).</div>`;
      body = inp + `<div class="ulbl">Bảng tính theo điểm (R = Rising, F = Failing) – hàng Excel 19–25, 38:</div>` + grid + reg
        + `<div class="ulbl">Kết quả hiệu chuẩn (hàng 44–50):</div>` + out + `<div class="ulbl">Kiểm tra (sheet "Kiểm tra"):</div>` + chk;
    } else {
      const s1 = info.stand1;
      const inp = `<div class="ucols"><table class="ukv">
          ${r3("E5", "Thiết bị được hiệu chuẩn (DUT)", esc(h.description))}${r3("E6", "Độ chính xác (Accuracy)", esc(h.acc), "%")}
          ${r3("E7", "Giá trị đặt (Pset)", esc(h.pset), esc(h.unitPset))}${r3("I7", "Hiệu chỉnh áp suất", "Yes")}
          ${r3("E8", "Độ chia nhỏ nhất thước đặt mức", esc(h.resolution || 0), esc(h.unitPset))}
          ${r3("E9", "Chiều tác động (tự xác định)", res.dir, `QTG: ${esc(h.dirQTG || "")}`)}
          ${r3("E16–18", "k chuẩn / n / k Student", `2 / 5 / ${res.k}`)}
        </table><table class="ukv">
          ${r3("E10", "Thiết bị áp suất chuẩn (Stand1)", esc(s1.key))}${r3("G10", "Loại chuẩn", esc(s1.name))}
          ${r3("E11", "Min range (đổi ×" + g(res.factor1, 8) + ")", g(res.E11), esc(h.unitPset))}${r3("E12", "Full Scale", g(res.E12), esc(h.unitPset))}
          ${r3("E13", "ĐKĐBĐ (Uncer)", g(res.E13), esc(h.unitPset))}${r3("E14", "ĐKĐBĐ quy đổi", g(res.E14), "%")}${r3("G14", "% of Rdg", g(res.G14), "%")}
          ${r3("", "Hạn HC Stand1", esc(s1.due || "?"))}
        </table></div>`;
      const rows = res.hi.map((v, i) => `<tr><td>${i + 1}</td><td>${i === 0 ? esc(h.pset) : ""}</td><td>${f2(v)}</td><td>${f2(res.lo[i])}</td><td>${g2(res.G[i], 6)}</td><td>${g2(res.H[i], 6)}</td><td>${g((v - res.F28) ** 2, 6)}</td><td>${g((res.lo[i] - res.F29) ** 2, 6)}</td></tr>`).join("");
      const grid = `<table class="res ug"><thead><tr><th>Lần<br>A</th><th>Pset<br>B</th><th>Pm Rising<br>C/E</th><th>Pđ Falling<br>D/F</th><th>DPcm = Pset−Pm<br>G</th><th>DPcđ = Pset−Pđ<br>H</th><th>(Pm−Pm tb)²<br>K</th><th>(Pđ−Pđ tb)²<br>L</th></tr></thead><tbody>${rows}</tbody></table>`;
      const calc = `<div class="ucols"><table class="ukv">
          ${r3("F28", "Pm trung bình", g(res.F28, 8))}${r3("F29", "Pđ trung bình", g(res.F29, 8))}
          ${r3("F26", "8.1 uA áp suất mở", g(res.F26, 6))}${r3("F27", "uA áp suất đóng", g(res.F27, 6))}
          ${r3("F31", "8.2 uB của chuẩn", g(res.F31, 6))}${r3("F32", "uB độ phân giải = E8/2", g(res.F32, 6))}
        </table><table class="ukv">
          ${r3("F34", "8.3 uc áp suất mở", g(res.F34, 6))}${r3("F35", "uc áp suất đóng", g(res.F35, 6))}
          ${r3("F37", "8.4 U mở = E18·F34", g(res.F37, 6))}${r3("F38", "U đóng = E18·F35", g(res.F38, 6))}
          ${r3("I42", "U báo cáo (theo chiều " + res.dir + ")", g(res.U, 6), esc(h.unitPset))}${r3("", "In chứng chỉ (2 chữ số có nghĩa, làm tròn lên)", `<b>${res.Utext.text}</b>`, esc(h.unitPset))}
        </table></div>`;
      const pd = pDec([h.pset, ...rec.ps.set, ...rec.ps.reset]);
      const out = `<table class="res ug"><thead><tr><th>Lần<br>C42</th><th>Pset<br>D42</th><th>Set<br>E42</th><th>Reset<br>F42</th><th>Set-deviation<br>G42</th><th>Reset-deviation<br>H42</th></tr></thead><tbody>
        ${res.set.map((v, i) => `<tr><td>${i + 1}</td><td>${i === 0 ? esc(h.pset) : ""}</td><td>${vn(v, pd)}</td><td>${vn(res.reset[i], pd)}</td><td>${vn(res.setDev[i], pd)}</td><td>${vn(res.resetDev[i], pd)}</td></tr>`).join("")}</tbody></table>`;
      const maxDev = Math.max(...res.setDev.map(Math.abs)), ratio = res.J42 / res.K42;
      const chk = `<table class="res ug chk"><thead><tr><th>Tác động</th><th>Sai số cho phép (MPE) = acc%×Pset</th><th>Max |ΔPset|</th><th>U (k=2)</th><th>|Δ| + U (J42)</th><th>(|Δ|+U) / MPE</th><th>Kết luận (D47)</th></tr></thead>
        <tbody><tr><td>${res.dir}</td><td>${g(res.K42, 6)}</td><td>${g(maxDev, 6)}</td><td>${g(res.U, 6)}</td><td>${g(res.J42, 6)}</td><td class="${ratio > 1 ? "bad" : ""}">${(ratio * 100).toFixed(1)}%</td><td><b>${res.pass ? "Đạt (Pass)" : "Không đạt (Fail)"}</b></td></tr></tbody></table>`;
      body = inp + `<div class="ulbl">Số liệu đo (hàng 20–24):</div>` + grid + calc + `<div class="ulbl">Kết quả hiệu chuẩn (hàng 42–46):</div>` + out + `<div class="ulbl">Kiểm tra (sheet "Kiểm tra"):</div>` + chk;
    }
    return `<section class="a4 unc">${draft(info)}
      <div class="uhead"><div><b>BẢNG TÍNH TOÁN ĐỘ KHÔNG ĐẢM BẢO ĐO CỦA PHÉP HIỆU CHUẨN</b><br>No.: ${esc(rec.certNo)} · Tag: <b>${esc(h.tag)}</b> · ${dVN(toDate(h.calDate))}<br>${it(PT ? "Pressure transmitter Uncertainty Calculation Report – DLVN112-2002_Rev2" : "Uncertainty Calculation Form – DLVN133 - 2004")}</div><div class="fc">${esc(S.form)}</div></div>
      ${body}${fvBox(rec.type, res)}
      <div class="ufoot">${res.fv === 2 ? "Bản công thức đã sửa 06/11/2026 – khác file Excel ở các điểm nêu trên. Gốc: " : ""}Công thức và ô Excel theo file ${PT ? "PT_DGCP_10_2026.xls" : "PS_DGCP_10_2026.xls"} (macro khainv). Đối chiếu 2026-10-29: ${PT ? "31/31" : "13/13"} thiết bị DGCP trùng khớp.</div></section>`;
  }

  /* ================= QC LIST (sheet "Kiểm tra", many records) ================= */
  function qcPages(type, items, st) {
    const PT = type === "PT", per = 26, pages = [];
    for (let p = 0; p < items.length; p += per) {
      const chunk = items.slice(p, p + per);
      const rows = chunk.map(({ rec, res }, i) => {
        const h = rec.h;
        if (PT) {
          const rI = res.shcMax / res.limI;
          return `<tr><td>${p + i + 1}</td><td>${esc(rec.certNo.split(".").pop())}</td><td class="l">${esc(h.tag)}</td><td>${esc(h.model)}</td><td>${esc(h.min)}–${esc(h.max)} ${esc(h.unit)}</td><td class="l">${esc(rec.s1key)}</td><td class="l">${esc(rec.s2key)}</td><td>${esc(h.calDate)}</td><td>${g(res.shcMax, 3)}</td><td>${g(res.limI, 3)}</td><td class="${rI > 1 ? "bad" : ""}">${(rI * 100).toFixed(0)}%</td><td>${uTxt("PT", res.Umax)}</td><td>${g(res.limU, 4)}</td><td class="${res.pass ? "" : "bad"}">${res.pass ? "Đạt" : "Không đạt"}</td></tr>`;
        }
        const md = Math.max(...res.setDev.map(Math.abs)), rr = res.J42 / res.K42;
        return `<tr><td>${p + i + 1}</td><td>${esc(rec.certNo.split(".").pop())}</td><td class="l">${esc(h.tag)}</td><td>${esc(h.pset)}</td><td>${esc(h.unitPset)}</td><td>${res.dir}</td><td>${g(res.K42, 4)}</td><td class="l">${esc(rec.s1key)}</td><td>${esc(h.calDate)}</td><td>${g(md, 4)}</td><td>${esc(res.Utext.text)}</td><td>${g(res.J42, 4)}</td><td class="${rr > 1 ? "bad" : ""}">${(rr * 100).toFixed(0)}%</td><td class="${res.pass ? "" : "bad"}">${res.pass ? "Đạt" : "Không đạt"}</td></tr>`;
      }).join("");
      const head = PT
        ? `<tr><th>TT</th><th>Số BB</th><th>Tag</th><th>Model</th><th>Phạm vi đo</th><th>Chuẩn áp suất</th><th>Chuẩn điện</th><th>Ngày HC</th><th>Max |SHC| (mA)</th><th>Giới hạn SHC</th><th>SHC / GH</th><th>U lớn nhất</th><th>Giới hạn U</th><th>Kết luận</th></tr>`
        : `<tr><th>TT</th><th>Số BB</th><th>Tag</th><th>Pset</th><th>Đơn vị</th><th>Tác động</th><th>MPE</th><th>Chuẩn</th><th>Ngày HC</th><th>Max |ΔPset|</th><th>U (k=2)</th><th>|Δ| + U</th><th>(|Δ|+U)/MPE</th><th>Kết luận</th></tr>`;
      pages.push(`<section class="a4 unc qcl"><div class="uhead"><div><b>BẢNG KIỂM TRA KẾT QUẢ HIỆU CHUẨN ${PT ? "PRESSURE TRANSMITTER" : "PRESSURE SWITCH"}</b><br>${items.length} hồ sơ · trang ${pages.length + 1}/${Math.ceil(items.length / per)}</div><div class="fc">Kiểm tra</div></div>
        <table class="res ug qct"><thead>${head}</thead><tbody>${rows}</tbody></table>
        <div class="ufoot">Lập từ dữ liệu app theo sheet "Kiểm tra" của ${PT ? "PT" : "PS"}_DGCP_10_2026.xls.</div></section>`);
    }
    return pages.join("");
  }

  window.LabDocs = { nTxt, uTxt, uV, FV, FVCH, fvBox, dot, f2, g2, certPage1, certPage2, qtgPage, uncPage, qcPages, dVN, dEN, toDate, esc, vn, vnTxt, decimalsOf, g, cb, it, draft, wmImg, certHeader, certFooter, qtgSig, envHtml, qModel, qRange, p2 };
})();
