# -*- coding: utf-8 -*-
"""
ingest_cdc.py
Bóc tách 2 chuyên đề L8 (Chủ đề chung) vào KG + facts:
  - CĐC81: Văn minh châu thổ sông Hồng và sông Cửu Long
  - CĐC82: Bảo vệ chủ quyền, các quyền và lợi ích hợp pháp của VN ở Biển Đông
Append/merge an toàn: dedupe theo slug (node), (source,target,relation) (edge), id (fact).
"""
import sys, json
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
    with open(p, 'w', encoding='utf-8', newline='\n') as f:
        f.write(txt)
        f.write('\n')

kg = load_json(KG_PATH)
facts_doc = load_json(FACTS_PATH)
nodes = kg['nodes']
edges = kg['edges']
existing_facts = facts_doc['facts']

def add_node(slug, label, lesson, grade='L8', category='Chủ đề chung', status='approved_kntt'):
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

def add_edge(source, target, relation, lesson, note=None, level=None, grade='L8', status='approved'):
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
        'source': 'HSG Chuyên đề chung L8',
        'status': 'approved_kntt',
    }
    if node_ref:
        rec['node_ref'] = node_ref
    if note:
        rec['note'] = note
    existing_facts.append(rec)
    existing_fact_ids.add(fid)
    return True

L_CDC81 = 'Chủ đề chung L8: Văn minh châu thổ sông Hồng và sông Cửu Long'
L_CDC82 = 'Chủ đề chung L8: Bảo vệ chủ quyền biển đảo Việt Nam'

# ================= NODES =================
n_nodes = 0
# CĐC81
n_nodes += add_node('chau_tho_song_hong', 'Châu thổ sông Hồng', L_CDC81)
n_nodes += add_node('chau_tho_song_cuu_long', 'Châu thổ sông Cửu Long', L_CDC81)
n_nodes += add_node('he_thong_song_thai_binh', 'Hệ thống sông Thái Bình', L_CDC81)
n_nodes += add_node('he_thong_song_me_cong', 'Hệ thống sông Mê Công', L_CDC81)
n_nodes += add_node('van_minh_song_hong', 'Nền văn minh sông Hồng', L_CDC81)
n_nodes += add_node('van_minh_oc_eo', 'Văn hóa Óc Eo', L_CDC81)
n_nodes += add_node('de_dieu_chau_tho_song_hong', 'Hệ thống đê điều châu thổ sông Hồng', L_CDC81)
# CĐC82
n_nodes += add_node('lanh_hai', 'Lãnh hải', L_CDC82)
n_nodes += add_node('vung_tiep_giap_lanh_hai', 'Vùng tiếp giáp lãnh hải', L_CDC82)
n_nodes += add_node('them_luc_dia', 'Thềm lục địa', L_CDC82)
n_nodes += add_node('luat_bien_viet_nam_2012', 'Luật Biển Việt Nam 2012', L_CDC82)
n_nodes += add_node('cong_uoc_luat_bien_1982', 'Công ước Liên hợp quốc về Luật biển 1982', L_CDC82)
n_nodes += add_node('doi_hoang_sa_bac_hai', 'Đội Hoàng Sa, Bắc Hải', L_CDC82)

# ================= EDGES =================
n_edges = 0
# CĐC81 — nguồn gốc bồi đắp
n_edges += add_edge('he_thong_song_hong', 'chau_tho_song_hong', 'bồi đắp', L_CDC81,
    note='Châu thổ sông Hồng do hệ thống sông Hồng và sông Thái Bình bồi đắp.')
n_edges += add_edge('he_thong_song_thai_binh', 'chau_tho_song_hong', 'bồi đắp', L_CDC81)
n_edges += add_edge('he_thong_song_me_cong', 'chau_tho_song_cuu_long', 'bồi đắp', L_CDC81,
    note='Đoạn sông Mê Công chảy qua VN (sông Cửu Long) bồi đắp nên châu thổ lớn nhất nước ta.')
# CĐC81 — văn minh gắn châu thổ
n_edges += add_edge('chau_tho_song_hong', 'van_minh_song_hong', 'hình thành', L_CDC81,
    note='Sông Hồng cung cấp thức ăn, giao thông, gắn đời sống tinh thần → nền văn minh sông Hồng.')
n_edges += add_edge('chau_tho_song_cuu_long', 'van_minh_oc_eo', 'hình thành', L_CDC81,
    note='Vương quốc Phù Nam khai phá châu thổ, hình thành văn minh gắn văn hóa Óc Eo.')
# CĐC81 — lũ lên nhanh → đắp đê
n_edges += add_edge('he_thong_song_hong', 'de_dieu_chau_tho_song_hong', 'thúc đẩy xây dựng', L_CDC81,
    note='Mạng lưới dạng nan quạt, lũ lên nhanh đột ngột buộc con người sớm đắp đê trị thủy.')
n_edges += add_edge('de_dieu_chau_tho_song_hong', 'chau_tho_song_hong', 'chia cắt bề mặt', L_CDC81,
    note='Đê chia cắt bề mặt châu thổ, vùng trong đê không được bồi đắp phù sa thường xuyên.')
# CĐC82 — pháp lý chủ quyền
n_edges += add_edge('cong_uoc_luat_bien_1982', 'luat_bien_viet_nam_2012', 'là cơ sở xây dựng', L_CDC82,
    note='Trên cơ sở Công ước LHQ về Luật biển 1982, VN xây dựng Luật Biển 2012.')
n_edges += add_edge('luat_bien_viet_nam_2012', 'vung_bien_viet_nam', 'phân định', L_CDC82,
    note='Luật Biển 2012 phân định 5 bộ phận vùng biển VN.')
n_edges += add_edge('luat_bien_viet_nam_2012', 'lanh_hai', 'quy định', L_CDC82,
    note='Lãnh hải rộng 12 hải lí tính từ đường cơ sở.')
n_edges += add_edge('luat_bien_viet_nam_2012', 'vung_tiep_giap_lanh_hai', 'quy định', L_CDC82,
    note='Vùng tiếp giáp lãnh hải rộng 12 hải lí tính từ ranh giới ngoài lãnh hải.')
n_edges += add_edge('luat_bien_viet_nam_2012', 'them_luc_dia', 'quy định', L_CDC82,
    note='Thềm lục địa là đáy biển và lòng đất dưới đáy biển kéo dài tự nhiên từ lãnh thổ đất liền.')
# CĐC82 — lịch sử xác lập chủ quyền
n_edges += add_edge('doi_hoang_sa_bac_hai', 'quan_dao_hoang_sa', 'xác lập chủ quyền', L_CDC82,
    note='Đội Hoàng Sa, Bắc Hải hằng năm ra khai thác sản vật, quản lí biển đảo Hoàng Sa.')
n_edges += add_edge('doi_hoang_sa_bac_hai', 'quan_dao_truong_sa', 'xác lập chủ quyền', L_CDC82,
    note='Chính quyền các chúa Nguyễn thực thi chủ quyền tại Hoàng Sa và Trường Sa.')

# ================= FACTS =================
n_facts = 0
# CĐC81 — châu thổ sông Hồng
n_facts += add_fact('fact_cdc81_chau_tho_sh_dien_tich', 'Diện tích châu thổ sông Hồng', 'khoảng 15000', 'km²', L_CDC81, node_ref='chau_tho_song_hong')
n_facts += add_fact('fact_cdc81_song_hong_tong_luong', 'Tổng lượng dòng chảy hệ thống sông Hồng', '112', 'tỉ m³/năm', L_CDC81, node_ref='he_thong_song_hong')
n_facts += add_fact('fact_cdc81_de_dau_tien', 'Tuyến đê đầu tiên sông Hồng được xây', 'năm 1108 (thời Lý Nhân Tông)', '', L_CDC81, node_ref='de_dieu_chau_tho_song_hong')
# CĐC81 — châu thổ sông Cửu Long
n_facts += add_fact('fact_cdc81_chau_tho_scl_dien_tich', 'Diện tích châu thổ sông Cửu Long', 'hơn 40 nghìn', 'km²', L_CDC81, node_ref='chau_tho_song_cuu_long')
n_facts += add_fact('fact_cdc81_song_cuu_long_chieu_dai', 'Chiều dài sông Cửu Long trên lãnh thổ Việt Nam', 'hơn 230', 'km', L_CDC81, node_ref='he_thong_song_me_cong')
n_facts += add_fact('fact_cdc81_me_cong_tong_luong', 'Tổng lượng dòng chảy hệ thống sông Mê Công', '507', 'tỉ m³/năm', L_CDC81, node_ref='he_thong_song_me_cong')
n_facts += add_fact('fact_cdc81_me_cong_ty_le', 'Tỉ lệ lượng nước Mê Công so với tổng sông ngòi VN', '60,4', '%', L_CDC81, node_ref='he_thong_song_me_cong')
n_facts += add_fact('fact_cdc81_scl_mua_lu', 'Mùa lũ sông Cửu Long: thời gian / tỉ lệ lưu lượng', '5 tháng (tháng 7–11) / khoảng 80%', '', L_CDC81, node_ref='chau_tho_song_cuu_long')
n_facts += add_fact('fact_cdc81_scl_mua_can', 'Mùa cạn sông Cửu Long: thời gian / tỉ lệ lưu lượng', '7 tháng (tháng 12–6) / khoảng 20%', '', L_CDC81, node_ref='chau_tho_song_cuu_long')
n_facts += add_fact('fact_cdc81_scl_ngap_lut', 'Diện tích ngập lụt mùa lũ ĐBSCL', 'khoảng 10000', 'km²', L_CDC81, node_ref='chau_tho_song_cuu_long', note='Chủ yếu Đồng Tháp Mười và Tứ giác Long Xuyên.')
# CĐC81 — lịch sử khai khẩn
n_facts += add_fact('fact_cdc81_phu_nam', 'Thời kì vương quốc Phù Nam', 'thế kỉ I - đầu thế kỉ VII', '', L_CDC81, node_ref='van_minh_oc_eo')
n_facts += add_fact('fact_cdc81_bien_tien_nam_bo', 'Biển tiến cục bộ ở Nam Bộ', 'thế kỉ IV', '', L_CDC81)
n_facts += add_fact('fact_cdc81_khai_hoang_dbscl', 'Khai hoang ĐBSCL đẩy mạnh', 'từ khoảng thế kỉ XVII', '', L_CDC81)

# CĐC82 — phạm vi vùng biển
n_facts += add_fact('fact_cdc82_lanh_hai', 'Chiều rộng lãnh hải', '12', 'hải lí', L_CDC82, node_ref='lanh_hai')
n_facts += add_fact('fact_cdc82_tiep_giap_lanh_hai', 'Chiều rộng vùng tiếp giáp lãnh hải', '12', 'hải lí', L_CDC82, node_ref='vung_tiep_giap_lanh_hai')
n_facts += add_fact('fact_cdc82_dac_quyen_kinh_te', 'Vùng đặc quyền kinh tế rộng', '200', 'hải lí', L_CDC82, node_ref='vung_dac_quyen_kinh_te')
n_facts += add_fact('fact_cdc82_so_bo_phan_vung_bien', 'Số bộ phận vùng biển VN theo Luật Biển 2012', '5', 'bộ phận', L_CDC82, node_ref='luat_bien_viet_nam_2012')
# CĐC82 — tài nguyên
n_facts += add_fact('fact_cdc82_ngu_truong', 'Số ngư trường lớn', '4', 'ngư trường', L_CDC82, note='Vịnh Bắc Bộ; Hoàng Sa - Trường Sa; Ninh Thuận - Bình Thuận - Bà Rịa - Vũng Tàu; Cà Mau - Kiên Giang.')
n_facts += add_fact('fact_cdc82_khai_thac_ca', 'Khả năng khai thác cá hàng năm', '1,6 - 1,7', 'triệu tấn', L_CDC82)
n_facts += add_fact('fact_cdc82_khai_thac_tom', 'Khả năng khai thác tôm hàng năm', '60 - 70', 'nghìn tấn', L_CDC82)
n_facts += add_fact('fact_cdc82_canh_dong_muoi', 'Số cánh đồng muối lớn', '2 (Cà Ná, Sa Huỳnh)', '', L_CDC82)
# CĐC82 — cơ sở pháp lý
n_facts += add_fact('fact_cdc82_cong_uoc_luat_bien', 'Công ước Liên hợp quốc về Luật biển', '1982', 'năm', L_CDC82, node_ref='cong_uoc_luat_bien_1982')
n_facts += add_fact('fact_cdc82_luat_bien_vn', 'Luật Biển Việt Nam', '2012', 'năm', L_CDC82, node_ref='luat_bien_viet_nam_2012')
n_facts += add_fact('fact_cdc82_luat_bien_gioi_quoc_gia', 'Luật Biên giới Quốc gia', '2023', 'năm', L_CDC82)
n_facts += add_fact('fact_cdc82_hiep_dinh_phan_dinh_indo', 'Hiệp định phân định thềm lục địa với In-đô-nê-xi-a', '2023', 'năm', L_CDC82)
n_facts += add_fact('fact_cdc82_thoa_thuan_malaysia', 'Thỏa thuận hợp tác khai thác chung thềm lục địa với Ma-lai-xi-a', '1992', 'năm', L_CDC82)
# CĐC82 — lịch sử
n_facts += add_fact('fact_cdc82_van_don', 'Thương cảng Vân Đồn (Quảng Ninh) trở thành thương cảng quốc tế', 'thời Lý - Trần (thế kỉ XI - XIV)', '', L_CDC82)

write_json(KG_PATH, kg)
write_json(FACTS_PATH, facts_doc)

print(f"Nodes added: {n_nodes} (total {len(nodes)})")
print(f"Edges added: {n_edges} (total {len(edges)})")
print(f"Facts added: {n_facts} (total {len(existing_facts)})")
