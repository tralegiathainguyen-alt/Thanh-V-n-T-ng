import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

export interface VfxPoint {
  /** Horizontal stage coordinate in percentage (0..100) */
  x: number;
  /** Vertical stage coordinate in percentage (0..100) */
  y: number;
}

export interface VanKiemPlayOptions {
  /** 1.0 for normal speed (x1), ~0.55 for fast speed (x2) */
  speedMult?: number;
  /** Fired right at Beat 3 impact (0.45s * speedMult) to sync hit flash, screen shake & damage numbers */
  onImpact?: () => void;
  /** Toggles the background dimming layer behind the battle units */
  onDimChange?: (dimming: boolean) => void;
}

export interface VanKiemQuyTongVfxHandle {
  play: (
    casterPos: VfxPoint,
    targetPositions: VfxPoint[],
    options?: VanKiemPlayOptions,
  ) => Promise<void>;
  stop: () => void;
}

const ASSET_BASE = './assets/vfx_skills/van_kiem';

interface VanKiemAssetPack {
  circle: HTMLImageElement;
  streaks: HTMLImageElement[];
  pSparkles: HTMLImageElement;
  pShards: HTMLImageElement;
  pStar4: HTMLImageElement;
  pStar8: HTMLImageElement;
  pDust: HTMLImageElement;
  pOrb: HTMLImageElement;
  impacts: HTMLImageElement[];
}

let cachedAssetPromise: Promise<VanKiemAssetPack> | null = null;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });
}

function loadVanKiemAssets(): Promise<VanKiemAssetPack> {
  if (!cachedAssetPromise) {
    cachedAssetPromise = (async () => {
      const [
        circle,
        s1,
        s2,
        s3,
        pSparkles,
        pShards,
        pStar4,
        pStar8,
        pDust,
        pOrb,
        ...impacts
      ] = await Promise.all([
        loadImage(`${ASSET_BASE}/circle.png`),
        loadImage(`${ASSET_BASE}/streak_01.png`),
        loadImage(`${ASSET_BASE}/streak_02.png`),
        loadImage(`${ASSET_BASE}/streak_03.png`),
        loadImage(`${ASSET_BASE}/p_sparkles.png`),
        loadImage(`${ASSET_BASE}/p_shards.png`),
        loadImage(`${ASSET_BASE}/p_star4.png`),
        loadImage(`${ASSET_BASE}/p_star8.png`),
        loadImage(`${ASSET_BASE}/p_dust.png`),
        loadImage(`${ASSET_BASE}/p_orb.png`),
        ...Array.from({ length: 13 }, (_, i) =>
          loadImage(`${ASSET_BASE}/impact_${String(i + 1).padStart(2, '0')}.png`),
        ),
      ]);

      return {
        circle,
        streaks: [s1, s2, s3],
        pSparkles,
        pShards,
        pStar4,
        pStar8,
        pDust,
        pOrb,
        impacts,
      };
    })().catch((err) => {
      cachedAssetPromise = null;
      throw err;
    });
  }
  return cachedAssetPromise;
}

interface SwordStreakParticle {
  spriteIdx: number;
  startT: number;
  duration: number;
  angleRad: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  scale: number;
}

interface ShardParticle {
  startT: number;
  originX: number;
  originY: number;
  vx: number;
  vy: number;
  gravity: number;
  rot: number;
  vRot: number;
  size: number;
  life: number;
}

interface GlowParticle {
  kind: 'sparkles' | 'star4' | 'dust';
  startT: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vRot: number;
  size: number;
  phase: number;
  twinkleFreq: number;
  life: number;
}

const TOTAL_DURATION_S = 1.4;
const IMPACT_TIME_S = 0.45;
const IMPACT_END_S = 1.05;
const IMPACT_FPS = 21;

function easeOutCubic(x: number): number {
  const c = Math.max(0, Math.min(1, x));
  return 1 - Math.pow(1 - c, 3);
}

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

export const VanKiemQuyTongVFX = forwardRef<VanKiemQuyTongVfxHandle>((_, ref) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const resolveRef = useRef<(() => void) | null>(null);
  const dimCbRef = useRef<((dimming: boolean) => void) | null>(null);
  const activeRunIdRef = useRef<number>(0);

  // Preload all 23 transparent PNG sprites in the background on mount
  useEffect(() => {
    loadVanKiemAssets().catch(() => {
      // Ignore preload errors; play() will retry cleanly
    });
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      dimCbRef.current?.(false);
      resolveRef.current?.();
      resolveRef.current = null;
    };
  }, []);

  const stopInternal = () => {
    activeRunIdRef.current += 1;
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
    dimCbRef.current?.(false);
    dimCbRef.current = null;
    if (resolveRef.current) {
      const done = resolveRef.current;
      resolveRef.current = null;
      done();
    }
  };

  useImperativeHandle(ref, () => ({
    stop: stopInternal,
    play: async (_casterPos, targetPositions, options = {}) => {
      stopInternal();
      const runId = ++activeRunIdRef.current;
      const speedMult = options.speedMult ?? 1;

      let assets: VanKiemAssetPack;
      try {
        assets = await loadVanKiemAssets();
      } catch {
        options.onImpact?.();
        return;
      }
      if (activeRunIdRef.current !== runId) return;

      const canvas = canvasRef.current;
      if (!canvas) {
        options.onImpact?.();
        return;
      }

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cssW = Math.max(320, canvas.clientWidth || 960);
      const cssH = Math.max(200, canvas.clientHeight || 540);
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        options.onImpact?.();
        return;
      }

      const targetsPx =
        targetPositions.length > 0
          ? targetPositions.map((p) => ({
              x: (p.x / 100) * cssW,
              y: (p.y / 100) * cssH,
            }))
          : [{ x: cssW * 0.72, y: cssH * 0.62 }];

      // Target cluster centroid
      const centerX = targetsPx.reduce((s, p) => s + p.x, 0) / targetsPx.length;
      const centerY = targetsPx.reduce((s, p) => s + p.y, 0) / targetsPx.length;

      // Sky formation position above target cluster (shifted slightly toward caster for dramatic diagonal rain)
      const skyX = clamp01((centerX - cssW * 0.08) / cssW) * cssW;
      const skyY = Math.max(cssH * 0.16, centerY - cssH * 0.36);

      const baseScale = Math.min(cssW, cssH) / 540;
      const circleRadius = Math.max(92, Math.min(180, 142 * baseScale));

      // Beat 2: Generate 13 diagonal sword-qi streaks (45°–65°)
      const streakCount = 13;
      const streaks: SwordStreakParticle[] = Array.from({ length: streakCount }, (_, i) => {
        const tgt = targetsPx[i % targetsPx.length];
        const angleDeg = 47 + ((i * 7 + Math.random() * 6) % 17); // 47°..64°
        const angleRad = (angleDeg * Math.PI) / 180;
        const spreadX = (Math.random() - 0.5) * 95 * baseScale;
        const spreadY = (Math.random() - 0.5) * 32 * baseScale;
        const endX = tgt.x + spreadX;
        const endY = tgt.y - 18 * baseScale + spreadY;
        const travelDist = (260 + Math.random() * 110) * baseScale;
        const startX = endX - Math.cos(angleRad) * travelDist;
        const startY = endY - Math.sin(angleRad) * travelDist;
        return {
          spriteIdx: i % assets.streaks.length,
          startT: 0.25 + i * 0.032 + Math.random() * 0.012,
          duration: 0.19 + Math.random() * 0.06,
          angleRad,
          startX,
          startY,
          endX,
          endY,
          scale: (0.42 + Math.random() * 0.28) * baseScale,
        };
      });

      // Beat 4a: Shards bursting outward from impact center with gravity
      const shards: ShardParticle[] = Array.from({ length: 10 }, (_, i) => {
        const tgt = targetsPx[i % targetsPx.length];
        const a = -Math.PI * (0.15 + Math.random() * 0.7); // upward fan
        const spd = (110 + Math.random() * 150) * baseScale;
        return {
          startT: 0.55 + Math.random() * 0.08,
          originX: tgt.x + (Math.random() - 0.5) * 36 * baseScale,
          originY: tgt.y - 26 * baseScale,
          vx: Math.cos(a) * spd * (Math.random() < 0.5 ? -1 : 1),
          vy: -Math.abs(Math.sin(a) * spd) - 40 * baseScale,
          gravity: 420 * baseScale,
          rot: Math.random() * Math.PI * 2,
          vRot: (Math.random() - 0.5) * 6.5,
          size: (44 + Math.random() * 34) * baseScale,
          life: 0.62 + Math.random() * 0.22,
        };
      });

      // Beat 4b: Rising luminous particles (sparkles, 4-pt stars, golden dust)
      const kinds: GlowParticle['kind'][] = ['sparkles', 'star4', 'dust'];
      const glows: GlowParticle[] = Array.from({ length: 22 }, (_, i) => {
        const tgt = targetsPx[i % targetsPx.length];
        const kind = kinds[i % kinds.length];
        return {
          kind,
          startT: 0.52 + Math.random() * 0.22,
          x: tgt.x + (Math.random() - 0.5) * 180 * baseScale,
          y: tgt.y + (Math.random() - 0.3) * 45 * baseScale,
          vx: (Math.random() - 0.5) * 24 * baseScale,
          vy: -(52 + Math.random() * 68) * baseScale,
          rot: Math.random() * Math.PI * 2,
          vRot: (Math.random() - 0.5) * 1.9,
          size:
            (kind === 'dust'
              ? 62 + Math.random() * 44
              : kind === 'sparkles'
                ? 54 + Math.random() * 36
                : 32 + Math.random() * 28) * baseScale,
          phase: Math.random() * Math.PI * 2,
          twinkleFreq: 7 + Math.random() * 7,
          life: 0.58 + Math.random() * 0.3,
        };
      });

      dimCbRef.current = options.onDimChange || null;
      options.onDimChange?.(true);

      return new Promise<void>((resolve) => {
        resolveRef.current = resolve;
        const t0 = performance.now();
        let impactFired = false;
        let dimReleased = false;

        const renderFrame = (now: number) => {
          if (activeRunIdRef.current !== runId) return;

          const elapsedSec = (now - t0) / 1000;
          const t = elapsedSec / Math.max(0.25, speedMult);

          if (!impactFired && t >= IMPACT_TIME_S) {
            impactFired = true;
            options.onImpact?.();
          }

          if (!dimReleased && t >= 1.22) {
            dimReleased = true;
            options.onDimChange?.(false);
          }

          ctx.save();
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          ctx.clearRect(0, 0, cssW, cssH);
          ctx.globalCompositeOperation = 'lighter';

          // =================================================================
          // BEAT 1: KHAI TRẬN (0.0s – 0.45s scale-in, stays glowing until 1.4s)
          // =================================================================
          {
            const grow = easeOutCubic(t / 0.32);
            const fadeOut = t > 1.05 ? 1 - clamp01((t - 1.05) / 0.35) : 1;
            const alpha = clamp01(grow * 1.15) * fadeOut;

            if (alpha > 0.01) {
              // Sky Bagua Formation (2.5D flattened scaleY = 0.55)
              ctx.save();
              ctx.translate(skyX, skyY);
              ctx.scale(1, 0.55);
              ctx.rotate(t * 1.15);
              ctx.globalAlpha = alpha * 0.96;
              const d = circleRadius * 2 * (0.18 + 0.82 * grow);
              ctx.drawImage(assets.circle, -d / 2, -d / 2, d, d);
              ctx.restore();

              // Golden Core Orb at center of sky formation
              ctx.save();
              ctx.translate(skyX, skyY);
              const orbPulse = 0.88 + 0.16 * Math.sin(t * 14);
              const orbSize = circleRadius * 1.25 * grow * orbPulse;
              ctx.globalAlpha = alpha * 0.82;
              ctx.drawImage(assets.pOrb, -orbSize / 2, -orbSize / 2, orbSize, orbSize);
              ctx.restore();

              // Ground Resonance Sigil under target cluster (subtle 2.5D depth anchor)
              ctx.save();
              ctx.translate(centerX, centerY + 6 * baseScale);
              ctx.scale(1, 0.42);
              ctx.rotate(-t * 0.85);
              ctx.globalAlpha = alpha * 0.48;
              const gd = circleRadius * 1.65 * (0.25 + 0.75 * grow);
              ctx.drawImage(assets.circle, -gd / 2, -gd / 2, gd, gd);
              ctx.restore();
            }
          }

          // =================================================================
          // BEAT 2: MƯA KIẾM LAO XUỐNG (0.25s – 0.75s)
          // =================================================================
          for (const st of streaks) {
            if (t < st.startT || t > st.startT + st.duration) continue;
            const p = (t - st.startT) / st.duration;
            const eased = p * p * (3 - 2 * p); // brisk acceleration into target
            const px = st.startX + (st.endX - st.startX) * eased;
            const py = st.startY + (st.endY - st.startY) * eased;
            const fadeIn = clamp01(p / 0.18);
            const fadeOut = 1 - clamp01((p - 0.74) / 0.26);
            const sprite = assets.streaks[st.spriteIdx];
            const w = sprite.width * st.scale;
            const h = sprite.height * st.scale * 1.15;

            ctx.save();
            ctx.translate(px, py);
            ctx.rotate(st.angleRad);
            ctx.globalAlpha = fadeIn * fadeOut * 0.96;
            ctx.drawImage(sprite, -w * 0.75, -h / 2, w, h);
            ctx.restore();
          }

          // =================================================================
          // BEAT 3: BÙNG NỔ & SÓNG XUNG KÍCH (0.45s – 1.05s) + 8-PT STAR FLASH
          // =================================================================
          if (t >= IMPACT_TIME_S && t <= IMPACT_END_S + 0.12) {
            // Primary impact sequence at target cluster center (21 FPS)
            const localT = t - IMPACT_TIME_S;
            const frameIdx = Math.floor(localT * IMPACT_FPS);
            if (frameIdx >= 0 && frameIdx < assets.impacts.length) {
              const frameImg = assets.impacts[frameIdx];
              const size = Math.max(190, 265 * baseScale);
              ctx.save();
              ctx.translate(centerX, centerY - 24 * baseScale);
              ctx.globalAlpha = 0.98;
              ctx.drawImage(frameImg, -size / 2, -size / 2, size, size);
              ctx.restore();
            }

            // Secondary bursts on individual targets when hitting multiple enemies
            if (targetsPx.length > 1) {
              targetsPx.forEach((tp, idx) => {
                const delay = (idx % 3) * 0.04;
                const subFrame = Math.floor((localT - delay) * IMPACT_FPS);
                if (subFrame >= 0 && subFrame < assets.impacts.length) {
                  const frameImg = assets.impacts[subFrame];
                  const subSize = Math.max(135, 185 * baseScale);
                  ctx.save();
                  ctx.translate(tp.x, tp.y - 20 * baseScale);
                  ctx.globalAlpha = 0.85;
                  ctx.drawImage(frameImg, -subSize / 2, -subSize / 2, subSize, subSize);
                  ctx.restore();
                }
              });
            }

            // 8-Point Star Flash (90ms burst right at impact moment: 0.45s – 0.54s)
            if (localT >= 0 && localT <= 0.095) {
              const fp = localT / 0.095;
              const starScale = 0.45 + easeOutCubic(fp) * 1.35;
              const starAlpha = fp < 0.35 ? 1 : 1 - (fp - 0.35) / 0.65;
              const starSize = 185 * baseScale * starScale;
              ctx.save();
              ctx.translate(centerX, centerY - 30 * baseScale);
              ctx.rotate(fp * 0.45);
              ctx.globalAlpha = clamp01(starAlpha);
              ctx.drawImage(assets.pStar8, -starSize / 2, -starSize / 2, starSize, starSize);
              ctx.restore();
            }
          }

          // =================================================================
          // BEAT 4: DƯ CHẤN LUNG LINH (0.55s – 1.40s)
          // =================================================================
          // 4a. Shards flying outward & falling under gravity
          for (const sh of shards) {
            if (t < sh.startT || t > sh.startT + sh.life) continue;
            const dt = t - sh.startT;
            const p = dt / sh.life;
            const px = sh.originX + sh.vx * dt;
            const py = sh.originY + sh.vy * dt + 0.5 * sh.gravity * dt * dt;
            const alpha = clamp01(p / 0.12) * (1 - clamp01((p - 0.55) / 0.45));

            ctx.save();
            ctx.translate(px, py);
            ctx.rotate(sh.rot + sh.vRot * dt);
            ctx.globalAlpha = alpha * 0.92;
            ctx.drawImage(assets.pShards, -sh.size / 2, -sh.size / 2, sh.size, sh.size);
            ctx.restore();
          }

          // 4b. Floating sparkles, 4-point stars & golden dust drifting upward
          for (const g of glows) {
            if (t < g.startT || t > g.startT + g.life) continue;
            const dt = t - g.startT;
            const p = dt / g.life;
            const px = g.x + g.vx * dt + Math.sin(dt * 3.5 + g.phase) * 8 * baseScale;
            const py = g.y + g.vy * dt;
            const twinkle = 0.55 + 0.45 * Math.sin(dt * g.twinkleFreq + g.phase);
            const fade = clamp01(p / 0.16) * (1 - clamp01((p - 0.5) / 0.5));
            const img =
              g.kind === 'sparkles'
                ? assets.pSparkles
                : g.kind === 'star4'
                  ? assets.pStar4
                  : assets.pDust;

            ctx.save();
            ctx.translate(px, py);
            ctx.rotate(g.rot + g.vRot * dt);
            ctx.globalAlpha = fade * twinkle * 0.9;
            ctx.drawImage(img, -g.size / 2, -g.size / 2, g.size, g.size);
            ctx.restore();
          }

          ctx.restore();

          if (t < TOTAL_DURATION_S) {
            rafRef.current = requestAnimationFrame(renderFrame);
          } else {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            rafRef.current = null;
            options.onDimChange?.(false);
            dimCbRef.current = null;
            if (resolveRef.current) {
              const done = resolveRef.current;
              resolveRef.current = null;
              done();
            }
          }
        };

        rafRef.current = requestAnimationFrame(renderFrame);
      });
    },
  }));

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 w-full h-full z-[910]"
      style={{ mixBlendMode: 'screen' }}
    />
  );
});

VanKiemQuyTongVFX.displayName = 'VanKiemQuyTongVFX';
