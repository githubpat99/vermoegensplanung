export type AppMode = 'simulation' | 'comparison' | 'sources';

interface ModeTabsProps {
  mode: AppMode;
  onChange: (mode: AppMode) => void;
}

const TABS: { id: AppMode; label: string }[] = [
  { id: 'simulation', label: 'Simulation' },
  { id: 'comparison', label: 'Szenariovergleich' },
  { id: 'sources', label: 'Quellen' },
];

/** Top-level navigation between the three views. */
export function ModeTabs({ mode, onChange }: ModeTabsProps) {
  return (
    <nav className="mode-tabs" aria-label="Ansichten">
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
