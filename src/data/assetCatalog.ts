import { VFX_RING_PRESETS } from './vfxRings';
import { VFX_AURA_PRESETS } from './vfxAuras';

export type AssetCategoryId =
  | 'characters'
  | 'vfx_rings'
  | 'vfx_auras'
  | 'buildings'
  | 'bosses'
  | 'monsters'
  | 'guardians'
  | 'equipment'
  | 'sets'
  | 'gems'
  | 'skills'
  | 'realms'
  | 'roots'
  | 'elements'
  | 'resources'
  | 'veins'
  | 'hud'
  | 'map'
  | 'arenas'
  | 'vfx_skills'
  | 'vfx_ribbons';

export interface AssetCatalogEntry {
  id: string;
  name: string;
  category: AssetCategoryId;
  url: string;
  kind: 'sprite' | 'spritesheet_4x4' | 'vfx_ring' | 'map';
  vfxRingId?: number;
}

export const ASSET_CATEGORIES: { id: AssetCategoryId; label: string }[] = [
  { id: 'characters', label: 'Nhân Vật' },
  { id: 'vfx_rings', label: 'VFX 16 Vòng' },
  { id: 'vfx_auras', label: 'Aura Thân (16)' },
  { id: 'vfx_skills', label: 'VFX Kỹ Năng (23)' },
  { id: 'vfx_ribbons', label: 'VFX Dải Lụa (12)' },
  { id: 'buildings', label: 'Công Trình' },
  { id: 'bosses', label: 'Boss' },
  { id: 'monsters', label: 'Quái Bí Cảnh' },
  { id: 'guardians', label: 'Thủ Vệ Mạch' },
  { id: 'equipment', label: 'Trang Bị 12 Ô' },
  { id: 'sets', label: 'Bộ Trang Bị' },
  { id: 'gems', label: 'Ngọc Khảm' },
  { id: 'skills', label: 'Kỹ Năng' },
  { id: 'realms', label: 'Cảnh Giới' },
  { id: 'roots', label: 'Linh Căn' },
  { id: 'elements', label: 'Ngũ Hành' },
  { id: 'resources', label: 'Tài Nguyên' },
  { id: 'veins', label: 'Linh Mạch' },
  { id: 'hud', label: 'HUD & Khung' },
  { id: 'map', label: 'Bản Đồ 4 Mùa & Cây' },
  { id: 'arenas', label: 'Lôi Đài Chiến Đấu (7)' },
];

const CHAR_BASES: [string, string][] = [
  ['diep_thanh_van', 'Diệp Thanh Vân (Kim Nam)'],
  ['kim_nu', 'Đệ Tử Kim Nữ'],
  ['thuy_nam', 'Đệ Tử Thủy Nam'],
  ['to_bang_tam', 'Tô Băng Tâm (Thủy Nữ)'],
  ['moc_nam', 'Đệ Tử Mộc Nam'],
  ['lam_thanh_dao', 'Lâm Thanh Dao (Mộc Nữ)'],
  ['tieu_xich_viem', 'Tiêu Xích Viêm (Hỏa Nam)'],
  ['hoa_nu', 'Đệ Tử Hỏa Nữ'],
  ['tho_nam', 'Đệ Tử Thổ Nam'],
  ['tho_nu', 'Đệ Tử Thổ Nữ'],
];

const BUILDINGS: [string, string][] = [
  ['chinh_dien', 'Chính Điện'],
  ['tu_linh_tran', 'Tụ Linh Trận'],
  ['duoc_dien', 'Linh Dược Điền'],
  ['luyen_dan_phong', 'Luyện Đan Phòng'],
  ['luyen_khi_cac', 'Luyện Khí Các'],
  ['tang_kinh_cac', 'Tàng Kinh Các'],
  ['truyen_tong_tran', 'Truyền Tống Trận'],
];

const BOSSES: [string, string][] = [
  ['boss_cuu_vi', 'Cửu Vĩ Yêu Hồ'],
  ['boss_huyen_vu', 'Thái Cổ Huyền Vũ'],
  ['boss_kiem_ma', 'Vô Cực Kiếm Ma'],
  ['boss_ma_long', 'Hắc Viêm Ma Long'],
];

const EQUIPMENT: [string, string][] = [
  ['non', 'Nón / Mão'],
  ['giap_vai', 'Giáp Vai'],
  ['giap_nguc', 'Giáp Ngực'],
  ['giap_tay', 'Hộ Uyển'],
  ['gang_tay', 'Găng Tay'],
  ['dai_lung', 'Đai Lưng'],
  ['quan', 'Quần / Hộ Thối'],
  ['giay', 'Giày / Hài'],
  ['vu_khi_chinh', 'Vũ Khí Chính'],
  ['vu_khi_phu', 'Pháp Bảo Phụ'],
  ['day_chuyen', 'Dây Chuyền'],
  ['nhan', 'Nhẫn Trữ Vật'],
];

const SETS: [string, string][] = [
  ['bat_diet_huyen_vu', 'Bộ Bất Diệt Huyền Vũ'],
  ['cuu_thien_kiem_de', 'Bộ Cửu Thiên Kiếm Đế'],
  ['thai_co_long_hoang', 'Bộ Thái Cổ Long Hoàng'],
  ['thanh_lien_tien_ton', 'Bộ Thanh Liên Tiên Tôn'],
];

const SKILLS: [string, string][] = [
  ['kim_basic', 'Kim · Cơ Bản'],
  ['kim_ult', 'Kim · Tuyệt Kỹ'],
  ['moc_basic', 'Mộc · Cơ Bản'],
  ['moc_ult', 'Mộc · Tuyệt Kỹ'],
  ['thuy_basic', 'Thủy · Cơ Bản'],
  ['thuy_ult', 'Thủy · Tuyệt Kỹ'],
  ['hoa_basic', 'Hỏa · Cơ Bản'],
  ['hoa_ult', 'Hỏa · Tuyệt Kỹ'],
  ['tho_basic', 'Thổ · Cơ Bản'],
  ['tho_ult', 'Thổ · Tuyệt Kỹ'],
];

const REALMS = [
  'Luyện Khí',
  'Trúc Cơ',
  'Kim Đan',
  'Nguyên Anh',
  'Hóa Thần',
  'Luyện Hư',
  'Hợp Thể',
  'Đại Thừa',
  'Độ Kiếp',
];

const ROOTS: [string, string][] = [
  ['ngu_hanh_tap', 'Ngũ Hành Tạp Linh Căn'],
  ['tu_linh_can', 'Tứ Linh Căn'],
  ['tam_linh_can', 'Tam Linh Căn'],
  ['song_linh_can', 'Song Linh Căn'],
  ['thien_linh_can', 'Thiên Linh Căn'],
  ['bien_di_loi', 'Biến Dị Lôi Linh Căn'],
  ['bien_di_bang', 'Biến Dị Băng Linh Căn'],
  ['bien_di_phong', 'Biến Dị Phong Linh Căn'],
];

const ELEMENTS: [string, string][] = [
  ['Kim', 'Hệ Kim'],
  ['Moc', 'Hệ Mộc'],
  ['Thuy', 'Hệ Thủy'],
  ['Hoa', 'Hệ Hỏa'],
  ['Tho', 'Hệ Thổ'],
];

const RESOURCES: [string, string][] = [
  ['linhThach', 'Linh Thạch'],
  ['tienNgoc', 'Tiên Ngọc'],
  ['linhThao', 'Linh Thảo'],
  ['huyenThiet', 'Huyền Thiết'],
  ['linhKhi', 'Linh Khí'],
  ['cuongHoaThach', 'Cường Hóa Thạch'],
  ['dotPhaDan', 'Đột Phá Đan'],
  ['tinhHoaBoss', 'Tinh Hoa Boss'],
  ['stamina', 'Thể Lực'],
];

const HUD_ITEMS: [string, string][] = [
  ['xay_dung', 'Nút Xây Dựng'],
  ['tien_do', 'Nút Tiến Độ'],
  ['de_tu', 'Nút Đệ Tử'],
  ['co_bao', 'Nút Cơ Bảo'],
  ['tien_minh', 'Nút Tiên Minh'],
  ['the_gioi', 'Nút Thế Giới'],
  ['vip', 'Nút VIP'],
  ['treo_may', 'Nút Treo Máy'],
  ['qua_tang', 'Nút Quà Tặng'],
  ['san_boss', 'Nút Săn Boss'],
  ['xep_hang', 'Nút Xếp Hạng'],
  ['huu_bang', 'Lối Tắt Hữu Bang'],
  ['du_ngoan', 'Lối Tắt Du Ngoạn'],
  ['cho_giao_dich', 'Lối Tắt Chợ'],
  ['shortcut_banner_pointed', 'Biển Lối Tắt Nhọn'],
  ['shortcut_banner_rect', 'Biển Cấp Tông Môn'],
  ['label_scroll', 'Cuộn Nhãn Tên'],
];

function buildCatalog(): AssetCatalogEntry[] {
  const list: AssetCatalogEntry[] = [];

  for (const [key, label] of CHAR_BASES) {
    list.push({
      id: `char_sheet_${key}`,
      name: `${label} (Sheet 4x4)`,
      category: 'characters',
      url: `./assets/sprites/characters/${key}_sheet.png`,
      kind: 'spritesheet_4x4',
    });
    list.push({
      id: `char_portrait_${key}`,
      name: `${label} (Chân dung)`,
      category: 'characters',
      url: `./assets/sprites/characters/${key}.png`,
      kind: 'sprite',
    });
  }

  for (const ring of VFX_RING_PRESETS) {
    list.push({
      id: `vfx_${ring.code}`,
      name: `#${String(ring.id).padStart(2, '0')} ${ring.name} (${ring.realmLabel})`,
      category: 'vfx_rings',
      url: ring.transparentUrl,
      kind: 'vfx_ring',
      vfxRingId: ring.id,
    });
  }

  for (const aura of VFX_AURA_PRESETS) {
    list.push({
      id: `vfx_${aura.code}`,
      name: `#${String(aura.id).padStart(2, '0')} ${aura.name} (${aura.realmLabel})`,
      category: 'vfx_auras',
      url: aura.url,
      kind: 'sprite',
    });
  }

  for (const [key, label] of BUILDINGS) {
    list.push({
      id: `building_${key}`,
      name: label,
      category: 'buildings',
      url: `./assets/sprites/buildings/${key}.png`,
      kind: 'sprite',
    });
  }

  for (const [key, label] of BOSSES) {
    list.push({
      id: `boss_${key}`,
      name: label,
      category: 'bosses',
      url: `./assets/sprites/bosses/${key}.png`,
      kind: 'sprite',
    });
  }

  for (let i = 1; i <= 15; i++) {
    list.push({
      id: `monster_e${i}`,
      name: `Quái Bí Cảnh #${i}`,
      category: 'monsters',
      url: `./assets/sprites/monsters/e${i}.png`,
      kind: 'sprite',
    });
  }

  for (let i = 1; i <= 10; i++) {
    list.push({
      id: `guardian_vg${i}`,
      name: `Thủ Vệ Linh Mạch #${i}`,
      category: 'guardians',
      url: `./assets/sprites/guardians/vg${i}.png`,
      kind: 'sprite',
    });
  }

  for (const [key, label] of EQUIPMENT) {
    list.push({
      id: `equip_${key}`,
      name: label,
      category: 'equipment',
      url: `./assets/sprites/equipment/${key}.png`,
      kind: 'sprite',
    });
  }

  for (const [key, label] of SETS) {
    list.push({
      id: `set_${key}`,
      name: label,
      category: 'sets',
      url: `./assets/sprites/sets/${key}.png`,
      kind: 'sprite',
    });
  }

  for (const [elKey, elLabel] of ELEMENTS) {
    for (let tier = 1; tier <= 5; tier++) {
      list.push({
        id: `gem_${elKey}_${tier}`,
        name: `Ngọc ${elLabel} Bậc ${tier}`,
        category: 'gems',
        url: `./assets/sprites/gems/${elKey}_${tier}.png`,
        kind: 'sprite',
      });
    }
  }

  for (const [key, label] of SKILLS) {
    list.push({
      id: `skill_${key}`,
      name: label,
      category: 'skills',
      url: `./assets/sprites/skills/${key}.png`,
      kind: 'sprite',
    });
  }

  REALMS.forEach((label, idx) => {
    list.push({
      id: `realm_${idx}`,
      name: `Cảnh Giới ${idx + 1} · ${label}`,
      category: 'realms',
      url: `./assets/sprites/realms/realm_${idx}.png`,
      kind: 'sprite',
    });
  });

  for (const [key, label] of ROOTS) {
    list.push({
      id: `root_${key}`,
      name: label,
      category: 'roots',
      url: `./assets/sprites/roots/${key}.png`,
      kind: 'sprite',
    });
  }

  for (const [key, label] of ELEMENTS) {
    list.push({
      id: `elem_${key}`,
      name: label,
      category: 'elements',
      url: `./assets/sprites/elements/${key}.png`,
      kind: 'sprite',
    });
  }

  for (const [key, label] of RESOURCES) {
    list.push({
      id: `res_${key}`,
      name: label,
      category: 'resources',
      url: `./assets/sprites/resources/${key}.png`,
      kind: 'sprite',
    });
  }

  for (let i = 1; i <= 5; i++) {
    list.push({
      id: `vein_${i}`,
      name: `Linh Mạch #${i}`,
      category: 'veins',
      url: `./assets/sprites/veins/vein_${i}.png`,
      kind: 'sprite',
    });
  }

  for (const [key, label] of HUD_ITEMS) {
    list.push({
      id: `hud_${key}`,
      name: label,
      category: 'hud',
      url: `./assets/sprites/hud/${key}.png`,
      kind: 'sprite',
    });
  }

  list.push(
    {
      id: 'map_main',
      name: 'Bản Đồ Sơn Môn — Mùa Thu (2752x1536)',
      category: 'map',
      url: './assets/aistudio/1_80f8120e.png',
      kind: 'map',
    },
    {
      id: 'map_season_xuan',
      name: 'Bản Đồ Sơn Môn — Mùa Xuân (2752x1536)',
      category: 'map',
      url: './assets/aistudio/sect_xuan.png',
      kind: 'map',
    },
    {
      id: 'map_season_ha',
      name: 'Bản Đồ Sơn Môn — Mùa Hạ (2752x1536)',
      category: 'map',
      url: './assets/aistudio/sect_ha.png',
      kind: 'map',
    },
    {
      id: 'map_season_dong',
      name: 'Bản Đồ Sơn Môn — Mùa Đông (2752x1536)',
      category: 'map',
      url: './assets/aistudio/sect_dong.png',
      kind: 'map',
    },
    {
      id: 'map_occ_center',
      name: 'Cây Phong Giữa (Foreground Occluder)',
      category: 'map',
      url: './assets/sprites/map/occ_maple_center.png',
      kind: 'map',
    },
    {
      id: 'map_occ_bottom',
      name: 'Cây Phong Dưới (Foreground Occluder)',
      category: 'map',
      url: './assets/sprites/map/occ_maple_bottom.png',
      kind: 'map',
    },
    {
      id: 'map_occ_top_left',
      name: 'Cây Phong Trên Trái (Foreground Occluder)',
      category: 'map',
      url: './assets/sprites/map/occ_maple_top_left.png',
      kind: 'map',
    },
  );

  // Battle Arenas (7)
  const ARENA_ITEMS: [string, string][] = [
    ['arena_boss_kiem_ma', 'Lôi Đài Boss — Kiếm Ma'],
    ['arena_boss_cuu_vi', 'Lôi Đài Boss — Cửu Vĩ Yêu Hồ'],
    ['arena_boss_huyen_vu', 'Lôi Đài Boss — Huyền Vũ Thần Quy'],
    ['arena_boss_ma_long', 'Lôi Đài Boss — Ma Long Thâm Uyên'],
    ['arena_realm_moc', 'Lôi Đài Bí Cảnh — Thanh Mộc Lâm'],
    ['arena_realm_bang', 'Lôi Đài Bí Cảnh — Huyền Băng Động'],
    ['arena_realm_cuu_thien', 'Lôi Đài Bí Cảnh — Cửu Thiên Tiên Đài'],
  ];
  for (const [key, label] of ARENA_ITEMS) {
    list.push({
      id: key,
      name: label,
      category: 'arenas',
      url: `./assets/arenas/${key}.jpg`,
      kind: 'map',
    });
  }

  // Van Kiem Quy Tong Ultimate VFX Pack (23 RGBA PNGs)
  const VAN_KIEM_ITEMS: [string, string][] = [
    ['circle', 'Vạn Kiếm · Trận Pháp Bát Quái'],
    ['streak_01', 'Vạn Kiếm · Dải Kiếm Khí 01'],
    ['streak_02', 'Vạn Kiếm · Dải Kiếm Khí 02'],
    ['streak_03', 'Vạn Kiếm · Dải Kiếm Khí 03'],
    ['p_sparkles', 'Vạn Kiếm · Hạt Lấp Lánh'],
    ['p_shards', 'Vạn Kiếm · Mảnh Vỡ Vàng'],
    ['p_star4', 'Vạn Kiếm · Sao 4 Cánh'],
    ['p_star8', 'Vạn Kiếm · Chớp Sao 8 Cánh'],
    ['p_dust', 'Vạn Kiếm · Bụi Vàng Kim'],
    ['p_orb', 'Vạn Kiếm · Lõi Cầu Quang'],
    ...Array.from({ length: 13 }, (_, i) => {
      const idx = String(i + 1).padStart(2, '0');
      return [`impact_${idx}`, `Vạn Kiếm · Khung Nổ ${idx}`] as [string, string];
    }),
  ];
  for (const [key, label] of VAN_KIEM_ITEMS) {
    list.push({
      id: `vfx_vankiem_${key}`,
      name: label,
      category: 'vfx_skills',
      url: `./assets/vfx_skills/van_kiem/${key}.png`,
      kind: 'sprite',
    });
  }

  // VFX Ribbons (12)
  for (let i = 1; i <= 12; i += 1) {
    const idx = String(i).padStart(2, '0');
    list.push({
      id: `vfx_ribbon_${idx}`,
      name: `VFX Dải Lụa Tiên Khí #${idx}`,
      category: 'vfx_ribbons',
      url: `./assets/vfx_ribbons/ribbon_${idx}.png`,
      kind: 'sprite',
    });
  }

  return list;
}

export const ASSET_CATALOG: AssetCatalogEntry[] = buildCatalog();
