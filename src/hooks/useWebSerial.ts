"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export interface SerialData {
  port: any | null;
  connected: boolean;
  error: string | null;
}

export function useWebSerial() {
  const [status, setStatus] = useState<SerialData>({
    port: null,
    connected: false,
    error: null,
  });
  const [latestData, setLatestData] = useState<string>("");
  const readerRef = useRef<ReadableStreamDefaultReader | null>(null);

  const connect = useCallback(async () => {
    try {
      if (typeof navigator === "undefined" || !(navigator as any).serial) {
        throw new Error("Web Serial API is not supported in this browser context.");
      }
      // @ts-ignore - Web Serial API is still experimental in some TS versions
      const port = await (navigator as any).serial.requestPort();
      await port.open({ baudRate: 115200 });
      
      setStatus({ port, connected: true, error: null });
      readLoop(port);
    } catch (err: any) {
      console.error("Serial connection error:", err);
      setStatus(prev => ({ ...prev, error: err.message }));
    }
  }, []);

  const disconnect = useCallback(async () => {
    if (readerRef.current) {
      await readerRef.current.cancel();
    }
    if (status.port) {
      await status.port.close();
    }
    setStatus({ port: null, connected: false, error: null });
  }, [status.port]);

  const readLoop = async (port: any) => {
    while (port.readable) {
      const reader = port.readable.getReader();
      readerRef.current = reader;
      try {
        let buffer = "";
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          
          // Decode uint8array to string
          const chunk = new TextDecoder().decode(value);
          buffer += chunk;
          
          // If we have the delimiter, we have a full frame
          if (buffer.includes("---")) {
            const frames = buffer.split("---");
            // The last one might be partial
            buffer = frames.pop() || "";
            
            // Set the most recent full frame
            if (frames.length > 0) {
              setLatestData(frames[frames.length - 1].trim());
            }
          }
        }
      } catch (err) {
        console.error("Serial read error:", err);
        break;
      } finally {
        reader.releaseLock();
      }
    }
  };

  return { ...status, latestData, connect, disconnect };
}
