/* LAB PVGAS Services – đồng bộ qua Supabase (NGOC chọn 01/11/2026: "Supabase (tự động)").
 * Nguyên tắc: app vẫn chạy offline trên từng máy (localStorage + IndexedDB) như cũ; lớp này đẩy thay đổi lên máy chủ
 * và kéo thay đổi của máy khác về. Hồ sơ nào sửa sau cùng (rec.updated) thì thắng. Xoá = đánh dấu deleted (cấp 2/3).
 * Quyền do máy chủ kiểm soát (cloud/setup.sql – Row Level Security): cấp 1 chỉ ghi hồ sơ của mình, không duyệt, không xoá;
 * thư viện chuẩn và Cài đặt chỉ cấp 3 ghi. Khoá "anon" để công khai trong mã là đúng thiết kế của Supabase.
 * Chưa điền CONFIG thì app chạy như trước (PIN trên máy, chuyển JSON tay). */
(function () {
  "use strict";
  const CONFIG = {
    url: "https://tdfrxxpzgoahetgoyfzd.supabase.co",        // Project URL, ví dụ https://abcd1234.supabase.co
    key: "sb_publishable_qYPRzVNn4DgQJ_StxPfGyw_0RugpVAQ",        // Publishable key sb_publishable_… (hoặc anon cũ). KHÔNG dùng secret / service_role
    domain: "lab-pvgas.local"   // ID ngoc.nm → email nội bộ ngoc.nm@lab-pvgas.local (phải trùng public.lab_domain() trong setup.sql)
  };
  const toEmail = id => { const t = String(id || "").trim().toLowerCase(); return t.includes("@") ? t : t + "@" + CONFIG.domain; };
  const enabled = !!(CONFIG.url && CONFIG.key && window.supabase && window.supabase.createClient);
  const ls = {
    get(k, d) { try { const v = localStorage.getItem("lab.cloud." + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem("lab.cloud." + k, JSON.stringify(v)); } catch (e) { } }
  };
  const isUuid = s => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(s || ""));
  let sb = null, app = null, me = null, busy = false, again = false, timer = null, channel = null;
  let state = { status: "off", at: null, msg: "" };
  // sent: id → rec.updated đã có trên máy chủ (để biết hồ sơ nào cần đẩy); dels: id hồ sơ đã xoá trên máy này, chờ đẩy
  let sent = ls.get("sent", {}), dels = ls.get("dels", []), phSent = ls.get("ph", {}), sharedSent = ls.get("shared", {});

  function client() {
    if (!sb && enabled) sb = window.supabase.createClient(CONFIG.url, CONFIG.key, { auth: { persistSession: true, autoRefreshToken: true, storageKey: "lab.sb.auth" } });
    return sb;
  }
  function setState(status, msg) {
    state = { status, at: status === "ok" ? new Date() : state.at, msg: msg || "" };
    const el = document.getElementById("cloudst"); if (el) paint(el);
  }
  function pending() {
    if (!app) return 0;
    return app.getRecords().filter(r => r.updated && sent[r.id] !== r.updated).length + dels.length;
  }
  function paint(el) {
    const p = pending(), t = state.at ? state.at.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : "";
    const txt = { ok: `☁ Đã đồng bộ ${t}`, sync: "☁ Đang đồng bộ…", offline: `☁ Ngoại tuyến${p ? ` · ${p} chờ gửi` : ""}`, err: `☁ Lỗi đồng bộ${p ? ` · ${p} chờ gửi` : ""}`, off: "" }[state.status] || "";
    el.textContent = txt; el.className = "cloudst " + state.status; el.title = state.msg || ""; el.hidden = !txt;
  }

  /* ---------- tài khoản ---------- */
  async function session() { const c = client(); if (!c) return null; const { data } = await c.auth.getSession(); return data && data.session; }
  async function profile(uid) {
    const { data, error } = await client().from("profiles").select("*").eq("id", uid).single();
    if (error) throw error; ls.set("profile", data); return data;
  }
  async function signIn(id, password) {
    const { data, error } = await client().auth.signInWithPassword({ email: toEmail(id), password });
    if (error) throw new Error(error.message === "Invalid login credentials" ? "Sai ID hoặc PIN" : error.message);
    return profile(data.user.id);
  }
  async function signUp(email, password, name) {
    const { data, error } = await client().auth.signUp({ email: email.trim(), password, options: { data: { name: name.trim() } } });
    if (error) throw new Error(error.message);
    if (!data.session) return null;   // dự án bật xác nhận email: người dùng mở thư rồi đăng nhập
    return profile(data.user.id);
  }
  async function signOut() { stop(); try { await client().auth.signOut(); } catch (e) { } ls.set("profile", null); }
  async function currentProfile() {
    const s = await session(); if (!s) return null;
    try { return await profile(s.user.id); } catch (e) { const p = ls.get("profile", null); return p && p.id === s.user.id ? p : null; }   // offline: dùng bản lưu
  }
  async function changePassword(pw) {
    const { error } = await client().auth.updateUser({ password: pw });
    if (error && !/different from the old/i.test(error.message)) throw new Error(error.message);
    if (error) throw new Error("PIN mới phải khác PIN cũ");
    await client().rpc("my_pin_changed");
  }
  // cấp 3 tạo tài khoản / đặt lại PIN (hàm admin_create_user, admin_set_pin trong setup.sql – máy chủ kiểm tra cấp 3)
  async function createUser(login, name, role, pin) {
    const { data, error } = await client().rpc("admin_create_user", { p_login: login, p_name: name, p_role: role, p_pin: pin });
    if (error) throw new Error(error.message); return data;
  }
  async function resetPin(id, pin) { const { error } = await client().rpc("admin_set_pin", { p_user: id, p_pin: pin }); if (error) throw new Error(error.message); }
  async function listUsers() { const { data, error } = await client().from("profiles").select("*").order("created_at"); if (error) throw error; return data; }
  async function setRole(id, role) { const { error } = await client().from("profiles").update({ role }).eq("id", id); if (error) throw new Error(error.message); }

  /* ---------- đồng bộ ---------- */
  function attach(api) { app = api; }
  function start(profileRow) {
    if (!enabled) return;
    me = profileRow; setState("sync");
    window.addEventListener("online", () => sync());
    window.addEventListener("offline", () => setState("offline"));
    document.addEventListener("visibilitychange", () => { if (!document.hidden) sync(); });
    clearInterval(timer); timer = setInterval(() => sync(), 60000);
    try {
      channel = client().channel("records-live").on("postgres_changes", { event: "*", schema: "public", table: "records" }, () => schedule(800)).subscribe();
    } catch (e) { }
    sync();
  }
  function stop() { clearInterval(timer); timer = null; me = null; if (channel) { try { client().removeChannel(channel); } catch (e) { } channel = null; } setState("off"); }
  let deb = null;
  function schedule(ms) { if (!me) return; clearTimeout(deb); deb = setTimeout(() => sync(), ms == null ? 1500 : ms); }
  function deleted(id) { if (!me) return; if (!dels.includes(id)) dels.push(id); ls.set("dels", dels); schedule(); }

  async function sync() {
    if (!me || !app) return;
    if (busy) { again = true; return; }
    if (navigator.onLine === false) { setState("offline"); return; }
    busy = true; setState("sync");
    try {
      await pushRecords();
      await pushShared();
      const changed = (await pullRecords()) + (await pullShared());
      await pushPhotos();
      setState("ok");
      if (changed && app.onRemote) app.onRemote();
      pullPhotos().catch(() => { });
    } catch (e) {
      setState(navigator.onLine === false ? "offline" : "err", e && e.message);
    } finally {
      busy = false;
      if (again) { again = false; schedule(300); }
    }
  }

  async function pushRecords() {
    const c = client();
    if (dels.length && me.role >= 2) {
      const ids = dels.slice();
      const { error } = await c.from("records").upsert(ids.map(id => ({ id, data: { id, deleted: true }, deleted: true })), { onConflict: "id" });
      if (error) throw error;
      ids.forEach(id => { sent[id] = "deleted"; }); dels = dels.filter(x => !ids.includes(x)); ls.set("dels", dels); ls.set("sent", sent);
    } else if (dels.length) { dels = []; ls.set("dels", dels); }
    const todo = app.getRecords().filter(r => r.updated && sent[r.id] !== r.updated);
    // cấp 1 chỉ đẩy hồ sơ của mình (máy chủ cũng chặn); hồ sơ người khác sửa trên máy này sẽ bị kéo đè lại
    // v49: máy chủ chỉ cho người nhập, người được chuyển hồ sơ (viewers) và cấp 3 ghi – đẩy hồ sơ khác sẽ làm hỏng cả lô
    const mine = r => me.role >= 3 || (r.owner && (r.owner.id === me.id || (!isUuid(r.owner.id) && r.owner.name === me.name))) || (r.viewers || []).includes(me.id);
    for (let i = 0; i < todo.length; i += 50) {
      const part = todo.slice(i, i + 50).filter(mine);
      if (!part.length) continue;
      const rows = part.map(r => ({ id: r.id, owner: r.owner && isUuid(r.owner.id) ? r.owner.id : me.id, viewers: (r.viewers || []).filter(isUuid), data: r, deleted: false }));
      const { error } = await c.from("records").upsert(rows, { onConflict: "id" });
      if (error && error.code === "23505") {
        // trùng số GCN trên máy chủ (v51): đẩy từng hồ sơ, hồ sơ trùng giữ lại trên máy và báo người dùng, hồ sơ khác vẫn lên
        const bad = [];
        for (let j = 0; j < rows.length; j++) {
          const r1 = await c.from("records").upsert([rows[j]], { onConflict: "id" });
          if (r1.error && r1.error.code === "23505") { bad.push(part[j]); continue; }
          if (r1.error) throw r1.error;
          sent[part[j].id] = part[j].updated;
        }
        ls.set("sent", sent);
        if (bad.length && app.onCertConflict) app.onCertConflict(bad);
        continue;
      }
      if (error) throw error;
      part.forEach(r => { sent[r.id] = r.updated; }); ls.set("sent", sent);
    }
  }
  async function pullRecords() {
    const c = client(); let cursor = ls.get("cursor", "1970-01-01T00:00:00Z"), changed = 0;
    for (;;) {
      const { data, error } = await c.from("records").select("id,data,deleted,updated_at").gt("updated_at", cursor).order("updated_at", { ascending: true }).limit(500);
      if (error) throw error;
      if (!data || !data.length) break;
      const list = app.getRecords().slice(); let dirty = false;
      data.forEach(row => {
        const i = list.findIndex(r => r.id === row.id);
        if (row.deleted) {
          if (i >= 0) { list.splice(i, 1); dirty = true; changed++; }
          sent[row.id] = "deleted"; return;
        }
        const remote = row.data || {};
        if (i < 0 || !((list[i].updated || "") > (remote.updated || ""))) {   // máy chủ mới hơn hoặc bằng: lấy bản máy chủ
          if (i < 0) list.push(app.normalize(remote)); else list[i] = app.normalize(remote);
          sent[row.id] = remote.updated; dirty = true; changed++;
        }
      });
      if (dirty) app.setRecords(list);
      cursor = data[data.length - 1].updated_at; ls.set("cursor", cursor); ls.set("sent", sent);
      if (data.length < 500) break;
    }
    return changed;
  }
  // stands / settings: chỉ cấp 3 đẩy; bản máy chủ cũ hơn bản seed của app (đổi phiên bản app) thì không kéo đè chuẩn gốc
  async function pushShared() {
    if (me.role < 3) return;
    const rows = [];
    ["stands", "settings"].forEach(k => { const v = app.getShared(k), s = JSON.stringify(v); if (sharedSent[k] !== s) rows.push({ key: k, data: { v, seed: app.seedVersion } }); });
    if (!rows.length) return;
    const { error } = await client().from("shared").upsert(rows, { onConflict: "key" });
    if (error) throw error;
    rows.forEach(r => { sharedSent[r.key] = JSON.stringify(r.data.v); }); ls.set("shared", sharedSent);
  }
  async function pullShared() {
    const { data, error } = await client().from("shared").select("key,data,updated_at");
    if (error) throw error;
    let changed = 0; const seen = ls.get("sharedAt", {});
    (data || []).forEach(row => {
      if (seen[row.key] === row.updated_at || !row.data) return;
      seen[row.key] = row.updated_at;
      if (row.key === "stands" && (row.data.seed || 0) < app.seedVersion) return;
      const s = JSON.stringify(row.data.v);
      if (s !== JSON.stringify(app.getShared(row.key))) { app.setShared(row.key, row.data.v); changed++; }
      sharedSent[row.key] = s;
    });
    ls.set("sharedAt", seen); ls.set("shared", sharedSent);
    return changed;
  }
  // Ảnh: kho "photos", tên recId/i.jpg; đẩy ảnh có rec.photos[i].at khác lần đã gửi; kéo ảnh còn thiếu trên máy này
  async function pushPhotos() {
    const P = app.photos, st = client().storage.from("photos");
    for (const r of app.getRecords()) {
      if (me.role < 2 && !(r.owner && (r.owner.id === me.id || r.owner.name === me.name))) continue;
      for (let i = 0; i < (r.photos || []).length; i++) {
        const ph = r.photos[i], key = `${r.id}:${i}`;
        if (!ph || !ph.has || phSent[key] === ph.at) continue;
        const d = await P.get(key).catch(() => null); if (!d) continue;
        const blob = await (await fetch(d)).blob();
        const { error } = await st.upload(`${r.id}/${i}.jpg`, blob, { upsert: true, contentType: "image/jpeg" });
        if (error) throw error;
        phSent[key] = ph.at; ls.set("ph", phSent);
      }
    }
  }
  async function pullPhotos() {
    const P = app.photos, st = client().storage.from("photos");
    for (const r of app.getRecords()) {
      for (let i = 0; i < (r.photos || []).length; i++) {
        const ph = r.photos[i], key = `${r.id}:${i}`;
        if (!ph || !ph.has) continue;
        const have = await P.get(key).catch(() => null);
        if (have && phSent[key] === ph.at) continue;
        if (have && !phSent[key]) { continue; }   // ảnh chụp trên máy này, chưa đẩy
        const { data, error } = await st.download(`${r.id}/${i}.jpg`);
        if (error || !data) continue;
        const url = await new Promise(res => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(data); });
        await P.put(key, url); phSent[key] = ph.at; ls.set("ph", phSent);
      }
    }
  }
  // Lần đầu nối máy chủ trên một máy đã có dữ liệu: mọi hồ sơ cũ được coi là "chưa gửi" và sẽ đẩy lên (cấp 3 đẩy tất cả)
  /* ---------- sao lưu / khôi phục toàn bộ (cấp 3, v50) ---------- */
  // Gói Free không có bản sao lưu tải về được: cấp 3 tải 1 file chứa toàn bộ hồ sơ, thư viện chuẩn, cài đặt, danh sách người dùng (không có PIN).
  async function backupAll() {
    const c = client(), out = { app: "lab-pvgas-services", kind: "server-backup", at: new Date().toISOString(), records: [], shared: [], profiles: [] };
    for (let from = 0; ; from += 1000) {
      const { data, error } = await c.from("records").select("id,owner,viewers,data,deleted,updated_at").order("id").range(from, from + 999);
      if (error) throw error; out.records.push(...(data || [])); if (!data || data.length < 1000) break;
    }
    const s = await c.from("shared").select("key,data,updated_at"); if (s.error) throw s.error; out.shared = s.data || [];
    const p = await c.from("profiles").select("id,login,name,role,created_at"); if (p.error) throw p.error; out.profiles = p.data || [];
    return out;
  }
  async function restoreAll(dump) {
    if (!dump || dump.kind !== "server-backup") throw new Error("Không phải file sao lưu máy chủ");
    const c = client(), recs = (dump.records || []).map(r => ({ id: r.id, owner: r.owner, viewers: r.viewers || [], data: r.data, deleted: !!r.deleted }));
    for (let i = 0; i < recs.length; i += 200) { const { error } = await c.from("records").upsert(recs.slice(i, i + 200), { onConflict: "id" }); if (error) throw error; }
    for (const s of dump.shared || []) { const { error } = await c.from("shared").upsert({ key: s.key, data: s.data }, { onConflict: "key" }); if (error) throw error; }
    ls.set("cursor", "1970-01-01T00:00:00Z"); ls.set("sharedAt", {}); sync();
    return recs.length;
  }
  /* ---------- số GCN duy nhất toàn hệ thống (v51) ---------- */
  async function certNext(pre, lo, hi, id) { const { data, error } = await client().rpc("cert_next", { p_pre: pre, p_lo: lo, p_hi: hi, p_id: id || "" }); if (error) throw error; return data || 0; }
  async function certWho(no, id) { const { data, error } = await client().rpc("cert_who", { p_no: no, p_id: id || "" }); if (error) throw error; return data || null; }
  async function certUsed(pool) { const { data, error } = await client().rpc("cert_used", { p_pool: pool }); if (error) throw error; return data || []; }
  async function usage() { const { data, error } = await client().rpc("storage_usage"); if (error) throw error; return data; }
  const storage = () => client() && client().storage.from("pid");   // kho P&ID riêng tư (pid.js, v69)
  window.LabCloud = { storage, usage, enabled, attach, start, stop, sync, schedule, deleted, backupAll, restoreAll, certNext, certWho, certUsed, signIn, signUp, signOut, currentProfile, changePassword, createUser, resetPin, listUsers, setRole, paint, pending, isUuid };
})();
