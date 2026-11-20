import React, { useEffect, useRef, useState } from 'react';
import {
  BUILDING_DEFS,
  ELEMENT_META,
  EQUIPMENT_SETS,
  EQUIPMENT_SLOTS,
  EQUIPMENT_TIERS,
  LEGENDARY_BOSSES,
  RARITY_META,
  REALM_LADDER,
  RECHARGE_PACKS,
  SECRET_REALMS,
  SPIRIT_ROOT_META,
  STAMINA_PACKS,
  VIP_FASHIONS,
  VIP_MILESTONE_REWARDS,
  VIP_SHOP_ITEMS,
} from './data/constants';
import {
  ActiveModal,
  BuildingId,
  CombatContext,
  EquipmentSlot,
  GameState,
  GemItem,
  SecretRealmDef,
  VipFashionId,
} from './types/game';
import {
  calculateBreakthroughChance,
  calculateOfflineRewards,
  computeTotalSectPower,
  createDefaultVipState,
  createGem,
  createInitialGameState,
  formatNum,
  genId,
  generateDisciple,
  generateEquipment,
  generateMarketListings,
  generateMythicSetBundle,
  getBuildingProductionPerMin,
  getBuildingUpgradeCost,
  getEquipmentPower,
  getVipLevel,
  pick,
  rollRarity,
} from './utils/gameLogic';
import { sfx } from './utils/sound';
import { SectMapView } from './components/SectMapView';
import { CombatArena, BattleVictoryRewards } from './components/CombatArena';
import { SectBuildingsModal } from './components/SectBuildingsModal';
import { DisciplesModal } from './components/DisciplesModal';
import { EquipmentModal } from './components/EquipmentModal';
import { WorldRealmModal } from './components/WorldRealmModal';
import { AllianceMarketModal } from './components/AllianceMarketModal';
import { OfflineIdleModal } from './components/OfflineIdleModal';
import { VipModal } from './components/VipModal';
import { DisciplePortrait, ResourceIcon } from './components/ElementIcons';
import {
  ArrowUpCircle,
  Bot,
  ChevronDown,
  Clock,
  Compass,
  Crown,
  Gem,
  Gift,
  Hammer,
  Handshake,
  MessageSquare,
  Plus,
  ScrollText,
  Send,
  Shield,
  ShoppingBag,
  Skull,
  Sparkles,
  Swords,
  Trophy,
  Users,
  Volume2,
  VolumeX,
} from 'lucide-react';

const SAVE_KEY = 'thanh_van_tien_tong_save_v1';

function loadGameState(): GameState {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return createInitialGameState();
    const parsed = JSON.parse(raw) as GameState;
    if (!parsed || !parsed.disciples || !parsed.buildings) {
      return createInitialGameState();
    }
    const now = Date.now();
    const offlineSec = Math.max(0, Math.floor((now - (parsed.lastActiveAt || now)) / 1000));
    return {
      ...parsed,
      vip: {
        ...createDefaultVipState(),
        ...(parsed.vip || {}),
      },
      lastActiveAt: now,
      pendingOfflineSeconds: Math.min(12 * 3600, (parsed.pendingOfflineSeconds || 0) + offlineSec),
    };
  } catch {
    return createInitialGameState();
  }
}

export default function App() {
  const [state, setState] = useState<GameState>(loadGameState);
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [selectedBuildingId, setSelectedBuildingId] = useState<BuildingId | null>(null);
  const [selectedEquipDiscipleId, setSelectedEquipDiscipleId] = useState<string | null>(null);
  const [worldTab, setWorldTab] = useState<'realms' | 'bosses' | 'leaderboard'>('realms');
  const [allianceTab, setAllianceTab] = useState<'alliance' | 'veins' | 'market'>('alliance');
  const [vipTab, setVipTab] = useState<'recharge' | 'shop' | 'auto' | 'fashion'>('recharge');
  const [activeCombat, setActiveCombat] = useState<CombatContext | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [chatText, setChatText] = useState('');
  const [showChatBox, setShowChatBox] = useState(false);
  const [showChatInput, setShowChatInput] = useState(false);
  const [showAutoMenu, setShowAutoMenu] = useState(false);
  const [showQuestPanel, setShowQuestPanel] = useState(false);
  const [showRightMenu, setShowRightMenu] = useState(false);

  const toastTimer = useRef<number | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2800);
  };

  // Sync sound engine enabled state
  useEffect(() => {
    sfx.enabled = state.soundEnabled;
  }, [state.soundEnabled]);

  // Persist to localStorage automatically
  useEffect(() => {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    } catch {
      // Ignore storage quota errors
    }
  }, [state]);

  // Real-time 1-second production, cultivation & stamina tick
  useEffect(() => {
    const interval = window.setInterval(() => {
      setState((prev) => {
        const nextBuildings = { ...prev.buildings };
        (Object.keys(BUILDING_DEFS) as BuildingId[]).forEach((bId) => {
          const def = BUILDING_DEFS[bId];
          if (!def.resourceProduced) return;
          const ratePerSec = getBuildingProductionPerMin(prev, bId) / 60;
          const maxCap = Math.max(200, Math.round(ratePerSec * 3600 * 4));
          nextBuildings[bId] = {
            ...nextBuildings[bId],
            storedResource: Math.min(maxCap, nextBuildings[bId].storedResource + ratePerSec),
          };
        });

        // Passive cultivation Qi for every disciple based on Tụ Linh Trận + Linh Căn
        const baseQiTick = (getBuildingProductionPerMin(prev, 'tu_linh_tran') / 60) * 0.45;
        const nextDisciples = prev.disciples.map((d) => {
          if (d.qi >= d.maxQi) return d;
          const rootMult = SPIRIT_ROOT_META[d.spiritRoot].qiSpeedMult;
          const aptMult = 0.75 + d.aptitude.ngoTinh / 150;
          const gain = baseQiTick * rootMult * aptMult;
          return { ...d, qi: Math.min(d.maxQi, d.qi + gain) };
        });

        // Stamina regens +1 every 10 seconds
        const tickCount = Math.floor(Date.now() / 1000);
        const staminaGain = tickCount % 10 === 0 && prev.resources.stamina < prev.resources.maxStamina ? 1 : 0;

        return {
          ...prev,
          buildings: nextBuildings,
          disciples: nextDisciples,
          resources: {
            ...prev.resources,
            stamina:
              staminaGain > 0
                ? Math.min(prev.resources.maxStamina, prev.resources.stamina + staminaGain)
                : prev.resources.stamina,
          },
          lastActiveAt: Date.now(),
          pendingOfflineSeconds: Math.min(12 * 3600, prev.pendingOfflineSeconds + 1),
        };
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  const vipLevel = getVipLevel(state.vip.points);
  const unclaimedVipCount = VIP_MILESTONE_REWARDS.filter(
    (m) => vipLevel >= m.level && !state.vip.claimedMilestones.includes(m.level),
  ).length;

  // VIP 5+: Auto nâng cấp (đột phá cảnh giới) đệ tử khi đủ Linh Khí & tự mặc trang bị tốt nhất mỗi 3.5 giây
  useEffect(() => {
    if (vipLevel < 5 || !state.vip.autoDiscipleEnabled) return;
    const timer = window.setInterval(() => {
      setState((prev) => {
        if (getVipLevel(prev.vip.points) < 5 || !prev.vip.autoDiscipleEnabled) return prev;
        const nextR = { ...prev.resources };
        let nextQuests = prev.quests;
        let nextChat = prev.chatMessages;
        const newLogs: string[] = [];
        let changed = false;

        // 1. Auto-breakthrough any disciple who has reached maxQi
        let nextDisciples = prev.disciples.map((d) => {
          if (d.qi < d.maxQi || d.realmIndex >= REALM_LADDER.length - 1) return d;
          changed = true;
          let pillsUsed = 0;
          while (
            pillsUsed < 3 &&
            pillsUsed < nextR.dotPhaDan &&
            calculateBreakthroughChance(d, pillsUsed) < 95
          ) {
            pillsUsed += 1;
          }
          const chance = calculateBreakthroughChance(d, pillsUsed);
          nextR.dotPhaDan = Math.max(0, nextR.dotPhaDan - pillsUsed);
          const success = Math.random() * 100 < chance;
          const nextStage = REALM_LADDER[d.realmIndex + 1];

          if (success) {
            nextQuests = nextQuests.map((q) =>
              q.id === 'q_main_1' ? { ...q, progress: Math.min(q.target, q.progress + 1) } : q,
            );
            newLogs.push(
              `[VIP 5 Độ Kiếp] ${d.name} đột phá thành công lên ${nextStage.fullName}${pillsUsed > 0 ? ` (dùng ${pillsUsed} Đan)` : ''}!`,
            );
            nextChat = [
              {
                id: genId('chat'),
                channel: 'he_thong' as const,
                sender: 'Hệ Thống',
                text: `[Auto VIP 5] ${d.name} độ kiếp thành công, tấn thăng ${nextStage.fullName}!`,
                timestamp: Date.now(),
              },
              ...nextChat,
            ].slice(0, 30);
            return {
              ...d,
              realmIndex: d.realmIndex + 1,
              qi: 0,
              maxQi: nextStage.qiRequired,
            };
          }

          newLogs.push(
            `[VIP 5 Độ Kiếp] ${d.name} thử đột phá ${nextStage.fullName} chưa thành (tỷ lệ ${chance}%, giữ 68% tu vi).`,
          );
          return {
            ...d,
            qi: Math.round(d.maxQi * 0.68),
          };
        });

        // 2. Auto quick-equip best gear for disciples (formation disciples first)
        const nextInv = prev.inventory.map((eq) => ({ ...eq }));
        const invById = new Map(nextInv.map((eq) => [eq.id, eq]));
        const priorityIndices = nextDisciples
          .map((d, idx) => ({ d, idx }))
          .sort((a, b) => {
            if (a.d.inFormation !== b.d.inFormation) return a.d.inFormation ? -1 : 1;
            return a.d.formationOrder - b.d.formationOrder;
          });

        let totalEquippedUpgrades = 0;
        const updatedDisciples = [...nextDisciples];

        for (const { idx } of priorityIndices) {
          const disc = updatedDisciples[idx];
          const nextEqMap = { ...disc.equipped };
          let discChanged = false;

          for (const { slot } of EQUIPMENT_SLOTS) {
            const currentId = nextEqMap[slot];
            const currentItem = currentId ? invById.get(currentId) : undefined;
            const currentPwr = currentItem ? getEquipmentPower(currentItem) : -1;

            let bestItem = currentItem;
            let bestPwr = currentPwr;

            for (const eq of nextInv) {
              if (eq.slot !== slot) continue;
              if (eq.equippedBy && eq.equippedBy !== disc.id) continue;
              const pwr = getEquipmentPower(eq);
              if (pwr > bestPwr) {
                bestPwr = pwr;
                bestItem = eq;
              }
            }

            if (bestItem && bestItem.id !== currentId) {
              if (currentItem) currentItem.equippedBy = null;
              bestItem.equippedBy = disc.id;
              nextEqMap[slot] = bestItem.id;
              discChanged = true;
              totalEquippedUpgrades += 1;
            }
          }

          if (discChanged) {
            updatedDisciples[idx] = { ...disc, equipped: nextEqMap };
          }
        }

        if (totalEquippedUpgrades > 0) {
          changed = true;
          nextDisciples = updatedDisciples;
          newLogs.push(`[VIP 5 Trang Bị] Tự động mặc ${totalEquippedUpgrades} món trang bị mạnh hơn cho đội hình!`);
        }

        if (!changed) return prev;

        return {
          ...prev,
          resources: nextR,
          disciples: nextDisciples,
          inventory: nextInv,
          quests: nextQuests,
          chatMessages: nextChat,
          vip: {
            ...prev.vip,
            autoActivityLogs: [...newLogs, ...prev.vip.autoActivityLogs].slice(0, 14),
          },
        };
      });
    }, 3500);
    return () => window.clearInterval(timer);
  }, [vipLevel, state.vip.autoDiscipleEnabled]);

  // VIP 6+: Tự động hóa toàn bộ công việc Tông Môn mỗi 4 giây
  useEffect(() => {
    if (vipLevel < 6 || !state.vip.autoSectEnabled) return;
    const timer = window.setInterval(() => {
      setState((prev) => {
        if (getVipLevel(prev.vip.points) < 6 || !prev.vip.autoSectEnabled) return prev;
        const nextB = { ...prev.buildings };
        const nextR = { ...prev.resources };

        // 1. Auto-harvest all 7 buildings
        (Object.keys(BUILDING_DEFS) as BuildingId[]).forEach((bId) => {
          const def = BUILDING_DEFS[bId];
          if (!def.resourceProduced) return;
          const amt = Math.floor(nextB[bId].storedResource);
          if (amt >= 1) {
            nextB[bId] = { ...nextB[bId], storedResource: nextB[bId].storedResource - amt };
            nextR[def.resourceProduced] += amt;
          }
        });

        // 2. Auto-infuse Linh Khí to disciples who haven't reached maxQi
        const nextDisciples = prev.disciples.map((d) => {
          if (d.qi >= d.maxQi || nextR.linhKhi < 50) return d;
          const need = Math.ceil(d.maxQi - d.qi);
          const give = Math.min(nextR.linhKhi, need);
          nextR.linhKhi -= give;
          return { ...d, qi: Math.min(d.maxQi, d.qi + give) };
        });

        // 3. Auto-refine Đột Phá Đan when surplus herbs & stones
        if (nextR.linhThao >= 200 && nextR.linhThach >= 600) {
          const pillGain = 1 + Math.floor(nextB.luyen_dan_phong.level / 3);
          nextR.linhThao -= 90;
          nextR.linhThach -= 200;
          nextR.dotPhaDan += pillGain;
        }

        // 4. Auto-claim completed quests
        const nextQuests = prev.quests.map((q) => {
          if (q.progress >= q.target && !q.claimed) {
            nextR.linhThach += q.reward.linhThach || 0;
            nextR.tienNgoc += q.reward.tienNgoc || 0;
            nextR.linhThao += q.reward.linhThao || 0;
            nextR.dotPhaDan += q.reward.dotPhaDan || 0;
            nextR.cuongHoaThach += q.reward.cuongHoaThach || 0;
            return { ...q, claimed: true };
          }
          return q;
        });

        // 5. Periodic Spirit Vein auto-tribute (small slice per 4s cycle)
        const ownedVeins = prev.spiritVeins.filter((v) => v.isOwnedByPlayer);
        const veinStone = Math.round(ownedVeins.reduce((s, v) => s + v.linhThachPerHour / 90, 0));
        nextR.linhThach += veinStone;

        return {
          ...prev,
          buildings: nextB,
          disciples: nextDisciples,
          resources: nextR,
          quests: nextQuests,
        };
      });
    }, 4000);
    return () => window.clearInterval(timer);
  }, [vipLevel, state.vip.autoSectEnabled]);

  // VIP 7+: Auto tự nâng ngọc (hợp nhất 3 viên cùng hệ & bậc -> bậc cao hơn tới Bậc 5) & tự khảm ngọc vào trang bị mỗi 4 giây
  useEffect(() => {
    if (vipLevel < 7 || !state.vip.autoGemEnabled) return;
    const timer = window.setInterval(() => {
      setState((prev) => {
        if (getVipLevel(prev.vip.points) < 7 || !prev.vip.autoGemEnabled) return prev;
        let nextGems: GemItem[] = [...prev.gems];
        const nextInv = prev.inventory.map((eq) => ({ ...eq, sockets: [...eq.sockets] }));
        const newLogs: string[] = [];
        let changed = false;

        // 1. Auto-fuse 3 identical element + tier gems into tier + 1 (up to tier 5)
        let fuseCount = 0;
        let maxFusedTier = 1;
        let didFuse = true;
        while (didFuse && fuseCount < 8) {
          didFuse = false;
          const groups = new Map<string, GemItem[]>();
          for (const g of nextGems) {
            if (g.tier >= 5) continue;
            const key = `${g.element}_${g.tier}`;
            const list = groups.get(key) || [];
            list.push(g);
            groups.set(key, list);
          }
          for (const [, list] of groups.entries()) {
            if (list.length >= 3) {
              const toConsume = new Set(list.slice(0, 3).map((g) => g.id));
              const sample = list[0];
              const upgraded = createGem(sample.element, sample.tier + 1);
              nextGems = [upgraded, ...nextGems.filter((g) => !toConsume.has(g.id))];
              fuseCount += 1;
              maxFusedTier = Math.max(maxFusedTier, upgraded.tier);
              didFuse = true;
              break;
            }
          }
        }

        if (fuseCount > 0) {
          changed = true;
          newLogs.push(
            `[VIP 7 Nâng Ngọc] Hợp nhất ${fuseCount} lần, tạo thành Linh Ngọc Bậc ${maxFusedTier}!`,
          );
        }

        // 2. Auto-socket / upgrade gems into equipped gear (formation disciples first)
        const discPriority = [...prev.disciples].sort((a, b) => {
          if (a.inFormation !== b.inFormation) return a.inFormation ? -1 : 1;
          return a.formationOrder - b.formationOrder;
        });

        let socketedCount = 0;
        const gemScore = (g: GemItem, preferredEl: string) =>
          g.tier * 10000 + (g.element === preferredEl ? 500 : 0) + g.statValue;

        for (const disc of discPriority) {
          if (nextGems.length === 0) break;
          const equippedIds = new Set(Object.values(disc.equipped).filter(Boolean) as string[]);

          for (const eq of nextInv) {
            if (!equippedIds.has(eq.id)) continue;
            for (let sIdx = 0; sIdx < eq.sockets.length; sIdx++) {
              if (nextGems.length === 0) break;
              nextGems.sort((a, b) => gemScore(b, disc.element) - gemScore(a, disc.element));
              const bestGem = nextGems[0];
              const currentGem = eq.sockets[sIdx];

              const shouldReplace =
                !currentGem ||
                bestGem.tier > currentGem.tier ||
                (bestGem.tier === currentGem.tier &&
                  bestGem.element === disc.element &&
                  currentGem.element !== disc.element);

              if (shouldReplace) {
                eq.sockets[sIdx] = bestGem;
                nextGems = nextGems.slice(1);
                if (currentGem) nextGems.push(currentGem);
                socketedCount += 1;
              }
            }
          }
        }

        if (socketedCount > 0) {
          changed = true;
          newLogs.push(
            `[VIP 7 Khảm Ngọc] Tự động khảm/nâng cấp ${socketedCount} viên Linh Ngọc vào trang bị đang mặc!`,
          );
        }

        if (!changed) return prev;

        return {
          ...prev,
          gems: nextGems.slice(0, 80),
          inventory: nextInv,
          vip: {
            ...prev.vip,
            autoActivityLogs: [...newLogs, ...prev.vip.autoActivityLogs].slice(0, 14),
          },
        };
      });
    }, 4000);
    return () => window.clearInterval(timer);
  }, [vipLevel, state.vip.autoGemEnabled]);

  // VIP 10+: Tự động hóa đánh Thế Giới (Bí Cảnh & Chọn Boss Đánh) mỗi 5 giây
  useEffect(() => {
    if (vipLevel < 10 || !state.vip.autoWorldEnabled || activeCombat) return;
    const timer = window.setInterval(() => {
      setState((prev) => {
        if (getVipLevel(prev.vip.points) < 10 || !prev.vip.autoWorldEnabled) return prev;
        const myPwr = computeTotalSectPower(prev);
        const targetMode = prev.vip.autoWorldBossId || 'auto';

        const runBossHunt = (boss: (typeof LEGENDARY_BOSSES)[number], isTargeted: boolean) => {
          const minRequired = Math.round(boss.recommendedPower * 0.68);
          if (myPwr < minRequired) {
            return {
              ...prev,
              vip: {
                ...prev.vip,
                autoWorldLogs: [
                  `[Tạm dừng] Thực lực (${formatNum(myPwr)}) chưa đủ Auto đánh ${boss.name} (cần ≥${formatNum(minRequired)}). Hãy chọn Boss khác hoặc tăng lực!`,
                  ...prev.vip.autoWorldLogs,
                ].slice(0, 14),
              },
            };
          }
          const cost = Math.max(5, Math.floor(boss.staminaCost * 0.5)); // VIP 10 50% stamina discount
          if (prev.resources.stamina < cost) {
            return {
              ...prev,
              vip: {
                ...prev.vip,
                autoWorldLogs: [
                  `[Tạm dừng] Thiếu Thể Lực (${prev.resources.stamina}/${cost}) để Auto săn ${boss.name}. Hãy mua thêm Thể Lực!`,
                  ...prev.vip.autoWorldLogs,
                ].slice(0, 14),
              },
            };
          }
          const eq = generateEquipment({ rarity: boss.guaranteedMinRarity, setId: boss.setId });
          const gem = createGem(boss.element, 2);
          const lt = Math.round(boss.recommendedPower * 0.22);
          const lk = Math.round(boss.recommendedPower * 0.25);
          const essence = Math.max(2, Math.round(boss.recommendedPower / 10000) + 1);

          return {
            ...prev,
            resources: {
              ...prev.resources,
              stamina: prev.resources.stamina - cost,
              linhThach: prev.resources.linhThach + lt,
              linhKhi: prev.resources.linhKhi + lk,
              tinhHoaBoss: prev.resources.tinhHoaBoss + essence,
              tienNgoc: prev.resources.tienNgoc + 35,
            },
            defeatedBosses: {
              ...prev.defeatedBosses,
              [boss.id]: (prev.defeatedBosses[boss.id] || 0) + 1,
            },
            inventory: [eq, ...prev.inventory].slice(0, 120),
            gems: [gem, ...prev.gems].slice(0, 80),
            quests: prev.quests.map((q) =>
              q.id === 'q_daily_1' ? { ...q, progress: Math.min(q.target, q.progress + 1) } : q,
            ),
            vip: {
              ...prev.vip,
              autoWorldLogs: [
                `[${isTargeted ? 'Auto Boss · Chỉ Định' : 'Auto Boss'}] Hạ gục ${boss.name}: +${formatNum(lt)} LT, +${essence} Tinh Hoa & [${RARITY_META[eq.rarity].name}] ${eq.name}!`,
                ...prev.vip.autoWorldLogs,
              ].slice(0, 14),
            },
          };
        };

        // 1. If player explicitly picked a Boss to farm
        const pickedBoss = LEGENDARY_BOSSES.find((b) => b.id === targetMode);
        if (pickedBoss) {
          return runBossHunt(pickedBoss, true);
        }

        // 2. If auto-balanced mode, 45% chance to hunt highest beatable Boss
        if (targetMode !== 'realm_only') {
          const beatableBosses = LEGENDARY_BOSSES.filter((b) => myPwr >= b.recommendedPower * 0.68);
          if (beatableBosses.length > 0 && Math.random() < 0.45) {
            return runBossHunt(beatableBosses[beatableBosses.length - 1], false);
          }
        }

        // 3. Otherwise auto-clear highest suitable Secret Realm
        const suitableRealms = SECRET_REALMS.filter((r) => myPwr >= r.recommendedPower * 0.65);
        const realm = suitableRealms[suitableRealms.length - 1] || SECRET_REALMS[0];
        const cost = Math.max(4, Math.floor(realm.staminaCost * 0.5));
        if (prev.resources.stamina < cost) {
          return {
            ...prev,
            vip: {
              ...prev.vip,
              autoWorldLogs: [
                `[Tạm dừng] Thiếu Thể Lực (${prev.resources.stamina}/${cost}) để Auto ${realm.name}. Hãy mua Thể Lực trong Tiệm VIP!`,
                ...prev.vip.autoWorldLogs,
              ].slice(0, 14),
            },
          };
        }

        const eq = generateEquipment({ rarity: rollRarity(realm.rewards.dropRarityPool) });
        const gem = createGem(realm.element, 1);
        const nextCleared = prev.clearedRealms.includes(realm.id)
          ? prev.clearedRealms
          : [...prev.clearedRealms, realm.id];

        return {
          ...prev,
          clearedRealms: nextCleared,
          resources: {
            ...prev.resources,
            stamina: prev.resources.stamina - cost,
            linhThach: prev.resources.linhThach + realm.rewards.linhThach,
            linhThao: prev.resources.linhThao + realm.rewards.linhThao,
            huyenThiet: prev.resources.huyenThiet + realm.rewards.huyenThiet,
            cuongHoaThach: prev.resources.cuongHoaThach + realm.rewards.cuongHoaThach,
            linhKhi: prev.resources.linhKhi + realm.rewards.linhKhi,
            tienNgoc: prev.resources.tienNgoc + 15,
          },
          inventory: [eq, ...prev.inventory].slice(0, 120),
          gems: [gem, ...prev.gems].slice(0, 80),
          quests: prev.quests.map((q) =>
            q.id === 'q_daily_1' ? { ...q, progress: Math.min(q.target, q.progress + 1) } : q,
          ),
          vip: {
            ...prev.vip,
            autoWorldLogs: [
              `[Auto Bí Cảnh] Quét ${realm.name}: +${formatNum(realm.rewards.linhThach)} LT, +${formatNum(realm.rewards.linhKhi)} LK & [${RARITY_META[eq.rarity].name}] ${eq.name}!`,
              ...prev.vip.autoWorldLogs,
            ].slice(0, 14),
          },
        };
      });
    }, 5000);
    return () => window.clearInterval(timer);
  }, [vipLevel, state.vip.autoWorldEnabled, state.vip.autoWorldBossId, activeCombat]);

  const totalPower = computeTotalSectPower(state);
  const master = state.disciples[0];
  const masterRealm = master ? REALM_LADDER[master.realmIndex] : REALM_LADDER[0];

  const updateQuestProgress = (quests: GameState['quests'], questId: string, delta = 1) =>
    quests.map((q) => (q.id === questId ? { ...q, progress: Math.min(q.target, q.progress + delta) } : q));

  // ---- BUILDING HANDLERS ----
  const handleHarvestBuilding = (id: BuildingId) => {
    const def = BUILDING_DEFS[id];
    const amt = Math.floor(state.buildings[id].storedResource);
    if (!def.resourceProduced || amt <= 0) return;
    const labelMap: Record<string, string> = {
      linhThach: 'Linh Thạch',
      linhKhi: 'Linh Khí',
      linhThao: 'Linh Thảo',
      huyenThiet: 'Huyền Thiết',
      cuongHoaThach: 'Cường Hóa Thạch',
      dotPhaDan: 'Đột Phá Đan',
    };
    sfx.harvest();
    setState((prev) => ({
      ...prev,
      buildings: {
        ...prev.buildings,
        [id]: { ...prev.buildings[id], storedResource: prev.buildings[id].storedResource - amt },
      },
      resources: {
        ...prev.resources,
        [def.resourceProduced!]: prev.resources[def.resourceProduced!] + amt,
      },
    }));
    showToast(`Thu hoạch +${formatNum(amt)} ${labelMap[def.resourceProduced] || ''} (${def.shortName})`);
  };

  const handleHarvestAll = () => {
    const readyCount = (Object.keys(BUILDING_DEFS) as BuildingId[]).filter((bId) => {
      const def = BUILDING_DEFS[bId];
      return def.resourceProduced && Math.floor(state.buildings[bId].storedResource) > 0;
    }).length;
    if (readyCount <= 0) {
      showToast('Tài nguyên đang được khai thác.');
      return;
    }
    sfx.harvest();
    setState((prev) => {
      const nextB = { ...prev.buildings };
      const nextR = { ...prev.resources };
      (Object.keys(BUILDING_DEFS) as BuildingId[]).forEach((bId) => {
        const def = BUILDING_DEFS[bId];
        if (!def.resourceProduced) return;
        const amt = Math.floor(nextB[bId].storedResource);
        if (amt > 0) {
          nextB[bId] = { ...nextB[bId], storedResource: nextB[bId].storedResource - amt };
          nextR[def.resourceProduced] += amt;
        }
      });
      return { ...prev, buildings: nextB, resources: nextR };
    });
    showToast(`Đã thu hoạch toàn bộ tài nguyên từ ${readyCount} công trình!`);
  };

  const handleUpgradeBuilding = (id: BuildingId) => {
    const bState = state.buildings[id];
    const cost = getBuildingUpgradeCost(id, bState.level);
    if (
      state.resources.linhThach < cost.linhThach ||
      state.resources.linhThao < cost.linhThao ||
      state.resources.huyenThiet < cost.huyenThiet
    ) {
      return;
    }
    sfx.upgrade();
    setState((prev) => {
      const nextLevel = prev.buildings[id].level + 1;
      const extraStamina = id === 'truyen_tong_tran' ? 15 : 0;
      return {
        ...prev,
        sectLevel: prev.sectLevel + 1,
        resources: {
          ...prev.resources,
          linhThach: prev.resources.linhThach - cost.linhThach,
          linhThao: prev.resources.linhThao - cost.linhThao,
          huyenThiet: prev.resources.huyenThiet - cost.huyenThiet,
          maxStamina: prev.resources.maxStamina + extraStamina,
          stamina: prev.resources.stamina + extraStamina,
        },
        buildings: {
          ...prev.buildings,
          [id]: { ...prev.buildings[id], level: nextLevel },
        },
        quests: updateQuestProgress(prev.quests, 'q_side_1', 1),
      };
    });
    showToast(`Nâng cấp ${BUILDING_DEFS[id].name} lên Cấp ${bState.level + 1} thành công!`);
  };

  const handleAssignDisciple = (discipleId: string, buildingId: BuildingId | null) => {
    sfx.click();
    setState((prev) => ({
      ...prev,
      disciples: prev.disciples.map((d) => (d.id === discipleId ? { ...d, assignedBuildingId: buildingId } : d)),
    }));
  };

  const handleRefinePill = () => {
    if (state.resources.linhThao < 90 || state.resources.linhThach < 200) return;
    sfx.upgrade();
    const count = 1 + Math.floor(state.buildings.luyen_dan_phong.level / 3);
    setState((prev) => ({
      ...prev,
      resources: {
        ...prev.resources,
        linhThao: prev.resources.linhThao - 90,
        linhThach: prev.resources.linhThach - 200,
        dotPhaDan: prev.resources.dotPhaDan + count,
      },
    }));
    showToast(`Luyện đan thành công: +${count} Đột Phá Đan!`);
  };

  const handleForgeEquipment = () => {
    if (state.resources.huyenThiet < 80 || state.resources.linhThach < 380) return;
    sfx.upgrade();
    const forgeLvl = state.buildings.luyen_khi_cac.level;
    const pool = forgeLvl >= 4 ? (['su_thi', 'huyen_thoai', 'truyen_thuyet'] as const) : (['hiem', 'su_thi', 'huyen_thoai'] as const);
    const eq = generateEquipment({ rarity: rollRarity([...pool]) });
    setState((prev) => ({
      ...prev,
      resources: {
        ...prev.resources,
        huyenThiet: prev.resources.huyenThiet - 80,
        linhThach: prev.resources.linhThach - 380,
      },
      inventory: [eq, ...prev.inventory],
    }));
    showToast(`Rèn thành công [${RARITY_META[eq.rarity].name}] ${eq.name}!`);
  };

  // ---- DISCIPLE & BREAKTHROUGH HANDLERS ----
  const handleToggleFormation = (discipleId: string) => {
    sfx.click();
    setState((prev) => {
      const target = prev.disciples.find((d) => d.id === discipleId);
      if (!target) return prev;
      if (target.isSectMaster && target.inFormation) return prev;

      const currentIn = prev.disciples
        .filter((d) => d.inFormation)
        .sort((a, b) => a.formationOrder - b.formationOrder);
      if (!target.inFormation && currentIn.length >= 5) {
        showToast('Đội hình tối đa 5 đệ tử xuất chiến!');
        return prev;
      }
      const nextDisciples = prev.disciples.map((d) =>
        d.id === discipleId
          ? { ...d, inFormation: !d.inFormation, formationOrder: !d.inFormation ? currentIn.length : 99 }
          : d,
      );
      const activeIds = nextDisciples
        .filter((d) => d.inFormation)
        .sort((a, b) => a.formationOrder - b.formationOrder)
        .map((d) => d.id);
      return {
        ...prev,
        disciples: nextDisciples.map((d) => {
          const order = activeIds.indexOf(d.id);
          return order >= 0 ? { ...d, formationOrder: order } : { ...d, formationOrder: 99 };
        }),
      };
    });
  };

  const handleInfuseQi = (discipleId: string) => {
    const disc = state.disciples.find((d) => d.id === discipleId);
    if (!disc || state.resources.linhKhi < 50) return;
    const needed = Math.max(0, Math.ceil(disc.maxQi - disc.qi));
    const transfer = Math.min(state.resources.linhKhi, needed);
    if (transfer <= 0) return;
    sfx.harvest();
    setState((prev) => ({
      ...prev,
      resources: { ...prev.resources, linhKhi: prev.resources.linhKhi - transfer },
      disciples: prev.disciples.map((d) =>
        d.id === discipleId ? { ...d, qi: Math.min(d.maxQi, d.qi + transfer) } : d,
      ),
    }));
    showToast(`Đã truyền +${formatNum(transfer)} Linh Khí cho ${disc.name}!`);
  };

  const handleBreakthrough = (discipleId: string, pillsUsed: number): { success: boolean; message: string } => {
    const disc = state.disciples.find((d) => d.id === discipleId);
    if (!disc || disc.realmIndex >= REALM_LADDER.length - 1) {
      return { success: false, message: 'Đã đạt cảnh giới tối thượng!' };
    }
    const chance = calculateBreakthroughChance(disc, pillsUsed);
    const success = Math.random() * 100 < chance;
    sfx.breakthrough(success);

    const nextStage = REALM_LADDER[disc.realmIndex + 1];
    setState((prev) => ({
      ...prev,
      resources: {
        ...prev.resources,
        dotPhaDan: Math.max(0, prev.resources.dotPhaDan - pillsUsed),
      },
      disciples: prev.disciples.map((d) => {
        if (d.id !== discipleId) return d;
        if (success) {
          return {
            ...d,
            realmIndex: d.realmIndex + 1,
            qi: 0,
            maxQi: nextStage.qiRequired,
          };
        }
        return {
          ...d,
          qi: Math.round(d.maxQi * 0.68),
        };
      }),
      quests: success ? updateQuestProgress(prev.quests, 'q_main_1', 1) : prev.quests,
      chatMessages: success
        ? [
            {
              id: genId('chat'),
              channel: 'he_thong' as const,
              sender: 'Hệ Thống',
              text: `Chúc mừng ${disc.name} độ kiếp thành công, tấn thăng ${nextStage.fullName}!`,
              timestamp: Date.now(),
            },
            ...prev.chatMessages,
          ].slice(0, 30)
        : prev.chatMessages,
    }));

    return success
      ? { success: true, message: `Thiên Lôi tán đi! ${disc.name} đột phá thành công lên ${nextStage.fullName}!` }
      : {
          success: false,
          message: `Độ kiếp chưa thành (tỷ lệ ${chance}%). Tu vi giữ lại 68%, hãy luyện thêm Đột Phá Đan!`,
        };
  };

  const handleRecruitDisciple = (candidateId: string) => {
    const cand = state.recruitPool.find((c) => c.id === candidateId);
    const maxDisciples = 4 + state.buildings.chinh_dien.level * 2;
    if (!cand || state.disciples.length >= maxDisciples) return;
    const cost = cand.spiritRoot.startsWith('bien_di')
      ? 1500
      : cand.spiritRoot === 'thien_linh_can'
        ? 1000
        : 450;
    if (state.resources.linhThach < cost) return;
    sfx.upgrade();
    setState((prev) => ({
      ...prev,
      resources: { ...prev.resources, linhThach: prev.resources.linhThach - cost },
      disciples: [...prev.disciples, cand],
      recruitPool: prev.recruitPool.map((c) => (c.id === candidateId ? generateDisciple({ premium: false }) : c)),
    }));
    showToast(`Chào mừng đệ tử mới ${cand.name} gia nhập Thanh Vân Tiên Tông!`);
  };

  const handleRefreshRecruits = (premium: boolean) => {
    if (premium && state.resources.tienNgoc < 40) return;
    if (!premium && state.resources.linhThach < 300) return;
    sfx.click();
    setState((prev) => ({
      ...prev,
      resources: {
        ...prev.resources,
        tienNgoc: premium ? prev.resources.tienNgoc - 40 : prev.resources.tienNgoc,
        linhThach: !premium ? prev.resources.linhThach - 300 : prev.resources.linhThach,
      },
      recruitPool: [
        generateDisciple({ premium }),
        generateDisciple({ premium }),
        generateDisciple({ premium: true }),
      ],
    }));
    showToast(premium ? 'Đã tầm tiên phát hiện thiên tài mới!' : 'Đã làm mới danh sách đệ tử chiêu mộ.');
  };

  // ---- EQUIPMENT & GEM HANDLERS ----
  const handleEquipItem = (discipleId: string, itemId: string) => {
    const item = state.inventory.find((i) => i.id === itemId);
    if (!item) return;
    sfx.click();
    setState((prev) => {
      const oldOwnerId = item.equippedBy;
      const targetDisc = prev.disciples.find((d) => d.id === discipleId);
      const replacedItemId = targetDisc?.equipped[item.slot];

      const nextInventory = prev.inventory.map((eq) => {
        if (eq.id === itemId) return { ...eq, equippedBy: discipleId };
        if (eq.id === replacedItemId) return { ...eq, equippedBy: null };
        return eq;
      });

      const nextDisciples = prev.disciples.map((d) => {
        const nextEq = { ...d.equipped };
        if (d.id === oldOwnerId && oldOwnerId !== discipleId) {
          delete nextEq[item.slot];
        }
        if (d.id === discipleId) {
          nextEq[item.slot] = itemId;
        }
        return { ...d, equipped: nextEq };
      });

      return { ...prev, inventory: nextInventory, disciples: nextDisciples };
    });
  };

  const handleUnequipSlot = (discipleId: string, slot: EquipmentSlot) => {
    sfx.click();
    setState((prev) => {
      const target = prev.disciples.find((d) => d.id === discipleId);
      const itemId = target?.equipped[slot];
      if (!itemId) return prev;
      return {
        ...prev,
        inventory: prev.inventory.map((eq) => (eq.id === itemId ? { ...eq, equippedBy: null } : eq)),
        disciples: prev.disciples.map((d) => {
          if (d.id !== discipleId) return d;
          const nextEq = { ...d.equipped };
          delete nextEq[slot];
          return { ...d, equipped: nextEq };
        }),
      };
    });
  };

  const handleQuickEquipBest = (discipleId: string) => {
    const disc = state.disciples.find((d) => d.id === discipleId);
    if (!disc) return;

    const eligible = state.inventory.filter((item) => !item.equippedBy || item.equippedBy === discipleId);
    const nextEquipped: Partial<Record<EquipmentSlot, string>> = {};
    let changedCount = 0;

    EQUIPMENT_SLOTS.forEach(({ slot }) => {
      const candidates = eligible
        .filter((item) => item.slot === slot)
        .sort((a, b) => getEquipmentPower(b) - getEquipmentPower(a));
      const best = candidates[0];
      if (best) {
        nextEquipped[slot] = best.id;
        if (disc.equipped[slot] !== best.id) changedCount += 1;
      }
    });

    if (changedCount === 0) {
      sfx.click();
      showToast(`${disc.name} đã mặc những trang bị tốt nhất hiện có.`);
      return;
    }

    const chosenIds = new Set(Object.values(nextEquipped).filter(Boolean) as string[]);
    sfx.upgrade();
    setState((prev) => ({
      ...prev,
      inventory: prev.inventory.map((eq) => {
        if (chosenIds.has(eq.id)) return { ...eq, equippedBy: discipleId };
        if (eq.equippedBy === discipleId) return { ...eq, equippedBy: null };
        return eq;
      }),
      disciples: prev.disciples.map((d) => (d.id === discipleId ? { ...d, equipped: nextEquipped } : d)),
    }));
    showToast(`Đã mặc nhanh ${changedCount} trang bị tốt nhất cho ${disc.name}!`);
  };

  const handleQuickEquipSet = (discipleId: string, preferredSetId?: string) => {
    const disc = state.disciples.find((d) => d.id === discipleId);
    if (!disc) return;

    const eligible = state.inventory.filter((item) => !item.equippedBy || item.equippedBy === discipleId);
    const setMap = new Map<string, Partial<Record<EquipmentSlot, (typeof eligible)[number]>>>();

    eligible.forEach((item) => {
      if (!item.setId) return;
      const bySlot = setMap.get(item.setId) || {};
      const current = bySlot[item.slot];
      if (!current || getEquipmentPower(item) > getEquipmentPower(current)) {
        bySlot[item.slot] = item;
      }
      setMap.set(item.setId, bySlot);
    });

    if (setMap.size === 0) {
      sfx.click();
      showToast('Chưa có trang bị Bộ nào khả dụng. Hãy Săn Boss Huyền Thoại hoặc mua ở Chợ Tự Do!');
      return;
    }

    let chosenSetId = preferredSetId && setMap.has(preferredSetId) ? preferredSetId : '';
    if (!chosenSetId) {
      const ranked = Array.from(setMap.entries()).map(([setId, slotsObj]) => {
        const pieces = Object.values(slotsObj).filter(Boolean) as typeof eligible;
        const count = pieces.length;
        const setTierScore = count >= 4 ? 2 : count >= 2 ? 1 : 0;
        const elemMatch = EQUIPMENT_SETS[setId]?.element === disc.element ? 1 : 0;
        const totalPower = pieces.reduce((sum, p) => sum + getEquipmentPower(p), 0);
        return { setId, setTierScore, count, elemMatch, totalPower };
      });
      ranked.sort(
        (a, b) =>
          b.setTierScore - a.setTierScore ||
          b.count - a.count ||
          b.elemMatch - a.elemMatch ||
          b.totalPower - a.totalPower,
      );
      chosenSetId = ranked[0].setId;
    }

    const chosenSetSlots = setMap.get(chosenSetId)!;
    const nextEquipped: Partial<Record<EquipmentSlot, string>> = {};
    let setPieceCount = 0;

    // 1. Equip every available slot belonging to the chosen set
    EQUIPMENT_SLOTS.forEach(({ slot }) => {
      const setPiece = chosenSetSlots[slot];
      if (setPiece) {
        nextEquipped[slot] = setPiece.id;
        setPieceCount += 1;
      } else {
        // 2. For non-set slots, keep current item or fill empty slots with best eligible item
        const currentId = disc.equipped[slot];
        if (currentId && eligible.some((i) => i.id === currentId)) {
          nextEquipped[slot] = currentId;
        } else {
          const fallback = eligible
            .filter((item) => item.slot === slot)
            .sort((a, b) => getEquipmentPower(b) - getEquipmentPower(a))[0];
          if (fallback) nextEquipped[slot] = fallback.id;
        }
      }
    });

    const chosenIds = new Set(Object.values(nextEquipped).filter(Boolean) as string[]);
    sfx.upgrade();
    setState((prev) => ({
      ...prev,
      inventory: prev.inventory.map((eq) => {
        if (chosenIds.has(eq.id)) return { ...eq, equippedBy: discipleId };
        if (eq.equippedBy === discipleId) return { ...eq, equippedBy: null };
        return eq;
      }),
      disciples: prev.disciples.map((d) => (d.id === discipleId ? { ...d, equipped: nextEquipped } : d)),
    }));
    const setName = EQUIPMENT_SETS[chosenSetId]?.name || chosenSetId;
    showToast(`Đã mặc nhanh ${setName} (${setPieceCount}/4 món) cho ${disc.name}!`);
  };

  const handleEnhanceItem = (itemId: string) => {
    const item = state.inventory.find((i) => i.id === itemId);
    if (!item || item.enhanceLevel >= 20) return;
    const costStone = Math.round(160 * Math.pow(1.26, item.enhanceLevel));
    const costMat = 2 + item.enhanceLevel;
    if (state.resources.linhThach < costStone || state.resources.cuongHoaThach < costMat) return;
    sfx.upgrade();
    setState((prev) => ({
      ...prev,
      resources: {
        ...prev.resources,
        linhThach: prev.resources.linhThach - costStone,
        cuongHoaThach: prev.resources.cuongHoaThach - costMat,
      },
      inventory: prev.inventory.map((eq) =>
        eq.id === itemId ? { ...eq, enhanceLevel: eq.enhanceLevel + 1 } : eq,
      ),
    }));
    showToast(`Cường hóa ${item.name} lên +${item.enhanceLevel + 1}!`);
  };

  const handleAscendItem = (itemId: string) => {
    const item = state.inventory.find((i) => i.id === itemId);
    if (!item) return;
    const idx = EQUIPMENT_TIERS.findIndex((t) => t.id === item.tier);
    const cur = EQUIPMENT_TIERS[idx];
    const next = EQUIPMENT_TIERS[idx + 1];
    if (!cur || !next) return;
    if (
      state.resources.huyenThiet < cur.ascendCostIron ||
      state.resources.tinhHoaBoss < cur.ascendCostEssence ||
      state.resources.linhThach < cur.ascendCostStone
    ) {
      return;
    }
    sfx.breakthrough(true);
    setState((prev) => ({
      ...prev,
      resources: {
        ...prev.resources,
        huyenThiet: prev.resources.huyenThiet - cur.ascendCostIron,
        tinhHoaBoss: prev.resources.tinhHoaBoss - cur.ascendCostEssence,
        linhThach: prev.resources.linhThach - cur.ascendCostStone,
      },
      inventory: prev.inventory.map((eq) =>
        eq.id === itemId
          ? {
              ...eq,
              tier: next.id,
              subStats: [
                ...eq.subStats,
                { key: 'elemBonus', label: 'Tăng Công Ngũ Hành', value: 6 + idx * 3, isPercent: true },
              ],
            }
          : eq,
      ),
    }));
    showToast(`Nâng bậc ${item.name} lên phẩm cấp ${next.name}!`);
  };

  const handleSocketGem = (itemId: string, socketIdx: number, gemId: string) => {
    const gem = state.gems.find((g) => g.id === gemId);
    if (!gem) return;
    sfx.upgrade();
    setState((prev) => ({
      ...prev,
      gems: prev.gems.filter((g) => g.id !== gemId),
      inventory: prev.inventory.map((eq) => {
        if (eq.id !== itemId) return eq;
        const nextSockets = [...eq.sockets];
        nextSockets[socketIdx] = gem;
        return { ...eq, sockets: nextSockets };
      }),
    }));
    showToast(`Đã khảm ${gem.name}!`);
  };

  const handleUnsocketGem = (itemId: string, socketIdx: number) => {
    const item = state.inventory.find((i) => i.id === itemId);
    const removed = item?.sockets[socketIdx];
    if (!removed) return;
    sfx.click();
    setState((prev) => ({
      ...prev,
      gems: [removed, ...prev.gems],
      inventory: prev.inventory.map((eq) => {
        if (eq.id !== itemId) return eq;
        const nextSockets = [...eq.sockets];
        nextSockets[socketIdx] = null;
        return { ...eq, sockets: nextSockets };
      }),
    }));
  };

  const handleMergeGems = (element: string, tier: number) => {
    const matches = state.gems.filter((g) => g.element === element && g.tier === tier);
    if (matches.length < 3 || tier >= 5) return;
    sfx.upgrade();
    const removeIds = new Set(matches.slice(0, 3).map((g) => g.id));
    const merged = createGem(element as any, tier + 1);
    setState((prev) => ({
      ...prev,
      gems: [merged, ...prev.gems.filter((g) => !removeIds.has(g.id))],
    }));
    showToast(`Hợp thành thành công: ${merged.name}!`);
  };

  const handleSellItem = (itemId: string) => {
    const item = state.inventory.find((i) => i.id === itemId);
    if (!item || item.equippedBy) return;
    const price = RARITY_META[item.rarity].sellPrice;
    sfx.harvest();
    setState((prev) => ({
      ...prev,
      inventory: prev.inventory.filter((i) => i.id !== itemId),
      resources: { ...prev.resources, linhThach: prev.resources.linhThach + price },
    }));
    showToast(`Đã bán ${item.name} nhận +${formatNum(price)} Linh Thạch.`);
  };

  // ---- COMBAT, REALMS, BOSSES & VEINS ----
  const handleStartCombat = (ctx: CombatContext) => {
    if (state.resources.stamina < ctx.staminaCost) {
      showToast('Không đủ Thể Lực! Hãy chờ hồi phục hoặc nâng Sơn Môn.');
      return;
    }
    sfx.click();
    setState((prev) => ({
      ...prev,
      resources: { ...prev.resources, stamina: prev.resources.stamina - ctx.staminaCost },
    }));
    setActiveModal(null);
    setActiveCombat(ctx);
  };

  const handleCombatFinish = (victory: boolean, rewards?: BattleVictoryRewards) => {
    if (victory && rewards && activeCombat) {
      setState((prev) => {
        const nextCleared =
          activeCombat.mode === 'realm' && !prev.clearedRealms.includes(activeCombat.targetId)
            ? [...prev.clearedRealms, activeCombat.targetId]
            : prev.clearedRealms;

        const nextBosses =
          activeCombat.mode === 'boss'
            ? { ...prev.defeatedBosses, [activeCombat.targetId]: (prev.defeatedBosses[activeCombat.targetId] || 0) + 1 }
            : prev.defeatedBosses;

        const nextVeins =
          activeCombat.mode === 'vein'
            ? prev.spiritVeins.map((v) =>
                v.id === activeCombat.targetId
                  ? { ...v, isOwnedByPlayer: true, ownerAlliance: prev.alliance.name }
                  : v,
              )
            : prev.spiritVeins;

        return {
          ...prev,
          clearedRealms: nextCleared,
          defeatedBosses: nextBosses,
          spiritVeins: nextVeins,
          resources: {
            ...prev.resources,
            linhThach: prev.resources.linhThach + rewards.linhThach,
            linhThao: prev.resources.linhThao + rewards.linhThao,
            huyenThiet: prev.resources.huyenThiet + rewards.huyenThiet,
            cuongHoaThach: prev.resources.cuongHoaThach + rewards.cuongHoaThach,
            dotPhaDan: prev.resources.dotPhaDan + rewards.dotPhaDan,
            linhKhi: prev.resources.linhKhi + rewards.linhKhi,
            tinhHoaBoss: prev.resources.tinhHoaBoss + rewards.tinhHoaBoss,
            tienNgoc: prev.resources.tienNgoc + rewards.tienNgoc,
          },
          inventory: [...rewards.droppedEquipment, ...prev.inventory],
          gems: [...rewards.droppedGems, ...prev.gems],
          quests: updateQuestProgress(prev.quests, 'q_daily_1', 1),
          chatMessages:
            activeCombat.mode === 'boss' || activeCombat.mode === 'vein'
              ? [
                  {
                    id: genId('chat'),
                    channel: 'the_gioi' as const,
                    sender: 'Hệ Thống',
                    text:
                      activeCombat.mode === 'vein'
                        ? `[Linh Mạch] ${prev.alliance.name} đã đánh chiếm thành công ${activeCombat.veinDef?.name}!`
                        : `[Săn Boss] ${prev.sectName} đã hạ gục ${activeCombat.bossDef?.name}, đoạt bộ trang bị Huyền Thoại!`,
                    timestamp: Date.now(),
                  },
                  ...prev.chatMessages,
                ].slice(0, 30)
              : prev.chatMessages,
        };
      });
    }
    setActiveCombat(null);
  };

  const handleSweepRealm = (realm: SecretRealmDef) => {
    if (state.resources.stamina < realm.staminaCost) return;
    sfx.harvest();
    const drop = generateEquipment({ rarity: rollRarity(realm.rewards.dropRarityPool) });
    const gem = createGem(realm.element, 1);
    setState((prev) => ({
      ...prev,
      resources: {
        ...prev.resources,
        stamina: prev.resources.stamina - realm.staminaCost,
        linhThach: prev.resources.linhThach + realm.rewards.linhThach,
        linhThao: prev.resources.linhThao + realm.rewards.linhThao,
        huyenThiet: prev.resources.huyenThiet + realm.rewards.huyenThiet,
        cuongHoaThach: prev.resources.cuongHoaThach + realm.rewards.cuongHoaThach,
        linhKhi: prev.resources.linhKhi + realm.rewards.linhKhi,
      },
      inventory: [drop, ...prev.inventory],
      gems: [gem, ...prev.gems],
      quests: updateQuestProgress(prev.quests, 'q_daily_1', 1),
    }));
    showToast(`Càn quét ${realm.name}: +${formatNum(realm.rewards.linhThach)} LT & [${RARITY_META[drop.rarity].name}] ${drop.name}!`);
  };

  // ---- ALLIANCE & MARKET HANDLERS ----
  const handleDonateAlliance = () => {
    if (state.resources.linhThach < 400) return;
    sfx.upgrade();
    setState((prev) => ({
      ...prev,
      resources: { ...prev.resources, linhThach: prev.resources.linhThach - 400 },
      alliance: {
        ...prev.alliance,
        contribution: prev.alliance.contribution + 200,
      },
    }));
    showToast('Đã cống hiến 400 Linh Thạch nhận +200 Điểm Cống Hiến Tiên Minh!');
  };

  const handleUpgradeAllianceTech = (techKey: 'atkLevel' | 'qiLevel' | 'dropLevel') => {
    const val = state.alliance.tech[techKey];
    const cost = 250 + val * 180;
    if (state.alliance.contribution < cost) return;
    sfx.upgrade();
    setState((prev) => ({
      ...prev,
      alliance: {
        ...prev.alliance,
        contribution: prev.alliance.contribution - cost,
        tech: { ...prev.alliance.tech, [techKey]: val + 1 },
      },
    }));
    showToast('Đã nâng cấp Bí Thuật Tiên Minh thành công!');
  };

  const handleClaimVeinTribute = () => {
    const owned = state.spiritVeins.filter((v) => v.isOwnedByPlayer);
    const lt = owned.reduce((s, v) => s + v.linhThachPerHour, 0);
    const tn = owned.reduce((s, v) => s + v.tienNgocPerHour, 0);
    if (lt <= 0) return;
    sfx.harvest();
    setState((prev) => ({
      ...prev,
      resources: {
        ...prev.resources,
        linhThach: prev.resources.linhThach + lt,
        tienNgoc: prev.resources.tienNgoc + tn,
      },
    }));
    showToast(`Thu cống phẩm Linh Mạch: +${formatNum(lt)} Linh Thạch & +${tn} Tiên Ngọc!`);
  };

  const handleBuyListing = (listingId: string) => {
    const listing = state.marketListings.find((m) => m.id === listingId);
    if (!listing || state.resources.linhThach < listing.priceLinhThach) return;
    sfx.upgrade();
    setState((prev) => ({
      ...prev,
      resources: {
        ...prev.resources,
        linhThach: prev.resources.linhThach - listing.priceLinhThach,
        dotPhaDan: prev.resources.dotPhaDan + (listing.itemType === 'pill' ? listing.quantity : 0),
        cuongHoaThach: prev.resources.cuongHoaThach + (listing.itemType === 'stone' ? listing.quantity : 0),
      },
      inventory: listing.equipmentData ? [listing.equipmentData, ...prev.inventory] : prev.inventory,
      gems: listing.gemData ? [listing.gemData, ...prev.gems] : prev.gems,
      marketListings: prev.marketListings.filter((m) => m.id !== listingId),
    }));
    showToast(`Đã mua thành công: ${listing.name}!`);
  };

  const handleListEquipmentForSale = (itemId: string, price: number) => {
    const item = state.inventory.find((i) => i.id === itemId && !i.equippedBy);
    if (!item) return;
    sfx.harvest();
    setState((prev) => ({
      ...prev,
      inventory: prev.inventory.filter((i) => i.id !== itemId),
      resources: { ...prev.resources, linhThach: prev.resources.linhThach + price },
    }));
    showToast(`Đạo hữu khác đã mua ${item.name} với giá +${formatNum(price)} Linh Thạch!`);
  };

  const handleRefreshMarket = () => {
    if (state.resources.linhThach < 100) return;
    sfx.click();
    setState((prev) => ({
      ...prev,
      resources: { ...prev.resources, linhThach: prev.resources.linhThach - 100 },
      marketListings: generateMarketListings(),
    }));
    showToast('Phiên Chợ Tự Do đã cập nhật vật phẩm mới!');
  };

  // ---- OFFLINE & GIFTS & QUESTS & CHAT ----
  const handleClaimOffline = () => {
    if (state.pendingOfflineSeconds < 30) return;
    const rew = calculateOfflineRewards(state, state.pendingOfflineSeconds);
    const bonusGear = Array.from({ length: rew.bonusGearCount }, () =>
      generateEquipment({ rarity: rollRarity(['hiem', 'su_thi', 'huyen_thoai']) }),
    );
    sfx.victory();
    setState((prev) => ({
      ...prev,
      pendingOfflineSeconds: 0,
      resources: {
        ...prev.resources,
        linhThach: prev.resources.linhThach + rew.linhThach,
        linhKhi: prev.resources.linhKhi + rew.linhKhi,
        linhThao: prev.resources.linhThao + rew.linhThao,
        huyenThiet: prev.resources.huyenThiet + rew.huyenThiet,
        cuongHoaThach: prev.resources.cuongHoaThach + rew.cuongHoaThach,
        tienNgoc: prev.resources.tienNgoc + rew.tienNgoc,
        dotPhaDan: prev.resources.dotPhaDan + rew.dotPhaDan,
      },
      inventory: [...bonusGear, ...prev.inventory],
    }));
    showToast(`Đã nhận thưởng treo máy: +${formatNum(rew.linhThach)} LT & +${formatNum(rew.linhKhi)} Linh Khí!`);
    setActiveModal(null);
  };

  const handleSimulateOfflineBoost = () => {
    sfx.harvest();
    setState((prev) => ({
      ...prev,
      pendingOfflineSeconds: Math.min(12 * 3600, prev.pendingOfflineSeconds + 7200),
      sectYear: prev.sectYear + 1,
    }));
    showToast('Đã tăng tốc tu luyện thêm +2 giờ treo máy!');
  };

  const handleClaimDailyGift = () => {
    if (state.dailyGiftClaimed) return;
    sfx.victory();
    const giftGear = generateEquipment({ rarity: rollRarity(['su_thi', 'huyen_thoai']) });
    setState((prev) => ({
      ...prev,
      dailyGiftClaimed: true,
      resources: {
        ...prev.resources,
        linhThach: prev.resources.linhThach + 2000,
        tienNgoc: prev.resources.tienNgoc + 120,
        dotPhaDan: prev.resources.dotPhaDan + 3,
        cuongHoaThach: prev.resources.cuongHoaThach + 25,
      },
      inventory: [giftGear, ...prev.inventory],
    }));
    showToast(`Đã nhận Quà Hằng Ngày + [${RARITY_META[giftGear.rarity].name}] ${giftGear.name}!`);
    setActiveModal(null);
  };

  const handleQuestClick = (questId: string) => {
    const q = state.quests.find((item) => item.id === questId);
    if (!q) return;
    if (q.progress >= q.target && !q.claimed) {
      sfx.victory();
      setState((prev) => ({
        ...prev,
        resources: {
          ...prev.resources,
          linhThach: prev.resources.linhThach + (q.reward.linhThach || 0),
          tienNgoc: prev.resources.tienNgoc + (q.reward.tienNgoc || 0),
          linhThao: prev.resources.linhThao + (q.reward.linhThao || 0),
          dotPhaDan: prev.resources.dotPhaDan + (q.reward.dotPhaDan || 0),
          cuongHoaThach: prev.resources.cuongHoaThach + (q.reward.cuongHoaThach || 0),
        },
        quests: prev.quests.map((item) => (item.id === questId ? { ...item, claimed: true } : item)),
      }));
      showToast(`Hoàn thành nhiệm vụ [${q.category}]: ${q.rewardText}`);
      return;
    }
    if (q.jumpTo) {
      sfx.click();
      setActiveModal(q.jumpTo);
    }
  };

  const handleSendChat = (channel: 'bang_hoi' | 'the_gioi', text: string) => {
    sfx.click();
    setState((prev) => ({
      ...prev,
      chatMessages: [
        {
          id: genId('chat'),
          channel,
          sender: prev.disciples[0]?.name || 'Chưởng Môn',
          text,
          timestamp: Date.now(),
        },
        ...prev.chatMessages,
      ].slice(0, 30),
    }));
  };

  const submitWorldChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatText.trim()) return;
    handleSendChat('the_gioi', chatText.trim());
    setChatText('');
    setShowChatInput(false);
  };

  // ---- VIP, RECHARGE, VIP SHOP, STAMINA & FASHION HANDLERS ----
  const applyVipPoints = (
    prev: GameState,
    addedPoints: number,
    addedJade: number,
    addedStone: number,
    claimedFirstPackId?: string,
  ): GameState => {
    const oldVip = getVipLevel(prev.vip.points);
    const nextPoints = prev.vip.points + addedPoints;
    const newVip = getVipLevel(nextPoints);

    // Auto-enable VIP 5, 6, 7 and 10 automations the moment those levels are first unlocked
    const autoDiscipleEnabled = prev.vip.autoDiscipleEnabled || (oldVip < 5 && newVip >= 5);
    const autoSectEnabled = prev.vip.autoSectEnabled || (oldVip < 6 && newVip >= 6);
    const autoGemEnabled = prev.vip.autoGemEnabled || (oldVip < 7 && newVip >= 7);
    const autoWorldEnabled = prev.vip.autoWorldEnabled || (oldVip < 10 && newVip >= 10);

    const nextFirstIds =
      claimedFirstPackId && !prev.vip.firstRechargeClaimedIds.includes(claimedFirstPackId)
        ? [...prev.vip.firstRechargeClaimedIds, claimedFirstPackId]
        : prev.vip.firstRechargeClaimedIds;

    const systemLogs =
      newVip > oldVip
        ? [
            {
              id: genId('chat'),
              channel: 'he_thong' as const,
              sender: 'Hệ Thống',
              text: `Chúc mừng Chưởng Môn tấn thăng VIP ${newVip}${newVip === 20 ? ' MAX' : ''}! Hãy nhận Quà Mốc VIP đặc quyền!`,
              timestamp: Date.now(),
            },
            ...prev.chatMessages,
          ].slice(0, 30)
        : prev.chatMessages;

    return {
      ...prev,
      resources: {
        ...prev.resources,
        tienNgoc: prev.resources.tienNgoc + addedJade,
        linhThach: prev.resources.linhThach + addedStone,
      },
      vip: {
        ...prev.vip,
        points: nextPoints,
        firstRechargeClaimedIds: nextFirstIds,
        autoDiscipleEnabled,
        autoSectEnabled,
        autoGemEnabled,
        autoWorldEnabled,
      },
      chatMessages: systemLogs,
    };
  };

  const handleRechargePack = (packId: string) => {
    const pack = RECHARGE_PACKS.find((p) => p.id === packId);
    if (!pack) return;
    const isFirst = !state.vip.firstRechargeClaimedIds.includes(pack.id);
    const jadeGain = isFirst ? pack.tienNgoc * 2 : pack.tienNgoc;
    sfx.victory();
    setState((prev) => applyVipPoints(prev, pack.vipPoints, jadeGain, pack.bonusLinhThach, pack.id));
    showToast(
      `Nạp ${pack.name} thành công: +${formatNum(jadeGain)} Tiên Ngọc & +${formatNum(pack.vipPoints)} Điểm VIP!`,
    );
  };

  const handleRedeemCardCode = (cardCode: string) => {
    sfx.victory();
    setState((prev) => applyVipPoints(prev, 5000, 5000, 20000));
    showToast(`Nạp mã thẻ [${cardCode.toUpperCase()}] thành công: +5.000 Tiên Ngọc & +5.000 Điểm VIP!`);
  };

  const handleClaimVipMilestone = (level: number) => {
    const milestone = VIP_MILESTONE_REWARDS.find((m) => m.level === level);
    if (!milestone || vipLevel < level || state.vip.claimedMilestones.includes(level)) return;

    sfx.breakthrough(true);
    const newSetPieces =
      milestone.setId && milestone.setSlots
        ? generateMythicSetBundle(
            milestone.setId,
            milestone.setSlots,
            milestone.enhanceLevel || 10,
            milestone.gemTier || 3,
          )
        : [];

    setState((prev) => {
      const nextFashions =
        milestone.fashionId && !prev.vip.unlockedFashions.includes(milestone.fashionId)
          ? [...prev.vip.unlockedFashions, milestone.fashionId]
          : prev.vip.unlockedFashions;

      // Auto-equip newly unlocked VIP 18/19/20 fashion onto Sect Master for immediate visual wow!
      const nextDisciples = milestone.fashionId
        ? prev.disciples.map((d, idx) => (idx === 0 ? { ...d, fashionId: milestone.fashionId } : d))
        : prev.disciples;

      const bonus = milestone.bonusResources || {};
      const vip7BonusGems =
        level === 7
          ? [
              createGem('Kim', 1),
              createGem('Kim', 1),
              createGem('Kim', 1),
              createGem('Hoa', 2),
              createGem('Thuy', 2),
              createGem('Moc', 2),
            ]
          : [];
      return {
        ...prev,
        resources: {
          ...prev.resources,
          linhThach: prev.resources.linhThach + (bonus.linhThach || 0),
          linhKhi: prev.resources.linhKhi + (bonus.linhKhi || 0),
          dotPhaDan: prev.resources.dotPhaDan + (bonus.dotPhaDan || 0),
          cuongHoaThach: prev.resources.cuongHoaThach + (bonus.cuongHoaThach || 0),
          tinhHoaBoss: prev.resources.tinhHoaBoss + (bonus.tinhHoaBoss || 0),
          stamina: prev.resources.stamina + (bonus.stamina || 0),
        },
        inventory: [...newSetPieces, ...prev.inventory],
        gems: [...vip7BonusGems, ...prev.gems].slice(0, 80),
        disciples: nextDisciples,
        vip: {
          ...prev.vip,
          claimedMilestones: [...prev.vip.claimedMilestones, level],
          unlockedFashions: nextFashions,
          autoDiscipleEnabled: prev.vip.autoDiscipleEnabled || level === 5,
          autoSectEnabled: prev.vip.autoSectEnabled || level === 6,
          autoGemEnabled: prev.vip.autoGemEnabled || level === 7,
          autoWorldEnabled: prev.vip.autoWorldEnabled || level === 10,
        },
        chatMessages: [
          {
            id: genId('chat'),
            channel: 'the_gioi' as const,
            sender: 'Hệ Thống',
            text: `[Chí Tôn VIP ${level}] ${prev.sectName} đã nhận ${milestone.title}!`,
            timestamp: Date.now(),
          },
          ...prev.chatMessages,
        ].slice(0, 30),
      };
    });

    if (milestone.fashionId) {
      showToast(
        `Đã nhận Bộ Truyền Thuyết (4 món Thần Khí) + Thời Trang [${VIP_FASHIONS[milestone.fashionId].name}]!`,
      );
    } else {
      showToast(`Đã nhận Quà Mốc VIP ${level} thành công!`);
    }
  };

  const handleBuyStaminaPack = (packId: string) => {
    const sp = STAMINA_PACKS.find((s) => s.id === packId);
    if (!sp || state.resources.tienNgoc < sp.costTienNgoc) return;
    sfx.harvest();
    setState((prev) => ({
      ...prev,
      resources: {
        ...prev.resources,
        tienNgoc: prev.resources.tienNgoc - sp.costTienNgoc,
        stamina: prev.resources.stamina + sp.stamina,
      },
    }));
    showToast(`Đã mua ${sp.name}! Thể lực hiện tại: ${state.resources.stamina + sp.stamina}.`);
  };

  const handleBuyVipShopItem = (itemId: string) => {
    const item = VIP_SHOP_ITEMS.find((i) => i.id === itemId);
    if (!item || vipLevel < item.minVip || state.resources.tienNgoc < item.costTienNgoc) return;
    sfx.upgrade();
    const setIds = Object.keys(EQUIPMENT_SETS);

    setState((prev) => {
      const nextR = { ...prev.resources, tienNgoc: prev.resources.tienNgoc - item.costTienNgoc };
      let nextInv = prev.inventory;
      let nextGems = prev.gems;
      let nextDiscs = prev.disciples;

      if (item.rewardType === 'dot_pha_dan') nextR.dotPhaDan += item.quantity;
      else if (item.rewardType === 'cuong_hoa_thach') nextR.cuongHoaThach += item.quantity;
      else if (item.rewardType === 'tinh_hoa_boss') nextR.tinhHoaBoss += item.quantity;
      else if (item.rewardType === 'linh_khi') nextR.linhKhi += item.quantity;
      else if (item.rewardType === 'gem_t4') nextGems = [createGem(undefined, 4), ...nextGems];
      else if (item.rewardType === 'legend_set_box') {
        const eq = generateEquipment({ rarity: 'huyen_thoai', tier: 'bao_khi', setId: pick(setIds) });
        nextInv = [eq, ...nextInv];
      } else if (item.rewardType === 'mythic_set_box') {
        const eq = generateEquipment({ rarity: 'truyen_thuyet', tier: 'than_khi', setId: pick(setIds) });
        nextInv = [eq, ...nextInv];
      } else if (item.rewardType === 'tay_tuy_dan') {
        nextDiscs = prev.disciples.map((d) =>
          d.inFormation
            ? {
                ...d,
                aptitude: {
                  cotCan: Math.min(100, d.aptitude.cotCan + item.quantity),
                  ngoTinh: Math.min(100, d.aptitude.ngoTinh + item.quantity),
                  khiVan: Math.min(100, d.aptitude.khiVan + item.quantity),
                },
              }
            : d,
        );
      }

      return { ...prev, resources: nextR, inventory: nextInv, gems: nextGems, disciples: nextDiscs };
    });
    showToast(`Đã mua thành công [${item.name}] tại Tiệm VIP!`);
  };

  const handleToggleAutoDisciple = () => {
    if (vipLevel < 5) {
      showToast('Cần đạt VIP 5 để mở khóa Auto Nâng Cấp Đệ Tử & Mặc Trang Bị Tốt Nhất!');
      return;
    }
    sfx.click();
    setState((prev) => ({
      ...prev,
      vip: { ...prev.vip, autoDiscipleEnabled: !prev.vip.autoDiscipleEnabled },
    }));
  };

  const handleToggleAutoSect = () => {
    if (vipLevel < 6) {
      showToast('Cần đạt VIP 6 để mở khóa Tự Động Hóa Toàn Bộ Công Việc!');
      return;
    }
    sfx.click();
    setState((prev) => ({
      ...prev,
      vip: { ...prev.vip, autoSectEnabled: !prev.vip.autoSectEnabled },
    }));
  };

  const handleToggleAutoGem = () => {
    if (vipLevel < 7) {
      showToast('Cần đạt VIP 7 để mở khóa Auto Nâng Ngọc & Khảm Ngọc Trang Bị!');
      return;
    }
    sfx.click();
    setState((prev) => ({
      ...prev,
      vip: { ...prev.vip, autoGemEnabled: !prev.vip.autoGemEnabled },
    }));
  };

  const handleToggleAutoWorld = () => {
    if (vipLevel < 10) {
      showToast('Cần đạt VIP 10 để mở khóa Tự Động Hóa Đánh Thế Giới!');
      return;
    }
    sfx.click();
    setState((prev) => ({
      ...prev,
      vip: { ...prev.vip, autoWorldEnabled: !prev.vip.autoWorldEnabled },
    }));
  };

  const handleSelectAutoWorldBoss = (bossId: string) => {
    if (vipLevel < 10) {
      showToast('Cần đạt VIP 10 để chọn Boss Auto Đánh Thế Giới!');
      return;
    }
    sfx.click();
    setState((prev) => ({
      ...prev,
      vip: { ...prev.vip, autoWorldBossId: bossId },
    }));
    const boss = LEGENDARY_BOSSES.find((b) => b.id === bossId);
    if (boss) {
      showToast(`Auto Thế Giới sẽ tập trung săn [${boss.name}]!`);
    } else if (bossId === 'realm_only') {
      showToast('Auto Thế Giới đã chuyển sang chế độ Chỉ Quét Bí Cảnh.');
    } else {
      showToast('Auto Thế Giới đã chuyển sang chế độ Tự Động (Bí Cảnh + Boss).');
    }
  };

  const handleEquipFashion = (discipleId: string, fashionId: VipFashionId | null) => {
    sfx.upgrade();
    setState((prev) => ({
      ...prev,
      disciples: prev.disciples.map((d) => (d.id === discipleId ? { ...d, fashionId } : d)),
    }));
    showToast(
      fashionId ? `Đã khoác Thời Trang [${VIP_FASHIONS[fashionId].name}]!` : 'Đã tháo Thời Trang đệ tử.',
    );
  };

  const hasOfflineReady = state.pendingOfflineSeconds >= 600;

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#122120] select-none">
      {/* FULLSCREEN INTERACTIVE ISOMETRIC SECT VIEW */}
      <SectMapView
        state={state}
        onSelectBuilding={(bId) => {
          sfx.click();
          setSelectedBuildingId(bId);
          setActiveModal('buildings');
        }}
        onHarvestBuilding={handleHarvestBuilding}
        onOpenDisciples={() => {
          sfx.click();
          setActiveModal('disciples');
        }}
      />

      {/* TOP JADE RIBBON HUD */}
      <header className="fixed top-0 inset-x-0 z-30 pointer-events-none px-1.5 sm:px-3 pt-1">
        <div className="pointer-events-auto max-w-[1600px] mx-auto jade-hud-bar px-1 sm:px-2 py-0.5 flex items-center justify-between gap-2 text-[#F5ECD5]">
          {/* Left: Sect Master Avatar + Name + Power + Year */}
          <div className="flex items-center gap-2.5 min-w-0">
            {(() => {
              const mf = master?.fashionId ? VIP_FASHIONS[master.fashionId] : null;
              return (
                <button
                  onClick={() => {
                    sfx.click();
                    setActiveModal('disciples');
                  }}
                  className="relative shrink-0 cursor-pointer hover:scale-105 transition-transform rounded-full"
                  title={mf ? `${master?.name} · ${mf.name}` : 'Xem Chưởng Môn & Đệ Tử'}
                >
                  <DisciplePortrait
                    discipleId={master?.id}
                    name={master?.name}
                    glyph={master?.avatarGlyph || 'D'}
                    element={master?.element || 'Kim'}
                    realmIndex={master?.realmIndex}
                    spiritRoot={master?.spiritRoot}
                    fashionId={master?.fashionId}
                    borderColor="#E5C272"
                    size="md"
                  />
                </button>
              );
            })()}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs sm:text-sm text-[#FBE9B7] truncate">{state.sectName}</span>
                <button
                  onClick={() => {
                    sfx.click();
                    setVipTab('recharge');
                    setActiveModal('vip');
                  }}
                  className="px-2 py-0.5 rounded bg-gradient-to-r from-[#A66E14] via-[#E5B85B] to-[#A66E14] text-[#1D1306] text-[10px] font-mono font-bold hover:brightness-110 cursor-pointer shrink-0"
                  title="Mở Điện Chí Tôn VIP"
                >
                  VIP {vipLevel}
                  {vipLevel >= 20 ? ' MAX' : ''}
                </button>
                {vipLevel >= 5 && (() => {
                  const activeAutoCount =
                    (state.vip.autoDiscipleEnabled ? 1 : 0) +
                    (vipLevel >= 6 && state.vip.autoSectEnabled ? 1 : 0) +
                    (vipLevel >= 7 && state.vip.autoGemEnabled ? 1 : 0) +
                    (vipLevel >= 10 && state.vip.autoWorldEnabled ? 1 : 0);
                  const maxAutoCount = vipLevel >= 10 ? 4 : vipLevel >= 7 ? 3 : vipLevel >= 6 ? 2 : 1;
                  return (
                    <div className="relative shrink-0">
                      <button
                        onClick={() => {
                          sfx.click();
                          setShowAutoMenu((prev) => !prev);
                        }}
                        className={`px-2 py-0.5 rounded border text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                          activeAutoCount > 0
                            ? 'bg-[#174834] border-[#6EE7B7]/80 text-[#E6FFF3] hover:bg-[#1E5C42]'
                            : 'bg-[#1A2F2D] border-[#C9A45C]/50 text-[#D7CBB0] hover:bg-[#233E3B]'
                        }`}
                        title="Bảng bật/tắt Tự Động Hóa VIP"
                      >
                        <Bot className="w-3 h-3" />
                        <span>Auto {activeAutoCount}/{maxAutoCount}</span>
                        <ChevronDown className={`w-3 h-3 transition-transform ${showAutoMenu ? 'rotate-180' : ''}`} />
                      </button>

                      {showAutoMenu && (
                        <>
                          <div
                            className="fixed inset-0 z-40"
                            onClick={() => setShowAutoMenu(false)}
                          />
                          <div className="absolute left-0 top-full mt-2 z-50 w-64 rounded-xl bg-[#142725]/96 border-2 border-[#C9A45C] shadow-2xl p-2.5 space-y-1.5 text-xs text-[#F5ECD5]">
                            <div className="flex items-center justify-between pb-1.5 border-b border-[#C9A45C]/30">
                              <span className="font-bold text-[#FCE6A6]">Tự Động Hóa VIP</span>
                              <button
                                onClick={() => {
                                  sfx.click();
                                  setShowAutoMenu(false);
                                  setVipTab('auto');
                                  setActiveModal('vip');
                                }}
                                className="text-[10px] font-semibold text-[#FDE047] hover:underline cursor-pointer"
                              >
                                Cài đặt &amp; Boss →
                              </button>
                            </div>

                            <button
                              onClick={handleToggleAutoDisciple}
                              className={`w-full px-2.5 py-1.5 rounded-lg border text-left flex items-center justify-between cursor-pointer transition-colors ${
                                state.vip.autoDiscipleEnabled
                                  ? 'bg-[#174063]/90 border-[#7DD3FC]/70 text-[#E8F6FF]'
                                  : 'bg-[#1B3230] border-[#3A5652] text-[#C8BEB0] hover:bg-[#223F3C]'
                              }`}
                            >
                              <span className="flex items-center gap-1.5 font-semibold text-[11px]">
                                <ArrowUpCircle className="w-3.5 h-3.5" />
                                VIP 5 Đệ Tử &amp; Đồ
                              </span>
                              <span className="text-[10px] font-mono font-bold">
                                {state.vip.autoDiscipleEnabled ? 'BẬT' : 'TẮT'}
                              </span>
                            </button>

                            {vipLevel >= 6 && (
                              <button
                                onClick={handleToggleAutoSect}
                                className={`w-full px-2.5 py-1.5 rounded-lg border text-left flex items-center justify-between cursor-pointer transition-colors ${
                                  state.vip.autoSectEnabled
                                    ? 'bg-[#174834]/90 border-[#6EE7B7]/70 text-[#E6FFF3]'
                                    : 'bg-[#1B3230] border-[#3A5652] text-[#C8BEB0] hover:bg-[#223F3C]'
                                }`}
                              >
                                <span className="flex items-center gap-1.5 font-semibold text-[11px]">
                                  <Bot className="w-3.5 h-3.5" />
                                  VIP 6 Công Việc
                                </span>
                                <span className="text-[10px] font-mono font-bold">
                                  {state.vip.autoSectEnabled ? 'BẬT' : 'TẮT'}
                                </span>
                              </button>
                            )}

                            {vipLevel >= 7 && (
                              <button
                                onClick={handleToggleAutoGem}
                                className={`w-full px-2.5 py-1.5 rounded-lg border text-left flex items-center justify-between cursor-pointer transition-colors ${
                                  state.vip.autoGemEnabled
                                    ? 'bg-[#4C2A6E]/90 border-[#D8B4FE]/70 text-[#F5EAFF]'
                                    : 'bg-[#1B3230] border-[#3A5652] text-[#C8BEB0] hover:bg-[#223F3C]'
                                }`}
                              >
                                <span className="flex items-center gap-1.5 font-semibold text-[11px]">
                                  <Gem className="w-3.5 h-3.5" />
                                  VIP 7 Nâng &amp; Khảm Ngọc
                                </span>
                                <span className="text-[10px] font-mono font-bold">
                                  {state.vip.autoGemEnabled ? 'BẬT' : 'TẮT'}
                                </span>
                              </button>
                            )}

                            {vipLevel >= 10 && (
                              <div className="space-y-1 pt-0.5">
                                <button
                                  onClick={handleToggleAutoWorld}
                                  className={`w-full px-2.5 py-1.5 rounded-lg border text-left flex items-center justify-between cursor-pointer transition-colors ${
                                    state.vip.autoWorldEnabled
                                      ? 'bg-[#7A1E1A]/90 border-[#FCA5A5]/70 text-[#FFF1F0]'
                                      : 'bg-[#1B3230] border-[#3A5652] text-[#C8BEB0] hover:bg-[#223F3C]'
                                  }`}
                                >
                                  <span className="flex items-center gap-1.5 font-semibold text-[11px] truncate">
                                    <Swords className="w-3.5 h-3.5 shrink-0" />
                                    <span className="truncate">VIP 10 Thế Giới</span>
                                  </span>
                                  <span className="text-[10px] font-mono font-bold shrink-0">
                                    {state.vip.autoWorldEnabled ? 'BẬT' : 'TẮT'}
                                  </span>
                                </button>
                                <button
                                  onClick={() => {
                                    sfx.click();
                                    setShowAutoMenu(false);
                                    setVipTab('auto');
                                    setActiveModal('vip');
                                  }}
                                  className="w-full px-2.5 py-1 rounded-lg bg-[#241B11] hover:bg-[#3A2B18] border border-[#D4A24C]/60 text-[10px] text-[#FDE047] font-semibold flex items-center justify-between cursor-pointer"
                                >
                                  <span className="truncate">
                                    Mục tiêu:{' '}
                                    {(() => {
                                      const b = LEGENDARY_BOSSES.find((x) => x.id === state.vip.autoWorldBossId);
                                      if (b) return b.name;
                                      if (state.vip.autoWorldBossId === 'realm_only') return 'Chỉ Quét Bí Cảnh';
                                      return 'Tự Động (Bí Cảnh + Boss)';
                                    })()}
                                  </span>
                                  <span className="shrink-0 ml-1">Đổi</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })()}
                <span className="hidden xl:inline text-[11px] text-[#B7CEC3] font-mono">
                  Năm thứ {state.sectYear}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] sm:text-xs font-mono tabular-nums">
                <span className="text-[#FCA5A5] font-bold">Thực lực {formatNum(totalPower)}</span>
                <span className="hidden sm:inline text-[#98B5A8]">·</span>
                <span className="hidden sm:inline text-[#C9DFD4]">{masterRealm?.fullName}</span>
              </div>
            </div>
          </div>

          {/* Center Ornate Sect Level Medallion */}
          <div className="hidden md:flex items-center justify-center sect-level-plaque px-2 py-0 shrink-0">
            <span
              className="text-sm lg:text-base font-bold text-[#FCE6A6] tracking-wide whitespace-nowrap"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Tông Môn Cấp {state.sectLevel}
            </span>
          </div>

          {/* Right Resource Strip */}
          <div className="flex items-center gap-2 sm:gap-3.5 text-xs font-mono tabular-nums shrink-0">
            <div className="flex items-center gap-1.5">
              <ResourceIcon resource="linhThach" size="sm" />
              <div className="text-right">
                <div className="text-[10px] font-sans text-[#AFC6BB] leading-tight">Linh Thạch</div>
                <div className="font-bold text-[#F5D380] leading-tight">{formatNum(state.resources.linhThach)}</div>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <ResourceIcon resource="tienNgoc" size="sm" />
              <div className="text-right">
                <div className="text-[10px] font-sans text-[#AFC6BB] leading-tight">Tiên Ngọc</div>
                <div className="font-bold text-[#6EE7B7] leading-tight">{formatNum(state.resources.tienNgoc)}</div>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-1.5">
              <ResourceIcon resource="linhKhi" size="sm" />
              <div className="text-right">
                <div className="text-[10px] font-sans text-[#AFC6BB] leading-tight">Linh Khí</div>
                <div className="font-bold text-[#93C5FD] leading-tight">{formatNum(state.resources.linhKhi)}</div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 pl-2 border-l border-[#C9A45C]/35">
              <ResourceIcon resource="stamina" size="sm" />
              <div className="text-right">
                <div className="text-[10px] font-sans text-[#AFC6BB] leading-tight">Thể Lực</div>
                <div className="font-bold text-[#FDE047] leading-tight">
                  {state.resources.stamina}/{state.resources.maxStamina}
                </div>
              </div>
              <button
                onClick={() => {
                  sfx.click();
                  setVipTab('shop');
                  setActiveModal('vip');
                }}
                title="Mua thêm Thể Lực"
                aria-label="Mua thêm Thể Lực"
                className="w-6 h-6 rounded-full bg-[#D4A24C] hover:bg-[#F2D384] text-[#1E1408] flex items-center justify-center cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

      </header>

      {/* LEFT FLOATING STACK: COLLAPSIBLE QUESTS & SHORTCUTS */}
      <aside className="fixed left-2 sm:left-3 top-[82px] sm:top-[88px] z-20 flex flex-col pointer-events-none">
        {/* Unified Collapsible Quests & Shortcuts Drawer (collapsed by default for clean map) */}
        <div className="pointer-events-auto">
          {(() => {
            const unclaimedQuests = state.quests.filter((q) => !q.claimed);
            const readyCount = unclaimedQuests.filter((q) => q.progress >= q.target).length;
            return (
              <div className="relative">
                <button
                  onClick={() => {
                    sfx.click();
                    setShowQuestPanel((prev) => !prev);
                  }}
                  className={`w-fit flex items-center gap-2 shortcut-banner-btn px-1 py-0.5 text-xs font-semibold cursor-pointer ${
                    readyCount > 0 ? 'text-[#FDE047]' : 'text-[#FCECC8]'
                  }`}
                >
                  <span
                    className={`w-6 h-6 rounded-full border flex items-center justify-center shrink-0 shadow ${
                      readyCount > 0
                        ? 'bg-[#8A5A0F] border-[#FDE047] text-[#FFF7D6]'
                        : 'bg-[#1D3532] border-[#E5C272] text-[#F5D687]'
                    }`}
                  >
                    <ScrollText className="w-3.5 h-3.5" />
                  </span>
                  <span className="whitespace-nowrap drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">
                    {readyCount > 0
                      ? `Nhiệm Vụ (${readyCount} quà)`
                      : unclaimedQuests.length > 0
                        ? `Nhiệm Vụ (${unclaimedQuests.length})`
                        : 'Tiện Ích'}
                  </span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-[#E5C272] transition-transform ${showQuestPanel ? 'rotate-180' : ''}`}
                  />
                </button>

                {showQuestPanel && (
                  <div className="mt-1.5 w-[235px] sm:w-[255px] rounded-xl bg-[#142725]/96 border border-[#C9A45C]/80 shadow-xl p-2 space-y-2">
                    <div className="space-y-1">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-[#C9A45C] px-1">
                        Nhiệm Vụ Tông Môn
                      </div>
                      {unclaimedQuests.length === 0 ? (
                        <div className="px-2 py-1 text-[11px] text-[#B7CEC3]">
                          Đã hoàn thành toàn bộ nhiệm vụ!
                        </div>
                      ) : (
                        unclaimedQuests.map((q) => {
                          const ready = q.progress >= q.target;
                          const catColor =
                            q.category === 'Chính' ? '#6EE7B7' : q.category === 'Phụ' ? '#F5D380' : '#93C5FD';
                          return (
                            <button
                              key={q.id}
                              onClick={() => handleQuestClick(q.id)}
                              className={`w-full text-left px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer ${
                                ready
                                  ? 'bg-[#214536]/95 border-[#FDE047] shadow-sm'
                                  : 'bg-[#1A312F]/90 hover:bg-[#22403D] border-[#C9A45C]/35'
                              }`}
                            >
                              <div className="text-[11px] text-[#F5ECD5] leading-snug">
                                <span className="font-bold" style={{ color: catColor }}>
                                  [{q.category}]
                                </span>{' '}
                                {q.title}{' '}
                                <span className="font-mono text-[#E2CE9F]">
                                  ({q.progress}/{q.target})
                                </span>
                              </div>
                              {ready && (
                                <div className="text-[10px] font-bold text-[#FDE047] mt-0.5">Nhấp để nhận thưởng!</div>
                              )}
                            </button>
                          );
                        })
                      )}
                    </div>

                    <div className="pt-1.5 border-t border-[#C9A45C]/30 space-y-1">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-[#C9A45C] px-1">
                        Lối Tắt Nhanh
                      </div>
                      {(() => {
                        const readyBuildings = (Object.keys(BUILDING_DEFS) as BuildingId[]).filter((bId) => {
                          const def = BUILDING_DEFS[bId];
                          return def.resourceProduced && Math.floor(state.buildings[bId].storedResource) > 0;
                        }).length;
                        return (
                          <button
                            onClick={() => {
                              handleHarvestAll();
                              setShowQuestPanel(false);
                            }}
                            className={`w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition-colors ${
                              readyBuildings > 0
                                ? 'bg-[#214536]/95 hover:bg-[#2A5745] border-[#FDE047]/80 text-[#FCE9A8]'
                                : 'bg-[#1A312F]/90 hover:bg-[#244542] border-[#C9A45C]/35 text-[#C5D6CD]'
                            }`}
                          >
                            <span className="flex items-center gap-2 min-w-0">
                              <ResourceIcon resource="linhThach" size="xs" />
                              <span className="truncate">Thu Hoạch Toàn Bộ</span>
                            </span>
                            {readyBuildings > 0 && (
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#8A5A0F] text-[#FFF7D6] shrink-0">
                                {readyBuildings}
                              </span>
                            )}
                          </button>
                        );
                      })()}
                      {[
                        {
                          label: 'Hữu Bang & Linh Mạch',
                          sprite: './assets/sprites/hud/huu_bang.png',
                          onClick: () => {
                            sfx.click();
                            setShowQuestPanel(false);
                            setAllianceTab('veins');
                            setActiveModal('alliance');
                          },
                        },
                        {
                          label: 'Du Ngoạn Bí Cảnh',
                          sprite: './assets/sprites/hud/du_ngoan.png',
                          onClick: () => {
                            sfx.click();
                            setShowQuestPanel(false);
                            setWorldTab('realms');
                            setActiveModal('world');
                          },
                        },
                        {
                          label: 'Chợ Giao Dịch Tự Do',
                          sprite: './assets/sprites/hud/cho_giao_dich.png',
                          onClick: () => {
                            sfx.click();
                            setShowQuestPanel(false);
                            setAllianceTab('market');
                            setActiveModal('alliance');
                          },
                        },
                      ].map((item) => (
                        <button
                          key={item.label}
                          onClick={item.onClick}
                          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg bg-[#1A312F]/90 hover:bg-[#244542] border border-[#C9A45C]/35 text-xs font-semibold text-[#FCECC8] cursor-pointer transition-colors"
                        >
                          <img
                            src={item.sprite}
                            alt=""
                            aria-hidden="true"
                            draggable={false}
                            className="w-6 h-6 rounded-full border border-[#E5C272] object-cover shrink-0 shadow"
                          />
                          <span className="truncate">{item.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </div>

      </aside>

      {/* BOTTOM-LEFT COLLAPSIBLE WORLD CHAT (stays tucked at very bottom-left corner, never covers Sơn Môn) */}
      <div className="fixed left-2 sm:left-3 bottom-[86px] sm:bottom-3 z-20 flex flex-col items-start gap-1.5">
        {showChatBox && (
          <div className="w-[240px] sm:w-[270px] rounded-lg bg-[#F5EFE0]/95 border-2 border-[#B89352] shadow-xl overflow-hidden text-[#24211C]">
            <div className="flex items-center justify-between px-2.5 py-1 bg-[#EAE1CD] border-b border-[#D4C39F] text-[10px] font-bold text-[#4A3B23]">
              <span>Kênh Thế Giới & Tông Môn</span>
              <button
                type="button"
                onClick={() => {
                  setShowChatBox(false);
                  setShowChatInput(false);
                }}
                className="px-1.5 py-0.5 rounded hover:bg-[#D8CAA8] text-[#5B4728] cursor-pointer"
                title="Thu gọn trò chuyện"
              >
                Ẩn
              </button>
            </div>
            <div className="px-2.5 py-1.5 max-h-32 overflow-y-auto space-y-1 text-[11px] leading-snug">
              {state.chatMessages.slice(0, 6).map((m) => (
                <div key={m.id} className="break-words">
                  <span
                    className="font-bold"
                    style={{
                      color:
                        m.channel === 'the_gioi'
                          ? '#B92B27'
                          : m.channel === 'bang_hoi'
                            ? '#257A52'
                            : '#8A5A0F',
                    }}
                  >
                    [{m.channel === 'the_gioi' ? 'Thế giới' : m.channel === 'bang_hoi' ? 'Bang hội' : 'Hệ thống'}]
                  </span>{' '}
                  <strong>{m.sender}:</strong> {m.text}
                </div>
              ))}
            </div>
            {showChatInput ? (
              <form onSubmit={submitWorldChat} className="flex border-t border-[#D4C39F] bg-[#FAF6EC]">
                <input
                  type="text"
                  autoFocus
                  value={chatText}
                  onChange={(e) => setChatText(e.target.value)}
                  placeholder="Nhắn kênh Thế Giới..."
                  className="flex-1 px-2 py-1 text-[11px] bg-transparent focus:outline-none"
                />
                <button type="submit" className="px-2 text-[#1E3B38] hover:text-[#B4690E] cursor-pointer">
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            ) : (
              <button
                onClick={() => setShowChatInput(true)}
                className="w-full px-2.5 py-1 border-t border-[#D4C39F] bg-[#EAE1CD]/80 hover:bg-[#DFD2B5] text-[10px] font-semibold text-[#5B5142] flex items-center justify-between cursor-pointer"
              >
                <span>Nhấp để nhập tin nhắn...</span>
                <MessageSquare className="w-3 h-3" />
              </button>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={() => {
            sfx.click();
            setShowChatBox((prev) => !prev);
          }}
          className="h-7 px-2.5 rounded-lg bg-[#152826]/92 hover:bg-[#1E3A37] border border-[#C9A45C]/70 text-[#FCECC8] text-[11px] font-semibold flex items-center gap-1.5 shadow-lg cursor-pointer transition-colors"
          title="Mở / Ẩn khung trò chuyện Thế Giới"
        >
          <MessageSquare className="w-3.5 h-3.5 text-[#F5D687]" />
          <span>Trò chuyện</span>
        </button>
      </div>

      {/* RIGHT FLOATING ACTION DRAWER (collapsed by default to keep waterfall clear) */}
      <aside className="fixed right-2 sm:right-3 top-[82px] sm:top-[88px] z-20 flex flex-col items-end gap-1.5">
        {(() => {
          const rightAlerts =
            unclaimedVipCount + (hasOfflineReady ? 1 : 0) + (!state.dailyGiftClaimed ? 1 : 0);
          return (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  sfx.click();
                  setShowRightMenu((prev) => !prev);
                }}
                className={`flex items-center gap-1.5 shortcut-banner-btn px-1 py-0.5 text-xs font-semibold cursor-pointer ${
                  rightAlerts > 0 ? 'text-[#FDE047]' : 'text-[#FCECC8]'
                }`}
                title="Mở / Ẩn menu Hoạt Động (VIP, Treo Máy, Quà Tặng, Boss, Xếp Hạng)"
              >
                <Crown className="w-3.5 h-3.5 text-[#F5D687] shrink-0" />
                <span className="whitespace-nowrap drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">
                  {rightAlerts > 0 ? `Hoạt Động (${rightAlerts})` : 'Hoạt Động'}
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-[#E5C272] transition-transform ${showRightMenu ? 'rotate-180' : ''}`}
                />
              </button>

              <button
                onClick={() => setState((prev) => ({ ...prev, soundEnabled: !prev.soundEnabled }))}
                className="w-9 h-9 rounded-full medallion-btn flex items-center justify-center text-[#F2D794] cursor-pointer shrink-0"
                title={state.soundEnabled ? 'Tắt âm thanh' : 'Bật âm thanh'}
              >
                {state.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>
            </div>
          );
        })()}

        {showRightMenu && (
          <div className="flex flex-col items-center gap-1.5 pt-1 pr-1">
            {[
              {
                id: 'vip',
                label: unclaimedVipCount > 0 ? `VIP ${vipLevel} (${unclaimedVipCount})` : `Nạp · VIP`,
                sprite: './assets/sprites/hud/vip.png',
                highlight: unclaimedVipCount > 0 || vipLevel === 0,
                onClick: () => {
                  sfx.click();
                  setShowRightMenu(false);
                  setVipTab('recharge');
                  setActiveModal('vip');
                },
              },
              {
                id: 'offline',
                label: 'Treo Máy',
                sprite: './assets/sprites/hud/treo_may.png',
                highlight: hasOfflineReady,
                onClick: () => {
                  sfx.click();
                  setShowRightMenu(false);
                  setActiveModal('offline');
                },
              },
              {
                id: 'gifts',
                label: 'Quà Tặng',
                sprite: './assets/sprites/hud/qua_tang.png',
                highlight: !state.dailyGiftClaimed,
                onClick: () => {
                  sfx.click();
                  setShowRightMenu(false);
                  setActiveModal('gifts');
                },
              },
              {
                id: 'boss',
                label: 'Săn Boss',
                sprite: './assets/sprites/hud/san_boss.png',
                highlight: false,
                onClick: () => {
                  sfx.click();
                  setShowRightMenu(false);
                  setWorldTab('bosses');
                  setActiveModal('world');
                },
              },
              {
                id: 'rank',
                label: 'Xếp Hạng',
                sprite: './assets/sprites/hud/xep_hang.png',
                highlight: false,
                onClick: () => {
                  sfx.click();
                  setShowRightMenu(false);
                  setWorldTab('leaderboard');
                  setActiveModal('world');
                },
              },
            ].map((btn) => (
              <button
                key={btn.id}
                onClick={btn.onClick}
                className="flex flex-col items-center group cursor-pointer"
              >
                <img
                  src={btn.sprite}
                  alt={btn.label}
                  draggable={false}
                  style={{ clipPath: 'inset(0 0 18% 0)' }}
                  className={`w-12 h-12 sm:w-14 sm:h-14 object-contain hud-icon-medallion ${
                    btn.highlight ? 'hud-icon-medallion-glow' : ''
                  }`}
                />
                <span className="relative z-10 -mt-4 sm:-mt-5 hud-label-scroll min-w-[74px] sm:min-w-[82px] h-[24px] sm:h-[26px] px-2.5 pt-1 flex items-center justify-center text-[9.5px] sm:text-[10px] font-bold text-[#351F09] whitespace-nowrap leading-none">
                  {btn.label}
                </span>
              </button>
            ))}
          </div>
        )}
      </aside>

      {/* BOTTOM NAVIGATION DOCK (Hand-drawn Xianxia medallions + scroll compass THẾ GIỚI button) */}
      <nav className="fixed bottom-1.5 sm:bottom-2.5 right-2 sm:right-4 left-2 sm:left-auto z-20 flex items-end justify-center sm:justify-end gap-1.5 sm:gap-2.5 pointer-events-none">
        <div className="pointer-events-auto flex items-end gap-1 sm:gap-2">
          {[
            {
              label: 'Xây Dựng',
              sprite: './assets/sprites/hud/xay_dung.png',
              onClick: () => {
                sfx.click();
                setSelectedBuildingId('chinh_dien');
                setActiveModal('buildings');
              },
            },
            {
              label: 'Tiên Đồ',
              sprite: './assets/sprites/hud/tien_do.png',
              onClick: () => {
                sfx.click();
                setWorldTab('realms');
                setActiveModal('world');
              },
            },
            {
              label: 'Đệ Tử',
              sprite: './assets/sprites/hud/de_tu.png',
              onClick: () => {
                sfx.click();
                setActiveModal('disciples');
              },
            },
            {
              label: 'Cổ Bảo',
              sprite: './assets/sprites/hud/co_bao.png',
              onClick: () => {
                sfx.click();
                setSelectedEquipDiscipleId(state.disciples[0]?.id || null);
                setActiveModal('equipment');
              },
            },
            {
              label: 'Tiên Minh',
              sprite: './assets/sprites/hud/tien_minh.png',
              onClick: () => {
                sfx.click();
                setAllianceTab('alliance');
                setActiveModal('alliance');
              },
            },
          ].map((nav) => (
            <button
              key={nav.label}
              onClick={nav.onClick}
              className="flex flex-col items-center cursor-pointer group"
            >
              <img
                src={nav.sprite}
                alt={nav.label}
                draggable={false}
                style={{ clipPath: 'inset(0 0 18% 0)' }}
                className="w-14 h-14 sm:w-16 sm:h-16 object-contain hud-icon-medallion"
              />
              <span className="relative z-10 -mt-5 hud-label-scroll min-w-[74px] sm:min-w-[84px] h-[25px] sm:h-[27px] px-2.5 pt-1 flex items-center justify-center text-[10px] sm:text-[11px] font-bold text-[#351F09] whitespace-nowrap leading-none">
                {nav.label}
              </span>
            </button>
          ))}

          {/* Corner Scroll-Compass Button: THẾ GIỚI */}
          <button
            onClick={() => {
              sfx.click();
              setWorldTab('bosses');
              setActiveModal('world');
            }}
            className="hidden sm:flex flex-col items-center justify-end cursor-pointer group ml-1"
            title="Mở Bản Đồ Thế Giới & Săn Boss Huyền Thoại"
          >
            <img
              src="./assets/sprites/hud/the_gioi.png"
              alt="THẾ GIỚI"
              draggable={false}
              className="w-28 h-[86px] object-contain hud-icon-medallion"
            />
            <span
              className="relative z-10 -mt-3 hud-label-scroll min-w-[96px] h-[28px] px-3 pt-1 flex items-center justify-center text-xs font-extrabold tracking-wide text-[#2C1806] whitespace-nowrap leading-none"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              THẾ GIỚI
            </span>
          </button>
        </div>
      </nav>

      {/* TOAST NOTIFICATION */}
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] px-4 py-2 rounded-lg bg-[#162B29]/95 border border-[#F2D384] text-[#FCEAB7] text-xs sm:text-sm font-semibold shadow-2xl max-w-md text-center">
          {toast}
        </div>
      )}

      {/* MODALS */}
      {activeModal === 'buildings' && (
        <SectBuildingsModal
          state={state}
          initialBuildingId={selectedBuildingId}
          onClose={() => setActiveModal(null)}
          onUpgradeBuilding={handleUpgradeBuilding}
          onHarvestAll={handleHarvestAll}
          onAssignDisciple={handleAssignDisciple}
          onRefinePill={handleRefinePill}
          onForgeEquipment={handleForgeEquipment}
        />
      )}

      {activeModal === 'disciples' && (
        <DisciplesModal
          state={state}
          onClose={() => setActiveModal(null)}
          onToggleFormation={handleToggleFormation}
          onInfuseQi={handleInfuseQi}
          onBreakthrough={handleBreakthrough}
          onRecruitDisciple={handleRecruitDisciple}
          onRefreshRecruits={handleRefreshRecruits}
          onOpenEquipmentFor={(dId) => {
            setSelectedEquipDiscipleId(dId);
            setActiveModal('equipment');
          }}
        />
      )}

      {activeModal === 'equipment' && (
        <EquipmentModal
          state={state}
          initialDiscipleId={selectedEquipDiscipleId}
          onClose={() => setActiveModal(null)}
          onEquipItem={handleEquipItem}
          onUnequipSlot={handleUnequipSlot}
          onQuickEquipBest={handleQuickEquipBest}
          onQuickEquipSet={handleQuickEquipSet}
          onEnhanceItem={handleEnhanceItem}
          onAscendItem={handleAscendItem}
          onSocketGem={handleSocketGem}
          onUnsocketGem={handleUnsocketGem}
          onMergeGems={handleMergeGems}
          onSellItem={handleSellItem}
        />
      )}

      {activeModal === 'world' && (
        <WorldRealmModal
          state={state}
          initialTab={worldTab}
          onClose={() => setActiveModal(null)}
          onStartCombat={handleStartCombat}
          onSweepRealm={handleSweepRealm}
        />
      )}

      {activeModal === 'alliance' && (
        <AllianceMarketModal
          state={state}
          initialTab={allianceTab}
          onClose={() => setActiveModal(null)}
          onDonateAlliance={handleDonateAlliance}
          onUpgradeAllianceTech={handleUpgradeAllianceTech}
          onSendChat={handleSendChat}
          onChallengeVein={handleStartCombat}
          onClaimVeinTribute={handleClaimVeinTribute}
          onBuyListing={handleBuyListing}
          onListEquipmentForSale={handleListEquipmentForSale}
          onRefreshMarket={handleRefreshMarket}
        />
      )}

      {(activeModal === 'offline' || activeModal === 'gifts') && (
        <OfflineIdleModal
          state={state}
          mode={activeModal}
          onClose={() => setActiveModal(null)}
          onClaimOffline={handleClaimOffline}
          onSimulateOfflineBoost={handleSimulateOfflineBoost}
          onClaimDailyGift={handleClaimDailyGift}
        />
      )}

      {activeModal === 'vip' && (
        <VipModal
          state={state}
          totalPower={totalPower}
          initialTab={vipTab}
          onClose={() => setActiveModal(null)}
          onRechargePack={handleRechargePack}
          onRedeemCardCode={handleRedeemCardCode}
          onClaimVipMilestone={handleClaimVipMilestone}
          onBuyStaminaPack={handleBuyStaminaPack}
          onBuyVipShopItem={handleBuyVipShopItem}
          onToggleAutoDisciple={handleToggleAutoDisciple}
          onToggleAutoSect={handleToggleAutoSect}
          onToggleAutoGem={handleToggleAutoGem}
          onToggleAutoWorld={handleToggleAutoWorld}
          onSelectAutoWorldBoss={handleSelectAutoWorldBoss}
          onEquipFashion={handleEquipFashion}
        />
      )}

      {/* TURN-BASED COMBAT OVERLAY */}
      {activeCombat && (
        <CombatArena
          state={state}
          context={activeCombat}
          onFinish={handleCombatFinish}
          onClose={() => setActiveCombat(null)}
        />
      )}
    </div>
  );
}
