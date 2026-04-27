"use client";

import { motion } from "framer-motion";

interface TelemetryProps {
  label: string;
  value: string | number;
  unit?: string;
  color?: string;
}

export default function HudTelemetry({ label, value, unit, color = "var(--hud-cyan)" }: TelemetryProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex flex-col border-l-2 pl-3 py-1"
      style={{ borderColor: color }}
    >
      <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">{label}</span>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-mono font-black" style={{ color }}>{value}</span>
        {unit && <span className="text-xs font-mono text-zinc-400">{unit}</span>}
      </div>
    </motion.div>
  );
}
