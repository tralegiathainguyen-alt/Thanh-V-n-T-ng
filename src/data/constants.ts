import {
  BossDef,
  BuildingId,
  ElementType,
  EquipmentSlot,
  EquipmentTier,
  Rarity,
  SecretRealmDef,
  SkillDef,
  SpiritRootGrade,
  SpiritVein,
  VipFashionId,
} from '../types/game';

export const ELEMENTS: ElementType[] = ['Kim', 'Moc', 'Thuy', 'Hoa', 'Tho'];

export const ELEMENT_META: Record<
  ElementType,
  {
    name: string;
    hanzi: string;
    color: string;
    bgSoft: string;
    border: string;
    counters: ElementType; // Tương khắc (+35% DMG)
    generates: ElementType; // Tương sinh (Combo Liên Hoàn)
    roleHint: string;
  }
> = {
  Kim: {
    name: 'Kim',
    hanzi: '金',
    color: '#B8860B',
    bgSoft: 'rgba(212, 162, 76, 0.16)',
    border: '#D4A24C',
    counters: 'Moc',
    generates: 'Thuy',
    roleHint: 'Kiếm Khí sắc bén · Bạo kích & Phá giáp',
  },
  Moc: {
    name: 'Mộc',
    hanzi: '木',
    color: '#257A52',
    bgSoft: 'rgba(45, 138, 104, 0.16)',
    border: '#2D8A68',
    counters: 'Tho',
    generates: 'Hoa',
    roleHint: 'Sinh cơ dồi dào · Hồi phục & Khống chế',
  },
  Thuy: {
    name: 'Thủy',
    hanzi: '水',
    color: '#246B96',
    bgSoft: 'rgba(47, 122, 168, 0.16)',
    border: '#2F7AA8',
    counters: 'Hoa',
    generates: 'Moc',
    roleHint: 'Hàn băng lưu chuyển · Tốc độ & Quần công',
  },
  Hoa: {
    name: 'Hỏa',
    hanzi: '火',
    color: '#C23B2B',
    bgSoft: 'rgba(200, 67, 50, 0.16)',
    border: '#C84332',
    counters: 'Kim',
    generates: 'Tho',
    roleHint: 'Chân hỏa thiêu đốt · Sát thương bùng nổ',
  },
  Tho: {
    name: 'Thổ',
    hanzi: '土',
    color: '#8C6239',
    bgSoft: 'rgba(155, 111, 68, 0.18)',
    border: '#9B6F44',
    counters: 'Thuy',
    generates: 'Kim',
    roleHint: 'Bất động như sơn · Hộ thuẫn & Phòng thủ',
  },
};

export interface RealmStage {
  index: number;
  majorName: string;
  subName: string;
  fullName: string;
  qiRequired: number;
  baseBreakRate: number; // %
  statMult: number;
  color: string;
}

const MAJOR_REALMS = [
  { name: 'Luyện Khí', baseQi: 120, rate: 88, mult: 1.0, color: '#5A6B66' },
  { name: 'Trúc Cơ', baseQi: 340, rate: 76, mult: 1.55, color: '#2F7A5D' },
  { name: 'Kim Đan', baseQi: 860, rate: 64, mult: 2.4, color: '#B8860B' },
  { name: 'Nguyên Anh', baseQi: 2100, rate: 52, mult: 3.7, color: '#2B6CB0' },
  { name: 'Hóa Thần', baseQi: 5200, rate: 42, mult: 5.6, color: '#7B4EA3' },
  { name: 'Luyện Hư', baseQi: 12500, rate: 34, mult: 8.5, color: '#B84A39' },
  { name: 'Hợp Thể', baseQi: 28000, rate: 27, mult: 13.0, color: '#C23B2B' },
  { name: 'Đại Thừa', baseQi: 64000, rate: 21, mult: 20.0, color: '#9E6E16' },
  { name: 'Độ Kiếp', baseQi: 145000, rate: 15, mult: 31.0, color: '#7A1F1F' },
];

const SUB_STAGES = ['Sơ Kỳ', 'Trung Kỳ', 'Đỉnh Phong'];

export const REALM_LADDER: RealmStage[] = MAJOR_REALMS.flatMap((major, mIdx) =>
  SUB_STAGES.map((sub, sIdx) => {
    const index = mIdx * 3 + sIdx;
    const subMult = sIdx === 0 ? 1 : sIdx === 1 ? 1.35 : 1.85;
    return {
      index,
      majorName: major.name,
      subName: sub,
      fullName: `${major.name} ${sub}`,
      qiRequired: Math.round(major.baseQi * subMult),
      baseBreakRate: Math.max(12, major.rate - sIdx * 4),
      statMult: Number((major.mult * (1 + sIdx * 0.22)).toFixed(2)),
      color: major.color,
    };
  }),
);

export const SPIRIT_ROOT_META: Record<
  SpiritRootGrade,
  {
    name: string;
    tierLabel: string;
    qiSpeedMult: number;
    breakthroughBonus: number;
    elemDmgBonus: number;
    color: string;
    description: string;
  }
> = {
  ngu_hanh_tap: {
    name: 'Ngũ Hành Tạp Linh Căn',
    tierLabel: 'Phàm Phẩm',
    qiSpeedMult: 0.85,
    breakthroughBonus: -6,
    elemDmgBonus: 0,
    color: '#6B7280',
    description: 'Ngũ hành hỗn tạp, tu luyện chậm nhưng linh hoạt mọi trận hình.',
  },
  tu_linh_can: {
    name: 'Tứ Linh Căn',
    tierLabel: 'Hạ Phẩm',
    qiSpeedMult: 1.0,
    breakthroughBonus: 0,
    elemDmgBonus: 5,
    color: '#4B5563',
    description: 'Linh căn phổ thông, nền tảng tu vi vững vàng.',
  },
  tam_linh_can: {
    name: 'Tam Linh Căn',
    tierLabel: 'Trung Phẩm',
    qiSpeedMult: 1.25,
    breakthroughBonus: 4,
    elemDmgBonus: 10,
    color: '#257A52',
    description: 'Ba hệ giao hòa, tốc độ hấp thu linh khí khá tốt.',
  },
  song_linh_can: {
    name: 'Song Linh Căn',
    tierLabel: 'Thượng Phẩm',
    qiSpeedMult: 1.65,
    breakthroughBonus: 10,
    elemDmgBonus: 18,
    color: '#246B96',
    description: 'Tư chất hiếm gặp, dễ kích hoạt cộng hưởng Tương Sinh.',
  },
  thien_linh_can: {
    name: 'Thiên Linh Căn',
    tierLabel: 'Cực Phẩm',
    qiSpeedMult: 2.25,
    breakthroughBonus: 18,
    elemDmgBonus: 30,
    color: '#B8860B',
    description: 'Thuần nhất một hệ linh khí, thiên tài trăm năm có một.',
  },
  bien_di_loi: {
    name: 'Lôi Biến Dị Linh Căn',
    tierLabel: 'Thánh Phẩm',
    qiSpeedMult: 2.6,
    breakthroughBonus: 14,
    elemDmgBonus: 38,
    color: '#7B4EA3',
    description: 'Kim Hỏa biến dị hóa Thiên Lôi, bạo kích uy lực kinh thiên.',
  },
  bien_di_bang: {
    name: 'Băng Biến Dị Linh Căn',
    tierLabel: 'Thánh Phẩm',
    qiSpeedMult: 2.55,
    breakthroughBonus: 16,
    elemDmgBonus: 36,
    color: '#0E7490',
    description: 'Thủy Kim ngưng kết Huyền Băng, tốc độ xuất chiêu vượt trội.',
  },
  bien_di_phong: {
    name: 'Phong Biến Dị Linh Căn',
    tierLabel: 'Thánh Phẩm',
    qiSpeedMult: 2.5,
    breakthroughBonus: 16,
    elemDmgBonus: 35,
    color: '#15803D',
    description: 'Mộc Thủy hóa Thanh Phong, liên hoàn chiêu thức bất tuyệt.',
  },
};

export const RARITY_META: Record<
  Rarity,
  {
    name: string;
    color: string;
    bg: string;
    border: string;
    statMult: number;
    subStatCount: number;
    socketCount: number;
    sellPrice: number;
  }
> = {
  thuong: {
    name: 'Thường',
    color: '#57534E',
    bg: '#F2EFE9',
    border: '#B8B0A0',
    statMult: 1.0,
    subStatCount: 1,
    socketCount: 1,
    sellPrice: 120,
  },
  hiem: {
    name: 'Hiếm',
    color: '#1D5E8C',
    bg: '#E8F2F8',
    border: '#5E98C4',
    statMult: 1.38,
    subStatCount: 2,
    socketCount: 1,
    sellPrice: 360,
  },
  su_thi: {
    name: 'Sử Thi',
    color: '#6D3B9E',
    bg: '#F2EBF9',
    border: '#9C72C9',
    statMult: 1.85,
    subStatCount: 3,
    socketCount: 2,
    sellPrice: 950,
  },
  huyen_thoai: {
    name: 'Huyền Thoại',
    color: '#B4690E',
    bg: '#FCF4E3',
    border: '#D99B38',
    statMult: 2.55,
    subStatCount: 4,
    socketCount: 3,
    sellPrice: 2800,
  },
  truyen_thuyet: {
    name: 'Truyền Thuyết',
    color: '#B92B27',
    bg: '#FCEBEA',
    border: '#D4574E',
    statMult: 3.45,
    subStatCount: 4,
    socketCount: 3,
    sellPrice: 7500,
  },
};

export const EQUIPMENT_TIERS: {
  id: EquipmentTier;
  name: string;
  mult: number;
  ascendCostIron: number;
  ascendCostEssence: number;
  ascendCostStone: number;
}[] = [
  { id: 'pham_khi', name: 'Phàm Khí', mult: 1.0, ascendCostIron: 40, ascendCostEssence: 1, ascendCostStone: 400 },
  { id: 'linh_khi', name: 'Linh Khí', mult: 1.35, ascendCostIron: 90, ascendCostEssence: 2, ascendCostStone: 1100 },
  { id: 'bao_khi', name: 'Bảo Khí', mult: 1.8, ascendCostIron: 180, ascendCostEssence: 4, ascendCostStone: 2600 },
  { id: 'tien_khi', name: 'Tiên Khí', mult: 2.4, ascendCostIron: 340, ascendCostEssence: 7, ascendCostStone: 5800 },
  { id: 'than_khi', name: 'Thần Khí', mult: 3.25, ascendCostIron: 0, ascendCostEssence: 0, ascendCostStone: 0 },
];

export const EQUIPMENT_SLOTS: {
  slot: EquipmentSlot;
  label: string;
  shortLabel: string;
  primaryStat: 'atk' | 'hp' | 'def' | 'spd';
  baseValue: number;
  column: 'left' | 'right';
}[] = [
  { slot: 'non', label: 'Nón (Tiên Quan)', shortLabel: 'Nón', primaryStat: 'hp', baseValue: 180, column: 'left' },
  { slot: 'giap_vai', label: 'Giáp Vai', shortLabel: 'Giáp Vai', primaryStat: 'def', baseValue: 26, column: 'left' },
  { slot: 'giap_nguc', label: 'Giáp Ngực', shortLabel: 'Giáp Ngực', primaryStat: 'hp', baseValue: 320, column: 'left' },
  { slot: 'giap_tay', label: 'Giáp Tay', shortLabel: 'Giáp Tay', primaryStat: 'def', baseValue: 22, column: 'left' },
  { slot: 'gang_tay', label: 'Găng Tay', shortLabel: 'Găng Tay', primaryStat: 'atk', baseValue: 34, column: 'left' },
  { slot: 'dai_lung', label: 'Đai Lưng', shortLabel: 'Đai Lưng', primaryStat: 'hp', baseValue: 210, column: 'left' },
  { slot: 'vu_khi_chinh', label: 'Vũ Khí Chính', shortLabel: 'VK Chính', primaryStat: 'atk', baseValue: 68, column: 'right' },
  { slot: 'vu_khi_phu', label: 'Vũ Khí Phụ', shortLabel: 'VK Phụ', primaryStat: 'atk', baseValue: 44, column: 'right' },
  { slot: 'quan', label: 'Quần (Hạ Y)', shortLabel: 'Quần', primaryStat: 'def', baseValue: 28, column: 'right' },
  { slot: 'giay', label: 'Giày (Tiên Lý)', shortLabel: 'Giày', primaryStat: 'spd', baseValue: 18, column: 'right' },
  { slot: 'day_chuyen', label: 'Dây Chuyền / Vòng Cổ', shortLabel: 'Vòng Cổ', primaryStat: 'hp', baseValue: 240, column: 'right' },
  { slot: 'nhan', label: 'Nhẫn (Linh Giới)', shortLabel: 'Nhẫn', primaryStat: 'atk', baseValue: 42, column: 'right' },
];

export interface EquipmentSetDef {
  id: string;
  name: string;
  element: ElementType;
  twoPieceDesc: string;
  fourPieceDesc: string;
  twoPieceBonus: { atkPct?: number; hpPct?: number; defPct?: number; spd?: number; crit?: number };
  fourPieceBonus: { atkPct?: number; hpPct?: number; defPct?: number; spd?: number; crit?: number };
}

export const EQUIPMENT_SETS: Record<string, EquipmentSetDef> = {
  thai_co_long_hoang: {
    id: 'thai_co_long_hoang',
    name: 'Bộ Thái Cổ Long Hoàng',
    element: 'Hoa',
    twoPieceDesc: 'Công kích +18%, Bạo kích +8%',
    fourPieceDesc: 'Công kích +35%, Sát thương Combo Ngũ Hành +25%',
    twoPieceBonus: { atkPct: 18, crit: 8 },
    fourPieceBonus: { atkPct: 35, crit: 12 },
  },
  bat_diet_huyen_vu: {
    id: 'bat_diet_huyen_vu',
    name: 'Bộ Bất Diệt Huyền Vũ',
    element: 'Thuy',
    twoPieceDesc: 'Sinh lực +22%, Phòng thủ +16%',
    fourPieceDesc: 'Sinh lực +40%, Tốc độ +22',
    twoPieceBonus: { hpPct: 22, defPct: 16 },
    fourPieceBonus: { hpPct: 40, spd: 22 },
  },
  thanh_lien_tien_ton: {
    id: 'thanh_lien_tien_ton',
    name: 'Bộ Thanh Liên Tiên Tôn',
    element: 'Moc',
    twoPieceDesc: 'Sinh lực +18%, Tốc độ +15',
    fourPieceDesc: 'Công kích +24%, Sinh lực +28%, Bạo kích +10%',
    twoPieceBonus: { hpPct: 18, spd: 15 },
    fourPieceBonus: { atkPct: 24, hpPct: 28, crit: 10 },
  },
  cuu_thien_kiem_de: {
    id: 'cuu_thien_kiem_de',
    name: 'Bộ Cửu Thiên Kiếm Đế',
    element: 'Kim',
    twoPieceDesc: 'Công kích +20%, Tốc độ +12',
    fourPieceDesc: 'Công kích +42%, Bạo kích +15%',
    twoPieceBonus: { atkPct: 20, spd: 12 },
    fourPieceBonus: { atkPct: 42, crit: 15 },
  },
};

export const ELEMENT_SKILLS: Record<ElementType, SkillDef[]> = {
  Kim: [
    {
      id: 'kim_basic',
      name: 'Thanh Vân Kiếm Quyết',
      element: 'Kim',
      mpCost: 0,
      multiplier: 1.05,
      target: 'single',
      description: 'Xuất kiếm sắc bén tấn công 1 mục tiêu, hồi 25 Linh Lực.',
      comboBonusDesc: 'Từ Thổ sinh Kim: +30% Bạo kích và xuyên 25% giáp.',
      vfxType: 'sword',
    },
    {
      id: 'kim_ult',
      name: 'Vạn Kiếm Quy Tông',
      element: 'Kim',
      mpCost: 50,
      multiplier: 1.55,
      target: 'all',
      description: 'Triệu hồi vạn đạo kim kiếm tấn công toàn bộ địch.',
      comboBonusDesc: 'Kích hoạt Liên Hoàn: Tăng mạnh sát thương & mở chuỗi Kim -> Thủy.',
      vfxType: 'sword',
    },
  ],
  Moc: [
    {
      id: 'moc_basic',
      name: 'Thanh Đằng Triền Nhiễu',
      element: 'Moc',
      mpCost: 0,
      multiplier: 1.0,
      target: 'single',
      description: 'Linh đằng quất vào địch, đồng thời hồi nhẹ 8% Sinh lực bản thân.',
      comboBonusDesc: 'Từ Thủy sinh Mộc: Hồi thêm 12% HP cho toàn đội.',
      vfxType: 'vine',
    },
    {
      id: 'moc_ult',
      name: 'Hồi Xuân Tiên Trận',
      element: 'Moc',
      mpCost: 45,
      multiplier: 1.25,
      target: 'ally_heal',
      description: 'Triệu hồi sinh cơ thanh mộc hồi phục Sinh lực lớn cho cả đội hình.',
      comboBonusDesc: 'Kích hoạt Liên Hoàn: Hồi vượt ngưỡng + mở chuỗi Mộc -> Hỏa.',
      vfxType: 'vine',
    },
  ],
  Thuy: [
    {
      id: 'thuy_basic',
      name: 'Huyền Băng Trảm',
      element: 'Thuy',
      mpCost: 0,
      multiplier: 1.05,
      target: 'single',
      description: 'Hàn khí ngưng tụ thành đao băng chém mục tiêu, hồi 25 Linh Lực.',
      comboBonusDesc: 'Từ Kim sinh Thủy: +35% sát thương băng hàn.',
      vfxType: 'wave',
    },
    {
      id: 'thuy_ult',
      name: 'Thương Hải Nộ Đào',
      element: 'Thuy',
      mpCost: 50,
      multiplier: 1.5,
      target: 'all',
      description: 'Sóng thần lam thủy càn quét toàn bộ kẻ địch.',
      comboBonusDesc: 'Kích hoạt Liên Hoàn: Cuốn trôi phòng ngự & mở chuỗi Thủy -> Mộc.',
      vfxType: 'wave',
    },
  ],
  Hoa: [
    {
      id: 'hoa_basic',
      name: 'Xích Viêm Chưởng',
      element: 'Hoa',
      mpCost: 0,
      multiplier: 1.12,
      target: 'single',
      description: 'Chân hỏa thiêu đốt 1 kẻ địch, gây sát thương cao.',
      comboBonusDesc: 'Từ Mộc sinh Hỏa: Bùng cháy +45% sát thương cực đại.',
      vfxType: 'flame',
    },
    {
      id: 'hoa_ult',
      name: 'Phượng Hoàng Phần Thiên',
      element: 'Hoa',
      mpCost: 55,
      multiplier: 1.72,
      target: 'all',
      description: 'Hỏa phượng giáng thế thiêu rụi toàn bộ quân địch.',
      comboBonusDesc: 'Kích hoạt Liên Hoàn: Sát thương bạo liệt & mở chuỗi Hỏa -> Thổ.',
      vfxType: 'flame',
    },
  ],
  Tho: [
    {
      id: 'tho_basic',
      name: 'Bàn Thạch Ấn',
      element: 'Tho',
      mpCost: 0,
      multiplier: 1.0,
      target: 'single',
      description: 'Ngưng tụ sơn ấn giáng xuống địch, tăng giáp bản thân.',
      comboBonusDesc: 'Từ Hỏa sinh Thổ: Tạo hộ thuẫn cho bản thân bằng 18% HP.',
      vfxType: 'mountain',
    },
    {
      id: 'tho_ult',
      name: 'Thái Sơn Hộ Tông Trận',
      element: 'Tho',
      mpCost: 45,
      multiplier: 1.3,
      target: 'ally_shield',
      description: 'Dựng kết giới hậu thổ bảo vệ toàn đội bằng lớp Hộ Thuẫn dày.',
      comboBonusDesc: 'Kích hoạt Liên Hoàn: Hộ thuẫn cực đại & mở chuỗi Thổ -> Kim.',
      vfxType: 'mountain',
    },
  ],
};

export interface BuildingDef {
  id: BuildingId;
  name: string;
  shortName: string;
  description: string;
  resourceProduced: 'linhThach' | 'linhKhi' | 'linhThao' | 'dotPhaDan' | 'huyenThiet' | 'cuongHoaThach' | null;
  resourceLabel: string;
  preferredElement: ElementType;
  baseProductionPerMin: number;
  baseCostStone: number;
  baseCostHerb: number;
  baseCostIron: number;
  // Coordinates (%) aligned with the isometric sect panorama landmarks
  mapX: number;
  mapY: number;
}

export const BUILDING_DEFS: Record<BuildingId, BuildingDef> = {
  chinh_dien: {
    id: 'chinh_dien',
    name: 'Chính Điện Tông Môn',
    shortName: 'Chính Điện',
    description: 'Trung tâm tông môn, thu thuế Linh Thạch và mở rộng giới hạn đệ tử cùng cấp độ kiến trúc.',
    resourceProduced: 'linhThach',
    resourceLabel: 'Linh Thạch / phút',
    preferredElement: 'Kim',
    baseProductionPerMin: 24,
    baseCostStone: 250,
    baseCostHerb: 40,
    baseCostIron: 30,
    mapX: 67.5,
    mapY: 32,
  },
  tu_linh_tran: {
    id: 'tu_linh_tran',
    name: 'Tụ Linh Trận',
    shortName: 'Tụ Linh Trận',
    description: 'Hấp thu thiên địa linh khí, tăng mạnh tốc độ tu luyện và thưởng treo máy offline.',
    resourceProduced: 'linhKhi',
    resourceLabel: 'Linh Khí / phút',
    preferredElement: 'Thuy',
    baseProductionPerMin: 32,
    baseCostStone: 220,
    baseCostHerb: 60,
    baseCostIron: 25,
    mapX: 60.2,
    mapY: 71.5,
  },
  duoc_dien: {
    id: 'duoc_dien',
    name: 'Linh Dược Điền',
    shortName: 'Dược Điền',
    description: 'Canh tác linh thảo ngàn năm phục vụ luyện đan và đột phá cảnh giới.',
    resourceProduced: 'linhThao',
    resourceLabel: 'Linh Thảo / phút',
    preferredElement: 'Moc',
    baseProductionPerMin: 18,
    baseCostStone: 180,
    baseCostHerb: 20,
    baseCostIron: 20,
    mapX: 68.5,
    mapY: 64.5,
  },
  luyen_dan_phong: {
    id: 'luyen_dan_phong',
    name: 'Luyện Đan Lô',
    shortName: 'Đan Lô',
    description: 'Luyện chế Đột Phá Đan từ Linh Thảo, gia tăng xác suất độ kiếp thành công.',
    resourceProduced: 'dotPhaDan',
    resourceLabel: 'Luyện Đan & Hiệu Suất',
    preferredElement: 'Hoa',
    baseProductionPerMin: 0.4,
    baseCostStone: 260,
    baseCostHerb: 80,
    baseCostIron: 40,
    mapX: 50.8,
    mapY: 42.5,
  },
  luyen_khi_cac: {
    id: 'luyen_khi_cac',
    name: 'Luyện Khí Các',
    shortName: 'Luyện Khí',
    description: 'Khai thác Huyền Thiết & rèn Cường Hóa Thạch cho 12 ô trang bị.',
    resourceProduced: 'huyenThiet',
    resourceLabel: 'Huyền Thiết / phút',
    preferredElement: 'Tho',
    baseProductionPerMin: 14,
    baseCostStone: 230,
    baseCostHerb: 30,
    baseCostIron: 40,
    mapX: 33.5,
    mapY: 51.5,
  },
  tang_kinh_cac: {
    id: 'tang_kinh_cac',
    name: 'Tàng Kinh Các',
    shortName: 'Tàng Kinh',
    description: 'Lưu giữ bí kíp Ngũ Hành Liên Hoàn, tăng sát thương kỹ năng & thưởng combo toàn tông.',
    resourceProduced: 'cuongHoaThach',
    resourceLabel: 'Cường Hóa Thạch / phút',
    preferredElement: 'Kim',
    baseProductionPerMin: 2.5,
    baseCostStone: 300,
    baseCostHerb: 50,
    baseCostIron: 50,
    mapX: 94.2,
    mapY: 32,
  },
  truyen_tong_tran: {
    id: 'truyen_tong_tran',
    name: 'Sơn Môn Bí Cảnh',
    shortName: 'Sơn Môn',
    description: 'Cổng truyền tống dẫn tới Bí Cảnh cổ đại, tăng giới hạn Thể Lực & tốc độ hồi.',
    resourceProduced: null,
    resourceLabel: '+15 Thể Lực Tối Đa / cấp',
    preferredElement: 'Thuy',
    baseProductionPerMin: 0,
    baseCostStone: 320,
    baseCostHerb: 60,
    baseCostIron: 60,
    mapX: 29.5,
    mapY: 74,
  },
};

export const SECRET_REALMS: SecretRealmDef[] = [
  {
    id: 'thanh_van_coc',
    name: 'Thanh Vân Linh Cốc',
    subtitle: 'Tầng 1 · Yêu Thú Luyện Khí',
    recommendedPower: 2800,
    staminaCost: 10,
    element: 'Moc',
    enemies: [
      { id: 'e1', name: 'Thanh Mộc Lang', element: 'Moc', hp: 920, atk: 105, def: 32, spd: 42, glyph: '狼' },
      { id: 'e2', name: 'Độc Đằng Tinh', element: 'Moc', hp: 840, atk: 98, def: 28, spd: 38, glyph: '藤' },
      { id: 'e3', name: 'Mộc Linh Hộ Vệ', element: 'Tho', hp: 1180, atk: 112, def: 45, spd: 34, glyph: '衛' },
    ],
    rewards: {
      linhThach: 420,
      linhThao: 65,
      huyenThiet: 45,
      cuongHoaThach: 8,
      dotPhaDan: 1,
      linhKhi: 360,
      dropRarityPool: ['thuong', 'hiem', 'su_thi'],
    },
  },
  {
    id: 'huyen_bang_dong',
    name: 'Huyền Băng Cổ Động',
    subtitle: 'Tầng 2 · Hàn Đàm Trúc Cơ',
    recommendedPower: 6500,
    staminaCost: 14,
    element: 'Thuy',
    enemies: [
      { id: 'e4', name: 'Hàn Băng Giao', element: 'Thuy', hp: 2250, atk: 245, def: 78, spd: 62, glyph: '蛟' },
      { id: 'e5', name: 'Tuyết Linh Vệ', element: 'Thuy', hp: 1980, atk: 220, def: 72, spd: 58, glyph: '雪' },
      { id: 'e6', name: 'Kim Giáp Khôi Lỗi', element: 'Kim', hp: 2650, atk: 265, def: 96, spd: 50, glyph: '傀' },
    ],
    rewards: {
      linhThach: 980,
      linhThao: 140,
      huyenThiet: 110,
      cuongHoaThach: 16,
      dotPhaDan: 2,
      linhKhi: 920,
      dropRarityPool: ['hiem', 'su_thi', 'huyen_thoai'],
    },
  },
  {
    id: 'xich_viem_vuc',
    name: 'Xích Viêm Hỏa Vực',
    subtitle: 'Tầng 3 · Dung Nham Kim Đan',
    recommendedPower: 14000,
    staminaCost: 18,
    element: 'Hoa',
    enemies: [
      { id: 'e7', name: 'Dung Nham Cự Nhân', element: 'Tho', hp: 5100, atk: 470, def: 165, spd: 70, glyph: '岩' },
      { id: 'e8', name: 'Xích Hỏa Nha', element: 'Hoa', hp: 4300, atk: 540, def: 130, spd: 86, glyph: '鴉' },
      { id: 'e9', name: 'Hỏa Ngục Tướng', element: 'Hoa', hp: 5900, atk: 590, def: 175, spd: 78, glyph: '炎' },
    ],
    rewards: {
      linhThach: 2150,
      linhThao: 290,
      huyenThiet: 240,
      cuongHoaThach: 30,
      dotPhaDan: 3,
      linhKhi: 2300,
      dropRarityPool: ['su_thi', 'huyen_thoai'],
    },
  },
  {
    id: 'u_minh_co_mo',
    name: 'U Minh Kiếm Trủng',
    subtitle: 'Tầng 4 · Kiếm Ý Nguyên Anh',
    recommendedPower: 28000,
    staminaCost: 22,
    element: 'Kim',
    enemies: [
      { id: 'e10', name: 'Tàn Kiếm Đạo Hồn', element: 'Kim', hp: 9600, atk: 980, def: 310, spd: 102, glyph: '劍' },
      { id: 'e11', name: 'Cổ Mộ Thạch Vệ', element: 'Tho', hp: 11800, atk: 880, def: 390, spd: 84, glyph: '碑' },
      { id: 'e12', name: 'Huyết Kiếm Tôn Giả', element: 'Kim', hp: 12600, atk: 1120, def: 350, spd: 112, glyph: '尊' },
    ],
    rewards: {
      linhThach: 4600,
      linhThao: 580,
      huyenThiet: 490,
      cuongHoaThach: 55,
      dotPhaDan: 5,
      linhKhi: 5400,
      dropRarityPool: ['su_thi', 'huyen_thoai', 'truyen_thuyet'],
    },
  },
  {
    id: 'cuu_thien_than_khu',
    name: 'Cửu Thiên Thần Khư',
    subtitle: 'Tầng 5 · Thái Cổ Hóa Thần',
    recommendedPower: 52000,
    staminaCost: 28,
    element: 'Tho',
    enemies: [
      { id: 'e13', name: 'Thái Cổ Thạch Long', element: 'Tho', hp: 22000, atk: 1850, def: 640, spd: 125, glyph: '龍' },
      { id: 'e14', name: 'Thiên Hỏa Phượng Linh', element: 'Hoa', hp: 18500, atk: 2150, def: 520, spd: 142, glyph: '鳳' },
      { id: 'e15', name: 'Cửu Thiên Thần Tướng', element: 'Kim', hp: 26500, atk: 2300, def: 710, spd: 138, glyph: '神' },
    ],
    rewards: {
      linhThach: 9800,
      linhThao: 1100,
      huyenThiet: 950,
      cuongHoaThach: 95,
      dotPhaDan: 8,
      linhKhi: 12500,
      dropRarityPool: ['huyen_thoai', 'truyen_thuyet'],
    },
  },
];

export const LEGENDARY_BOSSES: BossDef[] = [
  {
    id: 'boss_cuu_vi',
    name: 'Cửu Vĩ Thanh Hồ Vương',
    title: 'Yêu Thánh Thanh Mộc · Rơi Bộ Thanh Liên',
    element: 'Moc',
    recommendedPower: 5500,
    staminaCost: 20,
    hp: 6200,
    atk: 310,
    def: 110,
    spd: 72,
    setId: 'thanh_lien_tien_ton',
    guaranteedMinRarity: 'su_thi',
    description: 'Yêu vương tu luyện vạn năm trong rừng Thanh Liên. Khắc chế bằng hệ Kim (Kiếm Khí)!',
    skills: ELEMENT_SKILLS.Moc,
  },
  {
    id: 'boss_huyen_vu',
    name: 'Bắc Hải Huyền Vũ Cổ Thú',
    title: 'Thần Thú Huyền Thủy · Rơi Bộ Huyền Vũ',
    element: 'Thuy',
    recommendedPower: 13500,
    staminaCost: 25,
    hp: 15800,
    atk: 620,
    def: 260,
    spd: 84,
    setId: 'bat_diet_huyen_vu',
    guaranteedMinRarity: 'huyen_thoai',
    description: 'Cổ thú mang mai giáp như núi băng. Khắc chế bằng hệ Thổ và Combo Ngũ Hành!',
    skills: ELEMENT_SKILLS.Thuy,
  },
  {
    id: 'boss_ma_long',
    name: 'Xích Diễm Thái Cổ Ma Long',
    title: 'Long Hoàng Chân Hỏa · Rơi Bộ Long Hoàng',
    element: 'Hoa',
    recommendedPower: 26000,
    staminaCost: 30,
    hp: 32500,
    atk: 1280,
    def: 410,
    spd: 108,
    setId: 'thai_co_long_hoang',
    guaranteedMinRarity: 'huyen_thoai',
    description: 'Chúa tể dung nham có khả năng thiêu rụi cả đội hình. Dùng hệ Thủy dập tắt Long Viêm!',
    skills: ELEMENT_SKILLS.Hoa,
  },
  {
    id: 'boss_kiem_ma',
    name: 'Cửu Thiên Thái Cổ Kiếm Ma',
    title: 'Kiếm Tôn Truyền Thuyết · Rơi Bộ Kiếm Đế',
    element: 'Kim',
    recommendedPower: 48000,
    staminaCost: 35,
    hp: 64000,
    atk: 2450,
    def: 720,
    spd: 136,
    setId: 'cuu_thien_kiem_de',
    guaranteedMinRarity: 'truyen_thuyet',
    description: 'Đỉnh cao chiến lực thiên hạ, rớt trang bị Truyền Thuyết + Tinh Hoa Boss nâng bậc Thần Khí!',
    skills: ELEMENT_SKILLS.Kim,
  },
];

export const INITIAL_SPIRIT_VEINS: SpiritVein[] = [
  {
    id: 'vein_1',
    name: 'Thanh Sơn Tiểu Linh Mạch',
    grade: 'Huyền Cấp',
    element: 'Moc',
    ownerAlliance: 'Thanh Vân Tiên Minh',
    isOwnedByPlayer: true,
    linhThachPerHour: 650,
    tienNgocPerHour: 12,
    guardianPower: 4200,
    guardians: [
      { id: 'vg1', name: 'Hộ Mạch Trưởng Lão', element: 'Moc', hp: 2400, atk: 210, def: 70, spd: 55, glyph: '長' },
      { id: 'vg2', name: 'Thanh Mộc Đệ Tử', element: 'Thuy', hp: 1850, atk: 190, def: 60, spd: 60, glyph: '徒' },
    ],
  },
  {
    id: 'vein_2',
    name: 'Huyền Thủy Long Đàm',
    grade: 'Huyền Cấp',
    element: 'Thuy',
    ownerAlliance: 'Băng Tâm Cung',
    isOwnedByPlayer: false,
    linhThachPerHour: 1100,
    tienNgocPerHour: 22,
    guardianPower: 7800,
    guardians: [
      { id: 'vg3', name: 'Băng Tâm Tiên Tử', element: 'Thuy', hp: 4100, atk: 380, def: 130, spd: 76, glyph: '冰' },
      { id: 'vg4', name: 'Hàn Sương Hộ Pháp', element: 'Kim', hp: 3800, atk: 360, def: 145, spd: 70, glyph: '霜' },
    ],
  },
  {
    id: 'vein_3',
    name: 'Xích Hỏa Địa Mạch',
    grade: 'Địa Cấp',
    element: 'Hoa',
    ownerAlliance: 'Phần Thiên Cốc',
    isOwnedByPlayer: false,
    linhThachPerHour: 2100,
    tienNgocPerHour: 45,
    guardianPower: 16500,
    guardians: [
      { id: 'vg5', name: 'Phần Thiên Cốc Chủ', element: 'Hoa', hp: 8600, atk: 790, def: 240, spd: 96, glyph: '焚' },
      { id: 'vg6', name: 'Xích Viêm Trưởng Lão', element: 'Tho', hp: 7900, atk: 680, def: 290, spd: 82, glyph: '炎' },
    ],
  },
  {
    id: 'vein_4',
    name: 'Thái Bạch Kim Linh Mạch',
    grade: 'Địa Cấp',
    element: 'Kim',
    ownerAlliance: 'Thục Sơn Kiếm Phái',
    isOwnedByPlayer: false,
    linhThachPerHour: 3400,
    tienNgocPerHour: 70,
    guardianPower: 29000,
    guardians: [
      { id: 'vg7', name: 'Thục Sơn Kiếm Thánh', element: 'Kim', hp: 14800, atk: 1380, def: 420, spd: 118, glyph: '聖' },
      { id: 'vg8', name: 'Kiếm Trận Chấp Sự', element: 'Thuy', hp: 12200, atk: 1150, def: 380, spd: 112, glyph: '陣' },
    ],
  },
  {
    id: 'vein_5',
    name: 'Cửu Thiên Đế Long Mạch',
    grade: 'Thiên Cấp',
    element: 'Tho',
    ownerAlliance: 'Côn Lôn Đế Tông',
    isOwnedByPlayer: false,
    linhThachPerHour: 6500,
    tienNgocPerHour: 140,
    guardianPower: 54000,
    guardians: [
      { id: 'vg9', name: 'Côn Lôn Đế Tôn', element: 'Tho', hp: 29000, atk: 2400, def: 820, spd: 132, glyph: '帝' },
      { id: 'vg10', name: 'Thiên Lôi Đại Trưởng Lão', element: 'Kim', hp: 24500, atk: 2550, def: 690, spd: 145, glyph: '雷' },
    ],
  },
];

export const GLOBAL_RIVAL_SECTS = [
  { id: 'r1', sectName: 'Côn Lôn Đế Tông', master: 'Huyền Thiên Đế Tôn', server: 'S1 · Cửu Châu', realm: 'Đại Thừa Đỉnh Phong', power: 148200, alliance: 'Côn Lôn Đế Tông', maxStage: 5 },
  { id: 'r2', sectName: 'Thục Sơn Kiếm Các', master: 'Lý Trường Thanh', server: 'S1 · Cửu Châu', realm: 'Hợp Thể Trung Kỳ', power: 94600, alliance: 'Thục Sơn Kiếm Phái', maxStage: 5 },
  { id: 'r3', sectName: 'Phần Thiên Thánh Cốc', master: 'Viêm Đế Tiêu Hành', server: 'S2 · Nam Hải', realm: 'Luyện Hư Đỉnh Phong', power: 68400, alliance: 'Phần Thiên Cốc', maxStage: 4 },
  { id: 'r4', sectName: 'Băng Tâm Tuyết Cung', master: 'Tô Hàn Nguyệt', server: 'S1 · Cửu Châu', realm: 'Hóa Thần Hậu Kỳ', power: 42800, alliance: 'Băng Tâm Cung', maxStage: 4 },
  { id: 'r5', sectName: 'Vạn Thú Linh Tông', master: 'Bách Lý Cuồng Đao', server: 'S3 · Bắc Vực', realm: 'Nguyên Anh Đỉnh Phong', power: 26500, alliance: 'Vạn Thú Minh', maxStage: 3 },
  { id: 'r6', sectName: 'Đan Đỉnh Tiên Môn', master: 'Dược Trần Tử', server: 'S2 · Nam Hải', realm: 'Nguyên Anh Sơ Kỳ', power: 18400, alliance: 'Thanh Vân Tiên Minh', maxStage: 3 },
  { id: 'r7', sectName: 'Huyền Âm Quỷ Cốc', master: 'Mặc Uyên', server: 'S4 · Tây Mạc', realm: 'Kim Đan Đỉnh Phong', power: 11200, alliance: 'U Minh Điện', maxStage: 2 },
  { id: 'r8', sectName: 'Linh Kiếm Sơn Trang', master: 'Diệp Phàm', server: 'S1 · Cửu Châu', realm: 'Kim Đan Sơ Kỳ', power: 6800, alliance: 'Thanh Vân Tiên Minh', maxStage: 2 },
  { id: 'r9', sectName: 'Bích Thủy Tông', master: 'Thẩm Thanh Thu', server: 'S3 · Bắc Vực', realm: 'Trúc Cơ Đỉnh Phong', power: 3400, alliance: 'Băng Tâm Cung', maxStage: 1 },
];

export const GEM_NAMES: Record<ElementType, { name: string; statKey: 'atk' | 'hp' | 'def' | 'spd' | 'crit'; statLabel: string; baseVal: number }> = {
  Kim: { name: 'Kim Cương Linh Thạch', statKey: 'atk', statLabel: 'Công Kích', baseVal: 26 },
  Moc: { name: 'Thanh Mộc Sinh Ngọc', statKey: 'hp', statLabel: 'Sinh Lực', baseVal: 185 },
  Thuy: { name: 'Huyền Thủy Tốc Châu', statKey: 'spd', statLabel: 'Tốc Độ', baseVal: 10 },
  Hoa: { name: 'Xích Hỏa Bạo Tinh', statKey: 'crit', statLabel: 'Bạo Kích %', baseVal: 4 },
  Tho: { name: 'Hậu Thổ Giáp Thạch', statKey: 'def', statLabel: 'Phòng Thủ', baseVal: 22 },
};

export const DISCIPLE_SURNAMES = ['Lý', 'Trần', 'Diệp', 'Lâm', 'Tiêu', 'Tô', 'Mặc', 'Thẩm', 'Lục', 'Cố', 'Bạch', 'Hàn', 'Chu', 'Vân'];
export const DISCIPLE_GIVEN_NAMES = [
  'Thanh Phong', 'Hàn Nguyệt', 'Vô Kỵ', 'Tử Huyên', 'Trường Sinh', 'Linh Nhi',
  'Kiếm Tâm', 'Huyền Cơ', 'Băng Tâm', 'Xích Tiêu', 'Ngọc Thư', 'Minh Dạ', 'Thiên Vũ', 'Dao Quang',
];
export const DISCIPLE_TITLES = [
  'Kiếm Tu Ngoại Môn', 'Đan Sư Tập Sự', 'Nội Môn Tinh Anh', 'Chân Truyền Đệ Tử',
  'Linh Trận Sư', 'Thiên Kiêu Tán Tu', 'Kiếm Đạo Kỳ Tài', 'Tiên Căn Hậu Duệ',
];

export const EQUIP_PREFIXES: Record<Rarity, string[]> = {
  thuong: ['Thanh Đồng', 'Huyền Thiết', 'Sơn Cốc', 'Tán Tu'],
  hiem: ['Linh Vân', 'Bích Ngọc', 'Hàn Tinh', 'Thanh Liên'],
  su_thi: ['Tử Tiêu', 'Thái Ất', 'Huyền Minh', 'Xích Diễm'],
  huyen_thoai: ['Thái Cổ', 'Long Hoàng', 'Cửu Thiên', 'Bất Diệt'],
  truyen_thuyet: ['Hồng Mông', 'Hỗn Độn', 'Thiên Đạo', 'Vạn Cổ'],
};

export const EQUIP_SLOT_NOUNS: Record<EquipmentSlot, string[]> = {
  non: ['Tiên Quan', 'Đạo Mão', 'Tinh Khôi'],
  giap_vai: ['Kiên Giáp', 'Long Kiên', 'Vân Kiên'],
  giap_nguc: ['Hộ Tâm Giáp', 'Tiên Y', 'Chiến Bào'],
  giap_tay: ['Hộ Uyển', 'Linh Tý', 'Kim Cổn'],
  gang_tay: ['Thủ Sáo', 'Linh Chưởng', 'Phá Không Thủ'],
  dai_lung: ['Ngọc Đái', 'Yêu Đái', 'Linh Thúc'],
  quan: ['Tiên Khố', 'Hạ Y', 'Vân Thường'],
  giay: ['Tiên Lý', 'Đạp Vân Ngoa', 'Bộ Hư Hải'],
  vu_khi_chinh: ['Tiên Kiếm', 'Thần Đao', 'Phá Thiên Thương'],
  vu_khi_phu: ['Linh Ấn', 'Bát Quái Kính', 'Hồ Lô Pháp Bảo'],
  day_chuyen: ['Tụ Linh Liên', 'Hộ Hồn Hạng Liên', 'Phượng Hoàng Bội'],
  nhan: ['Nạp Giới', 'Thiên Long Giới', 'Đạo Tâm Chỉ Hoàn'],
};

// =========================================================================
// VIP SYSTEM (VIP 0 -> VIP 20 MAX), RECHARGE, VIP SHOP & DISCIPLE FASHIONS
// =========================================================================

export const VIP_LEVEL_THRESHOLDS: number[] = [
  0, // VIP 0
  100, // VIP 1
  300, // VIP 2
  600, // VIP 3
  1200, // VIP 4
  2200, // VIP 5: Auto nâng cấp đệ tử khi đủ Linh Khí & tự mặc trang bị tốt nhất
  3500, // VIP 6: Tự động hóa toàn bộ công việc Tông Môn
  5500, // VIP 7: Auto tự nâng ngọc (hợp nhất) & tự khảm ngọc vào trang bị
  8000, // VIP 8
  11500, // VIP 9
  15000, // VIP 10: Tự động hóa đánh Thế Giới (Bí Cảnh & Chọn Boss)
  20000, // VIP 11
  26000, // VIP 12
  33000, // VIP 13
  41000, // VIP 14
  50000, // VIP 15
  62000, // VIP 16
  76000, // VIP 17
  92000, // VIP 18: Bộ Trang Bị Truyền Thuyết + Thời Trang VIP 18
  112000, // VIP 19: Bộ Trang Bị Truyền Thuyết + Thời Trang VIP 19
  135000, // VIP 20 MAX: Bộ Trang Bị Truyền Thuyết + Thời Trang VIP 20
];

export interface RechargePackDef {
  id: string;
  name: string;
  priceVnd: string;
  tienNgoc: number;
  vipPoints: number;
  bonusLinhThach: number;
  highlight?: string;
}

export const RECHARGE_PACKS: RechargePackDef[] = [
  {
    id: 'pack_1',
    name: 'Thẻ Nhập Môn',
    priceVnd: '20.000đ',
    tienNgoc: 300,
    vipPoints: 300,
    bonusLinhThach: 1500,
  },
  {
    id: 'pack_2',
    name: 'Thẻ Trúc Cơ',
    priceVnd: '100.000đ',
    tienNgoc: 1600,
    vipPoints: 1600,
    bonusLinhThach: 8000,
  },
  {
    id: 'pack_3',
    name: 'Thẻ Kim Đan',
    priceVnd: '300.000đ',
    tienNgoc: 4200,
    vipPoints: 4200,
    bonusLinhThach: 25000,
    highlight: 'Đạt ngay VIP 6 · Auto Tông Môn',
  },
  {
    id: 'pack_4',
    name: 'Thẻ Nguyên Anh',
    priceVnd: '1.000.000đ',
    tienNgoc: 16000,
    vipPoints: 16000,
    bonusLinhThach: 90000,
    highlight: 'Đạt ngay VIP 10 · Auto Thế Giới',
  },
  {
    id: 'pack_5',
    name: 'Thẻ Hóa Thần Chí Tôn',
    priceVnd: '3.000.000đ',
    tienNgoc: 55000,
    vipPoints: 55000,
    bonusLinhThach: 300000,
  },
  {
    id: 'pack_6',
    name: 'Thẻ Hồng Mông Đế Hoàng',
    priceVnd: '6.000.000đ',
    tienNgoc: 140000,
    vipPoints: 140000,
    bonusLinhThach: 1000000,
    highlight: 'Mở thẳng VIP 20 MAX + 3 Bộ Truyền Thuyết',
  },
];

export interface StaminaPackDef {
  id: string;
  name: string;
  stamina: number;
  costTienNgoc: number;
  desc: string;
}

export const STAMINA_PACKS: StaminaPackDef[] = [
  {
    id: 'stam_small',
    name: 'Thanh Tâm Trà (+60 Thể Lực)',
    stamina: 60,
    costTienNgoc: 30,
    desc: 'Hồi nhanh thể lực khám phá Bí Cảnh.',
  },
  {
    id: 'stam_med',
    name: 'Tiên Lộ Quỳnh Tương (+180 Thể Lực)',
    stamina: 180,
    costTienNgoc: 80,
    desc: 'Tiết kiệm 12% Tiên Ngọc · Có thể vượt giới hạn thể lực.',
  },
  {
    id: 'stam_large',
    name: 'Bàn Đào Trường Sinh (+500 Thể Lực)',
    stamina: 500,
    costTienNgoc: 200,
    desc: 'Săn Boss & treo Auto Thế Giới liên tục không gián đoạn.',
  },
];

export interface VipShopItemDef {
  id: string;
  name: string;
  desc: string;
  minVip: number;
  costTienNgoc: number;
  rarity: Rarity;
  rewardType:
    | 'dot_pha_dan'
    | 'cuong_hoa_thach'
    | 'tinh_hoa_boss'
    | 'linh_khi'
    | 'gem_t4'
    | 'legend_set_box'
    | 'mythic_set_box'
    | 'tay_tuy_dan';
  quantity: number;
}

export const VIP_SHOP_ITEMS: VipShopItemDef[] = [
  {
    id: 'vs_pill',
    name: 'Rương Đột Phá Đan (x5)',
    desc: 'Tăng tỷ lệ độ kiếp cảnh giới cho đệ tử.',
    minVip: 0,
    costTienNgoc: 120,
    rarity: 'su_thi',
    rewardType: 'dot_pha_dan',
    quantity: 5,
  },
  {
    id: 'vs_enhance',
    name: 'Rương Cường Hóa Thạch (x50)',
    desc: 'Đập cường hóa trang bị nhanh lên +20.',
    minVip: 1,
    costTienNgoc: 150,
    rarity: 'hiem',
    rewardType: 'cuong_hoa_thach',
    quantity: 50,
  },
  {
    id: 'vs_qi',
    name: 'Tụ Nguyên Linh Đan (+20.000 Linh Khí)',
    desc: 'Nạp thẳng 20.000 Linh Khí vào Linh Khí Trì.',
    minVip: 2,
    costTienNgoc: 180,
    rarity: 'su_thi',
    rewardType: 'linh_khi',
    quantity: 20000,
  },
  {
    id: 'vs_essence',
    name: 'Hộp Tinh Hoa Boss (x6)',
    desc: 'Nguyên liệu quý nâng bậc Pháp Bảo lên Tiên Khí & Thần Khí.',
    minVip: 3,
    costTienNgoc: 220,
    rarity: 'huyen_thoai',
    rewardType: 'tinh_hoa_boss',
    quantity: 6,
  },
  {
    id: 'vs_gem4',
    name: 'Linh Ngọc Ngũ Hành Bậc 4',
    desc: 'Nhận ngay 1 viên Linh Ngọc Bậc 4 chỉ số cực cao.',
    minVip: 5,
    costTienNgoc: 280,
    rarity: 'huyen_thoai',
    rewardType: 'gem_t4',
    quantity: 1,
  },
  {
    id: 'vs_legend_box',
    name: 'Rương Trang Bị Bộ Huyền Thoại',
    desc: 'Mở ra 1 món Huyền Thoại thuộc Bộ Trang Bị ngẫu nhiên.',
    minVip: 6,
    costTienNgoc: 450,
    rarity: 'huyen_thoai',
    rewardType: 'legend_set_box',
    quantity: 1,
  },
  {
    id: 'vs_aptitude',
    name: 'Tẩy Tủy Tiên Đan Cực Phẩm',
    desc: '+10 Cốt Căn, +10 Ngộ Tính, +10 Khí Vận cho toàn bộ đệ tử xuất chiến.',
    minVip: 8,
    costTienNgoc: 620,
    rarity: 'truyen_thuyet',
    rewardType: 'tay_tuy_dan',
    quantity: 10,
  },
  {
    id: 'vs_mythic_box',
    name: 'Rương Thần Khí Truyền Thuyết',
    desc: 'Mở ra 1 món Truyền Thuyết · Bậc Thần Khí thuộc Bộ Trang Bị.',
    minVip: 12,
    costTienNgoc: 950,
    rarity: 'truyen_thuyet',
    rewardType: 'mythic_set_box',
    quantity: 1,
  },
];

export interface VipFashionDef {
  id: VipFashionId;
  vipReq: 18 | 19 | 20;
  name: string;
  titleBadge: string;
  description: string;
  ringColor: string;
  glowColor: string;
  bgGradient: string;
  bonuses: {
    atkPct: number;
    hpPct: number;
    defPct: number;
    spd: number;
    crit: number;
  };
}

export const VIP_FASHIONS: Record<VipFashionId, VipFashionDef> = {
  thanh_lien_tien_y: {
    id: 'thanh_lien_tien_y',
    vipReq: 18,
    name: 'Thanh Liên Tiên Y (VIP 18)',
    titleBadge: 'Tiên Tôn VIP 18',
    description: 'Tiên bào dệt từ sen ngọc cửu phẩm, tỏa hào quang thanh ngọc bảo hộ thân tâm.',
    ringColor: '#34D399',
    glowColor: 'rgba(52, 211, 153, 0.65)',
    bgGradient: 'linear-gradient(135deg, #065F46 0%, #10B981 55%, #A7F3D0 100%)',
    bonuses: { atkPct: 16, hpPct: 20, defPct: 14, spd: 15, crit: 6 },
  },
  thai_co_long_bao: {
    id: 'thai_co_long_bao',
    vipReq: 19,
    name: 'Thái Cổ Long Bào (VIP 19)',
    titleBadge: 'Long Hoàng VIP 19',
    description: 'Chiến bào thêu Xích Kim Chân Long, uy áp thiên hạ, gia tăng bạo kích hủy diệt.',
    ringColor: '#F97316',
    glowColor: 'rgba(249, 115, 22, 0.72)',
    bgGradient: 'linear-gradient(135deg, #7F1D1D 0%, #DC2626 55%, #FBBF24 100%)',
    bonuses: { atkPct: 26, hpPct: 24, defPct: 18, spd: 20, crit: 12 },
  },
  hong_mong_de_ton: {
    id: 'hong_mong_de_ton',
    vipReq: 20,
    name: 'Hồng Mông Đế Tôn Giáp (VIP 20 MAX)',
    titleBadge: 'Chí Tôn VIP 20',
    description: 'Cực phẩm thời trang tối thượng của Đế Tôn Hồng Mông, hào quang vạn cổ kim sắc.',
    ringColor: '#FDE047',
    glowColor: 'rgba(253, 224, 71, 0.82)',
    bgGradient: 'linear-gradient(135deg, #4C1D95 0%, #B45309 50%, #FDE047 100%)',
    bonuses: { atkPct: 38, hpPct: 38, defPct: 30, spd: 32, crit: 18 },
  },
};

export interface VipMilestoneDef {
  level: number;
  title: string;
  perkSummary: string;
  setId?: string;
  setSlots?: EquipmentSlot[];
  enhanceLevel?: number;
  gemTier?: number;
  fashionId?: VipFashionId;
  bonusResources?: {
    linhThach?: number;
    linhKhi?: number;
    dotPhaDan?: number;
    cuongHoaThach?: number;
    tinhHoaBoss?: number;
    stamina?: number;
  };
}

export const VIP_MILESTONE_REWARDS: VipMilestoneDef[] = [
  {
    level: 5,
    title: 'VIP 5 · Auto Nâng Cấp Đệ Tử & Mặc Trang Bị Tốt Nhất',
    perkSummary:
      'Mở khóa Auto Đệ Tử: tự động độ kiếp đột phá cảnh giới ngay khi đệ tử đủ Linh Khí (tự dùng Đột Phá Đan tối ưu) và tự động mặc những trang bị mạnh nhất cho toàn đội hình!',
    bonusResources: { linhThach: 3000, linhKhi: 4000, dotPhaDan: 4, stamina: 80 },
  },
  {
    level: 6,
    title: 'VIP 6 · Tự Động Hóa Toàn Bộ Công Việc',
    perkSummary:
      'Mở khóa Tự Động Hóa Tông Môn: tự thu hoạch 7 công trình, tự truyền Linh Khí cho đệ tử, tự luyện Đột Phá Đan, tự nhận nhiệm vụ & cống phẩm Linh Mạch!',
    bonusResources: { linhThach: 5000, dotPhaDan: 5, cuongHoaThach: 40, stamina: 120 },
  },
  {
    level: 7,
    title: 'VIP 7 · Auto Nâng Ngọc & Khảm Ngọc Trang Bị',
    perkSummary:
      'Mở khóa Auto Linh Ngọc: tự động hợp nhất 3 viên ngọc cùng hệ & cùng bậc thành Linh Ngọc bậc cao hơn (tới Bậc 5), đồng thời tự khảm & thay ngọc mạnh nhất vào trang bị đang mặc! Tặng kèm 6 viên Linh Ngọc khởi đầu.',
    bonusResources: { linhThach: 8000, cuongHoaThach: 60, stamina: 150 },
  },
  {
    level: 10,
    title: 'VIP 10 · Tự Động Hóa Đánh Thế Giới (Chọn Boss)',
    perkSummary:
      'Mở khóa Auto Đánh Thế Giới: tùy chọn chỉ định Boss Huyền Thoại muốn săn hoặc tự động quét Bí Cảnh & Boss mạnh nhất liên tục, giảm 50% Thể Lực tiêu hao!',
    bonusResources: { linhThach: 15000, linhKhi: 12000, tinhHoaBoss: 5, stamina: 240 },
  },
  {
    level: 18,
    title: 'VIP 18 · Bộ Trang Bị Truyền Thuyết + Thời Trang VIP 18',
    perkSummary:
      'Tặng ngay trọn Bộ Cửu Thiên Kiếm Đế [Truyền Thuyết · Thần Khí +10] (4 món: VK Chính, Giáp Ngực, Nón, Nhẫn) + Thời Trang Đệ Tử [Thanh Liên Tiên Y]!',
    setId: 'cuu_thien_kiem_de',
    setSlots: ['vu_khi_chinh', 'giap_nguc', 'non', 'nhan'],
    enhanceLevel: 10,
    gemTier: 3,
    fashionId: 'thanh_lien_tien_y',
    bonusResources: { linhThach: 40000, tinhHoaBoss: 10, stamina: 300 },
  },
  {
    level: 19,
    title: 'VIP 19 · Bộ Trang Bị Truyền Thuyết + Thời Trang VIP 19',
    perkSummary:
      'Tặng ngay trọn Bộ Thái Cổ Long Hoàng [Truyền Thuyết · Thần Khí +12] (4 món: VK Phụ, Giáp Vai, Găng Tay, Đai Lưng) + Thời Trang Đệ Tử [Thái Cổ Long Bào]!',
    setId: 'thai_co_long_hoang',
    setSlots: ['vu_khi_phu', 'giap_vai', 'gang_tay', 'dai_lung'],
    enhanceLevel: 12,
    gemTier: 4,
    fashionId: 'thai_co_long_bao',
    bonusResources: { linhThach: 70000, tinhHoaBoss: 15, stamina: 400 },
  },
  {
    level: 20,
    title: 'VIP 20 MAX · Bộ Trang Bị Truyền Thuyết + Thời Trang Đế Tôn',
    perkSummary:
      'Tặng ngay trọn Bộ Bất Diệt Huyền Vũ [Truyền Thuyết · Thần Khí +15] (4 món: Giáp Tay, Quần, Giày, Dây Chuyền — ghép đủ 12/12 ô Truyền Thuyết!) + Thời Trang [Hồng Mông Đế Tôn Giáp]!',
    setId: 'bat_diet_huyen_vu',
    setSlots: ['giap_tay', 'quan', 'giay', 'day_chuyen'],
    enhanceLevel: 15,
    gemTier: 5,
    fashionId: 'hong_mong_de_ton',
    bonusResources: { linhThach: 120000, tinhHoaBoss: 25, stamina: 600 },
  },
];


