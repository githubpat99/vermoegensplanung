import type { ReactNode } from 'react';

interface InfoBlockProps {
  /** Beschriftung des Aufklappers, z. B. „So funktioniert's“ oder „Vergleich verstehen“. */
  label: string;
  children: ReactNode;
  className?: string;
}

/**
 * Kompakter Info-Aufklapper (ⓘ) für Erklärungen, Beispiele und Methodik.
 *
 * Leitprinzip des Labors: zeigen und bedienen – erklären bei Bedarf. Alles, was
 * nicht zur unmittelbaren Bedienung oder zum Ergebnis gehört, liegt hier hinter
 * einem Tap statt permanent im Layout.
 */
export function InfoBlock({ label, children, className = '' }: InfoBlockProps) {
  return (
    <details className={`info-block ${className}`.trim()}>
      <summary>
        <span className="info-icon" aria-hidden="true">
          i
        </span>
        <span>{label}</span>
      </summary>
      <div className="info-body">{children}</div>
    </details>
  );
}
