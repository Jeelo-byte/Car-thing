"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Thermometer, Radio, Settings, AlertTriangle, Play, Pause, RefreshCw, Layers } from "lucide-react";
import { useWebSerial } from "@/hooks/useWebSerial";
import { useCamera } from "@/hooks/useCamera";
import { parseThermalData, ThermalGrid } from "@/lib/thermalUtils";
import ThermalCanvas from "@/components/ThermalCanvas";
import HudTelemetry from "@/components/HudTelemetry";

export default function Dashboard() {
  const { connected: serialConnected, latestData, connect: connectSerial, disconnect: disconnectSerial, error: serialError } = useWebSerial();
  const { videoRef, start: startCamera, stop: stopCamera, devices, getDevices, stream, error: cameraError } = useCamera();

  const bootSystem = async () => {
    await startCamera();
    await connectSerial();
  };

  const [simulated, setSimulated] = useState(false);
  const [thermalGrid, setThermalGrid] = useState<ThermalGrid>([]);
  const [minThreshold, setMinThreshold] = useState(10);
  const [maxThreshold, setMaxThreshold] = useState(30);
  const [overlayOpacity, setOverlayOpacity] = useState(0.5);
  const [showConfig, setShowConfig] = useState(false);
  const [palette, setPalette] = useState<"ironbow" | "heatmap">("ironbow");
  const [viewMode, setViewMode] = useState<"overlay" | "split" | "thermal" | "camera">("overlay");
  const [autoSwitch, setAutoSwitch] = useState(false);
  const [brightness, setBrightness] = useState(100);
  const [mounted, setMounted] = useState(false);
  
  // Calibration
  const [thermalScale, setThermalScale] = useState(1.5);
  const [thermalX, setThermalX] = useState(0);
  const [thermalY, setThermalY] = useState(0);

  // Stats calculation
  const stats = useMemo(() => {
    if (!thermalGrid || thermalGrid.length === 0) return { min: "0.0", max: "0.0", avg: "0.0" };
    const flat = thermalGrid.flat();
    return {
      min: Math.min(...flat).toFixed(1),
      max: Math.max(...flat).toFixed(1),
      avg: (flat.reduce((a, b) => a + b, 0) / flat.length).toFixed(1),
    };
  }, [thermalGrid]);

  // Handle thermal data parsing
  useEffect(() => {
    if (simulated) {
      const interval = setInterval(() => {
        const mockGrid: ThermalGrid = [];
        for (let y = 0; y < 8; y++) {
          mockGrid.push(Array.from({ length: 8 }, () => 20 + Math.random() * 20));
        }
        setThermalGrid(mockGrid);
      }, 100);
      return () => clearInterval(interval);
    } else if (latestData) {
      setThermalGrid(parseThermalData(latestData));
    }
  }, [latestData, simulated]);

  useEffect(() => {
    setMounted(true);
    getDevices();
  }, [getDevices]);

  // Ensure camera stream is attached to the video element when switching views
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, viewMode]);

  // Brightness detection for Auto-Switch
  useEffect(() => {
    if (!autoSwitch || !stream || !videoRef.current) return;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const interval = setInterval(() => {
      if (videoRef.current && ctx) {
        canvas.width = 10; // Low res for speed
        canvas.height = 10;
        ctx.drawImage(videoRef.current, 0, 0, 10, 10);
        const data = ctx.getImageData(0, 0, 10, 10).data;
        let total = 0;
        for (let i = 0; i < data.length; i += 4) {
          total += (data[i] + data[i+1] + data[i+2]) / 3;
        }
        const avg = total / (data.length / 4);
        setBrightness(avg);

        // Logic: If dark, switch to Thermal Overlay
        if (avg < 50 && viewMode === "camera") {
           setViewMode("overlay");
        } else if (avg > 150 && viewMode !== "camera") {
           // If bright, switch to Camera Only
           setViewMode("camera");
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [autoSwitch, stream, viewMode]);

  if (!mounted) return <div className="h-screen w-screen bg-black" />;

  return (
    <main className="h-screen w-screen bg-black text-white p-4 font-sans select-none overflow-hidden flex flex-col">
      {/* HUD Header */}
      <header className="flex justify-between items-start z-20">
        <div className="space-y-1">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl font-black italic tracking-tighter text-hud-cyan flex items-center gap-2"
          >
            VISION<span className="text-white">GUARD</span>
            <div className="h-2 w-2 rounded-full bg-hud-cyan animate-pulse" />
          </motion.h1>
          <div className="flex gap-4">
            <HudTelemetry label="SYSTEM STATUS" value={serialConnected || simulated ? "ACTIVE" : "STANDBY"} color={serialConnected || simulated ? "var(--hud-cyan)" : "#555"} />
            <HudTelemetry label="THERMAL LOAD" value={stats.max} unit="°C" color={parseFloat(stats.max) > 38 ? "var(--hud-red)" : "var(--hud-orange)"} />
            <HudTelemetry label="AMBIENT" value={stats.avg} unit="°C" />
          </div>
        </div>

        <div className="flex gap-2">
          <button 
            onClick={() => setSimulated(!simulated)}
            className={`p-3 rounded-full border transition-all ${simulated ? 'bg-hud-orange border-hud-orange text-black' : 'border-zinc-800 text-zinc-500'}`}
          >
            <RefreshCw size={20} className={simulated ? "animate-spin-slow" : ""} />
          </button>
          <button 
            onClick={() => setShowConfig(!showConfig)}
            className={`p-3 rounded-full border transition-all ${showConfig ? 'bg-white text-black border-white' : 'border-zinc-800 text-zinc-500'}`}
          >
            <Settings size={20} />
          </button>
        </div>
      </header>

      {/* Main Viewport */}
      <div className="flex-1 relative mt-4 rounded-3xl overflow-hidden border border-zinc-800 bg-zinc-950">
        
        {viewMode === 'split' ? (
          <div className="absolute inset-0 flex flex-row">
            {/* Split Camera */}
            <div className="w-1/2 h-full border-r border-zinc-900 relative overflow-hidden flex items-center justify-center">
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                className="w-full h-full object-cover grayscale contrast-125"
              />
            </div>
            {/* Split Thermal */}
            <div className="w-1/2 h-full relative overflow-hidden bg-black flex items-center justify-center">
               <ThermalCanvas 
                  grid={thermalGrid} 
                  minTemp={minThreshold} 
                  maxTemp={maxThreshold} 
                  opacity={1}
                  width={800}
                  height={600}
                  palette={palette}
               />
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            {/* Solo/Overlay Camera */}
            {(viewMode === 'camera' || viewMode === 'overlay') && (
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                className={`absolute inset-0 w-full h-full object-cover grayscale contrast-125 transition-opacity ${viewMode === 'camera' ? 'opacity-100' : 'opacity-80'}`}
              />
            )}

            {/* Solo/Overlay Thermal */}
            {(viewMode === 'thermal' || viewMode === 'overlay') && (
              <div 
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
                style={viewMode === 'overlay' ? {
                  transform: `scale(${thermalScale}) translate(${thermalX}px, ${thermalY}px)`,
                  pointerEvents: 'none'
                } : {
                  pointerEvents: 'auto'
                }}
              >
                <ThermalCanvas 
                  grid={thermalGrid} 
                  minTemp={minThreshold} 
                  maxTemp={maxThreshold} 
                  opacity={viewMode === 'overlay' ? overlayOpacity : 1}
                  width={1280}
                  height={720}
                  palette={palette}
                />
              </div>
            )}
          </div>
        )}

        {/* HUD Crosshair & Overlays */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
          <div className="w-64 h-64 border border-hud-cyan/20 rounded-full flex items-center justify-center">
             <div className="w-1 h-8 bg-hud-cyan/40 absolute" />
             <div className="h-1 w-8 bg-hud-cyan/40 absolute" />
          </div>
          
          {/* Warning Message */}
          <AnimatePresence>
            {parseFloat(stats.max) > 38 && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="absolute top-1/4 bg-hud-red/20 backdrop-blur-md border border-hud-red px-6 py-2 rounded-full flex items-center gap-2 text-hud-red font-bold animate-pulse"
              >
                <AlertTriangle size={18} />
                THERMAL ALERT: HIGH TEMPERATURE DETECTED
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Connection Overlay */}
        {(!stream && !serialConnected && !simulated) && (
          <div className="absolute inset-0 backdrop-blur-xl bg-black/60 flex flex-col items-center justify-center z-10">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center space-y-6"
            >
              <div className="flex gap-4 justify-center">
                <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500">
                  <Camera size={32} />
                </div>
                <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500">
                  <Thermometer size={32} />
                </div>
              </div>
              <h2 className="text-xl font-bold italic tracking-tighter">HARDWARE DISCONNECTED</h2>
              <p className="text-zinc-500 text-sm max-w-xs">Ensure USB Camera and Arduino are plugged in via USB-OTG Hub.</p>
                <div className="flex flex-col gap-3 w-full max-w-xs">
                <button 
                  onClick={() => bootSystem()}
                  className="bg-hud-cyan text-black px-6 py-4 rounded-2xl font-black flex items-center justify-center gap-3 hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(0,242,255,0.3)]"
                >
                  <Play size={24} fill="currentColor" /> BOOT ALL SYSTEMS
                </button>
                <div className="flex gap-2">
                  <button 
                    onClick={() => startCamera()}
                    className="flex-1 bg-zinc-900 text-zinc-400 py-3 rounded-xl text-[10px] font-bold border border-zinc-800 hover:text-white"
                  >
                    INIT CAMERA
                  </button>
                  <button 
                    onClick={() => connectSerial()}
                    className="flex-1 bg-zinc-900 text-zinc-400 py-3 rounded-xl text-[10px] font-bold border border-zinc-800 hover:text-white"
                  >
                    INIT THERMAL
                  </button>
                </div>
              </div>
              
              {(cameraError || serialError) && (
                <div className="w-full max-w-md bg-red-950/50 border border-red-900/50 p-4 rounded-xl text-left space-y-2">
                  <div className="flex items-center gap-2 text-red-500 font-bold text-sm uppercase">
                    <AlertTriangle size={16} /> API Access Denied
                  </div>
                  {cameraError && <p className="text-red-400/80 text-xs font-mono">• Camera: {cameraError}</p>}
                  {serialError && <p className="text-red-400/80 text-xs font-mono">• Serial: {serialError}</p>}
                  
                  {((cameraError?.includes('supported') || serialError?.includes('supported'))) && (
                    <div className="mt-3 text-xs text-zinc-400 bg-black/50 p-3 rounded-lg border border-red-900/30">
                      <strong className="text-zinc-300 block mb-1">Network Access Detected</strong>
                      Hardware APIs require a secure context. If using Chrome on an Android tablet via network IP, go to <code className="text-hud-cyan select-all">chrome://flags/#unsafely-treat-insecure-origin-as-secure</code> and add <code className="text-hud-cyan select-all">http://10.111.129.134:3000</code> to the list.
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </div>

      {/* Footer Controls */}
      <footer className="mt-4 flex justify-between items-center z-20">
        <div className="flex gap-2">
           {/* View Mode Selector */}
           <div className="bg-zinc-900/50 backdrop-blur-md border border-zinc-800 p-1 rounded-2xl flex gap-1">
              {[
                { id: 'overlay', icon: Layers, label: 'Overlay' },
                { id: 'split', icon: Play, label: 'Split' }, // Using Play as Split icon placeholder
                { id: 'thermal', icon: Thermometer, label: 'Thermal' },
                { id: 'camera', icon: Camera, label: 'Camera' }
              ].map(mode => (
                <button 
                  key={mode.id}
                  onClick={() => setViewMode(mode.id as any)}
                  className={`px-3 py-1.5 rounded-xl flex items-center gap-2 transition-all ${viewMode === mode.id ? 'bg-hud-cyan text-black' : 'text-zinc-500 hover:text-white'}`}
                >
                  <mode.icon size={14} />
                  <span className="text-[10px] font-bold uppercase">{mode.label}</span>
                </button>
              ))}
           </div>

           {/* Auto-Switch Toggle */}
           <button 
              onClick={() => setAutoSwitch(!autoSwitch)}
              className={`px-4 py-1.5 rounded-2xl border flex items-center gap-2 transition-all ${autoSwitch ? 'bg-hud-orange border-hud-orange text-black' : 'bg-zinc-900 border-zinc-800 text-zinc-500'}`}
           >
              <div className={`w-2 h-2 rounded-full ${autoSwitch ? 'bg-black animate-pulse' : 'bg-zinc-700'}`} />
              <span className="text-[10px] font-bold uppercase tracking-widest">Auto-Switch {autoSwitch ? 'ON' : 'OFF'}</span>
           </button>

           {/* Opacity Slider (Only for Overlay) */}
           {viewMode === 'overlay' && (
              <div className="bg-zinc-900/50 backdrop-blur-md border border-zinc-800 px-4 py-1.5 rounded-2xl flex items-center gap-4 animate-in fade-in slide-in-from-left-4">
                 <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-tighter">Opacity</span>
                 <input 
                   type="range" min="0" max="1" step="0.1" 
                   value={overlayOpacity} 
                   onChange={(e) => setOverlayOpacity(parseFloat(e.target.value))}
                   className="w-24 accent-hud-cyan"
                 />
              </div>
           )}
        </div>

        <div className="text-right">
          <p className="text-[10px] text-zinc-600 font-mono">LAT: 34.0522° N | LON: 118.2437° W</p>
          <p className="text-[10px] text-zinc-500 font-mono uppercase">Version 1.0.4-VISION</p>
        </div>
      </footer>

      {/* Settings Modal */}
      <AnimatePresence>
        {showConfig && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowConfig(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100]"
            />
            <motion.div 
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              className="fixed right-0 top-0 bottom-0 w-80 bg-zinc-950 border-l border-zinc-800 p-6 z-[101] shadow-2xl"
            >
              <h3 className="text-lg font-black mb-8 flex items-center gap-2">
                <Settings className="text-hud-cyan" /> CONFIGURATION
              </h3>
              
              <div className="space-y-8">
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => setPalette("ironbow")}
                      className={`p-2 rounded-lg text-[10px] font-bold border transition-all ${palette === 'ironbow' ? 'bg-hud-cyan text-black border-hud-cyan' : 'bg-zinc-900 border-zinc-800 text-zinc-400'}`}
                    >
                      IRONBOW
                    </button>
                    <button 
                      onClick={() => setPalette("heatmap")}
                      className={`p-2 rounded-lg text-[10px] font-bold border transition-all ${palette === 'heatmap' ? 'bg-hud-cyan text-black border-hud-cyan' : 'bg-zinc-900 border-zinc-800 text-zinc-400'}`}
                    >
                      HEATMAP
                    </button>
                  </div>

                <div className="space-y-4">
                  <label className="text-xs font-bold text-zinc-500 uppercase">Alignment Calibration</label>
                  <div className="space-y-3 bg-zinc-900/30 p-4 rounded-2xl border border-zinc-800">
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-zinc-400">
                        <span>SCALE</span>
                        <span className="text-hud-cyan">{thermalScale.toFixed(2)}x</span>
                      </div>
                      <input 
                        type="range" min="0.5" max="3" step="0.05" 
                        value={thermalScale} 
                        onChange={(e) => setThermalScale(parseFloat(e.target.value))}
                        className="w-full accent-hud-cyan"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-zinc-400">
                        <span>X OFFSET</span>
                        <span className="text-hud-cyan">{thermalX}px</span>
                      </div>
                      <input 
                        type="range" min="-500" max="500" step="1" 
                        value={thermalX} 
                        onChange={(e) => setThermalX(parseInt(e.target.value))}
                        className="w-full accent-hud-cyan"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-zinc-400">
                        <span>Y OFFSET</span>
                        <span className="text-hud-cyan">{thermalY}px</span>
                      </div>
                      <input 
                        type="range" min="-500" max="500" step="1" 
                        value={thermalY} 
                        onChange={(e) => setThermalY(parseInt(e.target.value))}
                        className="w-full accent-hud-cyan"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-xs font-bold text-zinc-500 uppercase">Thermal Calibration</label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <span className="text-[10px] text-zinc-400">MIN TEMP</span>
                      <input 
                        type="number" value={minThreshold} 
                        onChange={(e) => setMinThreshold(parseInt(e.target.value))}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-sm text-hud-cyan"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] text-zinc-400">MAX TEMP</span>
                      <input 
                        type="number" value={maxThreshold} 
                        onChange={(e) => setMaxThreshold(parseInt(e.target.value))}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-sm text-hud-orange"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-xs font-bold text-zinc-500 uppercase">Input Selection</label>
                  <div className="space-y-2">
                    {devices.map(device => (
                      <button 
                        key={device.deviceId}
                        onClick={() => startCamera(device.deviceId)}
                        className="w-full text-left bg-zinc-900/50 border border-zinc-800 p-3 rounded-xl text-xs hover:border-hud-cyan transition-colors"
                      >
                        {device.label || `Camera ${device.deviceId.slice(0, 5)}`}
                      </button>
                    ))}
                  </div>
                </div>

                <button 
                  onClick={() => { disconnectSerial(); stopCamera(); }}
                  className="w-full bg-hud-red/10 border border-hud-red/20 text-hud-red py-4 rounded-2xl font-bold text-sm mt-8"
                >
                  SYSTEM SHUTDOWN
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </main>
  );
}
