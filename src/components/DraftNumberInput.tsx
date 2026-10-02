import { useEffect, useState } from 'react';

interface DraftNumberInputProps {
  /** Current committed value. */
  value: number;
  /** Canonical display format, applied when the field is not being edited. */
  format: (value: number) => string;
  /** Parse the draft; returns `null` while the text is not yet a number. */
  parse: (text: string) => number | null;
  /** Called for every valid intermediate value. */
  onCommit: (value: number) => void;
  ariaLabel?: string;
  inputMode?: 'numeric' | 'decimal';
}

/**
 * Text input that can be typed freely.
 *
 * A plain controlled input would reformat on every keystroke (grouping
 * separators would jump, a decimal comma would collapse), which makes correct
 * entry impossible. Here the raw text is kept while the field has focus and is
 * normalised to the canonical format on blur.
 */
export function DraftNumberInput({
  value,
  format,
  parse,
  onCommit,
  ariaLabel,
  inputMode = 'decimal',
}: DraftNumberInputProps) {
  const [draft, setDraft] = useState(() => format(value));
  const [editing, setEditing] = useState(false);

  // Follow external changes (e.g. a combination applied from the heatmap)
  // while the user is not typing in this field.
  useEffect(() => {
    if (!editing) setDraft(format(value));
  }, [value, editing, format]);

  return (
    <input
      type="text"
      inputMode={inputMode}
      aria-label={ariaLabel}
      value={draft}
      onFocus={() => setEditing(true)}
      onChange={(e) => {
        const text = e.target.value;
        setDraft(text);
        const parsed = parse(text);
        if (parsed != null) onCommit(parsed);
      }}
      onBlur={() => {
        setEditing(false);
        setDraft(format(value));
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur();
      }}
    />
  );
}

/**
 * Parse a CHF input ("1'228'300" / "1228300" / "145 000") to a number.
 * Returns `null` while there is no digit to work with.
 */
export function parseMoneyInput(text: string): number | null {
  const digits = text.replace(/[^0-9]/g, '');
  if (digits === '') return null;
  const parsed = Number(digits);
  return Number.isFinite(parsed) ? parsed : null;
}
