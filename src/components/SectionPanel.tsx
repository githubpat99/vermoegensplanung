import { useState, type ReactNode } from 'react';
import { IconChevronDown } from './icons';

type Tone = 'blue' | 'indigo' | 'violet' | 'green' | 'amber' | 'slate';

interface SectionPanelProps {
  title: string;
  /** Small descriptive line under the title (always visible). */
  subtitle?: string;
  /** Optional live summary appended to the subtitle line. */
  meta?: string;
  icon?: ReactNode;
  /** Colour of the icon chip. */
  tone?: Tone;
  /** Optional element on the right of the header (e.g. a live badge). */
  badge?: ReactNode;
  /** Anchor id for the top navigation. */
  id?: string;
  className?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

/**
 * Section card ("Kachel") with an icon chip, subtitle and a collapsible body
 * (native <details> for accessibility). Collapsed by default and without a
 * numbering, so every view starts with the same, calm header rows.
 */
export function SectionPanel({
  title,
  subtitle,
  meta,
  icon,
  tone = 'blue',
  badge,
  id,
  className = '',
  defaultOpen = false,
  children,
}: SectionPanelProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <details
      id={id}
      className={`panel section ${className}`.trim()}
      open={open}
      onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}
    >
      <summary className="section-head">
        {icon && <span className={`section-icon tone-${tone}`}>{icon}</span>}
        <span className="section-text">
          <span className="section-title">{title}</span>
          {(subtitle || meta) && (
            <span className="section-sub">
              {subtitle}
              {subtitle && meta ? ' · ' : ''}
              {meta && <span className="section-meta">{meta}</span>}
            </span>
          )}
        </span>
        {badge}
        <IconChevronDown size={20} className="section-chevron" />
      </summary>
      <div className="section-body">{children}</div>
    </details>
  );
}

interface StaticPanelProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  tone?: Tone;
  badge?: ReactNode;
  id?: string;
  className?: string;
  children: ReactNode;
}

/** Non-collapsible section card (used for "Ergebnisse"). */
export function StaticPanel({
  title,
  subtitle,
  icon,
  tone = 'blue',
  badge,
  id,
  className = '',
  children,
}: StaticPanelProps) {
  return (
    <section id={id} className={`panel section ${className}`.trim()}>
      <div className="section-head static">
        {icon && <span className={`section-icon tone-${tone}`}>{icon}</span>}
        <span className="section-text">
          <span className="section-title">{title}</span>
          {subtitle && <span className="section-sub">{subtitle}</span>}
        </span>
        {badge}
      </div>
      <div className="section-body">{children}</div>
    </section>
  );
}
