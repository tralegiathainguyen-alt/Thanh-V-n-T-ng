import React, { useEffect, useRef } from 'react';

/**
 * Normalized (0.0 – 1.0) map-relative anchor coordinates for all localized
 * ambient effects on the Sect Map. Adjust any coordinate here to fine-tune
 * alignment with buildings, chimneys, waterfall, or herb garden.
 */
export const AMBIENT_ANCHORS = {
  waterfall: {
    xMin: 0.88,
    xMax: 0.98,
    yMin: 0.68,
    yMax: 0.92,
    mistX: 0.93,
    mistY: 0.86,
    streamXMin: 0.86,
    streamXMax: 0.98,
    streamYMin: 0.82,
    streamYMax: 0.92,
  },
  leftForge: {
    xMin: 0.16,
    xMax: 0.25,
    yMin: 0.32,
    yMax: 0.47,
    chimneyX: 0.205,
    chimneyY: 0.34,
    mouthX: 0.212,
    mouthY: 0.432,
  },
  centerFurnace: {
    xMin: 0.51,
    xMax: 0.56,
    yMin: 0.36,
    yMax: 0.45,
    chimneyX: 0.535,
    chimneyY: 0.372,
    mouthX: 0.535,
    mouthY: 0.426,
  },
  herbGarden: {
    xMin: 0.68,
    xMax: 0.86,
    yMin: 0.68,
    yMax: 0.88,
  },
  clouds: {
    yMin: 0.05,
    yMax: 0.36,
  },
  godRays: {
    originX: 0.04,
    originY: -0.06,
  },
  birds: {
    yMin: 0.07,
    yMax: 0.24,
  },
} as const;

interface SectAmbientVFXProps {
  /** 'world' renders localized building/waterfall/cloud/bird VFX locked to map coordinates;
   *  'foreground' renders god rays, drifting autumn leaves & sun motes in front with stronger parallax. */
  layer: 'world' | 'foreground';
  className?: string;
}

interface FoamStreak {
  xFrac: number;
  yFrac: number;
  speed: number;
  lenFrac: number;
  width: number;
  alpha: number;
}

interface MistPuff {
  xFrac: number;
  yFrac: number;
  rFrac: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  maxAlpha: number;
}

interface WaterGlint {
  xFrac: number;
  yFrac: number;
  phase: number;
  freq: number;
  size: number;
}

interface SmokePuff {
  originX: number;
  originY: number;
  age: number;
  life: number;
  driftX: number;
  riseY: number;
  startR: number;
  endR: number;
  maxAlpha: number;
  wobblePhase: number;
}

interface EmberSpark {
  originX: number;
  originY: number;
  age: number;
  life: number;
  vx: number;
  vy: number;
  size: number;
}

interface SpiritFirefly {
  baseX: number;
  baseY: number;
  ampX: number;
  ampY: number;
  freqX: number;
  freqY: number;
  phase: number;
  twinklePhase: number;
  color: string;
  size: number;
}

interface CloudBand {
  xFrac: number;
  yFrac: number;
  wFrac: number;
  hFrac: number;
  speed: number;
  alpha: number;
}

interface Bird {
  xFrac: number;
  yFrac: number;
  vx: number;
  vy: number;
  wingPhase: number;
  wingSpeed: number;
  size: number;
}

interface MapleLeaf {
  xFrac: number;
  yFrac: number;
  vx: number;
  vy: number;
  swayAmp: number;
  swayFreq: number;
  swayPhase: number;
  rot: number;
  vRot: number;
  flipPhase: number;
  flipSpeed: number;
  size: number;
  isNear: boolean;
  color: string;
  alpha: number;
}

interface DustMote {
  xFrac: number;
  yFrac: number;
  vx: number;
  vy: number;
  phase: number;
  size: number;
  alpha: number;
}

const LEAF_COLORS = ['#D94826', '#E86A2C', '#F29F38', '#C8372D', '#EA7E2E'];

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function drawMapleLeaf(ctx: CanvasRenderingContext2D, size: number, color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, -size);
  ctx.quadraticCurveTo(size * 0.45, -size * 0.45, size * 0.95, -size * 0.15);
  ctx.quadraticCurveTo(size * 0.55, size * 0.25, size * 0.42, size * 0.72);
  ctx.quadraticCurveTo(0, size * 0.42, -size * 0.42, size * 0.72);
  ctx.quadraticCurveTo(-size * 0.55, size * 0.25, -size * 0.95, -size * 0.15);
  ctx.quadraticCurveTo(-size * 0.45, -size * 0.45, 0, -size);
  ctx.closePath();
  ctx.fill();
}

export const SectAmbientVFX: React.FC<SectAmbientVFXProps> = ({ layer, className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    let lastTime = performance.now();

    // ========================================================================
    // INITIALIZE PROCEDURAL PARTICLE POOLS (total < 120 across both layers)
    // ========================================================================
    const wf = AMBIENT_ANCHORS.waterfall;
    const lf = AMBIENT_ANCHORS.leftForge;
    const cf = AMBIENT_ANCHORS.centerFurnace;
    const hg = AMBIENT_ANCHORS.herbGarden;

    // World layer pools (~65 particles)
    const foamStreaks: FoamStreak[] = Array.from({ length: 14 }, () => ({
      xFrac: rand(wf.xMin + 0.01, wf.xMax - 0.01),
      yFrac: rand(wf.yMin, wf.yMax),
      speed: rand(0.11, 0.19),
      lenFrac: rand(0.035, 0.07),
      width: rand(1.4, 3.2),
      alpha: rand(0.18, 0.42),
    }));

    const mistPuffs: MistPuff[] = Array.from({ length: 8 }, (_, i) => ({
      xFrac: rand(wf.mistX - 0.045, wf.mistX + 0.045),
      yFrac: rand(wf.mistY - 0.02, wf.mistY + 0.04),
      rFrac: rand(0.028, 0.052),
      vx: rand(-0.006, 0.005),
      vy: rand(-0.014, -0.007),
      age: (i / 8) * 3.2,
      life: rand(2.6, 3.8),
      maxAlpha: rand(0.14, 0.26),
    }));

    const waterGlints: WaterGlint[] = Array.from({ length: 7 }, () => ({
      xFrac: rand(wf.streamXMin, wf.streamXMax),
      yFrac: rand(wf.streamYMin, wf.streamYMax),
      phase: rand(0, Math.PI * 2),
      freq: rand(2.2, 4.4),
      size: rand(2.0, 4.2),
    }));

    const smokePuffs: SmokePuff[] = [
      ...Array.from({ length: 8 }, (_, i) => ({
        originX: lf.chimneyX + rand(-0.008, 0.008),
        originY: lf.chimneyY + rand(-0.005, 0.005),
        age: (i / 8) * 4.2,
        life: rand(3.6, 5.0),
        driftX: rand(0.028, 0.055),
        riseY: rand(0.075, 0.13),
        startR: rand(0.007, 0.012),
        endR: rand(0.028, 0.046),
        maxAlpha: rand(0.16, 0.28),
        wobblePhase: rand(0, Math.PI * 2),
      })),
      ...Array.from({ length: 6 }, (_, i) => ({
        originX: cf.chimneyX + rand(-0.006, 0.006),
        originY: cf.chimneyY + rand(-0.005, 0.005),
        age: (i / 6) * 3.8,
        life: rand(3.2, 4.5),
        driftX: rand(0.022, 0.044),
        riseY: rand(0.065, 0.105),
        startR: rand(0.006, 0.01),
        endR: rand(0.022, 0.038),
        maxAlpha: rand(0.14, 0.24),
        wobblePhase: rand(0, Math.PI * 2),
      })),
    ];

    const embers: EmberSpark[] = [
      ...Array.from({ length: 3 }, (_, i) => ({
        originX: lf.mouthX + rand(-0.012, 0.012),
        originY: lf.mouthY + rand(-0.01, 0.008),
        age: i * 0.9,
        life: rand(1.6, 2.8),
        vx: rand(0.004, 0.015),
        vy: rand(-0.038, -0.022),
        size: rand(1.3, 2.4),
      })),
      ...Array.from({ length: 3 }, (_, i) => ({
        originX: cf.mouthX + rand(-0.01, 0.01),
        originY: cf.mouthY + rand(-0.008, 0.008),
        age: i * 1.1,
        life: rand(1.5, 2.6),
        vx: rand(0.003, 0.012),
        vy: rand(-0.032, -0.018),
        size: rand(1.2, 2.2),
      })),
    ];

    const fireflies: SpiritFirefly[] = Array.from({ length: 10 }, (_, i) => ({
      baseX: rand(hg.xMin, hg.xMax),
      baseY: rand(hg.yMin, hg.yMax),
      ampX: rand(0.012, 0.028),
      ampY: rand(0.01, 0.024),
      freqX: rand(0.45, 0.95),
      freqY: rand(0.55, 1.15),
      phase: rand(0, Math.PI * 2),
      twinklePhase: rand(0, Math.PI * 2),
      color: i % 2 === 0 ? '#FDE68A' : '#6EE7B7',
      size: rand(2.6, 4.8),
    }));

    const clouds: CloudBand[] = [
      { xFrac: 0.08, yFrac: 0.13, wFrac: 0.34, hFrac: 0.09, speed: 0.0038, alpha: 0.16 },
      { xFrac: 0.48, yFrac: 0.24, wFrac: 0.38, hFrac: 0.1, speed: 0.0029, alpha: 0.14 },
      { xFrac: 0.82, yFrac: 0.09, wFrac: 0.3, hFrac: 0.08, speed: 0.0044, alpha: 0.18 },
    ];

    let birds: Bird[] = [];
    let nextBirdTimer = rand(3.5, 7.5); // first flock appears soon, then every 12–18s

    // Foreground layer pools (36 particles: 16 maple leaves + 20 sun dust motes)
    const leaves: MapleLeaf[] = Array.from({ length: 16 }, (_, i) => {
      const isNear = i >= 9;
      return {
        xFrac: rand(-0.1, 1.05),
        yFrac: rand(-0.1, 1.0),
        vx: isNear ? rand(0.028, 0.048) : rand(0.016, 0.028),
        vy: isNear ? rand(0.032, 0.052) : rand(0.02, 0.034),
        swayAmp: isNear ? rand(0.012, 0.024) : rand(0.007, 0.014),
        swayFreq: rand(1.1, 2.2),
        swayPhase: rand(0, Math.PI * 2),
        rot: rand(0, Math.PI * 2),
        vRot: rand(-1.5, 1.5),
        flipPhase: rand(0, Math.PI * 2),
        flipSpeed: rand(1.8, 3.6),
        size: isNear ? rand(5.5, 8.2) : rand(3.2, 4.9),
        isNear,
        color: LEAF_COLORS[i % LEAF_COLORS.length],
        alpha: isNear ? rand(0.74, 0.92) : rand(0.42, 0.62),
      };
    });

    const dustMotes: DustMote[] = Array.from({ length: 20 }, () => ({
      xFrac: rand(0, 1),
      yFrac: rand(0, 0.92),
      vx: rand(-0.005, 0.009),
      vy: rand(-0.008, -0.002),
      phase: rand(0, Math.PI * 2),
      size: rand(1.2, 2.5),
      alpha: rand(0.22, 0.48),
    }));

    const syncCanvasSize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      const cw = Math.max(300, canvas.clientWidth || 1280);
      const ch = Math.max(200, canvas.clientHeight || 720);
      const targetW = Math.round(cw * dpr);
      const targetH = Math.round(ch * dpr);
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }
      return { cw, ch, dpr };
    };

    const render = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;
      const t = now / 1000;

      const { cw, ch, dpr } = syncCanvasSize();
      const unitScale = Math.max(0.55, Math.min(1.25, cw / 1200));

      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cw, ch);

      if (layer === 'world') {
        // --------------------------------------------------------------------
        // 1. DISTANT VALLEY MIST CLOUDS (y: 0.05 – 0.36, opacity 0.12 – 0.22)
        // --------------------------------------------------------------------
        for (const c of clouds) {
          c.xFrac += c.speed * dt;
          if (c.xFrac - c.wFrac * 0.5 > 1.08) {
            c.xFrac = -c.wFrac * 0.55;
          }
          const cx = c.xFrac * cw;
          const cy = c.yFrac * ch;
          const rx = c.wFrac * cw * 0.5;
          const ry = c.hFrac * ch * 0.5;

          ctx.save();
          ctx.translate(cx, cy);
          ctx.scale(1, ry / Math.max(1, rx));
          const grad = ctx.createRadialGradient(0, 0, rx * 0.1, 0, 0, rx);
          grad.addColorStop(0, `rgba(242, 248, 250, ${c.alpha})`);
          grad.addColorStop(0.55, `rgba(232, 244, 246, ${c.alpha * 0.52})`);
          grad.addColorStop(1, 'rgba(232, 244, 246, 0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(0, 0, rx, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        // --------------------------------------------------------------------
        // 2. DISTANT BIRD FLOCK (2–3 birds every 12–18s in upper-left sky)
        // --------------------------------------------------------------------
        nextBirdTimer -= dt;
        if (nextBirdTimer <= 0 && birds.length === 0) {
          const count = Math.random() < 0.5 ? 2 : 3;
          const baseY = rand(AMBIENT_ANCHORS.birds.yMin, AMBIENT_ANCHORS.birds.yMax);
          birds = Array.from({ length: count }, (_, i) => ({
            xFrac: -0.04 - i * rand(0.022, 0.036),
            yFrac: baseY + (i - 1) * rand(0.012, 0.022),
            vx: rand(0.032, 0.044),
            vy: rand(-0.005, 0.004),
            wingPhase: rand(0, Math.PI * 2),
            wingSpeed: rand(5.0, 6.8),
            size: rand(4.2, 6.2) * unitScale,
          }));
          nextBirdTimer = rand(12, 18);
        }

        if (birds.length > 0) {
          ctx.strokeStyle = 'rgba(28, 38, 42, 0.52)';
          ctx.lineWidth = Math.max(1.1, 1.5 * unitScale);
          ctx.lineCap = 'round';
          for (const b of birds) {
            b.xFrac += b.vx * dt;
            b.yFrac += b.vy * dt;
            const bx = b.xFrac * cw;
            const by = b.yFrac * ch;
            const flap = Math.sin(t * b.wingSpeed + b.wingPhase) * b.size * 0.58;
            ctx.beginPath();
            ctx.moveTo(bx - b.size, by - flap);
            ctx.quadraticCurveTo(bx - b.size * 0.35, by - b.size * 0.35, bx, by);
            ctx.quadraticCurveTo(bx + b.size * 0.35, by - b.size * 0.35, bx + b.size, by - flap);
            ctx.stroke();
          }
          birds = birds.filter((b) => b.xFrac < 0.62);
        }

        // --------------------------------------------------------------------
        // 3. WATERFALL & STREAM (bottom-right: foam streaks, mist, water glints)
        // --------------------------------------------------------------------
        for (const f of foamStreaks) {
          f.yFrac += f.speed * dt;
          if (f.yFrac > wf.yMax) {
            f.yFrac = wf.yMin;
            f.xFrac = rand(wf.xMin + 0.01, wf.xMax - 0.01);
          }
          const x = f.xFrac * cw;
          const y0 = f.yFrac * ch;
          const y1 = Math.min(wf.yMax * ch, y0 + f.lenFrac * ch);
          const grad = ctx.createLinearGradient(x, y0, x, y1);
          grad.addColorStop(0, 'rgba(255, 255, 255, 0)');
          grad.addColorStop(0.5, `rgba(242, 252, 255, ${f.alpha})`);
          grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
          ctx.strokeStyle = grad;
          ctx.lineWidth = f.width * unitScale;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(x, y0);
          ctx.lineTo(x + 1.5 * unitScale, y1);
          ctx.stroke();
        }

        for (const m of mistPuffs) {
          m.age += dt;
          if (m.age >= m.life) {
            m.age = 0;
            m.xFrac = rand(wf.mistX - 0.048, wf.mistX + 0.045);
            m.yFrac = rand(wf.mistY - 0.015, wf.mistY + 0.04);
          }
          const p = m.age / m.life;
          const alpha = Math.sin(p * Math.PI) * m.maxAlpha;
          const mx = (m.xFrac + m.vx * m.age) * cw;
          const my = (m.yFrac + m.vy * m.age) * ch;
          const rad = m.rFrac * cw * (0.7 + p * 0.85);
          const grad = ctx.createRadialGradient(mx, my, 0, mx, my, rad);
          grad.addColorStop(0, `rgba(246, 252, 255, ${alpha})`);
          grad.addColorStop(0.6, `rgba(230, 246, 252, ${alpha * 0.45})`);
          grad.addColorStop(1, 'rgba(230, 246, 252, 0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(mx, my, rad, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (const g of waterGlints) {
          const pulse = Math.max(0, Math.sin(t * g.freq + g.phase));
          if (pulse < 0.25) continue;
          const a = Math.pow(pulse, 3) * 0.72;
          const gx = g.xFrac * cw;
          const gy = g.yFrac * ch;
          const sz = g.size * unitScale * (0.7 + pulse * 0.5);
          ctx.fillStyle = `rgba(235, 252, 255, ${a})`;
          ctx.beginPath();
          ctx.ellipse(gx, gy, sz * 1.6, sz * 0.45, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();

        // --------------------------------------------------------------------
        // 4. LEFT FORGE & CENTER FURNACE (smoke, warm flicker glow, embers)
        // --------------------------------------------------------------------
        for (const s of smokePuffs) {
          s.age += dt;
          if (s.age >= s.life) s.age = 0;
          const p = s.age / s.life;
          const alpha = Math.sin(p * Math.PI) * s.maxAlpha * (1 - p * 0.35);
          const sx = (s.originX + s.driftX * p + Math.sin(t * 1.1 + s.wobblePhase) * 0.004) * cw;
          const sy = (s.originY - s.riseY * p) * ch;
          const r = (s.startR + (s.endR - s.startR) * p) * cw;
          const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, r);
          grad.addColorStop(0, `rgba(225, 228, 232, ${alpha})`);
          grad.addColorStop(0.6, `rgba(205, 212, 218, ${alpha * 0.45})`);
          grad.addColorStop(1, 'rgba(205, 212, 218, 0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(sx, sy, r, 0, Math.PI * 2);
          ctx.fill();
        }

        // Soft flickering furnace firelight (additive 'lighter')
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const drawFurnaceGlow = (mxFrac: number, myFrac: number, radiusFrac: number, seed: number) => {
          const flicker = 0.78 + 0.14 * Math.sin(t * 7.2 + seed) + 0.08 * Math.sin(t * 13.7 + seed * 2);
          const gx = mxFrac * cw;
          const gy = myFrac * ch;
          const r = radiusFrac * cw * (0.94 + flicker * 0.08);
          const grad = ctx.createRadialGradient(gx, gy, 0, gx, gy, r);
          grad.addColorStop(0, `rgba(255, 195, 92, ${0.34 * flicker})`);
          grad.addColorStop(0.45, `rgba(245, 128, 38, ${0.18 * flicker})`);
          grad.addColorStop(1, 'rgba(245, 128, 38, 0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(gx, gy, r, 0, Math.PI * 2);
          ctx.fill();
        };
        drawFurnaceGlow(lf.mouthX, lf.mouthY, 0.052, 0.4);
        drawFurnaceGlow(cf.mouthX, cf.mouthY, 0.038, 2.7);

        // Rising tiny orange embers
        for (const e of embers) {
          e.age += dt;
          if (e.age >= e.life) e.age = 0;
          const p = e.age / e.life;
          const ex = (e.originX + e.vx * e.age + Math.sin(t * 4.5 + e.originX * 50) * 0.003) * cw;
          const ey = (e.originY + e.vy * e.age) * ch;
          const alpha = Math.sin(p * Math.PI) * 0.85;
          ctx.fillStyle = `rgba(255, 178, 72, ${alpha})`;
          ctx.beginPath();
          ctx.arc(ex, ey, e.size * unitScale * (1 - p * 0.45), 0, Math.PI * 2);
          ctx.fill();
        }

        // --------------------------------------------------------------------
        // 5. HERB GARDEN & LOWER FORMATION FIREFLIES (8–12 soft gold/jade)
        // --------------------------------------------------------------------
        for (const ff of fireflies) {
          const fx = (ff.baseX + Math.sin(t * ff.freqX + ff.phase) * ff.ampX) * cw;
          const fy = (ff.baseY + Math.cos(t * ff.freqY + ff.phase) * ff.ampY) * ch;
          const twinkle = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 2.6 + ff.twinklePhase));
          const r = ff.size * unitScale * (1.8 + twinkle * 0.9);
          const grad = ctx.createRadialGradient(fx, fy, 0, fx, fy, r);
          grad.addColorStop(0, ff.color === '#FDE68A' ? `rgba(254, 240, 172, ${0.82 * twinkle})` : `rgba(134, 239, 198, ${0.78 * twinkle})`);
          grad.addColorStop(0.45, ff.color === '#FDE68A' ? `rgba(253, 224, 120, ${0.32 * twinkle})` : `rgba(94, 234, 180, ${0.28 * twinkle})`);
          grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(fx, fy, r, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      } else {
        // ====================================================================
        // FOREGROUND ATMOSPHERE LAYER: God Rays + Maple Leaves + Sun Dust
        // ====================================================================

        // 1. DIAGONAL GOD RAYS (upper-left, screen/lighter, slow 7s pulse 0.06..0.13)
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const rayPulse = 0.06 + 0.07 * (0.5 + 0.5 * Math.sin((t * Math.PI * 2) / 7));
        const ox = AMBIENT_ANCHORS.godRays.originX * cw;
        const oy = AMBIENT_ANCHORS.godRays.originY * ch;
        const raySpecs = [
          { angle: 0.44, spread: 0.13, len: 1.15, mult: 1.0 },
          { angle: 0.66, spread: 0.16, len: 1.25, mult: 0.85 },
          { angle: 0.92, spread: 0.11, len: 1.05, mult: 0.72 },
        ];
        for (const r of raySpecs) {
          const length = Math.max(cw, ch) * r.len;
          const x1 = ox + Math.cos(r.angle - r.spread * 0.5) * length;
          const y1 = oy + Math.sin(r.angle - r.spread * 0.5) * length;
          const x2 = ox + Math.cos(r.angle + r.spread * 0.5) * length;
          const y2 = oy + Math.sin(r.angle + r.spread * 0.5) * length;
          const grad = ctx.createLinearGradient(ox, oy, (x1 + x2) * 0.5, (y1 + y2) * 0.5);
          grad.addColorStop(0, `rgba(255, 232, 168, ${rayPulse * r.mult})`);
          grad.addColorStop(0.55, `rgba(255, 222, 142, ${rayPulse * r.mult * 0.48})`);
          grad.addColorStop(1, 'rgba(255, 215, 128, 0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.moveTo(ox, oy);
          ctx.lineTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.closePath();
          ctx.fill();
        }

        // 2. SUN DUST MOTES (~20 soft luminous specks)
        for (const d of dustMotes) {
          d.xFrac += d.vx * dt;
          d.yFrac += d.vy * dt;
          if (d.yFrac < -0.02) {
            d.yFrac = 0.94;
            d.xFrac = rand(0, 1);
          }
          if (d.xFrac > 1.02) d.xFrac = -0.02;
          if (d.xFrac < -0.02) d.xFrac = 1.02;

          const twinkle = 0.45 + 0.55 * Math.sin(t * 2.1 + d.phase);
          const dx = d.xFrac * cw;
          const dy = d.yFrac * ch;
          const r = d.size * unitScale;
          ctx.fillStyle = `rgba(255, 244, 204, ${d.alpha * twinkle})`;
          ctx.beginPath();
          ctx.arc(dx, dy, r, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();

        // 3. AUTUMN MAPLE LEAVES (16 leaves, 2 depth layers, 3D flutter tumble)
        for (const lfItem of leaves) {
          lfItem.xFrac += lfItem.vx * dt;
          lfItem.yFrac += lfItem.vy * dt;
          lfItem.rot += lfItem.vRot * dt;
          if (lfItem.yFrac > 1.05 || lfItem.xFrac > 1.08) {
            if (Math.random() < 0.65) {
              lfItem.xFrac = rand(-0.08, 0.78);
              lfItem.yFrac = -0.05;
            } else {
              lfItem.xFrac = -0.05;
              lfItem.yFrac = rand(-0.05, 0.55);
            }
          }
          const sway = Math.sin(t * lfItem.swayFreq + lfItem.swayPhase) * lfItem.swayAmp;
          const lx = (lfItem.xFrac + sway) * cw;
          const ly = lfItem.yFrac * ch;
          const flipX = 0.28 + 0.72 * Math.abs(Math.cos(t * lfItem.flipSpeed + lfItem.flipPhase));

          ctx.save();
          ctx.translate(lx, ly);
          ctx.rotate(lfItem.rot);
          ctx.scale(flipX, 1);
          ctx.globalAlpha = lfItem.alpha;
          drawMapleLeaf(ctx, lfItem.size * unitScale, lfItem.color);
          ctx.restore();
        }
      }

      ctx.restore();
      rafId = window.requestAnimationFrame(render);
    };

    rafId = window.requestAnimationFrame(render);
    return () => window.cancelAnimationFrame(rafId);
  }, [layer]);

  return (
    <canvas
      ref={canvasRef}
      className={`pointer-events-none absolute inset-0 w-full h-full ${className}`}
    />
  );
};
