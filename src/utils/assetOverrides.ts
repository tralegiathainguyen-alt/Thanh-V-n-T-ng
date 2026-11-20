export interface AssetTransformOverride {
  scale: number; // 0.25 .. 3.0
  offsetX: number; // px (-100..100)
  offsetY: number; // px (-100..100)
  rotation: number; // deg (-180..180)
  flipX: boolean;
  opacity: number; // 0.1 .. 1.0
  brightness: number; // 0.3 .. 2.2
  contrast: number; // 0.3 .. 2.2
  saturate: number; // 0.0 .. 2.5
  hueRotate: number; // deg (-180..180)
  glowColor: string;
  glowBlur: number; // px (0..32)
  customDataUrl?: string; // optional uploaded replacement sprite
}

export interface GlobalMapTuning {
  discipleScale: number; // 0.6 .. 1.8
  ringScale: number; // 0.5 .. 2.0
  ringOffsetY: number; // -24 .. +24 px
  ringOpacity: number; // 0.2 .. 1.5
  ringSpeedMult: number; // 0.0 .. 3.0
  mapBrightness: number; // 0.5 .. 1.5
  mapContrast: number; // 0.5 .. 1.5
  mapSaturate: number; // 0.5 .. 1.6
}

export interface AssetStudioConfig {
  version: 1;
  updatedAt: number;
  globalMap: GlobalMapTuning;
  assets: Record<string, Partial<AssetTransformOverride>>;
}

export const DEFAULT_ASSET_TRANSFORM: AssetTransformOverride = {
  scale: 1,
  offsetX: 0,
  offsetY: 0,
  rotation: 0,
  flipX: false,
  opacity: 1,
  brightness: 1,
  contrast: 1,
  saturate: 1,
  hueRotate: 0,
  glowColor: '#FACC15',
  glowBlur: 0,
};

export const DEFAULT_GLOBAL_MAP_TUNING: GlobalMapTuning = {
  discipleScale: 1,
  ringScale: 1,
  ringOffsetY: 2,
  ringOpacity: 1,
  ringSpeedMult: 1,
  mapBrightness: 1,
  mapContrast: 1,
  mapSaturate: 1,
};

const STORAGE_KEY = 'tvtt_asset_studio_config_v1';
export const ASSET_OVERRIDES_EVENT = 'tvtt:asset-overrides-changed';

export function loadAssetStudioConfig(): AssetStudioConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        version: 1,
        updatedAt: Date.now(),
        globalMap: { ...DEFAULT_GLOBAL_MAP_TUNING },
        assets: {},
      };
    }
    const parsed = JSON.parse(raw) as Partial<AssetStudioConfig>;
    return {
      version: 1,
      updatedAt: parsed.updatedAt || Date.now(),
      globalMap: {
        ...DEFAULT_GLOBAL_MAP_TUNING,
        ...(parsed.globalMap || {}),
      },
      assets: parsed.assets || {},
    };
  } catch {
    return {
      version: 1,
      updatedAt: Date.now(),
      globalMap: { ...DEFAULT_GLOBAL_MAP_TUNING },
      assets: {},
    };
  }
}

export function saveAssetStudioConfig(cfg: AssetStudioConfig): void {
  const next: AssetStudioConfig = {
    ...cfg,
    version: 1,
    updatedAt: Date.now(),
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage quota errors if a very large custom image was uploaded
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(ASSET_OVERRIDES_EVENT, { detail: next }));
  }
}

export function getResolvedAssetTransform(
  cfg: AssetStudioConfig,
  assetId: string,
): AssetTransformOverride {
  return {
    ...DEFAULT_ASSET_TRANSFORM,
    ...(cfg.assets[assetId] || {}),
  };
}

export function buildCssFilterFromTransform(t: AssetTransformOverride): string {
  const parts: string[] = [];
  if (Math.abs(t.brightness - 1) > 0.01) parts.push(`brightness(${t.brightness.toFixed(2)})`);
  if (Math.abs(t.contrast - 1) > 0.01) parts.push(`contrast(${t.contrast.toFixed(2)})`);
  if (Math.abs(t.saturate - 1) > 0.01) parts.push(`saturate(${t.saturate.toFixed(2)})`);
  if (Math.abs(t.hueRotate) > 0.5) parts.push(`hue-rotate(${Math.round(t.hueRotate)}deg)`);
  if (t.glowBlur > 0.5) parts.push(`drop-shadow(0 0 ${Math.round(t.glowBlur)}px ${t.glowColor})`);
  return parts.join(' ');
}

export function buildCssTransformFromOverride(t: AssetTransformOverride): string {
  const sx = t.flipX ? -t.scale : t.scale;
  return `translate(${Math.round(t.offsetX)}px, ${Math.round(t.offsetY)}px) rotate(${Math.round(t.rotation)}deg) scale(${sx.toFixed(3)}, ${t.scale.toFixed(3)})`;
}

/**
 * In-browser Color-to-Alpha white background remover (for uploaded sprites).
 * Uses smooth unmultiply-white + optional radial edge softening.
 */
export async function removeWhiteBackgroundInBrowser(
  srcUrl: string,
  options?: { radialSoftEdge?: boolean; strength?: number },
): Promise<string> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.crossOrigin = 'anonymous';
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('Không thể tải ảnh để tách nền.'));
    el.src = srcUrl;
  });

  const w = img.naturalWidth || 512;
  const h = img.naturalHeight || 512;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D không khả dụng.');

  ctx.drawImage(img, 0, 0, w, h);
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;
  const floor = 0.015 * (options?.strength ?? 1);
  const useRadial = Boolean(options?.radialSoftEdge);
  const cx = w / 2;
  const cy = h / 2;
  const maxR = Math.min(cx, cy);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const r = data[idx] / 255;
      const g = data[idx + 1] / 255;
      const b = data[idx + 2] / 255;
      const origA = data[idx + 3] / 255;

      const rawA = 1 - Math.min(r, g, b);
      let a = Math.max(0, Math.min(1, (rawA - floor) / (1 - floor)));
      a = Math.pow(a, 0.85) * origA;

      if (useRadial) {
        const dist = Math.hypot(x - cx, y - cy) / maxR;
        const t = Math.max(0, Math.min(1, (dist - 0.92) / 0.08));
        const mask = 1 - t * t * (3 - 2 * t);
        a *= mask;
      }

      if (a <= 0.002) {
        data[idx] = 0;
        data[idx + 1] = 0;
        data[idx + 2] = 0;
        data[idx + 3] = 0;
      } else {
        const ro = Math.max(0, Math.min(1, (r - (1 - a)) / a));
        const go = Math.max(0, Math.min(1, (g - (1 - a)) / a));
        const bo = Math.max(0, Math.min(1, (b - (1 - a)) / a));
        data[idx] = Math.round(ro * 255);
        data[idx + 1] = Math.round(go * 255);
        data[idx + 2] = Math.round(bo * 255);
        data[idx + 3] = Math.round(a * 255);
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas.toDataURL('image/png');
}
