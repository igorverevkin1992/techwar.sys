import React, { useState } from 'react';
import { APP_VERSION } from '../constants';
import SettingsPanel from './SettingsPanel';

interface AppHeaderProps {
  historyCount: number;
  isProcessing: boolean;
  stepStatus: 'IDLE' | 'WAITING_FOR_APPROVAL' | 'PROCESSING';
  onNavigateToHistory: () => void;
}

const AppHeader: React.FC<AppHeaderProps> = ({ historyCount, isProcessing, stepStatus, onNavigateToHistory }) => {
  const [showSettings, setShowSettings] = useState(false);

  return (
    <>
      <header className="border-b border-mw-slate/30 bg-mw-black/95 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-mw-red rounded-full animate-pulse shadow-[0_0_10px_#00e5ff]" />
            <h1 className="text-xl font-bold tracking-widest text-white">
              TECH<span className="text-mw-red">.WAR</span>{' '}
              <span className="text-xs text-mw-slate ml-2 font-mono border border-mw-slate/50 px-1 rounded">V{APP_VERSION}</span>
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={onNavigateToHistory}
              className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-mw-slate hover:text-mw-red transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/><path d="M12 7v5l4 2"/></svg>
              Projects ({historyCount})
            </button>
            <div className="font-mono text-xs text-mw-slate hidden sm:block border-l border-mw-slate/30 pl-4">
              STATUS: {isProcessing ? 'BUSY' : stepStatus === 'WAITING_FOR_APPROVAL' ? 'WAITING' : 'IDLE'}
            </div>
            <button
              onClick={() => setShowSettings(true)}
              title="Settings"
              className="text-mw-slate hover:text-white transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
          </div>
        </div>
      </header>
      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
    </>
  );
};

export default AppHeader;
