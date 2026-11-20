import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ASSET_CATEGORIES,
  ASSET_CATALOG,
  AssetCatalogEntry,
  AssetCategoryId,
} from '../data/assetCatalog';
import {
  AssetStudioConfig,
  AssetTransformOverride,
  DEFAULT_ASSET_TRANSFORM,
  DEFAULT_GLOBAL_MAP_TUNING,
  GlobalMapTuning,
  buildCssFilterFromTransform,
  buildCssTransformFromOverride,
  getResolvedAssetTransform,
  loadAssetStudioConfig,
  removeWhiteBackgroundInBrowser,
  saveAssetStudioConfig,
} from '../utils/assetOverrides';
import { VFX_RING_PRESETS } from '../data/vfxRings';
import { sfx } from '../utils/sound';
import {
  CheckCircle2,
  Crosshair,
  Download,
  Eye,
  FlipHorizontal2,
  Grid,
  Image as ImageIcon,
  Layers,
  Map as MapIcon,
  Move,
  Palette,
  Play,
  Pause,
  RotateCcw,
  Search,
  Sliders,
  Sparkles,
  Upload,
  Wand2,
  X,
} from 'lucide-react';

interface AssetStudioModalProps {
  onClose?: () => void;
  standalone?: boolean;
}

type BackdropMode = 'dark' | 'map' | 'parchment' | 'checker';

export const AssetStudioModal: React.FC<AssetStudioModalProps> = ({
  onClose,
  standalone = false,
}) => {
  const [config, setConfig] = useState<AssetStudioConfig>(() => loadAssetStudioConfig());
  const [category, setCategory] = useState<AssetCategoryId>('characters');
  const [search, setSearch] = useState('');
  const [onlyEdited, setOnlyEdited] = useState(false);
  const [selectedId, setSelectedId] = useState<string>(ASSET_CATALOG[0].id);

  const [inspectorTab, setInspectorTab] = useState<'asset' | 'global'>('asset');
  const [backdrop, setBackdrop] = useState<BackdropMode>('dark');
  const [showGrid, setShowGrid] = useState(true);
  const [compareOriginal, setCompareOriginal] = useState(false);

  // Sprite sheet preview controls
  const [sheetRow, setSheetRow] = useState(0);
  const [sheetPlaying, setSheetPlaying] = useState(true);
  const [sheetFrame, setSheetFrame] = useState(0);
  const [previewRingId, setPreviewRingId] = useState<number>(16);
  const [showFeetRing, setShowFeetRing] = useState<boolean>(true);

  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [processingBg, setProcessingBg] = useState(false);

  const dragStateRef = useRef<{ active: boolean; startX: number; startY: number; origX: number; origY: number }>({
    active: false,
    startX: 0,
    startY: 0,
    origX: 0,
    origY: 0,
  });

  const replaceInputRef = useRef<HTMLInputElement | null>(null);
  const importConfigInputRef = useRef<HTMLInputElement | null>(null);

  const showNotice = (msg: string) => {
    setStatusMsg(msg);
    window.setTimeout(() => setStatusMsg((cur) => (cur === msg ? null : cur)), 3200);
  };

  // Persist config changes immediately & broadcast to live game
  const updateConfig = (updater: (prev: AssetStudioConfig) => AssetStudioConfig) => {
    setConfig((prev) => {
      const next = updater(prev);
      saveAssetStudioConfig(next);
      return next;
    });
  };

  const selectedEntry: AssetCatalogEntry = useMemo(
    () => ASSET_CATALOG.find((a) => a.id === selectedId) || ASSET_CATALOG[0],
    [selectedId],
  );

  const currentTransform: AssetTransformOverride = useMemo(
    () => getResolvedAssetTransform(config, selectedEntry.id),
    [config, selectedEntry.id],
  );

  const activeImgSrc = currentTransform.customDataUrl || selectedEntry.url;

  const filteredAssets = useMemo(() => {
    const q = search.trim().toLowerCase();
    return ASSET_CATALOG.filter((item) => {
      if (onlyEdited && !config.assets[item.id]) return false;
      if (!q && item.category !== category) return false;
      if (q) {
        return (
          item.name.toLowerCase().includes(q) ||
          item.id.toLowerCase().includes(q) ||
          item.url.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [category, search, onlyEdited, config.assets]);

  // Animate 4x4 sprite sheet preview
  useEffect(() => {
    if (selectedEntry.kind !== 'spritesheet_4x4' || !sheetPlaying) return;
    const timer = window.setInterval(() => {
      setSheetFrame((f) => (f + 1) % 4);
    }, 170);
    return () => window.clearInterval(timer);
  }, [selectedEntry.kind, sheetPlaying]);

  // Load natural pixel dimensions of selected image
  useEffect(() => {
    let active = true;
    const img = new Image();
    img.onload = () => {
      if (active) setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
    };
    img.onerror = () => {
      if (active) setNaturalSize(null);
    };
    img.src = activeImgSrc;
    return () => {
      active = false;
    };
  }, [activeImgSrc]);

  const setAssetField = <K extends keyof AssetTransformOverride>(
    key: K,
    value: AssetTransformOverride[K],
  ) => {
    updateConfig((prev) => ({
      ...prev,
      assets: {
        ...prev.assets,
        [selectedEntry.id]: {
          ...(prev.assets[selectedEntry.id] || {}),
          [key]: value,
        },
      },
    }));
  };

  const setGlobalField = <K extends keyof GlobalMapTuning>(key: K, value: GlobalMapTuning[K]) => {
    updateConfig((prev) => ({
      ...prev,
      globalMap: {
        ...prev.globalMap,
        [key]: value,
      },
    }));
  };

  const handleResetSelected = () => {
    sfx.click();
    updateConfig((prev) => {
      const nextAssets = { ...prev.assets };
      delete nextAssets[selectedEntry.id];
      return { ...prev, assets: nextAssets };
    });
    showNotice(`Đã khôi phục mặc định cho "${selectedEntry.name}"`);
  };

  const handleResetGlobal = () => {
    sfx.click();
    updateConfig((prev) => ({
      ...prev,
      globalMap: { ...DEFAULT_GLOBAL_MAP_TUNING },
    }));
    showNotice('Đã khôi phục thông số toàn bản đồ về mặc định!');
  };

  const handleResetAll = () => {
    sfx.click();
    updateConfig(() => ({
      version: 1,
      updatedAt: Date.now(),
      globalMap: { ...DEFAULT_GLOBAL_MAP_TUNING },
      assets: {},
      vfxRings: {},
    }));
    showNotice('Đã đặt lại toàn bộ tinh chỉnh asset về mặc định!');
  };

  const handleUploadReplacement = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setAssetField('customDataUrl', reader.result);
        sfx.harvest();
        showNotice(`Đã nạp ảnh thay thế "${file.name}" cho ${selectedEntry.name}!`);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveWhiteBg = async () => {
    setProcessingBg(true);
    sfx.click();
    try {
      const resultUrl = await removeWhiteBackgroundInBrowser(activeImgSrc, {
        radialSoftEdge: selectedEntry.kind === 'vfx_ring',
      });
      setAssetField('customDataUrl', resultUrl);
      sfx.upgrade();
      showNotice('Đã tách nền trắng (Color-to-Alpha) trực tiếp trên trình duyệt!');
    } catch {
      showNotice('Không thể tách nền ảnh này.');
    } finally {
      setProcessingBg(false);
    }
  };

  const handleDownloadBakedPng = async () => {
    sfx.click();
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.crossOrigin = 'anonymous';
        el.onload = () => resolve(el);
        el.onerror = reject;
        el.src = activeImgSrc;
      });
      const w = img.naturalWidth || 512;
      const h = img.naturalHeight || 512;
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const filterStr = buildCssFilterFromTransform(currentTransform);
      if (filterStr) ctx.filter = filterStr;
      ctx.globalAlpha = currentTransform.opacity;
      ctx.translate(w / 2 + currentTransform.offsetX, h / 2 + currentTransform.offsetY);
      ctx.rotate((currentTransform.rotation * Math.PI) / 180);
      ctx.scale(currentTransform.flipX ? -currentTransform.scale : currentTransform.scale, currentTransform.scale);
      ctx.drawImage(img, -w / 2, -h / 2, w, h);

      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedEntry.id}_tuned.png`;
      a.click();
      showNotice(`Đã xuất file ${selectedEntry.id}_tuned.png!`);
    } catch {
      showNotice('Không thể xuất PNG.');
    }
  };

  const handleExportConfigJson = () => {
    sfx.harvest();
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `thanh-van-asset-tuning_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showNotice('Đã xuất file cấu hình Asset Studio (.json)! Anh có thể gửi lại file này để em áp cứng vào repo.');
  };

  const handleImportConfigJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text()) as Partial<AssetStudioConfig>;
      if (!parsed || typeof parsed !== 'object') return;
      updateConfig(() => ({
        version: 1,
        updatedAt: Date.now(),
        globalMap: { ...DEFAULT_GLOBAL_MAP_TUNING, ...(parsed.globalMap || {}) },
        assets: parsed.assets || {},
        vfxRings: parsed.vfxRings || {},
      }));
      sfx.upgrade();
      showNotice(`Đã nhập cấu hình tinh chỉnh từ ${file.name}!`);
    } catch {
      showNotice('File JSON cấu hình không hợp lệ.');
    }
  };

  // Drag-to-align handlers on the preview stage
  const handleStagePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (inspectorTab !== 'asset') return;
    dragStateRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      origX: currentTransform.offsetX,
      origY: currentTransform.offsetY,
    };
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
  };

  const handleStagePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStateRef.current.active) return;
    const dx = Math.round(e.clientX - dragStateRef.current.startX);
    const dy = Math.round(e.clientY - dragStateRef.current.startY);
    const nextX = Math.max(-100, Math.min(100, dragStateRef.current.origX + dx));
    const nextY = Math.max(-100, Math.min(100, dragStateRef.current.origY + dy));
    updateConfig((prev) => ({
      ...prev,
      assets: {
        ...prev.assets,
        [selectedEntry.id]: {
          ...(prev.assets[selectedEntry.id] || {}),
          offsetX: nextX,
          offsetY: nextY,
        },
      },
    }));
  };

  const handleStagePointerUp = () => {
    dragStateRef.current.active = false;
  };

  const editedCount = Object.keys(config.assets).length;
  const previewStyleTransform = compareOriginal
    ? undefined
    : buildCssTransformFromOverride(currentTransform);
  const previewStyleFilter = compareOriginal
    ? undefined
    : buildCssFilterFromTransform(currentTransform);
  const previewOpacity = compareOriginal ? 1 : currentTransform.opacity;

  const backdropStyle: React.CSSProperties =
    backdrop === 'checker'
      ? {
          backgroundColor: '#1B2228',
          backgroundImage:
            'linear-gradient(45deg, #27323B 25%, transparent 25%), linear-gradient(-45deg, #27323B 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #27323B 75%), linear-gradient(-45deg, transparent 75%, #27323B 75%)',
          backgroundSize: '20px 20px',
          backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
        }
      : backdrop === 'parchment'
        ? { background: 'radial-gradient(circle, #F5ECD8 0%, #DFCFAF 100%)' }
        : backdrop === 'map'
          ? {
              backgroundImage: `url('./assets/aistudio/1_80f8120e.png')`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }
          : { background: 'radial-gradient(circle at center, #0F1D24 0%, #05090C 100%)' };

  const previewRingPreset = VFX_RING_PRESETS[Math.max(0, Math.min(15, previewRingId - 1))];

  return (
    <div
      className={`${
        standalone ? 'min-h-screen w-full' : 'fixed inset-0 z-50'
      } bg-[#060B0E] text-[#EAF4F0] flex flex-col overflow-hidden`}
    >
      {/* Top Studio Header */}
      <header className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-[#0A1318] border-b border-[#D4A24C]/35 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#234842] to-[#0D1E1D] border border-[#D4A24C]/70 flex items-center justify-center text-[#FCE6A6] shrink-0">
            <Palette className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h1
              className="text-base sm:text-lg font-bold text-[#FCE6A6] truncate"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Asset Studio · Cân Chỉnh &amp; Tinh Chỉnh Toàn Bộ Game ({ASSET_CATALOG.length} Assets)
            </h1>
            <p className="text-[11px] text-[#8FB3A8] truncate">
              Kéo thả căn tâm · Tinh chỉnh màu/ánh sáng · Thay ảnh &amp; tách nền trắng · Áp dụng Live vào bản đồ
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              saveAssetStudioConfig(config);
              sfx.upgrade();
              showNotice('Đã lưu & áp dụng toàn bộ tinh chỉnh trực tiếp vào game!');
            }}
            className="px-3 py-1.5 rounded-lg bg-gradient-to-b from-[#235746] to-[#163B30] hover:from-[#2C6C57] hover:to-[#1C4B3D] border border-[#6EE7B7]/80 text-[#ECFDF5] text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Lưu Vào Game</span>
          </button>
          <button
            type="button"
            onClick={handleExportConfigJson}
            className="px-2.5 py-1.5 rounded-lg bg-[#1D3B37] hover:bg-[#274F4A] border border-[#D4A24C]/70 text-[#FCE6A6] text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Xuất Config</span>
          </button>
          <button
            type="button"
            onClick={() => importConfigInputRef.current?.click()}
            className="px-2.5 py-1.5 rounded-lg bg-[#14252D] hover:bg-[#1E3642] border border-[#32515E] text-[#C8E0D8] text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Nhập Config</span>
          </button>
          <input
            ref={importConfigInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleImportConfigJson}
            className="hidden"
          />
          <button
            type="button"
            onClick={handleResetAll}
            className="px-2.5 py-1.5 rounded-lg bg-[#2B1717] hover:bg-[#3E2020] border border-[#7A3535] text-[#FCA5A5] text-xs font-semibold flex items-center gap-1 cursor-pointer"
            title="Đặt lại tất cả"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Reset All</span>
          </button>
          {onClose && (
            <button
              type="button"
              onClick={() => {
                sfx.click();
                onClose();
              }}
              className="w-8 h-8 rounded-lg bg-[#1A2930] hover:bg-[#263B45] border border-[#3B5561] text-[#D7E8E2] flex items-center justify-center cursor-pointer"
              aria-label="Đóng"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {statusMsg && (
        <div className="px-4 py-1.5 bg-[#123326] border-b border-[#34D399]/40 text-xs font-semibold text-[#A7F3D0] flex items-center gap-2 shrink-0">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          <span>{statusMsg}</span>
        </div>
      )}

      {/* Main 3-Column Studio Body */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        {/* LEFT COLUMN: Categories + Search + Asset List */}
        <aside className="lg:col-span-3 border-b lg:border-b-0 lg:border-r border-[#1C3039] bg-[#081014] flex flex-col min-h-0 max-h-[34vh] lg:max-h-none">
          <div className="p-2.5 border-b border-[#182A32] space-y-2 shrink-0">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#6F958B] absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm tên asset, file..."
                className="w-full pl-8 pr-2.5 py-1.5 rounded-lg bg-[#0F1C22] border border-[#243C46] text-xs text-[#EAF4F0] placeholder:text-[#5E8078] focus:outline-none focus:border-[#D4A24C]"
              />
            </div>

            <div className="flex items-center justify-between text-[11px]">
              <label className="flex items-center gap-1.5 text-[#9AB8B0] cursor-pointer">
                <input
                  type="checkbox"
                  checked={onlyEdited}
                  onChange={(e) => setOnlyEdited(e.target.checked)}
                  className="accent-[#D4A24C]"
                />
                Chỉ hiện đã chỉnh ({editedCount})
              </label>
              <span className="text-[#6F958B] font-mono">{filteredAssets.length} mục</span>
            </div>

            {/* Category Pills */}
            <div className="flex gap-1 overflow-x-auto pb-1">
              {ASSET_CATEGORIES.map((cat) => {
                const active = !search.trim() && category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      sfx.click();
                      setSearch('');
                      setCategory(cat.id);
                    }}
                    className={`px-2 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                      active
                        ? 'bg-[#1D3B37] text-[#FCE6A6] border border-[#D4A24C]/70'
                        : 'bg-[#0F1B21] text-[#8FB3A8] border border-[#1E333D] hover:bg-[#162730]'
                    }`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Asset Thumbnail List */}
          <div className="flex-1 overflow-y-auto p-2 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-1.5 content-start">
            {filteredAssets.map((item) => {
              const isSel = item.id === selectedEntry.id;
              const hasEdit = Boolean(config.assets[item.id]);
              const thumbSrc = config.assets[item.id]?.customDataUrl || item.url;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    sfx.click();
                    setSelectedId(item.id);
                  }}
                  className={`relative p-1.5 rounded-lg border text-left transition-all cursor-pointer flex flex-col items-center gap-1 ${
                    isSel
                      ? 'bg-[#13292E] border-[#FACC15] ring-1 ring-[#FACC15]/40'
                      : 'bg-[#0B151A] border-[#1B2F38] hover:border-[#3A5D6B]'
                  }`}
                >
                  {hasEdit && (
                    <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#34D399]" title="Đã tinh chỉnh" />
                  )}
                  <div className="w-full h-14 rounded bg-[#060B0E] flex items-center justify-center overflow-hidden p-1">
                    {item.kind === 'spritesheet_4x4' ? (
                      <div
                        className="w-12 h-12"
                        style={{
                          backgroundImage: `url("${thumbSrc}")`,
                          backgroundSize: '400% 400%',
                          backgroundPosition: '0% 0%',
                        }}
                      />
                    ) : (
                      <img
                        src={thumbSrc}
                        alt={item.name}
                        loading="lazy"
                        className="max-w-full max-h-full object-contain"
                      />
                    )}
                  </div>
                  <div className="w-full text-[10px] font-semibold text-[#D6EAE3] truncate text-center">
                    {item.name}
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* CENTER COLUMN: Interactive Alignment & Preview Stage */}
        <main className="lg:col-span-5 flex flex-col min-h-0 bg-[#05090C] p-3 gap-2.5 overflow-y-auto">
          {/* Stage Top Controls */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              {(
                [
                  ['dark', 'Nền Tối'],
                  ['map', 'Bản Đồ'],
                  ['parchment', 'Giấy Cuộn'],
                  ['checker', 'Caro'],
                ] as [BackdropMode, string][]
              ).map(([m, label]) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setBackdrop(m)}
                  className={`px-2 py-1 rounded text-[11px] font-semibold cursor-pointer ${
                    backdrop === m
                      ? 'bg-[#1D3B37] text-[#FCE6A6] border border-[#D4A24C]/70'
                      : 'bg-[#0F1B21] text-[#8FB3A8] border border-[#1E333D]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setShowGrid((v) => !v)}
                className={`px-2 py-1 rounded text-[11px] font-semibold flex items-center gap-1 cursor-pointer ${
                  showGrid
                    ? 'bg-[#1A3340] text-[#7DD3FC] border border-[#38BDF8]/50'
                    : 'bg-[#0F1B21] text-[#7E9E95] border border-[#1E333D]'
                }`}
              >
                <Grid className="w-3 h-3" />
                Lưới tâm
              </button>
              <button
                type="button"
                onPointerDown={() => setCompareOriginal(true)}
                onPointerUp={() => setCompareOriginal(false)}
                onPointerLeave={() => setCompareOriginal(false)}
                className="px-2 py-1 rounded bg-[#14252D] hover:bg-[#1E3642] border border-[#32515E] text-[11px] font-semibold text-[#FCE6A6] flex items-center gap-1 cursor-pointer select-none"
              >
                <Eye className="w-3 h-3" />
                Giữ xem gốc
              </button>
            </div>
          </div>

          {/* Interactive Stage Viewport */}
          <div
            onPointerDown={handleStagePointerDown}
            onPointerMove={handleStagePointerMove}
            onPointerUp={handleStagePointerUp}
            className="relative flex-1 min-h-[300px] rounded-2xl border border-[#243B44] overflow-hidden flex items-center justify-center cursor-grab active:cursor-grabbing select-none"
            style={backdropStyle}
          >
            {/* Alignment Crosshair & Center Guides */}
            {showGrid && (
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-[#38BDF8]/35" />
                <div className="absolute top-1/2 left-0 right-0 h-px bg-[#38BDF8]/35" />
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-56 rounded-full border border-dashed border-[#FACC15]/30" />
              </div>
            )}

            {/* Asset Info Badge */}
            <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-2 pointer-events-none z-20">
              <span className="px-2.5 py-1 rounded-lg bg-[#081217]/85 border border-[#D4A24C]/45 text-xs font-bold text-[#FCE6A6] truncate">
                {selectedEntry.name}
              </span>
              <span className="px-2 py-0.5 rounded bg-[#081217]/85 border border-[#2C4854] text-[10px] font-mono text-[#93C5FD] shrink-0">
                {naturalSize ? `${naturalSize.w}×${naturalSize.h}px` : '...'}
              </span>
            </div>

            {/* Live Rendered Asset */}
            <div className="relative flex items-center justify-center">
              {/* Optional Ground VFX Ring underneath 4x4 character to test foot alignment! */}
              {selectedEntry.kind === 'spritesheet_4x4' && showFeetRing && (
                <img
                  src={previewRingPreset.transparentUrl}
                  alt=""
                  aria-hidden="true"
                  draggable={false}
                  className="absolute pointer-events-none animate-spin"
                  style={{
                    width: `${Math.round(160 * config.globalMap.ringScale)}px`,
                    height: `${Math.round(160 * config.globalMap.ringScale)}px`,
                    bottom: `${-46 - config.globalMap.ringOffsetY}px`,
                    transform: 'scaleY(0.44)',
                    opacity: Math.min(1, config.globalMap.ringOpacity),
                    animationDuration: `${Math.max(2, Math.round(10 / Math.max(0.2, config.globalMap.ringSpeedMult)))}s`,
                  }}
                />
              )}

              {selectedEntry.kind === 'spritesheet_4x4' ? (
                <div
                  className="relative z-10"
                  style={{
                    width: `${Math.round(168 * config.globalMap.discipleScale)}px`,
                    height: `${Math.round(168 * config.globalMap.discipleScale)}px`,
                    backgroundImage: `url("${activeImgSrc}")`,
                    backgroundSize: '400% 400%',
                    backgroundPosition: `${(sheetFrame * 100) / 3}% ${(sheetRow * 100) / 3}%`,
                    transform: previewStyleTransform,
                    filter: previewStyleFilter,
                    opacity: previewOpacity,
                  }}
                />
              ) : (
                <img
                  src={activeImgSrc}
                  alt={selectedEntry.name}
                  draggable={false}
                  className="relative z-10 max-w-[260px] max-h-[260px] object-contain"
                  style={{
                    transform: previewStyleTransform,
                    filter: previewStyleFilter,
                    opacity: previewOpacity,
                  }}
                />
              )}
            </div>

            {/* Drag Hint Footer */}
            <div className="absolute bottom-2 left-2.5 right-2.5 flex items-center justify-between text-[10px] font-mono text-[#B6D4CB] pointer-events-none">
              <span className="px-2 py-0.5 rounded bg-[#081217]/80 flex items-center gap-1">
                <Move className="w-3 h-3 text-[#FACC15]" />
                Kéo chuột để dịch tâm ({currentTransform.offsetX}px, {currentTransform.offsetY}px)
              </span>
              <span className="px-2 py-0.5 rounded bg-[#081217]/80">
                Scale: {currentTransform.scale.toFixed(2)}x · Rot: {currentTransform.rotation}°
              </span>
            </div>
          </div>

          {/* 4x4 Sprite Sheet Playback & Ring Alignment Controls */}
          {selectedEntry.kind === 'spritesheet_4x4' && (
            <div className="p-2.5 rounded-xl bg-[#0B151B] border border-[#1E333C] flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setSheetPlaying((v) => !v)}
                  className="px-2.5 py-1 rounded-md bg-[#1D3B37] text-[#FCE6A6] font-bold flex items-center gap-1 cursor-pointer"
                >
                  {sheetPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                  {sheetPlaying ? 'Dừng' : 'Chạy'}
                </button>
                {[0, 1, 2, 3].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setSheetRow(r)}
                    className={`px-2 py-1 rounded text-[11px] font-semibold cursor-pointer ${
                      sheetRow === r ? 'bg-[#D4A24C] text-[#1A1206]' : 'bg-[#13242C] text-[#9BB8B0]'
                    }`}
                  >
                    Hàng {r + 1}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1 text-[11px] text-[#9AB8B0] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showFeetRing}
                    onChange={(e) => setShowFeetRing(e.target.checked)}
                    className="accent-[#D4A24C]"
                  />
                  Thử vòng dưới chân:
                </label>
                <select
                  value={previewRingId}
                  onChange={(e) => setPreviewRingId(Number(e.target.value))}
                  className="px-2 py-1 rounded bg-[#112028] border border-[#2B4854] text-[11px] text-[#FCE6A6]"
                >
                  {VFX_RING_PRESETS.map((r) => (
                    <option key={r.id} value={r.id}>
                      #{r.id} {r.realmLabel}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Quick Asset File Actions */}
          <div className="grid grid-cols-3 gap-2">
            <input
              ref={replaceInputRef}
              type="file"
              accept="image/png,image/webp,image/jpeg"
              onChange={handleUploadReplacement}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => replaceInputRef.current?.click()}
              className="py-2 px-2.5 rounded-lg bg-[#142730] hover:bg-[#1D3845] border border-[#305464] text-[11px] font-bold text-[#D7F0E8] flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <ImageIcon className="w-3.5 h-3.5 text-[#7DD3FC]" />
              Thay Ảnh Mới
            </button>
            <button
              type="button"
              onClick={handleRemoveWhiteBg}
              disabled={processingBg}
              className="py-2 px-2.5 rounded-lg bg-[#281E38] hover:bg-[#37284E] border border-[#6D4C9E] text-[11px] font-bold text-[#E9D5FF] flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              <Wand2 className="w-3.5 h-3.5 text-[#C084FC]" />
              {processingBg ? 'Đang tách...' : 'Tách Nền Trắng'}
            </button>
            <button
              type="button"
              onClick={handleDownloadBakedPng}
              className="py-2 px-2.5 rounded-lg bg-[#1D3B37] hover:bg-[#264E49] border border-[#D4A24C]/70 text-[11px] font-bold text-[#FCE6A6] flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Xuất PNG Đã Sửa
            </button>
          </div>
        </main>

        {/* RIGHT COLUMN: Inspector Sliders (Per-Asset & Global Live Map) */}
        <aside className="lg:col-span-4 border-t lg:border-t-0 lg:border-l border-[#1C3039] bg-[#081014] flex flex-col min-h-0">
          {/* Inspector Mode Tabs */}
          <div className="p-2.5 border-b border-[#182A32] grid grid-cols-2 gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                sfx.click();
                setInspectorTab('asset');
              }}
              className={`py-2 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
                inspectorTab === 'asset'
                  ? 'bg-[#1D3B37] text-[#FCE6A6] border border-[#D4A24C]/70'
                  : 'bg-[#0F1B21] text-[#8FB3A8] border border-[#1E333D]'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              Tinh Chỉnh Asset
            </button>
            <button
              type="button"
              onClick={() => {
                sfx.click();
                setInspectorTab('global');
              }}
              className={`py-2 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
                inspectorTab === 'global'
                  ? 'bg-[#1D3B37] text-[#FCE6A6] border border-[#D4A24C]/70'
                  : 'bg-[#0F1B21] text-[#8FB3A8] border border-[#1E333D]'
              }`}
            >
              <MapIcon className="w-3.5 h-3.5" />
              Cân Chỉnh Bản Đồ Live
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3.5 space-y-4">
            {inspectorTab === 'asset' ? (
              <>
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-[#FCE6A6] flex items-center gap-1.5">
                    <Crosshair className="w-3.5 h-3.5" />
                    Vị Trí &amp; Tỷ Lệ
                  </div>
                  <button
                    type="button"
                    onClick={handleResetSelected}
                    className="text-[11px] font-semibold text-[#FCA5A5] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset asset này
                  </button>
                </div>

                {/* Transform Sliders */}
                <div className="space-y-3 p-3 rounded-xl bg-[#0D181E] border border-[#1C3039]">
                  <SliderRow
                    label="Phóng to / Thu nhỏ (Scale)"
                    value={currentTransform.scale}
                    min={0.25}
                    max={3}
                    step={0.05}
                    display={`${currentTransform.scale.toFixed(2)}x`}
                    onChange={(v) => setAssetField('scale', v)}
                  />
                  <SliderRow
                    label="Dịch ngang (Offset X)"
                    value={currentTransform.offsetX}
                    min={-100}
                    max={100}
                    step={1}
                    display={`${currentTransform.offsetX}px`}
                    onChange={(v) => setAssetField('offsetX', v)}
                  />
                  <SliderRow
                    label="Dịch dọc (Offset Y)"
                    value={currentTransform.offsetY}
                    min={-100}
                    max={100}
                    step={1}
                    display={`${currentTransform.offsetY}px`}
                    onChange={(v) => setAssetField('offsetY', v)}
                  />
                  <SliderRow
                    label="Góc xoay (Rotate)"
                    value={currentTransform.rotation}
                    min={-180}
                    max={180}
                    step={1}
                    display={`${currentTransform.rotation}°`}
                    onChange={(v) => setAssetField('rotation', v)}
                  />
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-[#A8C4BC]">Lật ngang (Flip X)</span>
                    <button
                      type="button"
                      onClick={() => setAssetField('flipX', !currentTransform.flipX)}
                      className={`px-3 py-1 rounded-md text-xs font-bold flex items-center gap-1 cursor-pointer ${
                        currentTransform.flipX
                          ? 'bg-[#D4A24C] text-[#1A1206]'
                          : 'bg-[#14252D] text-[#A8C4BC] border border-[#2A4552]'
                      }`}
                    >
                      <FlipHorizontal2 className="w-3.5 h-3.5" />
                      {currentTransform.flipX ? 'Đang lật' : 'Bình thường'}
                    </button>
                  </div>
                </div>

                {/* Color & Glow Grading */}
                <div className="space-y-3 p-3 rounded-xl bg-[#0D181E] border border-[#1C3039]">
                  <div className="text-xs font-bold text-[#7DD3FC] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    Màu Sắc &amp; Hào Quang (Color &amp; Glow)
                  </div>
                  <SliderRow
                    label="Độ mờ (Opacity)"
                    value={currentTransform.opacity}
                    min={0.1}
                    max={1}
                    step={0.05}
                    display={`${Math.round(currentTransform.opacity * 100)}%`}
                    onChange={(v) => setAssetField('opacity', v)}
                  />
                  <SliderRow
                    label="Độ sáng (Brightness)"
                    value={currentTransform.brightness}
                    min={0.3}
                    max={2.2}
                    step={0.05}
                    display={`${Math.round(currentTransform.brightness * 100)}%`}
                    onChange={(v) => setAssetField('brightness', v)}
                  />
                  <SliderRow
                    label="Tương phản (Contrast)"
                    value={currentTransform.contrast}
                    min={0.3}
                    max={2.2}
                    step={0.05}
                    display={`${Math.round(currentTransform.contrast * 100)}%`}
                    onChange={(v) => setAssetField('contrast', v)}
                  />
                  <SliderRow
                    label="Độ rực màu (Saturate)"
                    value={currentTransform.saturate}
                    min={0}
                    max={2.5}
                    step={0.05}
                    display={`${Math.round(currentTransform.saturate * 100)}%`}
                    onChange={(v) => setAssetField('saturate', v)}
                  />
                  <SliderRow
                    label="Đổi tông màu (Hue Rotate)"
                    value={currentTransform.hueRotate}
                    min={-180}
                    max={180}
                    step={2}
                    display={`${currentTransform.hueRotate}°`}
                    onChange={(v) => setAssetField('hueRotate', v)}
                  />
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <span className="text-xs text-[#A8C4BC]">Màu hào quang (Glow)</span>
                    <input
                      type="color"
                      value={currentTransform.glowColor}
                      onChange={(e) => setAssetField('glowColor', e.target.value)}
                      className="w-8 h-6 rounded border border-[#345463] bg-transparent cursor-pointer"
                    />
                  </div>
                  <SliderRow
                    label="Độ tỏa hào quang (Glow Blur)"
                    value={currentTransform.glowBlur}
                    min={0}
                    max={32}
                    step={1}
                    display={`${currentTransform.glowBlur}px`}
                    onChange={(v) => setAssetField('glowBlur', v)}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-[#FCE6A6] flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5" />
                    Áp Dụng Trực Tiếp Lên Bản Đồ Game
                  </div>
                  <button
                    type="button"
                    onClick={handleResetGlobal}
                    className="text-[11px] font-semibold text-[#FCA5A5] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset bản đồ
                  </button>
                </div>

                <p className="text-[11px] text-[#8FB3A8] leading-relaxed">
                  Mọi thông số dưới đây được lưu tự động và áp dụng <strong>ngay lập tức</strong> lên bản đồ Sơn Môn trong game!
                </p>

                <div className="space-y-3 p-3 rounded-xl bg-[#0D181E] border border-[#1C3039]">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#6EE7B7]">
                    Đệ Tử &amp; Vòng VFX Dưới Chân
                  </div>
                  <SliderRow
                    label="Kích thước Đệ Tử trên bản đồ"
                    value={config.globalMap.discipleScale}
                    min={0.6}
                    max={1.8}
                    step={0.05}
                    display={`${config.globalMap.discipleScale.toFixed(2)}x`}
                    onChange={(v) => setGlobalField('discipleScale', v)}
                  />
                  <SliderRow
                    label="Kích thước Vòng VFX dưới chân"
                    value={config.globalMap.ringScale}
                    min={0.5}
                    max={2.0}
                    step={0.05}
                    display={`${config.globalMap.ringScale.toFixed(2)}x`}
                    onChange={(v) => setGlobalField('ringScale', v)}
                  />
                  <SliderRow
                    label="Độ lệch dọc Vòng VFX (Offset Y)"
                    value={config.globalMap.ringOffsetY}
                    min={-24}
                    max={24}
                    step={1}
                    display={`${config.globalMap.ringOffsetY > 0 ? '+' : ''}${config.globalMap.ringOffsetY}px`}
                    onChange={(v) => setGlobalField('ringOffsetY', v)}
                  />
                  <SliderRow
                    label="Độ rõ / Sáng Vòng VFX"
                    value={config.globalMap.ringOpacity}
                    min={0.2}
                    max={1.5}
                    step={0.05}
                    display={`${Math.round(config.globalMap.ringOpacity * 100)}%`}
                    onChange={(v) => setGlobalField('ringOpacity', v)}
                  />
                  <SliderRow
                    label="Tốc độ xoay Vòng VFX"
                    value={config.globalMap.ringSpeedMult}
                    min={0}
                    max={3}
                    step={0.05}
                    display={`${config.globalMap.ringSpeedMult.toFixed(2)}x`}
                    onChange={(v) => setGlobalField('ringSpeedMult', v)}
                  />
                </div>

                <div className="space-y-3 p-3 rounded-xl bg-[#0D181E] border border-[#1C3039]">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#7DD3FC]">
                    Tông Màu Nền Bản Đồ Sơn Môn
                  </div>
                  <SliderRow
                    label="Độ sáng bản đồ"
                    value={config.globalMap.mapBrightness}
                    min={0.5}
                    max={1.5}
                    step={0.05}
                    display={`${Math.round(config.globalMap.mapBrightness * 100)}%`}
                    onChange={(v) => setGlobalField('mapBrightness', v)}
                  />
                  <SliderRow
                    label="Tương phản bản đồ"
                    value={config.globalMap.mapContrast}
                    min={0.5}
                    max={1.5}
                    step={0.05}
                    display={`${Math.round(config.globalMap.mapContrast * 100)}%`}
                    onChange={(v) => setGlobalField('mapContrast', v)}
                  />
                  <SliderRow
                    label="Độ rực màu bản đồ"
                    value={config.globalMap.mapSaturate}
                    min={0.5}
                    max={1.6}
                    step={0.05}
                    display={`${Math.round(config.globalMap.mapSaturate * 100)}%`}
                    onChange={(v) => setGlobalField('mapSaturate', v)}
                  />
                </div>
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};

interface SliderRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (value: number) => void;
}

const SliderRow: React.FC<SliderRowProps> = ({ label, value, min, max, step, display, onChange }) => (
  <div>
    <div className="flex justify-between text-xs mb-1">
      <span className="text-[#A8C4BC]">{label}</span>
      <span className="font-mono font-bold text-[#FCE6A6]">{display}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full accent-[#D4A24C] cursor-pointer"
    />
  </div>
);
