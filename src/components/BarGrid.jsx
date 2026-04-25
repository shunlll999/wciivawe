import React, { useRef, useEffect, useCallback } from 'react';

export default function BarGrid({ duration, bpm, timeSig, progress, onBarInfo }) {
  const canvasRef = useRef(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    const dpr = window.devicePixelRatio || 1;

    ctx.clearRect(0, 0, W, H);
    if (!duration) return;

    const beatsPerBar = timeSig.beats;
    const secPerBeat = 60 / bpm;
    const secPerBar = secPerBeat * beatsPerBar;
    const totalBars = Math.ceil(duration / secPerBar);
    const barW = W / totalBars;
    const currentTime = progress * duration;
    const currentBar = Math.floor(currentTime / secPerBar);
    const currentBeat = Math.floor((currentTime % secPerBar) / secPerBeat);

    if (onBarInfo) {
      onBarInfo({ currentBar: currentBar + 1, totalBars, currentBeat: currentBeat + 1 });
    }

    for (let b = 0; b < totalBars; b++) {
      const x = b * barW;
      const isCurrent = b === currentBar;
      const isPast = b < currentBar;

      // Bar background
      ctx.fillStyle = isCurrent
        ? 'rgba(200,245,97,0.12)'
        : isPast
        ? 'rgba(200,245,97,0.04)'
        : 'transparent';
      ctx.fillRect(x + 0.5, 0, barW - 1, H);

      // Bar line
      ctx.strokeStyle = isCurrent ? 'rgba(200,245,97,0.85)' : 'rgba(200,245,97,0.22)';
      ctx.lineWidth = isCurrent ? 1.5 * dpr : 0.5 * dpr;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();

      // Beat subdivisions
      for (let beat = 1; beat < beatsPerBar; beat++) {
        const bx = x + (beat / beatsPerBar) * barW;
        const isCurrentBeat = isCurrent && beat === currentBeat;
        ctx.strokeStyle = isCurrentBeat ? 'rgba(97,245,200,0.5)' : 'rgba(97,245,200,0.18)';
        ctx.lineWidth = 0.5 * dpr;
        ctx.setLineDash([2, 3]);
        ctx.beginPath();
        ctx.moveTo(bx, H * 0.25);
        ctx.lineTo(bx, H * 0.75);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Beat indicator block
      if (isCurrent) {
        const beatFrac = (currentTime % secPerBar) / secPerBar;
        const beatX = x + beatFrac * barW;
        const beatBlockW = Math.max(2, (barW / beatsPerBar) * 0.7);
        ctx.fillStyle = 'rgba(245,97,200,0.75)';
        ctx.beginPath();
        ctx.roundRect
          ? ctx.roundRect(beatX - beatBlockW / 2, H * 0.15, beatBlockW, H * 0.7, 2)
          : ctx.rect(beatX - beatBlockW / 2, H * 0.15, beatBlockW, H * 0.7);
        ctx.fill();
      }

      // Bar numbers
      if (barW > 18 && totalBars <= 48) {
        ctx.fillStyle = isCurrent ? 'rgba(200,245,97,0.9)' : 'rgba(200,245,97,0.28)';
        ctx.font = `${Math.max(7, 8) * dpr}px 'Space Mono', monospace`;
        ctx.fillText(b + 1, x + 3, H - 5 * dpr);
      }
    }

    // End bar line
    ctx.strokeStyle = 'rgba(200,245,97,0.22)';
    ctx.lineWidth = 0.5 * dpr;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(W - 0.5, 0);
    ctx.lineTo(W - 0.5, H);
    ctx.stroke();
  }, [duration, bpm, timeSig, progress, onBarInfo]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const resize = () => {
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      draw();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [draw]);

  useEffect(() => {
    draw();
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: '100%',
        height: '60px',
        display: 'block',
        borderRadius: '6px',
        background: 'var(--surface)',
        border: '0.5px solid var(--border)',
      }}
    />
  );
}
