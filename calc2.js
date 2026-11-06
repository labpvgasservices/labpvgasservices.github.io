/* LAB PVGAS Services – calculation core, part 2 (PG, TS, TT, RTD, TG, TC, DPG).
 * Ported from the 2026 company workbooks (macros by khainv@pvgas.com.vn); cell references kept in comments:
 *  - PG  : PG_08_Data_Rev2026_Oct-2026.xlsm  sheet Data08 (ĐLVN 08:2011 – verification, no uncertainty)
 *  - TS  : LFS_TS 09 2026.xls                sheet DLVNTM13 + DataTM13 (DVK.LAB.TM.13)
 *  - TT  : 1.TT_LFS_CM_26.xls                sheet DLVN188.2-2 + "STDEV calc" + Data188 (DVK.LAB.TM.12)
 *  - RTD : RTD_DK_CM_2026_.xls               sheet "DLVN125 NK chuan + do Ohm" + Data125 (ĐLVN 125:2003)
 *  - TC  : TC_GPP_2026_.xlsm                sheet DLVN161 + Ref + Data161 (ĐLVN 161:2005) – checked against the 66 GPP 2026 records
 *  - DPG : DVK_ĐVT_PG GPP_2026_KNV.xls        sheet DLVN76_2001 + Data76 (ĐLVN 76:2001) – checked against the 8 PDI GPP 2026 records
 *  - TG  : TG_GPP 08-2026_Phuoc_.xlsm        sheet DLVN138.2-1 + "STDEV Calc" + Data138 (ĐLVN 138:2004) – checked against the 45 GPP 08/2026 records
 * The workbooks were supplied as samples (2026-10-30): logic is ported, numbers are not yet cross-checked.
 */
(function (root) {
  "use strict";
  const C = root.LabCalc;
  const xr = C.xround;
  const mean = a => a.reduce((s, v) => s + v, 0) / a.length;
  const stdev = a => { if (a.length < 2) return 0; const m = mean(a); return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / (a.length - 1)); };
  const rms = a => a.length ? Math.sqrt(a.reduce((s, v) => s + v * v, 0) / a.length) : 0;
  const S3 = Math.sqrt(3);
  // ĐKĐBĐ of a heat source (Stand!Stability/Radial/Axial), rectangular
  const uHeat = h => h ? Math.sqrt(((h.stab || 0) / S3) ** 2 + ((h.radial || 0) / S3) ** 2 + ((h.axial || 0) / S3) ** 2) : 0;
  /* Bản công thức đã sửa 06/11/2026 (fv = 2) – theo báo cáo rà soát Uncer 01/11/2026 (A1–A9, B1–B8).
   * fv = 1 (mặc định, hồ sơ cũ) giữ nguyên cách tính của file Excel 2026. Mọi chỗ khác nhau đều ghi "V2" ở dưới.
   * Chung cho V2: U chuẩn (theo GCN chuẩn, k = 2) chia 2; k báo cáo = t95,45(ν_eff) (B2, C.kEff);
   * U in = 2 chữ số có nghĩa làm tròn lên (B3, C.uPub); quy tắc quyết định |sai số| + U ≤ MPE (B1, NGOC 06/11/2026). */
  const KS = 2;                                                       // k trên GCN của chuẩn
  const uUp = U => C.uPub(U).v;

  /* ---------------- PG – ĐLVN 08:2011 (Data08) ---------------- */
  function calcPG(inp) {
    const { min, max, acc } = inp;
    const std = inp.std.map(Number), rise = inp.rise.map(Number), fall = inp.fall.map(Number);
    // Data08!AX..BG = Stand − reading. The Oct-2026 sheet points both rows at the Falling column (AS..AW);
    // here the rising correction uses the rising reading (May-2026 layout).
    const rows = std.map((x, i) => ({ x, rise: rise[i], fall: fall[i], cR: x - rise[i], cF: x - fall[i] }));
    const maxSHC = Math.max(...rows.map(r => Math.max(Math.abs(r.cR), Math.abs(r.cF))));   // EY = MAX(BR:CA)
    const lim = acc * (max - min) / 100;                                                   // EX = F*(L-K)/100
    const pass = !(maxSHC > lim);                                                          // EV
    let red = null;
    const b = Number(inp.before), a = Number(inp.after);
    if (isFinite(b) && isFinite(a) && inp.before !== "" && inp.after !== "") { const d = b - a; red = { d, pct: b ? d / b * 100 : 0, ok: (b ? d / b * 100 : 0) < 5 }; }
    return { type: "PG", rows, maxSHC, lim, pass, red };
  }

  /* ---------------- TS – DVK.LAB.TM.13 (DLVNTM13) ---------------- */
  function calcTS(inp) {
    const { tset, acc } = inp;
    const V2 = inp.fv === 2;
    let k = inp.k || 2;
    const rising = inp.dir !== "Falling";
    const set = inp.set.map(Number), reset = inp.reset.map(Number), n = set.length;
    const Tm = rising ? set : reset, Td = rising ? reset : set;           // C23:C27 open (Rising), D23:D27 closed (Falling)
    const C28 = mean(Tm), D28 = mean(Td);
    const F30 = Math.sqrt(Tm.reduce((s, v) => s + (v - C28) ** 2, 0) / (n * (n - 1)));   // utm
    const F31 = Math.sqrt(Td.reduce((s, v) => s + (v - D28) ** 2, 0) / (n * (n - 1)));   // utd
    const F33 = (inp.stand.unc || 0) / (V2 ? KS : k);                    // uch1 = U/k
    const F34 = 0;                                                       // uch2 BlackStack ×0 (no SPRT)
    const F35 = uHeat(inp.heat);                                         // uch3
    const uRes = V2 ? (inp.res || 0) / (2 * S3) : 0;                     // V2 (B4): độ phân giải số đọc chuẩn, chữ nhật
    const F36 = Math.sqrt(F33 ** 2 + F34 ** 2 + F35 ** 2 + uRes ** 2);
    const F38 = Math.sqrt(F30 ** 2 + F36 ** 2), F39 = Math.sqrt(F31 ** 2 + F36 ** 2);
    const ke = V2 ? C.kEff([[rising ? F30 : F31, n - 1]], rising ? F38 : F39) : { nu: Infinity, k };
    k = ke.k;
    const F41 = k * F38, F42 = k * F39;
    const U = rising ? F41 : F42;                                        // I46
    const setDev = set.map(v => v - tset), resetDev = reset.map(v => v - tset);   // DataTM13!BM..BV = T − Tset
    const maxDev = Math.max(...setDev.map(Math.abs));
    const lim = acc * tset / 100;                                        // D51: F4*F5/100
    const Uprint = V2 ? uUp(U) : xr(U, 2);
    const pass = U > 0 && !((V2 ? maxDev + Uprint : maxDev) > lim);      // V2 (B1): |sai số| + U ≤ MPE
    return { type: "TS", fv: V2 ? 2 : 1, nu: ke.nu, uRes, k, n, rising, set, reset, setDev, resetDev, C28, D28, F30, F31, F33, F34, F35, F36, F38, F39, F41, F42, U, maxDev, lim, pass, Uprint };
  }

  /* ---------------- TT – DVK.LAB.TM.12 (DLVN188.2-2) ---------------- */
  function calcTT(inp) {
    const { min, max, acc } = inp;
    const V2 = inp.fv === 2, k = 2;
    const span = max - min, Cj = span / 16;                               // F7
    const n = 3;                                                          // F24
    const P = inp.pts.map(p => ({ sr: p.sr.map(Number), sf: p.sf.map(Number), dr: p.dr.map(Number), df: p.df.map(Number) }));
    const m = P.length;
    // F21:F23 – range of each point from its 1st standard reading (row 28); point 1 uses "<400", the others "<=400"
    const cls = P.map((p, i) => { const t = p.sr[0]; if (t <= 150) return "low"; if (t > 400) return "high"; return (V2 || i !== 0 ? t <= 400 : t < 400) ? "mid" : "none"; });   // V2 (B8): mọi điểm dùng "≤ 400"
    const nL = cls.filter(c => c === "low").length, nM = cls.filter(c => c === "mid").length, nH = cls.filter(c => c === "high").length;
    // 'STDEV calc' tables: low = first nL points, mid = next nM points, high = last nH points
    const idx = { low: [...Array(nL).keys()], mid: [...Array(nM).keys()].map(i => i + nL), high: [...Array(nH).keys()].map(i => m - nH + i) };
    const pt = P.map(p => {
      const sSr = stdev(p.sr), sSf = stdev(p.sf), sDr = stdev(p.dr), sDf = stdev(p.df);
      const stdT = mean(p.sr.concat(p.sf));                               // E60 = AVERAGE(F28:G30)
      const ideal = 4 + 16 * (stdT - min) / span;                         // G60
      const rise = mean(p.dr), fall = mean(p.df);                         // F47 / G47
      const cR = ideal - rise, cF = ideal - fall;                         // M60 / O60
      return { sSr, sSf, sDr, sDf, stdT, ideal, rise, fall, cR, cF, err: Math.max(Math.abs(cR), Math.abs(cF)) / 16 * 100, hyst: Math.abs(fall - rise) };
    });
    const a = inp.amm || {};
    const L17 = a.uncUnit === "%" ? (a.unc || 0) * ((a.max || 0) - (a.min || 0)) / 100 : (a.unc || 0);   // ĐKĐBĐ ampe kế quy đổi (mA)
    const N17 = a.err || 0;                                               // sai số / phân giải (mA)
    const F40 = Math.sqrt((L17 * Cj / 2) ** 2 + ((N17 * Cj) / (2 * S3)) ** 2);   // uch2
    const F52 = 0.5 * (inp.res || 0) * Cj / S3;                           // ubk3
    const rng = (key, cnt, uStd, heat) => {
      if (!cnt) return { cnt: 0, uch4: 0, uch1: 0, uch5: 0, uch3: 0, uch: 0, ubk1: 0, ubk2: 0, uDUT: 0, uc: 0, U: 0, UltbS: 0, UltbD: 0, hyst: 0 };
      const ii = idx[key];
      const UltbS = rms(ii.flatMap(i => [pt[i].sSr, pt[i].sSf]));         // F36/H36/J36
      const UltbD = rms(ii.flatMap(i => [pt[i].sDr, pt[i].sDf]));         // F49/H49/J49
      const hyst = Math.max(...ii.map(i => pt[i].hyst));                  // 'STDEV calc'!C43:H48
      const uch4 = UltbS / Math.sqrt(n), uch1 = (uStd || 0) / 2, uch5 = 0, uch3 = uHeat(heat);
      const uch = Math.sqrt(uch4 ** 2 + uch1 ** 2 + uch5 ** 2 + F40 ** 2 + uch3 ** 2);
      const ubk1 = UltbD * Cj / Math.sqrt(n), ubk2 = hyst * Cj / (2 * S3);
      const uDUT = Math.sqrt(ubk1 ** 2 + ubk2 ** 2 + F52 ** 2);
      const uc = Math.sqrt(uch ** 2 + uDUT ** 2);
      const ke = V2 ? C.kEff([[uch4, 2 * cnt * (n - 1)], [ubk1, 2 * cnt * (n - 1)]], uc) : { nu: Infinity, k: 2 };   // V2 (B2)
      return { cnt, UltbS, UltbD, hyst, uch4, uch1, uch5, uch3, uch, ubk1, ubk2, uDUT, uc, nu: ke.nu, k: ke.k, U: ke.k * uc };
    };
    const s1 = inp.s1 || {}, s2 = inp.s2 || {};
    const R = { low: rng("low", nL, s1.unc, s1), mid: rng("mid", nM, s2.unc, s2), high: rng("high", nH, s2.unc, s2) };
    const T = pt.map(p => p.stdT);
    // Data188!FE:FH – range ends printed on the certificate
    const FF = nL === 0 ? T[0] : T[nL - 1];
    const FG = nM === 0 ? FF : T[nL + nM - 1];
    const lines = [];
    if (nL > 1) lines.push({ key: "low", from: T[0], to: FF, U: R.low.U });
    if (nM) lines.push({ key: "mid", from: FF, to: FG, U: R.mid.U });
    if (nH) lines.push({ key: "high", from: FG, to: T[m - 1], U: R.high.U });
    const maxErr = Math.max(...pt.map(p => p.err));                       // FK
    const maxSHC = Math.max(...pt.map(p => Math.max(Math.abs(p.cR), Math.abs(p.cF))));   // FL (mA)
    const lim = acc / 100 * span;                                         // FJ (°C)
    const Umax = Math.max(R.low.U, R.mid.U, R.high.U);
    // V2 (A9 + B1): sai số quy về °C (mA × span/16), cộng U của dải chứa điểm đó, so với MPE (°C)
    const decRule = V2 ? Math.max(...pt.map((p, i) => Math.max(Math.abs(p.cR), Math.abs(p.cF)) * Cj + uUp((R[cls[i]] || { U: Umax }).U))) : null;
    const pass = V2 ? !(decRule > lim) : !(Math.max(maxErr, R.low.U, R.mid.U, R.high.U, maxSHC) > lim);   // FI
    return { type: "TT", fv: V2 ? 2 : 1, decRule, k: V2 ? Math.max(...Object.values(R).map(r => r.cnt ? r.k : 0)) : k, n, Cj, cls, nL, nM, nH, pt, L17, N17, F40, F52, R, lines, maxErr, maxSHC, lim, pass, Umax, lowSingle: nL === 1 };
  }

  /* ---------------- RTD – ĐLVN 125:2003 ---------------- */
  const PT100 = { start: -104, r: [,,,,60.26,,,,,,,,,,,,,,,66.31,,,,,,,,,,,,,,,72.33,,,,,,,,,,,,,,,78.32,,,,,,,,,,,,,,,84.27,84.67,85.06,85.46,85.85,86.25,86.64,87.04,87.43,87.83,88.22,88.62,89.01,89.4,89.8,90.19,90.59,90.98,91.37,91.77,92.16,92.55,92.95,93.34,93.73,94.12,94.52,94.91,95.3,95.69,96.09,96.48,96.87,97.26,97.65,98.04,98.44,98.83,99.22,99.61,100,100.39,100.78,101.17,101.56,101.95,102.34,102.73,103.12,103.51,103.9,104.29,104.68,105.07,105.46,105.85,106.24,106.63,107.02,107.4,107.79,108.18,108.57,108.96,109.35,109.73,110.12,110.51,110.9,111.28,111.67,112.06,112.45,112.83,113.22,113.61,113.99,114.38,114.77,115.15,115.54,115.93,116.31,116.7,117.08,117.47,117.85,118.24,118.62,119.01,119.4,119.78,120.16,120.55,120.93,121.32,121.7,122.09,122.47,122.86,123.24,123.62,124.01,124.39,124.77,125.17,125.55,125.93,126.32,126.7,127.08,127.46,127.85,128.23,128.612,128.99,129.38,129.76,130.14,130.52,130.9,131.28,131.67,132.05,132.43,132.81,133.19,133.57,133.95,134.33,134.71,135.09,135.47,135.85,136.23,136.61,136.99,137.37,137.75,138.13,138.51,138.89,139.27,139.65,140.03,140.39,140.77,141.15,141.53,141.91,142.29,142.66,143.04,143.42,143.8,144.18,144.56,144.94,145.32,145.69,146.07,146.45,146.82,147.2,147.58,147.95,148.33,148.71,149.08,149.46,149.83,150.21,150.58,150.96,151.34,151.71,152.09,152.46,152.84,153.21,153.58,153.95,154.32,154.71,155.08,155.46,155.83,156.21,156.58,156.96,157.33,157.71,158.08,158.45,158.83,159.2,159.56,159.94,160.31,160.68,161.05,161.43,161.8,162.17,162.54,162.91,163.28,163.66,164.03,164.4,164.77,165.14,165.51,165.88,166.25,166.62,167,167.37,167.74,168.11,168.48,168.85,169.22,169.59,169.96,170.33,170.69,171.06,171.43,171.8,172.17,172.54,172.91,173.27,173.64,174.01,174.39,174.75,175.12,175.49,175.86,176.23,176.59,176.96,177.33,177.7,178.06,178.43,178.8,179.16,179.53,179.9,180.26,180.63,180.99,181.36,181.73,182.09,182.46,182.82,183.19,183.55,183.92,184.28,184.65,185.01,185.38,185.74,186.11,186.47,186.84,187.2,187.56,187.93,188.29,188.65,189.02,189.38,189.74,190.11,190.47,190.83,191.2,191.56,191.92,192.28,192.66,193.02,193.38,193.74,194.1,194.47,194.83,195.19,195.55,195.9,196.26,196.62,196.98,197.35,197.71,198.07,198.43,198.79,199.15,199.51,199.87,200.23,200.59,200.95,201.31,201.67,202.03,202.38,202.74,203.1,203.46,203.82,204.18,204.54,204.9,205.25,205.61,205.97,206.33,206.7,207.05,207.41,207.77,208.13,208.48,208.84,209.2,209.55,209.91,210.27,210.62,210.98,211.34,211.69,212.05,212.4,212.76,213.12,213.47,213.83,214.19,214.55,214.9,215.26,215.61,215.97,216.32,216.68,217.03,217.39,217.73,218.08,218.44,218.79,219.15,219.5,219.85,220.21,220.56,220.91,221.27,221.62,221.97,222.32,222.68,223.03,223.38,223.73,224.09,224.45,224.8,225.15,225.5,225.85,226.21,226.56,226.91,227.26,227.61,227.96,228.31,228.66,229.01,229.36,229.72,230.07,230.42,230.77,231.12,231.47,231.81,232.16,232.51,232.86,233.21,233.56,233.91,234.26,234.6,234.95,235.3,235.65,236,236.35,236.7,237.05,237.4,237.75,238.09,238.44,238.79,239.14,239.48,239.83,240.18,240.52,240.87,241.22,241.56,241.91,242.25,242.6,242.95,243.29,243.64,243.98,244.33,244.67,245.02,245.36,245.71,246.05,246.4,246.74,247.09,247.43,247.78,248.12,248.46,248.81,249.15,249.5,249.84,250.18,250.53,250.89,251.21,251.55,251.9,252.24,252.59,252.94,253.28,253.62,253.96,254.3,254.65,254.99,255.33,255.67,256.01,256.35,256.7,257.04,257.38,257.72,258.06,258.4,258.74,259.08,259.42,259.76,260.1,260.44,260.78,261.12,261.46,261.8,262.14,262.48,262.83,263.17,263.5,263.84,264.18,264.52,264.86,265.2,265.54,265.87,266.21,266.55,266.89,267.22,267.56,267.9,268.24,268.57,268.91,269.25,269.58,269.92,270.26,270.59,270.93,271.27,271.6,271.94,272.27,272.61,272.95,273.28,273.62,273.95,274.29,274.62,274.96,275.29,275.63,275.96,276.31,276.64,276.97,277.31,277.64,277.98,278.31,278.64,278.98,279.31,279.64,279.98,280.31,280.64,280.98,281.31,281.64,281.97,282.31,282.64,282.97,283.3,283.63,283.97,284.3,284.63,284.96,285.29,285.62,285.95,286.3,286.63,286.96,287.29,287.62,287.95,288.28,288.61,288.94,289.27,289.6,289.93,290.26,290.59,290.92,291.25,291.58,291.9,292.23,292.56,292.9,293.23,293.56,293.89,294.21,294.54,294.87,295.2,295.53,295.85,296.18,296.51,296.84,297.16,297.49,297.82,298.14,298.47,298.8,299.12,299.45,299.78,300.1,300.43,300.75,301.08,301.41,301.73,302.06,302.38,302.71,303.03,303.36,303.68,304.01,304.33,304.66,304.98,305.3,305.63,305.95,306.28,306.6,306.92,307.25,307.57,307.89,308.22,308.54,308.86,309.19,309.51,309.83,310.15,310.48,310.8,311.12,311.45,311.78,312.1,312.43,312.75,313.07,313.39,313.71,314.04,314.36,314.68,315,315.32,315.64,315.96,316.28,316.6,316.92,317.24,317.56,317.88,318.2,318.52,318.85,319.17,319.49,319.81,320.12,320.44,320.76,321.08,321.4,321.72,322.03,322.34,322.66,322.98,323.3,323.61,323.93,324.25,324.57,324.88,325.21,325.53,325.85,326.16,326.48,326.79,327.11,327.43,327.74,328.06,328.38,328.69,329.01,329.32,329.64] };
  // 'Bảng giá trị chuẩn' (Pt100, R0 = 100 Ω, Ω per whole °C). Gaps in the sheet fall back to IEC 60751.
  function pt100(t) {
    const T = Math.round(t), v = PT100.r[T - PT100.start];
    if (typeof v === "number") return { R: v, src: "table" };
    const A = 3.9083e-3, B = -5.775e-7, Cc = -4.183e-12;
    return { R: 100 * (1 + A * T + B * T * T + (T < 0 ? Cc * (T - 100) * T ** 3 : 0)), src: "iec" };
  }
  // Least squares by normal equations, as the sheet does with MINVERSE/MMULT (X34:AB36 / AH34:AL37)
  function polyfit(x, y, deg) {
    const N = deg + 1, M = [], v = [];
    for (let r = 0; r < N; r++) { M.push([]); for (let c = 0; c < N; c++) M[r].push(x.reduce((s, xi) => s + xi ** (r + c), 0)); v.push(x.reduce((s, xi, i) => s + xi ** r * y[i], 0)); }
    for (let c = 0; c < N; c++) {                                        // Gauss-Jordan with partial pivot
      let p = c; for (let r = c + 1; r < N; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
      [M[c], M[p]] = [M[p], M[c]]; [v[c], v[p]] = [v[p], v[c]];
      for (let r = 0; r < N; r++) if (r !== c) { const f = M[r][c] / M[c][c]; for (let k = c; k < N; k++) M[r][k] -= f * M[c][k]; v[r] -= f * v[c]; }
    }
    return v.map((s, i) => s / M[i][i]);
  }
  const peval = (co, t) => co.reduce((s, c, i) => s + c * t ** i, 0);
  function calcRTD(inp) {
    const { min, max, acc } = inp;
    const V2 = inp.fv === 2;
    let k = inp.k || 2;
    const sens = inp.sens || 0.385;                                       // F8 (Ω/°C)
    const n = 5, F21 = 5;                                                 // F22 readings, F21 points in the fit
    const P = inp.pts.map(p => ({ std: Number(p.std), dut: p.dut.map(Number) }));
    const T = P.map(p => p.std);                                          // F31:K31 (one standard value per point, as on the QTG)
    const Rm = P.map(p => mean(p.dut));                                   // M31:R31
    const Si = P.map(p => stdev(p.dut));                                  // M32:Q32
    const neg = min < 0;
    const q = polyfit(T.slice(0, 5), Rm.slice(0, 5), 2);                  // AB38:AB40 (R0, R0·A, R0·B)
    const cu = neg ? polyfit(T.slice(0, 5), Rm.slice(0, 5), 3) : null;    // AL39:AL42
    const fit = neg ? cu : q;
    const Rfit = T.map(t => peval(fit, t));                               // H45:H50
    const res = Rfit.slice(0, 5).map((r, i) => r - Rm[i]);
    const ss = res.reduce((s, v) => s + v * v, 0);
    const pfit = fit.length;                                              // 3 (bậc 2) hoặc 4 (bậc 3)
    const Q36 = V2 ? Math.sqrt(ss / (F21 - pfit)) / sens                  // V2 (A1): √[Σ dư²/(n − p)] / S – S ra ngoài căn
      : Math.sqrt(ss / ((F21 - 3) * sens));                               // uDUT6 = AF39 / AQ39
    const O33 = V2 ? Math.sqrt(Si.slice(0, 5).reduce((s, v) => s + v * v, 0) / F21)   // V2 (A2): độ lệch chuẩn gộp (Ω)
      : Si.slice(0, 5).reduce((s, v) => s + v * v, 0) / F21;              // S(DUT) – no square root in the sheet
    const Q34 = O33 / (Math.sqrt(n) * sens);                              // uDUT5
    const Q35 = Math.abs(Rm[5] - Rm[2]) / (2 * S3 * sens);                // uDUT4 hysteresis at point 3
    const Q38 = Math.sqrt(Q34 ** 2 + Q35 ** 2 + Q36 ** 2);
    const s1 = inp.s1 || {}, s2 = inp.s2 || {}, mt = inp.meter || {};
    const G34 = 0;                                                        // uch5: one standard value per point -> S(chuẩn) = 0
    const kS = V2 ? KS : k;
    const G35 = (max >= 150 ? (s2.unc || 0) : (s1.unc || 0)) / kS;        // uch1
    const M14 = mt.unc || 0, M13 = mt.max || 0, O14 = mt.err || 0;
    const G36 = mt.uncUnit === "%" ? Math.sqrt((((M14 * M13) / 100) / (sens * kS)) ** 2 + ((O14 / sens) / (2 * S3)) ** 2)
      : mt.uncUnit === "ppm" ? Math.sqrt((M14 * M13 * 1e-6 / (sens * kS)) ** 2 + ((O14 / sens) / (2 * S3)) ** 2)
        : Math.sqrt((M14 / (sens * kS)) ** 2 + ((O14 / sens) / (2 * S3)) ** 2);
    const G37 = max < 140 ? uHeat(s1) : uHeat(s2);                        // uch3
    const G38 = Math.sqrt(G34 ** 2 + G35 ** 2 + G36 ** 2 + G37 ** 2);
    const G39 = Math.sqrt(G38 ** 2 + Q38 ** 2);
    const ke = V2 ? C.kEff([[Q34, F21 * (n - 1)], [Q36, F21 - pfit]], G39) : { nu: Infinity, k: 2 };   // V2 (B2)
    k = ke.k;
    const U = k * G39;
    const R0 = neg ? cu[0] : q[0];                                        // AO53
    const useCu = neg && max <= 200;                                      // AL53/AM53
    const A = useCu ? cu[1] / cu[0] : q[1] / q[0], B = useCu ? cu[2] / cu[0] : q[2] / q[0];
    const Cc = neg ? (-cu[3] / 100) / cu[0] : 0;                          // AL43 = −AL42/100, AN53
    const rows = P.map((p, i) => { const ref = pt100(p.std); const eO = Rfit[i] - ref.R; return { nom: p.std, std: p.std, dut: Rm[i], Rfit: Rfit[i], ref: ref.R, refSrc: ref.src, eO, eC: eO / sens }; });
    const maxE = Math.max(...rows.map(r => Math.abs(xr(r.eC, 2))));
    const lim = acc * (max - min) / 100;                                  // EV
    const Uprint = V2 ? uUp(U) : xr(U, 2);                                // V2 (B3): 2 CSCN làm tròn lên
    const maxEv = V2 ? Math.max(...rows.map(r => Math.abs(r.eC))) : maxE;
    const pass = !(maxEv + Uprint > lim);                                 // ET: MAX|Error °C| + U
    return { type: "RTD", fv: V2 ? 2 : 1, nu: ke.nu, pfit, Uprint, k, n, sens, T, Rm, Si, q, cu, fit, Rfit, res, ss, Q34, Q35, Q36, Q38, O33, G34, G35, G36, G37, G38, G39, U, R0, A, B, C: Cc, rows, maxE, lim, pass, neg, useCu };
  }

  /* ---------------- TG – ĐLVN 138:2004 (DLVN138.2-1 + 'STDEV Calc' + Data138) ----------------
   * TG_GPP 08-2026_Phuoc_.xlsm. 5 points × 3 readings, standard and DUT both in °C, rising and falling. */
  function calcTG(inp) {
    const { min, max, acc } = inp;
    const V2 = inp.fv === 2, k = 2;
    const n = 3;                                                          // F24
    const F7 = inp.analog === false ? 0.5 : 1;                            // F7: 1 = Analog, 0.5 = Digital
    const res = inp.res || 0;                                             // F6 smallest division
    const P = inp.pts.map(p => ({ sr: p.sr.map(Number), sf: p.sf.map(Number), dr: p.dr.map(Number), df: p.df.map(Number) }));
    const m = P.length;
    // I21:M23 – range of each point from its 1st rising standard reading (row 28)
    const cls = P.map(p => { const t = p.sr[0]; return t <= 150 ? "low" : t > 400 ? "high" : "mid"; });
    const nL = cls.filter(c => c === "low").length, nM = cls.filter(c => c === "mid").length, nH = cls.filter(c => c === "high").length;
    // 'STDEV Calc' tables: low = first nL points, mid = next nM points, high = last nH points
    const idx = { low: [...Array(nL).keys()], mid: [...Array(nM).keys()].map(i => i + nL), high: [...Array(nH).keys()].map(i => m - nH + i) };
    const pt = P.map(p => {
      const sSr = stdev(p.sr), sSf = stdev(p.sf), sDr = stdev(p.dr), sDf = stdev(p.df);
      const stdT = mean([mean(p.sr), mean(p.sf)]);                        // G55 = AVERAGE(F31:G31)
      const rise = mean(p.dr), fall = mean(p.df);                         // I55 / K55
      return { sSr, sSf, sDr, sDf, stdT, rise, fall, corr: stdT - rise, cF: stdT - fall, hyst: Math.abs(fall - rise) };   // M55 = G55 − I55 (rising only)
    });
    const ubk3 = F7 * res / S3;                                           // F48 = (F7·F6)/√3
    const rng = (key, cnt, uStd, heat) => {
      if (!cnt) return { cnt: 0, UltbS: 0, UltbD: 0, hyst: 0, uch4: 0, uch1: 0, uch2: 0, uch3: 0, uch: 0, ubk2: 0, ubk1: 0, ubk3: 0, uDUT: 0, uc: 0, U: 0 };
      const ii = idx[key];
      const UltbS = rms(ii.flatMap(i => [pt[i].sSr, pt[i].sSf]));         // F33/H33/J33
      const UltbD = rms(ii.flatMap(i => [pt[i].sDr, pt[i].sDf]));         // F45/H45/J45
      const hyst = Math.max(...ii.map(i => pt[i].hyst));                  // 'STDEV Calc'!C40:H45
      const uch4 = UltbS / Math.sqrt(n), uch1 = (uStd || 0) / k, uch2 = 0, uch3 = uHeat(heat);   // row 34–37 (uch2 BlackStack: SPRT only)
      const uch = Math.sqrt(uch4 ** 2 + uch1 ** 2 + uch3 ** 2 + uch2 ** 2);
      const ubk2 = UltbD / Math.sqrt(n), ubk1 = hyst / (2 * S3);          // F46 / F47
      const uDUT = Math.sqrt(ubk2 ** 2 + ubk1 ** 2 + ubk3 ** 2);
      const uc = Math.sqrt(uch ** 2 + uDUT ** 2);
      const ke = V2 ? C.kEff([[uch4, 2 * cnt * (n - 1)], [ubk2, 2 * cnt * (n - 1)]], uc) : { nu: Infinity, k: 2 };   // V2 (B2)
      return { cnt, UltbS, UltbD, hyst, uch4, uch1, uch2, uch3, uch, ubk2, ubk1, ubk3, uDUT, uc, nu: ke.nu, k: ke.k, U: ke.k * uc };   // F51 = 2·F50
    };
    const s1 = inp.s1 || {}, s2 = inp.s2 || {};
    // low: Stand1 (F14) + heat source 1 (F17); mid and high: Stand2 (G14) + heat source 2 (G17/H17)
    const R = { low: rng("low", nL, s1.unc, s1), mid: rng("mid", nM, s2.unc, s2), high: rng("high", nH, s2.unc, s2) };
    // Data138!CT:CX labels = standard rounded to whole °C; DV/DW/DX range lines (low line only when nL ≥ 2)
    const lab = pt.map(p => Math.round(xr(p.stdT, 2)));
    const ED = nL <= 1 ? lab[0] : lab[nL - 1];
    const EE = nM === 0 ? ED : lab[nL + nM - 1];
    const lines = [];
    if (nL > 1) lines.push({ key: "low", from: lab[0], to: ED, U: R.low.U });
    if (nM) lines.push({ key: "mid", from: ED, to: EE, U: R.mid.U });
    if (nH) lines.push({ key: "high", from: EE, to: lab[m - 1], U: R.high.U });
    const maxSHC = Math.max(...pt.map(p => Math.abs(p.corr)));            // EB = MAX(ABS(SHC))
    const lim = acc / 100 * (max - min);                                  // DZ = M/100·(G−F)
    const Umax = Math.max(R.low.U, R.mid.U, R.high.U);
    // V2 (B1): từng điểm, |sai số| (cả hai chiều) + U của dải chứa điểm ≤ MPE
    const decRule = V2 ? Math.max(...pt.map((p, i) => Math.max(Math.abs(p.corr), Math.abs(p.cF)) + uUp(R[cls[i]].U))) : null;
    const pass = V2 ? !(decRule > lim) : !(Math.max(Umax, maxSHC) > lim);  // EG
    return { type: "TG", fv: V2 ? 2 : 1, decRule, k: V2 ? Math.max(...Object.values(R).map(r => r.cnt ? r.k : 0)) : k, n, F7, res, cls, nL, nM, nH, pt, ubk3, R, lines, maxSHC, lim, pass, Umax, lowSingle: nL === 1 };
  }

  /* ---------------- TC – ĐLVN 161:2005 (DLVN161 + Ref + Data161) ---------------- */
  // ITS-90 reference functions (sheet Ref). J: E(t) −210…760 / 760…1200; K: E(t) −270…0 / 0…1372 (+ α0·e^(α1(t−126.9686)²))
  const ITS = {
    J: { e1: [0, 0.050381187815, 3.047583693e-05, -8.568106572e-08, 1.3228195295e-10, -1.7052958337e-13, 2.0948090697e-16, -1.2538395336e-19, 1.5631725697e-23, 0, 0], a1: [0, 0, 0],
         e2: [296.45625681, -1.4976127786, 0.0031787103924, -3.1847686701e-06, 1.5720819004e-09, -3.0691369056e-13, 0, 0, 0, 0, 0], a2: [0, 0, 0], split: 760,
         t1: [0, 19.528268, -1.2286185, -1.0752178, -0.59086933, -0.17256713, -0.028131513, -0.002396337, -8.3823321e-05, 0],
         t2: [0, 19.78425, -0.2001204, 0.01036969, -0.0002549687, 3.585153e-06, -5.344285e-08, 5.09989e-10, 0, 0],
         r1: "Từ -210 đến 760", r2: "Từ 760 đến 1200", sens: 0.053 },
    K: { e1: [0, 0.039450128025, 2.3622373598e-05, -3.2858906784e-07, -4.9904828777e-09, -6.7509059173e-11, -5.7410327428e-13, -3.1088872894e-15, -1.0451609365e-17, -1.9889266878e-20, -1.6322697486e-23], a1: [0, 0, 0],
         e2: [-0.0176004137, 0.038921204975000005, 1.8558770032e-05, -9.9457592874e-08, 3.1840945718999995e-10, -5.6072844889e-13, 5.607505905900001e-16, -3.2020720002999997e-19, 9.715114715200001e-23, -1.2104721275000003e-26, 0],
         a2: [0.1185976, -0.0001183432, 126.9686], split: 0,
         t1: [0, 25.173462, -1.1662878, -1.0833638, -0.8977354, -0.37342377, -0.086632643, -0.010450598, -0.00051920577, 0],
         t2: [0, 25.08355, 0.07860106, -0.2503131, 0.0831527, -0.01228034, 0.0009804036, -4.41303e-05, 1.057734e-06, -1.052755e-08],
         r1: "Từ -270 đến 0", r2: "Từ 0 đến 1372", sens: 0.041 }
  };
  const poly = (c, x) => c.reduce((s, v, i) => s + v * x ** i, 0);
  const eIts = (R, t, a, c) => poly(c, t) + a[0] * Math.exp(a[1] * (t - a[2]) ** 2);
  // I62: J uses range 1 when t < 760, K uses range 1 when t ≤ 0
  function emf(type, t) { const R = ITS[type]; const lo = type === "J" ? t < R.split : t <= R.split; return lo ? eIts(R, t, R.a1, R.e1) : eIts(R, t, R.a2, R.e2); }
  // T38: the ΔE regression always uses the type K table (Ref!D21:E34), whatever the DUT type – kept as in the workbook
  const emfK = t => t < 0 ? eIts(ITS.K, t, ITS.K.a1, ITS.K.e1) : eIts(ITS.K, t, ITS.K.a2, ITS.K.e2);
  function calcTC(inp) {
    const { type = "J", max, min = 0, acc } = inp;
    const V2 = inp.fv === 2;
    let k = inp.k || 2;
    const R = ITS[type]; if (!R) throw new Error("Chỉ có hệ số cho cặp nhiệt loại J và K");
    const N = 8, n = 5;                                                   // F22, F23
    // F9 (Ref!C37:C38). V2 (B7): S = dE/dt của hàm chuẩn ITS-90 đúng loại, lấy giá trị nhỏ nhất trong các điểm đo (an toàn)
    const S = V2 ? Math.min(...inp.pts.map(p => { const t = mean(p.std.map(Number)); return (emf(type, t + 0.5) - emf(type, t - 0.5)); }).filter(v => v > 0)) : R.sens;
    const P = inp.pts.map(p => ({ std: p.std.map(Number), dut: p.dut.map(Number) }));
    const stdev6 = a => V2 ? stdev(a) : stdev(a.concat([mean(a)]));      // F34 = STDEV(F28:F33) – the average row is inside the range; V2 (A5): chỉ 5 lần đọc
    const pt = P.map(p => {
      const t = mean(p.std), E = mean(p.dut), Eref = emf(type, t), dE = E - Eref;
      const lab = Math.round(t);                                          // E62
      const m = Math.abs(dE);
      // O62: |ΔE| through the inverse table; E62 < 0 uses range 1 where Ref!$JH$37 (blank) drops C1
      const c = lab < 0 ? (V2 ? R.t1 : R.t1.map((v, i) => i === 1 ? 0 : v)) : R.t2;   // V2 (A7): đủ hệ số C1
      const dT = dE < 0 ? -poly(c, m) : poly(c, m);
      return { t, E, Eref, dE, dT, tDut: t + dT, sStd: stdev6(p.std), sDut: stdev(p.dut), V: E - (V2 ? Eref : emfK(t)) };   // V2 (A6): hàm chuẩn đúng loại
    });
    const sq = v => (v || 0) ** 2;
    const s1 = inp.s1 || {}, s2 = inp.s2 || {}, h1 = inp.h1 || s1, h2 = inp.h2 || s2, mv = inp.mv || {};
    const odd = [0, 2, 4, 6].filter(i => pt[i]), Nd = V2 ? odd.length : N;  // V2 (A4): cộng 4 điểm thì chia 4
    const Ultb = Math.sqrt((sq(pt[0] && pt[0].sStd) + sq(pt[2] && pt[2].sStd) + sq(pt[4] && pt[4].sStd) + sq(pt[6] && pt[6].sStd)) / Nd);   // F35: points 1,3,5,7 only
    const uch9 = Ultb / Math.sqrt(n);
    const kS = V2 ? KS : k;
    const uch7 = (inp.uCJ || 0) / kS;                                      // F37 = M20/F24 (Fluke 1620A, đầu tự do)
    const uch8 = max <= 140 ? uHeat(h1) : uHeat(h2);                      // F38 (Max ≤ 140: heat source 1, else 2)
    const uch11 = 0;                                                      // F40 (BlackStack/SPRT readout only)
    const uch1 = (max >= 155 ? s2.unc : s1.unc) / kS;                     // F41
    const uch = Math.sqrt(sq(uch9) + sq(uch7) + sq(uch8) + sq(uch11) + sq(uch1));
    const UltbD = Math.sqrt((sq(pt[0] && pt[0].sDut) + sq(pt[2] && pt[2].sDut) + sq(pt[4] && pt[4].sDut) + sq(pt[6] && pt[6].sDut)) / Nd);   // F51
    const ubk6 = UltbD / Math.sqrt(n);
    const ubk1 = ((mv.unc || 0) * pt[pt.length - 1].E / 100) / (kS * S);   // F53 = (M15·M49/100)/(F24·F9) – mV meter U in %, at point 8
    const ubk2 = 0.5 * (inp.mvRes || 0.001) / (S3 * S);                   // F54
    // S38:Y59 – least squares ΔE = a0 + a1·t + a2·t² with ΔE = E_DUT − E_K(t)
    const q = polyfit(pt.map(p => p.t), pt.map(p => p.V), 2);
    const res2 = pt.reduce((s, p) => s + (p.V - (q[0] + q[1] * p.t + q[2] * p.t ** 2)) ** 2, 0);
    const ubk7 = V2 ? Math.sqrt(res2 / (pt.length - 3)) / S                // V2 (A3): √[Σ dư²/(N − 3)] / S
      : Math.sqrt(res2 / (5 * S));                                        // F55 = SQRT(ΣY/(5·F9))
    const ubk8 = max / 100 * 0.1;                                         // M55 (BoA 2022: 0,1 % of Max)
    const uDUT = Math.sqrt(sq(ubk6) + sq(ubk1) + sq(ubk2) + sq(ubk7) + sq(ubk8));
    const uc = Math.sqrt(uch ** 2 + uDUT ** 2);                           // F57
    const ke = V2 ? C.kEff([[uch9, odd.length * (n - 1)], [ubk6, odd.length * (n - 1)], [ubk7, pt.length - 3]], uc) : { nu: Infinity, k: 2 };   // V2 (B2)
    k = ke.k;
    const U = k * uc;                                                     // F58
    const maxErr = Math.max(...pt.map(p => Math.abs(p.dT)));
    const lim = acc * (max - min) / 100;
    const Utext = V2 ? (p => p.v.toFixed(p.d))(C.uPub(U)) : tcUText(U);   // V2 (B3)
    const pass = !((V2 ? Number(Utext) : U) + maxErr > lim);              // Data161!HE
    return { type: "TC", fv: V2 ? 2 : 1, nu: ke.nu, k, tcType: type, S, pt, a: q, Ultb, uch9, uch7, uch8, uch11, uch1, uch, UltbD, ubk6, ubk1, ubk2, ubk7, ubk8, uDUT, uc, U, Utext, maxErr, lim, pass, its: R };
  }
  // F59: decimals from the digit count of ROUND(frac,4)·10⁴; adds a half step before rounding (≈ round up)
  // NGOC 06/11/2026: U in ra không bao giờ nhỏ hơn U tính được. Giữ đúng cách in của Excel (F59) khi kết quả đó ≥ U;
  // trường hợp Excel ra "0" hoặc nhỏ hơn U (U < 0,001, U nguyên, U dạng 2,0001…) thì in đủ số lẻ: 2 chữ số có nghĩa, làm tròn lên (C.uPub).
  function tcUText(U) {
    if (!(U > 0)) return "0";
    const t = tcUText0(U);
    if (Number(t) > 0 && Number(t) >= U - 1e-12) return t;
    const p = C.uPub(U); return p.v.toFixed(p.d);
  }
  function tcUText0(U) {
    if (!U) return "0";
    const f = Number((xr(U - Math.floor(U), 4) * 1e4).toPrecision(15)), L = String(f).length;
    if (L === 4) return xr(U + 0.005, 2).toFixed(2);
    if (L === 3) return xr(U + 0.0005, 3).toFixed(3);
    if (L === 2) return xr(U + 0.00005, 4).toFixed(4);
    return "0";
  }

  /* ---------------- DPG / PDI – ĐLVN 76:2001 (DLVN76_2001 + Data76), "hiệu chỉnh P" = Yes ---------------- */
  function calcDPG(inp) {
    const { min: mn, max: mx, unit, acc } = inp;
    const V2 = inp.fv === 2;
    let k = inp.k || 2;
    const s1 = inp.stand1, span = mx - mn;
    const xs = inp.std.map(Number), rise = inp.rise.map(Number), fall = inp.fall.map(Number), m = xs.length;
    const f = C.factor(s1.unit, unit);
    const E9 = s1.min * f, E10 = s1.max * f, E11 = s1.uncUnit === "%" ? s1.unc : s1.unc * f;   // E9:E11 (stand in the DUT unit)
    const E12 = s1.uncUnit === "%" ? s1.unc : E11 / (E10 - E9) * 100;                        // ĐKĐBĐ quy đổi (%)
    const E13 = s1.rdg || 0;                                                                // Stand!"Sai số" used as % of reading
    const X = xs.concat(xs), Y = rise.concat(fall);                                         // E20:N20 / E21:N21
    const { a, b } = C.linest(Y, X);                                                        // F27, F26
    const Sy = C.steyx(Y, X);                                                               // F31
    const K32 = X.reduce((s, v, i, A) => s + (v - A.reduce((t, w) => t + w, 0) / A.length) ** 2, 0);
    const L32 = X.reduce((s, v) => s + v * v, 0), M32 = X.length, N32 = X.reduce((s, v) => s + v, 0);
    const Sa = Sy * Math.sqrt(L32 / M32 / K32), Sb = Sy * Math.sqrt(1 / K32), r = -N32 / Math.sqrt(M32 * L32);   // F32:F34
    const uv = V2 ? ((inp.res || 0) * 100 / span) / (2 * S3)                              // V2 (B5): chữ nhật √3
      : ((inp.res || 0) * 100 / span) / Math.sqrt(6) / 2;                                   // F37 (%)
    const cols = X.map(x => {
      const uA0 = Math.sqrt(Math.max(0, Sa * Sa + x * x * Sb * Sb + 2 * x * Sa * Sb * r)); // row 22 – in the DUT unit
      const uA = V2 ? uA0 * 100 / span : uA0;                                              // V2 (A8): quy về % span trước khi cộng
      const us = s1.deadweight ? (E12 * Math.abs(x)) / (2 * span)
        : V2 ? Math.sqrt((E12 * (E10 - E9) / (2 * span)) ** 2 + (E13 * Math.abs(x) / (S3 * span)) ** 2)   // V2 (B6)
          : (E12 * (E10 - E9) + E13 * Math.abs(x)) / (2 * span);                            // row 36 (%)
      const uc = Math.sqrt(uA * uA + us * us + uv * uv);                                    // row 23: uA added to the % terms as in the sheet
      const ke = V2 ? C.kEff([[uA, M32 - 2]], uc) : { nu: Infinity, k };
      return { x, uA, uA0, us, uc, nu: ke.nu, kj: ke.k };
    });
    const rows = xs.map((x, i) => {
      const cw = cols[i].uc >= cols[i + m].uc ? cols[i] : cols[i + m];
      const ucAvg = V2 ? cw.uc : (cols[i].uc + cols[i + m].uc) / 2;                        // I44 = ½(E23 + J23); V2 (B4): chiều lớn hơn
      const ki = V2 ? cw.kj : k;
      const Upct = ucAvg * ki, U = Upct * span / 100;                                       // K44, J44
      return { x, rise: rise[i], fall: fall[i], cR: x - rise[i], cF: x - fall[i], ucAvg, Upct, k: ki, nu: V2 ? cw.nu : Infinity, Uu: U, U: s1.deadweight ? Upct : U };   // Data76 CD: deadweight prints %
    });
    if (V2) k = Math.max(...rows.map(q => q.k));
    const Umax = Math.max(...rows.map(q => q.U));                                           // Data76!CR
    const maxSHC = Math.max(...rows.map(q => Math.max(Math.abs(q.cR), Math.abs(q.cF))));
    const lim = acc * span / 100;                                                           // IA
    // V2 (B1): từng điểm |SHC| + U (đơn vị đồng hồ, kể cả khi chuẩn là quả cân) ≤ MPE
    const decRule = V2 ? Math.max(...rows.map(q => Math.max(Math.abs(q.cR), Math.abs(q.cF)) + uUp(q.Uu))) : null;
    const pass = V2 ? !(decRule > lim) : !(Umax + maxSHC > lim);                            // HX: CR + max|SHC| > IA → Fail
    return { type: "DPG", fv: V2 ? 2 : 1, decRule, a, b, Sy, Sa, Sb, r, uv, E9, E10, E11, E12, E13, cols, rows, Umax, Utext: V2 ? (p => p.v.toFixed(p.d))(C.uPub(Umax)) : tcUText(Umax), maxSHC, lim, pass, k, n: M32 };
  }

  const api = { calcPG, calcDPG, calcTS, calcTT, calcRTD, calcTG, calcTC, tcEmf: emf, ITS, pt100, polyfit };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.LabCalc2 = api;
})(typeof self !== "undefined" ? self : this);
