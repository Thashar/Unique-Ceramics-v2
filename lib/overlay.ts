export function hexToRgba(hex: string, opacity: string): string {
  try {
    const c = (hex || "#2C2825").replace("#", "");
    const r = parseInt(c.slice(0, 2), 16);
    const g = parseInt(c.slice(2, 4), 16);
    const b = parseInt(c.slice(4, 6), 16);
    const a = Math.max(0, Math.min(100, parseInt(opacity) || 0)) / 100;
    return `rgba(${r},${g},${b},${a})`;
  } catch {
    return "rgba(44,40,37,0.5)";
  }
}
