/* LAB PVGAS Services – "Bảng tính Excel chạy thật" cho 1 hồ sơ (tab Báo cáo, cấp 3), v81 – yêu cầu NGOC 13/11/2026:
 * mỗi tag 1 file .xlsx gồm toàn bộ công thức ĐLVN của loại thiết bị (9 cụm), số liệu nhập + số lấy từ chuẩn ở ô màu cam,
 * mọi bước còn lại là CÔNG THỨC EXCEL thật (Excel tự tính lại khi mở) → chứng minh với VILAS từng bước tính ĐKĐBĐ.
 * Sheet "Số app" chép đúng số phần mềm đã dùng ở cùng vị trí ô; cột E "Lệch" = |Excel − app| / |app| để đối chiếu.
 * Công thức bám đúng calc.js / calc2.js theo phiên bản công thức của hồ sơ (fv = 1 bản Excel 2026, fv = 2 bản đã sửa 06/11/2026).
 * Nhánh rẽ cố định của hồ sơ (chuẩn quả cân, đơn vị U chuẩn, dải nhiệt…) được chọn khi tạo file và ghi rõ ở cột "Diễn giải". */
(function () {
  "use strict";
  const ORANGE = "FFE8590C", SHEET = "Bảng tính", APP = "Số app", C0 = 6;   // cột F = giá trị đầu tiên
  const L = c => { let s = ""; while (c > 0) { const m = (c - 1) % 26; s = String.fromCharCode(65 + m) + s; c = (c - m - 1) / 26; } return s; };
  const num = v => typeof v === "number" && isFinite(v);

  function Book(ExcelJS, meta) {
    const wb = new ExcelJS.Workbook();
    wb.creator = "LAB PVGAS Services"; wb.created = new Date();
    wb.calcProperties = Object.assign(wb.calcProperties || {}, { fullCalcOnLoad: true });
    const ws = wb.addWorksheet(SHEET, { views: [{ state: "frozen", ySplit: 7 }], pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 } }), ap = wb.addWorksheet(APP);
    ws.columns = [{ width: 13 }, { width: 46 }, { width: 62 }, { width: 9 }, { width: 11 }].concat(Array.from({ length: 12 }, () => ({ width: 16 })));
    ap.columns = [{ width: 13 }, { width: 46 }, { width: 10 }, { width: 9 }, { width: 6 }].concat(Array.from({ length: 12 }, () => ({ width: 16 })));
    const reg = {};
    let row = 1, first = 0;
    const title = `BẢNG TÍNH ĐỘ KHÔNG ĐẢM BẢO ĐO – ${meta.tag || ""} (${meta.type})`;
    ws.getCell("A1").value = title; ws.getCell("A1").font = { bold: true, size: 14, color: { argb: "FF0B4F9C" } };
    ws.getCell("A2").value = meta.info || ""; ws.getCell("A2").font = { size: 10 };
    ws.getCell("A3").value = meta.ver || ""; ws.getCell("A3").font = { size: 10, italic: true };
    ws.getCell("A4").value = "Ô chữ cam = số đã nhập / lấy từ GCN chuẩn. Mọi ô còn lại ở cột F trở đi là công thức Excel – sửa ô cam thì Excel tính lại toàn bộ.";
    ws.getCell("A4").font = { size: 10, color: { argb: ORANGE } };
    ws.getCell("A5").value = "Đối chiếu với phần mềm (sheet \"Số app\"): lệch tương đối lớn nhất ="; ws.getCell("A5").font = { size: 10, bold: true };
    ap.getCell("A1").value = "Số phần mềm LAB PVGAS đã dùng cho hồ sơ này (cùng vị trí ô với sheet \"" + SHEET + "\")"; ap.getCell("A1").font = { bold: true };
    row = 7;
    ["Ký hiệu", "Diễn giải", "Công thức", "Đơn vị", "Lệch app", "Giá trị (cột F, G, H… = điểm 1, 2, 3…)"].forEach((t, i) => {
      const c = ws.getCell(row, i + 1); c.value = t; c.font = { bold: true, color: { argb: "FFFFFFFF" } };
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0B4F9C" } };
    });
    row = 8; first = row;

    const ent = id => { const e = reg[id]; if (!e) throw new Error("Chưa có ký hiệu " + id); return e; };
    const ref = (id, j) => { const e = ent(id); return `$${L(C0 + (e.n == null ? 0 : j))}$${e.r}`; };
    const rng = (id, a, b) => { const e = ent(id); const n = e.n == null ? 1 : e.n; a = a == null ? 0 : a; b = b == null ? n - 1 : b; return `$${L(C0 + a)}$${e.r}:$${L(C0 + b)}$${e.r}`; };
    // {id} ô đơn · {id[]} phần tử cùng cột · {id[3]} phần tử thứ 3 (từ 0) · {id:} cả dòng · {id:5} 5 ô đầu · {id:1-9} ô 1…9
    const sub = (t, j) => t.replace(/\{(\w+)(?:\[(\d*)\]|:(\d*)(?:-(\d+))?)?\}/g, (m, id, idx, a, b, off, s) => {
      if (m.includes(":")) return b != null ? rng(id, +a, +b) : a ? rng(id, 0, +a - 1) : rng(id);
      if (idx === undefined) { const e = ent(id); if (e.n != null) throw new Error(id + " là dãy, cần chỉ số"); return ref(id); }
      return ref(id, idx === "" ? j : +idx);
    });
    function put(id, desc, text, unit, vals, fml, app, isIn) {
      const vec = Array.isArray(vals) || Array.isArray(fml);
      const n = vec ? (fml ? fml.length : vals.length) : null;
      const r = row++;
      if (id) { if (reg[id]) throw new Error("Trùng ký hiệu " + id); reg[id] = { r, n }; }
      ws.getCell(r, 1).value = id ? id.replace(/_/g, " ") : ""; ws.getCell(r, 1).font = { bold: true };
      ws.getCell(r, 2).value = desc || ""; ws.getCell(r, 3).value = text || ""; ws.getCell(r, 4).value = unit || "";
      [2, 3].forEach(c => { ws.getCell(r, c).alignment = { wrapText: true, vertical: "top" }; });
      ws.getCell(r, 3).font = { color: { argb: "FF555555" }, size: 10 };
      ap.getCell(r, 1).value = ws.getCell(r, 1).value; ap.getCell(r, 2).value = desc || ""; ap.getCell(r, 4).value = unit || "";
      const cnt = vec ? n : 1;
      const appA = app == null ? null : Array.isArray(app) ? app : [app];
      for (let j = 0; j < cnt; j++) {
        const c = ws.getCell(r, C0 + j);
        if (fml) {
          const f = vec ? fml[j] : fml;
          const res = appA && appA[j] !== undefined ? appA[j] : undefined;
          c.value = res !== undefined && res !== null && (num(res) || typeof res === "string" || typeof res === "boolean") ? { formula: f, result: res } : { formula: f };
        } else {
          const v = vec ? vals[j] : vals;
          c.value = num(v) ? v : (v == null ? null : v);
          if (isIn) c.font = { bold: true, color: { argb: ORANGE } };
        }
        if (appA && appA[j] !== undefined && appA[j] !== null) {
          const a = appA[j]; ap.getCell(r, C0 + j).value = num(a) || typeof a === "string" || typeof a === "boolean" ? a : null;
        }
      }
      if (fml && appA) {
        const R1 = `${L(C0)}${r}:${L(C0 + cnt - 1)}${r}`, A1 = `'${APP}'!${R1}`;
        const isNum = appA.every(a => num(a));
        const f = isNum ? (cnt === 1 ? `ABS(${L(C0)}${r}-'${APP}'!${L(C0)}${r})/(ABS('${APP}'!${L(C0)}${r})+1E-6)` : `SUMPRODUCT(MAX(ABS(${R1}-${A1})/(ABS(${A1})+1E-6)))`)
          : (cnt === 1 ? `IF(${L(C0)}${r}='${APP}'!${L(C0)}${r},0,1)` : `SUMPRODUCT(--(${R1}<>${A1}))`);
        ws.getCell(r, 5).value = { formula: f, result: 0 };
        ws.getCell(r, 5).numFmt = "0.0E+00"; ws.getCell(r, 5).font = { color: { argb: "FF888888" }, size: 9 };
      }
      return id;
    }
    const x = {
      hd(t) { const r = row++; const c = ws.getCell(r, 1); c.value = t; c.font = { bold: true, color: { argb: "FF0B4F9C" } };
        for (let k = 1; k <= 5; k++) ws.getCell(r, k).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE7EEF8" } }; },
      note(t) { const r = row++; ws.getCell(r, 2).value = t; ws.getCell(r, 2).font = { italic: true, size: 9, color: { argb: "FF666666" } }; ws.mergeCells(r, 2, r, 3); ws.getCell(r, 2).alignment = { wrapText: true }; },
      // số nhập (ô cam)
      inp: (id, desc, v, unit, text) => put(id, desc, text || "nhập", unit, v, null, null, true),
      // hằng số / bảng tra (chữ đen, không phải số người dùng nhập)
      cst: (id, desc, v, unit, text) => put(id, desc, text || "hằng số", unit, v, null, null, false),
      f: (id, desc, text, tpl, app, unit) => put(id, desc, text, unit, null, sub(tpl), app),
      v: (id, desc, text, tpl, n, app, unit) => put(id, desc, text, unit, null, Array.from({ length: n }, (_, j) => sub(typeof tpl === "function" ? tpl(j) : tpl, j)), app),
      has: id => !!reg[id],
      done() {
        const c = ws.getCell("C5"); c.value = { formula: `MAX($E$${first}:$E$${row})`, result: 0 }; c.numFmt = "0.0E+00"; c.font = { bold: true };
        const d = ws.getCell("D5"); d.value = { formula: `IF(C5<1E-6,"KHỚP","LỆCH")`, result: "KHỚP" }; d.font = { bold: true, color: { argb: "FF2B8A3E" } };
        return wb;
      }
    };
    return x;
  }

  /* ---------- khối dùng chung ---------- */
  const SQ3 = "SQRT(3)";
  const upub = t => `IF(${t}<=0,0,ROUNDUP(ROUND(${t},1-INT(ROUND(LOG10(${t}),9))+6),1-INT(ROUND(LOG10(${t}),9))))`;
  const absmax = id => `SUMPRODUCT(MAX(ABS({${id}:})))`;
  const uPubV = v => window.LabCalc.uPub(v).v;
  const heatF = p => `SQRT(({${p}_stab}/${SQ3})^2+({${p}_rad}/${SQ3})^2+({${p}_ax}/${SQ3})^2)`;
  function heatIn(x, p, h, lab) {
    h = h || {};
    x.inp(p + "_stab", `${lab}: độ ổn định`, h.stab || 0, "°C");
    x.inp(p + "_rad", `${lab}: độ đồng đều hướng kính (radial)`, h.radial || 0, "°C");
    x.inp(p + "_ax", `${lab}: độ đồng đều hướng trục (axial)`, h.axial || 0, "°C");
  }
  function ktTable(x) {
    x.hd("Bảng hệ số phủ t95,45(ν) – EA-4/02 M (dùng cho bản công thức đã sửa)");
    const KT = [[1, 13.97], [2, 4.53], [3, 3.31], [4, 2.87], [5, 2.65], [6, 2.52], [7, 2.43], [8, 2.37], [10, 2.28], [20, 2.13], [50, 2.05], [1e99, 2]];
    x.cst("KTn", "Bậc tự do ν (1E+99 = ∞)", KT.map(a => a[0]), "", "bảng EA-4/02");
    x.cst("KTk", "Hệ số phủ k", KT.map(a => a[1]), "", "bảng EA-4/02");
    x.v("KTx", "1/ν (để nội suy tuyến tính theo 1/ν)", "1/ν, ∞ → 0", "IF({KTn[]}>=1E+98,0,1/{KTn[]})", 12, KT.map(a => a[0] >= 1e98 ? 0 : 1 / a[0]));
  }
  /* ν_eff Welch–Satterthwaite + k. comps = [[id u_i, id ν_i]]; vec = số cột khi các đại lượng là dãy */
  function kBlock(x, V2, sfx, uc, comps, appNu, appK, k1, vec) {
    const kid = "k" + sfx;
    if (!V2) { x.cst(kid, "Hệ số phủ (bản công thức Excel 2026: k cố định)", k1, "", "k = 2"); return kid; }
    const b = vec ? "[]" : "";
    const den = comps.map(([u, nu]) => `{${u}${b}}^4/{${nu}${b}}`).join("+");
    const nuF = `IF((${den})=0,1E+99,{${uc}${b}}^4/(${den}))`;
    const T = "ν_eff = u_c⁴ / Σ(u_i⁴/ν_i)  (thành phần loại B: ν = ∞; 1E+99 = ∞)";
    const nuI = "nu" + sfx, pI = "p" + sfx;
    const fix = a => (Array.isArray(a) ? a : [a]).map(v => isFinite(v) ? v : 1e99);
    if (vec) x.v(nuI, "Bậc tự do hiệu dụng (Welch–Satterthwaite)", T, nuF, vec, fix(appNu));
    else x.f(nuI, "Bậc tự do hiệu dụng (Welch–Satterthwaite)", T, nuF, fix(appNu)[0]);
    const pF = `IF(OR({${nuI}${b}}<=1,{${nuI}${b}}>=1E+98),0,MATCH(INT({${nuI}${b}}),{KTn:},1))`;
    const kF = `IF({${nuI}${b}}<=1,13.97,IF({${nuI}${b}}>=1E+98,2,IF(INDEX({KTn:},{${pI}${b}})=INT({${nuI}${b}}),INDEX({KTk:},{${pI}${b}}),INDEX({KTk:},{${pI}${b}})+(INDEX({KTk:},{${pI}${b}}+1)-INDEX({KTk:},{${pI}${b}}))*(INDEX({KTx:},{${pI}${b}})-1/INT({${nuI}${b}}))/(INDEX({KTx:},{${pI}${b}})-INDEX({KTx:},{${pI}${b}}+1)))))`;
    if (vec) { x.v(pI, "Vị trí trong bảng (ν làm tròn xuống)", "MATCH(INT(ν); bảng ν)", pF, vec); x.v(kid, "Hệ số phủ k = t95,45(ν_eff)", "nội suy tuyến tính theo 1/ν", kF, vec, appK); }
    else { x.f(pI, "Vị trí trong bảng (ν làm tròn xuống)", "MATCH(INT(ν); bảng ν)", pF); x.f(kid, "Hệ số phủ k = t95,45(ν_eff)", "nội suy tuyến tính theo 1/ν", kF, appK); }
    return kid;
  }
  const verdict = (x, id, desc, text, tpl, pass) => x.f(id, desc, text, `IF(${tpl},"ĐẠT","KHÔNG ĐẠT")`, pass ? "ĐẠT" : "KHÔNG ĐẠT");
  function standIn(x, s, unit, lab) {
    x.inp("S1min", `${lab}: Min chuẩn`, s.min, s.unit);
    x.inp("S1max", `${lab}: Max chuẩn`, s.max, s.unit);
    x.inp("S1U", `${lab}: U chuẩn theo GCN (${s.uncUnit === "%" ? "% FS" : s.unit})`, s.unc, s.uncUnit === "%" ? "%" : s.unit);
    x.inp("S1rdg", `${lab}: sai số % số đọc (% Rdg)`, s.rdg || 0, "%");
  }

  /* ---------- PT / DPT – ĐLVN 112:2002 ---------- */
  function PT(x, r, unit) {
    const I = r.inp, V2 = r.fv === 2, s1 = I.stand1, s2 = I.stand2, m = I.points.length, M = 2 * m;
    x.hd("1. Số liệu đầu vào");
    x.inp("Min", "Giới hạn dưới thang đo", I.min, unit); x.inp("Max", "Giới hạn trên thang đo", I.max, unit); x.inp("acc", "Độ chính xác cho phép", I.acc, "%FS");
    x.inp("x", "Áp suất chuẩn tại các điểm đo", I.points.map(Number), unit);
    x.inp("I_tang", "Dòng đọc chiều tăng", I.rise.map(Number), "mA"); x.inp("I_giam", "Dòng đọc chiều giảm", I.fall.map(Number), "mA");
    standIn(x, s1, unit, `Stand1 ${s1.key || s1.name || ""}${s1.deadweight ? " (quả cân)" : ""}`);
    x.cst("f", `Hệ số đổi đơn vị ${s1.unit} → ${unit}`, r.factor1, "", "bảng đổi đơn vị (sheet Stand)");
    x.inp("S2min", `Stand2 (chuẩn mA) ${s2.key || ""}: Min`, s2.min, "mA"); x.inp("S2max", "Stand2: Max", s2.max, "mA");
    x.inp("S2U", `Stand2: U theo GCN (${s2.uncUnit === "%" ? "%" : "mA"})`, s2.unc, s2.uncUnit === "%" ? "%" : "mA"); x.inp("S2rdg", "Stand2: sai số % số đọc", s2.rdg || 0, "%");
    if (!V2) x.inp("k_in", "Hệ số phủ dùng trong file Excel 2026", I.k || 2);
    x.hd("2. Chuẩn quy về đơn vị thiết bị");
    x.f("span", "Khoảng đo", "span = Max − Min", "{Max}-{Min}", I.max - I.min, unit);
    x.f("E9", "Min chuẩn (đơn vị thiết bị)", "E9 = Min_c · f", "{S1min}*{f}", r.E9, unit);
    x.f("E10", "Max chuẩn (đơn vị thiết bị)", "E10 = Max_c · f", "{S1max}*{f}", r.E10, unit);
    x.f("E11", "U chuẩn (đơn vị thiết bị)", s1.uncUnit === "%" ? "E11 = U (đã là %)" : "E11 = U_c · f", s1.uncUnit === "%" ? "{S1U}" : "{S1U}*{f}", r.E11);
    x.f("E12", "U chuẩn quy đổi (% FS chuẩn)", s1.uncUnit === "%" ? "E12 = U %" : "E12 = E11/(E10 − E9)·100", s1.uncUnit === "%" ? "{S1U}" : "{E11}/({E10}-{E9})*100", r.E12, "%");
    x.f("H12", "U chuẩn mA quy đổi (%)", s2.uncUnit === "%" ? "H12 = U %" : "H12 = U/(H10 − H9)·100", s2.uncUnit === "%" ? "{S2U}" : "{S2U}/({S2max}-{S2min})*100", r.H12, "%");
    x.hd(`3. Hồi quy y = a + b·x trên ${M} cặp (${m} tăng + ${m} giảm)`);
    x.v("X", "Áp suất (tăng rồi giảm)", "X = [x; x]", j => `{x[${j % m}]}`, M, I.points.concat(I.points).map(Number), unit);
    x.v("Y", "Dòng đo (tăng rồi giảm)", "Y = [I tăng; I giảm]", j => j < m ? `{I_tang[${j}]}` : `{I_giam[${j - m}]}`, M, I.rise.concat(I.fall).map(Number), "mA");
    x.v("I", "Dòng lý tưởng", "I = 4 + 16·(X − Min)/span", "4+16*({X[]}-{Min})/{span}", M, r.cols.map(c => c.I), "mA");
    x.f("a", "Hệ số chặn", "a = INTERCEPT(Y; X)", "INTERCEPT({Y:},{X:})", r.a);
    x.f("b", "Hệ số góc", "b = SLOPE(Y; X)", "SLOPE({Y:},{X:})", r.b);
    x.f("Sy", "Sai số chuẩn của hồi quy", "Sy = STEYX(Y; X)", "STEYX({Y:},{X:})", r.Sy, "mA");
    x.f("K34", "Σ(I − Ī)²", "DEVSQ(I)", "DEVSQ({I:})", r.K34); x.f("L34", "Σ I²", "SUMSQ(I)", "SUMSQ({I:})", r.L34);
    x.f("M34", "Số cặp n", "COUNT(I)", "COUNT({I:})", r.M34); x.f("N34", "Σ I", "SUM(I)", "SUM({I:})", r.N34);
    x.f("Sa", "Độ lệch chuẩn hệ số chặn", "Sa = Sy·√(ΣI²/(n·Σ(I−Ī)²))", "{Sy}*SQRT({L34}/{M34}/{K34})", r.Sa, "mA");
    x.f("Sb", "Độ lệch chuẩn hệ số góc", "Sb = Sy/√Σ(I−Ī)²", "{Sy}*SQRT(1/{K34})", r.Sb);
    x.f("r", "Hệ số tương quan a–b", "r = −ΣI/√(n·ΣI²)", "-{N34}/SQRT({M34}*{L34})", r.r);
    x.hd("4. Thành phần độ KĐBĐ (% span) tại từng cột");
    x.f("uv", "Chuẩn điện mA (Stand2)", "uv = √[(H12·(H10−H9)/(2·16))² + ((H13/(H10−H9))/(2√3))²]", `SQRT(({H12}*({S2max}-{S2min})/(2*16))^2+(({S2rdg}/({S2max}-{S2min}))/(2*${SQ3}))^2)`, r.uv, "%");
    x.v("uA_mA", "Loại A từ hồi quy (mA)", "√(Sa² + I²·Sb² + 2·I·Sa·Sb·r)", "SQRT(MAX(0,{Sa}^2+{I[]}^2*{Sb}^2+2*{I[]}*{Sa}*{Sb}*{r}))", M, r.cols.map(c => c.uAmA), "mA");
    x.v("uA", "Loại A (% span)", "uA = 100·uA_mA/16", "100*{uA_mA[]}/16", M, r.cols.map(c => c.uA), "%");
    const us = s1.deadweight ? ["Chuẩn quả cân: us = E12·|X|/(2·span)", "{E12}*ABS({X[]})/(2*{span})"]
      : V2 ? ["us = √[(E12·(E10−E9)/(2·span))² + (E13·|X|/(√3·span))²]", `SQRT(({E12}*({E10}-{E9})/(2*{span}))^2+({S1rdg}*ABS({X[]})/(${SQ3}*{span}))^2)`]
        : ["us = (E12·(E10−E9) + E13·|X|)/(2·span)", "({E12}*({E10}-{E9})+{S1rdg}*ABS({X[]}))/(2*{span})"];
    x.v("us", "Chuẩn áp suất (Stand1)", us[0], us[1], M, r.cols.map(c => c.us), "%");
    x.v("uc", "Độ KĐBĐ tổng hợp", "uc = √(uA² + us² + uv²)", "SQRT({uA[]}^2+{us[]}^2+{uv}^2)", M, r.cols.map(c => c.uc), "%");
    if (V2) {
      ktTable(x);
      x.v("nuA", "Bậc tự do của uA", "ν_A = n − 2", "{M34}-2", M, r.cols.map(() => r.M34 - 2));
      kBlock(x, true, "j", "uc", [["uA", "nuA"]], r.cols.map(c => c.nu), r.cols.map(c => c.kj), 2, M);
    }
    x.hd("5. Độ KĐBĐ mở rộng tại từng điểm đo");
    if (V2) {
      x.v("uc_d", "uc của chiều lớn hơn (bản sửa B4)", "MAX(uc tăng; uc giảm)", j => `IF({uc[${j}]}>={uc[${j + m}]},{uc[${j}]},{uc[${j + m}]})`, m, r.rows.map(q => q.ucAvg), "%");
      x.v("k_d", "k của chiều đó", "", j => `IF({uc[${j}]}>={uc[${j + m}]},{kj[${j}]},{kj[${j + m}]})`, m, r.rows.map(q => q.k));
    } else {
      x.v("uc_d", "Trung bình hai chiều", "(uc tăng + uc giảm)/2", j => `({uc[${j}]}+{uc[${j + m}]})/2`, m, r.rows.map(q => q.ucAvg), "%");
      x.v("k_d", "Hệ số phủ", "k", "{k_in}", m, r.rows.map(q => q.k));
    }
    x.v("Upct", "U (% span)", "U% = k·uc", "{k_d[]}*{uc_d[]}", m, r.rows.map(q => q.Upct), "%");
    x.v("U", "U (đơn vị thiết bị)", "U = U%·span/100", "{Upct[]}*{span}/100", m, r.rows.map(q => q.U), unit);
    x.v("I_lt", "Dòng lý tưởng tại điểm", "4 + 16·(x − Min)/span", "4+16*({x[]}-{Min})/{span}", m, r.rows.map(q => q.ideal), "mA");
    x.v("SHC_t", "Số hiệu chính chiều tăng", "I_lt − I tăng", "{I_lt[]}-{I_tang[]}", m, r.rows.map(q => q.shcR), "mA");
    x.v("SHC_g", "Số hiệu chính chiều giảm", "I_lt − I giảm", "{I_lt[]}-{I_giam[]}", m, r.rows.map(q => q.shcF), "mA");
    x.hd("6. Kết luận");
    x.f("Umax", "U lớn nhất", "MAX(U)", "MAX({U:})", r.Umax, unit);
    x.f("U_cb", "U công bố (2 chữ số có nghĩa, làm tròn lên)", "ROUNDUP 2 CSCN", upub("{Umax}"), uPubV(r.Umax), unit);
    x.f("SHCmax", "|SHC| lớn nhất", "MAX(|SHC|)", `MAX(${absmax("SHC_t")},${absmax("SHC_g")})`, r.shcMax, "mA");
    x.f("MPE", "Sai số cho phép", "acc·span/100", "{acc}*{span}/100", r.limU, unit);
    x.f("MPE_mA", "Sai số cho phép (mA)", "acc·16/100", "{acc}*16/100", r.limI, "mA");
    if (V2) {
      x.v("dec", "|sai số| + U tại từng điểm", "MAX(|SHC t|;|SHC g|)·span/16 + U", "MAX(ABS({SHC_t[]}),ABS({SHC_g[]}))*{span}/16+{U[]}", m, r.rows.map(q => Math.max(Math.abs(q.shcR), Math.abs(q.shcF)) * (I.max - I.min) / 16 + q.U), unit);
      x.f("dec_max", "Lớn nhất", "MAX", "MAX({dec:})", r.decRule, unit);
      verdict(x, "KQ", "Kết luận (quy tắc chung 06/11/2026)", "|sai số| + U ≤ MPE", "{dec_max}<={MPE}", r.pass);
    } else verdict(x, "KQ", "Kết luận (như file Excel 2026)", "Umax ≤ MPE và |SHC|max ≤ MPE mA", "AND({Umax}<={MPE},{SHCmax}<={MPE_mA})", r.pass);
  }

  /* ---------- PS / DPS – ĐLVN 133:2004 ---------- */
  function PS(x, r, unit) {
    const I = r.inp, V2 = r.fv === 2, s1 = I.stand1, n = I.n || 5, ris = r.dir === "Rising";
    x.hd("1. Số liệu đầu vào");
    x.inp("Pset", "Áp suất cài đặt", I.pset, unit); x.inp("acc", "Độ chính xác cho phép", I.acc, "% Pset");
    x.inp("P_H", "Áp suất mở (P.High)", I.high.map(Number), unit); x.inp("P_L", "Áp suất đóng (P.Low)", I.low.map(Number), unit);
    x.inp("n", "Số lần đo", n); x.inp("d", "Độ phân giải thước đặt mức", I.resolution || 0, unit);
    standIn(x, s1, unit, `Stand1 ${s1.key || s1.name || ""}${s1.deadweight ? " (quả cân)" : ""}`);
    x.cst("f", `Hệ số đổi đơn vị ${s1.unit} → ${unit}`, r.factor1);
    if (!V2) x.inp("k_in", "Hệ số phủ dùng trong file Excel 2026", I.k || 2);
    x.hd("2. Chiều tác động");
    x.f("E11", "Min chuẩn (đơn vị thiết bị)", "Min_c·f", "{S1min}*{f}", r.E11, unit); x.f("E12", "FS chuẩn (đơn vị thiết bị)", "Max_c·f", "{S1max}*{f}", r.E12, unit);
    x.f("E13", "U chuẩn (đơn vị thiết bị)", s1.uncUnit === "%" ? "U %" : "U_c·f", s1.uncUnit === "%" ? "{S1U}" : "{S1U}*{f}", r.E13);
    x.f("E14", "U chuẩn quy đổi (%)", s1.uncUnit === "%" ? "U %" : "E13/(E12 − E11)·100", s1.uncUnit === "%" ? "{S1U}" : "{E13}/({E12}-{E11})*100", r.E14, "%");
    x.v("G", "Pset − P_H", "", "{Pset}-{P_H[]}", I.high.length, r.G, unit); x.v("H", "Pset − P_L", "", "{Pset}-{P_L[]}", I.low.length, r.H, unit);
    x.f("chieu", "Chiều tác động", "Falling nếu |TB(G)| > |TB(H)|, ngược lại Rising", `IF(ABS(AVERAGE({G:}))>ABS(AVERAGE({H:})),"Falling","Rising")`, r.dir);
    x.hd("3. Độ KĐBĐ");
    x.f("F26", "Loại A – áp suất mở", "√(Σ(P_H − TB)²/(n(n−1)))", "SQRT(DEVSQ({P_H:})/({n}*({n}-1)))", r.F26, unit);
    x.f("F27", "Loại A – áp suất đóng", "√(Σ(P_L − TB)²/(n(n−1)))", "SQRT(DEVSQ({P_L:})/({n}*({n}-1)))", r.F27, unit);
    const F31 = s1.deadweight ? ["Quả cân: E14·Pset/200", "{E14}*{Pset}/(2*100)"]
      : V2 ? ["√[(E14·FS/200)² + (G14·|Pset|/(100√3))²]", `SQRT(({E14}*{E12}/200)^2+({S1rdg}*ABS({Pset})/(100*${SQ3}))^2)`]
        : ["(E14·FS + G14·Pset)/200", "({E14}*{E12}+{S1rdg}*{Pset})/(100*2)"];
    x.f("F31", "Chuẩn áp suất", F31[0], F31[1], r.F31, unit);
    x.f("F32", "Độ phân giải", "d/2", "{d}/2", r.F32, unit);
    x.f("F34", "uc chiều mở", "√(F26² + F31² + (F32/√3)²)", `SQRT({F26}^2+{F31}^2+({F32}/${SQ3})^2)`, r.F34, unit);
    x.f("F35", "uc chiều đóng", "√(F27² + F31² + (F32/√3)²)", `SQRT({F27}^2+{F31}^2+({F32}/${SQ3})^2)`, r.F35, unit);
    if (V2) { ktTable(x); x.f("nuA", "Bậc tự do loại A", "n − 1", "{n}-1", n - 1); kBlock(x, true, "", ris ? "F34" : "F35", [[ris ? "F26" : "F27", "nuA"]], r.nu, r.k); }
    else x.f("k", "Hệ số phủ", "k", "{k_in}", r.k);
    x.f("U", `Độ KĐBĐ mở rộng (chiều ${ris ? "Rising → F34" : "Falling → F35"})`, "U = k·uc", `{k}*{${ris ? "F34" : "F35"}}`, r.U, unit);
    x.f("U_cb", "U công bố (2 CSCN, làm tròn lên)", "ROUNDUP 2 CSCN", upub("{U}"), uPubV(r.U), unit);
    x.hd("4. Kết luận");
    x.f("J42", "max|Pset − P tác động| + U", "", `${absmax(ris ? "G" : "H")}+{U}`, r.J42, unit);
    x.f("K42", "Sai số cho phép", "acc·Pset/100", "{acc}*{Pset}/100", r.K42, unit);
    verdict(x, "KQ", "Kết luận", "U > 0 và J42 ≤ K42", "AND({U}>0,{J42}<={K42})", r.pass);
  }

  /* ---------- PG – ĐLVN 08:2011 (kiểm định, không tính U) ---------- */
  function PG(x, r, unit) {
    const I = r.inp;
    x.hd("1. Số liệu đầu vào");
    x.inp("Min", "Giới hạn dưới", I.min, unit); x.inp("Max", "Giới hạn trên", I.max, unit); x.inp("acc", "Cấp chính xác", I.acc, "%");
    x.inp("P_c", "Áp suất chuẩn", I.std.map(Number), unit); x.inp("P_t", "Số đọc chiều tăng", I.rise.map(Number), unit); x.inp("P_g", "Số đọc chiều giảm", I.fall.map(Number), unit);
    const m = I.std.length;
    x.hd("2. Số hiệu chính và kết luận");
    x.v("SHC_t", "SHC chiều tăng", "P chuẩn − P đọc", "{P_c[]}-{P_t[]}", m, r.rows.map(q => q.cR), unit);
    x.v("SHC_g", "SHC chiều giảm", "P chuẩn − P đọc", "{P_c[]}-{P_g[]}", m, r.rows.map(q => q.cF), unit);
    x.f("SHCmax", "|SHC| lớn nhất", "MAX(|SHC|)", `MAX(${absmax("SHC_t")},${absmax("SHC_g")})`, r.maxSHC, unit);
    x.f("MPE", "Sai số cho phép", "acc·(Max − Min)/100", "{acc}*({Max}-{Min})/100", r.lim, unit);
    verdict(x, "KQ", "Kết luận", "|SHC|max ≤ MPE", "{SHCmax}<={MPE}", r.pass);
    if (r.red) {
      x.inp("P_truoc", "Áp suất trước (kiểm tra sụt áp)", Number(I.before), unit); x.inp("P_sau", "Áp suất sau", Number(I.after), unit);
      x.f("sut", "Sụt áp", "(P trước − P sau)/P trước·100", "IF({P_truoc}=0,0,({P_truoc}-{P_sau})/{P_truoc}*100)", r.red.pct, "%");
      x.f("sut_KQ", "Sụt áp < 5 %", "", `IF({sut}<5,"ĐẠT","KHÔNG ĐẠT")`, r.red.ok ? "ĐẠT" : "KHÔNG ĐẠT");
    }
  }

  /* ---------- TS – DVK.LAB.TM.13 ---------- */
  function TS(x, r) {
    const I = r.inp, V2 = r.fv === 2, ris = r.rising, n = r.n;
    x.hd("1. Số liệu đầu vào");
    x.inp("Tset", "Nhiệt độ cài đặt", I.tset, "°C"); x.inp("acc", "Độ chính xác cho phép", I.acc, "% Tset");
    x.inp("T_set", "Nhiệt độ tác động (Set)", I.set.map(Number), "°C"); x.inp("T_reset", "Nhiệt độ trả về (Reset)", I.reset.map(Number), "°C");
    x.inp("n", "Số lần đo", n); x.inp("U_c", "U chuẩn nhiệt theo GCN (k = 2)", (I.stand && I.stand.unc) || 0, "°C");
    heatIn(x, "lo", I.heat, "Lò / bể nhiệt");
    if (V2) x.inp("d", "Độ phân giải số đọc chuẩn", I.res || 0, "°C"); else x.inp("k_in", "Hệ số phủ (file Excel 2026)", I.k || 2);
    x.hd(`2. Độ KĐBĐ (chiều ${ris ? "Rising: mở = Set" : "Falling: mở = Reset"})`);
    const Tm = ris ? "T_set" : "T_reset", Td = ris ? "T_reset" : "T_set";
    x.f("F30", "Loại A – nhiệt độ mở", "√(Σ(T − TB)²/(n(n−1)))", `SQRT(DEVSQ({${Tm}:})/({n}*({n}-1)))`, r.F30, "°C");
    x.f("F31", "Loại A – nhiệt độ đóng", "√(Σ(T − TB)²/(n(n−1)))", `SQRT(DEVSQ({${Td}:})/({n}*({n}-1)))`, r.F31, "°C");
    x.f("F33", "Chuẩn nhiệt", V2 ? "U_c/2" : "U_c/k", V2 ? "{U_c}/2" : "{U_c}/{k_in}", r.F33, "°C");
    x.f("F35", "Lò / bể nhiệt", "√((ổn định/√3)² + (radial/√3)² + (axial/√3)²)", heatF("lo"), r.F35, "°C");
    if (V2) x.f("uRes", "Độ phân giải số đọc chuẩn", "d/(2√3)", `{d}/(2*${SQ3})`, r.uRes, "°C");
    x.f("F36", "Thành phần chuẩn", V2 ? "√(F33² + F35² + u_pg²)" : "√(F33² + F35²)", V2 ? "SQRT({F33}^2+{F35}^2+{uRes}^2)" : "SQRT({F33}^2+{F35}^2)", r.F36, "°C");
    x.f("F38", "uc chiều mở", "√(F30² + F36²)", "SQRT({F30}^2+{F36}^2)", r.F38, "°C");
    x.f("F39", "uc chiều đóng", "√(F31² + F36²)", "SQRT({F31}^2+{F36}^2)", r.F39, "°C");
    if (V2) { ktTable(x); x.f("nuA", "Bậc tự do loại A", "n − 1", "{n}-1", n - 1); kBlock(x, true, "", ris ? "F38" : "F39", [[ris ? "F30" : "F31", "nuA"]], r.nu, r.k); }
    else x.f("k", "Hệ số phủ", "k", "{k_in}", r.k);
    x.f("U", "Độ KĐBĐ mở rộng", "U = k·uc", `{k}*{${ris ? "F38" : "F39"}}`, r.U, "°C");
    x.f("U_in", V2 ? "U in (2 CSCN, làm tròn lên)" : "U in (làm tròn 2 số lẻ)", "", V2 ? upub("{U}") : "ROUND({U},2)", r.Uprint, "°C");
    x.hd("3. Kết luận");
    x.v("dev", "Sai lệch Set − Tset", "", "{T_set[]}-{Tset}", I.set.length, r.setDev, "°C");
    x.f("devmax", "|sai lệch| lớn nhất", "MAX(|T − Tset|)", absmax("dev"), r.maxDev, "°C");
    x.f("MPE", "Sai số cho phép", "acc·Tset/100", "{acc}*{Tset}/100", r.lim, "°C");
    verdict(x, "KQ", "Kết luận", V2 ? "U > 0 và max|T − Tset| + U ≤ MPE" : "U > 0 và max|T − Tset| ≤ MPE", V2 ? "AND({U}>0,{devmax}+{U_in}<={MPE})" : "AND({U}>0,{devmax}<={MPE})", r.pass);
  }

  /* ---------- TT / TG (theo dải nhiệt) ---------- */
  const RN = { low: "Dải thấp (≤ 150 °C) – Stand1", mid: "Dải trung (150 ÷ 400 °C) – Stand2", high: "Dải cao (> 400 °C) – Stand2" };
  function ptIn(x, I, unitD) {
    I.pts.forEach((p, i) => {
      x.inp(`c_t${i + 1}`, `Điểm ${i + 1}: chuẩn chiều tăng`, p.sr.map(Number), "°C"); x.inp(`c_g${i + 1}`, `Điểm ${i + 1}: chuẩn chiều giảm`, p.sf.map(Number), "°C");
      x.inp(`d_t${i + 1}`, `Điểm ${i + 1}: thiết bị chiều tăng`, p.dr.map(Number), unitD); x.inp(`d_g${i + 1}`, `Điểm ${i + 1}: thiết bị chiều giảm`, p.df.map(Number), unitD);
    });
  }
  const groups = r => { const m = r.pt.length, idx = { low: [...Array(r.nL).keys()], mid: [...Array(r.nM).keys()].map(i => i + r.nL), high: [...Array(r.nH).keys()].map(i => m - r.nH + i) }; return idx; };
  function TT(x, r) {
    const I = r.inp, V2 = r.fv === 2, a = I.amm || {}, m = r.pt.length, n = r.n, G = groups(r);
    x.hd("1. Số liệu đầu vào");
    x.inp("Min", "Giới hạn dưới", I.min, "°C"); x.inp("Max", "Giới hạn trên", I.max, "°C"); x.inp("acc", "Độ chính xác cho phép", I.acc, "%FS");
    x.inp("d", "Độ phân giải transmitter", I.res || 0, "mA"); x.inp("n", "Số lần đọc mỗi chiều", n);
    ptIn(x, I, "mA");
    x.inp("A_U", `Ampe kế (Stand3): U theo GCN (${a.uncUnit === "%" ? "%" : "mA"})`, a.unc || 0, a.uncUnit === "%" ? "%" : "mA");
    x.inp("A_min", "Ampe kế: Min", a.min || 0, "mA"); x.inp("A_max", "Ampe kế: Max", a.max || 0, "mA"); x.inp("A_err", "Ampe kế: sai số / phân giải", a.err || 0, "mA");
    x.inp("U_s1", "Stand1: U theo GCN (k = 2)", (I.s1 && I.s1.unc) || 0, "°C"); heatIn(x, "s1", I.s1, "Lò Stand1");
    x.inp("U_s2", "Stand2: U theo GCN (k = 2)", (I.s2 && I.s2.unc) || 0, "°C"); heatIn(x, "s2", I.s2, "Lò Stand2");
    x.hd("2. Từng điểm đo");
    x.f("span", "Khoảng đo", "Max − Min", "{Max}-{Min}", I.max - I.min, "°C");
    x.f("Cj", "Hệ số đổi mA → °C", "span/16", "{span}/16", r.Cj, "°C/mA");
    x.v("t1", "Số đọc chuẩn đầu tiên (xếp dải)", "", j => `{c_t${j + 1}[0]}`, m, I.pts.map(p => Number(p.sr[0])), "°C");
    x.v("dai", "Dải", V2 ? "≤150 thấp; >400 cao; còn lại trung" : "≤150 thấp; >400 cao; điểm 1 dùng < 400, các điểm khác ≤ 400", j => `IF({t1[]}<=150,"low",IF({t1[]}>400,"high",IF({t1[]}${V2 || j ? "<=" : "<"}400,"mid","none")))`, m, r.cls);
    x.v("s_ct", "Độ lệch chuẩn chuẩn tăng", "STDEV", j => `STDEV({c_t${j + 1}:})`, m, r.pt.map(p => p.sSr), "°C");
    x.v("s_cg", "Độ lệch chuẩn chuẩn giảm", "STDEV", j => `STDEV({c_g${j + 1}:})`, m, r.pt.map(p => p.sSf), "°C");
    x.v("s_dt", "Độ lệch chuẩn thiết bị tăng", "STDEV", j => `STDEV({d_t${j + 1}:})`, m, r.pt.map(p => p.sDr), "mA");
    x.v("s_dg", "Độ lệch chuẩn thiết bị giảm", "STDEV", j => `STDEV({d_g${j + 1}:})`, m, r.pt.map(p => p.sDf), "mA");
    x.v("T_c", "Nhiệt độ chuẩn TB", "AVERAGE(chuẩn tăng, chuẩn giảm)", j => `AVERAGE({c_t${j + 1}:},{c_g${j + 1}:})`, m, r.pt.map(p => p.stdT), "°C");
    x.v("I_lt", "Dòng lý tưởng", "4 + 16·(T_c − Min)/span", "4+16*({T_c[]}-{Min})/{span}", m, r.pt.map(p => p.ideal), "mA");
    x.v("I_t", "Dòng TB chiều tăng", "AVERAGE", j => `AVERAGE({d_t${j + 1}:})`, m, r.pt.map(p => p.rise), "mA");
    x.v("I_g", "Dòng TB chiều giảm", "AVERAGE", j => `AVERAGE({d_g${j + 1}:})`, m, r.pt.map(p => p.fall), "mA");
    x.v("SHC_t", "SHC tăng", "I_lt − I_t", "{I_lt[]}-{I_t[]}", m, r.pt.map(p => p.cR), "mA");
    x.v("SHC_g", "SHC giảm", "I_lt − I_g", "{I_lt[]}-{I_g[]}", m, r.pt.map(p => p.cF), "mA");
    x.v("err", "Sai số % span", "MAX(|SHC|)/16·100", "MAX(ABS({SHC_t[]}),ABS({SHC_g[]}))/16*100", m, r.pt.map(p => p.err), "%");
    x.v("tre", "Trễ", "|I_g − I_t|", "ABS({I_g[]}-{I_t[]})", m, r.pt.map(p => p.hyst), "mA");
    x.hd("3. Thành phần chung");
    x.f("L17", "U ampe kế quy đổi", a.uncUnit === "%" ? "U%·(Max − Min)/100" : "U (mA)", a.uncUnit === "%" ? "{A_U}*({A_max}-{A_min})/100" : "{A_U}", r.L17, "mA");
    x.f("uch2", "Ampe kế đo dòng", "√((L17·Cj/2)² + (δ·Cj/(2√3))²)", `SQRT(({L17}*{Cj}/2)^2+(({A_err}*{Cj})/(2*${SQ3}))^2)`, r.F40, "°C");
    x.f("ubk3", "Độ phân giải transmitter", "0,5·d·Cj/√3", `0.5*{d}*{Cj}/${SQ3}`, r.F52, "°C");
    if (V2) ktTable(x);
    ["low", "mid", "high"].forEach(key => {
      const g = r.R[key]; if (!g.cnt) return;
      const ii = G[key], sx = "_" + key, S = key === "low" ? "s1" : "s2";
      x.hd(`4. ${RN[key]} · điểm ${ii.map(i => i + 1).join(", ")}`);
      x.f("sC" + sx, "Độ lệch chuẩn gộp số đọc chuẩn (RMS)", "√(Σs²/(2m))", `SQRT(SUMSQ(${ii.map(i => `{s_ct[${i}]},{s_cg[${i}]}`).join(",")})/${2 * ii.length})`, g.UltbS, "°C");
      x.f("sD" + sx, "Độ lệch chuẩn gộp số đọc mA (RMS)", "√(Σs²/(2m))", `SQRT(SUMSQ(${ii.map(i => `{s_dt[${i}]},{s_dg[${i}]}`).join(",")})/${2 * ii.length})`, g.UltbD, "mA");
      x.f("tre" + sx, "Trễ lớn nhất trong dải", "MAX", `MAX(${ii.map(i => `{tre[${i}]}`).join(",")})`, g.hyst, "mA");
      x.f("uch4" + sx, "Lặp lại của chuẩn", "s/√n", `{sC${sx}}/SQRT({n})`, g.uch4, "°C");
      x.f("uch1" + sx, "Chuẩn nhiệt", "U_chuẩn/2", `{U_${S}}/2`, g.uch1, "°C");
      x.f("uch3" + sx, "Lò / bể nhiệt", "√((ổn định/√3)² + (radial/√3)² + (axial/√3)²)", heatF(S), g.uch3, "°C");
      x.f("uch" + sx, "Thành phần chuẩn", "√(uch4² + uch1² + uch2² + uch3²)", `SQRT({uch4${sx}}^2+{uch1${sx}}^2+{uch2}^2+{uch3${sx}}^2)`, g.uch, "°C");
      x.f("ubk1" + sx, "Lặp lại của transmitter", "s·Cj/√n", `{sD${sx}}*{Cj}/SQRT({n})`, g.ubk1, "°C");
      x.f("ubk2" + sx, "Trễ", "trễ·Cj/(2√3)", `{tre${sx}}*{Cj}/(2*${SQ3})`, g.ubk2, "°C");
      x.f("uTB" + sx, "Thành phần thiết bị", "√(ubk1² + ubk2² + ubk3²)", `SQRT({ubk1${sx}}^2+{ubk2${sx}}^2+{ubk3}^2)`, g.uDUT, "°C");
      x.f("uc" + sx, "Độ KĐBĐ tổng hợp", "√(uch² + uTB²)", `SQRT({uch${sx}}^2+{uTB${sx}}^2)`, g.uc, "°C");
      if (V2) x.f("nu" + sx + "_A", "Bậc tự do uch4 và ubk1", "2·m·(n − 1)", `2*${ii.length}*({n}-1)`, 2 * g.cnt * (n - 1));
      kBlock(x, V2, sx, "uc" + sx, [["uch4" + sx, "nu" + sx + "_A"], ["ubk1" + sx, "nu" + sx + "_A"]], g.nu, g.k, 2);
      x.f("U" + sx, "Độ KĐBĐ mở rộng", "U = k·uc", `{k${sx}}*{uc${sx}}`, g.U, "°C");
      x.f("Ucb" + sx, "U công bố (2 CSCN, làm tròn lên)", "", upub(`{U${sx}}`), uPubV(g.U), "°C");
    });
    x.hd("5. Kết luận");
    const Uof = k => r.R[k].cnt ? `{U_${k}}` : "0";
    x.f("Umax", "U lớn nhất các dải", "MAX", `MAX(${Uof("low")},${Uof("mid")},${Uof("high")})`, r.Umax, "°C");
    x.f("MPE", "Sai số cho phép", "acc·span/100", "{acc}/100*{span}", r.lim, "°C");
    if (V2) {
      x.f("Ucb_max", "U công bố lớn nhất (cho điểm ngoài dải)", "", upub("{Umax}"), uPubV(r.Umax), "°C");
      x.v("dec", "|sai số| (°C) + U của dải chứa điểm", "MAX(|SHC|)·Cj + U_dải", j => `MAX(ABS({SHC_t[]}),ABS({SHC_g[]}))*{Cj}+{${r.R[r.cls[j]] ? "Ucb_" + r.cls[j] : "Ucb_max"}}`, m,
        r.pt.map((p, i) => Math.max(Math.abs(p.cR), Math.abs(p.cF)) * r.Cj + uPubV((r.R[r.cls[i]] || { U: r.Umax }).U)), "°C");
      x.f("dec_max", "Lớn nhất", "MAX", "MAX({dec:})", r.decRule, "°C");
      verdict(x, "KQ", "Kết luận (quy tắc chung 06/11/2026)", "|sai số| + U ≤ MPE", "{dec_max}<={MPE}", r.pass);
    } else {
      x.f("errmax", "Sai số % lớn nhất", "MAX", "MAX({err:})", r.maxErr, "%");
      x.f("SHCmax", "|SHC| lớn nhất", "MAX", `MAX(${absmax("SHC_t")},${absmax("SHC_g")})`, r.maxSHC, "mA");
      verdict(x, "KQ", "Kết luận (như file Excel 2026)", "MAX(sai số %, U các dải, |SHC|) ≤ MPE", `MAX({errmax},${Uof("low")},${Uof("mid")},${Uof("high")},{SHCmax})<={MPE}`, r.pass);
    }
  }
  function TG(x, r) {
    const I = r.inp, V2 = r.fv === 2, m = r.pt.length, n = r.n, G = groups(r);
    x.hd("1. Số liệu đầu vào");
    x.inp("Min", "Giới hạn dưới", I.min, "°C"); x.inp("Max", "Giới hạn trên", I.max, "°C"); x.inp("acc", "Độ chính xác cho phép", I.acc, "%FS");
    x.inp("d", "Độ chia nhỏ nhất", r.res, "°C"); x.inp("F7", "Hệ số kiểu đồng hồ (Analog = 1, Digital = 0,5)", r.F7); x.inp("n", "Số lần đọc mỗi chiều", n);
    ptIn(x, I, "°C");
    x.inp("U_s1", "Stand1: U theo GCN (k = 2)", (I.s1 && I.s1.unc) || 0, "°C"); heatIn(x, "s1", I.s1, "Lò Stand1");
    x.inp("U_s2", "Stand2: U theo GCN (k = 2)", (I.s2 && I.s2.unc) || 0, "°C"); heatIn(x, "s2", I.s2, "Lò Stand2");
    x.hd("2. Từng điểm đo");
    x.v("t1", "Số đọc chuẩn đầu tiên (xếp dải)", "", j => `{c_t${j + 1}[0]}`, m, I.pts.map(p => Number(p.sr[0])), "°C");
    x.v("dai", "Dải", "≤150 thấp; >400 cao; còn lại trung", `IF({t1[]}<=150,"low",IF({t1[]}>400,"high","mid"))`, m, r.cls);
    x.v("s_ct", "Độ lệch chuẩn chuẩn tăng", "STDEV", j => `STDEV({c_t${j + 1}:})`, m, r.pt.map(p => p.sSr), "°C");
    x.v("s_cg", "Độ lệch chuẩn chuẩn giảm", "STDEV", j => `STDEV({c_g${j + 1}:})`, m, r.pt.map(p => p.sSf), "°C");
    x.v("s_dt", "Độ lệch chuẩn đồng hồ tăng", "STDEV", j => `STDEV({d_t${j + 1}:})`, m, r.pt.map(p => p.sDr), "°C");
    x.v("s_dg", "Độ lệch chuẩn đồng hồ giảm", "STDEV", j => `STDEV({d_g${j + 1}:})`, m, r.pt.map(p => p.sDf), "°C");
    x.v("T_c", "Nhiệt độ chuẩn TB", "AVERAGE(TB tăng, TB giảm)", j => `AVERAGE(AVERAGE({c_t${j + 1}:}),AVERAGE({c_g${j + 1}:}))`, m, r.pt.map(p => p.stdT), "°C");
    x.v("t_t", "Số đọc TB chiều tăng", "AVERAGE", j => `AVERAGE({d_t${j + 1}:})`, m, r.pt.map(p => p.rise), "°C");
    x.v("t_g", "Số đọc TB chiều giảm", "AVERAGE", j => `AVERAGE({d_g${j + 1}:})`, m, r.pt.map(p => p.fall), "°C");
    x.v("SHC_t", "SHC tăng", "T_c − t_t", "{T_c[]}-{t_t[]}", m, r.pt.map(p => p.corr), "°C");
    x.v("SHC_g", "SHC giảm", "T_c − t_g", "{T_c[]}-{t_g[]}", m, r.pt.map(p => p.cF), "°C");
    x.v("tre", "Trễ", "|t_g − t_t|", "ABS({t_g[]}-{t_t[]})", m, r.pt.map(p => p.hyst), "°C");
    x.hd("3. Thành phần chung");
    x.f("ubk3", "Độ phân giải đồng hồ", "F7·d/√3", `{F7}*{d}/${SQ3}`, r.ubk3, "°C");
    if (V2) ktTable(x);
    ["low", "mid", "high"].forEach(key => {
      const g = r.R[key]; if (!g.cnt) return;
      const ii = G[key], sx = "_" + key, S = key === "low" ? "s1" : "s2";
      x.hd(`4. ${RN[key]} · điểm ${ii.map(i => i + 1).join(", ")}`);
      x.f("sC" + sx, "Độ lệch chuẩn gộp số đọc chuẩn (RMS)", "√(Σs²/(2m))", `SQRT(SUMSQ(${ii.map(i => `{s_ct[${i}]},{s_cg[${i}]}`).join(",")})/${2 * ii.length})`, g.UltbS, "°C");
      x.f("sD" + sx, "Độ lệch chuẩn gộp số đọc đồng hồ (RMS)", "√(Σs²/(2m))", `SQRT(SUMSQ(${ii.map(i => `{s_dt[${i}]},{s_dg[${i}]}`).join(",")})/${2 * ii.length})`, g.UltbD, "°C");
      x.f("tre" + sx, "Trễ lớn nhất trong dải", "MAX", `MAX(${ii.map(i => `{tre[${i}]}`).join(",")})`, g.hyst, "°C");
      x.f("uch4" + sx, "Lặp lại của chuẩn", "s/√n", `{sC${sx}}/SQRT({n})`, g.uch4, "°C");
      x.f("uch1" + sx, "Chuẩn nhiệt", "U_chuẩn/2", `{U_${S}}/2`, g.uch1, "°C");
      x.f("uch3" + sx, "Lò / bể nhiệt", "√((ổn định/√3)² + (radial/√3)² + (axial/√3)²)", heatF(S), g.uch3, "°C");
      x.f("uch" + sx, "Thành phần chuẩn", "√(uch4² + uch1² + uch3²)", `SQRT({uch4${sx}}^2+{uch1${sx}}^2+{uch3${sx}}^2)`, g.uch, "°C");
      x.f("ubk2" + sx, "Lặp lại của đồng hồ", "s/√n", `{sD${sx}}/SQRT({n})`, g.ubk2, "°C");
      x.f("ubk1" + sx, "Trễ", "trễ/(2√3)", `{tre${sx}}/(2*${SQ3})`, g.ubk1, "°C");
      x.f("uTB" + sx, "Thành phần thiết bị", "√(ubk2² + ubk1² + ubk3²)", `SQRT({ubk2${sx}}^2+{ubk1${sx}}^2+{ubk3}^2)`, g.uDUT, "°C");
      x.f("uc" + sx, "Độ KĐBĐ tổng hợp", "√(uch² + uTB²)", `SQRT({uch${sx}}^2+{uTB${sx}}^2)`, g.uc, "°C");
      if (V2) x.f("nu" + sx + "_A", "Bậc tự do uch4 và ubk2", "2·m·(n − 1)", `2*${ii.length}*({n}-1)`, 2 * g.cnt * (n - 1));
      kBlock(x, V2, sx, "uc" + sx, [["uch4" + sx, "nu" + sx + "_A"], ["ubk2" + sx, "nu" + sx + "_A"]], g.nu, g.k, 2);
      x.f("U" + sx, "Độ KĐBĐ mở rộng", "U = k·uc", `{k${sx}}*{uc${sx}}`, g.U, "°C");
      x.f("Ucb" + sx, "U công bố (2 CSCN, làm tròn lên)", "", upub(`{U${sx}}`), uPubV(g.U), "°C");
    });
    x.hd("5. Kết luận");
    const Uof = k => r.R[k].cnt ? `{U_${k}}` : "0";
    x.f("Umax", "U lớn nhất các dải", "MAX", `MAX(${Uof("low")},${Uof("mid")},${Uof("high")})`, r.Umax, "°C");
    x.f("MPE", "Sai số cho phép", "acc·(Max − Min)/100", "{acc}/100*({Max}-{Min})", r.lim, "°C");
    if (V2) {
      x.v("dec", "|sai số| + U của dải chứa điểm", "MAX(|SHC t|, |SHC g|) + U_dải", j => `MAX(ABS({SHC_t[]}),ABS({SHC_g[]}))+{Ucb_${r.cls[j]}}`, m,
        r.pt.map((p, i) => Math.max(Math.abs(p.corr), Math.abs(p.cF)) + uPubV(r.R[r.cls[i]].U)), "°C");
      x.f("dec_max", "Lớn nhất", "MAX", "MAX({dec:})", r.decRule, "°C");
      verdict(x, "KQ", "Kết luận (quy tắc chung 06/11/2026)", "|sai số| + U ≤ MPE", "{dec_max}<={MPE}", r.pass);
    } else {
      x.f("SHCmax", "|SHC| lớn nhất (chiều tăng)", "MAX", absmax("SHC_t"), r.maxSHC, "°C");
      verdict(x, "KQ", "Kết luận (như file Excel 2026)", "MAX(Umax, |SHC|max) ≤ MPE", "MAX({Umax},{SHCmax})<={MPE}", r.pass);
    }
  }

  /* ---------- RTD – ĐLVN 125:2003 ---------- */
  function RTD(x, r) {
    const I = r.inp, V2 = r.fv === 2, mt = I.meter || {}, m = r.T.length, n = r.n, neg = r.neg, deg = neg ? 3 : 2;
    x.hd("1. Số liệu đầu vào");
    x.inp("Min", "Giới hạn dưới", I.min, "°C"); x.inp("Max", "Giới hạn trên", I.max, "°C"); x.inp("acc", "Độ chính xác cho phép", I.acc, "%FS");
    x.inp("S", "Độ nhạy", r.sens, "Ω/°C"); x.inp("T", "Nhiệt độ chuẩn tại các điểm", r.T, "°C");
    I.pts.forEach((p, i) => x.inp(`R${i + 1}`, `Điểm ${i + 1}: điện trở đọc`, p.dut.map(Number), "Ω"));
    x.inp("U_s1", "Stand1: U theo GCN", (I.s1 && I.s1.unc) || 0, "°C"); heatIn(x, "s1", I.s1, "Lò Stand1");
    x.inp("U_s2", "Stand2: U theo GCN", (I.s2 && I.s2.unc) || 0, "°C"); heatIn(x, "s2", I.s2, "Lò Stand2");
    x.inp("M_U", `Thiết bị đo Ω (Stand3): U (${mt.uncUnit || "Ω"})`, mt.unc || 0, mt.uncUnit || "Ω"); x.inp("M_max", "Thiết bị đo Ω: Max", mt.max || 0, "Ω"); x.inp("M_err", "Thiết bị đo Ω: sai số / phân giải", mt.err || 0, "Ω");
    x.inp("kS", "k của U chuẩn (GCN chuẩn)", V2 ? 2 : (I.k || 2));
    x.cst("R_pt100", "Điện trở Pt100 chuẩn tại nhiệt độ điểm (Bảng giá trị chuẩn / IEC 60751)", r.rows.map(q => q.ref), "Ω", "bảng tra");
    x.hd(`2. Đặc tuyến R(t) – bình phương tối thiểu bậc ${deg} trên 5 điểm đầu`);
    x.v("R_tb", "Điện trở TB", "AVERAGE", j => `AVERAGE({R${j + 1}:})`, m, r.Rm, "Ω");
    x.v("s_R", "Độ lệch chuẩn số đọc", "STDEV", j => `STDEV({R${j + 1}:})`, m, r.Si, "Ω");
    const pw = deg === 3 ? "{1;2;3}" : "{1;2}";
    for (let i = 0; i <= deg; i++) x.f("c" + i, `Hệ số c${i} (R = c0 + c1·t + c2·t²${deg === 3 ? " + c3·t³" : ""})`, `LINEST(R_tb; t^${pw})`, `INDEX(LINEST({R_tb:5},{T:5}^${pw}),1,${deg + 1 - i})`, r.fit[i]);
    x.v("R_fit", "Điện trở theo đặc tuyến", "c0 + c1·t + c2·t²" + (deg === 3 ? " + c3·t³" : ""), "{c0}+{c1}*{T[]}+{c2}*{T[]}^2" + (deg === 3 ? "+{c3}*{T[]}^3" : ""), m, r.Rfit, "Ω");
    x.v("du", "Phần dư (5 điểm đầu)", "R_fit − R_tb", "{R_fit[]}-{R_tb[]}", 5, r.res, "Ω");
    x.f("ss", "Tổng bình phương dư", "SUMSQ(dư)", "SUMSQ({du:})", r.ss, "Ω²");
    x.hd("3. Thành phần thiết bị (°C)");
    x.f("ubk6", "Độ khớp đặc tuyến", V2 ? `√(Σdư²/(5 − ${deg + 1}))/S` : "√(Σdư²/((5 − 3)·S))", V2 ? `SQRT({ss}/(5-${deg + 1}))/{S}` : "SQRT({ss}/((5-3)*{S}))", r.Q36, "°C");
    x.f("sTB", V2 ? "Độ lệch chuẩn gộp số đọc Ω" : "S(DUT) như file Excel (không lấy căn)", V2 ? "√(Σs²/5)" : "Σs²/5", V2 ? "SQRT(SUMSQ({s_R:5})/5)" : "SUMSQ({s_R:5})/5", r.O33, "Ω");
    x.f("ubk5", "Lặp lại", "sTB/(√n·S)", "{sTB}/(SQRT(5)*{S})", r.Q34, "°C");
    x.f("ubk4", "Trễ tại điểm 3", "|R6 − R3|/(2√3·S)", `ABS({R_tb[5]}-{R_tb[2]})/(2*${SQ3}*{S})`, r.Q35, "°C");
    x.f("uTB", "Thành phần thiết bị", "√(ubk5² + ubk4² + ubk6²)", "SQRT({ubk5}^2+{ubk4}^2+{ubk6}^2)", r.Q38, "°C");
    x.hd("4. Thành phần chuẩn (°C)");
    x.f("uch1", "Chuẩn nhiệt (Max ≥ 150 → Stand2)", "U_chuẩn/kS", "IF({Max}>=150,{U_s2},{U_s1})/{kS}", r.G35, "°C");
    const Um = mt.uncUnit === "%" ? "{M_U}*{M_max}/100" : mt.uncUnit === "ppm" ? "{M_U}*{M_max}*1E-6" : "{M_U}";
    x.f("uch2", "Thiết bị đo điện trở", "√((U_Ω/(S·kS))² + ((δ/S)/(2√3))²)", `SQRT((${Um}/({S}*{kS}))^2+(({M_err}/{S})/(2*${SQ3}))^2)`, r.G36, "°C");
    x.f("uch3", "Lò / bể nhiệt (Max < 140 → Stand1)", "√((ổn định/√3)² + (radial/√3)² + (axial/√3)²)", `IF({Max}<140,${heatF("s1")},${heatF("s2")})`, r.G37, "°C");
    x.f("uch", "Thành phần chuẩn", "√(uch1² + uch2² + uch3²)", "SQRT({uch1}^2+{uch2}^2+{uch3}^2)", r.G38, "°C");
    x.hd("5. Tổng hợp");
    x.f("uc", "Độ KĐBĐ tổng hợp", "√(uch² + uTB²)", "SQRT({uch}^2+{uTB}^2)", r.G39, "°C");
    if (V2) { ktTable(x); x.f("nu5", "Bậc tự do ubk5", "5·(n − 1)", "5*(5-1)", 20); x.f("nu6", "Bậc tự do ubk6", "5 − p", `5-${deg + 1}`, 5 - (deg + 1)); }
    kBlock(x, V2, "", "uc", [["ubk5", "nu5"], ["ubk6", "nu6"]], r.nu, r.k, 2);
    x.f("U", "Độ KĐBĐ mở rộng", "U = k·uc", "{k}*{uc}", r.U, "°C");
    x.f("U_in", V2 ? "U in (2 CSCN, làm tròn lên)" : "U in (làm tròn 2 số lẻ)", "", V2 ? upub("{U}") : "ROUND({U},2)", r.Uprint, "°C");
    x.hd("6. Kết luận");
    x.v("dR", "Sai lệch điện trở", "R_fit − R_Pt100", "{R_fit[]}-{R_pt100[]}", m, r.rows.map(q => q.eO), "Ω");
    x.v("dt", "Sai lệch nhiệt độ", "ΔR/S", "{dR[]}/{S}", m, r.rows.map(q => q.eC), "°C");
    x.f("dtmax", V2 ? "|Δt| lớn nhất" : "|Δt| lớn nhất (làm tròn 2 số lẻ như Excel)", "", V2 ? absmax("dt") : "SUMPRODUCT(MAX(ABS(ROUND({dt:},2))))", V2 ? Math.max(...r.rows.map(q => Math.abs(q.eC))) : r.maxE, "°C");
    x.f("MPE", "Sai số cho phép", "acc·(Max − Min)/100", "{acc}*({Max}-{Min})/100", r.lim, "°C");
    verdict(x, "KQ", "Kết luận", "max|Δt| + U ≤ MPE", "{dtmax}+{U_in}<={MPE}", r.pass);
  }

  /* ---------- TC – ĐLVN 161:2005 ---------- */
  function TC(x, r) {
    const I = r.inp, V2 = r.fv === 2, pt = r.pt, N = pt.length, its = r.its, ty = r.tcType;
    const odd = [0, 2, 4, 6].filter(i => pt[i]), Nd = V2 ? odd.length : 8;
    x.hd("1. Số liệu đầu vào");
    x.inp("Min", "Giới hạn dưới", I.min || 0, "°C"); x.inp("Max", "Giới hạn trên", I.max, "°C"); x.inp("acc", "Độ chính xác cho phép", I.acc, "%FS");
    I.pts.forEach((p, i) => { x.inp(`tc${i + 1}`, `Điểm ${i + 1}: nhiệt độ chuẩn`, p.std.map(Number), "°C"); x.inp(`E${i + 1}`, `Điểm ${i + 1}: sức điện động đọc`, p.dut.map(Number), "mV"); });
    x.inp("U_CJ", "Bù đầu tự do (U)", I.uCJ || 0, "°C");
    heatIn(x, "h1", I.h1 || I.s1, "Lò Stand1"); heatIn(x, "h2", I.h2 || I.s2, "Lò Stand2");
    x.inp("U_s1", "Stand1: U theo GCN", (I.s1 && I.s1.unc) || 0, "°C"); x.inp("U_s2", "Stand2: U theo GCN", (I.s2 && I.s2.unc) || 0, "°C");
    x.inp("mV_U", "Milivôn kế: U (% số đọc)", (I.mv && I.mv.unc) || 0, "%"); x.inp("mV_d", "Milivôn kế: độ phân giải", I.mvRes || 0.001, "mV");
    x.inp("kS", "k của U chuẩn (GCN chuẩn)", V2 ? 2 : (I.k || 2));
    x.hd(`2. Hàm chuẩn ITS-90 cặp nhiệt loại ${ty} (sheet Ref)`);
    x.cst("pw", "Số mũ i", [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10], "", "i = 0…10");
    x.cst("e1", `E(t) đoạn 1 (${its.r1}): hệ số`, its.e1, "", "ITS-90"); x.cst("a1", "Số hạng mũ đoạn 1 (α0; α1; t0)", its.a1, "", "ITS-90");
    x.cst("e2", `E(t) đoạn 2 (${its.r2}): hệ số`, its.e2, "", "ITS-90"); x.cst("a2", "Số hạng mũ đoạn 2 (α0; α1; t0)", its.a2, "", "ITS-90");
    x.cst("t1", "Hàm ngược ΔE → Δt đoạn 1: hệ số (i = 0…9)", its.t1, "", "ITS-90"); x.cst("t2", "Hàm ngược ΔE → Δt đoạn 2: hệ số (i = 0…9)", its.t2, "", "ITS-90");
    if (!V2) x.cst("t1z", "Hàm ngược đoạn 1 như file Excel (ô C1 để trống = 0)", its.t1.map((v, i) => i === 1 ? 0 : v), "", "Ref!$JH$37 trống");
    const K = window.LabCalc2.ITS.K;
    if (!V2 && ty !== "K") { x.cst("Ke1", "Loại K – E(t) đoạn −270…0", K.e1, "", "ITS-90"); x.cst("Ke2", "Loại K – E(t) đoạn 0…1372", K.e2, "", "ITS-90"); x.cst("Ka2", "Loại K – số hạng mũ", K.a2, "", "ITS-90"); }
    const poly = (c, t) => `({${c}[0]}+SUMPRODUCT({${c}:1-10},(${t})^{pw:1-10}))`;
    const ex = (a, t) => `{${a}[0]}*EXP({${a}[1]}*((${t})-{${a}[2]})^2)`;
    const lo = t => ty === "J" ? `(${t})<760` : `(${t})<=0`;
    const emf = t => `IF(${lo(t)},${poly("e1", t)}+${ex("a1", t)},${poly("e2", t)}+${ex("a2", t)})`;
    const KE = ty === "K" ? ["e1", "e2", "a2"] : ["Ke1", "Ke2", "Ka2"];
    const emfK = t => `IF((${t})<0,${poly(KE[0], t)},${poly(KE[1], t)}+${ex(KE[2], t)})`;
    const inv = (c, e) => `({${c}[0]}+SUMPRODUCT({${c}:1-9},(${e})^{pw:1-9}))`;
    x.hd("3. Từng điểm đo");
    x.v("t", "Nhiệt độ chuẩn TB", "AVERAGE", j => `AVERAGE({tc${j + 1}:})`, N, pt.map(p => p.t), "°C");
    x.v("E", "Sức điện động TB", "AVERAGE", j => `AVERAGE({E${j + 1}:})`, N, pt.map(p => p.E), "mV");
    x.v("E_ref", "E chuẩn ITS-90 tại t", `Σ c_i·t^i + α0·e^(α1(t−t0)²); đoạn 1 khi ${ty === "J" ? "t < 760" : "t ≤ 0"}`, emf("{t[]}"), N, pt.map(p => p.Eref), "mV");
    x.v("dE", "Sai lệch sức điện động", "E − E_ref", "{E[]}-{E_ref[]}", N, pt.map(p => p.dE), "mV");
    x.v("t_lab", "Nhiệt độ điểm (làm tròn)", "ROUND(t; 0)", "ROUND({t[]},0)", N, pt.map(p => Math.round(p.t)), "°C");
    x.v("dT", "Đổi ΔE ra °C (hàm ngược ITS-90)", V2 ? "dấu(ΔE)·Σ d_i·|ΔE|^i" : "dấu(ΔE)·Σ d_i·|ΔE|^i (đoạn 1 bỏ d1 như Excel)", `IF({dE[]}<0,-1,1)*IF({t_lab[]}<0,${inv(V2 ? "t1" : "t1z", "ABS({dE[]})")},${inv("t2", "ABS({dE[]})")})`, N, pt.map(p => p.dT), "°C");
    x.v("s_c", "Độ lệch chuẩn số đọc chuẩn", V2 ? "STDEV(5 lần đọc)" : "STDEV(5 lần đọc + giá trị TB) như Excel", j => V2 ? `STDEV({tc${j + 1}:})` : `STDEV({tc${j + 1}:},AVERAGE({tc${j + 1}:}))`, N, pt.map(p => p.sStd), "°C");
    x.v("s_E", "Độ lệch chuẩn số đọc mV", "STDEV", j => `STDEV({E${j + 1}:})`, N, pt.map(p => p.sDut), "mV");
    x.v("V", V2 ? "ΔE theo hàm chuẩn đúng loại" : "ΔE theo bảng loại K (như Excel)", V2 ? "E − E_ref" : "E − E_K(t)", V2 ? "{E[]}-{E_ref[]}" : `{E[]}-${emfK("{t[]}")}`, N, pt.map(p => p.V), "mV");
    if (V2) {
      x.v("E_p", "E(t + 0,5)", "", emf("{t[]}+0.5"), N, null, "mV"); x.v("E_m", "E(t − 0,5)", "", emf("{t[]}-0.5"), N, null, "mV");
      x.v("dEdt", "dE/dt", "E(t+0,5) − E(t−0,5)", "{E_p[]}-{E_m[]}", N, null, "mV/°C");
      x.f("S", "Độ nhạy (dE/dt nhỏ nhất)", "MIN(dE/dt)", "MIN({dEdt:})", r.S, "mV/°C");
    } else x.cst("S", "Độ nhạy (Ref!C37:C38)", r.S, "mV/°C", "bảng Ref");
    x.hd("4. Thành phần chuẩn (°C)");
    x.f("s_chuan", `Độ lệch chuẩn gộp số đọc chuẩn (điểm ${odd.map(i => i + 1).join(", ")})`, `√(Σs²/${Nd})`, `SQRT(SUMSQ(${odd.map(i => `{s_c[${i}]}`).join(",")})/${Nd})`, r.Ultb, "°C");
    x.f("uch9", "Lặp lại của chuẩn", "s/√5", "{s_chuan}/SQRT(5)", r.uch9, "°C");
    x.f("uch7", "Bù đầu tự do", "U_CJ/kS", "{U_CJ}/{kS}", r.uch7, "°C");
    x.f("uch8", "Lò nhiệt (Max ≤ 140 → Stand1)", "√((ổn định/√3)² + (radial/√3)² + (axial/√3)²)", `IF({Max}<=140,${heatF("h1")},${heatF("h2")})`, r.uch8, "°C");
    x.f("uch1", "Chuẩn nhiệt (Max ≥ 155 → Stand2)", "U_chuẩn/kS", "IF({Max}>=155,{U_s2},{U_s1})/{kS}", r.uch1, "°C");
    x.f("uch", "Thành phần chuẩn", "√(uch9² + uch7² + uch8² + uch1²)", "SQRT({uch9}^2+{uch7}^2+{uch8}^2+{uch1}^2)", r.uch, "°C");
    x.hd("5. Thành phần cặp nhiệt + milivôn kế (°C)");
    x.f("s_TB", "Độ lệch chuẩn gộp số đọc mV", `√(Σs²/${Nd})`, `SQRT(SUMSQ(${odd.map(i => `{s_E[${i}]}`).join(",")})/${Nd})`, r.UltbD, "mV");
    x.f("ubk6", "Lặp lại", "s/√5", "{s_TB}/SQRT(5)", r.ubk6);
    x.f("ubk1", "Milivôn kế (tại điểm cuối)", "(U%·E/100)/(kS·S)", `({mV_U}*{E[${N - 1}]}/100)/({kS}*{S})`, r.ubk1, "°C");
    x.f("ubk2", "Độ phân giải milivôn kế", "0,5·d/(√3·S)", `0.5*{mV_d}/(${SQ3}*{S})`, r.ubk2, "°C");
    for (let i = 0; i <= 2; i++) x.f("a" + i + "_fit", `Hồi quy ΔE = a0 + a1·t + a2·t²: a${i}`, "LINEST(V; t^{1;2})", `INDEX(LINEST({V:},{t:}^{1;2}),1,${3 - i})`, r.a[i]);
    x.v("V_fit", "ΔE theo hồi quy", "a0 + a1·t + a2·t²", "{a0_fit}+{a1_fit}*{t[]}+{a2_fit}*{t[]}^2", N, pt.map(p => r.a[0] + r.a[1] * p.t + r.a[2] * p.t ** 2), "mV");
    x.f("ss", "Tổng bình phương dư", "SUMXMY2(V; V_fit)", "SUMXMY2({V:},{V_fit:})", pt.reduce((s, p) => s + (p.V - (r.a[0] + r.a[1] * p.t + r.a[2] * p.t ** 2)) ** 2, 0), "mV²");
    x.f("ubk7", "Độ khớp hồi quy", V2 ? "√(Σdư²/(N − 3))/S" : "√(Σdư²/(5·S)) như Excel", V2 ? `SQRT({ss}/(${N}-3))/{S}` : "SQRT({ss}/(5*{S}))", r.ubk7, "°C");
    x.f("ubk8", "Độ ổn định cặp nhiệt", "Max·0,1/100", "{Max}/100*0.1", r.ubk8, "°C");
    x.f("uTB", "Thành phần thiết bị", "√(ubk6² + ubk1² + ubk2² + ubk7² + ubk8²)", "SQRT({ubk6}^2+{ubk1}^2+{ubk2}^2+{ubk7}^2+{ubk8}^2)", r.uDUT, "°C");
    x.hd("6. Tổng hợp");
    x.f("uc", "Độ KĐBĐ tổng hợp", "√(uch² + uTB²)", "SQRT({uch}^2+{uTB}^2)", r.uc, "°C");
    if (V2) { ktTable(x); x.f("nuA", "Bậc tự do uch9, ubk6", "số điểm lẻ·(5 − 1)", `${odd.length}*(5-1)`, odd.length * 4); x.f("nuF", "Bậc tự do ubk7", "N − 3", `${N}-3`, N - 3); }
    kBlock(x, V2, "", "uc", [["uch9", "nuA"], ["ubk6", "nuA"], ["ubk7", "nuF"]], r.nu, r.k, 2);
    x.f("U", "Độ KĐBĐ mở rộng", "U = k·uc", "{k}*{uc}", r.U, "°C");
    if (V2) x.f("U_in", "U in (2 CSCN, làm tròn lên)", "", upub("{U}"), Number(r.Utext), "°C");
    x.hd("7. Kết luận");
    x.f("dTmax", "|Δt| lớn nhất", "MAX(|Δt|)", absmax("dT"), r.maxErr, "°C");
    x.f("MPE", "Sai số cho phép", "acc·(Max − Min)/100", "{acc}*({Max}-{Min})/100", r.lim, "°C");
    verdict(x, "KQ", "Kết luận", V2 ? "U in + max|Δt| ≤ MPE" : "U + max|Δt| ≤ MPE (U chưa làm tròn, như Excel)", `{${V2 ? "U_in" : "U"}}+{dTmax}<={MPE}`, r.pass);
  }

  /* ---------- DPG / PDI – ĐLVN 76:2001 ---------- */
  function DPG(x, r, unit) {
    const I = r.inp, V2 = r.fv === 2, s1 = I.stand1, m = I.std.length, M = 2 * m;
    x.hd("1. Số liệu đầu vào");
    x.inp("Min", "Giới hạn dưới", I.min, unit); x.inp("Max", "Giới hạn trên", I.max, unit); x.inp("acc", "Cấp chính xác", I.acc, "%");
    x.inp("d", "Độ chia nhỏ nhất", I.res || 0, unit);
    x.inp("x", "Áp suất chuẩn", I.std.map(Number), unit); x.inp("P_t", "Số đọc chiều tăng", I.rise.map(Number), unit); x.inp("P_g", "Số đọc chiều giảm", I.fall.map(Number), unit);
    standIn(x, s1, unit, `Stand1 ${s1.key || s1.name || ""}${s1.deadweight ? " (quả cân)" : ""}`);
    x.cst("f", `Hệ số đổi đơn vị ${s1.unit} → ${unit}`, window.LabCalc.factor(s1.unit, unit));
    if (!V2) x.inp("k_in", "Hệ số phủ dùng trong file Excel 2026", I.k || 2);
    x.hd("2. Chuẩn quy về đơn vị đồng hồ");
    x.f("span", "Khoảng đo", "Max − Min", "{Max}-{Min}", I.max - I.min, unit);
    x.f("E9", "Min chuẩn", "Min_c·f", "{S1min}*{f}", r.E9, unit); x.f("E10", "Max chuẩn", "Max_c·f", "{S1max}*{f}", r.E10, unit);
    x.f("E11", "U chuẩn", s1.uncUnit === "%" ? "U %" : "U_c·f", s1.uncUnit === "%" ? "{S1U}" : "{S1U}*{f}", r.E11);
    x.f("E12", "U chuẩn quy đổi (%)", s1.uncUnit === "%" ? "U %" : "E11/(E10 − E9)·100", s1.uncUnit === "%" ? "{S1U}" : "{E11}/({E10}-{E9})*100", r.E12, "%");
    x.hd(`3. Hồi quy y = a + b·x trên ${M} cặp`);
    x.v("X", "Áp suất chuẩn (tăng rồi giảm)", "", j => `{x[${j % m}]}`, M, I.std.concat(I.std).map(Number), unit);
    x.v("Y", "Số đọc (tăng rồi giảm)", "", j => j < m ? `{P_t[${j}]}` : `{P_g[${j - m}]}`, M, I.rise.concat(I.fall).map(Number), unit);
    x.f("a", "Hệ số chặn", "INTERCEPT(Y; X)", "INTERCEPT({Y:},{X:})", r.a); x.f("b", "Hệ số góc", "SLOPE(Y; X)", "SLOPE({Y:},{X:})", r.b);
    x.f("Sy", "Sai số chuẩn của hồi quy", "STEYX(Y; X)", "STEYX({Y:},{X:})", r.Sy, unit);
    x.f("K32", "Σ(x − x̄)²", "DEVSQ(X)", "DEVSQ({X:})"); x.f("L32", "Σx²", "SUMSQ(X)", "SUMSQ({X:})"); x.f("M32", "n", "COUNT(X)", "COUNT({X:})", r.n); x.f("N32", "Σx", "SUM(X)", "SUM({X:})");
    x.f("Sa", "Độ lệch chuẩn hệ số chặn", "Sy·√(Σx²/(n·Σ(x−x̄)²))", "{Sy}*SQRT({L32}/{M32}/{K32})", r.Sa); x.f("Sb", "Độ lệch chuẩn hệ số góc", "Sy/√Σ(x−x̄)²", "{Sy}*SQRT(1/{K32})", r.Sb);
    x.f("r", "Hệ số tương quan a–b", "−Σx/√(n·Σx²)", "-{N32}/SQRT({M32}*{L32})", r.r);
    x.hd("4. Thành phần độ KĐBĐ (%) tại từng cột");
    x.f("uv", "Độ phân giải đồng hồ", V2 ? "(d·100/span)/(2√3)" : "(d·100/span)/√6/2", V2 ? `({d}*100/{span})/(2*${SQ3})` : "({d}*100/{span})/SQRT(6)/2", r.uv, "%");
    x.v("uA0", "Loại A từ hồi quy (đơn vị đồng hồ)", "√(Sa² + x²·Sb² + 2·x·Sa·Sb·r)", "SQRT(MAX(0,{Sa}^2+{X[]}^2*{Sb}^2+2*{X[]}*{Sa}*{Sb}*{r}))", M, r.cols.map(c => c.uA0), unit);
    if (V2) x.v("uA", "Loại A (% span)", "uA0·100/span", "{uA0[]}*100/{span}", M, r.cols.map(c => c.uA), "%");
    else x.v("uA", "Loại A (cộng thẳng vào các thành phần %, như file Excel)", "uA = uA0", "{uA0[]}", M, r.cols.map(c => c.uA));
    const us = s1.deadweight ? ["Quả cân: E12·|x|/(2·span)", "{E12}*ABS({X[]})/(2*{span})"]
      : V2 ? ["√[(E12·(E10−E9)/(2·span))² + (E13·|x|/(√3·span))²]", `SQRT(({E12}*({E10}-{E9})/(2*{span}))^2+({S1rdg}*ABS({X[]})/(${SQ3}*{span}))^2)`]
        : ["(E12·(E10−E9) + E13·|x|)/(2·span)", "({E12}*({E10}-{E9})+{S1rdg}*ABS({X[]}))/(2*{span})"];
    x.v("us", "Chuẩn áp suất", us[0], us[1], M, r.cols.map(c => c.us), "%");
    x.v("uc", "Độ KĐBĐ tổng hợp", "√(uA² + us² + uv²)", "SQRT({uA[]}^2+{us[]}^2+{uv}^2)", M, r.cols.map(c => c.uc), "%");
    if (V2) { ktTable(x); x.v("nuA", "Bậc tự do uA", "n − 2", "{M32}-2", M, r.cols.map(() => r.n - 2)); kBlock(x, true, "j", "uc", [["uA", "nuA"]], r.cols.map(c => c.nu), r.cols.map(c => c.kj), 2, M); }
    x.hd("5. Độ KĐBĐ mở rộng tại từng điểm");
    if (V2) {
      x.v("uc_d", "uc của chiều lớn hơn", "MAX(uc tăng; uc giảm)", j => `IF({uc[${j}]}>={uc[${j + m}]},{uc[${j}]},{uc[${j + m}]})`, m, r.rows.map(q => q.ucAvg), "%");
      x.v("k_d", "k của chiều đó", "", j => `IF({uc[${j}]}>={uc[${j + m}]},{kj[${j}]},{kj[${j + m}]})`, m, r.rows.map(q => q.k));
    } else {
      x.v("uc_d", "Trung bình hai chiều", "(uc tăng + uc giảm)/2", j => `({uc[${j}]}+{uc[${j + m}]})/2`, m, r.rows.map(q => q.ucAvg), "%");
      x.v("k_d", "Hệ số phủ", "k", "{k_in}", m, r.rows.map(q => q.k));
    }
    x.v("Upct", "U (%)", "k·uc", "{k_d[]}*{uc_d[]}", m, r.rows.map(q => q.Upct), "%");
    x.v("Uu", "U (đơn vị đồng hồ)", "U%·span/100", "{Upct[]}*{span}/100", m, r.rows.map(q => q.Uu), unit);
    if (s1.deadweight) x.v("U", "U in GCN (chuẩn quả cân in theo %)", "U%", "{Upct[]}", m, r.rows.map(q => q.U), "%");
    else x.v("U", "U in GCN", "U", "{Uu[]}", m, r.rows.map(q => q.U), unit);
    x.v("SHC_t", "SHC chiều tăng", "x − P tăng", "{x[]}-{P_t[]}", m, r.rows.map(q => q.cR), unit);
    x.v("SHC_g", "SHC chiều giảm", "x − P giảm", "{x[]}-{P_g[]}", m, r.rows.map(q => q.cF), unit);
    x.hd("6. Kết luận");
    x.f("Umax", "U lớn nhất", "MAX(U)", "MAX({U:})", r.Umax);
    x.f("SHCmax", "|SHC| lớn nhất", "MAX", `MAX(${absmax("SHC_t")},${absmax("SHC_g")})`, r.maxSHC, unit);
    x.f("MPE", "Sai số cho phép", "acc·span/100", "{acc}*{span}/100", r.lim, unit);
    if (V2) {
      x.v("Ucb", "U công bố tại điểm (2 CSCN, làm tròn lên)", "", upub("{Uu[]}"), m, r.rows.map(q => uPubV(q.Uu)), unit);
      x.v("dec", "|SHC| + U tại từng điểm", "MAX(|SHC t|, |SHC g|) + U", "MAX(ABS({SHC_t[]}),ABS({SHC_g[]}))+{Ucb[]}", m, r.rows.map(q => Math.max(Math.abs(q.cR), Math.abs(q.cF)) + uPubV(q.Uu)), unit);
      x.f("dec_max", "Lớn nhất", "MAX", "MAX({dec:})", r.decRule, unit);
      verdict(x, "KQ", "Kết luận (quy tắc chung 06/11/2026)", "|SHC| + U ≤ MPE", "{dec_max}<={MPE}", r.pass);
    } else verdict(x, "KQ", "Kết luận (như file Excel 2026)", "Umax + |SHC|max ≤ MPE", "{Umax}+{SHCmax}<={MPE}", r.pass);
  }

  const F = { PT, PS, PG, TS, TT, TG, RTD, TC, DPG };
  /* meta: { tag, type, info, ver } – r: kết quả calc (có r.inp) */
  function build(ExcelJS, type, r, unit, meta) {
    if (!F[type]) throw new Error("Chưa có mẫu Excel cho loại " + type);
    if (!r || !r.inp) throw new Error("Hồ sơ chưa tính được");
    const x = Book(ExcelJS, Object.assign({ type }, meta || {}));
    F[type](x, r, unit || "");
    return x.done();
  }
  const api = { build };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof window !== "undefined") window.LabQX = api;
})();
