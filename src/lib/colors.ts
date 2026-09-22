export const PALETTE = [
  "#9E2A2B",
  "#1D4E89",
  "#C2410C",
  "#0F6E56",
  "#6D28D9",
  "#B45309",
  "#0E7490",
  "#BE185D",
  "#3F6212",
  "#1E3A8A",
  "#9A3412",
  "#155E75",
  "#7C2D12",
  "#4C1D95",
  "#365314",
  "#831843",
  "#44403C",
  "#0369A1",
  "#0F766E",
  "#7C3AED",
  "#B91C1C",
  "#2563EB",
  "#A16207",
  "#15803D",
  "#C026D3",
  "#334155",
  "#EA580C",
  "#4338CA",
  "#9F1239",
  "#0B3D2E",
  "#DB2777",
  "#1E40AF",
  "#65A30D",
  "#7E22CE",
  "#0C4A6E",
  "#92400E",
  "#115E59",
  "#9D174D",
  "#14532D",
  "#5B21B6",
  "#3F3F46",
  "#0D9488",
  "#E11D48",
  "#1E293B",
  "#CA8A04",
  "#166534",
  "#7F1D1D",
  "#312E81",
  "#0891B2",
  "#BE123C",
  "#854D0E",
  "#6B21A8",
  "#164E63",
  "#A21CAF",
  "#57534E",
  "#0284C7",
  "#9A341E",
  "#1C1917",
  "#4D7C0F",
  "#9F580A",
]

export function nextColor(used: string[]): string {
  const taken = new Set(used.map((color) => color.toLowerCase()))
  return PALETTE.find((color) => !taken.has(color.toLowerCase())) ?? PALETTE[used.length % PALETTE.length]
}

export function relativeLuminance(hex: string): number {
  const raw = hex.replace("#", "")
  const full = raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw
  const value = Number.parseInt(full, 16)
  const channel = (shift: number) => {
    const srgb = ((value >> shift) & 255) / 255
    return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(16) + 0.7152 * channel(8) + 0.0722 * channel(0)
}

export function inkOn(hex: string): string {
  return relativeLuminance(hex) > 0.62 ? "#1c1915" : "#fbf6ec"
}
