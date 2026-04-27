import React, { useRef, useEffect, useCallback } from 'react';

interface WaveformCanvasProps {
  waveData: Float32Array | null;
  liveData: Uint8Array | null;
  progress: number;
  accentColor?: string;
}

export default function WaveformCanvas({
  waveData, liveData, progress, accentColor = '#c8f561',
}: WaveformCanvasProps): React.ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const draw = useCallback((): void => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx  = canvas.getContext('2d');
    if (!ctx) return;
    const W   = canvas.width;
    const H   = canvas.height;
    const dpr = window.devicePixelRatio || 1;

    ctx.clearRect(0, 0, W, H);

    if (waveData && waveData.length > 0) {
      const played = Math.floor(waveData.length * progress);
      const barW   = W / waveData.length;
      for (let i = 0; i < waveData.length; i++) {
        const amp  = waveData[i] ?? 0;
        const h    = Math.max(1, amp * H * 0.85);
        ctx.fillStyle = i < played ? `${accentColor}d8` : `${accentColor}2e`;
        ctx.fillRect(i * barW, (H - h) / 2, Math.max(1, barW - 0.5), h);
      }
    }

    if (liveData && liveData.length > 0) {
      ctx.strokeStyle = 'rgba(97,245,200,0.85)';
      ctx.lineWidth   = 1.5 * dpr;
      ctx.beginPath();
      const sliceW = W / liveData.length;
      let x = 0;
      for (let i = 0; i < liveData.length; i++) {
        const v = ((liveData[i] ?? 128) / 128.0) * (H / 2);
        if (i === 0) ctx.moveTo(x, v); else ctx.lineTo(x, v);
        x += sliceW;
      }
      ctx.stroke();
    }

    if (progress > 0) {
      const px = progress * W;
      ctx.strokeStyle = '#f561c8';
      ctx.lineWidth   = 1.5 * dpr;
      ctx.beginPath();
      ctx.moveTo(px, 0); ctx.lineTo(px, H);
      ctx.stroke();
      ctx.fillStyle = '#f561c8';
      ctx.beginPath();
      ctx.arc(px, H / 2, 3 * dpr, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [waveData, liveData, progress, accentColor]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr    = window.devicePixelRatio || 1;
    const resize = (): void => {
      canvas.width  = canvas.offsetWidth  * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      draw();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [draw]);

  useEffect(() => { draw(); }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width:'100%', height:100, display:'block', borderRadius:6, background:'var(--surface)', border:'0.5px solid var(--border)' }}
    />
  );
}
