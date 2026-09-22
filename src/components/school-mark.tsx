import { inkOn } from "@/lib/colors"

export function SchoolMark({
  primary,
  secondary,
  abbr,
  className,
  x,
  y,
  width,
  height,
}: {
  primary: string
  secondary: string
  abbr?: string
  className?: string
  x?: number
  y?: number
  width?: number
  height?: number
}) {
  const letters = abbr ?? ""
  const ink = inkOn(primary)
  const letterSize = letters.length >= 5 ? 22 : letters.length === 4 ? 26 : letters.length === 3 ? 32 : 38
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      x={x}
      y={y}
      width={width}
      height={height}
      aria-hidden
      overflow="visible"
    >
      <circle cx="50" cy="50" r="44" fill={primary} stroke={secondary} strokeWidth="8" />
      {letters ? (
        <text
          x="50"
          y="52"
          textAnchor="middle"
          dominantBaseline="middle"
          fill={ink}
          fontSize={letterSize}
          fontWeight={700}
          fontFamily="var(--font-display), 'Arial Narrow', Impact, sans-serif"
          letterSpacing={letters.length > 3 ? "-0.04em" : "0"}
        >
          {letters}
        </text>
      ) : null}
    </svg>
  )
}
