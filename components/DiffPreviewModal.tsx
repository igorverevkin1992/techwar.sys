import React from 'react';
import type { ScriptBlock } from '../types';

interface DiffPreviewModalProps {
  originalScript: ScriptBlock[];
  modifiedScript: ScriptBlock[];
  onApply: () => void;
  onCancel: () => void;
  title: string;
}

interface ChangedBlock {
  index: number;
  original: ScriptBlock;
  modified: ScriptBlock;
}

export default function DiffPreviewModal({
  originalScript,
  modifiedScript,
  onApply,
  onCancel,
  title,
}: DiffPreviewModalProps) {
  const totalBlocks = Math.max(originalScript.length, modifiedScript.length);

  const changedBlocks: ChangedBlock[] = [];
  for (let i = 0; i < totalBlocks; i++) {
    const orig = originalScript[i];
    const mod = modifiedScript[i];
    if (!orig || !mod || orig.audioScript !== mod.audioScript) {
      changedBlocks.push({
        index: i,
        original: orig ?? { timecode: '', visualCue: '', overlayFX: '', audioScript: '', russianScript: '', blockType: 'BODY' },
        modified: mod ?? { timecode: '', visualCue: '', overlayFX: '', audioScript: '', russianScript: '', blockType: 'BODY' },
      });
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onCancel}>
      <div
        className="w-full max-w-4xl max-h-[80vh] flex flex-col rounded-lg border border-mw-slate/30 bg-mw-black shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-mw-slate/30 px-6 py-4">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <span className="text-sm text-slate-300">
            {changedBlocks.length} of {totalBlocks} blocks modified
          </span>
        </div>

        {/* Diff body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {changedBlocks.length === 0 && (
            <p className="text-center text-slate-300 py-8">No changes detected.</p>
          )}
          {changedBlocks.map(({ index, original, modified }) => (
            <div key={index} className="rounded border border-mw-slate/30 bg-mw-gray/30 overflow-hidden">
              <div className="px-3 py-1.5 text-xs font-mono text-slate-300 border-b border-mw-slate/30">
                Block {index + 1} &middot; {modified.timecode || original.timecode} &middot; {modified.blockType}
              </div>
              <div className="grid grid-cols-2 divide-x divide-mw-slate/30">
                {/* Original */}
                <div className="p-3">
                  <span className="text-[10px] uppercase tracking-wider text-slate-300/60 mb-1 block">Original</span>
                  <p className="font-mono text-sm whitespace-pre-wrap rounded bg-red-900/30 text-red-200 p-2">
                    {original.audioScript || <em className="text-slate-500">empty</em>}
                  </p>
                </div>
                {/* Modified */}
                <div className="p-3">
                  <span className="text-[10px] uppercase tracking-wider text-slate-300/60 mb-1 block">Modified</span>
                  <p className="font-mono text-sm whitespace-pre-wrap rounded bg-green-900/30 text-green-200 p-2">
                    {modified.audioScript || <em className="text-slate-500">empty</em>}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-mw-slate/30 px-6 py-4">
          <button
            onClick={onCancel}
            className="rounded px-4 py-2 text-sm font-medium text-slate-300 bg-mw-gray/30 hover:bg-mw-gray/50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onApply}
            className="rounded px-4 py-2 text-sm font-medium text-white bg-mw-red hover:bg-mw-red/80 transition-colors"
          >
            Apply Changes
          </button>
        </div>
      </div>
    </div>
  );
}
