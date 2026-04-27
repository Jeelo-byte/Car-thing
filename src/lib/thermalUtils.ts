export type ThermalGrid = number[][];

export function parseThermalData(raw: string): ThermalGrid {
  const numbers = raw.match(/-?\d+\.\d+/g);
  if (!numbers || numbers.length < 64) return [];

  const values = numbers.map(Number).slice(-64);
  const grid: ThermalGrid = [];
  for (let i = 0; i < 8; i++) {
    grid.push(values.slice(i * 8, (i + 1) * 8));
  }
  return grid;
}

// Bilinear interpolation to scale 8x8 to target size
export function interpolateGrid(grid: ThermalGrid, targetSize: number): number[][] {
  const sourceSize = 8;
  const result: number[][] = [];

  for (let y = 0; y < targetSize; y++) {
    const row: number[] = [];
    const srcY = (y / (targetSize - 1)) * (sourceSize - 1);
    const y0 = Math.floor(srcY);
    const y1 = Math.min(y0 + 1, sourceSize - 1);
    const dy = srcY - y0;

    for (let x = 0; x < targetSize; x++) {
      const srcX = (x / (targetSize - 1)) * (sourceSize - 1);
      const x0 = Math.floor(srcX);
      const x1 = Math.min(x0 + 1, sourceSize - 1);
      const dx = srcX - x0;

      // Bilinear interpolation formula
      const v00 = grid[y0][x0];
      const v10 = grid[y0][x1];
      const v01 = grid[y1][x0];
      const v11 = grid[y1][x1];

      const value = 
        v00 * (1 - dx) * (1 - dy) +
        v10 * dx * (1 - dy) +
        v01 * (1 - dx) * dy +
        v11 * dx * dy;

      row.push(value);
    }
    result.push(row);
  }
  return result;
}

// Ironbow palette mapping (Vibrant)
export function getIronbowColor(value: number, min: number, max: number): string {
  const t = Math.max(0, Math.min(1, (value - min) / (max - min)));
  
  // High-fidelity Ironbow mapping
  const r = Math.min(255, Math.floor(255 * Math.pow(t, 0.45)));
  const g = Math.min(255, Math.floor(255 * Math.pow(t, 2.5)));
  const b = Math.min(255, Math.floor(255 * (1 - Math.sin(t * Math.PI))));

  return `rgb(${r}, ${g}, ${b})`;
}

// User's preferred HSL mapping (Blue -> Green -> Red)
export function getHeatmapColor(value: number, min: number, max: number): string {
  const t = Math.max(0, Math.min(1, (value - min) / (max - min)));
  const hue = (1 - t) * 240; 
  return `hsl(${hue}, 100%, 50%)`;
}
