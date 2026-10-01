import { useState } from 'react';
import { IconInfo } from './icons';
import { ModeTabs, type AppMode } from './ModeTabs';

interface AppHeaderProps {
  mode: AppMode;
  onModeChange: (mode: AppMode) => void;
}

/**
 * App header: app icon, product name and the core question, the view tabs and
 * an info button that reveals the disclaimer.
 */
export function AppHeader({ mode, onModeChange }: AppHeaderProps) {
  const [showInfo, setShowInfo] = useState(false);

  return (
    <header className="app-header">
      <img className="app-logo" src="./Vermögens_Icon.png" alt="" width={48} height={48} />
      <div className="app-header-text">
        <h1>Entnahme-Stresstest</h1>
        <p>Wie robust ist deine Entnahmestrategie?</p>
      </div>
      <ModeTabs mode={mode} onChange={onModeChange} />
      <button
        type="button"
        className="app-info"
        aria-label="Über diese App"
        aria-expanded={showInfo}
        onClick={() => setShowInfo((v) => !v)}
      >
        <IconInfo size={22} />
      </button>

      {showInfo && (
        <p className="app-header-note">
          Keine Anlageempfehlung. Die App simuliert Strategien transparent und vergleichbar und
          beantwortet die Frage: „Was wäre mit meinem Vermögen passiert?“.
        </p>
      )}
    </header>
  );
}
