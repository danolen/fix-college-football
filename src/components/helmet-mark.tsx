import { helmetShell } from "@/lib/colors"

export function HelmetMark({
  primary,
  secondary,
  className,
}: {
  primary: string
  secondary: string
  className?: string
}) {
  const shell = helmetShell(primary)
  return (
    <svg viewBox="0 0 80 72" className={className} aria-hidden>
      <path
        fill={shell}
        d="M24 16c0-8 12-12 26-9 12 3 20 14 20 28 0 16-12 30-26 31H34c-12 0-20-10-20-22v-6c-7 0-10-7-6-12l6-6c0-2 2-4 4-4z"
      />
      <path fill={secondary} d="M38 12c6 6 8 20 5 46h-7C38 32 36 18 32 12z" />
      <ellipse cx="30" cy="40" rx="6" ry="8" fill={primary} opacity="0.28" />
      <g fill="none" stroke={secondary} strokeWidth="2.4" strokeLinecap="round">
        <path d="M58 28h12" />
        <path d="M56 36h16" />
        <path d="M56 44h13" />
        <path d="M70 24c7 7 7 24-4 32" />
      </g>
    </svg>
  )
}
