
import React, { useState, useCallback, useEffect, useRef, useReducer } from 'react';
import { INITIAL_STATE, AgentType } from './types';
import { stateReducer } from './store/reducer';
import { useAgentPipeline } from './hooks/useAgentPipeline';
import { useHistory } from './hooks/useHistory';
import ErrorToast from './components/ErrorToast';
import AppHeader from './components/AppHeader';
import LeftPanel from './components/LeftPanel';
import OutputTabs from './components/OutputTabs';

type AppTab = 'scout' | 'radar' | 'analyst' | 'architect' | 'doc_circle' | 'act_planning' | 'outliner' | 'writer' | 'history';

function App() {
  const [state, dispatch] = useReducer(stateReducer, INITIAL_STATE);
  const [editedRadar, setEditedRadar] = useState('');
  const [editedDossier, setEditedDossier] = useState('');
  const [editedStructure, setEditedStructure] = useState('');
  const [editedOutline, setEditedOutline] = useState('');
  const [editedDocCircle, setEditedDocCircle] = useState('');
  const [editedActPlanning, setEditedActPlanning] = useState('');
  const [currentTab, setCurrentTab] = useState<AppTab>('scout');
  const [showDraftRestore, setShowDraftRestore] = useState(false);
  const draftSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const addLog = useCallback((msg: string) => {
    dispatch({ type: 'ADD_LOG', message: msg });
  }, []);

  const { loadHistoryFromServer, loadFromHistory, handleDeleteHistory, saveToHistory } = useHistory(dispatch, addLog);

  const pipeline = useAgentPipeline({
    state,
    dispatch,
    addLog,
    saveToHistory,
    setEditedRadar,
    setEditedDossier,
    setEditedStructure,
    setEditedOutline,
    setEditedDocCircle,
    setEditedActPlanning,
  });

  useEffect(() => {
    loadHistoryFromServer();
    try {
      const saved = localStorage.getItem('narrative_war_draft');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.finalScript?.length || parsed?.researchDossier || parsed?.structureMap) {
          setShowDraftRestore(true);
        }
      }
    } catch { /* ignore */ }
  }, [loadHistoryFromServer]);

  // Debounced auto-save draft to localStorage
  useEffect(() => {
    if (!state.finalScript?.length && !state.researchDossier && !state.structureMap) return;
    if (draftSaveTimer.current) clearTimeout(draftSaveTimer.current);
    draftSaveTimer.current = setTimeout(() => {
      try {
        const draft = {
          topic: state.topic,
          projectType: state.projectType,
          finalScript: state.finalScript,
          researchDossier: state.researchDossier,
          structureMap: state.structureMap,
          scriptOutline: state.scriptOutline,
          radarOutput: state.radarOutput,
          thumbnailConcept: state.thumbnailConcept,
          seoPackage: state.seoPackage,
          savedAt: new Date().toISOString(),
        };
        localStorage.setItem('narrative_war_draft', JSON.stringify(draft));
      } catch (err) {
        if (err instanceof DOMException && (err.code === 22 || err.name === 'QuotaExceededError')) {
          dispatch({ type: 'SET_FIELD', field: 'lastError', value: 'Auto-save failed: script too large for browser storage. Use manual export to preserve your work.' });
        }
      }
    }, 1500);
    return () => { if (draftSaveTimer.current) clearTimeout(draftSaveTimer.current); };
  }, [state.finalScript, state.researchDossier, state.structureMap, state.topic, state.projectType, state.scriptOutline, state.radarOutput, state.thumbnailConcept, state.seoPackage, dispatch]);

  // Auto-navigate to the relevant tab when agent data arrives
  useEffect(() => {
    if (state.finalScript?.length)           setCurrentTab('writer');
    else if (state.scriptOutline)            setCurrentTab('outliner');
    else if (state.actPlanning)              setCurrentTab('act_planning');
    else if (state.docCircle)               setCurrentTab('doc_circle');
    else if (state.structureMap)            setCurrentTab('architect');
    else if (state.researchDossier)         setCurrentTab('analyst');
    else if (state.radarOutput)             setCurrentTab('radar');
    else if (state.scoutSuggestions?.length) setCurrentTab('scout');
  }, [state.finalScript, state.scriptOutline, state.actPlanning, state.docCircle, state.structureMap, state.researchDossier, state.radarOutput, state.scoutSuggestions]);

  const onDeleteHistory = useCallback((id: number, e: React.MouseEvent) => {
    handleDeleteHistory(id, state.history, e);
  }, [handleDeleteHistory, state.history]);

  const onImageGen = useCallback((index: number) => {
    if (state.finalScript) pipeline.handleImageGen(index, state.finalScript);
  }, [pipeline, state.finalScript]);

  const handleRestoreDraft = useCallback(() => {
    try {
      const saved = localStorage.getItem('narrative_war_draft');
      if (!saved) return;
      const draft = JSON.parse(saved);
      dispatch({ type: 'MERGE', partial: {
        topic: draft.topic ?? '',
        projectType: draft.projectType ?? 'short_doc',
        finalScript: draft.finalScript ?? undefined,
        researchDossier: draft.researchDossier ?? undefined,
        structureMap: draft.structureMap ?? undefined,
        scriptOutline: draft.scriptOutline ?? undefined,
        radarOutput: draft.radarOutput ?? undefined,
        thumbnailConcept: draft.thumbnailConcept ?? undefined,
        seoPackage: draft.seoPackage ?? undefined,
      }});
    } catch { /* ignore */ }
    setShowDraftRestore(false);
  }, [dispatch]);

  const handleDiscardDraft = useCallback(() => {
    localStorage.removeItem('narrative_war_draft');
    setShowDraftRestore(false);
  }, []);

  return (
    <div className="min-h-screen bg-mw-black text-slate-300 font-sans selection:bg-mw-red selection:text-white">

      {showDraftRestore && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-mw-gray border border-mw-red/60 rounded px-4 py-3 shadow-lg text-sm font-mono">
          <span className="text-mw-red font-bold">DRAFT FOUND</span>
          <span className="text-slate-300">Restore previous session?</span>
          <button onClick={handleRestoreDraft} className="px-3 py-1 bg-mw-red hover:bg-red-700 text-white rounded text-xs font-bold transition-colors">RESTORE</button>
          <button onClick={handleDiscardDraft} className="px-3 py-1 bg-mw-gray/60 hover:bg-mw-gray border border-mw-slate/40 text-slate-400 rounded text-xs transition-colors">DISCARD</button>
        </div>
      )}

      {state.lastError && (
        <ErrorToast
          message={state.lastError}
          onClose={() => dispatch({ type: 'SET_FIELD', field: 'lastError', value: undefined })}
        />
      )}

      <AppHeader
        historyCount={state.history.length}
        isProcessing={state.isProcessing}
        stepStatus={state.stepStatus}
        onNavigateToHistory={() => setCurrentTab('history')}
      />

      {/* Tab Navigation Bar */}
      <div className="sticky top-16 z-40 bg-mw-black/95 backdrop-blur border-b border-mw-slate/20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-wrap">
            {([
              { id: 'scout'       as AppTab, label: 'SCOUT',   hasData: !!state.scoutSuggestions?.length, agent: AgentType.SCOUT },
              { id: 'radar'       as AppTab, label: 'RADAR',   hasData: !!state.radarOutput,             agent: AgentType.RADAR },
              { id: 'analyst'     as AppTab, label: 'ANALYST', hasData: !!state.researchDossier,         agent: AgentType.ANALYST },
              { id: 'architect'   as AppTab, label: 'ARCH',    hasData: !!state.structureMap,            agent: AgentType.ARCHITECT },
              { id: 'doc_circle'  as AppTab, label: 'CIRCLE',  hasData: !!state.docCircle,               agent: AgentType.DOC_CIRCLE },
              { id: 'act_planning'as AppTab, label: 'BEATS',   hasData: !!state.actPlanning,             agent: AgentType.ACT_PLANNING },
              { id: 'outliner'    as AppTab, label: 'OUTLINE', hasData: !!state.scriptOutline,           agent: AgentType.OUTLINER },
              { id: 'writer'      as AppTab, label: 'SCRIPT',  hasData: !!state.finalScript?.length,     agent: AgentType.WRITER },
              { id: 'history'     as AppTab, label: 'HISTORY', hasData: true,                            agent: null },
            ] as { id: AppTab; label: string; hasData: boolean; agent: AgentType | null }[])
              .map(tab => {
                const isCurrent = state.currentAgent === tab.agent;
                const isWaiting = state.stepStatus === 'WAITING_FOR_APPROVAL' && isCurrent;
                const isReady = tab.hasData || tab.id === 'scout' || tab.id === 'history';
                return (
                  <button
                    key={tab.id}
                    onClick={() => setCurrentTab(tab.id)}
                    className={`px-4 py-3 text-xs font-bold uppercase tracking-widest border-b-2 transition-all flex items-center gap-2 ${
                      currentTab === tab.id
                        ? 'border-mw-red text-white'
                        : isReady || isCurrent
                          ? 'border-transparent text-mw-slate hover:text-white hover:border-mw-slate/50'
                          : 'border-transparent text-mw-slate/30 cursor-default pointer-events-none'
                    }`}
                  >
                    {tab.label}
                    {isWaiting && <span className="w-1.5 h-1.5 rounded-full bg-mw-red animate-ping inline-block" />}
                    {!isWaiting && isCurrent && state.isProcessing && <span className="w-1.5 h-1.5 rounded-full bg-mw-red animate-pulse inline-block" />}
                    {!isCurrent && tab.hasData && tab.id !== 'history' && <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />}
                  </button>
                );
              })}
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative">
        <LeftPanel
          state={state}
          dispatch={dispatch}
          pipeline={pipeline}
          addLog={addLog}
        />
        <OutputTabs
          currentTab={currentTab}
          state={state}
          dispatch={dispatch}
          pipeline={pipeline}
          editedRadar={editedRadar}
          setEditedRadar={setEditedRadar}
          editedDossier={editedDossier}
          setEditedDossier={setEditedDossier}
          editedStructure={editedStructure}
          setEditedStructure={setEditedStructure}
          editedOutline={editedOutline}
          setEditedOutline={setEditedOutline}
          editedDocCircle={editedDocCircle}
          setEditedDocCircle={setEditedDocCircle}
          editedActPlanning={editedActPlanning}
          setEditedActPlanning={setEditedActPlanning}
          onImageGen={onImageGen}
          onDeleteHistory={onDeleteHistory}
          onLoadFromHistory={loadFromHistory}
        />
      </main>
    </div>
  );
}

export default App;
