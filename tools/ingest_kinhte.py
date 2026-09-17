# -*- coding: utf-8 -*-
"""
ingest_kinhte.py
Nạp 6 vùng kinh tế (TDMNPB, ĐBSH, BTB, Nam Trung Bộ, ĐNB, ĐBSCL)
vào knowledge_graph.json + admin_facts_2026.json.
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

def add_node(slug, label, lesson, grade='L9', category='Kinh tế', status='approved_kntt'):
    if slug in nodes:
        return False
    nodes[slug] = {'label': label, 'lesson': lesson, 'grade': grade,
                   'category': category, 'status': status}
    return True

def add_edge(source, target, relation, lesson, note=None, level=None, grade='L9', status='approved'):
    key = (source, target, relation)
    for e in edges:
        if (e.get('source'), e.get('target'), e.get('relation')) == key:
            return False
    edges.append({'source': source, 'target': target, 'relation': relation,
                  'lesson': lesson, 'level': level, 'note': note,
                  'grade': grade, 'status': status})
    return True

existing_fact_ids = {f['id'] for f in existing_facts}

def add_fact(fid, indicator, value, unit, lesson, node_ref=None, note=None):
    if fid in existing_fact_ids:
        return False
    rec = {'id': fid, 'indicator': indicator, 'value': value, 'unit': unit,
           'lesson': lesson, 'source': 'HSG Slider PPTX', 'status': 'approved_kntt'}
    if node_ref:
        rec['node_ref'] = node_ref
    if note:
        rec['note'] = note
    existing_facts.append(rec)
    existing_fact_ids.add(fid)
    return True

L24 = 'Bài 24. Trung du và miền núi Bắc Bộ (vùng kinh tế)'
L25 = 'Bài 25. Đồng bằng sông Hồng (vùng kinh tế)'
L27 = 'Bài 27. Bắc Trung Bộ (vùng kinh tế)'
L28 = 'Bài 28. Duyên hải Nam Trung Bộ và Tây Nguyên (vùng kinh tế)'
L30 = 'Bài 30. Đông Nam Bộ (vùng kinh tế)'
L31 = 'Bài 31. Đồng bằng sông Cửu Long (vùng kinh tế)'

n_nodes = n_edges = n_facts = 0

# ================= NODES =================
# TDMNPB
n_nodes += add_node('kt24_khoang_san_giau_bac_nhat', 'Vùng giàu khoáng sản bậc nhất cả nước', L24)
n_nodes += add_node('kt24_thuy_dien_lon_nhat', 'Tiềm năng thủy điện lớn nhất cả nước', L24)
n_nodes += add_node('kt24_chuyen_canh_cay_cn_thu_ba', 'Vùng chuyên canh cây công nghiệp lớn thứ ba cả nước', L24)
n_nodes += add_node('kt24_chan_nuoi_gia_suc_lon', 'Chăn nuôi gia súc lớn (trâu, bò, ngựa)', L24)
n_nodes += add_node('kt24_kinh_te_cua_khau', 'Kinh tế cửa khẩu và giao thương biên giới', L24)
# DBSH
n_nodes += add_node('kt25_cong_nghiep_dung_dau', 'Công nghiệp có giá trị sản xuất đứng đầu cả nước', L25)
n_nodes += add_node('kt25_dich_vu_hien_dai', 'Dịch vụ phát triển mạnh, cơ cấu hiện đại', L25)
n_nodes += add_node('kt25_mat_do_dan_so_cao_nhat', 'Mật độ dân số cao nhất cả nước', L25)
n_nodes += add_node('kt25_ha_tang_dong_bo', 'Hạ tầng giao thông, điện, nước, viễn thông phát triển', L25)
# BTB
n_nodes += add_node('kt27_nong_lam_thuy_san', 'Cơ cấu nông – lâm – thủy sản đa dạng', L27)
n_nodes += add_node('kt27_du_lich_di_san', 'Du lịch di sản, sinh thái hang động, nghỉ dưỡng biển', L27)
n_nodes += add_node('kt27_hep_ngang_thien_tai', 'Lãnh thổ hẹp ngang, nhiều thiên tai bão lũ', L27)
# Nam Trung Bộ
n_nodes += add_node('kt28_dat_badan_cay_cn', 'Đất badan thuận lợi cây công nghiệp', L28)
n_nodes += add_node('kt28_hai_san_dung_thu_hai', 'Khai thác hải sản đứng thứ hai cả nước', L28)
n_nodes += add_node('kt28_thuy_dien_thu_hai', 'Tiềm năng thủy điện lớn thứ hai cả nước', L28)
n_nodes += add_node('kt28_cay_cn_lau_nam_lon_nhat', 'Vùng chuyên canh cây công nghiệp lâu năm lớn nhất cả nước', L28)
n_nodes += add_node('kt28_bo_xit_tru_luong_lon', 'Bô-xít chiếm ~90% trữ lượng cả nước', L28)
n_nodes += add_node('kt28_nang_luong_tai_tao', 'Nhiều nắng gió thuận lợi năng lượng tái tạo', L28)
# ĐNB
n_nodes += add_node('kt30_dau_tau_kinh_te', 'Vùng kinh tế đầu tàu, GRDP lớn nhất cả nước', L30)
n_nodes += add_node('kt30_cong_nghiep_che_bien_che_tao', 'Công nghiệp chế biến, chế tạo phát triển', L30)
n_nodes += add_node('kt30_dau_khi_lon_nhat', 'Khai thác dầu khí thềm lục địa lớn nhất cả nước', L30)
n_nodes += add_node('kt30_do_thi_hoa_cao_nhat', 'Tỉ lệ dân thành thị cao nhất cả nước', L30)
# ĐBSCL
n_nodes += add_node('kt31_lua_hang_hoa_xuat_khau', 'Vùng sản xuất lúa hàng hóa và xuất khẩu gạo lớn nhất', L31)
n_nodes += add_node('kt31_thuy_san_so_mot', 'Vùng trọng điểm thủy sản số một cả nước', L31)
n_nodes += add_node('kt31_cay_an_qua_lon_nhat', 'Vùng sản xuất cây ăn quả lớn nhất cả nước', L31)
n_nodes += add_node('kt31_mua_kho_thieu_nuoc_ngot', 'Mùa khô sâu sắc, thiếu nước ngọt', L31)

# ================= EDGES (nhân quả tự nhiên -> kinh tế) =================
# TDMNPB: địa hình + sông dốc -> thủy điện
n_edges += add_edge('kt24_thuy_dien_lon_nhat', 'cong_nghiep_thuy_dien', 'tạo điều kiện', L24,
    note='Địa hình núi cao, sông dốc nhiều thác ghềnh tạo tiềm năng thủy điện lớn nhất cả nước.')
# TDMNPB: khí hậu mùa đông lạnh -> cây cận nhiệt, ôn đới
n_edges += add_edge('kt24_chuyen_canh_cay_cn_thu_ba', 'cay can nhiet va on doi', 'tạo điều kiện', L24,
    note='Khí hậu mùa đông lạnh, phân hóa theo độ cao thuận lợi cây công nghiệp, rau ôn đới, cây dược liệu.')
# TDMNPB: khoáng sản -> CN năng lượng, phân bón, xi măng
n_edges += add_edge('kt24_khoang_san_giau_bac_nhat', 'cong_nghiep_khai_khoang_va_nang_luong', 'tạo điều kiện', L24,
    note='Khoáng sản giàu bậc nhất làm nguyên liệu cho nhiệt điện, xi măng, phân bón.')
# DBSH: đất phù sa -> cây lương thực
n_edges += add_edge('dong bang song hong', 'cay luong thuc lua gao', 'tạo điều kiện', L25,
    note='Đồng bằng phù sa màu mỡ thuận lợi cây lương thực, thực phẩm.')
# DBSH: lao động đông, chất lượng cao -> CN đầu đàn
n_edges += add_edge('kt25_cong_nghiep_dung_dau', 'cong_nghiep_che_bien_che_tao', 'thúc đẩy', L25,
    note='Lao động dồi dào, chất lượng cao, hạ tầng hiện đại, thu hút đầu tư lớn.')
# BTB: hẹp ngang + núi lan ra sát biển -> thiên tai bão lũ
n_edges += add_edge('dia_hinh_mien_trung_hep_ngang_nui_lan_ra_sat_bien', 'kt27_hep_ngang_thien_tai', 'gây ra', L27,
    note='Lãnh thổ hẹp ngang, địa hình phân hóa mạnh khiến bão, lũ, ngập lụt, sạt lở đất thường xuyên.')
# Nam Trung Bộ: đất badan -> cây CN lâu năm
n_edges += add_edge('kt28_dat_badan_cay_cn', 'kt28_cay_cn_lau_nam_lon_nhat', 'tạo điều kiện', L28,
    note='Đất badan rộng, khí hậu cận xích đạo thuận lợi cây công nghiệp lâu năm (cà phê, cao su, hồ tiêu).')
# Nam Trung Bộ: biển rộng -> hải sản
n_edges += add_edge('kt28_hai_san_dung_thu_hai', 'danh bat thuy san bien', 'tạo điều kiện', L28,
    note='Vùng biển rộng, nguồn lợi hải sản phong phú, khai thác chiếm >90% sản lượng.')
# Nam Trung Bộ: nhiều nắng gió -> năng lượng tái tạo
n_edges += add_edge('kt28_nang_luong_tai_tao', 'cong_nghiep_xanh', 'tạo điều kiện', L28,
    note='Nhiều nắng gió thuận lợi điện gió, điện mặt trời, năng lượng tái tạo.')
# ĐNB: dầu khí -> điện khí, hóa dầu
n_edges += add_edge('kt30_dau_khi_lon_nhat', 'cong_nghiep_hoa_chat_phan_bon', 'là cơ sở', L30,
    note='Dầu khí thềm lục địa là cơ sở cho điện khí, phân bón và hóa dầu.')
# ĐNB: GRDP đầu tàu -> thu hút dân cư
n_edges += add_edge('kt30_dau_tau_kinh_te', 'vung_kinh_te_phat_trien_thu_hut_dan_cu', 'thúc đẩy', L30,
    note='Kinh tế phát triển đầu tàu thu hút dân cư, lao động, đầu tư.')
# ĐBSCL: đất phù sa + sông ngòi -> lúa hàng hóa
n_edges += add_edge('kt31_lua_hang_hoa_xuat_khau', 'vung lua gao dong bang chau tho', 'tạo điều kiện', L31,
    note='Đất phù sa dọc sông Tiền, sông Hậu, khí hậu cận xích đạo thuận lợi lúa hàng hóa xuất khẩu.')
# ĐBSCL: mùa khô -> thiếu nước ngọt
n_edges += add_edge('kt31_mua_kho_thieu_nuoc_ngot', 'xam_nhap_man_sat_lo_va_thieu_nuoc_ngot_mua_kho', 'gây ra', L31,
    note='Mùa khô sâu sắc gây thiếu nước ngọt, nguy cơ cháy rừng, tăng đất phèn, đất mặn.')

# ================= FACTS =================
# TDMNPB
n_facts += add_fact('fact_kt24_dien_tich', 'Diện tích Trung du và miền núi Bắc Bộ', '92,5', 'nghìn km²', L24, note='Năm 2024.')
n_facts += add_fact('fact_kt24_dan_so', 'Dân số Trung du và miền núi Bắc Bộ', '12,6', 'triệu người', L24, note='Năm 2024.')
n_facts += add_fact('fact_kt24_tang_dan_so', 'Tỉ lệ tăng dân số', '1,21', '%', L24)
n_facts += add_fact('fact_kt24_dan_thanh_thi', 'Tỉ lệ dân thành thị', '23,9', '%', L24)
n_facts += add_fact('fact_kt24_thuy_nang_song_hong', 'Hệ thống sông Hồng chiếm trữ lượng thủy năng cả nước', 'gần 30', '%', L24)
# DBSH
n_facts += add_fact('fact_kt25_dien_tich', 'Diện tích Đồng bằng sông Hồng', '23,94', 'nghìn km²', L25, note='Năm 2024.')
n_facts += add_fact('fact_kt25_dan_so', 'Dân số Đồng bằng sông Hồng', '24,75', 'triệu người', L25, note='Đông nhất cả nước, năm 2024.')
n_facts += add_fact('fact_kt25_dan_thanh_thi', 'Tỉ lệ dân thành thị', '38,1', '%', L25)
n_facts += add_fact('fact_kt25_tang_dan_so', 'Tỉ lệ tăng dân số', '1,77', '%', L25)
n_facts += add_fact('fact_kt25_mat_do', 'Mật độ dân số (cao nhất cả nước)', '1034', 'người/km²', L25)
n_facts += add_fact('fact_kt25_cn_ty_trong', 'Giá trị sản xuất công nghiệp chiếm cả nước', '36,5', '%', L25, note='Năm 2024, đứng đầu cả nước.')
n_facts += add_fact('fact_kt25_dich_vu_grdp', 'Dịch vụ đóng góp vào GRDP vùng', '44,7', '%', L25, note='Năm 2024.')
n_facts += add_fact('fact_kt25_noi_thuong', 'Tỉ trọng tổng mức bán lẻ cả nước', '24,9', '%', L25, note='Năm 2024.')
n_facts += add_fact('fact_kt25_xuat_khau', 'Tỉ trọng trị giá xuất khẩu cả nước', '39,6', '%', L25, note='Năm 2024.')
# BTB
n_facts += add_fact('fact_kt27_dien_tich', 'Diện tích Bắc Trung Bộ', '51,2', 'nghìn km²', L27, note='Năm 2024.')
n_facts += add_fact('fact_kt27_dan_so', 'Dân số Bắc Trung Bộ', '11,3', 'triệu người', L27)
n_facts += add_fact('fact_kt27_tang_dan_so', 'Tỉ lệ tăng dân số', '0,75', '%', L27)
n_facts += add_fact('fact_kt27_dan_thanh_thi', 'Tỉ lệ dân thành thị', '26,1', '%', L27)
n_facts += add_fact('fact_kt27_trong_trot', 'Trồng trọt chiếm giá trị sản xuất nông nghiệp', '74,5', '%', L27, note='Năm 2024.')
n_facts += add_fact('fact_kt27_thuy_san', 'Thủy sản chiếm giá trị sản xuất nông – lâm – thủy sản', '19,4', '%', L27, note='Năm 2024.')
# Nam Trung Bộ
n_facts += add_fact('fact_kt28_dien_tich', 'Diện tích Duyên hải Nam Trung Bộ và Tây Nguyên', '99,2', 'nghìn km²', L28)
n_facts += add_fact('fact_kt28_dan_so', 'Dân số Duyên hải Nam Trung Bộ và Tây Nguyên', '15,9', 'triệu người', L28, note='Năm 2024.')
n_facts += add_fact('fact_kt28_tang_dan_so', 'Tỉ lệ tăng dân số', '1,18', '%', L28)
n_facts += add_fact('fact_kt28_dan_thanh_thi', 'Tỉ lệ dân thành thị', '37,1', '%', L28)
n_facts += add_fact('fact_kt28_hai_san_khai_thac', 'Khai thác hải sản chiếm sản lượng (đứng thứ hai cả nước)', 'trên 90', '%', L28)
n_facts += add_fact('fact_kt28_du_lich_doanh_thu', 'Doanh thu du lịch lữ hành vùng', '11670,1', 'tỷ đồng', L28, note='Năm 2024.')
n_facts += add_fact('fact_kt28_bo_xit', 'Bô-xít chiếm trữ lượng cả nước', 'khoảng 90', '%', L28, note='Tập trung ở Lâm Đồng.')
n_facts += add_fact('fact_kt28_cay_cn_lau_nam', 'Cây công nghiệp lâu năm chiếm diện tích cả nước', 'trên 50', '%', L28, note='Lớn nhất cả nước, năm 2024.')
n_facts += add_fact('fact_kt28_san_luong_go', 'Sản lượng gỗ khai thác', '8190,9', 'nghìn m³', L28, note='Năm 2024.')
# ĐNB
n_facts += add_fact('fact_kt30_dien_tich', 'Diện tích Đông Nam Bộ', 'trên 28', 'nghìn km²', L30, note='Năm 2024.')
n_facts += add_fact('fact_kt30_dan_so', 'Dân số Đông Nam Bộ', 'gần 21', 'triệu người', L30, note='Năm 2024.')
n_facts += add_fact('fact_kt30_tang_dan_so', 'Tỉ lệ tăng dân số', '1,12', '%', L30)
n_facts += add_fact('fact_kt30_mat_do', 'Mật độ dân số', '749', 'người/km²', L30)
n_facts += add_fact('fact_kt30_dan_thanh_thi', 'Tỉ lệ dân thành thị (cao nhất cả nước)', '62,8', '%', L30)
n_facts += add_fact('fact_kt30_grdp', 'GRDP chiếm GDP cả nước', '31,5', '%', L30, note='Năm 2024, lớn nhất cả nước.')
n_facts += add_fact('fact_kt30_cn_xd', 'Công nghiệp và xây dựng chiếm GRDP vùng', '38,1', '%', L30, note='Năm 2024.')
n_facts += add_fact('fact_kt30_gtsx_cn', 'Tỉ trọng giá trị sản xuất công nghiệp cả nước', '34,9', '%', L30)
n_facts += add_fact('fact_kt30_xuat_khau', 'Trị giá xuất khẩu chiếm cả nước', '33,3', '%', L30, note='Năm 2024.')
# ĐBSCL
n_facts += add_fact('fact_kt31_dien_tich', 'Diện tích Đồng bằng sông Cửu Long', '36,4', 'nghìn km²', L31, note='Năm 2024.')
n_facts += add_fact('fact_kt31_dan_so', 'Dân số Đồng bằng sông Cửu Long', '15,8', 'triệu người', L31, note='Năm 2024.')
n_facts += add_fact('fact_kt31_dan_so_ty_le', 'Dân số chiếm cả nước', '15,6', '%', L31)
n_facts += add_fact('fact_kt31_tang_dan_so', 'Tỉ lệ tăng dân số (thấp nhất cả nước)', '0,46', '%', L31)
n_facts += add_fact('fact_kt31_mat_do', 'Mật độ dân số', '434', 'người/km²', L31)
n_facts += add_fact('fact_kt31_dan_thanh_thi', 'Tỉ lệ dân thành thị', '28,6', '%', L31)
n_facts += add_fact('fact_kt31_dt_luong_thuc', 'Diện tích lương thực chiếm cả nước', '41,8', '%', L31, note='Năm 2024.')
n_facts += add_fact('fact_kt31_sl_luong_thuc', 'Sản lượng lương thực có hạt chiếm cả nước', '44,8', '%', L31, note='Năm 2024.')
n_facts += add_fact('fact_kt31_lua_ty_le', 'Lúa chiếm diện tích và sản lượng lương thực', 'trên 99', '%', L31)
n_facts += add_fact('fact_kt31_nang_suat_lua', 'Năng suất lúa (cao nhất cả nước)', '64,2', 'tạ/ha', L31, note='Năm 2024.')
n_facts += add_fact('fact_kt31_thuy_san', 'Thủy sản chiếm sản lượng cả nước', 'trên 50', '%', L31, note='Vùng trọng điểm thủy sản số một.')
n_facts += add_fact('fact_kt31_cay_an_qua', 'Diện tích cây ăn quả', '386,8', 'nghìn ha', L31, note='Lớn nhất cả nước, năm 2024.')

write_json(KG_PATH, kg)
write_json(FACTS_PATH, facts_doc)

print(f"Nodes added: {n_nodes} (total {len(nodes)})")
print(f"Edges added: {n_edges} (total {len(edges)})")
print(f"Facts added: {n_facts} (total {len(existing_facts)})")
