// LAB PVGAS Services – Edge Function "ocr-phieu": nhận ảnh phiếu số liệu gốc, nhờ Gemini chép lại số đọc, trả JSON cho app.
// Khóa GEMINI_API_KEY nằm trong Supabase Secrets, KHÔNG nằm trong app. Chỉ người đã đăng nhập mới gọi được.
// Deploy:  supabase functions deploy ocr-phieu --no-verify-jwt   (hoặc dán code vào Dashboard › Edge Functions)
const MODELS = (Deno.env.get("GEMINI_MODELS") || "gemini-3.5-flash,gemini-3.1-flash-lite").split(",").map((s) => s.trim()).filter(Boolean);
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const N = { type: "NUMBER", nullable: true };
const head = { cert_no: { type: "STRING", nullable: true }, tag: { type: "STRING" }, calib_date: { type: "STRING", nullable: true }, result: { type: "STRING", nullable: true } };
const SCHEMA: Record<string, unknown> = {
  PT: { type: "OBJECT", properties: { ...head, rows: { type: "ARRAY", items: { type: "OBJECT", properties: { inc: N, dec: N, corr_inc: N, corr_dec: N }, required: ["inc", "dec", "corr_inc", "corr_dec"] } } }, required: ["cert_no", "tag", "rows"] },
  PS: { type: "OBJECT", properties: { ...head, rows: { type: "ARRAY", items: { type: "OBJECT", properties: { set_pressure: N, reset_pressure: N, set_dev: N, reset_dev: N }, required: ["set_pressure", "reset_pressure", "set_dev", "reset_dev"] } } }, required: ["cert_no", "tag", "rows"] },
};
const TAIL = "Vietnamese decimal comma means decimal point; output plain numbers. Copy exactly what is written. Do NOT compute, correct or guess. If a digit is illegible or missing, use null for that value.";
const PROMPT: Record<string, string> = {
  PT: "This is a scanned calibration report of a 4-20 mA pressure transmitter. Handwriting is blue ink on a printed form. Transcribe: cert_no (the handwritten number after 'BB.PT.26.', or null if blank), tag (printed Tagname), calib_date, result (handwritten after 'Result'), and the 5-row results table: for each row the handwritten measured output current Increasing (inc) and Decreasing (dec), and the handwritten Correction Increasing (corr_inc) and Decreasing (corr_dec). " + TAIL,
  PS: "This is a scanned calibration report of a pressure switch. Handwriting is blue ink on a printed form. Transcribe: cert_no (the handwritten number after 'BB.PS.26.'), tag (printed Tag No), calib_date, result, and the 5-row results table: for each row the handwritten Set-Pressure (Áp tác động) as set_pressure, Reset-Pressure (Áp trả về) as reset_pressure, Set-deviation (Chênh tác động) as set_dev, Reset-deviation (Chênh trả lại) as reset_dev. " + TAIL,
};
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...CORS, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const key = Deno.env.get("GEMINI_API_KEY");
    if (!key) return json({ error: "no_key", msg: "Chưa cài GEMINI_API_KEY trong Supabase Secrets" });
    // chỉ người đã đăng nhập
    const auth = req.headers.get("Authorization") || "";
    const u = await fetch(Deno.env.get("SUPABASE_URL") + "/auth/v1/user", { headers: { Authorization: auth, apikey: Deno.env.get("SUPABASE_ANON_KEY") || "" } });
    if (!u.ok) return json({ error: "auth", msg: "Chưa đăng nhập" }, 401);
    const { type, image } = await req.json();
    if (!SCHEMA[type]) return json({ error: "type", msg: "Loại thiết bị chưa hỗ trợ" }, 400);
    if (typeof image !== "string" || image.length < 1000 || image.length > 6_000_000) return json({ error: "image", msg: "Ảnh không hợp lệ hoặc quá lớn" }, 400);
    const body = {
      contents: [{ parts: [{ text: PROMPT[type] }, { inline_data: { mime_type: "image/jpeg", data: image } }] }],
      generationConfig: { temperature: 0, responseMimeType: "application/json", responseSchema: SCHEMA[type] },
    };
    let quota = false, last = "";
    for (const model of MODELS) {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, { method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": key }, body: JSON.stringify(body) });
      if (r.status === 429) { quota = true; continue; }
      if (!r.ok) { last = `${model} ${r.status}`; continue; }
      const j = await r.json();
      const txt = j?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || "").join("") || "";
      try { return json({ ok: true, model, data: JSON.parse(txt) }); } catch { last = model + " JSON"; }
    }
    return json(quota ? { error: "quota", msg: "Hết lượt đọc ảnh miễn phí hôm nay (giới hạn của Google). Nhập tay hoặc thử lại sau." } : { error: "fail", msg: "Không đọc được ảnh (" + last + ")" });
  } catch (e) {
    return json({ error: "fail", msg: String(e) }, 500);
  }
});
