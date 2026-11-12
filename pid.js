/* LAB PVGAS Services – tra cứu tag trên P&ID (NGOC 12/11/2026).
 * P&ID là tài liệu kỹ thuật nội bộ: KHÔNG có trong repo/web. Mỗi máy tự nạp "gói P&ID" từ file nội bộ,
 * gói chỉ nằm trong IndexedDB của trình duyệt trên máy đó (DB "lab-pvgas-pid").
 *
 * Gói P&ID = 1 file pid-index.json + các file ảnh trang bản vẽ (jpg/png/webp) chọn cùng lúc.
 * pid-index.json:
 * { "format": "lab-pvgas-pid/1", "name": "…", "made": "2026-11-12", "sites": ["mã công trình trong danh mục, vd KLNG"],   // sites: không bắt buộc; có thì chỉ khớp tag của các công trình đó
 *   "drawings": [{ "id": "D1", "no": "số bản vẽ", "title": "…", "rev": "…", "file": "D1.jpg", "w": 4961, "h": 3508 }],
 *   "tags": { "PT1506A": [{ "d": "D1", "x": 1234, "y": 567, "r": 60, "lbl": "ghi chú cách tìm (không bắt buộc)" }] },          // khoá = tag bỏ dấu cách - _ . / , viết hoa; x,y,r theo pixel ảnh
 *   "info": { "PT1506A": { "fn": "chức năng (theo nguồn)", "sp": "setpoint/alarm (theo nguồn)",
 *                          "trip": [{ "act": "effect/action", "grp": "cụm bị shutdown", "src": "C&E số/rev" }], "src": "nguồn fn/sp" } } }
 * Quy tắc hiển thị: chỉ hiện chức năng/trip có trong gói. "trip" không có = CHƯA CÓ DỮ LIỆU (không phải "không trip");
 * "trip": [] = nguồn C&E ghi rõ không có action. App không tự suy đoán. */
(function () {
  "use strict";
  /* v69 (NGOC 12/11/2026 "đẩy lên cho mọi người dùng"): gói P&ID nằm trong kho riêng tư "pid" của máy chủ Supabase
   * (chỉ tài khoản đã đăng nhập đọc được, chỉ cấp 3 đưa lên). Mỗi máy tự tải danh mục + chỉ mục tag khi mở tab Thiết bị,
   * ảnh bản vẽ chỉ tải khi bấm xem rồi giữ lại trong máy (dùng được khi mất mạng). Không bao giờ đưa lên GitHub (public).
   * Kho: pid/catalog.json = [{ id, name, sites, made, ver, nd, nt }], pid/<id>/index.json, pid/<id>/<drawing id>.png */
  const KEY = t => String(t || "").toUpperCase().replace(/[\s\-_./]/g, "");
  const BUCKET = "pid";
  let dbp = null, PK = {};      // PK: id gói → chỉ mục (có thể nhiều công trình)
  function db() {
    if (!dbp) dbp = new Promise((res, rej) => {
      const r = indexedDB.open("lab-pvgas-pid", 1);
      r.onupgradeneeded = () => r.result.createObjectStore("p");
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    });
    return dbp;
  }
  async function tx(mode, fn) {
    const d = await db();
    return new Promise((res, rej) => { const t = d.transaction("p", mode); const out = fn(t.objectStore("p")); t.oncomplete = () => res(out && out.result); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error); });
  }
  const get = k => tx("readonly", s => s.get(k));
  const slug = t => String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[đĐ]/g, "d").replace(/[^A-Za-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 40) || "goi";
  const C = () => { const c = window.LabCloud; return c && c.enabled && c.storage ? c.storage() : null; };

  async function init() {
    try {
      PK = (await get("packs")) || {};
      const old = await get("index");   // gói đơn của v68 → chuyển sang dạng nhiều gói
      if (old && !Object.keys(PK).length) {
        const id = slug((old.sites || [])[0] || old.name); old.id = id; PK[id] = old;
        const blobs = await Promise.all(old.drawings.map(d => get("img:" + d.id)));
        await tx("readwrite", s => { s.put(PK, "packs"); s.delete("index"); old.drawings.forEach((d, i) => { s.delete("img:" + d.id); if (blobs[i]) s.put(blobs[i], `img:${id}:${d.id}`); }); });
      }
    } catch (e) { PK = {}; }
    return status();
  }
  function norm(ix, id) {
    const tags = {}; Object.entries(ix.tags || {}).forEach(([k, v]) => { tags[KEY(k)] = v; });
    const info = {}; Object.entries(ix.info || {}).forEach(([k, v]) => { info[KEY(k)] = v; });
    return { id, format: ix.format, name: String(ix.name || id), made: ix.made || "", ver: ix.ver || "", sites: Array.isArray(ix.sites) && ix.sites.length ? ix.sites.map(String) : null,
      note: ix.note || "", src: ix.src || "file", loaded: new Date().toISOString(), drawings: ix.drawings, tags, info };
  }
  // Nạp từ file trên máy (cấp 3 dùng để chuẩn bị rồi đưa lên máy chủ). files: FileList (pid-index.json + ảnh)
  async function load(files) {
    files = [...files];
    const jf = files.find(f => /\.json$/i.test(f.name));
    if (!jf) throw new Error("Chưa chọn file pid-index.json");
    let ix; try { ix = JSON.parse(await jf.text()); } catch (e) { throw new Error("File " + jf.name + " không phải JSON hợp lệ"); }
    if (!ix || !/^lab-pvgas-pid\/1$/.test(ix.format || "") || !Array.isArray(ix.drawings) || typeof ix.tags !== "object") throw new Error("File JSON không đúng định dạng gói P&ID (format lab-pvgas-pid/1)");
    const imgs = new Map(files.filter(f => f !== jf).map(f => [f.name, f]));
    const miss = ix.drawings.filter(d => !imgs.has(d.file)).map(d => d.file);
    if (miss.length) throw new Error(`Thiếu ${miss.length} ảnh bản vẽ: ${miss.slice(0, 5).join(", ")}${miss.length > 5 ? "…" : ""}. Chọn cùng lúc file JSON và toàn bộ ảnh.`);
    const id = slug((ix.sites || [])[0] || ix.name);
    const pk = norm(ix, id); pk.src = "file"; PK[id] = pk;
    await tx("readwrite", s => { s.put(PK, "packs"); ix.drawings.forEach(d => s.put(imgs.get(d.file), `img:${id}:${d.id}`)); });
    return { id, msg: `Đã nạp gói "${pk.name}": ${pk.drawings.length} bản vẽ, ${Object.keys(pk.tags).length} tag` };
  }
  async function remove(id) {
    const pk = PK[id]; if (!pk) return; delete PK[id];
    await tx("readwrite", s => { s.put(PK, "packs"); pk.drawings.forEach(d => s.delete(`img:${id}:${d.id}`)); });
  }
  /* ---------- máy chủ ---------- */
  async function dl(st, path) { const { data, error } = await st.download(path); if (error) throw new Error(error.message || "Không tải được " + path); return data; }
  async function catalog(st) { try { return JSON.parse(await (await dl(st, "catalog.json")).text()); } catch (e) { return []; } }
  let synced = null;
  // Tải danh mục gói trên máy chủ, gói nào mới/đổi thì tải chỉ mục; gói bị gỡ trên máy chủ thì gỡ khỏi máy. Mỗi phiên 1 lần.
  function sync(force) {
    if (synced && !force) return synced;
    synced = (async () => {
      const st = C(); if (!st) return { ok: false, msg: "" };
      const cat = await catalog(st); let n = 0;
      for (const c of cat) {
        if (PK[c.id] && PK[c.id].src === "cloud" && PK[c.id].ver === c.ver) continue;
        if (PK[c.id] && PK[c.id].src === "file") continue;     // máy đang có bản nạp tay (cấp 3 chuẩn bị) – không ghi đè
        const ix = JSON.parse(await (await dl(st, `${c.id}/index.json`)).text());
        const pk = norm(ix, c.id); pk.src = "cloud"; pk.ver = c.ver;
        const old = PK[c.id]; PK[c.id] = pk; n++;
        if (old) await tx("readwrite", s => old.drawings.forEach(d => s.delete(`img:${c.id}:${d.id}`)));   // ảnh cũ có thể đã đổi
      }
      const ids = new Set(cat.map(c => c.id));
      for (const id of Object.keys(PK)) if (PK[id].src === "cloud" && !ids.has(id)) { await remove(id); n++; }
      await tx("readwrite", s => s.put(PK, "packs"));
      return { ok: true, changed: n, count: cat.length };
    })().catch(e => { synced = null; return { ok: false, msg: e.message || String(e) }; });
    return synced;
  }
  // Cấp 3: đưa gói đang nạp từ file lên máy chủ cho mọi người. onProg(i, n)
  // v70: ảnh đã có trên máy chủ cùng dung lượng thì bỏ qua (bấm lại là chạy tiếp chỗ dở); mỗi ảnh chờ tối đa 90 s, thử lại 3 lần.
  let UP = null;
  const busy = () => UP;
  const withTimeout = (pr, ms, what) => Promise.race([pr, new Promise((_, rej) => setTimeout(() => rej(new Error("Quá " + ms / 1000 + " s không phản hồi khi gửi " + what + " – mạng chập chờn?")), ms))]);
  async function put(st, path, blob, type) {
    let last;
    for (let k = 0; k < 3; k++) {
      try { const { error } = await withTimeout(st.upload(path, blob, { upsert: true, contentType: type }), 90000, path); if (!error) return; last = new Error(error.message || String(error)); if (/row-level|policy|not found|bucket/i.test(last.message)) break; }
      catch (e) { last = e; }
      await new Promise(r => setTimeout(r, 1500 * (k + 1)));
    }
    throw last;
  }
  async function upload(id, onProg) {
    if (UP) throw new Error("Đang đưa một gói khác lên, chờ xong đã");
    const st = C(); if (!st) throw new Error("Chưa đăng nhập máy chủ");
    const pk = PK[id]; if (!pk) throw new Error("Không có gói " + id);
    const n = pk.drawings.length;
    UP = { id, i: 0, n };
    try {
      let have = {};
      try { const { data } = await withTimeout(st.list(id, { limit: 1000 }), 30000, "danh sách"); (data || []).forEach(o => { have[o.name] = o.metadata && o.metadata.size; }); } catch (e) { have = {}; }
      for (let i = 0; i < n; i++) {
        const d = pk.drawings[i], b = await get(`img:${id}:${d.id}`);
        if (!b) throw new Error("Thiếu ảnh " + d.id + " trên máy – nạp lại gói từ file");
        if (have[d.id + ".png"] !== b.size) await put(st, `${id}/${d.id}.png`, b, b.type || "image/png");
        UP.i = i + 1; if (onProg) onProg(i + 1, n);
      }
      const ver = new Date().toISOString();
      const ix = { format: pk.format, name: pk.name, made: pk.made, ver, sites: pk.sites, note: pk.note, drawings: pk.drawings.map(d => ({ ...d, file: d.id + ".png" })), tags: pk.tags, info: pk.info };
      await put(st, `${id}/index.json`, new Blob([JSON.stringify(ix)], { type: "application/json" }), "application/json");
      const cat = (await catalog(st)).filter(c => c.id !== id);
      cat.push({ id, name: pk.name, sites: pk.sites, made: pk.made, ver, nd: n, nt: Object.keys(pk.tags).length });
      await put(st, "catalog.json", new Blob([JSON.stringify(cat)], { type: "application/json" }), "application/json");
      pk.src = "cloud"; pk.ver = ver; await tx("readwrite", s => s.put(PK, "packs")); synced = null;
      return `Đã đưa gói "${pk.name}" lên máy chủ (${n} bản vẽ). Mọi người đăng nhập app sẽ tự thấy.`;
    } finally { UP = null; }
  }
  // Cấp 3: gỡ gói khỏi máy chủ
  async function unpublish(id) {
    const st = C(); if (!st) throw new Error("Chưa đăng nhập máy chủ");
    const pk = PK[id];
    const cat = (await catalog(st)).filter(c => c.id !== id);
    const r = await st.upload("catalog.json", new Blob([JSON.stringify(cat)], { type: "application/json" }), { upsert: true, contentType: "application/json" });
    if (r.error) throw new Error(r.error.message);
    if (pk) await st.remove([`${id}/index.json`, ...pk.drawings.map(d => `${id}/${d.id}.png`)]);
    await remove(id); synced = null;
  }
  async function image(id, did) {
    let b = await get(`img:${id}:${did}`); if (b) return b;
    const st = C(); if (!st) return null;
    b = await dl(st, `${id}/${did}.png`);
    await tx("readwrite", s => s.put(b, `img:${id}:${did}`));
    return b;
  }

  const packs = () => Object.values(PK).map(p => ({ id: p.id, name: p.name, made: p.made, src: p.src, sites: p.sites, nd: p.drawings.length, nt: Object.keys(p.tags).length }));
  const status = () => { const L = packs(); return L.length ? { n: L.length, nd: L.reduce((a, p) => a + p.nd, 0), nt: L.reduce((a, p) => a + p.nt, 0) } : null; };
  // site: mã công trình của thiết bị – tag trùng tên ở công trình khác không được trỏ nhầm sang bản vẽ của gói khác
  const find = (tag, site) => Object.values(PK).find(p => p.tags[KEY(tag)] && p.tags[KEY(tag)].length && (!p.sites || !site || p.sites.includes(site))) || null;
  const has = (tag, site) => !!find(tag, site);
  const info = (tag, site) => { const p = find(tag, site); return (p && p.info[KEY(tag)]) || null; };
  // "trip" = có action trip theo nguồn; "none" = nguồn ghi không có; "" = chưa có dữ liệu
  const tripState = (tag, site) => { const i = info(tag, site); if (!i || !Array.isArray(i.trip)) return ""; return i.trip.length ? "trip" : "none"; };

  /* ---------- viewer ---------- */
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  let V = null;
  async function open(tag, title, site) {
    const P = find(tag, site); if (!P) return false;
    const k = KEY(tag), locs = P.tags[k], dw = id => P.drawings.find(d => d.id === id);
    close();
    const el = document.createElement("div"); el.id = "pidv"; el.setAttribute("role", "dialog"); el.setAttribute("aria-label", "P&ID " + tag);
    const i = info(tag, site), ts = tripState(tag, site);
    const infoHtml = `<div class="pidinfo">
      ${ts === "trip" ? `<div class="pidwarn"><b>⚠ CÓ TÍN HIỆU SHUTDOWN / TRIP</b> – làm thủ tục PTW / inhibit–bypass theo quy trình của công trình và báo vận hành trước khi KĐHC.<ul>${i.trip.map(t => `<li>${esc(t.act || "")}${t.grp ? ` → <b>${esc(t.grp)}</b>` : ""}${t.src ? ` <small>(${esc(t.src)})</small>` : ""}</li>`).join("")}</ul></div>`
        : ts === "none" ? `<div class="pidok">Theo nguồn C&amp;E trong gói: không có action trip.${i.src ? ` <small>(${esc(i.src)})</small>` : ""}</div>`
        : `<div class="pidna"><b>Chưa có dữ liệu C&amp;E</b> cho tag này trong gói P&amp;ID. App không suy đoán – kiểm tra C&amp;E / hỏi vận hành trước khi KĐHC.</div>`}
      ${i && i.fn ? `<p><b>Chức năng:</b> ${esc(i.fn)}</p>` : `<p class="mut">Chức năng: chưa có dữ liệu.</p>`}
      ${i && i.sp ? `<p><b>Setpoint / alarm:</b> ${esc(i.sp)}</p>` : ""}${i && i.src && ts !== "none" ? `<p class="mut"><small>Nguồn: ${esc(i.src)}</small></p>` : ""}</div>`;
    el.innerHTML = `<div class="pidbar"><b>${esc(title || tag)}</b><span class="pidsp"></span>
        <button class="btn sm" data-pz="-1" aria-label="Thu nhỏ">−</button><button class="btn sm" data-pz="1" aria-label="Phóng to">+</button>
        <button class="btn sm" data-pz="0">Về tag</button><button class="btn sm" data-pclose="1">Đóng</button></div>
      ${locs.length > 1 ? `<div class="pidtabs">${locs.map((l, j) => { const d = dw(l.d) || {}; return `<button class="btn sm${j ? "" : " pri"}" data-ploc="${j}">${esc(d.no || l.d)}</button>`; }).join("")}</div>` : ""}
      <div class="pidmeta"></div><div class="pidsc"><div class="pidcv"><img alt=""><svg></svg></div></div>${infoHtml}`;
    document.body.appendChild(el);
    V = { el, locs, P, j: 0, z: 0, url: "" };
    el.addEventListener("click", e => {
      const b = e.target.closest("button"); if (!b) return;
      if (b.dataset.pclose) return close();
      if (b.dataset.ploc != null) { el.querySelectorAll("[data-ploc]").forEach(x => x.classList.toggle("pri", x === b)); show(Number(b.dataset.ploc)); return; }
      if (b.dataset.pz != null) { const s = Number(b.dataset.pz); if (s) zoom(V.z * (s > 0 ? 1.5 : 1 / 1.5)); else center(); }
    });
    el._key = e => { if (e.key === "Escape") close(); }; document.addEventListener("keydown", el._key);
    await show(0);
    return true;
  }
  async function show(j) {
    if (!V) return;
    const l = V.locs[j], d = V.P.drawings.find(x => x.id === l.d); V.j = j;
    V.el.querySelector(".pidmeta").textContent = "Đang tải bản vẽ…";
    let blob = null; try { blob = await image(V.P.id, l.d); } catch (e) { blob = null; } if (!V) return;
    if (V.url) URL.revokeObjectURL(V.url);
    V.url = blob ? URL.createObjectURL(blob) : "";
    const img = V.el.querySelector(".pidcv img"), svg = V.el.querySelector(".pidcv svg");
    V.el.querySelector(".pidmeta").textContent = (d ? [d.no, d.title, d.rev && "Rev " + d.rev].filter(Boolean).join(" · ") : l.d) + (l.lbl ? " — vị trí " + l.lbl + " (kiểm tra lại trên bản vẽ)" : "");
    if (!blob || !d) { V.el.querySelector(".pidsc").innerHTML = `<p class="pidna">Không tải được ảnh bản vẽ ${esc(l.d)} – kiểm tra mạng (lần đầu xem cần mạng) hoặc báo Trưởng phòng.</p>`; return; }
    V.w = d.w; V.h = d.h; V.l = l;
    const r = Math.max(l.r || 0, Math.round(Math.min(d.w, d.h) * 0.012));
    svg.setAttribute("viewBox", `0 0 ${d.w} ${d.h}`);
    svg.innerHTML = `<circle cx="${l.x}" cy="${l.y}" r="${r}" fill="none" stroke="#e00000" stroke-width="${Math.max(4, r * 0.14)}"/>`
      + `<circle cx="${l.x}" cy="${l.y}" r="${r * 1.9}" fill="none" stroke="#e00000" stroke-width="${Math.max(2, r * 0.06)}" stroke-dasharray="${r * 0.3} ${r * 0.2}" opacity=".7"/>`;
    img.src = V.url;
    const sc = V.el.querySelector(".pidsc");
    zoom(Math.max(sc.clientWidth * 2.5 / d.w, sc.clientHeight * 2.5 / d.h), true);
  }
  function zoom(z, toTag) {
    if (!V || !V.w) return;
    const sc = V.el.querySelector(".pidsc"), cv = V.el.querySelector(".pidcv");
    const fit = Math.min(sc.clientWidth / V.w, sc.clientHeight / V.h);
    const cx = (sc.scrollLeft + sc.clientWidth / 2) / (V.w * V.z || 1), cy = (sc.scrollTop + sc.clientHeight / 2) / (V.h * V.z || 1);
    V.z = Math.min(Math.max(z, fit), 2);
    cv.style.width = V.w * V.z + "px"; cv.style.height = V.h * V.z + "px";
    if (toTag) center(); else { sc.scrollLeft = cx * V.w * V.z - sc.clientWidth / 2; sc.scrollTop = cy * V.h * V.z - sc.clientHeight / 2; }
  }
  function center() {
    if (!V || !V.l) return;
    const sc = V.el.querySelector(".pidsc");
    sc.scrollLeft = V.l.x * V.z - sc.clientWidth / 2; sc.scrollTop = V.l.y * V.z - sc.clientHeight / 2;
  }
  function close() {
    if (!V) { const o = document.getElementById("pidv"); if (o) o.remove(); return; }
    if (V.url) URL.revokeObjectURL(V.url);
    document.removeEventListener("keydown", V.el._key); V.el.remove(); V = null;
  }

  window.LabPID = { init, load, remove, sync, upload, busy, unpublish, packs, status, has, info, tripState, open, close, key: KEY };
})();
