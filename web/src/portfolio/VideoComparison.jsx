import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { SectionHeader } from './primitives';

export const VideoComparison = () => {
  const [mode, setMode] = useState('split'); // 'split' | 'swap'
  const [swapView, setSwapView] = useState('high'); // 'low' | 'high'
  const [sliderPos, setSliderPos] = useState(50);
  const [isPlaying, setIsPlaying] = useState(true);
  const [customLowUrl, setCustomLowUrl] = useState(null);
  const [customHighUrl, setCustomHighUrl] = useState(null);
  const isDragging = useRef(false);
  const containerRef = useRef(null);

  const canvasLowRef = useRef(null);
  const canvasHighRef = useRef(null);
  const animFrameRef = useRef(null);
  const timeRef = useRef(0);
  const lastLowDrawTime = useRef(0);

  const lowInputRef = useRef(null);
  const highInputRef = useRef(null);

  const handlePointerDown = (e) => {
    isDragging.current = true;
    updateSlider(e.clientX);
  };

  const updateSlider = useCallback((clientX) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
    setSliderPos((x / rect.width) * 100);
  }, []);

  useEffect(() => {
    const handlePointerMove = (e) => {
      if (isDragging.current) updateSlider(e.clientX);
    };
    const handlePointerUp = () => {
      isDragging.current = false;
    };
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [updateSlider]);

  useEffect(() => {
    let active = true;

    const render = (timestamp) => {
      if (!active) return;
      if (isPlaying) timeRef.current += 0.024;
      const t = timeRef.current;

      // 1. High Quality 60 FPS Fluid Canvas
      const cHigh = canvasHighRef.current;
      if (cHigh && !customHighUrl) {
        const ctx = cHigh.getContext('2d');
        const w = cHigh.width;
        const h = cHigh.height;

        ctx.fillStyle = '#07080a';
        ctx.fillRect(0, 0, w, h);

        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        for (let x = 0; x < w; x += 32) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, h);
          ctx.stroke();
        }
        for (let y = 0; y < h; y += 32) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(w, y);
          ctx.stroke();
        }

        const cx = w / 2;
        const cy = h / 2;
        for (let i = 0; i < 5; i++) {
          const r = 40 + i * 36;
          const angle = t * (i % 2 === 0 ? 1.4 : -1.4) + (i * Math.PI) / 4;
          ctx.beginPath();
          ctx.arc(cx, cy, r, angle, angle + Math.PI * 1.3);
          ctx.strokeStyle = i === 2 ? '#38bdf8' : i === 4 ? '#22c55e' : '#f8fafc';
          ctx.lineWidth = 3;
          ctx.stroke();
        }

        const scanX = cx + Math.sin(t * 2.8) * (w * 0.38);
        const scanY = cy + Math.cos(t * 3.4) * (h * 0.28);
        ctx.beginPath();
        ctx.arc(scanX, scanY, 18, 0, Math.PI * 2);
        ctx.fillStyle = '#38bdf8';
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 24;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // 2. Low Quality 30 FPS Clamped Stutter Canvas
      const cLow = canvasLowRef.current;
      if (cLow && !customLowUrl) {
        if (timestamp - lastLowDrawTime.current >= 33.3) {
          lastLowDrawTime.current = timestamp;
          const ctx = cLow.getContext('2d');
          const w = cLow.width;
          const h = cLow.height;

          ctx.fillStyle = '#101116';
          ctx.fillRect(0, 0, w, h);

          ctx.lineWidth = 2;
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
          for (let x = 0; x < w; x += 48) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, h);
            ctx.stroke();
          }
          for (let y = 0; y < h; y += 48) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
          }

          const cx = w / 2;
          const cy = h / 2;
          for (let i = 0; i < 5; i++) {
            const r = 40 + i * 36;
            const angle = t * (i % 2 === 0 ? 1.4 : -1.4) + (i * Math.PI) / 4;
            ctx.beginPath();
            ctx.arc(cx, cy, r, angle, angle + Math.PI * 1.3);
            ctx.strokeStyle = 'rgba(160, 165, 175, 0.4)';
            ctx.lineWidth = 4;
            ctx.stroke();
          }

          const scanX = cx + Math.sin(t * 2.8) * (w * 0.38);
          const scanY = cy + Math.cos(t * 3.4) * (h * 0.28);
          ctx.beginPath();
          ctx.arc(scanX, scanY, 18, 0, Math.PI * 2);
          ctx.fillStyle = '#64748b';
          ctx.fill();
        }
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      active = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, customHighUrl, customLowUrl]);

  return (
    <section id="compare" className="section-hirael scroll-anchor bg-[hsl(var(--bg))]">
      <div className="container-hirael">
        <SectionHeader
          eyebrow="01 · REALTIME BENCHMARK"
          lead="Motion & Dynamic Range"
          accent="Comparison"
          subtext="Inspect how standard platform ingestion compresses 60fps to 30fps SDR versus Obito Studio's bit-for-bit lossless 19200 output."
          className="mb-6 sm:mb-10"
        />

        {/* The Single Image / Video Area requested by User */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.25, 0.1, 0.25, 1] }}
          viewport={{ once: true, margin: '0px' }}
          className="group relative block overflow-hidden rounded-3xl border border-white/10 bg-[hsl(var(--surface))] p-3.5 sm:p-5 md:p-6 shadow-2xl backdrop-blur-xl mt-6 sm:mt-8"
        >
          {/* Top Control Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-[hsl(var(--stroke))] text-xs">
            <div className="flex items-center gap-2">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400/80" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
              </span>
              <span className="font-mono text-white text-[11px] sm:text-xs uppercase tracking-wider font-semibold">
                Interactive Video Comparison
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="inline-flex items-center p-0.5 rounded-full border border-white/10 bg-black/40">
                <button
                  type="button"
                  onClick={() => setMode('split')}
                  className={`px-3 py-1 rounded-full text-xs transition-all font-medium ${
                    mode === 'split' ? 'bg-white/15 text-white shadow' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Split Wipe
                </button>
                <button
                  type="button"
                  onClick={() => setMode('swap')}
                  className={`px-3 py-1 rounded-full text-xs transition-all font-medium ${
                    mode === 'swap' ? 'bg-white/15 text-white shadow' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Instant A/B
                </button>
              </div>

              <button
                type="button"
                onClick={() => setIsPlaying((p) => !p)}
                className="px-3 py-1 rounded-full border border-[hsl(var(--stroke))] bg-[hsl(var(--bg))] text-xs text-[hsl(var(--muted))] hover:text-[hsl(var(--text))] transition-colors"
              >
                {isPlaying ? 'Pause Motion' : 'Play Motion'}
              </button>

              {/* Upload user real clips */}
              <button
                type="button"
                onClick={() => lowInputRef.current?.click()}
                className="hidden sm:inline-block px-3 py-1.5 rounded-full border border-[hsl(var(--stroke))] text-xs text-[hsl(var(--muted))] hover:text-white"
                title="Upload test clip 1"
              >
                + Clip 1
              </button>
              <input
                type="file"
                accept="video/*"
                ref={lowInputRef}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) setCustomLowUrl(URL.createObjectURL(f));
                }}
                className="hidden"
              />

              <button
                type="button"
                onClick={() => highInputRef.current?.click()}
                className="hidden sm:inline-block px-3 py-1.5 rounded-full border border-[hsl(var(--stroke))] text-xs text-[hsl(var(--muted))] hover:text-white"
                title="Upload test clip 2"
              >
                + Clip 2
              </button>
              <input
                type="file"
                accept="video/*"
                ref={highInputRef}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) setCustomHighUrl(URL.createObjectURL(f));
                }}
                className="hidden"
              />
            </div>
          </div>

          {/* Viewport: Split Slider Mode */}
          {mode === 'split' && (
            <div
              ref={containerRef}
              onPointerDown={handlePointerDown}
              className="relative aspect-[16/10] sm:aspect-[16/9] w-full max-h-[580px] rounded-2xl overflow-hidden cursor-ew-resize select-none bg-black"
            >
              {/* High Quality Layer */}
              <div className="absolute inset-0 size-full">
                {customHighUrl ? (
                  <video src={customHighUrl} autoPlay loop muted playsInline className="size-full object-cover" />
                ) : (
                  <canvas ref={canvasHighRef} width={1280} height={720} className="size-full object-cover" />
                )}
                <div className="absolute top-4 right-4 z-10 px-3.5 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-[11px] text-emerald-400 font-mono font-medium flex items-center gap-2">
                  <span className="size-1.5 rounded-full bg-emerald-400" />
                  Obito Master (4K 60fps HDR)
                </div>
              </div>

              {/* Low Quality Clipped Layer */}
              <div
                className="absolute inset-0 size-full overflow-hidden"
                style={{ clipPath: `polygon(0 0, ${sliderPos}% 0, ${sliderPos}% 100%, 0 100%)` }}
              >
                {customLowUrl ? (
                  <video src={customLowUrl} autoPlay loop muted playsInline className="size-full object-cover" />
                ) : (
                  <canvas ref={canvasLowRef} width={1280} height={720} className="size-full object-cover" />
                )}
                <div className="absolute top-4 left-4 z-10 px-3.5 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-[11px] text-amber-400 font-mono font-medium flex items-center gap-2">
                  <span className="size-1.5 rounded-full bg-amber-400" />
                  Standard TikTok (720p 30fps SDR)
                </div>
              </div>

              {/* Slider Wipe Handle */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-white z-20 shadow-[0_0_12px_rgba(255,255,255,0.7)]"
                style={{ left: `${sliderPos}%` }}
              >
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-9 rounded-full bg-white text-black flex items-center justify-center shadow-lg font-bold text-xs select-none pointer-events-none">
                  ↔
                </div>
              </div>
            </div>
          )}

          {/* Viewport: Instant Swap Mode */}
          {mode === 'swap' && (
            <div className="relative aspect-[16/10] sm:aspect-[16/9] w-full max-h-[580px] rounded-2xl overflow-hidden bg-black flex flex-col justify-between p-6">
              <div className="absolute inset-0 size-full">
                {swapView === 'high' ? (
                  customHighUrl ? (
                    <video src={customHighUrl} autoPlay loop muted playsInline className="size-full object-cover" />
                  ) : (
                    <canvas ref={canvasHighRef} width={1280} height={720} className="size-full object-cover" />
                  )
                ) : (
                  customLowUrl ? (
                    <video src={customLowUrl} autoPlay loop muted playsInline className="size-full object-cover" />
                  ) : (
                    <canvas ref={canvasLowRef} width={1280} height={720} className="size-full object-cover" />
                  )
                )}
              </div>

              <div className="relative z-10 flex justify-between items-center w-full">
                <span
                  className={`px-4 py-2 rounded-full text-xs font-mono font-bold tracking-wider uppercase backdrop-blur-md border ${
                    swapView === 'high'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  }`}
                >
                  {swapView === 'high' ? 'Obito Studio 60fps 4K Master' : 'Standard 30fps Stutter Compression'}
                </span>

                <button
                  type="button"
                  onClick={() => setSwapView((v) => (v === 'high' ? 'low' : 'high'))}
                  className="px-5 py-2.5 rounded-full bg-white text-black font-semibold text-xs tracking-wide shadow-xl hover:scale-105 active:scale-95 transition-all"
                >
                  Click to Swap → {swapView === 'high' ? 'View 30fps Stutter' : 'View 60fps Fluid'}
                </button>
              </div>

              <div className="relative z-10 text-xs font-mono text-white/70 bg-black/70 backdrop-blur-md p-3.5 rounded-xl border border-white/10 max-w-md">
                {swapView === 'high'
                  ? 'Active: 60/120fps native cadence, zero frame drops, BT.2020 peak dynamic range preserved.'
                  : 'Active: Platform 30fps forced downsampling with cadence stutter and desaturated Rec.709 tones.'}
              </div>
            </div>
          )}

          {/* Telemetry Comparison Footnote */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-3 border-t border-[hsl(var(--stroke))]">
            <div className="rounded-xl border border-[hsl(var(--stroke))] bg-[hsl(var(--bg))] p-3.5">
              <span className="text-xs font-semibold text-amber-400 block mb-1">Standard Platform Ingestion</span>
              <p className="text-xs text-[hsl(var(--muted))] leading-relaxed font-mono">
                Clamped to 30 FPS playback clock · Desaturated Rec.709 SDR · Re-encoded lossy compression
              </p>
            </div>
            <div className="rounded-xl border border-[hsl(var(--stroke))] bg-[hsl(var(--bg))] p-3.5">
              <span className="text-xs font-semibold text-emerald-400 block mb-1">Obito Studio Mastered Output</span>
              <p className="text-xs text-[hsl(var(--muted))] leading-relaxed font-mono">
                19200 Base clock locks 60 / 120 FPS · 10-bit HLG Rec.2020 · 100% Bit-for-bit stream copy
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
