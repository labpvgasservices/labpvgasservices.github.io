/* LAB PVGAS Services – đăng nhập bằng PIN, 3 cấp (quyết định của NGOC 30/10/2026: "PIN tạm trong app").
 * Cấp 1 Kiểm định viên: nhập liệu, lưu hồ sơ, xuất QTG / bảng Uncer; chứng chỉ in dấu BẢN NHÁP – CHƯA DUYỆT.
 * Cấp 2 Người kiểm soát: thêm Duyệt hồ sơ (chứng chỉ hết dấu nháp), xoá hồ sơ.
 * Cấp 3 Trưởng phòng / Quản trị: thêm sửa thư viện chuẩn, Cài đặt, sửa số chứng chỉ, quản lý người dùng.
 * Giới hạn: đây là khoá trên từng máy (danh sách người dùng lưu trong trình duyệt, PIN lưu dạng băm SHA-256 có muối),
 * KHÔNG phải bảo mật máy chủ – người rành kỹ thuật vẫn đọc được mã nguồn. Bản chính thức cần đăng nhập qua máy chủ. */
(function () {
  "use strict";
  const ROLES = { 1: "Kiểm định viên", 2: "Người kiểm soát", 3: "Trưởng phòng / Quản trị" };
  const PERM = { approve: 2, deleteRecord: 2, editStands: 3, settings: 3, certNo: 3, users: 3 };
  const IDLE_MIN = 12 * 60;   // NGOC 01/11/2026: tự khoá sau 12 giờ không thao tác (trước đây 30 phút)
  const ls = {
    get(k, d) { try { const v = localStorage.getItem("lab." + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem("lab." + k, JSON.stringify(v)); } catch (e) { } }
  };
  const ss = {
    get() { try { return sessionStorage.getItem("lab.me"); } catch (e) { return null; } },
    set(v) { try { v ? sessionStorage.setItem("lab.me", v) : sessionStorage.removeItem("lab.me"); } catch (e) { } }
  };
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  let users = ls.get("users", []);
  /* ID đăng nhập (NGOC 07/11/2026): "ten.hotenlot" viết liền, không dấu – Nguyễn Minh Ngọc = ngoc.nm, Ngô Như Bách = bach.nn;
   * trùng thì thêm số 1, 2, 3… Họ tên đầy đủ (u.name) mới là chữ in ở ô ký / duyệt trên QTG và GCN. */
  const deaccent = t => String(t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D");
  const okUid = t => /^[a-z]+(\.[a-z]+)?\d*$/.test(t);
  const fullName = t => /\S\s+\S/.test(String(t || "").trim()) && !okUid(String(t).trim().toLowerCase());
  function makeUid(name, taken) {
    const w = deaccent(name).toLowerCase().replace(/[^a-z\s]/g, " ").split(/\s+/).filter(Boolean);
    if (!w.length) return "";
    const last = w.pop(), base = last + (w.length ? "." + w.map(x => x[0]).join("") : "");
    let id = base, n = 1; while (taken && taken.has(id)) id = base + (n++);
    return id;
  }
  const uidSet = (skip) => new Set(users.filter(u => u !== skip).map(u => u.uid).filter(Boolean));
  // Tài khoản cũ chưa có ID: tên đang là dạng ID (vd "ngoc.nm") thì lấy làm ID, còn lại tạo theo quy tắc
  if (users.some(u => !u.uid)) {
    users.forEach(u => { if (u.uid) return; const t = String(u.name || "").trim().toLowerCase(); u.uid = okUid(t) && !uidSet(u).has(t) ? t : makeUid(u.name, uidSet(u)); });
    ls.set("users", users);
  }
  let me = null, lastAct = Date.now(), onReady = null;

  async function hash(salt, pin) {
    const txt = `${salt}:${pin}`;
    if (window.crypto && crypto.subtle) {
      const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(txt));
      return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
    }
    let h = 5381; for (const ch of txt) h = ((h << 5) + h + ch.charCodeAt(0)) >>> 0;   // http://localhost without WebCrypto
    return "d" + h.toString(16);
  }
  const salt = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
  const okPin = p => /^\d{4,8}$/.test(p);
  const save = () => ls.set("users", users);
  const can = p => !!me && me.role >= (PERM[p] || 9);

  async function addUser(name, role, pin, uid) {
    name = String(name || "").trim().replace(/\s+/g, " ");
    if (!name) throw new Error("Nhập họ tên đầy đủ");
    if (!fullName(name)) throw new Error("Ô Họ tên phải là họ tên đầy đủ có dấu (vd Nguyễn Minh Ngọc) – tên viết tắt như ngoc.nm nhập ở ô ID");
    uid = String(uid || "").trim().toLowerCase() || makeUid(name, uidSet());
    if (!okUid(uid)) throw new Error("ID viết liền, không dấu, dạng ten.hotenlot (vd ngoc.nm, bach.nn, có thể thêm số: anh.nt1)");
    if (!okPin(pin)) throw new Error("PIN phải gồm 4–8 chữ số");
    if (users.some(u => u.uid === uid)) throw new Error(`ID ${uid} đã có – thêm số phía sau (vd ${uid}1)`);
    if (users.some(u => u.name.toLowerCase() === name.toLowerCase())) throw new Error("Họ tên này đã có");
    const s = salt(); const u = { id: "u" + Date.now().toString(36), uid, name, role: Number(role) || 1, salt: s, hash: await hash(s, pin), created: new Date().toISOString() };
    users.push(u); save(); return u;
  }
  async function setPin(id, pin) {
    if (!okPin(pin)) throw new Error("PIN phải gồm 4–8 chữ số");
    const u = users.find(x => x.id === id); if (!u) return;
    u.salt = salt(); u.hash = await hash(u.salt, pin); save();
  }
  function admins() { return users.filter(u => u.role === 3).length; }

  /* ---------- màn hình khoá ---------- */
  function gate(html) {
    let g = document.getElementById("auth");
    if (!g) { g = document.createElement("div"); g.id = "auth"; document.body.appendChild(g); }
    g.innerHTML = `<div class="authbox"><h1>LAB PVGAS Services</h1>${html}<p class="err" id="aerr"></p></div>`;
    g.hidden = false; document.body.classList.add("locked");
    return g;
  }
  const err = m => { const e = document.getElementById("aerr"); if (e) e.textContent = m; };
  function showSetup() {
    const g = gate(`<p>Lần đầu dùng trên máy này: tạo tài khoản <b>Trưởng phòng / Quản trị</b>. Người quản trị sẽ thêm Kiểm định viên và Người kiểm soát trong tab Cài đặt.</p>
      <label>Họ tên đầy đủ (in ở ô ký / duyệt)<input id="an" autocomplete="name" placeholder="Nguyễn Minh Ngọc"></label>
      <label>ID đăng nhập (ten.hotenlot)<input id="aid" autocomplete="username" autocapitalize="none" spellcheck="false" placeholder="ngoc.nm"></label>
      <label>PIN (4–8 số)<input id="ap" type="password" inputmode="numeric" autocomplete="new-password"></label>
      <label>Nhập lại PIN<input id="ap2" type="password" inputmode="numeric" autocomplete="new-password"></label><button class="btn pri" id="ago">Tạo tài khoản</button>`);
    g.querySelector("#ago").onclick = async () => {
      const p = g.querySelector("#ap").value;
      if (p !== g.querySelector("#ap2").value) return err("Hai lần nhập PIN không giống nhau");
      try { const u = await addUser(g.querySelector("#an").value, 3, p, g.querySelector("#aid").value); login(u); } catch (e) { err(e.message); }
    };
    autoUid(g.querySelector("#an"), g.querySelector("#aid"));
  }
  // Gõ họ tên → tự gợi ý ID (người dùng vẫn sửa được)
  function autoUid(nameEl, uidEl) {
    if (!nameEl || !uidEl) return;
    nameEl.addEventListener("input", () => { if (!uidEl.dataset.touched) uidEl.value = makeUid(nameEl.value, uidSet()); });
    uidEl.addEventListener("input", () => { uidEl.dataset.touched = uidEl.value ? "1" : ""; });
  }
  function showLogin(msg) {
    const lastU = users.find(u => u.id === ls.get("lastUser", ""));
    const g = gate(`${msg ? `<p class="mut">${esc(msg)}</p>` : ""}<label>ID đăng nhập<input id="au" autocomplete="username" autocapitalize="none" spellcheck="false" placeholder="vd ngoc.nm" value="${esc(lastU ? lastU.uid : "")}"></label>
      <label>PIN<input id="ap" type="password" inputmode="numeric" autocomplete="current-password"></label><button class="btn pri" id="ago">Đăng nhập</button>
      <p class="hint">Quên PIN: nhờ Trưởng phòng đặt lại trong Cài đặt › Người dùng.</p>`);
    const go = async () => {
      const k = g.querySelector("#au").value.trim().toLowerCase(), p = g.querySelector("#ap").value;
      const u = users.find(x => x.uid === k) || users.find(x => x.name.toLowerCase() === k);
      if (!u) return err(k ? `Không có ID "${k}" trên máy này` : "Nhập ID đăng nhập (vd ngoc.nm)");
      if (await hash(u.salt, p) !== u.hash) { err("Sai PIN"); g.querySelector("#ap").value = ""; return; }
      if (u.mustChange) return showNewPin(u, p);
      login(u);
    };
    g.querySelector("#ago").onclick = go;
    g.querySelector("#ap").onkeydown = e => { if (e.key === "Enter") go(); };
    setTimeout(() => g.querySelector(lastU ? "#ap" : "#au").focus(), 50);
  }
  // PIN ban đầu (cấp qua file danh sách) phải đổi ở lần đăng nhập đầu
  function showNewPin(u, oldPin) {
    const g = gate(`<p>Chào <b>${esc(u.name)}</b> (${esc(u.uid)}). Đây là lần đăng nhập đầu: đặt PIN riêng của anh/chị.</p>
      <label>PIN mới (4–8 số)<input id="ap" type="password" inputmode="numeric" autocomplete="new-password"></label>
      <label>Nhập lại PIN mới<input id="ap2" type="password" inputmode="numeric" autocomplete="new-password"></label><button class="btn pri" id="ago">Đổi PIN và vào app</button>`);
    g.querySelector("#ago").onclick = async () => {
      const p = g.querySelector("#ap").value;
      if (p !== g.querySelector("#ap2").value) return err("Hai lần nhập PIN không giống nhau");
      if (p === oldPin) return err("PIN mới phải khác PIN ban đầu");
      try { await setPin(u.id, p); delete u.mustChange; save(); login(u); } catch (e) { err(e.message); }
    };
  }
  function login(u) {
    me = u; ss.set(u.id); ls.set("lastUser", u.id); lastAct = Date.now();
    const g = document.getElementById("auth"); if (g) g.hidden = true; document.body.classList.remove("locked");
    chip(); if (onReady) onReady(me);
  }
  function logout(msg) {
    me = null; ss.set(null); chip();
    if (C && C.enabled) { C.signOut().finally(() => showCloudLogin(msg)); return; }
    showLogin(msg);
  }

  /* ---------- đăng nhập máy chủ (Supabase) – dùng khi cloud.js đã có CONFIG ---------- */
  const C = window.LabCloud;
  function showCloudLogin(msg, signup) {
    const g = gate(signup
      ? `<p>Tạo tài khoản mới. Người đăng ký đầu tiên là Trưởng phòng / Quản trị; người sau chờ Trưởng phòng cấp quyền trong Cài đặt › Người dùng.</p>
        <label>Họ tên<input id="cn" autocomplete="name"></label><label>Email<input id="ce" type="email" autocomplete="email"></label>
        <label>Mật khẩu (ít nhất 8 ký tự)<input id="cp" type="password" autocomplete="new-password"></label>
        <button class="btn pri" id="cgo">Tạo tài khoản</button><p class="hint"><a href="#" id="csw">Đã có tài khoản? Đăng nhập</a></p>`
      : `${msg ? `<p class="mut">${esc(msg)}</p>` : ""}<label>Email<input id="ce" type="email" autocomplete="email" value="${esc(ls.get("lastEmail", ""))}"></label>
        <label>Mật khẩu<input id="cp" type="password" autocomplete="current-password"></label>
        <button class="btn pri" id="cgo">Đăng nhập</button>
        <p class="hint">Dữ liệu đồng bộ giữa điện thoại và máy tính qua máy chủ. <a href="#" id="csw">Tạo tài khoản mới</a></p>`);
    const val = id => (g.querySelector("#" + id) || {}).value || "";
    g.querySelector("#csw").onclick = e => { e.preventDefault(); showCloudLogin("", !signup); };
    const go = async () => {
      err(""); const b = g.querySelector("#cgo"); b.disabled = true;
      try {
        if (signup) {
          if (!val("cn").trim()) throw new Error("Nhập họ tên");
          if (val("cp").length < 8) throw new Error("Mật khẩu ít nhất 8 ký tự");
          const p = await C.signUp(val("ce"), val("cp"), val("cn"));
          if (!p) { showCloudLogin("Đã tạo tài khoản. Mở email xác nhận rồi đăng nhập."); return; }
          ls.set("lastEmail", val("ce").trim()); cloudEnter(p);
        } else {
          const p = await C.signIn(val("ce"), val("cp")); ls.set("lastEmail", val("ce").trim()); cloudEnter(p);
        }
      } catch (x) { err(x.message || String(x)); b.disabled = false; }
    };
    g.querySelector("#cgo").onclick = go;
    g.querySelector("#cp").onkeydown = e => { if (e.key === "Enter") go(); };
  }
  function cloudEnter(p) {
    if (!p) return showCloudLogin();
    if (!(p.role >= 1)) {
      const g = gate(`<p>Tài khoản <b>${esc(p.email || "")}</b> đã tạo, đang chờ Trưởng phòng cấp quyền.</p>
        <div class="btns"><button class="btn pri" id="crt">Kiểm tra lại</button><button class="btn" id="cso">Đăng xuất</button></div>`);
      g.querySelector("#crt").onclick = async () => cloudEnter(await C.currentProfile());
      g.querySelector("#cso").onclick = () => C.signOut().finally(() => showCloudLogin());
      return;
    }
    login({ id: p.id, name: p.name || p.email, role: p.role, email: p.email, cloud: true });
    C.start(p);
  }
  function chip() {
    const h = document.querySelector("header.top"); if (!h) return;
    let c = h.querySelector(".me"); if (!c) { c = document.createElement("button"); c.className = "me"; c.onclick = () => logout("Đã đăng xuất"); h.appendChild(c); }
    c.hidden = !me; if (me) c.innerHTML = `${esc(me.name)}${me.uid ? ` (${esc(me.uid)})` : ""} · cấp ${me.role} <span>Đăng xuất</span>`;
    let st = h.querySelector("#cloudst"); if (!st && C && C.enabled) { st = document.createElement("span"); st.id = "cloudst"; st.className = "cloudst"; st.hidden = true; st.onclick = () => C.sync(); h.appendChild(st); }
    if (st) { if (me) C.paint(st); else st.hidden = true; }
  }

  /* ---------- quản lý người dùng (tab Cài đặt) ---------- */
  function accountCard() {
    if (!me) return "";
    if (me.cloud) {
      const mineC = `<div class="card"><h2>Tài khoản</h2><p>Đang đăng nhập: <b>${esc(me.name)}</b> (${esc(me.email || "")}) – ${ROLES[me.role]}.</p>
        <div class="grid"><label class="f"><span>Mật khẩu mới (ít nhất 8 ký tự)</span><input id="u_mypw" type="password" autocomplete="new-password"></label></div>
        <div class="btns"><button class="btn" data-u="mypw">Đổi mật khẩu</button><button class="btn" data-u="sync">Đồng bộ ngay</button><button class="btn" data-u="logout">Đăng xuất</button></div>
        <p class="hint">Dữ liệu đồng bộ tự động qua máy chủ (khi có mạng). Khoá tự động sau ${IDLE_MIN / 60} giờ không thao tác.</p></div>`;
      if (!can("users")) return mineC;
      setTimeout(loadCloudUsers, 0);
      return mineC + `<div class="card"><h2>Người dùng</h2><p class="hint">Người mới tự tạo tài khoản ở màn hình đăng nhập, rồi Trưởng phòng cấp quyền ở đây. Cấp 0 = khoá / chờ duyệt.</p><div id="cusers"><p class="mut">Đang tải…</p></div></div>`;
    }
    const mine = `<div class="card"><h2>Tài khoản</h2><p>Đang đăng nhập: <b>${esc(me.name)}</b> (ID ${esc(me.uid || "")}) – ${ROLES[me.role]}.</p>
      <div class="grid"><label class="f"><span>PIN mới (4–8 số)</span><input id="u_mypin" type="password" inputmode="numeric" autocomplete="new-password"></label></div>
      <div class="btns"><button class="btn" data-u="mypin">Đổi PIN của tôi</button><button class="btn" data-u="logout">Đăng xuất</button></div>
      <p class="hint">Quyền: cấp 1 nhập liệu và lưu hồ sơ; cấp 2 thêm duyệt và xoá hồ sơ; cấp 3 thêm thư viện chuẩn, cài đặt, số chứng chỉ, người dùng. Khoá tự động sau ${IDLE_MIN / 60} giờ không thao tác.
      Đây là khoá trên máy này (danh sách người dùng lưu trong trình duyệt), chưa phải bảo mật máy chủ.</p></div>`;
    if (!can("users")) return mine;
    const rows = users.map(u => `<div class="rec"><div><b>${esc(u.name)}</b> <span class="tag">${esc(u.uid || "")}</span> <span class="tag">cấp ${u.role}</span>${fullName(u.name) ? "" : ` <span class="tag bad">chưa có họ tên đầy đủ</span>`}<br><small class="mut">${ROLES[u.role]}${u.empNo ? ` · MSNV ${esc(u.empNo)}` : ""}${u.team ? ` · ${esc(u.team)}` : ""}${u.title ? ` · ${esc(u.title)}` : ""}${u.mustChange ? " · chưa đổi PIN ban đầu" : ""}</small></div>
      <div class="ra"><select data-urole="${u.id}">${[1, 2, 3].map(r => `<option value="${r}"${u.role === r ? " selected" : ""}>Cấp ${r}</option>`).join("")}</select>
      <button class="btn sm" data-u="rename" data-id="${u.id}">Sửa họ tên</button><button class="btn sm" data-u="pin" data-id="${u.id}">Đặt PIN</button>${u.id === me.id ? "" : `<button class="btn sm" data-u="del" data-id="${u.id}">Xoá</button>`}</div></div>`).join("");
    return mine + `<div class="card"><h2>Người dùng <small>(${users.length})</small></h2>
      <div class="grid"><label class="f"><span>Họ tên đầy đủ (in ở ô ký / duyệt)</span><input id="u_name" placeholder="Nguyễn Minh Ngọc"></label>
      <label class="f"><span>ID đăng nhập (ten.hotenlot)</span><input id="u_uid" autocapitalize="none" spellcheck="false" placeholder="tự tạo từ họ tên"></label>
      <label class="f"><span>Cấp</span><select id="u_role">${[1, 2, 3].map(r => `<option value="${r}">${r} – ${ROLES[r]}</option>`).join("")}</select></label>
      <label class="f"><span>PIN ban đầu (4–8 số)</span><input id="u_pin" type="password" inputmode="numeric" autocomplete="new-password"></label></div>
      <div class="btns"><button class="btn pri" data-u="add">Thêm người dùng</button><button class="btn" data-u="export">Xuất danh sách (JSON)</button><label class="btn">Nhập danh sách<input type="file" id="u_imp" accept=".json,application/json" hidden></label></div>
      <p class="hint">Danh sách người dùng chỉ nằm trên máy này. Muốn dùng cùng tài khoản trên máy khác: Xuất danh sách ở đây rồi Nhập ở máy kia (PIN đã băm, không lộ số).</p>${rows}</div>`;
  }
  async function loadCloudUsers() {
    const el = document.getElementById("cusers"); if (!el) return;
    try {
      const list = await C.listUsers();
      el.innerHTML = list.map(u => `<div class="rec"><div><b>${esc(u.name || "(chưa có tên)")}</b> <span class="tag">cấp ${u.role}</span><br><small class="mut">${esc(u.email || "")}</small></div>
        <div class="ra"><select data-crole="${u.id}"${u.id === me.id ? " disabled" : ""}>${[0, 1, 2, 3].map(r => `<option value="${r}"${u.role === r ? " selected" : ""}>${r === 0 ? "0 – Khoá / chờ duyệt" : `${r} – ${ROLES[r]}`}</option>`).join("")}</select></div></div>`).join("");
    } catch (x) { el.innerHTML = `<p class="bad">Không tải được danh sách: ${esc(x.message || x)}</p>`; }
  }
  async function onAccountClick(e, rerender, toast) {
    const b = e.target.closest("button[data-u]"); if (!b) return false;
    const a = b.dataset.u, val = id => (document.getElementById(id) || {}).value || "";
    try {
      if (a === "logout") { logout("Đã đăng xuất"); return true; }
      if (a === "sync") { C.sync(); toast("Đang đồng bộ…"); return true; }
      if (a === "mypw") { const p = val("u_mypw"); if (p.length < 8) throw new Error("Mật khẩu ít nhất 8 ký tự"); await C.changePassword(p); toast("Đã đổi mật khẩu"); rerender(); return true; }
      if (a === "mypin") { await setPin(me.id, val("u_mypin")); toast("Đã đổi PIN"); rerender(); }
      if (!can("users")) return true;
      if (a === "add") { const u = await addUser(val("u_name"), val("u_role"), val("u_pin"), val("u_uid")); toast(`Đã thêm ${u.name} – ID ${u.uid}`); rerender(); }
      if (a === "rename") {
        const u = users.find(x => x.id === b.dataset.id); if (!u) return true;
        const n = prompt(`Họ tên đầy đủ của ${u.uid} (in ở ô ký / duyệt)`, fullName(u.name) ? u.name : ""); if (n == null) return true;
        const t = n.trim().replace(/\s+/g, " "); if (!fullName(t)) throw new Error("Phải là họ tên đầy đủ có dấu, vd Nguyễn Minh Ngọc");
        u.name = t; save(); if (me && u.id === me.id) { me = u; chip(); } toast("Đã sửa họ tên"); rerender();
      }
      if (a === "pin") { const p = prompt("PIN mới (4–8 số)"); if (p == null) return true; await setPin(b.dataset.id, p.trim()); toast("Đã đặt PIN"); }
      if (a === "del") { if (!b.dataset.armed) { b.dataset.armed = 1; b.textContent = "Xoá thật?"; return true; } users = users.filter(u => u.id !== b.dataset.id); save(); rerender(); }
      if (a === "export") {
        const blob = new Blob([JSON.stringify({ app: "lab-pvgas-users", users }, null, 1)], { type: "application/json" });
        const l = document.createElement("a"); l.href = URL.createObjectURL(blob); l.download = "lab-pvgas-nguoi-dung.json"; l.click();
      }
    } catch (x) { toast(x.message); }
    return true;
  }
  function onAccountChange(e, rerender, toast) {
    const t = e.target;
    if (t.dataset.crole && can("users")) {
      C.setRole(t.dataset.crole, Number(t.value)).then(() => toast("Đã đổi quyền")).catch(x => toast(x.message)).finally(loadCloudUsers);
      return true;
    }
    if (t.dataset.urole && can("users")) {
      const u = users.find(x => x.id === t.dataset.urole), r = Number(t.value);
      if (u.role === 3 && r < 3 && admins() <= 1) { toast("Phải còn ít nhất 1 Trưởng phòng / Quản trị"); rerender(); return true; }
      u.role = r; save(); if (u.id === me.id) me = u; chip(); rerender(); return true;
    }
    if (t.id === "u_imp" && t.files[0] && can("users")) {
      const fr = new FileReader();
      fr.onload = () => {
        try {
          const d = JSON.parse(fr.result); if (!d || !Array.isArray(d.users)) throw new Error("File không đúng");
          // Trùng ID (hoặc trùng mã tài khoản): cập nhật họ tên / MSNV / tổ / chức danh, GIỮ PIN và cấp đang dùng trên máy này
          let n = 0, up = 0;
          d.users.forEach(u => {
            if (!u || !u.id || !u.name || !u.hash) return;
            if (!u.uid) u.uid = makeUid(u.name, uidSet());
            const x = users.find(y => y.id === u.id || y.uid === u.uid);
            if (x) { ["name", "empNo", "team", "title"].forEach(k => { if (u[k]) x[k] = u[k]; }); if (!x.uid) x.uid = u.uid; up++; if (me && x.id === me.id) me = x; return; }
            if (users.some(y => y.name === u.name)) return;
            users.push(u); n++;
          });
          save(); chip(); toast(`Đã nhập ${n} người dùng mới, cập nhật ${up} người đã có`); rerender();
        } catch (x) { toast(x.message); }
      };
      fr.readAsText(t.files[0]); return true;
    }
    return false;
  }

  function start(cb) {
    onReady = cb;
    if (C && C.enabled) { C.currentProfile().then(p => p ? cloudEnter(p) : showCloudLogin()).catch(() => showCloudLogin()); }
    else {
      const id = ss.get(), u = id && users.find(x => x.id === id);
      if (u) login(u); else if (!users.length) showSetup(); else showLogin();
    }
    ["click", "keydown", "touchstart", "input"].forEach(ev => document.addEventListener(ev, () => { lastAct = Date.now(); }, true));
    setInterval(() => { if (me && Date.now() - lastAct > IDLE_MIN * 60000) logout(`Đã khoá sau ${IDLE_MIN / 60} giờ không thao tác`); }, 30000);
  }

  window.LabAuth = { ROLES, start, can, me: () => me, accountCard, onAccountClick, onAccountChange };
})();
