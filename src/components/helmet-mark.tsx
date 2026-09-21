import { useId } from "react"
import { inkOn } from "@/lib/colors"

const MASK = "#b0b8c0"
const MASK_EDGE = "#6e767e"

// Side-view shell traced from the reference silhouette. Coordinates stay in
// that crop so the facemask bars land on the same attachments.
const SHELL =
  "M440 116 C530 108 612 130 668 176 C718 216 750 278 760 342 C764 386 752 406 720 414 C678 424 628 462 582 502 C548 532 516 552 498 566 C492 592 540 618 596 636 C618 652 578 674 520 674 C458 676 392 648 336 588 C286 538 236 512 202 486 C186 468 186 400 192 338 C198 258 236 192 302 156 C348 130 396 114 440 116 Z"

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
  const clipId = useId().replace(/:/g, "")
  const letters = abbr ?? ""
  const ink = inkOn(primary)
  const letterSize = letters.length >= 5 ? 56 : letters.length === 4 ? 72 : letters.length === 3 ? 92 : 118
  return (
    <svg viewBox="150 90 720 710" className={className} aria-hidden>
      <defs>
        <clipPath id={clipId}>
          <path d={SHELL} />
        </clipPath>
      </defs>
      <path d={SHELL} fill={primary} stroke={secondary} strokeWidth="18" strokeLinejoin="round" />
      <path
        d="M292 168 C360 118 500 102 648 162"
        fill="none"
        stroke={secondary}
        strokeWidth="46"
        strokeLinecap="round"
        clipPath={`url(#${clipId})`}
      />
      <ellipse cx="469" cy="506" rx="38" ry="40" fill="#1c1915" />
      <ellipse cx="469" cy="506" rx="38" ry="40" fill="none" stroke={primary} strokeWidth="8" />
      <path
        d="M498 560 C534 592 575 618 602 640"
        fill="none"
        stroke="#1c1915"
        strokeOpacity="0.4"
        strokeWidth="8"
        strokeLinecap="round"
      />
      <g fill="none" stroke={MASK} strokeWidth="20" strokeLinecap="round" strokeLinejoin="round">
        <path d="M748 368 C778 352 812 366 804 396" />
        <path d="M662 422 C730 398 790 392 812 412" />
        <path d="M628 458 C662 478 678 508 684 536" />
        <path d="M556 518 C610 534 656 552 686 566" />
        <path d="M524 592 C575 612 640 642 692 668" />
        <path d="M678 468 C682 540 688 620 694 688" />
        <path d="M804 414 C834 490 842 590 824 680 C800 748 748 778 700 770" />
        <path d="M692 684 C735 724 778 748 812 712" />
      </g>
      <g fill="none" stroke={MASK_EDGE} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" opacity="0.7">
        <path d="M748 368 C778 352 812 366 804 396" />
        <path d="M662 422 C730 398 790 392 812 412" />
        <path d="M628 458 C662 478 678 508 684 536" />
        <path d="M556 518 C610 534 656 552 686 566" />
        <path d="M524 592 C575 612 640 642 692 668" />
        <path d="M678 468 C682 540 688 620 694 688" />
        <path d="M804 414 C834 490 842 590 824 680 C800 748 748 778 700 770" />
        <path d="M692 684 C735 724 778 748 812 712" />
      </g>
      <g fill={MASK} stroke={MASK_EDGE} strokeWidth="2">
        <circle cx="662" cy="422" r="8" />
        <circle cx="612" cy="492" r="7.5" />
        <circle cx="536" cy="584" r="7.5" />
      </g>
      {letters && (
        <text
          x="452"
          y="308"
          textAnchor="middle"
          dominantBaseline="middle"
          fill={ink}
          fontSize={letterSize}
          fontWeight={700}
          fontFamily="var(--font-display), 'Arial Narrow', Impact, sans-serif"
          letterSpacing={letters.length > 3 ? "-0.03em" : "0"}
        >
          {letters}
        </text>
      )}
    </svg>
  )
}
