import React, { useState } from 'react';
import type { SystemState, TopicSuggestion, HistoryItem } from '../types';
import { AgentType } from '../types';
import type { Action } from '../store/reducer';
import RichTextDisplay from './RichTextDisplay';
import StepEditor from './StepEditor';
import ScriptDisplay from './ScriptDisplay';
import SeoDisplay from './SeoDisplay';
import ThumbnailPreview from './ThumbnailPreview';
import HistorySidebar from './HistorySidebar';

type AppTab = 'scout' | 'radar' | 'analyst' | 'architect' | 'doc_circle' | 'act_planning' | 'outliner' | 'writer' | 'history';

interface PipelineRef {
  executeScout: () => Promise<TopicSuggestion[] | void>;
  executeSEO: () => void;
  executeRewrite: () => void;
  executeAuditFix: () => void;
  handlePreviewGen: (referenceBase64: string, mimeType: string) => Promise<void>;
  handleApproveRadar: (text: string) => void;
  handleApproveAnalyst: (text: string) => void;
  handleApproveArchitect: (text: string, dossier: string | undefined) => void;
  handleApproveDocCircle: (text: string, structureMap: string, dossier: string | undefined) => void;
  handleApproveActPlanning: (text: string, docCircle: string, structureMap: string, dossier: string | undefined) => void;
  handleApproveOutline: (text: string, structureMap: string, dossier: string | undefined) => void;
  handleSelectTopic: (suggestion: TopicSuggestion) => void;
}

interface OutputTabsProps {
  currentTab: AppTab;
  state: SystemState;
  dispatch: React.Dispatch<Action>;
  pipeline: PipelineRef;
  editedRadar: string;
  setEditedRadar: (v: string) => void;
  editedDossier: string;
  setEditedDossier: (v: string) => void;
  editedStructure: string;
  setEditedStructure: (v: string) => void;
  editedOutline: string;
  setEditedOutline: (v: string) => void;
  editedDocCircle: string;
  setEditedDocCircle: (v: string) => void;
  editedActPlanning: string;
  setEditedActPlanning: (v: string) => void;
  onImageGen: (index: number) => void;
  onDeleteHistory: (id: number, e: React.MouseEvent) => void;
  onLoadFromHistory: (item: HistoryItem) => void;
}

const OutputTabs: React.FC<OutputTabsProps> = ({
  currentTab,
  state,
  dispatch,
  pipeline,
  editedRadar, setEditedRadar,
  editedDossier, setEditedDossier,
  editedStructure, setEditedStructure,
  editedOutline, setEditedOutline,
  editedDocCircle, setEditedDocCircle,
  editedActPlanning, setEditedActPlanning,
  onImageGen,
  onDeleteHistory,
  onLoadFromHistory,
}) => {
  const [selectedSuggestion, setSelectedSuggestion] = useState<TopicSuggestion | null>(null);

  return (
    <div className="lg:col-span-8 space-y-6">

      {/* ── SCOUT TAB ── */}
      {currentTab === 'scout' && (
        <div className="space-y-6">
          {!state.scoutSuggestions && (
            <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-mw-slate/20 rounded-lg p-12 text-center opacity-50">
              <div className="text-6xl mb-4">&#x1F310;</div>
              <h2 className="text-2xl font-bold mb-2">Awaiting Directive</h2>
              <p className="max-w-md mx-auto">Click "SCAN GLOBAL INTEL" to brainstorm topics with the Scout Agent, or enter a target manually.</p>
            </div>
          )}
          {state.scoutSuggestions && (
            <div className={`bg-mw-gray/20 p-6 rounded border ${state.currentAgent === AgentType.SCOUT ? 'border-mw-red shadow-[0_0_15px_rgba(0,229,255,0.2)]' : 'border-mw-slate/30'}`}>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-mw-red font-mono text-xs">/// SCOUT_INTEL_REPORT (SELECT ONE)</h4>
                <button onClick={pipeline.executeScout} disabled={state.isProcessing} className="font-mono text-xs border border-mw-slate/50 px-3 py-1 rounded hover:border-mw-red hover:text-mw-red transition-all disabled:opacity-30 disabled:cursor-not-allowed text-mw-slate">
                  [↻ RESCAN]
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {state.scoutSuggestions.map((suggestion, idx) => {
                  const isSelected = selectedSuggestion?.title === suggestion.title;
                  return (
                    <div key={idx} onClick={() => setSelectedSuggestion(isSelected ? null : suggestion)} className={`bg-black/50 border p-4 rounded cursor-pointer transition-all group ${isSelected ? 'border-mw-red bg-mw-red/10 shadow-[0_0_12px_rgba(0,229,255,0.25)]' : 'border-mw-slate/50 hover:border-mw-red/60 hover:bg-mw-red/5'}`}>
                      <h3 className={`font-bold mb-2 ${isSelected ? 'text-mw-red' : 'text-white group-hover:text-mw-red/80'}`}>{suggestion.title}</h3>
                      <p className="text-xs text-gray-400 mb-2">{suggestion.hook}</p>
                      {suggestion.sourceUrl && (
                        <a href={suggestion.sourceUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="text-[10px] text-blue-400 hover:text-blue-300 underline underline-offset-2 block truncate mb-2">
                          ↗ {suggestion.searchQuery ?? 'Verify on Google'}
                        </a>
                      )}
                      <div className="flex items-center justify-between border-t border-mw-slate/20 pt-2 mt-2">
                        <div className="text-[10px] uppercase font-bold text-mw-slate">
                          Viral Factor: {suggestion.viralFactor}
                        </div>
                        <button
                          onClick={e => { e.stopPropagation(); pipeline.handleSelectTopic(suggestion); setSelectedSuggestion(null); }}
                          disabled={state.isProcessing}
                          className="opacity-0 group-hover:opacity-100 font-mono text-[10px] bg-mw-red/20 border border-mw-red/60 px-2 py-0.5 rounded hover:bg-mw-red/40 transition-all disabled:cursor-not-allowed text-white"
                        >
                          ▶ USE
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              {selectedSuggestion && (
                <div className="mt-4 flex items-center gap-3">
                  <div className="flex-1 text-xs text-gray-400 font-mono">
                    SELECTED: <span className="text-white">{selectedSuggestion.title}</span>
                  </div>
                  <button
                    onClick={() => { pipeline.handleSelectTopic(selectedSuggestion); setSelectedSuggestion(null); }}
                    disabled={state.isProcessing}
                    className="font-mono text-xs bg-mw-red/20 border border-mw-red px-4 py-2 rounded hover:bg-mw-red/40 transition-all disabled:opacity-30 disabled:cursor-not-allowed text-white"
                  >
                    [▶ CONFIRM &amp; START RESEARCH]
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── RADAR TAB ── */}
      {currentTab === 'radar' && (
        <div className="space-y-6">
          {state.radarOutput && (
            <div className={`bg-mw-gray/20 p-6 rounded border ${state.currentAgent === AgentType.RADAR ? 'border-mw-red shadow-[0_0_15px_rgba(0,229,255,0.2)]' : 'border-mw-slate/30'}`}>
              <h4 className="text-mw-red font-mono text-xs mb-2">/// RADAR_INTERCEPT_DATA</h4>
              {state.stepStatus === 'WAITING_FOR_APPROVAL' && state.currentAgent === AgentType.RADAR ? (
                <StepEditor value={editedRadar} originalValue={state.radarOutput ?? ''} onChange={setEditedRadar} onApprove={() => pipeline.handleApproveRadar(editedRadar)} approveLabel="Approve &amp; Run Analyst →" borderColor="border-mw-red/50" textColor="text-gray-300" height="h-48" onAutoRun={() => { dispatch({ type: 'SET_FIELD', field: 'isSteppable', value: false }); pipeline.handleApproveRadar(editedRadar); }} />
              ) : (
                <RichTextDisplay content={state.radarOutput} />
              )}
            </div>
          )}
        </div>
      )}

      {/* ── ANALYST TAB ── */}
      {currentTab === 'analyst' && (
        <div className="space-y-6">
          {state.researchDossier && (
            <div className={`bg-mw-gray/20 p-6 rounded border ${state.currentAgent === AgentType.ANALYST ? 'border-mw-red shadow-[0_0_15px_rgba(0,229,255,0.2)]' : 'border-mw-slate/30'}`}>
              <h4 className="text-blue-400 font-mono text-xs mb-2">/// ANALYST_DOSSIER (TEXT)</h4>
              {state.stepStatus === 'WAITING_FOR_APPROVAL' && state.currentAgent === AgentType.ANALYST ? (
                <StepEditor value={editedDossier} originalValue={state.researchDossier ?? ''} onChange={setEditedDossier} onApprove={() => pipeline.handleApproveAnalyst(editedDossier)} approveLabel="Approve &amp; Run Architect →" borderColor="border-blue-500/50" textColor="text-blue-100" onAutoRun={() => { dispatch({ type: 'SET_FIELD', field: 'isSteppable', value: false }); pipeline.handleApproveAnalyst(editedDossier); }} />
              ) : (
                <RichTextDisplay content={state.researchDossier} />
              )}
            </div>
          )}
        </div>
      )}

      {/* ── ARCHITECT TAB ── */}
      {currentTab === 'architect' && (
        <div className="space-y-6">
          {state.structureMap && (
            <div className={`bg-mw-gray/20 p-6 rounded border ${state.currentAgent === AgentType.ARCHITECT ? 'border-mw-red shadow-[0_0_15px_rgba(0,229,255,0.2)]' : 'border-mw-slate/30'}`}>
              <h4 className="text-green-500 font-mono text-xs mb-2">/// ARCHITECT_INVESTIGATIVE_MAP</h4>
              {state.stepStatus === 'WAITING_FOR_APPROVAL' && state.currentAgent === AgentType.ARCHITECT ? (
                <StepEditor value={editedStructure} originalValue={state.structureMap ?? ''} onChange={setEditedStructure} onApprove={() => pipeline.handleApproveArchitect(editedStructure, state.researchDossier)} approveLabel="Approve Map → Run Story Circles →" borderColor="border-green-500/50" textColor="text-green-100" onAutoRun={() => { dispatch({ type: 'SET_FIELD', field: 'isSteppable', value: false }); pipeline.handleApproveArchitect(editedStructure, state.researchDossier); }} />
              ) : (
                <RichTextDisplay content={state.structureMap} />
              )}
            </div>
          )}
          {state.thumbnailConcept && (
            <ThumbnailPreview
              thumbnailConcept={state.thumbnailConcept}
              previewImageUrl={state.previewImageUrl}
              isProcessing={state.isProcessing}
              onGenerate={pipeline.handlePreviewGen}
            />
          )}
        </div>
      )}

      {/* ── DOC CIRCLE TAB ── */}
      {currentTab === 'doc_circle' && (
        <div className="space-y-6">
          {state.docCircle && (
            <div className={`bg-mw-gray/20 p-6 rounded border ${state.currentAgent === AgentType.DOC_CIRCLE ? 'border-mw-red shadow-[0_0_15px_rgba(0,229,255,0.2)]' : 'border-violet-500/40'}`}>
              <h4 className="text-violet-400 font-mono text-xs mb-2">/// DOC_CIRCLE — STEPS 1-3: CONFLICTS + GLOBAL CIRCLE + 4 ACTS</h4>
              {state.stepStatus === 'WAITING_FOR_APPROVAL' && state.currentAgent === AgentType.DOC_CIRCLE ? (
                <StepEditor value={editedDocCircle} originalValue={state.docCircle ?? ''} onChange={setEditedDocCircle} onApprove={() => pipeline.handleApproveDocCircle(editedDocCircle, state.structureMap ?? '', state.researchDossier)} approveLabel="Approve Circle → Build Act Planning →" borderColor="border-violet-500/50" textColor="text-violet-100" onAutoRun={() => { dispatch({ type: 'SET_FIELD', field: 'isSteppable', value: false }); pipeline.handleApproveDocCircle(editedDocCircle, state.structureMap ?? '', state.researchDossier); }} />
              ) : (
                <RichTextDisplay content={state.docCircle} />
              )}
            </div>
          )}
        </div>
      )}

      {/* ── ACT PLANNING TAB ── */}
      {currentTab === 'act_planning' && (
        <div className="space-y-6">
          {state.actPlanning && (
            <div className={`bg-mw-gray/20 p-6 rounded border ${state.currentAgent === AgentType.ACT_PLANNING ? 'border-mw-red shadow-[0_0_15px_rgba(0,229,255,0.2)]' : 'border-indigo-500/40'}`}>
              <h4 className="text-indigo-400 font-mono text-xs mb-2">/// ACT_PLANNING — STEPS 4-5: ACT CIRCLES + 16-BEAT OUTLINE</h4>
              {state.stepStatus === 'WAITING_FOR_APPROVAL' && state.currentAgent === AgentType.ACT_PLANNING ? (
                <StepEditor value={editedActPlanning} originalValue={state.actPlanning ?? ''} onChange={setEditedActPlanning} onApprove={() => pipeline.handleApproveActPlanning(editedActPlanning, state.docCircle ?? '', state.structureMap ?? '', state.researchDossier)} approveLabel="Approve Act Planning → Generate Full Outline →" borderColor="border-indigo-500/50" textColor="text-indigo-100" height="h-[40rem]" onAutoRun={() => { dispatch({ type: 'SET_FIELD', field: 'isSteppable', value: false }); pipeline.handleApproveActPlanning(editedActPlanning, state.docCircle ?? '', state.structureMap ?? '', state.researchDossier); }} />
              ) : (
                <RichTextDisplay content={state.actPlanning} />
              )}
            </div>
          )}
        </div>
      )}

      {/* ── OUTLINER TAB ── */}
      {currentTab === 'outliner' && (
        <div className="space-y-6">
          {state.scriptOutline && (
            <div className={`bg-mw-gray/20 p-6 rounded border ${state.currentAgent === AgentType.OUTLINER ? 'border-mw-red shadow-[0_0_15px_rgba(0,229,255,0.2)]' : 'border-amber-500/40'}`}>
              <h4 className="text-amber-400 font-mono text-xs mb-2">/// FULL OUTLINE</h4>
              {state.stepStatus === 'WAITING_FOR_APPROVAL' && state.currentAgent === AgentType.OUTLINER && !state.isProcessing ? (
                <StepEditor value={editedOutline} originalValue={state.scriptOutline ?? ''} onChange={setEditedOutline} onApprove={() => pipeline.handleApproveOutline(editedOutline, state.structureMap ?? '', state.researchDossier)} approveLabel="Approve Outline &amp; Generate Script →" borderColor="border-amber-500/50" textColor="text-amber-100" onAutoRun={() => { dispatch({ type: 'SET_FIELD', field: 'isSteppable', value: false }); pipeline.handleApproveOutline(editedOutline, state.structureMap ?? '', state.researchDossier); }} />
              ) : (
                <RichTextDisplay content={state.scriptOutline} />
              )}
            </div>
          )}
        </div>
      )}

      {/* ── WRITER TAB ── */}
      {currentTab === 'writer' && (
        <>
          {!state.finalScript?.length && !state.documentaryActs && (
            <div className="flex flex-col items-center justify-center border-2 border-dashed border-mw-slate/20 rounded-lg p-12 text-center opacity-50">
              <div className="text-5xl mb-4">✍️</div>
              <p className="text-sm text-mw-slate">The final script will appear here after the Writer agent completes.</p>
            </div>
          )}
          {state.currentWritingAct !== undefined && state.documentaryActs && (
            <div className="bg-mw-gray/20 p-4 rounded border border-mw-red/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-mw-red uppercase tracking-wider font-mono">Act Writer</span>
                <span className="text-xs font-mono text-mw-slate">
                  Act {state.currentWritingAct + 1} / {state.documentaryActs.length}
                </span>
              </div>
              <div className="text-xs text-gray-400 mb-2 truncate">
                {state.documentaryActs[state.currentWritingAct]?.block}
              </div>
              <div className="w-full bg-black/50 rounded-full h-1.5">
                <div
                  className="bg-mw-red h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${((state.currentWritingAct + 1) / state.documentaryActs.length) * 100}%` }}
                />
              </div>
            </div>
          )}
          {state.finalScript && (
            <>
              <div className="flex justify-center gap-3 flex-wrap">
                <button onClick={pipeline.executeSEO} disabled={state.isProcessing} className={`px-5 py-2 rounded font-bold uppercase tracking-widest transition-all border text-xs ${state.isProcessing ? 'border-mw-slate/30 text-mw-slate cursor-not-allowed opacity-50' : 'border-yellow-500/50 text-yellow-300 hover:bg-yellow-900/30 hover:border-yellow-400'}`}>
                  {state.isProcessing ? 'Processing...' : 'Generate SEO Package'}
                </button>
                <button onClick={pipeline.executeRewrite} disabled={state.isProcessing} className={`px-5 py-2 rounded font-bold uppercase tracking-widest transition-all border text-xs ${state.isProcessing ? 'border-mw-slate/30 text-mw-slate cursor-not-allowed opacity-50' : 'border-indigo-500/50 text-indigo-300 hover:bg-indigo-900/30 hover:border-indigo-400'}`}>
                  {state.isProcessing ? 'Processing...' : 'Rewrite (Fix Repetitions)'}
                </button>
                <button onClick={pipeline.executeAuditFix} disabled={state.isProcessing} className={`px-5 py-2 rounded font-bold uppercase tracking-widest transition-all border text-xs ${state.isProcessing ? 'border-mw-slate/30 text-mw-slate cursor-not-allowed opacity-50' : 'border-amber-500/50 text-amber-300 hover:bg-amber-900/30 hover:border-amber-400'}`}>
                  {state.isProcessing ? 'Processing...' : 'Fix Audit Issues'}
                </button>
              </div>
              <ScriptDisplay
                script={state.finalScript}
                topic={state.topic}
                projectType={state.projectType}
                radarContent={state.radarOutput}
                analystContent={state.researchDossier}
                architectContent={state.structureMap}
                thumbnailConcept={state.thumbnailConcept}
                seo={state.seoPackage}
                onGenerateImage={onImageGen}
                dispatch={dispatch}
                undoStack={state.undoStack}
                redoStack={state.redoStack}
              />
              {state.seoPackage && <SeoDisplay seo={state.seoPackage} />}
            </>
          )}
        </>
      )}

      {/* ── HISTORY TAB ── */}
      {currentTab === 'history' && (
        <HistorySidebar
          history={state.history}
          isOpen={false}
          onClose={() => {}}
          onSelect={onLoadFromHistory}
          onDelete={onDeleteHistory}
          inline
        />
      )}

    </div>
  );
};

export default OutputTabs;
