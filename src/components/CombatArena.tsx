import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ELEMENT_META,
  ELEMENT_SKILLS,
  EQUIPMENT_SETS,
  RARITY_META,
  REALM_LADDER,
} from '../data/constants';
import {
  CombatContext,
  ElementType,
  EquipmentItem,
  GameState,
  GemItem,
  SkillDef,
} from '../types/game';
import {
  computeDiscipleStats,
  createGem,
  doesGenerateElement,
  formatNum,
  generateEquipment,
  getElementRelation,
  rollRarity,
} from '../utils/gameLogic';
import {
  CombatArchetype,
  calculateCombatDamage,
  getBossPhaseInfo,
} from '../utils/combatEngine';
import { WORLD_BOSS_WAVE_CAP } from '../data/worldBoss';
import { sfx } from '../utils/sound';
import {
  DisciplePortrait,
  ElementSeal,
  EquipmentSlotIcon,
  FiveElementDiagram,
  GemSprite,
  RarityFrameBox,
  ResourceIcon,
  SkillIcon,
  gemTierToRarity,
} from './ElementIcons';
import {
  BattleStage,
  StageActionAnim,
  StageCombatUnit,
  StageFloatingText,
  StageImpactVfx,
  getUnitHomeCoord,
  resolveArenaSpec,
} from './BattleStage';
import { VanKiemQuyTongVfxHandle } from './VanKiemQuyTongVFX';
import {
  ChevronDown,
  ChevronUp,
  FastForward,
  Play,
  Pause,
  RotateCcw,
  Swords,
  Trophy,
  Zap,
} from 'lucide-react';

export interface BattleVictoryRewards {
  linhThach: number;
  linhThao: number;
  huyenThiet: number;
  cuongHoaThach: number;
  dotPhaDan: number;
  linhKhi: number;
  tinhHoaBoss: number;
  tienNgoc: number;
  droppedEquipment: EquipmentItem[];
  droppedGems: GemItem[];
  worldBossDamage?: number;
}

interface CombatArenaProps {
  state: GameState;
  context: CombatContext;
  onFinish: (victory: boolean, rewards?: BattleVictoryRewards) => void;
  onClose: () => void;
}

const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

export function CombatArena({ state, context, onFinish, onClose }: CombatArenaProps) {
  const initialUnits = useMemo<StageCombatUnit[]>(() => {
    const tangKinhLvl = state.buildings.tang_kinh_cac.level;
    const allies: StageCombatUnit[] = state.disciples
      .filter((d) => d.inFormation)
      .sort((a, b) => a.formationOrder - b.formationOrder)
      .slice(0, 5)
      .map((d) => {
        const forgeLvl = state.buildings.luyen_khi_cac.level;
        const st = computeDiscipleStats(d, state.inventory, state.alliance, tangKinhLvl, forgeLvl);
        const startShield = st.combatMods.startShieldPct > 0
          ? Math.round((st.hp * st.combatMods.startShieldPct) / 100)
          : 0;
        return {
          id: d.id,
          name: d.name,
          isAlly: true,
          element: d.element,
          glyph: d.avatarGlyph,
          realmLabel: REALM_LADDER[d.realmIndex]?.majorName || 'Luyện Khí',
          realmIndex: d.realmIndex,
          spiritRoot: d.spiritRoot,
          maxHp: st.hp,
          hp: st.hp,
          shield: startShield,
          mp: st.combatMods.startMp,
          maxMp: 100,
          atk: st.atk,
          def: st.def,
          spd: st.spd,
          crit: st.crit,
          critDmg: st.critDmg,
          elemBonus: st.elemBonus,
          skills: ELEMENT_SKILLS[d.element],
          combatMods: st.combatMods,
          deathImmunityUsed: false,
        };
      });

    const enemies: StageCombatUnit[] = context.enemies.map((e) => ({
      id: e.id,
      name: e.name,
      isAlly: false,
      element: e.element,
      glyph: e.glyph,
      realmLabel:
        context.mode === 'world_boss'
          ? 'BOSS THẾ GIỚI TOÀN SERVER'
          : e.isBoss
            ? 'BOSS HUYỀN THOẠI'
            : 'Yêu Linh',
      maxHp: context.mode === 'world_boss' && context.worldBossMeta ? context.worldBossMeta.bossMaxHp : e.hp,
      hp: context.mode === 'world_boss' && context.worldBossMeta ? context.worldBossMeta.bossCurrentHp : e.hp,
      shield: 0,
      mp: 30,
      maxMp: 100,
      atk: e.atk,
      def: e.def,
      spd: e.spd,
      crit: e.isBoss ? 22 : 12,
      critDmg: 155,
      elemBonus: 10,
      isBoss: e.isBoss,
      skills: ELEMENT_SKILLS[e.element],
    }));

    return [...allies, ...enemies];
  }, [state, context]);

  const [units, setUnits] = useState<StageCombatUnit[]>(initialUnits);
  const [round, setRound] = useState(1);
  const [turnQueue, setTurnQueue] = useState<string[]>(() =>
    [...initialUnits].sort((a, b) => b.spd - a.spd).map((u) => u.id),
  );
  const [turnIndex, setTurnIndex] = useState(0);
  const [selectedTargetId, setSelectedTargetId] = useState<string>(context.enemies[0]?.id || '');
  const [comboElement, setComboElement] = useState<ElementType | null>(null);
  const [comboChain, setComboChain] = useState(0);
  const [autoBattle, setAutoBattle] = useState(false);
  const [fastMode, setFastMode] = useState(false);

  // CombatSequencer animation state
  const [isAnimating, setIsAnimating] = useState(false);
  const [actionAnim, setActionAnim] = useState<StageActionAnim | null>(null);
  const [hitUnitIds, setHitUnitIds] = useState<string[]>([]);
  const [impactVfx, setImpactVfx] = useState<StageImpactVfx | null>(null);
  const [screenShake, setScreenShake] = useState(false);
  const [stageDimmed, setStageDimmed] = useState(false);
  const [floatingTexts, setFloatingTexts] = useState<StageFloatingText[]>([]);
  const vanKiemVfxRef = useRef<VanKiemQuyTongVfxHandle | null>(null);
  const [showLog, setShowLog] = useState(() => (typeof window !== 'undefined' ? window.innerWidth >= 768 : true));
  const [combatLog, setCombatLog] = useState<string[]>([
    `Khai chiến: ${context.title}! Tận dụng Tương Sinh Ngũ Hành để tạo Combo Liên Hoàn.`,
  ]);
  const [battleOutcome, setBattleOutcome] = useState<{
    victory: boolean;
    rewards?: BattleVictoryRewards;
  } | null>(null);

  const unitsRef = useRef(units);
  unitsRef.current = units;
  const fastModeRef = useRef(fastMode);
  fastModeRef.current = fastMode;
  const mountedRef = useRef(true);
  const worldBossDamageRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const activeUnitId = turnQueue[turnIndex];
  const activeUnit = units.find((u) => u.id === activeUnitId && u.hp > 0);
  const allies = units.filter((u) => u.isAlly);
  const enemies = units.filter((u) => !u.isAlly);
  const aliveEnemies = enemies.filter((e) => e.hp > 0);
  const singleBoss = enemies.length === 1 && enemies[0].isBoss ? enemies[0] : null;

  // Ensure selected target is always an alive enemy
  useEffect(() => {
    if (aliveEnemies.length > 0 && !aliveEnemies.some((e) => e.id === selectedTargetId)) {
      setSelectedTargetId(aliveEnemies[0].id);
    }
  }, [aliveEnemies, selectedTargetId]);

  const pushFloat = (unitId: string, text: string, color: string, subText?: string, isCrit?: boolean) => {
    const id = Date.now() + Math.random();
    setFloatingTexts((prev) => [...prev.slice(-10), { id, unitId, text, color, subText, isCrit }]);
    window.setTimeout(() => {
      if (!mountedRef.current) return;
      setFloatingTexts((prev) => prev.filter((f) => f.id !== id));
    }, 950);
  };

  const buildRewards = (): BattleVictoryRewards => {
    const dropBonus = 1 + state.alliance.tech.dropLevel * 0.1;
    if (context.mode === 'world_boss') {
      const dmg = Math.min(WORLD_BOSS_WAVE_CAP, Math.max(50_000, worldBossDamageRef.current));
      return {
        linhThach: Math.round(35000 * dropBonus),
        linhThao: 400,
        huyenThiet: 350,
        cuongHoaThach: 25,
        dotPhaDan: 3,
        linhKhi: 18000,
        tinhHoaBoss: 5,
        tienNgoc: 120,
        droppedEquipment: [],
        droppedGems: [createGem('Hoa', 3)],
        worldBossDamage: dmg,
      };
    }
    if (context.mode === 'boss' && context.bossDef) {
      const b = context.bossDef;
      const piece1 = generateEquipment({
        rarity: b.guaranteedMinRarity,
        setId: b.setId,
      });
      const piece2 = generateEquipment({
        rarity: Math.random() < 0.35 ? 'truyen_thuyet' : 'huyen_thoai',
        setId: b.setId,
      });
      return {
        linhThach: Math.round(b.recommendedPower * 0.22 * dropBonus),
        linhThao: Math.round(b.recommendedPower * 0.03),
        huyenThiet: Math.round(b.recommendedPower * 0.028),
        cuongHoaThach: Math.max(18, Math.round(b.recommendedPower / 550)),
        dotPhaDan: 3,
        linhKhi: Math.round(b.recommendedPower * 0.25),
        tinhHoaBoss: Math.max(2, Math.round(b.recommendedPower / 10000) + 1),
        tienNgoc: 60,
        droppedEquipment: [piece1, piece2],
        droppedGems: [createGem(b.element, 2), createGem(undefined, 1)],
      };
    }

    if (context.mode === 'vein' && context.veinDef) {
      const v = context.veinDef;
      return {
        linhThach: v.linhThachPerHour * 2,
        linhThao: 150,
        huyenThiet: 120,
        cuongHoaThach: 20,
        dotPhaDan: 2,
        linhKhi: 1200,
        tinhHoaBoss: 1,
        tienNgoc: v.tienNgocPerHour * 2,
        droppedEquipment: [generateEquipment({ rarity: v.grade === 'Thiên Cấp' ? 'truyen_thuyet' : 'huyen_thoai' })],
        droppedGems: [createGem(v.element, 2)],
      };
    }

    const r = context.realmDef!;
    const drop1 = generateEquipment({ rarity: rollRarity(r.rewards.dropRarityPool) });
    const extraDrop = Math.random() < 0.45 ? [generateEquipment({ rarity: rollRarity(r.rewards.dropRarityPool) })] : [];
    return {
      linhThach: Math.round(r.rewards.linhThach * dropBonus),
      linhThao: r.rewards.linhThao,
      huyenThiet: r.rewards.huyenThiet,
      cuongHoaThach: r.rewards.cuongHoaThach,
      dotPhaDan: r.rewards.dotPhaDan,
      linhKhi: r.rewards.linhKhi,
      tinhHoaBoss: Math.random() < 0.35 ? 1 : 0,
      tienNgoc: 20,
      droppedEquipment: [drop1, ...extraDrop],
      droppedGems: [createGem(r.element, 1)],
    };
  };

  const advanceTurn = (nextUnits: StageCombatUnit[]) => {
    const aliveE = nextUnits.filter((u) => !u.isAlly && u.hp > 0);
    const aliveA = nextUnits.filter((u) => u.isAlly && u.hp > 0);

    if (aliveE.length === 0) {
      sfx.victory();
      const rewards = buildRewards();
      setBattleOutcome({ victory: true, rewards });
      setIsAnimating(false);
      return;
    }
    if (aliveA.length === 0) {
      if (context.mode === 'world_boss') {
        sfx.victory();
        const rewards = buildRewards();
        setBattleOutcome({ victory: true, rewards });
      } else {
        setBattleOutcome({ victory: false });
      }
      setIsAnimating(false);
      return;
    }

    let nextIdx = turnIndex + 1;
    let nextQueue = turnQueue;
    let nextRound = round;

    const findAlive = (q: string[], start: number) => {
      for (let i = start; i < q.length; i++) {
        const u = nextUnits.find((unit) => unit.id === q[i]);
        if (u && u.hp > 0) return i;
      }
      return -1;
    };

    let found = findAlive(nextQueue, nextIdx);
    if (found === -1) {
      nextRound += 1;
      if (context.mode === 'world_boss' && nextRound > (context.worldBossMeta?.maxRounds ?? 4)) {
        sfx.victory();
        const rewards = buildRewards();
        setBattleOutcome({ victory: true, rewards });
        setIsAnimating(false);
        return;
      }
      nextQueue = [...nextUnits]
        .filter((u) => u.hp > 0)
        .sort((a, b) => b.spd - a.spd)
        .map((u) => u.id);
      found = 0;
      setRound(nextRound);
      setTurnQueue(nextQueue);
    }
    setTurnIndex(found);
    setIsAnimating(false);
  };

  /**
   * Async CombatSequencer:
   * 1) Lock input + highlight caster & skill callout
   * 2) Dash to target (single-target) or leap/glide center (AoE / Heal / Shield)
   * 3) Trigger VFX impact, hit flash, knockback, screen shake, floating numbers & smooth HP/MP update
   * 4) Return to home slot -> wait 200ms -> hand off to next turn
   */
  const executeSkill = async (caster: StageCombatUnit, skill: SkillDef, targetId?: string) => {
    if (isAnimating || battleOutcome) return;
    setIsAnimating(true);

    const speedMult = fastModeRef.current ? 0.5 : 1.0;
    const nextUnits = unitsRef.current.map((u) => ({ ...u }));
    const acting = nextUnits.find((u) => u.id === caster.id);
    if (!acting || acting.hp <= 0) {
      advanceTurn(nextUnits);
      return;
    }

    // 1. Pre-compute combat math (with 5-pillar Disciple Growth tactical modifiers)
    const mods = acting.combatMods;
    const effectiveMpCost =
      skill.mpCost > 0 ? Math.max(10, skill.mpCost - (mods?.ultMpDiscount || 0)) : 0;

    if (effectiveMpCost > 0) {
      acting.mp = Math.max(0, acting.mp - effectiveMpCost);
      if (mods?.mpRegenPerTurn) {
        acting.mp = Math.min(acting.maxMp, acting.mp + Math.floor(mods.mpRegenPerTurn * 0.5));
      }
    } else {
      acting.mp = Math.min(acting.maxMp, acting.mp + 25 + (mods?.mpRegenPerTurn || 0));
    }

    let isComboTriggered = false;
    let newComboChain = comboChain;
    if (acting.isAlly) {
      if (doesGenerateElement(comboElement, skill.element)) {
        isComboTriggered = true;
        newComboChain = Math.min(5, comboChain + 1);
      } else {
        newComboChain = 1;
      }
    }

    const tangKinhBonus = acting.isAlly ? 1 + (state.buildings.tang_kinh_cac.level - 1) * 0.06 : 1;
    const comboMult = isComboTriggered
      ? 1 + 0.25 * newComboChain + (mods?.comboDmgBonus || 0) / 100
      : 1;
    const skillMult = skill.multiplier * (1 + (mods?.skillDmgPct || 0) / 100);

    const hitIds: string[] = [];
    const logs: string[] = [];
    const pendingFloats: Array<{ unitId: string; text: string; color: string; subText?: string; isCrit?: boolean }> = [];
    let anyCrit = false;
    let primaryTargetUnit: StageCombatUnit | null = null;

    if (skill.target === 'ally_heal') {
      const team = nextUnits.filter((u) => u.isAlly === acting.isAlly && u.hp > 0);
      team.forEach((ally) => {
        const healAmt = Math.round((acting.atk * skillMult * 1.45 + ally.maxHp * 0.14) * comboMult);
        ally.hp = Math.min(ally.maxHp, ally.hp + healAmt);
        pendingFloats.push({
          unitId: ally.id,
          text: `+${formatNum(healAmt)}`,
          color: '#4ADE80',
          subText: isComboTriggered ? `LIÊN HOÀN x${newComboChain}` : 'HỒI XUÂN',
        });
      });
      logs.push(
        `${acting.name} thi triển [${skill.name}]${isComboTriggered ? ` (NGŨ HÀNH LIÊN HOÀN x${newComboChain}!)` : ''}, hồi phục toàn đội.`,
      );
    } else if (skill.target === 'ally_shield') {
      const team = nextUnits.filter((u) => u.isAlly === acting.isAlly && u.hp > 0);
      team.forEach((ally) => {
        const shieldAmt = Math.round((acting.def * 2.8 + ally.maxHp * 0.2) * comboMult);
        ally.shield += shieldAmt;
        pendingFloats.push({
          unitId: ally.id,
          text: `+${formatNum(shieldAmt)} Giáp`,
          color: '#FBBF24',
          subText: isComboTriggered ? `LIÊN HOÀN x${newComboChain}` : 'HỘ THUẪN',
        });
      });
      logs.push(
        `${acting.name} thi triển [${skill.name}]${isComboTriggered ? ` (NGŨ HÀNH LIÊN HOÀN x${newComboChain}!)` : ''}, dựng Hộ Thuẫn toàn đội.`,
      );
    } else {
      const oppPool = nextUnits.filter((u) => u.isAlly !== acting.isAlly && u.hp > 0);
      const targets =
        skill.target === 'all'
          ? oppPool
          : [oppPool.find((u) => u.id === targetId) || oppPool[0]].filter(Boolean);

      primaryTargetUnit = targets[0] || null;
      let totalDmgDealt = 0;

      const getUnitArchetype = (u: StageCombatUnit): CombatArchetype => {
        if (u.isAlly) return 'monster';
        if (context.mode === 'world_boss' && u.isBoss) return 'world_boss';
        if (u.isBoss) return 'boss';
        if (context.mode === 'vein') return 'guardian';
        return 'monster';
      };

      const attackerArch = getUnitArchetype(acting);
      const attackerPhase = !acting.isAlly
        ? getBossPhaseInfo(acting.hp, acting.maxHp, attackerArch)
        : null;
      const effectiveAttackerAtk = Math.round(
        acting.atk * (1 + (attackerPhase ? attackerPhase.atkBonusPct : 0) / 100),
      );

      const applyHitToTarget = (tgt: StageCombatUnit, dmgScale = 1, extraTag?: string) => {
        if (!hitIds.includes(tgt.id)) hitIds.push(tgt.id);
        const tgtArch = getUnitArchetype(tgt);
        const prevPhase = !tgt.isAlly ? getBossPhaseInfo(tgt.hp, tgt.maxHp, tgtArch) : null;

        const dmgRes = calculateCombatDamage({
          attacker: {
            atk: effectiveAttackerAtk,
            crit: acting.crit,
            critDmg: acting.critDmg,
            elemBonus: acting.elemBonus,
            isAlly: acting.isAlly,
            isBoss: acting.isBoss,
            combatMods: mods,
          },
          defender: {
            hp: tgt.hp,
            maxHp: tgt.maxHp,
            def: tgt.def,
            element: tgt.element,
            isBoss: tgt.isBoss,
            isWorldBoss: tgtArch === 'world_boss',
            archetype: tgtArch,
          },
          skill,
          isComboTriggered,
          comboChain: newComboChain,
          tangKinhLevel: state.buildings.tang_kinh_cac.level,
          dmgScale,
        });

        const { finalDmg, isCrit, elementRelation: rel, armorPenPct, wasCapped, drPct } = dmgRes;
        if (isCrit) anyCrit = true;

        // Enforce World Boss wave cap so 1 raid wave never exceeds 6% HP (30M ST)
        let appliedDmg = finalDmg;
        if (tgtArch === 'world_boss' && acting.isAlly) {
          const remainingWaveBudget = Math.max(0, WORLD_BOSS_WAVE_CAP - worldBossDamageRef.current);
          appliedDmg = Math.min(finalDmg, remainingWaveBudget);
        }

        totalDmgDealt += appliedDmg;

        let remainingDmg = appliedDmg;
        if (tgt.shield > 0) {
          const absorbed = Math.min(tgt.shield, remainingDmg);
          tgt.shield -= absorbed;
          remainingDmg -= absorbed;
        }
        tgt.hp = Math.max(0, tgt.hp - remainingDmg);

        // Announce Boss Phase Transition when crossing 65% / 40% / 30% HP thresholds
        if (!tgt.isAlly && tgt.hp > 0) {
          const nextPhase = getBossPhaseInfo(tgt.hp, tgt.maxHp, tgtArch);
          if (prevPhase && nextPhase && nextPhase.phase > prevPhase.phase) {
            logs.push(
              `⚡ [${tgt.name}] tiến vào ${nextPhase.name}! (${nextPhase.desc})`,
            );
            // Boss gains protective dragon scale shield when entering Phase 2/3
            if (tgtArch === 'world_boss') {
              const phaseShield = Math.round(tgt.maxHp * 0.006);
              tgt.shield += phaseShield;
              pendingFloats.push({
                unitId: tgt.id,
                text: `${nextPhase.name}!`,
                color: nextPhase.badgeColor,
                subText: `+${formatNum(phaseShield)} Long Lân Giáp`,
              });
            }
          }
        }

        // Tiên Phẩm Thiên Phú: Bất Hoại Kim Thân (miễn tử 1 lần khi tụt về 1 HP)
        let triggeredImmortal = false;
        if (tgt.hp <= 0 && tgt.combatMods?.deathImmunity && !tgt.deathImmunityUsed) {
          tgt.hp = 1;
          tgt.deathImmunityUsed = true;
          tgt.shield += Math.round(tgt.maxHp * 0.25);
          triggeredImmortal = true;
          logs.push(`[Bất Hoại] ${tgt.name} kích hoạt Bất Hoại Kim Thân, miễn tử giữ lại 1 HP & tạo Hộ Thuẫn!`);
        }

        const tags: string[] = [];
        if (extraTag) tags.push(extraTag);
        if (isComboTriggered) tags.push(`LIÊN HOÀN x${newComboChain}`);
        if (rel === 'counter') tags.push('KHẮC CHẾ!');
        if (isCrit) tags.push('BẠO KÍCH!');
        if (armorPenPct >= 15) tags.push(`XUYÊN GIÁP ${armorPenPct}%`);
        if (drPct >= 30) tags.push(`MIỄN THƯƠNG ${drPct}%`);
        if (wasCapped) tags.push('GIỚI HẠN ST');
        if (triggeredImmortal) tags.push('BẤT HOẠI MIỄN TỬ!');

        pendingFloats.push({
          unitId: tgt.id,
          text: `-${formatNum(appliedDmg)}`,
          color: isCrit ? '#FB7185' : rel === 'counter' ? '#FBBF24' : '#F8FAFC',
          subText: tags.join(' · ') || undefined,
          isCrit,
        });
      };

      targets.forEach((tgt) => {
        applyHitToTarget(tgt, 1);

        // Thần Thông Tầng 9: Liên Kích (bồi thêm đòn 55% sát thương)
        if (tgt.hp > 0 && mods?.multiStrikeChance && Math.random() * 100 < mods.multiStrikeChance) {
          applyHitToTarget(tgt, 0.55, 'LIÊN KÍCH!');
        }

        // Tâm Pháp / Hộ Tâm Kính: Tỷ lệ Phản Kích khi bị đánh trúng
        if (tgt.hp > 0 && acting.hp > 0 && tgt.combatMods?.counterChance && Math.random() * 100 < tgt.combatMods.counterChance) {
          const counterDmg = Math.max(15, Math.round(tgt.atk * 0.55));
          acting.hp = Math.max(1, acting.hp - counterDmg);
          pendingFloats.push({
            unitId: acting.id,
            text: `-${formatNum(counterDmg)}`,
            color: '#F59E0B',
            subText: 'PHẢN KÍCH!',
          });
          logs.push(`[Phản Kích] ${tgt.name} xuất chiêu phản kích ${acting.name} gây ${formatNum(counterDmg)} ST!`);
        }
      });

      // Thần Thông Tầng 6: Đánh Lan thêm 1 mục tiêu phụ cho chiêu đơn mục tiêu
      if (skill.target === 'single' && mods?.splashTargetPct && oppPool.length > 1) {
        const splashTarget = oppPool.find((u) => u.hp > 0 && u.id !== primaryTargetUnit?.id);
        if (splashTarget) {
          applyHitToTarget(splashTarget, mods.splashTargetPct / 100, 'ĐÁNH LAN');
        }
      }

      // Boss Thế Giới Toàn Server: ghi nhận sát thương THỰC TẾ (không nhân ảo, có trần 6% HP/đợt)
      if (context.mode === 'world_boss' && acting.isAlly && totalDmgDealt > 0) {
        worldBossDamageRef.current = Math.min(
          WORLD_BOSS_WAVE_CAP,
          worldBossDamageRef.current + totalDmgDealt,
        );
      }

      // Pháp Bảo Tế Luyện (Luyện Đan Đỉnh): Hút Máu theo tổng sát thương gây ra
      if (mods?.lifestealPct && totalDmgDealt > 0 && acting.hp > 0) {
        const lsHeal = Math.max(10, Math.round((totalDmgDealt * mods.lifestealPct) / 100));
        acting.hp = Math.min(acting.maxHp, acting.hp + lsHeal);
        pendingFloats.push({
          unitId: acting.id,
          text: `+${formatNum(lsHeal)}`,
          color: '#34D399',
          subText: 'HÚT MÁU',
        });
      }

      if (skill.id === 'moc_basic') {
        const selfHeal = Math.round(acting.maxHp * (isComboTriggered ? 0.14 : 0.08));
        acting.hp = Math.min(acting.maxHp, acting.hp + selfHeal);
        pendingFloats.push({ unitId: acting.id, text: `+${formatNum(selfHeal)}`, color: '#4ADE80' });
      }
      if (skill.id === 'tho_basic' && isComboTriggered) {
        const sh = Math.round(acting.maxHp * 0.18);
        acting.shield += sh;
        pendingFloats.push({ unitId: acting.id, text: `+${formatNum(sh)} Giáp`, color: '#FBBF24' });
      }

      logs.push(
        `${acting.name} [${ELEMENT_META[skill.element].name}] dùng ${skill.name}${
          isComboTriggered ? ` — KÍCH HOẠT TƯƠNG SINH LIÊN HOÀN x${newComboChain}!` : ''
        }`,
      );
    }

    // -----------------------------------------------------------------------
    // PHASE 1: Skill Callout Spotlight
    // -----------------------------------------------------------------------
    setActionAnim({
      casterId: acting.id,
      phase: 'callout',
      skillName: skill.name,
      skillId: skill.id,
      element: skill.element,
      isCombo: isComboTriggered,
      comboChain: newComboChain,
      dashTo: null,
      leapY: 0,
    });
    await wait(Math.round(160 * speedMult));
    if (!mountedRef.current) return;

    // -----------------------------------------------------------------------
    // PHASE 2: Approach / Cast Movement
    // -----------------------------------------------------------------------
    const arenaFloor = resolveArenaSpec(
      context.mode,
      context.targetId,
      context.bossDef?.id,
      context.bossDef?.arenaKey || context.realmDef?.arenaKey,
    ).floor;
    const isMobileScreen = typeof window !== 'undefined' && window.innerWidth < 640;
    let dashTo: { x: number; y: number } | null = null;
    let leapY = 0;

    if (skill.target === 'single' && primaryTargetUnit) {
      const oppList = unitsRef.current.filter((u) => u.isAlly !== acting.isAlly);
      const tgtIdx = oppList.findIndex((u) => u.id === primaryTargetUnit!.id);
      const tgtCoord = getUnitHomeCoord(primaryTargetUnit, Math.max(0, tgtIdx), oppList.length, arenaFloor, isMobileScreen);
      const stopOffset = primaryTargetUnit.isBoss && oppList.length === 1 ? 13 : 9;
      dashTo = {
        x: acting.isAlly ? Math.max(15, tgtCoord.x - stopOffset) : Math.min(85, tgtCoord.x + stopOffset),
        y: tgtCoord.y,
      };
    } else if (skill.target === 'all') {
      // AoE ultimate: glide toward center of this arena's stone platform and levitate!
      dashTo = {
        x: acting.isAlly ? 45 : 55,
        y: (arenaFloor.minY + arenaFloor.maxY) * 0.52,
      };
      leapY = -18;
    } else {
      // Ally heal / shield: levitate gracefully in place
      leapY = -14;
    }

    setActionAnim({
      casterId: acting.id,
      phase: 'move',
      skillName: skill.name,
      skillId: skill.id,
      element: skill.element,
      isCombo: isComboTriggered,
      comboChain: newComboChain,
      dashTo,
      leapY,
    });
    await wait(Math.round(230 * speedMult));
    if (!mountedRef.current) return;

    // -----------------------------------------------------------------------
    // PHASE 3: Impact VFX + Sound + Hit Flash + Knockback + Smooth HP/MP Update
    // -----------------------------------------------------------------------
    const vfxTargets =
      hitIds.length > 0
        ? hitIds
        : nextUnits.filter((u) => u.isAlly === acting.isAlly && u.hp > 0).map((u) => u.id);

    const isVanKiemUltimate =
      skill.id === 'kim_ult' ||
      skill.name === 'Vạn Kiếm Quy Tông' ||
      (skill.element === 'Kim' && skill.target === 'all');

    const commitImpactHit = () => {
      if (!mountedRef.current) return;
      if (acting.isAlly) {
        setComboChain(newComboChain);
        setComboElement(skill.element);
        if (isComboTriggered) sfx.combo(newComboChain);
        else sfx.attack();
      } else {
        sfx.attack();
      }
      setHitUnitIds(hitIds);
      if (anyCrit || skill.mpCost > 0 || isComboTriggered || isVanKiemUltimate) {
        setScreenShake(true);
        if (isVanKiemUltimate) {
          window.setTimeout(() => {
            if (mountedRef.current) setScreenShake(false);
          }, Math.round(150 * speedMult));
        }
      }
      setUnits(nextUnits);
      setCombatLog((prev) => [...logs, ...prev].slice(0, 16));
      pendingFloats.forEach((f) => pushFloat(f.unitId, f.text, f.color, f.subText, f.isCrit));
    };

    setActionAnim({
      casterId: acting.id,
      phase: 'impact',
      skillName: skill.name,
      skillId: skill.id,
      element: skill.element,
      isCombo: isComboTriggered,
      comboChain: newComboChain,
      dashTo,
      leapY,
    });

    if (isVanKiemUltimate && vanKiemVfxRef.current) {
      const sameSide = unitsRef.current.filter((u) => u.isAlly === acting.isAlly);
      const casterIdx = Math.max(0, sameSide.findIndex((u) => u.id === acting.id));
      const casterPos =
        dashTo || getUnitHomeCoord(acting, casterIdx, sameSide.length, arenaFloor, isMobileScreen);

      const oppSide = unitsRef.current.filter((u) => u.isAlly !== acting.isAlly);
      const targetPositions = vfxTargets
        .map((tId) => {
          const idx = oppSide.findIndex((u) => u.id === tId);
          if (idx < 0) return null;
          return getUnitHomeCoord(oppSide[idx], idx, oppSide.length, arenaFloor, isMobileScreen);
        })
        .filter((p): p is { x: number; y: number } => p !== null);

      await vanKiemVfxRef.current.play(casterPos, targetPositions, {
        speedMult,
        onDimChange: (dim) => {
          if (mountedRef.current) setStageDimmed(dim);
        },
        onImpact: commitImpactHit,
      });
      if (!mountedRef.current) return;
    } else {
      setImpactVfx({
        id: Date.now(),
        casterId: acting.id,
        targetIds: vfxTargets,
        element: skill.element,
        vfxType: skill.vfxType,
        targetType: skill.target,
        isAoE: skill.target !== 'single',
      });
      commitImpactHit();

      await wait(Math.round(350 * speedMult));
      if (!mountedRef.current) return;
    }

    // -----------------------------------------------------------------------
    // PHASE 4: Return to Formation Slot -> Pause 200ms -> Advance Turn
    // -----------------------------------------------------------------------
    setHitUnitIds([]);
    setImpactVfx(null);
    setScreenShake(false);
    setStageDimmed(false);
    setActionAnim({
      casterId: acting.id,
      phase: 'return',
      skillName: skill.name,
      skillId: skill.id,
      element: skill.element,
      isCombo: isComboTriggered,
      comboChain: newComboChain,
      dashTo: null,
      leapY: 0,
    });

    await wait(Math.round(200 * speedMult));
    if (!mountedRef.current) return;

    setActionAnim(null);
    await wait(Math.round(200 * speedMult));
    if (!mountedRef.current) return;

    advanceTurn(nextUnits);
  };

  // Automatic turn execution for Enemies OR when Auto-Battle is active for Allies
  useEffect(() => {
    if (isAnimating || battleOutcome || !activeUnit) return;

    if (!activeUnit.isAlly || autoBattle) {
      const thinkDelay = fastMode ? 180 : 380;
      const timer = window.setTimeout(() => {
        const ult = activeUnit.skills[1];
        const basic = activeUnit.skills[0];

        let chosenSkill = basic;
        const ultCost = ult
          ? Math.max(10, ult.mpCost - (activeUnit.combatMods?.ultMpDiscount || 0))
          : 999;
        if (ult && activeUnit.mp >= ultCost) {
          if (ult.target === 'ally_heal') {
            const injured = unitsRef.current.some(
              (u) => u.isAlly === activeUnit.isAlly && u.hp > 0 && u.hp < u.maxHp * 0.72,
            );
            chosenSkill = injured ? ult : basic;
          } else {
            chosenSkill = ult;
          }
        }

        const opps = unitsRef.current.filter((u) => u.isAlly !== activeUnit.isAlly && u.hp > 0);
        const preferred =
          opps.find((o) => getElementRelation(chosenSkill.element, o.element) === 'counter') ||
          [...opps].sort((a, b) => a.hp - b.hp)[0];

        executeSkill(activeUnit, chosenSkill, preferred?.id);
      }, thinkDelay);
      return () => window.clearTimeout(timer);
    }
  }, [activeUnit, autoBattle, isAnimating, battleOutcome, fastMode, turnIndex, round]);

  const nextComboElement = comboElement ? ELEMENT_META[comboElement].generates : null;
  const isPlayerTurn = Boolean(activeUnit?.isAlly && !autoBattle && !isAnimating && !battleOutcome);
  const deckAlly = activeUnit?.isAlly ? activeUnit : allies.find((a) => a.hp > 0) || allies[0];

  return (
    <div className="fixed inset-0 h-full z-50 flex flex-col bg-[#0D1A19] text-[#F5ECD8] overflow-hidden">
      {/* 1. TOP HUD BAR */}
      <header className="relative z-20 flex flex-wrap items-center justify-between gap-2 px-3 sm:px-4 py-2 bg-[#0F201F]/95 border-b border-[#C9A45C]/55 shadow-lg shrink-0">
        {/* Left: Turn Counter + Battle Name */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="px-2.5 py-1 rounded-lg bg-[#233E3B] border border-[#C9A45C]/70 text-xs font-mono font-bold text-[#F3D388] shrink-0">
            Hiệp {round}
          </div>
          <div className="min-w-0">
            <h2
              className="text-sm sm:text-base font-bold text-[#F7E1A3] truncate leading-tight"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {context.title}
            </h2>
            <div className="flex items-center gap-1.5 text-[10px] text-[#B8CEC5]">
              <Zap className="w-3 h-3 text-[#F3D388] shrink-0" />
              {comboElement ? (
                <span className="flex items-center gap-1 truncate">
                  <span>Liên Hoàn</span>
                  <strong className="text-[#FDE047] font-mono">x{comboChain}</strong>
                  {nextComboElement && (
                    <span className="text-[#93C5FD]">→ tiếp: {ELEMENT_META[nextComboElement].name}</span>
                  )}
                </span>
              ) : (
                <span className="truncate">Xuất chiêu Tương Sinh để kích hoạt Liên Hoàn</span>
              )}
            </div>
          </div>
        </div>

        {/* Center: Giant Boss HP Bar (5v1 Boss Fight) OR Compact Turn Order */}
        {singleBoss ? (
          <div className="order-3 sm:order-2 w-full sm:w-auto sm:min-w-[300px] lg:min-w-[380px] px-3 py-1 rounded-xl bg-[#271114]/90 border border-[#EF4444]/60 shadow-inner">
            <div className="flex items-center justify-between gap-2 text-xs mb-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <ElementSeal element={singleBoss.element} size="xs" />
                <span className="font-bold text-[#FEE2E2] truncate">{singleBoss.name}</span>
                <span className="text-[10px] text-[#FCA5A5] hidden md:inline">({ELEMENT_META[singleBoss.element].name})</span>
              </div>
              <span className="font-mono text-[11px] font-bold text-[#FECACA] shrink-0">
                {formatNum(singleBoss.hp)} / {formatNum(singleBoss.maxHp)} (
                {Math.ceil((singleBoss.hp / Math.max(1, singleBoss.maxHp)) * 100)}%)
              </span>
            </div>
            <div className="h-2.5 rounded-full bg-[#120708] overflow-hidden border border-[#7F1D1D]">
              <div
                className="h-full bg-gradient-to-r from-[#991B1B] via-[#DC2626] to-[#F87171] transition-all duration-300"
                style={{ width: `${Math.max(0, (singleBoss.hp / Math.max(1, singleBoss.maxHp)) * 100)}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="hidden lg:flex items-center gap-1.5 order-2 overflow-x-auto max-w-md">
            <span className="text-[10px] text-[#9BB4AA] whitespace-nowrap">Lượt (SPD):</span>
            {turnQueue.slice(0, 7).map((uid, idx) => {
              const u = units.find((x) => x.id === uid);
              if (!u || u.hp <= 0) return null;
              const isCur = idx === turnIndex;
              return (
                <span
                  key={`${uid}_${idx}`}
                  className={`px-2 py-0.5 rounded text-[10px] border whitespace-nowrap ${
                    isCur
                      ? 'bg-[#D4A24C] text-[#1D150A] border-[#FFF1C4] font-bold'
                      : u.isAlly
                        ? 'bg-[#1C3833] text-[#DDF0E8] border-[#3F7066]'
                        : 'bg-[#3B1E20] text-[#F7D7D4] border-[#824143]'
                  }`}
                >
                  {u.name.split(' ').slice(-1)[0]}
                </span>
              );
            })}
          </div>
        )}

        {/* Right: Auto / x1-x2 Speed / Retreat */}
        <div className="order-2 sm:order-3 flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setAutoBattle((v) => !v)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1 transition-colors cursor-pointer ${
              autoBattle
                ? 'bg-[#D4A24C] text-[#1B140A] border-[#F8E2A6]'
                : 'bg-[#1D3532] text-[#E9DEC4] border-[#C9A45C]/50 hover:bg-[#274642]'
            }`}
          >
            {autoBattle ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{autoBattle ? 'Auto' : 'Tự Động'}</span>
          </button>
          <button
            type="button"
            onClick={() => setFastMode((v) => !v)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold border flex items-center gap-1 transition-colors cursor-pointer ${
              fastMode
                ? 'bg-[#2D8A68] text-white border-[#86EFAC]'
                : 'bg-[#1D3532] text-[#E9DEC4] border-[#C9A45C]/50'
            }`}
          >
            <FastForward className="w-3.5 h-3.5" />
            {fastMode ? 'x2' : 'x1'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-[#4E1E1B] hover:bg-[#6E2722] border border-[#E07A6B]/50 text-[#FDE8E6] cursor-pointer"
          >
            Thoát
          </button>
        </div>
      </header>

      {/* BOSS PHASE & COMBAT MECHANICS HUD STRIP */}
      {singleBoss && (() => {
        const arch: CombatArchetype = context.mode === 'world_boss' ? 'world_boss' : 'boss';
        const phase = getBossPhaseInfo(singleBoss.hp, singleBoss.maxHp, arch);
        if (!phase) return null;
        return (
          <div className="px-3 py-1 bg-[#140B1F]/95 border-b border-[#C9A45C]/45 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#F4E7C8]">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="px-2 py-0.5 rounded-full font-black text-[10px] text-white shadow"
                style={{ backgroundColor: phase.badgeColor }}
              >
                {phase.name}
              </span>
              <span className="font-mono text-[#FCA5A5]">
                Miễn Thương: <strong>{phase.damageReductionPct}%</strong>
              </span>
              <span className="font-mono text-[#C4B5FD]">
                Kháng Bạo: <strong>{phase.critResistPct}%</strong>
              </span>
              <span className="font-mono text-[#FDE68A]">
                Giáp: <strong>{formatNum(Math.round(singleBoss.def * (1 + phase.defBonusPct / 100)))}</strong>
              </span>
              {phase.atkBonusPct > 0 && (
                <span className="font-mono text-[#FB7185] font-bold">
                  Cuồng Nộ: +{phase.atkBonusPct}% Công
                </span>
              )}
            </div>
            {context.mode === 'world_boss' && (
              <div className="font-mono font-bold text-[#FDE047] flex items-center gap-2">
                <span>
                  ST Đợt Này: {worldBossDamageRef.current.toLocaleString('vi-VN')} / {formatNum(WORLD_BOSS_WAVE_CAP)}
                </span>
                <span className="text-[#94A3B8]">·</span>
                <span>Hiệp {round}/{context.worldBossMeta?.maxRounds ?? 5}</span>
              </div>
            )}
          </div>
        );
      })()}

      {/* 2. CENTER 2.5D LIVE BATTLE STAGE (~70% screen) */}
      <BattleStage
        mode={context.mode}
        targetId={context.targetId}
        bossId={context.bossDef?.id}
        arenaKey={context.bossDef?.arenaKey || context.realmDef?.arenaKey}
        allies={allies}
        enemies={enemies}
        activeUnitId={activeUnit?.id}
        activeUnitElement={activeUnit?.element}
        activeUnitIsAlly={activeUnit?.isAlly}
        selectedTargetId={selectedTargetId}
        nextComboElement={nextComboElement}
        actionAnim={actionAnim}
        hitUnitIds={hitUnitIds}
        impactVfx={impactVfx}
        floatingTexts={floatingTexts}
        screenShake={screenShake}
        fastMode={fastMode}
        vanKiemVfxRef={vanKiemVfxRef}
        isDimmed={stageDimmed}
        onSelectTarget={(enemyId) => {
          sfx.click();
          setSelectedTargetId(enemyId);
        }}
      />

      {/* 3. COMPACT BOTTOM HUD (Skill Deck left + Collapsible Translucent Combat Log right) */}
      <footer className="relative z-20 px-2 sm:px-4 pt-1.5 sm:pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] bg-[#0D1D1C]/92 border-t border-[#C9A45C]/55 backdrop-blur-sm shrink-0">
        <div className="max-w-[1220px] mx-auto flex flex-col lg:flex-row items-stretch lg:items-end justify-between gap-2">
          {/* Bottom-Left: Active Ally Skill Command Deck */}
          <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {deckAlly && (
              <div className="flex items-center justify-between sm:justify-start gap-2 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-xl bg-[#162C2A]/95 border border-[#C9A45C]/55 shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <DisciplePortrait
                    discipleId={deckAlly.id}
                    name={deckAlly.name}
                    glyph={deckAlly.glyph}
                    element={deckAlly.element}
                    realmIndex={deckAlly.realmIndex}
                    spiritRoot={deckAlly.spiritRoot}
                    size="sm"
                    borderColor={activeUnit?.id === deckAlly.id ? '#FDE047' : '#C9A45C'}
                  />
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-[#FCE6A6] truncate max-w-[110px]">{deckAlly.name}</div>
                    <div className="text-[10px] font-mono text-[#93C5FD]">
                      MP: {deckAlly.mp}/{deckAlly.maxMp}
                    </div>
                  </div>
                </div>
                <div className="text-[10px] text-[#BCE6CD] sm:hidden">
                  {activeUnit?.isAlly
                    ? isAnimating
                      ? 'Đang xuất chiêu...'
                      : 'Chọn chiêu'
                    : `Địch: ${activeUnit?.name.split(' ').slice(-1)[0] || '...'}`}
                </div>
              </div>
            )}

            <div className="flex-1 grid grid-cols-2 gap-1.5 sm:gap-2">
              {(deckAlly?.skills || []).map((sk) => {
                const effCost =
                  sk.mpCost > 0
                    ? Math.max(10, sk.mpCost - (deckAlly?.combatMods?.ultMpDiscount || 0))
                    : 0;
                const canCast = isPlayerTurn && activeUnit && activeUnit.mp >= effCost;
                const willCombo = Boolean(activeUnit?.isAlly && doesGenerateElement(comboElement, sk.element));
                return (
                  <button
                    key={sk.id}
                    type="button"
                    disabled={!canCast}
                    onClick={() => activeUnit && executeSkill(activeUnit, sk, selectedTargetId)}
                    className={`text-left px-2 py-1.5 sm:px-2.5 sm:py-2 rounded-xl border transition-all ${
                      canCast
                        ? willCombo
                          ? 'bg-gradient-to-r from-[#2D4532] to-[#3B391E] border-[#FDE047] hover:brightness-110 cursor-pointer shadow-[0_0_12px_rgba(253,224,71,0.28)]'
                          : 'bg-[#1D3936] border-[#C9A45C]/70 hover:border-[#F6DF9F] hover:bg-[#244642] cursor-pointer'
                        : 'bg-[#12201F]/90 border-[#2C4240] opacity-55 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                        <SkillIcon skillId={sk.id} name={sk.name} className="w-7 h-7 sm:w-8 sm:h-8 shrink-0" />
                        <div className="min-w-0">
                          <div className="font-bold text-[11px] sm:text-sm text-[#FCF1D2] truncate leading-tight">
                            {sk.name}
                          </div>
                          <div className="hidden sm:block text-[10px] text-[#C8DDD4] truncate">{sk.description}</div>
                        </div>
                      </div>
                      <span className="text-[9px] sm:text-[10px] font-mono font-bold text-[#93C5FD] whitespace-nowrap shrink-0">
                        {effCost > 0 ? `-${effCost}` : `+${25 + (deckAlly?.combatMods?.mpRegenPerTurn || 0)}`}
                      </span>
                    </div>
                    <div className="hidden sm:block text-[10px] text-[#F2D180] mt-0.5 truncate">{sk.comboBonusDesc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bottom-Right: Compact Collapsible Translucent Combat Log */}
          <div className="lg:w-[300px] shrink-0 rounded-xl bg-[#0B1716]/85 border border-[#C9A45C]/40 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowLog((v) => !v)}
              className="w-full px-2.5 py-1.5 flex items-center justify-between text-[11px] font-semibold text-[#E8D7AD] hover:bg-[#152827] cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <Swords className="w-3.5 h-3.5 text-[#D4A24C]" />
                Chiến Báo ({combatLog.length})
              </span>
              {showLog ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
            </button>
            {showLog && (
              <div className="px-2.5 pb-2 max-h-20 overflow-y-auto space-y-0.5 text-[10px] text-[#C7D8D0]">
                {combatLog.map((line, i) => (
                  <div key={i} className={i === 0 ? 'text-[#FCE7A7] font-medium' : 'opacity-80'}>
                    {line}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </footer>

      {/* Victory / Defeat Result Modal (Preserved 100%) */}
      {battleOutcome && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-lg scroll-parchment p-4 sm:p-5 text-[#24211C] space-y-4">
            <div className="flex items-center justify-between border-b border-[#D5C39E] pb-3">
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    battleOutcome.victory ? 'bg-[#D4A24C]/25 text-[#9A6914]' : 'bg-[#C84332]/20 text-[#B91C1C]'
                  }`}
                >
                  {battleOutcome.victory ? <Trophy className="w-6 h-6" /> : <RotateCcw className="w-6 h-6" />}
                </div>
                <div>
                  <h3
                    className="text-2xl font-bold"
                    style={{
                      fontFamily: 'var(--font-display)',
                      color: battleOutcome.victory ? '#8A5A0F' : '#A62820',
                    }}
                  >
                    {battleOutcome.victory ? 'Đại Thắng Trở Về!' : 'Thất Bại Trong Gang Tấc'}
                  </h3>
                  <p className="text-xs text-[#6B5F4E]">
                    {battleOutcome.victory
                      ? `Hoàn thành ${context.title} sau ${round} hiệp.`
                      : 'Hãy đột phá cảnh giới, cường hóa trang bị hoặc đổi đội hình khắc hệ Ngũ Hành.'}
                  </p>
                </div>
              </div>
            </div>

            {battleOutcome.victory && battleOutcome.rewards && (
              <div className="space-y-3">
                {battleOutcome.rewards.worldBossDamage && battleOutcome.rewards.worldBossDamage > 0 && (
                  <div className="p-3 rounded-xl bg-gradient-to-r from-[#3B0764] via-[#7F1D1D] to-[#9A3412] border border-[#FACC15] text-[#FEF3C7] flex items-center justify-between gap-2 shadow-lg">
                    <div>
                      <div className="text-[11px] uppercase tracking-wider text-[#FDE047] font-bold">
                        Sát Thương Đóng Góp · Boss Thế Giới Toàn Server
                      </div>
                      <div className="text-xl font-black font-mono text-white">
                        {battleOutcome.rewards.worldBossDamage.toLocaleString('vi-VN')} ST
                      </div>
                    </div>
                    <span className="text-[11px] px-2.5 py-1 rounded-full bg-black/35 border border-[#FDE047]/60 text-[#FDE047] font-bold">
                      Đã ghi nhận vào BXH!
                    </span>
                  </div>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-mono tabular-nums">
                  <div className="p-2 rounded bg-[#ECE3CE] border border-[#D4C39F] flex items-center gap-1.5">
                    <ResourceIcon resource="linhThach" size="xs" />
                    <span>
                      Linh Thạch: <strong className="text-[#8A5A0F]">+{formatNum(battleOutcome.rewards.linhThach)}</strong>
                    </span>
                  </div>
                  <div className="p-2 rounded bg-[#ECE3CE] border border-[#D4C39F] flex items-center gap-1.5">
                    <ResourceIcon resource="linhKhi" size="xs" />
                    <span>
                      Linh Khí: <strong className="text-[#1D5E8C]">+{formatNum(battleOutcome.rewards.linhKhi)}</strong>
                    </span>
                  </div>
                  <div className="p-2 rounded bg-[#ECE3CE] border border-[#D4C39F] flex items-center gap-1.5">
                    <ResourceIcon resource="linhThao" size="xs" />
                    <span>
                      Linh Thảo: <strong className="text-[#257A52]">+{formatNum(battleOutcome.rewards.linhThao)}</strong>
                    </span>
                  </div>
                  <div className="p-2 rounded bg-[#ECE3CE] border border-[#D4C39F] flex items-center gap-1.5">
                    <ResourceIcon resource="huyenThiet" size="xs" />
                    <span>
                      Huyền Thiết: <strong>+{formatNum(battleOutcome.rewards.huyenThiet)}</strong>
                    </span>
                  </div>
                  <div className="p-2 rounded bg-[#ECE3CE] border border-[#D4C39F] flex items-center gap-1.5">
                    <ResourceIcon resource="cuongHoaThach" size="xs" />
                    <span>
                      Cường Hóa Thạch: <strong>+{battleOutcome.rewards.cuongHoaThach}</strong>
                    </span>
                  </div>
                  <div className="p-2 rounded bg-[#ECE3CE] border border-[#D4C39F] flex items-center gap-1.5">
                    <ResourceIcon resource="tienNgoc" size="xs" />
                    <span>
                      Tiên Ngọc: <strong className="text-[#15803D]">+{battleOutcome.rewards.tienNgoc}</strong>
                    </span>
                  </div>
                  {battleOutcome.rewards.tinhHoaBoss > 0 && (
                    <div className="p-2 rounded bg-[#FCEBEA] border border-[#D4574E] col-span-2 sm:col-span-3 flex items-center gap-1.5">
                      <ResourceIcon resource="tinhHoaBoss" size="sm" />
                      <span>
                        Tinh Hoa Boss (Nâng bậc Tiên Khí/Thần Khí):{' '}
                        <strong className="text-[#B92B27]">+{battleOutcome.rewards.tinhHoaBoss}</strong>
                      </span>
                    </div>
                  )}
                </div>

                {/* Dropped Equipment & Gems */}
                <div className="space-y-1.5">
                  <div className="text-xs font-semibold text-[#5C4E3A]">Chiến Lợi Phẩm Trang Bị &amp; Linh Ngọc</div>
                  <div className="space-y-1.5 max-h-44 overflow-y-auto">
                    {battleOutcome.rewards.droppedEquipment.map((eq) => {
                      const rm = RARITY_META[eq.rarity];
                      return (
                        <div
                          key={eq.id}
                          className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg border text-xs"
                          style={{ backgroundColor: rm.bg, borderColor: rm.border }}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <RarityFrameBox rarity={eq.rarity} size="sm">
                              <EquipmentSlotIcon slot={eq.slot} className="w-7 h-7" />
                            </RarityFrameBox>
                            <div className="min-w-0">
                              <span className="font-bold" style={{ color: rm.color }}>
                                [{rm.name}] {eq.name}
                              </span>
                              {eq.setId && (
                                <span className="ml-1.5 text-[11px] font-semibold text-[#8A5A0F]">
                                  · {EQUIPMENT_SETS[eq.setId]?.name}
                                </span>
                              )}
                            </div>
                          </div>
                          <span className="text-[11px] text-[#5C5347] shrink-0">{eq.subStats.length} dòng ẩn</span>
                        </div>
                      );
                    })}
                    {battleOutcome.rewards.droppedGems.map((gem) => (
                      <div
                        key={gem.id}
                        className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-[#E9F3EE] border border-[#7AB098] text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <RarityFrameBox rarity={gemTierToRarity(gem.tier)} size="sm">
                            <GemSprite element={gem.element} tier={gem.tier} className="w-7 h-7" />
                          </RarityFrameBox>
                          <span className="font-semibold text-[#1D5E46]">{gem.name}</span>
                        </div>
                        <span className="font-mono text-[11px]">+{gem.statValue}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {!battleOutcome.victory && <FiveElementDiagram />}

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => onFinish(battleOutcome.victory, battleOutcome.rewards)}
                className="px-5 py-2.5 rounded-lg bg-[#1E3B38] hover:bg-[#284E4A] text-[#F7E5B4] font-semibold text-sm border border-[#C9A45C] cursor-pointer"
              >
                {battleOutcome.victory ? 'Nhận Thưởng & Trở Về Tông Môn' : 'Trở Về Tông Môn'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
