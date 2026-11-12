/* LAB PVGAS Services – tra cứu tag trên P&ID (NGOC 12/11/2026).
 * P&ID là tài liệu kỹ thuật nội bộ: KHÔNG có trong repo/web. Mỗi máy tự nạp "gói P&ID" từ file nội bộ,
 * gói chỉ nằm trong IndexedDB của trình duyệt trên máy đó (DB "lab-pvgas-pid").
 *
 * Gói P&ID = 1 file pid-index.json + các file ảnh trang bản vẽ (jpg/png/webp) chọn cùng lúc.
 * pid-index.json:
 * { "format": "lab-pvgas-pid/1", "name": "…", "made": "2026-11-12", "sites": ["mã công trình trong danh mục, vd KLNG"],   // sites: không bắt buộc; có thì chỉ khớp tag của các công trình đó
 *   "drawings": [{ "id": "D1", "no": "số bản vẽ", "title": "…", "rev": "…", "file": "D1.jpg", "w": 4961, "h": 3508 }],
 *   "tags": { "PT1506A": [{ "d": "D1", "x": 1234, "y": 567, "r": 60 }] },          // khoá = tag bỏ dấu cách - _ . / , viết hoa; x,y,r theo pixel ảnh
 *   "info": { "PT1506A": { "fn": "chức năng (theo nguồn)", "sp": "setpoint/alarm (theo nguồn)",
 *                          "trip": [{ "act": "effect/action", "grp": "cụm bị shutdown", "src": "C&E số/rev" }], "src": "nguồn fn/sp" } } }
 * Quy tắc hiển thị: chỉ hiện chức năng/trip có trong gói. "trip" không có = CHƯA CÓ DỮ LIỆU (không phải "không trip");
 * "trip": [] = nguồn C&E ghi rõ không có action. App không tự suy đoán. */
(function () {
  "use strict";
  const KEY = t => String(t || "").toUpperCase().replace(/[\s\-_./]/g, "");
  let dbp = null, IDX = null;
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

  async function init() { try { IDX = (await get("index")) || null; } catch (e) { IDX = null; } return IDX; }

  // files: FileList từ <input type=file multiple>. Trả về thông báo kết quả.
  async function load(files) {
    files = [...files];
    const jf = files.find(f => /\.json$/i.test(f.name));
    if (!jf) throw new Error("Chưa chọn file pid-index.json");
    let ix; try { ix = JSON.parse(await jf.text()); } catch (e) { throw new Error("File " + jf.name + " không phải JSON hợp lệ"); }
    if (!ix || !/^lab-pvgas-pid\/1$/.test(ix.format || "") || !Array.isArray(ix.drawings) || typeof ix.tags !== "object") throw new Error("File JSON không đúng định dạng gói P&ID (format lab-pvgas-pid/1)");
    const imgs = new Map(files.filter(f => f !== jf).map(f => [f.name, f]));
    const miss = ix.drawings.filter(d => !imgs.has(d.file)).map(d => d.file);
    if (miss.length) throw new Error(`Thiếu ${miss.length} ảnh bản vẽ: ${miss.slice(0, 5).join(", ")}${miss.length > 5 ? "…" : ""}. Chọn cùng lúc file JSON và toàn bộ ảnh.`);
    const tags = {}; Object.entries(ix.tags).forEach(([k, v]) => { tags[KEY(k)] = v; });
    const info = {}; Object.entries(ix.info || {}).forEach(([k, v]) => { info[KEY(k)] = v; });
    const clean = { format: ix.format, name: String(ix.name || jf.name), made: ix.made || "", sites: Array.isArray(ix.sites) && ix.sites.length ? ix.sites.map(String) : null, loaded: new Date().toISOString(), drawings: ix.drawings, tags, info };
    await tx("readwrite", s => { s.clear(); s.put(clean, "index"); ix.drawings.forEach(d => s.put(imgs.get(d.file), "img:" + d.id)); });
    IDX = clean;
    return `Đã nạp gói "${clean.name}": ${clean.drawings.length} bản vẽ, ${Object.keys(tags).length} tag`;
  }
  async function clear() { await tx("readwrite", s => s.clear()); IDX = null; }

  const status = () => IDX ? { name: IDX.name, made: IDX.made, loaded: IDX.loaded, nd: IDX.drawings.length, nt: Object.keys(IDX.tags).length } : null;
  // site: mã công trình của thiết bị – tag trùng tên ở công trình khác không được trỏ nhầm sang bản vẽ của gói
  const has = (tag, site) => !!(IDX && IDX.tags[KEY(tag)] && IDX.tags[KEY(tag)].length && (!IDX.sites || !site || IDX.sites.includes(site)));
  const info = tag => (IDX && IDX.info[KEY(tag)]) || null;
  // "trip" = có action trip theo nguồn; "none" = nguồn ghi không có; "" = chưa có dữ liệu
  const tripState = tag => { const i = info(tag); if (!i || !Array.isArray(i.trip)) return ""; return i.trip.length ? "trip" : "none"; };

  /* ---------- viewer ---------- */
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  let V = null;
  async function open(tag, title) {
    if (!has(tag)) return false;
    const k = KEY(tag), locs = IDX.tags[k], dw = id => IDX.drawings.find(d => d.id === id);
    close();
    const el = document.createElement("div"); el.id = "pidv"; el.setAttribute("role", "dialog"); el.setAttribute("aria-label", "P&ID " + tag);
    const i = info(tag), ts = tripState(tag);
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
    V = { el, locs, j: 0, z: 0, url: "" };
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
    const l = V.locs[j], d = IDX.drawings.find(x => x.id === l.d); V.j = j;
    const blob = await get("img:" + l.d); if (!V) return;
    if (V.url) URL.revokeObjectURL(V.url);
    V.url = blob ? URL.createObjectURL(blob) : "";
    const img = V.el.querySelector(".pidcv img"), svg = V.el.querySelector(".pidcv svg");
    V.el.querySelector(".pidmeta").textContent = d ? [d.no, d.title, d.rev && "Rev " + d.rev].filter(Boolean).join(" · ") : l.d;
    if (!blob || !d) { V.el.querySelector(".pidsc").innerHTML = `<p class="pidna">Không đọc được ảnh bản vẽ ${esc(l.d)} – nạp lại gói P&amp;ID.</p>`; return; }
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

  window.LabPID = { init, load, clear, status, has, info, tripState, open, close, key: KEY };
})();
