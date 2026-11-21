import { ElementType, SkillDef } from '../types/game';
import { DiscipleCombatMods, getElementRelation } from './gameLogic';

export type CombatArchetype = 'monster' | 'guardian' | 'boss' | 'world_boss';

export interface BossPhaseInfo {
  phase: 1 | 2 | 3;
  name: string;
  badgeColor: string;
  damageReductionPct: number; // % giảm sát thương nhận vào
  critResistPct: number; // % kháng tỷ lệ bạo kích
  atkBonusPct: number; // % tăng công kích của Boss
  defBonusPct: number; // % tăng phòng thủ của Boss
  desc: string;
}

export interface CombatDamageInput {
  attacker: {
    atk: number;
    crit: number;
    critDmg: number;
    elemBonus: number;
    isAlly: boolean;
    isBoss?: boolean;
    combatMods?: DiscipleCombatMods;
  };
  defender: {
    hp: number;
    maxHp: number;
    def: number;
    element: ElementType;
    isBoss?: boolean;
    isWorldBoss?: boolean;
    archetype: CombatArchetype;
  };
  skill: SkillDef;
  isComboTriggered: boolean;
  comboChain: number;
  tangKinhLevel: number;
  dmgScale?: number;
}

export interface CombatDamageResult {
  finalDmg: number;
  rawBeforeMitigation: number;
  defMitigationPct: number;
  drPct: number;
  isCrit: boolean;
  wasCapped: boolean;
  elementRelation: 'counter' | 'resisted' | 'neutral';
  armorPenPct: number;
  defenderPhase: BossPhaseInfo | null;
}

/**
 * Xác định Giai Đoạn (Phase) của Boss Huyền Thoại hoặc Boss Thế Giới theo % HP còn lại.
 */
export function getBossPhaseInfo(
  hp: number,
  maxHp: number,
  archetype: CombatArchetype,
): BossPhaseInfo | null {
  const hpPct = maxHp > 0 ? (hp / maxHp) * 100 : 100;

  if (archetype === 'world_boss') {
    if (hpPct > 65) {
      return {
        phase: 1,
        name: 'GĐ 1 · Thái Cổ Uy Áp',
        badgeColor: '#F59E0B',
        damageReductionPct: 45,
        critResistPct: 25,
        atkBonusPct: 0,
        defBonusPct: 0,
        desc: 'Miễn thương 45% · Kháng bạo 25% · Long Uy Hộ Thể (không giới hạn ST đợt)',
      };
    }
    if (hpPct > 30) {
      return {
        phase: 2,
        name: 'GĐ 2 · Hỗn Độn Long Lân',
        badgeColor: '#C084FC',
        damageReductionPct: 58,
        critResistPct: 30,
        atkBonusPct: 30,
        defBonusPct: 25,
        desc: 'Long lân hộ thể: Miễn thương 58% · Kháng bạo 30% · Công +30% · Thủ +25%',
      };
    }
    return {
      phase: 3,
      name: 'GĐ 3 · Diệt Thế Cuồng Nộ',
      badgeColor: '#EF4444',
      damageReductionPct: 65,
      critResistPct: 35,
      atkBonusPct: 60,
      defBonusPct: 40,
      desc: 'Cuồng nộ tuyệt đỉnh: Miễn thương 65% · Kháng bạo 35% · Công +60% · Thủ +40%',
    };
  }

  if (archetype === 'boss') {
    if (hpPct > 40) {
      return {
        phase: 1,
        name: 'GĐ 1 · Trấn Áp',
        badgeColor: '#F59E0B',
        damageReductionPct: 20,
        critResistPct: 12,
        atkBonusPct: 0,
        defBonusPct: 0,
        desc: 'Boss Huyền Thoại: Miễn thương 20% · Kháng bạo 12%',
      };
    }
    return {
      phase: 2,
      name: 'GĐ 2 · Cuồng Nộ',
      badgeColor: '#EF4444',
      damageReductionPct: 30,
      critResistPct: 18,
      atkBonusPct: 22,
      defBonusPct: 15,
      desc: 'Dưới 40% HP: Miễn thương 30% · Công +22% · Thủ +15%',
    };
  }

  return null;
}

/**
 * Thông số phòng ngự chuẩn theo cấp bậc mục tiêu (Quái / Thủ Vệ / Boss / Boss Thế Giới)
 */
export function getArchetypeBaseDefense(archetype: CombatArchetype): {
  damageReductionPct: number;
  critResistPct: number;
} {
  switch (archetype) {
    case 'world_boss':
      return { damageReductionPct: 45, critResistPct: 25 };
    case 'boss':
      return { damageReductionPct: 20, critResistPct: 12 };
    case 'guardian':
      return { damageReductionPct: 12, critResistPct: 8 };
    case 'monster':
    default:
      return { damageReductionPct: 0, critResistPct: 0 };
  }
}

/**
 * Hệ thống tính Sát Thương RPG Tiên Hiệp 8 bước chuẩn xác:
 * 1) Base Skill Attack (ATK × Hệ Số Chiêu × Tăng ST Kỹ Năng)
 * 2) Phòng Thủ Hyperbolic (DEF / (DEF + K)) có Xuyên Giáp (tối đa 72%)
 * 3) Ngũ Hành Tương Khắc (Khắc ×1.35 / Bị Khắc ×0.78) + Tinh Thông Thuộc Tính
 * 4) Ngũ Hành Liên Hoàn Combo
 * 5) Bạo Kích vs Kháng Bạo của Boss/Quái
 * 6) Miễn Thương theo Giai Đoạn Boss (Phase DR) & Kiên Cố
 * 7) Bổ Trợ Tàng Kinh Các + ST Lên Boss
 * 8) Dao động tự nhiên (95%–105%) + Giới Hạn ST Mỗi Đòn cho Boss Thế Giới (chống 1-hit kill)
 */
export function calculateCombatDamage(input: CombatDamageInput): CombatDamageResult {
  const {
    attacker,
    defender,
    skill,
    isComboTriggered,
    comboChain,
    tangKinhLevel,
    dmgScale = 1,
  } = input;

  const mods = attacker.combatMods;

  // 0. Check Boss Phase on defender (and attacker if attacker is Boss)
  const defenderPhase = getBossPhaseInfo(defender.hp, defender.maxHp, defender.archetype);
  const baseArch = getArchetypeBaseDefense(defender.archetype);

  const drPct = defenderPhase ? defenderPhase.damageReductionPct : baseArch.damageReductionPct;
  const critResistPct = defenderPhase ? defenderPhase.critResistPct : baseArch.critResistPct;
  const defWithPhase = Math.round(
    defender.def * (1 + (defenderPhase ? defenderPhase.defBonusPct : 0) / 100),
  );

  // 1. Base Skill Attack
  const skillMult = skill.multiplier * (1 + (mods?.skillDmgPct || 0) / 100);
  const rawBeforeMitigation = attacker.atk * skillMult;

  // 2. Hyperbolic Defense Mitigation with Armor Penetration (capped at 72%)
  const kimComboPen = isComboTriggered && skill.element === 'Kim' ? 24 : 0;
  const growthPen = (mods?.armorPenBonus || 0) * (isComboTriggered ? 1.0 : 0.7);
  const armorPenPct = Math.min(72, kimComboPen + growthPen);
  const effectiveDef = Math.max(0, defWithPhase * (1 - armorPenPct / 100));

  // Smooth hyperbolic curve: DEF / (DEF + K), where K scales with attacker ATK so high-tier stats stay balanced
  const kConst = Math.max(1200, attacker.atk * 0.68);
  const defReduction = Math.min(0.78, effectiveDef / (effectiveDef + kConst));
  const postDefDmg = rawBeforeMitigation * (1 - defReduction);

  // 3. Five-Element Relation + Elemental Mastery
  const elementRelation = getElementRelation(skill.element, defender.element);
  const elemRelMult =
    elementRelation === 'counter' ? 1.35 : elementRelation === 'resisted' ? 0.78 : 1.0;
  const elemMasteryMult = 1 + Math.max(0, attacker.elemBonus) / 100;

  // 4. Ngũ Hành Liên Hoàn Combo
  const comboMult = isComboTriggered
    ? 1 + 0.22 * comboChain + (mods?.comboDmgBonus || 0) / 100
    : 1;

  // 5. Critical Hit vs Target Crit Resist
  const rawCritChance =
    attacker.crit +
    (elementRelation === 'counter' ? 15 : 0) +
    (isComboTriggered && skill.element === 'Kim' ? 22 : 0) +
    (isComboTriggered ? mods?.comboCritBonus || 0 : 0) -
    critResistPct;
  const effectiveCritChance = Math.max(5, Math.min(92, rawCritChance));
  const isCrit = Math.random() * 100 < effectiveCritChance;
  const critMult = isCrit ? Math.max(1.35, attacker.critDmg / 100) : 1.0;

  // 6. Boss / Target Damage Reduction (Miễn Thương)
  const drMult = Math.max(0.2, 1 - drPct / 100);

  // 7. Sect Library (Tàng Kinh Các) + Boss Slayer Bonus
  const tangKinhBonus = attacker.isAlly ? 1 + Math.max(0, tangKinhLevel - 1) * 0.05 : 1;
  const bossSlayerMult =
    (defender.isBoss || defender.isWorldBoss) && mods?.bossDmgPct
      ? 1 + mods.bossDmgPct / 100
      : 1;

  // 8. Final variance (95% - 105%)
  let computed =
    postDefDmg *
    elemRelMult *
    elemMasteryMult *
    comboMult *
    critMult *
    drMult *
    tangKinhBonus *
    bossSlayerMult *
    dmgScale *
    (0.95 + Math.random() * 0.1);

  // Boss Thế Giới: KHÔNG ép trần cứng sát thương!
  // Thay bằng cơ chế "Long Uy Hộ Thể" (giảm chấn phi tuyến mềm nếu 1 đòn vượt quá 2% HP tối đa):
  // người chơi càng mạnh đánh càng to, nhưng không thể 1-hit kill Boss toàn server.
  let wasCapped = false;
  if (defender.archetype === 'world_boss') {
    const softThreshold = Math.round(defender.maxHp * 0.02); // 2% HP tối đa
    if (computed > softThreshold) {
      const excess = computed - softThreshold;
      computed = softThreshold + Math.sqrt(excess * softThreshold);
      wasCapped = true;
    }
  } else if (defender.archetype === 'boss') {
    // Boss Huyền Thoại: giảm chấn mềm khi Boss đang trên 50% HP để giữ nhịp 2 giai đoạn
    const bossPhaseGuard = Math.round(defender.maxHp * 0.45);
    if (defender.hp > defender.maxHp * 0.5 && computed > bossPhaseGuard) {
      const excess = computed - bossPhaseGuard;
      computed = bossPhaseGuard + Math.sqrt(excess * bossPhaseGuard) * 0.4;
      wasCapped = true;
    }
  }

  return {
    finalDmg: Math.max(25, Math.round(computed)),
    rawBeforeMitigation: Math.round(rawBeforeMitigation),
    defMitigationPct: Math.round(defReduction * 100),
    drPct,
    isCrit,
    wasCapped,
    elementRelation,
    armorPenPct: Math.round(armorPenPct),
    defenderPhase,
  };
}
