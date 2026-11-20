export type ElementType = 'Kim' | 'Moc' | 'Thuy' | 'Hoa' | 'Tho';

export type Rarity = 'thuong' | 'hiem' | 'su_thi' | 'huyen_thoai' | 'truyen_thuyet';

export type EquipmentTier = 'pham_khi' | 'linh_khi' | 'bao_khi' | 'tien_khi' | 'than_khi';

export type EquipmentSlot =
  | 'non'
  | 'giap_vai'
  | 'giap_nguc'
  | 'giap_tay'
  | 'gang_tay'
  | 'dai_lung'
  | 'quan'
  | 'giay'
  | 'vu_khi_chinh'
  | 'vu_khi_phu'
  | 'day_chuyen'
  | 'nhan';

export type SpiritRootGrade =
  | 'ngu_hanh_tap'
  | 'tu_linh_can'
  | 'tam_linh_can'
  | 'song_linh_can'
  | 'thien_linh_can'
  | 'bien_di_loi'
  | 'bien_di_bang'
  | 'bien_di_phong';

export interface GemItem {
  id: string;
  element: ElementType;
  tier: number; // 1 to 5
  name: string;
  statKey: 'atk' | 'hp' | 'def' | 'spd' | 'crit';
  statValue: number;
}

export interface SubStat {
  key: 'atk' | 'hp' | 'def' | 'spd' | 'crit' | 'critDmg' | 'elemBonus';
  label: string;
  value: number;
  isPercent?: boolean;
}

export interface EquipmentItem {
  id: string;
  name: string;
  slot: EquipmentSlot;
  rarity: Rarity;
  tier: EquipmentTier;
  levelReq: number;
  enhanceLevel: number; // 0..20
  primaryStatKey: 'atk' | 'hp' | 'def' | 'spd';
  primaryStatBase: number;
  subStats: SubStat[];
  sockets: (GemItem | null)[];
  setId?: string;
  elementAffinity?: ElementType;
  equippedBy?: string | null; // disciple id
}

export interface SkillDef {
  id: string;
  name: string;
  element: ElementType;
  mpCost: number;
  multiplier: number; // % of ATK
  target: 'single' | 'all' | 'ally_heal' | 'ally_shield';
  description: string;
  comboBonusDesc: string;
  vfxType: 'sword' | 'vine' | 'wave' | 'flame' | 'mountain';
}

export interface Disciple {
  id: string;
  name: string;
  title: string;
  isSectMaster?: boolean;
  avatarColor: string;
  avatarGlyph: string;
  element: ElementType;
  secondaryElement?: ElementType;
  spiritRoot: SpiritRootGrade;
  aptitude: {
    cotCan: number; // 1-100: HP/DEF & breakthrough stability
    ngoTinh: number; // 1-100: Cultivation speed & skill scaling
    khiVan: number; // 1-100: Crit, drop luck & breakthrough bonus
  };
  realmIndex: number; // 0..26 (9 realms x 3 sub-stages)
  qi: number;
  maxQi: number;
  assignedBuildingId?: BuildingId | null;
  inFormation: boolean;
  formationOrder: number; // 0..4
  equipped: Partial<Record<EquipmentSlot, string>>; // slot -> EquipmentItem.id
  fashionId?: VipFashionId | null;
}

export type VipFashionId = 'thanh_lien_tien_y' | 'thai_co_long_bao' | 'hong_mong_de_ton';

export interface VipState {
  points: number;
  claimedMilestones: number[];
  firstRechargeClaimedIds: string[];
  unlockedFashions: VipFashionId[];
  autoDiscipleEnabled: boolean; // VIP 5+: Auto đột phá đệ tử & mặc trang bị tốt nhất
  autoSectEnabled: boolean; // VIP 6+: Auto công việc Tông Môn
  autoGemEnabled: boolean; // VIP 7+: Auto hợp nhất nâng ngọc & khảm ngọc
  autoWorldEnabled: boolean; // VIP 10+: Auto đánh Thế Giới
  autoWorldBossId: string; // 'auto' | 'realm_only' | BossDef.id
  autoWorldLogs: string[];
  autoActivityLogs: string[];
}

export type BuildingId =
  | 'chinh_dien'
  | 'tu_linh_tran'
  | 'duoc_dien'
  | 'luyen_dan_phong'
  | 'luyen_khi_cac'
  | 'tang_kinh_cac'
  | 'truyen_tong_tran';

export interface BuildingState {
  id: BuildingId;
  level: number;
  storedResource: number;
}

export interface Resources {
  linhThach: number; // Spirit Stones
  tienNgoc: number; // Immortal Jade
  linhThao: number; // Spirit Herbs
  huyenThiet: number; // Spirit Iron
  linhKhi: number; // Sect Qi pool
  cuongHoaThach: number; // Enhancement Stones
  dotPhaDan: number; // Breakthrough Pills
  tinhHoaBoss: number; // Boss Essence for Tier Ascension
  stamina: number;
  maxStamina: number;
}

export interface SecretRealmDef {
  id: string;
  name: string;
  subtitle: string;
  realmTier?: number; // 0 = Luyện Khí .. 8 = Độ Kiếp
  stageLabel?: string; // Sơ kỳ | Trung kỳ | Hậu kỳ | Viên mãn
  arenaKey?: string;
  recommendedPower: number;
  staminaCost: number;
  element: ElementType;
  enemies: EnemyTemplate[];
  rewards: {
    linhThach: number;
    linhThao: number;
    huyenThiet: number;
    cuongHoaThach: number;
    dotPhaDan: number;
    linhKhi: number;
    dropRarityPool: Rarity[];
  };
}

export interface BossDef {
  id: string;
  name: string;
  title: string;
  realmTier?: number; // 0 = Luyện Khí .. 8 = Độ Kiếp
  stageLabel?: string; // Sơ kỳ | Trung kỳ | Hậu kỳ | Viên mãn
  arenaKey?: string;
  element: ElementType;
  recommendedPower: number;
  staminaCost: number;
  hp: number;
  atk: number;
  def: number;
  spd: number;
  setId: string;
  guaranteedMinRarity: Rarity;
  description: string;
  skills: SkillDef[];
}

export interface EnemyTemplate {
  id: string;
  name: string;
  element: ElementType;
  hp: number;
  atk: number;
  def: number;
  spd: number;
  isBoss?: boolean;
  glyph: string;
}

export interface SpiritVein {
  id: string;
  name: string;
  grade: 'Huyền Cấp' | 'Địa Cấp' | 'Thiên Cấp';
  element: ElementType;
  ownerAlliance: string;
  isOwnedByPlayer: boolean;
  linhThachPerHour: number;
  tienNgocPerHour: number;
  guardianPower: number;
  guardians: EnemyTemplate[];
}

export interface MarketListing {
  id: string;
  sellerName: string;
  isPlayerListing?: boolean;
  itemType: 'equipment' | 'gem' | 'pill' | 'stone';
  name: string;
  rarity: Rarity;
  priceLinhThach: number;
  quantity: number;
  equipmentData?: EquipmentItem;
  gemData?: GemItem;
  listedAt: number;
}

export interface AllianceState {
  name: string;
  level: number;
  contribution: number;
  notice: string;
  tech: {
    atkLevel: number;
    qiLevel: number;
    dropLevel: number;
  };
  members: {
    id: string;
    name: string;
    role: 'Minh Chủ' | 'Phó Minh Chủ' | 'Trưởng Lão' | 'Thành Viên';
    realmLabel: string;
    power: number;
    online: boolean;
  }[];
}

export interface ChatMessage {
  id: string;
  channel: 'the_gioi' | 'bang_hoi' | 'he_thong';
  sender: string;
  text: string;
  timestamp: number;
}

export interface QuestItem {
  id: string;
  category: 'Chính' | 'Phụ' | 'Hằng Ngày';
  title: string;
  progress: number;
  target: number;
  claimed: boolean;
  rewardText: string;
  reward: Partial<Resources>;
  jumpTo?: ActiveModal;
}

export type ActiveModal =
  | null
  | 'buildings'
  | 'disciples'
  | 'equipment'
  | 'world'
  | 'alliance'
  | 'offline'
  | 'gifts'
  | 'vip'
  | 'account'
  | 'vfx_demo'
  | 'asset_studio';

export interface CombatContext {
  mode: 'realm' | 'boss' | 'vein';
  title: string;
  subtitle: string;
  targetId: string;
  enemies: EnemyTemplate[];
  staminaCost: number;
  bossDef?: BossDef;
  realmDef?: SecretRealmDef;
  veinDef?: SpiritVein;
}

export interface GameState {
  sectName: string;
  sectYear: number;
  sectLevel: number;
  resources: Resources;
  buildings: Record<BuildingId, BuildingState>;
  disciples: Disciple[];
  recruitPool: Disciple[];
  inventory: EquipmentItem[];
  gems: GemItem[];
  clearedRealms: string[];
  defeatedBosses: Record<string, number>;
  spiritVeins: SpiritVein[];
  alliance: AllianceState;
  marketListings: MarketListing[];
  quests: QuestItem[];
  chatMessages: ChatMessage[];
  lastActiveAt: number;
  pendingOfflineSeconds: number;
  dailyGiftClaimed: boolean;
  soundEnabled: boolean;
  vip: VipState;
}
