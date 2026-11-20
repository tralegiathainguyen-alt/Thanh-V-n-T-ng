import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Eye, EyeOff, Minus, Plus, RotateCcw } from 'lucide-react';
import { BUILDING_DEFS, REALM_LADDER, VIP_FASHIONS } from '../data/constants';
import { BuildingId, GameState, SpiritRootGrade } from '../types/game';
import {
  BuildingSprite,
  CharacterSheetConfig,
  DisciplePortrait,
  FlightTrailStyle,
  RealmAuraConfig,
  getDiscipleRobeFilter,
  getDiscipleSheetConfig,
  getFlightTrailStyle,
  getRealmAuraConfig,
} from './ElementIcons';

import { getVfxRingPreset } from '../data/vfxRings';
import { getVfxAuraIndexForRealm } from '../data/vfxAuras';
import { CharacterAuraVFX } from './CharacterAuraVFX';
import { SectAmbientVFX, SectSeason } from './SectAmbientVFX';

const SECT_SEASON_STORAGE_KEY = 'thanh_van_sect_season';
const SECT_SEASONS: Array<{ id: SectSeason; assetId: string; label: string; icon: string; bgUrl: string }> = [
  { id: 'xuan', assetId: 'map_season_xuan', label: 'Xuân', icon: '🌸', bgUrl: './assets/aistudio/sect_xuan.png' },
  { id: 'ha', assetId: 'map_season_ha', label: 'Hạ', icon: '☀', bgUrl: './assets/aistudio/sect_ha.png' },
  { id: 'thu', assetId: 'map_main', label: 'Thu', icon: '🍁', bgUrl: './assets/aistudio/1_80f8120e.png' },
  { id: 'dong', assetId: 'map_season_dong', label: 'Đông', icon: '❄', bgUrl: './assets/aistudio/sect_dong.png' },
];
import {
  ASSET_OVERRIDES_EVENT,
  GlobalMapTuning,
  getCustomAssetUrl,
  loadAssetStudioConfig,
} from '../utils/assetOverrides';

const sectVfxRingCache = new Map<number, HTMLImageElement>();
function getSectVfxRingImage(ringId: number): HTMLImageElement | null {
  if (typeof Image === 'undefined') return null;
  let img = sectVfxRingCache.get(ringId);
  if (!img) {
    const preset = getVfxRingPreset(ringId);
    img = new Image();
    img.src = preset.transparentUrl;
    sectVfxRingCache.set(ringId, img);
  }
  return img;
}

interface SectMapViewProps {
  state: GameState;
  onSelectBuilding: (id: BuildingId) => void;
  onHarvestBuilding: (id: BuildingId) => void;
  onOpenDisciples: () => void;
}

// Natural dimensions of /assets/aistudio/1_80f8120e.png (2752 x 1536)
const MAP_IMG_W = 2752;
const MAP_IMG_H = 1536;
const MAP_ASPECT = MAP_IMG_W / MAP_IMG_H;
// Crop bottom 6.8% white scroll border while keeping the full mountain & pagoda intact
const MAP_VISIBLE_H_RATIO = 0.932;

const MIN_ZOOM = 1.0;
const MAX_ZOOM = 3.6;
const ZOOM_STEP = 0.25;

// Internal VFX canvas logical resolution (scales crisply to any zoom/viewport)
const VFX_W = 1376;
const VFX_H = 768;

// Connected walkable stone-path graph + long-range scenic aerial flight targets (including across the waterfall to Tàng Kinh Các!)
interface Waypoint {
  id: string;
  x: number;
  y: number;
  neighbors: string[]; // Short ground paths (Walk / Khinh Công Jump)
  flightTargets?: string[]; // Long-range aerial destinations (Ngự Kiếm / Ngự Pháp Bảo curved flight)
}

const WALK_GRAPH: Waypoint[] = [
  {
    id: 'gate',
    x: 35.5,
    y: 71.0,
    neighbors: ['road_mid'],
    flightTargets: ['hall_steps', 'garden_path', 'furnace_yard'],
  },
  {
    id: 'road_mid',
    x: 41.0,
    y: 66.5,
    neighbors: ['gate', 'stairs_bot', 'forge_steps'],
    flightTargets: ['hall_east', 'garden_path'],
  },
  {
    id: 'forge_steps',
    x: 38.0,
    y: 58.5,
    neighbors: ['road_mid', 'forge_yard'],
  },
  {
    id: 'forge_yard',
    x: 33.2,
    y: 54.5,
    neighbors: ['forge_steps'],
    flightTargets: ['hall_steps', 'tang_kinh_terrace', 'garden_path'],
  },
  {
    id: 'stairs_bot',
    x: 46.0,
    y: 62.0,
    neighbors: ['road_mid', 'stairs_mid', 'lawn_west'],
  },
  {
    id: 'stairs_mid',
    x: 49.0,
    y: 55.0,
    neighbors: ['stairs_bot', 'furnace_yard'],
  },
  {
    id: 'furnace_yard',
    x: 53.5,
    y: 47.0,
    neighbors: ['stairs_mid', 'hall_steps'],
    flightTargets: ['tang_kinh_terrace', 'gate', 'garden_path'],
  },
  {
    id: 'hall_steps',
    x: 59.5,
    y: 39.5,
    neighbors: ['furnace_yard', 'hall_east'],
    flightTargets: ['tang_kinh_terrace', 'gate', 'forge_yard', 'array_side'],
  },
  {
    id: 'hall_east',
    x: 67.2,
    y: 43.0,
    neighbors: ['hall_steps'],
    flightTargets: ['tang_kinh_terrace', 'garden_path', 'forge_yard'],
  },
  {
    id: 'lawn_west',
    x: 51.2,
    y: 66.8,
    neighbors: ['stairs_bot', 'array_side'],
  },
  {
    id: 'array_side',
    x: 56.4,
    y: 72.2,
    neighbors: ['lawn_west', 'garden_path'],
    flightTargets: ['hall_steps', 'tang_kinh_terrace', 'forge_yard'],
  },
  {
    id: 'garden_path',
    x: 64.5,
    y: 68.5,
    neighbors: ['array_side'],
    flightTargets: ['tang_kinh_terrace', 'hall_east', 'furnace_yard', 'gate'],
  },
  // Tàng Kinh Các cliff terrace across the waterfall (reachable exclusively by Ngự Kiếm / Ngự Pháp Bảo Flight!)
  {
    id: 'tang_kinh_terrace',
    x: 92.4,
    y: 41.2,
    neighbors: [],
    flightTargets: ['hall_east', 'hall_steps', 'garden_path', 'furnace_yard'],
  },
];

const WAYPOINT_MAP: Record<string, Waypoint> = Object.fromEntries(WALK_GRAPH.map((w) => [w.id, w]));

const START_NODES = ['hall_steps', 'road_mid', 'garden_path', 'furnace_yard', 'forge_yard', 'array_side'];

// Direct clickable footprint for each painted sect building (percentage of stage)
// Rendered underneath disciples (z-[70]) so nothing ever obstructs characters, while clicking any building opens it
const BUILDING_HITZONES: Record<BuildingId, { cx: number; cy: number; w: number; h: number }> = {
  chinh_dien: { cx: 68.2, cy: 26.5, w: 17.5, h: 22 },
  tu_linh_tran: { cx: 60.2, cy: 71.0, w: 11.5, h: 17 },
  duoc_dien: { cx: 68.8, cy: 66.0, w: 11.5, h: 17 },
  luyen_dan_phong: { cx: 50.8, cy: 40.5, w: 11.5, h: 18 },
  luyen_khi_cac: { cx: 33.5, cy: 50.5, w: 14.5, h: 19 },
  tang_kinh_cac: { cx: 94.0, cy: 28.5, w: 11.5, h: 20 },
  truyen_tong_tran: { cx: 29.0, cy: 74.5, w: 13.0, h: 21 },
};

// Pixel-exact foreground maple occluders carved directly from 1_80f8120e.png for authentic 2.5D Y-sorting
interface MapOccluder {
  id: string;
  src: string;
  leftPct: number;
  topPct: number;
  widthPct: number;
  heightPct: number;
  baseY: number; // Ground trunk Y% used to compute exact Y-sorting zIndex
  fixedZ?: number; // Optional foreground camera framing branch
}

const MAP_OCCLUDERS: MapOccluder[] = [
  {
    id: 'maple_center',
    src: './assets/sprites/map/occ_maple_center.png',
    leftPct: (1400 / MAP_IMG_W) * 100,
    topPct: (725 / MAP_IMG_H) * 100,
    widthPct: (310 / MAP_IMG_W) * 100,
    heightPct: (235 / MAP_IMG_H) * 100,
    baseY: 63.5,
  },
  {
    id: 'maple_bottom',
    src: './assets/sprites/map/occ_maple_bottom.png',
    leftPct: (1060 / MAP_IMG_W) * 100,
    topPct: (1095 / MAP_IMG_H) * 100,
    widthPct: (350 / MAP_IMG_W) * 100,
    heightPct: (235 / MAP_IMG_H) * 100,
    baseY: 85.0,
  },
  {
    id: 'maple_top_left',
    src: './assets/sprites/map/occ_maple_top_left.png',
    leftPct: 0,
    topPct: 0,
    widthPct: (740 / MAP_IMG_W) * 100,
    heightPct: (490 / MAP_IMG_H) * 100,
    baseY: 99,
    fixedZ: 1180,
  },
];

interface TrailPoint {
  xPct: number; // Stage X%
  yPct: number; // Stage Y% (including aerial lift)
  life: number;
  maxLife: number;
}

interface VfxParticle {
  kind: 'leaf' | 'qi' | 'dust' | 'spark' | 'smoke' | 'petal' | 'rune' | 'snowflake';
  x: number; // VFX canvas px
  y: number;
  vx: number;
  vy: number;
  size: number;
  rot: number;
  vrot: number;
  life: number;
  maxLife: number;
  color: string;
  glyph?: string;
}

const DAO_RUNES = ['道', '劍', '玄', '靈', '法', '氣', '仙'];
const PETAL_COLORS = ['#86EFAC', '#4ADE80', '#FDE047', '#F9A8D4', '#A7F3D0'];

interface VfxRing {
  x: number; // VFX canvas px
  y: number;
  radius: number;
  maxRadius: number;
  life: number;
  maxLife: number;
  color: string;
}

interface WalkerState {
  currNode: string;
  nextNode: string | null;
  prevNode: string | null;
  x: number; // Ground X%
  y: number; // Ground Y%
  currentLiftPct: number; // Current aerial vertical offset (% of stage height, negative = higher)
  progress: number;
  speed: number; // % of image width per second
  pauseUntil: number;
  facingLeft: boolean;
  phase: number;
  moveMode: 'walk' | 'fly' | 'jump';
  flightPeakPx: number;
  flightCurveY: number; // Subtle vertical bow on curved aerial trajectory (% of map height)
  animTime: number;
  stepTimer: number;
  sheet: CharacterSheetConfig | null;
  trailStyle: FlightTrailStyle | null;
  realmAura: RealmAuraConfig | null;
  spiritRoot: SpiritRootGrade;
  trail: TrailPoint[];
}

const LEAF_COLORS = ['#D94A27', '#E67E22', '#C0392B', '#F09D38', '#B8331A'];

const RESOURCE_LABELS: Record<string, string> = {
  linhThach: 'Linh Thạch',
  linhKhi: 'Linh Khí',
  linhThao: 'Linh Thảo',
  huyenThiet: 'Huyền Thiết',
  cuongHoaThach: 'Cường Hóa Thạch',
  dotPhaDan: 'Đột Phá Đan',
};

function isForcedLandscape(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerHeight > window.innerWidth && window.innerWidth <= 900;
}

function toLocalPoint(clientX: number, clientY: number, rect?: DOMRect | null) {
  if (!rect) return { x: clientX, y: clientY };
  if (isForcedLandscape()) {
    return { x: clientY - rect.top, y: rect.right - clientX };
  }
  return { x: clientX - rect.left, y: clientY - rect.top };
}

function computeBaseStage(cw: number, ch: number) {
  const safeW = Math.max(cw, 320);
  const safeH = Math.max(ch, 240);
  const minHForHeight = safeH / MAP_VISIBLE_H_RATIO;
  const minHForWidth = safeW / MAP_ASPECT;
  const height = Math.max(minHForHeight, minHForWidth);
  const width = height * MAP_ASPECT;
  const overflowX = Math.max(0, width - safeW);
  const overflowY = Math.max(0, height * MAP_VISIBLE_H_RATIO - safeH);
  // Bias default horizontal framing toward right so both Sơn Môn and Tàng Kinh Các stay visible
  const defaultLeft = -overflowX * 0.92;
  const defaultTop = -overflowY * 0.35;
  return { cw: safeW, ch: safeH, width, height, defaultLeft, defaultTop };
}

function clampPosition(left: number, top: number, stageW: number, stageH: number, cw: number, ch: number) {
  const minLeft = Math.min(0, cw - stageW);
  const minTop = Math.min(0, ch - stageH * MAP_VISIBLE_H_RATIO);
  return {
    left: Math.min(0, Math.max(minLeft, left)),
    top: Math.min(0, Math.max(minTop, top)),
  };
}

export function SectMapView({
  state,
  onSelectBuilding,
  onHarvestBuilding,
  onOpenDisciples,
}: SectMapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const groundVfxCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const vfxCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [studioConfig, setStudioConfig] = useState(() => loadAssetStudioConfig());
  const mapTuning = studioConfig.globalMap;
  const studioConfigRef = useRef(studioConfig);
  studioConfigRef.current = studioConfig;
  const mapTuningRef = useRef<GlobalMapTuning>(mapTuning);
  mapTuningRef.current = mapTuning;

  useEffect(() => {
    const onTuningChanged = () => {
      const next = loadAssetStudioConfig();
      studioConfigRef.current = next;
      mapTuningRef.current = next.globalMap;
      setStudioConfig(next);
    };
    window.addEventListener(ASSET_OVERRIDES_EVENT, onTuningChanged);
    return () => window.removeEventListener(ASSET_OVERRIDES_EVENT, onTuningChanged);
  }, []);
  const [viewport, setViewport] = useState(() =>
    typeof window !== 'undefined'
      ? { cw: window.innerWidth, ch: window.innerHeight }
      : { cw: 1440, ch: 810 },
  );

  // Camera zoom & pan offset (absolute stage left/top)
  const [zoom, setZoom] = useState(1.0);
  const [camPos, setCamPos] = useState<{ left: number; top: number } | null>(null);
  const [isSmoothZoom, setIsSmoothZoom] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const dragRef = useRef<{
    active: boolean;
    pointerId: number | null;
    startX: number;
    startY: number;
    origLeft: number;
    origTop: number;
    moved: boolean;
  }>({ active: false, pointerId: null, startX: 0, startY: 0, origLeft: 0, origTop: 0, moved: false });

  // Pinch-to-zoom pointer tracker
  const activePointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchRef = useRef<{
    initialDist: number;
    initialZoom: number;
    centerImgX: number;
    centerImgY: number;
  } | null>(null);

  // Measure unrotated container size (clientWidth/clientHeight stay true landscape even under CSS rotate(90deg))
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const cw = el.clientWidth;
      const ch = el.clientHeight;
      if (cw > 0 && ch > 0) {
        setViewport({ cw, ch });
      }
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  const base = useMemo(() => computeBaseStage(viewport.cw, viewport.ch), [viewport.cw, viewport.ch]);
  const stageW = base.width * zoom;
  const stageH = base.height * zoom;

  const resolvedPos = useMemo(() => {
    const rawLeft = camPos ? camPos.left : base.defaultLeft;
    const rawTop = camPos ? camPos.top : base.defaultTop;
    return clampPosition(rawLeft, rawTop, stageW, stageH, base.cw, base.ch);
  }, [camPos, base.defaultLeft, base.defaultTop, stageW, stageH, base.cw, base.ch]);

  // Keep refs of current geometry for wheel, pointer & VFX handlers
  const geomRef = useRef({ base, zoom, stageW, stageH, left: resolvedPos.left, top: resolvedPos.top });
  geomRef.current = { base, zoom, stageW, stageH, left: resolvedPos.left, top: resolvedPos.top };

  const applyZoomAtPoint = useCallback((nextZoomRaw: number, clientX: number, clientY: number, smooth: boolean) => {
    const el = containerRef.current;
    const { base: b, stageW: curW, stageH: curH, left: curLeft, top: curTop } = geomRef.current;
    const nextZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number(nextZoomRaw.toFixed(3))));
    const rect = el?.getBoundingClientRect();
    const pt = rect ? toLocalPoint(clientX, clientY, rect) : { x: b.cw / 2, y: b.ch / 2 };

    const imgRatioX = (pt.x - curLeft) / curW;
    const imgRatioY = (pt.y - curTop) / curH;

    const nextW = b.width * nextZoom;
    const nextH = b.height * nextZoom;
    const nextLeft = pt.x - imgRatioX * nextW;
    const nextTop = pt.y - imgRatioY * nextH;

    setIsSmoothZoom(smooth);
    setZoom(nextZoom);
    setCamPos(clampPosition(nextLeft, nextTop, nextW, nextH, b.cw, b.ch));
  }, []);

  const handleZoomByStep = useCallback(
    (delta: number) => {
      const el = containerRef.current;
      const rect = el?.getBoundingClientRect();
      const cx = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
      const cy = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;
      applyZoomAtPoint(geomRef.current.zoom + delta, cx, cy, true);
    },
    [applyZoomAtPoint],
  );

  const handleResetCamera = useCallback(() => {
    setIsSmoothZoom(true);
    setZoom(MIN_ZOOM);
    setCamPos(null);
  }, []);

  // Mouse wheel zoom anchored at cursor
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      applyZoomAtPoint(geomRef.current.zoom * factor, e.clientX, e.clientY, false);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [applyZoomAtPoint]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if ((e.target as HTMLElement).closest('[data-camera-control="true"]')) return;

    const rect = containerRef.current?.getBoundingClientRect();
    const pt = toLocalPoint(e.clientX, e.clientY, rect);
    activePointersRef.current.set(e.pointerId, { x: pt.x, y: pt.y });

    if (activePointersRef.current.size === 2) {
      const pts = Array.from(activePointersRef.current.values());
      const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      const localX = (pts[0].x + pts[1].x) / 2;
      const localY = (pts[0].y + pts[1].y) / 2;
      const { stageW: curW, stageH: curH, left: curLeft, top: curTop, zoom: curZoom } = geomRef.current;
      pinchRef.current = {
        initialDist: Math.max(10, dist),
        initialZoom: curZoom,
        centerImgX: (localX - curLeft) / curW,
        centerImgY: (localY - curTop) / curH,
      };
      dragRef.current.active = false;
      setIsDragging(false);
      return;
    }

    const { left, top } = geomRef.current;
    dragRef.current = {
      active: true,
      pointerId: e.pointerId,
      startX: pt.x,
      startY: pt.y,
      origLeft: left,
      origTop: top,
      moved: false,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    const pt = toLocalPoint(e.clientX, e.clientY, rect);
    if (activePointersRef.current.has(e.pointerId)) {
      activePointersRef.current.set(e.pointerId, { x: pt.x, y: pt.y });
    }

    if (activePointersRef.current.size === 2 && pinchRef.current) {
      const pts = Array.from(activePointersRef.current.values());
      const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      const localX = (pts[0].x + pts[1].x) / 2;
      const localY = (pts[0].y + pts[1].y) / 2;
      const { base: b } = geomRef.current;
      const nextZoom = Math.min(
        MAX_ZOOM,
        Math.max(MIN_ZOOM, pinchRef.current.initialZoom * (dist / pinchRef.current.initialDist)),
      );
      const nextW = b.width * nextZoom;
      const nextH = b.height * nextZoom;
      const nextLeft = localX - pinchRef.current.centerImgX * nextW;
      const nextTop = localY - pinchRef.current.centerImgY * nextH;
      setIsSmoothZoom(false);
      setZoom(nextZoom);
      setCamPos(clampPosition(nextLeft, nextTop, nextW, nextH, b.cw, b.ch));
      return;
    }

    if (!dragRef.current.active || dragRef.current.pointerId !== e.pointerId) return;
    const dx = pt.x - dragRef.current.startX;
    const dy = pt.y - dragRef.current.startY;
    if (!dragRef.current.moved && Math.hypot(dx, dy) > 6) {
      dragRef.current.moved = true;
      setIsDragging(true);
      setIsSmoothZoom(false);
      (e.currentTarget as HTMLDivElement).setPointerCapture?.(e.pointerId);
    }
    if (dragRef.current.moved) {
      const { base: b, stageW: curW, stageH: curH } = geomRef.current;
      const clamped = clampPosition(
        dragRef.current.origLeft + dx,
        dragRef.current.origTop + dy,
        curW,
        curH,
        b.cw,
        b.ch,
      );
      setCamPos(clamped);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    activePointersRef.current.delete(e.pointerId);
    if (activePointersRef.current.size < 2) {
      pinchRef.current = null;
    }
    if (dragRef.current.pointerId === e.pointerId) {
      dragRef.current.active = false;
      dragRef.current.pointerId = null;
      if (dragRef.current.moved) {
        window.setTimeout(() => {
          dragRef.current.moved = false;
        }, 60);
      }
      setIsDragging(false);
    }
  };

  const handleDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return;
    if (geomRef.current.zoom > 1.15) {
      handleResetCamera();
    } else {
      applyZoomAtPoint(1.65, e.clientX, e.clientY, true);
    }
  };

  // Building labels hidden by default (toggleable manually via utility button only, never on hover)
  const [showBuildingLabels, setShowBuildingLabels] = useState(false);
  // Zero-re-render refs for bespoke per-building 60fps hover VFX animations
  const hoveredBuildingRef = useRef<BuildingId | null>(null);
  const buildingHoverIntensityRef = useRef<Record<BuildingId, number>>({
    chinh_dien: 0,
    tu_linh_tran: 0,
    duoc_dien: 0,
    luyen_dan_phong: 0,
    luyen_khi_cac: 0,
    tang_kinh_cac: 0,
    truyen_tong_tran: 0,
  });

  // Display exactly the active formation disciples (up to 5) strolling & sword-flying around the sect
  const strollingDisciples = useMemo(() => {
    return state.disciples
      .filter((d) => d.inFormation)
      .sort((a, b) => a.formationOrder - b.formationOrder)
      .slice(0, 5);
  }, [state.disciples]);

  // Direct DOM refs for 60fps zero-re-render disciple animation & canvas VFX
  const walkerDomRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const walkerSpriteRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const walkerSheetRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const walkerShadowRefs = useRef<Record<string, HTMLSpanElement | null>>({});
  const walkersRef = useRef<Record<string, WalkerState>>({});
  const particlesRef = useRef<VfxParticle[]>([]);
  const ringsRef = useRef<VfxRing[]>([]);

  // Ensure every strolling disciple has a walker entry and remove swapped-out disciples
  const discipleKey = strollingDisciples
    .map((d) => `${d.id}:${d.name}:${d.element}:${d.realmIndex}:${d.spiritRoot}`)
    .join(',');
  useEffect(() => {
    const now = performance.now();
    const activeIds = new Set(strollingDisciples.map((d) => d.id));
    Object.keys(walkersRef.current).forEach((id) => {
      if (!activeIds.has(id)) {
        delete walkersRef.current[id];
        delete walkerDomRefs.current[id];
        delete walkerSpriteRefs.current[id];
        delete walkerSheetRefs.current[id];
        delete walkerShadowRefs.current[id];
      }
    });
    strollingDisciples.forEach((disc, idx) => {
      const sheet = getDiscipleSheetConfig(disc.name, disc.element);
      const trailStyle = sheet ? getFlightTrailStyle(sheet, disc.spiritRoot) : null;
      const realmAura = getRealmAuraConfig(disc.realmIndex, disc.spiritRoot);
      if (!walkersRef.current[disc.id]) {
        const startId = START_NODES[idx % START_NODES.length];
        const wp = WAYPOINT_MAP[startId];
        walkersRef.current[disc.id] = {
          currNode: startId,
          nextNode: null,
          prevNode: null,
          x: wp.x,
          y: wp.y,
          currentLiftPct: 0,
          progress: 0,
          speed: 3.15 + (idx % 3) * 0.42,
          pauseUntil: now + 350 + idx * 550,
          facingLeft: idx % 2 === 1,
          phase: idx * 1.4,
          moveMode: 'walk',
          flightPeakPx: 42,
          flightCurveY: 0,
          animTime: idx * 0.27,
          stepTimer: 0,
          sheet,
          trailStyle,
          realmAura,
          spiritRoot: disc.spiritRoot,
          trail: [],
        };
      } else {
        walkersRef.current[disc.id].sheet = sheet;
        walkersRef.current[disc.id].trailStyle = trailStyle;
        walkersRef.current[disc.id].realmAura = realmAura;
        walkersRef.current[disc.id].spiritRoot = disc.spiritRoot;
      }
    });
  }, [discipleKey, strollingDisciples]);

  // 60fps Animation & 3-Layer Realism VFX Loop:
  // Layer 1: Short Walk vs Long Curved Aerial Flight + Elemental Luminous Trail + Shrinking Ground Shadow
  // Layer 2: Footstep Spirit Dust + Takeoff Qi Burst + Landing Maple Leaves & Qi Ripple
  // Layer 3: True Sub-Pixel Y-Sorting (characters + foreground maple trees + aerial flight elevation)
  useEffect(() => {
    let rafId = 0;
    let lastTime = performance.now();

    const spawnTakeoffBurst = (xPct: number, yPct: number, color: string) => {
      const cx = (xPct / 100) * VFX_W;
      const cy = (yPct / 100) * VFX_H;
      ringsRef.current.push({
        x: cx,
        y: cy,
        radius: 4,
        maxRadius: 28,
        life: 0,
        maxLife: 0.45,
        color,
      });
      for (let i = 0; i < 8; i++) {
        const ang = (Math.PI * 2 * i) / 8 + Math.random() * 0.4;
        const spd = 18 + Math.random() * 28;
        particlesRef.current.push({
          kind: 'qi',
          x: cx + (Math.random() - 0.5) * 10,
          y: cy + (Math.random() - 0.5) * 4,
          vx: Math.cos(ang) * spd,
          vy: -14 - Math.random() * 28,
          size: 2.0 + Math.random() * 2.2,
          rot: 0,
          vrot: 0,
          life: 0,
          maxLife: 0.55 + Math.random() * 0.35,
          color,
        });
      }
    };

    const spawnLandingEffect = (xPct: number, yPct: number, color: string, isHeavy: boolean) => {
      const cx = (xPct / 100) * VFX_W;
      const cy = (yPct / 100) * VFX_H;
      ringsRef.current.push({
        x: cx,
        y: cy,
        radius: 5,
        maxRadius: isHeavy ? 34 : 22,
        life: 0,
        maxLife: isHeavy ? 0.52 : 0.38,
        color,
      });
      // Fluttering autumn maple leaves scattered gently on touch-down
      const leafCount = isHeavy ? 6 : 3;
      for (let i = 0; i < leafCount; i++) {
        const dir = Math.random() * Math.PI * 2;
        const spd = 16 + Math.random() * 34;
        particlesRef.current.push({
          kind: 'leaf',
          x: cx + (Math.random() - 0.5) * 14,
          y: cy - 2 - Math.random() * 6,
          vx: Math.cos(dir) * spd,
          vy: -18 - Math.random() * 22,
          size: 3.2 + Math.random() * 2.4,
          rot: Math.random() * Math.PI * 2,
          vrot: (Math.random() - 0.5) * 7.5,
          life: 0,
          maxLife: 0.95 + Math.random() * 0.65,
          color: LEAF_COLORS[Math.floor(Math.random() * LEAF_COLORS.length)],
        });
      }
      // Subtle elemental qi motes
      const qiCount = isHeavy ? 7 : 4;
      for (let i = 0; i < qiCount; i++) {
        const ang = Math.random() * Math.PI * 2;
        const spd = 14 + Math.random() * 24;
        particlesRef.current.push({
          kind: 'qi',
          x: cx,
          y: cy,
          vx: Math.cos(ang) * spd,
          vy: -10 - Math.random() * 22,
          size: 1.8 + Math.random() * 1.8,
          rot: 0,
          vrot: 0,
          life: 0,
          maxLife: 0.5 + Math.random() * 0.35,
          color,
        });
      }
    };

    const spawnFootstepDust = (xPct: number, yPct: number, facingLeft: boolean, color: string) => {
      const cx = (xPct / 100) * VFX_W;
      const cy = (yPct / 100) * VFX_H;
      const backDir = facingLeft ? 1 : -1;
      for (let i = 0; i < 2; i++) {
        particlesRef.current.push({
          kind: 'dust',
          x: cx + backDir * (3 + Math.random() * 4),
          y: cy - 1 + (Math.random() - 0.5) * 3,
          vx: backDir * (6 + Math.random() * 10),
          vy: -4 - Math.random() * 8,
          size: 2.0 + Math.random() * 1.6,
          rot: 0,
          vrot: 0,
          life: 0,
          maxLife: 0.38 + Math.random() * 0.22,
          color: i === 0 ? '#F2DFB6' : color,
        });
      }
    };

    const tick = (now: number) => {
      const dt = Math.min(0.08, (now - lastTime) / 1000);
      lastTime = now;

      const walkers = walkersRef.current;
      const currentStageH = Math.max(240, geomRef.current.stageH);

      for (const id of Object.keys(walkers)) {
        const w = walkers[id];
        const btn = walkerDomRefs.current[id];
        const sprite = walkerSpriteRefs.current[id];
        const sheetEl = walkerSheetRefs.current[id];
        const shadowEl = walkerShadowRefs.current[id];
        if (!btn) continue;

        // Age existing trail points
        for (let i = w.trail.length - 1; i >= 0; i--) {
          w.trail[i].life += dt;
          if (w.trail[i].life >= w.trail[i].maxLife) {
            w.trail.splice(i, 1);
          }
        }

        let isMoving = false;
        const pColor = w.sheet?.particleColor || '#F5D68B';

        if (!w.nextNode) {
          if (now >= w.pauseUntil) {
            const curr = WAYPOINT_MAP[w.currNode];
            const hasFlightTargets = Boolean(curr.flightTargets && curr.flightTargets.length > 0);
            const mustFly = curr.neighbors.length === 0 && hasFlightTargets;
            const wantLongFlight = Boolean(w.sheet) && hasFlightTargets && (mustFly || Math.random() < 0.42);

            if (wantLongFlight && curr.flightTargets) {
              const flyPool = curr.flightTargets.filter((n) => n !== w.prevNode);
              const pool = flyPool.length > 0 ? flyPool : curr.flightTargets;
              const chosen = pool[Math.floor(Math.random() * pool.length)];
              const to = WAYPOINT_MAP[chosen];
              const legDist = Math.hypot(to.x - curr.x, to.y - curr.y);
              w.nextNode = chosen;
              w.progress = 0;
              w.moveMode = 'fly';
              w.flightPeakPx = Math.min(68, Math.max(36, legDist * 1.45));
              w.flightCurveY = -Math.min(7.5, Math.max(3.0, legDist * 0.16));
              if (Math.abs(to.x - curr.x) > 0.3) w.facingLeft = to.x < curr.x;
              spawnTakeoffBurst(w.x, w.y, pColor);
            } else if (curr.neighbors.length > 0) {
              const candidates = curr.neighbors.filter((n) => n !== w.prevNode);
              const pool = candidates.length > 0 ? candidates : curr.neighbors;
              const chosen = pool[Math.floor(Math.random() * pool.length)];
              const to = WAYPOINT_MAP[chosen];
              w.nextNode = chosen;
              w.progress = 0;
              if (w.sheet && Math.random() < 0.2) {
                w.moveMode = 'jump';
                spawnTakeoffBurst(w.x, w.y, pColor);
              } else {
                w.moveMode = 'walk';
              }
              if (Math.abs(to.x - curr.x) > 0.3) w.facingLeft = to.x < curr.x;
            }
          }
        } else {
          const from = WAYPOINT_MAP[w.currNode];
          const to = WAYPOINT_MAP[w.nextNode];
          const dist = Math.hypot(to.x - from.x, to.y - from.y);
          const speedMult = w.moveMode === 'fly' ? 2.45 : w.moveMode === 'jump' ? 1.38 : 1.0;
          const duration = Math.max(0.75, dist / (w.speed * speedMult));
          w.progress += dt / duration;

          if (w.progress >= 1) {
            const finishedMode = w.moveMode;
            w.prevNode = w.currNode;
            w.currNode = w.nextNode;
            w.nextNode = null;
            w.x = to.x;
            w.y = to.y;
            w.progress = 0;
            w.moveMode = 'walk';
            // Landing effect: maple leaves & spirit qi ripple on touch-down!
            if (finishedMode === 'fly' || finishedMode === 'jump') {
              spawnLandingEffect(w.x, w.y, pColor, finishedMode === 'fly');
            }
            w.pauseUntil = now + 1500 + Math.random() * 2400;
          } else {
            isMoving = true;
            const p = w.progress;
            if (w.moveMode === 'fly') {
              // Smooth ease-in-out along a gentle curved trajectory
              const eased = 0.5 - 0.5 * Math.cos(p * Math.PI);
              w.x = from.x + (to.x - from.x) * eased;
              // Ground shadow glides along the terrain directly beneath the curved flight arc
              const curveArch = Math.sin(eased * Math.PI) * (w.flightCurveY * 0.45);
              w.y = from.y + (to.y - from.y) * eased + curveArch;
            } else if (w.moveMode === 'jump') {
              w.x = from.x + (to.x - from.x) * p;
              w.y = from.y + (to.y - from.y) * p;
            } else {
              const eased = 0.5 - 0.5 * Math.cos(p * Math.PI);
              w.x = from.x + (to.x - from.x) * eased;
              w.y = from.y + (to.y - from.y) * eased;
            }
            if (Math.abs(to.x - from.x) > 0.3) {
              w.facingLeft = to.x < from.x;
            }
          }
        }

        w.animTime += dt;
        const flipX = w.facingLeft ? -1 : 1;
        let aerialBoostZ = 0;

        if (w.sheet && sheetEl) {
          let row = 0; // Idle
          let col = Math.floor(w.animTime * 4.5) % 4;
          let offsetY = 0;
          let tiltDeg = 0;
          let shadowScale = 1;

          if (isMoving) {
            if (w.moveMode === 'fly') {
              // Row 2: Ngự Kiếm / Ngự Pháp Bảo high curved flight!
              row = 2;
              col = Math.floor(w.animTime * 9.5) % 4;
              const arc = Math.sin(w.progress * Math.PI);
              const hoverWave = Math.sin(w.animTime * 7.5) * 2.8;
              offsetY = -arc * w.flightPeakPx + hoverWave * arc;
              tiltDeg = (w.facingLeft ? -1 : 1) * (4.2 * arc);
              shadowScale = Math.max(0.38, 1 - arc * 0.58);
              aerialBoostZ = Math.round(arc * 360);

              // Record luminous flight trail behind feet/treasure (customized by Spirit Root!)
              const liftPct = (offsetY / currentStageH) * 100;
              w.currentLiftPct = liftPct;
              const trailOffsetX = w.facingLeft ? 1.0 : -1.0;
              w.trail.push({
                xPct: w.x + trailOffsetX,
                yPct: w.y + liftPct - 1.1,
                life: 0,
                maxLife: w.trailStyle?.type === 'wind' ? 0.52 : 0.44,
              });
              if (w.trail.length > 28) w.trail.shift();

              // Emit Spirit-Root-specific wake particles while soaring
              const tStyle = w.trailStyle;
              const emitRate = tStyle?.type === 'ice' ? 24 : tStyle?.type === 'lightning' ? 26 : 20;
              if (tStyle && Math.random() < dt * emitRate) {
                const cx = ((w.x + trailOffsetX) / 100) * VFX_W;
                const cy = ((w.y + liftPct - 1.1) / 100) * VFX_H;
                if (tStyle.type === 'ice') {
                  // Băng Biến Dị: Crisp rotating 6-pointed crystalline snowflakes
                  particlesRef.current.push({
                    kind: 'snowflake',
                    x: cx + (Math.random() - 0.5) * 12,
                    y: cy + (Math.random() - 0.5) * 10,
                    vx: (w.facingLeft ? 1 : -1) * (8 + Math.random() * 14),
                    vy: 8 + Math.random() * 16,
                    size: 3.4 + Math.random() * 2.6,
                    rot: Math.random() * Math.PI,
                    vrot: (Math.random() - 0.5) * 3.5,
                    life: 0,
                    maxLife: 0.65 + Math.random() * 0.4,
                    color: Math.random() < 0.5 ? '#E0F2FE' : '#7DD3FC',
                  });
                } else if (tStyle.type === 'wind') {
                  // Phong Biến Dị: Swirling jade wind petals & emerald breeze sparks
                  particlesRef.current.push({
                    kind: Math.random() < 0.55 ? 'petal' : 'qi',
                    x: cx + (Math.random() - 0.5) * 12,
                    y: cy + (Math.random() - 0.5) * 10,
                    vx: (w.facingLeft ? 1 : -1) * (18 + Math.random() * 22),
                    vy: (Math.random() - 0.5) * 18,
                    size: 2.4 + Math.random() * 2.0,
                    rot: Math.random() * Math.PI * 2,
                    vrot: (Math.random() - 0.5) * 8,
                    life: 0,
                    maxLife: 0.55 + Math.random() * 0.35,
                    color: Math.random() < 0.5 ? '#6EE7B7' : '#A7F3D0',
                  });
                } else if (tStyle.type === 'lightning') {
                  // Lôi Biến Dị: Crackling electric violet sparks
                  particlesRef.current.push({
                    kind: 'spark',
                    x: cx + (Math.random() - 0.5) * 10,
                    y: cy + (Math.random() - 0.5) * 10,
                    vx: (Math.random() - 0.5) * 58,
                    vy: (Math.random() - 0.5) * 52,
                    size: 1.5 + Math.random() * 1.4,
                    rot: 0,
                    vrot: 0,
                    life: 0,
                    maxLife: 0.25 + Math.random() * 0.2,
                    color: Math.random() < 0.5 ? '#F5D0FE' : '#A855F7',
                  });
                } else {
                  particlesRef.current.push({
                    kind: 'qi',
                    x: cx + (Math.random() - 0.5) * 6,
                    y: cy + (Math.random() - 0.5) * 6,
                    vx: (w.facingLeft ? 1 : -1) * (10 + Math.random() * 16),
                    vy: (Math.random() - 0.5) * 12,
                    size: 1.5 + Math.random() * 1.8,
                    rot: 0,
                    vrot: 0,
                    life: 0,
                    maxLife: 0.35 + Math.random() * 0.25,
                    color: Math.random() < 0.5 ? tStyle.core : tStyle.primary,
                  });
                }
              }
            } else if (w.moveMode === 'jump') {
              // Row 3: Agile Khinh Công leap using character-specific jump frames
              row = 3;
              const p = w.progress;
              const [cTakeoff, cMid, cLand] = w.sheet.jumpCols;
              col = p < 0.22 ? cTakeoff : p < 0.78 ? cMid : cLand;
              const arc = Math.sin(p * Math.PI);
              offsetY = -arc * 26;
              w.currentLiftPct = (offsetY / currentStageH) * 100;
              shadowScale = 1 - arc * 0.44;
              aerialBoostZ = Math.round(arc * 120);
            } else {
              // Row 1: Ground walk cycle + gentle footstep dust puffs
              row = 1;
              col = Math.floor(w.animTime * 8.5) % 4;
              offsetY = 0;
              w.currentLiftPct = 0;
              shadowScale = 1;
              w.stepTimer += dt;
              if (w.stepTimer >= 0.28) {
                w.stepTimer = 0;
                spawnFootstepDust(w.x, w.y, w.facingLeft, pColor);
              }
            }
          } else {
            w.currentLiftPct = 0;
          }

          const posX = (col * 100) / 3;
          const posY = (row * 100) / 3;
          sheetEl.style.backgroundPosition = `${posX}% ${posY}%`;

          if (sprite) {
            sprite.style.transform = `translateY(${offsetY.toFixed(2)}px) rotate(${tiltDeg.toFixed(2)}deg) scaleX(${flipX})`;
          }
          if (shadowEl) {
            shadowEl.style.transform = `scale(${shadowScale.toFixed(2)})`;
            shadowEl.style.opacity = `${(0.24 + shadowScale * 0.52).toFixed(2)}`;
          }
        } else {
          w.phase += dt * (isMoving ? 11 : 2.6);
          const bobY = isMoving ? -Math.abs(Math.sin(w.phase)) * 3.8 : Math.sin(w.phase) * 1.1;
          const tiltDeg = isMoving ? Math.sin(w.phase) * 2.4 : 0;
          if (sprite) {
            sprite.style.transform = `translateY(${bobY.toFixed(2)}px) rotate(${tiltDeg.toFixed(2)}deg) scaleX(${flipX})`;
          }
        }

        // True sub-pixel Y-sorting (0.1% Y resolution) + aerial flight boost over treetops
        btn.style.left = `${w.x.toFixed(3)}%`;
        btn.style.top = `${w.y.toFixed(3)}%`;
        btn.style.zIndex = `${Math.round(100 + w.y * 10 + aerialBoostZ)}`;
      }

      // Render 60fps Elemental Flight Trails, Per-Building Signature Hover VFX, Ground Qi Ripples & Particles
      const canvas = vfxCanvasRef.current;
      const groundCanvas = groundVfxCanvasRef.current;
      const groundCtx = groundCanvas ? groundCanvas.getContext('2d') : null;
      if (groundCtx) {
        groundCtx.clearRect(0, 0, VFX_W, VFX_H);
      }
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, VFX_W, VFX_H);
          const sec = now * 0.001;

          // 0) Update & render unique Xianxia hover effect for each of the 7 buildings
          const hoveredId = hoveredBuildingRef.current;
          const intensities = buildingHoverIntensityRef.current;
          (Object.keys(intensities) as BuildingId[]).forEach((bId) => {
            const target = hoveredId === bId ? 1 : 0;
            const prevVal = intensities[bId];
            if (target > prevVal) {
              intensities[bId] = Math.min(1, prevVal + dt * 4.5);
            } else if (target < prevVal) {
              intensities[bId] = Math.max(0, prevVal - dt * 2.8);
            }
            const alpha = intensities[bId];
            if (alpha <= 0.01) return;

            if (bId === 'chinh_dien') {
              // Chính Điện: Imperial golden celestial light shafts + warm ascending halo
              const cx = 0.684 * VFX_W;
              const cy = 0.255 * VFX_H;
              ctx.save();
              ctx.globalCompositeOperation = 'lighter';
              // Radiant imperial glow behind roof
              const g = ctx.createRadialGradient(cx, cy, 8, cx, cy, 118);
              g.addColorStop(0, `rgba(254, 240, 138, ${(0.34 * alpha).toFixed(3)})`);
              g.addColorStop(0.55, `rgba(245, 158, 11, ${(0.14 * alpha).toFixed(3)})`);
              g.addColorStop(1, 'rgba(245, 158, 11, 0)');
              ctx.fillStyle = g;
              ctx.beginPath();
              ctx.arc(cx, cy, 118, 0, Math.PI * 2);
              ctx.fill();
              // Volumetric sunbeams fanning subtly above the grand eaves
              for (let i = -2; i <= 2; i++) {
                const sway = Math.sin(sec * 1.4 + i * 1.1) * 0.06;
                const ang = -Math.PI / 2 + i * 0.24 + sway;
                const len = 85 + (i % 2 === 0 ? 32 : 12);
                const beamGrad = ctx.createLinearGradient(cx, cy + 12, cx + Math.cos(ang) * len, cy + 12 + Math.sin(ang) * len);
                beamGrad.addColorStop(0, `rgba(253, 224, 71, ${(0.24 * alpha).toFixed(3)})`);
                beamGrad.addColorStop(1, 'rgba(253, 224, 71, 0)');
                ctx.fillStyle = beamGrad;
                ctx.beginPath();
                ctx.moveTo(cx - 10, cy + 14);
                ctx.lineTo(cx + 10, cy + 14);
                ctx.lineTo(cx + Math.cos(ang) * len + 20, cy + 12 + Math.sin(ang) * len);
                ctx.lineTo(cx + Math.cos(ang) * len - 20, cy + 12 + Math.sin(ang) * len);
                ctx.closePath();
                ctx.fill();
              }
              ctx.restore();
              if (hoveredId === bId && Math.random() < dt * 22) {
                particlesRef.current.push({
                  kind: 'qi',
                  x: cx + (Math.random() - 0.5) * 145,
                  y: cy + 32 + (Math.random() - 0.5) * 35,
                  vx: (Math.random() - 0.5) * 10,
                  vy: -24 - Math.random() * 28,
                  size: 1.8 + Math.random() * 2.2,
                  rot: 0,
                  vrot: 0,
                  life: 0,
                  maxLife: 0.9 + Math.random() * 0.6,
                  color: Math.random() < 0.55 ? '#FEF08A' : '#F59E0B',
                });
              }
            } else if (bId === 'tu_linh_tran') {
              // Tụ Linh Trận: Rotating isometric Daoist Bagua array rings + rising helix qi pillar
              const cx = 0.602 * VFX_W;
              const cy = 0.722 * VFX_H;
              ctx.save();
              ctx.globalCompositeOperation = 'lighter';
              // Soft rising spirit pillar
              const pGrad = ctx.createLinearGradient(cx, cy + 8, cx, cy - 115);
              pGrad.addColorStop(0, `rgba(253, 224, 71, ${(0.32 * alpha).toFixed(3)})`);
              pGrad.addColorStop(0.5, `rgba(110, 231, 183, ${(0.18 * alpha).toFixed(3)})`);
              pGrad.addColorStop(1, 'rgba(110, 231, 183, 0)');
              ctx.fillStyle = pGrad;
              ctx.fillRect(cx - 34, cy - 115, 68, 123);

              // Isometric counter-rotating spirit array rings
              ctx.translate(cx, cy);
              ctx.scale(1, 0.46);
              ctx.save();
              ctx.rotate(sec * 0.9);
              ctx.strokeStyle = `rgba(253, 224, 71, ${(0.82 * alpha).toFixed(3)})`;
              ctx.lineWidth = 2.4;
              ctx.setLineDash([12, 8]);
              ctx.beginPath();
              ctx.arc(0, 0, 62, 0, Math.PI * 2);
              ctx.stroke();
              ctx.setLineDash([]);
              // 8 directional array nodes
              for (let k = 0; k < 8; k++) {
                const a = (Math.PI * 2 * k) / 8;
                ctx.fillStyle = `rgba(254, 249, 195, ${(0.9 * alpha).toFixed(3)})`;
                ctx.beginPath();
                ctx.arc(Math.cos(a) * 62, Math.sin(a) * 62, 3.2, 0, Math.PI * 2);
                ctx.fill();
              }
              ctx.restore();

              ctx.save();
              ctx.rotate(-sec * 1.35);
              ctx.strokeStyle = `rgba(110, 231, 183, ${(0.78 * alpha).toFixed(3)})`;
              ctx.lineWidth = 2;
              ctx.beginPath();
              for (let k = 0; k < 6; k++) {
                const a = (Math.PI * 2 * k) / 6;
                const rx = Math.cos(a) * 42;
                const ry = Math.sin(a) * 42;
                if (k === 0) ctx.moveTo(rx, ry);
                else ctx.lineTo(rx, ry);
              }
              ctx.closePath();
              ctx.stroke();
              ctx.restore();
              ctx.restore();

              if (hoveredId === bId && Math.random() < dt * 28) {
                const a = Math.random() * Math.PI * 2;
                const rad = 18 + Math.random() * 34;
                particlesRef.current.push({
                  kind: 'qi',
                  x: cx + Math.cos(a) * rad,
                  y: cy + Math.sin(a) * rad * 0.45,
                  vx: -Math.sin(a) * 26,
                  vy: -38 - Math.random() * 36,
                  size: 1.8 + Math.random() * 2.0,
                  rot: 0,
                  vrot: 0,
                  life: 0,
                  maxLife: 0.85 + Math.random() * 0.45,
                  color: Math.random() < 0.5 ? '#6EE7B7' : '#FDE047',
                });
              }
            } else if (bId === 'duoc_dien') {
              // Linh Dược Điền: Verdant life-force aura + glowing emerald fireflies & floating herb petals
              const cx = 0.688 * VFX_W;
              const cy = 0.675 * VFX_H;
              ctx.save();
              ctx.globalCompositeOperation = 'lighter';
              const g = ctx.createRadialGradient(cx, cy, 8, cx, cy, 88);
              g.addColorStop(0, `rgba(74, 222, 128, ${(0.28 * alpha).toFixed(3)})`);
              g.addColorStop(0.6, `rgba(167, 243, 208, ${(0.12 * alpha).toFixed(3)})`);
              g.addColorStop(1, 'rgba(74, 222, 128, 0)');
              ctx.fillStyle = g;
              ctx.beginPath();
              ctx.ellipse(cx, cy, 88, 52, -0.2, 0, Math.PI * 2);
              ctx.fill();
              // Twinkling emerald fireflies orbiting the herb beds
              for (let i = 0; i < 6; i++) {
                const tOff = sec * 1.4 + i * 1.15;
                const fx = cx + Math.cos(tOff * 0.9 + i) * (22 + (i % 3) * 18);
                const fy = cy - 10 + Math.sin(tOff * 1.3 + i * 2) * 24;
                const pulse = 0.45 + 0.55 * Math.sin(sec * 5 + i * 1.7);
                ctx.fillStyle = `rgba(187, 247, 208, ${(pulse * alpha).toFixed(3)})`;
                ctx.beginPath();
                ctx.arc(fx, fy, 2.6, 0, Math.PI * 2);
                ctx.fill();
              }
              ctx.restore();

              if (hoveredId === bId && Math.random() < dt * 20) {
                particlesRef.current.push({
                  kind: 'petal',
                  x: cx + (Math.random() - 0.5) * 105,
                  y: cy + 16 + (Math.random() - 0.5) * 42,
                  vx: (Math.random() - 0.5) * 18,
                  vy: -20 - Math.random() * 22,
                  size: 2.6 + Math.random() * 2.2,
                  rot: Math.random() * Math.PI * 2,
                  vrot: (Math.random() - 0.5) * 4.5,
                  life: 0,
                  maxLife: 1.1 + Math.random() * 0.65,
                  color: PETAL_COLORS[Math.floor(Math.random() * PETAL_COLORS.length)],
                });
              }
            } else if (bId === 'luyen_dan_phong') {
              // Luyện Đan Lô: Flickering crimson-gold alchemy flames + swirling fragrant pill-aroma smoke wisps
              const cx = 0.509 * VFX_W;
              const cy = 0.428 * VFX_H;
              const flicker = 0.85 + 0.15 * Math.sin(sec * 16) + 0.08 * Math.cos(sec * 23);
              ctx.save();
              ctx.globalCompositeOperation = 'lighter';
              const g = ctx.createRadialGradient(cx, cy, 4, cx, cy, 62 * flicker);
              g.addColorStop(0, `rgba(254, 240, 138, ${(0.52 * alpha).toFixed(3)})`);
              g.addColorStop(0.45, `rgba(249, 115, 22, ${(0.34 * alpha).toFixed(3)})`);
              g.addColorStop(1, 'rgba(239, 68, 68, 0)');
              ctx.fillStyle = g;
              ctx.beginPath();
              ctx.arc(cx, cy, 62 * flicker, 0, Math.PI * 2);
              ctx.fill();
              ctx.restore();

              if (hoveredId === bId && Math.random() < dt * 26) {
                const isSmoke = Math.random() < 0.38;
                particlesRef.current.push({
                  kind: isSmoke ? 'smoke' : 'qi',
                  x: cx + (Math.random() - 0.5) * 28,
                  y: isSmoke ? cy - 22 : cy + (Math.random() - 0.5) * 14,
                  vx: (Math.random() - 0.5) * (isSmoke ? 16 : 22),
                  vy: isSmoke ? -26 - Math.random() * 20 : -34 - Math.random() * 34,
                  size: isSmoke ? 7 + Math.random() * 6 : 1.7 + Math.random() * 2.2,
                  rot: Math.random() * Math.PI * 2,
                  vrot: 0,
                  life: 0,
                  maxLife: isSmoke ? 1.15 + Math.random() * 0.5 : 0.65 + Math.random() * 0.4,
                  color: isSmoke ? '#FEF3C7' : Math.random() < 0.45 ? '#FDE047' : '#F97316',
                });
              }
            } else if (bId === 'luyen_khi_cac') {
              // Luyện Khí Các: Arcing blacksmith sparks with gravity + molten hearth glow + chimney smoke
              const hearthX = 0.312 * VFX_W;
              const hearthY = 0.515 * VFX_H;
              const anvilX = 0.345 * VFX_W;
              const anvilY = 0.528 * VFX_H;
              const chimneyX = 0.292 * VFX_W;
              const chimneyY = 0.398 * VFX_H;
              const pulse = 0.88 + 0.12 * Math.sin(sec * 12);
              ctx.save();
              ctx.globalCompositeOperation = 'lighter';
              const g = ctx.createRadialGradient(hearthX, hearthY, 5, hearthX, hearthY, 64 * pulse);
              g.addColorStop(0, `rgba(254, 215, 170, ${(0.45 * alpha).toFixed(3)})`);
              g.addColorStop(0.5, `rgba(234, 88, 12, ${(0.28 * alpha).toFixed(3)})`);
              g.addColorStop(1, 'rgba(234, 88, 12, 0)');
              ctx.fillStyle = g;
              ctx.beginPath();
              ctx.arc(hearthX, hearthY, 64 * pulse, 0, Math.PI * 2);
              ctx.fill();
              ctx.restore();

              if (hoveredId === bId && Math.random() < dt * 34) {
                const ang = -Math.PI * (0.2 + Math.random() * 0.6);
                const spd = 48 + Math.random() * 68;
                particlesRef.current.push({
                  kind: 'spark',
                  x: anvilX + (Math.random() - 0.5) * 32,
                  y: anvilY + (Math.random() - 0.5) * 16,
                  vx: Math.cos(ang) * spd,
                  vy: Math.sin(ang) * spd - 12,
                  size: 1.6 + Math.random() * 1.4,
                  rot: 0,
                  vrot: 0,
                  life: 0,
                  maxLife: 0.45 + Math.random() * 0.35,
                  color: Math.random() < 0.5 ? '#FEF08A' : '#FB923C',
                });
              }
              if (hoveredId === bId && Math.random() < dt * 9) {
                particlesRef.current.push({
                  kind: 'smoke',
                  x: chimneyX + (Math.random() - 0.5) * 10,
                  y: chimneyY,
                  vx: 10 + Math.random() * 12,
                  vy: -24 - Math.random() * 14,
                  size: 6 + Math.random() * 6,
                  rot: 0,
                  vrot: 0,
                  life: 0,
                  maxLife: 1.2 + Math.random() * 0.5,
                  color: '#E7E5E4',
                });
              }
            } else if (bId === 'tang_kinh_cac') {
              // Tàng Kinh Các: Floating golden-cyan Daoist runes & sword-intent light streaks
              const cx = 0.938 * VFX_W;
              const cy = 0.285 * VFX_H;
              ctx.save();
              ctx.globalCompositeOperation = 'lighter';
              const g = ctx.createRadialGradient(cx, cy, 8, cx, cy, 78);
              g.addColorStop(0, `rgba(125, 211, 252, ${(0.32 * alpha).toFixed(3)})`);
              g.addColorStop(0.55, `rgba(253, 224, 71, ${(0.16 * alpha).toFixed(3)})`);
              g.addColorStop(1, 'rgba(56, 189, 248, 0)');
              ctx.fillStyle = g;
              ctx.beginPath();
              ctx.arc(cx, cy, 78, 0, Math.PI * 2);
              ctx.fill();
              // Orbiting sword-intent halo arc
              ctx.strokeStyle = `rgba(186, 230, 253, ${(0.65 * alpha).toFixed(3)})`;
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.ellipse(cx, cy + 4, 52, 22, -0.22, sec * 2.2, sec * 2.2 + Math.PI * 1.15);
              ctx.stroke();
              ctx.restore();

              if (hoveredId === bId && Math.random() < dt * 8.5) {
                particlesRef.current.push({
                  kind: 'rune',
                  x: cx + (Math.random() - 0.5) * 86,
                  y: cy + 28 + (Math.random() - 0.5) * 26,
                  vx: (Math.random() - 0.5) * 10,
                  vy: -22 - Math.random() * 18,
                  size: 12 + Math.random() * 5,
                  rot: 0,
                  vrot: 0,
                  life: 0,
                  maxLife: 1.35 + Math.random() * 0.55,
                  color: Math.random() < 0.6 ? '#FEF08A' : '#7DD3FC',
                  glyph: DAO_RUNES[Math.floor(Math.random() * DAO_RUNES.length)],
                });
              }
            } else if (bId === 'truyen_tong_tran') {
              // Sơn Môn Bí Cảnh: Ethereal azure-violet spatial portal vortex shimmering inside the stone archway
              const cx = 0.289 * VFX_W;
              const cy = 0.768 * VFX_H;
              ctx.save();
              ctx.globalCompositeOperation = 'lighter';
              const g = ctx.createRadialGradient(cx, cy, 4, cx, cy, 56);
              g.addColorStop(0, `rgba(224, 242, 254, ${(0.58 * alpha).toFixed(3)})`);
              g.addColorStop(0.42, `rgba(56, 189, 248, ${(0.36 * alpha).toFixed(3)})`);
              g.addColorStop(0.78, `rgba(129, 140, 248, ${(0.22 * alpha).toFixed(3)})`);
              g.addColorStop(1, 'rgba(99, 102, 241, 0)');
              ctx.fillStyle = g;
              ctx.beginPath();
              ctx.ellipse(cx, cy, 44, 56, 0.14, 0, Math.PI * 2);
              ctx.fill();
              // Swirling concentric portal ripples
              for (let k = 0; k < 3; k++) {
                const phase = (sec * 0.85 + k / 3) % 1;
                ctx.strokeStyle = `rgba(186, 230, 253, ${((1 - phase) * 0.75 * alpha).toFixed(3)})`;
                ctx.lineWidth = 2.2 * (1 - phase * 0.5);
                ctx.beginPath();
                ctx.ellipse(cx, cy, 10 + phase * 34, 14 + phase * 44, 0.14, 0, Math.PI * 2);
                ctx.stroke();
              }
              ctx.restore();

              if (hoveredId === bId && Math.random() < dt * 24) {
                const a = Math.random() * Math.PI * 2;
                const rad = 18 + Math.random() * 28;
                particlesRef.current.push({
                  kind: 'qi',
                  x: cx + Math.cos(a) * rad * 0.85,
                  y: cy + Math.sin(a) * rad * 1.1,
                  vx: -Math.cos(a) * 16 - Math.sin(a) * 18,
                  vy: -Math.sin(a) * 16 + Math.cos(a) * 18,
                  size: 1.7 + Math.random() * 1.8,
                  rot: 0,
                  vrot: 0,
                  life: 0,
                  maxLife: 0.7 + Math.random() * 0.4,
                  color: Math.random() < 0.5 ? '#BAE6FD' : '#A5B4FC',
                });
              }
            }
          });

          // 0.5) Draw live 16-tier Additive VFX Magic Rings (Luyện Khí -> Độ Kiếp) beneath disciples
          for (const id of Object.keys(walkers)) {
            const w = walkers[id];
            const aura = w.realmAura;
            if (!aura) continue;
            const cx = (w.x / 100) * VFX_W;
            const cy = ((w.y + w.currentLiftPct) / 100) * VFX_H;
            const ringImg = getSectVfxRingImage(aura.vfxRingId);

            const tuning = mapTuningRef.current;
            const ringSave = studioConfigRef.current.vfxRings?.[aura.vfxRingId];
            const effSpeedMult = tuning.ringSpeedMult * (ringSave?.rotationSpeed ?? 1);
            const effScale = tuning.ringScale * (ringSave?.ringScale ?? 1);
            const effOffsetY = (ringSave?.ringOffsetY ?? tuning.ringOffsetY);
            const effBloom = ringSave?.bloomIntensity ?? 1.5;
            const effOpacity = tuning.ringOpacity * Math.min(1.5, 0.72 + effBloom * 0.22);
            const effParticleMult = ringSave?.particleDensity ?? 1;
            const showFloorLight = ringSave?.showFloorLight ?? true;
            const ringSpeed = aura.ringSpeed * effSpeedMult;

            // Preset-specific kinetics (smoke_water / cosmic_orbit / rune_circle / lightning_fire)
            let mainAngle = sec * ringSpeed + w.phase;
            let auraAngle = -sec * ringSpeed * 0.72 + w.phase;
            let auraScale = 1.12 + Math.sin(sec * 2.2 + w.phase) * 0.04;
            let flicker = 1.0;

            if (aura.vfxGroup === 'lightning_fire') {
              const snapStep = Math.floor(sec * 14 * Math.max(0.1, effSpeedMult) + w.phase * 5);
              mainAngle = (snapStep * 0.48) % (Math.PI * 2);
              auraAngle = -(snapStep * 0.31) % (Math.PI * 2);
              flicker = 0.8 + ((Math.sin(snapStep * 12.9898) * 43758.5453) % 1 + 1) * 0.22;
              auraScale = 1.14 + Math.sin(sec * 7.5 + w.phase) * 0.05;
            } else if (aura.vfxGroup === 'rune_circle') {
              mainAngle = sec * ringSpeed * 0.52 + w.phase;
              auraAngle = -sec * ringSpeed * 0.78 + w.phase;
              auraScale = 1.12 + Math.sin(sec * 1.8 + w.phase) * 0.05;
              flicker = 0.92 + Math.sin(sec * 2.3 + w.phase) * 0.1;
            } else if (aura.vfxGroup === 'smoke_water') {
              mainAngle = sec * ringSpeed * 0.65 + w.phase;
              auraAngle = -sec * ringSpeed * 0.42 + w.phase;
              flicker = 0.88 + Math.sin(sec * 1.9 + w.phase) * 0.1;
            }

            const ringCtx = groundCtx || ctx;
            ringCtx.save();
            ringCtx.globalCompositeOperation = 'lighter';

            // Ambient floor PointLight reflection beneath feet (drawn on ground layer UNDERNEATH feet)
            const lightR = aura.ringRadius * 1.45 * effScale;
            ringCtx.save();
            ringCtx.translate(cx, cy + effOffsetY);
            ringCtx.scale(1, 0.44);
            if (showFloorLight) {
              const floorGrad = ringCtx.createRadialGradient(0, 0, 2, 0, 0, lightR);
              floorGrad.addColorStop(0, aura.glowRgba);
              floorGrad.addColorStop(1, 'rgba(0,0,0,0)');
              ringCtx.fillStyle = floorGrad;
              ringCtx.globalAlpha = Math.min(0.95, (0.36 + aura.tier * 0.06) * flicker * effOpacity);
              ringCtx.beginPath();
              ringCtx.arc(0, 0, lightR, 0, Math.PI * 2);
              ringCtx.fill();
            }

            if (ringImg && ringImg.complete && ringImg.naturalWidth > 0) {
              const drawD = aura.ringRadius * 2.05 * effScale;
              // Secondary counter-rotating aura layer (1.12x scale, additive glow)
              ringCtx.save();
              ringCtx.rotate(auraAngle);
              ringCtx.globalCompositeOperation = 'lighter';
              ringCtx.globalAlpha = Math.min(0.8, (0.32 + aura.tier * 0.04) * flicker * effOpacity);
              const auraD = drawD * auraScale;
              ringCtx.drawImage(ringImg, -auraD / 2, -auraD / 2, auraD, auraD);
              ringCtx.restore();

              // Primary crisp transparent VFX ring layer
              ringCtx.save();
              ringCtx.rotate(mainAngle);
              ringCtx.globalCompositeOperation = 'source-over';
              ringCtx.globalAlpha = Math.min(1, (0.78 + aura.tier * 0.025) * flicker * tuning.ringOpacity);
              ringCtx.drawImage(ringImg, -drawD / 2, -drawD / 2, drawD, drawD);
              // Additive HDR bloom pass on top for glowing radiance
              ringCtx.globalCompositeOperation = 'lighter';
              ringCtx.globalAlpha = Math.min(0.95, (0.24 + effBloom * 0.24) * flicker * tuning.ringOpacity);
              ringCtx.drawImage(ringImg, -drawD * 0.525, -drawD * 0.525, drawD * 1.05, drawD * 1.05);
              ringCtx.restore();
            } else {
              // Brief fallback while sprite loads
              ringCtx.rotate(mainAngle);
              ringCtx.strokeStyle = aura.primary;
              ringCtx.globalAlpha = 0.45;
              ringCtx.lineWidth = 1.6;
              ringCtx.beginPath();
              ringCtx.arc(0, 0, aura.ringRadius, 0, Math.PI * 2);
              ringCtx.stroke();
            }
            ringCtx.restore();
            ringCtx.restore();

            ctx.save();
            ctx.globalCompositeOperation = 'lighter';

            // Orbiting luminous spirit beads (cosmic_orbit / rune_circle / lightning_fire)
            const orbCount =
              effParticleMult <= 0.05
                ? 0
                : aura.vfxGroup === 'smoke_water'
                  ? 1
                  : Math.min(5, Math.max(1, Math.round((1 + Math.floor(aura.tier / 2)) * effParticleMult)));
            for (let k = 0; k < orbCount; k++) {
              const ang = sec * (1.5 + aura.tier * 0.15) * Math.max(0.15, effSpeedMult) + w.phase + (Math.PI * 2 * k) / orbCount;
              const ox = cx + Math.cos(ang) * (aura.ringRadius * 0.85 * effScale);
              const oy = cy - 14 + Math.sin(ang) * 9 - Math.sin(ang * 2) * 4;
              ctx.fillStyle = k % 2 === 0 ? aura.secondary : aura.primary;
              ctx.globalAlpha = 0.72 * flicker;
              ctx.beginPath();
              ctx.arc(ox, oy, 1.6 + aura.tier * 0.13, 0, Math.PI * 2);
              ctx.fill();
            }

            // Crackling lightning filaments around body for Đại Thừa/Độ Kiếp or Lôi Biến Dị
            if (aura.hasLightning && Math.random() < dt * 11 * Math.max(0.2, effParticleMult)) {
              ctx.strokeStyle = aura.tier >= 7 ? '#FEF08A' : '#E9D5FF';
              ctx.globalAlpha = 0.84;
              ctx.lineWidth = 1.3;
              const a0 = Math.random() * Math.PI * 2;
              let lx = cx + Math.cos(a0) * 14;
              let ly = cy - 16 + Math.sin(a0) * 14;
              ctx.beginPath();
              ctx.moveTo(lx, ly);
              for (let s = 0; s < 3; s++) {
                lx += (Math.random() - 0.5) * 14;
                ly += (Math.random() - 0.5) * 14;
                ctx.lineTo(lx, ly);
              }
              ctx.stroke();
            }
            ctx.restore();

            // Ascending aura sparkles / outward lightning sparks
            if (Math.random() < dt * aura.particleRate * effParticleMult) {
              const isOutward = aura.vfxGroup === 'lightning_fire';
              const sparkAng = Math.random() * Math.PI * 2;
              particlesRef.current.push({
                kind: w.spiritRoot === 'bien_di_bang' ? 'snowflake' : 'qi',
                x: cx + (Math.random() - 0.5) * (aura.ringRadius * 1.4),
                y: cy - 2 - Math.random() * 14,
                vx: isOutward ? Math.cos(sparkAng) * (18 + Math.random() * 22) : (Math.random() - 0.5) * 8,
                vy: isOutward ? -10 - Math.random() * 20 : -16 - Math.random() * 18,
                size: w.spiritRoot === 'bien_di_bang' ? 2.6 + Math.random() * 1.5 : 1.4 + Math.random() * 1.5,
                rot: Math.random() * Math.PI,
                vrot: (Math.random() - 0.5) * 3,
                life: 0,
                maxLife: isOutward ? 0.42 + Math.random() * 0.3 : 0.65 + Math.random() * 0.4,
                color: Math.random() < 0.5 ? aura.secondary : aura.primary,
              });
            }
          }

          // 1) Draw glowing tapering flight trails behind flying disciples (specialized per Spirit Root!)
          for (const id of Object.keys(walkers)) {
            const w = walkers[id];
            if (!w.sheet || !w.trailStyle || w.trail.length < 2) continue;
            const ts = w.trailStyle;

            ctx.save();
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            for (let i = 1; i < w.trail.length; i++) {
              const p0 = w.trail[i - 1];
              const p1 = w.trail[i];
              const ageRatio = 1 - p1.life / p1.maxLife;
              if (ageRatio <= 0.02) continue;
              const x0 = (p0.xPct / 100) * VFX_W;
              const y0 = (p0.yPct / 100) * VFX_H;
              const x1 = (p1.xPct / 100) * VFX_W;
              const y1 = (p1.yPct / 100) * VFX_H;

              // Outer aura ribbon
              ctx.beginPath();
              ctx.moveTo(x0, y0);
              ctx.lineTo(x1, y1);
              ctx.strokeStyle = ts.primary;
              ctx.globalAlpha = ageRatio * 0.44;
              ctx.lineWidth = Math.max(1.5, ageRatio * 13 * ts.widthMult);
              ctx.stroke();

              // Bright luminous core ribbon
              ctx.beginPath();
              ctx.moveTo(x0, y0);
              ctx.lineTo(x1, y1);
              ctx.strokeStyle = ts.core;
              ctx.globalAlpha = ageRatio * 0.82;
              ctx.lineWidth = Math.max(0.8, ageRatio * 4.5 * ts.widthMult);
              ctx.stroke();

              // Spirit Root signature trail geometry overlays:
              if (ts.type === 'wind') {
                // Phong Biến Dị: Twin swirling emerald gale currents braided around the flight path
                const dx = x1 - x0;
                const dy = y1 - y0;
                const len = Math.hypot(dx, dy) || 1;
                const nx = -dy / len;
                const ny = dx / len;
                const wave0 = Math.sin(sec * 16 + (i - 1) * 0.85) * 9 * ageRatio;
                const wave1 = Math.sin(sec * 16 + i * 0.85) * 9 * ageRatio;
                ctx.beginPath();
                ctx.moveTo(x0 + nx * wave0, y0 + ny * wave0);
                ctx.lineTo(x1 + nx * wave1, y1 + ny * wave1);
                ctx.strokeStyle = '#A7F3D0';
                ctx.globalAlpha = ageRatio * 0.72;
                ctx.lineWidth = Math.max(0.8, ageRatio * 2.4);
                ctx.stroke();

                ctx.beginPath();
                ctx.moveTo(x0 - nx * wave0, y0 - ny * wave0);
                ctx.lineTo(x1 - nx * wave1, y1 - ny * wave1);
                ctx.strokeStyle = '#34D399';
                ctx.globalAlpha = ageRatio * 0.58;
                ctx.lineWidth = Math.max(0.7, ageRatio * 2.0);
                ctx.stroke();
              } else if (ts.type === 'lightning' && i % 2 === 0) {
                // Lôi Biến Dị: Jagged crackling purple-white lightning bolts zigzagging along the flight path
                const mx = (x0 + x1) * 0.5 + (Math.random() - 0.5) * 16 * ageRatio;
                const my = (y0 + y1) * 0.5 + (Math.random() - 0.5) * 16 * ageRatio;
                ctx.beginPath();
                ctx.moveTo(x0, y0);
                ctx.lineTo(mx, my);
                ctx.lineTo(x1, y1);
                ctx.strokeStyle = '#F5D0FE';
                ctx.globalAlpha = ageRatio * 0.92;
                ctx.lineWidth = Math.max(1.0, ageRatio * 2.4);
                ctx.stroke();
              } else if (ts.type === 'ice' && i % 3 === 0) {
                // Băng Biến Dị: Frosty diamond glints embedded along the frozen trail
                ctx.fillStyle = '#F0F9FF';
                ctx.globalAlpha = ageRatio * 0.85;
                ctx.beginPath();
                ctx.arc(x1, y1, Math.max(1, ageRatio * 2.8), 0, Math.PI * 2);
                ctx.fill();
              }
            }
            ctx.restore();
          }

          // 2) Draw isometric expanding ground qi rings (takeoff & landing)
          for (let i = ringsRef.current.length - 1; i >= 0; i--) {
            const r = ringsRef.current[i];
            r.life += dt;
            if (r.life >= r.maxLife) {
              ringsRef.current.splice(i, 1);
              continue;
            }
            const t = r.life / r.maxLife;
            const rad = r.radius + (r.maxRadius - r.radius) * (1 - Math.pow(1 - t, 2));
            ctx.save();
            ctx.translate(r.x, r.y);
            ctx.scale(1, 0.44); // Isometric ground perspective
            ctx.beginPath();
            ctx.arc(0, 0, rad, 0, Math.PI * 2);
            ctx.strokeStyle = r.color;
            ctx.globalAlpha = (1 - t) * 0.72;
            ctx.lineWidth = 2.4 * (1 - t * 0.6);
            ctx.stroke();
            ctx.restore();
          }

          // 3) Update & draw footsteps dust, elemental qi sparks, maple leaves & building hover particles
          for (let i = particlesRef.current.length - 1; i >= 0; i--) {
            const pt = particlesRef.current[i];
            pt.life += dt;
            if (pt.life >= pt.maxLife) {
              particlesRef.current.splice(i, 1);
              continue;
            }
            const t = pt.life / pt.maxLife;
            const prevX = pt.x;
            const prevY = pt.y;
            pt.x += pt.vx * dt;
            pt.y += pt.vy * dt;
            if (pt.kind === 'leaf') {
              pt.vy += 32 * dt; // Soft gravity
              pt.vx *= 0.97;
              pt.x += Math.sin(pt.life * 8 + pt.rot) * 14 * dt; // Fluttering sway
              pt.rot += pt.vrot * dt;
            } else if (pt.kind === 'spark') {
              pt.vy += 155 * dt; // Realistic blacksmith spark arc gravity
              pt.vx *= 0.98;
            } else if (pt.kind === 'smoke') {
              pt.x += Math.sin(pt.life * 4 + pt.rot) * 10 * dt;
              pt.vx *= 0.98;
              pt.vy *= 0.99;
            } else if (pt.kind === 'petal') {
              pt.x += Math.sin(pt.life * 5 + pt.rot) * 16 * dt;
              pt.rot += pt.vrot * dt;
              pt.vx *= 0.97;
            } else if (pt.kind === 'rune') {
              pt.x += Math.sin(pt.life * 3.2) * 8 * dt;
              pt.vy *= 0.99;
            } else if (pt.kind === 'snowflake') {
              pt.x += Math.sin(pt.life * 4.5 + pt.rot) * 10 * dt;
              pt.rot += pt.vrot * dt;
              pt.vx *= 0.96;
            } else if (pt.kind === 'qi') {
              pt.vx *= 0.95;
              pt.vy *= 0.96;
            } else {
              pt.vx *= 0.92;
              pt.vy *= 0.92;
            }

            ctx.save();
            const fadeEnvelope = t < 0.15 ? t / 0.15 : 1 - (t - 0.15) / 0.85;
            if (pt.kind === 'leaf') {
              ctx.globalAlpha = (1 - t) * 0.9;
              ctx.translate(pt.x, pt.y);
              ctx.rotate(pt.rot);
              ctx.fillStyle = pt.color;
              ctx.beginPath();
              ctx.moveTo(0, -pt.size);
              ctx.lineTo(pt.size * 0.75, 0);
              ctx.lineTo(0, pt.size * 0.9);
              ctx.lineTo(-pt.size * 0.75, 0);
              ctx.closePath();
              ctx.fill();
            } else if (pt.kind === 'snowflake') {
              // Crisp 6-pointed ice crystal snowflake
              ctx.globalAlpha = fadeEnvelope * 0.92;
              ctx.translate(pt.x, pt.y);
              ctx.rotate(pt.rot);
              ctx.strokeStyle = pt.color;
              ctx.lineWidth = 1.15;
              ctx.beginPath();
              for (let k = 0; k < 3; k++) {
                const a = (Math.PI * k) / 3;
                ctx.moveTo(Math.cos(a) * -pt.size, Math.sin(a) * -pt.size);
                ctx.lineTo(Math.cos(a) * pt.size, Math.sin(a) * pt.size);
              }
              ctx.stroke();
            } else if (pt.kind === 'petal') {
              ctx.globalAlpha = fadeEnvelope * 0.88;
              ctx.translate(pt.x, pt.y);
              ctx.rotate(pt.rot);
              ctx.fillStyle = pt.color;
              ctx.beginPath();
              ctx.ellipse(0, 0, pt.size, pt.size * 0.55, 0, 0, Math.PI * 2);
              ctx.fill();
            } else if (pt.kind === 'spark') {
              ctx.globalAlpha = (1 - t) * 0.95;
              ctx.strokeStyle = pt.color;
              ctx.lineWidth = Math.max(1, pt.size * (1 - t * 0.4));
              ctx.lineCap = 'round';
              ctx.beginPath();
              ctx.moveTo(prevX, prevY);
              ctx.lineTo(pt.x, pt.y);
              ctx.stroke();
            } else if (pt.kind === 'smoke') {
              ctx.globalAlpha = fadeEnvelope * 0.28;
              ctx.fillStyle = pt.color;
              ctx.beginPath();
              ctx.arc(pt.x, pt.y, pt.size * (0.7 + t * 1.15), 0, Math.PI * 2);
              ctx.fill();
            } else if (pt.kind === 'rune' && pt.glyph) {
              ctx.globalAlpha = fadeEnvelope * 0.92;
              ctx.font = `700 ${Math.round(pt.size)}px serif`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.shadowColor = pt.color;
              ctx.shadowBlur = 8;
              ctx.fillStyle = pt.color;
              ctx.fillText(pt.glyph, pt.x, pt.y);
            } else {
              ctx.globalAlpha = (1 - t) * (pt.kind === 'dust' ? 0.55 : 0.9);
              ctx.translate(pt.x, pt.y);
              ctx.fillStyle = pt.color;
              ctx.beginPath();
              ctx.arc(0, 0, pt.size * (1 - t * 0.35), 0, Math.PI * 2);
              ctx.fill();
            }
            ctx.restore();
          }
        }
      }

      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, []);

  const [season, setSeason] = useState<SectSeason>(() => {
    try {
      const saved = window.localStorage.getItem(SECT_SEASON_STORAGE_KEY);
      if (saved === 'xuan' || saved === 'ha' || saved === 'thu' || saved === 'dong') return saved;
    } catch {
      // Ignore storage access errors
    }
    return 'thu';
  });
  const handleSelectSeason = (next: SectSeason) => {
    setSeason(next);
    try {
      window.localStorage.setItem(SECT_SEASON_STORAGE_KEY, next);
    } catch {
      // Ignore storage write errors
    }
  };
  const activeSeasonMeta = SECT_SEASONS.find((s) => s.id === season) || SECT_SEASONS[2];

  const stageParallaxRef = useRef<HTMLDivElement | null>(null);
  const fgAmbientRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let targetX = 0;
    let targetY = 0;
    let curX = 0;
    let curY = 0;
    let rafId = 0;

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      targetX = Math.max(-1, Math.min(1, ((e.clientX - rect.left) / rect.width) * 2 - 1));
      targetY = Math.max(-1, Math.min(1, ((e.clientY - rect.top) / rect.height) * 2 - 1));
    };
    const onLeave = () => {
      targetX = 0;
      targetY = 0;
    };

    const tick = () => {
      curX += (targetX - curX) * 0.06;
      curY += (targetY - curY) * 0.06;
      if (stageParallaxRef.current) {
        stageParallaxRef.current.style.transform = `translate3d(${(-curX * 4).toFixed(2)}px, ${(-curY * 4).toFixed(2)}px, 0) scale(1.02)`;
      }
      if (fgAmbientRef.current) {
        fgAmbientRef.current.style.transform = `translate3d(${(-curX * 8).toFixed(2)}px, ${(-curY * 8).toFixed(2)}px, 0)`;
      }
      rafId = window.requestAnimationFrame(tick);
    };

    el.addEventListener('pointermove', onMove, { passive: true });
    el.addEventListener('pointerleave', onLeave, { passive: true });
    rafId = window.requestAnimationFrame(tick);
    return () => {
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
      window.cancelAnimationFrame(rafId);
    };
  }, []);

  const canPan = stageW > base.cw + 2 || stageH * MAP_VISIBLE_H_RATIO > base.ch + 2;
  const isModifiedCamera = zoom > MIN_ZOOM + 0.01 || camPos !== null;
  // Scale disciples & building labels proportionally when the full sect is zoomed out on narrow mobile screens
  const stageUnitScale = Math.max(0.38, Math.min(1, stageW / 960));
  const stageLabelScale = Math.max(0.58, Math.min(1, stageW / 860));

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onDoubleClick={handleDoubleClick}
      className={`relative z-0 isolate w-full h-full overflow-hidden select-none bg-[#122220] touch-none ${
        isDragging ? 'cursor-grabbing' : canPan ? 'cursor-grab' : 'cursor-default'
      }`}
    >
      {/* Aspect-locked stage: background art + occluders + VFX canvas + buildings + disciples share 100% identical coordinates */}
      <div
        ref={stageParallaxRef}
        className={`absolute z-0 isolate ${isSmoothZoom ? 'transition-[left,top,width,height] duration-200 ease-out' : ''}`}
        style={{
          width: `${stageW}px`,
          height: `${stageH}px`,
          left: `${resolvedPos.left}px`,
          top: `${resolvedPos.top}px`,
          transform: 'translate3d(0px, 0px, 0) scale(1.02)',
          willChange: 'transform',
        }}
      >
        {/* Clean 16:9 Isometric Sect Panorama (4 Seasons: Xuân · Hạ · Thu · Đông, bottom 6.8% border cropped cleanly) */}
        <img
          src={getCustomAssetUrl(activeSeasonMeta.assetId, activeSeasonMeta.bgUrl)}
          alt={`Bản đồ Sơn Môn Thanh Vân Tiên Tông — Mùa ${activeSeasonMeta.label}`}
          draggable={false}
          className="absolute inset-0 w-full h-full object-fill pointer-events-none"
          style={{
            clipPath: 'inset(0 0 6.8% 0)',
            filter: `brightness(${mapTuning.mapBrightness.toFixed(2)}) contrast(${mapTuning.mapContrast.toFixed(2)}) saturate(${mapTuning.mapSaturate.toFixed(2)})`,
          }}
        />

        {/* Localized Procedural Ambient VFX (Waterfall, Forge Smoke & Glow, Herb Fireflies, Valley Mist, Birds) */}
        <SectAmbientVFX layer="world" season={season} className="z-[55]" />

        {/* Floating ambient golden & jade spirit qi motes (locked to landmarks) */}
        <div className="pointer-events-none absolute inset-0 z-[50]">
          {[
            { left: '67.5%', top: '30%', delay: '0s', color: '#F5D68B' },
            { left: '60.2%', top: '70%', delay: '1.1s', color: '#8BE5C2' },
            { left: '68.5%', top: '63%', delay: '2.2s', color: '#A5E8B9' },
            { left: '94.2%', top: '28%', delay: '0.6s', color: '#7ED4F0' },
            { left: '50.8%', top: '42%', delay: '1.8s', color: '#F5D68B' },
          ].map((mote, i) => (
            <span
              key={i}
              className="absolute w-2 h-2 rounded-full animate-spirit-mote"
              style={{
                left: mote.left,
                top: mote.top,
                animationDelay: mote.delay,
                backgroundColor: mote.color,
                boxShadow: `0 0 10px ${mote.color}`,
              }}
            />
          ))}
        </div>

        {/* Layer 3: Y-Sorted Foreground Maple Tree Occluders (only for Autumn map so Spring/Summer/Winter trees stay clean) */}
        {season === 'thu' &&
          MAP_OCCLUDERS.map((occ) => (
            <img
              key={occ.id}
              src={occ.src}
              alt=""
              aria-hidden="true"
              draggable={false}
              className="pointer-events-none absolute object-fill select-none"
              style={{
                left: `${occ.leftPct}%`,
                top: `${occ.topPct}%`,
                width: `${occ.widthPct}%`,
                height: `${occ.heightPct}%`,
                zIndex: occ.fixedZ ?? Math.round(100 + occ.baseY * 10),
              }}
            />
          ))}

        {/* Ground VFX Layer (z-[60]): Drawn UNDERNEATH disciples so magic rings sit beneath feet without covering legs */}
        <canvas
          ref={groundVfxCanvasRef}
          width={VFX_W}
          height={VFX_H}
          className="pointer-events-none absolute inset-0 w-full h-full z-[60]"
        />

        {/* Layer 1 & 2: 60fps Foreground Canvas VFX Layer (Flight Trails, Orbiting Orbs, Lightning, Footstep Dust & Autumn Maple Leaves) */}
        <canvas
          ref={vfxCanvasRef}
          width={VFX_W}
          height={VFX_H}
          className="pointer-events-none absolute inset-0 w-full h-full z-[1120]"
        />

        {/* Invisible Direct-Click Building Triggers (trigger signature canvas VFX on hover, zero box outline or popup label) */}
        {(Object.keys(BUILDING_DEFS) as BuildingId[]).map((bId) => {
          const def = BUILDING_DEFS[bId];
          const bState = state.buildings[bId];
          const zone = BUILDING_HITZONES[bId];
          const harvestable = Math.floor(bState.storedResource);
          const canHarvest = harvestable >= 1 && def.resourceProduced !== null;

          return (
            <button
              key={`hit_${bId}`}
              type="button"
              onMouseEnter={() => {
                hoveredBuildingRef.current = bId;
              }}
              onMouseLeave={() => {
                if (hoveredBuildingRef.current === bId) hoveredBuildingRef.current = null;
              }}
              onFocus={() => {
                hoveredBuildingRef.current = bId;
              }}
              onBlur={() => {
                if (hoveredBuildingRef.current === bId) hoveredBuildingRef.current = null;
              }}
              onClick={() => {
                if (dragRef.current.moved) return;
                if (canHarvest) onHarvestBuilding(bId);
                onSelectBuilding(bId);
              }}
              aria-label={`${def.shortName} Lv.${bState.level}`}
              style={{
                left: `${zone.cx}%`,
                top: `${zone.cy}%`,
                width: `${zone.w}%`,
                height: `${zone.h}%`,
              }}
              className="absolute -translate-x-1/2 -translate-y-1/2 z-[70] bg-transparent cursor-pointer focus:outline-none"
            />
          );
        })}

        {/* Optional Building Nameplates: shown ONLY when the player explicitly toggles the Eye icon */}
        {showBuildingLabels &&
          (Object.keys(BUILDING_DEFS) as BuildingId[]).map((bId) => {
            const def = BUILDING_DEFS[bId];
            const bState = state.buildings[bId];
            const harvestable = Math.floor(bState.storedResource);
            const canHarvest = harvestable >= 1 && def.resourceProduced !== null;

            return (
              <div
                key={`lbl_${bId}`}
                className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 z-[1240] flex flex-col items-center"
                style={{ left: `${def.mapX}%`, top: `${def.mapY}%` }}
              >
                <div
                  className={`flex items-center gap-1.5 pl-1.5 pr-2.5 py-1 rounded-lg bg-[#162928]/90 border text-[#F6EBD0] shadow-md whitespace-nowrap ${
                    canHarvest ? 'border-[#F2D384]/90' : 'border-[#D4B06A]/75'
                  }`}
                  style={
                    stageLabelScale < 0.99
                      ? { transform: `scale(${stageLabelScale.toFixed(3)})`, transformOrigin: 'center center' }
                      : undefined
                  }
                >
                  <BuildingSprite buildingId={bId} className="w-4 h-4" />
                  <span className="text-[11px] sm:text-xs font-semibold tracking-tight">{def.shortName}</span>
                  <span className="text-[10px] font-mono tabular-nums text-[#F2D283]">Lv.{bState.level}</span>
                  {canHarvest && (
                    <span
                      aria-hidden="true"
                      className="w-1.5 h-1.5 rounded-full bg-[#FDE047] shadow-[0_0_6px_#FDE047] shrink-0"
                    />
                  )}
                </div>
              </div>
            );
          })}

        {/* Strolling, Leaping & Sword-Flying Disciples with True Sub-Pixel Y-Sorting */}
        {strollingDisciples.map((disc, idx) => {
          const startWp = WAYPOINT_MAP[START_NODES[idx % START_NODES.length]];
          const realm = REALM_LADDER[disc.realmIndex];
          const canBreak = disc.qi >= disc.maxQi;
          const fashion = disc.fashionId ? VIP_FASHIONS[disc.fashionId] : null;
          const sheetCfg = getDiscipleSheetConfig(disc.name, disc.element);
          const robeFilter = getDiscipleRobeFilter(disc.id, disc.name, disc.element);
          const realmAura = getRealmAuraConfig(disc.realmIndex, disc.spiritRoot);
          const effectiveDiscipleScale = mapTuning.discipleScale * stageUnitScale;
          return (
            <button
              key={disc.id}
              ref={(el) => {
                walkerDomRefs.current[disc.id] = el;
              }}
              onClick={() => {
                if (dragRef.current.moved) return;
                onOpenDisciples();
              }}
              style={{
                left: `${startWp.x}%`,
                top: `${startWp.y}%`,
                zIndex: Math.round(100 + startWp.y * 10),
              }}
              className="absolute -translate-x-1/2 -translate-y-[84%] flex flex-col items-center group cursor-pointer"
              title={`${disc.name} · ${realm?.fullName}${fashion ? ` · ${fashion.name}` : ''}`}
              aria-label={`${disc.name} (${realm?.fullName || ''})`}
            >
              <div
                ref={(el) => {
                  walkerSpriteRefs.current[disc.id] = el;
                }}
                className="will-change-transform"
              >
                <div
                  className="transition-transform group-hover:scale-110"
                  style={{
                    transform:
                      Math.abs(effectiveDiscipleScale - 1) > 0.01
                        ? `scale(${effectiveDiscipleScale.toFixed(3)})`
                        : undefined,
                    transformOrigin: 'bottom center',
                  }}
                >
                  <CharacterAuraVFX
                    auraId={getVfxAuraIndexForRealm(disc.realmIndex)}
                    characterHeight={72}
                    speed={mapTuning.ringSpeedMult}
                    intensity={Math.min(1.2, mapTuning.ringOpacity)}
                    phaseOffset={idx * 1.37}
                    showParticles={true}
                  >
                    {sheetCfg ? (
                      <div
                        className="relative w-20 h-20 flex items-center justify-center shrink-0"
                        style={{
                          filter: fashion
                            ? `drop-shadow(0 0 10px ${fashion.glowColor}) drop-shadow(0 4px 5px rgba(0,0,0,0.45))`
                            : realmAura
                              ? `drop-shadow(0 0 ${5 + realmAura.tier}px ${realmAura.glowRgba}) drop-shadow(0 4px 5px rgba(0,0,0,0.45))`
                              : 'drop-shadow(0 4px 5px rgba(0,0,0,0.45))',
                        }}
                      >
                        {fashion && (
                          <div
                            className="absolute inset-2 rounded-full opacity-40 blur-sm pointer-events-none"
                            style={{ background: fashion.bgGradient }}
                          />
                        )}
                        <div
                          ref={(el) => {
                            walkerSheetRefs.current[disc.id] = el;
                          }}
                          className="relative z-10 w-full h-full select-none"
                          style={{
                            backgroundImage: `url("${sheetCfg.url}")`,
                            backgroundSize: '400% 400%',
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: '0% 0%',
                            filter: robeFilter || undefined,
                          }}
                        />
                      </div>
                    ) : (
                      <DisciplePortrait
                        discipleId={disc.id}
                        name={disc.name}
                        glyph={disc.avatarGlyph}
                        element={disc.element}
                        realmIndex={disc.realmIndex}
                        spiritRoot={disc.spiritRoot}
                        fashionId={disc.fashionId}
                        borderColor={canBreak ? '#FDE047' : '#F6E8C8'}
                        size="md"
                        fullBody
                      />
                    )}
                  </CharacterAuraVFX>
                </div>
              </div>
              {/* Soft ground contact shadow (dynamically shrinks & fades during flight & jump) */}
              <span
                ref={(el) => {
                  walkerShadowRefs.current[disc.id] = el;
                }}
                aria-hidden="true"
                className="-mt-2 w-8 h-2 rounded-full bg-[#1C1208]/45 blur-[2px] pointer-events-none transition-transform duration-150"
              />
            </button>
          );
        })}
      </div>

      {/* Soft atmospheric vignette for HUD readability */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#0E1E1D]/35 via-transparent to-[#0E1E1D]/45" />

      {/* Foreground Ambient Atmosphere (God Rays, 4-Season Petals/Leaves/Snow & Sun Dust Motes with ±8px Parallax) */}
      <div
        ref={fgAmbientRef}
        className="pointer-events-none absolute -inset-3 z-[12]"
        style={{ willChange: 'transform' }}
      >
        <SectAmbientVFX layer="foreground" season={season} />
      </div>

      {/* Compact Camera Zoom & 4-Season Controls (positioned cleanly along bottom-left utility strip) */}
      <div
        data-camera-control="true"
        className="absolute bottom-2 left-[116px] lg:bottom-3 lg:left-[126px] z-20 flex items-center gap-0.5 rounded-lg bg-[#152826]/92 border border-[#C9A45C]/70 px-1 py-0.5 text-[#F6EBD0] shadow-lg backdrop-blur-xs"
      >
        <button
          type="button"
          onClick={() => handleZoomByStep(-ZOOM_STEP)}
          disabled={zoom <= MIN_ZOOM + 0.001}
          title="Thu nhỏ camera"
          aria-label="Thu nhỏ camera"
          className="w-6 h-6 rounded flex items-center justify-center hover:bg-[#23423F] disabled:opacity-35 disabled:hover:bg-transparent cursor-pointer transition-colors"
        >
          <Minus className="w-3.5 h-3.5 text-[#F5D687]" />
        </button>
        <button
          type="button"
          onClick={handleResetCamera}
          title="Nhấp để đưa camera về 100% (Cuộn chuột để phóng to/thu nhỏ, kéo để di chuyển)"
          className="px-1.5 h-6 rounded text-[11px] font-mono tabular-nums text-[#FCECC8] hover:bg-[#23423F] cursor-pointer transition-colors min-w-[44px] text-center"
        >
          {Math.round(zoom * 100)}%
        </button>
        <button
          type="button"
          onClick={() => handleZoomByStep(ZOOM_STEP)}
          disabled={zoom >= MAX_ZOOM - 0.001}
          title="Phóng to camera"
          aria-label="Phóng to camera"
          className="w-6 h-6 rounded flex items-center justify-center hover:bg-[#23423F] disabled:opacity-35 disabled:hover:bg-transparent cursor-pointer transition-colors"
        >
          <Plus className="w-3.5 h-3.5 text-[#F5D687]" />
        </button>
        {isModifiedCamera && (
          <button
            type="button"
            onClick={handleResetCamera}
            title="Đặt lại góc nhìn mặc định"
            aria-label="Đặt lại góc nhìn mặc định"
            className="w-6 h-6 rounded flex items-center justify-center hover:bg-[#23423F] border-l border-[#C9A45C]/30 ml-0.5 pl-0.5 cursor-pointer transition-colors"
          >
            <RotateCcw className="w-3 h-3 text-[#8BE5C2]" />
          </button>
        )}
        <button
          type="button"
          onClick={() => setShowBuildingLabels((v) => !v)}
          title={showBuildingLabels ? 'Ẩn tên công trình trên bản đồ' : 'Hiện tên công trình trên bản đồ'}
          aria-label={showBuildingLabels ? 'Ẩn tên công trình' : 'Hiện tên công trình'}
          className={`w-6 h-6 rounded flex items-center justify-center hover:bg-[#23423F] border-l border-[#C9A45C]/30 ml-0.5 pl-0.5 cursor-pointer transition-colors ${
            showBuildingLabels ? 'text-[#F5D687]' : 'text-[#A8BDB4]'
          }`}
        >
          {showBuildingLabels ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
        </button>

        {/* 4-Season Switcher (Xuân · Hạ · Thu · Đông) */}
        <div className="flex items-center gap-0.5 border-l border-[#C9A45C]/35 ml-0.5 pl-1">
          {SECT_SEASONS.map((s) => {
            const active = season === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => handleSelectSeason(s.id)}
                title={`Chuyển cảnh Tông Môn sang Mùa ${s.label}`}
                aria-label={`Mùa ${s.label}`}
                className={`px-1.5 h-6 rounded text-[10px] font-bold flex items-center gap-0.5 cursor-pointer transition-colors ${
                  active
                    ? 'bg-[#C9A45C] text-[#152826] shadow-xs'
                    : 'text-[#DCE9E2] hover:bg-[#23423F]'
                }`}
              >
                <span className="text-[11px] leading-none">{s.icon}</span>
                <span className="hidden sm:inline">{s.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
