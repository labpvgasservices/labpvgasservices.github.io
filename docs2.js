/* Printable A4 pages for PG, TS, TT, RTD, TG, TC, DPG, following the 2026 templates supplied on 2026-10-30:
 *   PG : 08-2011_PG_CKS_Oct-2026.docx (GCN kiểm định, 2 pages) + QTG PG GPP T8 CKS.docx (Biên bản kiểm định ĐLVN 08:2011.PL1)
 *   TS : TM13_TS_CKS.docx + QTG_TS_LFS_01_T9_2026.pdf (BM.TM.13-1)
 *   TT : TT_CKS.docx      + QTG_TT-LFS_07_T9_2026.pdf (DVK.LAB.TM.12.PL2)
 *   TG : GCN_TG_GPP_2026.docx + 6. ĐLVN 138_TG_QTG_2026.docx (ĐLVN 138:2004.PL3)
 *   RTD: RTD Cert_CKS.docx + QTG_TE_LFS_06_T9_2026.pdf (ĐLVN 125:2003.PL2)
 *   TC : GCN TC 2026 (CN.TC.26.0067) + QTG TC GPP 2026 (ĐLVN 161:2005.PL2)
 *   DPG: GCN PDI 2026 (CN.PG.26.0011) + QTG scan BB.PG.26.0003 (DVK.LAB.TM22.PL03) – QTG chuyển từ bản scan, chờ file Word
 * Uncertainty sheets follow DLVNTM13 / DLVN188.2-2 / "DLVN125 NK chuan + do Ohm" (cell references in the left column).
 */
(function () {
  "use strict";
  const C = window.LabCalc, D = window.LabDocs;
  const { f2, g2, nTxt, uTxt, esc, vn, vnTxt, dVN, dEN, toDate, decimalsOf, g, cb, it, draft, wmImg, certHeader, certFooter, qtgSig, envHtml, qModel, p2 } = D;
  const num = v => (v === "" || v == null) ? NaN : Number(String(v).replace(",", "."));
  const clampDec = (arr, lo, hi) => Math.min(hi, Math.max(lo, decimalsOf(arr)));
  const MONEN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const dENY = d => d ? `${p2(d.getDate())}-${MONEN[d.getMonth()]}-${d.getFullYear()}` : "";
  const deg = "°C";
  const DESC = {
    TS: ["Thiết bị đặt mức nhiệt độ", "Temperature Switch"],
    TT: ["Thiết bị chuyển đổi đo nhiệt độ", "Temperature Transmitter"],
    RTD: ["Nhiệt kế điện trở Platin công nghiệp", "Industrial Platinum Resistance Thermometers"],
    TG: ["Đồng hồ nhiệt độ", "Temperature Indicator"],
    TC: ["Cặp nhiệt điện công nghiệp", "Industrial Thermocouples"],
    DPG: ["Đồng hồ áp suất", "Pressure gauge"]
  };
  // GCN TC: "9,184 E-02", exponent padded to 2 digits (3 when ≥ 10: "1,323 E-010") as printed by the mail-merge
  function tcSci(v) {
    if (!isFinite(v) || v === 0) return "0";
    let e = Math.floor(Math.log10(Math.abs(v))), m = v / Math.pow(10, e);
    if (Math.abs(C.xround(m, 3)) >= 10) { e += 1; m = v / Math.pow(10, e); }
    const a = Math.abs(e);
    return `${vn(m, 3)} E${e < 0 ? "-" : "+"}${String(a).padStart(a >= 10 ? 3 : 2, "0")}`;
  }
  const tcU = res => vnTxt(res.Utext);
  // DPG: readings / corrections with max(2, decimals of the smallest division); standard with max(1, …) (GCN PDI: 0,0 kPa / 0,00 kPa)
  const dpgDec = (rec) => { const d = decimalsOf([rec.h.res]); return { r: Math.max(2, d), s: Math.max(1, d, decimalsOf(rec.dpg.std)) }; };
  // Excel "#,00000 E+##" in the Vietnamese locale: -6,13663 E-7
  function sci(v) {
    if (!isFinite(v) || v === 0) return "0";
    let e = Math.floor(Math.log10(Math.abs(v))), m = v / Math.pow(10, e);
    if (Math.abs(C.xround(m, 5)) >= 10) { e += 1; m = v / Math.pow(10, e); }
    return `${vn(m, 5)} E${e < 0 ? "-" : "+"}${Math.abs(e)}`;
  }
  const accTxt = (h, unit) => `±${vnTxt(h.acc)}%${unit}`;
  function S(st, type) { return st[type] || {}; }
  function bbNo(rec, st) { if (!rec.certNo) return ""; return `${S(st, rec.type).bbPrefix}.${rec.certNo.split(".").slice(-2).join(".")}`; }
  function due(rec, st) { return C.eomonth(toDate(rec.h.calDate), Number(st.dueMonths) || 12); }

  /* Standards block of the 2026 temperature certificates: values of each standard joined with "; " (Data188!AZ:BF) */
  function stdJoin(list) {
    const L = list.filter(Boolean);
    const uniq = a => a.filter((x, i) => x !== "" && a.indexOf(x) === i).join("; ");
    const rng = s => `(${vnTxt(s.min)} ÷ ${vnTxt(s.kind === "e" && s.certRange ? s.certRange : s.max)})${s.unit}`;
    const unc = s => vnTxt(s.uncText || `${s.unc}${s.uncUnit === "%" ? "%" : s.uncUnit}`);
    return {
      name: uniq(L.map(s => s.name)), model: uniq(L.map(s => s.model)), serial: uniq(L.map(s => s.serial)), maker: uniq(L.map(s => s.maker)),
      range: L.map(rng).join("; "), unc: L.map(unc).join("; "), trace: uniq(L.map(s => s.trace))
    };
  }

  /* ======================= CERTIFICATE page 1 – TS / TT / RTD ======================= */
  function tCert1(rec, res, st, info) {
    const h = rec.h, T = rec.type, L = info.loc || {}, cal = toDate(h.calDate), dd = due(rec, st), iss = toDate(h.issueDate) || cal;
    const row = (a, b, cls) => `<tr${cls ? ` class="${cls}"` : ""}><td>${a}</td><td>${b}</td></tr>`;
    const [dVNn, dENn] = DESC[T];
    const stds = T === "TS" || T === "DPG" ? [info.stand1] : T === "TG" ? [info.stand1, info.stand2] : [info.stand1, info.stand2, info.stand3];
    const sj = stdJoin(stds);
    let spec;
    if (T === "TS") spec = `Dải làm việc ${it("(Range)")}: (${vnTxt(h.min)} ÷ ${vnTxt(h.max)})${deg}<br>Nhiệt độ đặt ${it("(Set point)")}: ${vnTxt(h.tset)} ${deg}<br>Độ chính xác ${it("(Accuracy)")}: ±${vnTxt(h.acc)}%Tset`;
    else if (T === "TG") spec = `Phạm vi đo ${it("(Range)")}: (${vnTxt(h.min)}÷ ${vnTxt(h.max)}) ${deg}<br>Độ chia nhỏ nhất ${it("(Smallest division)")}: ${vnTxt(h.res)}${deg}<br>Độ chính xác ${it("(Accuracy)")}: ${accTxt(h, "FS")}`;
    else if (T === "DPG") spec = `Phạm vi đo ${it("(Range)")}: (${vnTxt(h.min)}÷ ${vnTxt(h.max)}) ${esc(h.unit)}<br>Độ chia nhỏ nhất ${it("(Smallest division)")}: ${esc(h.res)} ${esc(h.unit)}<br>Độ chính xác ${it("(Accuracy)")}: ${accTxt(h, "FS")}`;
    else spec = `Phạm vi đo ${it("(Range)")}: (${vnTxt(h.min)} ÷ ${vnTxt(h.max)})${deg}<br>Độ chính xác ${it("(Accuracy)")}: ${accTxt(h, "FS")}`;
    const top = row(`${T === "TT" ? "Phương tiện đo" : T === "TS" ? "Tên thiết bị" : "Tên đối tượng"} ${it("(Dut)")}:`, `${dVNn} ${T === "RTD" ? `<br><span class="sm">${it(`(${dENn})`)}</span>` : it(`(${dENn})`)}`)
      + (T === "TT"
        ? row(`Kiểu ${it("(Type)")}: ${esc(h.model)}`, `Số ${it("(Serial No)")} Mã QL ${it("(Tag No)")}: ${esc(h.serial || "N/A")}/ ${esc(h.tag)}`)
        : T === "TG" || T === "DPG" ? row(`Kiểu ${it("(Type)")}: ${esc(h.model || "N/A")}`, `Mã QL ${it("(Tag No)")}: ${esc(h.tag)}`)
        : T === "TC" ? row(`Kiểu ${it("(Type)")}: Type ${esc(h.tcType || "J")}`, `Mã QL ${it("(Tag No)")}: ${esc(h.tag)}<br>Số hiệu ${it("(Serial No.)")}: ${esc(h.serial || "N/A")}`)
        : row(`Kiểu ${it("(Type)")}: ${esc(h.model)}`, `Mã QL ${it("(Tag No)")}: ${esc(h.tag)}<br>Số hiệu ${it("(Serial No.)")}: ${esc(h.serial || "N/A")}`))
      + row(`Nơi sản xuất ${it("(Manufacturer)")}:`, esc(h.maker))
      + row(`Đặc trưng kỹ thuật đo lường ${it("(Specification)")}:`, spec)
      + row(`Cơ sở sử dụng ${it("(Customer)")}:`, `${esc(L.custVN)}<br>Địa điểm lắp đặt ${it("(Location)")}: ${esc(L.locVN)}`)
      + row(`Phương pháp thực hiện:<br>${it("(Method of calibration)")}:`, `${esc(h.procedure)}<br>Điều kiện môi trường ${it("(Environment)")}:<br>${envHtml(h.env)}`);
    const sRow = (lab, en, k) => `<tr><td class="ind">${lab} ${it(`(${en})`)}:</td><td>${esc(sj[k])}</td></tr>`;
    const stdT = `<table class="ckv std one">${sRow("Tên thiết bị", "Name", "name")}${sRow("Kiểu", T === "TT" ? "Type" : "Model", "model")}${sRow("Số hiệu", "Serial No.", "serial")}
      ${sRow("Nơi sản xuất", "Manufacturer", "maker")}${sRow("Phạm vi đo", "Range", "range")}${sRow("Độ KĐBĐ", "Uncertainty", "unc")}${sRow("Dẫn xuất chuẩn", "Traceability", "trace")}
      ${T === "TG" || T === "TC" ? `<tr><td class="ind">Thiết bị tạo nhiệt độ ${it("(Heat Source)")}:</td><td>${esc(stds.filter(Boolean).map(s => s.heat || "").filter((x, i, a) => x && a.indexOf(x) === i).join("; "))}</td></tr>` : ""}</table>`;
    const day = st.issueDayBlank ? "...." : p2(iss.getDate());
    return `<section class="a4 cert">${wmImg}<div class="frame"></div>${draft(info)}${certHeader(st, T === "TT" || T === "TG" || T === "DPG" ? "" : "lab")}
      <h1>GIẤY CHỨNG NHẬN HIỆU CHUẨN</h1><div class="sub"><b><i>(Calibration Certificate)</i></b></div>
      <div class="no">Số ${it("(N<sup>o</sup>)")}: ${esc(rec.certNo)}</div>
      <table class="ckv tc">${top}<tr><td colspan="2">Chuẩn được sử dụng ${it("(Standards set)")}:</td></tr></table>
      ${stdT}
      <table class="ckv tc">
        ${row(`Kết quả ${it("(Result)")}:`, `Xem kết quả hiệu chuẩn trang sau.<br><span class="sm">${it("(The result of the calibration on the next page)")}</span>`)}
        ${row(`Ngày hiệu chuẩn lại đề nghị<br>${it("(Recalibration recommended)")}:`, `${dVN(dd)} ${it(`(${T === "DPG" ? dENY(dd) : dEN(dd)})`)}`)}
      </table>
      <div class="issue">${it(`${esc(st.place)}, ngày ${day} tháng ${p2(iss.getMonth() + 1)} năm ${iss.getFullYear()}`)}<br>${it("(Date of issue)")}</div>
      <table class="csig"><tr><td><b>${esc(st.sig1Title)}</b><br>${it(esc(st.sig1TitleEn))}</td><td><b>${esc(st.sig2Title)}</b><br>${it(esc(st.sig2TitleEn))}</td></tr>
        <tr class="sp"><td>${st.showAccred ? `<img class="accr" src="assets/vilas.jpg" alt="">` : ""}</td><td></td></tr>
        <tr><td><b>${esc(st.sig1Name)}</b></td><td><b>${esc(st.sig2Name)}</b></td></tr></table>
      ${certFooter(st, 1, 2)}</section>`;
  }

  const OTHER = `<p>Các thông tin khác ${it("(Other information)")}:</p>
    <ul class="dash"><li>Phương tiện đo này không sử dụng để định lượng hàng hóa, dịch vụ trong mua bán, thanh toán, đảm bảo an toàn, bảo vệ sức khỏe cộng đồng, bảo vệ môi trường, trong thanh tra, kiểm tra, giám định tư pháp và trong các hoạt động công vụ khác.<br>${it("(This equipment is not used to quantify goods and services in purchase and sale, payment, safety assurance, community health protection, environmental protection, inspection, examination, judicial expertise and in other official activities)")}</li>
    <li>Phương tiện đo này không được sử dụng trực tiếp để kiểm định phương tiện đo nhóm 2.<br>${it("(This equipment is not used directly to verify the measuring instrument of group 2)")}</li></ul>`;
  const K2 = `<p>Độ không đảm bảo đo mở rộng được tính ứng với độ tin cậy 95%, hệ số phủ k=2:<br>${it("(The reported expanded uncertainty is based upon a standard uncertainty multiplied by a coverage factor k = 2, providing a level of confidence of approximate 95%):")}</p>`;

  /* ======================= CERTIFICATE page 2 – TS / TT / RTD ======================= */
  function tCert2(rec, res, st, info) {
    const h = rec.h, T = rec.type, cal = toDate(h.calDate);
    let table, mid;
    if (T === "TS") {
      const U = D.uV(res, res.U, vn(res.Uprint, 2));
      const rows = res.set.map((v, i) => `<tr><td>${p2(i + 1)}</td>${i === 0 ? `<td rowspan="5">${vnTxt(h.tset)}</td>` : ""}<td>${vn(v, 3)}</td><td>${vn(res.reset[i], 3)}</td><td>${vn(res.setDev[i], 3)}</td><td>${vn(res.resetDev[i], 3)}</td>${i === 0 ? `<td rowspan="5">${U}</td>` : ""}</tr>`).join("");
      table = `<table class="res cres tsr"><thead><tr><th>TT<br>${it("(N<sup>o</sup>)")}</th><th>Nhiệt độ đặt<br>${it("(Set point)")}<br>${deg}</th><th>Nhiệt độ mở<br>${it("(Set-temp)")}<br>${deg}</th><th>Nhiệt độ đóng<br>${it("(Reset-temp)")}<br>${deg}</th>
        <th>Chênh mở<br>${it("(Set-deviation)")}<br>${deg}</th><th>Chênh đóng<br>${it("(Reset-deviation)")}<br>${deg}</th><th>Độ KĐBĐ<br>${it("(Uncertainty)")}<br>${deg}</th></tr></thead><tbody>${rows}</tbody></table>`;
      mid = K2 + `<p class="c">U = ${U}${deg}</p>`;
    } else if (T === "TT") {
      // publication rules 30/10/2026: comma decimal, no thousands separator, decimals per reading set (M = 3)
      const t = (v, d) => nTxt("TT", v, d), dS = C.pubDec(res.pt.map(p => p.stdT), 3), dR = C.pubDec(res.pt.map(p => p.rise), 3), dF = C.pubDec(res.pt.map(p => p.fall), 3);
      const rows = res.pt.map((p, i) => `<tr><td>${p2(i + 1)}</td><td>${t(p.stdT, dS)}</td><td>${t(p.ideal, 3)}</td><td>${t(p.rise, dR)}</td><td>${t(p.fall, dF)}</td><td>${t(p.cR, dR)}</td><td>${t(p.cF, dF)}</td><td>${t(p.err, 3)}</td></tr>`).join("");
      table = `<table class="res cres"><thead><tr><th rowspan="2">TT<br>${it("(N<sup>o</sup>)")}</th><th rowspan="2">Nhiệt độ chuẩn<br>${it("(Standard Temp)")}<br>${deg}</th><th rowspan="2">Tín hiệu điện quy đổi<br>${it("(Ideal Output Current)")}<br>mA</th>
        <th colspan="2">Giá trị dòng trên thiết bị<br>${it("(Measured Output Current)")}<br>mA</th><th colspan="2">Số hiệu chính<br>${it("(Correction)")}<br>mA</th><th rowspan="2">Sai lệch<br>${it("(Error)")}<br>%</th></tr>
        <tr><th>Tăng<br>${it("(Increasing)")}</th><th>Giảm<br>${it("(Decreasing)")}</th><th>Tăng<br>${it("(Increasing)")}</th><th>Giảm<br>${it("(Decreasing)")}</th></tr></thead><tbody>${rows}</tbody></table>`;
      const lines = res.lines.map(l => `<p class="c"><b><i>- Dải đo (Range) (${nTxt("TT", l.from, C.pubDec([l.from], 3))} ÷ ${nTxt("TT", l.to, C.pubDec([l.to], 3))})${deg} : U = ${uTxt("TT", l.U)}${deg}.</i></b></p>`).join("");
      mid = K2 + lines;
    } else if (T === "TG") {
      // Data138: standard ROUND 2 shown "0,000"; reading and correction "#.##0,0" (2 decimals when the division has 2, e.g. 1,25 °C)
      const dd = tgDec(h), U2 = l => D.uV(res, l.U, vn(C.xround(l.U, 2), 2));
      const rows = res.pt.map((p, i) => `<tr><td>${p2(i + 1)}</td><td>${vn(C.xround(p.stdT, 2), 3)}</td><td>${vn(p.rise, dd)}</td><td>${vn(p.fall, dd)}</td><td>${vn(p.corr, dd)}</td></tr>`).join("");
      table = `<table class="res cres"><thead><tr><th rowspan="2">TT<br>${it("(N<sup>o</sup>)")}</th><th rowspan="2">Nhiệt độ chuẩn<br>${it("(Standard)")}<br>${deg}</th><th colspan="2">Giá trị đọc ${it("(Indicator)")}<br>${deg}</th><th rowspan="2">Số hiệu chính<br>${it("(Correction)")}<br>${deg}</th></tr>
        <tr><th>Tăng ${it("(Increasing)")}</th><th>Giảm ${it("(Decreasing)")}</th></tr></thead><tbody>${rows}</tbody></table>`;
      mid = K2 + res.lines.map(l => `<p>- Dải đo ${it("(Range)")} (${l.from} ÷ ${l.to})${deg}: U = ${U2(l)}${deg} .</p>`).join("");
    } else if (T === "TC") {
      const rows = res.pt.map((p, i) => `<tr><td>${p2(i + 1)}</td><td>${vn(p.t, 3)}</td><td>${vn(p.Eref, 3)}</td><td>${vn(p.E, 3)}</td><td>${vn(p.dE, 3)}</td><td>${vn(p.dT, 3)}</td></tr>`).join("");
      table = `<table class="res cres tcr"><thead><tr><th>TT<br>${it("(N<sup>o</sup>)")}</th><th>Nhiệt độ chuẩn<br>${it("(Standard Temp)")}<br>${deg}</th><th>Suất điện động chuẩn<br>${it("(Standard Thermoelectric Voltage)")}<br>mV</th>
        <th>Suất điện động đo được<br>${it("(Measured Voltage)")}<br>mV</th><th>Độ lệch SĐĐ<br>${it("(ΔE-deviation)")}<br>mV</th><th>Độ lệch nhiệt độ<br>${it("(Temp-deviation)")}<br>${deg}</th></tr></thead><tbody>${rows}</tbody></table>`;
      const I = res.its, cc = (c, a) => { const L = c.map((v, i) => [`C${i}`, v]).concat([["α<sub>0</sub>", a[0]], ["α<sub>1</sub>", a[1]]]); return L; };
      const c1 = cc(I.e1, I.a1), c2 = cc(I.e2, I.a2), half = 7;
      const crow = i => { const cell = (L, j) => L[j] ? `<td>${L[j][0]}</td><td>${tcSci(L[j][1])}</td>` : `<td></td><td></td>`; return `<tr>${cell(c1, i)}${cell(c1, i + half)}${cell(c2, i)}${cell(c2, i + half)}</tr>`; };
      mid = `<p>Hệ số của hàm quan hệ giữa độ lệch E và t<sup>o</sup>C ${it("(Coefficients of the characteristic function)")}:</p>
        <p class="c">a0= ${tcSci(res.a[0])} , a1= ${tcSci(res.a[1])}, a2= ${tcSci(res.a[2])}</p>
        <p>Các hệ số của hàm quan hệ E và t<sup>o</sup>C ${it("(Coefficients of the characteristic function)")}:</p>
        <table class="coef tcc"><tr><th colspan="4">${esc(I.r1)}${deg}</th><th colspan="4">${esc(I.r2)}${deg}</th></tr>${[0, 1, 2, 3, 4, 5, 6].map(crow).join("")}</table>
        ${K2}<p class="c">U = ${tcU(res)}${deg}</p>`;
    } else if (T === "DPG") {
      const u = esc(h.unit), d = dpgDec(rec);
      const rows = res.rows.map((r, i) => `<tr><td>${p2(i + 1)}</td><td>${vn(r.x, d.s)}</td><td>${vn(r.rise, d.r)}</td><td>${vn(r.fall, d.r)}</td><td>${vn(r.cR, d.r)}</td><td>${vn(r.cF, d.r)}</td><td>${vn(r.U, 3)}</td></tr>`).join("");
      table = `<table class="res cres"><thead><tr><th rowspan="2">TT<br>${it("(N<sup>o</sup>)")}</th><th rowspan="2">Áp suất chuẩn<br>${it("(Standard Pressure)")}<br>${u}</th><th colspan="2">Giá trị đọc trên thiết bị<br>${it("(Measured value)")}<br>${u}</th>
        <th colspan="2">Số hiệu chính ${it("(Correction)")}<br>${u}</th><th rowspan="2">Độ KĐBĐ mở rộng<br>${it("(Expanded uncertainty)")}<br>${u}</th></tr>
        <tr><th>Tăng<br>${it("(Increasing)")}</th><th>Giảm<br>${it("(Decreasing)")}</th><th>Tăng<br>${it("(Increasing)")}</th><th>Giảm<br>${it("(Decreasing)")}</th></tr></thead><tbody>${rows}</tbody></table>`;
      mid = `<p>Công thức hiệu chuẩn ${it("(Calibration equation)")}: y = ${vn(res.a, 3)} + ${vn(res.b, 3)} x</p>
        <ul class="dash"><li>x: giá trị áp suất chỉ thị trên phương tiện chuẩn.<br>${it("(x: Value of Input pressure from standard device)")}</li>
        <li>y: giá trị áp suất chỉ thị trên phương tiện cần hiệu chuẩn.<br>${it("(y: Value of pressure from device under test)")}</li></ul>
        ${K2}<p class="c">U = ${tcU(res)} ${u}</p>`;
    } else {
      const rows = res.rows.map((r, i) => `<tr><td>${p2(i + 1)}</td><td>${vn(r.nom, 1)}</td><td>${vn(r.std, 3)}</td><td>${vn(r.dut, 2)}</td><td>${vn(r.Rfit, 2)}</td><td>${vn(r.eO, 2)}</td><td>${vn(r.eC, 2)}</td></tr>`).join("");
      table = `<table class="res cres"><thead><tr><th rowspan="2">TT<br>${it("(N<sup>o</sup>)")}</th><th colspan="2">Nhiệt độ chuẩn<br>${it("(Standard Temp)")} ${deg}</th><th rowspan="2">Trung bình đo được<br>${it("(Measured mean value)")} Ω</th>
        <th rowspan="2">Giá trị tính theo đặc tuyến<br>${it("(Value from characteristics line)")}<br>Ω</th><th colspan="2">Độ lệch so với hàm chuẩn<br>${it("(Deviation from reference function)")}</th></tr>
        <tr><th>Danh định<br>${it("(Nominal value)")}</th><th>Trung bình<br>${it("(Mean value)")}</th><th>Ω</th><th>${deg}</th></tr></thead><tbody>${rows}</tbody></table>`;
      mid = `<p>Hàm tương quan nhiệt độ - điện trở ${it("(Characteristic function)")}: R(t) = R(0<sup>o</sup>C)[1+A.t+B.t<sup>2</sup>+C.t<sup>3</sup>(t-100)]</p>
        <p>Với các hệ số ${it("(with coefficients)")}: R0 = ${vn(res.R0, 3)} &nbsp;(Ω)</p>
        <table class="coef"><tr><td>A = ${vn(res.A, 6)}</td></tr><tr><td>B = ${sci(res.B)}</td></tr><tr><td>C = ${sci(res.C)}</td></tr></table>
        ${K2}<p class="c">U = ${D.uV(res, res.U, vn(res.U, 2))}${deg}</p>`;
    }
    const pf = res.pass ? "Đạt (Pass)" : "Không đạt (Fail)";
    const en = res.pass ? "(The calibration result meets the accuracy requirement)." : "(The calibration result does not meet the accuracy requirement).";
    return `<section class="a4 cert">${wmImg}<div class="frame"></div>${draft(info)}
      <h1 class="r">KẾT QUẢ HIỆU CHUẨN</h1><div class="sub"><b><i>(Calibration Result)</i></b></div>
      <div class="c"><b>Kèm theo giấy chứng nhận hiệu chuẩn số</b> ${it("(Attached to certificate No)")}: ${esc(rec.certNo)}</div>
      <div class="tagline"><span>Tag name: <b>${esc(h.tag)}</b></span><span>Ngày hiệu chuẩn ${it("(Calibration Date)")}: ${dVN(cal)} ${it(`(${dEN(cal)})`)}</span></div>
      ${table}
      <div class="box${T === "TC" ? " tcb" : ""}">${mid}${OTHER}</div>
      <div class="box c"><span class="l"><u>Ghi chú</u> ${it("<u>(Note)</u>")}: Kết quả hiệu chuẩn trên là <b>${pf}</b> với yêu cầu về độ chính xác của thiết bị</span>${it(en)}</div>
      <table class="csig two${T === "TC" ? " tcs" : ""}"><tr><td><b>Người kiểm tra</b><br>${it("(Checked by)")}</td><td><b>Người thực hiện</b><br>${it("(Calibrated by)")}</td></tr>
        <tr class="sp"><td></td><td></td></tr><tr><td><b>${esc(rec.sig.controller)}</b></td><td><b>${esc(rec.sig.inspector)}</b></td></tr></table>
      ${certFooter(st, 2, 2)}</section>`;
  }

  /* ======================= PG – GCN KIỂM ĐỊNH ======================= */
  function pgHeader(st) {
    const L = st.certLines;
    return `<div class="pghdr">${st.showLogo ? `<img src="assets/logo2026.jpg" alt="">` : `<span class="nologo"></span>`}
      <div class="l"><div>${esc(L[0])}</div><div class="b">${esc(L[1])}</div><div class="b i">${esc(String(L[2]).toUpperCase())}</div>
        <div>Địa chỉ: 101 Lê Lợi, P. Vũng Tàu, TP. Hồ Chí Minh</div><div class="i">Add: 101 Le Loi St, Vung Tau Ward, Ho Chi Minh City</div>
        <div class="i">Điện thoại (Tel): 84.254.3586376, Fax: 84.254.3563180</div><div class="rl"></div></div>
      <div class="r"><div class="b">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div><div class="b">Độc lập- Tự do- Hạnh phúc</div><div class="b i">SOCIALIST REPUBLIC OF VIETNAM</div><div class="b i">Independence- Freedom- Happiness</div><div class="rl"></div></div></div>`;
  }
  const VT = { "Ban đầu": "Initial", "Định kỳ": "Periodic", "Sau sửa chữa": "After repair" };
  function pgConv(h) {
    const f = C.factor(h.unit, "bar"), mn = num(h.min), mx = num(h.max);
    if (h.unit === "bar" || !isFinite(f)) return "";
    return ` ≈ (${mn === 0 ? "0" : vn(mn * f, 2)}÷${vn(mx * f, 2)}) bar`;      // Data08!FK "≈ (0÷4,14) bar"
  }
  const resDec = h => Math.min(3, decimalsOf([h.res, h.scale]));
  const stdDec = info => info.stand1 && info.stand1.res ? Math.min(4, decimalsOf([info.stand1.res])) : 3;   // Data08!AH Std_dec
  function pgCert1(rec, res, st, info) {
    const h = rec.h, S0 = S(st, "PG"), L = info.loc || {}, dd = due(rec, st), iss = toDate(h.issueDate) || toDate(h.calDate);
    const row = (vnL, enL, val, valEn, o = {}) => `<tr><td class="${o.lb ? "b" : ""}${o.red ? " red" : ""}">${vnL}<br><i class="en">${enL}</i></td><td>${val}${valEn != null ? `<br><i>${valEn}</i>` : ""}</td></tr>`;
    const pass = res.pass;
    return `<section class="a4 cert pg"><img class="wmimg pgwm" src="assets/wm_pg.jpg" alt=""><div class="frame"></div>${draft(info)}${pgHeader(st)}
      <h1 class="pgt">GIẤY CHỨNG NHẬN KIỂM ĐỊNH</h1><div class="pgs">CERTIFICATE OF VERIFICATION</div>
      <div class="no">Số (N<sup>o</sup>): ${esc(rec.certNo)}</div>
      <table class="pgkv">
        ${row("Tên đối tượng:", "Object:", "<b>ÁP KẾ KIỂU LÒ XO</b>", "PRESSURE GAUGE", { lb: 1 })}
        ${row(`Kiểu: ${esc(h.model)}`, `Type: ${esc(h.typeEN || "Spring")}`, `Số/Mã QL: ${esc(h.tag)}`, "Serial No./ Tag No.:")}
        <tr><td>Nơi sản xuất:<br><i class="en">Manufacturer:</i></td><td><span class="half">${esc(h.maker)}</span>Năm: ${esc(h.mfgYear || "N/A")}<br><span class="half"></span><i>Year:</i></td></tr>
        <tr><td>Đặc tính kỹ thuật đo lường:<br><i class="en">Specifications:</i></td><td>Phạm vi: (${vnTxt(h.min)}÷${vnTxt(h.max)}) ${esc(h.unit)}${pgConv(h)}<br><i>Range:</i></td></tr>
        <tr><td></td><td><span class="half">Độ chính xác: ±${vnTxt(h.acc)}%FS</span>Vạch chia: ${vnTxt(h.scale)} ${esc(h.unit)}<br><span class="half"><i>Accuracy:</i></span><i>Scale Interval:</i></td></tr>
        ${row("Nơi sử dụng:", "Place:", esc(L.locVN), esc(L.locEN))}
        ${row("Đơn vị sử dụng:", "User:", `<b>${esc(L.custVN)}</b>`, `<b>${esc(L.custEN)}</b>`, { lb: 1 })}
        ${row("Phương pháp thực hiện:", "Method of verification:", esc(S0.procVN || h.procedure), esc(S0.procEN || ""))}
        ${row("Chế độ kiểm định:", "Type of verification:", `<b>${esc(h.verType)}</b>`, esc(VT[h.verType] || ""), { lb: 1 })}
        ${row("Kết luận:", "Conclusion:", `<b>${pass ? "Đạt yêu cầu kỹ thuật đo lường" : "Không đạt yêu cầu kỹ thuật đo lường"}</b>`, pass ? "Pass" : "Fail", { lb: 1 })}
        ${row("Số tem kiểm định:", "Verification stamp N<sup>o</sup>:", `<b>${esc(h.stamp || rec.certNo)}</b>`, null, { lb: 1 })}
        ${row("Thời hạn đến: (*)", "Valid until:", `<i>${pass ? dVN(dd) : "—"}</i>`, pass ? dENY(dd) : "")}
      </table>
      <div class="issue pgi">${it(`${esc(st.place)}, ngày ${p2(iss.getDate())} tháng ${p2(iss.getMonth() + 1)} năm ${iss.getFullYear()}`)}<br>${it("Date of issue")}</div>
      <table class="csig pgsig"><tr><td><b>Kiểm định viên</b><br>${it("Verified by")}</td><td><b>${esc(st.sig2Title)}</b><br>${it(esc(st.sig2TitleEn))}</td></tr>
        <tr class="sp"><td></td><td></td></tr><tr><td><b>${esc(rec.sig.inspector)}</b></td><td><b>${esc(st.sig2Name)}</b></td></tr></table>
      <div class="pgfoot">(*) Với điều kiện tôn trọng các quy định về sử dụng và bảo quản.<br><i>(With respectfulness of rules of use and maintenance)</i></div></section>`;
  }
  function pgCert2(rec, res, st, info) {
    const h = rec.h, u = esc(h.unit), sd = stdDec(info), rd = resDec(h);
    const rows = res.rows.map((r, i) => `<tr><td>${p2(i + 1)}</td><td>${vn(r.x, sd)}</td><td>${vn(r.rise, rd)}</td><td>${vn(r.fall, rd)}</td><td>${vn(r.cR, rd)}</td><td>${vn(r.cF, rd)}</td></tr>`).join("");
    return `<section class="a4 cert pg"><img class="wmimg pgwm" src="assets/wm_pg.jpg" alt=""><div class="frame"></div>${draft(info)}${pgHeader(st)}
      <h1 class="pgt r2">KẾT QUẢ KIỂM ĐỊNH</h1><div class="pgs2">(<i>Verification Result</i>)</div>
      <div class="c"><b>Kèm theo giấy chứng nhận kiểm định số</b> ${it("(Attached to certificate No)")}: ${esc(rec.certNo)}</div>
      <div class="pgtag">Tên thiết bị ${it("(Tag name)")}: <b>${esc(h.tag)}</b></div>
      <table class="res pgr"><thead><tr><th rowspan="2">No.</th><th rowspan="2">Áp suất chuẩn<br>${it("(Standard Pressure)")}<br>Unit: ${u}</th><th colspan="2">Chỉ số trên thiết bị kiểm định<br>${it("(Acctual indicating value)")}<br>Unit: ${u}</th><th colspan="2">Số hiệu chính<br>${it("(Correction)")}<br>Unit: ${u}</th></tr>
        <tr><th>Tăng<br>${it("(Increasing)")}</th><th>Giảm<br>${it("(Decreasing)")}</th><th>Tăng<br>${it("(Increasing)")}</th><th>Giảm<br>${it("(Decreasing)")}</th></tr></thead>
        <tbody>${rows}<tr><td colspan="6" class="l pgnote"><i><u>Ghi chú:</u> ${res.pass ? "Đạt yêu cầu kỹ thuật đo lường (Pass)." : "Không đạt yêu cầu kỹ thuật đo lường (Fail)."}</i></td></tr></tbody></table>
      <table class="csig two pgsig2"><tr><td><b>Người soát lại</b><br>${it("(Checked by)")}</td><td><b>Kiểm định viên</b><br>${it("(Verified by)")}</td></tr>
        <tr class="sp"><td></td><td></td></tr><tr><td><b>${esc(rec.sig.controller)}</b></td><td><b>${esc(rec.sig.inspector)}</b></td></tr></table></section>`;
  }

  /* ======================= QTG headers ======================= */
  function qHeader(st, variant) {
    const logo = st.showLogo ? `<img src="assets/logo2026.jpg" alt="">` : `<span class="nologo"></span>`;
    const L = st.certLines;
    const lines = variant === "pg"
      ? `<div>${esc(L[1])}</div><div class="b">${esc(st.labName)}</div><div>${esc(st.addrVN)}</div><div class="i">${esc(st.addrEN)}</div><div>${st.tel}</div>`
      : variant === "rtd"
        ? `<div class="b">${esc(L[1])} (${esc(String(st.companyTag).replace(/[()\s]/g, ""))})</div><div class="b">${esc(st.labName)}</div><div>${esc(st.addrVN)}</div><div class="i">${esc(st.addrEN)}</div><div>${st.tel}</div>`
        : `<div>${esc(L[0])}</div><div class="b">${esc(L[1])} <span class="red">${esc(st.companyTag)}</span></div><div>${esc(st.addrVN)}</div><div class="i">${esc(st.addrEN)}</div><div>${st.tel}</div>`;
    return `<div class="qhdr">${logo}<div class="t">${lines}</div></div>`;
  }
  function qTitle(no, form, pg) {
    return `<h1 class="q">${pg ? "BIÊN BẢN KIỂM ĐỊNH" : "BIÊN BẢN HIỆU CHUẨN"}</h1><div class="sub"><b><i>${pg ? "(Verification Report)" : "(Calibration Report)"}</i></b></div>
      <div class="no">Số ${it("(N<sup>o</sup>)")}: ${esc(no)}</div><div class="formcode">${it(esc(form))}</div>`;
  }
  const envRow = (h, S0, cols) => `<tr><td colspan="${cols[0]}" class="c">${cb(h.envOk)} Nhiệt độ ${it("(Ambient Temp.)")}: ${esc(S0.qtgTemp)}</td><td colspan="${cols[1]}" class="c">${cb(h.envOk)} Độ ẩm ${it("(Humidity)")}: ${esc(S0.qtgHum)}</td></tr>`;
  const place = (h, L) => L.locVN || L.code;   // NGOC 06/11/2026: bỏ ô "Địa điểm thực hiện", QTG in đúng Công trình khí (Location)

  /* ======================= QTG – PG ======================= */
  function pgQtg(rec, res, st, info) {
    const h = rec.h, S0 = S(st, "PG"), L = info.loc || {}, cal = toDate(h.calDate), u = esc(h.unit), sd = stdDec(info), rd = resDec(h);
    const ef = String(h.errFactor || "0.8");
    const red = res.red;
    const tbl = `<table class="dot q4"><colgroup><col style="width:9%"><col style="width:44%"><col style="width:47%"></colgroup>
      <tr><td colspan="3">Tên phương tiện đo ${it("(Dut)")}: Áp kế kiểu lò xo ${it("(Pressure gauge)")}</td></tr>
      <tr><td colspan="2">Kiểu ${it("(Type)")}: ${esc(h.model)}</td><td>Số ${it("(Tag No/Serial No)")}: ${esc(h.tag)}${h.serial && h.serial !== "N/A" ? ` / ${esc(h.serial)}` : ""}</td></tr>
      <tr><td colspan="2">Cơ sở sản xuất ${it("(Manufacturer)")}: ${esc(h.maker)}</td><td>Năm sản xuất ${it("(Manufacture Year)")}: ${esc(h.mfgYear || "N/A")}</td></tr>
      <tr><td colspan="2">Đặc trưng kỹ thuật ${it("(Specification)")}</td><td>Phạm vi đo ${it("(Range)")}: (${esc(h.min)} ÷ ${esc(h.max)}) ${u}</td></tr>
      <tr><td></td><td>Vạch chia ${it("(Scale Interval)")}: ${esc(h.scale)} ${u}</td><td>Độ chính xác ${it("(Accuracy)")}: ±${esc(h.acc)}%FS</td></tr>
      <tr><td></td><td>Độ phân giải ${it("(Division)")}: ${esc(h.res)} ${u}</td><td>Hệ số sai số ${it("(Error factor)")}: 0.8 ${cb(ef === "0.8")} &nbsp; 1.0 ${cb(ef === "1.0")}</td></tr>
      <tr><td colspan="2">Phương pháp thực hiện ${it("(Method)")}:</td><td>${esc(h.procedure)}</td></tr>
      <tr><td colspan="3">Cơ sở sử dụng ${it("(Customer)")}: ${esc(L.custVN)}</td></tr>
      <tr><td colspan="2">Điều kiện môi trường ${it("(Environment)")}:</td><td></td></tr>
      ${envRow(h, S0, [2, 1])}
      <tr><td colspan="3">Chênh lệch chiều cao ${it("(Height Difference)")}: ${esc(h.heightDiff || "0")} mm</td></tr>
      <tr><td colspan="3">Người thực hiện ${it("(Verified by)")}: ${esc(rec.sig.inspector)}</td></tr>
      <tr><td colspan="3">Ngày thực hiện ${it("(Verification Date)")}: ${dVN(cal)}</td></tr>
      <tr><td colspan="3">Địa điểm thực hiện ${it("(Place)")}: ${esc(L.locVN || L.code)}</td></tr>
      <tr><td colspan="3"><b>Số liệu và kết quả ${it("(Result)")}:</b></td></tr>
      <tr><td colspan="2">Kiểm tra bên ngoài ${it("(External Check)")}:</td><td>Đạt yêu cầu ${it("(Pass)")}: ${cb(h.extCheck === "1")} <span class="gap"></span> Không đạt yêu cầu ${it("(Fail)")}: ${cb(h.extCheck !== "1")}</td></tr>
      <tr><td colspan="2">Kiểm tra kỹ thuật ${it("(Technical Check)")}:</td><td>Đạt yêu cầu ${it("(Pass)")}: ${cb(h.techCheck === "1")} <span class="gap"></span> Không đạt yêu cầu ${it("(Fail)")}: ${cb(h.techCheck !== "1")}</td></tr></table>`;
    const redT = `<table class="dot pgred"><tr><td colspan="4">Sụt áp của thiết bị chuẩn ${it("(Pressure reduction of standard)")}:</td></tr>
      <tr class="c"><td>Áp suất kiểm tra<br>${it("(Before- pressure)")}</td><td>Áp suất sau<br>${it("(After-Pressure)")}</td><td>Độ sụt áp<br>${it("(Reduction <5%)")}</td><td>Kết luận<br>${it("(Conclusion)")}</td></tr>
      <tr class="c"><td>${esc(rec.pg.before)} ${rec.pg.before !== "" ? u : ""}</td><td>${esc(rec.pg.after)} ${rec.pg.after !== "" ? u : ""}</td><td>${red ? `${vn(red.d, decimalsOf([rec.pg.before, rec.pg.after]))} ${u} (${vn(red.pct, red.pct === 0 ? 0 : 2)}%)` : ""}</td><td>${red ? (red.ok ? "Đạt" : "Không đạt") : ""}</td></tr>
      <tr><td colspan="4">Kết quả kiểm định:</td></tr></table>`;
    const data = `<table class="res qres pgq"><thead><tr><th rowspan="2">TT<br>${it("(N<sup>o</sup>)")}</th><th rowspan="2">Áp suất chuẩn<br>${it("(Standard Pressure)")}<br><br>${u}</th><th colspan="2">Giá trị đọc trên thiết bị ${it("(Actual indicating value)")}<br>${u}</th><th rowspan="2">Ghi chú ${it("(Remark)")}</th></tr>
      <tr><th>Tăng ${it("(Increasing)")}</th><th>Giảm ${it("(Decreasing)")}</th></tr></thead><tbody>
      ${res.rows.map((r, i) => `<tr><td>${p2(i + 1)}</td><td>${vn(r.x, sd)}</td><td>${vn(r.rise, rd)}</td><td>${vn(r.fall, rd)}</td><td></td></tr>`).join("")}</tbody></table>`;
    const kl = `<table class="pgkl"><tr><td><b>Kết luận ${it("(Conclusion)")}:</b></td><td>Đạt yêu cầu kỹ thuật đo lường ${it("(Pass)")}: ${cb(res.pass)}<br>Không đạt yêu cầu kỹ thuật đo lường ${it("(Fail)")}: ${cb(!res.pass)}</td></tr></table>`;
    return `<section class="a4 qtg pgqtg">${wmImg}${draft(info)}${qHeader(st, "pg")}${qTitle(bbNo(rec, st), S0.qtgForm, true)}
      ${tbl}${redT}${data}${kl}
      <table class="qsig"><tr><td><b>Người soát lại</b><br>${it("(Checked by)")}</td><td><b>Người thực hiện</b><br>${it("(Verified by)")}</td></tr>
        <tr class="sp"><td></td><td></td></tr><tr><td><b>${esc(rec.sig.controller)}</b></td><td><b>${esc(rec.sig.inspector)}</b></td></tr></table></section>`;
  }

  /* ======================= QTG – TS ======================= */
  function tsQtg(rec, res, st, info) {
    const h = rec.h, S0 = S(st, "TS"), L = info.loc || {}, cal = toDate(h.calDate), s1 = info.stand1, hs = info.heat || s1;
    const rising = h.dirQTG !== "Falling", mpe = num(h.acc) * num(h.tset) / 100;
    const pd = clampDec([...rec.ts.set, ...rec.ts.reset], 1, 3);
    const tbl = `<table class="dot q4"><colgroup><col style="width:8%"><col style="width:45%"><col style="width:47%"></colgroup>
      <tr><td colspan="3">Tên đối tượng ${it("(Object)")}: ${DESC.TS[0]} ${it(`(${DESC.TS[1]})`)}</td></tr>
      <tr><td colspan="2">Kiểu ${it("(Type)")}: ${esc(h.model)}</td><td>Mã quản lý ${it("(Tag No)")}: ${esc(h.tag)}</td></tr>
      <tr><td colspan="2">Cơ sở sản xuất ${it("(Manufacturer)")}: ${esc(h.maker)}</td><td>Số hiệu ${it("(Serial No.)")}: ${esc(h.serial || "N/A")}</td></tr>
      <tr><td colspan="3">Đặc trưng kỹ thuật ${it("(Specification)")}</td></tr>
      <tr><td></td><td>Dải làm việc ${it("(Calib Range)")}: (${esc(h.min)} ÷ ${esc(h.max)}) ${deg}</td><td>Nhiệt độ đặt ${it("(Set point)")}: ${esc(h.tset)} ${deg}</td></tr>
      <tr><td></td><td>Độ chính xác ${it("(Accuracy)")}: ±${esc(h.acc)}%Tset</td><td>Sai số cho phép ${it("(MPE)")}: ±${isFinite(mpe) ? vn(mpe, decimalsOf([C.xround(mpe, 4)])) : ""} ${deg}</td></tr>
      <tr><td></td><td>Chế độ làm việc ${it("(Operating mode)")}:</td><td>${cb(h.micro === "NO")} Thường mở ${it("(NO)")} <span class="gap"></span> ${cb(h.micro === "NC")} Thường đóng ${it("(NC)")}</td></tr>
      <tr><td></td><td></td><td>${cb(rising)} Chiều tăng ${it("(Rising)")} <span class="gap"></span> ${cb(!rising)} Chiều giảm ${it("(Falling)")}</td></tr>
      <tr><td colspan="3">Cơ sở sử dụng ${it("(Customer)")}: ${esc(L.custVN)}</td></tr>
      <tr><td colspan="2">Phương pháp thực hiện ${it("(Method)")}:</td><td>${esc(h.procedure)}</td></tr>
      <tr><td colspan="3">Thiết bị tạo nhiệt độ và chỉ thị ${it("(Standard device)")}:</td></tr>
      <tr><td></td><td>Kiểu ${it("(Model)")}: ${esc(s1 ? s1.model : "")}</td><td>Số hiệu ${it("(Serial No.)")}: ${esc(s1 ? `${s1.maker} ${s1.model} (${s1.serial})` : "")}</td></tr>
      <tr><td></td><td>Phạm vi đo ${it("(Range)")}: ${s1 ? `(${s1.min}÷${s1.max}) ${deg}` : ""}</td><td>Độ chính xác ${it("(Accuracy)")}: ${esc(s1 ? s1.accuracy : "")}</td></tr>
      <tr><td colspan="3">Điều kiện môi trường ${it("(Environment)")}:</td></tr>
      ${envRow(h, S0, [2, 1])}
      <tr><td colspan="3">Ngày thực hiện ${it("(Calib. Date)")}: ${dVN(cal)}</td></tr>
      <tr><td colspan="3">Địa điểm thực hiện ${it("(Location)")}: ${esc(place(h, L))}</td></tr>
      <tr><td colspan="3">Kết quả ${it("(Result)")}</td></tr></table>`;
    const fill = (on, i) => on ? `<td>${vn(num(rec.ts.set[i]), pd)}</td><td>${vn(num(rec.ts.reset[i]), pd)}</td><td>${vn(num(rec.ts.set[i]) - num(h.tset), pd)}</td>` : `<td></td><td></td><td></td>`;
    const asF = h.psType !== "As Left";
    const data = `<table class="res qres tsq"><thead><tr><th rowspan="2">TT<br>${it("(N<sup>o</sup>)")}</th><th rowspan="2">Nhiệt độ đặt<br>${it("(Set point)")}<br>${deg}</th><th colspan="3">Giá trị trước hiệu chuẩn<br>${it("(As found data)")}<br>${deg}</th><th colspan="3">Giá trị sau hiệu chuẩn<br>${it("(As left data)")}<br>${deg}</th></tr>
      <tr><th>Nhiệt độ tác động<br>${it("(Set-temp)")}</th><th>Nhiệt độ trả lại<br>${it("(Reset-temp)")}</th><th>Sai số<br>${it("(Error)")}</th><th>Nhiệt độ tác động<br>${it("(Set-temp)")}</th><th>Nhiệt độ trả lại<br>${it("(Reset-temp)")}</th><th>Sai số<br>${it("(Error)")}</th></tr></thead><tbody>
      ${rec.ts.set.map((_, i) => `<tr><td>${p2(i + 1)}</td>${i === 0 ? `<td rowspan="5">${esc(h.tset)}</td>` : ""}${fill(asF, i)}${fill(!asF, i)}</tr>`).join("")}</tbody></table>`;
    return `<section class="a4 qtg">${wmImg}${draft(info)}${qHeader(st, "")}${qTitle(bbNo(rec, st), S0.qtgForm)}${tbl}${data}${qtgSig(rec)}</section>`;
  }

  /* ======================= QTG – TT ======================= */
  function ttQtg(rec, res, st, info) {
    const h = rec.h, S0 = S(st, "TT"), L = info.loc || {}, cal = toDate(h.calDate);
    const t = [info.stand1, info.stand2].filter(Boolean), am = info.stand3;
    const mpe = num(h.acc) * 16 / 100;
    const j = f => t.map(f).join("; ");
    const tbl = `<table class="dot q4"><colgroup><col style="width:6%"><col style="width:6%"><col style="width:41%"><col style="width:47%"></colgroup>
      <tr><td colspan="4">Tên phương tiện đo ${it("(Object)")}: ${DESC.TT[0]} ${it(`(${DESC.TT[1]})`)}</td></tr>
      <tr><td colspan="3">Kiểu ${it("(Type)")}: ${esc(h.model)}</td><td>Mã QL ${it("(Tag No)")}: ${esc(h.tag)}</td></tr>
      <tr><td colspan="3">Cơ sở sản xuất ${it("(Manufacturer)")}: ${esc(h.maker)}</td><td>Số ${it("(Serial No.)")}: ${esc(h.serial || "N/A")}</td></tr>
      <tr><td colspan="3">Đặc trưng kỹ thuật ${it("(Specification)")}</td><td>Phạm vi đo ${it("(Range)")}: (${esc(h.min)} ÷ ${esc(h.max)}) ${deg}</td></tr>
      <tr><td></td><td colspan="2">Sai số cho phép ${it("(MPE)")}: ${isFinite(mpe) ? vn(mpe, Math.max(2, decimalsOf([C.xround(mpe, 4)]))) : ""} mA</td><td>Độ chính xác ${it("(Accuracy)")}: ± ${esc(h.acc)}%</td></tr>
      <tr><td colspan="3">Cơ sở sử dụng ${it("(Customer)")}: ${esc(L.custVN)}</td><td>Địa điểm lắp đặt ${it("(Location)")}: ${esc(L.code || L.locVN)}</td></tr>
      <tr><td colspan="3">Phương pháp thực hiện ${it("(Method)")}:</td><td>${esc(h.procedure)}</td></tr>
      <tr><td colspan="4">Tổ hợp chuẩn ${it("(Calibrator Information)")}:</td></tr>
      <tr><td></td><td colspan="3">Thiết bị tạo nhiệt độ và chỉ thị ${it("(Heat source and indicator)")}:</td></tr>
      <tr><td></td><td></td><td>Kiểu ${it("(Model)")}: ${esc(j(s => (/^\d+$/.test(s.model) ? `${s.maker} ${s.model}` : s.model)))}</td><td>Số hiệu ${it("(Serial No)")}: ${esc(t.map(s => s.serial).filter((x, i, a) => a.indexOf(x) === i).join("/ "))}</td></tr>
      <tr><td></td><td></td><td>Phạm vi đo ${it("(Range)")}: ${esc(j(s => `(${s.min}÷${s.max})°C`))}</td><td>Độ chính xác ${it("(Accuracy)")}: ${esc(j(s => s.accuracy || ""))}</td></tr>
      <tr><td></td><td colspan="3">Ampe kế ${it("(Ammeter)")}:</td></tr>
      <tr><td></td><td></td><td>Kiểu ${it("(Model)")}: ${esc(qModel(am))}</td><td>Số hiệu ${it("(Serial No)")}: ${esc(am ? am.serial : "")}</td></tr>
      <tr><td></td><td></td><td>Phạm vi đo ${it("(Range)")}: ${am ? `(${am.min}÷${am.certRange || am.max}) mA` : ""}</td><td>Độ chính xác ${it("(Accuracy)")}: ${esc(am ? am.accuracy : "")}</td></tr>
      <tr><td colspan="4">Điều kiện môi trường ${it("(Environment)")}</td></tr>
      ${envRow(h, S0, [3, 1])}
      <tr><td colspan="4">Ngày thực hiện ${it("(Calib. Date)")}: ${dVN(cal)}</td></tr>
      <tr><td colspan="4">Địa điểm thực hiện ${it("(Location)")}: ${esc(place(h, L))}</td></tr>
      <tr><td colspan="3">Kết quả đo ${it("(Result)")}:</td><td>${cb(h.psType !== "As Left")} As found <span class="gap"></span> ${cb(h.psType === "As Left")} As left</td></tr></table>`;
    const ord = ["1<sup>st</sup>", "2<sup>nd</sup>", "3<sup>rd</sup>"];
    const dS = clampDec(rec.tt.sr.flat().concat(rec.tt.sf.flat()), 3, 3), dD = clampDec(rec.tt.dr.flat().concat(rec.tt.df.flat()), 3, 3);
    const body = rec.tt.sr.map((_, p) => [0, 1, 2].map(k => `<tr>${k === 0 ? `<td rowspan="3">${esc(rec.tt.nom[p])}</td>` : ""}<td>${ord[k]}</td><td>${vn(num(rec.tt.sr[p][k]), dS)}</td><td>${vn(num(rec.tt.sf[p][k]), dS)}</td><td>${vn(num(rec.tt.dr[p][k]), dD)}</td><td>${vn(num(rec.tt.df[p][k]), dD)}</td></tr>`).join("")).join("");
    const data = `<table class="res qres ttq"><thead><tr><th rowspan="2">Điểm HC<br>${it("(Calib Point)")}</th><th rowspan="2">Lần đọc<br>${it("(read)")}</th><th colspan="2">Nhiệt độ Chuẩn<br>${it("(Standard)")}/${deg}</th><th colspan="2">Thiết bị cần hiệu chuẩn ${it("(DUT)")}/ mA</th></tr>
      <tr><th>Chiều tăng<br>${it("(Increasing)")}</th><th>Chiều giảm<br>${it("(Decreasing)")}</th><th>Chiều tăng<br>${it("(Increasing)")}</th><th>Chiều giảm<br>${it("(Decreasing)")}</th></tr></thead><tbody>${body}</tbody></table>`;
    return `<section class="a4 qtg ttqtg">${wmImg}${draft(info)}${qHeader(st, "")}${qTitle(bbNo(rec, st), S0.qtgForm)}${tbl}${data}${qtgSig(rec)}</section>`;
  }

  /* ======================= QTG – TG (ĐLVN 138:2004.PL3) ======================= */
  // decimals of the DUT readings: 1, or more when the smallest division needs it (1,25 °C -> 2)
  const tgDec = h => Math.max(1, decimalsOf([num(h.res)]));
  function tgQtg(rec, res, st, info) {
    const h = rec.h, S0 = S(st, "TG"), L = info.loc || {}, cal = toDate(h.calDate);
    const t = [info.stand1, info.stand2].filter(Boolean).filter((s, i, a) => a.indexOf(s) === i);
    const j = f => t.map(f).join("; ");
    const tbl = `<table class="dot q4"><colgroup><col style="width:6%"><col style="width:6%"><col style="width:41%"><col style="width:47%"></colgroup>
      <tr><td colspan="4">Tên phương tiện đo ${it("(Dut)")}: Thiết bị chỉ thị nhiệt độ ${it("(Digital and Analog Temperature Indicators)")}</td></tr>
      <tr><td colspan="3">Kiểu ${it("(Type)")}: ${esc(h.model || "N/A")}</td><td>Số ${it("(Tag No)")}: ${esc(h.tag)}</td></tr>
      <tr><td colspan="3">Cơ sở sản xuất ${it("(Manufacturer)")}: ${esc(h.maker)}</td><td>Năm sản xuất ${it("(Manufacture Year)")}: ${esc(h.mfgYear || "")}</td></tr>
      <tr><td colspan="4">Đặc trưng kỹ thuật ${it("(Specification)")}</td></tr>
      <tr><td></td><td colspan="2">Phạm vi đo ${it("(Range)")}: (${esc(h.min)}÷${esc(h.max)})${deg}</td><td>Vạch chia ${it("(Scale Interval)")}: ${vnTxt(h.scale)}${deg}</td></tr>
      <tr><td></td><td colspan="2">Độ chính xác ${it("(Accuracy)")}: ±${vnTxt(h.acc)}%FS</td><td>Độ chia nhỏ nhất ${it("(Division)")}: ${vnTxt(h.res)}${deg}</td></tr>
      <tr><td colspan="4">Cơ sở sử dụng ${it("(Customer)")}: ${esc(L.custVN)}</td></tr>
      <tr><td colspan="3">Phương pháp thực hiện ${it("(Method)")}:</td><td>${esc(h.procedure)}</td></tr>
      <tr><td colspan="4">Chuẩn, thiết bị chính sử dụng ${it("(Standard set)")}:</td></tr>
      <tr><td></td><td colspan="2">Kiểu ${it("(Model)")}: ${esc(j(s => s.model))}</td><td></td></tr>
      <tr><td></td><td colspan="2">Số hiệu ${it("(Serial No.)")}: ${esc(j(s => s.serial))}</td><td>Độ chính xác ${it("(Accuracy)")}: ${esc(j(s => vnTxt(s.accuracy || "")))}</td></tr>
      <tr><td></td><td colspan="2">Phạm vi đo ${it("(Range)")}: ${esc(j(s => `(${s.min} ÷ ${s.max})°C`))}</td><td>Độ phân giải ${it("(Definition)")}: ${esc(j(s => vnTxt(String(s.res || "").replace("°C", "oC"))))}</td></tr>
      <tr><td colspan="4">Điều kiện môi trường ${it("(Environment)")}</td></tr>
      ${envRow(h, S0, [3, 1])}
      <tr><td colspan="4">Người thực hiện ${it("(Calibrated by)")}: ${esc(rec.sig.inspector)}</td></tr>
      <tr><td colspan="4">Ngày thực hiện ${it("(Calib. Date)")}: ${dVN(cal)}</td></tr>
      <tr><td colspan="4">Địa điểm thực hiện ${it("(Location)")}: ${esc(L.locVN || L.code)}</td></tr>
      <tr><td colspan="3">Số liệu và kết quả ${it("(Result)")}:</td><td>${cb(h.psType !== "As Left")} AsFound <span class="gap"></span> ${cb(h.psType === "As Left")} AsLeft</td></tr></table>`;
    const ord = ["1<sup>st</sup>", "2<sup>nd</sup>", "3<sup>rd</sup>"], dd = tgDec(h);
    const body = rec.tg.sr.map((_, p) => [0, 1, 2].map(k => `<tr>${k === 0 ? `<td rowspan="3">${vn(num(rec.tg.nom[p]), 3)}</td>` : ""}<td>${ord[k]}</td><td>${vn(num(rec.tg.sr[p][k]), 3)}</td><td>${vn(num(rec.tg.sf[p][k]), 3)}</td><td>${vn(num(rec.tg.dr[p][k]), dd)}</td><td>${vn(num(rec.tg.df[p][k]), dd)}</td></tr>`).join("")).join("");
    const data = `<table class="res qres ttq"><thead><tr><th rowspan="2">Điểm HC<br>${it("(Calib Point)")}</th><th rowspan="2">Lần đọc<br>${it("(read)")}</th><th colspan="2">Nhiệt độ Chuẩn ${it("(Standard)")}/ ${deg}</th><th colspan="2">Phương tiện đo ${it("(Dut)")}/ ${deg}</th></tr>
      <tr><th>Chiều tăng<br>${it("(Increasing)")}</th><th>Chiều giảm<br>${it("(Decreasing)")}</th><th>Chiều tăng<br>${it("(Increasing)")}</th><th>Chiều giảm<br>${it("(Decreasing)")}</th></tr></thead><tbody>${body}</tbody></table>`;
    return `<section class="a4 qtg ttqtg">${wmImg}${draft(info)}${qHeader(st, "")}${qTitle(bbNo(rec, st), S0.qtgForm)}${tbl}${data}${qtgSig(rec)}</section>`;
  }

  /* ======================= QTG – RTD ======================= */
  const RTDLBL = ["01", "02", "03 (tg)", "04", "05", "t<sub>g</sub><br>(lần 2)"];
  function rtdQtg(rec, res, st, info) {
    const h = rec.h, S0 = S(st, "RTD"), L = info.loc || {}, cal = toDate(h.calDate), mt = info.stand3, hs = [info.stand1, info.stand2].filter(Boolean);
    const tbl = `<table class="dot q4"><colgroup><col style="width:8%"><col style="width:45%"><col style="width:47%"></colgroup>
      <tr><td colspan="3">Tên phương tiện đo ${it("(Object)")}: Nhiệt kế điện trở công nghiệp ${it("(Industrial Platinum Resistance Thermometers)")}</td></tr>
      <tr><td colspan="2">Kiểu ${it("(Type)")}: ${esc(h.model)}</td><td>Số ${it("(Tag No)")}: ${esc(h.tag)}${h.serial && h.serial !== "N/A" ? ` / ${esc(h.serial)}` : ""}</td></tr>
      <tr><td colspan="2">Cơ sở sản xuất ${it("(Manufacturer)")}: ${esc(h.maker)}</td><td>Năm sản xuất ${it("(Manufacture Year)")}: ${esc(h.mfgYear || "")}</td></tr>
      <tr><td colspan="2">Đặc trưng kỹ thuật ${it("(Specification)")}</td><td>Phạm vi đo ${it("(Range)")}: (${esc(h.min)} ÷ ${esc(h.max)}) ${deg}</td></tr>
      <tr><td colspan="2"></td><td>Độ chính xác ${it("(Accuracy)")}: ±${esc(h.acc)}%FS</td></tr>
      <tr><td colspan="3">Cơ sở sử dụng ${it("(Customer)")}: ${esc(L.custVN)}</td></tr>
      <tr><td colspan="2">Phương pháp thực hiện ${it("(Method)")}:</td><td>${esc(h.procedure)}</td></tr>
      <tr><td colspan="2">Chuẩn, thiết bị chính được sử dụng ${it("(Standard set)")}:</td><td>${esc(mt ? mt.name : "")}${hs.length ? " + Metrology Well" : ""}</td></tr>
      <tr><td></td><td>Kiểu ${it("(Model)")}: ${esc(qModel(mt))}</td><td>Số hiệu ${it("(Serial No.)")}: ${esc(mt ? mt.serial : "")}</td></tr>
      <tr><td></td><td>Phạm vi đo ${it("(Range)")}: ${mt ? `(${mt.min} ÷ ${mt.max}) Ω` : ""}</td><td>Độ chính xác ${it("(Accuracy)")}: ${esc(mt ? mt.accuracy : "")}</td></tr>
      <tr><td colspan="2"></td><td>Độ phân giải ${it("(Definition)")}: ${esc(mt ? mt.res : "")}</td></tr>
      <tr><td colspan="3">Thiết bị tạo nhiệt độ ${it("(Heat source)")}: ${esc(hs.map(s => `${s.heat || `${s.maker} ${s.model}`} (${s.serial})`).join(" / "))}</td></tr>
      <tr><td colspan="3">Điều kiện môi trường ${it("(Environment)")}</td></tr>
      ${envRow(h, S0, [2, 1])}
      <tr><td colspan="3">Người thực hiện ${it("(Calibrated by)")}: ${esc(rec.sig.inspector)}</td></tr>
      <tr><td colspan="3">Ngày thực hiện ${it("(Calib. Date)")}: ${dVN(cal)}</td></tr>
      <tr><td colspan="3">Địa điểm thực hiện ${it("(Location)")}: ${esc(place(h, L))}</td></tr>
      <tr><td colspan="3">Số liệu và kết quả ${it("(Result)")}:</td></tr>
      <tr><td colspan="3">+ Kiểm tra điện trở cách điện ${it("(Insulation resistance)")}: ${esc(h.insul || "")} ${h.insul ? "MΩ" : ""}</td></tr>
      <tr><td colspan="2">+ Kiểm tra đo lường ${it("(Measured value)")}:</td><td>${cb(h.psType !== "As Left")} AsFound <span class="gap"></span> ${cb(h.psType === "As Left")} AsLeft</td></tr></table>`;
    const dS = clampDec(rec.rtd.std, 3, 3), dD = clampDec(rec.rtd.dut.flat(), 2, 3);
    const body = rec.rtd.std.map((s, i) => `<tr><td>${RTDLBL[i]}</td><td>${vn(num(s), dS)}</td>${rec.rtd.dut[i].map(v => `<td>${vn(num(v), dD)}</td>`).join("")}</tr>`).join("");
    const rd = ["1<sup>st</sup>", "2<sup>nd</sup>", "3<sup>rd</sup>", "4<sup>th</sup>", "5<sup>th</sup>"];
    const data = `<table class="res qres rtq"><thead><tr><th rowspan="2">TT<br>${it("(N<sup>o</sup>)")}</th><th rowspan="2">Nhiệt độ Chuẩn<br>${it("(Standard Temp)")}<br>${deg}</th><th colspan="5">Kết quả đọc thiết bị hiệu chuẩn ${it("(Measured Value)")} (Ω)</th></tr>
      <tr>${rd.map(x => `<th>Lần đọc<br>${it(`(Read) ${x}`)}</th>`).join("")}</tr></thead><tbody>${body}</tbody></table>`;
    return `<section class="a4 qtg">${wmImg}${draft(info)}${qHeader(st, "rtd")}${qTitle(bbNo(rec, st), S0.qtgForm)}${tbl}${data}${qtgSig(rec)}</section>`;
  }

  /* ======================= QTG – TC (ĐLVN 161:2005.PL2) ======================= */
  function tcQtg(rec, res, st, info) {
    const h = rec.h, S0 = S(st, "TC"), L = info.loc || {}, cal = toDate(h.calDate), mv = info.stand3;
    const t = [info.stand1, info.stand2, mv].filter(Boolean).filter((s, i, a) => a.indexOf(s) === i), j = f => t.map(f).join("; ");
    const rng = s => `(${s.min}÷${s.max}) ${s.unit}`;
    const tbl = `<table class="dot q4"><colgroup><col style="width:6%"><col style="width:6%"><col style="width:41%"><col style="width:47%"></colgroup>
      <tr><td colspan="4">Tên phương tiện đo ${it("(Dut)")}: Cặp nhiệt điện công nghiệp ${it("(Industrial Thermocouples)")}</td></tr>
      <tr><td colspan="3">Kiểu ${it("(Model)")}: ${esc(h.model || "N/A")}</td><td>Số/tên ${it("(Tag)")}: ${esc(h.tag)}</td></tr>
      <tr><td colspan="3">Cơ sở sản xuất ${it("(Manufacturer)")}: ${esc(h.maker)}</td><td>Năm sản xuất ${it("(Manufacture Year)")}: ${esc(h.mfgYear || "N/A")}</td></tr>
      <tr><td colspan="4">Đặc trưng kỹ thuật ${it("(Specification)")}</td></tr>
      <tr><td></td><td colspan="2">Loại TC ${it("(type)")}: ${esc(h.tcType || "J")}</td><td>Phạm vi đo ${it("(Range)")}: (${esc(h.min)}÷${esc(h.max)})${deg}</td></tr>
      <tr><td></td><td colspan="2">Số seri ${it("(S/N)")}: ${esc(h.serial || "N/A")}</td><td>Độ chính xác ${it("(Accuracy)")}: ±${vnTxt(h.acc)}%FS</td></tr>
      <tr><td colspan="4">Cơ sở sử dụng ${it("(Customer)")}: ${esc(L.custVN)}</td></tr>
      <tr><td colspan="3">Phương pháp thực hiện ${it("(Method)")}:</td><td>${esc(h.procedure)}</td></tr>
      <tr><td colspan="4">Chuẩn, thiết bị chính sử dụng ${it("(Standard set)")}:</td></tr>
      <tr><td></td><td colspan="3">Thiết bị tạo nhiệt độ và chỉ thị ${it("(Heat source and indicator)")}:</td></tr>
      <tr><td></td><td></td><td>Kiểu ${it("(Model)")}: ${esc(j(s => s.model))}</td><td>Số hiệu ${it("(Serial No.)")}: ${esc(j(s => s.serial))}</td></tr>
      <tr><td></td><td></td><td>Phạm vi đo ${it("(Range)")}: ${esc(j(rng))}</td><td>Độ chính xác ${it("(Accuracy)")}: ${esc(j(s => s.accuracy || ""))}</td></tr>
      <tr><td></td><td colspan="3">Volt kế ${it("(Voltmeter)")}:</td></tr>
      <tr><td></td><td></td><td>Kiểu ${it("(Model)")}: ${esc(mv ? `${mv.maker} ${mv.model}` : "")}</td><td>Số hiệu ${it("(Serial No.)")}: ${esc(mv ? mv.serial : "")}</td></tr>
      <tr><td></td><td></td><td>Phạm vi đo ${it("(Range)")}: ${esc(mv ? rng(mv) : "")}</td><td>Độ chính xác ${it("(Accuracy)")}: ${esc(mv ? mv.accuracy || "" : "")}</td></tr>
      <tr><td colspan="4">Điều kiện môi trường ${it("(Environment)")}</td></tr>
      ${envRow(h, S0, [3, 1])}
      <tr><td colspan="4">Người thực hiện ${it("(Calibrated by)")}: ${esc(rec.sig.inspector)}</td></tr>
      <tr><td colspan="4">Ngày thực hiện ${it("(Calib. Date)")}: ${dEN(cal)}</td></tr>
      <tr><td colspan="4">Địa điểm thực hiện ${it("(Location)")}: ${esc(place(h, L))}</td></tr>
      <tr><td colspan="3">Số liệu và kết quả ${it("(Result)")}:</td><td>${cb(h.psType !== "As Left")} AsFound <span class="gap"></span> ${cb(h.psType === "As Left")} AsLeft</td></tr></table>`;
    const dD = clampDec(rec.tc.dut.flat(), 3, 3), dN = clampDec(rec.tc.nom, 0, 3);
    const body = rec.tc.nom.map((nm, i) => `<tr><td>${p2(i + 1)}</td><td>${vn(num(nm), dN)}</td>${rec.tc.dut[i].map(v => `<td>${vn(num(v), dD)}</td>`).join("")}</tr>`).join("");
    const rd = ["1<sup>st</sup>", "2<sup>nd</sup>", "3<sup>rd</sup>", "4<sup>th</sup>", "5<sup>th</sup>"];
    const data = `<table class="res qres rtq"><thead><tr><th rowspan="2">TT<br>${it("(N<sup>o</sup>)")}</th><th rowspan="2">Nhiệt độ Chuẩn<br>${it("(Standard Temp)")}<br>${deg}</th><th colspan="5">Kết quả đọc thiết bị hiệu chuẩn ${it("(Measured Voltage- mV)")}</th></tr>
      <tr>${rd.map(x => `<th>Lần đọc<br>${it(`(Read) ${x}`)}</th>`).join("")}</tr></thead><tbody>${body}</tbody></table>`;
    return `<section class="a4 qtg">${wmImg}${draft(info)}${qHeader(st, "rtd")}${qTitle(bbNo(rec, st), S0.qtgForm)}${tbl}${data}${qtgSig(rec)}</section>`;
  }

  /* ======================= QTG – DPG (DVK.LAB.TM22.PL03, chuyển từ bản scan BB.PG.26.0003) ======================= */
  function dpgQtg(rec, res, st, info) {
    const h = rec.h, S0 = S(st, "DPG"), L = info.loc || {}, cal = toDate(h.calDate), u = esc(h.unit), s1 = info.stand1, d = dpgDec(rec), red = res.red;
    const tbl = `<table class="dot q4"><colgroup><col style="width:9%"><col style="width:44%"><col style="width:47%"></colgroup>
      <tr><td colspan="3">Tên phương tiện đo ${it("(Object)")}: Đồng hồ áp suất ${it("(Pressure gauge)")}</td></tr>
      <tr><td colspan="2">Kiểu ${it("(Type)")}: ${esc(h.model || "N/A")}</td><td>Số ${it("(Tag No)")}: ${esc(h.tag)}${h.serial && h.serial !== "N/A" ? ` / ${esc(h.serial)}` : ""}</td></tr>
      <tr><td colspan="3">Cơ sở sản xuất ${it("(Manufacturer)")}: ${esc(h.maker)}</td></tr>
      <tr><td colspan="2">Đặc trưng kỹ thuật ${it("(Specification)")}</td><td>Phạm vi đo ${it("(Range)")}: (${esc(h.min)} ÷ ${esc(h.max)}) ${u}</td></tr>
      <tr><td></td><td>Vạch chia ${it("(Scale Interval)")}: ${esc(h.scale)} ${h.scale !== "" ? u : ""}</td><td>Độ phân giải ${it("(Definition)")}: ${esc(h.res)} ${h.res !== "" ? u : ""}</td></tr>
      <tr><td></td><td>Độ chính xác ${it("(Accuracy)")}: ±${vnTxt(h.acc)}%FS</td><td></td></tr>
      <tr><td colspan="3">Cơ sở sử dụng ${it("(Customer)")}: ${esc(L.custVN)}</td></tr>
      <tr><td colspan="2">Phương pháp thực hiện ${it("(Method)")}:</td><td>${esc(h.procedure)}</td></tr>
      <tr><td colspan="3">Chuẩn, thiết bị chính sử dụng ${it("(Calibrator Information)")}:</td></tr>
      <tr><td></td><td>Kiểu ${it("(Model)")}: ${esc(qModel(s1))}</td><td>Số hiệu ${it("(Serial No.)")}: ${esc(s1 ? s1.serial : "")}</td></tr>
      <tr><td></td><td>Phạm vi đo ${it("(Range)")}: ${s1 ? `(${s1.min} ÷ ${s1.max}) ${esc(s1.unit)}` : ""}</td><td>Độ chính xác ${it("(Accuracy)")}: ${esc(s1 ? s1.accuracy || "" : "")}</td></tr>
      <tr><td colspan="3">Điều kiện môi trường ${it("(Environment)")}</td></tr>
      ${envRow(h, S0, [2, 1])}
      <tr><td colspan="3">Ngày thực hiện ${it("(Calib. Date)")}: ${dVN(cal)}</td></tr>
      <tr><td colspan="3">Số liệu và kết quả ${it("(Result)")}:</td></tr></table>`;
    const redT = `<table class="dot pgred"><tr><td colspan="4">Sụt áp của thiết bị chuẩn ${it("(Pressure reduction of standard)")}:</td></tr>
      <tr class="c"><td>Áp suất kiểm tra<br>${it("(Before- pressure)")}</td><td>Áp suất sau<br>${it("(After-Pressure)")}</td><td>Độ sụt<br>${it("(Reduction)")}</td><td>Kết luận<br>${it("(Conclusion)")}</td></tr>
      <tr class="c"><td>${esc(rec.dpg.before)} ${rec.dpg.before !== "" ? u : ""}</td><td>${esc(rec.dpg.after)} ${rec.dpg.after !== "" ? u : ""}</td><td>${red ? `${vn(red.pct, red.pct === 0 ? 0 : 2)}%` : ""}</td><td>${red ? (red.ok ? "Đạt" : "Không đạt") : ""}</td></tr>
      <tr><td colspan="2">Kết quả hiệu chuẩn ${it("(Calib. Result)")}:</td><td colspan="2">${cb(h.psType !== "As Left")} AsFound <span class="gap"></span> ${cb(h.psType === "As Left")} AsLeft</td></tr></table>`;
    const data = `<table class="res qres pgq"><thead><tr><th rowspan="2">TT<br>${it("(N<sup>o</sup>)")}</th><th rowspan="2">Áp suất chuẩn<br>${it("(Standard Pressure)")}<br>${u}</th><th colspan="2">Giá trị đọc trên thiết bị ${it("(Measured value)")}<br>${u}</th><th colspan="2">Sai số ${it("(Error)")}<br>${u}</th></tr>
      <tr><th>Tăng ${it("(Increasing)")}</th><th>Giảm ${it("(Decreasing)")}</th><th>Tăng ${it("(Increasing)")}</th><th>Giảm ${it("(Decreasing)")}</th></tr></thead><tbody>
      ${res.rows.map((r, i) => `<tr><td>${p2(i + 1)}</td><td>${vn(r.x, d.s)}</td><td>${vn(r.rise, d.r)}</td><td>${vn(r.fall, d.r)}</td><td>${vn(r.rise - r.x, d.r)}</td><td>${vn(r.fall - r.x, d.r)}</td></tr>`).join("")}</tbody></table>`;
    return `<section class="a4 qtg pgqtg">${wmImg}${draft(info)}${qHeader(st, "rtd")}${qTitle(bbNo(rec, st), S0.qtgForm)}
      ${tbl}${redT}${data}
      <table class="qsig"><tr><td><b>Người soát lại</b><br>${it("(Checked by)")}</td><td><b>Người thực hiện</b><br>${it("(Calibrated by)")}</td></tr>
        <tr class="sp"><td></td><td></td></tr><tr><td><b>${esc(rec.sig.controller)}</b></td><td><b>${esc(rec.sig.inspector)}</b></td></tr></table></section>`;
  }

  /* ======================= UNCERTAINTY / CHECK sheets ======================= */
  function r3(ref, lab, val, unit = "") {
    const mono = /^[-+]?[\d.]+(e[-+]?\d+)?$/i.test(String(val).replace(/<[^>]+>/g, ""));
    return `<tr><td class="ref">${ref}</td><td>${lab}</td>${unit ? `<td class="${mono ? "num" : "txt"}">${val}</td><td>${unit}</td>` : `<td class="${mono ? "num" : "txt"}" colspan="2">${val}</td>`}</tr>`;
  }
  const uWrapR = (res, rec, st, info, title, sub, body, src) => uWrap(rec, st, info, title, sub, body, src, res);
  function uWrap(rec, st, info, title, sub, body, src, res) {
    const h = rec.h;
    return `<section class="a4 unc">${draft(info)}
      <div class="uhead"><div><b>${title}</b><br>No.: ${esc(rec.certNo)} · Tag: <b>${esc(h.tag)}</b> · ${dVN(toDate(h.calDate))}<br>${it(sub)}</div><div class="fc">${esc(S(st, rec.type).form || "")}</div></div>
      ${body}${D.fvBox(rec.type, res)}
      <table class="qsig u"><tr><td><b>Người kiểm tra</b><br>${it("(Quality Checker)")}</td><td><b>Người thực hiện</b><br>${it("(Calibrated by)")}</td></tr>
        <tr class="sp"><td></td><td></td></tr><tr><td><b>${esc(rec.sig.controller)}</b></td><td><b>${esc(rec.sig.inspector)}</b></td></tr></table>
      <div class="ufoot">${res && res.fv === 2 ? "Gốc: " + src + " Bản công thức đã sửa 06/11/2026 khác file Excel ở các điểm nêu trên." : src}</div></section>`;
  }
  const verdict = p => `<b>${p ? "Đạt (Pass)" : "Không đạt (Fail)"}</b>`;

  function pgUnc(rec, res, st, info) {
    const h = rec.h, u = esc(h.unit), s1 = info.stand1;
    const inp = `<div class="ucols"><table class="ukv">
        ${r3("H", "Tag", esc(h.tag))}${r3("K / L", "Phạm vi đo", `${esc(h.min)} ÷ ${esc(h.max)}`, u)}${r3("F", "Độ chính xác", esc(h.acc), "%FS")}
        ${r3("AG / O", "Vạch chia / Độ phân giải", `${esc(h.scale)} / ${esc(h.res)}`, u)}${r3("P", "Chuẩn sử dụng", esc(s1 ? s1.key : ""))}
      </table><table class="ukv">
        ${r3("EX", "Sai số cho phép = F·(L−K)/100", g(res.lim, 6), u)}${r3("EY", "Max |số hiệu chính|", g(res.maxSHC, 6), u)}
        ${r3("EV", "Kết luận (EY > EX → Fail)", verdict(res.pass))}${r3("", "Hệ số sai số trên QTG (Data08 không dùng)", esc(h.errFactor || "0.8"))}
        ${r3("", "Hạn chuẩn", esc(s1 ? s1.due || "?" : "?"))}
      </table></div>`;
    const out = `<table class="res ug"><thead><tr><th>Điểm</th><th>Chuẩn (AI..AM)</th><th>Tăng (AN..AR)</th><th>Giảm (AS..AW)</th><th>SHC tăng = chuẩn − tăng</th><th>SHC giảm = chuẩn − giảm</th><th>|SHC| / sai số cho phép</th></tr></thead><tbody>
      ${res.rows.map((r, i) => { const q = Math.max(Math.abs(r.cR), Math.abs(r.cF)) / res.lim; return `<tr><td>${i + 1}</td><td>${f2(r.x)}</td><td>${f2(r.rise)}</td><td>${f2(r.fall)}</td><td>${f2(r.cR)}</td><td>${f2(r.cF)}</td><td class="${q > 1 ? "bad" : ""}">${(q * 100).toFixed(1)}%</td></tr>`; }).join("")}</tbody></table>`;
    const red = res.red ? `<div class="unote">Sụt áp chuẩn: ${g(res.red.d, 6)} ${u} (${res.red.pct.toFixed(2)}%) → ${res.red.ok ? "Đạt" : "Không đạt"} (giới hạn &lt; 5% theo mẫu QTG).</div>` : "";
    return uWrapR(res, rec, st, info, "BẢNG TÍNH KIỂM ĐỊNH ÁP KẾ (PRESSURE GAUGE)", "ĐLVN 08:2011 – kiểm định, không tính độ KĐBĐ", inp + `<div class="ulbl">Kết quả kiểm định:</div>` + out + red,
      "Công thức theo file PG_08_Data_Rev2026_Oct-2026.xlsm, sheet Data08. Số hiệu chính chiều tăng dùng số đọc chiều tăng (sheet tháng 10 đang trỏ nhầm sang cột Falling).");
  }

  function tsUnc(rec, res, st, info) {
    const h = rec.h, s1 = info.stand1, hs = info.heat || s1;
    const inp = `<div class="ucols"><table class="ukv">
        ${r3("F4", "Độ chính xác (Acc)", esc(h.acc), "%Tset")}${r3("F5", "Giá trị đặt (Tset)", esc(h.tset), deg)}${r3("F6", "Rising/Falling", res.rising ? "Rising" : "Falling")}
        ${r3("F20 / F21", "Số lần lặp n / hệ số phủ k", `${res.n} / ${res.k}`)}
      </table><table class="ukv">
        ${r3("E4", "Nhiệt kế chuẩn", esc(s1 ? s1.key : ""))}${r3("F13", "ĐKĐBĐ nhiệt kế chuẩn", g(s1 ? s1.unc : 0), deg)}
        ${r3("E6", "Thiết bị tạo MT", esc(hs ? hs.key : ""))}${r3("F17–F19", "Ổn định / Radial / Axial", hs ? `${hs.stab || 0} / ${hs.radial || 0} / ${hs.axial || 0}` : "0", deg)}
        ${r3("", "Hạn chuẩn", esc(s1 ? s1.due || "?" : "?"))}
      </table></div>`;
    const rows = res.set.map((v, i) => { const Tm = res.rising ? v : res.reset[i], Td = res.rising ? res.reset[i] : v; return `<tr><td>${i + 1}</td><td>${g2(Tm)}</td><td>${g2(Td)}</td><td>${g2(res.setDev[i], 6)}</td><td>${g2(res.resetDev[i], 6)}</td><td>${g((Tm - res.C28) ** 2, 6)}</td><td>${g((Td - res.D28) ** 2, 6)}</td></tr>`; }).join("");
    const grid = `<table class="res ug"><thead><tr><th>Lần</th><th>Tm (Rising) C</th><th>Tđ (Falling) D</th><th>Set − Tset</th><th>Reset − Tset</th><th>(Tm − Tm tb)² G</th><th>(Tđ − Tđ tb)² H</th></tr></thead><tbody>${rows}</tbody></table>`;
    const calc = `<div class="ucols"><table class="ukv">
        ${r3("C28 / D28", "Tm tb / Tđ tb", `${g(res.C28, 8)} / ${g(res.D28, 8)}`)}${r3("F30", "1.1 utm = √(ΣG/(n(n−1)))", g(res.F30, 6), deg)}${r3("F31", "1.2 utd", g(res.F31, 6), deg)}
        ${r3("F33", "2.1 uch1 = U/k", g(res.F33, 6), deg)}${r3("F34", "2.2 uch2 chỉ thị (×0)", g(res.F34, 6), deg)}${r3("F35", "2.4 uch3 thiết bị tạo MT", g(res.F35, 6), deg)}
      </table><table class="ukv">
        ${r3("F36", "2.5 uch", g(res.F36, 6), deg)}${r3("F38 / F39", "3. ucm / ucd", `${g(res.F38, 6)} / ${g(res.F39, 6)}`)}
        ${r3("F41 / F42", "4. Um / Ud = k·uc", `${g(res.F41, 6)} / ${g(res.F42, 6)}`)}${r3("I46", "U báo cáo", g(res.U, 6), deg)}${r3("CH", res.fv === 2 ? "In chứng chỉ (2 CSCN, làm tròn lên)" : "In chứng chỉ (ROUND 2 số)", `<b>${D.uV(res, res.U, vn(res.Uprint, 2))}</b>`, deg)}
      </table></div>`;
    const chk = `<table class="res ug chk"><thead><tr><th>Chiều</th><th>Sai số cho phép = Acc·Tset/100</th><th>Max |Set − Tset|</th><th>Tỉ lệ</th><th>Kết luận (D51)</th></tr></thead>
      <tbody><tr><td>${res.rising ? "Rising" : "Falling"}</td><td>${g(res.lim, 6)}</td><td>${g(res.maxDev, 6)}</td><td class="${res.maxDev > res.lim ? "bad" : ""}">${(res.maxDev / res.lim * 100).toFixed(1)}%</td><td>${verdict(res.pass)}</td></tr></tbody></table>`;
    return uWrapR(res, rec, st, info, "BẢNG TÍNH TOÁN ĐỘ KHÔNG ĐẢM BẢO ĐO – TEMPERATURE SWITCH", "Uncertainty calculation – DLVNTM13 (DVK.LAB.TM.13)", inp + `<div class="ulbl">Số liệu đo (hàng 23–28):</div>` + grid + calc + `<div class="ulbl">Kiểm tra:</div>` + chk,
      "Công thức theo file LFS_TS 09 2026.xls, sheet DLVNTM13 + DataTM13. U in chứng chỉ theo DataTM13!CH (làm tròn thường 2 số lẻ).");
  }

  function ttUnc(rec, res, st, info) {
    const h = rec.h, s1 = info.stand1, s2 = info.stand2, am = info.stand3;
    const inp = `<div class="ucols"><table class="ukv">
        ${r3("F5 / F6", "Min / Max range", `${esc(h.min)} / ${esc(h.max)}`, deg)}${r3("F7", "Hệ số Cj = (Max−Min)/16", g(res.Cj, 6), "°C/mA")}
        ${r3("F8", "Độ phân giải DUT", esc(h.res || 0), "mA")}${r3("F21–F23", "Số điểm thấp / trung / cao", `${res.nL} / ${res.nM} / ${res.nH}`)}
        ${r3("F24 / F25", "Số lần đọc / k", `${res.n} / ${res.k}`)}
      </table><table class="ukv">
        ${r3("E5", "Nhiệt kế chuẩn dải thấp", esc(s1 ? s1.key : ""))}${r3("F14", "ĐKĐBĐ", g(s1 ? s1.unc : 0), deg)}
        ${r3("E6", "Nhiệt kế chuẩn dải trung/cao", esc(s2 ? s2.key : "—"))}${r3("G14", "ĐKĐBĐ", g(s2 ? s2.unc : 0), deg)}
        ${r3("E7", "Ampe kế", esc(am ? am.key : ""))}${r3("L17 / N17", "ĐKĐBĐ quy đổi / sai số", `${g(res.L17, 6)} / ${g(res.N17, 6)}`, "mA")}
      </table></div>`;
    const P = res.pt;
    const row = (lab, f) => `<tr><td class="l">${lab}</td>${P.map(p => `<td>${f(p)}</td>`).join("")}</tr>`;
    const grid = `<table class="res ug"><thead><tr><th class="l">Đại lượng</th>${P.map((p, i) => `<th>Điểm ${i + 1} (${res.cls[i]})</th>`).join("")}</tr></thead><tbody>
      ${row("Chuẩn TB E60 (°C)", p => g2(p.stdT, 7))}${row("Si chuẩn tăng / giảm", p => `${g(p.sSr, 3)} / ${g(p.sSf, 3)}`)}
      ${row("DUT TB tăng / giảm (mA)", p => `${g2(p.rise, 7)} / ${g2(p.fall, 7)}`)}${row("Si DUT tăng / giảm", p => `${g(p.sDr, 3)} / ${g(p.sDf, 3)}`)}
      ${row("Hồi trễ |giảm − tăng|", p => g(p.hyst, 4))}${row("SHC tăng / giảm (mA)", p => `${g2(p.cR, 4)} / ${g2(p.cF, 4)}`)}${row("Sai lệch %", p => g(p.err, 4))}</tbody></table>`;
    const R = res.R, keys = [["low", "thấp"], ["mid", "trung"], ["high", "cao"]];
    const rr = (lab, f) => `<tr><td class="l">${lab}</td>${keys.map(([k]) => `<td>${R[k].cnt ? f(R[k]) : "—"}</td>`).join("")}</tr>`;
    const ut = `<table class="res ug"><thead><tr><th class="l">Thành phần (cột F / H / J)</th>${keys.map(([, t]) => `<th>Dải ${t}</th>`).join("")}</tr></thead><tbody>
      ${rr("Ultb chuẩn (36)", x => g(x.UltbS, 4))}${rr("uch4 tản mạn = Ultb/√n (37)", x => g(x.uch4, 4))}${rr("uch1 nhiệt kế chuẩn = U/2 (38)", x => g(x.uch1, 4))}
      ${rr("uch5 chỉ thị chuẩn (39)", x => g(x.uch5, 4))}${rr("uch2 ampe kế (F40)", () => g(res.F40, 4))}${rr("uch3 thiết bị tạo MT (41)", x => g(x.uch3, 4))}${rr("uch (42)", x => g(x.uch, 4))}
      ${rr("Ultb DUT (49)", x => g(x.UltbD, 4))}${rr("ubk1 = Ultb·Cj/√n (50)", x => g(x.ubk1, 4))}${rr("ubk2 hồi trễ = hyst·Cj/(2√3) (51)", x => g(x.ubk2, 4))}
      ${rr("ubk3 phân giải (F52)", () => g(res.F52, 4))}${rr("uDUT (53)", x => g(x.uDUT, 4))}${rr("uc (54)", x => g(x.uc, 4))}${rr("Uexp = 2·uc (55)", x => g(x.U, 6))}${rr("In chứng chỉ (2 CSCN, làm tròn lên)", x => `<b>${uTxt("TT", x.U)}</b>`)}</tbody></table>`;
    const chk = `<table class="res ug chk"><thead><tr><th>Max sai lệch %</th><th>Max U (°C)</th><th>Max |SHC| (mA)</th><th>Giới hạn FJ = Acc/100·span (°C)</th><th>Kết luận (FI)</th></tr></thead>
      <tbody><tr><td>${g(res.maxErr, 4)}</td><td>${g(res.Umax, 4)}</td><td>${g(res.maxSHC, 4)}</td><td>${g(res.lim, 4)}</td><td>${verdict(res.pass)}</td></tr></tbody></table>
      <div class="unote">Data188!FI so sánh chung sai lệch (%), U (°C) và SHC (mA) với một giới hạn tính bằng °C – giữ nguyên như file, cần xác nhận.</div>`;
    return uWrapR(res, rec, st, info, "BẢNG TÍNH TOÁN ĐỘ KHÔNG ĐẢM BẢO ĐO – TEMPERATURE TRANSMITTER", "Temperature Transmitter calculation report – DLVN188.2-2 (DVK.LAB.TM.12)",
      inp + `<div class="ulbl">Theo điểm (hàng 28–64):</div>` + grid + `<div class="ulbl">Ngân sách độ KĐBĐ theo dải:</div>` + ut + `<div class="ulbl">Kiểm tra:</div>` + chk,
      "Công thức theo file 1.TT_LFS_CM_26.xls, sheets DLVN188.2-2, STDEV calc, Data188. Đã đối chiếu với số mẫu trong sheet (dải thấp 0,146166 / trung 0,281006 °C).");
  }

  function tgUnc(rec, res, st, info) {
    const h = rec.h, s1 = info.stand1, s2 = info.stand2;
    const inp = `<div class="ucols"><table class="ukv">
        ${r3("F4 / F5", "Min / Max range", `${esc(h.min)} / ${esc(h.max)}`, deg)}${r3("F6", "Độ chia nhỏ nhất", esc(h.res), deg)}
        ${r3("F7", "Loại chỉ thị (1 Analog / 0,5 Digital)", g(res.F7))}${r3("F21–F23", "Số điểm thấp / trung / cao", `${res.nL} / ${res.nM} / ${res.nH}`)}
        ${r3("F24 / F25", "Số lần đọc / k", `${res.n} / ${res.k}`)}
      </table><table class="ukv">
        ${r3("E4 / F14", "Chuẩn dải thấp / U", `${esc(s1 ? s1.key : "")} / ${g(s1 ? s1.unc : 0)}`, deg)}${r3("E5 / G14", "Chuẩn dải trung–cao / U", `${esc(s2 ? s2.key : "—")} / ${g(s2 ? s2.unc : 0)}`, deg)}
        ${r3("F18:F20", "Lò 1: ổn định / radial / axial", s1 ? `${g(s1.stab || 0)} / ${g(s1.radial || 0)} / ${g(s1.axial || 0)}` : "", deg)}
        ${r3("G18:G20", "Lò 2: ổn định / radial / axial", s2 ? `${g(s2.stab || 0)} / ${g(s2.radial || 0)} / ${g(s2.axial || 0)}` : "—", deg)}
      </table></div>`;
    const P = res.pt;
    const row = (lab, f) => `<tr><td class="l">${lab}</td>${P.map(p => `<td>${f(p)}</td>`).join("")}</tr>`;
    const grid = `<table class="res ug"><thead><tr><th class="l">Đại lượng</th>${P.map((p, i) => `<th>Điểm ${i + 1} (${res.cls[i]})</th>`).join("")}</tr></thead><tbody>
      ${row("Chuẩn TB G55 (°C)", p => g2(p.stdT, 7))}${row("Si chuẩn tăng / giảm", p => `${g(p.sSr, 3)} / ${g(p.sSf, 3)}`)}
      ${row("DUT TB tăng / giảm (°C)", p => `${g2(p.rise, 7)} / ${g2(p.fall, 7)}`)}${row("Si DUT tăng / giảm", p => `${g(p.sDr, 3)} / ${g(p.sDf, 3)}`)}
      ${row("Hồi trễ |giảm − tăng|", p => g(p.hyst, 4))}${row("Số hiệu chính M55 = chuẩn − tăng", p => g2(p.corr, 4))}</tbody></table>`;
    const R = res.R, keys = [["low", "thấp"], ["mid", "trung"], ["high", "cao"]];
    const rr = (lab, f) => `<tr><td class="l">${lab}</td>${keys.map(([k]) => `<td>${R[k].cnt ? f(R[k]) : "—"}</td>`).join("")}</tr>`;
    const ut = `<table class="res ug"><thead><tr><th class="l">Thành phần (cột F / H / J)</th>${keys.map(([, t]) => `<th>Dải ${t}</th>`).join("")}</tr></thead><tbody>
      ${rr("Ultb chuẩn (33)", x => g(x.UltbS, 4))}${rr("uch4 tản mạn = Ultb/√n (34)", x => g(x.uch4, 4))}${rr("uch1 nhiệt kế chuẩn = U/k (35)", x => g(x.uch1, 4))}
      ${rr("uch2 chỉ thị chuẩn (36)", x => g(x.uch2, 4))}${rr("uch3 thiết bị tạo MT (37)", x => g(x.uch3, 4))}${rr("uch (38)", x => g(x.uch, 4))}
      ${rr("Ultb DUT (45)", x => g(x.UltbD, 4))}${rr("ubk2 tản mạn = Ultb/√n (46)", x => g(x.ubk2, 4))}${rr("ubk1 hồi trễ = hyst/(2√3) (47)", x => g(x.ubk1, 4))}
      ${rr("ubk3 phân giải = F7·d/√3 (48)", x => g(x.ubk3, 4))}${rr("uDUT (49)", x => g(x.uDUT, 4))}${rr("uc (50)", x => g(x.uc, 4))}${rr("Uexp = 2·uc (51)", x => g(x.U, 6))}
      ${rr(res.fv === 2 ? "In chứng chỉ (2 CSCN, làm tròn lên)" : "In chứng chỉ (Data138 ROUND 2)", x => `<b>${D.uV(res, x.U, vn(C.xround(x.U, 2), 2))}</b>`)}${rr("Nếu theo quy tắc 2 CSCN làm tròn lên", x => uTxt("TT", x.U))}</tbody></table>`;
    const chk = `<table class="res ug chk"><thead><tr><th>Max U (°C)</th><th>Max |SHC| (°C)</th><th>Giới hạn DZ = Acc/100·span (°C)</th><th>Kết luận (EG)</th></tr></thead>
      <tbody><tr><td>${g(res.Umax, 4)}</td><td>${g(res.maxSHC, 4)}</td><td>${g(res.lim, 4)}</td><td>${verdict(res.pass)}</td></tr></tbody></table>
      <div class="unote">Data138!EG so sánh cả U và |SHC| với sai số cho phép – giữ nguyên như file. U in chứng chỉ theo ROUND 2 của Data138 (có thể nhỏ hơn U tính, ví dụ 0,5829 → 0,58) – chờ NGOC chốt có áp dụng quy tắc làm tròn lên hay không.</div>`;
    return uWrapR(res, rec, st, info, "BẢNG TÍNH TOÁN ĐỘ KHÔNG ĐẢM BẢO ĐO CỦA PHÉP HIỆU CHUẨN – TEMPERATURE GAUGE", "Digital and analog thermometer – DLVN138.2-1 (ĐLVN 138:2004)",
      inp + `<div class="ulbl">Theo điểm (hàng 28–59):</div>` + grid + `<div class="ulbl">Ngân sách độ KĐBĐ theo dải:</div>` + ut + `<div class="ulbl">Kiểm tra:</div>` + chk,
      "Công thức theo file TG_GPP 08-2026_Phuoc_.xlsm, sheets DLVN138.2-1, STDEV Calc, Data138. Đã đối chiếu 45/45 hồ sơ GPP 08/2026 (U và kết luận khớp).");
  }

  function rtdUnc(rec, res, st, info) {
    const h = rec.h, s1 = info.stand1, s2 = info.stand2, mt = info.stand3;
    const inp = `<div class="ucols"><table class="ukv">
        ${r3("F6 / F7", "Min / Max range", `${esc(h.min)} / ${esc(h.max)}`, deg)}${r3("F8", "Độ nhạy DUT", g(res.sens), "Ω/°C")}
        ${r3("F21 / F22 / F23", "Số điểm / số lần đọc / k", `5 / ${res.n} / ${res.k}`)}${r3("", "Phương trình", res.neg ? "bậc 3 (Min < 0)" : "bậc 2")}
      </table><table class="ukv">
        ${r3("E5 / F14", "Chuẩn dải thấp / U", `${esc(s1 ? s1.key : "")} / ${g(s1 ? s1.unc : 0)}`, deg)}${r3("E6 / G14", "Chuẩn dải cao / U", `${esc(s2 ? s2.key : "—")} / ${g(s2 ? s2.unc : 0)}`, deg)}
        ${r3("E7", "Thiết bị đo điện trở", esc(mt ? mt.key : ""))}${r3("M14 / O14", "U (%) / sai số (Ω)", `${g(mt ? mt.unc : 0)} / ${g(mt ? mt.err : 0)}`)}
      </table></div>`;
    const lbl = ["1", "2", "3", "4", "5", "3 giảm"];
    const grid = `<table class="res ug"><thead><tr><th>Điểm</th><th>Chuẩn TB (°C)</th><th>DUT TB (Ω)</th><th>Si DUT</th><th>R đặc tuyến (Ω)</th><th>R đặc tuyến − R đo</th><th>R hàm chuẩn (Ω)</th><th>Lệch Ω</th><th>Lệch °C</th></tr></thead><tbody>
      ${res.rows.map((r, i) => `<tr><td>${lbl[i]}</td><td>${g2(r.std)}</td><td>${g2(r.dut, 8)}</td><td>${i < 5 ? g(res.Si[i], 3) : ""}</td><td>${g(r.Rfit, 9)}</td><td>${i < 5 ? g(res.res[i], 4) : ""}</td><td>${g(r.ref, 6)}${r.refSrc === "iec" ? "*" : ""}</td><td>${g(r.eO, 5)}</td><td>${g(r.eC, 5)}</td></tr>`).join("")}</tbody></table>`;
    const co = res.fit;
    const calc = `<div class="ucols"><table class="ukv">
        ${r3(res.neg ? "AL39:AL42" : "AB38:AB40", "Nghiệm (R0, R0·A, R0·B" + (res.neg ? ", −100·C·R0)" : ")"), co.map(c => g(c, 9)).join("<br>"))}
        ${r3("AO53", "R0", g(res.R0, 9), "Ω")}${r3("AL53 / AM53", "A / B", `${g(res.A, 9)} / ${g(res.B, 9)}`)}${r3("AN53", "C", g(res.C, 6))}
      </table><table class="ukv">
        ${r3("G34", "uch5 tản mạn chuẩn", g(res.G34, 6), deg)}${r3("G35", "uch1 nhiệt kế chuẩn", g(res.G35, 6), deg)}${r3("G36", "uch2 thiết bị đo điện trở", g(res.G36, 6), deg)}
        ${r3("G37", "uch3 thiết bị tạo MT", g(res.G37, 6), deg)}${r3("G38", "uch", g(res.G38, 6), deg)}
        ${r3("Q34", "uDUT5 = O33/(√n·F8)", g(res.Q34, 6), deg)}${r3("Q35", "uDUT4 hồi trễ điểm 3", g(res.Q35, 6), deg)}${r3("Q36", "uDUT6 = √(Σres²/((n−3)·F8))", g(res.Q36, 6), deg)}
        ${r3("Q38 / G39", "uDUT / uc", `${g(res.Q38, 6)} / ${g(res.G39, 6)}`)}${r3("G40", "Uexp = 2·uc", g(res.U, 6), deg)}${r3("EO", "In chứng chỉ", `<b>${D.uV(res, res.U, vn(res.U, 2))}</b>`, deg)}
      </table></div>`;
    const chk = `<table class="res ug chk"><thead><tr><th>Max |lệch °C| (2 số)</th><th>U (2 số)</th><th>Tổng EU</th><th>Giới hạn EV = Acc·span/100</th><th>Kết luận (ET)</th></tr></thead>
      <tbody><tr><td>${g(res.maxE, 4)}</td><td>${D.uV(res, res.U, vn(res.U, 2))}</td><td>${g(res.maxE + res.Uprint, 4)}</td><td>${g(res.lim, 4)}</td><td>${verdict(res.pass)}</td></tr></tbody></table>
      <div class="unote">* giá trị không có trong "Bảng giá trị chuẩn" của file – dùng IEC 60751. O33 trong file không lấy căn bậc hai – giữ nguyên như file, cần xác nhận.</div>`;
    return uWrapR(res, rec, st, info, "BẢNG TÍNH TOÁN ĐỘ KHÔNG ĐẢM BẢO ĐO – PLATINUM RESISTANCE THERMOMETER", "Industrial Platinum Resistance Thermometer – DLVN125 NK chuẩn + đo Ohm",
      inp + `<div class="ulbl">Theo điểm (hàng 26–50):</div>` + grid + calc + `<div class="ulbl">Kiểm tra:</div>` + chk,
      "Công thức theo file RTD_DK_CM_2026_.xls, sheet \"DLVN125 NK chuan + do Ohm\" + Data125. Đã đối chiếu với số mẫu trong sheet (U = 0,411506 °C).");
  }

  function tcUnc(rec, res, st, info) {
    const h = rec.h, s1 = info.stand1, s2 = info.stand2 || info.stand1, mv = info.stand3;
    const inp = `<div class="ucols"><table class="ukv">
        ${r3("F4 / F5 / F6", "Loại TC / Min / Max", `${esc(res.tcType)} / ${esc(h.min)} / ${esc(h.max)}`, deg)}${r3("F9", "Độ nhạy S (Ref!C37:C38)", g(res.S), "mV/°C")}
        ${r3("F22 / F23 / F24", "Số điểm / số lần đọc / k", "8 / 5 / 2")}${r3("", "Độ chính xác", esc(h.acc), "%FS")}
      </table><table class="ukv">
        ${r3("Stand1", "Chuẩn dải thấp / U", `${esc(s1 ? s1.key : "")} / ${g(s1 ? s1.unc : 0)}`, deg)}${r3("Stand2", "Chuẩn dải cao / U", `${esc(info.stand2 ? info.stand2.key : "— (= Stand1)")} / ${g(s2 ? s2.unc : 0)}`, deg)}
        ${r3("M15", "Milivôn kế / U", `${esc(mv ? mv.key : "")} / ${g(mv ? mv.unc : 0)}`, "%")}${r3("M20", "U bù đầu tự do (uCJ)", g(Number(st.TC && st.TC.uCJ) || 0), deg)}
        ${r3("Lò", "Lò dùng cho uch8: ổn định / radial / axial", (() => { const x = Number(h.max) <= 140 ? s1 : s2; return x ? `${g(x.stab || 0)} / ${g(x.radial || 0)} / ${g(x.axial || 0)}` : ""; })(), deg)}
      </table></div>`;
    const grid = `<table class="res ug"><thead><tr><th>Điểm</th><th>Chuẩn TB (°C)</th><th>Si chuẩn</th><th>E đo TB (mV)</th><th>Si DUT</th><th>E chuẩn ITS-90 (mV)</th><th>ΔE (mV)</th><th>Δt (°C)</th><th>V = E − E<sub>K</sub>(t)</th></tr></thead><tbody>
      ${res.pt.map((p, i) => `<tr><td>${i + 1}</td><td>${g2(p.t, 7)}</td><td>${g(p.sStd, 3)}</td><td>${g2(p.E, 7)}</td><td>${g(p.sDut, 3)}</td><td>${g(p.Eref, 7)}</td><td>${g(p.dE, 5)}</td><td>${g(p.dT, 5)}</td><td>${g(p.V, 5)}</td></tr>`).join("")}</tbody></table>`;
    const bud = `<div class="ucols"><table class="ukv">
        ${r3("F35", "Ultb chuẩn (điểm 1,3,5,7)", g(res.Ultb, 6), deg)}${r3("F36", "uch9 tản mạn = Ultb/√5", g(res.uch9, 6), deg)}${r3("F37", "uch7 bù đầu tự do = uCJ/k", g(res.uch7, 6), deg)}
        ${r3("F38", "uch8 lò (√Σ(x/√3)²)", g(res.uch8, 6), deg)}${r3("F41", "uch1 nhiệt kế chuẩn = U/k", g(res.uch1, 6), deg)}${r3("F42", "uch", g(res.uch, 6), deg)}
      </table><table class="ukv">
        ${r3("F51 / F52", "Ultb DUT / ubk6", `${g(res.UltbD, 6)} / ${g(res.ubk6, 6)}`, deg)}${r3("F53", "ubk1 milivôn kế = U%·E8/100/(k·S)", g(res.ubk1, 6), deg)}
        ${r3("F54", "ubk2 phân giải = 0,5·d/(√3·S)", g(res.ubk2, 6), deg)}${r3("F55", "ubk7 hồi quy = √(Σres²/(5·S))", g(res.ubk7, 6), deg)}
        ${r3("M55", "ubk8 = 0,1 % Max (BoA 2022)", g(res.ubk8, 6), deg)}${r3("F56 / F57", "uDUT / uc", `${g(res.uDUT, 6)} / ${g(res.uc, 6)}`)}
        ${r3("F58", "Uexp = 2·uc", g(res.U, 6), deg)}${r3("F59", "In chứng chỉ", `<b>${tcU(res)}</b>`, deg)}
      </table></div>`;
    const chk = `<table class="res ug chk"><thead><tr><th>a0 / a1 / a2 (ΔE = a0 + a1·t + a2·t²)</th><th>Max |Δt| (°C)</th><th>U + max|Δt|</th><th>Giới hạn = Acc·span/100</th><th>Kết luận (HE)</th></tr></thead>
      <tbody><tr><td>${res.a.map(x => g(x, 5)).join(" / ")}</td><td>${g(res.maxErr, 4)}</td><td>${g(res.U + res.maxErr, 4)}</td><td>${g(res.lim, 4)}</td><td>${verdict(res.pass)}</td></tr></tbody></table>
      <div class="unote">Giữ nguyên như file: hồi quy ΔE luôn dùng bảng loại K (Ref!D21:E34); uch7 dùng U thiết bị bù đầu tự do trong Cài đặt (file anh Khai: Fluke 1620A, U 0,2 °C); điểm âm dùng dải 1 của hàm ngược bỏ C1 (ô Ref!$JH$37 trống).</div>`;
    return uWrapR(res, rec, st, info, "BẢNG TÍNH TOÁN ĐỘ KHÔNG ĐẢM BẢO ĐO – INDUSTRIAL THERMOCOUPLES", "Cặp nhiệt điện công nghiệp – DLVN161 (ĐLVN 161:2005)",
      inp + `<div class="ulbl">Theo điểm:</div>` + grid + `<div class="ulbl">Ngân sách độ KĐBĐ:</div>` + bud + `<div class="ulbl">Kiểm tra:</div>` + chk,
      "Công thức theo file TC_GPP_2026_.xlsm, sheets DLVN161, Ref, Data161. Đã đối chiếu 66/66 hồ sơ GPP 2026 (U, Δt, hệ số a, kết luận khớp).");
  }

  function dpgUnc(rec, res, st, info) {
    const h = rec.h, u = esc(h.unit), s1 = info.stand1;
    const inp = `<div class="ucols"><table class="ukv">
        ${r3("C9 / C10", "Phạm vi đo", `${esc(h.min)} ÷ ${esc(h.max)}`, u)}${r3("C11", "Độ chính xác", esc(h.acc), "%FS")}${r3("C12", "Độ chia nhỏ nhất", esc(h.res), u)}
        ${r3("E9 / E10", "Dải chuẩn quy đổi", `${g(res.E9)} ÷ ${g(res.E10)}`, u)}${r3("E11", "U chuẩn quy đổi", g(res.E11, 6), u)}
      </table><table class="ukv">
        ${r3("Stand1", "Chuẩn", esc(s1 ? s1.key : ""))}${r3("E12", "U chuẩn (% span chuẩn)", g(res.E12, 6), "%")}${r3("E13", "%Rdg chuẩn", g(res.E13, 6), "%")}
        ${r3("F26 / F27", "Hồi quy y = a + b·x: a / b", `${g(res.a, 6)} / ${g(res.b, 6)}`)}${r3("F31", "Sy", g(res.Sy, 6))}${r3("F32 / F33 / F34", "Sa / Sb / r", `${g(res.Sa, 5)} / ${g(res.Sb, 5)} / ${g(res.r, 5)}`)}
        ${r3("F37", "uv = (d·100/span)/√6/2", g(res.uv, 6), "%")}
      </table></div>`;
    const m = res.rows.length;
    const grid = `<table class="res ug"><thead><tr><th>Điểm</th><th>x chuẩn</th><th>Tăng / Giảm</th><th>uA ↑ / ↓ (${u})</th><th>us ↑ / ↓ (%)</th><th>uc ↑ / ↓</th><th>U% = ½(uc↑+uc↓)·k</th><th>U (${u})</th></tr></thead><tbody>
      ${res.rows.map((r, i) => { const a = res.cols[i], b = res.cols[i + m]; return `<tr><td>${i + 1}</td><td>${g2(r.x)}</td><td>${g2(r.rise)} / ${g2(r.fall)}</td><td>${g(a.uA, 4)} / ${g(b.uA, 4)}</td><td>${g(a.us, 4)} / ${g(b.us, 4)}</td><td>${g(a.uc, 5)} / ${g(b.uc, 5)}</td><td>${g(r.Upct, 5)}</td><td>${g(r.U, 6)}</td></tr>`; }).join("")}</tbody></table>`;
    const chk = `<table class="res ug chk"><thead><tr><th>Max U (CR)</th><th>In chứng chỉ</th><th>Max |SHC|</th><th>Giới hạn IA = Acc·span/100</th><th>Kết luận (HX)</th></tr></thead>
      <tbody><tr><td>${g(res.Umax, 6)}</td><td><b>${tcU(res)}</b></td><td>${g(res.maxSHC, 4)}</td><td>${g(res.lim, 4)}</td><td>${verdict(res.pass)}</td></tr></tbody></table>
      ${res.red ? `<div class="unote">Sụt áp chuẩn: ${g(res.red.d, 6)} ${u} (${res.red.pct.toFixed(2)}%) → ${res.red.ok ? "Đạt" : "Không đạt"} (giới hạn &lt; 5%).</div>` : ""}
      <div class="unote">Giữ nguyên như file: uA (đơn vị đồng hồ) cộng chung với các thành phần % ở hàng 23. GCN mẫu PDI-0101 in U = 1,05 do ô GI bị sửa tay (ROUNDUP); công thức chuẩn của file cho ${tcU(res)}.</div>`;
    return uWrapR(res, rec, st, info, "BẢNG TÍNH TOÁN ĐỘ KHÔNG ĐẢM BẢO ĐO – PRESSURE DIFF INDICATOR", "Đồng hồ chênh áp – DLVN76_2001 (hiệu chỉnh áp suất: Yes)",
      inp + `<div class="ulbl">Theo điểm:</div>` + grid + `<div class="ulbl">Kiểm tra:</div>` + chk,
      "Công thức theo file DVK_ĐVT_PG GPP_2026_KNV.xls, sheets DLVN76_2001, Data76. Đã đối chiếu 8/8 hồ sơ PDI GPP 2026 (U và kết luận khớp).");
  }

  const PAGES = {
    PG: { c1: pgCert1, c2: pgCert2, q: pgQtg, u: pgUnc },
    TS: { c1: tCert1, c2: tCert2, q: tsQtg, u: tsUnc },
    TT: { c1: tCert1, c2: tCert2, q: ttQtg, u: ttUnc },
    RTD: { c1: tCert1, c2: tCert2, q: rtdQtg, u: rtdUnc },
    TG: { c1: tCert1, c2: tCert2, q: tgQtg, u: tgUnc },
    TC: { c1: tCert1, c2: tCert2, q: tcQtg, u: tcUnc },
    DPG: { c1: tCert1, c2: tCert2, q: dpgQtg, u: dpgUnc }
  };
  window.LabDocs2 = { PAGES, sci };
})();
