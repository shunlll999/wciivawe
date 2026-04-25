import React, { useRef, useEffect, useCallback } from 'react';

const ACCENT = '#c8f561';
const ACCENT2 = '#61f5c8';
const ACCENT3 = '#f561c8';

export default function WaveformCanvas({ waveData, liveData, progress }) {
  const canvasRef = useRef(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    const dpr = window.devicePixelRatio || 1;

    ctx.clearRect(0, 0, W, H);

    // Draw static waveform
    if (waveData && waveData.length > 0) {
      const played = Math.floor(waveData.length * progress);
      const barW = W / waveData.length;
      for (let i = 0; i < waveData.length; i++) {
        const x = i * barW;
        const amp = waveData[i];
        const h = Math.max(1, amp * H * 0.85);
        ctx.fillStyle = i < played ? 'rgba(200,245,97,0.85)' : 'rgba(200,245,97,0.18)';
        ctx.fillRect(x, (H - h) / 2, Math.max(1, barW - 0.5), h);
      }
    }

    // Draw live waveform overlay
    if (liveData && liveData.length > 0) {
      ctx.strokeStyle = 'rgba(97,245,200,0.85)';
      ctx.lineWidth = 1.5 * dpr;
      ctx.beginPath();
      const sliceW = W / liveData.length;
      let x = 0;
      for (let i = 0; i < liveData.length; i++) {
        const v = (liveData[i] / 128.0) * (H / 2);
        if (i === 0) ctx.moveTo(x, v);
        else ctx.lineTo(x, v);
        x += sliceW;
      }
      ctx.stroke();
    }

    // Draw playhead
    if (progress > 0) {
      const px = progress * W;
      ctx.strokeStyle = ACCENT3;
      ctx.lineWidth = 1.5 * dpr;
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, H);
      ctx.stroke();

      // Glow dot at playhead center
      ctx.fillStyle = ACCENT3;
      ctx.beginPath();
      ctx.arc(px, H / 2, 3 * dpr, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [waveData, liveData, progress]);

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
        height: '100px',
        display: 'block',
        borderRadius: '6px',
        background: 'var(--surface)',
        border: '0.5px solid var(--border)',
      }}
    />
  );
}
