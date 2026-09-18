# -*- coding: utf-8 -*-
"""Sinh file Word: Tiểu phẩm ATTP + Phiếu học tập."""
import os
from docx import Document
from docx.shared import Pt, RGBColor, Cm
from docx.enum.text import WD_ALIGN_PARAGRAPH

OUT = os.path.join(os.path.dirname(__file__), "..", "exports",
                   "Tieu_pham_ATTP_va_Phieu_hoc_tap.docx")
OUT = os.path.abspath(OUT)
os.makedirs(os.path.dirname(OUT), exist_ok=True)

doc = Document()

# ---- Base style ----
style = doc.styles["Normal"]
style.font.name = "Times New Roman"
style.font.size = Pt(12)

def title(text, size=20, color=(0, 0, 0), space_after=6):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run(text)
    r.bold = True
    r.font.size = Pt(size)
    r.font.color.rgb = RGBColor(*color)
    p.paragraph_format.space_after = Pt(space_after)
    return p

def h1(text):
    p = doc.add_paragraph()
    r = p.add_run(text)
    r.bold = True
    r.font.size = Pt(14)
    r.font.color.rgb = RGBColor(0x1D, 0x4E, 0xD8)
    p.paragraph_format.space_before = Pt(10)
    p.paragraph_format.space_after = Pt(4)
    return p

def h2(text):
    p = doc.add_paragraph()
    r = p.add_run(text)
    r.bold = True
    r.font.size = Pt(12.5)
    r.font.color.rgb = RGBColor(0x0F, 0x76, 0x6E)
    p.paragraph_format.space_before = Pt(8)
    p.paragraph_format.space_after = Pt(3)
    return p

def para(text, bold=False, italic=False, indent=None):
    p = doc.add_paragraph()
    r = p.add_run(text)
    r.bold = bold
    r.italic = italic
    if indent:
        p.paragraph_format.left_indent = Cm(indent)
    p.paragraph_format.space_after = Pt(2)
    return p

def bullet(text):
    p = doc.add_paragraph(style="List Bullet")
    p.add_run(text)
    p.paragraph_format.space_after = Pt(1)
    return p

def nhan_vat(name, line):
    p = doc.add_paragraph()
    r = p.add_run(name + ": ")
    r.bold = True
    p.add_run(line)
    p.paragraph_format.left_indent = Cm(0.5)
    p.paragraph_format.space_after = Pt(1)
    return p

def chi_dan(text):
    p = doc.add_paragraph()
    r = p.add_run(text)
    r.italic = True
    r.font.color.rgb = RGBColor(0x6B, 0x72, 0x80)
    p.paragraph_format.left_indent = Cm(0.5)
    p.paragraph_format.space_after = Pt(1)
    return p

# ===================== TRANG BÌA =====================
title("TIỂU PHẨM", size=22, color=(0x1D, 0x4E, 0xD8), space_after=0)
title("\u201cĐỘI ĐẶC NHIỆM TỦ LẠNH\u201d", size=20, space_after=4)
sub = doc.add_paragraph()
sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = sub.add_run("Môn: Khoa học tự nhiên  —  Chủ đề: An toàn vệ sinh thực phẩm")
r.font.size = Pt(12)
r.italic = True

doc.add_paragraph()

h1("I. THÔNG TIN CHUNG")
bullet("Thời lượng: 5\u20137 phút.")
bullet("Nhân vật (4): Cô Dạ Dày, Tí, Mẹ Tí, Thần Đau Bụng.")
bullet("Đạo cụ: bảng tên; 1 hộp sữa (dán giấy ghi \u201chết hạn\u201d che đi); 1 gói bim bim rách miệng; rổ rau; 1 con cá nhựa; cái bát có màn che.")
bullet("Mục tiêu: sau khi xem, học sinh rút ra được khái niệm, biểu hiện thực phẩm không an toàn, tác hại và biện pháp phòng tránh.")

# ===================== KỊCH BẢN =====================
doc.add_page_break()
title("KỊCH BẢN TIỂU PHẨM", size=18, color=(0x1D, 0x4E, 0xD8))

h1("CẢNH 1 — Trước cổng trường (giờ ra chơi)")
chi_dan("(Tí hí hửng cầm hộp sữa và gói bim bim cũ.)")
nhan_vat("Tí", "\u00ca, b\u00e0 b\u00e1n rong h\u1ea1 gi\u00e1 \u201cmua 1 t\u1eb7ng 1\u201d! H\u1ed9p n\u00e0y c\u00f2n 2 ng\u00e0y n\u1eefa h\u1ebft h\u1ea1n... \u0103n lu\u00f4n cho ti\u1ebft ki\u1ec7m, c\u00f3 sao \u0111\u00e2u!")
chi_dan("(Cô Dạ Dày thò đầu từ hậu trường, hốt hoảng.)")
nhan_vat("Cô Dạ Dày", "T\u00ed \u01a1i \u0111\u1eebng!! Tui ng\u1eedi th\u1ea5y m\u00f9i l\u1ea1 l\u1eafm! C\u00e1i g\u00f3i bim bim r\u00e1ch mi\u1ec7ng k\u00eca ru\u1ed3i \u0111\u1eadu l\u00ean r\u1ed3i!")
nhan_vat("Tí", "K\u1ec7 b\u00e0, tui u\u1ed1ng \u0111\u00e2y.")
chi_dan("(Tí tu ừng ực hộp sữa, nhai bim bim rôm rốp.)")

h1("CẢNH 2 — Tối hôm đó: Tí đau bụng, Mẹ khám bệnh (gộp)")
chi_dan("(Tí ôm bụng lăn lộn trên giường. Thần Đau Bụng nhảy ra cười khành khạch.)")
nhan_vat("Thần Đau Bụng", "Ta l\u00e0 Th\u1ea7n \u0110au B\u1ee5ng! Nh\u1edd mi u\u1ed1ng s\u1eefa h\u1ebft h\u1ea1n + bim bim r\u00e1ch mi\u1ec7ng ru\u1ed3i \u0111\u1eadu, ta m\u1edbi c\u00f3 c\u1eeda v\u00e0o! Gi\u1edd mi \u0111au \u0111\u1ea7u, ch\u00f3ng m\u1eb7t, b\u1ee5ng qu\u1eb7n t\u1eebng c\u01a1n!")
nhan_vat("Tí", "(g\u00e0o) C\u1ee9u con v\u1edbi m\u1eb9 \u01a1i!!")
chi_dan("(Mẹ Tí bước vào, cầm rổ rau và con cá, nghiêm giọng.)")
nhan_vat("Mẹ Tí", "Con b\u1ecb ng\u1ed9 \u0111\u1ed9c th\u1ef1c ph\u1ea9m r\u1ed3i. \u0110\u1ed3 h\u1ebft h\u1ea1n, \u0111\u1ed3 r\u00e1ch mi\u1ec7ng, \u0111\u1ed3 ru\u1ed3i \u0111\u1eadu \u2014 \u0111\u00f3 l\u00e0 th\u1ef1c ph\u1ea9m kh\u00f4ng an to\u00e0n!")
nhan_vat("Thần Đau Bụng", "(co r\u00fam l\u1ea1i) \u01a0... sao b\u00e0 bi\u1ebft h\u1ebft v\u1eady...")
nhan_vat("Mẹ Tí", "Nghe \u0111\u00e2y, \u0111\u1ed3 \u0103n kh\u00f4ng an to\u00e0n l\u00e0 \u0111\u1ed3:")
bullet("Nhi\u1ec5m vi sinh v\u1eadt v\u00e0 \u0111\u1ed9c t\u1ed1 \u2014 nh\u01b0 h\u1ed9p s\u1eefa h\u1ebft h\u1ea1n vi khu\u1ea9n sinh s\u00f4i.")
bullet("Bi\u1ebfn ch\u1ea5t, \u00f4i thiu \u2014 ch\u1ee9a histamine g\u00e2y d\u1ecb \u1ee9ng.")
bullet("Nhi\u1ec5m ch\u1ea5t \u0111\u1ed9c ho\u00e1 h\u1ecdc \u2014 ch\u00ec, formaldehyde t\u1eeb \u0111\u1ed3 b\u1ea9n.")
bullet("C\u00f3 s\u1eb5n \u0111\u1ed9c t\u1ed1 \u2014 m\u1ea7m khoai t\u00e2y c\u00f3 solanine, c\u00e1 n\u00f3c c\u00f3 tetrodotoxin.")
chi_dan("(Thần Đau Bụng lùi dần, run lẩy bẩy.)")

h1("CẢNH 3 — \u201cHu\u1ea5n luy\u1ec7n\u201d phòng bệnh + ch\u1ed1t ki\u1ebfn th\u1ee9c")
nhan_vat("Mẹ Tí", "(n\u1eafm tay T\u00ed) Nh\u1edb 5 b\u00ed k\u00edp \u0111u\u1ed5i Th\u1ea7n \u0110au B\u1ee5ng nh\u00e9:")
bullet("Ch\u1ecdn \u0111\u1ed3 ngu\u1ed3n g\u1ed1c r\u00f5 r\u00e0ng, c\u00f2n h\u1ea1n s\u1eed d\u1ee5ng.")
bullet("Rau s\u1ed1ng ph\u1ea3i r\u1eeda k\u1ef9, s\u01a1 ch\u1ebf s\u1ea1ch.")
bullet("Th\u1ecbt, c\u00e1 ph\u1ea3i n\u1ea5u ch\u00edn; kh\u00f4ng \u0111\u1ec3 l\u1eabn \u0111\u1ed3 s\u1ed1ng v\u1edbi \u0111\u1ed3 \u0111\u00e3 n\u1ea5u ch\u00edn.")
bullet("\u0110\u1ed3 d\u1ec5 h\u1ecfng b\u1ecf t\u1ee7 l\u1ea1nh.")
bullet("\u0110\u1ed3 n\u1ea5u xong che \u0111\u1eady k\u1ef9, kh\u00f4ng cho ru\u1ed3i \u0111\u1eadu.")
nhan_vat("Cô Dạ Dày", "(kho\u1ebb l\u1ea1i, nh\u1ea3y c\u1eabng) \u0110\u00fang r\u1ed3i! An to\u00e0n v\u1ec7 sinh th\u1ef1c ph\u1ea9m l\u00e0 gi\u1eef cho \u0111\u1ed3 \u0103n kh\u00f4ng nhi\u1ec5m khu\u1ea9n, kh\u00f4ng nhi\u1ec5m \u0111\u1ed9c, kh\u00f4ng bi\u1ebfn ch\u1ea5t!")
nhan_vat("Thần Đau Bụng", "(gi\u01a1 tay \u0111\u1ea7u h\u00e0ng) Thua r\u1ed3i! Tui \u0111i \u0111\u00e2y!")
chi_dan("(Thần Đau Bụng chạy biến. Cả nhóm quay xuống khán giả.)")
nhan_vat("Cả nhóm", "C\u00e1c b\u1ea1n \u01a1i \u2014 \u0103n ch\u00edn, u\u1ed1ng s\u00f4i, ch\u1ecdn \u0111\u1ed3 s\u1ea1ch, \u0111u\u1ed5i Th\u1ea7n \u0110au B\u1ee5ng!")
chi_dan("(Cả lớp vỗ tay.)")

# ===================== PHIẾU HỌC TẬP =====================
doc.add_page_break()
title("PHI\u1ebeU H\u1eccC T\u1eacP", size=18, color=(0x0F, 0x76, 0x6E))
para("H\u1ecd v\u00e0 t\u00ean: ....................................................  L\u1edbp: .................", bold=True)

h1("Ph\u1ea7n A \u2014 Tr\u1eafc nghi\u1ec7m (khoanh tròn đáp án đúng nhất)")

def cau(no, text, opts):
    p = doc.add_paragraph()
    p.add_run(f"C\u00e2u {no}. ").bold = True
    p.add_run(text)
    p.paragraph_format.space_before = Pt(4)
    for o in opts:
        pp = doc.add_paragraph()
        pp.add_run(o)
        pp.paragraph_format.left_indent = Cm(0.8)
        pp.paragraph_format.space_after = Pt(0)

cau(1, "An to\u00e0n v\u1ec7 sinh th\u1ef1c ph\u1ea9m l\u00e0 g\u00ec?", [
    "A. Gi\u1eef cho th\u1ef1c ph\u1ea9m kh\u00f4ng b\u1ecb nhi\u1ec5m khu\u1ea9n, nhi\u1ec5m \u0111\u1ed9c v\u00e0 bi\u1ebfn ch\u1ea5t.",
    "B. N\u1ea5u ch\u00edn t\u1ea5t c\u1ea3 c\u00e1c lo\u1ea1i th\u1ef1c ph\u1ea9m tr\u01b0\u1edbc khi \u0103n.",
    "C. Ch\u1ec9 \u0103n th\u1ef1c ph\u1ea9m \u0111\u00f3ng h\u1ed9p \u0111\u1ec3 b\u1ea3o qu\u1ea3n l\u00e2u.",
    "D. Kh\u00f4ng \u0103n rau s\u1ed1ng \u0111\u1ec3 tr\u00e1nh nhi\u1ec5m khu\u1ea9n.",
])
cau(2, "Bi\u1ec3u hi\u1ec7n n\u00e0o sau \u0111\u00e2y KH\u00d4NG ph\u1ea3i l\u00e0 th\u1ef1c ph\u1ea9m kh\u00f4ng an to\u00e0n?", [
    "A. Nhi\u1ec5m vi sinh v\u1eadt v\u00e0 \u0111\u1ed9c t\u1ed1.",
    "B. Th\u1ee9c \u0103n \u00f4i thiu ch\u1ee9a histamine.",
    "C. Th\u1ef1c ph\u1ea9m c\u00f2n h\u1ea1n s\u1eed d\u1ee5ng, ngu\u1ed3n g\u1ed1c r\u00f5 r\u00e0ng.",
    "D. Nhi\u1ec5m ho\u00e1 ch\u1ea5t \u0111\u1ed9c nh\u01b0 ch\u00ec, formaldehyde.",
])
cau(3, "Ch\u1ea5t \u0111\u1ed9c c\u00f3 s\u1eb5n trong m\u1ea7m khoai t\u00e2y l\u00e0:", [
    "A. Histamine.",
    "B. Solanine.",
    "C. Tetrodotoxin.",
    "D. Formaldehyde.",
])
cau(4, "Khi \u0103n ph\u1ea3i th\u1ef1c ph\u1ea9m kh\u00f4ng an to\u00e0n, c\u01a1 th\u1ec3 c\u00f3 th\u1ec3 b\u1ecb:", [
    "A. Ng\u1ed9 \u0111\u1ed9c th\u1ef1c ph\u1ea9m.",
    "B. R\u1ed1i lo\u1ea1n ti\u00eau ho\u00e1 (\u0111\u1ea7y h\u01a1i, \u0111au b\u1ee5ng, ti\u00eau ch\u1ea3y).",
    "C. R\u1ed1i lo\u1ea1n th\u1ea7n kinh (\u0111au \u0111\u1ea7u, ch\u00f3ng m\u1eb7t, h\u00f4n m\u00ea, t\u00ea li\u1ec7t chi).",
    "D. T\u1ea5t c\u1ea3 c\u00e1c \u00fd tr\u00ean.",
])
cau(5, "Bi\u1ec7n ph\u00e1p n\u00e0o gi\u00fap ph\u00f2ng ch\u1ed1ng ng\u1ed9 \u0111\u1ed9c th\u1ef1c ph\u1ea9m?", [
    "A. Mua \u0111\u1ed3 r\u1ebb \u0111ang c\u1eadn h\u1ea1n s\u1eed d\u1ee5ng \u0111\u1ec3 ti\u1ebft ki\u1ec7m.",
    "B. \u0110\u1ec3 l\u1eabn th\u1ef1c ph\u1ea9m \u0103n s\u1ed1ng v\u1edbi th\u1ef1c ph\u1ea9m c\u1ea7n n\u1ea5u ch\u00edn.",
    "C. Ch\u1ecdn th\u1ef1c ph\u1ea9m r\u00f5 ngu\u1ed3n g\u1ed1c, n\u1ea5u ch\u00edn, b\u1ea3o qu\u1ea3n l\u1ea1nh \u0111\u1ed3 d\u1ec5 h\u1ecfng.",
    "D. \u0102n ngay th\u1ef1c ph\u1ea9m \u0111\u00e3 \u0111\u1ec3 h\u1edf qua \u0111\u00eam kh\u00f4ng che \u0111\u1eady.",
])

h1("Ph\u1ea7n B \u2014 \u0110i\u1ec1n khuy\u1ebft (điền từ/cụm từ thích hợp vào chỗ trống)")
def dkhuyet(no, text):
    p = doc.add_paragraph()
    p.add_run(f"C\u00e2u {no}. ").bold = True
    p.add_run(text)
    p.paragraph_format.space_before = Pt(4)

dkhuyet(1, "An to\u00e0n v\u1ec7 sinh th\u1ef1c ph\u1ea9m l\u00e0 gi\u1eef cho th\u1ef1c ph\u1ea9m kh\u00f4ng b\u1ecb ...................., .................... v\u00e0 .................... .")
dkhuyet(2, "Th\u1ee9c \u0103n \u00f4i thiu ch\u1ee9a ch\u1ea5t .................... g\u00e2y d\u1ecb \u1ee9ng; m\u1ea7m khoai t\u00e2y ch\u1ee9a ch\u1ea5t \u0111\u1ed9c .................... .")
dkhuyet(3, "\u0102n ph\u1ea3i th\u1ef1c ph\u1ea9m kh\u00f4ng an to\u00e0n c\u00f3 th\u1ec3 b\u1ecb .................... th\u1ef1c ph\u1ea9m v\u00e0 .................... ti\u00eau ho\u00e1.")
dkhuyet(4, "C\u00e1c th\u1ef1c ph\u1ea9m d\u1ec5 h\u1ecfng nh\u01b0 rau, qu\u1ea3, c\u00e1 t\u01b0\u01a1i, th\u1ecbt t\u01b0\u01a1i c\u1ea7n \u0111\u01b0\u1ee3c ....................; th\u1ef1c ph\u1ea9m c\u1ea7n \u0111\u01b0\u1ee3c .................... tr\u01b0\u1edbc khi \u0103n.")

h1("Ph\u1ea7n C \u2014 V\u1eadn d\u1ee5ng ng\u1eafn")
para("Vi\u1ebft 2\u20133 c\u00e2u \u0111\u1ec3 khuy\u00ean b\u1ea1n T\u00ed: khi mua \u0111\u1ed3 \u0103n v\u1eb7t \u1edf c\u1ed5ng tr\u01b0\u1eddng, b\u1ea1n \u1ea5y c\u1ea7n ch\u00fa \u00fd \u0111i\u1ec1u g\u00ec \u0111\u1ec3 kh\u00f4ng b\u1ecb Th\u1ea7n \u0110au B\u1ee5ng \u201cgh\u00e9 th\u0103m\u201d?", italic=False)
for _ in range(3):
    doc.add_paragraph("............................................................................................................")

# ===================== ĐÁP ÁN =====================
doc.add_page_break()
title("\u0110\u00c1P \u00c1N (d\u00e0nh cho giáo viên)", size=16, color=(0xB4, 0x23, 0x18))
h2("Ph\u1ea7n A")
for line in ["C\u00e2u 1 \u2013 A", "C\u00e2u 2 \u2013 C", "C\u00e2u 3 \u2013 B", "C\u00e2u 4 \u2013 D", "C\u00e2u 5 \u2013 C"]:
    bullet(line)
h2("Ph\u1ea7n B")
bullet("C\u00e2u 1: nhi\u1ec5m khu\u1ea9n \u2013 nhi\u1ec5m \u0111\u1ed9c \u2013 bi\u1ebfn ch\u1ea5t.")
bullet("C\u00e2u 2: histamine \u2013 solanine.")
bullet("C\u00e2u 3: ng\u1ed9 \u0111\u1ed9c \u2013 r\u1ed1i lo\u1ea1n.")
bullet("C\u00e2u 4: b\u1ea3o qu\u1ea3n l\u1ea1nh \u2013 n\u1ea5u ch\u00edn.")
h2("Ph\u1ea7n C (g\u1ee3i \u00fd)")
para("Ch\u1ecdn \u0111\u1ed3 c\u00f2n h\u1ea1n, ngu\u1ed3n g\u1ed1c r\u00f5 r\u00e0ng; kh\u00f4ng mua \u0111\u1ed3 r\u00e1ch mi\u1ec7ng, ru\u1ed3i \u0111\u1eadu, \u00f4i thiu; r\u1eeda tay v\u00e0 s\u01a1 ch\u1ebf k\u1ef9 tr\u01b0\u1edbc khi \u0103n.")

doc.save(OUT)
print("SAVED:", OUT)
print("SIZE:", os.path.getsize(OUT))
