/* Mộc ẩn (hidden stamp) cho PDF xuất từ app.
 * Gắn: mã 64 bit = HMAC-SHA256(khóa Phòng, thông tin chính của GCN), cắt 8 byte.
 *   - Giấu trong ảnh trang: lưới ô 16×16 px; ô nền trắng tinh mang bit 1 được hạ xuống 252/255 (mắt thường không thấy).
 *     Ô 16 px trùng khối 8×8 của JPEG nên mã vẫn đọc lại được sau khi nén.
 *   - Giấu trong thông tin file (Keywords): "LPS-MOC1 <mã> <thông tin chính, base64>".
 *   - Ghi dấu vân tay SHA-256 của file vào nhật ký trên máy (lab.pdfLog).
 * Kiểm tra: đọc lại mã trong ảnh, tính lại HMAC từ thông tin trong file bằng khóa Phòng, so vân tay với nhật ký.
 */
(function () {
  const CELL = 16, BITS = 64, BASE_W = 1588, ON = 252;
  const enc = new TextEncoder();
  const b32 = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const hex = buf => Array.from(new Uint8Array(buf), b => b.toString(16).padStart(2, "0")).join("");
  function toCode(bytes) {   // 8 byte → 13 ký tự (5 bit/ký tự)
    let v = 0n; bytes.forEach(b => { v = (v << 8n) | BigInt(b); });
    let s = ""; for (let i = 0; i < 13; i++) { s = b32[Number(v & 31n)] + s; v >>= 5n; }
    return s;
  }
  function codeBits(code) {
    let v = 0n; for (const ch of code) v = (v << 5n) | BigInt(b32.indexOf(ch));
    const out = []; for (let i = BITS - 1; i >= 0; i--) out.push(Number((v >> BigInt(i)) & 1n));
    return out;
  }
  function bitsCode(bits) {
    const bytes = []; for (let i = 0; i < 8; i++) { let b = 0; for (let j = 0; j < 8; j++) b = (b << 1) | bits[i * 8 + j]; bytes.push(b); }
    return toCode(bytes);
  }
  async function hmac(key, text) {
    const k = await crypto.subtle.importKey("raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    return new Uint8Array(await crypto.subtle.sign("HMAC", k, enc.encode(text))).slice(0, 8);
  }
  const fieldsText = f => ["v1", f.certNo, f.type, f.tag, f.serial, f.issueDate, f.calDate, f.result, f.approvedBy].map(x => String(x == null ? "" : x)).join("|");
  async function code(key, f) { return toCode(await hmac(key, fieldsText(f))); }
  const b64 = s => btoa(String.fromCharCode(...enc.encode(s)));
  const unb64 = s => new TextDecoder().decode(Uint8Array.from(atob(s), c => c.charCodeAt(0)));
  function keywords(c, f) { return `LPS-MOC1 ${c} ${b64(JSON.stringify(f))}`; }

  function stamp(canvas, c) {   // canvas: kết quả html2canvas (1588×2246 khi scale 2)
    const bits = codeBits(c), ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height, cols = Math.floor(W / CELL), rows = Math.floor(H / CELL);
    const img = ctx.getImageData(0, 0, W, H), d = img.data;
    let k = 0, marked = 0;
    for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++, k++) {
      if (!bits[k % BITS]) continue;
      let white = true;
      for (let y = r * CELL; y < (r + 1) * CELL && white; y++) for (let x = q * CELL; x < (q + 1) * CELL; x++) {
        const i = (y * W + x) * 4; if (d[i] < 255 || d[i + 1] < 255 || d[i + 2] < 255) { white = false; break; }
      }
      if (!white) continue;
      for (let y = r * CELL; y < (r + 1) * CELL; y++) for (let x = q * CELL; x < (q + 1) * CELL; x++) { const i = (y * W + x) * 4; d[i] = d[i + 1] = d[i + 2] = ON; }
      marked++;
    }
    ctx.putImageData(img, 0, 0);
    return marked;
  }
  // đọc phiếu bầu từ ảnh 1 trang; trả về [số phiếu bit 1, số phiếu bit 0] cho từng vị trí bit
  function votes(imgData, W, H, acc) {
    const d = imgData.data, cell = Math.max(4, Math.round(CELL * W / BASE_W));
    const cols = Math.floor(W / cell), rows = Math.floor(H / cell);
    let k = 0;
    for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++, k++) {
      let s = 0, mn = 255, mx = 0, n = 0;
      for (let y = r * cell + 2; y < (r + 1) * cell - 2; y++) for (let x = q * cell + 2; x < (q + 1) * cell - 2; x++) {
        const i = (y * W + x) * 4, v = (d[i] + d[i + 1] + d[i + 2]) / 3; s += v; n++; if (v < mn) mn = v; if (v > mx) mx = v;
      }
      const m = s / n;
      if (mx - mn > 3 || m < 249) continue;      // ô có chữ / nét: bỏ qua
      if (m < 253.5) acc[k % BITS][0]++; else acc[k % BITS][1]++;
    }
  }
  function pdfJpegs(bytes) {     // ảnh trang JPEG do jsPDF ghi (DCTDecode, không nén thêm)
    const s = new TextDecoder("latin1").decode(bytes), out = [];
    const re = /<<([^<>]*\/DCTDecode[^<>]*)>>\s*stream\r?\n/g; let m;
    while ((m = re.exec(s))) {
      const len = +((m[1].match(/\/Length (\d+)/) || [])[1] || 0); if (!len) continue;
      out.push(bytes.slice(m.index + m[0].length, m.index + m[0].length + len));
    }
    return out;
  }
  async function readImageCode(bytes) {
    const acc = Array.from({ length: BITS }, () => [0, 0]);
    const jpgs = pdfJpegs(bytes); let ones = 0;
    for (const j of jpgs) {
      const bm = await createImageBitmap(new Blob([j], { type: "image/jpeg" }));
      const cv = document.createElement("canvas"); cv.width = bm.width; cv.height = bm.height;
      const ctx = cv.getContext("2d"); ctx.drawImage(bm, 0, 0);
      votes(ctx.getImageData(0, 0, bm.width, bm.height), bm.width, bm.height, acc);
    }
    acc.forEach(a => { ones += a[0]; });
    const bits = acc.map(a => (a[0] > a[1] ? 1 : 0));
    const agree = acc.reduce((t, a) => t + Math.max(a[0], a[1]), 0), total = acc.reduce((t, a) => t + a[0] + a[1], 0);
    return { pages: jpgs.length, found: ones >= BITS, code: ones >= BITS ? bitsCode(bits) : "", agree: total ? agree / total : 0 };
  }
  async function sha256(blobOrBytes) {
    const buf = blobOrBytes instanceof Blob ? await blobOrBytes.arrayBuffer() : blobOrBytes;
    return hex(await crypto.subtle.digest("SHA-256", buf));
  }
  // đọc chuỗi /Keywords trong PDF: chuỗi (…) có ký tự thoát hoặc chuỗi <hex>, kể cả UTF-16 (khi file bị phần mềm khác lưu lại)
  function keywordStrings(s) {
    const out = [], re = /\/Keywords\s*([(<])/g; let m;
    while ((m = re.exec(s))) {
      let i = m.index + m[0].length, bytes = [];
      if (m[1] === "<") { const e = s.indexOf(">", i); const h = s.slice(i, e).replace(/\s+/g, ""); for (let k = 0; k + 1 < h.length; k += 2) bytes.push(parseInt(h.substr(k, 2), 16)); }
      else {
        let depth = 1;
        for (; i < s.length && depth; i++) {
          let c = s[i];
          if (c === "\\") {
            const n = s[++i];
            if (/[0-7]/.test(n)) { let o = n; while (o.length < 3 && /[0-7]/.test(s[i + 1])) o += s[++i]; bytes.push(parseInt(o, 8) & 255); continue; }
            const map = { n: 10, r: 13, t: 9, b: 8, f: 12 }; if (n === "\r" || n === "\n") continue;
            bytes.push(map[n] != null ? map[n] : n.charCodeAt(0)); continue;
          }
          if (c === "(") depth++; else if (c === ")") { depth--; if (!depth) break; }
          bytes.push(c.charCodeAt(0) & 255);
        }
      }
      let t;
      if (bytes[0] === 0xFE && bytes[1] === 0xFF) { t = ""; for (let k = 2; k + 1 < bytes.length; k += 2) t += String.fromCharCode((bytes[k] << 8) | bytes[k + 1]); }
      else t = String.fromCharCode(...bytes);
      out.push(t);
    }
    return out;
  }
  function readMeta(bytes) {
    const s = new TextDecoder("latin1").decode(bytes);
    for (const t of keywordStrings(s)) {
      const m = t.match(/LPS-MOC1 ([A-Z2-9]{13}) ([A-Za-z0-9+/=]+)/); if (!m) continue;
      try { return { code: m[1], fields: JSON.parse(unb64(m[2])) }; } catch (e) { return { code: m[1], fields: null }; }
    }
    return null;
  }
  async function verify(bytes, key, log) {
    const sha = await sha256(bytes), meta = readMeta(bytes), img = await readImageCode(bytes);
    const hit = (log || []).find(x => x.sha === sha);
    let fields = meta && meta.fields, from = fields ? "file" : "";
    // thông tin ẩn trong file bị mất (file bị phần mềm khác lưu lại): tìm mã trong nhật ký máy này
    if (!fields && img.found) { const e = (log || []).find(x => x.code === img.code && x.f); if (e) { fields = e.f; from = "log"; } }
    const expect = fields && key ? await code(key, fields) : "";
    let st;
    if (!img.found && !meta) st = "none";
    else if (!img.found || !fields || img.code !== expect || (meta && meta.code !== expect)) st = "bad";
    else st = hit ? "ok" : "changed";
    return { st, sha, meta, img, expect, hit, fields, from };
  }
  window.MOC = { code, keywords, stamp, sha256, verify, readMeta, readImageCode, fieldsText };
})();
