import { inkOn } from "@/lib/colors"

export function HelmetMark({
  primary,
  secondary,
  abbr,
  className,
}: {
  primary: string
  secondary: string
  abbr?: string
  className?: string
}) {
  const ink = inkOn(primary)
  const letters = abbr ?? ""
  const letterSize = letters.length >= 5 ? 11 : letters.length >= 4 ? 13 : 16
  return (
    <svg viewBox="0 0 168 118" className={className} aria-hidden>
      <path
        fill={primary}
        stroke="#1c1915"
        strokeOpacity={0.45}
        strokeWidth={1.8}
        strokeLinejoin="round"
        fillRule="evenodd"
        d="M40 90
          C24 86 16 70 18 50
          C20 28 40 12 70 10
          C100 8 126 20 136 38
          C142 50 136 60 124 66
          C122 80 110 98 82 104
          C58 110 44 100 40 90
          Z
          M64 64
          C54 60 52 46 62 38
          C74 30 88 36 86 50
          C84 64 74 68 64 64
          Z"
      />
      <path
        d="M48 30 C74 16 108 18 130 34"
        fill="none"
        stroke={secondary}
        strokeWidth={8}
        strokeLinecap="round"
      />
      <path
        d="M86 46 C98 42 112 46 118 56"
        fill="none"
        stroke="#fbf6ec"
        strokeOpacity={0.28}
        strokeWidth={3}
        strokeLinecap="round"
      />
      <g fill="none" stroke={secondary} strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round">
        <path d="M128 44 H156" />
        <path d="M124 56 H160" />
        <path d="M118 68 H154" />
        <path d="M112 80 H142" />
        <path d="M156 38 C170 52 168 78 144 94" />
        <path d="M160 56 C170 66 162 84 142 92" />
        <path d="M148 44 V80" />
      </g>
      {letters && (
        <text
          x="78"
          y="84"
          textAnchor="middle"
          fill={ink}
          fontSize={letterSize}
          fontWeight={700}
          fontFamily="Arial, Helvetica, sans-serif"
        >
          {letters}
        </text>
      )}
    </svg>
  )
}
