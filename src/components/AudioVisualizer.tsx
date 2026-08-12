"use client";

import React, { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
  micAnalyser: AnalyserNode | null;
  aiAnalyser: AnalyserNode | null;
}

export function AudioVisualizer({ micAnalyser, aiAnalyser }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const micBufferLength = micAnalyser ? micAnalyser.frequencyBinCount : 128;
    const aiBufferLength = aiAnalyser ? aiAnalyser.frequencyBinCount : 128;

    const micDataArray = new Uint8Array(micBufferLength);
    const aiDataArray = new Uint8Array(aiBufferLength);

    const draw = () => {
      animationFrameId = requestAnimationFrame(draw);

      ctx.fillStyle = 'rgba(9, 9, 11, 0.2)'; // bg-zinc-950 trailing effect
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (micAnalyser) {
        micAnalyser.getByteFrequencyData(micDataArray);
        drawWave(ctx, micDataArray, canvas.width, canvas.height, 'rgba(6, 182, 212, 1)'); // Cyan for User
      }

      if (aiAnalyser) {
        aiAnalyser.getByteFrequencyData(aiDataArray);
        drawWave(ctx, aiDataArray, canvas.width, canvas.height, 'rgba(139, 92, 246, 1)', true); // Violet for AI
      }
    };

    draw();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [micAnalyser, aiAnalyser]);

  const drawWave = (
    ctx: CanvasRenderingContext2D, 
    dataArray: Uint8Array, 
    width: number, 
    height: number, 
    color: string, 
    isAi: boolean = false
  ) => {
    ctx.lineWidth = 3;
    ctx.strokeStyle = color;
    ctx.beginPath();

    const sliceWidth = width * 1.0 / dataArray.length;
    let x = 0;

    for (let i = 0; i < dataArray.length; i++) {
      const v = dataArray[i] / 255.0; // 0 to 1
      
      let y;
      if (isAi) {
        y = (height / 2) + (v * (height / 2));
      } else {
        y = (height / 2) - (v * (height / 2));
      }

      if (i === 0) {
        ctx.moveTo(x, height / 2);
      } else {
        ctx.lineTo(x, y);
      }

      x += sliceWidth;
    }

    ctx.lineTo(width, height / 2);
    ctx.stroke();
  };

  return (
    <div className="w-full h-32 md:h-48 mx-auto my-4 rounded-none overflow-hidden border border-zinc-800 shadow-2xl bg-zinc-950">
      <canvas 
        ref={canvasRef} 
        width={800} 
        height={200} 
        className="w-full h-full object-cover"
      />
    </div>
  );
}
