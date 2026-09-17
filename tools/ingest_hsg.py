# -*- coding: utf-8 -*-
"""
ingest_hsg.py
Bóc tách tri thức từ 7 file PPTX HSG (Địa lí tự nhiên) thành:
  - nodes/edges mới cho knowledge_graph.json
  - facts định lượng mới cho admin_facts_2026.json
Append/merge an toàn: dedupe theo slug (node), (source,target,relation) (edge), id (fact).
"""
import sys, json, io
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')

ROOT = Path(__file__).resolve().parent.parent
KG_PATH = ROOT / 'src' / 'data' / 'knowledge_graph.json'
FACTS_PATH = ROOT / 'src' / 'data' / 'admin_facts_2026.json'

def load_json(p):
    with open(p, encoding='utf-8') as f:
        return json.load(f)

def write_json(p, obj):
    txt = json.dumps(obj, ensure_ascii=False, indent=2)
    # UTF-8 no BOM
    with open(p, 'w', encoding='utf-8', newline='\n') as f:
        f.write(txt)
        f.write('\n')

kg = load_json(KG_PATH)
facts_doc = load_json(FACTS_PATH)

nodes = kg['nodes']          # dict slug -> node
edges = kg['edges']          # list of edge
existing_facts = facts_doc['facts']  # list

def add_node(slug, label, lesson, grade='L9', category='Tự nhiên', status='approved_kntt'):
    if slug in nodes:
        return False
    nodes[slug] = {
        'label': label,
        'lesson': lesson,
        'grade': grade,
        'category': category,
        'status': status,
    }
    return True

def add_edge(source, target, relation, lesson, note=None, level=None, grade='L9', status='approved'):
    key = (source, target, relation)
    for e in edges:
        if (e.get('source'), e.get('target'), e.get('relation')) == key:
            return False
    edges.append({
        'source': source,
        'target': target,
        'relation': relation,
        'lesson': lesson,
        'level': level,
        'note': note,
        'grade': grade,
        'status': status,
    })
    return True

existing_fact_ids = {f['id'] for f in existing_facts}

def add_fact(fid, indicator, value, unit, lesson, node_ref=None, note=None):
    if fid in existing_fact_ids:
        return False
    rec = {
        'id': fid,
        'indicator': indicator,
        'value': value,
        'unit': unit,
        'lesson': lesson,
        'source': 'HSG Slider PPTX',
        'status': 'approved_kntt',
    }
    if node_ref:
        rec['node_ref'] = node_ref
    if note:
        rec['note'] = note
    existing_facts.append(rec)
    existing_fact_ids.add(fid)
    return True

L_DH = 'Chuyên đề HSG: Địa hình Việt Nam'
L_KH = 'Chuyên đề HSG: Khí hậu Việt Nam'
L_SN = 'Chuyên đề HSG: Sông ngòi Việt Nam'
L_VT = 'Chuyên đề HSG: Vị trí địa lí và hình thể'

# ================= NODES =================
n_nodes = 0
n_nodes += add_node('nen_co_hoa_nam', 'Nền cổ Hoa Nam (Trung Quốc)', L_DH)
n_nodes += add_node('nen_co_vom_song_chay', 'Nền cổ Vòm sông Chảy', L_DH)
n_nodes += add_node('nen_co_kon_tum', 'Khối nền cổ Kon Tum', L_DH)
n_nodes += add_node('van_dong_anpo_himalaya', 'Vận động tạo núi An-po – Hi-ma-lay-a (Tân kiến tạo)', L_DH)
n_nodes += add_node('canh_cung_song_gam', 'Cánh cung Sông Gâm', L_DH)
n_nodes += add_node('canh_cung_ngan_son', 'Cánh cung Ngân Sơn', L_DH)
n_nodes += add_node('canh_cung_bac_son', 'Cánh cung Bắc Sơn', L_DH)
n_nodes += add_node('canh_cung_dong_trieu', 'Cánh cung Đông Triều', L_DH)
n_nodes += add_node('tin_phong_nam_ban_cau', 'Tín phong Nam bán cầu', L_KH)
n_nodes += add_node('ap_cao_can_chi_tuyen_nam_ban_cau', 'Áp cao cận chí tuyến Nam bán cầu', L_KH)
n_nodes += add_node('mua_tieu_man', 'Mưa Tiểu mãn', L_KH)
n_nodes += add_node('bao_bien_dong', 'Bão và áp thấp nhiệt đới trên Biển Đông', L_KH)
n_nodes += add_node('he_thong_song_hong', 'Hệ thống sông Hồng', L_SN)
n_nodes += add_node('gio_mua_mua_ha', 'Gió mùa mùa hạ', L_KH)
n_nodes += add_node('gio_dong_nam_bien', 'Gió Đông Nam từ biển', L_KH)
n_nodes += add_node('dia_hinh_long_mang_cao_bang_lang_son', 'Địa hình lòng máng Cao Bằng – Lạng Sơn', L_KH)

# ================= EDGES =================
n_edges = 0
# Vận động Anpo-Himalaya → hướng nghiêng TB-ĐN (VN nằm rìa ĐN, tâm nâng mạnh ở TB)
n_edges += add_edge('van_dong_anpo_himalaya', 'huong_nghieng_dia_hinh_thap_dan_tay_bac_dong_nam',
    'quy định', L_DH,
    note='VN nằm rìa đông nam của vận động, xa tâm nâng nên phía tây bắc nâng mạnh hơn đông nam.')
# Nền cổ định hướng hướng núi
n_edges += add_edge('nen_co_hoa_nam', 'canh_cung_song_gam', 'định hướng', L_DH,
    note='Nền cổ Hoa Nam vững chắc định hướng các cánh cung vùng Đông Bắc.')
n_edges += add_edge('nen_co_vom_song_chay', 'canh_cung_song_gam', 'định hướng', L_DH)
n_edges += add_edge('nen_co_kon_tum', 'huong_vong_cung_vung_nui_dong_bac_va_truong_son_nam',
    'quy định', L_DH,
    note='Các mạch núi nâng lên ôm lấy khối nền cổ Kon Tum tạo hướng vòng cung Trường Sơn Nam.')
# Hoàng Liên Sơn chắn gió mùa Đông Bắc
n_edges += add_edge('day hoang lien son', 'gio mua dong bac', 'chắn gió', L_KH,
    note='Hướng TB-ĐN của Hoàng Liên Sơn chắn gió mùa Đông Bắc, Tây Bắc mùa đông bớt lạnh, đến muộn, kết thúc sớm.')
# Cánh cung Đông Triều đón gió Đông Nam
n_edges += add_edge('canh_cung_dong_trieu', 'gio_dong_nam_bien', 'đón gió', L_KH,
    note='Mùa hạ cánh cung Đông Triều đón gió Đông Nam gây mưa cho ven biển Quảng Ninh, khô nóng cho Cao Bằng, Lạng Sơn.')
# Gió tây nam Benguela vượt Trường Sơn → phơn
n_edges += add_edge('gio_tay_nam_tu_vinh_bengal_dau_ha_vuot_day_truong_son', 'hieu ung phon kho nong',
    'gây ra', L_KH,
    note='Vượt dãy Trường Sơn biến tính khô nóng, gây phơn cho ven biển Trung Bộ, mùa mưa đến muộn.')
# Áp cao cận chí tuyến NBC → Tín phong NBC → gió Tây Nam
n_edges += add_edge('ap_cao_can_chi_tuyen_nam_ban_cau', 'tin_phong_nam_ban_cau', 'tạo ra', L_KH,
    note='Giữa và cuối mùa hạ, áp cao cận chí tuyến Nam bán cầu hoạt động mạnh, Tín phong NBC vượt Xích đạo lệch thành gió Tây Nam.')
n_edges += add_edge('tin_phong_nam_ban_cau', 'dai_hoi_tu_nhiet_doi_lui_dan_tu_bac_vao_nam_theo_chuyen_dong_bieu_kien',
    'hội tụ', L_KH,
    note='Tín phong NBC (thành gió Tây Nam) hội tụ với Tín phong BBC tạo dải hội tụ nhiệt đới theo chiều vĩ tuyến.')
# Dải hội tụ → bão
n_edges += add_edge('dai_hoi_tu_nhiet_doi_lui_dan_tu_bac_vao_nam_theo_chuyen_dong_bieu_kien', 'bao_bien_dong',
    'tạo điều kiện', L_KH,
    note='Dải hội tụ là nơi không khí bất ổn định, tạo điều kiện hình thành bão, áp thấp; mùa bão chậm dần từ Bắc vào Nam.')
# Hình thể hẹp ngang → ảnh hưởng sâu sắc của biển
n_edges += add_edge('hinh_dang_lanh_tho_keo_dai_hep_ngang', 'thien nhien chiu anh huong sau sac cua bien',
    'tăng cường', L_VT,
    note='Lãnh thổ hẹp ngang, bờ biển dài khiến biển tác động sâu vào nội địa, khí hậu mang tính hải dương.')
# Sông Hồng dạng nan quạt → lũ lên nhanh
n_edges += add_edge('he_thong_song_hong', 'lu_song_hong_len_nhanh_va_dot_ngot',
    'gây ra', L_SN,
    note='Dạng nan quạt, nhiều phụ lưu hợp lưu, ít chi lưu (3 cửa sông) nên lũ tập trung nhanh, thoát chậm.')

# ================= FACTS =================
n_facts = 0
# Địa hình — độ cao các đỉnh núi Đông Bắc
n_facts += add_fact('fact_hsg_tay_con_linh', 'Độ cao đỉnh Tây Côn Lĩnh (núi cao Đông Bắc)', '2949', 'm', L_DH, note='Núi cao trên 2000 m, thượng nguồn sông Chảy.')
n_facts += add_fact('fact_hsg_kieu_lieu_ti', 'Độ cao đỉnh Kiều Liêu Ti', '2402', 'm', L_DH)
n_facts += add_fact('fact_hsg_phia_ya', 'Độ cao đỉnh Phia Ya (núi trung bình)', '1989', 'm', L_DH, note='Núi trung bình 1000–2000 m.')
n_facts += add_fact('fact_hsg_mau_son', 'Độ cao đỉnh Mẫu Sơn', '1541', 'm', L_DH)
n_facts += add_fact('fact_hsg_nam_chau_lanh', 'Độ cao đỉnh Nam Châu Lãnh', '1509', 'm', L_DH)
n_facts += add_fact('fact_hsg_phan_loai_nui', 'Phân loại núi theo độ cao: thấp / trung bình / cao', 'dưới 1000 / 1000–2000 / trên 2000', 'm', L_DH)
n_facts += add_fact('fact_hsg_doi_trung_du', 'Độ cao tương đối đồi trung du Bắc Bộ', 'khoảng 200', 'm', L_DH, note='Dạng bát úp, tập trung thành dải.')
n_facts += add_fact('fact_hsg_dong_bac_trung_tam', 'Độ cao trung tâm vùng núi thấp Đông Bắc', '500–600', 'm', L_DH)

# Khí hậu — chế độ nhiệt các vùng
n_facts += add_fact('fact_hsg_nhiet_vkh_trung_nam_bb', 'Nhiệt độ trung bình năm vùng khí hậu Trung và Nam Bắc Bộ', '20–24', '°C', L_KH)
n_facts += add_fact('fact_hsg_bien_do_vkh_trung_nam_bb', 'Biên độ nhiệt năm vùng khí hậu Trung và Nam Bắc Bộ', 'khoảng 10', '°C', L_KH)
n_facts += add_fact('fact_hsg_nhiet_vkh_nam_bo', 'Nhiệt độ trung bình năm vùng khí hậu Nam Bộ', 'trên 24', '°C', L_KH)
n_facts += add_fact('fact_hsg_bien_do_vkh_nam_bo', 'Biên độ nhiệt năm vùng khí hậu Nam Bộ', 'khoảng 3', '°C', L_KH)
n_facts += add_fact('fact_hsg_nhiet_t7_dbb_nui_cao', 'Nhiệt độ TB tháng VII khu vực núi cao Đông Bắc Bộ', 'dưới 20', '°C', L_KH)
n_facts += add_fact('fact_hsg_nhiet_t7_dbb_son_nguyen', 'Nhiệt độ TB tháng VII sơn nguyên biên giới Việt–Trung, thượng nguồn sông Chảy', '20–24', '°C', L_KH)
n_facts += add_fact('fact_hsg_nhiet_t7_dbb_trung_du', 'Nhiệt độ TB tháng VII trung du và ven biển Quảng Ninh', 'trên 28', '°C', L_KH, note='Địa hình thấp, hiệu ứng đô thị.')
n_facts += add_fact('fact_hsg_nhiet_t7_dbb_phia_bac', 'Nhiệt độ TB tháng VII khu vực phía Bắc Đông Bắc Bộ', '24–28', '°C', L_KH)

# Khí hậu — lượng mưa V–X Đông Bắc Bộ
n_facts += add_fact('fact_hsg_mua_dbb_nui_cao', 'Lượng mưa V–X thượng nguồn sông Chảy, Hà Giang, Tam Đảo', '1600–2000 và trên 2000', 'mm', L_KH)
n_facts += add_fact('fact_hsg_mua_dbb_cao_bang_lang_son', 'Lượng mưa V–X Cao Bằng, Lạng Sơn (lòng máng khuất gió)', '800–1200', 'mm', L_KH)
n_facts += add_fact('fact_hsg_mua_dbb_con_lai', 'Lượng mưa V–X phần lớn Đông Bắc Bộ còn lại', '1200–1600', 'mm', L_KH)

# Bão
n_facts += add_fact('fact_hsg_bao_so_luong', 'Số cơn bão hình thành trên Biển Đông / đổ bộ trực tiếp mỗi năm', '9–10 / 3–4', 'cơn/năm', L_KH)
n_facts += add_fact('fact_hsg_bao_tan_suat_t9', 'Tần suất bão tháng 9', '1,3–1,7', 'cơn/tháng', L_KH)
n_facts += add_fact('fact_hsg_bao_tan_suat_t8_t10', 'Tần suất bão tháng 8 và tháng 10', '1–1,3', 'cơn/tháng', L_KH)
n_facts += add_fact('fact_hsg_bao_mua', 'Thời gian mùa bão toàn quốc', 'tháng 6 đến tháng 11', '', L_KH, note='Có bão sớm tháng 5, muộn tháng 12 nhưng yếu.')

# Sông Hồng — chế độ nước
n_facts += add_fact('fact_hsg_song_hong_tong_luuluong', 'Tổng lưu lượng nước cả năm sông Hồng', '32469', 'm³/s', L_SN)
n_facts += add_fact('fact_hsg_song_hong_tb_nam', 'Lưu lượng nước trung bình cả năm sông Hồng', '2705,75', 'm³/s', L_SN)
n_facts += add_fact('fact_hsg_song_hong_mua_lu', 'Mùa lũ sông Hồng: thời gian / tổng lưu lượng / tỉ lệ / TB', '5 tháng (6–10) / 23850 / 73% / 4770', 'm³/s', L_SN)
n_facts += add_fact('fact_hsg_song_hong_mua_can', 'Mùa cạn sông Hồng: thời gian / tổng lưu lượng / tỉ lệ / TB', '7 tháng (11–5) / 8619 / 27% / 1231,3', 'm³/s', L_SN)
n_facts += add_fact('fact_hsg_song_hong_chenh_lech', 'Chênh lệch lưu lượng mùa lũ so với mùa cạn / đỉnh lũ so đỉnh kiệt', '3,9 lần / 8,7 lần', '', L_SN)
n_facts += add_fact('fact_hsg_song_hong_dinh_lu_kiet', 'Tháng đỉnh lũ / đỉnh kiệt sông Hồng', 'tháng 8 / tháng 3', '', L_SN)
n_facts += add_fact('fact_hsg_song_hong_cua_song', 'Số cửa sông khi đổ ra biển của sông Hồng', '3', 'cửa', L_SN)

write_json(KG_PATH, kg)
write_json(FACTS_PATH, facts_doc)

print(f"Nodes added: {n_nodes} (total {len(nodes)})")
print(f"Edges added: {n_edges} (total {len(edges)})")
print(f"Facts added: {n_facts} (total {len(existing_facts)})")
