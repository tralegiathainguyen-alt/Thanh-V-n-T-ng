import {
  BUILDING_DEFS,
  DISCIPLE_GIVEN_NAMES,
  DISCIPLE_SURNAMES,
  DISCIPLE_TITLES,
  ELEMENT_META,
  ELEMENTS,
  EQUIP_PREFIXES,
  EQUIP_SLOT_NOUNS,
  EQUIPMENT_SETS,
  EQUIPMENT_SLOTS,
  EQUIPMENT_TIERS,
  GEM_NAMES,
  GLOBAL_RIVAL_SECTS,
  INITIAL_SPIRIT_VEINS,
  RARITY_META,
  REALM_LADDER,
  SPIRIT_ROOT_META,
  VIP_FASHIONS,
  VIP_LEVEL_THRESHOLDS,
} from '../data/constants';
import {
  SPIRIT_ROOT_COMBAT_BONUS,
  getArtifactStats,
  getDiscipleGrowth,
  getQualityTalents,
  getTamPhapBonus,
  getThanThongBonus,
} from '../data/discipleGrowth';
import {
  AllianceState,
  BuildingId,
  Disciple,
  ElementType,
  EquipmentItem,
  EquipmentSlot,
  EquipmentTier,
  GameState,
  GemItem,
  MarketListing,
  Rarity,
  SpiritRootGrade,
  SubStat,
  VipState,
} from '../types/game';

let uidSeq = 1000;
export function genId(prefix: string): string {
  uidSeq += 1;
  return `${prefix}_${Date.now().toString(36)}_${uidSeq}_${Math.floor(Math.random() * 999)}`;
}

export function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function formatNum(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 10_000) return `${(n / 1_000).toFixed(1)}K`;
  return Math.floor(n).toLocaleString('vi-VN');
}

export function createGem(element?: ElementType, tier = 1): GemItem {
  const el = element || pick(ELEMENTS);
  const meta = GEM_NAMES[el];
  const tierMult = Math.pow(1.75, tier - 1);
  return {
    id: genId('gem'),
    element: el,
    tier,
    name: `${meta.name} Bậc ${tier}`,
    statKey: meta.statKey,
    statValue: Math.round(meta.baseVal * tierMult),
  };
}

export function getEquipmentPrimaryValue(item: EquipmentItem): number {
  const rarityMult = RARITY_META[item.rarity].statMult;
  const tierDef = EQUIPMENT_TIERS.find((t) => t.id === item.tier) || EQUIPMENT_TIERS[0];
  const enhanceMult = 1 + item.enhanceLevel * 0.11;
  return Math.round(item.primaryStatBase * rarityMult * tierDef.mult * enhanceMult);
}

export function getEquipmentPower(item: EquipmentItem): number {
  const pVal = getEquipmentPrimaryValue(item);
  const pWeight = item.primaryStatKey === 'hp' ? 0.32 : item.primaryStatKey === 'spd' ? 5.5 : 2.6;
  let score = pVal * pWeight;
  for (const s of item.subStats) {
    score += s.isPercent ? s.value * 16 : s.value * 2.2;
  }
  for (const gem of item.sockets) {
    if (gem) {
      score += gem.statKey === 'hp' ? gem.statValue * 0.35 : gem.statKey === 'crit' ? gem.statValue * 22 : gem.statValue * 3;
    }
  }
  if (item.setId) score *= 1.15;
  return Math.round(score);
}

export function generateEquipment(options?: {
  slot?: EquipmentSlot;
  rarity?: Rarity;
  tier?: EquipmentTier;
  setId?: string;
  levelReq?: number;
}): EquipmentItem {
  const slotMeta = options?.slot
    ? EQUIPMENT_SLOTS.find((s) => s.slot === options.slot) || pick(EQUIPMENT_SLOTS)
    : pick(EQUIPMENT_SLOTS);

  const rarity: Rarity = options?.rarity || rollRarity();
  const rMeta = RARITY_META[rarity];

  let tier: EquipmentTier = options?.tier || 'pham_khi';
  if (!options?.tier) {
    if (rarity === 'truyen_thuyet') tier = 'tien_khi';
    else if (rarity === 'huyen_thoai') tier = 'bao_khi';
    else if (rarity === 'su_thi') tier = 'linh_khi';
    else tier = 'pham_khi';
  }

  const subPool: { key: SubStat['key']; label: string; min: number; max: number; isPercent?: boolean }[] = [
    { key: 'atk', label: 'Công Kích', min: 12, max: 32 },
    { key: 'hp', label: 'Sinh Lực', min: 85, max: 210 },
    { key: 'def', label: 'Phòng Thủ', min: 10, max: 26 },
    { key: 'spd', label: 'Tốc Độ', min: 3, max: 11 },
    { key: 'crit', label: 'Tỷ Lệ Bạo Kích', min: 2, max: 7, isPercent: true },
    { key: 'critDmg', label: 'Sát Thương Bạo', min: 5, max: 16, isPercent: true },
    { key: 'elemBonus', label: 'Tăng Công Ngũ Hành', min: 3, max: 11, isPercent: true },
  ];

  const chosenSubKeys = new Set<string>();
  const subStats: SubStat[] = [];
  for (let i = 0; i < rMeta.subStatCount; i++) {
    const candidates = subPool.filter((s) => !chosenSubKeys.has(s.key));
    const picked = pick(candidates);
    chosenSubKeys.add(picked.key);
    const val = Math.round(randInt(picked.min, picked.max) * (0.85 + rMeta.statMult * 0.35));
    subStats.push({
      key: picked.key,
      label: picked.label,
      value: val,
      isPercent: picked.isPercent,
    });
  }

  const setDef = options?.setId ? EQUIPMENT_SETS[options.setId] : undefined;
  const prefix = setDef ? setDef.name.replace('Bộ ', '') : pick(EQUIP_PREFIXES[rarity]);
  const noun = pick(EQUIP_SLOT_NOUNS[slotMeta.slot]);

  return {
    id: genId('eq'),
    name: `${prefix} ${noun}`,
    slot: slotMeta.slot,
    rarity,
    tier,
    levelReq: options?.levelReq ?? (rarity === 'truyen_thuyet' ? 12 : rarity === 'huyen_thoai' ? 8 : 1),
    enhanceLevel: 0,
    primaryStatKey: slotMeta.primaryStat,
    primaryStatBase: Math.round(slotMeta.baseValue * (0.92 + Math.random() * 0.18)),
    subStats,
    sockets: Array.from({ length: rMeta.socketCount }, () => null),
    setId: options?.setId,
    elementAffinity: setDef?.element || pick(ELEMENTS),
    equippedBy: null,
  };
}

export function rollRarity(pool?: Rarity[]): Rarity {
  if (pool && pool.length > 0) {
    // Weighted towards lower end of pool
    const weights = pool.map((_, i) => Math.max(1, Math.pow(2.4, pool.length - 1 - i)));
    const total = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (let i = 0; i < pool.length; i++) {
      r -= weights[i];
      if (r <= 0) return pool[i];
    }
    return pool[0];
  }
  const r = Math.random();
  if (r < 0.04) return 'truyen_thuyet';
  if (r < 0.15) return 'huyen_thoai';
  if (r < 0.36) return 'su_thi';
  if (r < 0.68) return 'hiem';
  return 'thuong';
}

export function rollSpiritRoot(premium = false): SpiritRootGrade {
  const r = Math.random();
  if (premium) {
    if (r < 0.08) return 'bien_di_loi';
    if (r < 0.15) return 'bien_di_bang';
    if (r < 0.22) return 'bien_di_phong';
    if (r < 0.48) return 'thien_linh_can';
    if (r < 0.80) return 'song_linh_can';
    return 'tam_linh_can';
  }
  if (r < 0.025) return 'bien_di_loi';
  if (r < 0.045) return 'bien_di_bang';
  if (r < 0.065) return 'bien_di_phong';
  if (r < 0.18) return 'thien_linh_can';
  if (r < 0.42) return 'song_linh_can';
  if (r < 0.68) return 'tam_linh_can';
  if (r < 0.88) return 'tu_linh_can';
  return 'ngu_hanh_tap';
}

export function generateDisciple(options?: {
  premium?: boolean;
  isSectMaster?: boolean;
  element?: ElementType;
  spiritRoot?: SpiritRootGrade;
  realmIndex?: number;
  name?: string;
}): Disciple {
  const root = options?.spiritRoot || rollSpiritRoot(options?.premium);
  let element: ElementType = options?.element || pick(ELEMENTS);
  let secondaryElement: ElementType | undefined;

  if (root === 'bien_di_loi') {
    element = 'Kim';
    secondaryElement = 'Hoa';
  } else if (root === 'bien_di_bang') {
    element = 'Thuy';
    secondaryElement = 'Kim';
  } else if (root === 'bien_di_phong') {
    element = 'Moc';
    secondaryElement = 'Thuy';
  } else if (root === 'song_linh_can') {
    secondaryElement = ELEMENT_META[element].generates;
  }

  const minApt = root.startsWith('bien_di') || root === 'thien_linh_can' ? 72 : root === 'song_linh_can' ? 58 : 38;
  const maxApt = root.startsWith('bien_di') ? 99 : root === 'thien_linh_can' ? 96 : 86;

  const realmIndex = options?.realmIndex ?? (options?.premium ? randInt(1, 3) : randInt(0, 1));
  const stage = REALM_LADDER[realmIndex];

  const name = options?.name || `${pick(DISCIPLE_SURNAMES)} ${pick(DISCIPLE_GIVEN_NAMES)}`;
  const elMeta = ELEMENT_META[element];

  return {
    id: genId('disc'),
    name,
    title: options?.isSectMaster ? 'Chưởng Môn Thanh Vân' : pick(DISCIPLE_TITLES),
    isSectMaster: options?.isSectMaster,
    avatarColor: elMeta.color,
    avatarGlyph: name.split(' ')[0]?.[0] || elMeta.hanzi,
    element,
    secondaryElement,
    spiritRoot: root,
    aptitude: {
      cotCan: randInt(minApt, maxApt),
      ngoTinh: randInt(minApt, maxApt),
      khiVan: randInt(minApt, maxApt),
    },
    realmIndex,
    qi: Math.round(stage.qiRequired * 0.45),
    maxQi: stage.qiRequired,
    assignedBuildingId: null,
    inFormation: Boolean(options?.isSectMaster),
    formationOrder: options?.isSectMaster ? 0 : 99,
    equipped: {},
  };
}

export interface DiscipleCombatMods {
  comboCritBonus: number;
  armorPenBonus: number;
  ultMpDiscount: number;
  comboDmgBonus: number;
  mpRegenPerTurn: number;
  counterChance: number;
  skillDmgPct: number;
  splashTargetPct: number;
  multiStrikeChance: number;
  lifestealPct: number;
  startShieldPct: number;
  bossDmgPct: number;
  startMp: number;
  deathImmunity: boolean;
}

export interface ComputedDiscipleStats {
  hp: number;
  atk: number;
  def: number;
  spd: number;
  crit: number;
  critDmg: number;
  elemBonus: number;
  power: number;
  activeSets: { setId: string; name: string; count: number }[];
  combatMods: DiscipleCombatMods;
}

export function computeDiscipleStats(
  disciple: Disciple,
  inventory: EquipmentItem[],
  alliance?: AllianceState,
  tangKinhLevel = 1,
  forgeLevel = 1,
): ComputedDiscipleStats {
  const stage = REALM_LADDER[disciple.realmIndex] || REALM_LADDER[0];
  const rootMeta = SPIRIT_ROOT_META[disciple.spiritRoot] || SPIRIT_ROOT_META.tu_linh_can;
  const rootCombat = SPIRIT_ROOT_COMBAT_BONUS[disciple.spiritRoot] || SPIRIT_ROOT_COMBAT_BONUS.tu_linh_can;
  const growth = getDiscipleGrowth(disciple);
  const tamPhap = getTamPhapBonus(growth.cultivationArts.tamPhapLevel);
  const thanThong = getThanThongBonus(growth.cultivationArts.thanThongLevel);
  const artStats = getArtifactStats(growth.natalArtifact, forgeLevel);
  const qualityTalents = getQualityTalents(growth.qualityRank);

  let hp = Math.round(
    (460 + disciple.aptitude.cotCan * 6.5) * stage.statMult * qualityTalents.statMult,
  );
  let atk = Math.round(
    (78 + disciple.aptitude.ngoTinh * 1.35) * stage.statMult * qualityTalents.statMult,
  );
  let def = Math.round(
    (34 + disciple.aptitude.cotCan * 0.72) * stage.statMult * qualityTalents.statMult,
  );
  let spd = Math.round(
    42 + disciple.aptitude.khiVan * 0.25 + disciple.realmIndex * 2.8 + tamPhap.spdBonus,
  );
  let crit = 10 + Math.round(disciple.aptitude.khiVan * 0.14);
  let critDmg = 150;
  let elemBonus = rootMeta.elemDmgBonus + (tangKinhLevel - 1) * 4;

  // Permanent Tẩy Tủy Alchemy stats + Bản Mệnh Pháp Bảo stats
  hp += (growth.alchemy.tayTuyCounts.hp || 0) + artStats.hp;
  atk += (growth.alchemy.tayTuyCounts.atk || 0) + artStats.atk;
  def += (growth.alchemy.tayTuyCounts.def || 0) + artStats.def;

  const setCounts: Record<string, number> = {};

  Object.values(disciple.equipped).forEach((itemId) => {
    if (!itemId) return;
    const item = inventory.find((eq) => eq.id === itemId);
    if (!item) return;

    const pVal = getEquipmentPrimaryValue(item);
    if (item.primaryStatKey === 'hp') hp += pVal;
    if (item.primaryStatKey === 'atk') atk += pVal;
    if (item.primaryStatKey === 'def') def += pVal;
    if (item.primaryStatKey === 'spd') spd += pVal;

    for (const sub of item.subStats) {
      if (sub.key === 'hp') hp += sub.value;
      else if (sub.key === 'atk') atk += sub.value;
      else if (sub.key === 'def') def += sub.value;
      else if (sub.key === 'spd') spd += sub.value;
      else if (sub.key === 'crit') crit += sub.value;
      else if (sub.key === 'critDmg') critDmg += sub.value;
      else if (sub.key === 'elemBonus') elemBonus += sub.value;
    }

    for (const gem of item.sockets) {
      if (!gem) continue;
      if (gem.statKey === 'hp') hp += gem.statValue;
      else if (gem.statKey === 'atk') atk += gem.statValue;
      else if (gem.statKey === 'def') def += gem.statValue;
      else if (gem.statKey === 'spd') spd += gem.statValue;
      else if (gem.statKey === 'crit') crit += gem.statValue;
    }

    if (item.setId) {
      setCounts[item.setId] = (setCounts[item.setId] || 0) + 1;
    }
  });

  // Apply Equipment Set Bonuses & Cultivation Art % Bonuses
  let atkPct =
    (alliance ? alliance.tech.atkLevel * 4 : 0) +
    (growth.natalArtifact.type === 'luyen_dan_dinh' ? growth.natalArtifact.refineLevel * 4 : 0);
  let hpPct = 0;
  let defPct = tamPhap.defPctBonus;

  const activeSets: { setId: string; name: string; count: number }[] = [];
  Object.entries(setCounts).forEach(([setId, count]) => {
    const defSet = EQUIPMENT_SETS[setId];
    if (!defSet) return;
    activeSets.push({ setId, name: defSet.name, count });
    if (count >= 2) {
      atkPct += defSet.twoPieceBonus.atkPct || 0;
      hpPct += defSet.twoPieceBonus.hpPct || 0;
      defPct += defSet.twoPieceBonus.defPct || 0;
      spd += defSet.twoPieceBonus.spd || 0;
      crit += defSet.twoPieceBonus.crit || 0;
    }
    if (count >= 4) {
      atkPct += defSet.fourPieceBonus.atkPct || 0;
      hpPct += defSet.fourPieceBonus.hpPct || 0;
      defPct += defSet.fourPieceBonus.defPct || 0;
      spd += defSet.fourPieceBonus.spd || 0;
      crit += defSet.fourPieceBonus.crit || 0;
    }
  });

  // Apply Equipped VIP Disciple Fashion Bonuses
  if (disciple.fashionId && VIP_FASHIONS[disciple.fashionId]) {
    const f = VIP_FASHIONS[disciple.fashionId].bonuses;
    atkPct += f.atkPct;
    hpPct += f.hpPct;
    defPct += f.defPct;
    spd += f.spd;
    crit += f.crit;
  }

  atk = Math.round(atk * (1 + atkPct / 100));
  hp = Math.round(hp * (1 + hpPct / 100));
  def = Math.round(def * (1 + defPct / 100));

  const combatMods: DiscipleCombatMods = {
    comboCritBonus: rootCombat.comboCritBonus,
    armorPenBonus: rootCombat.armorPenBonus + thanThong.armorBreakPct + artStats.armorPenPct,
    ultMpDiscount: rootCombat.ultMpDiscount,
    comboDmgBonus: rootCombat.comboDmgBonus + qualityTalents.comboDmgBonus,
    mpRegenPerTurn: tamPhap.mpRegenPerTurn,
    counterChance: tamPhap.counterChance + artStats.counterPct,
    skillDmgPct: thanThong.skillDmgPct,
    splashTargetPct: thanThong.splashTargetPct,
    multiStrikeChance: thanThong.multiStrikeChance,
    lifestealPct: artStats.lifestealPct,
    startShieldPct: artStats.startShieldPct,
    bossDmgPct: artStats.bossDmgPct,
    startMp: Math.min(100, Math.max(25, qualityTalents.startMpMin) + artStats.startMpBonus),
    deathImmunity: qualityTalents.deathImmunity,
  };

  const growthPowerBonus =
    thanThong.skillDmgPct * 18 +
    combatMods.comboDmgBonus * 14 +
    combatMods.counterChance * 12 +
    combatMods.bossDmgPct * 14 +
    (combatMods.deathImmunity ? 1800 : 0);

  const power = Math.round(
    hp * 0.45 + atk * 4.2 + def * 3.1 + spd * 6.5 + crit * 24 + elemBonus * 18 + growthPowerBonus,
  );

  return {
    hp,
    atk,
    def,
    spd,
    crit: Math.min(90, crit),
    critDmg,
    elemBonus,
    power,
    activeSets,
    combatMods,
  };
}

export function getVipLevel(points: number): number {
  let lvl = 0;
  for (let i = 0; i < VIP_LEVEL_THRESHOLDS.length; i++) {
    if (points >= VIP_LEVEL_THRESHOLDS[i]) {
      lvl = i;
    }
  }
  return lvl;
}

export function createDefaultVipState(): VipState {
  return {
    points: 0,
    claimedMilestones: [],
    firstRechargeClaimedIds: [],
    unlockedFashions: [],
    autoDiscipleEnabled: false,
    autoSectEnabled: false,
    autoGemEnabled: false,
    autoWorldEnabled: false,
    autoWorldBossId: 'auto',
    autoWorldLogs: [],
    autoActivityLogs: [],
  };
}

export function generateMythicSetBundle(
  setId: string,
  slots: EquipmentSlot[],
  enhanceLevel: number,
  gemTier: number,
): EquipmentItem[] {
  const setDef = EQUIPMENT_SETS[setId];
  const el = setDef?.element || 'Kim';
  return slots.map((slot) => {
    const item = generateEquipment({
      slot,
      rarity: 'truyen_thuyet',
      tier: 'than_khi',
      setId,
      levelReq: 1,
    });
    item.enhanceLevel = enhanceLevel;
    // Pre-socket 1 high-tier elemental gem to showcase pinnacle power
    item.sockets[0] = createGem(el, gemTier);
    return item;
  });
}

export function computeTotalSectPower(state: GameState): number {
  const tangKinhLvl = state.buildings.tang_kinh_cac.level;
  const forgeLvl = state.buildings.luyen_khi_cac.level;
  return state.disciples.reduce((sum, d) => {
    const stats = computeDiscipleStats(d, state.inventory, state.alliance, tangKinhLvl, forgeLvl);
    return sum + (d.inFormation ? stats.power : Math.round(stats.power * 0.45));
  }, 0);
}

export function calculateBreakthroughChance(disciple: Disciple, pillsUsed: number): number {
  const stage = REALM_LADDER[disciple.realmIndex] || REALM_LADDER[0];
  const rootMeta = SPIRIT_ROOT_META[disciple.spiritRoot];
  const aptBonus = Math.round((disciple.aptitude.cotCan + disciple.aptitude.ngoTinh + disciple.aptitude.khiVan) / 14);
  const pillBonus = pillsUsed * 15;
  return Math.max(10, Math.min(100, stage.baseBreakRate + rootMeta.breakthroughBonus + aptBonus + pillBonus));
}

export function getElementRelation(attacker: ElementType, defender: ElementType): 'counter' | 'resisted' | 'neutral' {
  if (ELEMENT_META[attacker].counters === defender) return 'counter';
  if (ELEMENT_META[defender].counters === attacker) return 'resisted';
  return 'neutral';
}

export function doesGenerateElement(prevElement: ElementType | null, nextElement: ElementType): boolean {
  if (!prevElement) return false;
  return ELEMENT_META[prevElement].generates === nextElement;
}

export function getBuildingProductionPerMin(state: GameState, buildingId: BuildingId): number {
  const def = BUILDING_DEFS[buildingId];
  const bState = state.buildings[buildingId];
  if (!def.baseProductionPerMin) return 0;

  let base = def.baseProductionPerMin * (1 + (bState.level - 1) * 0.45);

  // Assigned disciples bonus
  const assigned = state.disciples.filter((d) => d.assignedBuildingId === buildingId);
  for (const d of assigned) {
    const elMatch = d.element === def.preferredElement || d.secondaryElement === def.preferredElement ? 1.4 : 1.0;
    const aptFactor = (d.aptitude.ngoTinh + d.aptitude.cotCan) / 200;
    base *= 1 + 0.25 * elMatch * (0.6 + aptFactor);
  }

  if (buildingId === 'tu_linh_tran') {
    base *= 1 + state.alliance.tech.qiLevel * 0.08;
  }

  return Number(base.toFixed(1));
}

export function getBuildingUpgradeCost(buildingId: BuildingId, currentLevel: number) {
  const def = BUILDING_DEFS[buildingId];
  const mult = Math.pow(1.52, currentLevel - 1);
  return {
    linhThach: Math.round(def.baseCostStone * mult),
    linhThao: Math.round(def.baseCostHerb * mult),
    huyenThiet: Math.round(def.baseCostIron * mult),
  };
}

export function calculateOfflineRewards(state: GameState, elapsedSeconds: number) {
  // Cap offline accumulation at 12 hours
  const effectiveSeconds = Math.min(elapsedSeconds, 12 * 3600);
  const mins = effectiveSeconds / 60;
  const stageBonus = 1 + state.clearedRealms.length * 0.25;

  const ownedVeins = state.spiritVeins.filter((v) => v.isOwnedByPlayer);
  const veinStonePerMin = ownedVeins.reduce((s, v) => s + v.linhThachPerHour / 60, 0);
  const veinJadePerMin = ownedVeins.reduce((s, v) => s + v.tienNgocPerHour / 60, 0);

  const linhThach = Math.round((getBuildingProductionPerMin(state, 'chinh_dien') * stageBonus + veinStonePerMin) * mins);
  const linhKhi = Math.round(getBuildingProductionPerMin(state, 'tu_linh_tran') * stageBonus * mins);
  const linhThao = Math.round(getBuildingProductionPerMin(state, 'duoc_dien') * mins);
  const huyenThiet = Math.round(getBuildingProductionPerMin(state, 'luyen_khi_cac') * mins);
  const cuongHoaThach = Math.floor(getBuildingProductionPerMin(state, 'tang_kinh_cac') * mins);
  const tienNgoc = Math.floor(veinJadePerMin * mins);
  const dotPhaDan = Math.floor(getBuildingProductionPerMin(state, 'luyen_dan_phong') * mins * 0.35);

  const bonusGearCount = Math.min(3, Math.floor(mins / 45));

  return {
    effectiveSeconds,
    linhThach,
    linhKhi,
    linhThao,
    huyenThiet,
    cuongHoaThach,
    tienNgoc,
    dotPhaDan,
    bonusGearCount,
  };
}

export function generateMarketListings(): MarketListing[] {
  const sellers = ['Dược Trần Tử', 'Tô Hàn Nguyệt', 'Lý Trường Thanh', 'Vân Du Thương Nhân', 'Tiêu Diêu Tử', 'Mặc Uyên'];
  const items: MarketListing[] = [];

  // 4 Equipment listings (Rare to Legendary)
  const rarities: Rarity[] = ['hiem', 'su_thi', 'huyen_thoai', 'huyen_thoai'];
  rarities.forEach((rar, idx) => {
    const eq = generateEquipment({
      rarity: rar,
      setId: idx === 3 ? 'cuu_thien_kiem_de' : idx === 2 ? 'thai_co_long_hoang' : undefined,
    });
    items.push({
      id: genId('mkt'),
      sellerName: pick(sellers),
      itemType: 'equipment',
      name: eq.name,
      rarity: eq.rarity,
      priceLinhThach: Math.round(RARITY_META[eq.rarity].sellPrice * 2.2),
      quantity: 1,
      equipmentData: eq,
      listedAt: Date.now() - randInt(60, 3600) * 1000,
    });
  });

  // 2 Gems
  [2, 3].forEach((tier) => {
    const gem = createGem(undefined, tier);
    items.push({
      id: genId('mkt'),
      sellerName: pick(sellers),
      itemType: 'gem',
      name: gem.name,
      rarity: tier >= 3 ? 'su_thi' : 'hiem',
      priceLinhThach: tier === 3 ? 2200 : 780,
      quantity: 1,
      gemData: gem,
      listedAt: Date.now() - randInt(120, 2400) * 1000,
    });
  });

  // Pills & Enhance Stones
  items.push({
    id: genId('mkt'),
    sellerName: 'Đan Đỉnh Tiên Môn',
    itemType: 'pill',
    name: 'Đột Phá Đan (Gói x3)',
    rarity: 'su_thi',
    priceLinhThach: 1200,
    quantity: 3,
    listedAt: Date.now() - 400000,
  });
  items.push({
    id: genId('mkt'),
    sellerName: 'Luyện Khí Thương Hội',
    itemType: 'stone',
    name: 'Cường Hóa Thạch (Gói x15)',
    rarity: 'hiem',
    priceLinhThach: 900,
    quantity: 15,
    listedAt: Date.now() - 800000,
  });

  return items;
}

export function createInitialGameState(): GameState {
  // Starter disciples forming a balanced 5-element Tương Sinh chain (Kim -> Thủy -> Mộc -> Hỏa!)
  const master = generateDisciple({
    isSectMaster: true,
    name: 'Diệp Thanh Vân',
    element: 'Kim',
    spiritRoot: 'thien_linh_can',
    realmIndex: 4, // Trúc Cơ Trung Kỳ
  });
  master.inFormation = true;
  master.formationOrder = 0;

  const d2 = generateDisciple({
    name: 'Tô Băng Tâm',
    element: 'Thuy',
    spiritRoot: 'bien_di_bang',
    realmIndex: 3, // Trúc Cơ Sơ Kỳ
  });
  d2.inFormation = true;
  d2.formationOrder = 1;

  const d3 = generateDisciple({
    name: 'Lâm Thanh Dao',
    element: 'Moc',
    spiritRoot: 'song_linh_can',
    realmIndex: 2, // Luyện Khí Đỉnh Phong
  });
  d3.inFormation = true;
  d3.formationOrder = 2;

  const d4 = generateDisciple({
    name: 'Tiêu Xích Viêm',
    element: 'Hoa',
    spiritRoot: 'song_linh_can',
    realmIndex: 2,
  });
  d4.inFormation = true;
  d4.formationOrder = 3;

  // Starter equipment so 12-slot UI immediately shines
  const starterWeapon = generateEquipment({ slot: 'vu_khi_chinh', rarity: 'huyen_thoai', setId: 'cuu_thien_kiem_de' });
  starterWeapon.enhanceLevel = 3;
  starterWeapon.equippedBy = master.id;
  master.equipped.vu_khi_chinh = starterWeapon.id;

  const starterArmor = generateEquipment({ slot: 'giap_nguc', rarity: 'su_thi', setId: 'cuu_thien_kiem_de' });
  starterArmor.enhanceLevel = 2;
  starterArmor.equippedBy = master.id;
  master.equipped.giap_nguc = starterArmor.id;

  const starterRing = generateEquipment({ slot: 'nhan', rarity: 'hiem' });
  starterRing.equippedBy = master.id;
  master.equipped.nhan = starterRing.id;

  const starterBoots = generateEquipment({ slot: 'giay', rarity: 'hiem' });
  starterBoots.equippedBy = d2.id;
  d2.equipped.giay = starterBoots.id;

  const bagItems: EquipmentItem[] = [
    starterWeapon,
    starterArmor,
    starterRing,
    starterBoots,
    generateEquipment({ slot: 'non', rarity: 'su_thi' }),
    generateEquipment({ slot: 'vu_khi_phu', rarity: 'hiem' }),
    generateEquipment({ slot: 'day_chuyen', rarity: 'su_thi', setId: 'thanh_lien_tien_ton' }),
    generateEquipment({ slot: 'gang_tay', rarity: 'thuong' }),
    generateEquipment({ slot: 'dai_lung', rarity: 'hiem' }),
    generateEquipment({ slot: 'giap_vai', rarity: 'thuong' }),
  ];

  const starterGems: GemItem[] = [
    createGem('Kim', 1),
    createGem('Kim', 1),
    createGem('Kim', 1),
    createGem('Moc', 1),
    createGem('Thuy', 2),
    createGem('Hoa', 1),
    createGem('Tho', 1),
  ];

  // Socket one starter gem on master's weapon
  starterWeapon.sockets[0] = createGem('Kim', 2);

  return {
    sectName: 'Thanh Vân Tiên Tông',
    sectYear: 108,
    sectLevel: 12,
    resources: {
      linhThach: 4850,
      tienNgoc: 360,
      linhThao: 420,
      huyenThiet: 310,
      linhKhi: 1850,
      cuongHoaThach: 45,
      dotPhaDan: 5,
      tinhHoaBoss: 3,
      stamina: 120,
      maxStamina: 120,
    },
    buildings: {
      chinh_dien: { id: 'chinh_dien', level: 3, storedResource: 160 },
      tu_linh_tran: { id: 'tu_linh_tran', level: 2, storedResource: 220 },
      duoc_dien: { id: 'duoc_dien', level: 2, storedResource: 85 },
      luyen_dan_phong: { id: 'luyen_dan_phong', level: 1, storedResource: 1 },
      luyen_khi_cac: { id: 'luyen_khi_cac', level: 2, storedResource: 60 },
      tang_kinh_cac: { id: 'tang_kinh_cac', level: 1, storedResource: 10 },
      truyen_tong_tran: { id: 'truyen_tong_tran', level: 1, storedResource: 0 },
    },
    disciples: [master, d2, d3, d4],
    recruitPool: [
      generateDisciple({ premium: false }),
      generateDisciple({ premium: false }),
      generateDisciple({ premium: true }),
    ],
    inventory: bagItems,
    gems: starterGems,
    clearedRealms: [],
    defeatedBosses: {},
    spiritVeins: INITIAL_SPIRIT_VEINS,
    alliance: {
      name: 'Thanh Vân Tiên Minh',
      level: 4,
      contribution: 640,
      notice: 'Đạo hữu nhớ tham gia Tranh Đoạt Linh Mạch và cống hiến Tiên Minh để kích hoạt buff toàn phái!',
      tech: {
        atkLevel: 2,
        qiLevel: 2,
        dropLevel: 1,
      },
      members: [
        { id: 'm1', name: 'Diệp Thanh Vân (Bạn)', role: 'Minh Chủ', realmLabel: 'Trúc Cơ Trung Kỳ', power: 0, online: true },
        { id: 'm2', name: 'Dược Trần Tử', role: 'Phó Minh Chủ', realmLabel: 'Nguyên Anh Sơ Kỳ', power: 18400, online: true },
        { id: 'm3', name: 'Diệp Phàm', role: 'Trưởng Lão', realmLabel: 'Kim Đan Sơ Kỳ', power: 6800, online: true },
        { id: 'm4', name: 'Tiêu Diêu Tử', role: 'Thành Viên', realmLabel: 'Trúc Cơ Đỉnh Phong', power: 4950, online: false },
      ],
    },
    marketListings: generateMarketListings(),
    quests: [
      {
        id: 'q_main_1',
        category: 'Chính',
        title: 'Đột Phá Cảnh Giới 1 đệ tử',
        progress: 0,
        target: 1,
        claimed: false,
        rewardText: '+1.200 Linh Thạch · +3 Đột Phá Đan',
        reward: { linhThach: 1200, dotPhaDan: 3 },
        jumpTo: 'disciples',
      },
      {
        id: 'q_side_1',
        category: 'Phụ',
        title: 'Nâng cấp công trình Tông Môn',
        progress: 0,
        target: 1,
        claimed: false,
        rewardText: '+600 Linh Thạch · +120 Linh Thảo',
        reward: { linhThach: 600, linhThao: 120 },
        jumpTo: 'buildings',
      },
      {
        id: 'q_daily_1',
        category: 'Hằng Ngày',
        title: 'Chinh phục Bí Cảnh hoặc Boss',
        progress: 0,
        target: 1,
        claimed: false,
        rewardText: '+80 Tiên Ngọc · +20 Cường Hóa Thạch',
        reward: { tienNgoc: 80, cuongHoaThach: 20 },
        jumpTo: 'world',
      },
    ],
    chatMessages: [
      {
        id: 'c1',
        channel: 'the_gioi',
        sender: 'Tiêu Diêu Tử',
        text: 'Thanh Vân Tiên Tông đang chiêu mộ thiên tài Song Linh Căn trở lên!',
        timestamp: Date.now() - 180000,
      },
      {
        id: 'c2',
        channel: 'he_thong',
        sender: 'Hệ Thống',
        text: 'Chào mừng Chưởng Môn trở lại! Linh mạch đang vận hành tự động.',
        timestamp: Date.now() - 90000,
      },
      {
        id: 'c3',
        channel: 'bang_hoi',
        sender: 'Dược Trần Tử',
        text: 'Minh Chủ ơi, Huyền Thủy Long Đàm đang có thể đoạt được rồi!',
        timestamp: Date.now() - 35000,
      },
    ],
    lastActiveAt: Date.now(),
    pendingOfflineSeconds: 1800, // Give 30m initial offline reward ready to inspect/claim
    dailyGiftClaimed: false,
    soundEnabled: true,
    vip: createDefaultVipState(),
  };
}

export function getLeaderboardData(state: GameState) {
  const playerPower = computeTotalSectPower(state);
  const bestDisciple = [...state.disciples].sort(
    (a, b) =>
      computeDiscipleStats(b, state.inventory, state.alliance, state.buildings.tang_kinh_cac.level).power -
      computeDiscipleStats(a, state.inventory, state.alliance, state.buildings.tang_kinh_cac.level).power,
  )[0];
  const bestRealm = bestDisciple ? REALM_LADDER[bestDisciple.realmIndex]?.fullName || 'Luyện Khí' : 'Luyện Khí';

  const combined = [
    ...GLOBAL_RIVAL_SECTS.map((r) => ({ ...r, isPlayer: false })),
    {
      id: 'player',
      sectName: state.sectName,
      master: state.disciples[0]?.name || 'Chưởng Môn',
      server: 'S1 · Cửu Châu',
      realm: bestRealm,
      power: playerPower,
      alliance: state.alliance.name,
      maxStage: state.clearedRealms.length,
      isPlayer: true,
    },
  ];
  combined.sort((a, b) => b.power - a.power);
  return combined;
}
