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
        <h1>Vermögenslabor</h1>
        <p>Teste, wie dein Vermögen durch Marktphasen kommt.</p>
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
          Es simuliert transparent, wie unterschiedliche Anlage-, Reserve- und Entnahmestrategien
          unter verschiedenen Marktverläufen gewirkt hätten.
        </p>
      )}
    </header>
  );
}
