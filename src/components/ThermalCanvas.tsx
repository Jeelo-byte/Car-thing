"use client";

import { useEffect, useRef } from "react";
import { ThermalGrid, getIronbowColor, getHeatmapColor, getCustomColor } from "@/lib/thermalUtils";

interface ThermalCanvasProps {
  grid: ThermalGrid;
  minTemp: number;
  maxTemp: number;
  width?: number;
  height?: number;
  opacity?: number;
  palette?: "ironbow" | "heatmap" | "custom";
  customColors?: { start: string; mid: string; end: string };
}

export default function ThermalCanvas({
  grid,
  minTemp,
  maxTemp,
  width = 320,
  height = 320,
  opacity = 1,
  palette = "ironbow",
  customColors,
}: ThermalCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let animationFrameId: number;

    const draw = () => {
      const canvas = canvasRef.current;
      if (!canvas || !grid || grid.length < 8) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.clearRect(0, 0, 8, 8);

      for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
          const val = grid[y][x];
          const color = palette === "custom" && customColors
            ? getCustomColor(val, minTemp, maxTemp, customColors.start, customColors.mid, customColors.end)
            : palette === "ironbow" 
            ? getIronbowColor(val, minTemp, maxTemp)
            : getHeatmapColor(val, minTemp, maxTemp);
          ctx.fillStyle = color;
          ctx.fillRect(x, y, 1, 1);
        }
      }
    };

    animationFrameId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animationFrameId);
  }, [grid, minTemp, maxTemp, palette, customColors]);

  return (
    <div style={{ width, height, position: "relative" }}>
      <canvas
        ref={canvasRef}
        width={8}
        height={8}
        className="rounded-lg shadow-lg w-full h-full"
        style={{ 
          opacity, 
          mixBlendMode: opacity < 1 ? "screen" : "normal",
          imageRendering: "auto"
        }}
      />
    </div>
  );
}
