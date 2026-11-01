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

  async function addUser(name, role, pin) {
    name = String(name || "").trim();
    if (!name) throw new Error("Nhập họ tên");
    if (!okPin(pin)) throw new Error("PIN phải gồm 4–8 chữ số");
    if (users.some(u => u.name.toLowerCase() === name.toLowerCase())) throw new Error("Tên này đã có");
    const s = salt(); const u = { id: "u" + Date.now().toString(36), name, role: Number(role) || 1, salt: s, hash: await hash(s, pin), created: new Date().toISOString() };
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
      <label>Họ tên<input id="an" autocomplete="name"></label><label>PIN (4–8 số)<input id="ap" type="password" inputmode="numeric" autocomplete="new-password"></label>
      <label>Nhập lại PIN<input id="ap2" type="password" inputmode="numeric" autocomplete="new-password"></label><button class="btn pri" id="ago">Tạo tài khoản</button>`);
    g.querySelector("#ago").onclick = async () => {
      const p = g.querySelector("#ap").value;
      if (p !== g.querySelector("#ap2").value) return err("Hai lần nhập PIN không giống nhau");
      try { const u = await addUser(g.querySelector("#an").value, 3, p); login(u); } catch (e) { err(e.message); }
    };
  }
  function showLogin(msg) {
    const last = ls.get("lastUser", "");
    const g = gate(`${msg ? `<p class="mut">${esc(msg)}</p>` : ""}<label>Người dùng<select id="au">${users.map(u => `<option value="${u.id}"${u.id === last ? " selected" : ""}>${esc(u.name)} – ${ROLES[u.role]}</option>`).join("")}</select></label>
      <label>PIN<input id="ap" type="password" inputmode="numeric" autocomplete="current-password"></label><button class="btn pri" id="ago">Đăng nhập</button>
      <p class="hint">Quên PIN: nhờ Trưởng phòng đặt lại trong Cài đặt › Người dùng.</p>`);
    const go = async () => {
      const u = users.find(x => x.id === g.querySelector("#au").value), p = g.querySelector("#ap").value;
      if (!u) return;
      if (await hash(u.salt, p) !== u.hash) { err("Sai PIN"); g.querySelector("#ap").value = ""; return; }
      login(u);
    };
    g.querySelector("#ago").onclick = go;
    g.querySelector("#ap").onkeydown = e => { if (e.key === "Enter") go(); };
    setTimeout(() => g.querySelector("#ap").focus(), 50);
  }
  function login(u) {
    me = u; ss.set(u.id); ls.set("lastUser", u.id); lastAct = Date.now();
    const g = document.getElementById("auth"); if (g) g.hidden = true; document.body.classList.remove("locked");
    chip(); if (onReady) onReady(me);
  }
  function logout(msg) { me = null; ss.set(null); chip(); showLogin(msg); }
  function chip() {
    const h = document.querySelector("header.top"); if (!h) return;
    let c = h.querySelector(".me"); if (!c) { c = document.createElement("button"); c.className = "me"; c.onclick = () => logout("Đã đăng xuất"); h.appendChild(c); }
    c.hidden = !me; if (me) c.innerHTML = `${esc(me.name)} · cấp ${me.role} <span>Đăng xuất</span>`;
  }

  /* ---------- quản lý người dùng (tab Cài đặt) ---------- */
  function accountCard() {
    if (!me) return "";
    const mine = `<div class="card"><h2>Tài khoản</h2><p>Đang đăng nhập: <b>${esc(me.name)}</b> – ${ROLES[me.role]}.</p>
      <div class="grid"><label class="f"><span>PIN mới (4–8 số)</span><input id="u_mypin" type="password" inputmode="numeric" autocomplete="new-password"></label></div>
      <div class="btns"><button class="btn" data-u="mypin">Đổi PIN của tôi</button><button class="btn" data-u="logout">Đăng xuất</button></div>
      <p class="hint">Quyền: cấp 1 nhập liệu và lưu hồ sơ; cấp 2 thêm duyệt và xoá hồ sơ; cấp 3 thêm thư viện chuẩn, cài đặt, số chứng chỉ, người dùng. Khoá tự động sau ${IDLE_MIN / 60} giờ không thao tác.
      Đây là khoá trên máy này (danh sách người dùng lưu trong trình duyệt), chưa phải bảo mật máy chủ.</p></div>`;
    if (!can("users")) return mine;
    const rows = users.map(u => `<div class="rec"><div><b>${esc(u.name)}</b> <span class="tag">cấp ${u.role}</span><br><small class="mut">${ROLES[u.role]}</small></div>
      <div class="ra"><select data-urole="${u.id}">${[1, 2, 3].map(r => `<option value="${r}"${u.role === r ? " selected" : ""}>Cấp ${r}</option>`).join("")}</select>
      <button class="btn sm" data-u="pin" data-id="${u.id}">Đặt PIN</button>${u.id === me.id ? "" : `<button class="btn sm" data-u="del" data-id="${u.id}">Xoá</button>`}</div></div>`).join("");
    return mine + `<div class="card"><h2>Người dùng <small>(${users.length})</small></h2>
      <div class="grid"><label class="f"><span>Họ tên</span><input id="u_name"></label>
      <label class="f"><span>Cấp</span><select id="u_role">${[1, 2, 3].map(r => `<option value="${r}">${r} – ${ROLES[r]}</option>`).join("")}</select></label>
      <label class="f"><span>PIN ban đầu (4–8 số)</span><input id="u_pin" type="password" inputmode="numeric" autocomplete="new-password"></label></div>
      <div class="btns"><button class="btn pri" data-u="add">Thêm người dùng</button><button class="btn" data-u="export">Xuất danh sách (JSON)</button><label class="btn">Nhập danh sách<input type="file" id="u_imp" accept=".json,application/json" hidden></label></div>
      <p class="hint">Danh sách người dùng chỉ nằm trên máy này. Muốn dùng cùng tài khoản trên máy khác: Xuất danh sách ở đây rồi Nhập ở máy kia (PIN đã băm, không lộ số).</p>${rows}</div>`;
  }
  async function onAccountClick(e, rerender, toast) {
    const b = e.target.closest("button[data-u]"); if (!b) return false;
    const a = b.dataset.u, val = id => (document.getElementById(id) || {}).value || "";
    try {
      if (a === "logout") { logout("Đã đăng xuất"); return true; }
      if (a === "mypin") { await setPin(me.id, val("u_mypin")); toast("Đã đổi PIN"); rerender(); }
      if (!can("users")) return true;
      if (a === "add") { const u = await addUser(val("u_name"), val("u_role"), val("u_pin")); toast("Đã thêm " + u.name); rerender(); }
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
          let n = 0; d.users.forEach(u => { if (u && u.id && u.name && u.hash && !users.some(x => x.id === u.id || x.name === u.name)) { users.push(u); n++; } });
          save(); toast(`Đã nhập ${n} người dùng`); rerender();
        } catch (x) { toast(x.message); }
      };
      fr.readAsText(t.files[0]); return true;
    }
    return false;
  }

  function start(cb) {
    onReady = cb;
    const id = ss.get(), u = id && users.find(x => x.id === id);
    if (u) login(u); else if (!users.length) showSetup(); else showLogin();
    ["click", "keydown", "touchstart", "input"].forEach(ev => document.addEventListener(ev, () => { lastAct = Date.now(); }, true));
    setInterval(() => { if (me && Date.now() - lastAct > IDLE_MIN * 60000) logout(`Đã khoá sau ${IDLE_MIN / 60} giờ không thao tác`); }, 30000);
  }

  window.LabAuth = { ROLES, start, can, me: () => me, accountCard, onAccountClick, onAccountChange };
})();
