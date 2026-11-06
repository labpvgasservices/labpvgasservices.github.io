/* LAB PVGAS Services – calculation core.
 * Ported 1:1 from the company workbooks (macros by khainv@pvgas.com.vn):
 *  - PT : "PT_DGCP_10_2026.xls"  sheet DLVN112-2002_Rev2 (form TM.10.BM.112.2-1) + Data112
 *  - PS : "PS_DGCP_10_2026.xls"  sheet "DLVN133 - 2004" (form DVK.LAB.TM.10.BM.133-03) + Data133
 * Re-checked 2026-10-29 against every DGCP 10/2026 row: PT 31/31 and PS 13/13 identical (rel. error < 1e-9).
 * Cell references are kept in comments so the Quality Checker can trace every number.
 */
(function (root) {
  "use strict";

  // Stand!A4:K14 – pressure unit factors, expressed per 1 bar (the sheet builds every row from these).
  const UNITS = { bar: 1, "kg/cm2": 1.019716213, kPa: 100, psi: 14.503773773, inH2O: 401.47, mbar: 1000, MPa: 0.1, "lbf/in2": 14.503773773, mmH2O: 10197.162 };
  function factor(from, to) {
    if (from === to) return 1;
    if (!(from in UNITS) || !(to in UNITS)) return NaN;
    return UNITS[to] / UNITS[from];
  }

  // Excel ROUND (half away from zero) with float guard.
  function xround(v, d) {
    const p = Math.pow(10, d);
    const s = v < 0 ? -1 : 1;
    return s * Math.round((Math.abs(v) * p) * (1 + 1e-12)) / p;
  }

  // Data112!GC / Data133!CG – uncertainty is always rounded UP by adding half a digit:
  //  fraction ≥ 0.1  -> 2 decimals ; 0.01–0.099 -> 3 decimals ; 0.001–0.0099 -> 4 decimals.
  // Excel returns 0 when the fraction is < 0.001 (e.g. U = 2.0000); we fall back to 4 decimals instead
  // and flag it, so a certificate never prints U = 0.
  /* Publication rules 30/10/2026 (PT / PS / TT):
   * U: two significant figures, rounded UP, never better than calculated.
   *   D = 1 - INT(ROUND(LOG10(u),9)); r = ROUNDUP(ROUND(u,D+6),D); printed with MAX(0, 1-INT(ROUND(LOG10(r),9))) decimals; u = 0 -> "0". */
  function uPub(u) {
    if (!isFinite(u)) return { v: NaN, d: 0 };
    if (!(u > 0)) return { v: 0, d: 0 };
    const D = 1 - Math.floor(xround(Math.log10(u), 9));
    const s = xround(xround(u, D + 6) * Math.pow(10, D), 6);
    const r = D >= 0 ? Math.ceil(s) / Math.pow(10, D) : Math.ceil(s) * Math.pow(10, -D);
    return { v: r, d: Math.max(0, 1 - Math.floor(xround(Math.log10(r), 9))) };
  }
  // Readings: decimals of a set = max over its values of the smallest k (0..M) with ROUND(x,k) = ROUND(x,M)
  function pubDec(arr, M) {
    let d = 0;
    arr.forEach(x => { x = Number(String(x).replace(",", ".")); if (!isFinite(x)) return; const t = xround(x, M); let k = 0; while (k < M && xround(x, k) !== t) k++; if (k > d) d = k; });
    return d;
  }
  // PS keeps its text API: dot decimal, no thousands separator
  function roundUnc(x) { const p = uPub(x); return isFinite(p.v) ? { text: p.v.toFixed(p.d), flag: false, v: p.v } : { text: "—", flag: false }; }

  // Certificate PT 2026: Data112!GC/GQ keep 4 decimals, the mail-merge prints 3 ("0,320").
  function u3(x) { return isFinite(x) ? xround(xround(x, 4), 3) : NaN; }

  /* Bản công thức đã sửa 06/11/2026 (fv = 2, rà soát Uncer 01/11/2026 mục B2): hệ số phủ từ bậc tự do hiệu dụng.
   * ν_eff theo Welch–Satterthwaite (GUM G.4.1): ν = u_c⁴ / Σ(u_i⁴/ν_i), thành phần loại B có ν = ∞.
   * k = t_95,45(ν) theo bảng EA-4/02 M (1→13,97 … 50→2,05, ∞→2,00), nội suy tuyến tính theo 1/ν; ν làm tròn xuống. */
  const KT = [[1, 13.97], [2, 4.53], [3, 3.31], [4, 2.87], [5, 2.65], [6, 2.52], [7, 2.43], [8, 2.37], [10, 2.28], [20, 2.13], [50, 2.05], [Infinity, 2]];
  function kOf(nu) {
    if (!(nu > 1)) return KT[0][1];
    if (!isFinite(nu)) return 2;
    nu = Math.floor(nu);
    for (let i = 1; i < KT.length; i++) {
      const [n1, k1] = KT[i - 1], [n2, k2] = KT[i];
      if (nu <= n2) { if (nu === n1) return k1; const x1 = 1 / n1, x2 = isFinite(n2) ? 1 / n2 : 0, x = 1 / nu; return k1 + (k2 - k1) * (x1 - x) / (x1 - x2); }
    }
    return 2;
  }
  // comps: [[u, ν], …] (ν bỏ trống / Infinity = loại B); uc tính sẵn hoặc RSS của comps
  function kEff(comps, uc) {
    uc = uc == null ? Math.sqrt(comps.reduce((s, c) => s + c[0] * c[0], 0)) : uc;
    const den = comps.reduce((s, c) => s + (c[1] > 0 && isFinite(c[1]) ? c[0] ** 4 / c[1] : 0), 0);
    const nu = den > 0 ? uc ** 4 / den : Infinity;
    return { nu, k: kOf(nu) };
  }

  function mean(a) { return a.reduce((s, v) => s + v, 0) / a.length; }
  function devsq(a) { const m = mean(a); return a.reduce((s, v) => s + (v - m) * (v - m), 0); }
  function steyx(y, x) {
    const n = x.length, mx = mean(x), my = mean(y);
    let sxx = 0, sxy = 0, syy = 0;
    for (let i = 0; i < n; i++) { sxx += (x[i] - mx) ** 2; sxy += (x[i] - mx) * (y[i] - my); syy += (y[i] - my) ** 2; }
    return Math.sqrt(Math.max(0, (syy - sxy * sxy / sxx) / (n - 2)));
  }
  function linest(y, x) {
    const mx = mean(x), my = mean(y);
    let sxx = 0, sxy = 0;
    for (let i = 0; i < x.length; i++) { sxx += (x[i] - mx) ** 2; sxy += (x[i] - mx) * (y[i] - my); }
    const b = sxy / sxx;
    return { b, a: my - b * mx };
  }

  /* Standard (Stand) record, as in sheet "Stand Ref":
   * { min, max, unit, unc, uncUnit ('%' or pressure/elec unit), rdg (% of reading), deadweight (bool) }
   * For a pressure standard the uncertainty is converted to the DUT unit the same way the sheet does:
   * value * factor(stand.unit -> DUT unit).
   */
  function standInUnit(s, unit) {
    const f = factor(s.unit, unit);
    return { min: s.min * f, max: s.max * f, unc: s.uncUnit === "%" ? s.unc : s.unc * f, f };
  }

  /* ---------------- PT / DPT (4–20 mA) – DLVN112-2002_Rev2 ---------------- */
  function calcPT(inp) {
    const { min: mn, max: mx, unit, acc } = inp;
    const V2 = inp.fv === 2;                                // bản công thức đã sửa 06/11/2026
    let k = inp.k || 2;
    const xs = inp.points.map(Number);
    const rise = inp.rise.map(Number), fall = inp.fall.map(Number);
    const m = xs.length;
    const span = mx - mn;
    const s1 = inp.stand1, s2 = inp.stand2;
    const S1 = standInUnit(s1, unit);                       // E9, E10, E11
    const E12 = s1.uncUnit === "%" ? s1.unc : S1.unc / (S1.max - S1.min) * 100; // ĐKĐBĐ quy đổi (%)
    const E13 = s1.rdg || 0;                                // % of reading
    const H9 = s2.min, H10 = s2.max;
    const H12 = s2.uncUnit === "%" ? s2.unc : s2.unc / (H10 - H9) * 100;
    const H13 = s2.rdg || 0;
    const G6 = 4, G7 = 20;

    // Row 20: corrected pressure. "Đã hiệu chỉnh áp suất" = Yes -> x used as is (only path supported).
    const X = xs.concat(xs);
    const Y = rise.concat(fall);
    const I = X.map(x => 4 + 16 * (x - mn) / span);         // row 21 standard current
    const { a, b } = linest(Y, X);                          // F29, F28
    const Sy = steyx(Y, X);                                 // F33
    const K34 = devsq(I), L34 = I.reduce((s, v) => s + v * v, 0), M34 = I.length, N34 = I.reduce((s, v) => s + v, 0);
    const Sa = Sy * Math.sqrt(L34 / M34 / K34);             // F34
    const Sb = Sy * Math.sqrt(1 / K34);                     // F35
    const r = -N34 / Math.sqrt(M34 * L34);                  // F36
    const uv = Math.sqrt((H12 * (H10 - H9) / (2 * (G7 - G6))) ** 2 + ((H13 / (H10 - H9)) / (2 * Math.sqrt(3))) ** 2); // F39

    const cols = X.map((x, j) => {
      const uAmA = Math.sqrt(Math.max(0, Sa * Sa + I[j] * I[j] * Sb * Sb + 2 * I[j] * Sa * Sb * r)); // row 23
      const uA = 100 * uAmA / (G7 - G6);                    // row 24 (%)
      const us = s1.deadweight
        ? (E12 * Math.abs(x)) / (2 * span)
        : V2 ? Math.sqrt((E12 * (S1.max - S1.min) / (2 * span)) ** 2 + (E13 * Math.abs(x) / (Math.sqrt(3) * span)) ** 2)   // B6: %Rdg = cấp chính xác NSX → chữ nhật √3, cộng RSS
          : (E12 * (S1.max - S1.min) + E13 * Math.abs(x)) / (2 * span); // row 38 (%)
      const uc = Math.sqrt(uA * uA + us * us + uv * uv);    // row 25 (%)
      const ke = kEff([[uA, M34 - 2]], uc);                 // B2: u_A từ hồi quy có ν = n − 2
      return { x, I: I[j], y: Y[j], uAmA, uA, us, uc, nu: ke.nu, kj: ke.k };
    });

    const rows = xs.map((x, i) => {
      const ideal = 4 + 16 * (x - mn) / span;
      const shcR = ideal - rise[i], shcF = ideal - fall[i];
      const cw = cols[i].uc >= cols[i + m].uc ? cols[i] : cols[i + m];
      const ucAvg = V2 ? cw.uc : (cols[i].uc + cols[i + m].uc) / 2;      // I46 (B4: bản sửa lấy chiều lớn hơn)
      const ki = V2 ? cw.kj : k;
      const Upct = ucAvg * ki;                              // K46
      const U = Upct * span / 100;                          // J46 (DUT unit)
      return { x, ideal, rise: rise[i], fall: fall[i], shcR, shcF, shcAvg: (shcR + shcF) / 2, ucAvg, Upct, U, k: ki, nu: V2 ? cw.nu : Infinity }; // H46 = (F46+G46)/2
    });
    if (V2) k = Math.max(...rows.map(r => r.k));
    const Umax = Math.max(...rows.map(r => r.U));           // Data112!CZ
    const shcMax = Math.max(...rows.map(r => Math.max(Math.abs(r.shcR), Math.abs(r.shcF))));
    const limU = acc * span / 100, limI = acc * 16 / 100;
    // B1 (NGOC 06/11/2026): bản sửa dùng quy tắc chung |sai số| + U ≤ MPE, xét từng điểm, cùng đơn vị đo
    const decRule = V2 ? Math.max(...rows.map(r => Math.max(Math.abs(r.shcR), Math.abs(r.shcF)) * span / 16 + r.U)) : null;
    const pass = V2 ? !(decRule > limU) : Umax <= limU && !(shcMax > limI);          // Data112!IF
    return {
      type: "PT", k, a, b, Sy, Sa, Sb, r, uv, E9: S1.min, E10: S1.max, E11: S1.unc, E12, E13, H12, H13, H9, H10,
      factor1: S1.f, cols, rows, Umax, shcMax, limU, limI, pass, K34, L34, M34, N34,
      F41: Math.max(...rows.map(r => r.ucAvg)), F42: V2 ? Umax / span * 100 : k * Math.max(...rows.map(r => r.ucAvg)), // F41 = MAX(I46:I50), F42 = E16*F41
      UmaxText: roundUnc(Umax), fv: V2 ? 2 : 1, decRule,
      checks: { uOK: Umax <= limU, iOK: !(shcMax > limI) }
    };
  }

  /* ---------------- PS / DPS – DLVN133-2004 ---------------- */
  function calcPS(inp) {
    const { pset, unitPset: unit, acc, n = 5, resolution = 0 } = inp;
    const V2 = inp.fv === 2;
    let k = inp.k || 2;
    const hi = inp.high.map(Number), lo = inp.low.map(Number);   // C20:C24 (P.High) , D20:D24 (P.Low)
    const s1 = inp.stand1;
    const S1 = standInUnit(s1, unit);                             // E11 (min), E12 (FS), E13 (unc)
    const E14 = s1.uncUnit === "%" ? s1.unc : S1.unc / (S1.max - S1.min) * 100;
    const G14 = s1.rdg || 0;
    const G = hi.map(v => pset - v), H = lo.map(v => pset - v);   // G20:H24
    const dir = Math.abs(mean(G)) > Math.abs(mean(H)) ? "Falling" : "Rising"; // E9
    const F28 = mean(hi), F29 = mean(lo);
    const F26 = Math.sqrt(hi.reduce((s, v) => s + (v - F28) ** 2, 0) / (n * (n - 1)));
    const F27 = Math.sqrt(lo.reduce((s, v) => s + (v - F29) ** 2, 0) / (n * (n - 1)));
    const F31 = s1.deadweight ? (E14 * pset) / (2 * 100)
      : V2 ? Math.sqrt((E14 * S1.max / 200) ** 2 + (G14 * Math.abs(pset) / (100 * Math.sqrt(3))) ** 2)   // B6: %Rdg chữ nhật √3, RSS
        : (E14 * S1.max + G14 * pset) / (100 * 2); // uses E16 = 2
    const F32 = resolution / 2;
    const F34 = Math.sqrt(F26 ** 2 + F31 ** 2 + (F32 / Math.sqrt(3)) ** 2);
    const F35 = Math.sqrt(F27 ** 2 + F31 ** 2 + (F32 / Math.sqrt(3)) ** 2);
    const rising = dir === "Rising";
    const ke = V2 ? kEff([[rising ? F26 : F27, n - 1]], rising ? F34 : F35) : { nu: Infinity, k };   // B2
    k = ke.k;
    const F37 = k * F34, F38 = k * F35;
    const set = rising ? hi : lo, reset = rising ? lo : hi;
    const setDev = rising ? G : H, resetDev = rising ? H : G;
    const U = rising ? F37 : F38;                                  // I42
    const J42 = Math.max(...setDev.map(Math.abs)) + U;
    const K42 = acc * pset / 100;
    const pass = U > 0 ? !(J42 > K42) : false;                     // D47
    return {
      type: "PS", k, dir, E11: S1.min, E12: S1.max, E13: S1.unc, E14, G14, factor1: S1.f,
      F26, F27, F28, F29, F31, F32, F34, F35, F37, F38, U, J42, K42, pass,
      set, reset, setDev, resetDev, hi, lo, G, H, Utext: roundUnc(U), fv: V2 ? 2 : 1, nu: ke.nu
    };
  }

  // Data112!V/X : EOMONTH(calDate, months)
  function eomonth(d, months) { return new Date(d.getFullYear(), d.getMonth() + months + 1, 0); }

  const api = { UNITS, factor, xround, kOf, kEff, roundUnc, uPub, pubDec, u3, calcPT, calcPS, eomonth, steyx, linest };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.LabCalc = api;
})(typeof self !== "undefined" ? self : this);
