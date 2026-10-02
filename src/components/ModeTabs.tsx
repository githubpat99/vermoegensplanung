export type AppMode = 'labor' | 'details' | 'einstellungen';

interface ModeTabsProps {
  mode: AppMode;
  onChange: (mode: AppMode) => void;
}

const TABS: { id: AppMode; label: string }[] = [
  { id: 'labor', label: 'Labor' },
  { id: 'details', label: 'Details' },
  { id: 'einstellungen', label: 'Einstellungen' },
];

/** Hauptnavigation des Vermögenslabors: Labor · Details · Einstellungen. */
export function ModeTabs({ mode, onChange }: ModeTabsProps) {
  return (
    <nav className="mode-tabs" aria-label="Bereiche">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={mode === tab.id ? 'mode-tab active' : 'mode-tab'}
          aria-current={mode === tab.id ? 'page' : undefined}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
