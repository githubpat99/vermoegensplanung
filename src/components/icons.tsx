import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function base({ size = 20, className, ...rest }: IconProps): SVGProps<SVGSVGElement> {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.9,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    className,
    'aria-hidden': true,
    ...rest,
  };
}

/** Person icon – "Ausgangslage". */
export function IconUser(p: IconProps) {
  return (
    <svg {...base(p)}>
      <circle cx="12" cy="8" r="3.4" />
      <path d="M5.5 20c0-3.2 2.9-5.8 6.5-5.8s6.5 2.6 6.5 5.8" />
    </svg>
  );
}

/** Trend line icon – "Marktszenario". */
export function IconTrend(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M4 15.5 9 10l3.5 3.5L20 6" />
      <path d="M15.5 6H20v4.5" />
    </svg>
  );
}

/** Bar chart icon – "Ergebnisse". */
export function IconBarChart(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M5 20V11" />
      <path d="M12 20V4" />
      <path d="M19 20v-6" />
    </svg>
  );
}

/** Gear icon – "Weitere Einstellungen". */
export function IconGear(p: IconProps) {
  return (
    <svg {...base(p)}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H10a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V10a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
    </svg>
  );
}

/** Table icon – "Jahresdetails". */
export function IconTable(p: IconProps) {
  return (
    <svg {...base(p)}>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
      <path d="M3.5 9.5h17M9 9.5V19.5" />
    </svg>
  );
}

/** Book icon – "Datengrundlage & Quellen". */
export function IconBook(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M4 5.5A2 2 0 0 1 6 3.5h5v16H6a2 2 0 0 0-2 2Z" />
      <path d="M20 5.5a2 2 0 0 0-2-2h-5v16h5a2 2 0 0 1 2 2Z" />
    </svg>
  );
}

/** Info circle. */
export function IconInfo(p: IconProps) {
  return (
    <svg {...base(p)}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5" />
      <path d="M12 8.2h.01" />
    </svg>
  );
}

/** Chevron pointing down. */
export function IconChevronDown(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="m6 9.5 6 6 6-6" />
    </svg>
  );
}

/** Downward trend (bear market) – used for negative scenarios. */
export function IconTrendDown(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M4 8.5 9 14l3.5-3.5L20 18" />
      <path d="M15.5 18H20v-4.5" />
    </svg>
  );
}

/** Arrow pointing to the lower right – used for negative changes. */
export function IconArrowDownRight(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M7 7l10 10" />
      <path d="M17 8.5V17H8.5" />
    </svg>
  );
}

/** Shield icon – used for the sensitivity / robustness section. */
export function IconShield(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M12 3.5 5 6v5.5c0 4.2 2.9 7.4 7 8.9 4.1-1.5 7-4.7 7-8.9V6Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
