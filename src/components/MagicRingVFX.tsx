import React, { useEffect, useRef } from 'react';
import { getVfxRingPreset, VfxRingPreset } from '../data/vfxRings';

export interface MagicRingVFXProps {
  ringId: number; // 1..16
  size?: number;
  rotationSpeed?: number; // multiplier, default 1.0
  bloomIntensity?: number; // 0.5..3.0, default preset.defaultBloom
  uvDistortion?: number; // 0..2.5, default preset.defaultUvDistortion
  particleDensity?: number; // 0..2.0, default preset.defaultParticleDensity
  isometric?: boolean; // tilts ring to lie on simulated floor
  showFloorLight?: boolean;
  renderMode?: 'webgl' | 'canvas2d';
  className?: string;
}

interface SparkParticle {
  angle: number;
  radius: number;
  vRadius: number;
  vAngle: number;
  yOffset: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  color: string;
}

// ---------------------------------------------------------------------------
// WebGL GLSL Shaders: Additive Blending + UV Noise Distortion + HDR Bloom + Dual Layer
// ---------------------------------------------------------------------------

const VERT_SRC = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

const FRAG_SRC = `
precision mediump float;
varying vec2 vUv;

uniform sampler2D uTex;
uniform float uTime;
uniform float uAngleMain;
uniform float uAngleAura;
uniform float uAuraScale;
uniform float uBloom;
uniform float uDistort;
uniform float uFlicker;
uniform float uGroupMode; // 0=smoke_water, 1=cosmic_orbit, 2=rune_circle, 3=lightning_fire

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

vec2 rotateUv(vec2 uv, float angle, float scale) {
  vec2 p = (uv - 0.5) / scale;
  float c = cos(angle);
  float s = sin(angle);
  return vec2(p.x * c - p.y * s, p.x * s + p.y * c) + 0.5;
}

vec3 sampleRing(vec2 uv, float distortAmt, float timeShift) {
  vec2 d = uv - 0.5;
  float r = length(d) * 2.0;
  if (r > 0.995) return vec3(0.0);

  // Smooth UV distortion via scrolling procedural noise
  float n1 = noise(uv * 5.0 + vec2(uTime * 0.65 + timeShift, -uTime * 0.45));
  float n2 = noise(uv * 8.5 - vec2(uTime * 0.5, uTime * 0.72 + timeShift));
  vec2 wave = (vec2(n1, n2) - 0.5) * 0.032 * distortAmt;

  // Smoke/water gets an additional radial wave ripple
  if (uGroupMode < 0.5) {
    wave += vec2(sin(uv.y * 12.0 + uTime * 2.2), cos(uv.x * 12.0 - uTime * 1.9)) * 0.008 * distortAmt;
  }

  vec2 sampleUv = clamp(uv + wave, 0.002, 0.998);
  vec3 col = texture2D(uTex, sampleUv).rgb;

  // Multi-tap HDR Bloom halo around bright energy cores
  float spread = 0.011 + 0.006 * uBloom;
  vec3 bloomTap = (
    texture2D(uTex, clamp(sampleUv + vec2(spread, 0.0), 0.002, 0.998)).rgb +
    texture2D(uTex, clamp(sampleUv - vec2(spread, 0.0), 0.002, 0.998)).rgb +
    texture2D(uTex, clamp(sampleUv + vec2(0.0, spread), 0.002, 0.998)).rgb +
    texture2D(uTex, clamp(sampleUv - vec2(0.0, spread), 0.002, 0.998)).rgb +
    texture2D(uTex, clamp(sampleUv + vec2(spread * 0.7, spread * 0.7), 0.002, 0.998)).rgb +
    texture2D(uTex, clamp(sampleUv + vec2(-spread * 0.7, spread * 0.7), 0.002, 0.998)).rgb +
    texture2D(uTex, clamp(sampleUv + vec2(spread * 0.7, -spread * 0.7), 0.002, 0.998)).rgb +
    texture2D(uTex, clamp(sampleUv + vec2(-spread * 0.7, -spread * 0.7), 0.002, 0.998)).rgb
  ) * 0.125;

  // Radial smoothstep clip to guarantee zero square corners
  float mask = 1.0 - smoothstep(0.90, 0.99, r);
  return (col + bloomTap * (0.48 * uBloom)) * mask;
}

void main() {
  // Primary layer
  vec2 uvMain = rotateUv(vUv, uAngleMain, 0.90);
  vec3 mainCol = sampleRing(uvMain, uDistort, 0.0);

  // Secondary counter-rotating aura layer (1.1x scale, softer opacity, pulsing)
  vec2 uvAura = rotateUv(vUv, uAngleAura, 0.90 * uAuraScale);
  vec3 auraCol = sampleRing(uvAura, uDistort * 1.35, 3.7) * 0.42;

  // Combine with HDR Emissive Intensity & flicker modulation
  vec3 hdr = (mainCol + auraCol) * (0.72 + 0.55 * uBloom) * uFlicker;

  // Soft ACES-like shoulder compression so high bloom glows vividly without harsh flat clipping
  vec3 finalCol = hdr / (1.0 + hdr * 0.28);
  float alpha = clamp(max(finalCol.r, max(finalCol.g, finalCol.b)) * 1.15, 0.0, 1.0);
  gl_FragColor = vec4(finalCol, alpha);
}
`;

// Shared image cache so all 16 rings load once
const ringImageCache = new Map<string, HTMLImageElement>();

function getRingImage(url: string): HTMLImageElement {
  let img = ringImageCache.get(url);
  if (!img) {
    img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = url;
    ringImageCache.set(url, img);
  }
  return img;
}

function compileShader(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
  const sh = gl.createShader(type);
  if (!sh) return null;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    gl.deleteShader(sh);
    return null;
  }
  return sh;
}

function createProgram(gl: WebGLRenderingContext): WebGLProgram | null {
  const vs = compileShader(gl, gl.VERTEX_SHADER, VERT_SRC);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAG_SRC);
  if (!vs || !fs) return null;
  const prog = gl.createProgram();
  if (!prog) return null;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    gl.deleteProgram(prog);
    return null;
  }
  return prog;
}

function groupToMode(group: VfxRingPreset['group']): number {
  if (group === 'smoke_water') return 0;
  if (group === 'cosmic_orbit') return 1;
  if (group === 'rune_circle') return 2;
  return 3;
}

function spawnParticle(preset: VfxRingPreset, maxR: number): SparkParticle {
  const angle = Math.random() * Math.PI * 2;
  const isLightning = preset.group === 'lightning_fire';
  const isOrbit = preset.group === 'cosmic_orbit';
  const baseR = maxR * (0.28 + Math.random() * 0.56);

  return {
    angle,
    radius: baseR,
    vRadius: isLightning ? 22 + Math.random() * 44 : isOrbit ? (Math.random() - 0.5) * 6 : (Math.random() - 0.5) * 10,
    vAngle: isOrbit ? 0.9 + Math.random() * 1.4 : isLightning ? (Math.random() - 0.5) * 2.4 : 0.35 + Math.random() * 0.5,
    yOffset: 0,
    vy: isLightning ? -(10 + Math.random() * 24) : -(14 + Math.random() * 26),
    size: isOrbit ? 1.6 + Math.random() * 2.2 : isLightning ? 1.4 + Math.random() * 2.0 : 1.5 + Math.random() * 2.4,
    life: 0,
    maxLife: isLightning ? 0.38 + Math.random() * 0.35 : 0.9 + Math.random() * 0.9,
    color: Math.random() < 0.55 ? preset.secondaryColor : preset.primaryColor,
  };
}

export const MagicRingVFX: React.FC<MagicRingVFXProps> = ({
  ringId,
  size = 240,
  rotationSpeed = 1,
  bloomIntensity,
  uvDistortion,
  particleDensity,
  isometric = false,
  showFloorLight = true,
  renderMode = 'webgl',
  className = '',
}) => {
  const preset = getVfxRingPreset(ringId);
  const effBloom = bloomIntensity ?? preset.defaultBloom;
  const effUv = uvDistortion ?? preset.defaultUvDistortion;
  const effParticles = particleDensity ?? preset.defaultParticleDensity;

  const glCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const particleCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const floorLightRef = useRef<HTMLDivElement | null>(null);

  const propsRef = useRef({
    preset,
    rotationSpeed,
    effBloom,
    effUv,
    effParticles,
    isometric,
    size,
  });
  propsRef.current = { preset, rotationSpeed, effBloom, effUv, effParticles, isometric, size };

  useEffect(() => {
    const ringCanvas = glCanvasRef.current;
    const pCanvas = particleCanvasRef.current;
    if (!ringCanvas || !pCanvas) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const pxSize = Math.round(size * dpr);
    ringCanvas.width = pxSize;
    ringCanvas.height = pxSize;
    pCanvas.width = pxSize;
    pCanvas.height = pxSize;

    // Attempt WebGL when requested, fallback cleanly to Canvas2D
    let gl: WebGLRenderingContext | null = null;
    let program: WebGLProgram | null = null;
    let texture: WebGLTexture | null = null;
    let uniforms: Record<string, WebGLUniformLocation | null> = {};

    if (renderMode === 'webgl') {
      gl = ringCanvas.getContext('webgl', { alpha: true, premultipliedAlpha: false, antialias: true });
      if (gl) {
        program = createProgram(gl);
        if (program) {
          gl.useProgram(program);
          const buf = gl.createBuffer();
          gl.bindBuffer(gl.ARRAY_BUFFER, buf);
          gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
          const aPos = gl.getAttribLocation(program, 'aPos');
          gl.enableVertexAttribArray(aPos);
          gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

          texture = gl.createTexture();
          gl.bindTexture(gl.TEXTURE_2D, texture);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
          // 1x1 black placeholder until image loads
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));

          uniforms = {
            uTex: gl.getUniformLocation(program, 'uTex'),
            uTime: gl.getUniformLocation(program, 'uTime'),
            uAngleMain: gl.getUniformLocation(program, 'uAngleMain'),
            uAngleAura: gl.getUniformLocation(program, 'uAngleAura'),
            uAuraScale: gl.getUniformLocation(program, 'uAuraScale'),
            uBloom: gl.getUniformLocation(program, 'uBloom'),
            uDistort: gl.getUniformLocation(program, 'uDistort'),
            uFlicker: gl.getUniformLocation(program, 'uFlicker'),
            uGroupMode: gl.getUniformLocation(program, 'uGroupMode'),
          };
        } else {
          gl = null;
        }
      }
    }

    const ctx2d = !gl ? ringCanvas.getContext('2d') : null;
    const pCtx = pCanvas.getContext('2d');

    const img = getRingImage(gl ? preset.additiveUrl : preset.transparentUrl);
    let texUploaded = false;

    const uploadIfReady = () => {
      if (texUploaded || !img.complete || img.naturalWidth === 0) return;
      if (gl && texture) {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      }
      texUploaded = true;
    };
    uploadIfReady();

    const particles: SparkParticle[] = [];
    let rafId = 0;
    let lastTs = performance.now();
    let elapsed = 0;
    let angleMain = Math.random() * Math.PI * 2;
    let angleAura = -angleMain;
    let lightningTimer = 0;
    let lightningFlicker = 1.0;

    const tick = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTs) / 1000));
      lastTs = now;
      elapsed += dt;

      const cur = propsRef.current;
      const baseSpeed = cur.preset.defaultSpeed * cur.rotationSpeed;
      uploadIfReady();

      // Group-specific motion kinetics
      let auraScale = 1.1 + Math.sin(elapsed * 2.2) * 0.035;
      let flicker = 1.0;

      if (cur.preset.group === 'lightning_fire') {
        lightningTimer += dt;
        const snapInterval = 0.055 + (cur.preset.id % 3) * 0.018;
        if (lightningTimer >= snapInterval) {
          lightningTimer = 0;
          if (cur.rotationSpeed > 0.01) {
            // Jerky angular snap + random flicker every 0.05-0.1s
            angleMain += (Math.random() < 0.5 ? 1 : -1) * (0.22 + Math.random() * 0.55) * Math.min(2, cur.rotationSpeed);
            angleAura -= (0.14 + Math.random() * 0.35) * Math.min(2, cur.rotationSpeed);
          }
          lightningFlicker = 0.78 + Math.random() * 0.45;
        }
        flicker = lightningFlicker;
        auraScale = 1.12 + Math.sin(elapsed * 8.0) * 0.05;
      } else if (cur.preset.group === 'rune_circle') {
        angleMain += dt * baseSpeed * 0.55;
        angleAura -= dt * baseSpeed * 0.78;
        auraScale = 1.1 + Math.sin(elapsed * 1.8) * 0.045;
        flicker = 0.93 + Math.sin(elapsed * 2.4) * 0.09;
      } else if (cur.preset.group === 'cosmic_orbit') {
        angleMain += dt * baseSpeed * 0.95;
        angleAura -= dt * baseSpeed * 0.62;
        auraScale = 1.09 + Math.sin(elapsed * 2.6) * 0.035;
        flicker = 0.96 + Math.sin(elapsed * 3.5) * 0.06;
      } else {
        // smoke_water
        angleMain += dt * baseSpeed * 0.65;
        angleAura -= dt * baseSpeed * 0.42;
        auraScale = 1.11 + Math.sin(elapsed * 1.6) * 0.04;
        flicker = 0.94 + Math.sin(elapsed * 1.9) * 0.07;
      }

      // Render ring layer
      if (gl && program) {
        gl.viewport(0, 0, pxSize, pxSize);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

        gl.useProgram(program);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.uniform1i(uniforms.uTex, 0);
        gl.uniform1f(uniforms.uTime, elapsed);
        gl.uniform1f(uniforms.uAngleMain, angleMain);
        gl.uniform1f(uniforms.uAngleAura, angleAura);
        gl.uniform1f(uniforms.uAuraScale, auraScale);
        gl.uniform1f(uniforms.uBloom, cur.effBloom);
        gl.uniform1f(uniforms.uDistort, cur.effUv);
        gl.uniform1f(uniforms.uFlicker, flicker);
        gl.uniform1f(uniforms.uGroupMode, groupToMode(cur.preset.group));
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      } else if (ctx2d && img.complete && img.naturalWidth > 0) {
        ctx2d.clearRect(0, 0, pxSize, pxSize);
        ctx2d.save();
        ctx2d.globalCompositeOperation = 'lighter';
        const cx = pxSize / 2;
        const cy = pxSize / 2;
        const baseDraw = pxSize * 0.88;

        // Subtle UV-like wobble on 2D fallback
        const wobbleX = Math.sin(elapsed * 2.6) * cur.effUv * 1.8 * dpr;
        const wobbleY = Math.cos(elapsed * 2.1) * cur.effUv * 1.8 * dpr;

        // Secondary counter-rotating aura (1.1x scale, blurred glow)
        ctx2d.save();
        ctx2d.translate(cx + wobbleX, cy + wobbleY);
        ctx2d.rotate(angleAura);
        ctx2d.globalAlpha = Math.min(0.85, 0.34 * cur.effBloom * flicker);
        const auraDraw = baseDraw * auraScale;
        ctx2d.drawImage(img, -auraDraw / 2, -auraDraw / 2, auraDraw, auraDraw);
        ctx2d.restore();

        // Main primary layer + HDR bloom double pass
        ctx2d.save();
        ctx2d.translate(cx, cy);
        ctx2d.rotate(angleMain);
        ctx2d.globalAlpha = Math.min(1, 0.85 * flicker);
        ctx2d.drawImage(img, -baseDraw / 2, -baseDraw / 2, baseDraw, baseDraw);
        if (cur.effBloom > 1.1) {
          ctx2d.globalAlpha = Math.min(0.9, (cur.effBloom - 0.85) * 0.45 * flicker);
          ctx2d.drawImage(img, -baseDraw * 0.515, -baseDraw * 0.515, baseDraw * 1.03, baseDraw * 1.03);
        }
        ctx2d.restore();
        ctx2d.restore();
      }

      // Render multi-layer floating particles / sparkles
      if (pCtx) {
        pCtx.clearRect(0, 0, pxSize, pxSize);
        const cx = pxSize / 2;
        const cy = pxSize / 2;
        const maxR = pxSize * 0.44;
        const spawnRate = (cur.preset.group === 'cosmic_orbit' ? 24 : cur.preset.group === 'lightning_fire' ? 28 : 14) * cur.effParticles;

        if (particles.length < 75 && Math.random() < dt * spawnRate) {
          particles.push(spawnParticle(cur.preset, maxR));
        }

        pCtx.save();
        pCtx.globalCompositeOperation = 'lighter';
        for (let i = particles.length - 1; i >= 0; i--) {
          const p = particles[i];
          p.life += dt;
          if (p.life >= p.maxLife) {
            particles.splice(i, 1);
            continue;
          }
          p.angle += p.vAngle * dt * Math.max(0.25, cur.rotationSpeed);
          p.radius += p.vRadius * dt * dpr;
          p.yOffset += p.vy * dt * dpr;

          const t = p.life / p.maxLife;
          const fade = Math.sin(t * Math.PI);
          const px = cx + Math.cos(p.angle) * p.radius;
          const py = cy + Math.sin(p.angle) * p.radius * (cur.isometric ? 0.46 : 1.0) + p.yOffset;
          const rad = p.size * dpr * (0.65 + 0.55 * fade);

          pCtx.globalAlpha = Math.min(1, fade * 0.92 * flicker);
          pCtx.fillStyle = p.color;
          pCtx.beginPath();
          pCtx.arc(px, py, rad, 0, Math.PI * 2);
          pCtx.fill();

          // Crisp star glint on larger cosmic/rune particles
          if (rad > 2.2 * dpr) {
            pCtx.strokeStyle = '#FFFFFF';
            pCtx.lineWidth = 0.8 * dpr;
            pCtx.globalAlpha = fade * 0.65;
            pCtx.beginPath();
            pCtx.moveTo(px - rad * 2.1, py);
            pCtx.lineTo(px + rad * 2.1, py);
            pCtx.moveTo(px, py - rad * 2.1);
            pCtx.lineTo(px, py + rad * 2.1);
            pCtx.stroke();
          }
        }
        pCtx.restore();
      }

      // Pulse ambient floor light
      if (floorLightRef.current) {
        const pulseOpacity = Math.min(0.95, (0.34 + 0.22 * cur.effBloom) * flicker);
        floorLightRef.current.style.opacity = pulseOpacity.toFixed(3);
      }

      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => {
      window.cancelAnimationFrame(rafId);
      if (gl && texture) gl.deleteTexture(texture);
      if (gl && program) gl.deleteProgram(program);
    };
  }, [preset.id, preset.additiveUrl, size, renderMode]);

  return (
    <div
      className={`relative select-none pointer-events-none ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Ambient PointLight / Radial Floor Reflection */}
      {showFloorLight && (
        <div
          ref={floorLightRef}
          className="absolute inset-0 rounded-full transition-opacity duration-75"
          style={{
            background: `radial-gradient(circle, ${preset.secondaryColor}44 0%, ${preset.primaryColor}38 42%, transparent 72%)`,
            transform: isometric ? 'scale(1.18, 0.54) translateY(8%)' : 'scale(1.12)',
            filter: `blur(${Math.round(size * 0.08)}px)`,
          }}
        />
      )}

      {/* Primary + Secondary Counter-Rotating Shader Ring (Additive Blending) */}
      <canvas
        ref={glCanvasRef}
        className="absolute inset-0 w-full h-full mix-blend-screen"
        style={{
          transform: isometric ? 'scaleY(0.46)' : undefined,
          filter: `drop-shadow(0 0 ${Math.round(8 * effBloom)}px ${preset.glowRgba})`,
        }}
      />

      {/* Floating Sparkles & Orbiting Energy Particles */}
      <canvas ref={particleCanvasRef} className="absolute inset-0 w-full h-full mix-blend-screen" />
    </div>
  );
};
