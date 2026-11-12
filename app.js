/* LAB PVGAS Services – UI */
(function () {
  "use strict";
  const A = window.LabAuth, P = window.LabPhotos, C = window.LabCalc, C2 = window.LabCalc2, D = window.LabDocs, D2 = window.LabDocs2, SEED = window.LabSeed, esc = D.esc;
  const NEWT = ["PG", "TS", "TT", "RTD", "TG", "TC", "DPG"], READY = ["PT", "PS"].concat(NEWT), TEMP = ["TS", "TT", "RTD", "TG", "TC"];
  const DESC0 = { PT: "Pressure Transmitter", PS: "Pressure Switch", PG: "Pressure Gauge", TS: "Temperature Switch", TT: "Temperature Transmitter", RTD: "Industrial Platinum Resistance Thermometer", TG: "Temperature Indicator", TC: "Industrial Thermocouples", DPG: "Pressure Diff Indicator" };
  const blank = n => Array(n).fill("");
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const clone = o => JSON.parse(JSON.stringify(o));
  const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
  const PUNITS = Object.keys(C.UNITS);
  // Hãng sản xuất theo từng loại thiết bị: trước hết là các hãng có trong hồ sơ / danh sách ký của LAB (2024–2026),
  // sau đó là các hãng phổ biến khác của đúng loại đó. Không có trong danh sách -> chọn KHÁC và gõ tay.
  const MAKERS = {
    PT: ["Rosemount", "Yokogawa", "Honeywell", "Endress+Hauser", "ABB", "Siemens", "Foxboro", "Fuji Electric", "Azbil", "WIKA", "Krohne", "VEGA", "Druck", "SMAR", "KELLER"],
    PS: ["SOR", "United Electric Controls", "Neo-Dyn", "Poter", "Barksdale", "Ashcroft", "WIKA", "Danfoss", "Mercoid", "Custom Control Sensors (CCS)", "Delta Mobrey", "Dwyer", "Nagano Keiki", "Square D"],
    PG: ["WIKA", "Ashcroft", "Excel", "Rototherm", "ITEC", "Nuova Fima", "Delta Mobrey", "Masoneilan", "Fisher", "Yamaki", "McDaniel", "Helicoid", "Badotherm", "Baumer", "Budenberg", "Dwyer", "Winters", "NOSHOK", "Swagelok", "Tanaka"],
    DPG: ["Orange Research", "Mid-West Instrument", "ITEC", "WIKA", "Ashcroft", "Dwyer", "Barton", "Badotherm", "Nuova Fima", "Delta Mobrey"],
    TG: ["Inotek-USA", "Tel-Tru-USA", "Ashcroft", "ITEC", "WIKA", "Rototherm", "Reotemp", "Weiss", "Trerice", "Winters", "Badotherm", "Nuova Fima", "Ametek US Gauge"],
    TT: ["Siemens", "ABB", "Honeywell", "WIKA", "New-Flow", "Rosemount", "Yokogawa", "Endress+Hauser", "Moore Industries", "Phoenix Contact", "PR electronics"],
    TS: ["WIKA", "SOR", "United Electric Controls", "Barksdale", "Ashcroft", "Danfoss", "Mercoid", "Dwyer", "ITEC"],
    RTD: ["MinCo", "Killark", "HyubSung", "Rosemount", "WIKA", "Reotemp", "Hisco", "Pyromation", "Endress+Hauser", "Thermo-Electric", "Okazaki", "Omega"],
    TC: ["Pyromation", "Applied Energy Corporation/Superior", "WIKA", "Rosemount", "Thermo-Electric", "Okazaki", "Watlow", "Omega", "Endress+Hauser"]
  };
  const makersFor = type => MAKERS[type] || MAKERS.PT;
  const OTHER = "__other";

  /* ---------- storage (never throws) ---------- */
  const store = {
    get(k, def) { try { const v = localStorage.getItem("lab." + k); return v ? JSON.parse(v) : def; } catch (e) { return def; } },
    set(k, v) {
      try { localStorage.setItem("lab." + k, JSON.stringify(v)); } catch (e) { toast("Không lưu được vào bộ nhớ máy"); return false; }
      if (!fromCloud && window.LabCloud && LabCloud.enabled && (k === "records" || k === "stands" || k === "settings")) LabCloud.schedule();   // đồng bộ máy chủ
      return true;
    }
  };
  let fromCloud = false;
  function deepMerge(base, over) { const o = clone(base); for (const k in over || {}) o[k] = (over[k] && typeof over[k] === "object" && !Array.isArray(over[k]) && base[k]) ? deepMerge(base[k], over[k]) : over[k]; return o; }
  // v2 (mẫu 2026): bỏ các thiết lập tiêu đề/chân trang cũ, giữ tên người ký và tuỳ chọn của người dùng
  function loadSettings() {
    let o = store.get("settings", {}) || {};
    if ((o.ver || 1) < 2) {
      const keep = {}; ["sig1Name", "sig2Name", "dueMonths", "warnExpired", "showLogo"].forEach(k => { if (k in o) keep[k] = o[k]; });
      o = keep; store.set("settings", o);
    }
    // v4 (NGOC 06/11/2026): GCN in đủ ngày cấp theo ô "Ngày cấp chứng chỉ" – bỏ chế độ để trống ngày đã lưu trên máy
    if ((o.ver || 1) < 4) { o.issueDayBlank = false; o.ver = 4; store.set("settings", o); }
    const m = deepMerge(SEED.settings, o); m.ver = SEED.settings.ver; return fixRanges(m, o.rangesVer);
  }
  // Sửa dải đã lưu (trên máy / máy chủ) theo xác nhận của NGOC. v2 10/11/2026: GDS = GDS Phú Mỹ; GDS Bà Rịa thuộc dải Bà Rịa.
  function fixRanges(m, oldVer) {
    if ((oldVer || 1) < 2 && Array.isArray(m.ranges)) {
      const gds = m.ranges.find(g => g.id === "kdn-gds"), br = m.ranges.find(g => g.id === "kdn-br");
      if (gds && br && (gds.locs || []).includes("Trạm GDS BR")) {
        gds.locs = gds.locs.filter(c => c !== "Trạm GDS BR"); gds.note = "GDS trong bảng = GDS Phú Mỹ (NGOC 10/11/2026)";
        if (!(br.locs || []).includes("Trạm GDS BR")) br.locs = (br.locs || []).concat("Trạm GDS BR");
      }
    }
    m.rangesVer = SEED.settings.rangesVer; return m;
  }
  // Danh mục chuẩn: khi đổi phiên bản seed thì thay chuẩn gốc, giữ chuẩn người dùng tự thêm (id bắt đầu bằng "s")
  function loadStands() {
    const st = store.get("stands", null), ver = store.get("standsVer", 1);
    if (!st) return clone(SEED.stands);
    if (ver < SEED.version) {
      const mine = st.filter(s => /^s[0-9a-z]+$/.test(s.id));
      const out = clone(SEED.stands).concat(mine); store.set("stands", out); store.set("standsVer", SEED.version); return out;
    }
    return st;
  }
  // Hồ sơ cũ: PS lưu P.High/P.Low -> đổi sang Set/Reset như QTG 2026
  const blankPhotos = () => Array.from({ length: P.SLOTS }, (_, i) => ({ cap: `Điểm ${i + 1}`, has: false }));
  function normalize(r) {
    if (!r) return r;
    if (!Array.isArray(r.photos)) r.photos = blankPhotos();
    if (r.fv !== 2) r.fv = 1;                       // hồ sơ tạo trước 06/11/2026: giữ công thức Excel 2026 (GCN in lại không đổi số)
    r.h = r.h || {};
    if (r.h.envOk === undefined || r.h.envOk === true) r.h.envOk = "1";
    if (r.h.mfgYear === undefined) r.h.mfgYear = "";
    if (r.h.calPlace === undefined) r.h.calPlace = "";
    if (!r.h.psType) r.h.psType = "As Left";
    r.ps = r.ps || {};
    if (!r.ps.set) {
      const hi = r.ps.high || ["", "", "", "", ""], lo = r.ps.low || ["", "", "", "", ""], rising = r.h.dirQTG !== "Falling";
      r.ps.set = (rising ? hi : lo).slice(); r.ps.reset = (rising ? lo : hi).slice();
    }
    delete r.ps.high; delete r.ps.low;
    const b = newRecord(r.type || "PT");
    if (!r.tg) r.tg = b.tg;
    for (const k in b.h) if (r.h[k] === undefined) r.h[k] = b.h[k];
    ["pg", "ts", "tt", "rtd", "tc", "dpg"].forEach(k => { if (!r[k]) r[k] = b[k]; });
    return r;
  }
  let settings = loadSettings();
  let stands = loadStands(); store.set("standsVer", SEED.version);
  let records = store.get("records", []).map(normalize);
  let names = store.get("names", []);
  let rec = normalize(store.get("current", null)) || newRecord("PT");
  /* ---------- người dùng, quyền xem hồ sơ, trạng thái duyệt (v49) ---------- */
  let people = store.get("people", []);
  function loadPeople() { return A.people().then(l => { if (Array.isArray(l) && l.length) { people = l; store.set("people", l); } return people; }).catch(() => people); }
  // Hiển thị Họ và tên (NGOC 12/11/2026): hồ sơ cũ có thể lưu ID đăng nhập (vd hiep.nv) – đổi sang họ tên theo danh sách người dùng. Chỉ để hiển thị, KHÔNG đổi dữ liệu / nội dung in trên GCN.
  const fullName = s => { const k = String(s == null ? "" : s).trim().toLowerCase(); if (!k) return ""; const p = people.find(x => String(x.id) === String(s) || (x.login && String(x.login).toLowerCase() === k)); return p && p.name ? p.name : String(s); };
  const ownerName = o => o ? ((people.find(p => p.id === o.id) || {}).name || fullName(o.name)) : "";
  const isFinal = r => !!(r && (r.final || (r.approved && !r.flow2)));
  const stage = r => isFinal(r) ? "done" : r.approved ? "final" : r.submitted ? "review" : "draft";
  const STAGE = { done: ["ok", "Đã duyệt final"], final: ["warn", "Chờ duyệt final"], review: ["warn", "Chờ kiểm soát"], draft: ["mut", "Chưa chuyển duyệt"] };
  // Cấp 3 xem tất cả; cấp 1/2 chỉ xem hồ sơ mình nhập và hồ sơ được chuyển tới mình (NGOC 10/11/2026)
  const visible = r => { const m = A.me(); if (!m) return false; if (m.role >= 3) return true; return !!(r.owner && r.owner.id === m.id) || (r.viewers || []).includes(m.id); };
  // Hồ sơ đang chờ chính mình xử lý: bước kiểm soát (được chuyển tới mình) hoặc bước final (cấp 3, chuyển tới mình hoặc chưa ghi người)
  const myTurn = r => { const m = A.me(); if (!m || m.role < 2 || !visible(r)) return false; const st = stage(r);
    if (st === "review") return r.submitted.to ? r.submitted.to.id === m.id : !(r.owner && r.owner.id === m.id);
    if (st === "final") return m.role >= 3 && (!r.finalTo || r.finalTo.id === m.id);
    return false; };
  const isFail = r => !!(r.summary && r.summary.pass === false);
  const reviewers = exclude => people.filter(p => p.role >= 2 && p.id !== exclude);
  const finals = () => people.filter(p => p.role >= 3);
  function addViewer(r, id) { if (!id) return; r.viewers = Array.isArray(r.viewers) ? r.viewers : []; if (!r.viewers.includes(id)) r.viewers.push(id); }
  const personByName = n => { n = String(n || "").trim().toLowerCase(); return n ? people.find(p => String(p.name || "").trim().toLowerCase() === n) : null; };
  const personSel = (id, list, cur, ph) => `<select id="${id}"><option value="">${esc(ph)}</option>${list.map(p => `<option value="${esc(p.id)}"${cur === p.id ? " selected" : ""}>${esc(p.name)}</option>`).join("")}</select>`;
  function failWhy(c) {
    const w = (c.warns || []).filter(x => /^Không đạt/.test(x) && !/không cấp số/.test(x));
    return w.length ? w[0].replace(/^Không đạt:\s*/, "") : "Sai số + độ không đảm bảo đo vượt sai số cho phép (MPE)";
  }
  // Ô Người kiểm soát: chọn từ danh sách cấp 2 / 3 (trừ người nhập hồ sơ)
  function ctlField() {
    const list = reviewers(rec.owner ? rec.owner.id : (A.me() || {}).id), cur = rec.sig.controller || "";
    const opts = [["", list.length ? "— Chọn Người kiểm soát —" : "— Chưa tải được danh sách người dùng —"]].concat(list.map(p => [p.name, p.name]));
    if (cur && !list.some(p => p.name === cur)) opts.push([cur, cur]);
    return fld("Người soát lại / kiểm tra (Người kiểm soát)", "sig.controller", { options: opts });
  }
  // Huy hiệu tab Hồ sơ: số hồ sơ chờ mình duyệt và số hồ sơ KHÔNG ĐẠT; báo động khi có hồ sơ không đạt / chờ duyệt mới
  function badge() {
    const b = document.querySelector('nav.tabs button[data-v="records"]'); if (!b || !A.me()) return;
    const vis = records.filter(visible), q = vis.filter(myTurn).length, f = vis.filter(isFail);
    let el = b.querySelector(".bdg"); if (!el) { el = document.createElement("span"); el.className = "bdg"; b.appendChild(el); }
    el.innerHTML = `${q ? `<i class="bq">${q}</i>` : ""}${f.length ? `<i class="bf">⚠${f.length}</i>` : ""}`; el.hidden = !q && !f.length;
    const seen = store.get("failSeen", []), fresh = f.filter(r => !seen.includes(r.id));
    if (fresh.length) toast(`⚠ ${fresh.length} hồ sơ KHÔNG ĐẠT mới: ${fresh.slice(0, 3).map(r => r.h.tag).join(", ")}${fresh.length > 3 ? "…" : ""} – xem tab Hồ sơ`);
    if (fresh.length) store.set("failSeen", seen.concat(fresh.map(r => r.id)).slice(-500));
  }
  let lastPdf = null;

  function newRecord(type) {
    const st = settings[type], T = TEMP.includes(type);
    return {
      id: "r" + Date.now().toString(36), type, fv: 2, certNo: "", certAuto: true, ptAuto: true,
      h: {
        location: "Giàn DGCP", locMode: "list", locFree: "", custFree: "", calPlace: "", makerSel: "", tag: "", description: DESC0[type], model: "", serial: "", maker: "", mfgYear: "",
        min: "", max: "", unit: T ? "°C" : (type === "PG" ? "bar" : "kPa"), tcType: "J", acc: type === "PT" ? 0.25 : type === "PS" ? 1 : "", calDate: todayISO(), issueDate: todayISO(),
        procedure: st.procedure, env: st.env, envOk: "1", stand1: "", stand2: type === "PT" ? (stands.find(s => s.kind === "e") || {}).id || "" : "",
        pset: "", unitPset: "kPa", psType: ["PS", "TS"].includes(type) ? "As Found" : "As Left", micro: "NC", dirQTG: "Rising", resolution: 0, note: "",
        stand3: "", tset: "", scale: "", res: "", errFactor: "0.8", heightDiff: "0", verType: "Định kỳ", extCheck: "1", techCheck: "1", stamp: "", typeEN: "Spring", insul: "", sens: "0.385", indType: "Analog", rangeId: ""
      },
      pt: { points: ["", "", "", "", ""], rise: ["", "", "", "", ""], fall: ["", "", "", "", ""] },
      ps: { set: ["", "", "", "", ""], reset: ["", "", "", "", ""] },
      pg: { std: blank(5), rise: blank(5), fall: blank(5), before: "", after: "" },
      ts: { set: blank(5), reset: blank(5) },
      tt: { nom: blank(5), sr: [0, 1, 2, 3, 4].map(() => blank(3)), sf: [0, 1, 2, 3, 4].map(() => blank(3)), dr: [0, 1, 2, 3, 4].map(() => blank(3)), df: [0, 1, 2, 3, 4].map(() => blank(3)) },
      rtd: { std: blank(6), dut: [0, 1, 2, 3, 4, 5].map(() => blank(5)) },
      tc: { nom: blank(8), std: [0, 1, 2, 3, 4, 5, 6, 7].map(() => blank(5)), dut: [0, 1, 2, 3, 4, 5, 6, 7].map(() => blank(5)) },
      dpg: { std: blank(5), rise: blank(5), fall: blank(5), before: "", after: "" },
      tg: { nom: blank(5), sr: [0, 1, 2, 3, 4].map(() => blank(3)), sf: [0, 1, 2, 3, 4].map(() => blank(3)), dr: [0, 1, 2, 3, 4].map(() => blank(3)), df: [0, 1, 2, 3, 4].map(() => blank(3)) },
      sig: { inspector: A.me() ? A.me().name : "", controller: "" }, saved: false,
      owner: A.me() ? { id: A.me().id, name: A.me().name } : null, photos: blankPhotos()
    };
  }

  /* ---------- helpers ---------- */
  function toast(msg) { const t = $("#toast"); t.textContent = msg; t.classList.add("on"); clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove("on"), 2200); }
  const num = v => (v === "" || v == null) ? NaN : Number(String(v).replace(",", "."));
  const standById = id => stands.find(s => s.id === id);
  function locInfo(code) { const l = SEED.locations.find(x => x[0] === code) || [code, code, "", "", ""]; return { code: l[0], locVN: l[1], locEN: l[2], custVN: l[3], custEN: l[4] }; }
  // Khách hàng (Customer) gom theo tên tiếng Anh: cùng 1 công ty có thể ghi tiếng Việt khác nhau trong sheet Location.
  // Tên hiển thị = cách ghi tiếng Việt xuất hiện nhiều nhất. GCN vẫn in đúng chữ của từng dòng địa điểm.
  const CUSTS = (() => {
    const vn2en = {}; SEED.locations.forEach(l => { if (l[3] && l[4]) vn2en[l[3]] = l[4].trim(); });
    const key = l => (l[4] || "").trim() || vn2en[l[3]] || l[3] || "";
    const g = new Map();
    SEED.locations.forEach(l => { const k = key(l); if (!k) return; if (!g.has(k)) g.set(k, { key: k, names: {}, locs: [] }); const c = g.get(k); c.names[l[3]] = (c.names[l[3]] || 0) + 1; if (!l[5]) c.locs.push(l); });
    const out = [...g.values()].map(c => ({ key: c.key, name: Object.entries(c.names).sort((a, b) => b[1] - a[1])[0][0], locs: c.locs }));
    out.keyOf = code => { const l = SEED.locations.find(x => x[0] === code); return l ? key(l) : ""; };
    return out;
  })();
  function recLoc(r = rec) {
    const h = r.h;
    if (h.locMode === "free") return { code: "", locVN: h.locFree || "", locEN: "", custVN: h.custFree || "", custEN: "" };
    // Chọn sẵn: in đúng danh mục (sheet Location), KHÔNG dùng tên gõ tay. Lỗi cũ: ô custFree bị ẩn nhưng vẫn đè lên GCN
    // (VD "Khí Đông Nam") và còn bị chép sang hồ sơ mới – NGOC báo 02/11/2026.
    return locInfo(h.location);
    return l;
  }
  function makerSel(h, type = rec.type) { return h.makerSel || (makersFor(type).includes(h.maker) ? h.maker : (h.maker ? OTHER : "")); }
  // "26" = năm 2026 theo Ngày hiệu chuẩn; sang năm 2027 tự thành "27"
  function yy(r = rec) { const d = D.toDate(r.h.calDate) || new Date(); return String(d.getFullYear()).slice(2); }
  // PS: QTG ghi Áp suất tác động / Áp suất trả về theo chiều tác động -> P.High (tăng áp) / P.Low (giảm áp) cho sheet DLVN133
  /* Số chữ số thập phân chuẩn hiển thị được (yêu cầu 30/10/2026: số đọc chuẩn không được nhiều chữ số hơn màn hình của chuẩn).
   * Áp suất: màn hình có D chữ số (D = số chữ số phần nguyên của Max + số lẻ của độ phân giải trên GCN), giống bảng đơn vị của
   * Fluke 700G (5 chữ số, giới hạn 100 000 counts), Crystal XP2i (5) và Beamex MC6/EXT (5–6): đổi đơn vị thì số lẻ = D − số chữ số phần nguyên
   * của Max ở đơn vị đó (Max < 1 tính là 1 chữ số, như 700G02 hiện 0.0689 bar). Kết quả < 0 = chuẩn không hiển thị được đơn vị này.
   * Điện / điện trở: theo thang đo (steps = [[giới hạn thang, độ phân giải]], lấy từ bảng kết quả trên GCN). Nhiệt độ: độ phân giải °C. */
  const decOf = v => { const x = parseFloat(String(v).replace(",", ".")); return x > 0 ? Math.max(0, Math.round(-Math.log10(x))) : null; };
  const intDig = x => { x = Math.abs(x); return x < 1 ? 1 : Math.floor(Math.log10(x) + 1e-9) + 1; };
  const typedDec = v => (String(v).trim().replace(",", ".").split(".")[1] || "").replace(/[^0-9]/g, "").length;
  function standDec(s, unit, value) {
    if (!s) return null;
    if (s.dec && s.dec[unit] != null) return s.dec[unit];
    if (s.kind === "p") {
      if (s.name === "Deadweight Tester") return null;           // quả cân: áp suất tính từ khối lượng, không có màn hình
      const d0 = decOf(s.res), f = C.factor(s.unit, unit); if (d0 == null || !isFinite(f)) return null;
      const fs = Math.max(Math.abs(s.min), Math.abs(s.max));
      return intDig(fs) + d0 - intDig(fs * f);
    }
    if (s.steps && s.steps.length) { const v = Math.abs(num(value)) || 0; const st = s.steps.find(x => v <= x[0]) || s.steps[s.steps.length - 1]; return decOf(st[1]); }
    if (s.kind === "t") return unit === "°C" ? decOf(s.res) : null;
    if (s.kind === "e" || s.kind === "r" || s.kind === "v") return decOf(s.res);
    return null;
  }
  // vals: chuỗi người dùng nhập; lỗi khi nhiều chữ số lẻ hơn chuẩn hiển thị (điện trở chỉ cảnh báo – xem review/stand_digits)
  function checkDec(s, unit, vals, lab, E, W) {
    if (!s) return;
    const bad = [];
    for (const v of vals.flat()) {
      if (v === "" || v == null || isNaN(num(v))) continue;
      const d = standDec(s, unit, v); if (d == null) continue;
      if (d < 0) { E.push(`${s.key} không hiển thị được đơn vị ${unit} (vượt số chữ số màn hình) – chọn đơn vị khác hoặc chuẩn khác`); return; }
      if (typedDec(v) > d) bad.push([v, d]);
    }
    if (!bad.length) return;
    const [v, d] = bad[0];
    const msg = `${lab}: "${v}"${bad.length > 1 ? ` (và ${bad.length - 1} số khác)` : ""} có ${typedDec(v)} chữ số thập phân, nhưng ${s.key} chỉ hiển thị ${d} chữ số ở đơn vị ${unit}${s.kind === "p" ? "" : " (thang đo này)"}`;
    (s.kind === "r" ? W : E).push(msg);
  }
  function decHint(list) {
    const parts = list.filter(([s]) => s).map(([s, unit, sample]) => { const d = standDec(s, unit, sample); return d == null ? `${s.key}: không giới hạn (không có màn hình / chưa có số liệu)` : d < 0 ? `${s.key}: KHÔNG hiển thị được ${unit}` : `${s.key}: tối đa ${d} chữ số thập phân (${unit}${s.steps ? ", tuỳ thang đo" : ""})`; });
    return parts.length ? `<div class="hint wide">Số đọc chuẩn – ${parts.map(esc).join(" · ")}</div>` : "";
  }
  /* Chuẩn có phù hợp với thiết bị cần KĐHC không (yêu cầu 30/10/2026):
   * 1) dải chuẩn phải phủ hết dải cần đo (VD làm thiết bị 0–30 mà chọn chuẩn 0–15 là không đủ dải);
   * 2) độ KĐBĐ của chuẩn (quy về đơn vị thiết bị, tại điểm lớn nhất) phải nhỏ so với sai số cho phép (MPE) của thiết bị
   *    (VD chuẩn 0–1000 dùng cho thiết bị 0–30). Ngưỡng tỉ số U/MPE = settings.turMax (mặc định 1/3) – chỉ cảnh báo. */
  function stdU(s, unit, v) {
    if (s.kind === "p") { const f = C.factor(s.uncUnit && s.uncUnit !== "%" ? s.uncUnit : s.unit, unit); return (s.uncUnit === "%" ? (s.unc || 0) / 100 * Math.abs(v) : (s.unc || 0) * f) + (s.rdg || 0) / 100 * Math.abs(v); }
    return s.uncUnit === "%" ? (s.unc || 0) / 100 * Math.abs(v) : (s.unc || 0);
  }
  /* Lọc danh sách chọn chuẩn (NGOC 03/11/2026): chỉ hiện chuẩn phủ hết dải cần đo và có U/MPE ≤ settings.turMax (mặc định 1/3);
   * chuẩn không phù hợp bị loại khỏi danh sách cho tới khi nhập dải thiết bị khác phù hợp. Trả về null = phù hợp, hoặc lý do. */
  function fitStand(s, unit, lo, hi, mpe) {
    const f = s.kind === "p" ? C.factor(s.unit, unit) : 1; if (!isFinite(f)) return `không đổi được ${s.unit} → ${unit}`;
    const smin = s.min * f, smax = (s.kind === "e" && s.certRange ? s.certRange : s.max) * f, r = x => C.xround(x, 6);
    if (lo < smin - 1e-9 * Math.max(1, Math.abs(smin)) || hi > smax + 1e-9 * Math.max(1, Math.abs(smax))) return `dải ${r(smin)}÷${r(smax)} ${unit} không phủ ${r(lo)}÷${r(hi)}`;
    if (!(mpe > 0) || s.name === "Deadweight Tester" && !s.unc) return null;
    const U = stdU(s, unit, Math.max(Math.abs(lo), Math.abs(hi))), q = U / mpe, lim = Number(settings.turMax) || 1 / 3;
    return q > lim ? `U ≈ ${r(U)} ${unit} = ${(q * 100).toFixed(0)}% sai số cho phép ${r(mpe)} ${unit}` : null;
  }
  // Ngữ cảnh lọc cho từng ô chọn chuẩn: [đơn vị, dải thấp, dải cao, MPE] theo loại thiết bị; null = chưa đủ số liệu để lọc
  function standCtx(path) {
    const h = rec.h, T = rec.type, mn = num(h.min), mx = num(h.max), acc = num(h.acc), mpe = acc / 100 * (mx - mn);
    const okR = isFinite(mn) && isFinite(mx) && mx > mn && acc > 0;
    if (path === "h.stand1" && (T === "PT" || T === "PG" || T === "DPG")) return okR ? [h.unit, mn, mx, mpe] : null;
    if (path === "h.stand2" && T === "PT") return acc > 0 ? ["mA", 4, 20, acc / 100 * 16] : null;
    if (T === "PS") { const ps = num(h.pset), v = rec.ps.set.concat(rec.ps.reset).map(num).filter(isFinite).concat(isFinite(ps) ? [ps] : []);
      return v.length && acc > 0 && isFinite(ps) ? [h.unitPset, Math.min(...v), Math.max(...v), acc / 100 * Math.abs(ps)] : null; }
    if (T === "TS") { const ts = num(h.tset), v = rec.ts.set.concat(rec.ts.reset).map(num).filter(isFinite).concat(isFinite(ts) ? [ts] : []);
      return v.length && acc > 0 && isFinite(ts) ? ["°C", Math.min(...v), Math.max(...v), acc / 100 * Math.abs(ts)] : null; }
    if (!okR) return null;
    const s1 = standById(h.stand1), s2 = standById(h.stand2), split = mx > 150;
    if (path === "h.stand1") return ["°C", mn, split && s2 && s2 !== s1 ? Math.min(mx, 150) : mx, mpe];
    if (path === "h.stand2") return ["°C", split ? Math.max(mn, 150) : mn, mx, mpe];
    if (path === "h.stand3") {
      if (T === "TT") return ["mA", 4, 20, acc / 100 * 16];
      if (T === "RTD") { const sens = num(h.sens) || 0.385; return ["Ω", C2.pt100(mn).R, C2.pt100(mx).R, mpe * sens]; }
      if (T === "TC" && C2.ITS[h.tcType]) { const e1 = C2.tcEmf(h.tcType, mn), e2 = C2.tcEmf(h.tcType, mx); return ["mV", Math.min(e1, e2, 0), Math.max(e1, e2), mpe * C2.ITS[h.tcType].sens]; }
    }
    return null;
  }
  function suit(s, unit, lo, hi, mpe, lab, W) {
    if (!s || !isFinite(lo) || !isFinite(hi)) return;
    const f = s.kind === "p" ? C.factor(s.unit, unit) : 1; if (!isFinite(f)) return;
    const smin = s.min * f, smax = (s.kind === "e" && s.certRange ? s.certRange : s.max) * f, r = x => C.xround(x, 6);
    if (lo < smin - 1e-9 * Math.max(1, Math.abs(smin)) || hi > smax + 1e-9 * Math.max(1, Math.abs(smax)))
      W.push(`${lab} ${s.key}: dải chuẩn (${r(smin)}÷${r(smax)}) ${unit} KHÔNG ĐỦ để phủ dải cần đo (${r(lo)}÷${r(hi)}) ${unit} – chọn chuẩn dải lớn hơn`);
    if (!(mpe > 0) || s.name === "Deadweight Tester" && !s.unc) return;
    const U = stdU(s, unit, Math.max(Math.abs(lo), Math.abs(hi))), q = U / mpe, lim = Number(settings.turMax) || 1 / 3;
    if (q >= 1) W.push(`${lab} ${s.key}: U chuẩn ≈ ${r(U)} ${unit} ≥ sai số cho phép của thiết bị ${r(mpe)} ${unit} – chuẩn KHÔNG đủ chính xác, phải đổi chuẩn dải nhỏ / chính xác hơn`);
    else if (q > lim) W.push(`${lab} ${s.key}: U chuẩn ≈ ${r(U)} ${unit} = ${(q * 100).toFixed(0)}% sai số cho phép ${r(mpe)} ${unit} (vượt ngưỡng 1/${C.xround(1 / lim, 1)}) – nên chọn chuẩn dải nhỏ / chính xác hơn`);
  }
  // Temperature work with a low (≤150 °C) and a high standard: each covers its own part of the range
  function suitT(s1, s2, mn, mx, mpe, W) {
    if (s2 && s2 !== s1 && mx > 150) { suit(s1, "°C", mn, Math.min(mx, 150), mpe, "Chuẩn dải thấp", W); suit(s2, "°C", Math.max(mn, 150), mx, mpe, "Chuẩn dải trung/cao", W); }
    else suit(s1, "°C", mn, mx, mpe, "Chuẩn nhiệt", W);
  }
  function psHL(r) { const rising = r.h.dirQTG !== "Falling"; const S = r.ps.set.map(num), R = r.ps.reset.map(num); return rising ? { H: S, L: R } : { H: R, L: S }; }
  /* ---------- dải số GCN / QTG theo công trình (bảng phân dải của anh Khai, NGOC 10/11/2026) ----------
   * Mỗi công trình một dải đuôi số (GDC Phú Mỹ 2301–2500…); GCN và QTG cùng đuôi: CN.PT.26.2301 ↔ BB.PT.26.2301. Số tự chạy trong dải
   * (theo loại + năm), không vượt dải; số trùng bị chặn trên toàn hệ thống (máy chủ kiểm tra, kể cả hồ sơ người khác mình không xem được). */
  const RANGES = () => (settings.ranges || []).filter(g => g && g.id);
  function rangeOf(r = rec) {
    const h = r.h;
    if (h.locMode === "free") return RANGES().find(g => g.id === h.rangeId) || null;
    return h.location ? RANGES().find(g => (g.locs || []).includes(h.location)) || null : null;
  }
  function certPre(r = rec) { const S0 = settings[r.type], pg = r.type === "PG"; return `${S0.prefix}.${yy(r)}${pg ? S0.series || "" : ""}.`; }
  const tailOf = (no, pre) => { no = String(no || "").trim().toUpperCase(); return no.startsWith(pre.toUpperCase()) ? parseInt(no.slice(pre.length), 10) : NaN; };
  // NGOC 10/11/2026: mọi loại (PT, PS, TT…) dùng CHUNG dải, mỗi đuôi số chỉ cấp 1 lần/năm: PS đã dùng 2301 thì PT không được 2301.
  // Khoá so trùng: CN.<năm>.<đuôi> (bỏ mã loại, bỏ số 0 đầu). PG (N256…) giữ dãy riêng.
  const certKey = no => { const t = String(no || "").trim().toUpperCase(), m = t.match(/^CN\.[A-Z]+\.(\d{2})\.(\d+)$/); return m ? `CN.${m[1]}.${parseInt(m[2], 10)}` : t; };
  const poolPre = (r = rec) => r.type === "PG" ? certPre(r).toUpperCase() : `CN.${yy(r)}.`;
  const poolTail = (no, pool) => { const k = certKey(no); return k.startsWith(pool) ? parseInt(k.slice(pool.length), 10) : NaN; };
  let srvMax = {};                       // pool|lo|hi → số lớn nhất máy chủ đã cấp trong dải (không tính hồ sơ đang mở)
  function autoCertNo() {
    const pre = certPre(), pool = poolPre(), g = rangeOf(), pg = rec.type === "PG", lo = g ? g.lo : 1, hi = g ? g.hi : 99999;
    let max = lo - 1;
    records.forEach(r => { if (r.id !== rec.id && r.certNo) { const n = poolTail(r.certNo, pool); if (n >= lo && n <= hi && n > max) max = n; } });
    const k = `${pool}|${lo}|${hi}|${rec.id}`;
    if (srvMax[k] != null) max = Math.max(max, srvMax[k]);
    else if (A.cloud() && window.LabCloud) { srvMax[k] = null; LabCloud.certNext(pool, lo, hi, rec.id).then(v => { srvMax[k] = v || 0; if (rec.certAuto && rec.certNo && poolTail(rec.certNo, pool) <= v) { rec.certNo = autoCertNo(); const f = $("#f_certNo"); if (f) f.value = rec.certNo; persistCurrent(); } paintCert(); }).catch(() => { delete srvMax[k]; }); }
    return pre + String(max + 1).padStart(pg ? 5 : 4, "0");
  }
  // Kiểm tra số đang dùng: ngoài dải / trùng (trên máy này và trên máy chủ). Trả về danh sách lỗi chặn chuyển duyệt.
  function certIssues(r = rec) {
    const out = [], no = (r.certNo || "").trim(); if (!no || (r.summary && r.summary.pass === false)) return out;
    const pre = certPre(r), g = rangeOf(r), n = tailOf(no, pre);
    if (isNaN(n)) out.push(`Số ${no} không đúng dạng ${pre}xxxx (loại ${r.type}, năm 20${yy(r)})`);
    else if (g && (n < g.lo || n > g.hi)) out.push(`Số tem ${no} NGOÀI DẢI của ${g.name}: chỉ được ${pad4(g.lo)}–${pad4(g.hi)}`);
    if (!g) out.push(NORANGE + " – báo cấp 3 gắn dải ở Cài đặt › Dải số" + (r.h.locMode === "free" ? " (hoặc chọn ô Dải số)" : "") + "; vẫn được chuyển duyệt, chỉ kiểm trùng");
    const dl = records.find(x => x.id !== r.id && x.certNo && certKey(x.certNo) === certKey(no));
    if (dl) out.push(`Số ${no} đã dùng${dl.certNo.trim().toUpperCase() !== no.toUpperCase() ? ` (là ${dl.certNo})` : ""} cho ${dl.h.tag || "hồ sơ khác"} (${dl.owner ? dl.owner.name : "—"}) – ${STAGE[stage(dl)][1]}`);
    const sv = srvWho[no.toUpperCase() + "|" + r.id];
    if (!dl && sv) out.push(`Số ${no} đã có người dùng cho thiết bị ${sv.tag || "?"} (${sv.owner || "—"}) – ${sv.stage}`);
    return out;
  }
  const NORANGE = "Công trình này chưa có dải số";
  const pad4 = n => String(n).padStart(4, "0");
  let srvWho = {};
  function checkCertServer(r = rec) {
    const no = (r.certNo || "").trim(); if (!no || !A.cloud() || !window.LabCloud) return Promise.resolve(null);
    const k = no.toUpperCase() + "|" + r.id;
    return LabCloud.certWho(no, r.id).then(v => { if (v) srvWho[k] = v; else delete srvWho[k]; paintCert(); return v; }).catch(() => null);
  }
  function paintCert() {
    const el = document.getElementById("certchk"); if (!el) return;
    const g = rangeOf(), iss = certIssues();
    let fr = "";
    if (g && rec.type !== "PG") { const pool = poolPre(), used = usedTails(pool, rec.id), runs = freeRuns(g, used), nf = runs.reduce((t, [a, b]) => t + b - a + 1, 0);
      if (srvUsed[pool] == null) { srvUsed[pool] = []; loadUsed(pool, paintCert); }
      fr = ` · còn trống ${nf} số${runs.length ? ": " + esc(runs.slice(0, 3).map(runTxt).join(", ")) + (runs.length > 3 ? "…" : "") : ""}`; }
    el.innerHTML = (g ? `<span class="mut">Dải số ${esc(g.name)}: ${pad4(g.lo)}–${pad4(g.hi)}${fr} · QTG cùng số: ${esc((rec.certNo || "").replace(/^CN\./, "BB."))}</span>` : "")
      + iss.map(t => `<br><b class="bad">⚠ ${esc(t)}</b>`).join("");
  }
  function getPath(o, p) { return p.split(".").reduce((a, k) => a == null ? a : a[k], o); }
  function setPath(o, p, v) { const ks = p.split("."); const last = ks.pop(); const t = ks.reduce((a, k) => a[k], o); t[last] = v; }
  function isExpired(s, dateISO) { return !s || !s.due || (dateISO || todayISO()) > s.due; }
  // NGOC 06/11/2026: chuẩn hết hạn (tính đến ngày hiệu chuẩn) → không được duyệt, GCN luôn đóng dấu nháp, ẩn khỏi danh sách chọn
  function usedStands(r) { const h = r.h, T = r.type, s1 = standById(h.stand1), s2 = standById(h.stand2), s3 = standById(h.stand3);
    return (T === "PT" || T === "TG" ? [s1, s2] : ["TT", "RTD", "TC"].includes(T) ? [s1, s2, s3] : [s1]).filter(Boolean); }
  const expiredOn = (s, d) => !!(s && s.due && (d || todayISO()) > s.due);
  const expiredUsed = r => usedStands(r).filter(s => expiredOn(s, r.h.calDate));

  /* ---------- compute + validate ---------- */
  const curRec = () => rec;
  function compute(target) {
    const out = compute0(target), r = target || curRec(), ex = expiredUsed(r);
    // gom cảnh báo hết hạn cũ (có thể lặp 2 lần) thành 1 dòng rõ ràng cho mỗi chuẩn
    out.warns = out.warns.filter(w => !/hết hạn/.test(w));
    ex.forEach(s => out.warns.unshift(`Chuẩn ${s.key} (S/N ${s.serial}) HẾT HẠN ${s.due}, trước ngày hiệu chuẩn – không được duyệt, GCN đóng dấu BẢN NHÁP cho tới khi cập nhật GCN mới của chuẩn`));
    return out;
  }
  function compute0(target) {
    const rec = target || curRec();   // hồ sơ đang nhập, hoặc hồ sơ đã lưu (bảng kiểm tra QC)
    // Hồ sơ đã lưu (danh sách QC) vẫn tính được: lỗi số chữ số thập phân chỉ thành cảnh báo
    const h = rec.h, out = { errors: [], warns: [], res: null, strict: !target };
    if (NEWT.includes(rec.type)) return computeNew(rec, out);
    const s1 = standById(h.stand1), s2 = standById(h.stand2);
    if (!h.tag) out.errors.push("Chưa nhập Tag");
    if (!s1) out.errors.push("Chưa chọn chuẩn áp suất (Stand1)");
    if (settings.warnExpired && s1 && isExpired(s1, h.calDate)) out.warns.push(`Chuẩn ${s1.key} (S/N ${s1.serial}) hết hạn ${s1.due} – trước ngày hiệu chuẩn`);
    if (s1 && s1.due && h.calDate && s1.due < h.calDate) out.warns.push(`Chuẩn ${s1.key} hết hạn ${s1.due}, trước ngày hiệu chuẩn`);
    if (h.locMode !== "free" && !h.location) out.errors.push("Chưa chọn Công trình khí");
    else if (h.locMode !== "free" && !recLoc(rec).custVN) out.warns.push("Địa điểm này chưa có Cơ sở sử dụng trong danh mục – báo cấp 3 bổ sung");
    if (s1 && !isFinite(C.factor(s1.unit, rec.type === "PT" ? h.unit : h.unitPset))) out.errors.push(`Không đổi được đơn vị ${s1.unit} → ${rec.type === "PT" ? h.unit : h.unitPset}`);
    if (!rec.sig.inspector) out.warns.push("Chưa nhập Kiểm định viên");
    if (!rec.sig.controller) out.warns.push("Chưa nhập Người kiểm soát");
    try {
      if (rec.type === "PT") {
        if (!s2) out.errors.push("Chưa chọn chuẩn điện (Stand2)");
        if (settings.warnExpired && s2 && isExpired(s2, h.calDate)) out.warns.push(`Chuẩn ${s2.key} hết hạn ${s2.due} – trước ngày hiệu chuẩn`);
        const mn = num(h.min), mx = num(h.max), acc = num(h.acc);
        if (!(mx > mn)) out.errors.push("Phạm vi đo chưa hợp lệ (Max > Min)");
        if (!(acc > 0)) out.errors.push("Chưa nhập độ chính xác %FS");
        const P = rec.pt.points.map(num), R = rec.pt.rise.map(num), F = rec.pt.fall.map(num);
        if (P.some(isNaN)) out.errors.push("Thiếu áp suất chuẩn ở điểm đo");
        checkDec(s1, h.unit, rec.pt.points, "Áp suất chuẩn", out.strict ? out.errors : out.warns, out.warns);
        checkDec(s2, "mA", [rec.pt.rise, rec.pt.fall], "Số đọc mA", out.strict ? out.errors : out.warns, out.warns);
        if (R.some(isNaN)) out.errors.push("Thiếu số đọc chiều Tăng");
        if (F.some(isNaN)) out.errors.push("Thiếu số đọc chiều Giảm");
        if (s1 && mx > mn) { const f = C.factor(s1.unit, h.unit); if (Math.max(...P.filter(isFinite)) > s1.max * f * 1.0000001 || Math.min(...P.filter(isFinite)) < s1.min * f - 1e-9) out.warns.push("Điểm đo nằm ngoài phạm vi chuẩn Stand1"); }
        if (!/Transmitter$/.test(h.description)) out.warns.push("Mẫu PT chỉ áp dụng ngõ ra 4–20 mA (Transmitter)");
        if (s2 && s2.due && h.calDate && s2.due < h.calDate) out.warns.push(`Chuẩn điện ${s2.key} hết hạn ${s2.due}, trước ngày hiệu chuẩn`);
        if (!out.errors.length) out.res = C.calcPT({ fv: rec.fv, min: mn, max: mx, unit: h.unit, acc, points: P, rise: R, fall: F, stand1: { ...s1, deadweight: s1.name === "Deadweight Tester" }, stand2: s2 });
      } else {
        const pset = num(h.pset), acc = num(h.acc);
        if (!(pset > 0 || pset < 0)) out.errors.push("Chưa nhập Pset");
        if (!(acc > 0)) out.errors.push("Chưa nhập độ chính xác % Pset");
        const { H, L } = psHL(rec);
        if (rec.ps.set.map(num).some(isNaN)) out.errors.push("Thiếu Áp suất tác động (Set-Pressure)");
        if (rec.ps.reset.map(num).some(isNaN)) out.errors.push("Thiếu Áp suất trả về (Reset-Pressure)");
        checkDec(s1, h.unitPset, [rec.ps.set, rec.ps.reset], "Áp suất chuẩn (Set/Reset)", out.strict ? out.errors : out.warns, out.warns);
        if (!out.errors.length) {
          out.res = C.calcPS({ fv: rec.fv, pset, unitPset: h.unitPset, acc, high: H, low: L, stand1: { ...s1, deadweight: s1.name === "Deadweight Tester" }, resolution: num(h.resolution) || 0 });
          if (h.dirQTG && h.dirQTG !== out.res.dir) out.warns.push(`QTG đánh dấu ${h.dirQTG} nhưng số liệu cho thấy công tắc tác động chiều ${out.res.dir} (sheet DLVN133 ô E9 tự chọn theo độ lệch nhỏ hơn) – kiểm tra lại cột Set/Reset`);
        }
      }
    } catch (e) { out.errors.push("Lỗi tính: " + e.message); }
    {
      const mn = num(h.min), mx = num(h.max), acc = num(h.acc);
      if (rec.type === "PT") { suit(s1, h.unit, mn, mx, acc / 100 * (mx - mn), "Chuẩn áp suất", out.warns); suit(s2, "mA", 4, 20, acc / 100 * 16, "Chuẩn điện", out.warns); }
      else { const ps = num(h.pset), vals = rec.ps.set.concat(rec.ps.reset).map(num).filter(isFinite).concat(isFinite(ps) ? [ps] : []);
        if (vals.length) suit(s1, h.unitPset, Math.min(...vals), Math.max(...vals), acc / 100 * Math.abs(ps), "Chuẩn áp suất", out.warns); }
    }
    if (out.res && !out.res.pass) out.warns.push("Không đạt: không cấp số chứng chỉ / số tem và không xuất chứng chỉ (quy tắc 30/10/2026)");
    return out;
  }

  // PG / TS / TT / RTD – formulas in calc2.js
  function computeNew(rec, out) {
    const h = rec.h, T = rec.type, E = out.errors, W = out.warns, ED = out.strict ? E : W;
    const s1 = standById(h.stand1), s2 = standById(h.stand2), s3 = standById(h.stand3);
    const mn = num(h.min), mx = num(h.max), acc = num(h.acc);
    const need = (s, lab) => { if (!s) E.push(`Chưa chọn ${lab}`); else if (s.due && h.calDate && s.due < h.calDate) W.push(`Chuẩn ${s.key} hết hạn ${s.due}, trước ngày hiệu chuẩn`); };
    const nums = (a, lab) => { const v = a.map(num); if (v.some(isNaN)) E.push(`Thiếu ${lab}`); return v; };
    if (!h.tag) E.push("Chưa nhập Tag");
    if (h.locMode !== "free" && !h.location) E.push("Chưa chọn Công trình khí");
    else if (h.locMode !== "free" && !recLoc(rec).custVN) W.push("Địa điểm này chưa có Cơ sở sử dụng trong danh mục – báo cấp 3 bổ sung");
    if (!rec.sig.inspector) W.push("Chưa nhập Kiểm định viên");
    if (!rec.sig.controller) W.push("Chưa nhập Người kiểm soát");
    if (!(acc > 0)) E.push(T === "TS" ? "Chưa nhập độ chính xác % Tset" : "Chưa nhập độ chính xác %FS");
    if (T !== "TS" && !(mx > mn)) E.push("Phạm vi đo chưa hợp lệ (Max > Min)");
    try {
      if (T === "PG") {
        need(s1, "chuẩn áp suất (Stand1)");
        if (s1 && !isFinite(C.factor(s1.unit, h.unit))) E.push(`Không đổi được đơn vị ${s1.unit} → ${h.unit}`);
        const std = nums(rec.pg.std, "áp suất chuẩn"), rise = nums(rec.pg.rise, "số đọc chiều Tăng"), fall = nums(rec.pg.fall, "số đọc chiều Giảm");
        if (!(num(h.scale) > 0)) W.push("Chưa nhập vạch chia (in trên GCN và QTG)");
        checkDec(s1, h.unit, rec.pg.std, "Áp suất chuẩn", ED, W);
        if (s1 && mx > mn && isFinite(C.factor(s1.unit, h.unit))) { const f = C.factor(s1.unit, h.unit); if (Math.max(...std.filter(isFinite)) > s1.max * f * 1.0000001) W.push("Điểm đo vượt phạm vi chuẩn Stand1"); }
        if (!E.length) {
          out.res = C2.calcPG({ fv: rec.fv, min: mn, max: mx, acc, std, rise, fall, before: rec.pg.before, after: rec.pg.after });
          if (out.res.red && !out.res.red.ok) W.push("Độ sụt áp của chuẩn ≥ 5%");
          if (h.errFactor === "1.0") W.push("QTG tick hệ số sai số 1.0 nhưng Data08 không dùng hệ số này khi kết luận");
        }
      } else if (T === "TS") {
        need(s1, "nhiệt kế chuẩn / thiết bị tạo nhiệt (Stand1)");
        const tset = num(h.tset); if (isNaN(tset)) E.push("Chưa nhập nhiệt độ đặt Tset");
        const set = nums(rec.ts.set, "nhiệt độ tác động (Set)"), reset = nums(rec.ts.reset, "nhiệt độ trả về (Reset)");
        checkDec(s1, "°C", [rec.ts.set, rec.ts.reset], "Nhiệt độ chuẩn", ED, W);
        if (!E.length) out.res = C2.calcTS({ fv: rec.fv, res: num(h.res) || 0, tset, acc, dir: h.dirQTG, set, reset, stand: { unc: s1.unc }, heat: s1 });
      } else if (T === "TT") {
        need(s1, "chuẩn nhiệt dải thấp (Stand1)"); need(s3, "ampe kế (Stand3)"); if (s2) need(s2, "");
        const flat = k => rec.tt[k].flat();
        nums(flat("sr"), "số đọc chuẩn chiều tăng"); nums(flat("sf"), "số đọc chuẩn chiều giảm"); nums(flat("dr"), "số đọc DUT chiều tăng"); nums(flat("df"), "số đọc DUT chiều giảm");
        [s1, s2].forEach(s => checkDec(s, "°C", [flat("sr"), flat("sf")], "Nhiệt độ chuẩn", ED, W));
        checkDec(s3, "mA", [flat("dr"), flat("df")], "Số đọc mA (ampe kế)", ED, W);
        if (!E.length) {
          const pts = rec.tt.sr.map((_, p) => ({ sr: rec.tt.sr[p].map(num), sf: rec.tt.sf[p].map(num), dr: rec.tt.dr[p].map(num), df: rec.tt.df[p].map(num) }));
          out.res = C2.calcTT({ fv: rec.fv, min: mn, max: mx, acc, pts, s1, s2: s2 || s1, amm: { unc: s3.unc, uncUnit: s3.uncUnit, min: s3.min, max: s3.max, err: s3.err || 0 }, res: num(h.res) || 0 });
          if ((out.res.nM || out.res.nH) && !s2) W.push("Có điểm > 150 °C nhưng chưa chọn chuẩn dải trung/cao (Stand2) – đang dùng Stand1");
          if (!out.res.pass) W.push("Không đạt: không cấp số chứng chỉ / số tem và không xuất chứng chỉ (quy tắc 30/10/2026)");
          if (out.res.lowSingle) W.push("Dải thấp chỉ có 1 điểm: chứng chỉ không in dòng U dải thấp (như Data188)");
        }
      } else if (T === "TG") {
        need(s1, "chuẩn nhiệt dải thấp ≤150 °C (Stand1)"); if (s2) need(s2, "");
        const flat = k => rec.tg[k].flat();
        nums(flat("sr"), "số đọc chuẩn chiều tăng"); nums(flat("sf"), "số đọc chuẩn chiều giảm"); nums(flat("dr"), "số đọc đồng hồ chiều tăng"); nums(flat("df"), "số đọc đồng hồ chiều giảm");
        if (!(num(h.res) > 0)) E.push("Chưa nhập độ chia nhỏ nhất (Division) – dùng tính ubk3");
        [s1, s2].forEach(s => checkDec(s, "°C", [flat("sr"), flat("sf")], "Nhiệt độ chuẩn", ED, W));
        if (!E.length) {
          const pts = rec.tg.sr.map((_, p) => ({ sr: rec.tg.sr[p].map(num), sf: rec.tg.sf[p].map(num), dr: rec.tg.dr[p].map(num), df: rec.tg.df[p].map(num) }));
          out.res = C2.calcTG({ fv: rec.fv, min: mn, max: mx, acc, res: num(h.res), analog: h.indType !== "Digital", pts, s1, s2: s2 || s1 });
          if ((out.res.nM || out.res.nH) && !s2) W.push("Có điểm > 150 °C nhưng chưa chọn chuẩn dải trung/cao (Stand2) – đang dùng Stand1");
          if (out.res.lowSingle) W.push("Dải thấp chỉ có 1 điểm: chứng chỉ không in dòng U dải thấp (như Data138)");
          if (!out.res.pass) W.push("Không đạt: max(U, |SHC|) vượt sai số cho phép (Data138!EG)");
        }
      } else if (T === "RTD") {
        need(s1, "chuẩn nhiệt dải thấp (Stand1)"); need(s3, "thiết bị đo điện trở (Stand3)"); if (s2) need(s2, "");
        const std = nums(rec.rtd.std, "nhiệt độ chuẩn"); nums(rec.rtd.dut.flat(), "số đọc điện trở");
        [s1, s2].forEach(s => checkDec(s, "°C", rec.rtd.std, "Nhiệt độ chuẩn", ED, W));
        checkDec(s3, "Ω", rec.rtd.dut, "Số đọc điện trở", ED, W);
        const sens = num(h.sens) || 0.385;
        if (!E.length) {
          out.res = C2.calcRTD({ fv: rec.fv, min: mn, max: mx, acc, sens, pts: std.map((t, i) => ({ std: t, dut: rec.rtd.dut[i].map(num) })), s1, s2: s2 || s1, meter: { unc: s3.unc, uncUnit: s3.uncUnit, max: s3.max, err: s3.err || 0 } });
          if (mx >= 140 && !s2) W.push("Max ≥ 140 °C nhưng chưa chọn chuẩn dải cao (Stand2) – đang dùng Stand1");
          if (out.res.rows.some(r => r.refSrc === "iec")) W.push("Có điểm không có trong Bảng giá trị chuẩn của file – dùng IEC 60751");
        }
      } else if (T === "TC") {
        need(s1, "chuẩn nhiệt / lò dải thấp (Stand1)"); need(s3, "milivôn kế (Stand3)"); if (s2) need(s2, "");
        if (!C2.ITS[h.tcType]) E.push("Chỉ tính được cặp nhiệt loại J hoặc K (bảng ITS-90 trong file)");
        const flat = k => rec.tc[k].flat();
        nums(flat("std"), "số đọc nhiệt độ chuẩn"); nums(flat("dut"), "số đọc mV của cặp nhiệt");
        [s1, s2].forEach(s => checkDec(s, "°C", rec.tc.std, "Nhiệt độ chuẩn", ED, W));
        checkDec(s3, "mV", rec.tc.dut, "Số đọc mV", ED, W);
        if (s3 && s3.kind !== "v") E.push("Stand3 phải là milivôn kế (loại mV)");
        if (!E.length) {
          const hi = s2 || s1, mvRes = parseFloat(String(s3.res).replace(",", ".")) || 0.001;
          out.res = C2.calcTC({ fv: rec.fv, type: h.tcType, min: mn, max: mx, acc, pts: rec.tc.std.map((a, i) => ({ std: a.map(num), dut: rec.tc.dut[i].map(num) })),
            s1, s2: hi, h1: s1, h2: hi, mv: { unc: s3.uncUnit === "%" ? s3.unc : 0 }, uCJ: Number(settings.TC.uCJ) || 0, mvRes });
          if (mx >= 155 && !s2) W.push("Max ≥ 155 °C nhưng chưa chọn chuẩn dải cao (Stand2) – uch1 đang dùng Stand1");
          if (h.tcType !== "J") W.push("Cặp nhiệt loại K: chưa có hồ sơ mẫu để đối chiếu (66 hồ sơ GPP 2026 đều loại J)");
          if (s3.uncUnit !== "%") W.push("U của milivôn kế phải nhập theo % (như file TC) – đang tính ubk1 = 0");
          if (!out.res.pass) W.push("Không đạt: U + max|Δt| vượt sai số cho phép (Data161!HE)");
        }
      } else if (T === "DPG") {
        need(s1, "chuẩn áp suất (Stand1)");
        if (s1 && !isFinite(C.factor(s1.unit, h.unit))) E.push(`Không đổi được đơn vị ${s1.unit} → ${h.unit}`);
        const std = nums(rec.dpg.std, "áp suất chuẩn"), rise = nums(rec.dpg.rise, "số đọc chiều Tăng"), fall = nums(rec.dpg.fall, "số đọc chiều Giảm");
        if (!(num(h.res) > 0)) W.push("Chưa nhập độ chia nhỏ nhất (uv = 0)");
        checkDec(s1, h.unit, rec.dpg.std, "Áp suất chuẩn", ED, W);
        if (!E.length) {
          out.res = C2.calcDPG({ fv: rec.fv, min: mn, max: mx, unit: h.unit, acc, res: num(h.res) || 0, stand1: { ...s1, deadweight: s1.name === "Deadweight Tester" }, std, rise, fall });
          const b = num(rec.dpg.before), a = num(rec.dpg.after);
          if (isFinite(b) && isFinite(a) && b !== 0) { const d = b - a, pct = d / b * 100; out.res.red = { d, pct, ok: Math.abs(pct) < 5 }; if (Math.abs(pct) >= 5) W.push("Độ sụt áp của chuẩn ≥ 5%"); }
          if (!out.res.pass) W.push("Không đạt: U + max|SHC| vượt sai số cho phép (Data76!HX)");
        }
      }
      const mpe = acc / 100 * (mx - mn);
      if (T === "PG" || T === "DPG") suit(s1, h.unit, mn, mx, mpe, "Chuẩn áp suất", W);
      if (T === "TC" && C2.ITS[h.tcType] && mx > mn) { suitT(s1, s2, mn, mx, mpe, W); const e1 = C2.tcEmf(h.tcType, mn), e2 = C2.tcEmf(h.tcType, mx); suit(s3, "mV", Math.min(e1, e2, 0), Math.max(e1, e2), mpe * C2.ITS[h.tcType].sens, "Milivôn kế", W); }
      if (T === "TS") { const ts = num(h.tset), v = rec.ts.set.concat(rec.ts.reset).map(num).filter(isFinite).concat(isFinite(ts) ? [ts] : []); if (v.length) suit(s1, "°C", Math.min(...v), Math.max(...v), acc / 100 * Math.abs(ts), "Chuẩn nhiệt", W); }
      if (T === "TT") { suitT(s1, s2, mn, mx, mpe, W); suit(s3, "mA", 4, 20, acc / 100 * 16, "Ampe kế", W); }
      if (T === "TG") suitT(s1, s2, mn, mx, mpe, W);
      if (T === "RTD") { suitT(s1, s2, mn, mx, mpe, W); const sens = num(h.sens) || 0.385; suit(s3, "Ω", C2.pt100(mn).R, C2.pt100(mx).R, mpe * sens, "Thiết bị đo điện trở", W); }
    } catch (e) { E.push("Lỗi tính: " + e.message); }
    return out;
  }
  // Rule 30/10/2026 §4 (PT/PS/TT): a failed instrument gets no certificate number and no certificate, not even a draft
  const NOCERT = ["PT", "PS", "TT"];
  const failed = c => NOCERT.includes(rec.type) && c.res && !c.res.pass;
  function syncCertNo(c) {
    if (!rec.certAuto && !failed(c)) return;
    if (failed(c)) { rec.certNo = ""; rec.certAuto = true; } else if (!rec.certNo) rec.certNo = autoCertNo();
    const f = $("#f_certNo"); if (f) { f.value = rec.certNo; f.placeholder = failed(c) ? "Không đạt – không cấp số" : autoCertNo(); }
  }
  function summaryU(type, r) {
    if (!r) return "";
    return type === "PT" ? D.uTxt("PT", r.Umax) : type === "PS" ? r.Utext.text : type === "PG" ? "—" : type === "TS" ? D.uV(r, r.U, D.vn(r.Uprint, 2)) : type === "TT" ? D.uTxt("TT", r.Umax) : type === "TG" ? D.uV(r, r.Umax, D.vn(C.xround(r.Umax, 2), 2)) : type === "TC" || type === "DPG" ? r.Utext.replace(".", ",") : D.uV(r, r.U, D.vn(r.U, 2));
  }

  /* ---------- Danh sách thiết bị theo công trình ("bệnh án") – yêu cầu NGOC 06/11/2026 ----------
     Nguồn: devices.js (Phụ lục kế hoạch KĐ/HC 2026 các công trình). Gõ Tag → gợi ý theo chữ đầu như Excel → chọn → tự điền.
     Cấp 1–3 đều sửa tay được các ô đã điền (thiết bị có thể đã thay). Hồ sơ đã lưu cùng công trình + tag mới hơn danh sách gốc → điền theo hồ sơ. */
  const DEVS = (() => {
    const D = window.LabDevices || { f: [], rows: [] };
    return D.rows.map((r, i) => { const o = { i }; D.f.forEach((k, j) => o[k] = r[j] == null ? "" : String(r[j])); o.key = tagKey(o.t); return o; });
  })();
  function tagKey(t) { return String(t || "").toUpperCase().replace(/[\s\-_./]/g, ""); }
  const siteName = code => { const l = SEED.locations.find(x => x[0] === code); return l ? (SEED.locations.filter(x => x[1] === l[1]).length > 1 ? `${l[1]} (${code})` : l[1]) : `${code} (chưa có trong danh mục Công trình)`; };
  const devRange = d => d.mn !== "" || d.mx !== "" ? `${d.mn}÷${d.mx} ${d.u}` : (d.ps ? `Set ${d.ps} ${d.pu || d.u}` : "");
  // Hồ sơ đã lưu gần nhất của 1 thiết bị (cùng công trình + tag)
  const devRecs = d => records.filter(r => r.h.location === d.s && tagKey(r.h.tag) === d.key).sort((a, b) => (b.h.calDate || "").localeCompare(a.h.calDate || "") || (b.updated || "").localeCompare(a.updated || ""));
  /* ---------- Gói thiết bị theo tháng đến hạn (NGOC 12/11/2026): app tự chia thiết bị của công trình theo "Ngày KĐHC tiếp theo"
     trong danh sách thiết bị (không có thì lấy ngày KĐHC + 12 tháng). Chọn gói → Tag chỉ gợi ý trong gói, hồ sơ đã lưu có ngày
     hiệu chuẩn sau lần KĐHC trong danh sách thì có ✓ xanh, bấm "Thiết bị tiếp theo" để đi tiếp. ---------- */
  const dueMon = d => d.du ? d.du.slice(0, 7) : /^\d{4}-\d{2}/.test(d.cd || "") ? (Number(d.cd.slice(0, 4)) + 1) + d.cd.slice(4, 7) : "";
  const packCache = {};
  function sitePacks(site) {
    if (packCache[site]) return packCache[site];
    const m = new Map();
    DEVS.forEach(d => { if (d.s !== site) return; const k = dueMon(d); if (!k) return; if (!m.has(k)) m.set(k, []); m.get(k).push(d); });
    return (packCache[site] = [...m.keys()].sort().map(k => ({ id: site + "|" + k, site, name: `Tháng ${Number(k.slice(5))}/${k.slice(0, 4)}`, devs: m.get(k) })));
  }
  let curPackId = store.get("curPack", "");
  const packDevs = p => p.devs;
  const curPack = () => rec.h.locMode === "free" ? null : sitePacks(rec.h.location).find(p => p.id === curPackId) || null;
  // Đã làm = có hồ sơ (chưa xoá) cùng công trình + tag với ngày hiệu chuẩn sau ngày KĐHC gần nhất trong danh sách
  function packDoneSet(p) {
    const last = {};
    records.forEach(r => { if (r.deleted || r.h.location !== p.site || !r.h.calDate) return; const k = tagKey(r.h.tag); if (!(k in last) || r.h.calDate > last[k]) last[k] = r.h.calDate; });
    return new Set(p.devs.filter(d => d.key in last && last[d.key] > (d.cd || "")).map(d => d.key));
  }
  // Hồ sơ đang mở có tag mà chưa lưu (hoặc đã sửa sau lần lưu cuối)?
  function unsavedRec() { if (!rec.h.tag) return false; const s = records.find(r => r.id === rec.id); return !s || JSON.stringify(s) !== JSON.stringify(rec); }
  function packPanel() {
    const h = rec.h; if (h.locMode === "free") return "";
    const list = sitePacks(h.location); if (!list.length) return "";
    const p = curPack();
    const opts = `<option value="">— chọn gói đến hạn (hoặc gõ tag tự do) —</option>` + list.map(x => `<option value="${esc(x.id)}"${p && p.id === x.id ? " selected" : ""}>${esc(x.name)} – ${x.devs.length} thiết bị</option>`).join("");
    let body = "";
    if (p) {
      const ds = p.devs, dn = packDoneSet(p), done = ds.filter(d => dn.has(d.key)).length, ck = tagKey(h.tag);
      body = `<div class="pkbar"><b>${done}/${ds.length}</b> đã lưu hồ sơ<span class="pkprog"><i style="width:${ds.length ? done / ds.length * 100 : 0}%"></i></span></div>
        <div class="pkchips">${ds.map(d => `<button type="button" class="pkc${dn.has(d.key) ? " ok" : ""}${d.key === ck ? " cur" : ""}" data-pkt="${d.i}">${dn.has(d.key) ? "✓ " : ""}${esc(d.t)}</button>`).join("")}</div>
        <div class="btns"><button type="button" class="btn pri" data-pknext="1">▶ Thiết bị tiếp theo</button></div>`;
    }
    return `<div class="f wide pk" id="pkpanel"><span>Gói thiết bị đến hạn (theo danh sách thiết bị)</span><select data-pk="sel">${opts}</select>${body}</div>`;
  }
  function openPackDevice(d) {
    if (unsavedRec() && !confirm(`Hồ sơ ${rec.h.tag} CHƯA LƯU.\nBấm OK để bỏ hồ sơ này và sang ${d.t}; bấm Hủy để quay lại lưu.`)) return;
    const o = rec;
    rec = newRecord(d.T);
    Object.assign(rec.h, { location: o.h.location, cust: o.h.cust, locMode: o.h.locMode, calDate: o.h.calDate, issueDate: o.h.issueDate });
    rec.sig.controller = (o.sig || {}).controller || ""; rec.certNo = autoCertNo();
    applyDevice(d, { force: true }); window.scrollTo(0, 0);
  }
  function packNext() {
    const p = curPack(); if (!p) return;
    const ds = packDevs(p), dn = packDoneSet(p), ck = tagKey(rec.h.tag), at = ds.findIndex(d => d.key === ck);
    const order = ds.slice(at + 1).concat(ds.slice(0, at + 1)), nx = order.find(d => !dn.has(d.key) && d.key !== ck) || order.find(d => !dn.has(d.key));
    if (!nx) { toast("Đã làm xong cả gói 🎉"); return; }
    openPackDevice(nx);
  }
  // Ý 4: nhớ chuẩn đã chọn lần trước theo loại thiết bị, tự điền khi chọn thiết bị mới (chỉ khi chuẩn còn hạn và phù hợp dải đo)
  const lastStd = () => store.get("lastStd", {}) || {};
  function rememberStd(p, v) { if (!v) return; const o = lastStd(); (o[rec.type] = o[rec.type] || {})[p.slice(2)] = v; store.set("lastStd", o); }
  function applyLastStd() {
    const m = lastStd()[rec.type]; if (!m) return; const got = [];
    ["stand1", "stand2", "stand3"].forEach(k => {
      try {
        const s = m[k] && standById(m[k]); if (!s || expiredOn(s, rec.h.calDate)) return;
        if (rec.h[k] && !(rec.type === "PT" && k === "stand2")) return;
        const c = standCtx("h." + k); if (c && fitStand(s, c[0], c[1], c[2], c[3])) return;
        if (rec.h[k] !== m[k]) { rec.h[k] = m[k]; got.push(k); }
      } catch (e) { /* bỏ qua */ }
    });
    return got.length;
  }
  function suggestTags(q, site) {
    const k = tagKey(q); if (!k) return [];
    const cp = curPack(), pool = cp ? packDevs(cp) : DEVS;
    const hasSite = site && DEVS.some(d => d.s === site);
    const score = d => (d.key.startsWith(k) ? 0 : 2) + (hasSite && d.s !== site ? 1 : 0) + (d.T === rec.type ? 0 : 0.5);
    return pool.filter(d => d.key.includes(k)).map(d => [score(d), d]).sort((a, b) => a[0] - b[0] || a[1].t.localeCompare(b[1].t, "en", { numeric: true })).slice(0, 12).map(x => x[1]);
  }
  let sugList = [], sugIdx = -1;
  function showSuggest(inp) {
    hideSuggest();
    const h = rec.h, site = h.locMode !== "free" ? h.location : "";
    sugList = suggestTags(inp.value, site); sugIdx = -1;
    if (!sugList.length) return;
    const multi = new Set(sugList.map(d => d.s)).size > 1 || !DEVS.some(d => d.s === site);
    const box = document.createElement("div"); box.id = "tagsug"; box.className = "sug"; box.setAttribute("role", "listbox");
    box.innerHTML = sugList.map((d, i) => `<div class="sugi" data-sug="${i}" role="option"><b>${esc(d.t)}</b> <span class="tag">${d.T}</span>${d.T !== rec.type ? ` <small class="warn">khác loại</small>` : ""}
      <small class="mut">${esc([d.mk, d.md, d.sn && "S/N " + d.sn, devRange(d)].filter(Boolean).join(" · "))}</small>${multi || d.s !== site ? `<small class="sugs">${esc(siteName(d.s))}</small>` : ""}</div>`).join("");
    inp.closest("label").appendChild(box);
    const r = box.getBoundingClientRect(), lim = innerHeight - 80, top = inp.getBoundingClientRect().top - 70;   // điện thoại: kéo lên cho thấy gợi ý
    if (r.bottom > lim && top > 0) window.scrollBy(0, Math.min(r.bottom - lim, top));
  }
  function hideSuggest() { const b = $("#tagsug"); if (b) b.remove(); sugList = []; sugIdx = -1; }
  function moveSuggest(dx) {
    const its = $$("#tagsug .sugi"); if (!its.length) return;
    sugIdx = (sugIdx + dx + its.length) % its.length; its.forEach((x, i) => x.classList.toggle("on", i === sugIdx)); its[sugIdx].scrollIntoView({ block: "nearest" });
  }
  // Điền "bệnh án" thiết bị vào hồ sơ đang mở
  function applyDevice(d, opt = {}) {
    if (!canEdit()) { toast(`Hồ sơ của ${rec.owner.name}: cấp 1 chỉ sửa hồ sơ mình tạo`); return; }
    if (d.T !== rec.type) {
      if (rec.saved && !opt.force) { toast(`${d.t} là ${d.T}, hồ sơ đang mở là ${rec.type} – tạo hồ sơ ${d.T} mới để dùng thiết bị này`); return; }
      const keep = { calDate: rec.h.calDate, issueDate: rec.h.issueDate };
      rec = newRecord(d.T); Object.assign(rec.h, keep);
    }
    const h = rec.h, T = rec.type, last = devRecs(d)[0];
    const inCat = SEED.locations.some(x => x[0] === d.s);
    let msg = [];
    if (inCat && (h.locMode === "free" || h.location !== d.s)) { h.locMode = "list"; h.location = d.s; h.cust = CUSTS.keyOf(d.s); msg.push(`công trình → ${siteName(d.s)}`); }
    if (!inCat) msg.push(`công trình "${d.s}" chưa có trong danh mục – chọn tay`);
    h.tag = d.t;
    if (last) {   // hồ sơ đã lưu mới nhất của thiết bị này: lấy thông số đã được người dùng sửa / xác nhận
      ["description", "model", "serial", "maker", "makerSel", "mfgYear", "acc", "min", "max", "unit", "pset", "unitPset", "tset", "tcType", "scale", "res", "typeEN", "sens", "indType", "micro", "dirQTG"].forEach(k => { if (last.h[k] !== undefined && last.type === T) h[k] = last.h[k]; });
      msg.unshift(`theo hồ sơ ${last.certNo || ""} ngày ${last.h.calDate || "?"}`);
    } else {
      if (T === "PT") h.description = /Differential/i.test(d.d) ? "Differential Pressure Transmitter" : "Pressure Transmitter";
      else if (T === "PS") h.description = /Differential/i.test(d.d) ? "Differential Pressure Switch" : "Pressure Switch";
      h.model = d.md; h.serial = d.sn;
      const mk = makersFor(T).find(m => m.toLowerCase() === d.mk.toLowerCase());
      h.maker = mk || d.mk; h.makerSel = mk || (d.mk ? OTHER : "");
      if (d.a !== "") h.acc = d.a;
      h.min = d.mn; h.max = d.mx;
      if (!TEMP.includes(T) && PUNITS.includes(d.u)) h.unit = d.u;
      if (T === "PS") { h.pset = d.ps; const pu = PUNITS.includes(d.pu) ? d.pu : PUNITS.includes(d.u) ? d.u : ""; if (pu) h.unitPset = pu; }
      if (T === "TS") h.tset = d.ps;
      msg.unshift("theo danh sách thiết bị");
    }
    if (applyLastStd()) msg.push("chuẩn như lần trước");
    if (rec.certAuto) rec.certNo = autoCertNo();
    if (rec.ptAuto) genPoints();
    touched(); hideSuggest(); renderEntry(); persistCurrent();
    toast(`Đã điền ${d.t} ${msg.join(", ")}. Sửa tay nếu thiết bị đã thay.`);
  }
  let devQ = { site: "", type: "", q: "", n: 150 };
  function renderDevices() {
    const el = $("#v-devices");
    const sites = [...new Set(DEVS.map(d => d.s))];
    const cnt = s => DEVS.filter(d => d.s === s).length;
    const types = [...new Set(DEVS.map(d => d.T))];
    el.innerHTML = `<div class="card"><h2>Danh sách thiết bị theo công trình <small>(${DEVS.length} thiết bị · ${sites.length} công trình)</small></h2>
      <p class="hint">Nguồn: ${esc((window.LabDevices || {}).note || "—")}. Bấm <b>Nhập hồ sơ</b> để mở hồ sơ mới đã điền sẵn thông số; mọi ô vẫn sửa tay được.</p>
      <div class="grid">
        <label class="f"><span>Công trình</span><select id="dvS"><option value="">Tất cả công trình</option>${sites.map(s => `<option value="${esc(s)}"${devQ.site === s ? " selected" : ""}>${esc(siteName(s))} (${cnt(s)})</option>`).join("")}</select></label>
        <label class="f"><span>Loại</span><select id="dvT"><option value="">Tất cả loại</option>${types.map(t => `<option${devQ.type === t ? " selected" : ""}>${t}</option>`).join("")}</select></label>
        <label class="f wide"><span>Tìm</span><input id="dvQ" value="${esc(devQ.q)}" placeholder="Tag, serial, model, hãng, khu vực…" autocomplete="off"></label>
      </div><div id="dvL"></div></div>`;
    $("#dvS").onchange = e => { devQ.site = e.target.value; devQ.n = 150; devList(); };
    $("#dvT").onchange = e => { devQ.type = e.target.value; devQ.n = 150; devList(); };
    $("#dvQ").oninput = e => { devQ.q = e.target.value; devQ.n = 150; devList(); };
    devList();
  }
  function devList() {
    const q = devQ.q.toLowerCase().trim(), k = tagKey(devQ.q);
    const L = DEVS.filter(d => (!devQ.site || d.s === devQ.site) && (!devQ.type || d.T === devQ.type) && (!q || d.key.includes(k) || [d.sn, d.md, d.mk, d.ar, d.d].join(" ").toLowerCase().includes(q)));
    const G = new Map(); L.slice(0, devQ.n).forEach(d => { if (!G.has(d.s)) G.set(d.s, []); G.get(d.s).push(d); });
    const row = d => { const r = devRecs(d)[0];
      const prev = r ? `Hồ sơ app: <b>${esc(r.certNo || "—")}</b> ${esc(r.h.calDate || "")}${r.summary ? ` <span class="${r.summary.pass ? "ok" : "bad"}">${r.summary.pass ? "Đạt" : "Không đạt"}</span>` : ""}`
        : d.c || d.cd ? `GCN trước: ${esc([d.c, d.cd && "ngày " + d.cd, d.du && "hạn " + d.du, d.r].filter(Boolean).join(" · "))}` : "";
      return `<div class="rec dv"><div><b>${esc(d.t)}</b> <span class="tag">${d.T}</span> <small class="mut">${esc(d.d)}</small><br>
        <small>${esc([d.mk, d.md, d.sn && "S/N " + d.sn, devRange(d), d.a && "±" + d.a + "%"].filter(Boolean).join(" · ") || "—")}</small>
        ${d.ar || d.n ? `<br><small class="mut">${esc([d.ar && "Khu vực: " + d.ar, d.n].filter(Boolean).join(" · "))}</small>` : ""}
        ${prev ? `<br><small class="mut">${prev}</small>` : ""}</div>
        <div class="ra"><button class="btn sm" data-dv="${d.i}">Nhập hồ sơ</button></div></div>`; };
    $("#dvL").innerHTML = (L.length ? [...G].map(([s, a]) => `<h3 class="dvh">${esc(siteName(s))} <small class="mut">(${L.filter(d => d.s === s).length})</small></h3>${a.map(row).join("")}`).join("") : `<p class="mut">Không có thiết bị khớp.</p>`)
      + (L.length > devQ.n ? `<div class="btns"><button class="btn" data-dvmore="1">Hiện thêm (${L.length - devQ.n} thiết bị còn lại)</button></div>` : "");
  }
  function onDevicesClick(e) {
    const b = e.target.closest("button"); if (!b) return;
    if (b.dataset.dvmore) { devQ.n += 300; devList(); return; }
    if (b.dataset.dv == null) return;
    const d = DEVS[Number(b.dataset.dv)]; if (!d) return;
    rec = newRecord(d.T); go("entry"); applyDevice(d);
  }

  /* ---------- render: entry ---------- */
  const TYPES = [["PT", "PT / DPT", "Transmitter áp suất"], ["PS", "PS / DPS", "Công tắc áp suất"], ["TT", "TT", "Transmitter nhiệt"], ["PG", "PG", "Đồng hồ áp suất"], ["TG", "TG", "Đồng hồ nhiệt"], ["RTD", "RTD", "Nhiệt điện trở"], ["TC", "TC", "Cặp nhiệt"], ["DPG", "DPG", "Đồng hồ chênh áp"], ["TS", "TS", "Công tắc nhiệt"]];
  // Phiên bản công thức của hồ sơ (rà soát Uncer, NGOC 06/11/2026). Chỉ cấp 3 đổi được; hồ sơ cũ = bản Excel 2026.
  function fvFld() {
    const lab = "Phiên bản công thức Uncer";
    if (A.can("settings")) return fld(lab, "fv", { options: [["2", D.FV[2]], ["1", D.FV[1]]] });
    return `<label class="f"><span>${lab}</span><input value="${esc(D.FV[rec.fv] || D.FV[1])}" readonly></label>`;
  }
  function fld(label, path, opt = {}) {
    const v = getPath(rec, path); const id = "f_" + path.replace(/\./g, "_");
    let ctl;
    if (opt.options) ctl = `<select id="${id}" data-p="${path}">${opt.options.map(o => { const [val, txt, dis] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(val)}"${String(val) === String(v) ? " selected" : ""}${dis ? ' disabled class="optx"' : ""}>${esc(txt)}</option>`; }).join("")}</select>`;
    else ctl = `<input id="${id}" data-p="${path}" value="${esc(v)}" ${opt.type ? `type="${opt.type}"` : ""} ${opt.num ? 'inputmode="decimal"' : ""} ${opt.list ? `list="${opt.list}"` : ""} placeholder="${esc(opt.ph || "")}" autocomplete="off"${opt.ro ? " readonly" : ""}>`;
    if (opt.sign) ctl = `<div class="pm">${ctl}<button type="button" class="pmb" data-neg="${path}" aria-label="Đổi dấu">±</button></div>`;
    return `<label class="f${opt.wide ? " wide" : ""}"><span>${label}</span>${ctl}</label>`;
  }
  // Chuẩn hết hạn (theo Ngày HC): hiện xám, không chọn được, ghi "hết hạn – chờ cập nhật" (NGOC 06/11/2026). Cấp 3 cập nhật hạn mới ở tab Chuẩn.
  function standOptions(kind, path) {
    const day = rec.h.calDate || todayISO(), lab = s => `${s.key} · S/N ${s.serial}${s.loc ? " · " + s.loc : ""}`;
    const cur = path ? getPath(rec, path) : "", kindAll = stands.filter(s => s.kind === kind);
    const exp = kindAll.filter(s => expiredOn(s, day));
    const expOpts = exp.map(s => [s.id, `⛔ ${lab(s)} · HẾT HẠN ${s.due} – chờ cập nhật (cấp 3)`, s.id !== cur]);
    const all = kindAll.filter(s => !expiredOn(s, day)), ctx = path ? standCtx(path) : null;
    const curExp = cur && exp.some(s => s.id === cur);
    const tail = out => out.concat(expOpts.map(o => o[0] === cur ? [o[0], o[1] + " · KHÔNG ĐƯỢC DÙNG"] : o));
    if (!ctx) return tail([["", path ? "— chọn (nhập dải đo / sai số để lọc chuẩn phù hợp) —" : "— chọn —"]].concat(all.map(s => [s.id, lab(s)])));
    const [unit, lo, hi, mpe] = ctx;
    const span = s => { const f = s.kind === "p" ? C.factor(s.unit, unit) : 1; return ((s.kind === "e" && s.certRange ? s.certRange : s.max) - s.min) * (isFinite(f) ? f : 1); };
    const ok = all.filter(s => !fitStand(s, unit, lo, hi, mpe)).sort((a, b) => span(a) - span(b));
    const hidden = all.length - ok.length;
    const head = ok.length ? `— chọn chuẩn phù hợp${hidden ? ` (đã ẩn ${hidden} chuẩn không phù hợp)` : ""} —` : "— KHÔNG có chuẩn phù hợp dải / sai số này —";
    const out = [["", head]].concat(ok.map(s => [s.id, lab(s)]));
    const cs = cur && standById(cur);
    if (cs && cs.kind === kind && !ok.includes(cs) && !curExp) out.push([cs.id, `${lab(cs)} · KHÔNG PHÙ HỢP: ${fitStand(cs, unit, lo, hi, mpe)}`]);
    return tail(out);
  }
  function renderEntry() {
    const h = rec.h, PT = rec.type === "PT";
    h.makerSel = makerSel(h);
    const types = TYPES.map(([k, t, d]) => `<button class="chip${rec.type === k ? " on" : ""}" data-type="${k}" ${READY.includes(k) ? "" : "disabled"}><b>${t}</b><small>${READY.includes(k) ? d : "sắp có"}</small></button>`).join("");
    if (h.locMode !== "free" && h.cust === undefined) h.cust = CUSTS.keyOf(h.location);
    const cu = CUSTS.find(c => c.key === h.cust);
    const custOpts = [["", "— chọn khách hàng —"]].concat(CUSTS.map(c => [c.key, c.name]));
    // Chỉ hiện chữ in trên chứng chỉ (Location VN); trùng chữ trong cùng khách hàng thì thêm mã QTG để phân biệt.
    const locOpts = cu ? [["", cu.locs.length > 1 ? "— chọn công trình —" : "—"]].concat(cu.locs.map(l => [l[0], cu.locs.filter(x => x[1] === l[1]).length > 1 ? `${l[1]} (${l[0]})` : l[1]])) : [["", "— chọn khách hàng trước —"]];
    const legacyLoc = h.location && cu && !cu.locs.some(l => l[0] === h.location);   // hồ sơ cũ dùng mục đã ẩn
    if (legacyLoc) { const l = locInfo(h.location); locOpts.push([l.code, `${l.locVN} (mục cũ)`]); }
    const L0 = h.locMode !== "free" && h.location ? recLoc() : null;
    const descOpts = PT ? ["Pressure Transmitter", "Differential Pressure Transmitter"] : ["Pressure Switch", "Differential Pressure Switch"];
    const locHtml = `<div class="f wide"><span>Địa điểm</span><div class="seg"><button data-loc="list" class="${h.locMode !== "free" ? "on" : ""}">Công trình khí (chọn sẵn)</button><button data-loc="free" class="${h.locMode === "free" ? "on" : ""}">Địa điểm 2 (gõ tay)</button></div></div>
        ${h.locMode === "free"
          ? fld("Địa điểm 2 – nơi lắp đặt", "h.locFree", { wide: 1, ph: "Theo gói thầu, VD: Giàn …" }) + fld("Cơ sở sử dụng (Customer)", "h.custFree", { wide: 1, ph: "Tên đơn vị sử dụng in trên chứng chỉ" })
          : fld("Khách hàng (Customer)", "h.cust", { options: custOpts, wide: 1 }) + fld("Công trình khí (Location)", "h.location", { options: locOpts, wide: 1 })
            + (L0 ? `<div class="f wide locprint"><span>In trên chứng chỉ</span><div>Cơ sở sử dụng: <b>${esc(L0.custVN || "—")}</b><br>Địa điểm lắp đặt: <b>${esc(L0.locVN)}</b></div></div>` : "")}
        ${packPanel()}
        ${h.locMode === "free" ? fld("Dải số chứng chỉ (địa điểm nhập tay)", "h.rangeId", { options: [["", "— chọn dải số —"]].concat(RANGES().map(g => [g.id, `${g.grp} · ${g.name} (${pad4(g.lo)}–${pad4(g.hi)})`])), wide: 1 }) : ""}
        ${fld("Số chứng chỉ / số tem", "certNo", { ph: autoCertNo(), ro: !A.can("certNo") })}<div class="hint wide" id="certchk"></div>`;
    let dev = `
      <div class="grid">
        ${locHtml}
        ${fld("Tag (gõ để gợi ý từ danh sách thiết bị)", "h.tag", { ph: PT ? "PT-1430A" : "PDSH-1106", wide: 1 })}
        ${fld("Mô tả (Description)", "h.description", { options: descOpts })}
        ${fld("Kiểu / Model", "h.model")}
        ${fld("Số serial", "h.serial")}
        ${fld("Hãng sản xuất", "h.makerSel", { options: [["", "— chọn hãng —"], [OTHER, "KHÁC (nhập tay)"]].concat(makersFor(rec.type)) })}
        ${makerSel(h) === OTHER ? fld("Hãng (nhập tay)", "h.maker") : ""}
        ${PT ? "" : fld("Năm sản xuất", "h.mfgYear", { ph: "N/A" })}
        ${fld(PT ? "Độ chính xác (±%FS)" : "Độ chính xác (±% Pset)", "h.acc", { num: 1 })}
        ${fld(PT ? "Phạm vi đo – Min" : "Dải làm việc – Min", "h.min", { num: 1, sign: 1 })}
        ${fld(PT ? "Phạm vi đo – Max" : "Dải làm việc – Max", "h.max", { num: 1, sign: 1 })}
        ${fld("Đơn vị phạm vi", "h.unit", { options: PUNITS })}
        ${PT ? "" : fld("Pset (giá trị đặt)", "h.pset", { num: 1 }) + fld("Đơn vị Pset", "h.unitPset", { options: PUNITS }) +
        fld("Chế độ làm việc", "h.micro", { options: [["NC", "Thường đóng (NC)"], ["NO", "Thường mở (NO)"]] }) +
        fld("Chiều tác động (QTG)", "h.dirQTG", { options: [["Rising", "Chiều tăng (Rising)"], ["Falling", "Chiều giảm (Falling)"]] }) + fld("Độ chia nhỏ nhất thước đặt mức", "h.resolution", { num: 1 })}
        ${fld("Số liệu và kết quả", "h.psType", { options: [["As Found", "As Found"], ["As Left", "As Left"]] })}
        ${fld("Ngày hiệu chuẩn", "h.calDate", { type: "date" })}
        ${fld("Phương pháp", "h.procedure")}${fvFld()}
        ${fld("Điều kiện môi trường (in chứng chỉ)", "h.env", { wide: 1 })}
        ${fld("Tick ô môi trường trên QTG", "h.envOk", { wide: 1, options: [["1", `Có – ${PT ? settings.PT.qtgTemp + ", " + settings.PT.qtgHum : settings.PS.qtgTemp + ", " + settings.PS.qtgHum}`], ["", "Không tick"]] })}
      </div>`;
    let std = `<div class="grid">
        ${fld("Chuẩn áp suất (Stand1)", "h.stand1", { options: standOptions("p", "h.stand1"), wide: 1 })}
        ${PT ? fld("Chuẩn điện (Stand2)", "h.stand2", { options: standOptions("e", "h.stand2"), wide: 1 }) : ""}
        <div class="hint wide">Danh mục chuẩn 2026 (sheet Stand Ref). Hiệu chỉnh áp suất: <b>Yes</b> – số đọc chuẩn dùng trực tiếp như toàn bộ hồ sơ DGCP 10/2026.</div>
        ${decHint([[standById(h.stand1), PT ? h.unit : h.unitPset], [PT ? standById(h.stand2) : null, "mA", 20]])}
      </div>`;
    let pts;
    if (PT) {
      const rows = rec.pt.points.map((x, i) => {
        const ideal = (num(h.max) > num(h.min) && isFinite(num(x))) ? (4 + 16 * (num(x) - num(h.min)) / (num(h.max) - num(h.min))).toFixed(3) : "";
        return `<tr><td class="n">${i + 1}</td><td><div class="pm"><input data-p="pt.points.${i}" inputmode="decimal" value="${esc(x)}"><button type="button" class="pmb sm" data-neg="pt.points.${i}" aria-label="Đổi dấu">±</button></div></td><td class="mut">${ideal}</td>
          <td><input data-p="pt.rise.${i}" inputmode="decimal" value="${esc(rec.pt.rise[i])}" placeholder="mA"></td>
          <td><input data-p="pt.fall.${i}" inputmode="decimal" value="${esc(rec.pt.fall[i])}" placeholder="mA"></td></tr>`;
      }).join("");
      pts = `<table class="entry"><thead><tr><th>#</th><th>Áp suất chuẩn<br>${esc(h.unit)}</th><th>mA lý tưởng</th><th>Tăng ↑<br>mA</th><th>Giảm ↓<br>mA</th></tr></thead><tbody>${rows}</tbody></table>
        <div class="btns"><button class="btn" data-act="pts">Điểm 0-25-50-75-100%</button><button class="btn pri" data-act="sync">⇅ Đồng bộ Tăng / Giảm</button></div>`;
    } else {
      const rows = rec.ps.set.map((v, i) => `<tr><td class="n">${i + 1}</td><td><input data-p="ps.set.${i}" inputmode="decimal" value="${esc(v)}"></td><td><input data-p="ps.reset.${i}" inputmode="decimal" value="${esc(rec.ps.reset[i])}"></td></tr>`).join("");
      pts = `<p class="hint">Như QTG: chiều ${h.dirQTG === "Falling" ? "giảm (Falling) – áp suất tác động đọc khi giảm áp" : "tăng (Rising) – áp suất tác động đọc khi tăng áp"}.</p>
        <table class="entry"><thead><tr><th>TT</th><th>Áp suất tác động<br>(Set) ${esc(h.unitPset)}</th><th>Áp suất trả về<br>(Reset) ${esc(h.unitPset)}</th></tr></thead><tbody>${rows}</tbody></table>
        <div class="btns"><button class="btn pri" data-act="copy1">Lần 2–5 = Lần 1</button></div>`;
    }
    let ptsTitle = PT ? "lên / xuống" : "5 lần";
    if (NEWT.includes(rec.type)) ({ dev, std, pts, ptsTitle } = buildNew(locHtml));
    const sig = `<div class="grid">
        ${fld("Người thực hiện (Kiểm định viên)", "sig.inspector", { list: "names", ro: !A.can("users") })}
        ${ctlField()}
        ${fld("Ngày cấp chứng chỉ", "h.issueDate", { type: "date" })}
        ${fld("Ghi chú QTG", "h.note", { wide: 1 })}
        <div class="hint wide">Trang 1 chứng chỉ ký: ${esc(settings.sig1Title)} <b>${esc(settings.sig1Name)}</b> và ${esc(settings.sig2Title)} <b>${esc(settings.sig2Name)}</b> (đổi trong Cài đặt).</div>
      </div><datalist id="names">${names.map(n => `<option value="${esc(n)}">`).join("")}</datalist>`;
    // Máy tính (≥ 1100 px): 2 cột – trái = thông tin (1, 2, 3, ảnh), phải = số đo + kết quả + ký (4, 5, 6).
    // Điện thoại: .ecl/.ecr là display:contents, thứ tự thẻ giữ như cũ nhờ class o1…o8 (index.html).
    $("#v-entry").innerHTML = `<div class="ecols"><div class="ecl">
      <div class="card o1"><h2><i>1</i> Loại thiết bị</h2><div class="chips">${types}</div></div>
      <div class="card o2" id="c2"><h2><i>2</i> Thông tin thiết bị <small>(phần ghi tay trên QTG)</small></h2>${dev}</div>
      <div class="card o3" id="c3"><h2><i>3</i> Chuẩn sử dụng</h2>${std}</div>
      <div class="o5">${photoCard()}</div>
      </div><div class="ecr">
      <div class="card o4" id="c4"><h2><i>4</i> Số liệu đo ${ptsTitle}</h2>${pts}</div>
      <div class="card o6"><h2><i>5</i> Kết quả & ĐKĐBĐ</h2><div id="result"></div></div>
      <div class="card o7"><h2><i>6</i> Ký tên & xuất hồ sơ</h2>${sig}
        ${ownerHtml()}${actionsHtml()}
        <div id="pdfout"></div></div>
      </div></div>
      <div id="preview"></div>`;
    if (!rec.certNo) rec.certNo = autoCertNo();
    $("#f_certNo").value = rec.certNo;
    paintCert(); checkCertServer();
    renderResult();   // syncCertNo blanks the number when the result fails
    loadThumbs();
  }
  /* ---------- người chịu trách nhiệm & ảnh bằng chứng ---------- */
  // Người tạo hồ sơ (tài khoản đăng nhập lúc tạo) chịu trách nhiệm số liệu; cấp 2 trở lên được sửa hồ sơ của người khác
  const canEdit = () => !rec.owner || !A.me() || rec.owner.id === A.me().id || (A.can("approve") && visible(rec));
  function ownerHtml() {
    const o = rec.owner ? `<b>${esc(ownerName(rec.owner))}</b>` : `<span class="mut">chưa ghi (hồ sơ tạo trước khi có đăng nhập)</span>`;
    return `<div class="hint wide">Người nhập liệu, chịu trách nhiệm hồ sơ: ${o}${canEdit() ? "" : ` · <span class="bad">bạn chỉ được xem, không sửa</span>`}</div>`;
  }
  const PHOTOS_ON = false;   // NGOC 12/11/2026: tạm ẩn ô ảnh bằng chứng cho mọi người để không tràn bộ nhớ Supabase. Đổi true để bật lại.
  function photoCard() {
    if (!PHOTOS_ON) return "";
    const ed = canEdit();
    const cells = rec.photos.map((ph, i) => `<div class="ph"><div class="phimg" id="phimg${i}">${ph.has ? "" : `<span>Ô ${i + 1}</span>`}</div>
      <input data-p="photos.${i}.cap" value="${esc(ph.cap)}" placeholder="Chú thích"${ed ? "" : " readonly"}>
      ${ph.has ? `<small class="mut">${esc(ph.by || "")}${ph.at ? " · " + esc(new Date(ph.at).toLocaleString("vi-VN", { hour12: false })) : ""}</small>` : ""}
      ${ed ? `<div class="btns"><label class="btn sm">${ph.has ? "Thay" : "+ Ảnh"}<input type="file" accept="image/*" capture="environment" data-photo="${i}" hidden></label>${ph.has ? `<button class="btn sm" data-phdel="${i}">Xoá</button>` : ""}</div>` : ""}</div>`).join("");
    const n = rec.photos.filter(x => x.has).length;
    // Mặc định thu gọn (yêu cầu NGOC 01/11/2026); đã bung thì giữ bung qua các lần vẽ lại cho tới khi người dùng thu lại
    return `<details class="card phcard" id="phcard"${photoOpen ? " open" : ""}><summary><h2><i>📷</i> Ảnh bằng chứng <small>(${n}/${P.SLOTS})</small><span class="phx">${photoOpen ? "Thu gọn" : "Bấm để mở"}</span></h2></summary>
      <p class="hint">Chụp màn hình chuẩn / thiết bị tại từng điểm đo làm bằng chứng. Ảnh lưu trên máy này, đi kèm khi Sao lưu JSON và khi Gửi duyệt. Thay hoặc xoá ảnh sau khi duyệt thì hồ sơ phải duyệt lại.</p>
      <div class="phgrid">${cells}</div></details>`;
  }
  let photoOpen = false;
  async function loadThumbs() {
    const pc = $("#phcard"); if (pc && !pc.dataset.w) { pc.dataset.w = 1; pc.addEventListener("toggle", () => { photoOpen = pc.open; const x = $(".phx", pc); if (x) x.textContent = pc.open ? "Thu gọn" : "Bấm để mở"; }); }
    const id = rec.id;
    for (let i = 0; i < rec.photos.length; i++) {
      if (!rec.photos[i].has) continue;
      let d = null; try { d = await P.get(`${id}:${i}`); } catch (e) { }
      const el = $(`#phimg${i}`); if (!el || rec.id !== id) return;
      el.innerHTML = d ? `<img src="${d}" alt="Ảnh ${i + 1}" data-phview="${i}">` : `<span class="bad">mất ảnh</span>`;
    }
  }
  async function onPhotoChange(e) {
    const i = Number(e.target.dataset.photo), f = e.target.files[0]; if (!f || !canEdit()) return;
    try {
      const d = await P.resize(f); await P.put(`${rec.id}:${i}`, d);
      const m = A.me(); Object.assign(rec.photos[i], { has: true, by: m ? m.name : "", at: new Date().toISOString() });
      touched(); logAct(`Ảnh ô ${i + 1}`); if (rec.saved) saveRecord(true); renderEntry(); persistCurrent();
    } catch (x) { toast(x.message || "Không lưu được ảnh"); }
  }

  // Entry blocks for PG / TS / TT / RTD (fields follow the 2026 QTG forms)
  function buildNew(locHtml) {
    const h = rec.h, T = rec.type, u = T === "PG" || T === "DPG" ? h.unit : "°C";
    const S0 = settings[T];
    const yn = [["1", "Đạt (Pass)"], ["", "Không đạt (Fail)"]];
    const asf = fld("Số liệu và kết quả", "h.psType", { options: [["As Found", "As Found"], ["As Left", "As Left"]] });
    let spec = "";
    if (T === "PG") spec = fld("Năm sản xuất", "h.mfgYear", { ph: "N/A" }) + fld("Kiểu (EN, in GCN)", "h.typeEN") + fld("Độ chính xác (±%FS)", "h.acc", { num: 1 })
      + fld("Phạm vi đo – Min", "h.min", { num: 1, sign: 1 }) + fld("Phạm vi đo – Max", "h.max", { num: 1, sign: 1 }) + fld("Đơn vị", "h.unit", { options: PUNITS })
      + fld("Vạch chia (Scale interval)", "h.scale", { num: 1 }) + fld("Độ phân giải (Division)", "h.res", { num: 1 })
      + fld("Hệ số sai số cơ bản (QTG)", "h.errFactor", { options: ["0.8", "1.0"] }) + fld("Chênh lệch chiều cao (mm)", "h.heightDiff", { num: 1 })
      + fld("Chế độ kiểm định", "h.verType", { options: ["Ban đầu", "Định kỳ", "Sau sửa chữa"] }) + fld("Số tem kiểm định (trống = số GCN)", "h.stamp")
      + fld("Kiểm tra bên ngoài", "h.extCheck", { options: yn }) + fld("Kiểm tra kỹ thuật", "h.techCheck", { options: yn });
    if (T === "TS") spec = fld("Độ chính xác (±% Tset)", "h.acc", { num: 1 }) + fld("Dải làm việc – Min (°C)", "h.min", { num: 1, sign: 1 }) + fld("Dải làm việc – Max (°C)", "h.max", { num: 1, sign: 1 })
      + fld("Nhiệt độ đặt Tset (°C)", "h.tset", { num: 1, sign: 1 }) + fld("Chế độ làm việc", "h.micro", { options: [["NC", "Thường đóng (NC)"], ["NO", "Thường mở (NO)"]] })
      + fld("Chiều tác động (QTG)", "h.dirQTG", { options: [["Rising", "Chiều tăng (Rising)"], ["Falling", "Chiều giảm (Falling)"]] })
      + (rec.fv === 2 ? fld("Độ phân giải nhiệt kế chuẩn (°C)", "h.res", { num: 1, ph: "0" }) : "") + asf;
    if (T === "TT") spec = fld("Độ chính xác (±%FS)", "h.acc", { num: 1 }) + fld("Phạm vi đo – Min (°C)", "h.min", { num: 1, sign: 1 }) + fld("Phạm vi đo – Max (°C)", "h.max", { num: 1, sign: 1 })
      + fld("Độ phân giải DUT (mA)", "h.res", { num: 1, ph: "0" }) + asf;
    if (T === "TG") spec = fld("Năm sản xuất", "h.mfgYear", { ph: "N/A" }) + fld("Độ chính xác (±%FS)", "h.acc", { num: 1 }) + fld("Phạm vi đo – Min (°C)", "h.min", { num: 1, sign: 1 }) + fld("Phạm vi đo – Max (°C)", "h.max", { num: 1, sign: 1 })
      + fld("Vạch chia (Scale interval) °C", "h.scale", { num: 1 }) + fld("Độ chia nhỏ nhất (Division) °C", "h.res", { num: 1 })
      + fld("Loại chỉ thị (F7)", "h.indType", { options: [["Analog", "Analog (kim) – ubk3 = d/√3"], ["Digital", "Digital (số) – ubk3 = 0,5·d/√3"]] }) + asf;
    if (T === "RTD") spec = fld("Năm sản xuất", "h.mfgYear") + fld("Độ chính xác (±%FS)", "h.acc", { num: 1 }) + fld("Phạm vi đo – Min (°C)", "h.min", { num: 1, sign: 1 }) + fld("Phạm vi đo – Max (°C)", "h.max", { num: 1, sign: 1 })
      + fld("Độ nhạy (Ω/°C)", "h.sens", { num: 1 }) + fld("Điện trở cách điện (MΩ)", "h.insul", { num: 1 }) + asf;
    if (T === "TC") spec = fld("Năm sản xuất", "h.mfgYear", { ph: "N/A" }) + fld("Loại cặp nhiệt (TC type)", "h.tcType", { options: [["J", "Loại J"], ["K", "Loại K"]] })
      + fld("Độ chính xác (±%FS)", "h.acc", { num: 1 }) + fld("Phạm vi đo – Min (°C)", "h.min", { num: 1, sign: 1 }) + fld("Phạm vi đo – Max (°C)", "h.max", { num: 1, sign: 1 }) + asf;
    if (T === "DPG") spec = fld("Năm sản xuất", "h.mfgYear", { ph: "N/A" }) + fld("Độ chính xác (±%FS)", "h.acc", { num: 1 })
      + fld("Phạm vi đo – Min", "h.min", { num: 1, sign: 1 }) + fld("Phạm vi đo – Max", "h.max", { num: 1, sign: 1 }) + fld("Đơn vị", "h.unit", { options: PUNITS })
      + fld("Vạch chia (Scale interval)", "h.scale", { num: 1 }) + fld("Độ chia nhỏ nhất (Definition)", "h.res", { num: 1 }) + asf;
    const dev = `<div class="grid">${locHtml}
        ${fld("Tag (gõ để gợi ý từ danh sách thiết bị)", "h.tag", { wide: 1 })}${fld("Kiểu / Model", "h.model")}${fld("Số serial", "h.serial")}
        ${fld("Hãng sản xuất", "h.makerSel", { options: [["", "— chọn hãng —"], [OTHER, "KHÁC (nhập tay)"]].concat(makersFor(rec.type)) })}
        ${makerSel(h) === OTHER ? fld("Hãng (nhập tay)", "h.maker") : ""}
        ${spec}
        ${fld(T === "PG" ? "Ngày kiểm định" : "Ngày hiệu chuẩn", "h.calDate", { type: "date" })}
        ${fld("Phương pháp", "h.procedure")}${fvFld()}
        ${T === "PG" ? "" : fld("Điều kiện môi trường (in chứng chỉ)", "h.env", { wide: 1 })}
        ${fld("Tick ô môi trường trên QTG", "h.envOk", { wide: 1, options: [["1", `Có – ${S0.qtgTemp}, ${S0.qtgHum}`], ["", "Không tick"]] })}
      </div>`;
    let std;
    if (T === "PG") std = `<div class="grid">${fld("Chuẩn áp suất (Stand1)", "h.stand1", { options: standOptions("p", "h.stand1"), wide: 1 })}
        <div class="hint wide">Số đọc chuẩn nhập theo đơn vị của áp kế (${esc(u)}). Kiểm định theo ĐLVN 08:2011 – không tính độ KĐBĐ.</div>${decHint([[standById(h.stand1), u]])}</div>`;
    if (T === "TS") std = `<div class="grid">${fld("Nhiệt kế chuẩn / thiết bị tạo nhiệt (Stand1)", "h.stand1", { options: standOptions("t", "h.stand1"), wide: 1 })}
        <div class="hint wide">U của chuẩn (uch1) và độ ổn định / radial / axial của thiết bị tạo nhiệt (uch3) lấy từ thư viện chuẩn.</div>${decHint([[standById(h.stand1), "°C"]])}</div>`;
    if (T === "TT") std = `<div class="grid">${fld("Chuẩn nhiệt dải thấp ≤150 °C (Stand1)", "h.stand1", { options: standOptions("t", "h.stand1"), wide: 1 })}
        ${fld("Chuẩn nhiệt dải trung / cao (Stand2, trống = Stand1)", "h.stand2", { options: standOptions("t", "h.stand2"), wide: 1 })}
        ${fld("Ampe kế (Stand3)", "h.stand3", { options: standOptions("e", "h.stand3"), wide: 1 })}${decHint([[standById(h.stand1), "°C"], [standById(h.stand2), "°C"], [standById(h.stand3), "mA", 20]])}</div>`;
    if (T === "TG") std = `<div class="grid">${fld("Chuẩn nhiệt dải thấp ≤150 °C (Stand1)", "h.stand1", { options: standOptions("t", "h.stand1"), wide: 1 })}
        ${fld("Chuẩn nhiệt dải trung / cao >150 °C (Stand2, trống = Stand1)", "h.stand2", { options: standOptions("t", "h.stand2"), wide: 1 })}
        <div class="hint wide">Như DLVN138.2-1: điểm ≤150 °C dùng U và độ ổn định / radial / axial của Stand1, điểm >150 °C dùng Stand2.</div>${decHint([[standById(h.stand1), "°C"], [standById(h.stand2), "°C"]])}</div>`;
    if (T === "RTD") std = `<div class="grid">${fld("Chuẩn nhiệt dải thấp (Stand1)", "h.stand1", { options: standOptions("t", "h.stand1"), wide: 1 })}
        ${fld("Chuẩn nhiệt dải cao ≥150 °C (Stand2, trống = Stand1)", "h.stand2", { options: standOptions("t", "h.stand2"), wide: 1 })}
        ${fld("Thiết bị đo điện trở (Stand3)", "h.stand3", { options: standOptions("r", "h.stand3"), wide: 1 })}${decHint([[standById(h.stand1), "°C"], [standById(h.stand2), "°C"], [standById(h.stand3), "Ω", 150]])}</div>`;
    if (T === "TC") std = `<div class="grid">${fld("Chuẩn nhiệt + lò dải thấp ≤155 °C (Stand1)", "h.stand1", { options: standOptions("t", "h.stand1"), wide: 1 })}
        ${fld("Chuẩn nhiệt + lò dải cao (Stand2, trống = Stand1)", "h.stand2", { options: standOptions("t", "h.stand2"), wide: 1 })}
        ${fld("Milivôn kế (Stand3)", "h.stand3", { options: standOptions("v", "h.stand3"), wide: 1 })}
        <div class="hint wide">Như DLVN161: uch1 lấy U của Stand2 khi Max ≥ 155 °C, uch8 lấy ổn định / radial / axial của lò dải cao khi Max > 140 °C. uch7 (bù đầu tự do) = ${esc(settings.TC.uCJ)} °C / 2 theo file anh Khai (đổi trong Cài đặt).</div>
        ${decHint([[standById(h.stand1), "°C"], [standById(h.stand2), "°C"], [standById(h.stand3), "mV", 50]])}</div>`;
    if (T === "DPG") std = `<div class="grid">${fld("Chuẩn áp suất (Stand1)", "h.stand1", { options: standOptions("p", "h.stand1"), wide: 1 })}
        <div class="hint wide">Số đọc chuẩn nhập theo đơn vị của đồng hồ (${esc(u)}). U chuẩn và %Rdg lấy theo GCN của chuẩn trong thư viện.</div>${decHint([[standById(h.stand1), u]])}</div>`;
    const inp = (p, v, ph) => `<input data-p="${p}" inputmode="decimal" value="${esc(v)}"${ph ? ` placeholder="${ph}"` : ""}${(rec.stdAuto || []).includes(p) ? ` class="auto" title="Tự điền = điểm hiệu chuẩn, gõ để sửa"` : ""}>`;
    const sgn = (p, v) => `<div class="pm">${inp(p, v)}<button type="button" class="pmb sm" data-neg="${p}" aria-label="Đổi dấu">±</button></div>`;
    let pts, ptsTitle;
    if (T === "PG") {
      const rows = rec.pg.std.map((x, i) => `<tr><td class="n">${i + 1}</td><td>${sgn(`pg.std.${i}`, x)}</td><td>${inp(`pg.rise.${i}`, rec.pg.rise[i])}</td><td>${inp(`pg.fall.${i}`, rec.pg.fall[i])}</td></tr>`).join("");
      pts = `<table class="entry"><thead><tr><th>#</th><th>Áp suất chuẩn<br>${esc(u)}</th><th>Tăng ↑<br>${esc(u)}</th><th>Giảm ↓<br>${esc(u)}</th></tr></thead><tbody>${rows}</tbody></table>
        <div class="btns"><button class="btn" data-act="pts">Điểm 0-25-50-75-100%</button><button class="btn pri" data-act="syncpg">⇅ Đồng bộ Tăng / Giảm</button></div>
        <div class="grid">${fld(`Sụt áp chuẩn – áp suất kiểm tra (${esc(u)})`, "pg.before", { num: 1 })}${fld(`Áp suất sau (${esc(u)})`, "pg.after", { num: 1 })}</div>`;
      ptsTitle = "lên / xuống";
    }
    if (T === "TS") {
      const rows = rec.ts.set.map((v, i) => `<tr><td class="n">${i + 1}</td><td>${sgn(`ts.set.${i}`, v)}</td><td>${sgn(`ts.reset.${i}`, rec.ts.reset[i])}</td></tr>`).join("");
      pts = `<p class="hint">Như QTG: chiều ${h.dirQTG === "Falling" ? "giảm (Falling)" : "tăng (Rising)"} · ghi vào cột ${h.psType === "As Left" ? "As left" : "As found"}.</p>
        <table class="entry"><thead><tr><th>TT</th><th>Nhiệt độ tác động<br>(Set) °C</th><th>Nhiệt độ trả về<br>(Reset) °C</th></tr></thead><tbody>${rows}</tbody></table>
        <div class="btns"><button class="btn pri" data-act="copyts">Lần 2–5 = Lần 1</button></div>`;
      ptsTitle = "5 lần";
    }
    if (T === "TT") {
      const ord = ["1st", "2nd", "3rd"];
      const rows = rec.tt.nom.map((nm, p) => [0, 1, 2].map(k => `<tr class="${k === 2 ? "sep" : ""}">${k === 0 ? `<td rowspan="3" class="n">${sgn(`tt.nom.${p}`, nm)}</td>` : ""}<td class="n">${ord[k]}</td>
          <td>${inp(`tt.sr.${p}.${k}`, rec.tt.sr[p][k], "°C")}</td><td>${inp(`tt.sf.${p}.${k}`, rec.tt.sf[p][k], "°C")}</td><td>${inp(`tt.dr.${p}.${k}`, rec.tt.dr[p][k], "mA")}</td><td>${inp(`tt.df.${p}.${k}`, rec.tt.df[p][k], "mA")}</td></tr>`).join("")).join("");
      pts = `<div class="xs"><table class="entry tt"><thead><tr><th>Điểm HC<br>°C</th><th>Lần</th><th>Chuẩn ↑<br>°C</th><th>Chuẩn ↓<br>°C</th><th>DUT ↑<br>mA</th><th>DUT ↓<br>mA</th></tr></thead><tbody>${rows}</tbody></table></div>
        <div class="btns"><button class="btn" data-act="pts">Điểm 0-25-50-75-100%</button><button class="btn" data-act="tt23">Lần 2–3 = Lần 1</button><button class="btn pri" data-act="ttsync">⇅ Giảm = Tăng (ô trống)</button></div>`;
      ptsTitle = "5 điểm × 3 lần";
    }
    if (T === "TG") {
      const ord = ["1st", "2nd", "3rd"];
      const rows = rec.tg.nom.map((nm, p) => [0, 1, 2].map(k => `<tr class="${k === 2 ? "sep" : ""}">${k === 0 ? `<td rowspan="3" class="n">${sgn(`tg.nom.${p}`, nm)}</td>` : ""}<td class="n">${ord[k]}</td>
          <td>${inp(`tg.sr.${p}.${k}`, rec.tg.sr[p][k], "°C")}</td><td>${inp(`tg.sf.${p}.${k}`, rec.tg.sf[p][k], "°C")}</td><td>${inp(`tg.dr.${p}.${k}`, rec.tg.dr[p][k], "°C")}</td><td>${inp(`tg.df.${p}.${k}`, rec.tg.df[p][k], "°C")}</td></tr>`).join("")).join("");
      pts = `<div class="xs"><table class="entry tt"><thead><tr><th>Điểm HC<br>°C</th><th>Lần</th><th>Chuẩn ↑<br>°C</th><th>Chuẩn ↓<br>°C</th><th>Đồng hồ ↑<br>°C</th><th>Đồng hồ ↓<br>°C</th></tr></thead><tbody>${rows}</tbody></table></div>
        <div class="btns"><button class="btn" data-act="pts">Điểm 0-25-50-75-100%</button><button class="btn" data-act="tt23">Lần 2–3 = Lần 1</button><button class="btn pri" data-act="ttsync">⇅ Giảm = Tăng (ô trống)</button></div>`;
      ptsTitle = "5 điểm × 3 lần";
    }
    if (T === "RTD") {
      const L = ["01", "02", "03 (tg)", "04", "05", "tg lần 2"];
      const rows = rec.rtd.std.map((v, i) => `<tr><td class="n">${L[i]}</td><td>${sgn(`rtd.std.${i}`, v)}</td>${rec.rtd.dut[i].map((d, k) => `<td>${inp(`rtd.dut.${i}.${k}`, d, "Ω")}</td>`).join("")}</tr>`).join("");
      pts = `<p class="hint">Như QTG: 5 điểm tăng dần, dòng cuối đo lại điểm 03 khi giảm (tính hồi trễ).</p>
        <div class="xs"><table class="entry rtd"><thead><tr><th>TT</th><th>Chuẩn<br>°C</th><th>1</th><th>2</th><th>3</th><th>4</th><th>5</th></tr></thead><tbody>${rows}</tbody></table></div>
        <div class="btns"><button class="btn" data-act="rtd6">tg lần 2 = điểm 03</button><button class="btn pri" data-act="rtdcopy">Lần 2–5 = Lần 1</button></div>`;
      ptsTitle = "6 dòng × 5 lần đọc";
    }
    if (T === "TC") {
      const rows = rec.tc.nom.map((nm, p) => `<tr><td rowspan="2" class="n nm">${sgn(`tc.nom.${p}`, nm)}</td><td class="n">Chuẩn °C</td>${rec.tc.std[p].map((v, k) => `<td>${inp(`tc.std.${p}.${k}`, v, "°C")}</td>`).join("")}</tr>
          <tr class="sep"><td class="n">TC mV</td>${rec.tc.dut[p].map((v, k) => `<td>${inp(`tc.dut.${p}.${k}`, v, "mV")}</td>`).join("")}</tr>`).join("");
      pts = `<p class="hint">Như QTG ĐLVN 161:2005.PL2: 8 điểm, mỗi điểm đọc 5 lần (mV). Hàng "Chuẩn °C" là số đọc của nhiệt kế chuẩn từng lần.</p>
        <div class="xs"><table class="entry rtd tcx"><thead><tr><th>Điểm<br>°C</th><th></th><th>1</th><th>2</th><th>3</th><th>4</th><th>5</th></tr></thead><tbody>${rows}</tbody></table></div>
        <div class="btns"><button class="btn" data-act="pts">8 điểm đều Min÷Max</button><button class="btn" data-act="tcstd">Chuẩn = điểm danh định</button><button class="btn pri" data-act="tccopy">Lần 2–5 = Lần 1</button></div>`;
      ptsTitle = "8 điểm × 5 lần đọc";
    }
    if (T === "DPG") {
      const rows = rec.dpg.std.map((x, i) => `<tr><td class="n">${i + 1}</td><td>${sgn(`dpg.std.${i}`, x)}</td><td>${inp(`dpg.rise.${i}`, rec.dpg.rise[i])}</td><td>${inp(`dpg.fall.${i}`, rec.dpg.fall[i])}</td></tr>`).join("");
      pts = `<table class="entry"><thead><tr><th>#</th><th>Áp suất chuẩn<br>${esc(u)}</th><th>Tăng ↑<br>${esc(u)}</th><th>Giảm ↓<br>${esc(u)}</th></tr></thead><tbody>${rows}</tbody></table>
        <div class="btns"><button class="btn" data-act="pts">Điểm 0-25-50-75-100%</button><button class="btn pri" data-act="syncpg">⇅ Đồng bộ Tăng / Giảm</button></div>
        <div class="grid">${fld(`Sụt áp chuẩn – áp suất kiểm tra (${esc(u)})`, "dpg.before", { num: 1 })}${fld(`Áp suất sau (${esc(u)})`, "dpg.after", { num: 1 })}</div>`;
      ptsTitle = "lên / xuống";
    }
    return { dev, std, pts, ptsTitle };
  }

  function renderNewResult(r) {
    const T = rec.type, vn = D.vn, f3 = v => vn(v, 3);
    const vd = (extra) => `<div class="verdict ${r.pass ? "ok" : "ko"}">${r.pass ? "ĐẠT (Pass)" : "KHÔNG ĐẠT (Fail)"}<small>${extra}</small></div>`;
    const qc = `<div>Bản đầy đủ: nút "Bảng Uncer (QC)".</div>`;
    if (T === "PG") return vd(`Max |SHC| = ${r.maxSHC.toPrecision(4)} / cho phép ${r.lim.toPrecision(4)} ${esc(rec.h.unit)}${r.red ? ` · sụt áp ${r.red.pct.toFixed(2)}%` : ""}`)
      + `<table class="mini"><thead><tr><th>Chuẩn</th><th>Tăng</th><th>Giảm</th><th>SHC ↑</th><th>SHC ↓</th></tr></thead><tbody>
        ${r.rows.map(x => `<tr><td>${x.x}</td><td>${x.rise}</td><td>${x.fall}</td><td class="${Math.abs(x.cR) > r.lim ? "bad" : ""}">${C.xround(x.cR, 6)}</td><td class="${Math.abs(x.cF) > r.lim ? "bad" : ""}">${C.xround(x.cF, 6)}</td></tr>`).join("")}</tbody></table>`;
    if (T === "TS") return vd(`U = ${D.uV(r, r.U, vn(r.Uprint, 2))} °C · max |Set − Tset| = ${r.maxDev.toPrecision(4)} / cho phép ${r.lim.toPrecision(4)} °C`)
      + `<table class="mini"><thead><tr><th>Lần</th><th>Set</th><th>Reset</th><th>Set-dev</th><th>Reset-dev</th></tr></thead><tbody>
        ${r.set.map((v, i) => `<tr><td>${i + 1}</td><td>${v}</td><td>${r.reset[i]}</td><td>${f3(r.setDev[i])}</td><td>${f3(r.resetDev[i])}</td></tr>`).join("")}</tbody></table>
        <details><summary>Bảng tính chi tiết cho Quality Checker</summary><div class="qc"><div>utm=${r.F30.toPrecision(6)} · utd=${r.F31.toPrecision(6)} · uch1=${r.F33.toPrecision(6)} · uch3=${r.F35.toPrecision(6)} · U chưa làm tròn=${r.U.toPrecision(8)}</div>${qc}</div></details>`;
    if (T === "TT") return vd(r.lines.map(l => `${l.from}÷${l.to} °C: U = ${D.uTxt("TT", l.U)}`).join(" · ") + ` · max sai lệch ${r.maxErr.toPrecision(4)}%`)
      + `<table class="mini"><thead><tr><th>Chuẩn °C</th><th>mA lý tưởng</th><th>SHC ↑</th><th>SHC ↓</th><th>%</th></tr></thead><tbody>
        ${r.pt.map(p => `<tr><td>${f3(p.stdT)}</td><td>${f3(p.ideal)}</td><td>${f3(p.cR)}</td><td>${f3(p.cF)}</td><td>${f3(p.err)}</td></tr>`).join("")}</tbody></table>
        <details><summary>Bảng tính chi tiết cho Quality Checker</summary><div class="qc"><div>Cj=${r.Cj.toPrecision(6)} · điểm thấp/trung/cao = ${r.nL}/${r.nM}/${r.nH} · uch2 ampe kế=${r.F40.toPrecision(6)}</div>
        <div>U thấp=${r.R.low.U.toPrecision(8)} · trung=${r.R.mid.U.toPrecision(8)} · cao=${r.R.high.U.toPrecision(8)}</div>${qc}</div></details>`;
    if (T === "TG") return vd(r.lines.map(l => `${l.from}÷${l.to} °C: U = ${D.uV(r, l.U, vn(C.xround(l.U, 2), 2))}`).join(" · ") + ` · max |SHC| ${r.maxSHC.toPrecision(4)} / cho phép ${r.lim.toPrecision(4)} °C`)
      + `<table class="mini"><thead><tr><th>Chuẩn °C</th><th>Tăng</th><th>Giảm</th><th>SHC</th><th>Dải</th></tr></thead><tbody>
        ${r.pt.map((p, i) => `<tr><td>${f3(p.stdT)}</td><td>${f3(p.rise)}</td><td>${f3(p.fall)}</td><td class="${Math.abs(p.corr) > r.lim ? "bad" : ""}">${f3(p.corr)}</td><td>${r.cls[i]}</td></tr>`).join("")}</tbody></table>
        <details><summary>Bảng tính chi tiết cho Quality Checker</summary><div class="qc"><div>điểm thấp/trung/cao = ${r.nL}/${r.nM}/${r.nH} · ubk3 phân giải = ${r.ubk3.toPrecision(6)}</div>
        <div>U thấp=${r.R.low.U.toPrecision(8)} · trung=${r.R.mid.U.toPrecision(8)} · cao=${r.R.high.U.toPrecision(8)}</div>${qc}</div></details>`;
    if (T === "TC") return vd(`U = ${esc(r.Utext.replace(".", ","))} °C · max |Δt| ${r.maxErr.toPrecision(4)} + U ≤ ${r.lim.toPrecision(4)} °C ?`)
      + `<table class="mini"><thead><tr><th>Chuẩn °C</th><th>E đo mV</th><th>E chuẩn mV</th><th>ΔE mV</th><th>Δt °C</th></tr></thead><tbody>
        ${r.pt.map(p => `<tr><td>${f3(p.t)}</td><td>${f3(p.E)}</td><td>${f3(p.Eref)}</td><td>${f3(p.dE)}</td><td class="${Math.abs(p.dT) + r.U > r.lim ? "bad" : ""}">${f3(p.dT)}</td></tr>`).join("")}</tbody></table>
        <details><summary>Bảng tính chi tiết cho Quality Checker</summary><div class="qc"><div>uch9=${r.uch9.toPrecision(5)} · uch7=${r.uch7.toPrecision(5)} · uch8=${r.uch8.toPrecision(5)} · uch1=${r.uch1.toPrecision(5)} · uch=${r.uch.toPrecision(6)}</div>
        <div>ubk6=${r.ubk6.toPrecision(5)} · ubk1=${r.ubk1.toPrecision(5)} · ubk2=${r.ubk2.toPrecision(5)} · ubk7=${r.ubk7.toPrecision(5)} · ubk8=${r.ubk8.toPrecision(5)} · U chưa làm tròn=${r.U.toPrecision(8)}</div>${qc}</div></details>`;
    if (T === "DPG") return vd(`U = ${esc(r.Utext.replace(".", ","))} ${esc(rec.h.unit)} · max |SHC| ${r.maxSHC.toPrecision(4)} + U ≤ ${r.lim.toPrecision(4)} ${esc(rec.h.unit)} ?${r.red ? ` · sụt áp ${r.red.pct.toFixed(2)}%` : ""}`)
      + `<table class="mini"><thead><tr><th>Chuẩn</th><th>Tăng</th><th>Giảm</th><th>SHC ↑</th><th>SHC ↓</th><th>U</th></tr></thead><tbody>
        ${r.rows.map(x => `<tr><td>${x.x}</td><td>${x.rise}</td><td>${x.fall}</td><td>${C.xround(x.cR, 6)}</td><td>${C.xround(x.cF, 6)}</td><td>${vn(x.U, 3)}</td></tr>`).join("")}</tbody></table>
        <details><summary>Bảng tính chi tiết cho Quality Checker</summary><div class="qc"><div>y = ${r.a.toPrecision(6)} + ${r.b.toPrecision(6)}·x · Sy=${r.Sy.toPrecision(5)} · uv=${r.uv.toPrecision(5)}% · E12=${r.E12.toPrecision(5)}% · E13=${r.E13}%</div>
        <div>U max chưa làm tròn=${r.Umax.toPrecision(8)}</div>${qc}</div></details>`;
    return vd(`U = ${D.uV(r, r.U, vn(r.U, 2))} °C · R0 = ${vn(r.R0, 3)} Ω · ${r.neg ? "bậc 3" : "bậc 2"}`)
      + `<table class="mini"><thead><tr><th>Chuẩn</th><th>R đo</th><th>R đặc tuyến</th><th>Lệch Ω</th><th>Lệch °C</th></tr></thead><tbody>
        ${r.rows.map(x => `<tr><td>${x.std}</td><td>${vn(x.dut, 3)}</td><td>${vn(x.Rfit, 3)}</td><td>${vn(x.eO, 3)}</td><td>${vn(x.eC, 2)}</td></tr>`).join("")}</tbody></table>
        <details><summary>Bảng tính chi tiết cho Quality Checker</summary><div class="qc"><div>A=${r.A.toPrecision(6)} · B=${r.B.toPrecision(6)} · C=${r.C.toPrecision(6)} · max|lệch|=${r.maxE} + U ≤ ${r.lim.toPrecision(4)} ?</div>
        <div>uch=${r.G38.toPrecision(6)} · uDUT=${r.Q38.toPrecision(6)} · U chưa làm tròn=${r.U.toPrecision(8)}</div>${qc}</div></details>`;
  }

  function renderResult() {
    const c = compute(), el = $("#result"); if (!el) return;
    syncCertNo(c);
    const msgs = c.errors.map(e => `<li class="bad">${esc(e)}</li>`).join("") + c.warns.map(e => `<li class="warn">${esc(e)}</li>`).join("");
    let body = "";
    const r = c.res;
    if (r && NEWT.includes(rec.type)) body = renderNewResult(r);
    else if (r && rec.type === "PT") {
      body = `<div class="verdict ${r.pass ? "ok" : "ko"}">${r.pass ? "ĐẠT (Pass)" : "KHÔNG ĐẠT (Fail)"}<small>U<sub>exp-max</sub> = ${D.uTxt("PT", r.Umax)} ${esc(rec.h.unit)} · y = ${D.vn(r.a, 3)} + ${D.vn(r.b, 3)} x</small></div>
        <table class="mini"><thead><tr><th>AS</th><th>mA lý tưởng</th><th>SHC ↑</th><th>SHC ↓</th><th>U (${esc(rec.h.unit)})</th></tr></thead><tbody>
        ${r.rows.map(x => `<tr><td>${x.x}</td><td>${x.ideal.toFixed(3)}</td><td class="${Math.abs(x.shcR) > r.limI ? "bad" : ""}">${x.shcR.toFixed(3)}</td><td class="${Math.abs(x.shcF) > r.limI ? "bad" : ""}">${x.shcF.toFixed(3)}</td><td>${D.uTxt("PT", x.U)}</td></tr>`).join("")}</tbody></table>
        <details><summary>Bảng tính chi tiết cho Quality Checker</summary><div class="qc">
          <div>Giới hạn: U ≤ ${r.limU.toPrecision(6)} ${esc(rec.h.unit)} (${r.checks.uOK ? "OK" : "VƯỢT"}) · |SHC| ≤ ${r.limI.toPrecision(4)} mA (${r.checks.iOK ? "OK" : "VƯỢT"})</div>
          <div>Sy=${r.Sy.toPrecision(6)} · Sa=${r.Sa.toPrecision(6)} · Sb=${r.Sb.toPrecision(6)} · r=${r.r.toPrecision(6)} · uv=${r.uv.toPrecision(6)}% · E12=${r.E12.toPrecision(6)}%</div>
          <div>Uexp chưa làm tròn: ${r.rows.map(x => x.U.toPrecision(8)).join(" · ")}</div>
          <div>Bản đầy đủ: nút "Bảng Uncer (QC)".</div></div></details>`;
    } else if (r) {
      body = `<div class="verdict ${r.pass ? "ok" : "ko"}">${r.pass ? "ĐẠT (Pass)" : "KHÔNG ĐẠT (Fail)"}<small>U = ${r.Utext.text} ${esc(rec.h.unitPset)} · tác động chiều ${r.dir}</small></div>
        <table class="mini"><thead><tr><th>Lần</th><th>Set</th><th>Reset</th><th>Set-dev</th><th>Reset-dev</th></tr></thead><tbody>
        ${r.set.map((v, i) => `<tr><td>${i + 1}</td><td>${v}</td><td>${r.reset[i]}</td><td>${r.setDev[i].toFixed(3)}</td><td>${r.resetDev[i].toFixed(3)}</td></tr>`).join("")}</tbody></table>
        <details><summary>Bảng tính chi tiết cho Quality Checker</summary><div class="qc">
          <div>uA mở=${r.F26.toPrecision(6)} · uA đóng=${r.F27.toPrecision(6)} · uB chuẩn=${r.F31.toPrecision(6)} · uB phân giải=${r.F32}</div>
          <div>U chưa làm tròn = ${r.U.toPrecision(8)} · max|Set-dev| + U = ${r.J42.toPrecision(6)} ≤ ${r.K42.toPrecision(6)} ?</div>
          <div>Bản đầy đủ: nút "Bảng Uncer (QC)".</div></div></details>`;
    }
    // So sánh với phiên bản công thức còn lại (rà soát Uncer, NGOC 06/11/2026)
    let cmpHtml = "";
    if (r && rec.type !== "PG") {
      try {
        const alt = compute0(Object.assign(clone(rec), { fv: rec.fv === 2 ? 1 : 2 })).res;
        if (alt) cmpHtml = `<p class="hint fvcmp">Phiên bản công thức: <b>${D.FV[rec.fv === 2 ? 2 : 1]}</b>. Nếu tính theo bản ${D.FV[rec.fv === 2 ? 1 : 2]}: U = ${summaryU(rec.type, alt)}, ${alt.pass ? "Đạt" : "Không đạt"}.</p>`;
      } catch (e) { }
    }
    el.innerHTML = (msgs ? `<ul class="msgs">${msgs}</ul>` : "") + (body ? body + cmpHtml : `<p class="mut">Nhập đủ thông tin để xem kết quả.</p>`);
    dock(c.errors, c.warns);
  }
  /* ---------- thanh cảnh báo nổi (yêu cầu NGOC 01/11/2026): luôn đi theo màn hình đang xem, bấm vào mục để nhảy tới ô cần sửa ---------- */
  let dockOpen = false, dockMsgs = [];
  const TARGETS = [[/\bTag\b/, "#f_h_tag"], [/Kiểm định viên/, "#f_sig_inspector"], [/Người kiểm soát/, "#f_sig_controller"], [/Pset/, "#f_h_pset"], [/Tset/, "#f_h_tset"],
    [/Max > Min|Phạm vi đo chưa/, "#f_h_max"], [/độ chính xác/, "#f_h_acc"], [/vạch chia/, "#f_h_scale"], [/độ chia nhỏ nhất/, "#f_h_res"],
    [/Stand3|milivôn/, "#f_h_stand3"], [/Stand2|chuẩn điện|dải cao|dải trung/, "#f_h_stand2"], [/Stand1|chuẩn áp suất/, "#f_h_stand1"], [/^Chuẩn |chuẩn/, "#c3"],
    [/số đọc|ở điểm đo|Set-Pressure|Reset-Pressure|^Thiếu/, "#c4"], [/Công trình khí/, "#f_h_location"], [/Cơ sở sử dụng/, "#c2"], [/./, "#result"]];
  function dock(errs, warns) {
    dockMsgs = errs.map(t => ["bad", t]).concat(warns.map(t => ["warn", t]));
    let d = $("#wdock");
    if (!d) { d = document.createElement("div"); d.id = "wdock"; document.body.appendChild(d); d.addEventListener("click", onDock); }
    const show = dockMsgs.length && !$("#v-entry").hidden;
    d.hidden = !show; document.body.classList.toggle("hasdock", !!show); if (!show) return;
    const ne = errs.length, cls = ne ? "bad" : "warn";
    d.className = cls + (dockOpen ? " open" : "");
    d.innerHTML = `<button class="wbar" data-w="tog"><span class="wic">${ne ? "!" : "i"}</span><b>${ne ? `${ne} mục bắt buộc chưa đủ` : "Không còn lỗi"}</b>${warns.length ? `<span class="wsub">${warns.length} lưu ý</span>` : ""}<span class="wch">${dockOpen ? "▾" : "▴"}</span></button>
      ${dockOpen ? `<ul>${dockMsgs.map(([k, t], i) => `<li><button class="${k}" data-w="${i}"><span>${esc(t)}</span><span class="wgo">›</span></button></li>`).join("")}</ul>` : ""}`;
  }
  function onDock(e) {
    const b = e.target.closest("button[data-w]"); if (!b) return;
    if (b.dataset.w === "tog") { dockOpen = !dockOpen; dock(dockMsgs.filter(m => m[0] === "bad").map(m => m[1]), dockMsgs.filter(m => m[0] === "warn").map(m => m[1])); return; }
    const t = dockMsgs[Number(b.dataset.w)][1], sel = (TARGETS.find(([re]) => re.test(t)) || [])[1];
    let el = sel && $(sel); if (!el) el = $("#result");
    if (el.classList.contains("card")) el = $$("input:not([readonly]),select", el).find(x => !x.value) || el;
    dockOpen = false; dock(dockMsgs.filter(m => m[0] === "bad").map(m => m[1]), dockMsgs.filter(m => m[0] === "warn").map(m => m[1]));
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    const box = el.closest("label.f") || el; box.classList.remove("flash"); void box.offsetWidth; box.classList.add("flash");
    if (el.matches("input,select")) setTimeout(() => el.focus({ preventScroll: true }), 350);
  }

  /* ---------- events: entry ---------- */
  function onInput(e) {
    const p = e.target.dataset.p; if (!p) return;
    if (e.target.readOnly) return;
    if (!canEdit()) { toast(`Hồ sơ của ${rec.owner.name}: cấp 1 chỉ sửa hồ sơ mình tạo`); renderEntry(); return; }
    if (p === "fv") { rec.fv = Number(e.target.value) === 2 ? 2 : 1; touched(); logAct("Đổi phiên bản công thức: " + D.FV[rec.fv]); renderEntry(); persistCurrent(); return; }
    setPath(rec, p, e.target.value);
    if (p === "h.tag") showSuggest(e.target);
    const wasApproved = touched();
    if (p === "certNo") { rec.certAuto = false; clearTimeout(onInput._ct); onInput._ct = setTimeout(() => { paintCert(); checkCertServer(); }, 500); }
    if (p === "h.makerSel") { rec.h.maker = e.target.value === OTHER ? "" : e.target.value; renderEntry(); if (e.target.value === OTHER) focusPath("h.maker"); persistCurrent(); return; }
    if (p.startsWith("pt.points") || p.startsWith("pg.std") || p.startsWith("dpg.std") || p.startsWith("tt.nom") || p.startsWith("tg.nom") || p.startsWith("tc.nom")) rec.ptAuto = false;
    if (/^(tt|tg)\.(sr|sf)\.|^tc\.std\.|^rtd\.std\./.test(p) && rec.stdAuto) { rec.stdAuto = rec.stdAuto.filter(x => x !== p); e.target.classList.remove("auto"); }   // gõ tay → không tự điền đè nữa
    if (/^(tt|tg|tc)\.nom\./.test(p)) paintStd(fillStd());
    if (p.startsWith("h.stand")) { rememberStd(p, e.target.value); fillStd(); }
    if (["PT", "PG", "TT", "TG", "DPG", "TC", "RTD"].includes(rec.type) && (p === "h.min" || p === "h.max") && rec.ptAuto) { genPoints(); renderEntry(); focusPath(p); }
    else if (p === "h.psType" && rec.type === "TS") { renderEntry(); focusPath(p); }
    else if (p === "h.unit" || p === "h.unitPset" || p === "h.description" || p === "h.calDate" || p === "h.dirQTG" || p === "h.location" || p === "h.cust" || p === "h.rangeId" || p === "h.locFree" || p.startsWith("h.stand") || ["h.min", "h.max", "h.acc", "h.pset", "h.tset", "h.tcType", "h.sens"].includes(p)) {
      if (p === "h.cust") { const c = CUSTS.find(x => x.key === rec.h.cust); rec.h.location = c && c.locs.length === 1 ? c.locs[0][0] : ""; persistCurrent(); }
      if (["h.calDate", "h.location", "h.cust", "h.rangeId"].includes(p) && rec.certAuto) rec.certNo = autoCertNo();
      renderEntry(); focusPath(p === "h.cust" && !rec.h.location ? "h.location" : p);
    } else renderResult();
    if (p.startsWith("pt.points") || p === "h.min" || p === "h.max") updateIdeal();
    if (wasApproved) { renderEntry(); focusPath(p); }
    persistCurrent();
  }
  function focusPath(p) { const el = $(`[data-p="${p}"]`); if (el && el.type !== "date" && el.tagName !== "SELECT") { el.focus(); try { const l = el.value.length; el.setSelectionRange(l, l); } catch (e) { } } }
  function updateIdeal() {
    if (rec.type !== "PT") return;
    $$("table.entry tbody tr").forEach((tr, i) => { const x = num(rec.pt.points[i]), mn = num(rec.h.min), mx = num(rec.h.max); tr.children[2].textContent = (mx > mn && isFinite(x)) ? (4 + 16 * (x - mn) / (mx - mn)).toFixed(3) : ""; });
  }
  function genPoints() {
    const mn = num(rec.h.min), mx = num(rec.h.max); if (!(mx > mn)) return;
    if (rec.type === "TC") { rec.tc.nom = [0, 1, 2, 3, 4, 5, 6, 7].map(k => String(C.xround((mx - mn) / 7 * k + mn, 1))); fillStd(); return; }
    if (rec.type === "RTD") { fillStd(); return; }
    const P = [0, 1, 2, 3, 4].map(k => String(C.xround((mx - mn) / 4 * k + mn, 6)));  // QTG!D23 = (G23-C23)/4*k + C23
    if (rec.type === "DPG") rec.dpg.std = P; else if (rec.type === "PG") rec.pg.std = P; else if (rec.type === "TT") rec.tt.nom = P; else if (rec.type === "TG") rec.tg.nom = P; else rec.pt.points = P;
    fillStd();
  }
  /* Số đọc chuẩn nhiệt điền sẵn = điểm hiệu chuẩn (NGOC 09/11/2026): TT, TG (Chuẩn ↑/↓ × 3 lần), TC (Chuẩn × 5 lần), RTD (cột Chuẩn).
   * Chỉ điền ô trống hoặc ô do app điền (rec.stdAuto); ô người dùng gõ tay giữ nguyên. Số lẻ = số lẻ chuẩn nhiệt hiển thị (°C), chưa chọn chuẩn = 3. */
  const AUTO_STD = { TT: ["tt", ["sr", "sf"]], TG: ["tg", ["sr", "sf"]], TC: ["tc", ["std"]] };
  function stdDecTemp() {
    const ds = [rec.h.stand1, rec.h.stand2].map(standById).filter(s => s && s.kind === "t").map(s => standDec(s, "°C")).filter(d => d != null && d >= 0);
    return ds.length ? Math.min(...ds) : 3;
  }
  function fillStd() {
    const T = rec.type; if (!AUTO_STD[T] && T !== "RTD") return [];
    const d = stdDecTemp(), auto = new Set(rec.stdAuto || []), changed = [];
    const put = (path, v) => {
      const cur = String(getPath(rec, path) == null ? "" : getPath(rec, path)).trim(), n = typeof v === "number" ? v : num(v);
      if (cur !== "" && !auto.has(path)) return;
      const nv = isFinite(n) ? n.toFixed(d) : "";
      if (nv) auto.add(path); else auto.delete(path);
      if (nv !== cur) { setPath(rec, path, nv); changed.push(path); }
    };
    if (AUTO_STD[T]) { const [g, cols] = AUTO_STD[T]; rec[g].nom.forEach((nm, p) => cols.forEach(c => rec[g][c][p].forEach((_, k) => put(`${g}.${c}.${p}.${k}`, nm)))); }
    else { const mn = num(rec.h.min), mx = num(rec.h.max); if (mx > mn) { const P = [0, 1, 2, 3, 4].map(k => C.xround((mx - mn) / 4 * k + mn, 6)); P.push(P[2]); P.forEach((v, i) => put(`rtd.std.${i}`, v)); } }
    rec.stdAuto = [...auto];
    return changed;
  }
  // cập nhật ô chuẩn trên màn hình mà không vẽ lại cả trang (giữ con trỏ đang gõ)
  function paintStd(paths) { paths.forEach(p => { const el = $(`[data-p="${p}"]`); if (el) el.value = getPath(rec, p); }); $$("[data-p]").forEach(el => el.classList.toggle("auto", (rec.stdAuto || []).includes(el.dataset.p))); }
  // Một nút đồng bộ: điền ô trống từ chiều còn lại; nếu không có ô trống thì gán Giảm = Tăng.
  function syncRF() {
    const R = rec.pt.rise, F = rec.pt.fall; let filled = 0;
    for (let i = 0; i < R.length; i++) {
      const r = String(R[i]).trim(), f = String(F[i]).trim();
      if (r && !f) { F[i] = r; filled++; } else if (f && !r) { R[i] = f; filled++; }
    }
    if (!filled) { rec.pt.fall = R.slice(); toast("Đã đồng bộ: Giảm = Tăng"); } else toast(`Đã điền ${filled} ô từ chiều còn lại`);
    renderEntry();
  }
  let persistT;
  function persistCurrent() { clearTimeout(persistT); persistT = setTimeout(() => store.set("current", rec), 300); }

  function onClick(e) {
    const b = e.target.closest("button"); if (!b) return;
    if (b.dataset.loc) { rec.h.locMode = b.dataset.loc; renderEntry(); persistCurrent(); return; }
    if (b.dataset.pkt != null) { const d = DEVS[Number(b.dataset.pkt)]; if (d) openPackDevice(d); return; }
    if (b.dataset.pknext) { packNext(); return; }
    if (b.dataset.neg) {
      const inp = $(`[data-p="${b.dataset.neg}"]`); let v = String(inp.value || "").trim();
      v = v.startsWith("-") ? v.slice(1) : "-" + v; inp.value = v === "-" ? "-" : v;
      onInput({ target: inp }); const n = $(`[data-p="${b.dataset.neg}"]`); if (n) n.focus(); return;
    }
    if (b.dataset.type) {
      if (b.dataset.type === rec.type) return;
      const keep = { location: rec.h.location, cust: rec.h.cust, locMode: rec.h.locMode, locFree: rec.h.locFree, custFree: rec.h.locMode === "free" ? rec.h.custFree : "", calDate: rec.h.calDate, issueDate: rec.h.issueDate };
      rec = newRecord(b.dataset.type); Object.assign(rec.h, keep); rec.certNo = autoCertNo();
      renderEntry(); persistCurrent(); return;
    }
    const act = b.dataset.act;
    if (["approve", "unapprove", "submit", "forward", "return", "final"].includes(act)) { wf(act); return; }
    if (b.dataset.phdel) {
      if (!canEdit()) return; const i = Number(b.dataset.phdel);
      if (!b.dataset.armed) { b.dataset.armed = 1; b.textContent = "Xoá thật?"; b.classList.add("danger"); return; }
      P.del(`${rec.id}:${i}`).catch(() => { }); rec.photos[i] = { cap: rec.photos[i].cap, has: false };
      touched(); logAct(`Xoá ảnh ô ${i + 1}`); if (rec.saved) saveRecord(true); renderEntry(); persistCurrent(); return;
    }
    if (act && !["new", "preview", "share", "download", "viewqtg", "sendpkg"].includes(act) && !canEdit()) { toast(`Hồ sơ của ${rec.owner.name}: cấp 1 chỉ sửa hồ sơ mình tạo`); return; }
    if (act && !["save", "new", "preview", "share", "download", "viewqtg", "submit", "sendpkg"].includes(act)) touched();
    if (act === "pts") { genPoints(); rec.ptAuto = true; renderEntry(); }
    if (act === "sync") syncRF();
    if (act === "syncpg") {
      const G = rec.type === "DPG" ? rec.dpg : rec.pg, R = G.rise, F = G.fall; let n = 0;
      R.forEach((r, i) => { r = String(r).trim(); const f = String(F[i]).trim(); if (r && !f) { F[i] = r; n++; } else if (f && !r) { R[i] = f; n++; } });
      if (!n) G.fall = R.slice(); toast(n ? `Đã điền ${n} ô từ chiều còn lại` : "Đã đồng bộ: Giảm = Tăng"); renderEntry();
    }
    if (act === "copyts") { rec.ts.set = rec.ts.set.map(() => rec.ts.set[0]); rec.ts.reset = rec.ts.reset.map(() => rec.ts.reset[0]); renderEntry(); toast("Đã chép lần 1 cho cả 5 lần"); }
    const G = rec.type === "TG" ? rec.tg : rec.tt;   // TT and TG share the 5 points × 3 readings layout
    if (act === "tt23") { ["sr", "sf", "dr", "df"].forEach(k => G[k] = G[k].map(a => a.map(() => a[0]))); renderEntry(); toast("Đã chép lần 1 cho lần 2–3"); }
    if (act === "ttsync") {
      let n = 0;
      [["sr", "sf"], ["dr", "df"]].forEach(([a, b]) => G[a].forEach((row, p) => row.forEach((v, k) => {
        const x = String(v).trim(), y = String(G[b][p][k]).trim();
        if (x && !y) { G[b][p][k] = x; n++; } else if (y && !x) { G[a][p][k] = y; n++; }
      })));
      renderEntry(); toast(`Đã điền ${n} ô`);
    }
    if (act === "tcstd") { rec.tc.std = rec.tc.std.map((a, p) => a.map(() => rec.tc.nom[p])); renderEntry(); toast("Đã điền số đọc chuẩn = điểm danh định"); }
    if (act === "tccopy") { rec.tc.std = rec.tc.std.map(a => a.map(() => a[0])); rec.tc.dut = rec.tc.dut.map(a => a.map(() => a[0])); renderEntry(); toast("Đã chép lần 1 cho lần 2–5"); }
    if (act === "rtd6") { rec.rtd.std[5] = rec.rtd.std[2]; renderEntry(); }
    if (act === "rtdcopy") { rec.rtd.dut = rec.rtd.dut.map(a => a.map(() => a[0])); renderEntry(); toast("Đã chép lần 1 cho lần 2–5"); }
    if (act === "copy1") { rec.ps.set = rec.ps.set.map(() => rec.ps.set[0]); rec.ps.reset = rec.ps.reset.map(() => rec.ps.reset[0]); renderEntry(); toast("Đã chép lần 1 cho cả 5 lần"); }
    if (act === "save") saveRecord();
    if (act === "new") { if (unsavedRec() && !confirm(`Hồ sơ ${rec.h.tag} CHƯA LƯU.\nBấm OK để bỏ và tạo hồ sơ mới; bấm Hủy để quay lại lưu.`)) return; const keep = { location: rec.h.location, cust: rec.h.cust, locMode: rec.h.locMode, locFree: rec.h.locFree, custFree: rec.h.locMode === "free" ? rec.h.custFree : "" }; const t = rec.type; rec = newRecord(t); Object.assign(rec.h, keep); rec.certNo = autoCertNo(); renderEntry(); persistCurrent(); window.scrollTo(0, 0); }
    if (act === "preview") renderPreview("all");
    if (act === "viewqtg") renderPreview("qtg");
    if (act === "submit") submitReview();
    if (b.dataset.pdf) makePdf(b.dataset.pdf);
    if (act === "share") sharePdf();
    if (act === "sendpkg") sendPkg();
    if (act === "download") downloadPdf();
    persistCurrent();
  }

  /* ---------- duyệt hồ sơ (cấp 2 trở lên) ---------- */
  // Cấp 1 (Kiểm định viên): chỉ XEM Biên bản QTG, không tải; được xuất GCN + Uncer và Gửi duyệt cho cấp 2/3 (yêu cầu NGOC 01/11/2026)
  const lv1 = () => !A.can("approve");
  const when = t => esc(new Date(t).toLocaleString("vi-VN", { hour12: false }));
  function actionsHtml() {
    const m = A.me(), st = stage(rec), sb = rec.submitted, a = rec.approved, f = rec.final;
    const stHtml = st === "done" ? `<span class="stp ok">✓ Đã duyệt final</span><span>${f ? `bởi <b>${esc(fullName(f.by))}</b> · ${when(f.at)}` : `bởi <b>${esc(a.by)}</b> · ${when(a.at)}`} · được in / tải</span>`
      : st === "final" ? `<span class="stp wait">⏳ Chờ duyệt final</span><span>Kiểm soát <b>${esc(fullName(a.by))}</b> đã duyệt ${when(a.at)} → chờ <b>${esc(rec.finalTo ? rec.finalTo.name : "người duyệt final")}</b> duyệt final</span>`
      : st === "review" ? `<span class="stp wait">⏳ Chờ kiểm soát</span><span>${esc(fullName(sb.by))} chuyển ${when(sb.at)} → <b>${esc(sb.to ? sb.to.name : "người kiểm soát")}</b></span>`
      : `<span class="stp no">Chưa chuyển duyệt</span><span>Chọn Người kiểm soát ở trên rồi bấm Chuyển duyệt. Chỉ in / tải PDF sau khi duyệt final.</span>`;
    const ret = rec.returned && st === "draft" ? `<div class="hint bad">↩ ${esc(fullName(rec.returned.by))} trả lại ${when(rec.returned.at)}${rec.returned.note ? ": " + esc(rec.returned.note) : ""}</div>` : "";
    const mine = m && rec.owner && rec.owner.id === m.id;
    let rv = "";
    if (st === "draft" && m && (mine || !rec.owner || m.role >= 3)) rv = `<div class="arow"><button class="btn pri" data-act="submit">➜ Chuyển duyệt${rec.sig.controller ? " cho " + esc(rec.sig.controller) : ""}</button></div>`;
    if (st === "review" && m && m.role >= 2 && (!sb.to || sb.to.id === m.id || m.role >= 3) && !(mine && m.role < 3)) {
      const fwd = reviewers(m.id).filter(p => !rec.owner || p.id !== rec.owner.id);
      rv = `<div class="wf">${m.role >= 3 ? "" : `<label class="f"><span>Người duyệt final</span>${personSel("wf_final", finals(), (rec.finalTo || {}).id || store.get("lastFinal", ""), "— Chọn người duyệt final —")}</label>`}
        <div class="arow"><button class="btn pri" data-act="approve">✓ ${m.role >= 3 ? "Duyệt kiểm soát + final" : "Duyệt kiểm soát → chuyển final"}</button><button class="btn" data-act="return">↩ Trả lại</button></div>
        <label class="f"><span>Hoặc chuyển cho người kiểm soát khác</span>${personSel("wf_fwd", fwd, "", "— Chọn người —")}</label>
        <div class="arow"><button class="btn" data-act="forward">↪ Chuyển người khác</button></div></div>`;
    }
    if (st === "final" && m && m.role >= 3) rv = `<div class="arow"><button class="btn pri" data-act="final">✓ Duyệt final (cho in, cho tải)</button><button class="btn" data-act="return">↩ Trả lại</button></div>`;
    if (st === "done" && m && m.role >= 3) rv = `<div class="arow"><button class="btn" data-act="unapprove">Huỷ duyệt</button></div>`;
    const L = lv1(), ok = isFinal(rec), fl = rec.summary && !rec.summary.pass;
    const exp = ok ? `<button class="btn pri" data-pdf="cert">Chứng chỉ <small>2 trang</small></button>
        ${L ? `<button class="btn" data-act="viewqtg">Biên bản QTG <small>chỉ xem</small></button>`
        : `<button class="btn" data-pdf="qtg">Biên bản QTG <small>PDF</small></button>
        <button class="btn" data-pdf="all">Trọn bộ <small>QTG + GCN</small></button>
        <button class="btn" data-pdf="unc">Bảng Uncer <small>chỉ cấp 2–3</small></button>`}
        <button class="btn wide2" data-act="preview">Xem trước trọn bộ</button>`
      : `<button class="btn wide2" data-act="preview">Xem trước trọn bộ <small>(chưa được in / tải)</small></button>${L ? "" : `<button class="btn" data-pdf="unc">Bảng Uncer <small>chỉ cấp 2–3</small></button>`}`;
    return `<div class="acts">
      <div class="agrp"><div class="alab">Hồ sơ</div><div class="arow">
        <button class="btn pri" data-act="save">💾 Lưu hồ sơ</button><button class="btn" data-act="new">＋ Hồ sơ mới</button></div></div>
      <div class="agrp"><div class="alab">Duyệt</div><div class="astat">${stHtml}</div>${ret}${rv}</div>
      ${fl ? `<div class="hint bad">⚠ KHÔNG ĐẠT${rec.summary.why ? ": " + esc(rec.summary.why) : ""}. Không cấp số, không xuất chứng chỉ; chỉ có Biên bản QTG ghi nhận kết quả.</div>` : ""}
      <div class="agrp"><div class="alab">Xuất tài liệu${ok ? "" : " – chỉ in / tải sau khi duyệt final"}</div><div class="agrid">${exp}</div></div>
    </div>`;
  }
  /* ---------- luồng duyệt 2 bước (NGOC 10/11/2026, v49) ----------
   * Người nhập chọn Người kiểm soát (cấp 2/3) → Chuyển duyệt. Người kiểm soát: Duyệt và chuyển người duyệt final (cấp 3), hoặc chuyển
   * cho cấp 2/3 khác, hoặc trả lại. Cấp 3 duyệt final → mới cho in / tải. Ai nhận hồ sơ thì được thêm vào rec.viewers: máy chủ chỉ cho
   * người nhập, người trong viewers và cấp 3 đọc / sửa hồ sơ. Hồ sơ duyệt theo cách cũ (trước v49, không có flow2) coi như đã final. */
  function wfCheck() {
    if (!rec.h.tag) { toast("Nhập Tag trước"); return null; }
    const c = compute(); if (!c.res) { toast(c.errors[0] || "Chưa đủ số liệu"); return null; }
    if (!rec.sig.inspector) { toast("Chưa có tên Kiểm định viên"); return null; }
    return c;
  }
  function wfSave(msg) { rec.flow2 = true; if (rec.owner) addViewer(rec, rec.owner.id); saveRecord(true); persistCurrent(); renderEntry(); badge(); if (msg) toast(msg); }
  const clearFlow = r => { delete r.submitted; delete r.approved; delete r.final; delete r.finalTo; };
  async function wf(act) {
    const m = A.me(); if (!m) return;
    const now = new Date().toISOString();
    if (["submit", "approve", "final"].includes(act)) {
      const sv = await checkCertServer();   // số trùng trên toàn hệ thống (máy chủ)
      if (sv && rec.certAuto) { srvMax = {}; rec.certNo = autoCertNo(); renderEntry(); toast(`Số cũ đã có người dùng cho ${sv.tag || "thiết bị khác"} – app đang lấy số mới, kiểm tra rồi bấm lại`); return; }
      const iss = certIssues().filter(t => !t.startsWith(NORANGE)); if (iss.length) { toast("Không chuyển / duyệt được: " + iss[0]); paintCert(); return; }
    }
    if (act === "submit") {
      if (!wfCheck()) return;
      const p = personByName(rec.sig.controller);
      if (!p || p.role < 2) { toast("Chọn Người kiểm soát trong danh sách trước khi chuyển duyệt"); focusPath("sig.controller"); return; }
      if (p.id === m.id) { toast("Không tự chuyển duyệt cho chính mình – chọn người khác"); return; }
      clearFlow(rec); delete rec.returned;
      rec.submitted = { by: m.name, byId: m.id, at: now, to: { id: p.id, name: p.name } };
      addViewer(rec, p.id); logAct(`Chuyển duyệt → ${p.name}`); wfSave(`Đã chuyển cho ${p.name}`);
      if (!A.cloud()) submitReview();   // chế độ PIN trên máy (chưa có máy chủ): vẫn đóng gói file để gửi qua Zalo / email
      return;
    }
    if (m.role < 2) return;
    if (act === "forward") {
      const p = people.find(x => x.id === ($("#wf_fwd") || {}).value);
      if (!p) { toast("Chọn người kiểm soát để chuyển"); return; }
      rec.submitted = { by: m.name, byId: m.id, at: now, to: { id: p.id, name: p.name } }; rec.sig.controller = p.name;
      addViewer(rec, p.id); logAct(`Chuyển tiếp → ${p.name}`); wfSave(`Đã chuyển cho ${p.name}`); return;
    }
    if (act === "return") {
      const note = prompt("Lý do trả lại (người nhập sẽ thấy):", ""); if (note == null) return;
      clearFlow(rec); rec.returned = { by: m.name, at: now, note: note.trim() };
      logAct("Trả lại" + (note.trim() ? ": " + note.trim() : "")); wfSave("Đã trả lại người nhập"); return;
    }
    if (act === "approve") {
      if (!wfCheck()) return;
      const ex = expiredUsed(rec); if (ex.length) { toast(`Không duyệt được: chuẩn ${ex.map(s => s.key).join(", ")} đã hết hạn`); return; }
      if (rec.owner && rec.owner.id === m.id && m.role < 3) { toast("Không tự duyệt hồ sơ của chính mình"); return; }
      let fin = null;
      if (m.role < 3) { fin = people.find(x => x.id === ($("#wf_final") || {}).value && x.role >= 3); if (!fin) { toast("Chọn người duyệt final"); return; } store.set("lastFinal", fin.id); }
      rec.sig.controller = m.name; rec.approved = { by: m.name, byId: m.id, role: m.role, at: now }; delete rec.submitted;
      if (!fin) { rec.final = { by: m.name, byId: m.id, at: now }; delete rec.finalTo; logAct("Duyệt kiểm soát + final"); wfSave("Đã duyệt final – được in / tải"); }
      else { rec.finalTo = { id: fin.id, name: fin.name }; addViewer(rec, fin.id); logAct(`Duyệt kiểm soát → chờ final ${fin.name}`); wfSave(`Đã duyệt, chuyển ${fin.name} duyệt final`); }
      return;
    }
    if (act === "final" && m.role >= 3) { if (!wfCheck()) return; rec.final = { by: m.name, byId: m.id, at: now }; delete rec.finalTo; logAct("Duyệt final"); wfSave("Đã duyệt final – được in / tải"); return; }
    if (act === "unapprove" && m.role >= 3) { clearFlow(rec); logAct("Huỷ duyệt"); wfSave("Đã huỷ duyệt"); }
  }
  function logAct(act) { (rec.log = rec.log || []).push({ at: new Date().toISOString(), by: A.me() ? A.me().name : "", act }); }
  function approve(on) {
    if (!A.can("approve")) return;
    if (on) {
      if (!rec.h.tag) { toast("Nhập Tag trước khi duyệt"); return; }
      const c = compute(); if (!c.res) { toast(c.errors[0] || "Chưa đủ số liệu"); return; }
      if (!rec.sig.inspector) { toast("Chưa có tên Kiểm định viên"); return; }
      const ex = expiredUsed(rec); if (ex.length) { toast(`Không duyệt được: chuẩn ${ex.map(s => s.key).join(", ")} đã hết hạn`); return; }
      const m = A.me();
      if (rec.sig.inspector.trim().toLowerCase() === m.name.toLowerCase()) toast("Lưu ý: người duyệt trùng Kiểm định viên");
      rec.sig.controller = m.name; rec.approved = { by: m.name, role: m.role, at: new Date().toISOString() }; delete rec.submitted; logAct("Duyệt");
    } else { delete rec.approved; logAct("Huỷ duyệt"); }
    saveRecord(); renderEntry();
  }
  // Mọi chỉnh sửa số liệu sau khi duyệt đều huỷ duyệt
  function touched() {
    if (rec.approved || rec.final) { clearFlow(rec); logAct("Sửa sau duyệt – huỷ duyệt"); toast("Đã sửa: hồ sơ cần chuyển duyệt lại"); return true; }
    // người kiểm soát đang giữ hồ sơ được sửa số liệu rồi duyệt luôn; người khác sửa thì phải chuyển duyệt lại
    if (rec.submitted && !(rec.submitted.to && A.me() && rec.submitted.to.id === A.me().id)) { delete rec.submitted; logAct("Sửa sau khi chuyển duyệt"); toast("Đã sửa: cần Chuyển duyệt lại"); }
    return false;
  }
  function rememberNames() {
    [rec.sig.inspector, rec.sig.controller].forEach(n => { n = (n || "").trim(); if (n && !names.includes(n)) names.unshift(n); });
    names = names.slice(0, 30); store.set("names", names);
  }
  function saveRecord(quiet) {
    if (!rec.h.tag) { if (!quiet) toast("Nhập Tag trước khi lưu"); return; }
    if (!canEdit()) { toast(`Hồ sơ của ${rec.owner.name}: cấp 1 chỉ sửa hồ sơ mình tạo`); return; }
    if (!rec.owner && A.me()) rec.owner = { id: A.me().id, name: A.me().name };
    if (quiet !== true) logAct(rec.saved ? "Lưu" : "Tạo");
    const c = compute(); syncCertNo(c);
    // NGOC 06/11/2026: trên một máy không được có 2 hồ sơ trùng số chứng chỉ (chống trùng giữa các máy cần máy chủ chung)
    const dupNo = rec.certNo && records.find(r => r.id !== rec.id && r.certNo && certKey(r.certNo) === certKey(rec.certNo));
    if (dupNo) {
      if (rec.certAuto) { rec.certNo = autoCertNo(); const f = $("#f_certNo"); if (f) f.value = rec.certNo; }
      else { toast(`Không lưu: số ${rec.certNo} đã dùng cho ${dupNo.h.tag || "hồ sơ khác"} – nhập số khác`); return; }
    }
    rec.saved = true; rec.updated = new Date().toISOString();
    rec.summary = c.res ? { pass: c.res.pass, U: summaryU(rec.type, c.res), why: c.res.pass ? "" : failWhy(c) } : null;
    if (rec.owner) addViewer(rec, rec.owner.id);
    const i = records.findIndex(r => r.id === rec.id);
    if (i >= 0) records[i] = clone(rec); else records.unshift(clone(rec));
    store.set("records", records); rememberNames(); if (quiet !== true) toast("Đã lưu " + rec.certNo);
    { const pk = $("#pkpanel"); if (pk) pk.outerHTML = packPanel(); }
  }

  /* ---------- documents ---------- */
  function docInfo() {
    const c = compute();
    const s1 = standById(rec.h.stand1), s2 = standById(rec.h.stand2), s3 = standById(rec.h.stand3), T = rec.type;
    const exp = expiredUsed(rec);   // luôn đóng dấu, không phụ thuộc Cài đặt (NGOC 06/11/2026)
    return { c, info: { stand1: s1, stand2: ["PT", "TT", "RTD", "TG", "TC"].includes(T) ? s2 : null, stand3: s3, heat: T === "TS" ? s1 : null, loc: recLoc(), draft: exp.length ? "CHUẨN HẾT HẠN, CẦN CẬP NHẬT" : (!rec.sig.inspector || !rec.sig.controller ? "CHƯA ĐỦ CHỮ KÝ" : (isFinal(rec) ? "" : "CHƯA DUYỆT")) } };
  }
  function pagesHtml(which) {
    const { c, info } = docInfo();
    if (!c.res) { toast(c.errors[0] || "Chưa đủ số liệu"); return null; }
    // Bảng Uncer không nằm trong file xuất thường; chỉ cấp 2–3 mở được khi cần trích xuất (NGOC 09/11/2026)
    if (which === "unc" && lv1()) { toast("Bảng Uncer chỉ dành cho Người kiểm soát / Trưởng phòng"); return null; }
    if (which === "certunc") {
      if (failed(c)) { toast("Không đạt: không có chứng chỉ để gửi"); return null; }
      const P = D2.PAGES[rec.type];
      return P ? P.c1(rec, c.res, settings, info) + P.c2(rec, c.res, settings, info) : D.certPage1(rec, c.res, settings, info) + D.certPage2(rec, c.res, settings, info);
    }
    if (failed(c)) {
      if (which === "cert") { toast("Không đạt: không xuất chứng chỉ (kể cả bản nháp)"); return null; }
      if (which === "all") toast("Không đạt: bộ PDF chỉ gồm Biên bản");
      which = which === "all" ? "noCert" : which;
    }
    const a = [], P = D2.PAGES[rec.type];
    if (which === "noCert") {
      a.push(P ? P.q(rec, c.res, settings, info) : D.qtgPage(rec, c.res, settings, info));
      return a.join("");
    }
    if (P) {
      if (which === "qtg" || which === "all") a.push(P.q(rec, c.res, settings, info));
      if (which === "cert" || which === "all") a.push(P.c1(rec, c.res, settings, info), P.c2(rec, c.res, settings, info));
      if (which === "unc") a.push(P.u(rec, c.res, settings, info));
      return a.join("");
    }
    if (which === "qtg" || which === "all") a.push(D.qtgPage(rec, c.res, settings, info));
    if (which === "cert" || which === "all") a.push(D.certPage1(rec, c.res, settings, info), D.certPage2(rec, c.res, settings, info));
    if (which === "unc") a.push(D.uncPage(rec, c.res, settings, info));
    return a.join("");
  }
  function renderPreview(which) {
    const html = pagesHtml(which); if (!html) return;
    const el = $("#preview"); el.innerHTML = `<div class="card"><h2>Xem trước</h2><div class="pv"><div class="pv-in">${html}</div></div></div>`;
    fitPreview(); el.scrollIntoView({ behavior: "smooth" });
  }
  function fitPreview() { const pv = $(".pv"); if (!pv) return; const s = Math.min(1, (pv.clientWidth - 2) / 794); const inn = $(".pv-in"); inn.style.transform = `scale(${s})`; pv.style.height = (inn.scrollHeight * s) + "px"; }
  window.addEventListener("resize", fitPreview);

  async function buildPdf(html) {
    const host = $("#render"); host.innerHTML = html;
    try {
      await Promise.all($$("img", host).map(im => im.complete ? 0 : new Promise(r => { im.onload = im.onerror = r; })));
      if (document.fonts && document.fonts.ready) await document.fonts.ready;
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({ unit: "mm", format: "a4", compress: true });
      const pages = $$("section.a4", host);
      // Mộc ẩn: chỉ gắn khi Trưởng phòng đã đặt khóa Phòng (Cài đặt › Mộc ẩn)
      const mf = settings.mocKey && window.MOC ? mocFields() : null, mc = mf ? await MOC.code(settings.mocKey, mf) : "";
      for (let i = 0; i < pages.length; i++) {
        const cv = await html2canvas(pages[i], { scale: 2, backgroundColor: "#ffffff", logging: false, width: 794, height: 1123, windowWidth: 794 });
        if (mc) MOC.stamp(cv, mc);
        if (i) pdf.addPage();
        pdf.addImage(cv.toDataURL("image/jpeg", 0.82), "JPEG", 0, 0, 210, 297);
      }
      pdf.setProperties({ title: [rec.certNo, rec.h.tag].filter(Boolean).join(" "), subject: "LAB PVGAS Services", creator: "LAB PVGAS Services", keywords: mc ? MOC.keywords(mc, mf) : "" });
      const blob = pdf.output("blob");
      if (mc) {
        const log = store.get("pdfLog", []);
        log.push({ sha: await MOC.sha256(blob), code: mc, f: mf, certNo: rec.certNo || "", tag: rec.h.tag || "", recId: rec.id, at: new Date().toISOString(), by: A.me() ? A.me().name : "" });
        store.set("pdfLog", log.slice(-3000));
      }
      return blob;
    } finally { host.innerHTML = ""; }
  }
  function mocFields() {
    const c = compute();
    return { certNo: rec.certNo || "", type: rec.type, tag: rec.h.tag || "", serial: rec.h.serial || "", issueDate: rec.h.issueDate || "", calDate: rec.h.calDate || "",
      result: c.res ? (c.res.pass ? "Đạt" : "Không đạt") : "", approvedBy: rec.approved ? rec.approved.by : "" };
  }
  const fileTag = () => `${(rec.certNo || "").replace(/[^\w.-]+/g, "_")}_${(rec.h.tag || "").replace(/[^\w.-]+/g, "_")}`;
  async function makePdf(which, htmlIn, nameIn, outSel) {
    if (!htmlIn && which !== "unc" && !isFinal(rec)) { toast("Chỉ in / tải sau khi hồ sơ được duyệt final"); return; }
    if (!htmlIn && lv1()) { if (which === "qtg") { renderPreview("qtg"); return; } if (which === "all") which = "certunc"; if (which === "unc") { toast("Bảng Uncer chỉ dành cho Người kiểm soát / Trưởng phòng"); return; } }
    const html = htmlIn || pagesHtml(which); if (!html) return;
    const out = $(outSel || "#pdfout"); out.innerHTML = `<p class="mut">Đang tạo PDF…</p>`;
    try {
      const label = { cert: "ChungChi", qtg: "BienBan", unc: "Uncer", all: "HoSo", certunc: "GCN_Uncer" }[which];
      const name = nameIn || `${label}_${fileTag()}.pdf`;
      lastPdf = { blob: await buildPdf(html), name };
      out.innerHTML = `<div class="pdfready"><b>${esc(name)}</b><span class="mut">${(lastPdf.blob.size / 1024).toFixed(0)} KB</span>
        <div class="btns"><button class="btn pri" data-act="share" data-r="share">Chia sẻ / Lưu vào Tệp</button><button class="btn" data-act="download" data-r="download">Mở / Tải xuống</button></div></div>`;
    } catch (e) { out.innerHTML = `<p class="bad">Không tạo được PDF: ${esc(e.message)}</p>`; }
  }
  // Gửi duyệt: đánh dấu Chờ duyệt, đóng gói GCN (PDF) + hồ sơ JSON (kèm ảnh) để chuyển cho cấp 2/3
  async function submitReview() {
    if (!rec.h.tag) { toast("Nhập Tag trước khi gửi duyệt"); return; }
    const c = compute(); if (!c.res) { toast(c.errors[0] || "Chưa đủ số liệu"); return; }
    if (!rec.sig.inspector) { toast("Chưa có tên Kiểm định viên"); return; }
    const html = failed(c) ? "" : pagesHtml("certunc"); if (!html && !failed(c)) return;   // không đạt: chỉ gửi hồ sơ JSON, Uncer dựng lại từ JSON
    const out = $("#pdfout"); out.innerHTML = `<p class="mut">Đang đóng gói hồ sơ gửi duyệt…</p>`;
    try {
      const pdf = html ? new File([await buildPdf(html)], `GuiDuyet_${fileTag()}.pdf`, { type: "application/pdf" }) : null;
      const all = await P.all().catch(() => ({})), photos = {};
      Object.keys(all).forEach(k => { if (k.startsWith(rec.id + ":")) photos[k] = all[k]; });
      const js = new File([JSON.stringify({ app: "lab-pvgas-services", kind: "review", records: [rec], photos }, null, 1)], `GuiDuyet_${fileTag()}.json`, { type: "application/json" });
      renderEntry();
      const o = $("#pdfout");
      o.innerHTML = `<div class="pdfready"><b>Đã chuyển duyệt – gói file để gửi kèm</b><span class="mut">${pdf ? esc(pdf.name) + " (" + (pdf.size / 1024).toFixed(0) + " KB) + " : ""}${esc(js.name)}</span>
        <div class="btns"><button class="btn pri" data-act="sendpkg">Chuyển cho người duyệt</button></div></div>`;
      lastPkg = pdf ? [pdf, js] : [js];
      sendPkg();
    } catch (e) { out.innerHTML = `<p class="bad">Không đóng gói được: ${esc(e.message)}</p>`; }
  }
  let lastPkg = null;
  async function sendPkg() {
    if (!lastPkg) return;
    if (navigator.canShare && navigator.canShare({ files: lastPkg })) {
      try { await navigator.share({ files: lastPkg, title: "Gửi duyệt " + (rec.certNo || rec.h.tag) }); return; } catch (e) { if (e.name === "AbortError") return; }
    }
    lastPkg.forEach(f => { const url = URL.createObjectURL(f); const a = document.createElement("a"); a.href = url; a.download = f.name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 60000); });
  }
  async function sharePdf() {
    if (!lastPdf) return;
    const file = new File([lastPdf.blob], lastPdf.name, { type: "application/pdf" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: lastPdf.name }); return; } catch (e) { if (e.name === "AbortError") return; }
    }
    downloadPdf();
  }
  function downloadPdf() {
    if (!lastPdf) return;
    const url = URL.createObjectURL(lastPdf.blob); const a = document.createElement("a");
    a.href = url; a.download = lastPdf.name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  /* ---------- records tab ---------- */
  let mineOnly = false;
  const dmy = iso => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || ""); return m ? `${m[3]}/${m[2]}/${m[1]}` : "chưa có ngày"; };
  const recDay = r => r.h.calDate || (r.updated || "").slice(0, 10);
  const stageTag = r => { const [c, t] = STAGE[stage(r)]; return `<span class="${c}">${t}${stage(r) === "review" && r.submitted.to ? " · " + esc(r.submitted.to.name) : stage(r) === "final" && r.finalTo ? " · " + esc(r.finalTo.name) : ""}</span>`; };
  const whyOf = r => (r.summary && r.summary.why) || failWhy(compute(r));
  function renderRecords() {
    const q = ($("#rq") && $("#rq").value || "").toLowerCase();
    const m = A.me(), vis = records.filter(visible);
    const list = vis.filter(r => (!mineOnly || (m && r.owner && r.owner.id === m.id)) && (!q || [r.h.tag, r.certNo, r.h.model, r.h.location, r.h.locFree, r.owner ? r.owner.name : ""].join(" ").toLowerCase().includes(q)));
    // Báo động hồ sơ KHÔNG ĐẠT (mọi cấp, trong phạm vi hồ sơ mình được xem)
    const fails = vis.filter(isFail);
    store.set("failSeen", Array.from(new Set(store.get("failSeen", []).concat(fails.map(r => r.id)))).slice(-500));
    const failCard = fails.length ? `<div class="card failc"><h2>⚠ ${fails.length} hồ sơ KHÔNG ĐẠT</h2>
      <p class="hint">Thiết bị không đạt: không cấp số, không xuất chứng chỉ; chỉ có Biên bản QTG ghi nhận kết quả (vẫn qua duyệt kiểm soát + final).</p>
      ${fails.map(r => `<div class="rec"><div><b>${esc(r.h.tag)}</b> <span class="tag">${r.type}</span> <span class="bad">Fail</span> ${stageTag(r)}<br>
        <small class="bad">${esc(whyOf(r))}</small><br><small class="mut">${esc(r.owner ? ownerName(r.owner) : "—")} · ${esc(dmy(recDay(r)))} · ${esc(r.h.locMode === "free" ? r.h.locFree : r.h.location)}</small></div>
        <div class="ra"><button class="btn sm" data-r="open" data-id="${r.id}">Mở</button></div></div>`).join("")}</div>` : "";
    // Hàng chờ mình duyệt (bước kiểm soát hoặc bước final)
    const pend = vis.filter(myTurn);
    const byF = new Map(); pend.forEach(r => { const k = folderKey(r); if (!byF.has(k)) byF.set(k, []); byF.get(k).push(r); });
    const needFinal = m && m.role < 3 && pend.some(r => stage(r) === "review");
    const queue = pend.length ? `<div class="card hl"><h2>📥 Chờ tôi duyệt <small>(${pend.length})</small></h2>
      ${needFinal ? `<label class="f"><span>Người duyệt final cho các hồ sơ duyệt cả gói</span>${personSel("apf_final", finals(), store.get("lastFinal", ""), "— Chọn người duyệt final —")}</label>` : ""}
      ${[...byF].map(([k, a]) => `<div class="qf"><b>📁 ${esc(folderName(a[0]))}</b><small class="mut">${a.length} hồ sơ</small>
        <button class="btn sm pri" data-r="apf" data-f="${esc(k)}">✓ Duyệt cả gói (${a.length})</button></div>`).join("")}
      <details class="qd" open><summary>Xem từng hồ sơ</summary>${pend.map(r => `<div class="rec"><div><b>${esc(r.h.tag)}</b> <span class="tag">${r.type}</span> ${r.summary ? `<span class="${r.summary.pass ? "ok" : "bad"}">${r.summary.pass ? "Pass" : "Fail"}</span>` : ""} ${stageTag(r)}<br>
        <small class="mut">${esc(r.certNo || "")} · ${esc(stage(r) === "final" ? fullName(r.approved.by) + " đã duyệt kiểm soát" : fullName(r.submitted.by) + " chuyển " + new Date(r.submitted.at).toLocaleString("vi-VN", { hour12: false }))}</small></div>
        <div class="ra"><button class="btn sm" data-r="open" data-id="${r.id}">Mở xem</button></div></div>`).join("")}</details></div>` : "";
    $("#v-records").innerHTML = failCard + queue + `<div class="card"><h2>Hồ sơ <small>(${vis.length})</small></h2>
      <p class="hint">${m && m.role >= 3 ? "Cấp 3: xem toàn bộ hồ sơ." : "Chỉ hiện hồ sơ bạn nhập và hồ sơ được chuyển tới bạn duyệt."} Mỗi thư mục = Người nhập – ngày hiệu chuẩn. Viền xanh: đã duyệt final hết; viền vàng: còn chờ duyệt.</p>
      <input id="rq" placeholder="Tìm tag, số chứng chỉ, model, người nhập…" value="${esc(q)}">
      <div class="btns"><button class="btn sm${mineOnly ? "" : " pri"}" data-r="all">Tất cả</button><button class="btn sm${mineOnly ? " pri" : ""}" data-r="mine">Hồ sơ tôi nhập</button></div>
      <div class="btns"><button class="btn pri" data-r="qcPT">Bảng kiểm tra PT (QC)</button><button class="btn pri" data-r="qcPS">Bảng kiểm tra PS (QC)</button></div><div id="qcout"></div>
      <div class="btns"><button class="btn" data-r="csv">Xuất danh mục CSV</button>${A.cloud() ? "" : `<button class="btn" data-r="backup">Sao lưu JSON</button><label class="btn">Nhập JSON<input type="file" id="imp" accept=".json,application/json" hidden></label>`}</div>
      ${list.length ? folders(list, r => `<div class="rec"><div><b>${esc(r.h.tag)}</b> <span class="tag">${r.type}</span> ${r.summary ? `<span class="${r.summary.pass ? "ok" : "bad"}">${r.summary.pass ? "Pass" : "Fail"}</span>` : ""} ${stageTag(r)}<br>
        <small class="mut">${esc(r.certNo)} · ${esc(r.h.calDate)} · ${esc(r.h.locMode === "free" ? r.h.locFree : r.h.location)} · U=${esc(r.summary ? r.summary.U : "—")} · Người nhập: ${esc(r.owner ? ownerName(r.owner) : "—")}${(r.photos || []).some(x => x.has) ? ` · 📷 ${(r.photos || []).filter(x => x.has).length}` : ""}</small></div>
        <div class="ra"><button class="btn sm" data-r="open" data-id="${r.id}">Mở</button><button class="btn sm" data-r="dup" data-id="${r.id}">Nhân bản</button>${A.can("deleteRecord") ? `<button class="btn sm" data-r="del" data-id="${r.id}">Xoá</button>` : ""}</div></div>`) : `<p class="mut">Chưa có hồ sơ.</p>`}</div>`;
    const imp = $("#imp"); if (imp) imp.onchange = importJson;
    $$("details.fold").forEach(d => d.addEventListener("toggle", () => { if (d.open) openFolders.add(d.dataset.f); else openFolders.delete(d.dataset.f); }));
    const rq = $("#rq"); rq.oninput = () => { const pos = rq.selectionStart; renderRecords(); const n = $("#rq"); n.focus(); n.setSelectionRange(pos, pos); };
    badge();
  }
  // Thư mục "Họ và Tên - dd/mm/yyyy" (NGOC 10/11/2026): người nhập + ngày hiệu chuẩn. Thư mục mới nhất đứng đầu, của mình trước.
  let openFolders = null;
  const folderKey = r => (r.owner ? r.owner.id || r.owner.name : "_none") + "|" + recDay(r);
  const folderName = r => `${r.owner ? ownerName(r.owner) : "Chưa rõ người nhập"} - ${dmy(recDay(r))}`;
  function folders(list, row) {
    const m = A.me(), G = new Map();
    list.forEach(r => { const k = folderKey(r); if (!G.has(k)) G.set(k, { name: folderName(r), day: recDay(r), mine: !!(m && r.owner && r.owner.id === m.id), items: [] }); G.get(k).items.push(r); });
    const keys = [...G.keys()].sort((a, b) => { const A1 = G.get(a), B1 = G.get(b); return (B1.mine - A1.mine) || (B1.day || "").localeCompare(A1.day || "") || A1.name.localeCompare(B1.name, "vi"); });
    if (!openFolders) openFolders = new Set(keys.slice(0, 1));
    return keys.map(k => { const f = G.get(k), n = f.items.length, ok = f.items.filter(isFinal).length, fl = f.items.filter(isFail).length, mq = f.items.filter(myTurn).length;
      const cls = ok === n ? "done" : f.items.some(r => stage(r) !== "draft") ? "wait" : "";
      return `<details class="fold ${cls}" data-f="${esc(k)}"${openFolders.has(k) || keys.length === 1 ? " open" : ""}><summary>📁 <b>${esc(f.name)}</b>${f.mine ? " <span class=\"tag\">của tôi</span>" : ""} <small class="mut">${n} hồ sơ · ${ok}/${n} đã duyệt final</small>${ok === n ? ' <span class="ok">✓ Đã duyệt</span>' : ""}${fl ? ` <span class="bad">⚠ ${fl} không đạt</span>` : ""}</summary>
        <div class="btns">${mq ? `<button class="btn sm pri" data-r="apf" data-f="${esc(k)}">✓ Duyệt cả gói (${mq})</button>` : ""}<button class="btn sm" data-r="csvf" data-f="${esc(k)}">CSV thư mục này</button>${A.cloud() ? "" : `<button class="btn sm" data-r="backupf" data-f="${esc(k)}">Sao lưu JSON thư mục này</button>`}</div>
        ${f.items.map(row).join("")}</details>`; }).join("");
  }
  function onRecordsClick(e) {
    const b = e.target.closest("button[data-r]"); if (!b) return;
    const r = records.find(x => x.id === b.dataset.id);
    if (b.dataset.r === "all" || b.dataset.r === "mine") { mineOnly = b.dataset.r === "mine"; renderRecords(); return; }
    if (b.dataset.r === "open" && r && visible(r)) { rec = normalize(clone(r)); persistCurrent(); go("entry"); }
    if (b.dataset.r === "dup" && r) {
      rec = clone(r); rec.id = "r" + Date.now().toString(36); rec.fv = 2; rec.saved = false; rec.summary = null; rec.h.tag = ""; rec.h.serial = "";
      const b = newRecord(r.type);
      rec.pt = { points: r.pt.points.slice(), rise: ["", "", "", "", ""], fall: ["", "", "", "", ""] }; rec.ps = b.ps; rec.ts = b.ts;
      rec.pg = Object.assign(b.pg, { std: (r.pg || b.pg).std.slice() }); rec.tt = Object.assign(b.tt, { nom: (r.tt || b.tt).nom.slice() }); rec.tg = Object.assign(b.tg, { nom: (r.tg || b.tg).nom.slice() }); rec.rtd = Object.assign(b.rtd, { std: (r.rtd || b.rtd).std.slice() });
      rec.tc = Object.assign(b.tc, { nom: (r.tc || b.tc).nom.slice() }); rec.dpg = Object.assign(b.dpg, { std: (r.dpg || b.dpg).std.slice() });
      delete rec.approved; delete rec.log; rec.sig = { inspector: A.me().name, controller: "" };
      rec.owner = { id: A.me().id, name: A.me().name }; rec.photos = blankPhotos();
      rec.stdAuto = (r.stdAuto || []).filter(p => p.startsWith("rtd.")); fillStd();   // số đọc chuẩn nhiệt tự điền lại theo điểm (v47)
      rec.certNo = autoCertNo(); rec.certAuto = true; persistCurrent(); go("entry"); toast("Đã nhân bản – nhập tag và số đọc mới");
    }
    if (b.dataset.r === "del" && r && A.can("deleteRecord")) {
      if (b.dataset.armed) { P.delRecord(r.id).catch(() => { }); records = records.filter(x => x.id !== r.id); if (window.LabCloud) LabCloud.deleted(r.id); store.set("records", records); renderRecords(); toast("Đã xoá"); }
      else { b.dataset.armed = 1; b.textContent = "Xoá thật?"; b.classList.add("danger"); setTimeout(() => { if (b.isConnected) { delete b.dataset.armed; b.textContent = "Xoá"; b.classList.remove("danger"); } }, 3000); }
    }
    if (b.dataset.r === "qcPT" || b.dataset.r === "qcPS") {
      const type = b.dataset.r.slice(2), q = ($("#rq") && $("#rq").value || "").toLowerCase();
      const items = records.filter(visible).filter(x => x.type === type && (!q || [x.h.tag, x.certNo, x.h.model, x.h.location, x.h.locFree].join(" ").toLowerCase().includes(q)))
        .map(x => { const c = compute(x); const s1 = standById(x.h.stand1), s2 = standById(x.h.stand2); return c.res ? { rec: Object.assign(clone(x), { s1key: s1 ? s1.key : x.h.stand1, s2key: s2 ? s2.key : x.h.stand2 }), res: c.res } : null; })
        .filter(Boolean).sort((a, z) => a.rec.certNo.localeCompare(z.rec.certNo));
      if (!items.length) { toast(`Chưa có hồ sơ ${type} tính được`); return; }
      makePdf("qc", D.qcPages(type, items, settings), `BangKiemTra_${type}_${todayISO()}.pdf`, "#qcout");
      return;
    }
    if (b.dataset.r === "apf") { approveFolder(b); return; }
    if (b.dataset.r === "share") { sharePdf(); return; }
    if (b.dataset.r === "download") { downloadPdf(); return; }
    // backupf / csvf: chỉ hồ sơ trong thư mục của một người, tên file mang tên người đó
    const fk = b.dataset.f, vis = records.filter(visible), sel = fk ? vis.filter(r => folderKey(r) === fk) : vis;
    const fname = fk ? "_" + ((sel[0] ? folderName(sel[0]) : "ChuaRo").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").replace(/[^\w.-]+/g, "_")) : "";
    if (b.dataset.r === "backup" || b.dataset.r === "backupf") {
      P.all().catch(() => ({})).then(all => {
        const photos = {}; Object.keys(all).forEach(k => { if (sel.some(r => k.startsWith(r.id + ":"))) photos[k] = all[k]; });
        saveFile(new Blob([JSON.stringify({ app: "lab-pvgas-services", records: sel, stands, settings, photos }, null, 1)], { type: "application/json" }), `LAB_PVGAS_backup${fname}_${todayISO()}.json`);
      });
    }
    if (b.dataset.r === "csv" || b.dataset.r === "csvf") {
      const head = ["Số chứng chỉ", "Loại", "Location", "Tag", "Mô tả", "Hãng", "Model", "Serial", "Min", "Max", "Đơn vị", "Pset", "Đơn vị Pset", "Độ chính xác", "Ngày HC", "U", "Kết quả", "Kiểm định viên", "Người kiểm soát", "Người nhập liệu", "Duyệt", "Số ảnh"];
      const rows = sel.map(r => [r.certNo, r.type, r.h.locMode === "free" ? r.h.locFree : r.h.location, r.h.tag, r.h.description, r.h.maker, r.h.model, r.h.serial, r.h.min, r.h.max, r.h.unit, r.type === "PS" ? r.h.pset : r.type === "TS" ? r.h.tset : "", r.type === "PS" ? r.h.unitPset : r.type === "TS" ? "°C" : "", r.h.acc, r.h.calDate, r.summary ? r.summary.U : "", r.summary ? (r.summary.pass ? "Đạt (Pass)" : "Không đạt (Fail)") : "", fullName(r.sig.inspector), fullName(r.sig.controller), ownerName(r.owner), fullName(r.approved ? r.approved.by : ""), (r.photos || []).filter(x => x.has).length]);
      const csv = "﻿" + [head].concat(rows).map(a => a.map(v => `"${String(v == null ? "" : v).replace(/"/g, '""')}"`).join(",")).join("\r\n");
      saveFile(new Blob([csv], { type: "text/csv" }), `DanhMuc${fname}_${todayISO()}.csv`);
    }
  }
  // Duyệt cả gói (yêu cầu NGOC 01/11/2026): cấp 2/3 duyệt một lần mọi hồ sơ "Chờ duyệt" trong thư mục của một người.
  // Mỗi hồ sơ vẫn qua đủ kiểm tra như duyệt lẻ; hồ sơ thiếu số liệu bị bỏ qua và báo tên. Bấm 2 lần để xác nhận.
  function approveFolder(b) {
    const m = A.me(); if (!m || m.role < 2) return;
    const list = records.filter(r => folderKey(r) === b.dataset.f && myTurn(r));
    if (!list.length) return;
    let fin = null;
    if (m.role < 3 && list.some(r => stage(r) === "review")) {
      fin = people.find(x => x.id === ($("#apf_final") || {}).value && x.role >= 3);
      if (!fin) { toast("Chọn người duyệt final ở đầu thẻ Chờ tôi duyệt"); return; }
      store.set("lastFinal", fin.id);
    }
    if (!b.dataset.armed) { b.dataset.armed = 1; const t = b.textContent; b.textContent = `Xác nhận duyệt ${list.length} hồ sơ?`; b.classList.add("danger"); setTimeout(() => { if (b.isConnected) { delete b.dataset.armed; b.textContent = t; b.classList.remove("danger"); } }, 4000); return; }
    const now = new Date().toISOString(), skip = [];
    let n = 0;
    list.forEach(r => {
      const c = compute(r);
      if (!r.h.tag || !c.res || !r.sig.inspector || expiredUsed(r).length || certIssues(r).some(t => !t.startsWith(NORANGE))) { skip.push(r.h.tag || r.certNo || "?"); return; }
      const lg = (r.log = r.log || []);
      if (stage(r) === "review") {
        r.sig.controller = m.name; r.approved = { by: m.name, byId: m.id, role: m.role, at: now, batch: true }; delete r.submitted;
        if (fin) { r.finalTo = { id: fin.id, name: fin.name }; addViewer(r, fin.id); lg.push({ at: now, by: m.name, act: `Duyệt kiểm soát (cả gói) → chờ final ${fin.name}` }); }
        else { r.final = { by: m.name, byId: m.id, at: now, batch: true }; lg.push({ at: now, by: m.name, act: "Duyệt kiểm soát + final (cả gói)" }); }
      } else { r.final = { by: m.name, byId: m.id, at: now, batch: true }; delete r.finalTo; lg.push({ at: now, by: m.name, act: "Duyệt final (cả gói)" }); }
      r.flow2 = true; r.updated = now; n++;
      if (rec && rec.id === r.id) rec = normalize(clone(r));
    });
    store.set("records", records); persistCurrent(); renderRecords();
    toast(`Đã duyệt ${n} hồ sơ${skip.length ? ` · bỏ qua ${skip.length} (thiếu số liệu / chuẩn hết hạn / số tem ngoài dải hoặc trùng): ${skip.join(", ")}` : ""}`);
  }
  async function saveFile(blob, name) {
    const file = new File([blob], name, { type: blob.type });
    if (navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file], title: name }); return; } catch (e) { if (e.name === "AbortError") return; } }
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 60000);
  }
  function importJson(e) {
    const f = e.target.files[0]; if (!f) return;
    f.text().then(t => {
      const d = JSON.parse(t); let n = 0;
      // Hồ sơ mới: thêm; hồ sơ đã có (cùng id): thay bằng bản mới hơn – để Gửi duyệt / trả kết quả duyệt qua lại giữa các máy
      let u = 0; const dupSkip = [];
      (d.records || []).forEach(r => {
        const i = records.findIndex(x => x.id === r.id);
        if (i >= 0 && !((r.updated || "") > (records[i].updated || ""))) return;
        const cn = (r.certNo || "").trim() ? certKey(r.certNo) : "";
        if (cn && records.some(x => x.id !== r.id && x.certNo && certKey(x.certNo) === cn)) { dupSkip.push(r.certNo); return; }   // không nhận hồ sơ trùng số GCN

        if (i >= 0) { records[i] = normalize(r); u++; } else { records.push(normalize(r)); n++; }
        Object.keys(d.photos || {}).forEach(k => { if (k.startsWith(r.id + ":")) P.put(k, d.photos[k]).catch(() => { }); });
      });
      store.set("records", records); renderRecords(); toast(`Đã nhập ${n} hồ sơ mới${u ? `, cập nhật ${u} hồ sơ` : ""}${dupSkip.length ? ` · bỏ qua ${dupSkip.length} hồ sơ trùng số GCN: ${dupSkip.join(", ")}` : ""}`);
    }).catch(() => toast("File không hợp lệ"));
  }

  /* ---------- standards tab ---------- */
  let editStand = null, standKind = "";
  const KINDS = { p: "Áp suất", e: "Điện (mA)", t: "Nhiệt độ", r: "Điện trở", v: "Điện áp (mV)" };
  function renderStands() {
    const today = todayISO();
    const row = s => `<div class="rec${s.due && s.due < today ? " stx" : ""}"><div><b>${esc(s.key)}</b> <span class="tag">${KINDS[s.kind] || s.kind}</span>${s.loc ? ` <span class="tag loc">${esc(s.loc)}</span>` : ""} <span class="${s.due && s.due >= today ? "ok" : "bad"}">${s.due && s.due >= today ? "Còn hạn " + s.due : "⛔ Hết hạn " + (s.due || "?") + " – không được dùng, chờ cấp 3 cập nhật GCN mới"}</span><br>
      <small class="mut">${esc(s.name)} · ${esc(s.maker)} ${esc(s.model)} · S/N ${esc(s.serial)} · (${s.min}÷${s.max}) ${esc(s.unit)} · U = ${s.unc} ${esc(s.uncUnit)}${s.rdg ? (s.kind === "p" ? ` + ${s.rdg}%Rdg` : ` · sai số ${s.rdg} ${esc(s.unit)}`) : ""}${s.err && s.kind === "r" ? ` · sai số ${s.err} Ω` : ""}${s.cert ? ` · GCN ${esc(s.cert)}` : ""} · ${esc(s.trace || "")}</small>${dispTxt(s) ? `<br><small class="mut">Hiển thị (số chữ số thập phân): ${esc(dispTxt(s))}</small>` : ""}${s.note ? `<br><small class="${/CHỈ DÙNG|nghi|cần chốt/.test(s.note) ? "bad" : "mut"}">${esc(s.note)}</small>` : ""}</div>
      ${A.can("editStands") ? `<div class="ra"><button class="btn sm" data-s="edit" data-id="${s.id}">Sửa</button></div>` : ""}</div>`;
    const form = editStand ? standForm(editStand) : "";
    $("#v-stands").innerHTML = `${form}<div class="card"><h2>Thư viện chuẩn</h2>
      <p class="hint">Cập nhật 30/10/2026 theo các giấy chứng nhận hiệu chuẩn mới (VMI, Unitek): U là giá trị lớn nhất trên GCN, kèm số GCN và ghi chú chỗ thay đổi. Nhãn "Cà Mau" = chuẩn có trong file Excel của Cà Mau (1.TT_LFS_CM_26, RTD_DK_CM_2026); sửa ô "Nơi đặt" nếu chuẩn đã chuyển chỗ. Khi có GCN mới, sửa U và hạn hiệu chuẩn tại đây.</p>
      <div class="btns">${["", "p", "e", "t", "r", "v"].map(k => `<button class="btn sm${standKind === k ? " pri" : ""}" data-s="kind" data-k="${k}">${k ? KINDS[k] : "Tất cả"}</button>`).join("")}</div>
      ${A.can("editStands") ? `<div class="btns"><button class="btn pri" data-s="add">Thêm chuẩn</button><button class="btn" data-s="reset">Khôi phục danh sách gốc</button></div>` : `<p class="hint">Chỉ Trưởng phòng / Quản trị (cấp 3) được sửa thư viện chuẩn.</p>`}
      ${stands.filter(s => !standKind || s.kind === standKind).map(row).join("")}</div>`;
  }
  function dispTxt(s) {
    if (s.kind === "p") { if (s.name === "Deadweight Tester") return ""; return ["bar", "mbar", "kPa", "MPa", "psi", "kg/cm2"].map(u => { const d = standDec(s, u); return d == null ? "" : `${u} ${d < 0 ? "—" : d}`; }).filter(Boolean).join(" · "); }
    if (s.steps) return s.steps.map(([lim, st]) => `≤${lim} ${s.unit}: ${decOf(st)}`).join(" · ");
    const d = standDec(s, s.unit); return d == null ? "" : `${s.unit} ${d}`;
  }
  function standForm(s) {
    const f = (lab, k, o = {}) => `<label class="f${o.wide ? " wide" : ""}"><span>${lab}</span>${o.options ? `<select data-k="${k}">${o.options.map(v => `<option${String(v) === String(s[k]) ? " selected" : ""}>${v}</option>`).join("")}</select>` : `<input data-k="${k}" value="${esc(s[k] == null ? "" : s[k])}" ${o.type ? `type="${o.type}"` : ""} ${o.num ? 'inputmode="decimal"' : ""}>`}</label>`;
    return `<div class="card hl"><h2>${s._new ? "Thêm chuẩn" : "Sửa chuẩn"}</h2><div class="grid" id="sf">
      ${f("Loại (p áp suất · e điện mA · t nhiệt độ · r điện trở)", "kind", { options: ["p", "e", "t", "r"] })}${f("Mã chọn nhanh (key)", "key")}${f("Tên thiết bị", "name", { wide: 1 })}${f("Model", "model")}${f("Serial", "serial")}${f("Hãng", "maker")}
      ${f("Min", "min", { num: 1 })}${f("Max", "max", { num: 1 })}${f("Đơn vị", "unit", { options: PUNITS.concat(["mA", "°C", "Ω"]) })}
      ${f("ĐKĐBĐ (U)", "unc", { num: 1 })}${f("Đơn vị của U", "uncUnit", { options: ["%", "ppm"].concat(PUNITS, ["mA", "°C", "Ω"]) })}${f("% of Reading", "rdg", { num: 1 })}
      ${s.kind === "e" ? f("Phạm vi in trên chứng chỉ (Max)", "certRange", { num: 1 }) : ""}
      ${s.kind === "e" || s.kind === "r" ? f("Sai số / phân giải (TT N17 · RTD O14)", "err", { num: 1 }) : ""}
      ${s.kind === "t" ? f("Độ ổn định (°C)", "stab", { num: 1 }) + f("Đồng đều hướng kính – radial (°C)", "radial", { num: 1 }) + f("Đồng đều hướng trục – axial (°C)", "axial", { num: 1 }) + f("Tên thiết bị tạo nhiệt (QTG)", "heat") : ""}${f("Độ chính xác (text)", "accuracy")}${f("Dẫn xuất chuẩn", "trace")}${f("Hạn hiệu chuẩn", "due", { type: "date" })}${f("Số giấy chứng nhận", "cert")}${f("Nơi đặt (vd. Cà Mau, Vũng Tàu)", "loc")}${f("Ghi chú", "note", { wide: 1 })}
      </div><div class="btns"><button class="btn pri" data-s="save">Lưu chuẩn</button><button class="btn" data-s="cancel">Huỷ</button>${s._new ? "" : `<button class="btn" data-s="delete">Xoá chuẩn</button>`}</div></div>`;
  }
  function onStandsClick(e) {
    const b = e.target.closest("button[data-s]"); if (!b) return;
    const a = b.dataset.s;
    if (a !== "kind" && !A.can("editStands")) return;
    if (a === "edit") { editStand = clone(standById(b.dataset.id)); renderStands(); window.scrollTo(0, 0); }
    if (a === "add") { editStand = { _new: true, id: "s" + Date.now().toString(36), kind: "p", key: "", name: "", model: "", serial: "", maker: "", min: 0, max: 0, unit: "bar", unc: 0, uncUnit: "bar", rdg: 0, trace: "Viện ĐLVN (VMI)", due: "", cert: "", loc: "", note: "" }; renderStands(); }
    if (a === "cancel") { editStand = null; renderStands(); }
    if (a === "kind") { standKind = b.dataset.k; renderStands(); }
    if (a === "delete") { if (!b.dataset.armed) { b.dataset.armed = 1; b.textContent = "Xoá thật?"; return; } stands = stands.filter(s => s.id !== editStand.id); store.set("stands", stands); editStand = null; renderStands(); }
    if (a === "save") {
      $$("#sf [data-k]").forEach(i => { const k = i.dataset.k; editStand[k] = ["min", "max", "unc", "rdg", "certRange", "err", "stab", "radial", "axial"].includes(k) ? num(i.value) || 0 : i.value; });
      if (!editStand.key) editStand.key = `${editStand.model} (${editStand.serial})`;
      const isNew = editStand._new; delete editStand._new;
      if (isNew) stands.push(editStand); else stands = stands.map(s => s.id === editStand.id ? editStand : s);
      store.set("stands", stands); editStand = null; renderStands(); toast("Đã lưu chuẩn");
    }
    if (a === "reset") { if (!b.dataset.armed) { b.dataset.armed = 1; b.textContent = "Chắc chắn khôi phục?"; return; } stands = clone(SEED.stands); store.set("stands", stands); renderStands(); toast("Đã khôi phục"); }
  }

  /* ---------- settings tab ---------- */
  // Dung lượng Supabase (cấp 3): gói Free 500 MB cơ sở dữ liệu + 1 GB kho ảnh. Cần chạy 07_v57_dung_luong.sql một lần.
  const mb = b => (b / 1048576).toFixed(b < 1e7 ? 1 : 0) + " MB";
  function usageCard() {
    if (!A.cloud() || !A.can("settings")) return "";
    return `<div class="card" id="usagecard"><h2>📊 Dung lượng máy chủ</h2><p class="hint" id="usageout">Đang đọc…</p></div>`;
  }
  function fillUsage() {
    const el = $("#usageout"); if (!el || !window.LabCloud || !LabCloud.usage) return;
    LabCloud.usage().then(u => {
      if (!el.isConnected) return; if (!u) { el.textContent = "Không đọc được (chỉ cấp 3)."; return; }
      const dbp = u.db_bytes / (500 * 1048576) * 100, php = u.photo_bytes / (1024 * 1048576) * 100;
      const row = (t, used, lim, p) => `<div class="mut">${t}: <b>${used}</b> / ${lim} (${p.toFixed(1)}%)</div><div style="height:8px;border-radius:4px;background:var(--sunk);margin:3px 0 10px;overflow:hidden"><div style="height:100%;width:${Math.min(100, p)}%;background:${p > 80 ? "#c03939" : p > 60 ? "#d9a21b" : "#2f8f4e"}"></div></div>`;
      el.innerHTML = row(`Cơ sở dữ liệu (${u.records} hồ sơ)`, mb(u.db_bytes), "500 MB", dbp) + row(`Kho ảnh (${u.photos} ảnh)`, mb(u.photo_bytes), "1 GB", php) + `<span class="hint">Giới hạn của gói Free. Cơ sở dữ liệu gồm cả phần hệ thống của Supabase. Quá 80% thì xuất lưu trữ rồi dọn.</span>`;
    }).catch(e => { el.innerHTML = `<span class="bad">Chưa đọc được: ${esc(e.message || e)}</span><br><span class="hint">Chạy file 07_v57_dung_luong.sql trong Supabase SQL Editor một lần.</span>`; });
  }
  function renderSettings() {
    const f = (lab, p, wide) => `<label class="f${wide ? " wide" : ""}"><span>${lab}</span><input data-sp="${p}" value="${esc(getPath(settings, p))}"></label>`;
    const sel = (lab, p, opts) => `<label class="f"><span>${lab}</span><select data-sp="${p}">${opts.map(([v, t]) => `<option value="${v}"${!!getPath(settings, p) === !!v ? " selected" : ""}>${t}</option>`).join("")}</select></label>`;
    const tail = `<div class="card"><h2>Tự kiểm tra công thức</h2><p class="hint">Chạy lại 2 ca thật từ file DGCP 10/2026 (PT-1506A, PSHH-0522) và so sánh từng số.</p>
        <div class="btns"><button class="btn pri" data-t="selftest">Chạy kiểm tra</button></div><div id="stout"></div></div>
      <div class="card"><h2>Về ứng dụng</h2><p class="hint">LAB PVGAS Services · bản thử nghiệm PT, PS, PG, TS, TT, RTD, TG · ${A.cloud() ? "dữ liệu đồng bộ qua máy chủ Supabase; vẫn nhập liệu được khi mất mạng, có mạng lại tự đồng bộ." : "chạy offline, dữ liệu chỉ lưu trên máy này (dùng Sao lưu JSON ở tab Hồ sơ)."}</p></div>`;
    if (!A.can("settings")) { $("#v-settings").innerHTML = A.accountCard() + freeCard() + (canCheck() ? checkCard() : "") + `<div class="card"><p class="hint">Cài đặt chứng chỉ chỉ dành cho Trưởng phòng / Quản trị (cấp 3).</p></div>` + tail; return; }
    $("#v-settings").innerHTML = A.accountCard() + backupCard() + usageCard() + freeCard() + rangesCard() + checkCard() + `<div class="card"><h2>Người ký trang 1 chứng chỉ</h2><div class="grid">
        ${f("Chức danh trái", "sig1Title")}${f("Tên", "sig1Name")}${f("Chức danh trái (EN)", "sig1TitleEn", 1)}
        ${f("Chức danh phải", "sig2Title")}${f("Tên", "sig2Name")}${f("Chức danh phải (EN)", "sig2TitleEn", 1)}
        ${f("Nơi cấp (dòng ngày)", "place")}${f("Chu kỳ HC (tháng)", "dueMonths")}
        ${sel("Ngày cấp trên chứng chỉ", "issueDayBlank", [["1", "Để trống ngày (ghi tay) như mẫu"], ["", "In ngày cấp đã nhập"]])}
        ${sel("Logo VILAS / ilac dưới chữ ký", "showAccred", [["1", "Có"], ["", "Không"]])}</div></div>
      <div class="card"><h2>Tiêu đề & chân trang (mẫu 2026)</h2><div class="grid">
        ${f("Dòng 1", "certLines.0", 1)}${f("Dòng 2 (tên công ty)", "certLines.1", 1)}${f("Mã đỏ cạnh tên", "companyTag")}${f("Tên phòng (QTG PT)", "labName")}
        ${f("Tên tiếng Anh", "certLines.2", 1)}${f("Add (EN)", "certLines.3", 1)}${f("Tel (chứng chỉ)", "certLines.4", 1)}
        ${f("Địa chỉ (QTG PS)", "addrVN", 1)}${f("Add (QTG)", "addrEN", 1)}
        ${f("Chân trang (VN)", "footerVN", 1)}${f("Chân trang (EN)", "footerEN", 1)}
        ${sel("Cảnh báo chuẩn hết hạn", "warnExpired", [["", "Tắt (tạm thời)"], ["1", "Bật – đóng dấu BẢN NHÁP"]])}
        ${sel("In logo đầu trang", "showLogo", [["1", "Có"], ["", "Không (giấy in sẵn logo)"]])}</div></div>
      <div class="card"><h2>Mặc định theo loại</h2><div class="grid">
        ${f("PT – Phương pháp", "PT.procedure")}${f("PT – Mã biểu mẫu QTG", "PT.qtgForm")}${f("PT – Mã bảng Uncer", "PT.form")}${f("PT – Tiền tố CC / BB", "PT.prefix")}
        ${f("PT – Môi trường (chứng chỉ)", "PT.env", 1)}${f("PT – Nhiệt độ QTG", "PT.qtgTemp")}${f("PT – Độ ẩm QTG", "PT.qtgHum")}
        ${f("PS – Phương pháp", "PS.procedure")}${f("PS – Mã biểu mẫu QTG", "PS.qtgForm")}${f("PS – Mã bảng Uncer", "PS.form")}${f("PS – Tiền tố CC / BB", "PS.prefix")}
        ${f("PS – Môi trường (chứng chỉ)", "PS.env", 1)}${f("PS – Nhiệt độ QTG", "PS.qtgTemp")}${f("PS – Độ ẩm QTG", "PS.qtgHum")}
        ${NEWT.map(t => `${f(`${t} – Phương pháp`, `${t}.procedure`)}${f(`${t} – Mã biểu mẫu QTG`, `${t}.qtgForm`)}${t === "PG" ? f("PG – Ký hiệu series (N256.yy<b>A</b>)", "PG.series") : f(`${t} – Mã bảng Uncer`, `${t}.form`)}${f(`${t} – Tiền tố CC`, `${t}.prefix`)}${f(`${t} – Tiền tố BB`, `${t}.bbPrefix`)}
          ${t === "PG" ? f("PG – Phương pháp in GCN (VN)", "PG.procVN", 1) + f("PG – Phương pháp in GCN (EN)", "PG.procEN", 1) : f(`${t} – Môi trường (chứng chỉ)`, `${t}.env`, 1)}${f(`${t} – Nhiệt độ QTG`, `${t}.qtgTemp`)}${f(`${t} – Độ ẩm QTG`, `${t}.qtgHum`)}${t === "TC" ? f("TC – U thiết bị bù đầu tự do (°C, uch7 = U/2; 0 = bỏ)", "TC.uCJ") : ""}`).join("")}</div>
        <div class="btns"><button class="btn" data-t="resetset">Về mặc định</button></div></div>` + mocCard() + tail;
  }
  function mocCard() {
    const on = !!settings.mocKey;
    return `<div class="card" id="moc"><h2>Mộc ẩn & Kiểm tra GCN</h2>
      <p class="hint">Khi có khóa Phòng, mọi PDF xuất ra đều mang một mã ẩn (lưới chấm gần trắng trong ảnh trang + thông tin ẩn của file) và được ghi dấu vân tay SHA-256 vào nhật ký máy này. Mắt thường không thấy; chỉ kiểm tra được bằng khóa Phòng. Giữ khóa ở nơi an toàn: mất khóa thì không kiểm tra được GCN cũ.</p>
      <p class="${on ? "ok" : "bad"}"><b>${on ? "Đang bật: PDF xuất ra có mộc ẩn" : "Chưa có khóa: PDF chưa gắn mộc ẩn"}</b></p>
      <div class="grid"><label class="f wide"><span>Khóa Phòng (bí mật)</span><input type="password" id="mockey" data-sp="mocKey" value="${esc(settings.mocKey || "")}" autocomplete="off"></label></div>
      <div class="btns"><button class="btn" data-t="mocshow">Hiện / ẩn khóa</button><button class="btn" data-t="mocnew">${on ? "Đổi khóa mới" : "Tạo khóa"}</button></div>
      <div class="grid"><label class="f wide"><span>Cấp được dùng "Kiểm tra nguyên bản GCN"</span><select data-sp="mocCheckLevel">${[[1, "Tất cả (cấp 1, 2, 3)"], [2, "Cấp 2 và 3"], [3, "Chỉ cấp 3"]].map(([v, t]) => `<option value="${v}"${checkLevel() === v ? " selected" : ""}>${t}</option>`).join("")}</select></label></div></div>`;
  }
  const checkLevel = () => [1, 2, 3].includes(+settings.mocCheckLevel) ? +settings.mocCheckLevel : 1;
  const canCheck = () => !!A.me() && (+A.me().role || 0) >= checkLevel();
  function checkCard() {
    return `<div class="card" id="mocchk"><h2>Kiểm tra nguyên bản GCN</h2>
      <p class="hint">Tải lên file PDF GCN (bản app xuất hoặc bản đã ký số trên cks.pvgas.com.vn). App đọc mộc ẩn trong ảnh trang và thông tin ẩn của file, so với khóa Phòng.
      Chữ ký số còn hiệu lực hay không thì kiểm tra bằng mã QR / cks.pvgas.com.vn hoặc Adobe Reader.</p>
      ${settings.mocKey ? "" : `<p class="bad"><b>Máy này chưa có khóa Phòng: chỉ đọc được mã ẩn, chưa xác nhận được đúng/sai. Nhờ cấp 3 nhập khóa trong Cài đặt › Mộc ẩn.</b></p>`}
      <label class="btn pri" style="display:inline-block">Chọn file PDF để kiểm tra<input type="file" id="mocfile" accept="application/pdf,.pdf" hidden></label>
      <div id="mocout"></div></div>`;
  }
  async function mocCheck(file) {
    const out = $("#mocout"); out.innerHTML = `<p class="mut">Đang kiểm tra ${esc(file.name)}…</p>`;
    try {
      const r = await MOC.verify(new Uint8Array(await file.arrayBuffer()), settings.mocKey, store.get("pdfLog", []));
      if (!settings.mocKey && (r.img.found || r.meta)) r.st = "nokey";
      const T = { nokey: ["warn", "⚠ CÓ MỘC ẨN nhưng máy này chưa có khóa Phòng nên chưa xác nhận được đúng/sai"], ok: ["ok", "✔ ĐÚNG: file do Phòng cấp, còn nguyên vẹn"],
        signed: ["ok", `✔ MỘC ẨN ĐÚNG · ĐÃ KÝ SỐ (${r.sigs} chữ ký): nội dung trùng bản app xuất. Kiểm tra hiệu lực chữ ký trên cks.pvgas.com.vn`], changed: ["warn", "⚠ MỘC ĐÚNG NHƯNG FILE KHÁC BẢN ĐÃ CẤP: đã bị chỉnh sửa, hoặc được xuất từ máy khác"],
        bad: ["bad", r.img.found && r.meta && r.img.code === r.meta.code ? "✖ MỘC SAI: mã ẩn không đúng khóa Phòng (GCN giả, hoặc đóng mộc bằng khóa khác / khóa cũ)" : "✖ MỘC SAI: thông tin trên file không khớp mã ẩn (đã bị sửa)"], none: ["bad", "✖ KHÔNG CÓ MỘC ẨN: file không xuất từ app (hoặc đã bị dựng lại)"] }[r.st];
      const f = r.fields, row = (a, b) => `<tr><td style="text-align:left">${a}</td><td style="text-align:left">${b}</td></tr>`;
      out.innerHTML = `<div class="verdict ${T[0] === "ok" ? "ok" : (T[0] === "warn" ? "warn" : "ko")}">${T[1]}</div>
        <table class="mini">${row("File", esc(file.name))}${row("Mã ẩn đọc từ ảnh trang", r.img.found ? `${esc(r.img.code)} (${r.img.pages} trang, đồng thuận ${(r.img.agree * 100).toFixed(1)}%)` : "không thấy")}
        ${row("Mã trong thông tin file", r.meta ? esc(r.meta.code) : "không có")}${row("Mã đúng theo khóa Phòng", esc(r.expect || "—"))}
        ${row("Chữ ký số trong file", r.sigs ? `${r.sigs} chữ ký (ảnh trang và thông tin ẩn không bị hệ thống ký số thay đổi)` : "không có")}
        ${row("Vân tay SHA-256", `${esc(r.sha.slice(0, 16))}… ${r.hit ? `khớp bản xuất ${esc(r.hit.at.slice(0, 16).replace("T", " "))} bởi ${esc(r.hit.by)}` : "không có trong nhật ký máy này"}`)}
        ${f ? row(r.st === "bad" ? "Thông tin ghi trong file (không khớp mã ẩn)" : (r.from === "log" ? "Nội dung gốc (theo nhật ký máy này)" : "Nội dung gốc khi cấp"), esc(`${f.certNo} · ${f.type} · ${f.tag} · S/N ${f.serial} · cấp ${f.issueDate} · ${f.result}${f.approvedBy ? " · duyệt: " + f.approvedBy : ""}`)) : ""}</table>
        ${f && r.st !== "bad" ? `<p class="hint">Đối chiếu nội dung gốc với số in trên GCN: khác nhau là GCN đã bị sửa.</p>` : ""}`;
    } catch (e) { out.innerHTML = `<p class="bad">Không đọc được file: ${esc(e.message)}</p>`; }
  }
  function onSettingsInput(e) {
    if (e.target.id === "mocfile") { if (e.type === "change" && e.target.files[0]) { if (canCheck()) mocCheck(e.target.files[0]); e.target.value = ""; } return; }
    if (e.type === "change" && A.onAccountChange(e, renderSettings, toast)) return;
    const p = e.target.dataset.sp; if (!p || !A.can("settings")) return;
    let v = e.target.value; if (["showLogo", "warnExpired", "issueDayBlank", "showAccred"].includes(p)) v = !!v; if (p === "dueMonths") v = num(v) || 12;
    const ks = p.split("."); const last = ks.pop(); const t = ks.reduce((a, k) => a[k], settings); t[last] = v;
    store.set("settings", settings);
  }
  /* ---------- sao lưu định kỳ (cấp 3, NGOC 10/11/2026) ----------
   * Mỗi tuần cấp 3 bấm Sao lưu toàn bộ: 1 file chứa mọi hồ sơ trên máy chủ + thư viện chuẩn + cài đặt + danh sách người dùng.
   * Quá 7 ngày chưa sao lưu thì nhắc đỏ ở Cài đặt và nhắc khi đăng nhập. Ảnh bằng chứng nằm trong kho ảnh Supabase, không nằm trong file. */
  const BK_DAYS = 7;
  const bkAge = () => { const t = store.get("lastBackup", ""); return t ? Math.floor((Date.now() - new Date(t)) / 864e5) : null; };
  function backupCard() {
    if (!A.cloud() || !A.can("settings")) return "";
    const age = bkAge(), late = age === null || age >= BK_DAYS;
    return `<div class="card${late ? " failc" : ""}"><h2>💾 Sao lưu dữ liệu máy chủ</h2>
      <p class="${late ? "bad" : "hint"}">${age === null ? "Máy này chưa sao lưu lần nào." : `Lần sao lưu gần nhất trên máy này: ${esc(new Date(store.get("lastBackup")).toLocaleString("vi-VN", { hour12: false }))} (${age} ngày trước).`}${late ? " Đã đến hạn sao lưu (mỗi 7 ngày)." : ""}</p>
      <div class="btns"><button class="btn pri" data-t="bkall">⬇ Sao lưu toàn bộ (1 file)</button><label class="btn">Khôi phục từ file sao lưu<input type="file" id="bkrest" accept=".json,application/json" hidden></label></div>
      <p class="hint">File gồm toàn bộ hồ sơ, thư viện chuẩn, cài đặt và danh sách người dùng (không có PIN). Lưu file vào ổ D:/ổ công ty và 1 USB, giữ ít nhất 8 bản gần nhất. Khôi phục: ghi đè hồ sơ trên máy chủ bằng nội dung trong file, chỉ dùng khi mất dữ liệu.</p></div>`;
  }
  async function backupNow(b) {
    b.disabled = true; toast("Đang tải dữ liệu từ máy chủ…");
    try {
      const d = await LabCloud.backupAll();
      await saveFile(new Blob([JSON.stringify(d)], { type: "application/json" }), `LAB_PVGAS_SaoLuu_${todayISO()}.json`);
      store.set("lastBackup", new Date().toISOString()); toast(`Đã sao lưu ${d.records.length} hồ sơ`); renderSettings();
    } catch (x) { toast("Không sao lưu được: " + (x.message || x)); b.disabled = false; }
  }
  function onRestoreFile(e) {
    const f = e.target.files[0]; if (!f || !A.can("settings")) return;
    f.text().then(async t => {
      const d = JSON.parse(t);
      if (!confirm(`Khôi phục ${(d.records || []).length} hồ sơ từ bản sao lưu ${d.at || ""}? Hồ sơ cùng mã trên máy chủ sẽ bị ghi đè.`)) return;
      const n = await LabCloud.restoreAll(d); toast(`Đã khôi phục ${n} hồ sơ – đang đồng bộ`);
    }).catch(x => toast("Không khôi phục được: " + (x.message || x)));
  }
  /* Bảng dải số (cấp 3): sửa tên, từ số, đến số, mã công trình gắn với dải (cách nhau dấu phẩy). Lưu vào Cài đặt chung, đồng bộ cho mọi người. */
  let rgOpen = false;
  /* Bảng số còn trống theo site (NGOC 10/11/2026): mỗi dải → các khoảng A–B chưa dùng trong năm đang chọn (mọi loại dùng chung dải). */
  let frOpen = false, frYY = null, srvUsed = {};
  function usedTails(pool, exceptId) {
    const u = new Set(srvUsed[pool] || []);
    records.forEach(r => { if (r.certNo && !r.deleted && r.id !== exceptId) { const n = poolTail(r.certNo, pool); if (!isNaN(n)) u.add(n); } });
    return u;
  }
  function freeRuns(g, used) {
    const out = []; let a = null;
    for (let n = g.lo; n <= g.hi + 1; n++) {
      const free = n <= g.hi && !used.has(n);
      if (free && a == null) a = n; else if (!free && a != null) { out.push([a, n - 1]); a = null; }
    }
    return out;
  }
  const runTxt = ([a, b]) => a === b ? pad4(a) : `${pad4(a)}–${pad4(b)}`;
  function loadUsed(pool, then) {
    if (!A.cloud() || !window.LabCloud || !LabCloud.certUsed) return;
    LabCloud.certUsed(pool).then(v => { srvUsed[pool] = v || []; then && then(); }).catch(() => {});
  }
  function freeCard() {
    const y0 = Number(todayISO().slice(2, 4)); if (frYY == null) frYY = y0;
    const pool = `CN.${String(frYY).padStart(2, "0")}.`;
    if (frOpen && srvUsed[pool] == null) { srvUsed[pool] = []; loadUsed(pool, () => { if (frOpen) renderSettings(); }); }
    const used = usedTails(pool);
    const rows = RANGES().slice().sort((a, b) => a.lo - b.lo).map(g => {
      const runs = freeRuns(g, used), nFree = runs.reduce((t, [a, b]) => t + b - a + 1, 0), size = g.hi - g.lo + 1;
      const sites = (g.locs || []).map(c => siteName(c)).join(", ");
      return `<tr${nFree === 0 ? ' class="bad"' : nFree < size * 0.1 ? ' class="warnrow"' : ""}><td>${esc(g.grp)}</td><td>${esc(g.name)}${sites ? `<br><small class="mut">${esc(sites)}</small>` : ""}</td>
        <td>${pad4(g.lo)}–${pad4(g.hi)}</td><td>${size - nFree}</td><td><b>${nFree}</b></td><td>${runs.length ? esc(runs.map(runTxt).join(", ")) : "HẾT SỐ"}</td></tr>`;
    }).join("");
    const yOpts = [y0 - 1, y0, y0 + 1].map(y => `<option value="${y}"${y === frYY ? " selected" : ""}>20${y}</option>`).join("");
    return `<details class="card" id="frcard"${frOpen ? " open" : ""}><summary><h2>📋 Số tem / GCN còn trống theo site</h2></summary>
      <p class="hint">Các khoảng số chưa dùng trong từng dải (PT, PS, TT… dùng chung một dải; số đã cấp cho loại này thì loại khác không dùng lại). ${A.cloud() ? "Tính trên toàn hệ thống (máy chủ) + hồ sơ trên máy này." : "Chỉ tính hồ sơ trên máy này."} PG (N256…) không tính ở đây.</p>
      <div class="btns"><label class="f"><span>Năm</span><select id="fryy">${yOpts}</select></label>${A.cloud() ? '<button class="btn sm" data-t="frreload">↻ Tải lại từ máy chủ</button>' : ""}</div>
      <div class="tblwrap"><table class="entry rgt"><thead><tr><th>Khối</th><th>Site / công trình</th><th>Dải</th><th>Đã dùng</th><th>Còn trống</th><th>Khoảng số trống</th></tr></thead><tbody>${rows}</tbody></table></div></details>`;
  }
  function rangesCard() {
    const known = new Set(SEED.locations.map(l => l[0])), used = new Set(RANGES().flatMap(g => g.locs || []));
    const free = SEED.locations.filter(l => !l[5] && !used.has(l[0])).map(l => l[0]);
    const rows = (settings.ranges || []).map((g, i) => `<tr><td><input data-rg="${i}.grp" value="${esc(g.grp)}" size="6"></td><td><input data-rg="${i}.name" value="${esc(g.name)}"></td>
      <td><input data-rg="${i}.lo" value="${g.lo}" inputmode="numeric" size="5"></td><td><input data-rg="${i}.hi" value="${g.hi}" inputmode="numeric" size="5"></td>
      <td><input data-rg="${i}.locs" value="${esc((g.locs || []).join(", "))}"${(g.locs || []).some(c => !known.has(c)) ? ' class="bad"' : ""}>${g.note ? `<br><small class="mut">${esc(g.note)}</small>` : ""}</td>
      <td><button class="btn sm" data-t="rgdel" data-i="${i}">Xoá</button></td></tr>`).join("");
    const ov = []; const R2 = RANGES().slice().sort((a, b) => a.lo - b.lo);
    for (let i = 1; i < R2.length; i++) if (R2[i].lo <= R2[i - 1].hi) ov.push(`${R2[i - 1].name} ↔ ${R2[i].name}`);
    return `<details class="card" id="rgcard"${rgOpen ? " open" : ""}><summary><h2>🔢 Dải số chứng chỉ / tem theo công trình <small>(${RANGES().length})</small></h2></summary>
      <p class="hint">Theo bảng phân dải của anh Khai (2025_Rev1). Số GCN và QTG cùng đuôi trong dải của công trình; năm (26, 27…) tự lấy theo ngày hiệu chuẩn. Cột "Công trình" là mã trong danh mục, cách nhau dấu phẩy.</p>
      ${ov.length ? `<p class="bad">⚠ Dải chồng nhau: ${esc(ov.join("; "))}</p>` : ""}
      ${free.length ? `<p class="bad">Công trình chưa có dải: ${esc(free.join(", "))}</p>` : ""}
      <div class="tblwrap"><table class="entry rgt"><thead><tr><th>Khối</th><th>Công trình / site</th><th>Từ</th><th>Đến</th><th>Công trình (mã)</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>
      <div class="btns"><button class="btn" data-t="rgadd">＋ Thêm dải</button></div></details>`;
  }
  function onRangeInput(e) {
    const k = e.target.dataset.rg; if (!k || !A.can("settings")) return;
    const [i, f] = k.split("."), g = settings.ranges[Number(i)]; if (!g) return;
    const v = e.target.value;
    g[f] = f === "lo" || f === "hi" ? (parseInt(v, 10) || 0) : f === "locs" ? v.split(",").map(x => x.trim()).filter(Boolean) : v;
    store.set("settings", settings); srvMax = {};
  }
  function onSettingsClick(e) {
    if (e.target.closest("button[data-u]")) { A.onAccountClick(e, renderSettings, toast); return; }
    const b = e.target.closest("button[data-t]"); if (!b) return;
    if (b.dataset.t === "resetset" && A.can("settings")) { settings = clone(SEED.settings); store.set("settings", settings); renderSettings(); toast("Đã về mặc định"); }
    if (b.dataset.t === "selftest") $("#stout").innerHTML = selfTest();
    if (b.dataset.t === "bkall") backupNow(b);
    if (b.dataset.t === "frreload") { srvUsed = {}; frOpen = true; renderSettings(); }
    if (b.dataset.t === "rgadd" && A.can("settings")) { settings.ranges = (settings.ranges || []).concat([{ id: "rg" + Date.now().toString(36), grp: "", name: "Dải mới", lo: 0, hi: 0, locs: [], note: "" }]); store.set("settings", settings); rgOpen = true; renderSettings(); }
    if (b.dataset.t === "rgdel" && A.can("settings")) { if (!b.dataset.armed) { b.dataset.armed = 1; b.textContent = "Xoá thật?"; return; } settings.ranges.splice(Number(b.dataset.i), 1); store.set("settings", settings); rgOpen = true; renderSettings(); }
    if (b.dataset.t === "mocshow") { const i = $("#mockey"); i.type = i.type === "password" ? "text" : "password"; }
    if (b.dataset.t === "mocnew" && A.can("settings")) {
      if (settings.mocKey && !b.dataset.armed) { b.dataset.armed = 1; b.textContent = "Chắc chắn đổi? GCN cũ cần khóa cũ để kiểm tra"; return; }
      const a = new Uint8Array(18); crypto.getRandomValues(a); settings.mocKey = btoa(String.fromCharCode(...a)).replace(/[+/=]/g, "x");
      store.set("settings", settings); renderSettings(); $("#mockey").type = "text"; $("#moc").scrollIntoView(); toast("Đã tạo khóa: hãy chép và cất khóa ở nơi an toàn");
    }
  }
  function selfTest() {
    // Chuẩn đóng băng đúng như sheet "Stand Ref" của file Excel 2026 dùng để đối chiếu (không lấy từ danh mục đang dùng, vì U đã cập nhật theo GCN mới)
    const FROZEN = {
      "700G05": { min: -1, max: 2, unit: "bar", unc: 0.0001, uncUnit: "bar", rdg: 0.05 },
      "754 (66830024)": { min: 0, max: 30, unit: "mA", unc: 0.017, uncUnit: "%", rdg: 0 },
      "APM30 (322077 - 30 bar)": { min: 0, max: 30, unit: "bar", unc: 0.002, uncUnit: "bar", rdg: 0 }
    };
    const st = id => clone(FROZEN[id]);
    // PT_DGCP_10_2026.xls › Data112 (CN.PT.26.2885) và PS_DGCP_10_2026.xls › Data133 (CN.PS.26.2744)
    const pt = C.calcPT({ min: 0, max: 100, unit: "kPa", acc: 0.25, points: [0, 25, 50, 75, 100], rise: [4.035, 8.03, 12.02, 16.006, 20.001], fall: [4.031, 8.013, 12.023, 16.019, 20.005], stand1: st("700G05"), stand2: st("754 (66830024)") });
    const expPT = [0.0539295692323056, 0.0491778103547832, 0.0532773550631725, 0.06456358905212, 0.0800524730260224];
    const ps = C.calcPS({ pset: 300, unitPset: "kPa", acc: 1, high: [299.91, 299.71, 300.06, 299.95, 300.03], low: [220.4, 220.31, 220.47, 220.43, 220.46], stand1: st("APM30 (322077 - 30 bar)") });
    const line = (lab, got, exp) => { const ok = Math.abs(got - exp) <= Math.abs(exp) * 1e-9; return `<tr><td>${lab}</td><td>${Number(got).toPrecision(12)}</td><td>${exp}</td><td class="${ok ? "ok" : "bad"}">${ok ? "khớp" : "LỆCH"}</td></tr>`; };
    return `<table class="mini"><thead><tr><th>Ca</th><th>App</th><th>Excel 2026</th><th></th></tr></thead><tbody>
      ${pt.rows.map((r, i) => line(`PT-1506A Uexp điểm ${i + 1}`, r.U, expPT[i])).join("")}
      ${line("PT-1506A a", C.xround(pt.a, 4), 4.0321)}${line("PT-1506A b", C.xround(pt.b, 6), 0.159724)}
      ${line("PSHH-0522 U", ps.U, 0.234980850283593)}</tbody></table>
      <p class="hint">PT-1506A: ${pt.pass ? "Pass" : "Fail"}, in U<sub>exp-max</sub> = ${D.uTxt("PT", pt.Umax)} kPa (quy tắc 30/10/2026: 2 chữ số có nghĩa, làm tròn lên; mẫu cũ in 0,080). PSHH-0522: ${ps.pass ? "Pass" : "Fail"}, chiều ${ps.dir}, in U = ${ps.Utext.text} kPa (Excel 0.24).</p>`;
  }

  /* ---------- navigation ---------- */
  function renderFormulas() {
    const el = $("#v-formulas"); el.innerHTML = window.LabFormulas.render();
    el.onclick = e => { const b = e.target.closest("[data-fj]"); if (!b) return; const d = $("#f-" + b.dataset.fj); d.open = true; d.scrollIntoView({ behavior: "smooth", block: "start" }); };
  }
  function renderRefs() { const m = A.me(); $("#v-refs").innerHTML = window.LabRefs.render(settings, m ? m.role : 0); }
  /* ---------- Báo cáo (v56, NGOC 12/11/2026): chỉ cấp 3 / admin. Lọc theo công trình, loại, người nhập, gói hồ sơ, ngày, trạng thái;
   * xem tổng số thiết bị đã làm; xuất Excel tổng hợp + chi tiết, danh sách theo mẫu DGCP và Excel Uncer riêng từng loại (ZIP). ---------- */
  const REP = { view: "over", year: new Date().getFullYear(), dueWin: 90, site: "", type: "", owner: "", folder: "", from: "", to: "", status: "final" };
  const repSite = r => (r.h.locMode === "free" ? r.h.locFree : r.h.location) || "(chưa chọn công trình)";
  const repStat = r => { const s = stage(r); return s === "done" ? "Đã duyệt final" : s === "final" ? "Chờ duyệt final" : s === "review" ? "Chờ kiểm soát" : "Chưa chuyển duyệt"; };
  const repDueDate = iso => { const m = /^(\d{4})-(\d{2})/.exec(iso || ""); if (!m) return null; const n = Number(settings.dueMonths) || 12; return new Date(Number(m[1]), Number(m[2]) - 1 + n + 1, 0); };
  const repNext = iso => { const m = /^(\d{4})-(\d{2})/.exec(iso || ""); if (!m) return ""; const d = repDueDate(iso); return `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`; };
  const repDate = iso => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || ""); return m ? `${m[3]}-${m[2]}-${m[1]}` : ""; };
  const typeName = t => (TYPES.find(x => x[0] === t) || [t, t, t])[2];
  function repList() {
    return records.filter(r => {
      if (REP.status === "final" && !isFinal(r)) return false;
      if (REP.status === "pending" && (isFinal(r) || !r.submitted)) return false;
      if (REP.status === "draft" && (isFinal(r) || r.submitted)) return false;
      if (REP.site && repSite(r) !== REP.site) return false;
      if (REP.type && r.type !== REP.type) return false;
      if (REP.owner && (r.owner ? r.owner.id || r.owner.name : "") !== REP.owner) return false;
      if (REP.folder && folderKey(r) !== REP.folder) return false;
      const d = recDay(r); if (REP.from && d < REP.from) return false; if (REP.to && d > REP.to) return false;
      return true;
    }).sort((a, z) => repSite(a).localeCompare(repSite(z)) || a.type.localeCompare(z.type) || String(a.h.tag).localeCompare(String(z.h.tag), "vi", { numeric: true }));
  }
  const repRow = r => {
    const h = r.h, set = r.type === "PS" ? [h.pset, h.unitPset] : r.type === "TS" ? [h.tset, "°C"] : ["", ""];
    return { r, site: repSite(r), cust: (recLoc(r).custVN || ""), type: r.type, typeName: typeName(r.type), tag: h.tag || "", desc: h.description || "", maker: h.maker || "", model: h.model || "", serial: h.serial || "",
      min: h.min, max: h.max, unit: h.unit || "", set: set[0], setUnit: set[1], acc: h.acc, cal: repDate(h.calDate), next: repNext(h.calDate), certNo: r.certNo || "",
      result: r.summary ? (r.summary.pass ? "Đạt (Pass)" : "Không đạt (Fail)") : "", U: r.summary ? r.summary.U : "", owner: ownerName(r.owner), ctl: fullName((r.sig && r.sig.controller) || ""),
      fin: fullName(r.final ? r.final.by : (r.approved ? r.approved.by : "")), finAt: r.final ? repDate(r.final.at) : (r.approved ? repDate(r.approved.at) : ""), stat: repStat(r) };
  };
  const tally = (rows, keyf) => { const m = new Map(); rows.forEach(x => { const k = keyf(x); const o = m.get(k) || { n: 0, ok: 0, fail: 0, fin: 0 }; o.n++; if (x.stat === "Đã duyệt final") o.fin++; if (/^Đạt/.test(x.result)) o.ok++; if (/^Không/.test(x.result)) o.fail++; m.set(k, o); }); return [...m].sort((a, z) => String(a[0]).localeCompare(String(z[0]), "vi", { numeric: true })); };
  function renderReport() {
    const m = A.me(), el = $("#v-report");
    if (!m || m.role < 3) { el.innerHTML = `<div class="card"><h2>Báo cáo</h2><p class="hint">Chỉ Trưởng phòng / Quản trị (cấp 3) xem được mục này.</p></div>`; return; }
    const all = records;
    const uniq = f => [...new Set(all.map(f).filter(Boolean))];
    const sites = uniq(repSite).sort((a, z) => a.localeCompare(z, "vi")), owners = new Map(); all.forEach(r => { if (r.owner) owners.set(r.owner.id || r.owner.name, ownerName(r.owner)); });
    const folders = new Map(); all.forEach(r => { if (!REP.owner || (r.owner ? r.owner.id || r.owner.name : "") === REP.owner) folders.set(folderKey(r), folderName(r)); });
    const opt = (v, cur, t) => `<option value="${esc(v)}"${v === cur ? " selected" : ""}>${esc(t)}</option>`;
    const rows = repList().map(repRow), done = rows.filter(x => x.stat === "Đã duyệt final");
    const tbl = (head, data) => `<div class="tblwrap"><table class="rtbl"><thead><tr>${head.map((h, i) => `<th${i && head.length === 5 ? ' class="n"' : ""}>${h}</th>`).join("")}</tr></thead><tbody>${data.map(a => `<tr>${a.map((v, i) => `<td${i && a.length === 5 ? ' class="n"' : ""}>${i && a.length === 5 ? v : esc(v)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
    const line = ([k, o]) => [k, o.n, o.fin, o.ok, o.fail];
    const okN = rows.filter(x => /^Đạt/.test(x.result)).length, badN = rows.filter(x => /^Không/.test(x.result)).length;
    const kpi = (n, l, c) => `<div class="kpi ${c || ""}"><b>${n}</b><span>${l}</span></div>`;
    el.innerHTML = `<div class="card"><h2>Báo cáo <small>(chỉ cấp 3)</small></h2>
      <div class="rfil">
        <label class="f"><span>Công trình / Site</span><select data-rf="site">${opt("", REP.site, "Tất cả")}${sites.map(s => opt(s, REP.site, s)).join("")}</select></label>
        <label class="f"><span>Loại thiết bị</span><select data-rf="type">${opt("", REP.type, "Tất cả 9 loại")}${TYPES.map(t => opt(t[0], REP.type, t[1] + " – " + t[2])).join("")}</select></label>
        <label class="f"><span>Người nhập</span><select data-rf="owner">${opt("", REP.owner, "Tất cả")}${[...owners].sort((a, z) => a[1].localeCompare(z[1], "vi")).map(([k, n]) => opt(k, REP.owner, n)).join("")}</select></label>
        <label class="f"><span>Gói hồ sơ (người – ngày)</span><select data-rf="folder">${opt("", REP.folder, "Tất cả")}${[...folders].sort((a, z) => a[1].localeCompare(z[1], "vi")).map(([k, n]) => opt(k, REP.folder, n)).join("")}</select></label>
        <label class="f"><span>Từ ngày HC</span><input type="date" data-rf="from" value="${esc(REP.from)}"></label>
        <label class="f"><span>Đến ngày HC</span><input type="date" data-rf="to" value="${esc(REP.to)}"></label>
        <label class="f"><span>Trạng thái</span><select data-rf="status">${opt("final", REP.status, "Đã duyệt final")}${opt("pending", REP.status, "Đang chờ duyệt")}${opt("draft", REP.status, "Chưa chuyển duyệt")}${opt("all", REP.status, "Tất cả")}</select></label>
      </div>
      <div class="rtabs">${[["over", "Tổng quan"], ["month", "Theo tháng"], ["due", "Đến hạn HC"], ["stand", "Chuẩn"], ["people", "Năng suất"], ["fail", "Không đạt"], ["queue", "Chờ duyệt"], ["pack", "Gói khách hàng"]].map(([k, t]) => `<button class="${REP.view === k ? "on" : ""}" data-rv="${k}">${t}</button>`).join("")}</div>
      ${REP.view !== "over" ? "" : `<div class="kpis">${kpi(rows.length, "thiết bị khớp bộ lọc")}${kpi(done.length, "đã duyệt final", "ok")}${kpi(okN, "đạt")}${kpi(badN, "không đạt", badN ? "bad" : "")}</div>
      <div class="btns"><button class="btn pri" data-rp="zip">⬇ Tải gói báo cáo <small>ZIP: tổng hợp + danh sách + Uncer từng loại</small></button>
        <button class="btn" data-rp="sum">Excel tổng hợp + chi tiết</button><button class="btn" data-rp="list">Excel danh sách</button><button class="btn" data-rp="unc">Excel Uncer (từng loại)</button></div>
      <div id="repout"></div>
      <p class="hint">Gói báo cáo và Uncer chỉ lấy hồ sơ <b>đã duyệt final</b> khớp bộ lọc. Thiết bị không đạt có trong tổng hợp nhưng không có GCN. Uncer xuất từ số liệu app tính (giá trị, không phải công thức sống của file Excel gốc).</p>`}</div>
      ${REP.view !== "over" ? repExtra(rows, done) : rows.length ? `<div class="rgrid"><div class="card"><h2>Theo công trình</h2>${tbl(["Công trình", "Tổng", "Final", "Đạt", "Không đạt"], tally(rows, x => x.site).map(line))}</div>
      <div class="card"><h2>Theo loại thiết bị</h2>${tbl(["Loại", "Tổng", "Final", "Đạt", "Không đạt"], tally(rows, x => x.type + " – " + x.typeName).map(line))}</div>
      <div class="card"><h2>Theo người nhập</h2>${tbl(["Người nhập", "Tổng", "Final", "Đạt", "Không đạt"], tally(rows, x => x.owner || "—").map(line))}</div></div>
      <div class="card"><h2>Danh sách thiết bị <small>(${rows.length})</small></h2>${tbl(["Tag", "Loại", "Công trình", "Số CN", "Ngày HC", "Kết quả", "Người nhập", "Trạng thái"], rows.slice(0, 300).map(x => [x.tag, x.type, x.site, x.certNo, x.cal, x.result, x.owner, x.stat]))}${rows.length > 300 ? `<p class="hint">Hiện 300 dòng đầu; file Excel có đủ ${rows.length}.</p>` : ""}</div>` : `<div class="card"><p class="hint">Không có hồ sơ nào khớp bộ lọc.</p></div>`}`;
  }
  let exLoad = null;
  const loadScript = src => new Promise((ok, no) => { const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = () => no(new Error("Không tải được " + src)); document.head.appendChild(s); });
  const needExcel = async () => { if (!window.ExcelJS) await (exLoad = exLoad || loadScript("vendor/exceljs.min.js")); if (!window.LabZip) await loadScript("zip.js"); };
  const xBlob = async wb => new Blob([await wb.xlsx.writeBuffer()], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const thin = { style: "thin" }, BOX = { top: thin, left: thin, bottom: thin, right: thin };
  const hdrStyle = c => { c.font = { bold: true, name: "Times New Roman", size: 11 }; c.alignment = { horizontal: "center", vertical: "middle", wrapText: true }; c.border = BOX; c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2F0D9" } }; };
  const bodyStyle = (c, left) => { c.font = { name: "Times New Roman", size: 11 }; c.alignment = { horizontal: left ? "left" : "center", vertical: "middle", wrapText: true }; c.border = BOX; };
  const xnum = v => (v === "" || v == null || isNaN(Number(String(v).replace(",", "."))) ? v : Number(String(v).replace(",", ".")));
  const repFilterText = () => {
    const p = []; if (REP.site) p.push("Công trình: " + REP.site); if (REP.type) p.push("Loại: " + REP.type); if (REP.owner) { const o = records.find(r => r.owner && (r.owner.id || r.owner.name) === REP.owner); p.push("Người nhập: " + (o ? o.owner.name : REP.owner)); }
    if (REP.folder) { const o = records.find(r => folderKey(r) === REP.folder); p.push("Gói: " + (o ? folderName(o) : "")); } if (REP.from || REP.to) p.push(`Ngày HC: ${repDate(REP.from) || "…"} → ${repDate(REP.to) || "…"}`);
    p.push("Trạng thái: " + ({ final: "Đã duyệt final", pending: "Đang chờ duyệt", draft: "Chưa chuyển duyệt", all: "Tất cả" })[REP.status]); return p.join(" · ");
  };
  async function repSummaryXlsx(rows) {
    const wb = new ExcelJS.Workbook(); wb.creator = "LAB PVGAS Services";
    const ws = wb.addWorksheet("Tổng quan"); ws.columns = [{ width: 44 }, { width: 10 }, { width: 10 }, { width: 10 }, { width: 12 }];
    ws.addRow(["BÁO CÁO TỔNG HỢP HIỆU CHUẨN – LAB PVGAS Services"]).font = { bold: true, size: 14 };
    ws.addRow(["Lập ngày " + repDate(todayISO()) + " bởi " + (A.me() || {}).name]); ws.addRow([repFilterText()]); ws.addRow([]);
    const block = (title, data) => { const t = ws.addRow([title, "Tổng", "Final", "Đạt", "Không đạt"]); t.eachCell(hdrStyle); data.forEach(([k, o]) => { const r = ws.addRow([k, o.n, o.fin, o.ok, o.fail]); r.eachCell((c, i) => bodyStyle(c, i === 1)); }); const tot = ws.addRow(["Cộng", data.reduce((s, [, o]) => s + o.n, 0), data.reduce((s, [, o]) => s + o.fin, 0), data.reduce((s, [, o]) => s + o.ok, 0), data.reduce((s, [, o]) => s + o.fail, 0)]); tot.font = { bold: true }; tot.eachCell((c, i) => bodyStyle(c, i === 1)); ws.addRow([]); };
    block("Theo công trình", tally(rows, x => x.site)); block("Theo loại thiết bị", tally(rows, x => x.type + " – " + x.typeName)); block("Theo người nhập", tally(rows, x => x.owner || "—"));
    const d = wb.addWorksheet("Chi tiết", { views: [{ state: "frozen", ySplit: 1 }] });
    const cols = [["STT", 6], ["Công trình", 28], ["Khách hàng", 28], ["Loại", 8], ["Tag", 16], ["Mô tả", 28], ["Hãng", 16], ["Model", 16], ["Serial", 14], ["Min", 9], ["Max", 9], ["Đơn vị", 8], ["Giá trị đặt", 10], ["Đv giá trị đặt", 8], ["Sai số cho phép (%)", 10], ["Ngày HC", 12], ["Ngày HC tiếp theo", 12], ["Số CN", 18], ["U", 12], ["Kết quả", 14], ["Người nhập", 20], ["Người kiểm soát", 20], ["Duyệt final", 20], ["Ngày duyệt", 12], ["Trạng thái", 18]];
    d.columns = cols.map(c => ({ width: c[1] })); d.addRow(cols.map(c => c[0])).eachCell(hdrStyle);
    rows.forEach((x, i) => d.addRow([i + 1, x.site, x.cust, x.type, x.tag, x.desc, x.maker, x.model, x.serial, xnum(x.min), xnum(x.max), x.unit, xnum(x.set), x.setUnit, xnum(x.acc), x.cal, x.next, x.certNo, x.U, x.result, x.owner, x.ctl, x.fin, x.finAt, x.stat]).eachCell((c, k) => bodyStyle(c, [2, 3, 6].includes(k))));
    d.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: cols.length } };
    return xBlob(wb);
  }
  // Danh sách theo mẫu "DANH SÁCH HIỆU CHUẨN … THÁNG … NĂM …" (file DGCP 10/2025 NGOC gửi): mỗi loại một sheet
  async function repListXlsx(rows) {
    const wb = new ExcelJS.Workbook(); wb.creator = "LAB PVGAS Services"; const S = settings;
    const byType = new Map(); rows.forEach(x => { if (!byType.has(x.type)) byType.set(x.type, []); byType.get(x.type).push(x); });
    for (const [t, list] of byType) {
      const ws = wb.addWorksheet(t, { pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 } });
      const W = [5, 22, 18, 16, 20, 18, 11, 11, 9, 12, 10, 12, 13, 12, 18, 14]; ws.columns = W.map(w => ({ width: w })); const N = W.length;
      const put = (txt, o = {}) => { const r = ws.addRow([txt]); ws.mergeCells(r.number, 1, r.number, o.to || N); const c = r.getCell(1); c.font = { name: "Times New Roman", size: o.size || 11, bold: !!o.bold }; c.alignment = { horizontal: o.left ? "left" : "center", vertical: "middle", wrapText: true }; return r; };
      put((S.certLines || [])[1] || "CÔNG TY DỊCH VỤ KHÍ", { bold: true, left: true, to: 6 }); put(S.labName || "PHÒNG THỬ NGHIỆM HIỆU CHUẨN", { bold: true, left: true, to: 6 });
      put(String(S.addrVN || "").replace(/<[^>]+>/g, ""), { left: true, to: 8, size: 10 }); put(String(S.tel || "").replace(/<[^>]+>/g, ""), { left: true, to: 8, size: 10 }); ws.addRow([]);
      const dts = list.map(x => x.r.h.calDate).filter(Boolean).sort(), mm = dts.length ? dts[dts.length - 1].slice(5, 7) : "", yy = dts.length ? dts[dts.length - 1].slice(0, 4) : "";
      const sites = [...new Set(list.map(x => x.site))];
      put(`DANH SÁCH HIỆU CHUẨN ${typeName(t).toUpperCase()}${sites.length === 1 ? " TẠI " + sites[0].toUpperCase() : ""}${mm ? ` THÁNG ${mm} NĂM ${yy}` : ""}`, { bold: true, size: 13 }).height = 24; ws.addRow([]);
      ws.addRow(["TT", "Vị trí lắp đặt", "Tên thiết bị", "Hãng sản xuất", "Loại thiết bị", "Kiểu thiết bị", "Min Range", "Max Range", "Đơn vị", "Sai số cho phép (±x %FS)", "Tần xuất HC", "Ngày HC", "Ngày HC tiếp theo", "Cơ quan thực hiện", "Số CN", "Ghi chú"]).eachCell(hdrStyle);
      ws.lastRow.height = 42;
      list.forEach((x, i) => ws.addRow([i + 1, x.site, x.tag, x.maker, x.desc || x.typeName, x.model, xnum(x.min), xnum(x.max), x.unit, x.acc === "" || x.acc == null ? "" : "±" + x.acc, "1 năm", x.cal, x.next, "DVK", x.certNo, /^Không/.test(x.result) ? "Không đạt (Fail)" : x.result ? "Đạt (Pass)" : ""]).eachCell((c, k) => bodyStyle(c, [2, 3].includes(k))));
      ws.addRow([]); const f = ws.addRow([]); const rn = f.number;
      ws.getCell(rn, 2).value = "Trưởng Phòng Thử nghiệm Hiệu chuẩn"; ws.getCell(rn, 12).value = "Người lập";
      const g = ws.addRow([]); ws.addRow([]); ws.addRow([]); const nm = ws.addRow([]);
      ws.getCell(nm.number, 2).value = S.sig1Name || ""; ws.getCell(nm.number, 12).value = (A.me() || {}).name || "";
      [rn, nm.number].forEach(n => [2, 12].forEach(k => { const c = ws.getCell(n, k); c.font = { name: "Times New Roman", size: 11, bold: true }; c.alignment = { horizontal: "center" }; }));
      ws.mergeCells(rn, 2, rn, 4); ws.mergeCells(nm.number, 2, nm.number, 4); ws.mergeCells(rn, 12, rn, 14); ws.mergeCells(nm.number, 12, nm.number, 14);
    }
    if (!byType.size) wb.addWorksheet("Trống").addRow(["Không có hồ sơ khớp bộ lọc"]);
    return xBlob(wb);
  }
  // Uncer: mỗi loại 1 file, mỗi thiết bị 1 sheet – nội dung lấy từ chính trang Bảng Uncer của app (mọi bảng chuyển thành ô Excel)
  function uncSheet(wb, used, r, info) {
    const base = String(r.h.tag || r.certNo || r.id).replace(/[\\/?*\[\]:]/g, "-").slice(0, 28) || "TB"; let n = base, i = 1; while (used.has(n.toLowerCase())) n = `${base.slice(0, 26)}_${++i}`; used.add(n.toLowerCase());
    const ws = wb.addWorksheet(n), doc = new DOMParser().parseFromString("<body>" + info.html + "</body>", "text/html"); ws.columns = [{ width: 10 }, { width: 44 }].concat(Array.from({ length: 14 }, () => ({ width: 14 })));
    const txt = el => (el.textContent || "").replace(/\s+/g, " ").trim(); let row = 1;
    const head = doc.querySelector(".uhead"); if (head) { ws.getCell(row, 1).value = (head.innerText || head.textContent).replace(/\s+/g, " ").trim(); ws.getCell(row, 1).font = { bold: true }; row += 2; }
    doc.body.querySelectorAll(".ulbl, table, .unote, .ufoot").forEach(el => {
      if (el.classList.contains("ulbl") || el.classList.contains("unote") || el.classList.contains("ufoot")) { ws.getCell(row, 1).value = txt(el); if (el.classList.contains("ulbl")) ws.getCell(row, 1).font = { bold: true }; row += el.classList.contains("ulbl") ? 1 : 2; return; }
      el.querySelectorAll("tr").forEach(tr => { let col = 1; tr.querySelectorAll("th,td").forEach(td => { const c = ws.getCell(row, col), v = txt(td), nv = /^[-+]?\d+([.,]\d+)?(e[-+]?\d+)?$/i.test(v) ? Number(v.replace(",", ".")) : v; c.value = nv; c.border = BOX; c.alignment = { vertical: "middle", wrapText: true, horizontal: typeof nv === "number" ? "right" : "left" }; if (td.tagName === "TH") hdrStyle(c); col += Number(td.getAttribute("colspan") || 1); }); row++; });
      row++;
    });
  }
  async function repUncXlsx(done, onProg) {
    const keep = rec, out = [], byType = new Map(); done.forEach(x => { if (!byType.has(x.type)) byType.set(x.type, []); byType.get(x.type).push(x); }); let k = 0;
    try {
      for (const [t, list] of byType) {
        const wb = new ExcelJS.Workbook(), used = new Set(); let n = 0;
        for (const x of list) {
          onProg && onProg(`Uncer ${t}: ${++k}/${done.length} ${x.tag}`); await new Promise(r => setTimeout(r, 0));
          rec = normalize(clone(x.r)); const { c, info } = docInfo(); if (!c.res) continue;
          const html = pagesHtml("unc"); if (!html) continue; uncSheet(wb, used, rec, { html }); n++;
        }
        if (n) out.push({ name: `Uncer/Uncer_${t}_${typeName(t).replace(/\s+/g, "_")}.xlsx`, blob: await xBlob(wb) });
      }
    } finally { rec = keep; }
    return out;
  }
  /* ---------- Báo cáo: các mục con (NGOC 12/11/2026, ý 1–7) ---------- */
  const born = r => { const t = parseInt(String(r.id).slice(1), 36); return t > 1e12 && t < 4e12 ? t : NaN; };
  const dayDiff = (a, b) => Math.round((a - b) / 864e5);
  const tms = s => (s ? new Date(s).getTime() : NaN);
  const dfmt = d => `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
  const rtable = (head, data, numCols) => `<div class="tblwrap"><table class="rtbl"><thead><tr>${head.map((h, i) => `<th${numCols && numCols.includes(i) ? ' class="n"' : ""}>${h}</th>`).join("")}</tr></thead><tbody>${data.map(a => `<tr${a._cls ? ` class="${a._cls}"` : ""}>${a.map((v, i) => `<td${numCols && numCols.includes(i) ? ' class="n"' : ""}>${v}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
  const pctS = (n, t) => (t ? (n / t * 100).toFixed(1) + "%" : "—");
  // Thiết bị mới nhất của mỗi tag (bỏ các lần hiệu chuẩn cũ)
  function latestDevices() {
    const m = new Map();
    records.filter(isFinal).forEach(r => { if (REP.site && repSite(r) !== REP.site) return; if (REP.type && r.type !== REP.type) return; const k = r.type + "|" + String(r.h.tag || "").trim().toLowerCase() + "|" + String(r.h.serial || "").trim().toLowerCase(); const o = m.get(k); if (!o || (r.h.calDate || "") > (o.h.calDate || "")) m.set(k, r); });
    return [...m.values()].map(r => { const d = repDueDate(r.h.calDate); return { r, x: repRow(r), due: d, days: d ? dayDiff(d, new Date()) : NaN }; }).filter(o => o.due).sort((a, z) => a.days - z.days);
  }
  function dueRows() { return latestDevices().filter(o => o.days <= REP.dueWin); }
  function standRows() {
    const fin = records.filter(isFinal), today = new Date();
    return stands.map(s => { const used = fin.filter(r => usedStands(r).some(u => u.id === s.id)); const due = s.due ? new Date(s.due + "T00:00:00") : null; return { s, used, due, days: due ? dayDiff(due, today) : NaN }; }).sort((a, z) => (isNaN(a.days) ? 9e9 : a.days) - (isNaN(z.days) ? 9e9 : z.days));
  }
  const selOpt = (v, cur, t) => `<option value="${v}"${String(v) === String(cur) ? " selected" : ""}>${t}</option>`;
  function repExtra(rows, done) {
    const v = REP.view, card = (h, body) => `<div class="card"><h2>${h}</h2>${body}</div>`;
    if (v === "month") {
      const Y = REP.year, cnt = (y, m) => done.filter(x => x.r.h.calDate && x.r.h.calDate.startsWith(y + "-" + String(m).padStart(2, "0"))).length;
      const cur = [], prev = []; for (let m = 1; m <= 12; m++) { cur.push(cnt(Y, m)); prev.push(cnt(Y - 1, m)); }
      const mx = Math.max(1, ...cur, ...prev), tc = cur.reduce((s, x) => s + x, 0), tp = prev.reduce((s, x) => s + x, 0);
      const bars = cur.map((c, i) => `<div class="mcol"><div class="mbars"><i class="bp" style="height:${prev[i] / mx * 100}%" title="${Y - 1}: ${prev[i]}"></i><i class="bc" style="height:${c / mx * 100}%" title="${Y}: ${c}"></i></div><span>${c || ""}</span><small>T${i + 1}</small></div>`).join("");
      const yrs = []; for (let y = new Date().getFullYear(); y >= new Date().getFullYear() - 6; y--) yrs.push(y);
      return card(`Số thiết bị đã duyệt theo tháng hiệu chuẩn <small>(theo bộ lọc phía trên)</small>`, `<label class="f" style="max-width:160px"><span>Năm</span><select data-ry="year">${yrs.map(y => selOpt(y, Y, y)).join("")}</select></label>
        <div class="mchart">${bars}</div><p class="hint"><i class="lg bc"></i>${Y} <i class="lg bp"></i>${Y - 1}</p>
        ${rtable(["Tháng", String(Y), String(Y - 1), "Chênh"], cur.map((c, i) => [`Tháng ${i + 1}`, c, prev[i], (c - prev[i] > 0 ? "+" : "") + (c - prev[i])]).concat([[`<b>Cả năm</b>`, `<b>${tc}</b>`, `<b>${tp}</b>`, `<b>${tc - tp > 0 ? "+" : ""}${tc - tp}</b>`]]), [1, 2, 3])}`);
    }
    if (v === "due") {
      const all = latestDevices(), list = all.filter(o => o.days <= REP.dueWin), od = all.filter(o => o.days < 0).length;
      return card(`Thiết bị sắp đến hạn hiệu chuẩn`, `<div class="rfil"><label class="f"><span>Trong vòng</span><select data-ry="dueWin">${[30, 60, 90, 180, 365].map(d => selOpt(d, REP.dueWin, d + " ngày tới")).join("")}</select></label></div>
        <div class="kpis"><div class="kpi"><b>${list.length}</b><span>thiết bị đến hạn trong ${REP.dueWin} ngày</span></div><div class="kpi ${od ? "bad" : ""}"><b>${od}</b><span>đã quá hạn</span></div><div class="kpi"><b>${all.length}</b><span>thiết bị đang theo dõi</span></div></div>
        <div class="btns"><button class="btn pri" data-rp="due">⬇ Xuất Excel danh sách đến hạn</button></div><div id="repout"></div>
        ${list.length ? rtable(["Tag", "Loại", "Công trình", "Ngày HC", "Hạn tiếp theo", "Còn lại", "Số CN"], list.slice(0, 400).map(o => Object.assign([esc(o.x.tag), o.x.type, esc(o.x.site), o.x.cal, dfmt(o.due), o.days < 0 ? `<b class="bad">quá ${-o.days} ngày</b>` : o.days + " ngày", esc(o.x.certNo)], { _cls: o.days < 0 ? "bad" : "" })), [5]) : `<p class="hint">Không có thiết bị nào đến hạn trong ${REP.dueWin} ngày tới.</p>`}
        <p class="hint">Hạn = cuối tháng hiệu chuẩn cộng ${Number(settings.dueMonths) || 12} tháng (Cài đặt › Chu kỳ HC). Mỗi thiết bị chỉ lấy lần hiệu chuẩn gần nhất. Lọc theo công trình và loại ở phía trên.</p>`);
    }
    if (v === "stand") {
      const sr = standRows();
      return card(`Chuẩn và hạn kiểm định`, `<div class="btns"><button class="btn pri" data-rp="stand">⬇ Xuất Excel chuẩn</button></div><div id="repout"></div>
        ${rtable(["Chuẩn", "S/N", "Hạn kiểm định", "Còn lại", "Số thiết bị đã dùng"], sr.map(o => Object.assign([esc(o.s.key || o.s.name), esc(o.s.serial || ""), o.due ? dfmt(o.due) : "—", isNaN(o.days) ? "—" : o.days < 0 ? `<b class="bad">quá ${-o.days} ngày</b>` : o.days + " ngày", o.used.length], { _cls: !isNaN(o.days) && o.days < 0 ? "bad" : "" })), [3, 4])}
        <p class="hint">Đếm trong các hồ sơ đã duyệt final. Cần truy vết một chuẩn (nếu phát hiện sai) thì file Excel xuất kèm sheet danh sách thiết bị đã dùng chuẩn đó.</p>`);
    }
    if (v === "people") {
      const m = new Map(); rows.forEach(x => { const k = x.owner || "—"; const o = m.get(k) || { n: 0, fin: 0, ret: 0, fail: 0, days: [] }; o.n++; if (x.stat === "Đã duyệt final") { o.fin++; const f = tms(x.r.final ? x.r.final.at : x.r.approved && x.r.approved.at), b = born(x.r); if (f && b) o.days.push((f - b) / 864e5); } if (/^Không/.test(x.result)) o.fail++; o.ret += (x.r.log || []).filter(l => /^Trả lại/.test(l.act)).length; m.set(k, o); });
      const data = [...m].sort((a, z) => z[1].n - a[1].n).map(([k, o]) => [esc(k), o.n, o.fin, o.ret, pctS(o.ret, o.n), o.fail, o.days.length ? (o.days.reduce((s, d) => s + d, 0) / o.days.length).toFixed(1) + " ngày" : "—"]);
      return card(`Năng suất từng người <small>(theo bộ lọc phía trên)</small>`, `${rtable(["Người nhập", "Hồ sơ", "Final", "Lần bị trả lại", "Tỉ lệ trả lại", "Không đạt", "Từ tạo đến final (TB)"], data, [1, 2, 3, 4, 5, 6])}
        <p class="hint">Để xem công việc mỗi người và cân đối nhân lực, không dùng để xếp hạng. Lần bị trả lại đếm theo nhật ký hồ sơ; thời gian tính từ lúc tạo hồ sơ.</p>`);
    }
    if (v === "fail") {
      const grp = (title, f) => { const g = new Map(); rows.filter(x => x.result).forEach(x => { const k = f(x) || "—"; const o = g.get(k) || { n: 0, bad: 0 }; o.n++; if (/^Không/.test(x.result)) o.bad++; g.set(k, o); }); const d = [...g].sort((a, z) => z[1].bad / z[1].n - a[1].bad / a[1].n || z[1].n - a[1].n).slice(0, 15).map(([k, o]) => Object.assign([esc(k), o.n, o.bad, pctS(o.bad, o.n)], { _cls: o.bad ? "warnrow" : "" })); return `<div class="card"><h2>${title}</h2>${rtable(["", "Tổng", "Không đạt", "Tỉ lệ"], d, [1, 2, 3])}</div>`; };
      return `<div class="card"><h2>Tỉ lệ không đạt <small>(theo bộ lọc phía trên; chọn trạng thái "Tất cả" để tính cả hồ sơ chưa duyệt)</small></h2><p class="hint">Sắp xếp tỉ lệ cao nhất trước. Mẫu số nhỏ thì tỉ lệ chưa có ý nghĩa thống kê.</p></div><div class="rgrid">${grp("Theo loại", x => x.type + " – " + x.typeName)}${grp("Theo hãng", x => x.maker)}${grp("Theo model", x => x.model)}</div>${grp("Theo công trình", x => x.site)}`;
    }
    if (v === "queue") {
      const now = Date.now(), q = records.filter(r => !isFinal(r) && !isFail(r) || (isFail(r) && !isFinal(r))).map(r => { const st = stage(r); const t = st === "review" ? tms(r.submitted && r.submitted.at) : st === "final" ? tms(r.approved && r.approved.at) : tms(r.updated); const to = st === "review" ? (r.submitted && r.submitted.to ? r.submitted.to.name : "người kiểm soát") : st === "final" ? (r.finalTo ? r.finalTo.name : "cấp 3") : ownerName(r.owner); return { r, st, t, to, days: isNaN(t) ? NaN : (now - t) / 864e5 }; }).sort((a, z) => (z.days || 0) - (a.days || 0));
      const late = q.filter(o => o.days > 3 && o.st !== "draft").length;
      return card(`Hồ sơ chưa duyệt xong`, `<div class="kpis"><div class="kpi"><b>${q.filter(o => o.st === "review").length}</b><span>chờ kiểm soát</span></div><div class="kpi"><b>${q.filter(o => o.st === "final").length}</b><span>chờ duyệt final</span></div><div class="kpi"><b>${q.filter(o => o.st === "draft").length}</b><span>chưa chuyển duyệt</span></div><div class="kpi ${late ? "bad" : ""}"><b>${late}</b><span>chờ quá 3 ngày</span></div></div>
        ${q.length ? rtable(["Tag", "Loại", "Công trình", "Bước", "Đang chờ", "Từ", "Đã chờ"], q.slice(0, 300).map(o => Object.assign([esc(o.r.h.tag || ""), o.r.type, esc(repSite(o.r)), STAGE[o.st][1], esc(fullName(o.to)), isNaN(o.t) ? "—" : dfmt(new Date(o.t)), isNaN(o.days) ? "—" : (o.days < 1 ? "< 1 ngày" : Math.floor(o.days) + " ngày")], { _cls: o.days > 3 && o.st !== "draft" ? "bad" : "" })), [6]) : `<p class="hint">Không có hồ sơ nào đang chờ.</p>`}`);
    }
    if (v === "pack") {
      return card(`Gói gửi khách hàng`, `<p class="hint">Chọn <b>Công trình</b>, loại và khoảng ngày HC ở bộ lọc phía trên (trạng thái nên là "Đã duyệt final"). App tạo một file ZIP gồm 2 thư mục <b>QTG</b> và <b>GCN</b>, mỗi file đặt tên theo thứ tự "1. Tag.pdf", cùng file Excel danh sách. Thiết bị không đạt chỉ có QTG.</p>
        <p><b>${done.length}</b> hồ sơ đã duyệt khớp bộ lọc${REP.site ? "" : ` <span class="bad">· chưa chọn công trình</span>`}.</p>
        <div class="btns"><button class="btn pri" data-rp="pack"${done.length ? "" : " disabled"}>⬇ Tạo gói gửi khách hàng (ZIP)</button></div><div id="repout"></div>
        <p class="hint">Tạo PDF mất khoảng vài giây mỗi thiết bị; gói lớn nên chia theo ngày HC. Không có hồ sơ chưa duyệt final trong gói.</p>`);
    }
    return "";
  }
  async function simpleXlsx(sheets) {
    const wb = new ExcelJS.Workbook(); wb.creator = "LAB PVGAS Services";
    sheets.forEach(([name, head, data, widths]) => { const ws = wb.addWorksheet(name, { views: [{ state: "frozen", ySplit: 1 }] }); ws.columns = head.map((_, i) => ({ width: (widths && widths[i]) || 18 })); ws.addRow(head).eachCell(hdrStyle); data.forEach(r => ws.addRow(r).eachCell((c, k) => bodyStyle(c, typeof c.value !== "number"))); ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: head.length } }; });
    return xBlob(wb);
  }
  async function repPackZip(done, say) {
    const keep = rec, files = [], skipped = [], noCert = [], list = done.slice().sort((a, z) => String(a.tag).localeCompare(String(z.tag), "vi", { numeric: true }));
    try {
      for (let i = 0; i < list.length; i++) {
        const x = list[i], nm = `${i + 1}. ${safeTagName(x.tag || x.certNo)}`; say(`<p class="mut">Đang tạo PDF ${i + 1}/${list.length}: ${esc(x.tag)}…</p>`); await new Promise(r => setTimeout(r, 0));
        rec = normalize(clone(x.r)); const c = compute(); if (!c.res) { skipped.push(x.tag); continue; }
        const q = pagesHtml("qtg"); if (q) files.push({ name: `QTG/${nm}.pdf`, blob: await buildPdf(q) });
        if (failed(c)) noCert.push(x.tag); else { const g = pagesHtml("cert"); if (g) files.push({ name: `GCN/${nm}.pdf`, blob: await buildPdf(g) }); }
      }
    } finally { rec = keep; }
    return { files, skipped, noCert };
  }
  const safeTagName = t => String(t || "").trim().replace(/[\\/:*?"<>|]+/g, "-") || "KhongTag";
  async function onReportClick(e) {
    const rv = e.target.closest("[data-rv]"); if (rv) { REP.view = rv.dataset.rv; renderReport(); return; }
    const b = e.target.closest("[data-rp]"); if (!b) return; const out = $("#repout"), say = h => { out.innerHTML = h; };
    const rows = repList().map(repRow), done = rows.filter(x => x.stat === "Đã duyệt final"), what = b.dataset.rp, stamp = `${REP.site ? REP.site.replace(/[^\w]+/g, "_").slice(0, 24) + "_" : ""}${todayISO()}`;
    if (what === "due" || what === "stand") {
      try {
        say(`<p class="mut">Đang nạp thư viện Excel…</p>`); await needExcel();
        if (what === "due") { const L = dueRows(); await saveFile(await simpleXlsx([["Đến hạn HC", ["TT", "Công trình", "Khách hàng", "Loại", "Tag", "Mô tả", "Hãng", "Model", "Serial", "Ngày HC", "Hạn tiếp theo", "Còn lại (ngày)", "Số CN"], L.map((o, i) => [i + 1, o.x.site, o.x.cust, o.x.type, o.x.tag, o.x.desc, o.x.maker, o.x.model, o.x.serial, o.x.cal, dfmt(o.due), o.days, o.x.certNo]), [6, 26, 26, 8, 16, 24, 14, 14, 14, 12, 12, 12, 18]]]), `DenHan_${REP.dueWin}ngay_${todayISO()}.xlsx`); say(`<p class="ok">Đã tạo file ${L.length} thiết bị đến hạn.</p>`); }
        else { const S = standRows(); const used = [["Chuẩn", "S/N", "Tag", "Loại", "Công trình", "Ngày HC", "Số CN"]]; const det = []; S.forEach(o => o.used.forEach(r => det.push([o.s.key || o.s.name, o.s.serial || "", r.h.tag || "", r.type, repSite(r), repDate(r.h.calDate), r.certNo || ""]))); await saveFile(await simpleXlsx([["Chuẩn", ["Chuẩn", "S/N", "Hạn kiểm định", "Còn lại (ngày)", "Số thiết bị đã dùng"], S.map(o => [o.s.key || o.s.name, o.s.serial || "", o.due ? dfmt(o.due) : "", isNaN(o.days) ? "" : o.days, o.used.length]), [34, 14, 14, 14, 16]], ["Thiết bị đã dùng chuẩn", used[0], det, [34, 14, 16, 8, 26, 12, 18]]]), `Chuan_${todayISO()}.xlsx`); say(`<p class="ok">Đã tạo file ${S.length} chuẩn.</p>`); }
      } catch (err) { say(`<p class="bad">Không tạo được: ${esc(err.message)}</p>`); }
      return;
    }
    if (!rows.length) { say(`<p class="bad">Không có hồ sơ khớp bộ lọc.</p>`); return; }
    if (what === "pack") {
      try {
        say(`<p class="mut">Đang nạp thư viện…</p>`); await needExcel(); const r = await repPackZip(done, say); const files = r.files;
        if (!files.length) { say(`<p class="bad">Không tạo được file nào${r.skipped.length ? " – thiếu số liệu: " + esc(r.skipped.join(", ")) : ""}.</p>`); return; }
        files.push({ name: `DanhSach_${stamp}.xlsx`, blob: await repListXlsx(done) });
        const blob = await LabZip.make(files), name = `GoiKhachHang_${stamp}.zip`; await saveFile(blob, name);
        say(`<p class="ok"><b>${esc(name)}</b> · ${(blob.size / 1048576).toFixed(1)} MB · ${done.length} hồ sơ${r.noCert.length ? `<br>Không đạt, chỉ có QTG: ${esc(r.noCert.join(", "))}` : ""}${r.skipped.length ? `<br><span class="bad">Bỏ qua (thiếu số liệu): ${esc(r.skipped.join(", "))}</span>` : ""}</p>`);
      } catch (err) { say(`<p class="bad">Không tạo được: ${esc(err.message)}</p>`); }
      return;
    }
    try {
      say(`<p class="mut">Đang nạp thư viện Excel…</p>`); await needExcel(); const files = [];
      if (what === "sum" || what === "zip") { say(`<p class="mut">Đang tạo Excel tổng hợp…</p>`); files.push({ name: `BaoCao_TongHop_${stamp}.xlsx`, blob: await repSummaryXlsx(rows) }); }
      if (what === "list" || what === "zip") { say(`<p class="mut">Đang tạo danh sách mẫu DGCP…</p>`); files.push({ name: `DanhSach_HieuChuan_${stamp}.xlsx`, blob: await repListXlsx(done) }); }
      if (what === "unc" || what === "zip") files.push(...await repUncXlsx(done, t => say(`<p class="mut">${esc(t)}</p>`)));
      if (what === "sum" || what === "list" || (what === "unc" && files.length === 1)) { const f = files[0]; await saveFile(f.blob, f.name.replace(/^.*\//, "")); say(`<p class="ok">Đã tạo ${esc(f.name.replace(/^.*\//, ""))}</p>`); return; }
      const blob = await LabZip.make(files), name = `BaoCao_${stamp}.zip`; await saveFile(blob, name);
      say(`<p class="ok"><b>${esc(name)}</b> · ${(blob.size / 1048576).toFixed(1)} MB · ${files.length} file Excel (${done.length} hồ sơ đã duyệt final)</p>`);
    } catch (err) { say(`<p class="bad">Không tạo được: ${esc(err.message)}</p>`); }
  }
  function onReportChange(e) { if (e.target.dataset.ry) { REP[e.target.dataset.ry] = Number(e.target.value); renderReport(); return; } const k = e.target.dataset.rf; if (!k) return; REP[k] = e.target.value; if (k === "owner") REP.folder = ""; renderReport(); }
  const VIEWS = { report: renderReport, entry: renderEntry, records: renderRecords, devices: renderDevices, stands: renderStands, formulas: renderFormulas, refs: renderRefs, settings: renderSettings };
  let curView = "entry";
  function go(v) {
    curView = v;
    $$("main > section").forEach(s => s.hidden = s.id !== "v-" + v);
    $$("nav.tabs button").forEach(b => b.classList.toggle("on", b.dataset.v === v));
    const rb = $('nav.tabs button[data-v="report"]'); if (rb) rb.hidden = !(A.me() && A.me().role >= 3);
    VIEWS[v](); if (v === "settings") fillUsage(); window.scrollTo(0, 0);
    const wd = $("#wdock"); if (wd && v !== "entry") { wd.hidden = true; document.body.classList.remove("hasdock"); }
  }
  document.addEventListener("DOMContentLoaded", () => {
    $("nav.tabs").addEventListener("click", e => { const b = e.target.closest("button"); if (b) go(b.dataset.v); });
    $("#v-entry").addEventListener("input", onInput);
    $("#v-entry").addEventListener("change", e => { if (e.target.tagName === "SELECT" || e.target.type === "date") onInput(e); });
    $("#v-entry").addEventListener("click", onClick);
    $("#v-entry").addEventListener("change", e => { if (e.target.dataset.pk === "sel") { curPackId = e.target.value; store.set("curPack", curPackId); renderEntry(); } });
    $("#v-entry").addEventListener("change", e => { if (e.target.dataset.photo != null) onPhotoChange(e); });
    $("#v-entry").addEventListener("click", e => { const im = e.target.closest("img[data-phview]"); if (im) { const w = window.open(); if (w) w.document.write(`<title>Ảnh</title><img src="${im.src}" style="max-width:100%">`); } });
    $("#v-records").addEventListener("click", onRecordsClick);
    $("#v-report").addEventListener("click", onReportClick); $("#v-report").addEventListener("change", onReportChange);
    $("#v-devices").addEventListener("click", onDevicesClick);
    // Gợi ý Tag (như Excel): bàn phím ↑ ↓ Enter Esc, chuột / chạm chọn; rời ô thì ẩn
    $("#v-entry").addEventListener("keydown", e => { if (e.target.dataset.p !== "h.tag" || !$("#tagsug")) return;
      if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); moveSuggest(e.key === "ArrowDown" ? 1 : -1); }
      else if (e.key === "Enter" && sugIdx >= 0) { e.preventDefault(); applyDevice(sugList[sugIdx]); }
      else if (e.key === "Escape") hideSuggest(); });
    $("#v-entry").addEventListener("pointerdown", e => { const it = e.target.closest("[data-sug]"); if (!it) return; e.preventDefault(); applyDevice(sugList[Number(it.dataset.sug)]); });
    $("#v-entry").addEventListener("focusout", e => { if (e.target.dataset.p === "h.tag") setTimeout(hideSuggest, 150); });
    $("#v-entry").addEventListener("focusin", e => { if (e.target.dataset.p === "h.tag" && e.target.value) showSuggest(e.target); });
    $("#v-stands").addEventListener("click", onStandsClick);
    $("#v-stands").addEventListener("change", e => {
      if (e.target.dataset.k !== "kind" || !editStand) return;
      $$("#sf [data-k]").forEach(i => { const k = i.dataset.k; editStand[k] = ["min", "max", "unc", "rdg", "certRange", "err", "stab", "radial", "axial"].includes(k) ? num(i.value) || 0 : i.value; });
      renderStands();
    });
    $("#v-settings").addEventListener("input", onSettingsInput);
    $("#v-settings").addEventListener("change", onSettingsInput);
    $("#v-settings").addEventListener("change", e => { if (e.target.id === "bkrest") onRestoreFile(e); if (e.target.id === "fryy") { frYY = Number(e.target.value); frOpen = true; renderSettings(); } if (e.target.dataset.rg) onRangeInput(e); });
    $("#v-settings").addEventListener("click", onSettingsClick);
    $("#v-settings").addEventListener("toggle", e => { if (e.target.id === "frcard") { const was = frOpen; frOpen = e.target.open; if (frOpen && !was) renderSettings(); } if (e.target.id === "rgcard") rgOpen = e.target.open; }, true);
    // Đồng bộ máy chủ (cloud.js): app trao quyền đọc/ghi dữ liệu cục bộ; thay đổi từ máy khác vẽ lại màn hình đang xem
    if (window.LabCloud) LabCloud.attach({
      getRecords: () => records, normalize, photos: P, seedVersion: SEED.version,
      setRecords: list => { records = list; fromCloud = true; store.set("records", records); fromCloud = false; },
      getShared: k => k === "stands" ? stands : settings,
      setShared: (k, v) => { fromCloud = true; if (k === "stands") { stands = v; store.set("stands", stands); } else { settings = fixRanges(deepMerge(SEED.settings, v), v && v.rangesVer); settings.ver = SEED.settings.ver; store.set("settings", settings); } fromCloud = false; },
      onCertConflict: list => toast(`⚠ Số ${list.map(r => r.certNo).join(", ")} đã có người dùng trên hệ thống – mở hồ sơ ${list.map(r => r.h.tag).join(", ")} để lấy số khác`),
      onRemote: () => {
        badge();
        if (curView !== "entry") { VIEWS[curView](); return; }
        const r = rec.saved && records.find(x => x.id === rec.id);
        if (r && (r.updated || "") > (rec.updated || "")) { rec = normalize(clone(r)); persistCurrent(); renderEntry(); toast("Hồ sơ vừa được cập nhật từ máy khác"); }
      }
    });
    A.start(m => {
      if (rec.saved && !visible(rec)) rec = newRecord(rec.type || "PT");   // máy dùng chung: không mở tiếp hồ sơ của người khác
      if (!rec.saved) { rec.owner = { id: m.id, name: m.name }; rec.sig.inspector = m.name; }
      go("entry"); badge();
      if (A.cloud() && A.can("settings") && (bkAge() === null || bkAge() >= BK_DAYS)) setTimeout(() => toast("💾 Đến hạn sao lưu dữ liệu – vào Cài đặt › Sao lưu toàn bộ"), 2600);
      loadPeople().then(() => { if (curView === "entry") renderEntry(); });
    });   // an unsaved draft belongs to whoever is logged in   // nothing renders before PIN login
    // New version: check sw.js on every open, and reload once when the new worker takes over (unsaved drafts are kept in lab.current)
    if ("serviceWorker" in navigator && location.protocol === "https:") {
      const had = !!navigator.serviceWorker.controller;
      navigator.serviceWorker.register("sw.js", { updateViaCache: "none" }).then(r => r.update()).catch(() => { });
      let done = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => { if (had && !done) { done = true; store.set("current", rec); location.reload(); } });
    }
  });
})();
