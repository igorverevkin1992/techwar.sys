import React, { useState } from 'react';
import type { SystemState, TopicSuggestion, ScriptBlock } from '../types';
import { AgentType } from '../types';
import type { Action } from '../store/reducer';
import { TOPIC_TEMPLATES } from '../constants';
import AgentLog from './AgentLog';

// --- ICONS ---
const ScoutIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>;
const RadarIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z"/><path d="M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/><path d="M12 2v2"/><path d="M12 22v-2"/><path d="m17 20.66-1-1.73"/><path d="M11 10.27a2 2 0 0 0 2.73 0"/><path d="m20.66 17-1.73-1"/><path d="m3.34 17 1.73-1"/><path d="m14 12 2.55-2.55"/><path d="M8.51 12.28 6 15"/></svg>;
const AnalystIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>;
const ArchitectIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>;
const WriterIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>;
const CircleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22C6.5 22 2 17.5 2 12S6.5 2 12 2s10 4.5 10 10"/><path d="M12 8v4l3 3"/><path d="M22 12a10 10 0 0 1-10 10"/></svg>;
const PlanIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>;
const OutlinerIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>;

// --- STEP DEFINITIONS ---
type StepDef = { id: AgentType; label: string; icon: React.FC; desc: string };

const SHORT_DOC_STEPS: StepDef[] = [
  { id: AgentType.SCOUT,        label: "The Scout",       icon: ScoutIcon,     desc: "Global Intel Scan" },
  { id: AgentType.RADAR,        label: "The Radar",       icon: RadarIcon,     desc: "Trend Identification" },
  { id: AgentType.ANALYST,      label: "The Analyst",     icon: AnalystIcon,   desc: "Google Grounding" },
  { id: AgentType.ARCHITECT,    label: "The Architect",   icon: ArchitectIcon, desc: "Investigative Map" },
  { id: AgentType.DOC_CIRCLE,   label: "Doc Circle",      icon: CircleIcon,    desc: "Harmon Circle + 2 Acts" },
  { id: AgentType.ACT_PLANNING, label: "Act Planning",    icon: PlanIcon,      desc: "16-Beat Outline" },
  { id: AgentType.OUTLINER,     label: "Full Treatment",  icon: OutlinerIcon,  desc: "Scene-by-Scene" },
  { id: AgentType.WRITER,       label: "The Writer",      icon: WriterIcon,    desc: "Visual Scripting" },
];

const SHORT_DOC_AGENT_ORDER = [AgentType.SCOUT, AgentType.RADAR, AgentType.ANALYST, AgentType.ARCHITECT, AgentType.DOC_CIRCLE, AgentType.ACT_PLANNING, AgentType.OUTLINER, AgentType.WRITER, AgentType.COMPLETED];

// --- FILE IMPORT UTILS ---
function parseCSVText(text: string): ScriptBlock[] {
  const lines = text.split('\n').filter(l => l.trim());
  const dataLines = lines.slice(1);
  const blocks = dataLines.map(line => {
    const fields: string[] = [];
    let cur = '', inQuote = false;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') { inQuote = !inQuote; }
      else if (line[i] === ',' && !inQuote) { fields.push(cur); cur = ''; }
      else { cur += line[i]; }
    }
    fields.push(cur);
    return {
      timecode: fields[0]?.trim() ?? '',
      blockType: (fields[1]?.trim() ?? 'BODY') as ScriptBlock['blockType'],
      visualCue: fields[2]?.trim() ?? '',
      audioScript: fields[3]?.trim() ?? '',
      russianScript: fields[4]?.trim() ?? '',
      overlayFX: '',
    };
  }).filter(b => b.timecode || b.audioScript);
  if (!blocks.length) throw new Error('No rows found in CSV');
  return blocks;
}

function parseDocxText(rawText: string, addLog: (msg: string) => void): ScriptBlock[] {
  const rawLines = rawText.replace(/\u00a0/g, ' ').replace(/\t/g, '\n').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const lines: string[] = [];
  for (let i = 0; i < rawLines.length; i++) {
    const l = rawLines[i], nx = rawLines[i + 1] ?? '';
    if ((l === 'AUDIO' || l === 'VISUAL') && /^\(/.test(nx)) { lines.push(l + ' ' + nx); i++; }
    else if ((l === 'AUDIO' || l === 'VISUAL') && /^[：:]/.test(nx)) { lines.push(l + nx); i++; }
    else { lines.push(l); }
  }
  const blocks: ScriptBlock[] = [];
  let current: Partial<ScriptBlock> | null = null;
  let activeField: 'visualCue' | 'audioScript' | 'russianScript' | null = null;
  const tcPattern = /^(\d{1,2}:\d{2}(?::\d{2})?\s*[-–]\s*\d{1,2}:\d{2}(?::\d{2})?)(?:\s*\[([A-Z]+)\])?/;
  const mVisual  = (l: string) => l.match(/^VISUAL\s*[：:]\s*(.*)/i);
  const mAudioEn = (l: string) => l.match(/^AUDIO\s*[\u0028\uff08]EN[\u0029\uff09]\s*[：:]\s*(.*)/i);
  const mAudioRu = (l: string) => l.match(/^AUDIO\s*[\u0028\uff08]RU[\u0029\uff09]\s*[：:]\s*(.*)/i);
  const tcLines = lines.filter(l => tcPattern.test(l));
  const tc6idx = lines.findIndex((l, i) => i > 0 && tcPattern.test(l) && lines.slice(0, i).filter(ll => tcPattern.test(ll)).length === 5);
  const audioLineNear6 = lines.slice(tc6idx, tc6idx + 10).find(l => l.toUpperCase().includes('AUDIO'));
  const charCodes = audioLineNear6 ? [...audioLineNear6.slice(0, 20)].map(c => c.charCodeAt(0).toString(16)).join(' ') : 'none';
  addLog(`>>> PARSE DIAG: ${lines.length} lines | ${tcLines.length} timecodes\n  TC6 AUDIO line: "${audioLineNear6?.slice(0, 40)}"\n  char codes: ${charCodes}`);
  const isMarker = (l: string) => tcPattern.test(l) || !!mVisual(l) || !!mAudioEn(l) || !!mAudioRu(l);
  for (const line of lines) {
    const tcMatch = line.match(tcPattern);
    if (tcMatch) {
      if (current?.audioScript) blocks.push({ timecode: '', visualCue: '', overlayFX: '', audioScript: '', russianScript: '', blockType: 'BODY', ...current });
      current = { timecode: tcMatch[1].trim(), blockType: (tcMatch[2] as ScriptBlock['blockType']) ?? 'BODY', visualCue: '', overlayFX: '', audioScript: '', russianScript: '' };
      activeField = null;
      const rest = line.slice(tcMatch[0].length).trim();
      if (mAudioEn(rest)) {
        const vm = rest.match(/VISUAL\s*[：:]\s*(.*?)(?=AUDIO\s*[\u0028\uff08]EN[\u0029\uff09])/i);
        const em = mAudioEn(rest);
        const rm = mAudioRu(rest);
        if (vm) current.visualCue = vm[1].trim();
        if (em) current.audioScript = em[1].split(/AUDIO\s*[\u0028\uff08]RU[\u0029\uff09]/i)[0].trim();
        if (rm) current.russianScript = rm[1].trim();
      }
    } else if (current) {
      const vm = mVisual(line); const em = mAudioEn(line); const rm = mAudioRu(line);
      if (vm) { current.visualCue = vm[1]; activeField = 'visualCue'; }
      else if (em) { current.audioScript = em[1]; activeField = 'audioScript'; }
      else if (rm) { current.russianScript = rm[1]; activeField = 'russianScript'; }
      else if (activeField && !isMarker(line)) {
        current[activeField] = (current[activeField] ?? '') + ' ' + line;
      }
    }
  }
  if (current?.audioScript) blocks.push({ timecode: '', visualCue: '', overlayFX: '', audioScript: '', russianScript: '', blockType: 'BODY', ...current });
  if (!blocks.length) throw new Error('No script blocks found in document. Make sure the file was exported from Tech.War.');
  return blocks;
}

interface PipelineRef {
  executeScout: () => Promise<TopicSuggestion[] | void>;
  executeRadar: () => void;
  handleSelectTopic: (suggestion: TopicSuggestion) => void;
}

interface LeftPanelProps {
  state: SystemState;
  dispatch: React.Dispatch<Action>;
  pipeline: PipelineRef;
  addLog: (msg: string) => void;
}

const LeftPanel: React.FC<LeftPanelProps> = ({ state, dispatch, pipeline, addLog }) => {
  const [showTemplates, setShowTemplates] = useState(false);
  const [templateCategory, setTemplateCategory] = useState<string>('all');

  const steps = SHORT_DOC_STEPS;
  const agentOrder = SHORT_DOC_AGENT_ORDER;
  const currentIdx = state.currentAgent === 'IDLE' ? -1 : agentOrder.indexOf(state.currentAgent as AgentType);

  const handleFileImport = (file: File) => {
    const importBlocks = (blocks: ScriptBlock[]) => {
      dispatch({ type: 'SET_FIELD', field: 'finalScript', value: blocks });
      addLog(`>>> IMPORTED: ${blocks.length} blocks from "${file.name}"`);
    };

    if (file.name.endsWith('.json')) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const parsed = JSON.parse(ev.target?.result as string);
          const blocks = Array.isArray(parsed) ? parsed : parsed.script ?? parsed.finalScript;
          if (!Array.isArray(blocks) || !blocks.length) throw new Error('No script blocks found in JSON');
          importBlocks(blocks);
        } catch (err) { addLog(`>>> IMPORT ERROR: ${err instanceof Error ? err.message : String(err)}`); }
      };
      reader.readAsText(file, 'utf-8');
    } else if (file.name.endsWith('.csv')) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        try { importBlocks(parseCSVText(ev.target?.result as string)); }
        catch (err) { addLog(`>>> IMPORT ERROR: ${err instanceof Error ? err.message : String(err)}`); }
      };
      reader.readAsText(file, 'utf-8');
    } else {
      // .doc or .docx — first try as text (our HTML export), then mammoth (real DOCX)
      const textReader = new FileReader();
      textReader.onload = async (ev) => {
        try {
          const text = ev.target?.result as string;
          const isHtml = text.trimStart().toLowerCase().startsWith('<');
          if (isHtml) {
            const doc = new DOMParser().parseFromString(text, 'text/html');
            const blockEls = doc.querySelectorAll('.block');
            if (blockEls.length) {
              const blocks = Array.from(blockEls).map(el => {
                const timeText = el.querySelector('.time')?.textContent ?? '';
                const tcMatch = timeText.match(/^([\d:]+\s*[-–]\s*[\d:]+)\s*\[([A-Z]+)\]/);
                const visualText = el.querySelector('.visual')?.textContent ?? '';
                const audioText = el.querySelector('.audio')?.textContent ?? '';
                const russianText = el.querySelector('.russian')?.textContent ?? '';
                return {
                  timecode: tcMatch?.[1]?.trim() ?? timeText.trim(),
                  blockType: (tcMatch?.[2] ?? 'BODY') as ScriptBlock['blockType'],
                  visualCue: visualText.replace(/^VISUAL:\s*/, '').trim(),
                  audioScript: audioText.replace(/^AUDIO \(EN\):\s*/, '').trim(),
                  russianScript: russianText.replace(/^AUDIO \(RU\):\s*/, '').trim(),
                  overlayFX: '',
                };
              }).filter(b => b.audioScript);
              if (!blocks.length) throw new Error('No script blocks found in HTML document');
              importBlocks(blocks);
            } else {
              const textParts: string[] = [];
              doc.body.querySelectorAll('p, div, td, h1, h2, h3, h4, li').forEach(el => {
                if (!el.querySelector('p, div, td, h1, h2, h3, h4, li')) {
                  const t = el.textContent?.replace(/\u00a0/g, ' ').trim();
                  if (t) textParts.push(t);
                }
              });
              const rawHtmlText = textParts.join('\n');
              const audioLineCount = rawHtmlText.split('\n').filter(l => l.includes('AUDIO (EN):')).length;
              addLog(`>>> DOC HTML RAW (first 30 lines, ${audioLineCount} AUDIO(EN) markers):\n${rawHtmlText.split('\n').slice(0, 30).join('\n')}`);
              importBlocks(parseDocxText(rawHtmlText, addLog));
            }
          } else {
            // Real DOCX (ZIP) — use mammoth via ArrayBuffer (lazy-loaded)
            const abReader = new FileReader();
            abReader.onload = async (abEv) => {
              try {
                const arrayBuffer = abEv.target?.result as ArrayBuffer;
                const mammoth = await import('mammoth');
                const result = await mammoth.extractRawText({ arrayBuffer });
                const preview = result.value.split('\n').slice(0, 30).join('\n');
                addLog(`>>> DOCX RAW (first 30 lines):\n${preview}`);
                importBlocks(parseDocxText(result.value, addLog));
              } catch (err) { addLog(`>>> IMPORT ERROR: ${err instanceof Error ? err.message : String(err)}`); }
            };
            abReader.readAsArrayBuffer(file);
          }
        } catch (err) { addLog(`>>> IMPORT ERROR: ${err instanceof Error ? err.message : String(err)}`); }
      };
      textReader.readAsText(file, 'utf-8');
    }
  };

  return (
    <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-24 h-fit">
      <div className="bg-mw-gray/30 p-6 rounded-lg border border-mw-slate/30 backdrop-blur-sm">
        <div className="mb-4">
          <label className="block text-xs font-bold text-mw-slate uppercase mb-2 tracking-wider">Agent Models</label>
          <div className="bg-black border border-mw-slate/50 rounded p-3 font-mono text-[11px] space-y-1">
            <div className="flex justify-between"><span className="text-mw-slate">Scout / Radar / Architect</span><span className="text-green-400">Flash</span></div>
            <div className="flex justify-between"><span className="text-mw-slate">Analyst / Writer</span><span className="text-purple-400">Pro</span></div>
          </div>
        </div>

        <div className="flex items-center justify-between mb-2">
          <label className="block text-xs font-bold text-mw-red uppercase tracking-wider">Target Vector (Topic)</label>
          <button
            onClick={() => setShowTemplates(v => !v)}
            className={`text-[10px] font-mono uppercase tracking-wider px-2 py-1 rounded border transition-all ${showTemplates ? 'border-cyan-500/60 text-cyan-300 bg-cyan-900/20' : 'border-mw-slate/30 text-mw-slate hover:border-cyan-400/50 hover:text-cyan-400'}`}
          >
            {showTemplates ? '▼ Templates' : '▶ Templates'}
          </button>
        </div>

        {showTemplates && (
          <div className="mb-3 bg-black/30 border border-mw-slate/20 rounded p-3 flex flex-col gap-2">
            <div className="flex flex-wrap gap-1">
              {(['all', 'geopolitics', 'business', 'history', 'crime', 'technology', 'society'] as const).map(cat => (
                <button
                  key={cat}
                  onClick={() => setTemplateCategory(cat)}
                  className={`px-2 py-0.5 text-[10px] font-mono uppercase rounded border transition-all ${templateCategory === cat ? 'border-cyan-500/60 text-cyan-300 bg-cyan-900/20' : 'border-mw-slate/30 text-mw-slate hover:border-white/30'}`}
                >
                  {cat}
                </button>
              ))}
            </div>
            <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
              {TOPIC_TEMPLATES.filter(t => templateCategory === 'all' || t.category === templateCategory).map(t => (
                <button
                  key={t.id}
                  disabled={state.isProcessing}
                  onClick={() => {
                    dispatch({ type: 'SET_FIELD', field: 'topic', value: t.scaffold });
                    setShowTemplates(false);
                  }}
                  className="text-left px-2 py-1.5 rounded border border-mw-slate/20 hover:border-cyan-500/40 hover:bg-cyan-900/10 transition-all group"
                >
                  <div className="text-[10px] font-bold text-slate-200 group-hover:text-cyan-200">{t.name}</div>
                  <div className="text-[10px] text-mw-slate/70 font-mono truncate">{t.description}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <input
            type="text"
            value={state.topic}
            onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'topic', value: e.target.value })}
            placeholder="Manual topic or select a template above..."
            className="w-full bg-black border border-mw-slate/50 rounded p-3 text-white focus:border-mw-red focus:ring-1 focus:ring-mw-red outline-none transition-all placeholder:text-mw-slate/50 font-mono"
            disabled={state.isProcessing || state.stepStatus !== 'IDLE'}
          />
        </div>

        <div className="mt-4 flex flex-col gap-2">
          <button
            onClick={pipeline.executeScout}
            disabled={state.isProcessing || (state.currentAgent !== 'IDLE' && state.currentAgent !== AgentType.COMPLETED)}
            className={`w-full py-3 px-4 rounded font-bold uppercase tracking-widest transition-all border border-mw-red/50 text-mw-red hover:bg-mw-red hover:text-white flex items-center justify-center gap-2 ${state.isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <ScoutIcon />
            SCAN GLOBAL INTEL (IDEAS)
          </button>
          <button
            onClick={() => pipeline.executeRadar()}
            disabled={state.isProcessing || !state.topic || (state.currentAgent !== 'IDLE' && state.currentAgent !== AgentType.COMPLETED)}
            className={`w-full py-3 px-4 rounded font-bold uppercase tracking-widest transition-all ${
              state.isProcessing || (state.currentAgent !== 'IDLE' && state.currentAgent !== AgentType.COMPLETED)
                ? 'bg-mw-slate/20 text-mw-slate cursor-not-allowed'
                : 'bg-mw-red hover:bg-cyan-500 text-white shadow-[0_0_15px_rgba(0,229,255,0.4)]'
            }`}
          >
            {state.isProcessing ? 'Executing...' : 'Run Sequence (Manual Topic)'}
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-2">
          <button
            onClick={async () => {
              dispatch({ type: 'SET_FIELD', field: 'isSteppable', value: false });
              const suggestions = await pipeline.executeScout();
              if (suggestions && suggestions.length > 0) {
                pipeline.handleSelectTopic(suggestions[0]);
              }
            }}
            disabled={state.isProcessing || (state.currentAgent !== 'IDLE' && state.currentAgent !== AgentType.COMPLETED)}
            className={`w-full py-2.5 px-4 rounded font-bold uppercase tracking-widest transition-all text-sm border border-cyan-500/40 text-cyan-300 hover:bg-cyan-900/30 hover:border-cyan-400 flex items-center justify-center gap-2 ${state.isProcessing ? 'opacity-40 cursor-not-allowed' : ''}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            Full Auto Run
          </button>
        </div>

        <div className="mt-4 flex items-center gap-3 flex-wrap">
          <div
            onClick={() => !state.isProcessing && dispatch({ type: 'SET_FIELD', field: 'isSteppable', value: !state.isSteppable })}
            className={`cursor-pointer flex items-center gap-2 px-3 py-2 rounded border transition-all ${state.isSteppable ? 'border-mw-red bg-mw-red/10 text-white' : 'border-mw-slate/50 text-mw-slate'}`}
          >
            <div className={`w-3 h-3 rounded-full ${state.isSteppable ? 'bg-mw-red' : 'bg-mw-slate'}`} />
            <span className="text-xs font-bold uppercase tracking-wider">Steppable Mode</span>
          </div>
          <label className={`cursor-pointer flex items-center gap-2 px-3 py-2 rounded border transition-all border-indigo-500/50 text-indigo-300 hover:bg-indigo-900/20 hover:border-indigo-400 ${state.isProcessing ? 'opacity-50 pointer-events-none' : ''}`} title="Import script from .json or .csv (export first from ScriptDisplay)">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            <span className="text-xs font-bold uppercase tracking-wider">Import Script</span>
            <input
              type="file"
              accept=".json,.csv,.doc,.docx"
              className="hidden"
              disabled={state.isProcessing}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                e.target.value = '';
                handleFileImport(file);
              }}
            />
          </label>
        </div>
      </div>

      {/* Agent chain */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold text-mw-slate uppercase tracking-wider pl-1">Chain of Agents</h3>
        {steps.map((step) => {
          const isActive = state.currentAgent === step.id;
          const thisIdx = agentOrder.indexOf(step.id);
          const isPast = currentIdx > thisIdx;
          return (
            <div key={step.id} className={`flex items-center gap-4 p-4 rounded border transition-all ${isActive ? 'bg-mw-red/10 border-mw-red text-white' : isPast ? 'bg-mw-gray/20 border-mw-slate/30 text-green-500' : 'bg-transparent border-transparent text-mw-slate opacity-50'}`}>
              <step.icon />
              <div>
                <div className="font-bold text-sm uppercase">{step.label}</div>
                <div className="text-xs font-mono opacity-70">{step.desc}</div>
              </div>
              {isActive && <div className="ml-auto w-2 h-2 bg-mw-red rounded-full animate-ping" />}
              {isPast && <div className="ml-auto text-green-500 text-xs font-mono">[OK]</div>}
            </div>
          );
        })}
      </div>

      <AgentLog logs={state.logs} />

      {/* Writer progress bar — visible only during streaming */}
      {state.currentAgent === AgentType.WRITER && typeof state.writerChunks === 'number' && (
        <div className="mt-2 px-1">
          <div className="flex items-center justify-between text-[10px] font-mono text-mw-slate mb-1">
            <span>WRITER: STREAMING</span>
            <span>{state.writerChunks} chunks</span>
          </div>
          <div className="w-full h-1 bg-mw-gray/40 rounded overflow-hidden">
            <div
              className="h-full bg-mw-red transition-all duration-300 rounded"
              style={{ width: `${Math.min(100, (state.writerChunks / 400) * 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default LeftPanel;
