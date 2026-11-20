import React, { useEffect, useRef } from 'react';
import { getVfxAuraPreset, VfxAuraPreset } from '../data/vfxAuras';

export interface CharacterAuraVFXProps {
  auraId: number; // 1..16
  /** Base height (px) of the character being wrapped */
  characterHeight?: number;
  /** Speed multiplier (default 1.0) */
  speed?: number;
  /** Opacity / intensity multiplier (default 1.0) */
  intensity?: number;
  /** Render orbiting helical sparks alongside the ribbon */
  showParticles?: boolean;
  /** Phase offset so multiple disciples don't animate in unison */
  phaseOffset?: number;
  /** Character content sandwiched between back canvas (z-0) and front canvas (z-20) */
  children?: React.ReactNode;
  className?: string;
}

interface HelicalSpark {
  angle: number;
  vAngle: number;
  heightRatio: number;
  vy: number;
  radiusMult: number;
  size: number;
  life: number;
  maxLife: number;
  color: string;
}

const ribbonImageCache = new Map<string, HTMLImageElement>();
function getRibbonImage(url: string): HTMLImageElement {
  let img = ribbonImageCache.get(url);
  if (!img) {
    img = new Image();
    img.src = url;
    ribbonImageCache.set(url, img);
  }
  return img;
}

/**
 * Draws a seamless horizontal RGBA ribbon texture wrapped as a TRUE 3D helix
 * around the vertical axis of the character:
 * - Segments with z = sin(angle) < 0 are drawn onto backCtx (BEHIND the character)
 * - Segments with z = sin(angle) >= 0 are drawn onto frontCtx (IN FRONT of the character's waist/body)
 * - Texture scrolls seamlessly along the ribbon (UV flow) with zero seams, zero dotted artifacts,
 *   and zero face obstruction!
 */
function drawHelicalTexturedRibbon(params: {
  backCtx: CanvasRenderingContext2D;
  frontCtx: CanvasRenderingContext2D;
  img: HTMLImageElement;
  w: number;
  h: number;
  charH: number;
  turns: number;
  bandHeight: number;
  angleOffset: number;
  scrollU: number;
  opacity: number;
  flicker: number;
}) {
  const {
    backCtx,
    frontCtx,
    img,
    w,
    h,
    charH,
    turns,
    bandHeight,
    angleOffset,
    scrollU,
    opacity,
    flicker,
  } = params;

  if (!img.complete || img.naturalWidth === 0) return;

  const imgW = img.naturalWidth;
  const imgH = img.naturalHeight;
  const cx = w * 0.5;
  // Spiral starts near ankles/feet and wraps smoothly up around waist/chest (keeps head/eyes clear!)
  const feetY = h * 0.87;
  const topY = h * 0.24;
  const spiralH = feetY - topY;
  const rx = charH * 0.52;
  const ry = charH * 0.14;

  const steps = 44;
  const texRepeats = 1.6;

  for (let i = 0; i < steps; i++) {
    const u0 = i / steps;
    const u1 = (i + 1) / steps;
    const uMid = (u0 + u1) * 0.5;

    const ang0 = angleOffset + u0 * Math.PI * 2 * turns;
    const ang1 = angleOffset + u1 * Math.PI * 2 * turns;
    const angMid = (ang0 + ang1) * 0.5;
    const zMid = Math.sin(angMid); // < 0 behind chibi, >= 0 in front of chibi

    // Smooth taper at both ends of the spiral
    const env = Math.sin(uMid * Math.PI);
    if (env < 0.04) continue;

    // Gentle hourglass waist curve around chibi silhouette
    const r0 = rx * (0.84 + Math.sin(u0 * Math.PI) * 0.22);
    const r1 = rx * (0.84 + Math.sin(u1 * Math.PI) * 0.22);

    const x0 = cx + Math.cos(ang0) * r0;
    const y0 = feetY - u0 * spiralH + Math.sin(ang0) * ry;
    const x1 = cx + Math.cos(ang1) * r1;
    const y1 = feetY - u1 * spiralH + Math.sin(ang1) * ry;

    const dx = x1 - x0;
    const dy = y1 - y0;
    const segLen = Math.hypot(dx, dy);
    if (segLen < 0.4) continue;

    const tangent = Math.atan2(dy, dx);
    const isFront = zMid >= 0;
    const ctx = isFront ? frontCtx : backCtx;

    // Keep upper-face region clear on the front pass while waist/lower torso stays vivid
    let faceClearance = 1.0;
    if (isFront && uMid > 0.66) {
      faceClearance = Math.max(0.12, 1 - (uMid - 0.66) / 0.28);
    }

    // Smooth depth fade at the turning silhouettes so back <-> front transition is seamless
    const depthAlpha = isFront ? 0.82 + 0.18 * zMid : 0.62 + 0.22 * (1 + zMid);
    const segAlpha = Math.max(0, Math.min(1, env * depthAlpha * faceClearance * opacity * flicker));
    if (segAlpha < 0.02) continue;

    // Sample scrolling horizontal UV slice from seamless 1024x128 RGBA ribbon
    const rawU = (u0 * texRepeats - scrollU) % 1;
    const normU = rawU < 0 ? rawU + 1 : rawU;
    const sliceW = Math.max(2, (texRepeats / steps) * imgW);
    const srcX = Math.min(imgW - sliceW, normU * (imgW - sliceW));

    const drawH = bandHeight * (0.65 + 0.45 * env) * (isFront ? 1.04 : 0.88);
    const drawW = segLen + 1.35; // slight overlap eliminates hairline gaps between slices

    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = segAlpha;
    ctx.translate((x0 + x1) * 0.5, (y0 + y1) * 0.5);
    ctx.rotate(tangent);
    ctx.drawImage(img, srcX, 0, sliceW, imgH, -drawW * 0.5, -drawH * 0.5, drawW, drawH);
    ctx.restore();
  }
}

export const CharacterAuraVFX: React.FC<CharacterAuraVFXProps> = ({
  auraId,
  characterHeight = 80,
  speed = 1,
  intensity = 1,
  showParticles = true,
  phaseOffset = 0,
  children,
  className = '',
}) => {
  const preset: VfxAuraPreset = getVfxAuraPreset(auraId);
  const canvasW = Math.round(characterHeight * 1.65);
  const canvasH = Math.round(characterHeight * preset.heightRatio);

  const backCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const frontCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const cfgRef = useRef({ preset, speed, intensity, showParticles, characterHeight });
  cfgRef.current = { preset, speed, intensity, showParticles, characterHeight };

  useEffect(() => {
    const primaryImg = getRibbonImage(preset.ribbonUrl);
    const secondaryImg = preset.secondaryRibbonUrl ? getRibbonImage(preset.secondaryRibbonUrl) : null;

    const backCanvas = backCanvasRef.current;
    const frontCanvas = frontCanvasRef.current;
    const backCtx = backCanvas?.getContext('2d') ?? null;
    const frontCtx = frontCanvas?.getContext('2d') ?? null;
    if (!backCanvas || !frontCanvas || !backCtx || !frontCtx) return;

    const sparks: HelicalSpark[] = [];
    let rafId = 0;
    let lastTs = performance.now();
    let t = phaseOffset;

    const tick = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTs) / 1000));
      lastTs = now;

      const cur = cfgRef.current;
      const spd = Math.max(0.05, cur.speed);
      t += dt * spd;

      const w = backCanvas.width;
      const h = backCanvas.height;
      backCtx.clearRect(0, 0, w, h);
      frontCtx.clearRect(0, 0, w, h);

      if (cur.intensity > 0.04) {
        let flicker = 1.0;
        if (cur.preset.motion === 'lightning') {
          flicker = 0.8 + Math.abs(Math.sin(t * 22)) * 0.25;
        } else if (cur.preset.motion === 'fire') {
          flicker = 0.9 + Math.sin(t * 14) * 0.12;
        }

        const bandHeight = cur.characterHeight * 0.24 * cur.preset.ribbonThickness;
        const scrollU = t * cur.preset.scrollSpeed;
        const angleOffset = t * (cur.preset.motion === 'lightning' ? 2.1 : 1.55) + phaseOffset;

        // Primary 3D Helical RGBA Ribbon wrapping behind & in front of the chibi
        drawHelicalTexturedRibbon({
          backCtx,
          frontCtx,
          img: primaryImg,
          w,
          h,
          charH: cur.characterHeight,
          turns: cur.preset.turns,
          bandHeight,
          angleOffset,
          scrollU,
          opacity: Math.min(1, 0.95 * cur.intensity),
          flicker,
        });

        // Optional counter-phase second ribbon (for Hợp Thể & Độ Kiếp Viên Mãn)
        if (secondaryImg) {
          drawHelicalTexturedRibbon({
            backCtx,
            frontCtx,
            img: secondaryImg,
            w,
            h,
            charH: cur.characterHeight,
            turns: cur.preset.turns,
            bandHeight: bandHeight * 0.85,
            angleOffset: angleOffset + Math.PI,
            scrollU: scrollU * 1.12,
            opacity: Math.min(0.95, 0.82 * cur.intensity),
            flicker,
          });
        }

        // Subtle 3D orbiting sparks rising around the ribbon
        if (cur.showParticles) {
          const cx = w * 0.5;
          const feetY = h * 0.87;
          const spiralH = feetY - h * 0.22;
          const rx = cur.characterHeight * 0.54;
          const ry = cur.characterHeight * 0.14;

          const spawnRate = cur.preset.motion === 'ascend' ? 12 : cur.preset.motion === 'fire' ? 11 : 7;
          if (sparks.length < 18 && Math.random() < dt * spawnRate * spd) {
            sparks.push({
              angle: Math.random() * Math.PI * 2,
              vAngle: 2.6 + Math.random() * 1.5,
              heightRatio: Math.random() * 0.18,
              vy: 0.45 + Math.random() * 0.35,
              radiusMult: 0.85 + Math.random() * 0.3,
              size: 1.4 + Math.random() * 1.8,
              life: 0,
              maxLife: 0.9 + Math.random() * 0.65,
              color: Math.random() < 0.5 ? cur.preset.secondaryColor : cur.preset.primaryColor,
            });
          }

          for (let i = sparks.length - 1; i >= 0; i--) {
            const s = sparks[i];
            s.life += dt * spd;
            if (s.life >= s.maxLife || s.heightRatio > 1.05) {
              sparks.splice(i, 1);
              continue;
            }
            s.angle += s.vAngle * dt * spd;
            s.heightRatio += s.vy * dt * spd;
            const z = Math.sin(s.angle);
            const isFront = z >= 0;
            const ctx = isFront ? frontCtx : backCtx;
            const sx = cx + Math.cos(s.angle) * (rx * s.radiusMult);
            const sy = feetY - s.heightRatio * spiralH + z * ry;
            const fade = Math.sin((s.life / s.maxLife) * Math.PI);

            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = Math.max(0, Math.min(1, fade * (isFront ? 0.9 : 0.6) * cur.intensity));
            ctx.fillStyle = s.color;
            ctx.beginPath();
            ctx.arc(sx, sy, s.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        }
      }

      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [preset.id, preset.ribbonUrl, preset.secondaryRibbonUrl, phaseOffset]);

  return (
    <div className={`relative inline-flex items-end justify-center ${className}`}>
      {/* BACK HELIX LAYER (z-0): Drawn strictly BEHIND the chibi */}
      <canvas
        ref={backCanvasRef}
        width={canvasW}
        height={canvasH}
        className="pointer-events-none select-none absolute left-1/2 -bottom-1 z-0"
        style={{
          width: canvasW,
          height: canvasH,
          marginLeft: -canvasW / 2,
        }}
      />

      {/* CHARACTER LAYER (z-10): Chibi sprite stays 100% crisp */}
      <div className="relative z-10 flex items-end justify-center">{children}</div>

      {/* FRONT HELIX LAYER (z-20): Drawn IN FRONT of chibi waist/body (keeps face clear!) */}
      <canvas
        ref={frontCanvasRef}
        width={canvasW}
        height={canvasH}
        className="pointer-events-none select-none absolute left-1/2 -bottom-1 z-20"
        style={{
          width: canvasW,
          height: canvasH,
          marginLeft: -canvasW / 2,
        }}
      />
    </div>
  );
};
