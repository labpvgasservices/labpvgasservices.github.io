/* LAB PVGAS Services – tab "Công thức": công thức toán học của 9 bộ, viết lại đúng theo code đang chạy (calc.js / calc2.js),
 * mà code đó đã được đối chiếu với các file Uncer Excel của anh Khai (ô Excel ghi dưới mỗi dòng).
 * Yêu cầu NGOC 31/10/2026: người dùng hiểu app đang tính gì; 31/10 (2): viết chuẩn toán học (căn, phân số, chỉ số) –
 * LaTeX dựng thành MathML bằng Temml 0.10.34 (vendor/temml.min.js, chạy offline, dùng font toán của máy).
 * Mục "Khác file Excel" liệt kê mọi chỗ app không làm giống hệt file. */
(function () {
  "use strict";
  const R = String.raw;
  // \displaystyle inline (not display mode) so every equation starts at the left edge; long ones scroll sideways
  const tex = s => { try { return window.temml.renderToString(R`\displaystyle ` + s, { displayMode: false, throwOnError: false }); } catch (e) { return `<code>${s}</code>`; } };
  // f(): one box per formula group – equations joined by ",\qquad" are put on separate lines for a phone screen; then Excel cell / short note
  const f = (t, ref) => `<div class="fx">${t.split(R`,\qquad `).map(x => `<div class="fm">${tex(x)}</div>`).join("")}${ref ? `<div class="fr">${ref}</div>` : ""}</div>`;
  const h = t => `<h4>${t}</h4>`;
  const p = t => `<p>${t}</p>`;
  const ul = a => `<ul>${a.map(x => `<li>${x}</li>`).join("")}</ul>`;
  // Khung "Khác file Excel / cần lưu ý" ẩn khỏi giao diện theo yêu cầu NGOC 01/11/2026 – nội dung vẫn giữ trong mã để tra cứu
  const diff = a => "";
  const T = s => R`\text{${s}}`;
  const STD = "Chuẩn quy đổi sang đơn vị thiết bị theo bảng Stand!A4:K14 (1 bar = 100 kPa = 14,503773773 psi = 1,019716213 kg/cm² = 1000 mbar = 401,47 inH₂O = 10197,162 mmH₂O).";
  const HEAT = (name = R`u_{\text{lò}}`) => f(R`${name}=\sqrt{\left(\frac{\delta_{\text{ổn định}}}{\sqrt3}\right)^2+\left(\frac{\delta_{\text{radial}}}{\sqrt3}\right)^2+\left(\frac{\delta_{\text{axial}}}{\sqrt3}\right)^2}`, "Stand!Stability / Radial / Axial – phân bố chữ nhật");
  const REG = [
    f(R`y=a+b\,x`, "Bình phương tối thiểu trên 10 cặp (5 điểm tăng + 5 điểm giảm)"),
    f(R`S_y=\sqrt{\frac{\sum(y-\bar y)^2-\dfrac{\left[\sum(x-\bar x)(y-\bar y)\right]^2}{\sum(x-\bar x)^2}}{n-2}}`, "STEYX")
  ];

  const SECTIONS = [
    { id: "PT", t: "PT / DPT – Transmitter áp suất 4–20 mA", src: "PT_DGCP_10_2026.xls · sheet DLVN112-2002_Rev2 + Data112 · khớp 31/31 hồ sơ DGCP 10/2026",
      body: h("1. Dữ liệu") + ul(["x: áp suất chuẩn tại 5 điểm; y: dòng đo chiều tăng và chiều giảm (10 cặp x – y)", "span = Max − Min; acc: độ chính xác (%FS); k = 2", STD])
        + h("2. Dòng lý tưởng và hồi quy")
        + f(R`I_j=4+16\cdot\frac{x_j-\text{Min}}{\text{span}}`, "[hàng 21]")
        + REG[0] + f(R`b=\frac{\sum(x-\bar x)(y-\bar y)}{\sum(x-\bar x)^2},\qquad a=\bar y-b\,\bar x`, "[F28 = b, F29 = a]") + REG[1].replace("STEYX", "[F33] STEYX")
        + f(R`S_a=S_y\sqrt{\frac{\sum I^2}{n\sum(I-\bar I)^2}},\qquad S_b=\frac{S_y}{\sqrt{\sum(I-\bar I)^2}},\qquad r=-\frac{\sum I}{\sqrt{n\sum I^2}}`, "[F34, F35, F36]")
        + h("3. Thành phần độ KĐBĐ (% span)")
        + f(R`u_A=\frac{100}{16}\sqrt{S_a^2+I^2S_b^2+2\,I\,S_a S_b\,r}`, "[hàng 23 – 24]")
        + f(R`E_{12}=\frac{U_{\text{chuẩn}}}{\text{Max}_{\text{chuẩn}}-\text{Min}_{\text{chuẩn}}}\cdot100\;(\%),\qquad E_{13}=\%\text{Rdg chuẩn}`, "[E12, E13]")
        + f(R`u_s=\frac{E_{12}\,(\text{Max}_{\text{chuẩn}}-\text{Min}_{\text{chuẩn}})+E_{13}\,|x|}{2\cdot\text{span}}`, "[hàng 38] – quả cân: E12·|x| / (2·span)")
        + f(R`u_v=\sqrt{\left(\frac{H_{12}\,(H_{10}-H_9)}{2\,(20-4)}\right)^2+\left(\frac{H_{13}/(H_{10}-H_9)}{2\sqrt3}\right)^2}`, "[F39] – chuẩn điện mA (Stand2)")
        + f(R`u_c=\sqrt{u_A^2+u_s^2+u_v^2}`, "[hàng 25]")
        + h("4. Độ KĐBĐ mở rộng")
        + f(R`U\%_i=k\cdot\frac{u_{c,\text{tăng}}+u_{c,\text{giảm}}}{2},\qquad U_i=U\%_i\cdot\frac{\text{span}}{100}`, "[I46, K46, J46]")
        + f(R`U_{\max}=\max_i U_i`, "[Data112!CZ]")
        + h("5. Số hiệu chính và kết luận")
        + f(R`\text{SHC}=I_{\text{lý tưởng}}-I_{\text{đo}}\;(\text{mA})`, "chiều tăng và chiều giảm")
        + f(R`\text{ĐẠT}\iff U_{\max}\le\frac{\text{acc}\cdot\text{span}}{100}\;\;\text{và}\;\;\max|\text{SHC}|\le\frac{\text{acc}\cdot16}{100}`, "[Data112!IF]")
        + diff(["App chỉ làm trường hợp \"Đã hiệu chỉnh áp suất = Yes\" (số đọc chuẩn dùng trực tiếp) – như toàn bộ hồ sơ DGCP 10/2026.",
          "U in chứng chỉ: quy tắc NGOC 30/10/2026 – 2 chữ số có nghĩa, làm tròn LÊN (file Excel cộng nửa chữ số rồi làm tròn; ví dụ PT-1506A file in 0,080, app in 0,081).",
          "Không đạt: không cấp số chứng chỉ, không xuất chứng chỉ (quy tắc 30/10/2026)."]) },

    { id: "PS", t: "PS / DPS – Công tắc áp suất", src: "PS_DGCP_10_2026.xls · sheet \"DLVN133 - 2004\" + Data133 · khớp 13/13 hồ sơ DGCP 10/2026",
      body: h("1. Dữ liệu") + ul(["P<sub>set</sub>; 5 lần đọc P<sub>H</sub> (tăng áp) và P<sub>L</sub> (giảm áp); acc (% Pset); d: độ chia thước đặt mức; k = 2; n = 5", STD])
        + h("2. Chiều tác động")
        + f(R`G_i=P_{\text{set}}-P_{H,i},\qquad H_i=P_{\text{set}}-P_{L,i}`, "[G20:H24]")
        + f(R`\text{Falling nếu }\left|\bar G\right|>\left|\bar H\right|,\;\text{ngược lại Rising}`, "[E9]")
        + h("3. Độ KĐBĐ")
        + f(R`u_{A,\text{mở}}=\sqrt{\frac{\sum_{i=1}^{n}\left(P_{H,i}-\bar P_H\right)^2}{n(n-1)}},\qquad u_{A,\text{đóng}}=\sqrt{\frac{\sum_{i=1}^{n}\left(P_{L,i}-\bar P_L\right)^2}{n(n-1)}}`, "[F26, F27]")
        + f(R`E_{14}=\frac{U_{\text{chuẩn}}}{\text{FS}-\text{Min}}\cdot100\;(\%),\qquad G_{14}=\%\text{Rdg chuẩn}`, "")
        + f(R`u_{B,\text{chuẩn}}=\frac{E_{14}\cdot\text{FS}+G_{14}\cdot P_{\text{set}}}{100\cdot2}`, "[F31] – quả cân: E14·Pset / 200")
        + f(R`u_{B,\text{pg}}=\frac{d}{2}`, "[F32]")
        + f(R`u_c=\sqrt{u_A^2+u_{B,\text{chuẩn}}^2+\left(\frac{u_{B,\text{pg}}}{\sqrt3}\right)^2}`, "[F34 mở, F35 đóng]")
        + f(R`U=k\cdot u_c\quad(\text{Rising: mở; Falling: đóng})`, "[F37, F38, I42]")
        + h("4. Kết luận")
        + f(R`\text{ĐẠT}\iff \max_i\left|P_{\text{tác động},i}-P_{\text{set}}\right|+U\le\frac{\text{acc}\cdot P_{\text{set}}}{100}`, "[J42 ≤ K42, D47]")
        + diff(["U in chứng chỉ: 2 chữ số có nghĩa, làm tròn LÊN, dấu chấm thập phân (quy tắc 30/10/2026).",
          "QTG đánh dấu chiều tác động bằng tay; nếu khác chiều do số liệu suy ra (ô E9) thì app cảnh báo."]) },

    { id: "PG", t: "PG – Áp kế lò xo (kiểm định)", src: "PG_08_Data_Rev2026_Oct-2026.xlsm · sheet Data08 · ĐLVN 08:2011",
      body: p("Kiểm định – không tính độ KĐBĐ.")
        + f(R`\text{SHC}_{\text{tăng}}=P_{\text{chuẩn}}-P_{\text{đọc tăng}},\qquad \text{SHC}_{\text{giảm}}=P_{\text{chuẩn}}-P_{\text{đọc giảm}}`, "[AX..BG]")
        + f(R`\Delta_{\text{cho phép}}=\frac{\text{acc}\,(\text{Max}-\text{Min})}{100}`, "[EX]")
        + f(R`\text{ĐẠT}\iff\max|\text{SHC}|\le\Delta_{\text{cho phép}}`, "[EY, EV]")
        + f(R`\text{Sụt áp}=\frac{P_{\text{trước}}-P_{\text{sau}}}{P_{\text{trước}}}\cdot100\%<5\%`, "mẫu QTG")
        + diff(["Sheet tháng 10/2026 trỏ SHC chiều tăng nhầm sang cột Falling; app dùng số đọc chiều tăng (như bố cục tháng 5/2026).",
          "Hệ số sai số 0,8 / 1,0 trên QTG chỉ để in – Data08 không dùng khi kết luận."]) },

    { id: "DPG", t: "DPG / PDI – Đồng hồ chênh áp", src: "DVK_ĐVT_PG GPP_2026_KNV.xls · sheet DLVN76_2001 + Data76 · khớp 8/8 hồ sơ PDI GPP 2026",
      body: h("1. Hồi quy theo áp suất x (10 cặp chuẩn – đọc)")
        + REG[0] + REG[1].replace("STEYX", "[F31] STEYX")
        + f(R`S_a=S_y\sqrt{\frac{\sum x^2}{n\sum(x-\bar x)^2}},\qquad S_b=\frac{S_y}{\sqrt{\sum(x-\bar x)^2}},\qquad r=-\frac{\sum x}{\sqrt{n\sum x^2}}`, "[F32, F33, F34]")
        + h("2. Thành phần")
        + f(R`u_A=\sqrt{S_a^2+x^2S_b^2+2\,x\,S_aS_b\,r}`, "[hàng 22] – đơn vị đồng hồ")
        + f(R`u_s=\frac{E_{12}\,(\text{Max}_{\text{chuẩn}}-\text{Min}_{\text{chuẩn}})+E_{13}\,|x|}{2\cdot\text{span}}\;(\%)`, "[hàng 36]")
        + f(R`u_v=\frac{1}{2}\cdot\frac{d\cdot100/\text{span}}{\sqrt6}\;(\%)`, "[F37] – d: độ chia nhỏ nhất")
        + f(R`u_c=\sqrt{u_A^2+u_s^2+u_v^2}`, "[hàng 23]")
        + f(R`U\%_i=k\cdot\frac{u_{c,\text{tăng}}+u_{c,\text{giảm}}}{2},\qquad U_i=U\%_i\cdot\frac{\text{span}}{100},\qquad U_{\max}=\max_i U_i`, "[I44, K44, J44, Data76!CR]")
        + f(R`\text{ĐẠT}\iff U_{\max}+\max|\text{SHC}|\le\frac{\text{acc}\cdot\text{span}}{100}`, "[HX, IA]")
        + diff(["Hàng 23 của file cộng u<sub>A</sub> (đơn vị đồng hồ) chung với các thành phần % – app giữ nguyên như file.",
          "GCN mẫu PDI-0101 in U = 1,05 do ô GI bị sửa tay (ROUNDUP); công thức chuẩn của file cho 1,041.",
          "Công thức hiệu chuẩn trên GCN mẫu in \"y = 0.000 + 0.001 x\" (lỗi mẫu); app in a, b thật.",
          "APM30: %Rdg trong file 0,001, thư viện chuẩn của app 0 – chờ NGOC chốt."]) },

    { id: "TS", t: "TS – Công tắc nhiệt độ", src: "LFS_TS 09 2026.xls · sheet DLVNTM13 + DataTM13 · DVK.LAB.TM.13",
      body: p("T<sub>m</sub>: 5 lần nhiệt độ tác động theo chiều đã chọn; T<sub>d</sub>: 5 lần chiều còn lại [C23:C27, D23:D27].")
        + f(R`u_{tm}=\sqrt{\frac{\sum_{i=1}^{n}\left(T_{m,i}-\bar T_m\right)^2}{n(n-1)}},\qquad u_{td}=\sqrt{\frac{\sum_{i=1}^{n}\left(T_{d,i}-\bar T_d\right)^2}{n(n-1)}}`, "[F30, F31]")
        + f(R`u_{ch1}=\frac{U_{\text{chuẩn}}}{k},\qquad u_{ch2}=0`, "[F33, F34] – u<sub>ch2</sub> chỉ dùng khi có SPRT/BlackStack")
        + HEAT("u_{ch3}")
        + f(R`u_{ch}=\sqrt{u_{ch1}^2+u_{ch2}^2+u_{ch3}^2}`, "[F36]")
        + f(R`u_c=\sqrt{u_{tm}^2+u_{ch}^2},\qquad U=k\cdot u_c`, "[F38/F39, F41/F42]")
        + f(R`\text{ĐẠT}\iff U>0\;\;\text{và}\;\;\max_i\left|T_{\text{set đọc},i}-T_{\text{set}}\right|\le\frac{\text{acc}\cdot T_{\text{set}}}{100}`, "[D51]")
        + diff(["U in chứng chỉ: ROUND 2 chữ số như file (chưa áp quy tắc làm tròn lên – chờ NGOC chốt cho TS)."]) },

    { id: "TT", t: "TT – Transmitter nhiệt độ", src: "1.TT_LFS_CM_26.xls · sheets DLVN188.2-2 + STDEV calc + Data188 · DVK.LAB.TM.12",
      body: f(R`C_j=\frac{\text{span}}{16}\;(°\text{C/mA}),\qquad n=3`, "[F7, F24]")
        + p("Dải của điểm theo số đọc chuẩn đầu tiên: ≤ 150 °C thấp; 150 – 400 °C trung; > 400 °C cao [F21:F23].")
        + f(R`T_{\text{chuẩn}}=\overline{T}_{\text{6 lần (tăng + giảm)}},\qquad I_{\text{lý tưởng}}=4+16\cdot\frac{T_{\text{chuẩn}}-\text{Min}}{\text{span}}`, "[E60, G60]")
        + f(R`\text{SHC}=I_{\text{lý tưởng}}-\bar I_{\text{đo}},\qquad \text{Sai lệch}=\frac{\max|\text{SHC}|}{16}\cdot100\%`, "[M60, O60]")
        + h("Mỗi dải (thấp / trung / cao)")
        + f(R`U_{ltb}=\sqrt{\frac{1}{m}\sum s_j^2},\qquad u_{ch4}=\frac{U_{ltb,\text{chuẩn}}}{\sqrt n}`, "[F36] – s<sub>j</sub>: độ lệch chuẩn từng nhóm số đọc chuẩn trong dải")
        + f(R`u_{ch1}=\frac{U_{\text{chuẩn}}}{2},\qquad u_{ch3}=u_{\text{lò}},\qquad u_{ch5}=0`, "")
        + f(R`u_{ch2}=\sqrt{\left(\frac{L_{17}\,C_j}{2}\right)^2+\left(\frac{N_{17}\,C_j}{2\sqrt3}\right)^2}`, "[F40] – ampe kế")
        + f(R`u_{ch}=\sqrt{u_{ch4}^2+u_{ch1}^2+u_{ch5}^2+u_{ch2}^2+u_{ch3}^2}`, "")
        + f(R`u_{bk1}=\frac{U_{ltb,\text{DUT}}\,C_j}{\sqrt n},\qquad u_{bk2}=\frac{\Delta_{\text{hồi trễ}}\,C_j}{2\sqrt3},\qquad u_{bk3}=\frac{0{,}5\cdot\text{phân giải}\cdot C_j}{\sqrt3}`, "[F49, F52]")
        + f(R`U=2\sqrt{u_{ch}^2+u_{bk1}^2+u_{bk2}^2+u_{bk3}^2}`, "")
        + f(R`\text{ĐẠT}\iff\max\left(\text{Sai lệch},\,U_{\text{thấp}},\,U_{\text{trung}},\,U_{\text{cao}},\,\max|\text{SHC}|\right)\le\frac{\text{acc}\cdot\text{span}}{100}`, "[FI, FJ]")
        + diff(["Điểm 1 phân dải bằng \"&lt; 400\", các điểm khác \"≤ 400\" – giữ như file.",
          "Dải thấp chỉ có 1 điểm: chứng chỉ không in dòng U dải thấp (như Data188).",
          "U in chứng chỉ: 2 chữ số có nghĩa, làm tròn LÊN (quy tắc 30/10/2026)."]) },

    { id: "RTD", t: "RTD – Nhiệt điện trở Platin", src: "RTD_DK_CM_2026_.xls · sheet \"DLVN125 NK chuan + do Ohm\" + Data125 · ĐLVN 125:2003",
      body: p("R̄<sub>i</sub>, s<sub>i</sub>: trung bình và độ lệch chuẩn 5 lần đọc điện trở ở điểm i; S: độ nhạy (Ω/°C) [M31:R31, M32:Q32].")
        + f(R`R(t)=R_0+R_0A\,t+R_0B\,t^2\quad(\text{Min}\ge0)`, "[AB38:AB40] – bình phương tối thiểu 5 điểm")
        + f(R`R(t)=R_0\left[1+A\,t+B\,t^2+C\,t^3(t-100)\right]\quad(\text{Min}<0)`, "[AL39:AL42, AL53:AN53]")
        + f(R`u_{DUT6}=\sqrt{\frac{\sum_{i=1}^{5}\left(R_{\text{fit},i}-\bar R_i\right)^2}{(5-3)\,S}}`, "[Q36]")
        + f(R`O_{33}=\frac{1}{5}\sum_{i=1}^{5}s_i^2,\qquad u_{DUT5}=\frac{O_{33}}{\sqrt n\,S},\qquad u_{DUT4}=\frac{\left|\bar R_6-\bar R_3\right|}{2\sqrt3\,S}`, "[Q34, Q35]")
        + f(R`u_{ch1}=\frac{U_{\text{chuẩn}}}{k},\qquad u_{ch3}=u_{\text{lò}}`, "[G35, G37] – Max ≥ 150 °C dùng chuẩn dải cao; Max ≥ 140 °C dùng lò 2")
        + f(R`u_{ch2}=\sqrt{\left(\frac{U\%\cdot R_{\max}/100}{S\,k}\right)^2+\left(\frac{\delta_{\Omega}/S}{2\sqrt3}\right)^2}`, "[G36] – thiết bị đo điện trở")
        + f(R`U=2\sqrt{u_{ch}^2+u_{DUT}^2}`, "[G39, G40]")
        + f(R`\Delta t_i=\frac{R_{\text{fit},i}-R_{\text{hàm chuẩn}}(t_i)}{S},\qquad \text{ĐẠT}\iff\max|\Delta t|+U\le\frac{\text{acc}\cdot\text{span}}{100}`, "[ET, EV]")
        + diff(["O33 trong file không lấy căn bậc hai – giữ như file, cần xác nhận.",
          "Điểm không có trong \"Bảng giá trị chuẩn\" của file: app dùng IEC 60751 (có đánh dấu *)."]) },

    { id: "TG", t: "TG – Đồng hồ nhiệt độ", src: "TG_GPP 08-2026_Phuoc_.xlsm · sheets DLVN138.2-1 + STDEV Calc + Data138 · khớp 44/45 hồ sơ (1 hồ sơ chỉ khác nhãn \"03\")",
      body: f(R`T_{\text{chuẩn}}=\frac{\bar T_{\text{tăng}}+\bar T_{\text{giảm}}}{2},\qquad \text{SHC}=T_{\text{chuẩn}}-\bar T_{\text{đọc tăng}}`, "[G55, M55]")
        + p("Dải: ≤ 150 °C thấp (Stand1 + lò 1); 150 – 400 °C trung, > 400 °C cao (Stand2 + lò 2) [I21:M23].")
        + f(R`u_{ch4}=\frac{U_{ltb,\text{chuẩn}}}{\sqrt3},\qquad u_{ch1}=\frac{U_{\text{chuẩn}}}{k},\qquad u_{ch3}=u_{\text{lò}},\qquad u_{ch2}=0`, "[hàng 34 – 37]")
        + f(R`u_{bk2}=\frac{U_{ltb,\text{DUT}}}{\sqrt3},\qquad u_{bk1}=\frac{\Delta_{\text{hồi trễ}}}{2\sqrt3},\qquad u_{bk3}=\frac{F_7\,d}{\sqrt3}`, "[F46, F47, F48] – F7 = 1 kim, 0,5 số")
        + f(R`U=2\sqrt{u_{ch4}^2+u_{ch1}^2+u_{ch3}^2+u_{bk1}^2+u_{bk2}^2+u_{bk3}^2}`, "[F51]")
        + f(R`\text{ĐẠT}\iff\max\left(U_{\max},\,\max|\text{SHC}|\right)\le\frac{\text{acc}\cdot\text{span}}{100}`, "[EG, DZ]")
        + diff(["U in chứng chỉ: ROUND 2 như Data138 (có thể nhỏ hơn U tính, VD 0,5829 → 0,58) – chờ NGOC chốt áp quy tắc làm tròn lên."]) },

    { id: "TC", t: "TC – Cặp nhiệt điện", src: "TC_GPP_2026_.xlsm · sheets DLVN161 + Ref + Data161 · khớp 66/66 hồ sơ GPP 2026 (đều loại J)",
      body: f(R`E_{\text{ref}}(t)=\sum_{i=0}^{10}C_i\,t^i+\alpha_0\,e^{\alpha_1(t-126{,}9686)^2}`, "[Ref, I62] – hàm chuẩn ITS-90; α<sub>0</sub>, α<sub>1</sub> chỉ khác 0 với loại K, t > 0")
        + f(R`\Delta E=\bar E_{\text{đo}}-E_{\text{ref}}(t_{\text{chuẩn}}),\qquad \Delta t=\operatorname{sgn}(\Delta E)\sum_{i}D_i\,|\Delta E|^{i}`, "[O62] – D<sub>i</sub>: hệ số hàm ngược ITS-90")
        + f(R`\Delta E_K=E_{\text{đo}}-E_K(t)=a_0+a_1t+a_2t^2`, "[S38:Y59] – bình phương tối thiểu 8 điểm")
        + h("Độ KĐBĐ (8 điểm, 5 lần đọc; S = 0,053 mV/°C loại J, 0,041 mV/°C loại K)")
        + f(R`U_{ltb}=\sqrt{\frac{s_1^2+s_3^2+s_5^2+s_7^2}{8}},\qquad u_{ch9}=\frac{U_{ltb,\text{chuẩn}}}{\sqrt5}`, "[F34, F35, F36] – chỉ điểm 1, 3, 5, 7; s tính STDEV có cả hàng trung bình")
        + f(R`u_{ch7}=\frac{U_{\text{bù đầu tự do}}}{k},\qquad u_{ch8}=u_{\text{lò}},\qquad u_{ch1}=\frac{U_{\text{chuẩn}}}{k}`, "[F37, F38, F41] – Max ≤ 140 °C lò 1; Max ≥ 155 °C chuẩn 2")
        + f(R`u_{bk6}=\frac{U_{ltb,\text{DUT}}}{\sqrt5},\qquad u_{bk1}=\frac{U\%_{mV}\cdot E_8/100}{k\,S},\qquad u_{bk2}=\frac{0{,}5\,d_{mV}}{\sqrt3\,S}`, "[F52, F53, F54]")
        + f(R`u_{bk7}=\sqrt{\frac{\sum_{i=1}^{8}\left(\Delta E_{K,i}-\widehat{\Delta E}_{K,i}\right)^2}{5\,S}},\qquad u_{bk8}=0{,}1\%\cdot\text{Max}`, "[F55, M55]")
        + f(R`U=2\sqrt{u_{ch9}^2+u_{ch7}^2+u_{ch8}^2+u_{ch1}^2+u_{bk6}^2+u_{bk1}^2+u_{bk2}^2+u_{bk7}^2+u_{bk8}^2}`, "[F58]")
        + f(R`\text{ĐẠT}\iff U+\max|\Delta t|\le\frac{\text{acc}\cdot\text{span}}{100}`, "[Data161!HE]")
        + diff(["Hồi quy ΔE luôn dùng bảng loại K, kể cả cặp nhiệt loại J – giữ như file.",
          "u<sub>ch7</sub> dùng U thiết bị bù đầu tự do 0,2 °C (Fluke 1620A trong file anh Khai); NGOC cho rằng 1620A không liên quan – để trong Cài đặt, đặt 0 để bỏ.",
          "Điểm âm: hàm ngược dải 1 bỏ C1 vì ô Ref!$JH$37 trống – giữ như file.",
          "Loại K chưa có hồ sơ mẫu để đối chiếu."]) }
  ];

  let cache = null;
  function render() {
    if (cache) return cache;
    const nav = SECTIONS.map(s => `<button class="chip fchip" data-fj="${s.id}"><b>${s.id}</b></button>`).join("");
    return cache = `<div class="card"><h2>Công thức tính <small>(9 bộ)</small></h2>
      <p class="hint">Viết lại đúng công thức app đang chạy, đã đối chiếu với các file Uncer Excel của anh Khai. Ô Excel ghi dưới mỗi công thức để Quality Checker dò lại. Muốn xem số cụ thể của một hồ sơ: mở hồ sơ, bấm "Bảng Uncer (QC)". Công thức dài thì vuốt ngang.</p>
      <div class="chips fnav">${nav}</div>
      <details class="fsec" id="f-common"><summary><b>Chung cho mọi bộ</b></summary>
        ${f(R`\bar x=\frac{1}{n}\sum_{i=1}^{n}x_i,\qquad s=\sqrt{\frac{\sum_{i=1}^{n}(x_i-\bar x)^2}{n-1}}`, "AVERAGE, STDEV")}
        ${f(R`u=\frac{a}{\sqrt3}\;(\text{phân bố chữ nhật}),\qquad u=\frac{U}{k}\;(\text{chuẩn có GCN})`, "")}
        ${HEAT()}
        ${f(R`u_c=\sqrt{\sum_i u_i^2},\qquad U=k\cdot u_c,\quad k=2\;(\approx95\%)`, "")}
        ${p("U của chuẩn: lấy U lớn nhất trên toàn dải của GCN chuẩn (quyết định NGOC 31/10/2026) – vì vậy U có thể lớn hơn file Excel cũ.")}
      </details>
      ${SECTIONS.map(s => `<details class="fsec" id="f-${s.id}"><summary><b>${s.t}</b><br><small class="mut">${s.src}</small></summary>${s.body}</details>`).join("")}
    </div>`;
  }
  window.LabFormulas = { render, SECTIONS };
})();
